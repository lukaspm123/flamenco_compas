/*
 * Audio-Engine mit Lookahead-Scheduler ("A Tale of Two Clocks").
 *
 * Die AudioContext-Uhr ist der einzige Taktgeber. Ein Timer plant Klänge
 * etwas im Voraus exakt ein und trägt jeden Schritt in die Zeitleiste ein.
 * Die Visualisierung liest daraus nur ab, wo im Compás man sich gerade
 * befindet – so können Bild und Ton nicht auseinanderdriften.
 */
import { STEPS, beatToStep } from '../core/compas';
import { PALOS, type Palo } from '../core/palos';
import { StepTimeline, type CompasPosition } from '../core/timeline';
import { createSounds, type Sounds } from './sounds';
import { generatorHits } from './sources/generator';

const LOOKAHEAD = 0.12; // Sekunden, die im Voraus geplant werden
const INTERVAL = 25; // ms zwischen Scheduler-Durchläufen
const HISTORY = 2; // Sekunden Verlauf für die Visualisierung

export type VolumeBus = 'claras' | 'sordas' | 'cajon' | 'click';
export const VOLUME_BUSES: readonly VolumeBus[] = ['claras', 'sordas', 'cajon', 'click'];

export interface TrainerOptions {
  enabled: boolean;
  /** Alle wie viele Compases das Tempo steigt. */
  every: number;
  /** BPM-Zuwachs pro Stufe. */
  increment: number;
  /** Zieltempo, bei dem der Trainer stoppt. */
  target: number;
}

export interface EngineOptions {
  countIn: boolean;
  contratiempo: boolean;
  click: boolean;
  trainer: TrainerOptions;
}

interface AudioGraph {
  ctx: AudioContext;
  master: GainNode;
  buses: Record<VolumeBus, GainNode>;
  sounds: Sounds;
}

export class Engine {
  palo: Palo = PALOS[0];
  bpm = PALOS[0].bpm;
  playing = false;
  options: EngineOptions = {
    countIn: true,
    contratiempo: false,
    click: false,
    trainer: { enabled: false, every: 4, increment: 2, target: 200 },
  };
  /** Wird aufgerufen, wenn der Tempo-Trainer das Tempo erhöht. */
  onBpmChange: ((bpm: number) => void) | null = null;

  private volumes: Record<VolumeBus, number> = { claras: 0.8, sordas: 0.6, cajon: 0.8, click: 0.6 };
  private masterVolume = 0.9;
  private graph: AudioGraph | null = null;
  private timeline = new StepTimeline();
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private startStep = 0;
  private nextTime = 0;
  private cycle = 0;
  private countInSteps = 0;

  private ensureGraph(): AudioGraph {
    if (this.graph) return this.graph;
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    // Kompressor fängt Spitzen ab, auch bei Übersteuerung über 100 %.
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    const master = ctx.createGain();
    master.gain.value = this.masterVolume;
    master.connect(comp);
    const buses = {} as Record<VolumeBus, GainNode>;
    for (const bus of VOLUME_BUSES) {
      const g = ctx.createGain();
      g.gain.value = this.volumes[bus];
      g.connect(master);
      buses[bus] = g;
    }
    this.graph = { ctx, master, buses, sounds: createSounds(ctx) };
    return this.graph;
  }

  setVolume(bus: VolumeBus, value: number): void {
    this.volumes[bus] = value;
    if (this.graph) this.graph.buses[bus].gain.setTargetAtTime(value, this.graph.ctx.currentTime, 0.02);
  }

  /** Gesamtlautstärke 0–2 (bis 200 %); wirkt auf alle Spuren inkl. Vorzähler. */
  setMasterVolume(value: number): void {
    this.masterVolume = value;
    if (this.graph) this.graph.master.gain.setTargetAtTime(value, this.graph.ctx.currentTime, 0.02);
  }

  setPalo(palo: Palo): void {
    this.palo = palo;
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
  }

  start(): void {
    const { ctx } = this.ensureGraph();
    void ctx.resume();
    this.startStep = beatToStep(this.palo.start);
    this.step = this.startStep;
    this.nextTime = ctx.currentTime + 0.08;
    this.timeline.clear();
    this.cycle = 0;
    this.countInSteps = this.options.countIn ? STEPS : 0;
    this.playing = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), INTERVAL);
    this.schedule();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
    this.timeline.clear();
  }

  /**
   * Aktuelle Position im Compás für die Visualisierung.
   * offsetMs verzögert die Anzeige zusätzlich (z. B. bei Bluetooth-Kopfhörern).
   */
  position(offsetMs = 0): CompasPosition | null {
    if (!this.playing || !this.graph) return null;
    const { ctx } = this.graph;
    const latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    const now = ctx.currentTime - latency - offsetMs / 1000;
    return this.timeline.positionAt(now, this.stepDuration());
  }

  private stepDuration(): number {
    return 60 / this.bpm / 2;
  }

  private schedule(): void {
    if (!this.playing || !this.graph) return;
    const { ctx } = this.graph;
    const horizon = ctx.currentTime + LOOKAHEAD;

    while (this.nextTime < horizon) {
      const countIn = this.countInSteps > 0;
      this.playStep(this.step, this.nextTime, countIn);
      this.timeline.push({ time: this.nextTime, step: this.step, countIn, cycle: countIn ? -1 : this.cycle });

      this.nextTime += this.stepDuration();
      this.step = (this.step + 1) % STEPS;
      if (countIn) this.countInSteps--;

      // Ein echter Compás (nicht der Vorzähler) ist vollständig.
      if (this.step === this.startStep && !countIn) {
        this.cycle++;
        this.applyTrainer();
      }
    }
    this.timeline.trim(ctx.currentTime - HISTORY);
  }

  private applyTrainer(): void {
    const tr = this.options.trainer;
    if (!tr.enabled || this.cycle % Math.max(1, tr.every) !== 0) return;
    if (this.bpm >= tr.target) return;
    this.bpm = Math.min(tr.target, this.bpm + tr.increment);
    this.onBpmChange?.(this.bpm);
  }

  private playStep(step: number, t: number, countIn: boolean): void {
    const { master, buses, sounds } = this.graph!;
    for (const hit of generatorHits(this.palo, step, countIn, this.options)) {
      const dest = hit.bus === 'master' ? master : buses[hit.bus];
      sounds[hit.instrument](dest, t, hit.velocity, hit.accent);
    }
  }
}
