// The saved-set round named the target structure and then offered an answer
// list of those same names, so the accessible route was a string match rather
// than retrieval, and the result read the same either way. The prompt is now a
// function clue; the name is available behind a hint, and taking the hint is
// recorded and reported. Also fixes the disabled-button focus defect here, the
// same one already fixed in the headline check and the Stimulation Lab.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const SAVED = ['Allen_body_of_hippocampus_L', 'Allen_amygdaloid_complex_L', 'Allen_lateral_hemisphere_of_cerebellum_L'];
const LABELS = {
  Allen_body_of_hippocampus_L: 'Body of Hippocampus (Left)',
  Allen_amygdaloid_complex_L: 'Amygdaloid Complex (Left)',
  Allen_lateral_hemisphere_of_cerebellum_L: 'Lateral Hemisphere of Cerebellum (Left)',
};

function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}

function session(extra = {}) {
  const tool = loadTool(FILE, 'brainAtlas');
  const store = newStore({
    brainAtlas: {
      view: 'medial',
      atlasDisplayMode: '3d',
      brain3DStructureIndex: SAVED.map((key) => ({ key, label: LABELS[key] })),
      brain3DSavedStructures: SAVED,
      brain3DSavedQuizActive: true,
      brain3DSavedQuizQueue: SAVED,
      brain3DSavedQuizIndex: 0,
      ...extra,
    },
  });
  const announceToSR = vi.fn();
  const nodes = () => flatten(tool.render(makeCtx({ announceToSR }, store)));
  const get = (key, value = 'true') => nodes().find((el) => el.props?.[key] === value);
  const panel = () => get('data-brainatlas-3d-saved-quiz');
  const html = () => { const p = panel(); return p ? ReactDOMServer.renderToStaticMarkup(p) : ''; };
  return { store, nodes, get, panel, html, announceToSR };
}

