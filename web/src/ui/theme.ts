/* Tag-/Nachtmodus. Ohne eigene Wahl folgt die App der Systemeinstellung. */
import type { Settings } from '../state/settings';

export function initTheme(settings: Settings, button: HTMLButtonElement, onChange: () => void): () => void {
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const current = () => settings.theme ?? (darkQuery.matches ? 'dark' : 'light');

  function apply(): void {
    const theme = current();
    document.documentElement.dataset.theme = theme;
    button.textContent = theme === 'dark' ? '☀ Tagmodus' : '☾ Nachtmodus';
    button.setAttribute('aria-label', theme === 'dark' ? 'Zum Tagmodus wechseln' : 'Zum Nachtmodus wechseln');
  }

  function toggle(): void {
    settings.theme = current() === 'dark' ? 'light' : 'dark';
    apply();
    onChange();
  }

  button.addEventListener('click', toggle);
  darkQuery.addEventListener('change', () => {
    if (!settings.theme) apply();
  });
  apply();
  return toggle;
}
