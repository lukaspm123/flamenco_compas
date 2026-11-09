/* Bedienelemente: Palo, Tempo, Start/Stop, Optionen, Mixer, Trainer, Tastatur. */
import { VOLUME_BUSES, type Engine, type VolumeBus } from '../audio/engine';
import { PALOS, findPalo, hasDefaultAccents, toggleAccent, type Palo } from '../core/palos';
import { TapTempo } from '../core/tapTempo';
import { saveSettings, type Settings } from '../state/settings';
import type { ClockView } from './clock';
import { isDialogOpen } from './dialogs';

type OptionKey = keyof Settings['options'];
type TrainerNumberKey = 'increment' | 'every' | 'target';

function $<T extends Element = HTMLElement>(sel: string): T {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`Element fehlt: ${sel}`);
  return node;
}

export interface ControlsDeps {
  engine: Engine;
  clock: ClockView;
  settings: Settings;
  toggleTheme: () => void;
}

export function initControls({ engine, clock, settings, toggleTheme }: ControlsDeps): void {
  const save = () => saveSettings(settings);
  /** Aktiver Palo – ggf. mit vom Nutzer angepassten Akzenten. */
  let palo: Palo = findPalo(settings.paloId);

  // Engine mit gespeicherten Einstellungen füttern (Trainer-Objekt wird geteilt).
  Object.assign(engine.options, settings.options);
  engine.options.trainer = settings.trainer;
  for (const bus of VOLUME_BUSES) engine.setVolume(bus, settings.volumes[bus]);
  engine.setMasterVolume(settings.masterVolume);

  /* ---------- Palo ---------- */

  const palosEl = $('#palos');
  for (const p of PALOS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = p.name;
    btn.dataset.id = p.id;
    btn.addEventListener('click', () => selectPalo(p.id));
    palosEl.appendChild(btn);
  }

  const bpmSlider = $<HTMLInputElement>('#bpm');

  function selectPalo(id: string): void {
    // findPalo liefert immer die Standard-Akzente: eigene Anpassungen werden verworfen.
    palo = findPalo(id);
    settings.paloId = palo.id;
    engine.setPalo(palo);
    for (const btn of palosEl.querySelectorAll<HTMLElement>('button')) {
      btn.classList.toggle('active', btn.dataset.id === palo.id);
    }
    $('#palo-info').textContent = palo.info;
    bpmSlider.min = String(palo.min);
    bpmSlider.max = String(palo.max);
    setBpm(settings.bpmByPalo[palo.id] ?? palo.bpm);
    clock.build(palo);
    updateAccentUi();
    if (engine.playing) engine.start(); // neu ansetzen, damit der Compás auf palo.start beginnt
    save();
  }

  /* ---------- Akzente anpassen ---------- */

  const accentReset = $<HTMLButtonElement>('#accent-reset');

  /** Übernimmt geänderte Akzente sofort – auch während der Wiedergabe, ohne Neustart. */
  function applyAccents(next: Palo): void {
    palo = next;
    engine.setPalo(palo);
    clock.build(palo);
    updateAccentUi();
  }

  function updateAccentUi(): void {
    accentReset.hidden = hasDefaultAccents(palo);
  }

  clock.onBeatClick = (beat) => applyAccents(toggleAccent(palo, beat));
  accentReset.addEventListener('click', () => applyAccents(findPalo(palo.id)));

  /* ---------- Tempo ---------- */

  function setBpm(value: number): void {
    const bpm = Math.round(Math.min(palo.max, Math.max(palo.min, Number(value) || palo.bpm)));
    settings.bpmByPalo[palo.id] = bpm;
    engine.setBpm(bpm);
    bpmSlider.value = String(bpm);
    $('#bpm-value').textContent = String(bpm);
    save();
  }

  engine.onBpmChange = (bpm) => setBpm(bpm);
  bpmSlider.addEventListener('input', () => setBpm(Number(bpmSlider.value)));
  $('#bpm-down').addEventListener('click', () => setBpm(engine.bpm - 1));
  $('#bpm-up').addEventListener('click', () => setBpm(engine.bpm + 1));

  const tapTempo = new TapTempo();
  const tap = () => {
    const bpm = tapTempo.tap(performance.now());
    if (bpm !== null) setBpm(bpm);
  };
  $('#tap').addEventListener('click', tap);

  /* ---------- Start / Stop ---------- */

  let wakeLock: WakeLockSentinel | null = null;
  async function keepAwake(on: boolean): Promise<void> {
    try {
      if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
      else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch {
      /* Wake Lock ist optional */
    }
  }

  const playBtn = $<HTMLButtonElement>('#play');
  function togglePlay(): void {
    if (engine.playing) engine.stop();
    else engine.start();
    playBtn.textContent = engine.playing ? '■ Stop' : '▶ Start';
    playBtn.classList.toggle('playing', engine.playing);
    void keepAwake(engine.playing);
  }
  playBtn.addEventListener('click', togglePlay);

  /* ---------- Lautstärke & Mixer ---------- */

  const masterInput = $<HTMLInputElement>('#master');
  const masterOut = $('#master-value');
  const masterIcon = $('#master-icon');
  function showMaster(): void {
    const v = settings.masterVolume;
    masterOut.textContent = `${Math.round(v * 100)} %`;
    masterOut.classList.toggle('boost', v > 1); // Übersteuerung über 100 % hervorheben
    masterIcon.textContent = v === 0 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
  }
  masterInput.value = String(settings.masterVolume);
  showMaster();
  masterInput.addEventListener('input', () => {
    settings.masterVolume = Number(masterInput.value);
    engine.setMasterVolume(settings.masterVolume);
    showMaster();
    save();
  });

  for (const input of document.querySelectorAll<HTMLInputElement>('[data-bus]')) {
    const bus = input.dataset.bus as VolumeBus;
    input.value = String(settings.volumes[bus]);
    input.addEventListener('input', () => {
      settings.volumes[bus] = Number(input.value);
      engine.setVolume(bus, settings.volumes[bus]);
      save();
    });
  }

  /* ---------- Optionen ---------- */

  for (const input of document.querySelectorAll<HTMLInputElement>('[data-option]')) {
    const key = input.dataset.option as OptionKey;
    input.checked = settings.options[key];
    input.addEventListener('change', () => {
      settings.options[key] = input.checked;
      engine.options[key] = input.checked;
      save();
    });
  }

  /* ---------- Tempo-Trainer ---------- */

  const trainerEnabled = $<HTMLInputElement>('#trainer-enabled');
  trainerEnabled.checked = settings.trainer.enabled;
  trainerEnabled.addEventListener('change', () => {
    settings.trainer.enabled = trainerEnabled.checked;
    save();
  });
  for (const key of ['increment', 'every', 'target'] as TrainerNumberKey[]) {
    const input = $<HTMLInputElement>('#trainer-' + key);
    input.value = String(settings.trainer[key]);
    input.addEventListener('change', () => {
      const v = Math.round(Number(input.value));
      if (v > 0) settings.trainer[key] = v;
      input.value = String(settings.trainer[key]);
      save();
    });
  }

  /* ---------- Visueller Versatz ---------- */

  const offsetInput = $<HTMLInputElement>('#offset');
  const showOffset = () => ($('#offset-value').textContent = `${settings.offset} ms`);
  offsetInput.value = String(settings.offset);
  showOffset();
  offsetInput.addEventListener('input', () => {
    settings.offset = Number(offsetInput.value);
    showOffset();
    save();
  });

  /* ---------- Tastatur ---------- */

  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    const inInput = target instanceof HTMLInputElement;
    if (inInput && target.type !== 'checkbox' && e.key !== ' ') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isDialogOpen()) return; // Tastenkürzel aus, solange ein Info-Fenster offen ist

    switch (e.key) {
      case ' ':
        if (inInput && target.type === 'number') return;
        e.preventDefault();
        if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
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

  selectPalo(palo.id);
}
