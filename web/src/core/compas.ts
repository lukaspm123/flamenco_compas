/*
 * Rechnen mit Zählzeiten und Schritten.
 *
 * Ein Compás hat 12 Zählzeiten zu je 2 Schritten (Achteln), also 24 Schritte.
 * Schritt s ↔ Zählzeit floor(s/2)+1; ungerade Schritte sind Offbeats ("y").
 */
import type { Palo } from './palos';

export const BEATS = 12;
export const STEPS_PER_BEAT = 2;
export const STEPS = BEATS * STEPS_PER_BEAT;

export const beatToStep = (beat: number): number => (beat - 1) * STEPS_PER_BEAT;
export const stepToBeat = (step: number): number => Math.floor(step / STEPS_PER_BEAT) + 1;
export const isOffbeat = (step: number): boolean => step % STEPS_PER_BEAT !== 0;
export const isAccent = (palo: Palo, beat: number): boolean => palo.accents.includes(beat);

/** Winkel auf der Uhr in Grad: 12 oben, im Uhrzeigersinn. */
export const beatAngle = (beat: number): number => (beat % BEATS) * (360 / BEATS);

/** Zählzeiten eines Compás in Spielreihenfolge, beginnend bei palo.start. */
export function beatSequence(palo: Palo): number[] {
  const seq: number[] = [];
  for (let i = 0; i < BEATS; i++) seq.push(((palo.start - 1 + i) % BEATS) + 1);
  return seq;
}

/** Gruppen als Listen von Zählzeiten, z. B. Soleá: [[1,2,3],[4,5,6],[7,8],[9,10],[11,12]]. */
export function beatGroups(palo: Palo): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];

  for (const b of beatSequence(palo)) {
    if (palo.accentAt === 'start' && isAccent(palo, b) && current.length) {
      groups.push(current);
      current = [];
    }
    current.push(b);
    if (palo.accentAt === 'end' && isAccent(palo, b)) {
      groups.push(current);
      current = [];
    }
  }

  if (palo.accentAt === 'end') {
    // Zählzeiten nach dem letzten Akzent gehören zyklisch zur ersten Gruppe.
    if (current.length) {
      if (groups.length) groups[0] = current.concat(groups[0]);
      else groups.push(current);
    }
  } else {
    if (current.length) groups.push(current);
    // Zählzeiten vor dem ersten Akzent gehören zyklisch zur letzten Gruppe.
    if (groups.length > 1 && !isAccent(palo, groups[0][0])) {
      const head = groups.shift()!;
      groups[groups.length - 1] = groups[groups.length - 1].concat(head);
    }
  }
  return groups;
}
