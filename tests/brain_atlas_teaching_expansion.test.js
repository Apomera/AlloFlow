import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const FILE = 'stem_lab/stem_tool_brainatlas.js';
const COVERAGE = [
  {
    "view": "neuron",
    "ids": [
      "dendrite",
      "soma",
      "axon_hillock",
      "myelin",
      "node_ranvier",
      "axon_terminal",
      "spike_cycle_decoder_neuron"
    ]
  },
  {
    "view": "visualPathway",
    "ids": [
      "retina_visual",
      "optic_nerve_visual",
      "optic_chiasm_visual_path",
      "lgn_visual",
      "v1_visual_path"
    ]
  },
  {
    "view": "sleepStages",
    "ids": [
      "awake",
      "n1_stage",
      "n2_stage",
      "n3_sws",
      "rem_stage",
      "sleep_architecture_decoder_sleep"
    ]
  },
  {
    "view": "eegWaves",
    "ids": [
      "delta_wave",
      "theta_wave",
      "alpha_wave",
      "beta_wave",
      "gamma_wave"
    ]
  }
];
function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
function session(extra = {}) {
  const tool = loadTool(FILE, 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', ...extra } });
  const callGemini = vi.fn(), awardXP = vi.fn();
  const tree = () => tool.render(makeCtx({ callGemini, awardXP }, store));
  const nodes = () => flatten(tree());
  const get = (key, value = 'true') => nodes().find(el => el.props?.[key] === value);
  const action = id => get('data-brainatlas-lesson-action', id).props.onClick();
  return { store, get, nodes, action, callGemini, awardXP, html: () => ReactDOMServer.renderToStaticMarkup(tree()) };
}
beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('Brain Atlas expanded plain teaching', () => {
  for (const { view, ids } of COVERAGE) for (const id of ids) {
    it('provides an application check and connected card for ' + id, () => {
      const s = session({ view, selectedRegion: id, plainCheckRegion: id });
      expect(s.get('data-brainatlas-authored-plain', id)).toBeTruthy();
      expect(s.get('data-brainatlas-plain-check', id)).toBeTruthy();
      expect(s.nodes().filter(el => el.props?.['data-brainatlas-check-choice'] !== undefined)).toHaveLength(3);
      expect(ids).toContain(s.get('data-brainatlas-plain-next', s.nodes().find(el => el.props?.['data-brainatlas-plain-next'])?.props['data-brainatlas-plain-next']).props['data-brainatlas-plain-next']);
      const text = ReactDOMServer.renderToStaticMarkup(s.get('id', 'brainatlas-region-detail'));
      expect(text).toContain('Everyday example');
      expect(text).toContain('Connected idea');
      expect(text).not.toContain('Associated Conditions');
    });
  }
  it('changes the example for review and retains bounded attempt history without overwriting other regions', () => {
    const s = session({ view: 'neuron', selectedRegion: 'dendrite', plainCheckRegion: 'dendrite', plainCheckAnswers: { frontal: 0 } });
    const initial = s.get('id', 'brainatlas-plain-check-question').props.children;
    s.get('data-brainatlas-check-choice', 2).props.onClick();
    s.get('data-brainatlas-check-choice', 0).props.onClick();
    expect(s.store.toolData.brainAtlas.plainCheckHistory.dendrite).toHaveLength(1);
    const reset = s.nodes().find(el => el.props?.className === 'brainatlas-plain-check-reset');
    reset.props.onClick();
    expect(s.get('id', 'brainatlas-plain-check-question').props.children).not.toBe(initial);
    expect(s.get('data-brainatlas-check-example', 1)).toBeTruthy();
    s.get('data-brainatlas-check-choice', 0).props.onClick();
    expect(s.store.toolData.brainAtlas.plainCheckHistory.dendrite.map(x => [x.choice, x.variant])).toEqual([[2,0],[0,1]]);
    expect(s.store.toolData.brainAtlas.plainCheckAnswers.frontal).toBe(0);
    const saved = JSON.parse(JSON.stringify(s.store.toolData.brainAtlas));
    resetStemLab();
    const resumed = session(saved);
    expect(resumed.get('data-brainatlas-check-example', 1)).toBeTruthy();
    expect(resumed.get('data-brainatlas-check-choice', 0).props['aria-disabled']).toBe('true');
    expect(s.callGemini).not.toHaveBeenCalled();
  });
  it('revisits a new topic in its own view with a different example', () => {
    const s = session({ view: 'lateral', plainCheckAnswers: { rem_stage: 1 } });
    s.get('data-brainatlas-revisit', 'rem_stage').props.onClick();
    expect(s.store.toolData.brainAtlas).toMatchObject({ view: 'sleepStages', selectedRegion: 'rem_stage', plainCheckVariants: { rem_stage: 1 } });
    expect(s.store.toolData.brainAtlas.plainCheckAnswers.rem_stage).toBeUndefined();
  });
});

describe('Additional guided lessons', () => {
  for (const [id, answer, prediction, view, target] of [
    ['vision', 2, 1, 'visualPathway', 'retina_visual'],
    ['memory', 1, 0, 'medial', 'hippocampus']
  ]) it('completes, revisits, and resumes ' + id + ' independently of the movement lesson', () => {
    const s = session({ movementLesson: { step: 2, prediction: 1, checkpoint: null, reflection: 'Keep my movement note' }, quizScore: 5 });
    s.get('data-brainatlas-lesson-launch').props.onClick();
    s.get('data-brainatlas-guided-choice', id).props.onClick();
    expect(s.get('data-brainatlas-guided-step', 0)).toBeTruthy();
    s.action('continue'); s.action('predict-' + prediction); s.action('continue');
    s.action('inspect-' + target);
    expect(s.store.toolData.brainAtlas).toMatchObject({ view, selectedRegion: target, detailMode: 'plain', atlasDisplayMode: 'diagram' });
    expect(s.get('data-brainatlas-guided-step', 2)).toBeTruthy();
    s.action('continue');
    const firstExample = s.get('id', 'brainatlas-movement-checkpoint').props.children;
    s.action('checkpoint-' + answer);
    s.action('checkpoint-' + ((answer+1)%3));
    expect(s.store.toolData.brainAtlas.guidedLessonAttempts[id]).toHaveLength(1);
    expect(s.get('data-brainatlas-lesson-feedback', 'fits')).toBeTruthy();
    s.get('id', 'brainatlas-movement-reflection').props.onChange({ target: { value: '<example>' } });
    s.action('continue'); expect(s.get('data-brainatlas-lesson-result', 'fits')).toBeTruthy();
    expect(s.html()).toContain('&lt;example&gt;');
    s.action('practice-another');
    expect(s.get('id', 'brainatlas-movement-checkpoint').props.children).not.toBe(firstExample);
    expect(s.store.toolData.brainAtlas.guidedLessons[id].checkpoint).toBeNull();
    s.action('pause');
    const saved = JSON.parse(JSON.stringify(s.store.toolData.brainAtlas));
    resetStemLab(); const resumed = session(saved);
    resumed.get('data-brainatlas-lesson-launch').props.onClick();
    expect(resumed.get('data-brainatlas-guided-step', 3)).toBeTruthy();
    expect(resumed.get('data-brainatlas-guided-example', 1)).toBeTruthy();
    resumed.get('data-brainatlas-guided-choice', 'movement').props.onClick();
    expect(resumed.get('data-brainatlas-movement-step', 2)).toBeTruthy();
    expect(resumed.store.toolData.brainAtlas.movementLesson.reflection).toBe('Keep my movement note');
    expect(resumed.store.toolData.brainAtlas.quizScore).toBe(5);
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.callGemini).not.toHaveBeenCalled();
  });
  it('allows an unanswered checkpoint without claiming success and recovers malformed progress', () => {
    const s = session({ guidedLessonId: 'vision', guidedLessons: { vision: { step: 300, prediction: {}, checkpoint: '2', reflection: [] } } });
    s.get('data-brainatlas-lesson-launch').props.onClick();
    expect(s.store.toolData.brainAtlas.guidedLessons.vision).toEqual({ step: 0, prediction: null, checkpoint: null, reflection: '' });
    s.action('step-3'); s.action('continue');
    expect(s.get('data-brainatlas-lesson-result', 'skipped')).toBeTruthy();
  });
});
