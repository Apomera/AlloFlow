import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change, button } from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(freshTool);
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; });

const core = () => window.__WeldLabCore;
const query = selector => node().querySelector(selector);
const radios = label => [...query(`[role="radiogroup"][aria-label="${label}"]`).querySelectorAll('[role="radio"]')];
async function activate(element) {
  expect(element).toBeTruthy();
  element.focus();
  await click(element);
}
function expectFocus(selector) {
  const destination = query(selector);
  expect(destination, selector).toBeTruthy();
  expect(document.activeElement).toBe(destination);
  expect(destination.tabIndex).toBe(-1);
  return destination;
}
function keepOutsideFocus() {
  outside = document.createElement('button');
  document.body.append(outside); outside.focus();
}
const retained = { car2_reflect: 'Keep my learner notes.', weldBadges: { ppeSafety: true } };
function expectRetained(app) {
  expect(app.latest().car2_reflect).toBe(retained.car2_reflect);
  expect(app.latest().weldBadges).toMatchObject(retained.weldBadges);
}
const processLabel = id => ({ mig: 'MIG (GMAW)', tig: 'TIG (GTAW)', stick: 'Stick (SMAW)', fcaw: 'Flux-cored (FCAW)', spot: 'Resistance / Spot' })[id];

describe('WeldLab Process Sleuth practice focus', () => {
  it('focuses Start and Next destinations while preserving the scored answer and log', async () => {
    keepOutsideFocus();
    const app = await mountState({ ...retained, view: 'processSleuth', psIdx: -1, psSeed: 7, psBest: 5 });
    expect(document.activeElement).toBe(outside);
    await activate(button('🕵️ Start — vignette 1 of 10'));
    expectFocus('[data-sleuth-step-heading]');
    const first = app.latest().psIdx;
    expect(app.latest()).toMatchObject({ psShown: [first], psScore: 0, psRounds: 0, psAns: false, proc2_psLocked: false, psBest: 5 });
    const observation = query('[data-sleuth-hotspot]');
    await activate(observation);
    const clues = [...app.latest().proc2_psClues];
    await activate(button('Done marking: choose the process →'));
    expect(document.activeElement).toBe(radios('Pick the right welding process')[0]);
    const correct = core().proc.PS_V[first].correct;
    await activate(query(`[role="radio"][aria-label="${processLabel(correct)}"]`));
    expectFocus('[data-proc2="ps-feedback"]');
    expect(app.latest()).toMatchObject({ psPick: correct, psScore: 1, psRounds: 1, psStreak: 1, psBest: 5, psAns: true });
    expect(app.latest().proc2_psClues).toEqual(clues);
    const log = JSON.parse(JSON.stringify(app.latest().proc2_psLog));
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ v: first, pick: correct, ok: true });
    await activate(button('➡️ Next vignette'));
    expectFocus('[data-sleuth-step-heading]');
    expect(app.latest().psIdx).not.toBe(first);
    expect(app.latest().psShown).toEqual([first, app.latest().psIdx]);
    expect(app.latest()).toMatchObject({ psScore: 1, psRounds: 1, psStreak: 1, psBest: 5, psAns: false, proc2_psClues: [], proc2_psLocked: false });
    expect(app.latest().proc2_psLog).toEqual(log);
    expectRetained(app);
  });

  it('returns focus from a removed evidence chip to its matching observation without grading', async () => {
    const app = await mountState({ ...retained, view: 'processSleuth', psIdx: 0, psShown: [0], psRounds: 2, psScore: 1, psBest: 3, proc2_psClues: [1, 2] });
    const chip = query('[data-sleuth-evidence="2"] button');
    const hotspot = query('[data-sleuth-hotspot="2"]');
    await activate(chip);
    expect(query('[data-sleuth-evidence="2"]')).toBeNull();
    expect(document.activeElement).toBe(hotspot);
    expect(hotspot.getAttribute('aria-pressed')).toBe('false');
    expect(app.latest()).toMatchObject({ proc2_psClues: [1], psRounds: 2, psScore: 1, psBest: 3 });
    expect(app.latest().psAns).not.toBe(true);
    expectRetained(app);
  });

  it('focuses Restart on the intro and resets the run while preserving the best streak', async () => {
    const app = await mountState({ ...retained, view: 'processSleuth', psIdx: 0, psShown: Array.from({ length: 10 }, (_, i) => i), psAns: true, psPick: 'tig', psScore: 10, psRounds: 10, psStreak: 10, psBest: 12, proc2_psLocked: true, proc2_psClues: [1] });
    await activate(button('🔄 Restart'));
    expectFocus('[data-sleuth-step-heading]');
    expect(query('[data-sleuth-scene]')).toBeNull();
    expect(app.latest()).toMatchObject({ psIdx: -1, psShown: [], psRounds: 0, psScore: 0, psStreak: 0, psBest: 12, proc2_psLog: [], proc2_psClues: [], proc2_psLocked: false });
    expectRetained(app);
  });

  it('focuses the retried case even when it is the same case index', async () => {
    const shown = Array.from({ length: 10 }, (_, i) => i);
    const app = await mountState({ ...retained, view: 'processSleuth', psIdx: 0, psShown: shown, psAns: true, psPick: 'mig', psScore: 9, psRounds: 10, psBest: 7, proc2_psLocked: true, proc2_psLog: [{ v: 0, pick: 'mig', ok: false, found: 0, keys: 4, noise: 0 }] });
    await activate(button('Retry the 1 you missed'));
    expectFocus('[data-sleuth-step-heading]');
    expect(app.latest()).toMatchObject({ psIdx: 0, psAns: false, psRounds: 0, psScore: 0, psStreak: 0, psBest: 7, proc2_psLog: [], proc2_psClues: [], proc2_psLocked: false });
    expect(app.latest().psShown).toHaveLength(10);
    expect(app.latest().psShown.at(-1)).toBe(0);
    expectRetained(app);
  });
});

