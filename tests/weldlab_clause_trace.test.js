import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshTool, mountState, unmountState, renderState, click, node, button, SRC } from './helpers/weldlab_interaction_mount.js';
import { stripClauseTrace } from './helpers/weldlab_clause_trace_restore.js';

const reference = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-code-reader-baseline.json'), 'utf8')).d1_1;
const nums = [[8, 7, 4, 6], [7, 6, 8, 5], [7, 4, 5, 11], [8, 5, 9, 7], [9, 10, 4, 7], [7, 11, 4, 6]];
const keys = [0, 1, 2, 3, 0, 1], correct = [8, 6, 5, 7, 9, 11];
const state = extra => ({ view: 'codes', insp2_codesTab: 'clause', codes_pick: 'd1_1', ...extra });
const panel = (host = node()) => host.querySelector('[data-clause-trace]');
const $ = selector => panel().querySelector(selector);
const options = () => [...node().querySelector('[aria-label="Pick the clause"]').querySelectorAll('button')];
const reading = (host = node()) => ({ number: host.querySelector('[data-clause-trace-number]').textContent,
  title: host.querySelector('[data-clause-trace-title]').textContent, body: host.querySelector('[data-clause-trace-body]').textContent });
const row = num => reference.rows.find(item => item.number === 'Clause ' + num);
const selectedLeaves = () => [...panel().querySelectorAll('[data-clause-trace-leaf][data-selected="true"]')].map(el => Number(el.dataset.clauseTraceLeaf));

beforeEach(freshTool);
afterEach(unmountState);

