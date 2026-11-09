import { describe, expect, it } from 'vitest';
import { TapTempo } from '../src/core/tapTempo';

describe('TapTempo', () => {
  it('braucht mindestens zwei Tipps', () => {
    expect(new TapTempo().tap(0)).toBeNull();
  });

  it('berechnet BPM aus dem Abstand', () => {
    const t = new TapTempo();
    t.tap(0);
    expect(t.tap(500)).toBeCloseTo(120);
  });

  it('mittelt über mehrere Tipps', () => {
    const t = new TapTempo();
    [0, 480, 1000].forEach((ms) => t.tap(ms));
    expect(t.tap(1500)).toBeCloseTo(120);
  });

  it('beginnt nach einer langen Pause neu', () => {
    const t = new TapTempo();
    t.tap(0);
    t.tap(1000); // 60 BPM
    expect(t.tap(5000)).toBeNull();
    expect(t.tap(5250)).toBeCloseTo(240);
  });

  it('berücksichtigt nur die letzten Tipps', () => {
    const t = new TapTempo(3);
    [0, 1000, 2000].forEach((ms) => t.tap(ms)); // 60 BPM
    t.tap(2500);
    expect(t.tap(3000)).toBeCloseTo(120); // nur 2000, 2500, 3000
  });
});
