/*
 * Einstellungen: laden, mit Standardwerten zusammenführen, verzögert speichern.
 * localStorage kann fehlen oder blockiert sein – dann gelten sie nur für die Sitzung.
 */
import type { TrainerOptions, VolumeBus } from '../audio/engine';
import { PALOS } from '../core/palos';

export const STORE_KEY = 'compas-settings-v1';

export type Theme = 'light' | 'dark';

export interface Settings {
  paloId: string;
  bpmByPalo: Record<string, number>;
  volumes: Record<VolumeBus, number>;
  masterVolume: number;
  options: { countIn: boolean; contratiempo: boolean; click: boolean };
  trainer: TrainerOptions;
  /** Visueller Versatz in ms. */
  offset: number;
  /** null = Systemeinstellung. */
  theme: Theme | null;
}

export function defaultSettings(): Settings {
  return {
    paloId: PALOS[0].id,
    bpmByPalo: {},
    volumes: { claras: 0.8, sordas: 0.6, cajon: 0.8, click: 0.6 },
    masterVolume: 0.9,
    options: { countIn: true, contratiempo: false, click: false },
    trainer: { enabled: false, every: 4, increment: 2, target: 200 },
    offset: 0,
    theme: null,
  };
}

export function loadSettings(): Settings {
  const d = defaultSettings();
  try {
    const s = (JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') ?? {}) as Partial<Settings>;
    return {
      ...d,
      ...s,
      bpmByPalo: { ...d.bpmByPalo, ...s.bpmByPalo },
      volumes: { ...d.volumes, ...s.volumes },
      options: { ...d.options, ...s.options },
      trainer: { ...d.trainer, ...s.trainer },
    };
  } catch {
    return d;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export function saveSettings(settings: Settings): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(settings));
    } catch {
      /* Speicher nicht verfügbar */
    }
  }, 200);
}
