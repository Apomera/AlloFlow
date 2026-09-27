import { beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const defaults = { tab: 'build', span: 30, height: 6, nBays: 4, loadPerJoint: 50,
  materialId: 'steel', crossSectionMm2: 5000, trussStyle: 'warren', loadMode: 'uniform',
  bridgeView: '2d', lateralBraceEvery: 1, vehicleLoad: 150, vehiclePos: 0.5 };

function nodes(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => nodes(child, predicate));
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  if (node == null || typeof node === 'boolean') return '';
  return typeof node === 'object' ? text(node.props?.children) : String(node);
}
function notebook(overrides = {}) {
  const store = newStore({ bridgeLab: { ...defaults, ...overrides } });
  let tree;
  function render() {
    function Capture() {
      tree = window.StemLab._registry.bridgeLab.render(makeCtx({ toolData: store.toolData }, store));
      return store.toolData.bridgeLab.tab === 'print' ? tree : null;
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(Capture));
    return wrapper;
  }
  function button(label) {
    const found = nodes(tree, node => node.type === 'button' && (text(node) === label || node.props['aria-label'] === label))[0];
    expect(found, `button ${label}`).toBeTruthy();
    return found.props.onClick;
  }
  function field(label) {
    const found = nodes(tree, node => node.type === 'textarea' && node.props['aria-label'] === label)[0];
    expect(found, `field ${label}`).toBeTruthy();
    return found.props;
  }
  return { render, button, field, patch: patch => Object.assign(store.toolData.bridgeLab, patch),
    get state() { return store.toolData.bridgeLab; } };
}

