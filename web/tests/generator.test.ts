import { describe, expect, it } from 'vitest';
import { generatorHits, type GeneratorOptions } from '../src/audio/sources/generator';
import { beatToStep } from '../src/core/compas';
import { findPalo } from '../src/core/palos';

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
    expect(instruments(6)).toContain('slap');
    expect(instruments(1)).not.toContain('bajo');
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
