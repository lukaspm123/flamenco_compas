/* Einstiegspunkt: baut Engine, Uhr und Bedienung zusammen und startet die Animationsschleife. */
import './styles/main.css';
import { Engine } from './audio/engine';
import { loadSettings, saveSettings } from './state/settings';
import { ClockView } from './ui/clock';
import { initControls } from './ui/controls';
import { initDialogs } from './ui/dialogs';
import { initTheme } from './ui/theme';

const settings = loadSettings();
const engine = new Engine();
const clock = new ClockView(
  document.querySelector<SVGSVGElement>('#clock')!,
  document.querySelector<HTMLElement>('#strip')!,
);

const toggleTheme = initTheme(settings, document.querySelector<HTMLButtonElement>('#theme-toggle')!, () =>
  saveSettings(settings),
);
initDialogs();
initControls({ engine, clock, settings, toggleTheme });

function frame(): void {
  clock.update(engine.position(settings.offset));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
