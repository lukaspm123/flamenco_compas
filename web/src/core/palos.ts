/*
 * Palo-Definitionen für den 12er-Compás.
 *
 * Zählzeiten laufen von 1 bis 12; die 12 steht auf der Uhr oben.
 */

/** 'end': Akzent schließt eine Gruppe ab (Soleá-Familie, 3+3+2+2+2).
 *  'start': Akzent eröffnet eine Gruppe (Seguiriya, 2+2+3+3+2). */
export type AccentPosition = 'end' | 'start';

export interface Palo {
  id: string;
  name: string;
  /** Betonte Zählzeiten (Palmas claras). */
  accents: readonly number[];
  accentAt: AccentPosition;
  /** Zählzeit, auf der ein Compás beginnt (Bulería-Familie: 12). */
  start: number;
  /** Standardtempo und erlaubter Bereich in Grundschlägen pro Minute. */
  bpm: number;
  min: number;
  max: number;
  /**
   * Cajón: Jeder betonte Schlag bekommt einen Cajón-Schlag – auf diesen
   * Zählzeiten einen Bass, auf allen anderen Akzenten einen Slap.
   * Unbetonte Schläge bleiben ohne Cajón, damit angepasste Akzente hörbar sind.
   */
  bajo: readonly number[];
  info: string;
}

const SOLEA: readonly number[] = [3, 6, 8, 10, 12];

export const PALOS: readonly Palo[] = [
  {
    id: 'solea',
    name: 'Soleá',
    accents: SOLEA,
    accentAt: 'end',
    start: 1,
    bpm: 110,
    min: 50,
    max: 200,
    bajo: [3, 10],
    info: 'Getragen und schwer. Gruppierung 3+3+2+2+2, Akzente auf 3 · 6 · 8 · 10 · 12.',
  },
  {
    id: 'alegrias',
    name: 'Alegrías',
    accents: SOLEA,
    accentAt: 'end',
    start: 1,
    bpm: 160,
    min: 80,
    max: 260,
    bajo: [3, 10],
    info: 'Gleicher Compás wie die Soleá, aber hell und deutlich schneller.',
  },
  {
    id: 'soleaporbuleria',
    name: 'Soleá por Bulería',
    accents: SOLEA,
    accentAt: 'end',
    start: 12,
    bpm: 150,
    min: 80,
    max: 240,
    bajo: [3, 10],
    info: 'Mittleres Tempo, gezählt ab der 12. Akzente auf 12 · 3 · 6 · 8 · 10.',
  },
  {
    id: 'buleria',
    name: 'Bulería',
    accents: SOLEA,
    accentAt: 'end',
    start: 12,
    bpm: 200,
    min: 120,
    max: 320,
    bajo: [3, 10],
    info: 'Schnell, gezählt ab der 12. Tipp: Contratiempo einschalten.',
  },
  {
    id: 'guajira',
    name: 'Guajira',
    accents: SOLEA,
    accentAt: 'end',
    start: 12,
    bpm: 120,
    min: 60,
    max: 200,
    bajo: [3, 10],
    info: 'Amalgam aus 6/8 und 3/4, gezählt ab der 12. Akzente auf 12 · 3 · 6 · 8 · 10.',
  },
  {
    id: 'seguiriya',
    name: 'Seguiriya',
    accents: [12, 2, 4, 7, 10],
    accentAt: 'start',
    start: 12,
    bpm: 140,
    min: 70,
    max: 240,
    bajo: [12, 7],
    info: 'Gruppierung 2+2+3+3+2 ab der 12. Akzente auf 12 · 2 · 4 · 7 · 10.',
  },
];

/** Liefert den Palo mit seinen Standard-Akzenten (unbekannte ID → erster Palo). */
export function findPalo(id: string | undefined): Palo {
  return PALOS.find((p) => p.id === id) ?? PALOS[0];
}

/** Neue Palo-Variante, in der `beat` zwischen betont und unbetont umgeschaltet ist. */
export function toggleAccent(palo: Palo, beat: number): Palo {
  const accents = palo.accents.includes(beat)
    ? palo.accents.filter((b) => b !== beat)
    : [...palo.accents, beat];
  return { ...palo, accents: accents.sort((a, b) => a - b) };
}

/** true, wenn die Akzente denen des Standard-Palo entsprechen. */
export function hasDefaultAccents(palo: Palo): boolean {
  const defaults = findPalo(palo.id).accents;
  return defaults.length === palo.accents.length && defaults.every((b) => palo.accents.includes(b));
}
