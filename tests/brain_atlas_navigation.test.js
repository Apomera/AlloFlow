import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
let host;
function setup(state = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', ...state } });
  const announceToSR = vi.fn();
  const nodes = () => flatten(tool.render(makeCtx({ announceToSR }, store)));
  const find = predicate => nodes().find(predicate);
  const region = (id, view = store.toolData.brainAtlas.view) => find(el => el.props?.id === `brainatlas-region-${view}-${id}`);
  const back = () => find(el => el.props?.className?.startsWith('brainatlas-detail-close'));
  // Mount the real rendered reading surface, without mounting canvas runtimes.
  const mount = () => {
    const surface = find(el => el.props?.id === 'brainatlas-region-detail' || el.props?.id === 'brainatlas-region-directory');
    host.innerHTML = surface ? ReactDOMServer.renderToStaticMarkup(surface) : '';
    host.querySelectorAll('[id]').forEach(el => { el.scrollIntoView = vi.fn(); });
    return host.firstElementChild;
  };
  const escape = (target = { tagName: 'BUTTON' }) => {
    const event = { key: 'Escape', target, preventDefault: vi.fn() };
    find(el => el.props?.['data-brainatlas-tool'] === 'true').props.onKeyDown(event);
    return event;
  };
  return { store, find, region, back, mount, escape, announceToSR };
}
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers();
  host = document.createElement('div'); document.body.appendChild(host);
});
afterEach(() => {
  host.remove(); document.getElementById('allo-live-brainatlas')?.remove();
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Brain Atlas reading navigation', () => {
  it('opens a named, focused detail from a filtered directory without disturbing learning state', () => {
    const s = setup({ search: 'planning', selected3DStructure: 'stale', plainCheckAnswers: { frontal: 0 }, keyWordsOpen: true, quizScore: 2 });
    s.mount();
    s.region('frontal').props.onClick();
    const detail = s.mount();
    vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(detail);
    expect(detail.getAttribute('role')).toBe('region');
    expect(document.getElementById(detail.getAttribute('aria-labelledby')).textContent).toBeTruthy();
    expect(detail.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(s.store.toolData.brainAtlas).toMatchObject({ selectedRegion: 'frontal', selected3DStructure: '', search: 'planning', plainCheckAnswers: { frontal: 0 }, keyWordsOpen: true, quizScore: 2 });
    expect(s.announceToSR).toHaveBeenCalledTimes(1);
  });

  it.each(['back', 'escape', 'mobile'])('%s returns to the region button and keeps the filtered list', action => {
    const s = setup({ selectedRegion: 'cerebellum', selected3DStructure: 'cerebellum_l', search: 'coordination', detailMode: 'advanced' });
    s.mount();
    if (action === 'back') s.back().props.onClick();
    if (action === 'escape') expect(s.escape().preventDefault).toHaveBeenCalled();
    if (action === 'mobile') s.find(el => el.props?.['data-brainatlas-nav-target'] === 'regions').props.onClick();
    s.mount(); vi.runOnlyPendingTimers();
    const button = document.getElementById('brainatlas-region-lateral-cerebellum');
    expect(button).not.toBeNull(); expect(document.activeElement).toBe(button);
    expect(button.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
    expect(s.store.toolData.brainAtlas).toMatchObject({ selectedRegion: null, selected3DStructure: '', quizMode: false, search: 'coordination', detailMode: 'advanced' });
    expect(host.querySelectorAll('[data-brainatlas-region-button]')).toHaveLength(1);
  });

  it('returns to the most recently read related region', () => {
    const s = setup({ selectedRegion: 'frontal' });
    s.find(el => el.props?.['data-brainatlas-plain-next']).props.onClick();
    s.mount(); vi.runOnlyPendingTimers();
    expect(s.store.toolData.brainAtlas.selectedRegion).toBe('motor_cortex');
    s.back().props.onClick(); s.mount(); vi.runOnlyPendingTimers();
    expect(document.activeElement.id).toBe('brainatlas-region-lateral-motor_cortex');
  });

  it('focuses the directory when the diagram selection is outside the search results', () => {
    const s = setup({ selectedRegion: 'frontal', search: 'no matching region' });
    s.back().props.onClick(); const directory = s.mount(); vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(directory);
    expect(directory.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(s.store.toolData.brainAtlas.search).toBe('no matching region');
    expect(host.querySelector('[data-brainatlas-empty-clear]')).not.toBeNull();
  });

  it('preserves prenatal timeline selection through the reading round trip', () => {
    const s = setup({ view: 'prenatalDevelopment', prenatalWeek: 4, selected3DStructure: 'stale' });
    s.region('prenatal_cortical_migration').props.onClick(); s.mount(); vi.runOnlyPendingTimers();
    expect(document.activeElement.id).toBe('brainatlas-region-detail');
    expect(s.store.toolData.brainAtlas).toMatchObject({ prenatalWeek: 17, selectedRegion: 'prenatal_cortical_migration', selected3DStructure: '' });
    s.back().props.onClick(); s.mount(); vi.runOnlyPendingTimers();
    expect(document.activeElement.id).toBe('brainatlas-region-prenatalDevelopment-prenatal_cortical_migration');
    expect(s.store.toolData.brainAtlas.prenatalWeek).toBe(17);
  });

  it('closes quiz mode on Escape and reveals the directory without resetting the score', () => {
    const s = setup({ quizMode: true, quizIdx: 0, quizScore: 3, selected3DStructure: 'stale' });
    s.escape(); const directory = s.mount(); vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(directory);
    expect(s.store.toolData.brainAtlas).toMatchObject({ quizMode: false, quizScore: 3, selected3DStructure: '' });
  });

  it.each([{ tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' }, { isContentEditable: true }])('leaves Escape to editable controls (%j)', target => {
    const s = setup({ selectedRegion: 'frontal' });
    expect(s.escape(target).preventDefault).not.toHaveBeenCalled();
    expect(s.store.toolData.brainAtlas.selectedRegion).toBe('frontal');
  });

  it('does not focus or announce an obsolete region-opening request', () => {
    const s = setup();
    s.region('frontal').props.onClick();
    s.store.toolData.brainAtlas.selectedRegion = 'temporal';
    const detail = s.mount(); vi.runOnlyPendingTimers();
    expect(detail.scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(detail);
    expect(s.announceToSR).not.toHaveBeenCalled();
  });

  it('does not pull focus back after a view change', () => {
    const s = setup({ selectedRegion: 'frontal' });
    s.back().props.onClick();
    s.store.toolData.brainAtlas.view = 'medial';
    const directory = s.mount(); vi.runOnlyPendingTimers();
    expect(directory.scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(directory);
    expect(s.announceToSR).not.toHaveBeenCalled();
  });

  it('uses immediate scrolling when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const s = setup({ selectedRegion: 'frontal' });
    s.back().props.onClick(); s.mount(); vi.runOnlyPendingTimers();
    expect(document.activeElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'nearest' });
  });
});
