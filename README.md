# Compás Trainer

Übungstool für Flamenco-Gitarre mit Fokus auf den 12er-Compás: Die App erzeugt
einen Rhythmus aus Palmas und Cajón und zeigt dazu den Compás als Uhr an.

## Starten

Es gibt keinen Build-Schritt und keine Abhängigkeiten: **`index.html` im Browser
öffnen** (Doppelklick genügt). Chrome, Edge oder Firefox empfohlen.

## Funktionen (MVP)

- Compás-Uhr: 12 oben, Akzente hervorgehoben, Gruppenbögen (z. B. 3+3+2+2+2),
  umlaufender Zeiger und Fortschrittsring; dazu eine lineare Leiste in Spielreihenfolge
- Palos: Soleá, Alegrías, Soleá por Bulería, Bulería, Guajira, Seguiriya
- Synthetisierte Palmas claras/sordas, Cajón (Bass/Slap) und Metronom-Klick
- Tempo per Slider, Tasten oder Tap-Tempo (Tempo wird pro Palo gemerkt)
- Vorzähler, Contratiempo (Sordas auf dem Offbeat), Mixer
- Tempo-Trainer: alle *n* Compases automatisch schneller bis zu einem Zieltempo
- Visueller Versatz für Kopfhörer mit hoher Latenz (Bluetooth)

Tastatur: Leertaste Start/Stop · ↑/↓ ±5 BPM · ←/→ ±1 BPM · T Tap-Tempo

## Architektur

```
src/palos.js   Palo-Definitionen (Akzente, Gruppierung, Startschlag, Cajón-Pattern)
src/sounds.js  Percussion-Synthese mit der Web Audio API
src/engine.js  Lookahead-Scheduler; die AudioContext-Uhr ist der einzige Taktgeber
src/clock.js   SVG-Uhr und Leiste; liest pro Frame nur die Position aus der Engine
src/app.js     UI, Einstellungen (localStorage), Animationsschleife
```

Die Uhr wird nicht über eigene Timer animiert, sondern fragt in jedem Frame die
Engine, welcher Schritt gerade erklingt (abzüglich Ausgabelatenz). Bild und Ton
können dadurch nicht auseinanderlaufen. Darauf baut auch Stufe 2 auf.

## Roadmap

1. ~~Compás-Generator mit Uhr~~ (MVP)
2. Eigene Backing Tracks (MP3/WAV) mit Beat-Grid / Tempo-Map und manueller Korrektur,
   langsamer abspielen ohne Tonhöhenänderung, Loops
3. Mikrofon-Feedback: Anschläge erkennen und Abweichung vom Compás anzeigen
4. Optional: Spotify/YouTube mit manuell gesetztem Beat-Grid
