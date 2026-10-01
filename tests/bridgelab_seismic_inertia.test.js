import { beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

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
  const store = newStore({ bridgeLab: { tab: 'forces', span: 30, height: 6, nBays: 4,
    loadPerJoint: 50, materialId: 'steel', crossSectionMm2: 5000, trussStyle: 'warren', loadMode: 'uniform', ...overrides } });
  const tool = window.StemLab._registry.bridgeLab;
  let tree;
  function render() {
    function Capture() { tree = tool.render(makeCtx({ toolData: store.toolData }, store)); return null; }
    ReactDOMServer.renderToStaticMarkup(React.createElement(Capture));
  }
  return { render, patch: patch => Object.assign(store.toolData.bridgeLab, patch),
    get state() { return store.toolData.bridgeLab; },
    get demo() { return descendants(tree, node => node.props?.['data-bridge-inertia-demo'])[0]; } };
}

describe('Bridge Lab direct inertia teaching example', () => {
  beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_bridgelab.js', 'bridgeLab'); });

  it('converts tonnes and g to SI units before displaying rigid-body inertia force', () => {
    const lab = workflow({ seismicMassTonnes: 100, seismicAssumedAccelG: 0.5 });
    lab.render();
    const output = text(lab.demo);
    expect(output).toContain('Mass in SI units100,000 kg');
    expect(output).toContain('Acceleration in SI units4.903 m/s²');
    expect(output).toContain('Rigid-body inertia force490.33 kN');
    expect(output).toContain('not a prediction of bridge base shear, damage, or safety');
  });

  it('uses direct controls and preserves zero acceleration without a fabricated earthquake prediction', () => {
    const lab = workflow({ seismicMag: 9.5, seismicDist: 5, seismicWeight: 10000 });
    lab.render();
    const inputs = () => descendants(lab.demo, node => node.type === 'input');
    expect(inputs().map(node => node.props['aria-label'])).toEqual(['Assumed mass (tonnes)', 'Assumed acceleration (g)']);
    expect(text(lab.demo)).not.toMatch(/MMI intensity|Modified Mercalli|Lateral force on bridge|Energy release/);
    const initial = text(lab.demo);
    expect(initial).toContain('Rigid-body inertia force117.68 kN');
    lab.patch({ seismicMag: 4, seismicDist: 300, seismicWeight: 200 });
    lab.render();
    expect(text(lab.demo)).toBe(initial);
    inputs().find(node => node.props['aria-label'] === 'Assumed mass (tonnes)').props.onChange({ target: { value: '250' } });
    lab.render();
    inputs().find(node => node.props['aria-label'] === 'Assumed acceleration (g)').props.onChange({ target: { value: '0' } });
    lab.render();
    expect(text(lab.demo)).toContain('Rigid-body inertia force0.00 kN');
    inputs().find(node => node.props['aria-label'] === 'Assumed acceleration (g)').props.onChange({ target: { value: '0.2' } });
    lab.render();
    expect(text(lab.demo)).toContain('Rigid-body inertia force490.33 kN');
  });

  it('bounds damaged restored settings before generating controls or forces', () => {
    const lab = workflow({ seismicMassTonnes: Infinity, seismicAssumedAccelG: {} });
    lab.render();
    expect(text(lab.demo)).toContain('Rigid-body inertia force117.68 kN');
    lab.patch({ seismicMassTonnes: -20, seismicAssumedAccelG: 8 });
    lab.render();
    const inputs = descendants(lab.demo, node => node.type === 'input');
    expect(inputs.map(node => node.props.value)).toEqual([10, 1]);
    expect(text(lab.demo)).toContain('Rigid-body inertia force98.07 kN');
    expect(text(lab.demo)).not.toMatch(/NaN|Infinity/);
  });

  it('opens the earthquake experiment paused and keeps saved evidence and prior fields', () => {
    const lab = workflow({ seismicMag: 6.8, seismicDist: 30, seismicWeight: 500, designNotes: 'Keep my observation', autoDriving: true });
    lab.render();
    const button = descendants(lab.demo, node => node.type === 'button' && text(node) === 'Open earthquake experiment')[0];
    expect(button).toBeTruthy();
    button.props.onClick();
    expect(lab.state).toMatchObject({ tab: 'build', seismicEnabled: true, seismicPlaying: false, autoDriving: false,
      seismicMag: 6.8, seismicDist: 30, seismicWeight: 500, designNotes: 'Keep my observation' });
  });
});