describe('Post-answer D1.1 clause lookup tracing', () => {
  it('keeps all summary exploration behind the existing first-pick gate, including malformed saved answers', () => {
    for (const extra of [{}, { insp2_clause: { 0: '0' } }, { insp2_clause: [0] }, { insp2_clause: { 0: 4 } }]) {
      const host = renderState(state(extra));
      expect(panel(host)).toBeNull(); expect(host.querySelector('[data-clause-trace-body]')).toBeNull();
      expect(host.textContent).not.toContain('Clause 8 Inspection holds the acceptance criteria');
      expect([...host.querySelector('[aria-label="Pick the clause"]').querySelectorAll('button')].every(el => !el.disabled)).toBe(true);
    }
    for (const insp2_codesTab of ['read', 'flow', 'sort']) expect(panel(renderState(state({ insp2_codesTab, insp2_clause: { 0: 0 } })))).toBeNull();
  });

  it('resolves every existing option and all six best answers through the authored D1.1 summaries', () => {
    for (let task = 0; task < nums.length; task++) for (let pick = 0; pick < 4; pick++) {
      const host = renderState(state({ insp2_clauseIdx: task, insp2_clause: { [task]: pick }, codes_pick: 'asme9' })), trace = panel(host);
      expect(trace.dataset).toMatchObject({ task: String(task), choice: String(nums[task][pick]), best: String(correct[task]), selected: String(nums[task][pick]) });
      expect(reading(host)).toEqual(row(nums[task][pick]));
      expect([...trace.querySelectorAll('[data-clause-trace-tab]')].map(el => el.textContent)).toEqual(reference.rows.slice(3).map(item => item.number + ' — ' + item.title));
      expect(trace.querySelectorAll('[data-clause-trace-role]')).toHaveLength(pick === keys[task] ? 1 : 2);
      if (pick === keys[task]) expect(trace.querySelector('[data-clause-trace-role="both"]').textContent).toContain('Your choice · Best answer');
    }
  });

  it('compares the locked first choice with the best answer and inspects every exact existing section without new writes', async () => {
    const app = await mountState(state({ insp2_sort: { amps: 'ok' }, weldBadges: { old: true } }));
    expect(panel()).toBeNull(); await click(options()[1]);
    expect(app.latest().insp2_clause).toEqual({ 0: 1 }); expect(node().textContent).toContain('Score 0 / 1');
    expect(panel().dataset.selected).toBe('7'); expect(reading()).toEqual(row(7));
    expect(options().every(el => el.disabled)).toBe(true);
    expect(node().textContent).toContain('Clause 8 Inspection holds the acceptance criteria');
    const saved = structuredClone(app.latest()), writes = app.writes.length;
    await click($('[data-clause-trace-role="best"]')); expect(reading()).toEqual(row(8));
    await click($('[data-clause-trace-role="choice"]')); expect(reading()).toEqual(row(7));
    for (let num = 4; num <= 11; num++) {
      await click($('[data-clause-trace-tab="' + num + '"]'));
      expect(reading()).toEqual(row(num)); expect(selectedLeaves()).toEqual([num]);
      expect(panel().dataset.selected).toBe(String(num));
      expect(panel().querySelectorAll('[data-clause-trace-tab][aria-pressed="true"]')).toHaveLength(1);
      expect($('[data-clause-trace-tab="' + num + '"]').getAttribute('aria-pressed')).toBe('true');
    }
    await click(options()[0]); expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(writes);
    expect(node().textContent).toContain('Score 0 / 1');
  });

  it('resets inspection on Next and Restart while keeping the original six task keys and score', async () => {
    const app = await mountState(state());
    await click(options()[1]); await click($('[data-clause-trace-tab="11"]'));
    await click(button('Next task ➡️')); expect(app.latest().insp2_clauseIdx).toBe(1); expect(panel()).toBeNull();
    for (let task = 1; task < keys.length; task++) {
      await click(options()[keys[task]]);
      expect(panel().dataset.selected).toBe(String(correct[task])); expect(reading()).toEqual(row(correct[task]));
      await click($('[data-clause-trace-tab="4"]'));
      if (task < keys.length - 1) { await click(button('Next task ➡️')); expect(panel()).toBeNull(); }
    }
    expect(app.latest().insp2_clause).toEqual({ 0: 1, 1: 1, 2: 2, 3: 3, 4: 0, 5: 1 });
    expect(node().textContent).toContain('Score 5 / 6'); expect(button('Next task ➡️')).toBeUndefined();
    await click(button('🔄 Restart quiz')); expect(app.latest().insp2_clause).toEqual({}); expect(app.latest().insp2_clauseIdx).toBe(0); expect(panel()).toBeNull();
    await click(options()[1]); expect(panel().dataset.selected).toBe('7');
  });

  it('defaults to each restored first choice and resets when the next task was already answered', async () => {
    const app = await mountState(state({ insp2_clause: { 0: 1, 1: 0 } }));
    expect(reading()).toEqual(row(7)); await click($('[data-clause-trace-tab="11"]'));
    await click(button('Next task ➡️')); expect(panel().dataset.task).toBe('1'); expect(reading()).toEqual(row(7));
    expect(app.latest().insp2_clause).toEqual({ 0: 1, 1: 0 });
    await click($('[data-clause-trace-role="best"]')); expect(reading()).toEqual(row(6));
  });

  it('ignores persisted lookalike exploration state and leaves unrelated saved work intact', async () => {
    const extra = { codes_pick: 'api1104', insp2_clause: { 0: 0 }, insp2_sortIdx: 4, insp2_sort: { amps: 'ok' }, insp2_wpsField: 'gas',
      clauseLookupState: { task: '0:0', num: '11' }, qp_answers: { 0: 2 }, sym2_b_res: { old: 1 }, weldBadges: { existing: true } };
    const app = await mountState(state(extra)), saved = structuredClone(app.latest());
    expect(reading()).toEqual(row(8));
    for (const num of [4, 11, 6, 8]) await click($('[data-clause-trace-tab="' + num + '"]'));
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('uses native44px controls, complete HTML readings, decorative SVG and explicit contrast/focus (contrast=%s)', async contrast => {
    await mountState(state({ insp2_clause: { 0: 1 } }), contrast); const trace = panel();
    expect(trace.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(250, 245, 255)'); expect(trace.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    expect(trace.style.getPropertyValue('--clause-trace-focus')).toBe(contrast ? '#ffff00' : '#6b21a8');
    expect(trace.querySelector('style').textContent).toContain('button:focus-visible{outline:3px solid var(--clause-trace-focus);outline-offset:3px}');
    expect(trace.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');
    for (const control of trace.querySelectorAll('button')) { expect(control.type).toBe('button'); expect(parseInt(control.style.minHeight)).toBeGreaterThanOrEqual(44); expect(control.textContent.trim()).toBeTruthy(); control.focus(); expect(document.activeElement).toBe(control); }
    expect($('[data-clause-trace-reading]').getAttribute('aria-live')).toBe('polite'); expect($('[data-clause-trace-reading]').getAttribute('aria-atomic')).toBe('true');
    expect($('[data-clause-trace-body]').className).toContain('text-base'); expect($('[data-clause-trace-body]').style.color).toBe(trace.style.color);
    const drawing = $('[data-clause-trace-drawing]'); expect(drawing.getAttribute('aria-hidden')).toBe('true'); expect(drawing.getAttribute('focusable')).toBe('false'); expect(drawing.querySelectorAll('button,[tabindex],a')).toHaveLength(0);
    expect(trace.querySelectorAll('animate,animateTransform,canvas,input,select')).toHaveLength(0);
    expect(trace.textContent).toContain('Dashed tab edge = your choice. Diamond = best answer. Filled tab = the summary being inspected.');
  });

  it('recovers the entire original Codes function after removing only the additive trace', () => {
    const source = readFileSync(resolve(SRC), 'utf8').replace(/\r\n/g, '\n');
    const start = source.indexOf('function CodesAndStandards('), end = source.indexOf('function WelderQualPrep(', start), region = source.slice(start, end);
    expect(region).toContain('        function renderClauseLookup(q, pick) {');
    expect(createHash('sha256').update(stripClauseTrace(region)).digest('hex')).toBe('c3284dc1db4e58de87cc55d8283c5c281081ed0f2f72fa0d249a35d98b445929');
  });
});
