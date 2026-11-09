/*
 * Palo-Definitionen für den 12er-Compás.
 *
 * Zählzeiten laufen von 1 bis 12; die 12 steht auf der Uhr oben.
 *   accents   – betonte Zählzeiten (Palmas claras)
 *   accentAt  – 'end': Akzent schließt eine Gruppe ab (Soleá-Familie, 3+3+2+2+2)
 *               'start': Akzent eröffnet eine Gruppe (Seguiriya, 2+2+3+3+2)
 *   start     – Zählzeit, auf der ein Compás beginnt (Bulería-Familie: 12)
 *   bajo/slap – Cajón-Pattern (Bass bzw. Slap) auf Zählzeiten
 *   bpm/min/max – Grundschläge pro Minute
 */
(function (C) {
  'use strict';

  const SOLEA = [3, 6, 8, 10, 12];

  C.PALOS = [
    {
      id: 'solea',
      name: 'Soleá',
      accents: SOLEA,
      accentAt: 'end',
      start: 1,
      bpm: 110,
      min: 50,
      max: 200,
      bajo: [3, 10],
      slap: [6, 8, 12],
      info: 'Getragen und schwer. Gruppierung 3+3+2+2+2, Akzente auf 3 · 6 · 8 · 10 · 12.',
    },
    {
      id: 'alegrias',
      name: 'Alegrías',
      accents: SOLEA,
      accentAt: 'end',
      start: 1,
      bpm: 160,
      min: 80,
      max: 260,
      bajo: [3, 10],
      slap: [6, 8, 12],
      info: 'Gleicher Compás wie die Soleá, aber hell und deutlich schneller.',
    },
    {
      id: 'soleaporbuleria',
      name: 'Soleá por Bulería',
      accents: SOLEA,
      accentAt: 'end',
      start: 12,
      bpm: 150,
      min: 80,
      max: 240,
      bajo: [3, 10],
      slap: [6, 8, 12],
      info: 'Mittleres Tempo, gezählt ab der 12. Akzente auf 12 · 3 · 6 · 8 · 10.',
    },
    {
      id: 'buleria',
      name: 'Bulería',
      accents: SOLEA,
      accentAt: 'end',
      start: 12,
      bpm: 200,
      min: 120,
      max: 320,
      bajo: [3, 10],
      slap: [6, 8, 12],
      info: 'Schnell, gezählt ab der 12. Tipp: Contratiempo einschalten.',
    },
    {
      id: 'guajira',
      name: 'Guajira',
      accents: SOLEA,
      accentAt: 'end',
      start: 12,
      bpm: 120,
      min: 60,
      max: 200,
      bajo: [3, 10],
      slap: [6, 8, 12],
      info: 'Amalgam aus 6/8 und 3/4, gezählt ab der 12. Akzente auf 12 · 3 · 6 · 8 · 10.',
    },
    {
      id: 'seguiriya',
      name: 'Seguiriya',
      accents: [12, 2, 4, 7, 10],
      accentAt: 'start',
      start: 12,
      bpm: 140,
      min: 70,
      max: 240,
      bajo: [12, 7],
      slap: [2, 4, 10],
      info: 'Gruppierung 2+2+3+3+2 ab der 12. Akzente auf 12 · 2 · 4 · 7 · 10.',
    },
  ];

  /** Zählzeiten eines Compás in Spielreihenfolge, beginnend bei palo.start. */
  C.beatSequence = function (palo) {
    const seq = [];
    for (let i = 0; i < 12; i++) seq.push(((palo.start - 1 + i) % 12) + 1);
    return seq;
  };

  /** Liefert die Gruppen als Listen von Zählzeiten, z. B. [[1,2,3],[4,5,6],...]. */
  C.beatGroups = function (palo) {
    const seq = C.beatSequence(palo);
    const isAccent = (b) => palo.accents.includes(b);
    const groups = [];
    let current = [];
    for (const b of seq) {
      if (palo.accentAt === 'start' && isAccent(b) && current.length) {
        groups.push(current);
        current = [];
      }
      current.push(b);
      if (palo.accentAt === 'end' && isAccent(b)) {
        groups.push(current);
        current = [];
      }
    }
    if (palo.accentAt === 'end') {
      // Zählzeiten nach dem letzten Akzent gehören zyklisch zur ersten Gruppe.
      if (current.length) {
        if (groups.length) groups[0] = current.concat(groups[0]);
        else groups.push(current);
      }
    } else {
      if (current.length) groups.push(current);
      // Zählzeiten vor dem ersten Akzent gehören zyklisch zur letzten Gruppe.
      if (groups.length > 1 && !isAccent(groups[0][0])) {
        const head = groups.shift();
        groups[groups.length - 1] = groups[groups.length - 1].concat(head);
      }
    }
    return groups;
  };
})(window.Compas = window.Compas || {});
