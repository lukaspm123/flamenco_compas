import { describe, expect, it } from 'vitest';
import { StepTimeline } from '../src/core/timeline';

function timelineWithSteps(stepDuration: number, firstStep: number, count: number): StepTimeline {
  const tl = new StepTimeline();
  for (let i = 0; i < count; i++) {
    tl.push({ time: 1 + i * stepDuration, step: (firstStep + i) % 24, countIn: false, cycle: 0 });
  }
  return tl;
}

describe('StepTimeline', () => {
  it('liefert null vor dem ersten Schritt', () => {
    expect(timelineWithSteps(0.25, 0, 4).positionAt(0.5, 0.25)).toBeNull();
  });

  it('findet Schritt und Zählzeit zu einer Zeit', () => {
    const tl = timelineWithSteps(0.25, 0, 8); // Schritte 0..7 ab t=1
    const pos = tl.positionAt(1.6, 0.25)!; // zwischen Schritt 2 (1.5) und 3 (1.75)
    expect(pos.beat).toBe(2);
    expect(pos.stepFloat).toBeCloseTo(2.4);
  });

  it('springt exakt zum Schrittzeitpunkt um', () => {
    const tl = timelineWithSteps(0.25, 0, 8);
    expect(tl.positionAt(1.4999, 0.25)!.beat).toBe(1);
    expect(tl.positionAt(1.5, 0.25)!.beat).toBe(2);
  });

  it('läuft über das Compás-Ende von der 12 zur 1', () => {
    const tl = timelineWithSteps(0.25, 22, 4); // Schritte 22, 23, 0, 1
    expect(tl.positionAt(1.0, 0.25)!.beat).toBe(12);
    expect(tl.positionAt(1.5, 0.25)!.beat).toBe(1);
  });

  it('folgt Tempowechseln (ungleiche Abstände)', () => {
    const tl = new StepTimeline();
    tl.push({ time: 0, step: 0, countIn: false, cycle: 0 });
    tl.push({ time: 0.5, step: 1, countIn: false, cycle: 0 });
    tl.push({ time: 0.6, step: 2, countIn: false, cycle: 0 });
    expect(tl.positionAt(0.55, 1)!.stepFloat).toBeCloseTo(1.5);
  });

  it('nutzt die Ersatzdauer hinter dem letzten Schritt und begrenzt auf den nächsten Schritt', () => {
    const tl = timelineWithSteps(0.25, 0, 1);
    expect(tl.positionAt(1.1, 0.2)!.stepFloat).toBeCloseTo(0.5);
    expect(tl.positionAt(5, 0.2)!.stepFloat).toBe(1);
  });

  it('trim behält das Ereignis, das gerade gilt', () => {
    const tl = timelineWithSteps(0.25, 0, 8);
    tl.trim(1.6);
    expect(tl.positionAt(1.6, 0.25)!.beat).toBe(2);
  });
});
