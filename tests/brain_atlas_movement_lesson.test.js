import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadTool, resetStemLab, makeCtx, newStore, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';
function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
function session(extra = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', ...extra } });
  const awardXP = vi.fn(), callGemini = vi.fn();
  const tree = () => tool.render(makeCtx({ awardXP, callGemini }, store));
  const nodes = () => flatten(tree());
  const get = (key, value = 'true') => nodes().find(el => el.props?.[key] === value);
  const action = id => get('data-brainatlas-lesson-action', id).props.onClick();
  return { store, nodes, get, action, awardXP, callGemini, html: () => ReactDOMServer.renderToStaticMarkup(tree()), open: () => get('data-brainatlas-lesson-launch').props.onClick() };
}
function target(id) { const el = document.createElement('section'); el.id = id; el.tabIndex = -1; el.scrollIntoView = vi.fn(); document.body.appendChild(el); return el; }
beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); ['brainatlas-movement-lesson', 'brainatlas-movement-launch', 'brainatlas-canvas-fullscreen'].forEach(id => document.getElementById(id)?.remove()); });
describe('Planning and movement guided lesson', () => {
  it('opens only on request, focuses the lesson, and restores focus when closed', () => {
    const s = session(); const lesson = target('brainatlas-movement-lesson'); const launch = target('brainatlas-movement-launch');
    expect(s.get('data-brainatlas-movement-step', 0)).toBeUndefined();
    s.open(); vi.runOnlyPendingTimers();
    expect(s.get('data-brainatlas-movement-step', 0)).toBeTruthy();
    expect(document.activeElement).toBe(lesson);
    expect(s.get('data-brainatlas-lesson-launch').props['aria-expanded']).toBe('true');
    s.action('pause'); vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(launch);
    expect(s.get('data-brainatlas-movement-step', 0)).toBeUndefined();
    expect(s.store.toolData.brainAtlas.movementLesson.step).toBe(0);
  });
  it('completes a prediction, comparison, retry, reflection, and recap without grades or AI', () => {
    const s = session({ quizScore: 7, plainCheckAnswers: { frontal: 0 } });
    s.open(); s.action('continue'); s.action('predict-0'); s.action('continue');
    expect(s.get('data-brainatlas-movement-step', 2)).toBeTruthy();
    expect(s.html()).toContain('Your prediction');
    expect(s.html()).toContain('Revisit the distinction');
    s.action('continue'); s.action('checkpoint-0');
    expect(s.get('data-brainatlas-lesson-feedback', 'revisit')).toBeTruthy();
    s.action('checkpoint-2'); expect(s.store.toolData.brainAtlas.movementLesson.checkpoint).toBe(0);
    s.action('retry'); s.action('checkpoint-2');
    expect(s.get('data-brainatlas-lesson-feedback', 'fits')).toBeTruthy();
    s.get('id', 'brainatlas-movement-reflection').props.onChange({ target: { value: 'Choosing the order differs from moving.\nBoth use connected systems.' } });
    s.action('continue');
    expect(s.get('data-brainatlas-lesson-result', 'fits')).toBeTruthy();
    expect(s.html()).toContain('Choosing the order differs from moving.');
    expect(s.store.toolData.brainAtlas).toMatchObject({ quizScore: 7, plainCheckAnswers: { frontal: 0 } });
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.callGemini).not.toHaveBeenCalled();
  });
  it('lets learners skip stages and finish without implying a checkpoint was answered', () => {
    const s = session(); s.open(); s.action('step-3'); s.action('continue');
    expect(s.get('data-brainatlas-lesson-result', 'skipped')).toBeTruthy();
    expect(s.store.toolData.brainAtlas.movementLesson).toMatchObject({ prediction: null, checkpoint: null, reflection: '' });
    expect(s.html()).toContain('without answering the checkpoint');
  });
  it('keeps a missed checkpoint distinct from a fitting explanation on completion', () => {
    const s = session(); s.open(); s.action('step-3'); s.action('checkpoint-1'); s.action('continue');
    expect(s.get('data-brainatlas-lesson-result', 'revisit')).toBeTruthy();
    expect(s.html()).toContain('distinction to revisit');
  });
  it('resumes saved progress after closing and after loading into a new session', () => {
    const s = session(); s.open(); s.action('step-1'); s.action('predict-2'); s.action('continue'); s.action('pause');
    const saved = JSON.parse(JSON.stringify(s.store.toolData.brainAtlas));
    resetStemLab(); const resumed = session(saved); resumed.open();
    expect(resumed.get('data-brainatlas-movement-step', 2)).toBeTruthy();
    expect(resumed.store.toolData.brainAtlas.movementLesson.prediction).toBe(2);
    resumed.action('back'); expect(resumed.get('data-brainatlas-lesson-action', 'predict-2').props['aria-pressed']).toBe('true');
  });
  it('highlights either region, clears conflicting atlas state, and returns without resetting the lesson', () => {
    const s = session({ view: 'medial', atlasDisplayMode: '3d', selected3DStructure: 'old', search: 'vision', quizMode: true });
    const diagram = target('brainatlas-canvas-fullscreen'), lesson = target('brainatlas-movement-lesson');
    s.open(); s.action('step-2');
    for (const id of ['motor_cortex', 'frontal']) {
      s.action('inspect-' + id); vi.runOnlyPendingTimers();
      expect(s.store.toolData.brainAtlas).toMatchObject({ view: 'lateral', atlasDisplayMode: 'diagram', selectedRegion: id, selected3DStructure: '', search: '', quizMode: false, detailMode: 'plain' });
      expect(document.activeElement).toBe(diagram);
      s.get('data-brainatlas-nav-target', 'lesson').props.onClick(); vi.runOnlyPendingTimers();
      expect(document.activeElement).toBe(lesson);
      expect(s.get('data-brainatlas-movement-step', 2)).toBeTruthy();
    }
  });
  it('supports checkpoint review without erasing the reflection or prediction', () => {
    const s = session({ movementLesson: { step: 4, prediction: 1, checkpoint: 2, reflection: 'My note' } });
    s.open(); s.action('return-checkpoint'); s.action('retry');
    expect(s.store.toolData.brainAtlas.movementLesson).toEqual({ step: 3, prediction: 1, checkpoint: null, reflection: 'My note' });
  });
  it.each([null, [], { step: 90, prediction: '1', checkpoint: -1, reflection: {} }])('recovers from malformed lesson state: %j', saved => {
    const s = session({ movementLesson: saved }); s.open();
    expect(s.store.toolData.brainAtlas.movementLesson).toEqual({ step: 0, prediction: null, checkpoint: null, reflection: '' });
    expect(s.get('data-brainatlas-movement-step', 0)).toBeTruthy();
  });
  it('bounds optional reflection input and renders it as text', () => {
    const s = session({ movementLesson: { step: 3, reflection: 'x'.repeat(2500) } }); s.open();
    expect(s.get('id', 'brainatlas-movement-reflection').props.value).toHaveLength(2000);
    s.get('id', 'brainatlas-movement-reflection').props.onChange({ target: { value: '<script>example</script>' } });
    s.action('continue'); expect(s.html()).toContain('&lt;script&gt;example&lt;/script&gt;');
  });
});
