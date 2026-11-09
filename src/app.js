/* UI-Verdrahtung: Bedienelemente, Einstellungen, Animationsschleife. */
(function (C) {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const STORE_KEY = 'compas-settings-v1';

  const defaults = {
    paloId: C.PALOS[0].id,
    bpmByPalo: {},
    volumes: { claras: 0.8, sordas: 0.6, cajon: 0.8, click: 0.6 },
    masterVolume: 0.9,
    options: { countIn: true, contratiempo: false, click: false },
    trainer: { enabled: false, every: 4, increment: 2, target: 200 },
    offset: 0,
    theme: null, // null = Systemeinstellung, sonst 'light' | 'dark'
  };

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
      return {
        ...defaults,
        ...s,
        bpmByPalo: { ...defaults.bpmByPalo, ...s.bpmByPalo },
        volumes: { ...defaults.volumes, ...s.volumes },
        options: { ...defaults.options, ...s.options },
        trainer: { ...defaults.trainer, ...s.trainer },
      };
    } catch (e) {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } catch (e) {
        /* Speicher nicht verfügbar – Einstellungen gelten nur für diese Sitzung. */
      }
    }, 200);
  }

  const state = load();
  const engine = new C.Engine();
  const clock = new C.ClockView($('#clock'), $('#strip'));
  let palo = C.PALOS.find((p) => p.id === state.paloId) || C.PALOS[0];

  // Engine-Optionen teilen sich die Objekte mit dem gespeicherten Zustand.
  Object.assign(engine.options, state.options);
  engine.options.trainer = state.trainer;
  for (const [bus, v] of Object.entries(state.volumes)) engine.setVolume(bus, v);

  /* ---------- Palo ---------- */

  const palosEl = $('#palos');
  for (const p of C.PALOS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = p.name;
    btn.dataset.id = p.id;
    btn.addEventListener('click', () => selectPalo(p.id));
    palosEl.appendChild(btn);
  }

  function selectPalo(id) {
    palo = C.PALOS.find((p) => p.id === id) || C.PALOS[0];
    state.paloId = palo.id;
    engine.setPalo(palo);
    for (const btn of palosEl.children) btn.classList.toggle('active', btn.dataset.id === palo.id);
    $('#palo-info').textContent = palo.info;
    const slider = $('#bpm');
    slider.min = palo.min;
    slider.max = palo.max;
    setBpm(state.bpmByPalo[palo.id] ?? palo.bpm);
    clock.build(palo);
    if (engine.playing) engine.start(); // neu ansetzen, damit der Compás auf palo.start beginnt
    save();
  }

  /* ---------- Tempo ---------- */

  function setBpm(value) {
    const bpm = Math.round(Math.min(palo.max, Math.max(palo.min, Number(value) || palo.bpm)));
    state.bpmByPalo[palo.id] = bpm;
    engine.setBpm(bpm);
    $('#bpm').value = bpm;
    $('#bpm-value').textContent = bpm;
    save();
  }

  engine.onBpmChange = (bpm) => setBpm(bpm);

  $('#bpm').addEventListener('input', (e) => setBpm(e.target.value));
  $('#bpm-down').addEventListener('click', () => setBpm(engine.bpm - 1));
  $('#bpm-up').addEventListener('click', () => setBpm(engine.bpm + 1));

  let taps = [];
  function tap() {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
    taps.push(now);
    if (taps.length > 6) taps.shift();
    if (taps.length >= 2) {
      const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
      setBpm(60000 / avg);
    }
  }
  $('#tap').addEventListener('click', tap);

  /* ---------- Start / Stop ---------- */

  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
      else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) {
      /* Wake Lock optional */
    }
  }

  function togglePlay() {
    if (engine.playing) engine.stop();
    else engine.start();
    $('#play').textContent = engine.playing ? '■ Stop' : '▶ Start';
    $('#play').classList.toggle('playing', engine.playing);
    keepAwake(engine.playing);
  }
  $('#play').addEventListener('click', togglePlay);

  /* ---------- Optionen & Mixer ---------- */

  for (const input of $$('[data-option]')) {
    const key = input.dataset.option;
    input.checked = !!state.options[key];
    input.addEventListener('change', () => {
      state.options[key] = input.checked;
      engine.options[key] = input.checked;
      save();
    });
  }

  for (const input of $$('[data-bus]')) {
    const bus = input.dataset.bus;
    input.value = state.volumes[bus];
    input.addEventListener('input', () => {
      state.volumes[bus] = Number(input.value);
      engine.setVolume(bus, Number(input.value));
      save();
    });
  }

  const masterInput = $('#master');
  function showMaster() {
    const v = state.masterVolume;
    const out = $('#master-value');
    out.textContent = `${Math.round(v * 100)} %`;
    out.classList.toggle('boost', v > 1); // Übersteuerung über 100 % hervorheben
    masterInput.previousElementSibling.textContent = v === 0 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
  }
  masterInput.value = state.masterVolume;
  engine.setMasterVolume(state.masterVolume);
  showMaster();
  masterInput.addEventListener('input', () => {
    state.masterVolume = Number(masterInput.value);
    engine.setMasterVolume(state.masterVolume);
    showMaster();
    save();
  });

  const trainerEnabled = $('#trainer-enabled');
  trainerEnabled.checked = state.trainer.enabled;
  trainerEnabled.addEventListener('change', () => {
    state.trainer.enabled = trainerEnabled.checked;
    save();
  });
  for (const key of ['increment', 'every', 'target']) {
    const input = $('#trainer-' + key);
    input.value = state.trainer[key];
    input.addEventListener('change', () => {
      const v = Math.round(Number(input.value));
      if (v > 0) state.trainer[key] = v;
      input.value = state.trainer[key];
      save();
    });
  }

  const offsetInput = $('#offset');
  const showOffset = () => ($('#offset-value').textContent = `${state.offset} ms`);
  offsetInput.value = state.offset;
  showOffset();
  offsetInput.addEventListener('input', () => {
    state.offset = Number(offsetInput.value);
    showOffset();
    save();
  });

  /* ---------- Tag/Nacht ---------- */

  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = () => state.theme || (darkQuery.matches ? 'dark' : 'light');

  function applyTheme() {
    const theme = currentTheme();
    document.documentElement.dataset.theme = theme;
    const btn = $('#theme-toggle');
    btn.textContent = theme === 'dark' ? '☀ Tagmodus' : '☾ Nachtmodus';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Zum Tagmodus wechseln' : 'Zum Nachtmodus wechseln');
  }

  function toggleTheme() {
    state.theme = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme();
    save();
  }

  $('#theme-toggle').addEventListener('click', toggleTheme);
  darkQuery.addEventListener('change', () => {
    if (!state.theme) applyTheme();
  });
  applyTheme();

  /* ---------- Info-Fenster ---------- */

  for (const btn of $$('[data-dialog]')) {
    const dialog = document.getElementById(btn.dataset.dialog);
    btn.addEventListener('click', () => dialog.showModal());
    // Klick auf den abgedunkelten Hintergrund schließt das Fenster.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  /* ---------- Tastatur ---------- */

  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' && e.target.type !== 'checkbox' && e.key !== ' ') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return; // Tastenkürzel aus, solange ein Info-Fenster offen ist
    switch (e.key) {
      case ' ':
        if (tag === 'INPUT' && e.target.type === 'number') return;
        e.preventDefault();
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
        togglePlay();
        break;
      case 'ArrowUp':
        e.preventDefault();
        setBpm(engine.bpm + 5);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setBpm(engine.bpm - 5);
        break;
      case 'ArrowRight':
        setBpm(engine.bpm + 1);
        break;
      case 'ArrowLeft':
        setBpm(engine.bpm - 1);
        break;
      case 't':
      case 'T':
        tap();
        break;
      case 'd':
      case 'D':
        toggleTheme();
        break;
    }
  });

  /* ---------- Animationsschleife ---------- */

  function frame() {
    clock.update(engine.position(state.offset));
    requestAnimationFrame(frame);
  }

  selectPalo(palo.id);
  requestAnimationFrame(frame);
})(window.Compas = window.Compas || {});
