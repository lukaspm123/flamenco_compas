/*
 * Eingebauter Compás-Generator: entscheidet für jeden Schritt, welche
 * Instrumente erklingen. Reine Logik ohne Web Audio – dadurch testbar.
 */
import { isAccent, isOffbeat, stepToBeat } from '../../core/compas';
import type { Palo } from '../../core/palos';
import type { Instrument } from '../sounds';

/** Mischpult-Kanal; 'master' umgeht die Einzelregler (Vorzähler). */
export type Bus = 'claras' | 'sordas' | 'cajon' | 'click' | 'master';

export interface Hit {
  instrument: Instrument;
  bus: Bus;
  velocity: number;
  accent?: boolean;
}

export interface GeneratorOptions {
  /** Sordas auf dem Offbeat statt auf den unbetonten Zählzeiten. */
  contratiempo: boolean;
  /** Metronom-Klick auf jeder Zählzeit. */
  click: boolean;
}

export function generatorHits(palo: Palo, step: number, countIn: boolean, options: GeneratorOptions): Hit[] {
  const beat = stepToBeat(step);
  const offbeat = isOffbeat(step);
  const accent = isAccent(palo, beat);
  const hits: Hit[] = [];

  if (countIn) {
    // Vorzähler: nur Klicks, unabhängig vom Klick-Regler hörbar.
    if (!offbeat) hits.push({ instrument: 'click', bus: 'master', velocity: accent ? 0.9 : 0.55, accent });
    return hits;
  }

  if (offbeat) {
    if (options.contratiempo) hits.push({ instrument: 'sorda', bus: 'sordas', velocity: 0.85 });
    return hits;
  }

  if (options.click) hits.push({ instrument: 'click', bus: 'click', velocity: accent ? 1 : 0.6, accent });
  if (accent) hits.push({ instrument: 'clara', bus: 'claras', velocity: 1 });
  else if (!options.contratiempo) hits.push({ instrument: 'sorda', bus: 'sordas', velocity: 0.8 });
  if (palo.bajo.includes(beat)) hits.push({ instrument: 'bajo', bus: 'cajon', velocity: 1 });
  if (palo.slap.includes(beat)) hits.push({ instrument: 'slap', bus: 'cajon', velocity: accent ? 1 : 0.7 });
  return hits;
}
