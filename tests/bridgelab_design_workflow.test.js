import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { React, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const modelSandbox = { window: { StemLab: { registerTool() {} } }, console };
vm.runInNewContext(readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8').replace(
  "window.StemLab.registerTool('bridgeLab', {",
  "window.bridgeAnalysis = bridgeGoverningAnalysis; window.StemLab.registerTool('bridgeLab', {"
), modelSandbox);

function descendants(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => descendants(child, predicate));
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...descendants(node.props?.children, predicate)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  if (node == null || typeof node === 'boolean') return '';
  return typeof node === 'object' ? text(node.props?.children) : String(node);
}
function workflow(overrides = {}) {
  const store = newStore({ bridgeLab: { tab: 'build', span: 30, height: 6, nBays: 4,
    loadPerJoint: 50, materialId: 'steel', crossSectionMm2: 5000,
    trussStyle: 'warren', loadMode: 'uniform', bridgeView: '2d', ...overrides } });
  const tool = window.StemLab._registry.bridgeLab;
  let tree;
  function render() {
    function Capture() { tree = tool.render(makeCtx({ toolData: store.toolData }, store)); return null; }
    ReactDOMServer.renderToStaticMarkup(React.createElement(Capture));
    return tree;
  }
  function findButton(label) {
    const button = descendants(tree, node => node.type === 'button' && (text(node) === label || node.props['aria-label'] === label))[0];
    expect(button, `button ${label}`).toBeTruthy();
    return button;
  }
  return { store, render, findButton, patch: patch => Object.assign(store.toolData.bridgeLab, patch),
    get state() { return store.toolData.bridgeLab; }, get tree() { return tree; } };
}

