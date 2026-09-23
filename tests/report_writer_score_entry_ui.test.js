// Step 4 (Assessment Scores) as a clinician uses it: the Add buttons, the
// entry guard, subtest scaled scores, and recording the score report's
// percentile and confidence interval. Rendered through React against the
// shipped module.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React;
let createRoot;
let ReportWriter;
beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  ReportWriter = window.AlloModules.ReportWriter;
});

let mounted = null;
afterEach(async () => {
  if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; }
});

const act = (fn) => React.act(async () => { await fn(); });
const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const setNative = (el, value) => {
  const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
};
const type = (el, value) => act(() => { setNative(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
const choose = (el, value) => act(() => { setNative(el, value); el.dispatchEvent(new Event('change', { bubbles: true })); });
const blurWith = (el, value) => act(() => { setNative(el, value); el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });

async function openScoreStep() {
  localStorage.clear();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const addToast = vi.fn();
  mounted = { host, root };
  await act(() => root.render(React.createElement(ReportWriter, {
    onClose: vi.fn(), callGemini: vi.fn(async () => '{}'), addToast, t: key => key,
    studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
  })));
  const steps = Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
  await click(steps[3]);
  return { host, addToast };
}
// aria-labelledby names a control from visible text; resolve it the way a
// screen reader does, so the test fails if an id reference breaks.
const accessibleName = (el) => el.getAttribute('aria-labelledby').split(/\s+/).map(id => document.getElementById(id).textContent.trim()).join(' ');
const rows = (host) => Array.from(host.querySelectorAll('button[aria-label^="Remove score entry:"]')).map(b => b.parentElement.textContent);
const toastsOf = (addToast, level) => addToast.mock.calls.filter(c => c[1] === level).map(c => String(c[0]));

describe('Step 4 score entry', () => {
  it('a preset score is added with the visible Add button and labelled by its own manual', async () => {
    const { host } = await openScoreStep();
    expect(accessibleName(host.querySelector('#rw-sub-Full-Scale-IQ-add'))).toBe('Add Full Scale IQ');
    const input = host.querySelector('input[aria-label="Score for Full Scale IQ"]');
    input.value = '75';
    await click(host.querySelector('#rw-sub-Full-Scale-IQ-add'));
    expect(rows(host).join('|')).toMatch(/Full Scale IQ.*75.*Very Low/);
  });

  it('an impossible score is refused, explained, and left in the box to fix', async () => {
    const { host, addToast } = await openScoreStep();
    const input = host.querySelector('input[aria-label="Score for Full Scale IQ"]');
    input.value = '7';
    await click(host.querySelector('#rw-sub-Full-Scale-IQ-add'));
    expect(rows(host)).toEqual([]);
    expect(toastsOf(addToast, 'error').join(' ')).toMatch(/scaled score/i);
    expect(input.value).toBe('7');
  });

  it('a custom subtest can be a scaled score, and is classified as one', async () => {
    const { host } = await openScoreStep();
    await type(host.querySelector('input[aria-label="Custom subtest name"]'), 'Block Design');
    await type(host.querySelector('#rw-custom-score'), '7');
    await choose(host.querySelector('#rw-custom-score-type'), 'scaled');
    await click(host.querySelector('button[aria-label="Add score entry"]'));
    const row = rows(host).join('|');
    expect(row).toMatch(/Block Design \(scaled\)/);
    expect(row).toMatch(/16%ile/);
    expect(row).not.toMatch(/Extremely Low/);
  });

  it('a second row for the same subtest is refused', async () => {
    const { host, addToast } = await openScoreStep();
    const input = host.querySelector('input[aria-label="Score for Full Scale IQ"]');
    input.value = '88';
    await click(host.querySelector('#rw-sub-Full-Scale-IQ-add'));
    await type(host.querySelector('input[aria-label="Custom subtest name"]'), 'full scale iq');
    await type(host.querySelector('#rw-custom-score'), '90');
    await click(host.querySelector('button[aria-label="Add score entry"]'));
    expect(rows(host)).toHaveLength(1);
    expect(toastsOf(addToast, 'error').join(' ')).toMatch(/already entered/);
  });

  it('the score report\'s percentile and interval can be recorded, and a bad value is refused', async () => {
    const { host, addToast } = await openScoreStep();
    const input = host.querySelector('input[aria-label="Score for Full Scale IQ"]');
    input.value = '88';
    await click(host.querySelector('#rw-sub-Full-Scale-IQ-add'));
    const toggle = host.querySelector('button[aria-controls^="rw-score-details-"]');
    expect(accessibleName(toggle)).toBe('+ %ile / CI / prior WISC-V — Full Scale IQ');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    const low = host.querySelector('input[id^="rw-ciLow-"]');
    await blurWith(low, '83');
    await blurWith(host.querySelector('input[id^="rw-ciHigh-"]'), '94');
    expect(rows(host).join('|')).toMatch(/95% CI 83–94/);

    await blurWith(host.querySelector('input[id^="rw-pct-"]'), '150');
    expect(toastsOf(addToast, 'error').join(' ')).toMatch(/between 0\.1 and 99\.9/);
    expect(rows(host).join('|')).not.toMatch(/150/);
    await blurWith(host.querySelector('input[id^="rw-pct-"]'), '23');
    expect(rows(host).join('|')).toMatch(/23%ile \(report\)/);

    const results = await axe.run(host, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] }, rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map(v => v.id)).toEqual([]);
  }, 30000);

  // WIAT-4 and KTEA-3 print 10- or 15-point descriptors, chosen in Q-global.
  // The same KTEA-3 75 is "Below average" on one and "Low" on the other.
  it('the descriptor scale is offered only where there is one, and relabels scores already entered', async () => {
    const { host } = await openScoreStep();
    expect(host.querySelector('#rw-descriptor-scale')).toBeNull();
    await choose(host.querySelector('select[aria-label="Select assessment"]'), 'KTEA-3');
    const scale = host.querySelector('#rw-descriptor-scale');
    expect(scale.value).toBe('15');
    expect(host.querySelector('label[for="rw-descriptor-scale"]').textContent).toMatch(/Descriptors/);
    host.querySelector('input[aria-label="Score for Reading Composite"]').value = '75';
    await click(host.querySelector('#rw-sub-Reading-Composite-add'));
    expect(rows(host).join('|')).toMatch(/Reading Composite.*75.*Below Average/);
    await choose(scale, '10');
    expect(rows(host).join('|')).toMatch(/Reading Composite.*75.*Low/);
    expect(rows(host).join('|')).not.toMatch(/Below Average/);
    // A score added after the change is labelled on the chosen scale too.
    host.querySelector('input[aria-label="Score for Math Composite"]').value = '85';
    await click(host.querySelector('#rw-sub-Math-Composite-add'));
    expect(rows(host).join('|')).toMatch(/Math Composite.*85.*Below Average/);

    const results = await axe.run(host, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] }, rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map(v => v.id)).toEqual([]);
  }, 30000);
});

