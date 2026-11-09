/*
 * Audio-Engine mit Lookahead-Scheduler ("A Tale of Two Clocks").
 *
 * Die AudioContext-Uhr ist der einzige Taktgeber. Ein Timer plant Klänge
 * etwas im Voraus exakt ein und merkt sich jeden geplanten Schritt in einer
 * Queue. Die Visualisierung liest daraus nur ab, wo im Compás man sich
 * gerade befindet – so können Bild und Ton nicht auseinanderdriften.
 *
 * Ein Compás hat 24 Schritte (12 Zählzeiten × 2 Achtel).
 * Schritt s ↔ Zählzeit floor(s/2)+1, ungerade s = Offbeat ("y").
 */
(function (C) {
  'use strict';

  const LOOKAHEAD = 0.12; // Sekunden, die im Voraus geplant werden
  const INTERVAL = 25; // ms zwischen Scheduler-Durchläufen
  const STEPS = 24;
  const QUEUE_KEEP = 2; // Sekunden Verlauf für die Visualisierung

  const beatToStep = (beat) => (beat - 1) * 2;

  class Engine {
    constructor() {
      this.ctx = null;
      this.playing = false;
      this.palo = C.PALOS[0];
      this.bpm = this.palo.bpm;
      this.options = {
        countIn: true,
        contratiempo: false,
        click: false,
        trainer: { enabled: false, every: 4, increment: 2, target: 200 },
      };
      this.volumes = { claras: 0.8, sordas: 0.6, cajon: 0.8, click: 0.6 };
      this.masterVolume = 0.9;
      this.queue = [];
      this.onBpmChange = null;
    }

    _init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = (this.ctx = new AC({ latencyHint: 'interactive' }));
      const comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      this.master = ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.master.connect(comp);
      this.buses = {};
      for (const [key, v] of Object.entries(this.volumes)) {
        const g = ctx.createGain();
        g.gain.value = v;
        g.connect(this.master);
        this.buses[key] = g;
      }
      this.sounds = C.createSounds(ctx);
    }

    setVolume(bus, value) {
      this.volumes[bus] = value;
      if (this.buses && this.buses[bus]) {
        this.buses[bus].gain.setTargetAtTime(value, this.ctx.currentTime, 0.02);
      }
    }

    /**
     * Gesamtlautstärke (0–2, also bis 200 %); wirkt auf alle Spuren inkl. Vorzähler.
     * Über 100 % fängt der nachgeschaltete Kompressor Spitzen ab, damit es nicht hart verzerrt.
     */
    setMasterVolume(value) {
      this.masterVolume = value;
      if (this.master) this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.02);
    }

    setPalo(palo) {
      this.palo = palo;
    }

    setBpm(bpm) {
      this.bpm = bpm;
    }

    start() {
      this._init();
      this.ctx.resume();
      this.startStep = beatToStep(this.palo.start);
      this.step = this.startStep;
      this.nextTime = this.ctx.currentTime + 0.08;
      this.queue = [];
      this.cycle = 0;
      this.countInSteps = this.options.countIn ? STEPS : 0;
      this.playing = true;
      clearInterval(this._timer);
      this._timer = setInterval(() => this._schedule(), INTERVAL);
      this._schedule();
    }

    stop() {
      clearInterval(this._timer);
      this._timer = null;
      this.playing = false;
      this.queue = [];
    }

    _schedule() {
      if (!this.playing) return;
      const horizon = this.ctx.currentTime + LOOKAHEAD;
      while (this.nextTime < horizon) {
        const countIn = this.countInSteps > 0;
        this._playStep(this.step, this.nextTime, countIn);
        this.queue.push({
          time: this.nextTime,
          step: this.step,
          countIn,
          cycle: countIn ? -1 : this.cycle,
        });

        this.nextTime += 60 / this.bpm / 2;
        this.step = (this.step + 1) % STEPS;
        if (countIn) this.countInSteps--;

        // Ein echter Compás (nicht der Vorzähler) ist vollständig.
        if (this.step === this.startStep && !countIn) {
          this.cycle++;
          this._applyTrainer();
        }
      }
      const cutoff = this.ctx.currentTime - QUEUE_KEEP;
      while (this.queue.length > 2 && this.queue[1].time < cutoff) this.queue.shift();
    }

    _applyTrainer() {
      const tr = this.options.trainer;
      if (!tr.enabled || this.cycle % Math.max(1, tr.every) !== 0) return;
      if (this.bpm >= tr.target) return;
      this.bpm = Math.min(tr.target, this.bpm + tr.increment);
      if (this.onBpmChange) this.onBpmChange(this.bpm);
    }

    _playStep(step, t, countIn) {
      const beat = Math.floor(step / 2) + 1;
      const offbeat = step % 2 === 1;
      const p = this.palo;
      const accent = p.accents.includes(beat);
      const s = this.sounds;
      const b = this.buses;

      if (countIn) {
        // Vorzähler: nur Klicks, unabhängig vom Klick-Regler hörbar.
        if (!offbeat) s.click(this.master, t, accent ? 0.9 : 0.55, accent);
        return;
      }

      if (!offbeat) {
        if (this.options.click) s.click(b.click, t, accent ? 1 : 0.6, accent);
        if (accent) s.clara(b.claras, t, 1);
        else if (!this.options.contratiempo) s.sorda(b.sordas, t, 0.8);
        if (p.bajo.includes(beat)) s.bajo(b.cajon, t, 1);
        if (p.slap.includes(beat)) s.slap(b.cajon, t, accent ? 1 : 0.7);
      } else if (this.options.contratiempo) {
        s.sorda(b.sordas, t, 0.85);
      }
    }

    /**
     * Aktuelle Position im Compás für die Visualisierung.
     * offsetMs verzögert die Anzeige zusätzlich (z. B. bei Bluetooth-Kopfhörern).
     */
    position(offsetMs = 0) {
      if (!this.playing || !this.queue.length) return null;
      const ctx = this.ctx;
      const latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
      const now = ctx.currentTime - latency - offsetMs / 1000;

      let i = -1;
      for (let k = this.queue.length - 1; k >= 0; k--) {
        if (this.queue[k].time <= now) {
          i = k;
          break;
        }
      }
      if (i < 0) return null; // noch vor dem ersten Schlag

      const e0 = this.queue[i];
      const e1 = this.queue[i + 1];
      const dur = e1 ? e1.time - e0.time : 60 / this.bpm / 2;
      const frac = Math.min(1, Math.max(0, (now - e0.time) / dur));
      return {
        stepFloat: e0.step + frac,
        beat: Math.floor(e0.step / 2) + 1,
        countIn: e0.countIn,
        cycle: e0.cycle,
      };
    }
  }

  C.Engine = Engine;
})(window.Compas = window.Compas || {});
