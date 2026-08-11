import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';

const arc = (range, apex, n = 12) => {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push({ x: range * t, y: apex * 4 * t * (1 - t) });
  }
  return pts;
};

const shot = (o = {}) => Object.assign({
  range: 120, downrange: 120, drift: 0, apex: 30, flightTime: 5, impactSpeed: 33,
  crankWork: 44000, stored: 37700, muzzleKE: 20000, impactKE: 14000, eta: 0.53,
  effMass: 48.6, dropGain: 0, dragLoss: 6000,
  path: arc(120, 30)
}, o);

const hist = (...entries) => entries.map(([projMass, range]) => ({
  projMass, range, muzzleV: 40, eta: 0.5, path: arc(range, range * 0.25)
}));

const state = (o = {}) => ({ machineLab: Object.assign({ view: 'range' }, o) });

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'machineLab');
});

// A table of ranges STATES the light-stone / heavy-stone trade-off. Two arcs
// side by side SHOW it, which is the whole reason the tool exists.
describe('Machine Lab: trajectory overlay', () => {
  it('draws only the current shot when there is nothing to compare', () => {
    const html = renderTool('machineLab', state({ lastShot: shot(), shotHistory: hist([25, 120]) }));
    expect((html.match(/<polyline/g) || []).length).toBe(1);
    expect(html).not.toContain('Hide earlier shots');
  });

  it('draws earlier shots behind the current one', () => {
    const html = renderTool('machineLab', state({
      lastShot: shot(),
      shotHistory: hist([5, 60], [25, 120], [120, 90])
    }));
    // Current shot plus the two earlier ones.
    expect((html.match(/<polyline/g) || []).length).toBe(3);
    expect(html).toContain('stroke-dasharray');
  });

  it('caps how many it draws so the graph stays readable', () => {
    const many = hist([1, 40], [2, 55], [5, 80], [10, 100], [25, 120], [60, 110], [200, 70], [400, 40]);
    const html = renderTool('machineLab', state({ lastShot: shot(), shotHistory: many }));
    const lines = (html.match(/<polyline/g) || []).length;
    expect(lines).toBeGreaterThan(1);
    expect(lines).toBeLessThanOrEqual(5);   // 4 past + the current one
  });

  it('scales to fit the longest arc, not just the current one', () => {
    // A past shot that flew further must not run off the right edge: the
    // rightmost drawn x should belong to that shot, inside the plot area.
    const html = renderTool('machineLab', state({
      lastShot: shot({ range: 60, path: arc(60, 15) }),
      shotHistory: hist([5, 300], [25, 60])
    }));
    const xs = [];
    (html.match(/points="([^"]+)"/g) || []).forEach((p) => {
      p.replace(/points="|"/g, '').split(' ').forEach((pair) => {
        const x = parseFloat(pair.split(',')[0]);
        if (Number.isFinite(x)) xs.push(x);
      });
    });
    expect(xs.length).toBeGreaterThan(10);
    expect(Math.max(...xs)).toBeLessThanOrEqual(340 - 26 + 0.5);   // W - pad
  });

  it('can be switched off', () => {
    const html = renderTool('machineLab', state({
      lastShot: shot(), shotHistory: hist([5, 60], [25, 120]), showOverlay: false
    }));
    expect((html.match(/<polyline/g) || []).length).toBe(1);
    expect(html).toContain('Show earlier shots');
  });

  it('carries the comparison in text, not only as dashed lines', () => {
    // Same contract as the ledger and the wall: the picture is never the only
    // carrier of the information.
    const html = renderTool('machineLab', state({
      lastShot: shot(), shotHistory: hist([5, 60], [200, 75], [25, 120])
    }));
    expect(html).toContain('Dashed arcs are earlier shots:');
    expect(html).toContain('5 kg → 60 m');
    expect(html).toContain('200 kg → 75 m');
  });

  it('survives history entries recorded before traces were kept', () => {
    // Older saved state has no `path` on its history rows, and must not throw
    // or draw a broken line.
    const html = renderTool('machineLab', state({
      lastShot: shot(),
      shotHistory: [{ projMass: 25, range: 100, muzzleV: 40, eta: 0.5 }, { projMass: 60, range: 90 }]
    }));
    expect(html).toContain('Flight path');
    expect(html).not.toContain('NaN');
    expect((html.match(/<polyline/g) || []).length).toBe(1);
  });
});

describe('Machine Lab: compact traces', () => {
  it('keeps logged traces small enough to live in state', () => {
    // fire() stores a downsampled trace per shot; the raw path is ~200 points
    // and eight of those in state would bloat every snapshot.
    const html = renderTool('machineLab', state({
      lastShot: shot(), shotHistory: hist([25, 120])
    }));
    expect(html).toContain('Flight path');
    const pts = (html.match(/points="([^"]+)"/) || ['', ''])[1].trim().split(' ');
    expect(pts.length).toBeGreaterThan(3);
    expect(pts.length).toBeLessThanOrEqual(200);
  });
});
