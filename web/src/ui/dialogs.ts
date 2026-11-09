/*
 * Info-Fenster: Ein Button mit data-dialog="<id>" öffnet das <dialog id="<id>">.
 * Klick auf den abgedunkelten Hintergrund schließt es.
 */
export function initDialogs(root: ParentNode = document): void {
  for (const btn of root.querySelectorAll<HTMLElement>('[data-dialog]')) {
    const dialog = document.getElementById(btn.dataset.dialog ?? '');
    if (!(dialog instanceof HTMLDialogElement)) continue;
    btn.addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  }
}

export const isDialogOpen = (): boolean => document.querySelector('dialog[open]') !== null;
