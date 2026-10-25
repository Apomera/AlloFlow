import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  node, freshTool, mountState, unmountState, click, pointer, button,
} from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(freshTool);
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; });

const query = selector => node().querySelector(selector);
const text = element => element.textContent.replace(/\s+/g, ' ').trim();
const scopedButton = (scope, label) => [...scope.querySelectorAll('button')]
  .find(element => text(element) === label);
const fitRadios = question => [...query(`[role="radiogroup"][aria-labelledby="story-fit-${question}"]`)
  .querySelectorAll('[role="radio"]')];
const core = () => window.__WeldLabCore;
const retained = {
  car2_reflect: 'Keep my reflection.', cs_milestones: { sarah: 1 },
  weldBadges: { symbolsReader: true },
};
async function activate(element) {
  expect(element).toBeTruthy();
  element.focus();
  await click(element);
}
function expectFocused(selector, tabIndex = -1) {
  const destination = query(selector);
  expect(destination, selector).toBeTruthy();
  expect(document.activeElement).toBe(destination);
  expect(destination.tabIndex).toBe(tabIndex);
  return destination;
}
function expectRetained(app) {
  expect(app.latest()).toMatchObject(retained);
}

describe('Symbols Reader practice and builder workflow focus', () => {
  it('commits only Check, then focuses the next challenge and the restarted prompt', async () => {
    const app = await mountState({
      ...retained, view: 'symbolsReader', sr_view: 'practice', sym2_pr_idx: 0,
      sym2_pr_ans: {}, sym2_b_res: { b1: 1 },
    });
    const groups = [...node().querySelectorAll('#weld-symbols-panel [role="radiogroup"]')];
    expect(groups).toHaveLength(3);
    for (const [index, group] of groups.entries()) {
      const choices = [...group.querySelectorAll('[role="radio"]')];
      await activate(choices[0]);
      await pointer(choices[0], 'keyDown', { key: 'ArrowRight' });
      expect(document.activeElement).toBe(choices[1]);
      expect(choices[1].getAttribute('aria-checked')).toBe('true');
      expect(app.latest().sym2_pr_ans['0_' + index]).toBeUndefined();
      await activate(scopedButton(group.parentElement, 'Check answer'));
      expectFocused('#sym2-pr-fb-0_' + index);
      expect(choices.every(choice => choice.disabled)).toBe(true);
    }
    const answers = { ...app.latest().sym2_pr_ans };
    expect(answers).toEqual({ '0_0': 1, '0_1': 1, '0_2': 1 });
    const previousPrompt = text(query('#sym2-pr-context'));
    const next = button('Next challenge →');
    await activate(next);
    expect(next.isConnected).toBe(false);
    expectFocused('#sym2-pr-context');
    expect(text(document.activeElement)).not.toBe(previousPrompt);
    expect(app.latest().sym2_pr_idx).toBe(1);
    expect(app.latest().sym2_pr_ans).toEqual(answers);
    expect(app.latest().sym2_b_res).toEqual({ b1: 1 });
    await activate(button('↺ Restart practice (clears the score)'));
    expectFocused('#sym2-pr-context');
    expect(text(document.activeElement)).toBe(previousPrompt);
    expect(app.latest()).toMatchObject({ sym2_pr_idx: 0, sym2_pr_ans: {}, sym2_b_res: { b1: 1 } });
    expectRetained(app);
  });

  it('focuses the last work order when Next disappears and keeps check feedback reachable', async () => {
    const app = await mountState({
      ...retained, view: 'symbolsReader', sr_view: 'builder', sym2_b_idx: 8,
      sym2_b_res: { b1: 1, b4: 2 }, sym2_pr_ans: { '0_0': 1 },
    });
    const next = button('Next work order →');
    await activate(next);
    expect(next.isConnected).toBe(false);
    expect(button('Next work order →')).toBeUndefined();
    expectFocused('#sym2-b-order');
    expect(text(document.activeElement)).toContain('Plug weld through a 1/2 in hole');
    expect(app.latest().sym2_b_idx).toBe(9);
    expect(app.latest().sym2_b_res).toEqual({ b1: 1, b4: 2 });
    await activate(button('Check my symbol'));
    expectFocused('#sym2-b-fb');
    expect(text(document.activeElement)).toContain('fields do not match');
    await activate(query('[aria-label="Build 1 — first try"]'));
    expectFocused('#sym2-b-order');
    expect(text(document.activeElement)).toContain('A 1/4 in fillet weld');
    expect(query('#sym2-b-fb')).toBeNull();
    expect(app.latest()).toMatchObject({ sym2_b_idx: 0, sym2_b_res: { b1: 1, b4: 2 }, sym2_pr_ans: { '0_0': 1 } });
    expectRetained(app);
  });
});

