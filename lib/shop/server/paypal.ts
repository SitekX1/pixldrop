import "server-only";
// PayPal Orders API v2 (serverseitig, Redirect-Flow). Kein Karten-/Zahlungsdaten-Handling:
// Der Kunde wird zu PayPal geleitet, zahlt dort, kehrt zurueck; der Server fuehrt das
// Capture aus und prueft Betrag/Status. Zugangsdaten nur aus Umgebungsvariablen.
import { centZuPayPal, payPalZuCent } from "./preise";
import type { FetchFn } from "./db";

export type PayPalUmgebung = "sandbox" | "live";

export interface PayPalConfig {
  env: PayPalUmgebung;
  clientId: string;
  clientSecret: string;
  webhookId?: string;
}

export interface OrderEingabe {
  nummer: string;
  gesamtCent: number;
  summeWarenCent: number;
  versandCent: number;
  positionen: { name: string; menge: number; einzelpreisCent: number }[];
  /** Lieferanschrift (Deutschland) fuer den PayPal-Verkaeuferschutz. */
  empfaenger: { name: string; strasse: string; plz: string; ort: string };
  returnUrl: string;
  cancelUrl: string;
  /** PayPal-Request-Id: gleiche Id = gleiche Order (Idempotenz bei Wiederholung). */
  requestId: string;
}

export interface PayPalCapture {
  captureId: string;
  status: string;
  betragCent: number | null;
  waehrung: string;
  customId: string | null;
}

export interface PayPalOrder {
  id: string;
  status: string;
  capture: PayPalCapture | null;
  links: { rel: string; href: string }[];
}

export class PayPalFehler extends Error {
  constructor(public readonly stufe: string, public readonly httpStatus?: number, public readonly issue?: string) {
    super(`PayPal-Fehler (${stufe}${httpStatus ? " " + httpStatus : ""}${issue ? " " + issue : ""})`);
    this.name = "PayPalFehler";
  }
}

export interface PayPalClient {
  erzeugeOrder(e: OrderEingabe): Promise<{ id: string; approveUrl: string }>;
  holeOrder(id: string): Promise<PayPalOrder>;
  capture(id: string, requestId: string): Promise<PayPalOrder>;
  pruefeWebhook(headers: Headers, event: unknown): Promise<boolean>;
  /** Freigabe-URL einer bestehenden Order (zum Wiederverwenden bei erneutem Versuch). */
  approveUrl(orderId: string): string;
}

const BASIS: Record<PayPalUmgebung, string> = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};
const WEB: Record<PayPalUmgebung, string> = {
  sandbox: "https://www.sandbox.paypal.com",
  live: "https://www.paypal.com",
};