describe('WeldLab Inspection practice focus', () => {
  it('focuses the next weld and reset destination without changing recorded decisions during navigation', async () => {
    const app = await mountState({ ...retained, view: 'inspection', insp_sect: 'bench', insp2_benchIdx: 0 });
    const position = query('#insp10-position');
    position.focus(); await change(position, '6.25');
    expect(document.activeElement).toBe(position);
    await activate(button('📝 Record this reading'));
    const expectedPick = core().insp2Verdict(core().INSP2_BENCH[0]).accept ? 'accept' : 'reject';
    await activate(radios('Your call for this weld')[expectedPick === 'accept' ? 0 : 1]);
    expect(app.latest().insp2_bench.uc1).toEqual({ pick: expectedPick, recs: [6.25] });
    const scored = JSON.parse(JSON.stringify(app.latest().insp2_bench));
    await activate(button('Next weld ➡️'));
    expectFocus('[data-insp-step-heading="bench"]');
    expect(app.latest().insp2_benchIdx).toBe(1);
    expect(app.latest().insp2_bench).toEqual(scored);
    expect(query('#insp10-position').value).toBe('0');
    await activate(button('🔄 Reset bench'));
    expectFocus('[data-insp-step-heading="bench"]');
    expect(app.latest()).toMatchObject({ insp2_benchIdx: 0, insp2_bench: {} });
    expectRetained(app);
  });

  it('focuses the next NDT case and restart destination while retaining quiz answers until reset', async () => {
    const app = await mountState({ ...retained, view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'quiz', insp2_ndtQIdx: 0 });
    await activate(radios('Pick the best NDT method')[1]);
    expect(app.latest().insp2_ndtQuiz).toEqual({ 0: 1 });
    await activate(button('Next case ➡️'));
    expectFocus('[data-insp-step-heading="ndt"]');
    expect(app.latest()).toMatchObject({ insp2_ndtQIdx: 1, insp2_ndtQuiz: { 0: 1 } });
    await activate(radios('Pick the best NDT method')[0]);
    expect(app.latest().insp2_ndtQuiz).toEqual({ 0: 1, 1: 0 });
    expect(node().textContent).toContain('Score 2 / 2');
    await activate(button('🔄 Restart quiz'));
    expectFocus('[data-insp-step-heading="ndt"]');
    expect(app.latest()).toMatchObject({ insp2_ndtQIdx: 0, insp2_ndtQuiz: {} });
    expectRetained(app);
  });
});

