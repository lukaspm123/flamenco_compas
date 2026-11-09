import { describe, expect, it } from 'vitest';
import { beatAngle, beatGroups, beatSequence, beatToStep, isOffbeat, stepToBeat, STEPS } from '../src/core/compas';
import { PALOS, findPalo } from '../src/core/palos';

describe('Schritte und Zählzeiten', () => {
  it('bildet Zählzeiten auf Schritte ab und zurück', () => {
    expect(STEPS).toBe(24);
    expect(beatToStep(1)).toBe(0);
    expect(beatToStep(12)).toBe(22);
    for (let b = 1; b <= 12; b++) expect(stepToBeat(beatToStep(b))).toBe(b);
    expect(stepToBeat(23)).toBe(12);
  });

  it('erkennt Offbeats', () => {
    expect(isOffbeat(0)).toBe(false);
    expect(isOffbeat(1)).toBe(true);
    expect(isOffbeat(22)).toBe(false);
  });

  it('setzt die 12 oben auf die Uhr', () => {
    expect(beatAngle(12)).toBe(0);
    expect(beatAngle(3)).toBe(90);
    expect(beatAngle(6)).toBe(180);
  });
});

describe('Spielreihenfolge', () => {
  it('beginnt bei der Soleá auf der 1', () => {
    expect(beatSequence(findPalo('solea'))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('beginnt bei der Bulería auf der 12', () => {
    expect(beatSequence(findPalo('buleria'))).toEqual([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});

describe('Gruppierung', () => {
  it('Soleá: 3+3+2+2+2, Akzent am Gruppenende', () => {
    expect(beatGroups(findPalo('solea'))).toEqual([[1, 2, 3], [4, 5, 6], [7, 8], [9, 10], [11, 12]]);
  });

  it('Bulería ab der 12: die 11 gehört zur Gruppe der 12', () => {
    expect(beatGroups(findPalo('buleria'))).toEqual([[11, 12], [1, 2, 3], [4, 5, 6], [7, 8], [9, 10]]);
  });

  it('Seguiriya: 2+2+3+3+2, Akzent am Gruppenanfang', () => {
    expect(beatGroups(findPalo('seguiriya'))).toEqual([[12, 1], [2, 3], [4, 5, 6], [7, 8, 9], [10, 11]]);
  });

  it('jede Gruppierung deckt alle 12 Zählzeiten genau einmal ab', () => {
    for (const palo of PALOS) {
      const all = beatGroups(palo).flat().sort((a, b) => a - b);
      expect(all, palo.name).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }
  });

  it('jede Gruppe enthält genau einen Akzent', () => {
    for (const palo of PALOS) {
      for (const g of beatGroups(palo)) {
        expect(g.filter((b) => palo.accents.includes(b)), `${palo.name} ${g}`).toHaveLength(1);
      }
    }
  });
});

describe('Palo-Daten', () => {
  it('Standardtempo liegt im erlaubten Bereich', () => {
    for (const p of PALOS) {
      expect(p.bpm, p.name).toBeGreaterThanOrEqual(p.min);
      expect(p.bpm, p.name).toBeLessThanOrEqual(p.max);
    }
  });

  it('unbekannte ID fällt auf den ersten Palo zurück', () => {
    expect(findPalo('gibtsnicht')).toBe(PALOS[0]);
  });
});
