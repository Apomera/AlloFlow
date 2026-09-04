import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
let host;
function setup(state = {}, overrides = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', ...state } });
  const nodes = () => flatten(tool.render(makeCtx(overrides, store)));
  const find = predicate => nodes().find(predicate);
  const input = () => find(el => el.props?.id === 'brainatlas-region-search');
  const buttons = () => nodes().filter(el => el.props?.['data-brainatlas-region-button'] === 'true');
  const ids = () => buttons().map(el => el.props.id.replace(`brainatlas-region-${store.toolData.brainAtlas.view}-`, ''));
  const mount = () => {
    const controls = find(el => el.props?.['data-brainatlas-controls'] === 'true');
    const surface = find(el => ['brainatlas-region-directory', 'brainatlas-region-detail'].includes(el.props?.id));
    host.innerHTML = ReactDOMServer.renderToStaticMarkup(controls) + (surface ? ReactDOMServer.renderToStaticMarkup(surface) : '');
    host.querySelectorAll('[id]').forEach(el => { el.scrollIntoView = vi.fn(); });
  };
  const previews = () => { mount(); return [...host.querySelectorAll('[data-brainatlas-region-preview]')]; };
  return { store, find, input, buttons, ids, mount, previews };
}
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers();
  host = document.createElement('div'); document.body.appendChild(host);
});
afterEach(() => {
  host.remove(); document.getElementById('allo-live-brainatlas')?.remove(); vi.useRealTimers();
});

