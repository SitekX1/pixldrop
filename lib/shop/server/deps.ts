import "server-only";
// Verdrahtung der echten Abhaengigkeiten aus den Umgebungsvariablen fuer die Routen.
import { erzeugeDb, type Db } from "./db";
import { leseEnv, fehlendeAnfrageEnv, fehlendeBestellEnv, type ShopEnv } from "./env";
import { erzeugePayPal } from "./paypal";
import { erzeugeBenachrichtiger } from "./benachrichtigung";
import type { Deps } from "./bestellung";
import type { Kontext } from "./preise";
import { sichtbareProdukte, istBestellbar } from "../produkte";
import { VERSAND_CENT } from "../config";
import { holeLagerFarben } from "../farben";

export class NichtEingerichtet extends Error {
  constructor(public readonly fehlend: string[]) {
    super("Shop nicht eingerichtet");
    this.name = "NichtEingerichtet";
  }
}

export function erzeugeDbAusEnv(env: ShopEnv): Db {
  return erzeugeDb({ url: env.dbUrl!, anonKey: env.dbAnonKey!, secret: env.dbSecret! });
}

/** Bestell-/Zahlungsabhaengigkeiten. Wirft NichtEingerichtet, wenn Variablen fehlen. */
export function bestellDeps(env: ShopEnv = leseEnv()): Deps {
  const fehlt = fehlendeBestellEnv(env);
  if (fehlt.length) throw new NichtEingerichtet(fehlt);
  return {
    env,
    db: erzeugeDbAusEnv(env),
    paypal: erzeugePayPal({
      env: env.paypalEnv,
      clientId: env.paypalClientId!,
      clientSecret: env.paypalClientSecret!,
      webhookId: env.paypalWebhookId,
    }),
    notifier: erzeugeBenachrichtiger(env),
  };
}

export function anfrageDeps(env: ShopEnv = leseEnv()) {
  const fehlt = fehlendeAnfrageEnv(env);
  if (fehlt.length) throw new NichtEingerichtet(fehlt);
  return { env, db: erzeugeDbAusEnv(env), notifier: erzeugeBenachrichtiger(env) };
}

/** Katalog + aktuelle Lagerfarben + Versandkosten fuer die Preisberechnung. */
export async function standardKontext(): Promise<Kontext> {
  return {
    produkte: sichtbareProdukte(),
    farben: await holeLagerFarben(),
    versandCent: VERSAND_CENT,
    bestellbar: istBestellbar,
  };
}
