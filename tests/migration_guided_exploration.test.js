import { beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool;

function walk(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, matches)); return matches; }
  if (predicate(node)) matches.push(node);
  if (node.props) walk(node.props.children, predicate, matches);
  return matches;
}

// Render with React's real hook dispatcher, then exercise the same handlers the
// browser receives. Canvas effects are intentionally absent during server render.
function exploration(seed = {}) {
  let state = { ...seed };
  let tree;
  const announce = vi.fn();
  const ctx = makeCtx({
    announceToSR: announce,
    update: (toolId, key, value) => { expect(toolId).toBe('migration'); state = { ...state, [key]: value }; },
    updateMulti: (toolId, values) => { expect(toolId).toBe('migration'); state = { ...state, ...values }; }
  });
  function draw() {
    ctx.toolData = { migration: state };
    function View() { tree = tool.render(ctx); return tree; }
    return ReactDOMServer.renderToStaticMarkup(React.createElement(View));
  }
  return {
    draw, announce,
    get state() { return state; },
    find: predicate => walk(tree, predicate)[0],
    findAll: predicate => walk(tree, predicate)
  };
}

beforeEach(() => {
  resetStemLab();
  tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});

describe('Migration Lab guided exploration', () => {
  it('starts collapsed and opens a coherent investigation without changing simulation settings', () => {
    const ui = exploration({ flightWind: 13, flightSpecies: 'monarch', inquiry: { hypothesis: 'Keep my work' } });
    ui.draw();
    const guide = ui.find(node => node.type === 'details' && node.props['data-migration-guides']);
    expect(guide).toBeTruthy();
    expect(guide.props.open).toBeUndefined();
    expect(ui.findAll(node => node.props?.['data-guide-id'])).toHaveLength(3);
    ui.find(node => node.props?.['data-guide-id'] === 'formation').props.onClick();
    expect(ui.state.tab).toBe('flight3d');
    expect(ui.state.guidedExploration).toMatchObject({ id: 'formation', step: 0 });
    expect(ui.state.flightWind).toBe(13);
    expect(ui.state.flightSpecies).toBe('monarch');
    expect(ui.state.inquiry.hypothesis).toBe('Keep my work');
    expect(ui.announce).toHaveBeenCalledWith(expect.stringContaining('Compare Solo with V formation'));
  });

  it('moves between actual workspaces and keeps separate evidence notes for each question', () => {
    const ui = exploration({ guidedExploration: { id: 'formation', step: 0, notes: { wind: 'Tailwind helped.' } } });
    ui.draw();
    ui.find(node => node.type === 'textarea' && node.props.maxLength === 2000).props.onChange({ target: { value: 'V used less energy.' } });
    ui.draw();
    ui.find(node => node.props?.className === 'migration-guide-next').props.onClick();
    expect(ui.state.tab).toBe('vformation');
    expect(ui.state.guidedExploration.step).toBe(1);
    expect(ui.state.guidedExploration.notes).toEqual({ wind: 'Tailwind helped.', formation: 'V used less energy.' });
    ui.draw();
    ui.find(node => node.props?.className === 'migration-guide-next').props.onClick();
    expect(ui.state.tab).toBe('inquiry');
    expect(ui.state.guidedExploration.step).toBe(2);
    const html = ui.draw();
    expect(html).toContain('identical wingspan, mass, wind and distance');
    expect(ui.findAll(node => node.props?.['aria-current'] === 'step')).toHaveLength(1);
    expect(ui.find(node => node.props?.className === 'migration-guide-next')).toBeUndefined();
    ui.find(node => node.props?.['data-guide-id'] === 'wind').props.onClick();
    ui.draw();
    expect(ui.find(node => node.type === 'textarea' && node.props.maxLength === 2000).props.value).toBe('Tailwind helped.');
  });

  it('recovers unknown saved guide IDs and out-of-range steps', () => {
    const unknown = exploration({ guidedExploration: { id: 'obsolete', step: 999, notes: 'bad state' } });
    expect(() => unknown.draw()).not.toThrow();
    expect(unknown.find(node => node.props?.className === 'migration-guide-investigation')).toBeUndefined();
    const known = exploration({ guidedExploration: { id: 'wind', step: 999, notes: { wind: {} } } });
    expect(() => known.draw()).not.toThrow();
    expect(known.find(node => node.type === 'textarea' && node.props.maxLength === 2000).props.value).toBe('');
    expect(known.findAll(node => node.props?.['aria-current'] === 'step')).toHaveLength(1);
  });
});