function istObjekt(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Liest das erste Capture einer Order (aus Capture- oder GET-Antwort). */
export const WEBHOOK_MAX_ABWEICHUNG_MS = 5 * 60 * 1000;
const ERLAUBTE_CERT_HOSTS = new Set([
  "api.paypal.com",
  "api.sandbox.paypal.com",
  "api-m.paypal.com",
  "api-m.sandbox.paypal.com",
]);

/**
 * Billige Vorpruefung der PayPal-Webhook-Header OHNE Netzwerkzugriff:
 *  - paypal-transmission-time parsebar, hoechstens 5 Min alt und hoechstens 5 Min in der Zukunft,
 *  - paypal-cert-url ist https, ohne Zugangsdaten/Port, Host aus der PayPal-API-Liste.
 * Schuetzt vor Replay alter Webhooks und vor Zertifikats-URLs auf fremden Hosts.
 */
export function webhookKopfPlausibel(headers: Headers, jetzt: number = Date.now()): boolean {
  const zeit = Date.parse(headers.get("paypal-transmission-time") ?? "");
  if (!Number.isFinite(zeit) || Math.abs(jetzt - zeit) > WEBHOOK_MAX_ABWEICHUNG_MS) return false;
  let u: URL;
  try {
    u = new URL(headers.get("paypal-cert-url") ?? "");
  } catch {
    return false;
  }
  return u.protocol === "https:" && !u.username && !u.password && u.port === "" && ERLAUBTE_CERT_HOSTS.has(u.hostname);
}

export function parseOrder(roh: unknown): PayPalOrder {
  if (!istObjekt(roh) || typeof roh.id !== "string" || typeof roh.status !== "string") {
    throw new PayPalFehler("antwort_ungueltig");
  }
  const links = Array.isArray(roh.links)
    ? (roh.links as unknown[]).filter(istObjekt)
        .filter((l) => typeof l.rel === "string" && typeof l.href === "string")
        .map((l) => ({ rel: l.rel as string, href: l.href as string }))
    : [];
  let capture: PayPalCapture | null = null;
  const einheit = Array.isArray(roh.purchase_units) ? roh.purchase_units[0] : undefined;
  if (istObjekt(einheit)) {
    const zahlungen = istObjekt(einheit.payments) ? einheit.payments : undefined;
    const c = Array.isArray(zahlungen?.captures) ? (zahlungen.captures as unknown[])[0] : undefined;
    if (istObjekt(c) && typeof c.id === "string" && typeof c.status === "string" && istObjekt(c.amount)) {
      capture = {
        captureId: c.id,
        status: c.status,
        betragCent: payPalZuCent(c.amount.value),
        waehrung: typeof c.amount.currency_code === "string" ? c.amount.currency_code : "",
        customId: typeof c.custom_id === "string" ? c.custom_id : typeof einheit.custom_id === "string" ? einheit.custom_id : null,
      };
    }
  }
  return { id: roh.id, status: roh.status, capture, links };
}

export function erzeugePayPal(cfg: PayPalConfig, fetchImpl: FetchFn = fetch): PayPalClient {
  const basis = BASIS[cfg.env];
  let token: { wert: string; bis: number } | null = null;

  async function zugriffstoken(): Promise<string> {
    if (token && token.bis > Date.now() + 30_000) return token.wert;
    let res: Response;
    try {
      res = await fetchImpl(`${basis}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
    } catch {
      throw new PayPalFehler("token_netz");
    }
    if (!res.ok) throw new PayPalFehler("token", res.status);
    const j = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
    if (typeof j.access_token !== "string") throw new PayPalFehler("token_antwort");
    token = { wert: j.access_token, bis: Date.now() + (Number(j.expires_in) || 300) * 1000 };
    return token.wert;
  }

  async function aufruf(
    stufe: string,
    methode: "GET" | "POST",
    pfad: string,
    body?: unknown,
    extraKopf: Record<string, string> = {},
  ): Promise<unknown> {
    const t = await zugriffstoken();
    let res: Response;
    try {
      res = await fetchImpl(`${basis}${pfad}`, {
        method: methode,
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...extraKopf },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch {
      throw new PayPalFehler(`${stufe}_netz`);
    }
    if (!res.ok) {
      let issue: string | undefined;
      try {
        const j = (await res.json()) as { details?: { issue?: unknown }[] };
        const i = j.details?.[0]?.issue;
        if (typeof i === "string") issue = i.slice(0, 60);
      } catch {
        /* Antwort ohne JSON */
      }
      throw new PayPalFehler(stufe, res.status, issue);
    }
    return res.json();
  }

  const approveUrl = (orderId: string) => `${WEB[cfg.env]}/checkoutnow?token=${encodeURIComponent(orderId)}`;

  return {
    approveUrl,

    async erzeugeOrder(e) {
      const summeItems = e.positionen.reduce((s, p) => s + p.einzelpreisCent * p.menge, 0);
      if (summeItems !== e.summeWarenCent || summeItems + e.versandCent !== e.gesamtCent) {
        throw new PayPalFehler("summe_inkonsistent");
      }
      const body = {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: e.nummer,
            custom_id: e.nummer,
            invoice_id: e.nummer,
            description: `PixlDrop 3D-Druck, Bestellung ${e.nummer}`.slice(0, 127),
            amount: {
              currency_code: "EUR",
              value: centZuPayPal(e.gesamtCent),
              breakdown: {
                item_total: { currency_code: "EUR", value: centZuPayPal(e.summeWarenCent) },
                shipping: { currency_code: "EUR", value: centZuPayPal(e.versandCent) },
              },
            },
            // Nur Artikelnamen, bewusst KEINE Wunschtexte/Personalisierung an PayPal
            items: e.positionen.map((p) => ({
              name: p.name.slice(0, 127),
              quantity: String(p.menge),
              category: "PHYSICAL_GOODS",
              unit_amount: { currency_code: "EUR", value: centZuPayPal(p.einzelpreisCent) },
            })),
            shipping: {
              type: "SHIPPING",
              name: { full_name: e.empfaenger.name.slice(0, 300) },
              address: {
                address_line_1: e.empfaenger.strasse.slice(0, 300),
                admin_area_2: e.empfaenger.ort.slice(0, 120),
                postal_code: e.empfaenger.plz,
                country_code: "DE",
              },
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "PixlDrop",
              locale: "de-DE",
              landing_page: "LOGIN",
              user_action: "PAY_NOW",
              shipping_preference: "SET_PROVIDED_ADDRESS",
              return_url: e.returnUrl,
              cancel_url: e.cancelUrl,
            },
          },
        },
      };
      const antwort = await aufruf("order_anlegen", "POST", "/v2/checkout/orders", body, {
        "PayPal-Request-Id": e.requestId,
        Prefer: "return=representation",
      });
      const order = parseOrder(antwort);
      const link = order.links.find((l) => l.rel === "payer-action") ?? order.links.find((l) => l.rel === "approve");
      let url: string;
      try {
        url = new URL(link?.href ?? "").toString();
      } catch {
        url = approveUrl(order.id);
      }
      // Nur PayPal-Hosts als Weiterleitungsziel zulassen
      if (!/^https:\/\/([a-z0-9-]+\.)*paypal\.com\//.test(url)) url = approveUrl(order.id);
      return { id: order.id, approveUrl: url };
    },

    async holeOrder(id) {
      return parseOrder(await aufruf("order_holen", "GET", `/v2/checkout/orders/${encodeURIComponent(id)}`));
    },

    async capture(id, requestId) {
      return parseOrder(
        await aufruf("capture", "POST", `/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {}, {
          "PayPal-Request-Id": requestId,
          Prefer: "return=representation",
        }),
      );
    },

    async pruefeWebhook(headers, event) {
      if (!cfg.webhookId) return false;
      const h = (n: string) => headers.get(n) ?? "";
      if (!h("paypal-transmission-id") || !h("paypal-transmission-sig") || !h("paypal-cert-url")) return false;
      // Vor jedem PayPal-Aufruf (OAuth + Verify): Zeitstempel und Zertifikats-Host plausibel?
      if (!webhookKopfPlausibel(headers)) return false;
      try {
        const antwort = await aufruf("webhook_pruefen", "POST", "/v1/notifications/verify-webhook-signature", {
          auth_algo: h("paypal-auth-algo"),
          cert_url: h("paypal-cert-url"),
          transmission_id: h("paypal-transmission-id"),
          transmission_sig: h("paypal-transmission-sig"),
          transmission_time: h("paypal-transmission-time"),
          webhook_id: cfg.webhookId,
          webhook_event: event,
        });
        return istObjekt(antwort) && antwort.verification_status === "SUCCESS";
      } catch {
        return false;
      }
    },
  };
}
