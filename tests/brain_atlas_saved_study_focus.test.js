import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const items = [
  { key: 'Allen_body_of_hippocampus_L', label: 'Left hippocampus', family: 'Memory' },
  { key: 'Allen_thalamus_L', label: 'Left thalamus', family: 'Relay' }
];
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
let root;
let host;

beforeEach(() => {
  resetStemLab();
  delete window.__alloBrainAtlas3DStructureIndex;
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(Math, 'random').mockReturnValue(.999);
});

afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function setup(extra = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: {
    view: 'medial', atlasDisplayMode: '3d', brain3DToolsOpen: true, brain3DStudySetOpen: true,
    brain3DStructureIndex: items, brain3DSavedStructures: items.map(item => item.key),
    brain3DSavedQuizQueue: items.map(item => item.key), ...extra
  } });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const render = async () => {
    const nodes = flatten(tool.render(makeCtx({}, store)));
    const find = attribute => nodes.find(node => node.props?.[attribute] === 'true');
    // Real panels/handlers and React reconciliation; omit the unrelated WebGL canvas.
    await React.act(async () => root.render(React.createElement('div', { className: 'brainatlas-canvas-shell' },
      find('data-brainatlas-3d-toolbox'), find('data-brainatlas-3d-study-panel'),
      find('data-brainatlas-3d-saved-quiz'), find('data-brainatlas-3d-quiz-summary'),
      React.createElement('button', { type: 'button', 'data-other-control': 'true' }, 'Another control')
    )));
  };
  const flush = async () => { await React.act(async () => vi.runOnlyPendingTimers()); };
  const click = async (selector, { focus = true, defer = false } = {}) => {
    const button = host.querySelector(selector);
    expect(button).not.toBeNull();
    if (focus) button.focus();
    await React.act(async () => button.click());
    await render();
    if (!defer) await flush();
    return button;
  };
  await render();
  return { store, render, flush, click };
}

function completedRound() {
  return { brain3DStudySetOpen: false, brain3DSavedQuizActive: true, brain3DSavedQuizComplete: true,
    brain3DSavedQuizResults: items.map(item => ({ key: item.key, firstTry: false, hinted: false })) };
}

describe('Brain Atlas saved study keyboard continuity', () => {
  it('moves from Start into the new quiz heading', async () => {
    const s = await setup();
    await s.click('[data-brainatlas-study-start="true"]');
    expect(host.querySelector('[data-brainatlas-3d-study-panel]')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('#brainatlas-3d-saved-quiz-title'));
  });

  it.each(['retry', 'repeat'])('focuses the new heading once when restarting with %s', async kind => {
    const s = await setup(completedRound());
    await s.click('[data-brainatlas-study-start="' + kind + '"]', { defer: true });
    const heading = host.querySelector('#brainatlas-3d-saved-quiz-title');
    const focus = vi.spyOn(heading, 'focus');
    await s.flush();
    expect(focus).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(heading);
  });

  it('moves from the removed Show name button to the revealed prompt', async () => {
    const s = await setup({ brain3DStudySetOpen: false, brain3DSavedQuizActive: true });
    await s.click('[data-brainatlas-saved-quiz-hint]');
    expect(host.querySelector('[data-brainatlas-saved-quiz-hint]')).toBeNull();
    const prompt = host.querySelector('[data-brainatlas-saved-quiz-prompt="name"]');
    expect(document.activeElement).toBe(prompt);
    expect(prompt.textContent).toContain(items[0].label);
  });

  it.each([false, true])('returns to Study set from quiz end (complete=%s)', async complete => {
    const s = await setup({ ...completedRound(), brain3DSavedQuizComplete: complete });
    await s.click('[data-brainatlas-saved-quiz-end]');
    expect(s.store.toolData.brainAtlas.brain3DSavedQuizActive).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('[data-brainatlas-study-toggle]'));
  });

  it('returns from study Close to its toggle', async () => {
    const s = await setup();
    await s.click('[data-brainatlas-study-close]');
    expect(document.activeElement).toBe(host.querySelector('[data-brainatlas-study-toggle]'));
  });

  it('uses the visible toolbox summary when its Study set toggle is collapsed', async () => {
    const s = await setup({ brain3DToolsOpen: false });
    await s.click('[data-brainatlas-study-close]');
    const toolbox = host.querySelector('[data-brainatlas-3d-toolbox]');
    expect(toolbox.open).toBe(false);
    expect(document.activeElement).toBe(toolbox.querySelector('summary'));
  });

  it.each([0, 1])('focuses a remaining saved name after removing item %s', async index => {
    const s = await setup();
    await s.click('[data-brainatlas-remove-saved="' + items[index].key + '"]');
    const remaining = host.querySelector('[data-brainatlas-show-saved]');
    expect(document.activeElement).toBe(remaining);
    expect(remaining.dataset.brainatlasShowSaved).toBe(items[1 - index].key);
  });

  it('focuses the study heading after the last saved item is removed', async () => {
    const s = await setup({ brain3DSavedStructures: [items[0].key] });
    await s.click('[data-brainatlas-remove-saved]');
    expect(host.querySelector('[data-brainatlas-show-saved]')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('#brainatlas-3d-study-title'));
  });

  it('moves off the Clear set button when clearing disables it', async () => {
    const s = await setup();
    await s.click('[data-brainatlas-clear-study-set]');
    expect(host.querySelector('[data-brainatlas-clear-study-set]').disabled).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('#brainatlas-3d-study-title'));
  });

  it('respects focus moved elsewhere while the DOM update completes', async () => {
    const s = await setup();
    await s.click('[data-brainatlas-remove-saved]', { defer: true });
    const other = host.querySelector('[data-other-control]');
    other.focus();
    await s.flush();
    expect(document.activeElement).toBe(other);
  });

  it('does not move focus for an action whose invoking control did not own it', async () => {
    const s = await setup({ brain3DStudySetOpen: false, brain3DSavedQuizActive: true });
    const other = host.querySelector('[data-other-control]');
    other.focus();
    await s.click('[data-brainatlas-saved-quiz-hint]', { focus: false });
    expect(document.activeElement).toBe(other);
  });

  it.each(['shell', 'target'])('does not recover into a disappeared %s', async missing => {
    const s = await setup();
    await s.click('[data-brainatlas-study-close]', { defer: true });
    if (missing === 'shell') host.remove();
    else host.querySelector('[data-brainatlas-study-toggle]').remove();
    await s.flush();
    expect(document.activeElement).toBe(document.body);
  });
});
