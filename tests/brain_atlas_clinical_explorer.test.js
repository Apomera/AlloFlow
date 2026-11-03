import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const cases = [
  ['memory', 'papez', 0, 'medial', 'Allen_body_of_hippocampus_L'],
  ['visual-field', 'visual', 2, 'medial', 'Allen_optic_radiation_L'],
  ['nonfluent-language', 'language', 0, 'lateral', 'Allen_inferior_frontal_gyrus_opercular_part_L'],
  ['auditory-language', 'language', 2, 'lateral', 'Allen_superior_temporal_gyrus_L'],
  ['coordination', 'motor', 4, 'lateral', 'Allen_lateral_hemisphere_of_cerebellum_L']
];
const toggle = '[data-brainatlas-clinical-toggle]';
const close = '[data-brainatlas-clinical-close]';
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
let host, root;

beforeEach(() => {
  resetStemLab();
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  delete window.__alloBrainAtlas3DStructureIndex;
});

afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  host?.remove();
  host = null;
  delete window.__alloBrainAtlas3DCanvas;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function setup(extra = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: {
    view: 'lateral', atlasDisplayMode: '3d', brain3DToolsOpen: true, brain3DClinicalActive: true,
    brain3DStructureIndex: cases.map(([, , , , key]) => ({ key, label: key, hemisphere: 'left' })),
    ...extra
  } });
  const model = { setPreset: vi.fn(), revealStructure: vi.fn() };
  window.__alloBrainAtlas3DCanvas = { _brain3DState: model };
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const render = async () => {
    const nodes = flatten(tool.render(makeCtx({}, store)));
    const find = attribute => nodes.find(node => node.props?.[attribute] === 'true');
    await React.act(async () => root.render(React.createElement('div', { className: 'brainatlas-canvas-shell' },
      find('data-brainatlas-3d-toolbox'), find('data-brainatlas-3d-clinical-panel'),
      React.createElement('button', { 'data-other-control': 'true', type: 'button' }, 'Another control')
    )));
  };
  const flush = async () => { await React.act(async () => vi.runOnlyPendingTimers()); };
  const click = async (selector, { focus = true, defer = false } = {}) => {
    const button = host.querySelector(selector);
    if (focus) button.focus();
    await React.act(async () => button.click());
    await render();
    if (!defer) await flush();
    return button;
  };
  await render();
  return { store, model, render, flush, click };
}

describe('Clinical lesion explorer', () => {
  it('exposes the displayed fallback case as the single selected button in a named group', async () => {
    await setup({ brain3DClinicalScenario: 'retired-case-id' });
    const group = host.querySelector('.brainatlas-3d-clinical-scenarios');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBeTruthy();
    expect(group.querySelectorAll('button')).toHaveLength(5);
    const pressed = group.querySelectorAll('button[aria-pressed="true"]');
    expect(pressed).toHaveLength(1);
    expect(pressed[0].dataset.brainatlasClinicalScenario).toBe('memory');
  });

  it('opens the remembered case from a cutaway and restores the full model for its pathway', async () => {
    const s = await setup({ brain3DClinicalActive: false, brain3DClinicalScenario: 'visual-field', brain3DSliceAxis: 'coronal', brain3DSlicePosition: 75 });
    await s.click(toggle);
    expect(s.store.toolData.brainAtlas).toMatchObject({ brain3DClinicalActive: true, brain3DSliceAxis: 'off', brain3DSlicePosition: 75, selected3DStructure: 'Allen_optic_radiation_L', brain3DPathway: 'visual', brain3DPathwayStep: 2 });
    expect(s.model.revealStructure).toHaveBeenCalledWith('Allen_optic_radiation_L', s.store.toolData.brainAtlas.selectedRegion, false, true);
  });

  it('keeps each case, pathway step and selected structure together as the learner switches cases', async () => {
    const s = await setup();
    for (const [id, pathway, step, view, key] of cases) {
      const button = await s.click(`[data-brainatlas-clinical-scenario="${id}"]`);
      expect(document.activeElement).toBe(button);
      expect(button.getAttribute('aria-pressed')).toBe('true');
      expect(host.querySelectorAll('[data-brainatlas-clinical-scenario][aria-pressed="true"]')).toHaveLength(1);
      expect(s.store.toolData.brainAtlas).toMatchObject({ brain3DClinicalScenario: id, brain3DPathway: pathway, brain3DPathwayStep: step, selected3DStructure: key, view });
      expect(s.model.setPreset).toHaveBeenLastCalledWith(view, true);
      expect(s.model.revealStructure.mock.lastCall[0]).toBe(key);
    }
  });

  it('clears the previous case’s selected anatomy when the new case is missing from the model index', async () => {
    const key = 'Allen_body_of_hippocampus_L';
    const s = await setup({ brain3DStructureIndex: [{ key, label: 'Body of hippocampus (left)', hemisphere: 'left' }] });
    await s.click('[data-brainatlas-clinical-scenario="memory"]');
    expect(s.store.toolData.brainAtlas.selected3DStructure).toBe(key);
    expect(s.store.toolData.brainAtlas.selectedRegion).toBeTruthy();
    s.model.revealStructure.mockClear();

    await s.click('[data-brainatlas-clinical-scenario="visual-field"]');
    expect(s.store.toolData.brainAtlas).toMatchObject({ brain3DClinicalScenario: 'visual-field', brain3DPathway: 'visual', brain3DPathwayStep: 2, selected3DStructure: '', selectedRegion: null });
    expect(host.querySelector('.brainatlas-case-show-model')).toBeNull();
    expect(s.model.revealStructure).not.toHaveBeenCalled();
  });

  it.each([true, false])('returns Close to a visible control with toolbox open=%s', async toolsOpen => {
    const s = await setup({ brain3DToolsOpen: toolsOpen });
    await s.click(close);
    expect(host.querySelector('[data-brainatlas-3d-clinical-panel]')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector(toolsOpen ? toggle : '[data-brainatlas-3d-toolbox] > summary'));
    expect(host.querySelector('[data-brainatlas-3d-toolbox]').open).toBe(toolsOpen);
  });

  it('respects a focus choice made while the panel closes', async () => {
    const s = await setup();
    await s.click(close, { defer: true });
    const other = host.querySelector('[data-other-control]');
    other.focus();
    await s.flush();
    expect(document.activeElement).toBe(other);
  });
});