describe('WeldLab Qualification practice focus', () => {
  it('focuses run questions, results and review while preserving the first-answer score', async () => {
    const app = await mountState({ ...retained, view: 'qualPrep', qp_view: 'quiz', pipe2_qpmode: 'run', qp_quizidx: 0 });
    const options = () => [...query('[role="radiogroup"][data-arrow-select="false"]').querySelectorAll('[role="radio"]')];
    // Question 1 is 6G: the authored correct answer is B; deliberately miss it.
    await activate(options()[0]);
    expect(app.latest().qp_ans).toEqual({ 0: 0 });
    await activate(button('Next →'));
    expectFocus('[data-qp-step-heading="run"]');
    expect(app.latest()).toMatchObject({ qp_quizidx: 1, qp_ans: { 0: 0 } });
    await activate(button('← Previous'));
    expectFocus('[data-qp-step-heading="run"]');
    expect(app.latest().qp_quizidx).toBe(0);
    expect(options().every(option => option.disabled)).toBe(true);
    await activate(button('📊 See results'));
    expectFocus('[data-qp-step-heading="summary"]');
    expect(app.latest().pipe2_qpmode).toBe('summary');
    await activate(button('🔁 Review the 1 you missed'));
    expectFocus('[data-qp-step-heading="review"]');
    await activate(options()[1]);
    expect(node().textContent).toContain('Got it this time.');
    expect(app.latest().qp_ans).toEqual({ 0: 0 });
    await activate(button('← Back to results'));
    expectFocus('[data-qp-step-heading="summary"]');
    await activate(button('← Back to the quiz'));
    expectFocus('[data-qp-step-heading="run"]');
    expect(app.latest().qp_ans).toEqual({ 0: 0 });
    await activate(button('↺ Reset quiz'));
    expectFocus('[data-qp-step-heading="run"]');
    expect(app.latest()).toMatchObject({ qp_ans: {}, qp_quizidx: 0, pipe2_qpmode: 'run' });
    expect(app.latest().pipe2_revidx ?? 0).toBe(0);
    expectRetained(app);
  });

  it('focuses Previous and Next review questions without rewriting first answers', async () => {
    const firstAnswers = { 0: 0, 1: 0 };
    const app = await mountState({ ...retained, view: 'qualPrep', qp_view: 'quiz', pipe2_qpmode: 'review', pipe2_revidx: 0, qp_ans: firstAnswers });
    await activate(button('Next →'));
    const second = expectFocus('[data-qp-step-heading="review"]').textContent;
    expect(app.latest().pipe2_revidx).toBe(1);
    await activate(button('← Previous'));
    expect(expectFocus('[data-qp-step-heading="review"]').textContent).not.toBe(second);
    expect(app.latest().pipe2_revidx).toBe(0);
    expect(app.latest().qp_ans).toEqual(firstAnswers);
    expectRetained(app);
  });

  it('focuses qualification scenario navigation and reset while preserving submitted test choices', async () => {
    const app = await mountState({ ...retained, view: 'qualPrep', qp_view: 'matrix', pipe2_scnidx: 0, pipe2_qtest: 'plate3G', qp_ans: { 0: 1 } });
    const correct = core().PIPE2_QUAL_SCENARIOS[0].correct;
    await activate(radios('Choose the qualification test')[correct]);
    expect(app.latest().pipe2_scn).toEqual({ 0: correct });
    await activate(button('Next →'));
    expectFocus('[data-qp-step-heading="scenario"]');
    expect(app.latest()).toMatchObject({ pipe2_scnidx: 1, pipe2_scn: { 0: correct }, pipe2_qtest: 'plate3G', qp_ans: { 0: 1 } });
    await activate(button('← Previous'));
    expectFocus('[data-qp-step-heading="scenario"]');
    expect(app.latest().pipe2_scnidx).toBe(0);
    expect(radios('Choose the qualification test').every(option => option.disabled)).toBe(true);
    await activate(button('↺ Reset'));
    expectFocus('[data-qp-step-heading="scenario"]');
    expect(app.latest()).toMatchObject({ pipe2_scnidx: 0, pipe2_scn: {}, pipe2_qtest: 'plate3G', qp_ans: { 0: 1 } });
    expectRetained(app);
  });
});

