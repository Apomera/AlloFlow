import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
const reveal = '[data-brainatlas-3d-challenge-reveal]';
const next = '[data-brainatlas-3d-challenge-next]';
const hint = '[data-brainatlas-3d-challenge-hint-action]';
const clue = '[data-brainatlas-3d-challenge-clue]';
let root, host;

beforeEach(() => {
  resetStemLab();
  delete window.__alloBrainAtlas3DStructureIndex;
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
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
    view: 'medial', atlasDisplayMode: '3d', brain3DChallengeActive: true,
    brain3DChallengeRound: 0, brain3DStructureIndex: [], ...extra
  } });
  const announce = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const render = async () => {
    const nodes = flatten(tool.render(makeCtx({ announceToSR: announce }, store)));
    const panel = nodes.find(node => node.props?.['data-brainatlas-3d-challenge'] === 'true');
    // The actual panel and handlers reconcile without loading an unrelated WebGL canvas.
    await React.act(async () => root.render(React.createElement('div', { className: 'brainatlas-canvas-shell' },
      panel, React.createElement('button', { type: 'button', 'data-other-control': 'true' }, 'Another control')
    )));
  };
  const flush = async () => { await React.act(async () => vi.runOnlyPendingTimers()); };
  const click = async (selector, { focus = true, defer = false } = {}) => {
    const button = typeof selector === 'string' ? host.querySelector(selector) : selector;
    expect(button).not.toBeNull();
    if (focus) button.focus();
    await React.act(async () => button.click());
    await render();
    if (!defer) await flush();
    return button;
  };
  await render();
  return { store, announce, render, flush, click };
}

describe('Brain Atlas Find It challenge keyboard continuity', () => {
  it('moves Show answer to Next after the invoking button unmounts', async () => {
    const s = await setup();
    const origin = await s.click(reveal);
    expect(origin.isConnected).toBe(false);
    expect(document.activeElement).toBe(host.querySelector(next));
    expect(s.store.toolData.brainAtlas.brain3DChallengeFeedback.status).toBe('revealed');
  });

  it('moves Next into the new round clue while retaining open answer choices', async () => {
    const s = await setup();
    await s.click(reveal);
    const previousClue = host.querySelector(clue).textContent;
    const choices = host.querySelector('.brainatlas-3d-challenge-access');
    choices.open = true;
    const origin = await s.click(next);
    expect(origin.isConnected).toBe(false);
    expect(document.activeElement).toBe(host.querySelector(clue));
    expect(host.querySelector(clue).tabIndex).toBe(-1);
    expect(host.querySelector(clue).textContent).not.toBe(previousClue);
    expect(host.querySelector(clue).textContent).toContain('amygdala');
    expect(choices.open).toBe(true);
    expect(s.store.toolData.brainAtlas.brain3DChallengeRound).toBe(1);
  });

  it('keeps the first Hint focused, then moves the disabled second Hint to its text', async () => {
    const s = await setup();
    await s.click(hint);
    expect(document.activeElement).toBe(host.querySelector(hint));
    expect(host.querySelector(hint).disabled).toBe(false);
    await s.click(hint);
    expect(host.querySelector(hint).disabled).toBe(true);
    const text = host.querySelector('[data-brainatlas-3d-challenge-hint-text]');
    expect(document.activeElement).toBe(text);
    expect(text.textContent).toContain('Deep structures layer');
    expect(s.store.toolData.brainAtlas.brain3DChallengeHintLevel).toBe(2);
  });

  it('leaves a successful answer choice focused and guarded against another submission', async () => {
    const s = await setup();
    host.querySelector('.brainatlas-3d-challenge-access').open = true;
    const correct = [...host.querySelectorAll('.brainatlas-3d-challenge-options button')].find(button => button.textContent === 'Hippocampus');
    await s.click(correct);
    expect(document.activeElement).toBe(correct);
    expect(correct.disabled).toBe(false);
    expect(correct.getAttribute('aria-disabled')).toBe('true');
    const score = s.store.toolData.brainAtlas.brain3DChallengeScore;
    await s.click(correct);
    expect(s.store.toolData.brainAtlas.brain3DChallengeScore).toBe(score);
    expect(document.activeElement).toBe(correct);
  });

  it.each([
    ['Show answer', reveal, {}],
    ['Next', next, { brain3DChallengeFeedback: { status: 'revealed', picked: 'Hippocampus', points: 0 } }],
    ['second Hint', hint, { brain3DChallengeHintLevel: 1 }]
  ])('respects a later focus choice after %s', async (name, selector, extra) => {
    const s = await setup(extra);
    await s.click(selector, { defer: true });
    const other = host.querySelector('[data-other-control]');
    other.focus();
    await s.flush();
    expect(document.activeElement).toBe(other);
  });

  it('does not move focus when Show answer did not own it', async () => {
    const s = await setup();
    const other = host.querySelector('[data-other-control]');
    other.focus();
    await s.click(reveal, { focus: false });
    expect(document.activeElement).toBe(other);
  });

  it.each(['shell', 'target'])('does not recover focus into a disappeared %s', async missing => {
    const s = await setup();
    await s.click(reveal, { defer: true });
    if (missing === 'shell') host.remove();
    else host.querySelector(next).remove();
    await s.flush();
    expect(document.activeElement).toBe(document.body);
  });
});
