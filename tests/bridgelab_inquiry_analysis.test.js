import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadTool, renderTool, resetStemLab, makeCtx, newStore, React, ReactDOMServer
} from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_bridgelab.js';
const design = {
  tab: 'inquiry', span: 30, height: 6, nBays: 4,
  loadPerJoint: 50, materialId: 'steel', crossSectionMm2: 5000,
  trussStyle: 'warren', loadMode: 'uniform', lateralBraceEvery: 1,
  vehicleLoad: 150, vehiclePos: 0.5
};

function investigation(overrides = {}, inquiry = {}) {
  const store = newStore({ bridgeLab: {
    ...design, ...overrides,
    inquiry: { spanM: 30, areaMm2: 5000, materialId: 'steel', log: [], ...inquiry }
  } });
  const buttons = new Map();
  const trackedReact = { ...React, createElement(type, props, ...children) {
    if (type === 'button') buttons.set(children.filter((child) => typeof child === 'string').join(''), props);
    return React.createElement(type, props, ...children);
  } };
  function render() {
    buttons.clear();
    const ctx = makeCtx({ React: trackedReact }, store);
    return ReactDOMServer.renderToStaticMarkup(React.createElement(() => window.StemLab._registry.bridgeLab.render(ctx)));
  }
  return { store, buttons, render };
}

describe('Bridge Lab inquiry evidence', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, 'bridgeLab');
  });

  it('uses the shared buckling verdict and saves the same result as the print report', () => {
    const trial = investigation();
    const html = trial.render();
    expect(html).toContain('🔴 FAILS');
    expect(html).toContain('Governing check: Euler buckling');
    expect(html).toContain('total applied load 200.0 kN');
    trial.buttons.get('📋 Log observation').onClick();
    const [observation] = trial.store.toolData.bridgeLab.inquiry.log;
    expect(observation.state).toBe('failed');
    expect(observation.yieldSF).toBeGreaterThan(2);
    expect(observation.bucklingSF).toBeLessThan(1);
    expect(observation.sf).toBe(observation.bucklingSF);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderTool('bridgeLab', { bridgeLab: { ...design, tab: 'print' } });
    const rows = new Map(Array.from(wrapper.querySelectorAll('#bridge-print-region tr'), (row) => [row.children[0].textContent, row.children[1].textContent]));
    expect(Number(rows.get('Governing safety factor'))).toBe(observation.sf);
    expect(rows.get('Estimated material cost')).toBe('$' + observation.costUsd.toFixed(0));
  });

  it('records active geometry and vehicle position with notes and keeps all earlier observations', () => {
    const legacy = Array.from({ length: 9 }, (_, i) => ({ span: 20 + i, area: 1500, mat: 'steel', sf: 2.5, state: 'safe' }));
    const trial = investigation({
      trussStyle: 'pratt', nBays: 6, height: 5, loadMode: 'vehicle', vehiclePos: 0.2, lateralBraceEvery: 2
    }, { log: legacy, observation: 'Moving the load left changed the reactions.', hypothesis: 'Shorter spans should reduce demand.' });
    const html = trial.render();
    expect(html).toContain('150 kN vehicle at 20.0% of span');
    expect(html).toContain('Earlier yield-only record');
    const log = trial.buttons.get('📋 Log observation').onClick;
    log();
    log();
    const saved = trial.store.toolData.bridgeLab.inquiry;
    expect(saved.log).toHaveLength(11);
    expect(saved.log.slice(0, 9)).toEqual(legacy);
    expect(saved.log[9]).toMatchObject({
      version: 2, span: 30, area: 5000, trussStyle: 'pratt', height: 5, nBays: 6,
      braceEvery: 2, loadMode: 'vehicle', vehiclePos: 0.2, vehicleLoad: 150, totalLoadKN: 150,
      observation: 'Moving the load left changed the reactions.', hypothesis: 'Shorter spans should reduce demand.'
    });
    expect(saved.log[9].costUsd).toBeGreaterThan(0);
    expect(saved.log[9].method).toBe('Method of joints');
    expect(saved.observation).toBe('');
  });

  it('resets investigation controls while preserving notes, history, and the main design', () => {
    const trial = investigation({}, {
      spanM: 44, areaMm2: 8000, materialId: 'aluminum', hypothesis: 'My hypothesis',
      explanation: 'My explanation', observation: 'My pending observation',
      log: [{ span: 40, area: 6000, mat: 'steel', sf: 1.1, state: 'marginal' }]
    });
    trial.render();
    trial.buttons.get('↺ Reset controls').onClick();
    expect(trial.store.toolData.bridgeLab.span).toBe(30);
    expect(trial.store.toolData.bridgeLab.inquiry).toMatchObject({
      spanM: 18, areaMm2: 1500, materialId: 'steel', hypothesis: 'My hypothesis',
      explanation: 'My explanation', observation: 'My pending observation'
    });
    expect(trial.store.toolData.bridgeLab.inquiry.log).toHaveLength(1);
  });

  it('normalizes restored controls and logs zero demand without nonfinite JSON values', () => {
    const trial = investigation({ loadMode: 'vehicle', vehicleLoad: 0 }, { spanM: 0, areaMm2: 'bad', materialId: 'missing' });
    const html = trial.render();
    expect(html).toContain('NO MEMBER DEMAND');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    expect(wrapper.querySelector('#stem-bridgelab-panel-inquiry').textContent).not.toMatch(/NaN|Infinity/);
    trial.buttons.get('📋 Log observation').onClick();
    const [observation] = trial.store.toolData.bridgeLab.inquiry.log;
    expect(observation).toMatchObject({ span: 10, area: 5000, mat: 'steel', sf: null, yieldSF: null, bucklingSF: null, state: 'no-demand' });
    expect(JSON.parse(JSON.stringify(observation))).toEqual(observation);
  });
});
