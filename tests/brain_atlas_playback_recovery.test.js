import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const flatten = node => !node || typeof node !== 'object' ? [] : (Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)]);
function setup(state = {}, translate = (key, fallback) => fallback) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d', brain3DPathway: 'papez', ...state } });
  const announce = vi.fn();
  const nodes = () => flatten(tool.render(makeCtx({ t: translate, announceToSR: announce }, store)));
  const button = attribute => nodes().find(node => node.props?.[attribute] === 'true');
  return { store, nodes, button, announce };
}

beforeEach(() => {
  resetStemLab();
  vi.useFakeTimers();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  window.__alloBrainAtlas3DDependencies = null;
});
afterEach(() => {
  window.__alloBrainAtlas3DCanvas?._brain3DState?.cleanup?.();
  if (window.__alloBrainAtlas3DPathwayVisibility) document.removeEventListener('visibilitychange', window.__alloBrainAtlas3DPathwayVisibility);
  for (const key of Object.keys(window).filter(key => key.startsWith('__alloBrainAtlas3D'))) delete window[key];
  document.body.replaceChildren();
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
});

function attachPlaybackCanvas(pathway = 'papez') {
  const canvas = document.createElement('canvas');
  canvas._brain3DState = { pathway, revealStructure: vi.fn() };
  document.body.appendChild(canvas);
  window.__alloBrainAtlas3DCanvas = canvas;
  return canvas;
}

describe('Brain Atlas pathway playback', () => {
  it('allows reading time even at fast speed, then finishes once without wrapping', () => {
    const s = setup({ brain3DPathwaySpeed: 900 });
    attachPlaybackCanvas();
    const stepCount = s.nodes().filter(node => node.props?.className === 'brainatlas-3d-pathway-step').length;
    s.button('data-brainatlas-3d-pathway-play').props.onClick();
    vi.advanceTimersByTime(4500);
    expect(s.store.toolData.brainAtlas.brain3DPathwayStep).toBe(0);
    vi.advanceTimersByTime(500000);
    expect(s.store.toolData.brainAtlas.brain3DPathwayStep).toBe(stepCount - 1);
    expect(s.store.toolData.brainAtlas.brain3DPathwayPlaying).toBe(false);
    expect(s.announce).toHaveBeenLastCalledWith('Pathway complete. Review any step, or play again from the beginning.');
    expect(window.__alloBrainAtlas3DPathwayTimer).toBe(null);
    expect(window.__alloBrainAtlas3DPathwayVisibility).toBe(null);
    s.button('data-brainatlas-3d-pathway-play').props.onClick();
    expect(s.store.toolData.brainAtlas.brain3DPathwayStep).toBe(0);
    expect(s.store.toolData.brainAtlas.brain3DPathwayPlaying).toBe(true);
  });

  it('pauses when hidden and does not silently resume or advance on return', () => {
    const s = setup();
    attachPlaybackCanvas();
    s.button('data-brainatlas-3d-pathway-play').props.onClick();
    vi.advanceTimersByTime(120);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(s.store.toolData.brainAtlas.brain3DPathwayPlaying).toBe(false);
    vi.advanceTimersByTime(100000);
    expect(s.store.toolData.brainAtlas.brain3DPathwayStep).toBe(0);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(s.store.toolData.brainAtlas.brain3DPathwayPlaying).toBe(false);
    expect(window.__alloBrainAtlas3DPathwayVisibility).toBe(null);
  });
});

describe('Brain Atlas 3D loading recovery', () => {
  it('retries a failed dependency load on the same canvas without clearing study work', async () => {
    const s = setup({ selected3DStructure: 'Allen_hippocampus_L', brain3DSavedStructures: ['Allen_hippocampus_L'], brain3DSliceAxis: 'coronal', brain3DSlicePosition: 0.3 });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const load = vi.spyOn(window.StemLab, 'loadScriptResilient').mockRejectedValueOnce(new Error('offline')).mockImplementation(() => new Promise(() => {}));
    const stage = document.createElement('div');
    stage.innerHTML = '<canvas></canvas><div class="brainatlas-3d-loading" data-state="loading"><strong></strong><span data-brainatlas-3d-loading-detail></span><button data-brainatlas-3d-retry style="display:none">Retry</button></div>';
    document.body.appendChild(stage);
    const canvas = stage.querySelector('canvas');
    s.button('data-brainatlas-3d-canvas').ref(canvas);
    // Drain the dependency promise chain, without running unrelated fake timers.
    for (let i = 0; i < 15; i++) await Promise.resolve();
    const overlay = stage.querySelector('.brainatlas-3d-loading');
    expect(overlay.getAttribute('data-state')).toBe('error');
    expect(stage.querySelector('[data-brainatlas-3d-retry]').style.display).toBe('');
    const failedState = canvas._brain3DState;
    const before = structuredClone(s.store.toolData.brainAtlas);
    s.button('data-brainatlas-3d-retry').props.onClick();
    expect(load).toHaveBeenCalledTimes(2);
    expect(failedState.alive).toBe(false);
    expect(canvas._brain3DState).not.toBe(failedState);
    expect(overlay.getAttribute('data-state')).toBe('loading');
    expect(stage.querySelector('[data-brainatlas-3d-retry]').style.display).toBe('none');
    expect(s.store.toolData.brainAtlas).toEqual(before);
    s.button('data-brainatlas-3d-retry').props.onClick();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('translates the play/pause and loading recovery controls', () => {
    const s = setup({}, (key, fallback) => key.startsWith('stem.brainatlas.d3_') ? 'Translated: ' + key : fallback);
    expect(s.button('data-brainatlas-3d-pathway-play').props.children).toBe('Translated: stem.brainatlas.d3_play');
    expect(s.button('data-brainatlas-3d-retry').props.children).toBe('Translated: stem.brainatlas.d3_retry_model');
    expect(s.nodes().some(node => node.props?.children === 'Translated: stem.brainatlas.d3_loading_title')).toBe(true);
    s.store.toolData.brainAtlas.brain3DPathwayPlaying = true;
    expect(s.button('data-brainatlas-3d-pathway-play').props.children).toBe('Translated: stem.brainatlas.d3_pause');
  });
});
