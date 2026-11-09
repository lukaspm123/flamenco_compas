/*
 * Synthetisierte Percussion-Klänge (keine Sample-Dateien nötig).
 * Jede Funktion plant einen Klang zum exakten Zeitpunkt `t` (AudioContext-Zeit).
 */
(function (C) {
  'use strict';

  C.createSounds = function (ctx) {
    // Zwei Sekunden weißes Rauschen als Grundmaterial für Palmas und Slaps.
    const NOISE_SECONDS = 2;
    const noise = ctx.createBuffer(1, ctx.sampleRate * NOISE_SECONDS, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const rand = (a, b) => a + Math.random() * (b - a);

    function envelope(t, peak, attack, decay) {
      const g = ctx.createGain();
      const p = Math.max(peak, 0.0002);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(p, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
      return g;
    }

    function noiseBurst(dest, t, o) {
      const attack = o.attack || 0.001;
      const dur = attack + o.decay + 0.02;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const filter = ctx.createBiquadFilter();
      filter.type = o.type || 'bandpass';
      filter.frequency.value = o.freq;
      filter.Q.value = o.q || 1;
      const g = envelope(t, o.gain, attack, o.decay);
      src.connect(filter).connect(g).connect(dest);
      src.start(t, Math.random() * (NOISE_SECONDS - dur - 0.05), dur);
    }

    function tone(dest, t, o) {
      const osc = ctx.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.from, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.glide);
      const g = envelope(t, o.gain, o.attack || 0.002, o.decay);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + (o.attack || 0.002) + o.decay + 0.05);
    }

    return {
      /** Palmas claras/fuertes: helles, scharfes Klatschen, mehrere Hände leicht versetzt. */
      clara(dest, t, v = 1) {
        for (let i = 0; i < 3; i++) {
          noiseBurst(dest, t + i * 0.005 + rand(0, 0.004), {
            freq: rand(1500, 2500),
            q: 1.3,
            gain: 0.55 * v,
            decay: rand(0.05, 0.08),
          });
        }
        noiseBurst(dest, t, { type: 'highpass', freq: 4000, gain: 0.25 * v, decay: 0.03 });
      },

      /** Palmas sordas: gedämpftes, tiefes Klatschen mit hohlen Händen. */
      sorda(dest, t, v = 1) {
        for (let i = 0; i < 2; i++) {
          noiseBurst(dest, t + i * 0.004 + rand(0, 0.003), {
            freq: rand(550, 850),
            q: 0.9,
            gain: 0.6 * v,
            decay: rand(0.035, 0.05),
          });
        }
      },

      /** Cajón Bass: tiefer Ton mit Pitch-Abfall. */
      bajo(dest, t, v = 1) {
        tone(dest, t, { from: 130, to: 52, glide: 0.14, gain: 0.95 * v, decay: 0.3 });
        noiseBurst(dest, t, { type: 'lowpass', freq: 400, gain: 0.35 * v, decay: 0.05 });
      },

      /** Cajón Slap: knackiger Schlag an die Kante mit Schnarren. */
      slap(dest, t, v = 1) {
        noiseBurst(dest, t, { freq: 2200, q: 0.7, gain: 0.65 * v, decay: 0.12 });
        noiseBurst(dest, t, { type: 'highpass', freq: 5000, gain: 0.25 * v, decay: 0.06 });
        tone(dest, t, { type: 'triangle', from: 340, to: 210, glide: 0.04, gain: 0.25 * v, decay: 0.06 });
      },

      /** Metronom-Klick, auf Akzenten höher. */
      click(dest, t, v = 1, accent = false) {
        tone(dest, t, { from: accent ? 1760 : 1175, gain: 0.5 * v, attack: 0.001, decay: 0.04 });
      },
    };
  };
})(window.Compas = window.Compas || {});
