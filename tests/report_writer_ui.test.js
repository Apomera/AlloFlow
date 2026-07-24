import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
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
  loadAlloModule('report_writer_module.js');
  ReportWriter = window.AlloModules.ReportWriter;
  if (typeof ReportWriter !== 'function') throw new Error('ReportWriter module did not register');
});

const click = async (element) => {
  await React.act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

describe('Report Writer workflow shell', () => {
  it('renders an accessible modal and all ten correctly named wizard steps', async () => {
    localStorage.clear();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const onClose = vi.fn();

    await React.act(async () => {
      root.render(React.createElement(ReportWriter, {
        onClose,
        callGemini: vi.fn(async () => '{"results":[]}'),
        addToast: vi.fn(),
        t: key => key,
        studentNickname: 'Student A',
        behaviorLensData: null,
        longitudinalData: null,
        dashboardData: []
      }));
    });

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('rw-dialog-title');
    expect(dialog.id).toBe('rw-dialog-surface');
    expect(document.getElementById('rw-a11y-css').textContent).toContain('min-height: 24px');

    const stepNav = host.querySelector('nav[aria-label="Report Writer steps"]');
    const stepButtons = Array.from(stepNav.querySelectorAll('button'));
    expect(stepButtons).toHaveLength(10);
    expect(stepButtons.map(button => button.getAttribute('aria-label'))).toEqual([
      'Step 1: Student Selection', 'Step 2: Background & History', 'Step 3: Clinical Observations',
      'Step 4: Assessment Scores', 'Step 5: Fact Chunk Review', 'Step 6: Diagnostic Hypotheses',
      'Step 7: Report Blueprint', 'Step 8: Generate Report', 'Step 9: Accuracy Dashboard',
      'Step 10: Export & Save'
    ]);
    expect(stepButtons[0].getAttribute('aria-current')).toBe('step');

    await click(stepButtons[9]);
    expect(host.querySelector('button[aria-label="Load report JSON"]')).toBeTruthy();
    expect(host.querySelector('button[aria-label="Copy reviewed report to clipboard"]').disabled).toBe(true);
    expect(host.querySelector('button[aria-label="Print report or save as PDF"]').disabled).toBe(true);
    expect(host.textContent).toContain('Session-only mode');

    await click(host.querySelector('button[aria-label="Start a new report"]'));
    const confirmation = host.querySelector('[role="alertdialog"]');
    expect(confirmation).toBeTruthy();
    expect(confirmation.getAttribute('aria-modal')).toBe('true');
    expect(confirmation.getAttribute('aria-labelledby')).toBe('rw-confirm-title');
    expect(confirmation.getAttribute('aria-describedby')).toBe('rw-confirm-description');
    expect(host.querySelector('button[aria-label="Close report writer"]').getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('button[aria-label="Close report writer"]').hasAttribute('inert')).toBe(true);
    const navigationBackground = stepNav.closest('[aria-hidden="true"]');
    expect(navigationBackground).toBeTruthy();
    expect(navigationBackground.hasAttribute('inert')).toBe(true);
    expect(document.activeElement.textContent).toBe('Cancel');
    await React.act(async () => {
      confirmation.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(host.querySelector('button[aria-label="Close report writer"]').getAttribute('aria-hidden')).toBeNull();
    expect(host.querySelector('button[aria-label="Close report writer"]').hasAttribute('inert')).toBe(false);
    expect(navigationBackground.getAttribute('aria-hidden')).toBeNull();
    expect(navigationBackground.hasAttribute('inert')).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    await React.act(async () => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    await React.act(async () => root.unmount());
    host.remove();
  });

  it('passes axe-core structural checks across all ten populated wizard steps', async () => {
    localStorage.clear();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);

    await React.act(async () => {
      root.render(React.createElement(ReportWriter, {
        onClose: vi.fn(),
        callGemini: vi.fn(async () => '{"results":[]}'),
        addToast: vi.fn(),
        t: key => key,
        studentNickname: 'Student A',
        behaviorLensData: null,
        longitudinalData: null,
        dashboardData: []
      }));
    });

    const initialSteps = Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
    await click(initialSteps[9]);
    const snapshot = {
      schemaVersion: 2,
      reportTitle: 'Runtime Accessibility Test Report',
      manualStudentName: 'Student A',
      studentAge: '10',
      studentGrade: '5',
      selectedAssessment: 'WISC-V',
      scoreEntries: [{
        id: 'score-1',
        assessment: 'WISC-V',
        subtest: 'Full Scale IQ',
        score: 100,
        scoreType: 'standard',
        classification: 'Average'
      }],
      bgSections: {
        referralReason: 'Runtime accessibility test',
        developmental: '',
        medical: '',
        educational: '',
        social: '',
        behavioral: '',
        observations: ''
      },
      factChunks: [{
        id: 'chunk-1',
        type: 'score',
        source: 'WISC-V',
        field: 'Full Scale IQ',
        value: '100',
        classification: 'Average',
        verified: true,
        immutable: true
      }],
      reportSections: {
        Summary: '[Student] obtained a Full Scale IQ score of 100, classified as Average.'
      },
      hypotheses: ['No Diagnosis / Does Not Qualify'],
      selectedHypotheses: [],
      blueprint: [{ id: 'section-1', name: 'Summary', notes: '', enabled: true }],
      reportType: 'Psychoeducational',
      reportGenPasses: 3,
      sectionEvidenceMap: { Summary: ['chunk-1'] },
      translatedReport: 'مسودة تقرير مترجم',
      translationLang: 'Arabic'
    };
    const textarea = host.querySelector('#rw-import-area');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    await React.act(async () => {
      valueSetter.call(textarea, JSON.stringify(snapshot));
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const importButton = Array.from(host.querySelectorAll('button')).find(button => button.textContent.includes('Import Data'));
    expect(importButton).toBeTruthy();
    await click(importButton);

    const violations = [];
    for (let index = 0; index < 10; index += 1) {
      const stepButtons = Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
      expect(stepButtons[index].disabled).toBe(false);
      await click(stepButtons[index]);
      if (index === 9) expect(host.querySelector('pre[lang="ar"][dir="rtl"]')).toBeTruthy();
      const results = await axe.run(host, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']
        },
        rules: {
          'color-contrast': { enabled: false }
        }
      });
      violations.push(...results.violations.map(violation => ({
        step: index + 1,
        id: violation.id,
        targets: violation.nodes.flatMap(node => node.target)
      })));
    }

    expect(violations).toEqual([]);
    await React.act(async () => root.unmount());
    host.remove();
  }, 30000);

});

describe('Report Writer safety helpers', () => {
  it('uses assessment-aware score direction and metrics', () => {
    const utils = window.AlloModules.ReportWriterUtils;
    expect(utils.classifyDisplayScore(36, 'standard', 'BOT-2', 'Total Motor Composite').label).toBe('Below Average');
    expect(utils.classifyDisplayScore(33, 'T-score', 'BASC-3 (Parent)', 'Leadership').label).toBe('At-Risk');
    expect(utils.classifyDisplayScore(72, 'T-score', 'BASC-3 (Teacher)', 'Attention Problems').label).toBe('Clinically Significant');
  });

  it('escapes print and trend-chart text before HTML insertion', () => {
    const utils = window.AlloModules.ReportWriterUtils;
    expect(utils.escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    const svg = utils.renderTrendSvg([{ label: '<script>alert(1)</script>', grade: '3" onload="alert(1)', benchmark: 10, points: [{ value: 8 }] }]);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&quot; onload=&quot;');
  });

  it('rejects malformed or unsupported report JSON schemas', () => {
    const utils = window.AlloModules.ReportWriterUtils;
    expect(() => utils.validateReportPayload({ schemaVersion: 999 })).toThrow(/Unsupported report schema/);
    expect(() => utils.validateReportPayload({ reportSections: { Summary: 42 } })).toThrow(/text name and value/);
    expect(() => utils.validateReportPayload({ scoreEntries: [{ assessment: 'WISC-V', subtest: 'FSIQ', score: 'not-a-number' }] })).toThrow(/Score row 1/);
  });

  it('strictly normalizes imported psycheck payloads and prevents source spoofing', () => {
    const utils = window.AlloModules.ReportWriterUtils;
    const normalized = utils.validateDiscrepancyPayload({
      discrepancies: [{
        kind: 'score_mismatch',
        detail: 'The score differs',
        assessment: 'WISC-V',
        span: { start: 4, end: 9, text: 'score 99' },
        unexpected: 'discard me'
      }],
      verified: [{ value: 100, assessment: 'WISC-V', subtest: 'FSIQ' }],
      omitted_scores: [],
      _source: 'alloflow-inline',
      unexpectedTopLevel: 'discard me'
    });
    expect(normalized._source).toBe('psycheck-import');
    expect(Number.isNaN(Date.parse(normalized._timestamp))).toBe(false);
    expect(normalized.discrepancies[0].unexpected).toBeUndefined();
    expect(normalized.unexpectedTopLevel).toBeUndefined();
    expect(normalized.verified).toHaveLength(1);
    expect(normalized.inconclusive).toEqual([]);
  });

  it('rejects malformed, oversized, or unsafe psycheck entries', () => {
    const validate = window.AlloModules.ReportWriterUtils.validateDiscrepancyPayload;
    expect(() => validate({ discrepancies: [{ kind: 'score_mismatch', detail: {} }] })).toThrow(/must be text/);
    expect(() => validate({ discrepancies: [{ kind: 'score_mismatch' }] })).toThrow(/detail is required/);
    expect(() => validate({ discrepancies: [{ kind: 'score_mismatch', detail: 'x'.repeat(20001) }] })).toThrow(/too large/);
    expect(() => validate({ discrepancies: [], citations_extracted: -1 })).toThrow(/non-negative integer/);
    expect(() => validate({ discrepancies: [], constructor: 'unsafe' })).toThrow(/unsafe field name/);
    expect(() => validate({ discrepancies: [{ kind: 'score_mismatch', detail: 'x', span: { start: 9, end: 4 } }] })).toThrow(/cannot precede/);
  });

  it('does not retain the partial-report legacy accuracy implementation', () => {
    const source = readFileSync(resolve(process.cwd(), 'report_writer_module.js'), 'utf8');
    expect(source).not.toContain('runAccuracyCheckLegacy');
    expect(source).not.toContain('substring(0, 6000)');
  });


  it('builds escaped, responsive, semantically structured print HTML', async () => {
    const utils = window.AlloModules.ReportWriterUtils;
    const html = utils.buildReportPrintHtml({
      reportTitle: 'Evaluation <Draft>',
      studentName: 'Case $& <A>',
      studentAge: '10',
      studentGrade: '5',
      reportSections: {
        'Summary <script>': '[Student] completed testing.\n\n<script>alert(1)</script>'
      },
      rtiTrendSeries: [{
        label: 'Reading progress',
        benchmark: 10,
        points: [{ value: 8 }, { value: 11 }]
      }],
      isDemo: true
    });

    expect(html.startsWith('<!doctype html><html lang="en">')).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<meta name="viewport" content="width=device-width,initial-scale=1">');
    expect(html).toContain('<header>');
    expect(html).toContain('<main>');
    expect(html).toContain('<section aria-labelledby="rw-print-section-1">');
    expect(html).toContain('<footer>');
    expect(html).toContain('role="note"');
    expect(html).toContain('aria-hidden="true" class="demo-watermark"');
    expect(html).toContain('Case $&amp; &lt;A&gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('style="max-width:100%;height:auto"');
    expect(html).toContain('@media(max-width:480px)');
    expect(html).toContain('text-align:left');
    expect(html).not.toContain('text-align:justify');
    expect(html).toContain('color:#595959');

    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      const results = await axe.run(host, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']
        },
        rules: {
          'color-contrast': { enabled: false }
        }
      });
      expect(results.violations.map(violation => ({
        id: violation.id,
        targets: violation.nodes.flatMap(node => node.target)
      }))).toEqual([]);
    } finally {
      host.remove();
    }
  }, 15000);

  it('maps translated output to valid language and direction metadata', () => {
    const utils = window.AlloModules.ReportWriterUtils;
    expect(utils.getTranslationLanguageMeta('Arabic')).toEqual({ code: 'ar', dir: 'rtl' });
    expect(utils.getTranslationLanguageMeta('Urdu')).toEqual({ code: 'ur', dir: 'rtl' });
    expect(utils.getTranslationLanguageMeta('Chinese (Traditional)')).toEqual({ code: 'zh-Hant', dir: 'ltr' });
    expect(utils.getTranslationLanguageMeta('Unknown')).toEqual({ code: 'en', dir: 'ltr' });

    const reportSource = readFileSync(resolve(process.cwd(), 'report_writer_module.js'), 'utf8');
    const start = reportSource.indexOf('const translateReport = async () =>');
    const end = reportSource.indexOf('const copyTranslatedReport = () =>', start);
    const translateSource = reportSource.slice(start, end);
    expect(translateSource).toContain('callGemini(prompt, false)');
    expect(translateSource).not.toContain('callGemini(prompt, true)');
  });

});
