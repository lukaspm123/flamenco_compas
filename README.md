# Compás Trainer

Übungstool für Flamenco-Gitarre mit Fokus auf den 12er-Compás: Die App erzeugt
einen Rhythmus aus Palmas und Cajón und zeigt dazu den Compás als Uhr an.

**Online:** https://lukaspm123.github.io/flamenco_compas/ (wird bei jedem Push auf `main` automatisch aktualisiert)

## Lokal entwickeln

Voraussetzung: Node.js (LTS oder neuer).

```sh
cd web
npm install        # einmalig
npm run dev        # Entwicklungsserver: http://localhost:5173
npm test           # Tests
npm run build      # Produktions-Build nach web/dist
```

## Funktionen

- Compás-Uhr: 12 oben, Akzente hervorgehoben, Gruppenbögen (z. B. 3+3+2+2+2),
  Zeiger springt von Zählzeit zu Zählzeit, Fortschrittsring; dazu eine Leiste in Spielreihenfolge
- Palos: Soleá, Alegrías, Soleá por Bulería, Bulería, Guajira, Seguiriya
- Synthetisierte Palmas claras/sordas, Cajón (Bass/Slap) und Metronom-Klick
- Tempo per Slider, Tasten oder Tap-Tempo (Tempo wird pro Palo gemerkt)
- Vorzähler, Contratiempo (Sordas auf dem Offbeat), Mixer, Gesamtlautstärke bis 200 %
- Tempo-Trainer: alle *n* Compases automatisch schneller bis zu einem Zieltempo
- Visueller Versatz für Kopfhörer mit hoher Latenz (Bluetooth)
- Tag-/Nachtmodus

Tastatur: Leertaste Start/Stop · ↑/↓ ±5 BPM · ←/→ ±1 BPM · T Tap-Tempo · D Tag/Nacht

## Projektstruktur

```
web/                         Browser-App (Vite + TypeScript)
├─ index.html
├─ src/
│  ├─ main.ts                Einstiegspunkt, Animationsschleife
│  ├─ core/                  reine Logik ohne Browser-APIs (getestet)
│  │  ├─ palos.ts            Palo-Definitionen
│  │  ├─ compas.ts           Zählzeiten ↔ Schritte, Gruppierung, Uhrwinkel
│  │  ├─ timeline.ts         Zeit → Compás-Position
│  │  └─ tapTempo.ts         Tap-Tempo
│  ├─ audio/
│  │  ├─ engine.ts           Lookahead-Scheduler, Master-Uhr, Mischpult
│  │  ├─ sounds.ts           Percussion-Synthese (Web Audio API)
│  │  └─ sources/generator.ts  welches Instrument auf welchem Schritt spielt
│  ├─ ui/                    clock.ts · controls.ts · dialogs.ts · theme.ts
│  ├─ state/settings.ts      Einstellungen (localStorage)
│  └─ styles/main.css
└─ tests/                    Vitest
.github/workflows/deploy.yml Test, Build und Veröffentlichung auf GitHub Pages
```

Geplant für Stufe 2: `analysis/` (Python-Pipeline für Beat-Erkennung und Gitarren-Entfernung)
und `shared/` (Beat-Grid-Schema als Vertrag zwischen Python und Web).
Audiodateien gehören nach `tracks/` – dieser Ordner wird nicht versioniert.

## Wie Bild und Ton synchron bleiben

Die AudioContext-Uhr ist der einzige Taktgeber. Die Engine plant Klänge etwas im
Voraus exakt ein und trägt jeden Schritt in eine Zeitleiste ein. Die Uhr fragt in
jedem Frame nur, welcher Schritt gerade erklingt (abzüglich Ausgabelatenz) –
Bild und Ton können dadurch nicht auseinanderlaufen. Eigene Backing Tracks
(Stufe 2) bedienen später dieselbe Zeitleiste über ein Beat-Grid.

## Roadmap

1. ~~Compás-Generator mit Uhr~~ (MVP)
2. Eigene Backing Tracks (MP3/WAV) mit Beat-Grid / Tempo-Map und manueller Korrektur,
   langsamer abspielen ohne Tonhöhenänderung, Loops
3. Mikrofon-Feedback: Anschläge erkennen und Abweichung vom Compás anzeigen
4. Optional: Spotify/YouTube mit manuell gesetztem Beat-Grid
