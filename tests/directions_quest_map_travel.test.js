// Quest map: per-type station designs + inline travel links (2026-07-20, Aaron's ask —
// "custom designs for each resource type" + "go immediately to the resource that's next").
// The three new helpers are pure and exercised FOR REAL via eval-slice; the wiring
// (clickable stations, keyboard travel strip, role=img unchanged) is pinned.
// NO GATING remains a pin: recommending a next step must never lock the others.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const mirror = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8');

// ── eval-slice the REAL helpers (same anchors the objectives suite uses) ──────
const start = anti.indexOf('function _alloNormalizeDirectionsData(');
const end = anti.indexOf('let globalAudioCtx');
if (start < 0 || end < 0 || end <= start) throw new Error('helper slice anchors missed');
const { style, shape, recommend, STYLES, FALLBACK } = new Function(
  anti.slice(start, end) +
  '\nreturn { style: _alloStationStyle, shape: _alloStationShape, recommend: _alloRecommendNextStations,' +
  ' STYLES: _ALLO_STATION_STYLES, FALLBACK: _ALLO_STATION_FALLBACK };'
)();

describe('station registry: every resource type gets its own design', () => {
  it('each entry is complete — emblem, silhouette, tint, spoken label', () => {
    const entries = Object.entries(STYLES);
    expect(entries.length).toBeGreaterThanOrEqual(20);
    entries.forEach(([type, s]) => {
      expect(s.icon, type).toBeTruthy();
      expect(s.shape, type).toBeTruthy();
      expect(s.fill, type).toMatch(/^#[0-9a-f]{6}$/i);
      expect(s.stroke, type).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof s.label, type).toBe('string');
      expect(s.label.length, type).toBeGreaterThan(0);
    });
  });
  it('families are visually distinct — a quiz does not look like a reading', () => {
    expect(style('quiz').shape).not.toBe(style('simplified').shape);
    expect(style('quiz').icon).not.toBe(style('simplified').icon);
    expect(style('manipulative-resource').shape).toBe(style('math').shape); // one math/STEM silhouette
    expect(style('concept-sort').shape).toBe('square');
    expect(style('adventure').shape).toBe('hex');
  });
  it('unknown types fall back to a plain page — never a crash, never a blank node', () => {
    expect(style('some-future-type')).toBe(FALLBACK);
    expect(style(undefined)).toBe(FALLBACK);
    expect(style(null).icon).toBeTruthy();
  });
  it('every declared silhouette is actually renderable (no accidental fallbacks)', () => {
    const shapes = new Set(Object.values(STYLES).map(s => s.shape));
    shapes.forEach(sh => {
      const d = shape(sh, 100, 50, 13);
      expect(['rect', 'circle', 'polygon', 'path'], sh).toContain(d.tag);
      if (sh !== 'circle') expect(d.tag, sh + ' should not silently fall back to a circle').not.toBe('circle');
    });
  });
});

describe('station geometry: pure, centered, self-describing', () => {
  it('squares and capsules are centered on the node point', () => {
    const sq = shape('square', 100, 50, 13);
    expect(sq.tag).toBe('rect');
    expect(sq.attrs.x + sq.attrs.width / 2).toBe(100);
    expect(sq.attrs.y + sq.attrs.height / 2).toBe(50);
    const cap = shape('capsule', 100, 50, 13);
    expect(cap.attrs.width).toBeGreaterThan(cap.attrs.height); // wider than tall
    expect(cap.attrs.x + cap.attrs.width / 2).toBeCloseTo(100, 6);
  });
  it('diamond and hexes emit polygon point lists of the right arity', () => {
    expect(shape('diamond', 100, 50, 13).attrs.points.split(' ')).toHaveLength(4);
    expect(shape('hex', 100, 50, 13).attrs.points.split(' ')).toHaveLength(6);
    expect(shape('hexflat', 100, 50, 13).attrs.points.split(' ')).toHaveLength(6);
    // pointy-top vs flat-top are genuinely different silhouettes
    expect(shape('hex', 100, 50, 13).attrs.points).not.toBe(shape('hexflat', 100, 50, 13).attrs.points);
  });
  it('scroll is a path; anything unrecognized is a circle', () => {
    expect(shape('scroll', 100, 50, 13).tag).toBe('path');
    expect(shape('nonsense', 100, 50, 13)).toEqual({ tag: 'circle', attrs: { cx: 100, cy: 50, r: 13 } });
  });
});

// ── the travel recommendation ────────────────────────────────────────────────
const items = [
  { id: 'r1', type: 'simplified', title: 'Reading' },
  { id: 'r2', type: 'glossary', title: 'Words' },
  { id: 'r3', type: 'quiz', title: 'Quiz' },
  { id: 'r4', type: 'adventure', title: 'Game' }
];

