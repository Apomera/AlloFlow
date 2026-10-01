// Reading scores from a pasted score report.
//
// WHY (2026-09-23): every score, percentile and confidence interval was retyped
// by hand from the publisher's score report, which is where transcription
// errors enter a psychoeducational report. The clinician can now paste the score
// table (or open the report file); it is read on the device, with no AI, and
// nothing is added until each row is ticked.
//
// The sample tables below are MODELED on composite and subtest score summaries;
// they are not copied from any publisher's report. The parser assumes no
// layout, so what these tests pin is how it tells the numbers on a line apart:
// the score must lie inside the line's interval or agree with its percentile.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let U, React, createRoot;
beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  U = window.AlloModules.ReportWriterUtils;
});

const WISC = `Composite Score Summary
Composite  Sum of Scaled Scores  Composite Score  Percentile Rank  95% Confidence Interval  Qualitative Description
Verbal Comprehension  VCI  18  95  37  88–103  Average
Visual Spatial  VSI  15  86  18  80-94  Low Average
Fluid Reasoning  FRI  20  100  50  93-107  Average
Working Memory  WMI  14  83  13  77-91  Low Average
Processing Speed  PSI  13  80  9  73-90  Low Average
Full Scale IQ  FSIQ  70  88  21  83-93  Low Average
Subtest Score Summary
Block Design  BD  25  9  37
Similarities  SI  20  8  25
Page 2 of 5
Report date 03/14/2026`;
const brief = (r) => [r.subtest, r.score, r.percentile, r.ciLow, r.ciHigh, r.include];
const codes = (r) => r.issues.map(i => i.code);

describe('reading a composite table', () => {
  const result = () => U.parseScoreReport(WISC, 'WISC-V');
  it('takes the composite score, not the sum of scaled scores beside it', () => {
    expect(result().rows.filter(r => r.known).map(brief)).toEqual([
      ['Verbal Comprehension', 95, 37, 88, 103, true],
      ['Visual Spatial', 86, 18, 80, 94, true],
      ['Fluid Reasoning', 100, 50, 93, 107, true],
      ['Working Memory', 83, 13, 77, 91, true],
      ['Processing Speed', 80, 9, 73, 90, true],
      // 70 is the sum of scaled scores and is in range; 88 lies in 83-93 and fits 21.
      ['Full Scale IQ', 88, 21, 83, 93, true],
    ]);
  });
  it('with no percentile column, the score is the number inside its interval', () => {
    const [r] = U.parseScoreReport('Full Scale IQ  FSIQ  70  88  83-93', 'WISC-V').rows;
    expect([r.score, r.ciLow, r.ciHigh, r.include]).toEqual([88, 83, 93, true]);
  });
  it('with no interval, the score is the number its percentile fits', () => {
    const [r] = U.parseScoreReport('Full Scale IQ  FSIQ  70  88  21', 'WISC-V').rows;
    expect([r.score, r.percentile, r.include]).toEqual([88, 21, true]);
  });
  it('finds the interval level the report states, and keeps the report\'s labels', () => {
    const r = result();
    expect(r.ciLevel).toBe(95);
    expect(r.rows.find(x => x.subtest === 'Full Scale IQ').reportLabel).toBe('Low Average');
    expect(r.rows.every(x => !codes(x).includes('label_differs'))).toBe(true);
  });
  it('offers subtests the presets do not list as scaled scores, unticked, and ignores page furniture', () => {
    const others = result().rows.filter(r => !r.known);
    expect(others.map(r => [r.subtest, r.scoreType, r.score, r.percentile, r.include])).toEqual([
      ['Block Design', 'scaled', 9, 37, false], ['Similarities', 'scaled', 8, 25, false]]);
  });
});

