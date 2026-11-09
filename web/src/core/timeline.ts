/*
 * Zeitleiste der geplanten Schritte: übersetzt eine Zeit in eine Compás-Position.
 *
 * Die Audio-Engine trägt jeden eingeplanten Schritt mit seinem exakten
 * Zeitpunkt ein; die Visualisierung fragt nur positionAt(jetzt).
 * Später kann eine Tempo-Map aus einem Beat-Grid dieselbe Schnittstelle bedienen.
 */
import { stepToBeat } from './compas';

export interface StepEvent {
  /** Zeitpunkt in Sekunden (AudioContext-Zeit). */
  time: number;
  step: number;
  countIn: boolean;
  /** Index des Compás ab 0; -1 während des Vorzählers. */
  cycle: number;
}

export interface CompasPosition {
  /** Schritt inkl. Bruchteil bis zum nächsten Schritt (0 … 24). */
  stepFloat: number;
  /** Aktuelle Zählzeit 1 … 12. */
  beat: number;
  countIn: boolean;
  cycle: number;
}

export class StepTimeline {
  private events: StepEvent[] = [];

  push(event: StepEvent): void {
    this.events.push(event);
  }

  clear(): void {
    this.events = [];
  }

  get size(): number {
    return this.events.length;
  }

  /** Entfernt Ereignisse vor `before`, behält aber immer mindestens das letzte davon. */
  trim(before: number): void {
    while (this.events.length > 2 && this.events[1].time < before) this.events.shift();
  }

  /**
   * Position zum Zeitpunkt `time`, oder null vor dem ersten Ereignis.
   * `fallbackStepDuration` gilt, wenn noch kein Folgeschritt eingeplant ist.
   */
  positionAt(time: number, fallbackStepDuration: number): CompasPosition | null {
    let i = -1;
    for (let k = this.events.length - 1; k >= 0; k--) {
      if (this.events[k].time <= time) {
        i = k;
        break;
      }
    }
    if (i < 0) return null;

    const e0 = this.events[i];
    const e1 = this.events[i + 1];
    const duration = e1 ? e1.time - e0.time : fallbackStepDuration;
    const frac = duration > 0 ? Math.min(1, Math.max(0, (time - e0.time) / duration)) : 0;
    return {
      stepFloat: e0.step + frac,
      beat: stepToBeat(e0.step),
      countIn: e0.countIn,
      cycle: e0.cycle,
    };
  }
}