describe('Bridge Lab evidence portfolio', () => {
  beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_bridgelab.js', 'bridgeLab'); });

  it('keeps predictions, observations, and design notes with the saved design and restores each field', () => {
    const lab = notebook({ designName: 'First test', designNotes: 'Watch the diagonals.' });
    lab.render();
    lab.field('Design prediction').onChange({ target: { value: 'A larger area should resist buckling.' } });
    lab.render();
    lab.field('Design observation').onChange({ target: { value: 'Buckling still governs this trial.' } });
    lab.render();
    lab.button('Save current design')();
    expect(lab.state.designTrials[0]).toMatchObject({ prediction: 'A larger area should resist buckling.',
      observation: 'Buckling still governs this trial.', notes: 'Watch the diagonals.' });
    lab.patch({ designPrediction: 'New prediction', designObservation: 'New observation', crossSectionMm2: 12000 });
    lab.render();
    lab.button('Restore First test')();
    expect(lab.state).toMatchObject({ designPrediction: 'A larger area should resist buckling.',
      designObservation: 'Buckling still governs this trial.', crossSectionMm2: 5000 });
    lab.patch({ tab: 'print' });
    const report = lab.render().querySelector('#bridge-print-region');
    expect(report.querySelector('[data-bridge-print-current-evidence]').textContent).toContain('A larger area');
    const saved = report.querySelector('[data-bridge-print-trial]');
    expect(saved.textContent).toContain('Watch the diagonals.');
    expect(saved.textContent).toContain('Buckling still governs this trial.');
  });

  it('retains older notebook records and clears newer learner fields when restoring one', () => {
    const original = { name: 'Earlier design', notes: 'Earlier note', inputs: { ...defaults } };
    const lab = notebook({ designTrials: [original], designPrediction: 'New prediction', designObservation: 'New observation' });
    lab.render();
    lab.button('Restore Earlier design')();
    expect(lab.state.designPrediction).toBe('');
    expect(lab.state.designObservation).toBe('');
    expect(lab.state.designTrials).toEqual([original]);
    lab.patch({ tab: 'print' });
    expect(lab.render().querySelector('[data-bridge-print-trial]').textContent).toContain('Earlier note');
  });

  it('recalculates saved results and permits cost comparison only under matching applied loads', () => {
    const lab = notebook({ tab: 'print', crossSectionMm2: 10000, designTrials: [
      { name: 'Baseline', inputs: { ...defaults }, status: 'safe', governingSF: 99 },
      { name: 'Different load', inputs: { ...defaults, loadPerJoint: 5 } }
    ] });
    const report = lab.render();
    const [baseline, different] = report.querySelectorAll('[data-bridge-print-trial]');
    expect(baseline.textContent).toContain('FAILED; governing SF');
    expect(baseline.textContent).not.toContain('99');
    expect(baseline.textContent).toContain('Same span, layout, and applied load. Current material cost change: +$');
    expect(different.textContent).toContain('Geometry or loading differs.');
    expect(different.textContent).not.toContain('Current material cost change');
  });

  it('saves a compact full-crossing result without copying samples and prints its scope separately', () => {
    const lab = notebook({ loadMode: 'vehicle', vehiclePos: 0.2, designName: 'Crossing design' });
    lab.render();
    lab.button('Test all positions')();
    const sweep = lab.state.vehicleSweep;
    lab.render();
    lab.button('Save current design')();
    const saved = lab.state.designTrials[0].crossing;
    expect(saved).toMatchObject({ version: sweep.version, signature: sweep.signature, sampleCount: sweep.samples.length, worst: sweep.worst });
    expect(saved).not.toHaveProperty('samples');
    lab.patch({ tab: 'print' });
    const report = lab.render();
    expect(report.querySelector('[data-bridge-print-crossing]').textContent).toContain('Lowest safety factor');
    expect(report.querySelector('[data-bridge-print-trial]').textContent).toContain('positions tested.');
    lab.patch({ tab: 'build', crossSectionMm2: 10000 });
    lab.render();
    lab.button('Save current design')();
    expect(lab.state.designTrials[1].crossing).toBeNull();
  });

  it('does not print stale or damaged crossing evidence as valid results', () => {
    const lab = notebook({ loadMode: 'vehicle', designName: 'Tested' });
    lab.render();
    lab.button('Test all positions')();
    lab.render();
    lab.button('Save current design')();
    const saved = lab.state.designTrials[0];
    for (const crossing of [{ ...saved.crossing, version: 'earlier-model' }, { ...saved.crossing, worst: {} },
      { ...saved.crossing, worst: { position: 0, sf: null, mode: 'none', member: null, status: 'safe' } },
      { ...saved.crossing, signature: 'different-design' }]) {
      lab.patch({ tab: 'print', designTrials: [{ ...saved, crossing }] });
      const article = lab.render().querySelector('[data-bridge-print-trial]');
      expect(article.textContent).toContain('No matching crossing test was saved.');
      expect(article.textContent).not.toMatch(/NaN|undefined/);
    }
  });

  it('prints recorded Inquiry evidence with each original prediction and the current explanation', () => {
    const lab = notebook({ tab: 'print', inquiry: { hypothesis: 'My revised hypothesis', observation: 'Pending note',
      explanation: 'My conclusion is supported by the second test.', log: [
        { version: 2, span: 30, area: 5000, mat: 'steel', sf: 0.85, yieldSF: 3.1, bucklingSF: 0.85,
          state: 'failed', trussStyle: 'pratt', nBays: 6, height: 5, braceEvery: 2,
          method: 'Method of joints', loadDescription: '150 kN vehicle at 20.0% of span', totalLoadKN: 150,
          governingCheck: 'Euler buckling', costUsd: 819, massKg: 2100,
          hypothesis: 'My first prediction', observation: 'The first test failed by buckling.' },
        { span: 22, area: 1500, mat: 'steel', sf: 3.5, state: 'safe' }
      ] } });
    const report = lab.render().querySelector('[data-bridge-print-inquiry]');
    expect(report.textContent).toContain('Current hypothesis: My revised hypothesis');
    expect(report.textContent).toContain('Pending observation (not yet logged): Pending note');
    expect(report.textContent).toContain('Learner explanation: My conclusion');
    const [current, legacy] = report.querySelectorAll('[data-bridge-print-observation]');
    expect(current.textContent).toContain('Prediction at recording: My first prediction');
    expect(current.textContent).toContain('150 kN vehicle at 20.0% of span; total 150 kN');
    expect(current.textContent).toContain('Yield 3.10; buckling 0.85');
    expect(legacy.textContent).toContain('Earlier yield-only record');
    expect(legacy.textContent).toContain('Recorded yield factor3.50');
    expect(legacy.textContent).not.toContain('governing factor');
  });

  it('preserves zero demand without converting missing historical evidence into zero', () => {
    const lab = notebook({ tab: 'print', designTrials: [{ name: 'Unloaded', inputs: { ...defaults, loadPerJoint: 0 } }],
      inquiry: { log: [{ version: 2, sf: null, yieldSF: null, bucklingSF: null, state: 'no-demand' }, {}] } });
    const report = lab.render().querySelector('#bridge-print-region');
    expect(report.querySelector('[data-bridge-print-trial]').textContent).toContain('NO MEMBER DEMAND; governing SF No demand');
    const [unloaded, incomplete] = report.querySelectorAll('[data-bridge-print-observation]');
    expect(unloaded.textContent).toContain('Yield No demand; buckling No demand');
    expect(incomplete.textContent).toContain('Recorded yield factorNot recorded');
    expect(report.textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('escapes learner text and renders all observations without truncating the evidence history', () => {
    const notes = '<img src=x onerror="alert(1)">';
    const lab = notebook({ tab: 'print', designNotes: notes, designTrials: [null, { inputs: defaults, notes, prediction: notes }],
      inquiry: { log: [null, ...Array.from({ length: 12 }, (_, index) => ({ span: 20 + index, area: 1500, sf: 2, observation: `Observation ${index}: ${notes}` }))] } });
    const report = lab.render().querySelector('#bridge-print-region');
    expect(report.querySelector('img')).toBeNull();
    expect(report.textContent).toContain(notes);
    expect(report.querySelectorAll('[data-bridge-print-observation]')).toHaveLength(12);
    for (const row of report.querySelectorAll('tr')) {
      expect(row.firstElementChild.tagName).toBe('TH');
      expect(row.firstElementChild.getAttribute('scope')).toBe('row');
    }
  });
});