describe('what keeps a row unticked', () => {
  const one = (text, assessment = 'WISC-V', opts) => U.parseScoreReport(text, assessment, opts).rows;
  it('no evidence: prose, or a number with neither an interval nor a fitting percentile', () => {
    const [r] = one('Her Verbal Comprehension score of 95 falls in the Average range, and the 2019 evaluation found 91.');
    expect(r.include).toBe(false);
    expect(codes(r)).toContain('no_evidence');
    expect(r.percentile).toBeNull();
    expect(one('Numerical Operations 88', 'WIAT-4')[0].include).toBe(false);
  });
  it('a score outside its own interval', () => {
    const [r] = one('Fluid Reasoning 100 50 70-80');
    expect(r.include).toBe(false);
    expect(codes(r)).toContain('score_outside_interval');
  });
  it('a subtest already entered, or listed twice', () => {
    expect(codes(one('Working Memory 83 13 77-91', 'WISC-V', { existing: new Set(['working memory']) })[0])).toContain('already_entered');
    const rows = one('Full Scale IQ 88 21 83-93\nFull Scale IQ 88 21 83-93');
    expect(rows.map(r => r.include)).toEqual([true, false]);
    expect(codes(rows[1])).toContain('duplicate');
  });
});

describe('percentiles, T-scores and labels', () => {
  it('a percentile that does not fit the score is not recorded', () => {
    const [ok, bad] = U.parseScoreReport('Word Reading 94 34 Average\nSpelling 85 50 Average', 'WIAT-4').rows;
    expect([ok.percentile, bad.percentile]).toEqual([34, null]);
    // With no evidence for any number, the first plausible one is shown, unticked.
    expect([bad.score, bad.include]).toEqual([85, false]);
    expect(codes(bad)).toContain('percentile_mismatch');
  });
  it('"<0.1" is recorded as 0.1 and said so', () => {
    const [r] = U.parseScoreReport('Processing Speed PSI 5 50 <0.1 46-62 Extremely Low', 'WISC-V').rows;
    expect([r.score, r.percentile, r.ciLow, r.ciHigh, r.include]).toEqual([50, 0.1, 46, 62, true]);
    expect(codes(r)).toContain('percentile_bound');
  });
  it('T-scores are read with their percentile ranks', () => {
    const rows = U.parseScoreReport('Hyperactivity 65 91 At-Risk\nAnxiety 72 97 Clinically Significant\nSocial Skills 38 12 At-Risk', 'BASC-3 (Parent)').rows;
    expect(rows.map(r => [r.subtest, r.scoreType, r.score, r.percentile, r.reportLabel, r.include])).toEqual([
      ['Hyperactivity', 'T-score', 65, 91, 'At-Risk', true],
      ['Anxiety', 'T-score', 72, 97, 'Clinically Significant', true],
      ['Social Skills', 'T-score', 38, 12, 'At-Risk', true]]);
  });
  it('a report label that is not AlloFlow\'s label for the score is noted', () => {
    const [r] = U.parseScoreReport('Verbal Comprehension 95 37 88-103 Low Average', 'WISC-V').rows;
    expect(r.issues.find(i => i.code === 'label_differs')).toMatchObject({ report: 'Low Average', ours: 'Average' });
  });
});

