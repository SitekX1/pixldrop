import type { Metadata } from "next";
import ShopShell from "@/components/shop/ShopShell";
import PauseBanner from "@/components/shop/PauseBanner";
import AngebotAnnahme from "@/components/shop/AngebotAnnahme";
import AngebotFehler, { type AngebotFehlerCode } from "@/components/shop/AngebotFehler";
import { leseEnv } from "@/lib/shop/server/env";
import { anfrageDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { liesAngebot } from "@/lib/shop/server/angebot";
import { holeEinstellungen } from "@/lib/shop/server/einstellungen";
import { datumKurz } from "@/lib/shop/server/vorlagen";

// Annahme-Seite eines Angebots. Das Token steht im Pfad: nie indexieren, kein Referrer an Dritte (PayPal u. a.), nie cachen.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Dein Angebot",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const CODES: AngebotFehlerCode[] = ["ungueltig", "abgelaufen", "bereits_angenommen", "db", "nicht_eingerichtet"];

export default async function AngebotSeite({
  params, searchParams,
}: { params: Promise<{ token: string }>; searchParams: Promise<{ zahlung?: string }> }) {
  const { token } = await params;
  const { zahlung } = await searchParams;
  const env = leseEnv();

  let a: Awaited<ReturnType<typeof liesAngebot>>;
  try {
    a = await liesAngebot(anfrageDeps(env), token);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Shop Angebot nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    a = { status: 503, body: { ok: false, code: "nicht_eingerichtet", error: "Das Angebot ist gerade nicht verfügbar." } };
  }
  const b = a.body as Record<string, unknown>;

  if (!b.ok) {
    const code = CODES.includes(b.code as AngebotFehlerCode) ? (b.code as AngebotFehlerCode) : "db";
    return (
      <ShopShell>
        <div className="shop-wrap" style={{ maxWidth: 720 }}>
          <AngebotFehler code={code} meldung={String(b.error ?? "")} nummer={typeof b.anfragenummer === "string" ? b.anfragenummer : null} />
        </div>
      </ShopShell>
    );
  }

  const einst = await holeEinstellungen(env);
  return (
    <ShopShell banner={<PauseBanner />}>
      <div className="shop-wrap" style={{ maxWidth: 720 }}>
        <AngebotAnnahme
          pausiert={einst.bestellungPausiert}
          pauseText={einst.bestellungPausiert ? einst.pauseText : null}
          abgebrochen={zahlung === "abgebrochen"}
          angebot={{
            token,
            anfragenummer: String(b.anfragenummer ?? ""),
            name: String(b.name ?? ""),
            beschreibung: String(b.beschreibung ?? ""),
            farbe: typeof b.farbe === "string" ? b.farbe : null,
            preisCent: Number(b.preisCent),
            versandCent: Number(b.versandCent),
            gesamtCent: Number(b.gesamtCent),
            lieferzeit: typeof b.lieferzeit === "string" ? b.lieferzeit : null,
            text: typeof b.text === "string" ? b.text : null,
            gueltigBis: datumKurz(String(b.gueltigBis ?? "")),
            zahlungOffen: b.zahlungOffen === true,
          }}
        />
      </div>
    </ShopShell>
  );
}
