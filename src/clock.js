/*
 * Compás-Uhr als SVG plus lineare Leiste der 12 Zählzeiten.
 * Die 12 steht oben, die Zählzeiten laufen im Uhrzeigersinn.
 */
(function (C) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const R_MARK = 78;
  const R_GROUP = 97;
  const R_PROGRESS = 106;

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function polar(r, deg) {
    const a = (deg * Math.PI) / 180;
    return [r * Math.sin(a), -r * Math.cos(a)];
  }

  function arc(r, a0, a1) {
    if (a1 - a0 < 0.05) return '';
    if (a1 - a0 > 359.9) a1 = a0 + 359.9;
    const [x0, y0] = polar(r, a0);
    const [x1, y1] = polar(r, a1);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  const beatAngle = (b) => (b % 12) * 30;

  class ClockView {
    constructor(svg, strip) {
      this.svg = svg;
      this.strip = strip;
      this.palo = null;
    }

    build(palo) {
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
      const groups = C.beatGroups(palo);
      const groupStarts = new Set();
      groups.forEach((g, idx) => {
        groupStarts.add(g[0]);
        const a0 = beatAngle(g[0]) - 11;
        const a1 = a0 + 22 + (g.length - 1) * 30;
        el('path', { class: 'group' + (idx % 2 ? ' alt' : ''), d: arc(R_GROUP, a0, a1) }, svg);
      });

      // Zählzeiten
      this.markers = {};
      for (let b = 1; b <= 12; b++) {
        const [x, y] = polar(R_MARK, beatAngle(b));
        const accent = palo.accents.includes(b);
        const pos = el('g', { transform: `translate(${x.toFixed(2)} ${y.toFixed(2)})` }, svg);
        const g = el('g', { class: 'beat' + (accent ? ' accent' : '') + (b === palo.start ? ' start' : '') }, pos);
        el('circle', { r: accent ? 15 : 11 }, g);
        const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
        t.textContent = b;
        this.markers[b] = g;
      }

      // Zeiger
      this.hand = el('g', { class: 'hand' }, svg);
      el('line', { x1: 0, y1: -36, x2: 0, y2: -58 }, this.hand);
      el('circle', { cx: 0, cy: -60, r: 4 }, this.hand);

      // Mitte
      this.centerNum = el('text', { class: 'center-num', y: -2, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, svg);
      this.centerLabel = el('text', { class: 'center-label', y: 22, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, svg);

      // Lineare Leiste in Spielreihenfolge
      this.cells = {};
      for (const b of C.beatSequence(palo)) {
        const cell = document.createElement('div');
        cell.className = 'cell' + (palo.accents.includes(b) ? ' accent' : '') + (groupStarts.has(b) ? ' group-start' : '');
        cell.textContent = b;
        this.strip.appendChild(cell);
        this.cells[b] = cell;
      }

      this.update(null);
    }

    update(pos) {
      const p = this.palo;
      if (!p) return;

      let beatsFloat, beat, num, label;
      if (!pos) {
        beatsFloat = p.start;
        beat = null;
        num = p.start;
        label = 'Bereit';
      } else {
        // Zeiger springt von Zählzeit zu Zählzeit (kein flüssiger Lauf).
        beatsFloat = pos.beat;
        beat = pos.beat;
        num = beat;
        label = pos.countIn ? 'Vorzähler' : `Compás ${pos.cycle + 1}`;
      }

      this.hand.setAttribute('transform', `rotate(${beatAngle(beatsFloat).toFixed(2)})`);

      let d = '';
      if (pos && !pos.countIn) {
        const elapsed = (((beatsFloat - p.start) % 12) + 12) % 12;
        const a0 = beatAngle(p.start);
        d = arc(R_PROGRESS, a0, a0 + elapsed * 30);
      }
      this.progress.setAttribute('d', d);

      if (beat !== this.activeBeat) {
        if (this.activeBeat) {
          this.markers[this.activeBeat].classList.remove('active');
          this.cells[this.activeBeat].classList.remove('active');
        }
        if (beat) {
          this.markers[beat].classList.add('active');
          this.cells[beat].classList.add('active');
        }
        this.activeBeat = beat;
      }

      if (num !== this.lastNum) {
        this.centerNum.textContent = num;
        this.centerNum.classList.toggle('accent', !!beat && p.accents.includes(beat));
        this.lastNum = num;
      }
      if (label !== this.lastLabel) {
        this.centerLabel.textContent = label;
        this.lastLabel = label;
      }
      this.svg.classList.toggle('counting', !!(pos && pos.countIn));
    }
  }

  C.ClockView = ClockView;
})(window.Compas = window.Compas || {});
