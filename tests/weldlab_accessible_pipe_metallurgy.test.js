import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change, pointer, button } from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(freshTool);
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; });
const query = selector => node().querySelector(selector);
const radios = label => [...query(`[role="radiogroup"][aria-label="${label}"]`).querySelectorAll('[role="radio"]')];
const live = () => document.getElementById('allo-live-weldlab').textContent;
const retained = { car2_reflect: 'Keep my notes.', weldBadges: { ppeSafety: true }, qp_ans: { 0: 1 } };
const comp = { C: 0.1, Mn: 0, Cr: 0, Mo: 0, V: 0, Ni: 0, Cu: 0 };
const sig = '0.100|0|0|0|0|0|0';
async function activate(element) {
  expect(element).toBeTruthy(); element.focus(); await click(element);
}
function expectRetained(app) {
  expect(app.latest()).toMatchObject(retained);
}

describe('Pipe Welding clock checks', () => {
  it('focuses the clock from Start and requires activation before committing an answer', async () => {
    const app = await mountState({ ...retained, view: 'pipeWelding', pipe_sect: 'positions', pipe2_pos: '6GR', pipe2_hour: 6 });
    const start = button('Start the check');
    await activate(start);
    expect(start.isConnected).toBe(false);
    const clock = query('[data-pipe-clock]');
    const one = clock.querySelector('[aria-label="1 o\'clock"]');
    expect(document.activeElement).toBe(one);
    expect(clock.getAttribute('aria-describedby')).toBe('pipe2-check-prompt');
    expect(query('#pipe2-check-prompt').textContent).toContain('Check 1 of 3');
    expect(app.latest()).toMatchObject({ pipe2_chal: 0, pipe2_hour: 1, pipe2_pos: '6GR' });
    const writes = app.writes.length;
    await pointer(one, 'keyDown', { key: 'ArrowRight' });
    expect(document.activeElement.getAttribute('aria-label')).toBe('2 o\'clock');
    expect(app.writes).toHaveLength(writes);
    expect(app.latest()).toMatchObject({ pipe2_chal: 0, pipe2_hour: 1 });
    await activate(clock.querySelector('[aria-label="6 o\'clock"]'));
    expect(app.latest()).toMatchObject({ pipe2_chal: 1, pipe2_hour: 6, pipe2_pos: '6GR' });
    expect(live()).toContain('6 o\'clock is Overhead');
    expect(live()).toContain('Check 2 of 3: Where is the weld VERTICAL?');
    expect(document.activeElement.getAttribute('aria-label')).toBe('6 o\'clock');
    expectRetained(app);
  });

  it('announces the explanation, next check and completion, then restores the removed Reset action', async () => {
    const app = await mountState({ ...retained, view: 'pipeWelding', pipe_sect: 'positions', pipe2_chal: 0, pipe2_pos: '1G' });
    const hour = value => query(`[data-pipe-clock] [aria-label="${value} o'clock"]`);
    await activate(hour(12));
    expect(app.latest().pipe2_chal).toBe(0);
    expect(live()).toContain('Not there: 12 o\'clock is Flat');
    expect(live()).toContain('burn-through');
    await activate(hour(6));
    await activate(hour(9));
    expect(app.latest().pipe2_chal).toBe(2);
    expect(live()).toContain('Check 3 of 3');
    await activate(hour(12));
    expect(app.latest()).toMatchObject({ pipe2_chal: 3, pipe2_hour: 12, pipe2_pos: '1G' });
    expect(live()).toContain('All three found');
    expect(query('[data-pipe-clock]').hasAttribute('aria-describedby')).toBe(false);
    const reset = button('↺ Reset');
    await activate(reset);
    expect(reset.isConnected).toBe(false);
    expect(document.activeElement).toBe(query('[data-pipe-check-start]'));
    expect(app.latest()).toMatchObject({ pipe2_chal: -1, pipe2_pos: '1G' });
    expectRetained(app);
  });

  it('returns focus from Stop to Start and preserves ordinary exploratory arrow selection', async () => {
    const app = await mountState({ ...retained, view: 'pipeWelding', pipe_sect: 'positions', pipe2_chal: 1, pipe2_hour: 6 });
    const stop = button('Stop the check');
    await activate(stop);
    expect(stop.isConnected).toBe(false);
    expect(document.activeElement).toBe(query('[data-pipe-check-start]'));
    const six = query('[data-pipe-clock] [aria-label="6 o\'clock"]'); six.focus();
    await pointer(six, 'keyDown', { key: 'ArrowRight' });
    expect(app.latest()).toMatchObject({ pipe2_chal: -1, pipe2_hour: 7 });
    expectRetained(app);
  });
});