// Calibrated 2026-09-23 against publisher sample reports and manuals (sources in
// docs/clinical_validation_log.md 3e). Real score/percentile pairs are used where
// the research found them; the lines follow each publisher's column order.
describe('calibrated against publisher samples', () => {
  const read = (text, assessment) => U.parseScoreReport(text, assessment).rows.map(r => [r.subtest, r.score, r.percentile, r.ciLow, r.ciHigh, r.include]);
  it('normalized batteries: a percentile more than 1 point off the normal curve is rejected', () => {
    // Printed WISC-V pairs sit within 0.54 of the curve (WMI 82 -> 12; normal 11.51).
    expect(read('Working Memory 82 12 76-90', 'WISC-V')).toEqual([['Working Memory', 82, 12, 76, 90, true]]);
    const [off] = U.parseScoreReport('Full Scale IQ 88 24 83-93', 'WISC-V').rows;
    expect([off.percentile, codes(off)]).toEqual([null, ['percentile_mismatch']]);
  });
  it('BASC-3: linear T-scores, so a large gap from the normal curve is still the real percentile', () => {
    // Real pairs: TRS Aggression T 47 -> 48 (+9.8); SRP Alcohol Abuse T 53 -> 75 (+13.2);
    // Conduct Problems T 40 -> 8 (-7.9). Raw score first, 90% CI last.
    expect(read('Aggression 4 47 48 42-52\nHyperactivity 12 65 91 59-71', 'BASC-3 (Teacher)'))
      .toEqual([['Aggression', 47, 48, 42, 52, true], ['Hyperactivity', 65, 91, 59, 71, true]]);
    // Without an interval, the raw score is told apart by direction.
    expect(read('Aggression 4 47 48\nHyperactivity 12 65 91', 'BASC-3 (Teacher)'))
      .toEqual([['Aggression', 47, 48, null, null, true], ['Hyperactivity', 65, 91, null, null, true]]);
  });
  it('BRIEF-2: "> 99" is a bound, and a hyphenated scale the presets lack is offered', () => {
    const rows = U.parseScoreReport('Initiate 20 75 > 99 70-80\nSelf-Monitor 9 51 71\nShift 14 57 79', 'BRIEF-2').rows;
    expect(rows.map(r => [r.subtest, r.score, r.percentile, r.include])).toEqual([['Initiate', 75, 99, false], ['Self-Monitor', 51, 71, false], ['Shift', 57, 79, true]]);
    expect(codes(rows[0])).toContain('percentile_bound');
  });
  it('Conners 4: an interval before an ordinal percentile', () => {
    expect(read('Hyperactivity 20 58 55–61 84th Average', 'Conners-4')).toEqual([['Hyperactivity', 58, 84, 55, 61, true]]);
  });
  it('WIAT-4 and Vineland-3: the interval before the percentile; "<1" and the stated level', () => {
    const wiat = U.parseScoreReport('90% Confidence Interval\nWord Reading 94 87-101 34 Average', 'WIAT-4');
    expect([wiat.ciLevel, ...read('Word Reading 94 87-101 34 Average', 'WIAT-4')]).toEqual([90, ['Word Reading', 94, 34, 87, 101, true]]);
    expect(read('Socialization 57 51-63 <1 Low', 'Vineland-3')).toEqual([['Socialization', 57, 1, 51, 63, true]]);
  });
  it('KTEA-3 ">99.9", CELF-5 intervals written "to", BOT-2 "± 5" bands', () => {
    expect(read('Math Composite 152 146-158 >99.9 Very high', 'KTEA-3')).toEqual([['Math Composite', 152, 99.9, 146, 158, true]]);
    expect(read('Core Language 80 74 to 86 9 5 to 16 Below average', 'CELF-5')).toEqual([['Core Language', 80, 9, 74, 86, true]]);
    expect(read('Total Motor Composite 45 ± 5 40-50 31', 'BOT-2')).toEqual([['Total Motor Composite', 45, 31, 40, 50, true]]);
  });
  it('WJ IV: either layout, with RPI fractions, age and grade equivalents around the score', () => {
    const au = U.parseScoreReport('SS (68% Band)\nLetter-Word Identification 489 4.6 3.9-5.6 9-9 82/90 94 (88-100) 34', 'WJ-IV ACH');
    expect(au.ciLevel).toBe(68);
    expect(au.rows.map(r => [r.subtest, r.score, r.percentile, r.ciLow, r.ciHigh, r.include])).toEqual([['Letter-Word ID', 94, 34, 88, 100, true]]);
    // US layout: the percentile and its band come BEFORE the standard score.
    expect(read('Letter-Word Identification 4.6 9-9 82/90 34 (27-41) 94', 'WJ-IV ACH')).toEqual([['Letter-Word ID', 94, 34, null, null, true]]);
    // WJ IV rounds the score before printing: a real pair 1.49 off the curve.
    const [aa] = U.parseScoreReport('Academic Applications 104 (98-110) 62', 'WJ-IV ACH').rows;
    expect([aa.score, aa.percentile]).toEqual([104, 62]);
  });
  it('SRS-2 prints no percentile: the last plausible number is the T-score, said so', () => {
    const rows = U.parseScoreReport('Social Awareness 12 66\nTotal Score 95 72', 'SRS-2').rows;
    expect(rows.map(r => [r.subtest, r.score, r.include])).toEqual([['Social Awareness', 66, true], ['Total Score', 72, true]]);
    expect(codes(rows[0])).toEqual(['no_percentile_printed']);
  });
});