describe('recommend next: an open goal beats plain pack order', () => {
  it('with nothing visited and no goals, next = the first station in pack order', () => {
    const r = recommend(items, {}, [], []);
    expect(r.next.item.id).toBe('r1');
    expect(r.next.reason).toBe('new');
    expect(r.unvisitedCount).toBe(4);
  });
  it('an unvisited station tied to an OPEN goal outranks earlier unvisited stations', () => {
    const objs = [{ id: 'g1', label: 'Beat the adventure', kind: 'game', resourceRef: 'r4' }];
    const evald = [{ id: 'g1', label: 'Beat the adventure', kind: 'game', done: false }];
    const r = recommend(items, {}, objs, evald);
    expect(r.next.item.id).toBe('r4');
    expect(r.next.reason).toBe('goal');
    expect(r.next.goalLabel).toBe('Beat the adventure');
    expect(r.alternates.map(a => a.item.id)).toEqual(['r1', 'r2']); // then plain pack order
  });
  it('a goal already DONE stops steering — its station drops back to pack order', () => {
    const objs = [{ id: 'g1', label: 'Beat the adventure', kind: 'game', resourceRef: 'r4' }];
    const evald = [{ id: 'g1', label: 'Beat the adventure', kind: 'game', done: true }];
    expect(recommend(items, {}, objs, evald).next.item.id).toBe('r1');
  });
  it('goals are matched by id, not position (the evaluator DROPS malformed objectives)', () => {
    const objs = [
      { id: 'bad', label: 'malformed', kind: 'teleport', resourceRef: 'r2' }, // never evaluated
      { id: 'g2', label: 'Take the quiz', kind: 'manual', resourceRef: 'r3' }
    ];
    const evald = [{ id: 'g2', label: 'Take the quiz', kind: 'manual', done: false }]; // shorter, shifted
    const r = recommend(items, {}, objs, evald);
    expect(r.next.item.id).toBe('r3');       // NOT r2 — positional alignment would have picked wrong
    expect(r.next.goalLabel).toBe('Take the quiz');
  });
});

describe('recommend next: visited stations, revisits, and the finished state', () => {
  const visitedAll = { r1: true, r2: true, r3: true, r4: true };
  it('skips visited stations while unvisited ones remain', () => {
    const r = recommend(items, { r1: true, r2: true }, [], []);
    expect(r.next.item.id).toBe('r3');
    expect(r.unvisitedCount).toBe(2);
  });
  it('all visited but a goal still open → recommend a REVISIT of that station', () => {
    const objs = [{ id: 'g1', label: 'Finish the quiz', kind: 'manual', resourceRef: 'r3' }];
    const evald = [{ id: 'g1', label: 'Finish the quiz', kind: 'manual', done: false }];
    const r = recommend(items, visitedAll, objs, evald);
    expect(r.next.item.id).toBe('r3');
    expect(r.next.reason).toBe('goal');
    expect(r.next.visited).toBe(true);
  });
  it('everything visited and nothing open → next is null (celebrate, do not nag)', () => {
    const r = recommend(items, visitedAll, [], []);
    expect(r.next).toBeNull();
    expect(r.alternates).toEqual([]);
    expect(r.unvisitedCount).toBe(0);
  });
  it('alternates are capped at two so the strip never becomes a wall of buttons', () => {
    expect(recommend(items, {}, [], []).alternates).toHaveLength(2);
  });
  it('junk in never throws — empty pack, junk items, junk goals', () => {
    expect(recommend(null, null, null, null).next).toBeNull();
    expect(recommend([{ nope: 1 }, null], {}, ['junk', null], [null]).next).toBeNull();
    expect(recommend(items, 'not-an-object', undefined, undefined).next.item.id).toBe('r1');
  });
});

const viewSlice = () => { const a = anti.indexOf("activeView === 'directions'"); return anti.slice(a, anti.indexOf("activeView === 'simplified'", a)); };

describe('wiring: the map is a way to MOVE, and it stays accessible', () => {
  it('stations travel through the SAME handleRestoreView every other lane uses', () => {
    expect(anti).toContain('const _travelTo = (it) => { if (it && it.id) handleRestoreView(it); };');
    expect(anti).toContain('<g key={it.id} onClick={() => _travelTo(it)} style={{ cursor: \'pointer\' }}>');
  });
  it('the SVG is still role=img with a spoken summary; travel lives in real HTML buttons', () => {
    const view = viewSlice();
    expect(view).toContain('<svg role="img"');
    expect(view).toContain("t('directions.map_jump_any') || 'Go to any station'");
    expect(view).toContain('_rec.next.goalLabel');
  });
  it('the travel strip is OUTSIDE the map toggle — hiding the picture keeps the links', () => {
    const view = viewSlice();
    const mapBlock = view.indexOf('{showQuestMap && _mapItems.length > 0 && (');
    const stripBlock = view.indexOf('{_mapItems.length > 0 && (', mapBlock + 10);
    expect(stripBlock).toBeGreaterThan(mapBlock);
    expect(view.slice(mapBlock, stripBlock)).toContain('</svg>');
  });
  it('NO GATING: no travel button is ever disabled, and every station stays reachable', () => {
    const view = viewSlice();
    expect(view).not.toMatch(/disabled=\{/);
    expect(view).toContain("{_mapItems.map(it => (\n"); // the jump-to-any list walks the FULL station set
  });
  it('station names are translatable with the registry label as the fallback', () => {
    expect(anti).toContain("t('directions.station_' + String(it.type).replace(/-/g, '_')) || _alloStationStyle(it.type).label");
  });
});

describe('mirror parity', () => {
  it('desktop/web-app/src mirror carries the identical feature', () => {
    expect(mirror).toBe(anti);
  });
});
