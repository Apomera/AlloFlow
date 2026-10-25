import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change } from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(freshTool);
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; });
const retained = { car2_reflect: 'Keep these notes.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };
const decoder = { ...retained, view: 'consumables', cons_mode: 'browse', cons_sect: 'decoder', tech2_cons_code: 'E7018' };
const pin = () => node().querySelector('[data-cons-code-pin]');
const clear = () => node().querySelector('[data-cons-code-clear]');
const code = () => node().querySelector('#tech2-dec-input');
const noise = () => node().querySelector('[data-noise-cumulative]');
function preserveOutsideFocus() { outside = document.createElement('button'); document.body.append(outside); outside.focus(); }

describe('Consumables decoder screen-reader equivalents', () => {
  it.each([false, true])('exposes an absent field as text in collapsed summaries in contrast=%s', async contrast => {
    preserveOutsideFocus();
    const app = await mountState(decoder, contrast);
    expect(document.activeElement).toBe(outside);
    await click(pin()); await change(code(), 'ER70S-6');
    const saved = JSON.stringify(app.latest()), writes = app.writes.length;
    const current = node().querySelector('[data-cons-code-row="position"]');
    expect(current.open).toBe(false);
    const absent = current.querySelector('summary [data-cons-code-summary-token="current"]');
    expect(absent.hasAttribute('aria-label')).toBe(false);
    expect(absent.querySelector('[aria-hidden="true"]').textContent).toBe('—');
    expect(absent.querySelector('.sr-only').textContent).toBe('Not present in this decoded example.');
    expect(current.querySelector('summary [data-cons-code-summary-token="pinned"]').textContent).toBe('1');
    const opposite = node().querySelector('[data-cons-code-row="chem"] summary [data-cons-code-summary-token="pinned"]');
    expect(opposite.querySelector('.sr-only').textContent).toBe('Not present in this decoded example.');
    expect(node().querySelectorAll('strong[aria-label]')).toHaveLength(0);
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
    expect(app.latest()).toMatchObject(retained);
  });

  it.each([false, true])('returns Clear pin focus to the retained Pin action for valid code in contrast=%s', async contrast => {
    const app = await mountState(decoder, contrast);
    await click(pin()); await change(code(), 'ER70S-6');
    const saved = JSON.stringify(app.latest()), writes = app.writes.length;
    clear().focus(); await click(clear());
    expect(clear()).toBeNull(); expect(document.activeElement).toBe(pin()); expect(pin().disabled).toBe(false);
    expect(node().querySelector('[data-cons-code-compare]')).toBeNull();
    expect(node().querySelector('[data-cons-code-status]').textContent).toBe('Pin a valid classification, then enter another to compare its decoded fields.');
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
  });

  it.each([false, true])('returns Clear pin focus to Classification while its Pin action is disabled in contrast=%s', async contrast => {
    const app = await mountState(decoder, contrast);
    await click(pin()); await change(code(), 'XYZ');
    expect(pin().disabled).toBe(true);
    const saved = JSON.stringify(app.latest()), writes = app.writes.length;
    clear().focus(); await click(clear());
    expect(clear()).toBeNull(); expect(document.activeElement).toBe(code());
    expect(code().value).toBe('XYZ'); expect(pin().disabled).toBe(true);
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
    expect(app.latest()).toMatchObject(retained);
  });
});

describe('Noise journey cumulative result status', () => {
  it.each([false, true])('keeps one related polite status while explicit probes update both authored doses in contrast=%s', async contrast => {
    preserveOutsideFocus();
    const app = await mountState({ ...retained, view: 'safetyHealth', sh_mode: 'browse', sh_sect: 'noise', safe2_noise: [{ db: 100, h: 1 }, { db: 85, h: 6 }] }, contrast);
    expect(document.activeElement).toBe(outside);
    const result = noise(), probe = node().querySelector('[data-noise-probe]');
    expect(result.getAttribute('role')).toBe('status');
    expect(result.getAttribute('aria-live')).toBe('polite'); expect(result.getAttribute('aria-atomic')).toBe('true');
    expect(node().querySelectorAll('#' + result.id)).toHaveLength(1);
    expect(probe.getAttribute('aria-describedby')).toBe(result.id);
    expect(Number(result.dataset.oshaDose)).toBe(87.5); expect(Number(result.dataset.nioshDose)).toBe(475);
    expect(result.textContent).toContain('OSHA dose at probe'); expect(result.textContent).toContain('NIOSH dose at probe');
    const saved = JSON.stringify(app.latest()), writes = app.writes.length, mutations = [];
    const observer = new MutationObserver(records => mutations.push(...records));
    observer.observe(result, { childList: true, subtree: true, characterData: true });
    try {
      probe.focus(); await change(probe, '0');
      expect(noise()).toBe(result); expect(document.activeElement).toBe(probe);
      expect(Number(result.dataset.oshaDose)).toBe(0); expect(Number(result.dataset.nioshDose)).toBe(0);
      const first = node().querySelector('[data-noise-task="0"]');
      expect(first).toBeTruthy(); first.focus(); await click(first);
      expect(document.activeElement).toBe(first); expect(noise()).toBe(result);
      expect(Number(result.dataset.oshaDose)).toBe(50); expect(Number(result.dataset.nioshDose)).toBe(400);
      const end = node().querySelector('[data-noise-probe-end]'); end.focus(); await click(end);
      expect(noise()).toBe(result); expect(document.activeElement).toBe(end);
      expect(Number(result.dataset.oshaDose)).toBe(87.5); expect(Number(result.dataset.nioshDose)).toBe(475);
      mutations.push(...observer.takeRecords());
      expect(mutations.some(record => record.type === 'characterData' || record.addedNodes.length || record.removedNodes.length)).toBe(true);
    } finally { observer.disconnect(); }
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
    expect(app.latest()).toMatchObject(retained);
  });
});
