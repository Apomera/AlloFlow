// The overview used to report activity in language that sounded like mastery:
// views opened were called "map coverage", and a tile counted the regions in
// the current view, which is not progress at all and is already shown in three
// other places. Progress now separates opening a view from answering a check
// about it, says neither is a grade, and offers one concrete next step: the
// first check answered wrongly, reopened with its answer cleared for a retry.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';

function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}

function session(state = {}) {
  const tool = loadTool(FILE, 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', ...state } });
  const announceToSR = vi.fn();
  const nodes = () => flatten(tool.render(makeCtx({ announceToSR }, store)));
  const get = (key, value = 'true') => nodes().find((el) => el.props?.[key] === value);
  const metric = (which) => get('data-brainatlas-metric', which);
  const text = (which) => ReactDOMServer.renderToStaticMarkup(metric(which));
  return { store, nodes, get, metric, text, announceToSR };
}

describe('brainAtlas keeps its progress states apart', () => {
  beforeAll(() => { resetStemLab(); vi.spyOn(Math, 'random').mockReturnValue(0.4242); });
  afterAll(() => vi.restoreAllMocks());
  beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });

  it('names four distinct tiles', () => {
    const s = session();
    ['visited', 'practised', 'quiz', 'selected'].forEach((which) => {
      expect(s.metric(which), `missing ${which} tile`).toBeTruthy();
    });
  });

  it('no longer calls opened views map coverage or a grade', () => {
    const s = session({ viewsExplored: { lateral: true, medial: true } });
    expect(s.text('visited')).toContain('2 /');
    expect(s.text('visited')).toMatch(/not the same as practised/);
    expect(s.text('visited')).not.toMatch(/coverage/i);
    expect(s.text('quiz')).toMatch(/not a grade/);
  });

  it('the whole file has dropped the map-coverage wording', () => {
    const src = readFileSync(FILE, 'utf8');
    expect(src).not.toContain('% map coverage');
  });

  it('counts answered checks rather than the regions in view', () => {
    const none = session();
    expect(none.text('practised')).toMatch(/0 \/ \d+/);
    resetStemLab();
    const some = session({ plainCheckAnswers: { frontal: 0, temporal: 1, thalamus: 0 } });
    expect(some.text('practised')).toMatch(/3 \/ \d+/);
  });

  it('offers a retry for a missed check and not for a correct one', () => {
    const right = session({ plainCheckAnswers: { frontal: 0 } });
    expect(right.get('data-brainatlas-revisit', 'frontal')).toBeUndefined();
    expect(right.text('practised')).toMatch(/understanding checks/);
    resetStemLab();
    const wrong = session({ plainCheckAnswers: { frontal: 0, temporal: 2 } });
    expect(wrong.get('data-brainatlas-revisit', 'temporal')).toBeTruthy();
    expect(wrong.text('practised')).toMatch(/1 to look at again/);
  });

  it('the retry opens the card on its own view with the answer cleared', () => {
    // thalamus lives on the midline view; the jump has to switch views for it
    const s = session({ view: 'lateral', plainCheckAnswers: { thalamus: 1 } });
    const button = s.get('data-brainatlas-revisit', 'thalamus');
    expect(button).toBeTruthy();
    button.props.onClick();
    expect(s.store.toolData.brainAtlas).toMatchObject({
      view: 'medial',
      selectedRegion: 'thalamus',
      detailMode: 'plain',
      plainCheckRegion: 'thalamus',
      quizMode: false,
      search: '',
    });
    expect(s.store.toolData.brainAtlas.plainCheckAnswers.thalamus).toBeUndefined();
    expect(s.store.toolData.brainAtlas.viewsExplored.medial).toBe(true);
    expect(s.announceToSR).toHaveBeenCalled();
  });

  it('keeps other stored answers when one is retried', () => {
    const s = session({ plainCheckAnswers: { frontal: 0, temporal: 2, thalamus: 1 } });
    s.get('data-brainatlas-revisit', 'temporal').props.onClick();
    expect(s.store.toolData.brainAtlas.plainCheckAnswers).toEqual({ frontal: 0, thalamus: 1 });
  });

  it('never points the retry at a region its destination view does not hold', () => {
    const src = readFileSync(FILE, 'utf8');
    // the target is looked up inside the view named by the lesson itself
    expect(src).toMatch(/function brainAtlasRegionForCheck/);
    expect(src).toMatch(/lesson\.view \|\| 'lateral'/);
    const s = session({ plainCheckAnswers: { amygdala: 2 } });
    const button = s.get('data-brainatlas-revisit', 'amygdala');
    button.props.onClick();
    expect(s.store.toolData.brainAtlas.view).toBe('medial');
  });

  it('the retry button is a real button with a readable name', () => {
    const s = session({ plainCheckAnswers: { temporal: 1 } });
    const button = s.get('data-brainatlas-revisit', 'temporal');
    expect(button.type).toBe('button');
    expect(button.props.type).toBe('button');
    expect(String(button.props.children)).toMatch(/Look again at .+/);
  });
});
