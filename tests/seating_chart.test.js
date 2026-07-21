// Tests for seating_chart_module.js — the teacher seating chart (Ring 0+1).
//
// The UI is browser smoke; what IS pinned here are the pure seams the whole
// feature stands on: normalizeSeating round-trip + junk tolerance, template
// generators staying inside the room, and — most load-bearing — the
// deterministic solver actually honoring each declared constraint type.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let S;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.SeatingChart;
  // Minimal React stub — only the pure seams are exercised here; the panel
  // component itself is browser smoke.
  if (!window.React) {
    window.React = {
      createContext: () => ({}),
      createElement: () => null,
      Fragment: 'Fragment',
      memo: (c) => c,
      useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
      useEffect: () => {},
      useRef: (v) => ({ current: v }),
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useContext: () => null,
    };
  }
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'seating_chart_module.js'), 'utf8'))();
  S = window.AlloModules.SeatingChart && window.AlloModules.SeatingChart._testing;
  if (!S) throw new Error('SeatingChart did not register');
});

const names = (n) => Array.from({ length: n }, (_, i) => 'Student' + String(i + 1).padStart(2, '0'));

function gridLayout(n) {
  const t = S.buildTemplate('rows', n);
  return { id: 'layout1', name: 'Test', seats: t.seats, furniture: t.furniture, assignments: {} };
}
const seatById = (layout, id) => layout.seats.find((s) => s.id === id);
const seatOf = (assignments, student) => Object.keys(assignments).find((k) => assignments[k] === student);

describe('normalizeSeating', () => {
  it('tolerates junk without throwing and yields an empty chart', () => {
    for (const junk of [null, 42, 'x', [], { layouts: 'nope', constraints: { a: 1 } }]) {
      const out = S.normalizeSeating(junk, ['A']);
      expect(out.version).toBe(1);
      expect(out.activeLayoutId).toBe(null);
      expect(out.constraints).toEqual([]);
    }
  });

  it('round-trips a valid chart and prunes invalid pieces', () => {
    const t = S.buildTemplate('rows', 4);
    const raw = {
      activeLayoutId: 'layout1',
      solveSeed: 7,
      layouts: {
        layout1: {
          id: 'layout1', name: 'P3', seats: t.seats, furniture: t.furniture,
          assignments: {
            [t.seats[0].id]: 'Ana',
            [t.seats[1].id]: 'Ana',          // duplicate student ⇒ second dropped
            ghost_seat: 'Bo',                 // unknown seat ⇒ dropped
            [t.seats[2].id]: 'Bo',
          },
        },
      },
      constraints: [
        { id: 'con1', type: 'keep_apart', students: ['Ana', 'Bo'] },
        { id: 'con2', type: 'keep_apart', students: ['Ana', 'Zed'] },  // unknown student ⇒ dropped
        { id: 'con3', type: 'keep_apart', students: ['Ana', 'Ana'] },  // same student twice ⇒ dropped
        { id: 'con4', type: 'nonsense', students: ['Ana'] },           // unknown type ⇒ dropped
        { id: 'con5', type: 'fixed_seat', students: ['Bo'], seatId: 'ghost' }, // unknown seat ⇒ dropped
        { id: 'con6', type: 'fixed_seat', students: ['Bo'], seatId: t.seats[3].id },
      ],
    };
    const out = S.normalizeSeating(raw, ['Ana', 'Bo']);
    expect(out.activeLayoutId).toBe('layout1');
    expect(out.solveSeed).toBe(7);
    const a = out.layouts.layout1.assignments;
    expect(Object.values(a).sort()).toEqual(['Ana', 'Bo']);
    expect(a.ghost_seat).toBeUndefined();
    expect(out.constraints.map((c) => c.id)).toEqual(['con1', 'con6']);
  });
});