describe('brainAtlas saved-set round asks for retrieval, not a string match', () => {
  beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('prompts with a clue rather than the answer', () => {
    const s = session();
    const prompt = s.get('data-brainatlas-saved-quiz-prompt', 'clue');
    expect(prompt, 'prompt is not in clue mode').toBeTruthy();
    const text = ReactDOMServer.renderToStaticMarkup(prompt);
    // the answer buttons carry the names; the prompt must not
    const answers = s.nodes().filter((el) => el.props?.['data-brainatlas-saved-answer']);
    expect(answers.length).toBe(SAVED.length);
    const targetLabel = String(answers.find((el) => el.props['data-brainatlas-saved-answer'] === SAVED[0]).props.children);
    expect(text).not.toContain(targetLabel);
    expect(text).not.toMatch(/hippocamp/i);
  });

  it.each([
    ['Allen_body_of_hippocampus_L', /hippocamp/i],
    ['Allen_amygdaloid_complex_L', /amygdal/i],
    ['Allen_anterior_commissure', /anterior commissure/i],
    ['Allen_thalamus_R', /thalam/i],
    ['Allen_hypothalamus_L', /hypothalam/i],
    ['Allen_corpus_callosum', /corpus callosum|callosal/i],
    ['Allen_fornix', /fornix|forniceal/i],
    ['Allen_lateral_hemisphere_of_cerebellum_L', /cerebell/i],
    ['Allen_cerebellar_vermis', /cerebell|vermis|vermian/i],
    ['Allen_precentral_gyrus_L', /precentral|primary motor/i],
    ['Allen_postcentral_gyrus_R', /postcentral|somatosensory/i],
    ['Allen_olfactory_bulb_L', /olfactory bulb/i],
    ['Allen_olfactory_tract_R', /olfactory tract/i],
    ['VH_M_optic_chiasm', /chiasm/i],
    ['Allen_optic_tract_L', /optic tract/i],
    ['Allen_optic_radiation_R', /optic radiation/i],
    ['Allen_cerebral_aqueduct', /aqueduct/i],
    ['Allen_pineal_body', /pineal/i],
  ])('uses an authored, answer-free clue for real model key %s', (key, aliases) => {
    const s = session({ brain3DStructureIndex: [{ key, label: key }], brain3DSavedStructures: [key], brain3DSavedQuizQueue: [key] });
    const prompt = s.get('data-brainatlas-saved-quiz-prompt', 'clue');
    expect(prompt).toBeTruthy();
    const text = ReactDOMServer.renderToStaticMarkup(prompt);
    expect(text).not.toMatch(aliases);
    expect(text).not.toContain('...');
  });

  it('states the practice goal and what taking the hint changes', () => {
    const s = session();
    const goal = s.get('data-brainatlas-saved-quiz-goal');
    expect(goal).toBeTruthy();
    const text = String(goal.props.children);
    expect(text).toMatch(/Practice goal/);
    expect(text).toMatch(/locating practice/);
  });

  it('offers the name behind a hint and records that it was taken', () => {
    const s = session();
    const hint = s.get('data-brainatlas-saved-quiz-hint');
    expect(hint).toBeTruthy();
    expect(hint.props.type).toBe('button');
    hint.props.onClick();
    expect(s.store.toolData.brainAtlas.brain3DSavedQuizHinted).toBe(true);
    expect(s.announceToSR).toHaveBeenCalled();
    // the prompt now shows the name, and the hint button is gone
    expect(s.get('data-brainatlas-saved-quiz-prompt', 'name')).toBeTruthy();
    expect(s.get('data-brainatlas-saved-quiz-hint')).toBeUndefined();
  });

  it('marks an answer given after the hint as hinted, and one without it as not', () => {
    const hinted = session({ brain3DSavedQuizHinted: true });
    hinted.get('data-brainatlas-saved-answer', SAVED[0]).props.onClick();
    expect(hinted.store.toolData.brainAtlas.brain3DSavedQuizResults[0]).toMatchObject({ key: SAVED[0], hinted: true });
    resetStemLab();
    const clean = session();
    clean.get('data-brainatlas-saved-answer', SAVED[0]).props.onClick();
    expect(clean.store.toolData.brainAtlas.brain3DSavedQuizResults[0]).toMatchObject({ key: SAVED[0], hinted: false });
  });

  it('clears the hint when the round moves on', () => {
    const s = session({ brain3DSavedQuizHinted: true });
    s.get('data-brainatlas-saved-answer', SAVED[0]).props.onClick();
    const next = s.nodes().find((el) => el.props?.id === 'brainatlas-3d-saved-quiz-next');
    expect(next).toBeTruthy();
    next.props.onClick();
    expect(s.store.toolData.brainAtlas.brain3DSavedQuizHinted).toBe(false);
    expect(s.store.toolData.brainAtlas.brain3DSavedQuizIndex).toBe(1);
  });

  it('never announces the target name to a screen reader before it is revealed', () => {
    const src = readFileSync(FILE, 'utf8');
    expect(src).not.toContain("announceToSR('Next saved structure: '");
    expect(src).not.toContain("announceToSR('Saved structure quiz started. Find '");
    const s = session();
    const next = () => {
      s.get('data-brainatlas-saved-answer', SAVED[0]).props.onClick();
      s.nodes().find((el) => el.props?.id === 'brainatlas-3d-saved-quiz-next').props.onClick();
    };
    next();
    const spoken = s.announceToSR.mock.calls.map((c) => String(c[0])).join(' | ');
    const answers = s.nodes().filter((el) => el.props?.['data-brainatlas-saved-answer']);
    const secondLabel = String(answers.find((el) => el.props['data-brainatlas-saved-answer'] === SAVED[1]).props.children);
    // the correct-answer announcement names the one just solved, never the next one
    expect(spoken).not.toContain(secondLabel);
  });

  it('locks the answer list with aria-disabled so focus survives a correct answer', () => {
    const s = session();
    s.get('data-brainatlas-saved-answer', SAVED[0]).props.onClick();
    const answers = s.nodes().filter((el) => el.props?.['data-brainatlas-saved-answer']);
    expect(answers.length).toBe(SAVED.length);
    answers.forEach((el) => {
      expect(el.props['aria-disabled']).toBe('true');
      expect(el.props.disabled).toBeUndefined();
    });
  });

  it('a locked answer button cannot overwrite the recorded result', () => {
    const s = session();
    s.get('data-brainatlas-saved-answer', SAVED[0]).props.onClick();
    const before = JSON.stringify(s.store.toolData.brainAtlas.brain3DSavedQuizResults);
    s.get('data-brainatlas-saved-answer', SAVED[1]).props.onClick();
    expect(JSON.stringify(s.store.toolData.brainAtlas.brain3DSavedQuizResults)).toBe(before);
  });

  it('the summary reports hints as a record of the round, not a score', () => {
    const results = SAVED.map((key, i) => ({ key, firstTry: true, hinted: i === 0 }));
    const s = session({ brain3DSavedQuizComplete: true, brain3DSavedQuizResults: results });
    const summary = s.get('data-brainatlas-3d-quiz-summary');
    expect(summary).toBeTruthy();
    const text = ReactDOMServer.renderToStaticMarkup(summary);
    expect(text).toMatch(/1 of these were answered after the name was shown/);
    expect(text).toMatch(/not a score/);
  });

  it('says so plainly when the round was answered from the clue alone', () => {
    const results = SAVED.map((key) => ({ key, firstTry: true, hinted: false }));
    const s = session({ brain3DSavedQuizComplete: true, brain3DSavedQuizResults: results });
    const text = ReactDOMServer.renderToStaticMarkup(s.get('data-brainatlas-3d-quiz-summary'));
    expect(text).toMatch(/Answered from the clue alone/);
    expect(text).toMatch(/not a score/);
  });

  it('falls back to naming when there is no clue, or when two saved items share one', () => {
    const src = readFileSync(FILE, 'utf8');
    expect(src).toMatch(/brain3DSavedQuizNameShown = brain3DSavedQuizHinted \|\| !brain3DSavedQuizClue \|\| brain3DSavedQuizClueShared/);
    // two parts of the same structure map to one atlas region, so they share a
    // clue word for word; asking by clue there would be unanswerable
    const siblings = ['Allen_body_of_hippocampus_L', 'Allen_head_of_hippocampus_L'];
    resetStemLab();
    const tool = loadTool(FILE, 'brainAtlas');
    const store = newStore({
      brainAtlas: {
        view: 'medial',
        atlasDisplayMode: '3d',
        brain3DStructureIndex: siblings.map((key) => ({ key, label: key })),
        brain3DSavedStructures: siblings,
        brain3DSavedQuizActive: true,
        brain3DSavedQuizQueue: siblings,
        brain3DSavedQuizIndex: 0,
      },
    });
    const nodes = flatten(tool.render(makeCtx({ announceToSR: vi.fn() }, store)));
    expect(nodes.find((el) => el.props?.['data-brainatlas-saved-quiz-prompt'] === 'name')).toBeTruthy();
    expect(nodes.find((el) => el.props?.['data-brainatlas-saved-quiz-prompt'] === 'clue')).toBeUndefined();
  });

  it.each([
    ['Allen_anterior_cortical_nucleus_L', 'Allen_amygdaloid_complex_L'],
    ['Allen_body_of_hippocampus_L', 'Allen_head_of_hippocampus_L'],
    ['Allen_thalamus_L', 'Allen_thalamus_R'],
  ])('records the locating fallback honestly for missing or ambiguous clues: %s', (target, distractor) => {
    const saved = [target, distractor];
    // Only the target needs a retry, but both choices remain in the answer list.
    const s = session({ brain3DStructureIndex: saved.map(key => ({ key, label: key })), brain3DSavedStructures: saved, brain3DSavedQuizQueue: [target] });
    expect(s.get('data-brainatlas-saved-quiz-prompt', 'name')).toBeTruthy();
    expect(s.get('data-brainatlas-saved-quiz-hint')).toBeUndefined();
    expect(s.html()).toContain('recorded as name-assisted');
    s.get('data-brainatlas-saved-answer', target).props.onClick();
    expect(s.store.toolData.brainAtlas.brain3DSavedQuizResults).toEqual([{ key: target, firstTry: true, hinted: true }]);
    s.get('id', 'brainatlas-3d-saved-quiz-next').props.onClick();
    const summary = ReactDOMServer.renderToStaticMarkup(s.get('data-brainatlas-3d-quiz-summary'));
    expect(summary).toContain('1 of these were answered after the name was shown');
    expect(summary).not.toContain('Answered from the clue alone');
  });

  it('uses the visible locating fallback in next-item announcements', () => {
    const saved = [SAVED[0], 'Allen_thalamus_L', 'Allen_thalamus_R'];
    const s = session({ brain3DStructureIndex: saved.map(key => ({ key, label: key })), brain3DSavedStructures: saved, brain3DSavedQuizQueue: saved });
    s.get('data-brainatlas-saved-answer', saved[0]).props.onClick();
    s.get('id', 'brainatlas-3d-saved-quiz-next').props.onClick();
    expect(s.get('data-brainatlas-saved-quiz-prompt', 'name')).toBeTruthy();
    expect(s.announceToSR).toHaveBeenLastCalledWith(expect.stringContaining('Locating practice. Find Allen_thalamus_L.'));
  });
});
