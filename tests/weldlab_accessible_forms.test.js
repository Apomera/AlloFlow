import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SRC, node, freshTool, mountState, unmountState, click, change } from './helpers/weldlab_interaction_mount.js';
import { accessibleFormsBaseline, stripAccessibleForms } from './helpers/weldlab_accessible_forms_restore.js';

const CE_STATE = { view: 'metallurgy', met_sect: 'ce', met2_ceTally: { n: 4, right: 3 } };
const PAY_STATE = { view: 'pipeWelding', pipe_sect: 'pipeline' };
const feedback = () => node().querySelector('#a11y14_pipe_pay_feedback');
const amount = () => node().querySelector('#pipe2-guess');
const check = () => [...amount().parentElement.querySelectorAll('button')].find(button => button.textContent.trim() === 'Check');
const pay = () => window.__WeldLabCore.pipe2PayWeek({ rate: 50, hours: 60, perDiem: 130, days: 7, costs: 350, weeks: 26 });
const dollars = value => '$' + Math.round(value).toLocaleString('en-US');

beforeEach(freshTool);
afterEach(unmountState);

describe('WeldLab accessible form labels and validation', () => {
  it('names every CE input with its visible symbol, translated element and weight-percent unit', async () => {
    await mountState(CE_STATE);
    const elements = [['C', 'Carbon'], ['Mn', 'Manganese'], ['Cr', 'Chromium'], ['Mo', 'Molybdenum'], ['V', 'Vanadium'], ['Ni', 'Nickel'], ['Cu', 'Copper']];
    for (const [symbol, name] of elements) {
      const input = node().querySelector('#ce-el-' + symbol);
      expect(input, symbol).toBeTruthy();
      expect(input.labels).toHaveLength(1);
      expect(input.labels[0].textContent).toBe(`${symbol} · ${name} · weight percent`);
      expect(input.hasAttribute('aria-label')).toBe(false);
      expect(input.labels[0].htmlFor).toBe(input.id);
      expect(input.type).toBe('number');
      expect(input.min).toBe('0');
      expect(input.max).toBe('10');
      expect(input.step).toBe('0.01');
    }
  });

  it.each([false, true])('mounts one empty, persistent feedback live region before Check (contrast %s)', async contrast => {
    await mountState(PAY_STATE, contrast);
    expect(node().querySelectorAll('#a11y14_pipe_pay_feedback')).toHaveLength(1);
    expect(feedback().getAttribute('role')).toBe('status');
    expect(feedback().getAttribute('aria-live')).toBe('polite');
    expect(feedback().getAttribute('aria-atomic')).toBe('true');
    expect(feedback().textContent).toBe('');
    expect(amount().hasAttribute('aria-describedby')).toBe(false);
    expect(amount().getAttribute('aria-invalid')).not.toBe('true');
    expect(amount().labels).toHaveLength(1);
  });

  it.each(['', '   ', '\t\n', 'bad', '12oops', '1.2.3', 'Infinity', '-Infinity', 'NaN', '1e999', '1e', '0x10', '1,234', '1,5', '$1234'])('associates malformed amount %j with the original error without grading it', async value => {
    const app = await mountState(PAY_STATE);
    const saved = JSON.stringify(app.latest()), writes = app.writes.length;
    await change(amount(), value);
    await click(check());
    expect(amount().getAttribute('aria-invalid')).toBe('true');
    expect(amount().getAttribute('aria-describedby')).toBe(feedback().id);
    expect(feedback().textContent).toBe('Type a dollar amount first.');
    expect(feedback().textContent).not.toContain('Off by');
    expect(JSON.stringify(app.latest())).toBe(saved);
    expect(app.writes).toHaveLength(writes);
  });

  it('emits a new live-region mutation on repeated blank Check without replacing the live region', async () => {
    await mountState(PAY_STATE);
    const region = feedback();
    await click(check());
    const mutations = [];
    const observer = new MutationObserver(records => mutations.push(...records));
    observer.observe(region, { childList: true, subtree: true, characterData: true });
    try {
      await click(check());
      mutations.push(...observer.takeRecords());
      expect(feedback()).toBe(region);
      expect(region.textContent).toBe('Type a dollar amount first.');
      expect(mutations.some(record => record.type === 'characterData' || record.addedNodes.length || record.removedNodes.length)).toBe(true);
    } finally {
      observer.disconnect();
    }
  });

  it('clears the format error on editing, then announces the complete unchanged correct result', async () => {
    const app = await mountState(PAY_STATE);
    const region = feedback(), saved = JSON.stringify(app.latest()), writes = app.writes.length;
    await click(check());
    await change(amount(), String(pay().projectNet));
    expect(amount().getAttribute('aria-invalid')).not.toBe('true');
    expect(amount().hasAttribute('aria-describedby')).toBe(false);
    expect(feedback()).toBe(region);
    expect(region.textContent).toBe('');
    await click(check());
    expect(amount().getAttribute('aria-invalid')).not.toBe('true');
    expect(amount().getAttribute('aria-describedby')).toBe(region.id);
    expect(region.textContent).toBe(`✓ Within 5%: the model says ${dollars(pay().projectNet)}.`);
    expect(JSON.stringify(app.latest())).toBe(saved);
    expect(app.writes).toHaveLength(writes);
  });

  it.each(['0', '-200', '1e3', '+1200', '.25'])('grades numeric estimate %s with the existing tolerance and full feedback, without marking it as an invalid field', async value => {
    const app = await mountState(PAY_STATE);
    const saved = JSON.stringify(app.latest()), writes = app.writes.length;
    await change(amount(), value);
    await click(check());
    const difference = Number(value) - pay().projectNet;
    const correct = Math.abs(difference) <= Math.max(50, Math.abs(pay().projectNet) * 0.05);
    expect(amount().getAttribute('aria-invalid')).not.toBe('true');
    expect(amount().getAttribute('aria-describedby')).toBe(feedback().id);
    expect(feedback().textContent).toBe(correct
      ? `✓ Within 5%: the model says ${dollars(pay().projectNet)}.`
      : `✗ Off by ${dollars(Math.abs(difference))}. Rework it: straight time + overtime + per diem − costs, per week, then × weeks.`);
    expect(JSON.stringify(app.latest())).toBe(saved);
    expect(app.writes).toHaveLength(writes);
  });

  it('preserves the authored CE and pay sections exactly after undoing the accessibility additions', () => {
    const restored = stripAccessibleForms(readFileSync(SRC, 'utf8'));
    for (const { name, start, end, sha256 } of accessibleFormsBaseline) {
      const begin = restored.indexOf(start), finish = restored.indexOf(end, begin);
      expect(begin, name).toBeGreaterThanOrEqual(0);
      expect(finish, name).toBeGreaterThan(begin);
      expect(createHash('sha256').update(restored.slice(begin, finish)).digest('hex'), name).toBe(sha256);
    }
  });
});
