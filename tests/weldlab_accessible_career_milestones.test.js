import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change } from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(freshTool);
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; });
const q = selector => node().querySelector(selector);
const retained = { cs_q_want: 'steady', cs_q_school: 'cc', cs_q_place: 'small', car2_reflect: 'Keep my career question.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };
const browse = (index = 0) => ({ ...retained, view: 'careerStories', cs_mode: 'browse', cs_sel: 1, cs_milestones: { sarah: index, mike: 1 }, car2_cmp: [1, 9] });
const compare = (pair = [1, 9]) => ({ ...browse(1), cs_mode: 'compare', car2_cmp: pair });
const pick = index => q('[data-career-milestone-pick="' + index + '"]');
const previous = () => q('[data-career-milestone-prev]');
const next = () => q('[data-career-milestone-next]');
const slider = () => q('[data-career-age-slider]');
const agePrevious = () => q('[data-career-age-prev]');
const ageNext = () => q('[data-career-age-next]');
function externalFocus() { outside = document.createElement('button'); document.body.append(outside); outside.focus(); }
function onlyMilestoneWrites(app) {
  expect(app.latest()).toMatchObject(retained);
  expect(app.latest().car2_cmp).toEqual([1, 9]);
  expect(app.latest().cs_milestones.mike).toBe(1);
  expect(app.writes.every(([key]) => key === 'cs_milestones')).toBe(true);
}
function milestoneReading() {
  const reading = q('#story5-milestone-readings');
  expect(reading.tagName).toBe('DL');
  expect(reading.hasAttribute('role')).toBe(false);
  expect(reading.getAttribute('aria-live')).toBe('polite');
  expect(reading.getAttribute('aria-atomic')).toBe('true');
  expect(q('#' + reading.getAttribute('aria-labelledby')).tagName).toBe('H4');
  expect(reading.querySelectorAll('dt')).toHaveLength(3);
  expect(reading.querySelectorAll('dd')).toHaveLength(3);
  expect(reading.querySelector('input,button,select,svg')).toBeNull();
  for (const target of [...node().querySelectorAll('[data-career-milestone-pick]'), previous(), next()]) {
    expect(target.getAttribute('aria-controls')).toBe(reading.id);
  }
  return reading;
}
function compareReadings() {
  const ids = slider().getAttribute('aria-describedby').split(' ');
  expect(new Set(ids).size).toBe(2);
  const readings = ids.map(id => {
    expect(node().querySelectorAll('#' + id)).toHaveLength(1);
    const reading = q('#' + id);
    expect(reading.getAttribute('aria-live')).toBe('polite');
    expect(reading.getAttribute('aria-atomic')).toBe('true');
    expect(reading.querySelector('input,button,select,svg')).toBeNull();
    expect(reading.querySelector('h4').textContent).toContain(', age ' + slider().value);
    return reading;
  });
  expect(agePrevious().getAttribute('aria-controls')).toBe(ids.join(' '));
  expect(ageNext().getAttribute('aria-controls')).toBe(ids.join(' '));
  return readings;
}

describe('Career milestone keyboard and reader flow', () => {
  it.each([false, true])('keeps Next focus between stages and hands it to the selected native last-stage button at the endpoint, contrast=%s', async contrast => {
    const app = await mountState(browse(), contrast);
    next().focus(); await click(next());
    expect(document.activeElement).toBe(next()); expect(next().disabled).toBe(false);
    expect(app.latest().cs_milestones.sarah).toBe(1);
    await click(next());
    expect(next().disabled).toBe(true); expect(document.activeElement).toBe(pick(2));
    expect(pick(2).tagName).toBe('BUTTON'); expect(pick(2).getAttribute('aria-pressed')).toBe('true');
    expect(q('[data-career-timeline-highlight="2"]')).toBeTruthy();
    onlyMilestoneWrites(app);
  });

  it.each([false, true])('keeps Previous focus between stages and hands it to the selected native first-stage button at the endpoint, contrast=%s', async contrast => {
    const app = await mountState(browse(2), contrast);
    previous().focus(); await click(previous());
    expect(document.activeElement).toBe(previous()); expect(previous().disabled).toBe(false);
    expect(app.latest().cs_milestones.sarah).toBe(1);
    await click(previous());
    expect(previous().disabled).toBe(true); expect(document.activeElement).toBe(pick(0));
    expect(pick(0).getAttribute('aria-pressed')).toBe('true');
    expect(q('[data-career-timeline-highlight="0"]')).toBeTruthy();
    onlyMilestoneWrites(app);
  });

  it.each([false, true])('keeps one native live definition list as the stage changes and preserves direct choice focus, contrast=%s', async contrast => {
    const app = await mountState(browse(), contrast), reading = milestoneReading(), before = reading.textContent;
    const records = [], observer = new MutationObserver(items => records.push(...items));
    observer.observe(reading, { subtree: true, childList: true, characterData: true });
    try {
      for (const index of [1, 2, 0]) {
        pick(index).focus(); await click(pick(index));
        expect(document.activeElement).toBe(pick(index));
        expect(pick(index).getAttribute('aria-pressed')).toBe('true');
        expect(milestoneReading()).toBe(reading);
        if (index === 1) { expect(reading.textContent).not.toBe(before); expect(reading.textContent).toContain('unpaid'); }
        expect(reading.textContent).toContain(q('[data-career-milestone-pay]').textContent);
        expect(reading.textContent).toContain(q('[data-career-milestone-duration]').textContent);
      }
      records.push(...observer.takeRecords()); expect(records.length).toBeGreaterThan(0);
    } finally { observer.disconnect(); }
    onlyMilestoneWrites(app);
  });

  it.each([0, 2, 999])('restores saved milestone %s without taking external focus or rewriting saved data', async index => {
    externalFocus(); const saved = browse(index), app = await mountState(saved);
    expect(document.activeElement).toBe(outside); expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
    expect(q('[data-career-milestone]').dataset.stageIndex).toBe(String(index === 999 ? 0 : index));
  });

  it.each([false, true])('does not replay a consumed endpoint request on later exploration, mode or profile changes, contrast=%s', async contrast => {
    externalFocus(); const app = await mountState(browse(1), contrast);
    next().focus(); await click(next()); expect(document.activeElement).toBe(pick(2));
    outside.focus(); await click(pick(1)); expect(document.activeElement).toBe(outside);
    const compareTab = q('#weld-stories-tab-compare'); compareTab.focus(); await click(compareTab);
    expect(document.activeElement).toBe(compareTab);
    const browseTab = q('#weld-stories-tab-browse'); browseTab.focus(); await click(browseTab);
    expect(document.activeElement).toBe(browseTab); expect(pick(1).getAttribute('aria-pressed')).toBe('true');
    const mike = [...node().querySelectorAll('button')].find(button => button.textContent.startsWith('Mike H.,'));
    mike.focus(); await click(mike); expect(document.activeElement).toBe(mike);
    expect(q('[data-career-milestone]').dataset.careerMilestone).toBe('mike');
    expect(app.latest()).toMatchObject(retained); expect(app.latest().cs_milestones).toEqual({ sarah: 1, mike: 1 });
  });
});

describe('Career same-age comparison keyboard and reader flow', () => {
  it.each([false, true])('hands endpoint navigation focus to the updated native age slider and retains interior button focus without saved writes, contrast=%s', async contrast => {
    const saved = compare(), app = await mountState(saved, contrast);
    await change(slider(), '26'); ageNext().focus(); await click(ageNext());
    expect(slider().value).toBe('34'); expect(document.activeElement).toBe(ageNext());
    await click(ageNext()); expect(slider().value).toBe('55'); expect(document.activeElement).toBe(ageNext());
    await click(ageNext()); expect(slider().value).toBe('58'); expect(ageNext().disabled).toBe(true);
    expect(document.activeElement).toBe(slider()); expect(slider().getAttribute('aria-valuetext')).toBe('Age 58 years');
    agePrevious().focus(); await click(agePrevious()); expect(slider().value).toBe('55'); expect(document.activeElement).toBe(agePrevious());
    for (const age of [34, 26, 24, 20]) { await click(agePrevious()); expect(slider().value).toBe(String(age)); expect(document.activeElement).toBe(agePrevious()); }
    await click(agePrevious()); expect(slider().value).toBe('18'); expect(agePrevious().disabled).toBe(true); expect(document.activeElement).toBe(slider());
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0); compareReadings();
  });

  it.each([false, true])('keeps both named live readings stable and related to the slider across stage, endpoint and unrecorded ages, contrast=%s', async contrast => {
    const saved = compare(), app = await mountState(saved, contrast), readings = compareReadings();
    const records = [], observers = readings.map(reading => {
      const observer = new MutationObserver(items => records.push(...items));
      observer.observe(reading, { subtree: true, childList: true, characterData: true }); return observer;
    });
    try {
      for (const age of [20, 24, 34, 34.25, 58]) {
        slider().focus(); await change(slider(), String(age)); expect(document.activeElement).toBe(slider());
        expect(compareReadings()).toEqual(readings);
        expect(readings[0].querySelector('h4').textContent).toBe('Sarah K., age ' + age);
        expect(readings[1].querySelector('h4').textContent).toBe('Mike H., age ' + age);
        expect(readings.every(reading => reading.dataset.age === String(age))).toBe(true);
        if (age === 34.25) expect(readings[0].textContent).toContain('No stage is recorded here.');
      }
      for (const observer of observers) records.push(...observer.takeRecords()); expect(records.length).toBeGreaterThan(0);
    } finally { observers.forEach(observer => observer.disconnect()); }
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('gives separate readout IDs when both slots show the same profile and updates names after a pair change, contrast=%s', async contrast => {
    const app = await mountState(compare([1, 1]), contrast), readings = compareReadings();
    expect(readings[0]).not.toBe(readings[1]);
    for (const reading of readings) expect(reading.querySelector('h4').textContent).toBe('Sarah K., age 18');
    const select = q('#car2-cmp-1'); select.focus(); await change(select, '9');
    expect(document.activeElement).toBe(select); expect(compareReadings()).toEqual(readings);
    expect(readings[1].querySelector('h4').textContent).toBe('Mike H., age 18');
    expect(app.latest().car2_cmp).toEqual([1, 9]); expect(app.latest()).toMatchObject(retained);
    expect(app.writes.every(([key]) => key === 'car2_cmp')).toBe(true);
  });

  it.each([false, true])('does not autofocus at the initial endpoint or replay endpoint focus on slider, pair or mode changes, contrast=%s', async contrast => {
    externalFocus(); const app = await mountState(compare(), contrast);
    expect(agePrevious().disabled).toBe(true); expect(document.activeElement).toBe(outside); expect(app.writes).toHaveLength(0);
    await change(slider(), '55'); ageNext().focus(); await click(ageNext()); expect(document.activeElement).toBe(slider());
    outside.focus(); await change(slider(), '26'); expect(document.activeElement).toBe(outside);
    const select = q('#car2-cmp-1'); select.focus(); await change(select, '4'); expect(document.activeElement).toBe(select);
    const browseTab = q('#weld-stories-tab-browse'); browseTab.focus(); await click(browseTab); expect(document.activeElement).toBe(browseTab);
    const compareTab = q('#weld-stories-tab-compare'); compareTab.focus(); await click(compareTab); expect(document.activeElement).toBe(compareTab);
    expect(slider().value).toBe('26'); expect(app.latest()).toMatchObject(retained);
  });
});
