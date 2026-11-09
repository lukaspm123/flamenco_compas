import { describe, expect, it } from 'vitest';
import { generatorHits, type GeneratorOptions } from '../src/audio/sources/generator';
import { beatToStep } from '../src/core/compas';
import { findPalo, toggleAccent } from '../src/core/palos';

const solea = findPalo('solea');
const plain: GeneratorOptions = { contratiempo: false, click: false };
const instruments = (beat: number, opts = plain, offbeat = false, countIn = false) =>
  generatorHits(solea, beatToStep(beat) + (offbeat ? 1 : 0), countIn, opts).map((h) => h.instrument);

describe('Compás-Generator', () => {
  it('spielt Palmas claras auf den Akzenten', () => {
    for (const b of [3, 6, 8, 10, 12]) expect(instruments(b)).toContain('clara');
  });

  it('spielt Palmas sordas auf den unbetonten Zählzeiten', () => {
    for (const b of [1, 2, 4, 5, 7, 9, 11]) {
      expect(instruments(b)).toContain('sorda');
      expect(instruments(b)).not.toContain('clara');
    }
  });

  it('ist auf dem Offbeat ohne Contratiempo still', () => {
    expect(instruments(1, plain, true)).toEqual([]);
  });

  it('verlegt die Sordas bei Contratiempo auf den Offbeat', () => {
    const contra = { ...plain, contratiempo: true };
    expect(instruments(1, contra)).not.toContain('sorda');
    expect(instruments(1, contra, true)).toEqual(['sorda']);
  });

  it('spielt das Cajón-Pattern des Palo', () => {
    expect(instruments(3)).toContain('bajo');
    expect(instruments(10)).toContain('bajo');
    for (const b of [6, 8, 12]) expect(instruments(b)).toContain('slap');
    for (const b of [1, 2, 4, 5, 7, 9, 11]) {
      expect(instruments(b)).not.toContain('bajo');
      expect(instruments(b)).not.toContain('slap');
    }
  });

  it('nimmt einer entfernten Betonung auch das Cajón weg', () => {
    const ohne6 = toggleAccent(solea, 6);
    const hits = generatorHits(ohne6, beatToStep(6), false, plain).map((h) => h.instrument);
    expect(hits).toEqual(['sorda']);
  });

  it('gibt einer hinzugefügten Betonung Palmas claras und Cajón', () => {
    const mit5 = toggleAccent(solea, 5);
    const hits = generatorHits(mit5, beatToStep(5), false, plain).map((h) => h.instrument);
    expect(hits).toEqual(['clara', 'slap']);
  });

  it('behält den Bass, wenn eine Bass-Zählzeit wieder betont wird', () => {
    const wieder3 = toggleAccent(toggleAccent(solea, 3), 3);
    expect(generatorHits(wieder3, beatToStep(3), false, plain).map((h) => h.instrument)).toContain('bajo');
  });

  it('klickt nur mit eingeschaltetem Metronom', () => {
    expect(instruments(1)).not.toContain('click');
    expect(instruments(1, { ...plain, click: true })).toContain('click');
  });

  it('spielt im Vorzähler nur Klicks über den Master-Kanal', () => {
    const hits = generatorHits(solea, beatToStep(3), true, plain);
    expect(hits).toEqual([{ instrument: 'click', bus: 'master', velocity: 0.9, accent: true }]);
    expect(generatorHits(solea, beatToStep(3) + 1, true, plain)).toEqual([]);
  });
});