describe('Pipe Welding pass feedback', () => {
  it('announces the visible wrong-order explanation and focuses completion before controls disable', async () => {
    const app = await mountState({ ...retained, view: 'pipeWelding', pipe_sect: 'passes', pipe2_wall: 0.218, pipe2_stack: [] });
    await activate(button('＋ Fill'));
    expect(live()).toContain('Not the Fill pass yet');
    expect(live()).toContain('Start at the bottom');
    expect(app.latest().pipe2_stack ?? []).toEqual([]);
    await activate(button('＋ Root'));
    await activate(button('＋ Hot pass'));
    await activate(button('＋ Cap'));
    const done = query('[data-pipe-stack-complete]');
    expect(document.activeElement).toBe(done);
    expect(done.tabIndex).toBe(-1);
    expect(done.textContent).toContain('Joint complete: 3 passes');
    expect([...query('[data-pipe-pass-controls]').querySelectorAll('button')].every(control => control.disabled)).toBe(true);
    expect(app.latest().pipe2_stack).toEqual(['root', 'hot', 'cap']);
    expectRetained(app);
  });

  it('returns focus to Root when undoing the last remaining pass disables Undo', async () => {
    const app = await mountState({ ...retained, view: 'pipeWelding', pipe_sect: 'passes', pipe2_stack: ['root'] });
    const undo = button('↶ Undo');
    await activate(undo);
    expect(undo.disabled).toBe(true);
    expect(document.activeElement).toBe(button('＋ Root'));
    expect(app.latest().pipe2_stack).toEqual([]);
    expectRetained(app);
  });
});

describe('Metallurgy prediction and case navigation', () => {
  it('keeps HAZ prediction feedback and observed verdict accessible, then returns Reset to its choices', async () => {
    const app = await mountState({ ...retained, view: 'metallurgy', met_sect: 'haz', met2_hazH: 16, met2_hazPredH0: 16 });
    const choices = () => radios('Your heat-input prediction');
    const heat = query('#met2-haz-h');
    expect(heat.disabled).toBe(true);
    await activate(choices()[2]);
    expect(document.activeElement.textContent).toContain('Locked in: C');
    expect(document.activeElement.tabIndex).toBe(-1);
    expect(heat.disabled).toBe(false);
    heat.focus(); await change(heat, '25');
    expect(document.activeElement).toBe(heat);
    expect(live()).toContain('Prediction checked: the model agrees with you');
    const reset = button('↺ Reset my prediction');
    await activate(reset);
    expect(reset.isConnected).toBe(false);
    expect(document.activeElement).toBe(choices()[0]);
    expect(query('#met2-haz-h').disabled).toBe(true);
    expect(app.latest()).toMatchObject({ met2_hazPred: -1, met2_hazPredH0: 16, met2_hazH: 25 });
    expectRetained(app);
  });

  it('moves among CE choices without grading and commits exactly one activated prediction', async () => {
    const app = await mountState({ ...retained, view: 'metallurgy', met_sect: 'ce', met_ce_comp: comp });
    const choices = radios('Your CE band prediction');
    choices[0].focus();
    const writes = app.writes.length;
    await pointer(choices[0], 'keyDown', { key: 'ArrowRight' });
    expect(document.activeElement).toBe(choices[1]);
    expect(app.writes).toHaveLength(writes);
    expect(app.latest().met2_cePred).toBeUndefined();
    expect(app.latest().met2_ceTally).toBeUndefined();
    // Native button activation is represented by click; arrow browsing must not
    // consume the prediction before Enter/Space or a pointer activates it.
    await activate(choices[1]);
    expect(query('[aria-label="Your CE band prediction"]')).toBeNull();
    expect(document.activeElement.tabIndex).toBe(-1);
    expect(document.activeElement.textContent).toContain('You predicted');
    expect(app.latest().met2_cePred.sig).toBe(sig);
    expect(app.latest().met2_ceTally).toMatchObject({ n: 1 });
    const tally = { ...app.latest().met2_ceTally };
    await click(choices[0]);
    expect(app.latest().met2_ceTally).toEqual(tally);
    expectRetained(app);
  });

  it('focuses the skipped CE result and restores the chooser when its reveal control disappears', async () => {
    const app = await mountState({ ...retained, view: 'metallurgy', met_sect: 'ce', met_ce_comp: comp, met2_ceTally: { n: 4, right: 3 } });
    await activate(button('Skip the prediction and show the CE live'));
    expect(document.activeElement.tabIndex).toBe(-1);
    expect(document.activeElement.textContent).toContain('CE = 0.100');
    const back = button('Turn the prediction step back on');
    await activate(back);
    expect(back.isConnected).toBe(false);
    expect(document.activeElement).toBe(radios('Your CE band prediction')[0]);
    expect(app.latest()).toMatchObject({ met2_ceFree: false, met2_ceTally: { n: 4, right: 3 }, met_ce_comp: comp });
    expectRetained(app);
  });

  it('focuses new crack cases, including the last case, and preserves first-answer scoring until reset', async () => {
    const app = await mountState({ ...retained, view: 'metallurgy', met_sect: 'cracking', met2_cdIdx: 0 });
    await activate(radios('Which cracking mechanism is it?')[1]);
    expect(document.activeElement.textContent).toContain('Right:');
    expect(app.latest().met2_cdPicks).toEqual({ 0: 1 });
    for (let i = 1; i <= 5; i++) {
      await activate(button('Next case →'));
      const heading = query(`[data-met-crack-case="${i}"]`);
      expect(document.activeElement).toBe(heading);
      expect(heading.tabIndex).toBe(-1);
      expect(heading.getAttribute('aria-describedby')).toBe('met2-cd-progress met2-cd-story');
      expect(query('#met2-cd-progress').textContent).toContain(`Case ${i + 1} of 6`);
      expect(app.latest().met2_cdPicks).toEqual({ 0: 1 });
    }
    expect(button('Next case →').disabled).toBe(true);
    await activate(button('← Previous case'));
    expect(document.activeElement).toBe(query('[data-met-crack-case="4"]'));
    await activate(button('↺ Reset cases and score'));
    expect(document.activeElement).toBe(query('[data-met-crack-case="0"]'));
    expect(app.latest()).toMatchObject({ met2_cdIdx: 0, met2_cdPicks: {} });
    // A same-index reset still places the learner at the case context.
    await activate(button('↺ Reset cases and score'));
    expect(document.activeElement).toBe(query('[data-met-crack-case="0"]'));
    expectRetained(app);
  });
});

