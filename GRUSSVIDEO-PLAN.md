# Grußvideo-Produkt — Plan (Stand 2026-09-06)

Arbeitsdokument für `/gruss` auf `feature/grussvideo`. Nicht live, bis alles hier steht und getestet ist.

## Angebot (final, reduziert)

Nur zwei Anlässe, mehr aktuell nicht:

| Anlass | Varianten | Preis (Vorschlag, Alex final) |
|---|---|---|
| Geburtstag | Gesprochen | 3–6€ |
| Geburtstag | Gesungen (~25s Song) | 8–12€ |
| Einladung | Gesprochen (fix, keine Auswahl) | 8–14€ |

Keine Längen-Auswahl durch den Kunden mehr — pro Kombination gibt's genau ein Video, Länge legt PixlDrop intern fest.

## Warum "Gesungen" nur bei Geburtstag, nur eine Länge

- Suno **Replace Section** kann nur Abschnitte in einem selbst erstellten Suno-Song ersetzen (nicht bei echten fremden Songs) — Mindestlänge des markierten Abschnitts: 10 Sekunden.
- Deshalb: **eine feste Song-Vorlage** ("Eddies Geburtstagslied", Platzhaltername), pro Bestellung wird nur die Namenszeile per Replace Section neu generiert (2 Varianten zur Auswahl, bessere nehmen). Kein individueller Suno-Song pro Anfrage nötig → günstiger & schneller als ursprünglich angenommen.
- Ein 8-Sekunden-Song ergibt damit keinen Sinn (zu kurz für einen echten Songausschnitt) → Gesungen gibt's nur als voller ~25s-Ausschnitt.
- Für andere Anlässe (Jubiläum, Aufmunterung etc.) gäbe es noch keine Song-Vorlage — deshalb aktuell nicht angeboten. Später erweiterbar, sobald weitere Vorlagen existieren.

## Warum Einladung aufwendiger/teurer

Individueller Text pro Anfrage (Datum, Ort, RSVP, Kleidung...), keine wiederverwendbare Vorlage möglich wie beim Geburtstagssong. Nur gesprochen — eine Melodie dafür zu bauen lohnt sich (noch) nicht.

## Formular-Logik (`components/GrussForm.tsx`)

- **Anlass**: Dropdown, nur `Geburtstag` / `Einladung` (bisherige `Jubiläum`/`Aufmunterung`/`Einfach so` raus)
- **Variante** (ersetzt die alte "Ton"-Auswahl Süß/Schwarzer Humor komplett):
  - Anlass = Geburtstag → Dropdown mit `Gesungen` / `Gesprochen`
  - Anlass = Einladung → fix auf `Gesprochen`, als Info sichtbar (kein echtes Auswahlmenü), damit der Kunde weiß, was er bekommt
- **Text-Modus** (neu, zwei Radio-Buttons über dem Nachrichtenfeld):
  - "Ich gebe dir den genauen Text vor, den Eddie sagen soll"
  - "Nur Stichpunkte — ihr schreibt den Text für mich"
  - Grund: Wenn PixlDrop den Text frei formuliert, könnte dem Kunden das Ergebnis am Ende nicht gefallen. Wer will, gibt exakten Wortlaut vor.
- **Nachrichtenfeld-Hinweis**: fester Text **unter/über** dem Feld (nicht im Placeholder — der verschwindet ja beim Tippen), abhängig vom Anlass:
  - Geburtstag: "z. B. Name der Person, worüber sie sich freut, Insider-Witz..."
  - Einladung: "Bitte angeben: Was wird gefeiert, Datum & Uhrzeit, Ort, Kleidung, bis wann Rückmeldung..."
- KI-Textvorschlag aus Stichpunkten (automatisch generierter Textentwurf per Sprachmodell): **bewusst nicht gebaut** — Text-Modus-Auswahl löst das eigentliche Problem (Enttäuschung über Formulierung) schon ohne die zusätzliche Komplexität/Kosten pro Anfrage. Kann später nachgezogen werden, falls sich in der Praxis zeigt, dass es gebraucht wird.

## Datenbank

Neue Spalte auf `pixldrop_gruss_leads` (nur im neuen Supabase-Projekt `dbrdjaowptasjwirgtfu`, da Production eh noch auf dem alten Stand bleibt bis zum Cutover):
- `text_mode text` — `'exact_text'` oder `'stichpunkte'`

Bestehende Spalte `tone` wird inhaltlich umgewidmet: speichert jetzt `Gesungen`/`Gesprochen` statt der alten Süß/Schwarzer-Humor-Werte.

## Assets, die noch fehlen (Alex, morgen)

1. Suno-Song "Eddies Geburtstagslied" mit Platzhaltername, Replace-Section-Workflow einmal durchtesten (unterschiedlich lange Namen ausprobieren)
2. Beispielvideo: Geburtstag — Gesprochen
3. Beispielvideo: Geburtstag — Gesungen (nutzt den fertigen Song)
4. Beispielvideo: Einladung — Gesprochen

Bis dahin: bestehende Beispielvideos bleiben als Platzhalter drin, Beschriftung schon auf die neuen Kategorien umgestellt.

## Reihenfolge

1. ~~Plan dokumentieren~~ ✅ (diese Datei)
2. Formular-Logik + Preise + Seiten-Copy umsetzen (heute, Code)
3. Suno-Song + 3 Beispielvideos produzieren (morgen, Alex)
4. Platzhalter-Videos gegen echte tauschen
5. Auf Preview testen
6. Erst dann über Live-Schaltung nachdenken (weiterhin: nicht ohne ausdrückliche Freigabe)