describe('Migration Lab saved inquiry recovery', () => {
  const valid = { n: 4, testVar: 'headwind', wingspan: 1.2, mass: 0.8, headwind: 0, vMode: 'V', distance: 4000, ratio: 1.5, stateKey: 'comfortable' };

  it.each([
    { log: 'not an array' },
    { trials: [null, {}, { ratio: NaN }, valid] },
    { trials: [valid, { ...valid, ratio: Infinity }] },
    { log: [null, 'broken', { w: '1.2 m', m: '0.8 kg', hw: 0, fmt: 'V', d: 4000, fr: '1.5', state: 'Comfortable' }] }
  ])('renders valid saved observations without crashing or producing NaN geometry: %j', (inquiry) => {
    const html = renderTool('migration', { migration: { tab: 'inquiry', inquiry: { ...inquiry, testVar: 'headwind' } } });
    expect(html).toContain('Energy Inquiry');
    expect(html).toContain('Some saved trial rows could not be read');
    expect(html).not.toMatch(/(?:width|height|x|y|points|value)="[^"]*(?:NaN|Infinity)/);
    if (Array.isArray(inquiry.trials)) expect(html).toContain('1.50x');
  });

  it('normalizes numeric strings and malformed prose while preserving a valid hypothesis', () => {
    const html = renderTool('migration', { migration: { tab: 'inquiry', inquiry: {
      wingspan: '1.2', mass: '0.8', headwind: '0', distance: '4000', vMode: {}, hypothesis: 'A larger headwind costs energy.', explanation: {}, trials: [valid]
    } } });
    expect(html).toContain('A larger headwind costs energy.');
    expect(html).toContain('1.50x');
    expect(html).not.toContain('[object Object]');
    expect(html).not.toMatch(/(?:NaN|Infinity)/);
  });

  it('labels identical observations as repeats rather than a changed-variable comparison', () => {
    const html = renderTool('migration', { migration: { tab: 'inquiry', inquiry: {
      testVar: 'headwind', trials: [valid, { ...valid, n: 5 }, { ...valid, n: 6, headwind: 4, ratio: 1.1 }]
    } } });
    expect(html).toContain('unchanged (repeat)');
    expect(html).toContain('Other controls stayed constant between these trials.');
    expect(html).not.toContain('takeoff cost dominates');
  });

  it('preserves recovered legacy observations through a hypothesis edit and CSV export', () => {
    const ui = exploration({ tab: 'inquiry', inquiry: { log: [
      { w: '1.2 m', m: '0.8 kg', hw: 0, fmt: 'V', d: 4000, fr: '1.5', state: 'Comfortable' }
    ] } });
    expect(ui.draw()).toContain('1.50x');
    ui.find(node => node.type === 'textarea' && node.props['aria-label'] === 'Migration energy hypothesis')
      .props.onChange({ target: { value: 'The V helps conserve energy.' } });
    expect(ui.state.inquiry.trials).toEqual([expect.objectContaining({ ratio: 1.5, wingspan: 1.2, distance: 4000 })]);
    expect(ui.draw()).toContain('1.50x');
    const blobs = [];
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('Blob', class { constructor(parts) { this.parts = parts; } });
    URL.createObjectURL = blob => { blobs.push(blob); return 'blob:legacy-investigation'; };
    URL.revokeObjectURL = vi.fn();
    try {
      ui.find(node => node.type === 'button' && node.props.children === 'Download trials (CSV)').props.onClick();
      expect(blobs).toHaveLength(1);
      const csv = blobs[0].parts.join('');
      expect(csv).toContain('1,,1.2,0.8,0,V,4000,,,,1.5,Comfortable');
      expect(csv).toContain('The V helps conserve energy.');
    } finally {
      click.mockRestore();
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      vi.unstubAllGlobals();
    }
  });

  it.each([
    ['=1+1', "'=1+1"],
    ['+SUM(A1)', "'+SUM(A1)"],
    ['-SUM(A1)', "'-SUM(A1)"],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['\t=1', "'\t=1"],
    ['\r=1', '"\'\r=1"'],
    ['  =1', "'  =1"]
  ])('protects formula-like inquiry prose in the actual CSV download and preserves signed numeric wind: %j', (hypothesis, expectedCell) => {
    const ui = exploration({ tab: 'inquiry', inquiry: {
      hypothesis, explanation: '=SUM(1,2)\rNext "line"', trials: [{ ...valid, headwind: -5 }]
    } });
    ui.draw();
    const blobs = [];
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('Blob', class { constructor(parts) { this.parts = parts; } });
    URL.createObjectURL = blob => { blobs.push(blob); return 'blob:formula-safe-investigation'; };
    URL.revokeObjectURL = vi.fn();
    try {
      ui.find(node => node.type === 'button' && node.props.children === 'Download trials (CSV)').props.onClick();
      expect(blobs).toHaveLength(1);
      const csv = blobs[0].parts.join('');
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain('Hypothesis,' + expectedCell + '\r\n');
      expect(csv).toContain('Explanation,"\'=SUM(1,2)\rNext ""line"""\r\n');
      expect(csv).toContain(',0.8,-5,V,');
      expect(csv).not.toContain(',0.8,\'-5,V,');
    } finally {
      click.mockRestore();
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      vi.unstubAllGlobals();
    }
  });
});