describe('WeldLab restored practice focus and removable noise tasks', () => {
  it.each([
    ['locked Sleuth', { view: 'processSleuth', psIdx: 0, psShown: [0], proc2_psLocked: true, proc2_psClues: [1] }],
    ['answered Sleuth', { view: 'processSleuth', psIdx: 0, psShown: [0], proc2_psLocked: true, psAns: true, psPick: 'tig', psRounds: 1, psScore: 1 }],
    ['answered bench', { view: 'inspection', insp_sect: 'bench', insp2_bench: { uc1: { pick: 'accept', recs: [6.25] } } }],
    ['answered NDT', { view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'quiz', insp2_ndtQuiz: { 0: 1 } }],
    ['answered qualification quiz', { view: 'qualPrep', qp_view: 'quiz', qp_ans: { 0: 1 } }],
    ['qualification results', { view: 'qualPrep', qp_view: 'quiz', pipe2_qpmode: 'summary', qp_ans: { 0: 0 } }],
    ['qualification review', { view: 'qualPrep', qp_view: 'quiz', pipe2_qpmode: 'review', qp_ans: { 0: 0 } }],
    ['answered qualification scenario', { view: 'qualPrep', qp_view: 'matrix', pipe2_scn: { 0: 1 } }],
  ])('leaves focus outside on an initial restored %s mount', async (_name, state) => {
    keepOutsideFocus();
    const app = await mountState({ ...retained, ...state });
    expect(document.activeElement).toBe(outside);
    for (const [key, value] of Object.entries(state)) expect(app.latest()[key]).toEqual(value);
    expectRetained(app);
  });

  it('focuses the nearest surviving noise task after removing the last and first rows', async () => {
    keepOutsideFocus();
    const rows = [{ db: 100, h: 1 }, { db: 85, h: 6 }, { db: 88, h: 2 }];
    const app = await mountState({ ...retained, view: 'safetyHealth', sh_sect: 'noise', safe2_noise: rows, sh_audit: { hearing: 'yes' }, safe2_hoc: { extractor: 2 } });
    expect(document.activeElement).toBe(outside);
    await activate(query('[data-noise-editor-task="2"] button[aria-label="Remove task 3"]'));
    expect(app.latest().safe2_noise).toEqual(rows.slice(0, 2));
    expect(document.activeElement).toBe(query('[data-noise-editor-task="1"] select'));
    expect(document.activeElement.getAttribute('aria-label')).toBe('Task 2: Typical task');
    await activate(query('[data-noise-editor-task="0"] button[aria-label="Remove task 1"]'));
    expect(app.latest().safe2_noise).toEqual([rows[1]]);
    const remaining = query('[data-noise-editor-task="0"] select');
    expect(document.activeElement).toBe(remaining);
    expect(remaining.getAttribute('aria-label')).toBe('Task 1: Typical task');
    expect(query('button[aria-label^="Remove task"]')).toBeNull();
    const before = JSON.parse(JSON.stringify(app.latest()));
    remaining.focus(); await change(remaining, remaining.value);
    expect(document.activeElement).toBe(remaining);
    expect(app.latest()).toEqual(before);
    expect(app.latest()).toMatchObject({ sh_audit: { hearing: 'yes' }, safe2_hoc: { extractor: 2 } });
    expectRetained(app);
  });
});
