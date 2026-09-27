import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { React, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8');
const modelSandbox = { window: { StemLab: { registerTool() {} } }, console };
vm.runInNewContext(source.replace("window.StemLab.registerTool('bridgeLab', {", `
  window.bridgeModel = { bridgeGoverningAnalysis, bridgeCrossingAnalysis, MATERIALS, BRIDGE_MODEL_VERSION };
  window.StemLab.registerTool('bridgeLab', {`), modelSandbox);
const model = modelSandbox.window.bridgeModel;

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
    trussStyle: 'warren', loadMode: 'vehicle', vehicleLoad: 150, vehiclePos: 0.2, bridgeView: '2d', ...overrides } });
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
  function findRegion(attribute, value = true) {
    return descendants(tree, node => node.props?.[attribute] === value)[0];
  }
  return { render, findButton, findRegion, patch: patch => Object.assign(store.toolData.bridgeLab, patch),
    get state() { return store.toolData.bridgeLab; }, get tree() { return tree; } };
}

describe('Bridge Lab crossing investigation workflow', () => {
  beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_bridgelab.js', 'bridgeLab'); });

  it('defaults vehicle optimization to the whole crossing and offers an explicit current-position scope', () => {
    const lab = workflow({ span: 10, height: 4, vehiclePos: 0, autoDriving: true });
    lab.render();
    const scope = lab.findRegion('id', 'bridge-optimization-scope');
    expect(scope.props.value).toBe('crossing');
    expect(descendants(scope, node => node.type === 'option').map(node => [node.props.value, text(node)]))
      .toEqual([['crossing', 'Whole crossing'], ['position', 'Current position']]);
    expect(text(lab.findRegion('data-bridge-optimizer-scope'))).toContain('Every vehicle position is covered');
    expect(lab.findRegion('aria-label', 'Top bridge designs by cost')).toBeTruthy();
    scope.props.onChange({ target: { value: 'position' } });
    expect(lab.state).toMatchObject({ optScope: 'position', autoDriving: false });
    lab.render();
    expect(lab.findRegion('id', 'bridge-optimization-scope').props.value).toBe('position');
    expect(text(lab.findRegion('data-bridge-optimizer-scope'))).toContain('current vehicle position only');
    expect(text(lab.findRegion('data-bridge-optimizer'))).toContain('Apply a nonzero load');
    expect(lab.findRegion('aria-label', 'Top bridge designs by cost')).toBeUndefined();
  });

  it('applies a whole-crossing winner from a support position and saves matching passing evidence', () => {
    const lab = workflow({ span: 10, height: 4, nBays: 4, vehiclePos: 0, vehicleLoad: 250, optTargetSF: 2 });
    expect(model.bridgeGoverningAnalysis(lab.state).analysis.maxForce).toBe(0);
    lab.render();
    const table = lab.findRegion('aria-label', 'Top bridge designs by cost');
    const firstRow = descendants(descendants(table, node => node.type === 'tbody')[0], node => node.type === 'tr')[0];
    expect(firstRow).toBeTruthy();
    const cells = descendants(firstRow, node => node.type === 'td').map(text);
    lab.findButton('Apply this design to my bridge').props.onClick();
    expect(lab.state.vehiclePos).toBe(0);
    expect(lab.state.autoDriving).toBe(false);
    expect(lab.state.vehicleSweep.version).toBe(model.BRIDGE_MODEL_VERSION);
    expect(lab.state.vehicleSweep.worst.sf).toBeGreaterThanOrEqual(2);
    const mat = model.MATERIALS.find(material => material.id === lab.state.materialId);
    const envelope = model.bridgeCrossingAnalysis(lab.state, mat);
    expect(envelope.worst.sf).toBeCloseTo(lab.state.vehicleSweep.worst.sf, 8);
    expect(cells[3]).toBe((mat.yieldMPa * lab.state.crossSectionMm2 / 1000 / envelope.maxForce).toFixed(2));
    for (const position of envelope.criticalPositions) {
      const gov = model.bridgeGoverningAnalysis({ ...lab.state, vehiclePos: position }, mat);
      expect(gov.governingSF).toBeGreaterThanOrEqual(2);
    }
    lab.render();
    expect(text(lab.findRegion('data-bridge-sweep'))).toContain('Lowest safety factor across the crossing:');
    expect(text(lab.findRegion('data-bridge-sweep'))).not.toContain('The design changed.');
    expect(lab.findRegion('aria-label', 'Crossing results table')).toBeTruthy();
    lab.findButton('Inspect worst position').props.onClick();
    expect(lab.state.inspectedMember).toBe(lab.state.vehicleSweep.worst.member);
  });

  it('shows selected-member force reversals and navigates to both peak-demand positions', () => {
    const lab = workflow({ nBays: 6 });
    lab.render();
    expect(lab.findRegion('data-bridge-member-crossing')).toBeUndefined();
    lab.findButton('Test all positions').props.onClick();
    const reversed = lab.state.vehicleSweep.memberExtremes.find(member => member.tensionKN > 0 && member.compressionKN > 0);
    expect(reversed).toBeTruthy();
    lab.render();
    lab.findRegion('id', 'bridge-member-select').props.onChange({ target: { value: reversed.id } });
    for (const sense of ['tension', 'compression']) {
      lab.render();
      const memberRange = lab.findRegion('data-bridge-member-crossing');
      expect(text(memberRange)).toContain(`Maximum tension: ${reversed.tensionKN.toFixed(2)} kN`);
      expect(text(memberRange)).toContain(`Maximum compression: ${reversed.compressionKN.toFixed(2)} kN`);
      expect(text(memberRange)).toContain('Force reversal:');
      expect(text(memberRange)).toContain(`Lowest member safety factor across the crossing: ${reversed.worstSF.toFixed(2)}`);
      const position = reversed[`${sense}Position`];
      const button = descendants(memberRange, node => node.type === 'button' && text(node) === `Inspect position ${(position * 100).toFixed(1)}%`)[0];
      expect(button).toBeTruthy();
      button.props.onClick();
      expect(lab.state).toMatchObject({ vehiclePos: position, inspectedMember: reversed.id, bridgeView: '2d', autoDriving: false });
      const gov = model.bridgeGoverningAnalysis(lab.state);
      expect(gov.moj.memberForces[reversed.id]).toBeCloseTo(reversed[`${sense}KN`] * (sense === 'compression' ? -1 : 1), 7);
    }
    lab.patch({ crossSectionMm2: 10000 });
    lab.render();
    expect(lab.findRegion('data-bridge-member-crossing')).toBeUndefined();
    expect(text(lab.findRegion('data-bridge-inspector'))).toContain('Run “Test all positions”');
  });

  it('inspects the actual worst member and load position in the labelled 2D view', () => {
    const lab = workflow({ trussStyle: 'howe', nBays: 7, bridgeView: '3d', autoDriving: true });
    lab.render();
    lab.findButton('Test all positions').props.onClick();
    const sweep = lab.state.vehicleSweep;
    expect(sweep.version).toBe(model.BRIDGE_MODEL_VERSION);
    expect(sweep.worst.member).toMatch(/^(BC|TC|ED|ID|V)\d+$/);
    lab.render();
    lab.findButton('Inspect worst position').props.onClick();
    expect(lab.state).toMatchObject({ vehiclePos: sweep.worst.position, inspectedMember: sweep.worst.member,
      bridgeView: '2d', autoDriving: false });
    lab.render();
    const selected = lab.findRegion('id', 'bridge-member-select');
    expect(selected.props.value).toBe(sweep.worst.member);
    const diagramMember = lab.findRegion('data-bridge-member', sweep.worst.member);
    expect(descendants(diagramMember, node => node.type === 'text').map(text)).toContain(sweep.worst.member);
    expect(text(lab.findRegion('data-bridge-sweep'))).not.toContain('The design changed.');
  });

  it('renders a valid no-demand crossing table and no worst-position action', () => {
    const lab = workflow({ vehicleLoad: 0 });
    lab.render();
    lab.findButton('Test all positions').props.onClick();
    expect(lab.state.vehicleSweep.worst).toBeNull();
    expect(lab.state.vehicleSweep.samples.every(sample => sample.sf === null && sample.member === null && sample.mode === 'none')).toBe(true);
    lab.render();
    const sweep = lab.findRegion('data-bridge-sweep');
    expect(text(sweep)).toContain('No member demand across the crossing.');
    expect(text(sweep)).not.toContain('The design changed.');
    expect(descendants(sweep, node => node.type === 'button' && text(node) === 'Inspect worst position')).toHaveLength(0);
    const table = lab.findRegion('aria-label', 'Crossing results table');
    const body = descendants(table, node => node.type === 'tbody')[0];
    expect(descendants(body, node => node.type === 'tr')).toHaveLength(lab.state.vehicleSweep.samples.length);
    expect(text(table)).toContain('No demand');
    lab.findButton('Inspect position 50.0%').props.onClick();
    expect(lab.state.vehiclePos).toBe(0.5);
  });

  it('rejects saved crossing evidence from an older model version', () => {
    const lab = workflow();
    lab.render();
    lab.findButton('Test all positions').props.onClick();
    const sweep = lab.state.vehicleSweep;
    lab.patch({ vehicleSweep: { ...sweep, version: 'bridge-crossing-v1' } });
    lab.render();
    const panel = lab.findRegion('data-bridge-sweep');
    expect(text(panel)).toContain('The design changed. Run the crossing test again');
    expect(descendants(panel, node => node.type === 'button' && text(node) === 'Inspect worst position')).toHaveLength(0);
    expect(lab.findRegion('aria-label', 'Crossing results table')).toBeUndefined();
    expect(lab.findRegion('data-bridge-member-crossing')).toBeUndefined();
    lab.findButton('Test all positions').props.onClick();
    lab.render();
    expect(text(lab.findRegion('data-bridge-sweep'))).not.toContain('The design changed.');
  });

  it('rejects a truncated same-version sweep even when its worst result matches the remaining samples', () => {
    const lab = workflow({ trussStyle: 'pratt', nBays: 7 });
    lab.render();
    lab.findButton('Test all positions').props.onClick();
    const fresh = lab.state.vehicleSweep;
    lab.render();
    expect(lab.findRegion('aria-label', 'Crossing results table')).toBeTruthy();
    const samples = [fresh.samples[0], fresh.samples.find(sample => sample.position === 0.5), fresh.samples.at(-1)];
    expect(samples).toHaveLength(3);
    expect(samples.every(Boolean)).toBe(true);
    const worst = samples.filter(sample => sample.sf != null).reduce((minimum, sample) =>
      !minimum || sample.sf < minimum.sf - 1e-10 ? sample : minimum, null);
    lab.patch({ vehicleSweep: { ...fresh, samples, worst } });
    lab.render();
    expect(text(lab.findRegion('data-bridge-sweep'))).toContain('The design changed. Run the crossing test again');
    expect(lab.findRegion('aria-label', 'Crossing results table')).toBeUndefined();
    expect(lab.findRegion('data-bridge-member-crossing')).toBeUndefined();
    expect(descendants(lab.tree, node => node.type === 'button' && text(node) === 'Inspect worst position')).toHaveLength(0);
  });

  it('rejects a count-preserving restored sweep that omits an actual load-transfer position', () => {
    const lab = workflow({ trussStyle: 'pratt', nBays: 7 });
    lab.render();
    lab.findButton('Test all positions').props.onClick();
    const fresh = lab.state.vehicleSweep;
    const index = fresh.samples.findIndex(sample => Math.abs(sample.position - 1 / 7) < 1e-12);
    expect(index).toBeGreaterThan(0);
    const samples = fresh.samples.map((sample, sampleIndex) => sampleIndex === index
      ? { ...sample, position: sample.position + 0.0001 } : sample);
    expect(samples).toHaveLength(fresh.samples.length);
    expect(samples.every((sample, sampleIndex) => !sampleIndex || sample.position > samples[sampleIndex - 1].position)).toBe(true);
    const worst = samples.filter(sample => sample.sf != null).reduce((minimum, sample) =>
      !minimum || sample.sf < minimum.sf - 1e-10 ? sample : minimum, null);
    lab.patch({ vehicleSweep: { ...fresh, samples, worst } });
    lab.render();
    expect(text(lab.findRegion('data-bridge-sweep'))).toContain('The design changed. Run the crossing test again');
    expect(lab.findRegion('aria-label', 'Crossing results table')).toBeUndefined();
    expect(lab.findRegion('data-bridge-member-crossing')).toBeUndefined();
  });

  it('navigates from a crossing table row to its strength-controlled member', () => {
    const lab = workflow({ span: 10, height: 2, nBays: 8, crossSectionMm2: 30000, vehicleLoad: 500, bridgeView: '3d' });
    lab.render();
    lab.findButton('Test all positions').props.onClick();
    const sample = lab.state.vehicleSweep.samples.find(sample => sample.mode === 'strength');
    expect(sample).toBeTruthy();
    lab.render();
    lab.findButton(`Inspect position ${(sample.position * 100).toFixed(1)}%`).props.onClick();
    expect(lab.state).toMatchObject({ vehiclePos: sample.position, inspectedMember: sample.member, bridgeView: '2d', autoDriving: false });
  });
});