describe('Career Stories fit and profile transitions', () => {
  it('names exclusive questions, supports radio keys and announces completed matches without moving focus', async () => {
    const app = await mountState({ ...retained, view: 'careerStories', cs_mode: 'fit' });
    const status = query('[data-career-fit-status]');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(text(status)).toBe('');
    for (const [question, heading] of [
      ['want', '1. What do you want most from your work?'],
      ['school', '2. How much school can you imagine doing?'],
      ['place', '3. Where do you want to work?'],
    ]) {
      expect(text(query('#story-fit-' + question))).toBe(heading);
      const choices = fitRadios(question);
      expect(choices).toHaveLength(4);
      expect(choices.map(choice=>choice.tabIndex)).toEqual([0,-1,-1,-1]);
      expect(choices.every(choice => !choice.hasAttribute('aria-pressed'))).toBe(true);
      await activate(choices[0]);
      await pointer(choices[0], 'keyDown', { key: 'End' });
      expect(document.activeElement).toBe(choices[3]);
      expect(choices.map(choice=>choice.tabIndex)).toEqual([-1,-1,-1,0]);
      expect(choices.filter(choice => choice.getAttribute('aria-checked') === 'true')).toEqual([choices[3]]);
    }
    const selected = { want: 'helping', school: 'bachelor', place: 'outdoor' };
    expect(app.latest()).toMatchObject({ cs_q_want: selected.want, cs_q_school: selected.school, cs_q_place: selected.place });
    const expectedMatches = core().car2RankFit(core().CAR2_PROFILES, selected).slice(0, 3);
    const evidenceOptions = [...query('[data-fit-inspect]').options];
    expect(evidenceOptions.map(option => option.value)).toEqual(expectedMatches.map(match => match.id));
    for (const option of evidenceOptions) {
      const name = option.textContent.replace(/^\d+\. /, '').split(' · ')[0];
      expect(text(status)).toContain(name);
    }
    expect(text(status)).toContain('Your top matches');
    expect(document.activeElement).toBe(fitRadios('place')[3]);
    const reset = button('↺ Start over');
    await activate(reset);
    expect(reset.isConnected).toBe(false);
    expectFocused('#story-fit-want');
    expect(text(status)).toBe('');
    expect(query('[data-career-fit-evidence]')).toBeNull();
    expect(app.latest()).toMatchObject({ cs_q_want: null, cs_q_school: null, cs_q_place: null });
    expectRetained(app);
  });

  it('focuses a full profile and then its comparison controls when their source actions disappear', async () => {
    const app = await mountState({
      ...retained, view: 'careerStories', cs_mode: 'fit',
      cs_q_want: 'steady', cs_q_school: 'cc', cs_q_place: 'big',
    });
    const expected = core().car2RankFit(core().CAR2_PROFILES, { want: 'steady', school: 'cc', place: 'big' })[0];
    const read = button('Read full profile →');
    await activate(read);
    expect(read.isConnected).toBe(false);
    expectFocused('#story-profile-title');
    expect(app.latest()).toMatchObject({ cs_mode: 'browse', cs_sel: expected.i });
    const compare = button('Compare this profile with another →');
    await activate(compare);
    expect(compare.isConnected).toBe(false);
    expectFocused('#car2-cmp-0', 0);
    expect(query('#car2-cmp-0').value).toBe(String(expected.i));
    expect(app.latest()).toMatchObject({
      cs_mode: 'compare', car2_cmp: [expected.i, expected.i === 0 ? 1 : 0],
      cs_q_want: 'steady', cs_q_school: 'cc', cs_q_place: 'big',
    });
    expectRetained(app);
  });

  it('keeps malformed saved answers incomplete and announces no invented matches', async () => {
    await mountState({
      ...retained, view: 'careerStories', cs_mode: 'fit',
      cs_q_want: [], cs_q_school: { id: 'cc' }, cs_q_place: 'unknown',
    });
    expect(text(query('[data-career-fit-status]'))).toBe('');
    expect(query('[data-career-fit-evidence]')).toBeNull();
    for (const question of ['want', 'school', 'place']) {
      expect(fitRadios(question).every(choice => choice.getAttribute('aria-checked') === 'false')).toBe(true);
    }
  });
});