describe('the descriptor scale the report used', () => {
  it('WIAT-4 labels that only the 15-point scale gives are recognised as such', () => {
    const r = U.parseScoreReport('Reading Composite 75 5 70-81 Below average\nWord Reading 84 14 Below average', 'WIAT-4', { descriptorScale: '10' });
    expect(r.descriptorScale).toBe('15');
    expect(r.rows.every(x => !codes(x).includes('label_differs'))).toBe(true);
  });
  it('KTEA-3 10-point labels are recognised as such', () => {
    const r = U.parseScoreReport('Reading Composite 75 5 70-81 Low\nMath Composite 85 16 79-92 Below average', 'KTEA-3');
    expect(r.descriptorScale).toBe('10');
  });
});

describe('in Step 4', () => {
  let mounted = null;
  afterEach(async () => { if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; } });
  const act = (fn) => React.act(async () => { await fn(); });
  const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const typeInto = (el, value) => act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const choose = (el, value) => act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const rows = (host) => Array.from(host.querySelectorAll('button[aria-label^="Remove score entry:"]')).map(b => b.parentElement.textContent);

  it('reads the pasted table, adds only the ticked rows with their percentile and interval, and clears the text', async () => {
    localStorage.clear();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const addToast = vi.fn();
    mounted = { host, root };
    await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
      onClose() {}, callGemini: async () => '{}', addToast, t: key => key,
      studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
    })));
    await click(Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'))[3]);
    await typeInto(host.querySelector('#rw-report-paste'), WISC);
    await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent === 'Read scores'));
    // Six composites ticked; two unlisted subtests offered unticked.
    const boxes = Array.from(host.querySelectorAll('input[id^="rw-paste-row-"]'));
    expect(boxes).toHaveLength(8);
    expect(boxes.filter(b => b.checked)).toHaveLength(6);
    const nameOf = (b) => document.getElementById(b.getAttribute('aria-labelledby')).textContent;
    expect(host.querySelector('#rw-paste-ci-level').value).toBe('95');
    const results = await axe.run(host, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] }, rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map(v => v.id)).toEqual([]);
    // The clinician corrects the level to what the report says.
    await choose(host.querySelector('#rw-paste-ci-level'), '90');
    // Leave out Processing Speed; add Block Design as a scaled subtest.
    await click(boxes.find(b => nameOf(b) === 'Processing Speed'));
    await click(boxes.find(b => nameOf(b).startsWith('Block Design')));
    await click(Array.from(host.querySelectorAll('button')).find(b => /^Add 6 selected/.test(b.textContent)));
    const added = rows(host).join('|');
    expect(rows(host)).toHaveLength(6);
    expect(added).toMatch(/Full Scale IQ.*88.*Low Average.*21%ile \(report\).*90% CI 83–93/);
    expect(added).toMatch(/Block Design \(scaled\).*9.*37%ile \(report\)/);
    expect(added).not.toMatch(/Processing Speed/);
    expect(host.querySelector('#rw-report-paste').value).toBe('');
    expect(addToast.mock.calls.map(c => String(c[0])).join(' ')).toMatch(/Added 6 score\(s\) from the score report/);
    // Read again: what is entered is not offered twice.
    await typeInto(host.querySelector('#rw-report-paste'), WISC);
    await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent === 'Read scores'));
    const again = Array.from(host.querySelectorAll('input[id^="rw-paste-row-"]'));
    expect(again.filter(b => b.checked).map(nameOf)).toEqual(['Processing Speed']);
  }, 60000);

  it('a WIAT-4 report on the 15-point scale switches the descriptor scale when its rows are added', async () => {
    localStorage.clear();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    mounted = { host, root };
    await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
      onClose() {}, callGemini: async () => '{}', addToast() {}, t: key => key,
      studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
    })));
    await click(Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'))[3]);
    await choose(host.querySelector('select[aria-label="Select assessment"]'), 'WIAT-4');
    expect(host.querySelector('#rw-descriptor-scale').value).toBe('10');
    await typeInto(host.querySelector('#rw-report-paste'), 'Reading Composite 75 5 70-81 Below average\nWord Reading 84 14 76-92 Below average');
    await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent === 'Read scores'));
    expect(host.textContent).toMatch(/labels match the Pearson 15-point scale/);
    await click(Array.from(host.querySelectorAll('button')).find(b => /^Add 2 selected/.test(b.textContent)));
    expect(host.querySelector('#rw-descriptor-scale').value).toBe('15');
    expect(rows(host).join('|')).toMatch(/Reading Composite.*75.*Below Average/);
  }, 60000);
});
