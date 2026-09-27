import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_bridgelab.js';

function printReport(overrides = {}) {
  const html = renderTool('bridgeLab', {
    bridgeLab: {
      tab: 'print', span: 30, height: 6, nBays: 4,
      loadPerJoint: 50, materialId: 'steel', crossSectionMm2: 5000,
      trussStyle: 'warren', loadMode: 'uniform', lateralBraceEvery: 1,
      vehicleLoad: 150, vehiclePos: 0.5, ...overrides
    }
  });
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const region = wrapper.querySelector('#bridge-print-region');
  expect(region).not.toBeNull();
  const rows = new Map(Array.from(region.querySelectorAll('tr'), (row) => [
    row.children[0].textContent, row.children[1].textContent
  ]));
  return { region, rows };
}

describe('Bridge Lab printable current-design analysis', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, 'bridgeLab');
  });

  it('reports buckling failure even when material yield has adequate margin', () => {
    const { region, rows } = printReport();
    expect(Number(rows.get('Yield safety factor'))).toBeGreaterThan(2);
    expect(Number(rows.get('Buckling safety factor'))).toBeLessThan(1);
    expect(rows.get('Governing safety factor')).toBe(rows.get('Buckling safety factor'));
    expect(region.textContent).toContain('FAILED');
    expect(region.textContent).toContain('Euler buckling limit exceeded');
    expect(region.textContent).not.toContain('✓ SAFE');
    expect(rows.get('Analysis method')).toContain('Method of joints');
    expect(rows.get('Governing compression member')).toMatch(/effective length .*Euler capacity/);
  });

  it('uses the current vehicle load, position, and unequal support reactions', () => {
    const { region, rows } = printReport({
      trussStyle: 'pratt', nBays: 6, loadMode: 'vehicle',
      vehicleLoad: 150, vehiclePos: 0.2, loadPerJoint: 200
    });
    expect(rows.get('Load mode')).toContain('Moving vehicle');
    expect(rows.get('Vehicle load and position')).toBe('150 kN at 20.0% of span (6.00 m from the left support)');
    expect(rows.get('Total applied load (W)')).toBe('150.0 kN');
    expect(rows.get('Left support reaction')).toBe('120.0 kN upward');
    expect(rows.get('Right support reaction')).toBe('30.0 kN upward');
    expect(rows.has('Load per top joint')).toBe(false);
    expect(region.textContent).toContain('Vehicle results describe only the current position');
  });

  it('reports the real loaded-joint count and scopes quantities to one planar truss', () => {
    const { region, rows } = printReport({ trussStyle: 'warren', nBays: 4 });
    // Four elevated joints each carry 50 kN in this Warren geometry.
    expect(rows.get('Total applied load (W)')).toBe('200.0 kN');
    // Four bottom bays, three top bays, and eight half-bay diagonals.
    const length = 30 + 22.5 + 8 * Math.hypot(3.75, 6);
    expect(rows.get('Total member length')).toBe(length.toFixed(1) + ' m');
    expect(region.textContent).toContain('Quantities — one planar truss');
    expect(region.textContent).toContain('exclude the deck, second truss, lateral-bracing members, connections, and waste');
    expect(region.textContent).toContain('Material dead weight is not added');
    for (const row of region.querySelectorAll('tr')) {
      expect(row.children[0].tagName).toBe('TH');
      expect(row.children[0].getAttribute('scope')).toBe('row');
    }
  });

  it('shows bracing and labels the K-truss approximation', () => {
    const { region, rows } = printReport({ trussStyle: 'ktruss', lateralBraceEvery: 3 });
    expect(rows.get('Analysis method')).toBe('Deep-beam approximation');
    // The requested interval is capped at the actual top chord, from x=7.5 to x=22.5.
    expect(rows.get('Lateral bracing')).toBe('Every 3 bays; longest top-chord unbraced interval 15.00 m');
    expect(region.textContent).toContain('K-truss forces are not solved member by member');
    expect(region.textContent).not.toContain('NaN');
  });

  it('describes zero-load safety factors as no demand', () => {
    const { region, rows } = printReport({ loadMode: 'vehicle', vehicleLoad: 0 });
    expect(rows.get('Total applied load (W)')).toBe('0.0 kN');
    expect(rows.get('Governing safety factor')).toBe('No demand');
    expect(rows.get('Yield safety factor')).toBe('No demand');
    expect(rows.get('Buckling safety factor')).toBe('No demand');
    expect(region.textContent).toContain('NO APPLIED LOAD');
    expect(region.textContent).not.toMatch(/Infinity|NaN|✓ SAFE/);
  });

  it('distinguishes a vehicle directly over a support from a loaded-span safety check', () => {
    const { region, rows } = printReport({ loadMode: 'vehicle', vehiclePos: 0 });
    expect(rows.get('Total applied load (W)')).toBe('150.0 kN');
    expect(rows.get('Left support reaction')).toBe('150.0 kN upward');
    expect(rows.get('Right support reaction')).toBe('0.0 kN upward');
    expect(rows.get('Governing safety factor')).toBe('No demand');
    expect(region.textContent).toContain('NO MEMBER DEMAND');
    expect(region.textContent).not.toMatch(/Infinity|NaN|✓ SAFE/);
  });
});
