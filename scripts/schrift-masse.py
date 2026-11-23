"""Erzeugt lib/shop/schrift-masse.ts: Maße je Schrift und Zeichen für Wandbuchstaben (Passt-aufs-Druckbett, Gewicht).

Aufruf (Entwicklungswerkzeug, nicht im Build): python -I scripts/schrift-masse.py <Ordner mit den Schriftdateien>
Alle Zahlen sind in Einheiten der Großbuchstabenhöhe (Höhe des "H" = 1). Mal die gewählte Höhe in mm ergibt Millimeter.
Je Zeichen: [Breite, Höhe, Fläche, unterhalb der Grundlinie] (Umriss-Box des Buchstabens und gefüllte Fläche ohne Löcher).
Schnitte wie im Konfigurator (components/shop/WandKonfigurator.tsx): Bold 700, bei Great Vibes/Mansalva/Parisienne/Marck Script Regular.
"""
import json
import os
import sys

from fontTools.pens.areaPen import AreaPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# id in lib/shop/schriften-wand.ts -> (Datei, Gewicht oder None bei fester Datei)
SCHRIFTEN = {
    "libre-baskerville": ("LibreBaskerville[wght].ttf", 700),
    "cormorant": ("CormorantGaramond[wght].ttf", 700),
    "playfair": ("PlayfairDisplay[wght].ttf", 700),
    "great-vibes": ("GreatVibes-Regular.ttf", None),
    "montserrat": ("Montserrat[wght].ttf", 700),
    "outfit": ("Outfit[wght].ttf", 700),
    "arimo": ("Arimo[wght].ttf", 700),
    "courier-prime": ("CourierPrime-Bold.ttf", None),
    "parisienne": ("Parisienne-Regular.ttf", None),
    "marck-script": ("MarckScript-Regular.ttf", None),
    "mansalva": ("Mansalva-Regular.ttf", None),
    "dancing-script": ("DancingScript[wght].ttf", 700),
}
ZEICHEN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß0123456789.,!&'-"


def main(ordner, ziel):
    ergebnis = {}
    for sid, (datei, gewicht) in SCHRIFTEN.items():
        f = TTFont(os.path.join(ordner, datei))
        if gewicht and "fvar" in f:
            f = instancer.instantiateVariableFont(f, {"wght": gewicht})
        cmap = f.getBestCmap()
        gs = f.getGlyphSet()
        hmtx = f["hmtx"]

        def box(ch):
            bp = BoundsPen(gs)
            gs[cmap[ord(ch)]].draw(bp)
            return bp.bounds

        cap = box("H")[3]
        if not cap:
            raise SystemExit(f"{sid}: keine Großbuchstabenhöhe")
        zeichen = {}
        for ch in ZEICHEN:
            if ord(ch) not in cmap:
                continue  # Schrift hat das Zeichen nicht: nicht bestellbar
            b = box(ch)
            if b is None:
                continue
            ap = AreaPen(gs)
            gs[cmap[ord(ch)]].draw(ap)
            zeichen[ch] = [
                round((b[2] - b[0]) / cap, 4),
                round((b[3] - b[1]) / cap, 4),
                round(abs(ap.value) / cap / cap, 4),
                round(max(0.0, -b[1]) / cap, 4),
            ]
        ergebnis[sid] = {"zeichen": zeichen}
        fehlt = [c for c in ZEICHEN if c not in zeichen]
        print(f"{sid}: {len(zeichen)} Zeichen, fehlt: {''.join(fehlt) or '-'}")
    with open(ziel, "w", encoding="utf-8") as out:
        out.write("// Erzeugt mit scripts/schrift-masse.py, nicht von Hand ändern.\n")
        out.write("// Je Schrift und Zeichen: [Breite, Höhe, Fläche, unterhalb der Grundlinie] in Einheiten der Großbuchstabenhöhe.\n")
        out.write("const masse: Record<string, { zeichen: Record<string, [number, number, number, number]> }> = ")
        json.dump(ergebnis, out, ensure_ascii=False, separators=(",", ":"))
        out.write(";\nexport default masse;\n")
    print("geschrieben:", ziel, os.path.getsize(ziel), "Bytes")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1], os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib", "shop", "schrift-masse.ts"))
