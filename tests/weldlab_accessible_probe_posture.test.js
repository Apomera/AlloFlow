import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change } from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(freshTool);
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; });
const q = selector => node().querySelector(selector);
const retained = { car2_reflect: 'Keep my reflection.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true }, sh_audit: { lev: 'no' } };
const underwater = (time = 3) => ({ ...retained, view: 'underwater', uw_view: 'pressure', tech2_uw_pred: 'skip', uw_depth: 30, uw_tech: 'wet', uw_probe_time: time });
const posture = { ...retained, view: 'safetyHealth', sh_mode: 'browse', sh_sect: 'ergonomics' };
const probe = () => q('[data-uw-probe-time]');
const step = direction => q('[data-uw-probe-step="' + direction + '"]');
const select = () => q('[data-posture-select]');
const previous = () => q('[data-posture-prev]');
const next = () => q('[data-posture-next]');
function preserveOutsideFocus() { outside = document.createElement('button'); document.body.append(outside); outside.focus(); }
function expectRetained(app) { expect(app.latest()).toMatchObject(retained); }
function expectModelSummary() {
  const result = q('#uw5-probe-readings');
  for (const id of ['air', 'wet', 'dry']) {
    const card = q('[data-uw-probe-card="' + id + '"]');
    expect(result.textContent).toContain(card.querySelector('h5').textContent);
    expect(result.textContent).toContain(card.querySelector('[data-uw-probe-reading]').textContent);
    expect(result.textContent).toContain(card.querySelector('[data-uw-probe-band]').textContent);
  }
  expect(result.querySelector('button,input,svg,select')).toBeNull();
}

describe('Underwater cooling probe reader and endpoint flow', () => {
  it.each([false, true])('keeps repeated Forward focus until the last step transfers to the updated native probe, contrast=%s', async contrast => {
    const app = await mountState(underwater(39.5), contrast);
    step('forward').focus(); await click(step('forward'));
    expect(document.activeElement).toBe(step('forward')); expect(step('forward').disabled).toBe(false);
    expect(app.latest().uw_probe_time).toBe(39.75);
    await click(step('forward'));
    expect(step('forward').disabled).toBe(true); expect(Number(probe().value)).toBe(40); expect(document.activeElement).toBe(probe());
    expect(probe().getAttribute('aria-valuetext')).toContain('40.00 seconds');
    const jump = q('[data-uw-probe-jump="wet:500"]'); jump.focus(); await click(jump);
    expect(document.activeElement).toBe(jump); expect(step('forward').disabled).toBe(false);
    expectModelSummary(); expectRetained(app); expect(app.writes.every(([key]) => key === 'uw_probe_time')).toBe(true);
  });

  it.each([false, true])('keeps repeated Back focus until zero transfers to the updated native probe, contrast=%s', async contrast => {
    const app = await mountState(underwater(0.5), contrast);
    step('back').focus(); await click(step('back'));
    expect(document.activeElement).toBe(step('back')); expect(step('back').disabled).toBe(false);
    expect(app.latest().uw_probe_time).toBe(0.25);
    await click(step('back'));
    expect(step('back').disabled).toBe(true); expect(Number(probe().value)).toBe(0); expect(document.activeElement).toBe(probe());
    expect(probe().getAttribute('aria-valuetext')).toContain('0.00 seconds');
    expectModelSummary(); expectRetained(app); expect(app.writes.every(([key]) => key === 'uw_probe_time')).toBe(true);
  });

  it.each([false, true])('provides one stable concise model summary for native and crossing-button updates without taking their focus, contrast=%s', async contrast => {
    const app = await mountState(underwater(), contrast);
    const result = q('#uw5-probe-readings');
    expect(q('[data-uw-probe-live]')).toBe(result); expect(node().querySelectorAll('#' + result.id)).toHaveLength(1);
    expect(result.getAttribute('aria-live')).toBe('polite'); expect(result.getAttribute('aria-atomic')).toBe('true');
    expect(probe().getAttribute('aria-describedby')).toBe(result.id); expectModelSummary();
    const mutations = [], observer = new MutationObserver(records => mutations.push(...records));
    observer.observe(result, { childList: true, characterData: true, subtree: true });
    try {
      const before = result.textContent;
      probe().focus(); await change(probe(), '12');
      expect(document.activeElement).toBe(probe()); expect(q('#uw5-probe-readings')).toBe(result); expect(result.textContent).not.toBe(before); expectModelSummary();
      const jump = q('[data-uw-probe-jump="wet:800"]'); jump.focus(); await click(jump);
      expect(document.activeElement).toBe(jump); expect(q('#uw5-probe-readings')).toBe(result); expectModelSummary();
      expect(Number(q('[data-uw-probe-reading="wet"]').dataset.temperatureC)).toBeCloseTo(800, 8);
      expect(q('[data-uw-probe-card="wet"]').dataset.band).toBe('t85');
      mutations.push(...observer.takeRecords()); expect(mutations.length).toBeGreaterThan(0);
    } finally { observer.disconnect(); }
    expectRetained(app); expect(app.writes.every(([key]) => key === 'uw_probe_time')).toBe(true);
  });

  it.each([false, true])('restores a saved endpoint without requesting focus or writing saved projects, contrast=%s', async contrast => {
    preserveOutsideFocus(); const saved = underwater(40), app = await mountState(saved, contrast);
    expect(document.activeElement).toBe(outside); expect(step('forward').disabled).toBe(true); expect(Number(probe().value)).toBe(40);
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0); expectModelSummary();
  });
});

describe('Posture study endpoint focus', () => {
  it.each([false, true])('retains navigation focus between endpoints, then hands it to the current native position select, contrast=%s', async contrast => {
    const app = await mountState(posture, contrast); const saved = JSON.stringify(app.latest());
    next().focus();
    for (let i = 1; i < 4; i++) { await click(next()); expect(select().value).toBe(String(i)); expect(document.activeElement).toBe(next()); }
    await click(next()); expect(select().value).toBe('4'); expect(next().disabled).toBe(true); expect(document.activeElement).toBe(select());
    expect(q('[data-posture-study]').dataset.postureStudy).toBe('flat');
    previous().focus();
    for (let i = 3; i > 0; i--) { await click(previous()); expect(select().value).toBe(String(i)); expect(document.activeElement).toBe(previous()); }
    await click(previous()); expect(select().value).toBe('0'); expect(previous().disabled).toBe(true); expect(document.activeElement).toBe(select());
    expect(q('[data-posture-study]').dataset.postureStudy).toBe('overhead');
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(0); expectRetained(app);
  });

  it.each([false, true])('keeps initial external and direct native-select focus and does not replay endpoint requests, contrast=%s', async contrast => {
    preserveOutsideFocus(); const app = await mountState(posture, contrast); const saved = JSON.stringify(app.latest());
    expect(document.activeElement).toBe(outside);
    const reading = q('#safe10-posture-reading'); expect(reading.getAttribute('aria-live')).toBe('polite'); expect(reading.getAttribute('aria-atomic')).toBe('true');
    select().focus(); await change(select(), '4'); expect(document.activeElement).toBe(select()); expect(next().disabled).toBe(true);
    await change(select(), '1'); previous().focus(); await click(previous()); expect(document.activeElement).toBe(select());
    outside.focus(); await change(select(), '2'); expect(document.activeElement).toBe(outside);
    expect(q('#safe10-posture-reading')).toBe(reading); expect(q('[data-posture-study]').dataset.postureStudy).toBe('pipe');
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(0); expectRetained(app);
  });
});
