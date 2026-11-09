/*
 * Compás-Uhr als SVG plus lineare Leiste der 12 Zählzeiten.
 * Die 12 steht oben, die Zählzeiten laufen im Uhrzeigersinn.
 * Der Zeiger springt von Zählzeit zu Zählzeit.
 */
import { BEATS, beatAngle, beatGroups, beatSequence, isAccent } from '../core/compas';
import type { Palo } from '../core/palos';
import type { CompasPosition } from '../core/timeline';

const NS = 'http://www.w3.org/2000/svg';
const R_MARK = 78;
const R_GROUP = 97;
const R_PROGRESS = 106;

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  parent?: Element,
): SVGElementTagNameMap[K] {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  parent?.appendChild(n);
  return n;
}

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

function arc(r: number, a0: number, a1: number): string {
  if (a1 - a0 < 0.05) return '';
  if (a1 - a0 > 359.9) a1 = a0 + 359.9;
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export class ClockView {
  private palo: Palo | null = null;
  private markers: Record<number, SVGGElement> = {};
  private cells: Record<number, HTMLDivElement> = {};
  private hand!: SVGGElement;
  private progress!: SVGPathElement;
  private centerNum!: SVGTextElement;
  private centerLabel!: SVGTextElement;
  private activeBeat: number | null = null;
  private lastNum: number | null = null;
  private lastLabel: string | null = null;

  constructor(
    private readonly svg: SVGSVGElement,
    private readonly strip: HTMLElement,
  ) {}

  build(palo: Palo): void {
    this.palo = palo;
    this.activeBeat = null;
    this.lastNum = null;
    this.lastLabel = null;
    this.svg.textContent = '';
    this.strip.textContent = '';
    const svg = this.svg;

    el('circle', { r: 116, class: 'face' }, svg);
    el('circle', { r: R_PROGRESS, class: 'progress-track' }, svg);
    this.progress = el('path', { class: 'progress', d: '' }, svg);

    // Gruppenbögen (z. B. 3+3+2+2+2)
    const groupStarts = new Set<number>();
    beatGroups(palo).forEach((g, idx) => {
      groupStarts.add(g[0]);
      const a0 = beatAngle(g[0]) - 11;
      const a1 = a0 + 22 + (g.length - 1) * (360 / BEATS);
      el('path', { class: 'group' + (idx % 2 ? ' alt' : ''), d: arc(R_GROUP, a0, a1) }, svg);
    });

    // Zählzeiten
    this.markers = {};
    for (let b = 1; b <= BEATS; b++) {
      const [x, y] = polar(R_MARK, beatAngle(b));
      const accent = isAccent(palo, b);
      const pos = el('g', { transform: `translate(${x.toFixed(2)} ${y.toFixed(2)})` }, svg);
      const g = el('g', { class: 'beat' + (accent ? ' accent' : '') + (b === palo.start ? ' start' : '') }, pos);
      el('circle', { r: accent ? 15 : 11 }, g);
      const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
      t.textContent = String(b);
      this.markers[b] = g;
    }

    // Zeiger
    this.hand = el('g', { class: 'hand' }, svg);
    el('line', { x1: 0, y1: -36, x2: 0, y2: -58 }, this.hand);
    el('circle', { cx: 0, cy: -60, r: 4 }, this.hand);

    // Mitte
    const center = { 'text-anchor': 'middle', 'dominant-baseline': 'central' };
    this.centerNum = el('text', { class: 'center-num', y: -2, ...center }, svg);
    this.centerLabel = el('text', { class: 'center-label', y: 22, ...center }, svg);

    // Lineare Leiste in Spielreihenfolge
    this.cells = {};
    for (const b of beatSequence(palo)) {
      const cell = document.createElement('div');
      cell.className = 'cell' + (isAccent(palo, b) ? ' accent' : '') + (groupStarts.has(b) ? ' group-start' : '');
      cell.textContent = String(b);
      this.strip.appendChild(cell);
      this.cells[b] = cell;
    }

    this.update(null);
  }

  update(pos: CompasPosition | null): void {
    const p = this.palo;
    if (!p) return;

    // Zeiger springt: es zählt nur die aktuelle Zählzeit, nicht der Bruchteil.
    const beat = pos ? pos.beat : null;
    const shown = beat ?? p.start;
    const label = !pos ? 'Bereit' : pos.countIn ? 'Vorzähler' : `Compás ${pos.cycle + 1}`;

    this.hand.setAttribute('transform', `rotate(${beatAngle(shown)})`);

    let d = '';
    if (pos && !pos.countIn) {
      const elapsed = (((shown - p.start) % BEATS) + BEATS) % BEATS;
      const a0 = beatAngle(p.start);
      d = arc(R_PROGRESS, a0, a0 + elapsed * (360 / BEATS));
    }
    this.progress.setAttribute('d', d);

    if (beat !== this.activeBeat) {
      if (this.activeBeat !== null) {
        this.markers[this.activeBeat].classList.remove('active');
        this.cells[this.activeBeat].classList.remove('active');
      }
      if (beat !== null) {
        this.markers[beat].classList.add('active');
        this.cells[beat].classList.add('active');
      }
      this.activeBeat = beat;
    }

    if (shown !== this.lastNum) {
      this.centerNum.textContent = String(shown);
      this.centerNum.classList.toggle('accent', beat !== null && isAccent(p, beat));
      this.lastNum = shown;
    }
    if (label !== this.lastLabel) {
      this.centerLabel.textContent = label;
      this.lastLabel = label;
    }
    this.svg.classList.toggle('counting', !!pos?.countIn);
  }
}