describe('HAZ zone-width reference table', () => {
  it.each([false, true])('names its keyboard scroll region from the original caption in contrast=%s', async contrast => {
    const app = await mountState({ ...retained, view: 'metallurgy', met_sect: 'haz', met2_hazH: 16 }, contrast);
    const region = query('[data-weld-reference-scroll="haz-zones"]');
    expect(region.getAttribute('role')).toBe('region');
    expect(region.tabIndex).toBe(0);
    const caption = query('#' + region.getAttribute('aria-labelledby'));
    expect(caption.tagName).toBe('CAPTION');
    expect(caption.textContent).toBe('Zone widths at these settings (distance past the fusion line)');
    expect(region.querySelectorAll('tbody tr')).toHaveLength(4);
    const saved = JSON.stringify(app.latest()), writes = app.writes.length;
    region.focus(); expect(document.activeElement).toBe(region);
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
    expectRetained(app);
  });
});

describe('Restored Pipe Welding and Metallurgy mounts', () => {
  it.each([
    ['active clock check', { view: 'pipeWelding', pipe_sect: 'positions', pipe2_chal: 1, pipe2_hour: 6 }],
    ['completed pass stack', { view: 'pipeWelding', pipe_sect: 'passes', pipe2_wall: 0.218, pipe2_stack: ['root', 'hot', 'cap'] }],
    ['checked HAZ prediction', { view: 'metallurgy', met_sect: 'haz', met2_hazPred: 2, met2_hazPredH0: 16, met2_hazH: 25 }],
    ['live CE result', { view: 'metallurgy', met_sect: 'ce', met2_ceFree: true, met_ce_comp: comp }],
    ['predicted CE result', { view: 'metallurgy', met_sect: 'ce', met_ce_comp: comp, met2_cePred: { sig, band: 'LOW' }, met2_ceTally: { n: 1, right: 1 } }],
    ['answered last crack case', { view: 'metallurgy', met_sect: 'cracking', met2_cdIdx: 5, met2_cdPicks: { 0: 1, 5: 1 } }],
  ])('keeps outside focus and saved data on a restored %s mount', async (_name, state) => {
    outside = document.createElement('button'); document.body.append(outside); outside.focus();
    const app = await mountState({ ...retained, ...state });
    expect(document.activeElement).toBe(outside);
    for (const [key, value] of Object.entries(state)) expect(app.latest()[key]).toEqual(value);
    expectRetained(app);
  });
});
