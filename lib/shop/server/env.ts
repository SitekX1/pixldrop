import "server-only";
// Serverseitige Shop-Konfiguration aus Umgebungsvariablen. Nur Namen, nie Werte im Code.
// Nicht in Client-Komponenten importieren.

export type PayPalUmgebung = "sandbox" | "live";

export interface ShopEnv {
  /** Server-Schalter. Standard false: ohne SHOP_AKTIV=true nimmt keine Route etwas an. */
  shopAktiv: boolean;
  paypalEnv: PayPalUmgebung;
  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalWebhookId?: string;
  /** Supabase-Projekt des Admin Panels (NICHT das PixlDrop-Projekt der NEXT_PUBLIC_*-Variablen). */
  dbUrl?: string;
  dbAnonKey?: string;
  /** Geheimnis fuer die shop_*-RPCs (in der DB nur als SHA-256-Hash). */
  dbSecret?: string;
  /** Salz fuer IP-Hash und Formular-Token. */
  ipSalt?: string;
  /** Optionaler eigener Schluessel fuer die signierten Freigabe-Links; fehlt er, wird SHOP_API_SECRET verwendet. */
  freigabeSecret?: string;
  siteUrl: string;
  adminUrl?: string;
  telegramToken?: string;
  telegramChatId?: string;
  smtp: { host?: string; port: number; user?: string; pass?: string };
  alexMail?: string;
  cronSecret?: string;
}

type EnvQuelle = Record<string, string | undefined>;

function nichtLeer(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

export function leseEnv(env: EnvQuelle = process.env): ShopEnv {
  const paypalEnv: PayPalUmgebung = env.PAYPAL_ENV === "live" ? "live" : "sandbox";
  const smtpUser = nichtLeer(env.SMTP_USER);
  return {
    shopAktiv: env.SHOP_AKTIV === "true",
    paypalEnv,
    paypalClientId: nichtLeer(env.PAYPAL_CLIENT_ID),
    paypalClientSecret: nichtLeer(env.PAYPAL_CLIENT_SECRET),
    paypalWebhookId: nichtLeer(env.PAYPAL_WEBHOOK_ID),
    dbUrl: nichtLeer(env.SHOP_SUPABASE_URL)?.replace(/\/+$/, ""),
    dbAnonKey: nichtLeer(env.SHOP_SUPABASE_ANON_KEY),
    dbSecret: nichtLeer(env.SHOP_API_SECRET),
    ipSalt: nichtLeer(env.SHOP_IP_SALT),
    freigabeSecret: nichtLeer(env.SHOP_FREIGABE_SECRET),
    siteUrl: (nichtLeer(env.SHOP_SITE_URL) ?? "https://pixldrop.de").replace(/\/+$/, ""),
    adminUrl: nichtLeer(env.SHOP_ADMIN_URL),
    telegramToken: nichtLeer(env.TELEGRAM_BOT_TOKEN),
    telegramChatId: nichtLeer(env.TELEGRAM_CHAT_ID),
    smtp: { host: nichtLeer(env.SMTP_HOST), port: Number(env.SMTP_PORT) || 587, user: smtpUser, pass: nichtLeer(env.SMTP_PASS) },
    alexMail: nichtLeer(env.SHOP_ALEX_MAIL) ?? smtpUser,
    cronSecret: nichtLeer(env.CRON_SECRET),
  };
}

/** Fehlende Pflichtvariablen fuer Bestellung/Zahlung (Namen, keine Werte). */
export function fehlendeBestellEnv(e: ShopEnv): string[] {
  const fehlt: string[] = [];
  if (!e.dbUrl) fehlt.push("SHOP_SUPABASE_URL");
  if (!e.dbAnonKey) fehlt.push("SHOP_SUPABASE_ANON_KEY");
  if (!e.dbSecret) fehlt.push("SHOP_API_SECRET");
  if (!e.ipSalt) fehlt.push("SHOP_IP_SALT");
  if (!e.paypalClientId) fehlt.push("PAYPAL_CLIENT_ID");
  if (!e.paypalClientSecret) fehlt.push("PAYPAL_CLIENT_SECRET");
  return fehlt;
}

/** Fehlende Pflichtvariablen fuer die Anfrage (kein PayPal noetig). */
export function fehlendeAnfrageEnv(e: ShopEnv): string[] {
  const fehlt: string[] = [];
  if (!e.dbUrl) fehlt.push("SHOP_SUPABASE_URL");
  if (!e.dbAnonKey) fehlt.push("SHOP_SUPABASE_ANON_KEY");
  if (!e.dbSecret) fehlt.push("SHOP_API_SECRET");
  if (!e.ipSalt) fehlt.push("SHOP_IP_SALT");
  return fehlt;
}
