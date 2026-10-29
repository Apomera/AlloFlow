import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
function setup(state = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'medial', quizMode: true, quizIdx: 0, ...state } });
  const nodes = () => flatten(tool.render(makeCtx({ announceToSR: vi.fn() }, store)));
  const get = attr => nodes().find(node => node.props?.[attr] === 'true');
  const options = () => nodes().filter(node => node.props?.['data-brainatlas-quiz-option']);
  return { store, nodes, get, options };
}
beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Brain Atlas practice scope and goal', () => {
  it('starts with function practice in the current topic', () => {
    const s = setup();
    expect(s.get('data-brainatlas-quiz-scope').props.value).toBe('topic');
    expect(s.get('data-brainatlas-quiz-goal').props.value).toBe('function');
    expect(s.options()).toHaveLength(4);
    s.options().forEach(option => expect(option.props['data-brainatlas-quiz-answer-view']).toBe('medial'));
  });

  it('rebuilds options and clears prior feedback when the topic or goal changes', () => {
    const s = setup({ view: 'lateral', quizScore: 3 });
    s.options()[0].props.onClick();
    const prior = s.store.toolData.brainAtlas._brainQuizOptsFor;
    s.store.toolData.brainAtlas.view = 'medial';
    s.options().forEach(option => expect(option.props['data-brainatlas-quiz-answer-view']).toBe('medial'));
    expect(s.store.toolData.brainAtlas._brainQuizOptsFor).not.toBe(prior);
    const functionChoices = s.options().map(option => String(option.props.children));
    s.get('data-brainatlas-quiz-goal').props.onChange({ target: { value: 'clinical' } });
    expect(s.store.toolData.brainAtlas).toMatchObject({ quizGoal: 'clinical', quizScore: 0, quizIdx: 0, quizFeedback: null });
    expect(s.options().map(option => String(option.props.children))).not.toEqual(functionChoices);
  });

  it('does not silently turn an empty personal set into mixed review', () => {
    const s = setup({ quizScope: 'studied' });
    expect(s.options()).toHaveLength(0);
    expect(s.get('data-brainatlas-quiz-empty')).toBeTruthy();
    expect(s.get('data-brainatlas-quiz-scope')).toBeTruthy();
  });

  it('uses completed checks and saved model mappings as personal question targets', () => {
    const s = setup({ quizScope: 'studied', plainCheckAnswers: { frontal: 1 }, brain3DSavedStructures: ['Allen_body_of_hippocampus_L'] });
    const targetIds = [];
    for (let i = 0; i < 2; i++) {
      s.store.toolData.brainAtlas.quizIdx = i;
      s.options();
      targetIds.push(s.store.toolData.brainAtlas._brainQuizOptsFor.split(':')[2]);
    }
    expect(targetIds).toEqual(['frontal', 'hippocampus']);
  });

  it('explains a wrong choice using both structures, and retains answer focus semantics', () => {
    const s = setup({ view: 'lateral' });
    const wrong = s.options().find(option => option.props['data-brainatlas-quiz-option'] !== 'frontal');
    wrong.props.onClick();
    const contrast = s.get('data-brainatlas-quiz-contrast');
    expect(contrast.props.children).toContain('Your choice describes');
    expect(contrast.props.children).toContain('Helps you plan what to do and organize actions.');
    s.options().forEach(option => {
      expect(option.props['aria-disabled']).toBe('true');
      expect(option.props.disabled).toBeUndefined();
    });
  });

  it('makes the diagram shortcut focus the actual drawing when available', () => {
    const s = setup({ quizMode: false });
    const drawing = document.createElement('div');
    drawing.id = 'brainatlas-diagram-focus'; drawing.tabIndex = -1; drawing.scrollIntoView = vi.fn();
    document.body.appendChild(drawing);
    try {
      s.get('data-brainatlas-jump-to-diagram').props.onClick();
      expect(document.activeElement).toBe(drawing);
      expect(drawing.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    } finally { drawing.remove(); }
  });

  it('uses reviewed, name-free English descriptions for every eligible function target', () => {
    const s = setup({ quizScope: 'mixed', quizGoal: 'function' });
    const aliases = {
      motor_cortex: ['primary motor cortex'], insular: ['insula', 'insular cortex'],
      brocas: ['broca', "broca's area"], wernickes: ['wernicke', "wernicke's area"],
      soma: ['soma', 'cell body'], axon_hillock: ['hillock', 'axon hillock'],
      myelin: ['myelin'], node_ranvier: ['node of ranvier', 'nodes of ranvier'],
      spike_cycle_decoder_neuron: ['spike', 'action potential'],
      optic_chiasm_visual_path: ['optic chiasm'], optic_chiasm: ['optic chiasm'],
      lgn_visual: ['lgn', 'lateral geniculate nucleus'], v1_visual_path: ['v1', 'primary visual cortex'],
      awake: ['awake', 'wakefulness'], n1_stage: ['n1', 'light sleep'], n2_stage: ['n2', 'core sleep'],
      n3_sws: ['n3', 'deep sleep', 'slow wave sleep', 'sws'], rem_stage: ['rem', 'rapid eye movement'],
      delta_wave: ['delta'], theta_wave: ['theta'], alpha_wave: ['alpha'], beta_wave: ['beta'], gamma_wave: ['gamma'],
      sma: ['sma', 'supplementary motor area'], olfactory: ['olfactory'], pituitary_brain: ['pituitary']
    };
    const normalize = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const seen = new Set();
    for (let index = 0; index < 100; index++) {
      s.store.toolData.brainAtlas.quizIdx = index;
      const options = s.options();
      const id = s.store.toolData.brainAtlas._brainQuizOptsFor.split(':')[2];
      if (seen.has(id)) break;
      seen.add(id);
      const target = s.store.toolData.brainAtlas._brainQuizOpts.find(option => option.id === id);
      const answer = options.find(option => option.props['data-brainatlas-quiz-option'] === id);
      const text = ' ' + normalize(answer.props.children) + ' ';
      for (const alias of [target.name, ...(aliases[id] || [])]) {
        expect(text, id + ' leaked ' + alias).not.toContain(' ' + normalize(alias) + ' ');
      }
      expect(options).toHaveLength(4);
    }
    expect(seen.size).toBe(52);
    expect(seen.has('optic_tract_visual')).toBe(false); // raw fn repeats the target name; not reviewed for this goal
  });

  it.each(['lateral', 'medial', 'superior', 'inferior'])('maps saved inferior anatomy consistently while %s is open', view => {
    // Names verified against the bundled GLB, including its VH_M optic-chiasm mesh.
    const s = setup({ view, quizScope: 'studied', brain3DSavedStructures: ['VH_M_optic_chiasm', 'Allen_paracentral_lobule_rostral_part_L', 'Allen_olfactory_bulb_L'] });
    const targets = [];
    for (let index = 0; index < 3; index++) {
      s.store.toolData.brainAtlas.quizIdx = index;
      s.options();
      targets.push(s.store.toolData.brainAtlas._brainQuizOptsFor.split(':')[2]);
    }
    expect(targets).toEqual(['sma', 'olfactory', 'optic_chiasm']);
  });

  it('keeps unsupported function topics empty while their clinical questions remain available', () => {
    const s = setup({ view: 'strokeTerritories' });
    expect(s.get('data-brainatlas-quiz-empty')).toBeTruthy();
    expect(s.options()).toHaveLength(0);
    s.get('data-brainatlas-quiz-goal').props.onChange({ target: { value: 'clinical' } });
    expect(s.options()).toHaveLength(4);
  });

  it('rebuilds a matching-key cache that has no options and advances a restored string index numerically', () => {
    const s = setup({ view: 'lateral', quizIdx: '0', _brainQuizOptsFor: 'topic:function:frontal:0', _brainQuizOpts: [] });
    expect(s.options()).toHaveLength(4);
    s.options().find(option => option.props['data-brainatlas-quiz-option'] === 'frontal').props.onClick();
    s.nodes().find(node => node.props?.['aria-label'] === 'Next Question').props.onClick();
    expect(s.store.toolData.brainAtlas.quizIdx).toBe(1);
  });
});