describe('buildTemplate', () => {
  for (const kind of ['rows', 'pairs', 'pods', 'horseshoe']) {
    it(`${kind}: right seat count, unique ids, everything inside the room`, () => {
      for (const n of [1, 5, 12, 24, 33]) {
        const t = S.buildTemplate(kind, n);
        expect(t.seats.length).toBe(n);
        expect(new Set(t.seats.map((s) => s.id)).size).toBe(n);
        for (const s of t.seats) {
          expect(s.x).toBeGreaterThanOrEqual(0);
          expect(s.y).toBeGreaterThanOrEqual(0);
          expect(s.x + s.w).toBeLessThanOrEqual(S.ROOM_W);
          expect(s.y + s.h).toBeLessThanOrEqual(S.ROOM_H);
        }
        // Anchor furniture ships with every template so anchor constraints work.
        expect(t.furniture.some((f) => f.kind === 'teacher_desk')).toBe(true);
        expect(t.furniture.some((f) => f.kind === 'door')).toBe(true);
      }
    });
  }

  it('normalizeSeating accepts every template unchanged (no clamping surprises)', () => {
    for (const kind of ['rows', 'pairs', 'pods', 'horseshoe']) {
      const t = S.buildTemplate(kind, 28);
      const out = S.normalizeSeating(
        { activeLayoutId: 'layout1', layouts: { layout1: { id: 'layout1', name: 'x', seats: t.seats, furniture: t.furniture, assignments: {} } }, constraints: [] },
        []
      );
      expect(out.layouts.layout1.seats.map((s) => [s.x, s.y])).toEqual(t.seats.map((s) => [s.x, s.y]));
    }
  });
});

describe('solveSeating', () => {
  it('is deterministic per seed and seats everyone when seats suffice', () => {
    const layout = gridLayout(24);
    const students = names(24);
    const a = S.solveSeating(layout, students, [], { seed: 3 });
    const b = S.solveSeating(layout, students, [], { seed: 3 });
    expect(a.assignments).toEqual(b.assignments);
    expect(Object.keys(a.assignments).length).toBe(24);
    expect(new Set(Object.values(a.assignments)).size).toBe(24);
  });

  it('caps at seat count when there are more students than seats', () => {
    const layout = gridLayout(6);
    const r = S.solveSeating(layout, names(10), [], { seed: 1 });
    expect(Object.keys(r.assignments).length).toBe(6);
  });

  it('honors keep_apart', () => {
    const layout = gridLayout(24);
    const students = names(24);
    const cons = [{ id: 'con1', type: 'keep_apart', students: ['Student01', 'Student02'] }];
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = S.solveSeating(layout, students, cons, { seed });
      const s1 = seatById(layout, seatOf(r.assignments, 'Student01'));
      const s2 = seatById(layout, seatOf(r.assignments, 'Student02'));
      expect(S.centerDist(s1, s2)).toBeGreaterThanOrEqual(S.ADJ_DIST);
      expect(r.violations).toEqual([]);
    }
  });

  it('honors keep_together', () => {
    const layout = gridLayout(24);
    const cons = [{ id: 'con1', type: 'keep_together', students: ['Student05', 'Student20'] }];
    const r = S.solveSeating(layout, names(24), cons, { seed: 9 });
    const s1 = seatById(layout, seatOf(r.assignments, 'Student05'));
    const s2 = seatById(layout, seatOf(r.assignments, 'Student20'));
    expect(S.centerDist(s1, s2)).toBeLessThanOrEqual(S.ADJ_DIST);
    expect(r.violations).toEqual([]);
  });

  it('honors fixed_seat and keeps the pin through repair', () => {
    const layout = gridLayout(12);
    const pin = layout.seats[7].id;
    const cons = [
      { id: 'con1', type: 'fixed_seat', students: ['Student03'], seatId: pin },
      { id: 'con2', type: 'keep_apart', students: ['Student01', 'Student02'] },
    ];
    const r = S.solveSeating(layout, names(12), cons, { seed: 2 });
    expect(r.assignments[pin]).toBe('Student03');
    expect(r.violations).toEqual([]);
  });

  it('honors front_row (student lands in the front third)', () => {
    const layout = gridLayout(24);
    const cons = [{ id: 'con1', type: 'front_row', students: ['Student17'] }];
    const r = S.solveSeating(layout, names(24), cons, { seed: 4 });
    const seat = seatById(layout, seatOf(r.assignments, 'Student17'));
    const ys = layout.seats.map((s) => s.y + s.h / 2);
    const cutoff = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) / 3;
    expect(seat.y + seat.h / 2).toBeLessThanOrEqual(cutoff);
    expect(r.violations).toEqual([]);
  });

  it('honors near_teacher / near_door / avoid_window together', () => {
    const layout = gridLayout(24);
    layout.furniture = layout.furniture.concat([{ id: 'furnW', kind: 'window', x: 0, y: 40, w: 3, h: 14, label: '' }]);
    const cons = [
      { id: 'con1', type: 'near_teacher', students: ['Student01'] },
      { id: 'con2', type: 'near_door', students: ['Student02'] },
      { id: 'con3', type: 'avoid_window', students: ['Student03'] },
    ];
    const r = S.solveSeating(layout, names(24), cons, { seed: 6 });
    expect(r.violations).toEqual([]);
    const teacher = layout.furniture.find((f) => f.kind === 'teacher_desk');
    const s1 = seatById(layout, seatOf(r.assignments, 'Student01'));
    expect(S.centerDist(s1, teacher)).toBeLessThanOrEqual(S.NEAR_RADIUS);
  });

  it('reports honest violations when constraints are impossible', () => {
    // Two students pinned to seats that ARE adjacent (centers 11 < ADJ_DIST)
    // AND required to be apart.
    const layout = {
      id: 'layout1', name: 'Tight', furniture: [], assignments: {},
      seats: [
        { id: 'seatA', x: 0, y: 0, w: 10, h: 7 },
        { id: 'seatB', x: 11, y: 0, w: 10, h: 7 },
        { id: 'seatC', x: 60, y: 40, w: 10, h: 7 },
      ],
    };
    const cons = [
      { id: 'con1', type: 'fixed_seat', students: ['Student01'], seatId: 'seatA' },
      { id: 'con2', type: 'fixed_seat', students: ['Student02'], seatId: 'seatB' },
      { id: 'con3', type: 'keep_apart', students: ['Student01', 'Student02'] },
    ];
    const r = S.solveSeating(layout, names(3), cons, { seed: 1 });
    expect(r.assignments.seatA).toBe('Student01');
    expect(r.assignments.seatB).toBe('Student02');
    expect(r.violations.map((v) => v.id)).toContain('con3');
    expect(r.score).toBeGreaterThan(0);
  });
});