async function importSnapshot(host, snapshot) {
  const steps = () => Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
  await click(steps()[9]);
  const area = host.querySelector('#rw-import-area');
  await act(() => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, JSON.stringify(snapshot)); area.dispatchEvent(new Event('input', { bubbles: true })); });
  await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
  return steps;
}

describe('a saved report keeps its descriptor scale', () => {
  it('reopening a KTEA-3 report scored on the 10-point scale shows that scale', async () => {
    const { host } = await openScoreStep();
    const steps = await importSnapshot(host, {
      schemaVersion: 2, reportTitle: 'Scale test', manualStudentName: 'Student A', studentAge: '8', selectedAssessment: 'KTEA-3',
      scoreEntries: [{ id: 's1', assessment: 'KTEA-3', subtest: 'Reading Composite', score: 75, scoreType: 'standard', descriptorScale: '10' }],
    });
    await click(steps()[3]);
    expect(host.querySelector('#rw-descriptor-scale').value).toBe('10');
    expect(rows(host).join('|')).toMatch(/Reading Composite.*75.*Low/);
  }, 30000);
});

describe('Step 5 fact review reads each scale in its own direction', () => {
  it('a LOW GARS-3 Autism Index is not flagged as a deficit; a low WISC-V score is', async () => {
    const { host } = await openScoreStep();
    const snapshot = {
      schemaVersion: 2, reportTitle: 'Direction test', manualStudentName: 'Student A', studentAge: '8', studentGrade: '3',
      scoreEntries: [
        { id: 's1', assessment: 'GARS-3', subtest: 'Autism Index', score: 50, scoreType: 'standard' },
        { id: 's2', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 70, scoreType: 'standard' },
      ],
      factChunks: [
        { id: 'c1', type: 'score', source: 'GARS-3', field: 'Autism Index', value: 50, scoreType: 'standard', verified: false },
        { id: 'c2', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 70, scoreType: 'standard', verified: false },
      ],
    };
    const steps = await importSnapshot(host, snapshot);
    await click(steps()[4]);
    await click(host.querySelector('button[aria-label="Verify all fact chunks"]'));
    const text = host.textContent;
    expect(text).toContain('Score of 50 (Unlikely) is within the expected range');
    expect(text).not.toMatch(/Score of 50 \(Unlikely\) warrants/);
    expect(text).toContain('Score of 70 (Very Low) warrants clinician review');
  }, 30000);
});
