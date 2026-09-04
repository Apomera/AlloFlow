import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadTool, resetStemLab, makeCtx, newStore, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';
const ids = ['corpus_callosum', 'thalamus', 'hypothalamus', 'hippocampus', 'amygdala', 'ventricles'];
const sources = ['NBK448209', 'NBK542184', 'NBK525993', 'NBK482171', 'rdoc/units/circuits/150934', 'NBK470578'];
function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
function session(region = 'thalamus', extra = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'medial', selectedRegion: region, ...extra } });
  const awardXP = vi.fn(), callGemini = vi.fn();
  const tree = () => tool.render(makeCtx({ awardXP, callGemini }, store));
  const nodes = () => flatten(tree());
  const get = (key, value = 'true') => nodes().find(el => el.props?.[key] === value);
  const detail = () => get('id', 'brainatlas-region-detail');
  return { store, nodes, get, awardXP, callGemini, detail, html: () => ReactDOMServer.renderToStaticMarkup(detail()),
    openCheck: () => get('data-brainatlas-check-toggle').props.onClick(), answer: n => get('data-brainatlas-check-choice', n).props.onClick() };
}
beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); document.getElementById('brainatlas-region-detail')?.remove(); });
describe('Brain Atlas deep-structure learning', () => {
  for (const [i, id] of ids.entries()) {
    it('provides a plain card, relevant terms, and source for ' + id, () => {
      const s = session(id);
      expect(s.get('data-brainatlas-authored-plain', id)).toBeTruthy();
      const html = s.html();
      for (const label of ['Big idea', 'Everyday example', 'Connected idea', 'Think it through', 'Key words']) expect(html).toContain(label);
      expect(html).not.toContain('Associated Conditions'); expect(html).not.toContain('If Damaged');
      const card = s.get('data-brainatlas-plain-lesson', id);
      const source = flatten(card).find(el => el.type === 'a');
      expect(source.props.href).toContain(sources[i]); expect(source.props.rel).toBe('noopener noreferrer');
      const next = flatten(card).find(el => el.props?.['data-brainatlas-plain-next']);
      expect(ids).toContain(next.props['data-brainatlas-plain-next']);
      expect(next.props['data-brainatlas-plain-next']).not.toBe(id);
      expect(s.get('data-brainatlas-keywords', 'card-' + id)).toBeTruthy();
      const detailToggle = s.get('data-brainatlas-detail-toggle');
      flatten(detailToggle).find(el => el.type === 'button' && el.props.children === 'Advanced').props.onClick();
      expect(s.get('data-brainatlas-authored-plain', id)).toBeUndefined();
      expect(s.html()).toContain('Associated Conditions');
    });
    it('supports explanatory feedback and retry for ' + id, () => {
      const s = session(id); expect(s.get('data-brainatlas-plain-check', id)).toBeUndefined();
      s.openCheck();
      const check = s.get('data-brainatlas-plain-check', id);
      expect(flatten(check).filter(el => el.props?.['data-brainatlas-check-choice'] !== undefined)).toHaveLength(3);
      s.answer(1); expect(s.get('data-correct', 'false')).toBeTruthy();
      const firstFeedback = ReactDOMServer.renderToStaticMarkup(s.nodes().find(el => el.props?.className === 'brainatlas-plain-check-feedback'));
      s.get('data-brainatlas-check-reset').props.onClick(); s.answer(2);
      expect(ReactDOMServer.renderToStaticMarkup(s.nodes().find(el => el.props?.className === 'brainatlas-plain-check-feedback'))).not.toBe(firstFeedback);
      s.answer(0); expect(s.store.toolData.brainAtlas.plainCheckAnswers[id]).toBe(2);
      s.get('data-brainatlas-check-reset').props.onClick(); s.answer(0);
      expect(s.get('data-correct', 'true')).toBeTruthy();
      expect(s.awardXP).not.toHaveBeenCalled(); expect(s.callGemini).not.toHaveBeenCalled();
    });
  }
  it('keeps related navigation within medial view, focuses detail, and replaces the explanation', () => {
    const s = session('thalamus', { search: 'sound', selected3DStructure: 'old', keyWordsOpen: true });
    const oldKey = s.nodes().find(el => el.props?.className === 'brainatlas-plain-explanation').key;
    s.get('data-brainatlas-plain-next', 'hypothalamus').props.onClick();
    expect(s.store.toolData.brainAtlas).toMatchObject({ view: 'medial', selectedRegion: 'hypothalamus', search: '', selected3DStructure: '' });
    const target = document.createElement('div'); target.id = 'brainatlas-region-detail'; target.tabIndex = -1; target.scrollIntoView = vi.fn(); document.body.appendChild(target);
    vi.runOnlyPendingTimers(); expect(document.activeElement).toBe(target);
    expect(s.nodes().find(el => el.props?.className === 'brainatlas-plain-explanation').key).not.toBe(oldKey);
    expect(s.get('data-brainatlas-keywords', 'card-hypothalamus').props.open).toBe(true);
  });
  it('restores deep answers while preserving lateral and guided-lesson work', () => {
    const saved = { frontal: 0, hippocampus: 2 };
    const lesson = { step: 2, prediction: 1, reflection: 'Keep this note' };
    const s = session('hippocampus', { plainCheckRegion: 'hippocampus', plainCheckAnswers: saved, movementLesson: lesson });
    expect(s.get('data-correct', 'false')).toBeTruthy();
    s.get('data-brainatlas-check-reset').props.onClick(); s.answer(0);
    expect(s.store.toolData.brainAtlas).toMatchObject({ plainCheckAnswers: { frontal: 0, hippocampus: 0 }, movementLesson: lesson });
  });
  it('retains the fallback for unsupported medial regions and does not expose a medial card in lateral view', () => {
    const other = session('cingulate'); expect(other.get('data-brainatlas-authored-plain', 'cingulate')).toBeUndefined();
    expect(other.html()).toContain('Student takeaway'); resetStemLab();
    const wrongView = session('thalamus', { view: 'lateral' });
    expect(wrongView.get('data-brainatlas-plain-lesson', 'thalamus')).toBeUndefined();
  });
  it('distinguishes fluid spaces from nerve tissue and avoids a one-emotion account of the amygdala', () => {
    const v = session('ventricles'); expect(v.html()).toContain('fluid spaces'); expect(v.html()).toContain('not a thinking center');
    resetStemLab(); const a = session('amygdala'); expect(a.html()).toContain('more than fear'); expect(a.html()).toContain('pleasant and unpleasant');
  });
});
