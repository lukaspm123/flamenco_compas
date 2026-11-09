import { describe, expect, it } from 'vitest';
import { beatAngle, beatGroups, beatSequence, beatToStep, isOffbeat, stepToBeat, STEPS } from '../src/core/compas';
import { PALOS, findPalo, hasDefaultAccents, toggleAccent } from '../src/core/palos';

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

describe('Akzente anpassen', () => {
  const solea = findPalo('solea');

  it('fügt einen Akzent hinzu und entfernt ihn wieder', () => {
    const plus1 = toggleAccent(solea, 1);
    expect(plus1.accents).toEqual([1, 3, 6, 8, 10, 12]);
    expect(toggleAccent(plus1, 1).accents).toEqual([3, 6, 8, 10, 12]);
  });

  it('verändert den Standard-Palo nicht', () => {
    toggleAccent(solea, 3);
    expect(findPalo('solea').accents).toEqual([3, 6, 8, 10, 12]);
  });

  it('erkennt Abweichungen vom Standard', () => {
    expect(hasDefaultAccents(solea)).toBe(true);
    expect(hasDefaultAccents(toggleAccent(solea, 5))).toBe(false);
    expect(hasDefaultAccents(toggleAccent(toggleAccent(solea, 5), 5))).toBe(true);
  });

  it('Gruppierung folgt den angepassten Akzenten', () => {
    const custom = toggleAccent(toggleAccent(solea, 8), 4); // Akzente 3, 4, 6, 10, 12
    expect(beatGroups(custom)).toEqual([[1, 2, 3], [4], [5, 6], [7, 8, 9, 10], [11, 12]]);
  });

  it('kommt auch ganz ohne Akzente zurecht', () => {
    let none = solea;
    for (const b of solea.accents) none = toggleAccent(none, b);
    expect(none.accents).toEqual([]);
    expect(beatGroups(none).flat()).toHaveLength(12);
    expect(beatGroups({ ...findPalo('seguiriya'), accents: [] }).flat()).toHaveLength(12);
  });
});