describe('scoring extras', () => {
  it('anchorGaps flags anchor constraints whose furniture is missing', () => {
    const layout = gridLayout(8);
    layout.furniture = layout.furniture.filter((f) => f.kind !== 'door');
    const gaps = S.anchorGaps(layout, [
      { id: 'con1', type: 'near_door', students: ['Student01'] },
      { id: 'con2', type: 'front_row', students: ['Student02'] },
    ]);
    expect(gaps.map((g) => g.id)).toEqual(['con1']);
    expect(gaps[0].anchor).toBe('door');
  });

  it('unseated students never count as violations', () => {
    const layout = gridLayout(4);
    const { violations } = S.scoreAssignment(layout, {}, [
      { id: 'con1', type: 'keep_apart', students: ['Student01', 'Student02'] },
      { id: 'con2', type: 'front_row', students: ['Student03'] },
    ]);
    expect(violations).toEqual([]);
  });
});

describe('buildPrintableSvg', () => {
  it('renders every seated name and escapes markup in data', () => {
    const layout = gridLayout(4);
    layout.assignments = { [layout.seats[0].id]: 'Ana <script>', [layout.seats[1].id]: 'Bo & Co' };
    const svg = S.buildPrintableSvg(layout, (n) => n, 'Period "3" <Chart>');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Ana &lt;script&gt;');
    expect(svg).toContain('Bo &amp; Co');
    expect(svg).toContain('Period &quot;3&quot; &lt;Chart&gt;');
    expect(svg).not.toContain('<script>');
  });
});

describe('nextId', () => {
  it('takes max numeric suffix + 1 for the matching prefix only', () => {
    expect(S.nextId(['seat1', 'seat9', 'seat3'], 'seat')).toBe('seat10');
    expect(S.nextId(['seat2', 'furn7'], 'furn')).toBe('furn8');
    expect(S.nextId([], 'layout')).toBe('layout1');
    expect(S.nextId(['layoutX', 'other12'], 'layout')).toBe('layout1');
  });
});