describe('Career Pathways replacement actions and keyboard ladder', () => {
  it.each([false, true])('opens earnings with a focused destination when predictions shown is %s', async shown => {
    const prediction = { a25: 'apprentice', a35: 'college', shown };
    const app = await mountState({ ...retained, view: 'careerPaths', cp_view: 'overview', car2_pred: prediction });
    const open = button('Open the earnings explorer →');
    await activate(open);
    expect(open.isConnected).toBe(false);
    expectFocused(shown ? '#car2-earn-title' : '#car2-pred-title');
    expect(app.latest()).toMatchObject({ cp_view: 'earnings', car2_pred: prediction });
    expectRetained(app);
  });

  it('returns Predict again to the prediction question without changing the model', async () => {
    const earn = { ot: 4, loan: 5 };
    const app = await mountState({
      ...retained, view: 'careerPaths', cp_view: 'earnings', car2_earn: earn,
      car2_pred: { a25: 'apprentice', a35: 'college', shown: true },
    });
    const reset = button('↺ Predict again');
    await activate(reset);
    expect(reset.isConnected).toBe(false);
    expectFocused('#car2-pred-title');
    expect(app.latest().car2_pred).toBeNull();
    const choices = [...query('#weld-careers-panel').querySelectorAll('[role="radiogroup"]')];
    for (const group of choices) await activate(group.querySelector('[role="radio"]'));
    await activate(button('Lock in my predictions and show the model'));
    expect(document.activeElement.tabIndex).toBe(-1);
    expect(text(document.activeElement)).toContain('Your predictions against the model');
    expect(app.latest()).toMatchObject({ car2_pred: { a25: 'apprentice', a35: 'apprentice', shown: true }, car2_earn: earn });
    expectRetained(app);
  });

  it('focuses the revealed reference and keeps a moved credential on an enabled control at both endpoints', async () => {
    const initial = ['cwi', 'd11', 'scwi', 'sense', 'cwiElig', 'pipe6g'];
    const app = await mountState({
      ...retained, view: 'careerPaths', cp_view: 'ladder', car2_ladder: initial,
      car2_lad_chk: false, car2_lad_ref: false,
    });
    const reveal = button('Show it now anyway');
    await activate(reveal);
    expect(reveal.isConnected).toBe(false);
    expectFocused('#car2-ladder-reference');
    expect(app.latest()).toMatchObject({ car2_lad_ref: true, car2_ladder: initial });
    await activate(query('#car2-lad-d11-up'));
    expectFocused('#car2-lad-d11-down', 0);
    expect(query('#car2-lad-d11-up').disabled).toBe(true);
    expect(app.latest().car2_ladder[0]).toBe('d11');
    for (let index = 1; index < initial.length; index++) {
      await activate(query('#car2-lad-d11-down'));
      expect(app.latest().car2_ladder[index]).toBe('d11');
      expectFocused('#car2-lad-d11-' + (index === initial.length - 1 ? 'up' : 'down'), 0);
    }
    expect(query('#car2-lad-d11-down').disabled).toBe(true);
    expect([...app.latest().car2_ladder].sort()).toEqual([...initial].sort());
    expect(app.latest().car2_lad_chk).toBe(false);
    expectRetained(app);
  });
});

describe('Saved workflow loading respects existing focus', () => {
  it.each([
    { view: 'symbolsReader', sr_view: 'practice', sym2_pr_ans: { '0_0': 1 } },
    { view: 'symbolsReader', sr_view: 'builder', sym2_b_idx: 9, sym2_b_res: { b1: 1 } },
    { view: 'careerStories', cs_mode: 'fit', cs_q_want: 'steady', cs_q_school: 'cc', cs_q_place: 'big' },
    { view: 'careerStories', cs_mode: 'browse', cs_sel: 1 },
    { view: 'careerStories', cs_mode: 'compare', car2_cmp: [1, 9] },
    { view: 'careerPaths', cp_view: 'earnings', car2_pred: { a25: 'college', a35: 'degree', shown: true } },
    { view: 'careerPaths', cp_view: 'ladder', car2_lad_chk: true, car2_lad_ref: true },
  ])('does not take focus on mount for $view / $sr_view / $cs_mode / $cp_view', async state => {
    outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    await mountState({ ...retained, ...state });
    expect(document.activeElement).toBe(outside);
  });
});