describe('Bridge Lab design investigation workflow', () => {
  beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_bridgelab.js', 'bridgeLab'); });

  it('saves inputs and notes, compares cost, and restores the full experiment without carrying a stale sweep', () => {
    const lab = workflow({ designName: 'Baseline', designNotes: 'Check the end diagonals.' });
    lab.render();
    lab.findButton('Save current design').props.onClick();
    expect(lab.state.designTrials).toHaveLength(1);
    expect(lab.state.designTrials[0]).toMatchObject({ name: 'Baseline', notes: 'Check the end diagonals.', inputs: { height: 6, materialId: 'steel', crossSectionMm2: 5000 } });
    expect(lab.state.designTrials[0]).not.toHaveProperty('status');
    lab.patch({ height: 8, materialId: 'wood', crossSectionMm2: 10000, designName: 'Revision', designNotes: 'New notes', autoDriving: true, vehicleSweep: {} });
    lab.render();
    const notebook = descendants(lab.tree, node => node.props?.['data-bridge-notebook'])[0];
    expect(text(notebook)).toContain('Same span and applied load.');
    expect(text(notebook)).toContain('Current material cost change: −$');
    lab.findButton('Restore Baseline').props.onClick();
    expect(lab.state).toMatchObject({ height: 6, materialId: 'steel', crossSectionMm2: 5000,
      designName: 'Baseline', designNotes: 'Check the end diagonals.', autoDriving: false, vehicleSweep: null });
    expect(lab.state.designTrials).toHaveLength(1);
    lab.patch({ loadPerJoint: 100 });
    lab.render();
    expect(text(descendants(lab.tree, node => node.props?.['data-bridge-notebook'])[0])).toContain('Geometry or loading differs.');
  });

  it('limits the notebook to four trials and enables saving again after removal', () => {
    const lab = workflow();
    for (let i = 0; i < 4; i++) {
      lab.patch({ designName: `Design ${i + 1}` });
      lab.render();
      lab.findButton('Save current design').props.onClick();
    }
    lab.render();
    const save = lab.findButton('Save current design');
    expect(save.props.disabled).toBe(true);
    save.props.onClick();
    expect(lab.state.designTrials).toHaveLength(4);
    lab.findButton('Remove Design 2').props.onClick();
    lab.render();
    expect(lab.findButton('Save current design').props.disabled).toBe(false);
    expect(lab.state.designTrials.map(trial => trial.name)).toEqual(['Design 1', 'Design 3', 'Design 4']);
  });

  it('sweeps every load-transfer point, inspects the weakest position, and invalidates changed designs', () => {
    const lab = workflow({ trussStyle: 'pratt', nBays: 7, loadMode: 'vehicle', vehicleLoad: 150, vehiclePos: 0.2 });
    lab.render();
    lab.findButton('Test all positions').props.onClick();
    const sweep = lab.state.vehicleSweep;
    expect(sweep.samples.length).toBeGreaterThanOrEqual(51);
    for (let joint = 0; joint <= 7; joint++) {
      expect(sweep.samples.some(sample => Math.abs(sample.position - joint / 7) < 1e-8)).toBe(true);
    }
    expect(sweep.samples[0]).toMatchObject({ position: 0, sf: null });
    expect(sweep.samples.at(-1)).toMatchObject({ position: 1, sf: null });
    expect(sweep.worst.sf).toBe(Math.min(...sweep.samples.map(sample => sample.sf ?? Infinity)));
    lab.render();
    lab.findButton('Inspect worst position').props.onClick();
    expect(lab.state.vehiclePos).toBe(sweep.worst.position);
    lab.render();
    expect(text(lab.tree)).not.toContain('The design changed. Run the crossing test again');
    lab.patch({ crossSectionMm2: 10000 });
    lab.render();
    expect(text(lab.tree)).toContain('The design changed. Run the crossing test again');
    expect(descendants(lab.tree, node => node.type === 'button' && text(node) === 'Inspect worst position')).toHaveLength(0);
  });

  it('shows the selected solver member at the same geometric location in the diagram', () => {
    const lab = workflow({ trussStyle: 'pratt', inspectedMember: 'ID0' });
    lab.render();
    let select = descendants(lab.tree, node => node.type === 'select' && node.props.id === 'bridge-member-select')[0];
    expect(select.props.value).toBe('ID0');
    const diagramMember = descendants(lab.tree, node => node.props?.['data-bridge-member'] === 'ID0')[0];
    const line = descendants(diagramMember, node => node.type === 'line').at(-1);
    // Pratt ID0 goes from T0 (left/high) to B2 (right/low), in screen coordinates.
    expect(line.props.x1).toBeLessThan(line.props.x2);
    expect(line.props.y1).toBeLessThan(line.props.y2);
    expect(text(diagramMember)).toContain('ID0: Tension');
    select.props.onChange({ target: { value: 'ED0' } });
    expect(lab.state).toMatchObject({ inspectedMember: 'ED0', bridgeView: '2d', autoDriving: false });
    lab.render();
    select = descendants(lab.tree, node => node.type === 'select' && node.props.id === 'bridge-member-select')[0];
    expect(select.props.value).toBe('ED0');
    expect(text(descendants(lab.tree, node => node.props?.['data-bridge-inspector'])[0])).toContain('ED0 · Compression');
  });

  it('keeps the unloaded inspector selection and diagram label aligned', () => {
    const lab = workflow({ loadPerJoint: 0 });
    lab.render();
    const select = descendants(lab.tree, node => node.type === 'select' && node.props.id === 'bridge-member-select')[0];
    const selectedGroup = descendants(lab.tree, node => node.props?.['data-bridge-member'] === select.props.value)[0];
    expect(descendants(selectedGroup, node => node.type === 'text').map(text)).toContain(select.props.value);
  });

  it('handles damaged restored sweep results as stale evidence', () => {
    const lab = workflow({ loadMode: 'vehicle', vehicleLoad: 150 });
    lab.render();
    lab.findButton('Test all positions').props.onClick();
    const valid = lab.state.vehicleSweep;
    for (const corrupted of [{ ...valid, worst: null }, { ...valid, samples: [null, null] }]) {
      lab.patch({ vehicleSweep: corrupted });
      expect(() => lab.render()).not.toThrow();
      expect(text(lab.tree)).toContain('The design changed. Run the crossing test again');
    }
  });

  it('applies an optimizer winner that meets the actual member demand and fits the area control', () => {
    const lab = workflow({ span: 10, height: 15, nBays: 3, trussStyle: 'warren',
      loadMode: 'vehicle', vehicleLoad: 500, vehiclePos: 0.5, optTargetSF: 2, optScope: 'position' });
    const before = modelSandbox.window.bridgeAnalysis(lab.state);
    expect(before.analysis.maxDiag).toBeGreaterThan(before.analysis.maxChord);
    lab.render();
    const recommendations = descendants(lab.tree, node => node.props?.['aria-label'] === 'Top bridge designs by cost')[0];
    expect(recommendations).toBeTruthy();
    expect(text(recommendations)).not.toMatch(/Stone|Cast Iron|Reinforced Concrete/);
    const winnerRow = descendants(descendants(recommendations, node => node.type === 'tbody')[0], node => node.type === 'tr')[0];
    const quotedYieldSF = text(descendants(winnerRow, node => node.type === 'td')[3]);
    lab.findButton('Apply this design to my bridge').props.onClick();
    expect(['wood', 'steel', 'composite']).toContain(lab.state.materialId);
    expect(lab.state.crossSectionMm2).toBeGreaterThan(20000);
    const applied = modelSandbox.window.bridgeAnalysis(lab.state);
    expect(applied.moj.ok).toBe(true);
    expect(applied.governingSF).toBeGreaterThanOrEqual(lab.state.optTargetSF);
    // Pins the old chord-only optimizer bug even when buckling sets the area.
    expect(quotedYieldSF).toBe(applied.safetyFactor.toFixed(2));
    expect(applied.settings.vehiclePos).toBe(0.5);
    expect(applied.settings.vehicleLoad).toBe(500);
    lab.render();
    const area = descendants(lab.tree, node => node.type === 'input' && node.props['aria-label'] === 'Member cross-section (mm²)')[0];
    expect(area.props.max).toBe(30000);
    expect(area.props.value).toBe(lab.state.crossSectionMm2);
    expect(area.props.value).toBeGreaterThanOrEqual(area.props.min);
    expect(area.props.value).toBeLessThanOrEqual(area.props.max);
  });
});
