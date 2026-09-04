import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadTool, resetStemLab, makeCtx, newStore, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';
const cardWords = {
  frontal: ['lobe', 'network'], prefrontal: ['working_memory', 'network'],
  motor_cortex: ['cortex', 'voluntary', 'signal', 'coordination'], parietal: ['sensory', 'signal', 'network'],
  temporal: ['lobe', 'network'], occipital: ['visual', 'sensory', 'signal'],
  cerebellum: ['coordination', 'network'], brainstem: ['automatic', 'voluntary', 'network']
};
function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
function session(extra = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', selectedRegion: 'frontal', ...extra } });
  const awardXP = vi.fn(), callGemini = vi.fn();
  const tree = () => tool.render(makeCtx({ awardXP, callGemini }, store));
  const nodes = () => flatten(tree());
  const get = (key, value) => nodes().find(el => el.props?.[key] === value);
  const glossary = context => get('data-brainatlas-keywords', context);
  const toggle = (context, open) => glossary(context).props.onToggle({ currentTarget: { open } });
  return { store, get, glossary, toggle, awardXP, callGemini, html: () => ReactDOMServer.renderToStaticMarkup(tree()) };
}
beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());
describe('Brain Atlas contextual key words', () => {
  for (const [region, words] of Object.entries(cardWords)) it('offers a small relevant glossary for ' + region, () => {
    const s = session({ selectedRegion: region }); const g = s.glossary('card-' + region);
    expect(g.type).toBe('details'); expect(g.props.open).toBe(false);
    const children = flatten(g); const terms = children.filter(n => n.props?.['data-brainatlas-word']).map(n => n.props['data-brainatlas-word']);
    expect(terms).toEqual(words); expect(children.filter(n => n.type === 'dt')).toHaveLength(words.length);
    expect(children.filter(n => n.type === 'dd')).toHaveLength(words.length);
    expect(children.find(n => n.type === 'summary')).toBeTruthy();
    s.toggle('card-' + region, true); expect(s.glossary('card-' + region).props.open).toBe(true);
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.callGemini).not.toHaveBeenCalled();
  });
  for (const [step, words] of [
    ['cerebrum', 'lobe', 'cortex'], ['motor', 'signal', 'lobe'], ['cortex', 'voluntary', 'signal'], ['motor', 'cortex', 'network'], ['motor', 'cortex', 'network']
  ].entries()) it('uses stage-specific lesson terms at step ' + step, () => {
    const s = session({ movementLessonOpen: true, movementLesson: { step }, keyWordsOpen: true });
    const g = s.glossary('movement-' + step);
    expect(g.props.open).toBe(true);
    expect(flatten(g).filter(n => n.props?.['data-brainatlas-word']).map(n => n.props['data-brainatlas-word'])).toEqual(words);
  });
  it('retains the reading preference while replacing terms on related-region navigation', () => {
    const s = session(); s.toggle('card-frontal', true);
    s.get('data-brainatlas-plain-next', 'motor_cortex').props.onClick();
    expect(s.glossary('card-frontal')).toBeUndefined();
    const g = s.glossary('card-motor_cortex'); expect(g.props.open).toBe(true);
    expect(ReactDOMServer.renderToStaticMarkup(g)).toContain('Cortex');
    s.toggle('card-motor_cortex', false); expect(s.store.toolData.brainAtlas.keyWordsOpen).toBe(false);
  });
  it('shares the preference across card and lesson without altering learning state', () => {
    const lesson = { step: 3, prediction: 1, checkpoint: 2, reflection: 'My explanation' };
    const s = session({ movementLessonOpen: true, movementLesson: lesson, plainCheckAnswers: { frontal: 0 }, quizScore: 4 });
    s.toggle('movement-3', true); expect(s.glossary('card-frontal').props.open).toBe(true);
    s.toggle('card-frontal', false); expect(s.glossary('movement-3').props.open).toBe(false);
    expect(s.store.toolData.brainAtlas).toMatchObject({ movementLesson: lesson, plainCheckAnswers: { frontal: 0 }, quizScore: 4 });
  });
  it('restores the preference in a new session but rejects truthy nonboolean values', () => {
    const s = session(); s.toggle('card-frontal', true);
    const saved = JSON.parse(JSON.stringify(s.store.toolData.brainAtlas)); resetStemLab();
    expect(session(saved).glossary('card-frontal').props.open).toBe(true); resetStemLab();
    expect(session({ keyWordsOpen: 'true' }).glossary('card-frontal').props.open).toBe(false);
  });
  it('leaves Advanced and unsupported cards unchanged', () => {
    expect(session({ detailMode: 'advanced' }).glossary('card-frontal')).toBeUndefined(); resetStemLab();
    expect(session({ selectedRegion: 'brocas' }).glossary('card-brocas')).toBeUndefined();
  });
});