describe('Brain Atlas region discovery', () => {
  it.each([['lateral', 8], ['medial', 6]])('uses the authored big ideas in %s Plain previews', (view, count) => {
    const s = setup({ view });
    const previews = s.previews();
    expect(previews.filter(el => el.dataset.brainatlasRegionPreview === 'idea')).toHaveLength(count);
    if (view === 'lateral') {
      const frontal = host.querySelector('#brainatlas-region-lateral-frontal');
      expect(frontal.textContent).toContain('Helps you plan what to do and organize actions.');
      expect(frontal.textContent).not.toContain('precentral gyrus');
    }
  });

  it('retains full function text in Advanced and bounds unsupported Plain previews', () => {
    const plain = setup(); plain.mount();
    const preview = host.querySelector('#brainatlas-region-lateral-brocas [data-brainatlas-region-preview]');
    expect(preview.dataset.brainatlasRegionPreview).toBe('function');
    expect(preview.textContent.length).toBeLessThanOrEqual(191);
    const plainFunctions = new Map([...host.querySelectorAll('[data-brainatlas-region-preview="function"]')].map(el => [el.closest('button').id, el.textContent]));
    const advanced = setup({ detailMode: 'advanced' }); advanced.mount();
    expect(host.querySelectorAll('[data-brainatlas-region-preview="idea"]')).toHaveLength(0);
    expect(host.querySelector('#brainatlas-region-lateral-cerebellum').textContent).toContain('~80%');
    expect([...host.querySelectorAll('[data-brainatlas-region-preview="function"]')].some(el => plainFunctions.has(el.closest('button').id) && el.textContent.length > plainFunctions.get(el.closest('button').id).length)).toBe(true);
  });

  it('matches reordered example words and shows why the result fits', () => {
    const s = setup({ search: '  TrIP   pack  ' });
    expect(s.ids()).toEqual(['frontal']);
    expect(s.previews()[0].dataset.brainatlasRegionPreview).toBe('example');
    expect(s.previews()[0].textContent).toBe('Example: You decide what to pack before starting a trip.');
  });

  it.each([
    ['wave hand', 'motor_cortex'],
    ['planning FRÓNTAL', 'frontal'],
    ['speech Broca’s', 'brocas'],
    ['primary_motor', 'motor_cortex'],
    ['primary-motor', 'motor_cortex'],
  ])('finds %s through normalized names, identifiers, functions, and examples', (search, id) => {
    expect(setup({ search }).ids()).toContain(id);
  });

  it('requires every word and keeps searches scoped to the current view', () => {
    expect(setup({ search: 'pack unrelatedword' }).ids()).toEqual([]);
    expect(setup({ view: 'medial', search: 'pack trip' }).ids()).toEqual([]);
    expect(setup({ view: 'lateral', search: 'thalamus' }).ids()).not.toContain('thalamus');
  });

  it('treats whitespace as an empty search and keeps anatomical result order', () => {
    const all = setup().ids();
    expect(setup({ search: '  \t \n ' }).ids()).toEqual(all);
    const matches = setup({ search: 'motor' }).ids();
    expect(matches.length).toBeGreaterThan(1);
    expect(matches).toEqual(all.filter(id => matches.includes(id)));
  });

  it('keeps example matches available in Advanced without altering its preview preference', () => {
    const s = setup({ search: 'trip pack', detailMode: 'advanced' });
    expect(s.ids()).toEqual(['frontal']);
    expect(s.previews()[0].dataset.brainatlasRegionPreview).toBe('function');
    expect(s.store.toolData.brainAtlas.detailMode).toBe('advanced');
  });

  it.each(['enter', 'button'])('%s opens the result directory from a selected card without losing the query or answers', action => {
    const s = setup({ selectedRegion: 'frontal', selected3DStructure: 'stale', search: 'pack trip', plainCheckAnswers: { frontal: 0 }, quizScore: 2 });
    s.mount();
    if (action === 'enter') {
      const event = { key: 'Enter', preventDefault: vi.fn() };
      s.input().props.onKeyDown(event); expect(event.preventDefault).toHaveBeenCalled();
    } else s.find(el => el.props?.['data-brainatlas-search-results'] === 'true').props.onClick();
    s.mount(); vi.runOnlyPendingTimers();
    expect(document.activeElement.id).toBe('brainatlas-region-directory');
    expect(s.store.toolData.brainAtlas).toMatchObject({ selectedRegion: null, selected3DStructure: '', search: 'pack trip', plainCheckAnswers: { frontal: 0 }, quizScore: 2 });
    expect(s.ids()).toEqual(['frontal']);
  });

  it('shows empty results from quiz mode and exposes one live count status', () => {
    const s = setup({ quizMode: true, quizIdx: 0, search: 'no-such-region', quizScore: 4 });
    s.find(el => el.props?.['data-brainatlas-search-results'] === 'true').props.onClick();
    s.mount(); vi.runOnlyPendingTimers();
    expect(document.activeElement.id).toBe('brainatlas-region-directory');
    expect(host.querySelector('[data-brainatlas-empty-clear]')).not.toBeNull();
    expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(host.querySelector('[data-brainatlas-search-status]').textContent).toContain('0 of 13 regions in this view');
    expect(s.store.toolData.brainAtlas).toMatchObject({ quizMode: false, quizScore: 4 });
  });

  it.each(['data-brainatlas-clear-search', 'data-brainatlas-empty-clear'])('%s clears the query and restores input focus', marker => {
    const s = setup({ search: 'no-such-region', keyWordsOpen: true }); s.mount();
    s.find(el => el.props?.[marker] === 'true').props.onClick();
    expect(document.activeElement.id).toBe('brainatlas-region-search');
    expect(document.activeElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(s.store.toolData.brainAtlas).toMatchObject({ search: '', keyWordsOpen: true });
    expect(s.ids()).toHaveLength(13);
  });

  it.each([{ isComposing: true }, { nativeEvent: { isComposing: true } }])('does not submit while text composition is active (%j)', composing => {
    const s = setup({ selectedRegion: 'frontal', search: 'pack' });
    const event = { key: 'Enter', preventDefault: vi.fn(), ...composing };
    s.input().props.onKeyDown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(s.store.toolData.brainAtlas.selectedRegion).toBe('frontal');
  });

  it.each(['lateral', 'prenatalDevelopment'])('uses a stable keyboard search target in %s with translated placeholders', view => {
    const s = setup({ view }, { t: (key, fallback) => key.includes('search_') ? 'Rechercher ici' : fallback || key });
    s.mount();
    const input = document.getElementById('brainatlas-region-search');
    expect(input.placeholder).toBe('Rechercher ici');
    const event = { key: '/', target: { tagName: 'DIV' }, preventDefault: vi.fn() };
    s.find(el => el.props?.['data-brainatlas-tool'] === 'true').props.onKeyDown(event);
    expect(document.activeElement).toBe(input);
    expect(event.preventDefault).toHaveBeenCalled();
  });
});
