// Report Writer reference library, retrieved per section with Lumen's evidence
// core instead of truncated.
//
// WHY (2026-09-23): the clinician's references (state regulations, district
// criteria, manual excerpts) were joined and cut to their first 3000
// characters for EVERY prompt, with no notice. A regulation's eligibility
// criteria sit far past that, so the model never saw them and every section got
// the same opening text. Now each reference is split into passages by
// window.LumenEvidence (the pure, local core Lumen Study and the Content Engine
// already use), headings in regulation numbering are kept as citations, clinical
// queries are expanded ("SLD" -> "specific learning disability"), and the
// passages are citable in USED_CHUNKS.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let U;
let Lumen;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('stem_lab/stem_lumen_evidence.js');
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  U = window.AlloModules.ReportWriterUtils;
  Lumen = window.LumenEvidence;
  if (!Lumen) throw new Error('LumenEvidence did not load');
});

// A regulation-shaped reference: numbered headings, procedural filler, and the
// SLD criteria far past character 3000.
const filler = (n) => Array.from({ length: n }, (_, i) =>
  `The public agency shall ensure that procedural step ${i + 1} is documented, that notices are provided in the parent's native language, and that timelines in this chapter are followed for every referral.`).join('\n\n');
const MUSER = [
  'Chapter 101', 'Maine Unified Special Education Regulation',
  'VII.1. Child Find', filler(14),
  'VII.2. Disability Categories', filler(10),
  'VII.2.L. Specific Learning Disability',
  'The team may determine that a child has a specific learning disability if the child does not achieve adequately for the child\'s age or meet state-approved grade-level standards in one or more of the following areas when provided with learning experiences and instruction appropriate for the child\'s age.',
  'The team may also consider whether the child exhibits a pattern of strengths and weaknesses in performance, achievement, or both, relative to age, state-approved grade-level standards, or intellectual development.',
  'VII.2.M. Speech or Language Impairment', filler(4),
].join('\n\n');
const LIB = [{ id: 'r1', name: 'MUSER Ch. 101', text: MUSER }];

describe('heading marks', () => {
  it('turns regulation and manual headings into headings and leaves numbered sentences as content', () => {
    const marked = U.markReferenceHeadings([
      'VII.2.L. Specific Learning Disability', '§ 300.307 Specific learning disabilities.', 'Chapter 101', 'Section 3.2 Eligibility',
      '1.2 Students must be evaluated in all areas of suspected disability.',
      'The team met on 3.4 occasions.',
    ].join('\n'));
    expect(marked).toMatch(/^# VII\.2\.L\. Specific Learning Disability$/m);
    expect(marked).toMatch(/^# § 300\.307/m);
    expect(marked).toMatch(/^# Chapter 101$/m);
    expect(marked).toMatch(/^# Section 3\.2 Eligibility$/m);
    expect(marked).not.toMatch(/^# 1\.2 Students/m);
    expect(marked).not.toMatch(/^# The team/m);
  });
});

describe('query expansion', () => {
  it('adds clinical synonyms and singular/plural forms', () => {
    const q = U.expandClinicalQuery('SLD weakness disabilities');
    expect(q).toMatch(/specific learning disability/);
    expect(q).toMatch(/\bweaknesses\b/);
    expect(q).toMatch(/\bdisability\b/);
  });
  it('is needed: Lumen alone finds nothing for the acronym', () => {
    const project = Lumen.upsertSource(Lumen.makeProject({ id: 'p' }), { id: 's', title: 'M', content: MUSER });
    expect(Lumen.retrieve(project, 'SLD')).toEqual([]);
  });
});

describe('retrieval for a section', () => {
  it('finds the SLD criteria that the old 3000-character cut never reached, with their citation', () => {
    expect(MUSER.indexOf('does not achieve adequately')).toBeGreaterThan(3000);
    const r = U.referencePassages(LIB, 'Eligibility Considerations Specific Learning Disability — Reading WISC-V');
    expect(r.mode).toBe('retrieved');
    const hit = r.passages.find(p => /does not achieve adequately/.test(p.content));
    expect(hit, 'criteria passage retrieved').toBeTruthy();
    expect(hit.heading).toBe('VII.2.L. Specific Learning Disability');
    expect(hit.id).toMatch(/^ref:ev_/);
  });
  it('an acronym-only query reaches the criteria (Lumen alone returns nothing for it)', () => {
    const r = U.referencePassages(LIB, 'SLD');
    expect(r.passages.some(p => /specific learning disability/i.test(p.content))).toBe(true);
  });
  it('stays within the character budget', () => {
    // Ten ~1000-character paragraphs that all match: 8 passages would be ~8000.
    const para = (i) => `Accommodation ${i}: ` + 'Provide extended time and a reduced-distraction setting for assessments and classroom tests. '.repeat(10);
    const big = [{ id: 'r2', name: 'Accommodations guide', text: Array.from({ length: 10 }, (_, i) => para(i)).join('\n\n') }];
    const r = U.referencePassages(big, 'accommodations extended time assessments');
    expect(r.passages.length).toBeGreaterThan(1);
    expect(r.passages.reduce((n, p) => n + p.content.length, 0)).toBeLessThanOrEqual(6000);
  });
  it('the prompt block labels each passage with its id, reference and heading, and says what was left out', () => {
    const block = U.referencePromptBlock(U.referencePassages(LIB, 'Specific Learning Disability'), 1);
    expect(block).toMatch(/\[ref:ev_\w+\] MUSER Ch\. 101 — VII\.2\.L\. Specific Learning Disability/);
    expect(block).toMatch(/other parts were not provided/);
  });
  it('end to end: the section prompt carries the relevant passage, and the model can cite it', async () => {
    const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const React = window.React;
    const prompts = [];
    const callGemini = async (prompt) => {
      if (String(prompt).includes('You are writing the "Summary" section')) {
        prompts.push(String(prompt));
        const refId = (String(prompt).match(/\[(ref:ev_\w+)\]/) || [])[1];
        return '[Student] earned a Full Scale IQ of 102 on the WISC-V.\nUSED_CHUNKS: c1' + (refId ? ', ' + refId : '');
      }
      return '{"errors":[]}';
    };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const act = (fn) => React.act(async () => { await fn(); });
    const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const typeInto = (el, value) => act(() => {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    try {
      await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
        onClose() {}, callGemini, addToast() {}, t: key => key,
        studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
      })));
      const steps = () => Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
      await click(steps()[9]);
      await typeInto(host.querySelector('#rw-import-area'), JSON.stringify({
        schemaVersion: 2, reportTitle: 'Retrieval test', manualStudentName: 'Student A',
        scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 102, scoreType: 'standard' }],
        factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 102, verified: true, immutable: true }],
        selectedHypotheses: ['Specific Learning Disability — Reading'],
        blueprint: [{ id: 'b1', name: 'Summary', notes: '', enabled: true }],
        reportGenPasses: 1,
      }));
      await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
      await click(steps()[1]);
      await typeInto(host.querySelector('input[aria-label="Reference name"]'), 'MUSER Ch. 101');
      await typeInto(host.querySelector('textarea[aria-label="Reference text"]'), MUSER);
      await click(host.querySelector('button[aria-label="Add reference"]'));
      await click(steps()[7]);
      await click(host.querySelector('button[aria-label="Generate report"]'));
      for (let i = 0; i < 200 && host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy') === 'true'; i++) {
        await act(() => new Promise(r => setTimeout(r, 10)));
      }
      expect(prompts).toHaveLength(1);
      expect(prompts[0]).toContain('does not achieve adequately');
      expect(prompts[0]).toContain('VII.2.L. Specific Learning Disability');
      expect(prompts[0]).not.toContain('USER-PROVIDED REFERENCES');
      // The cited passage survives as evidence and is labelled by its source.
      expect(host.textContent).toContain('📖 MUSER Ch. 101');

      // The accuracy audit is given the same passages, so a statement of what
      // the regulation says can be verified rather than marked unsourced.
      const auditPrompts = [];
      const auditCall = callGemini;
      prompts.length = 0;
      await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
        onClose() {}, addToast() {}, t: key => key,
        callGemini: async (p) => { if (String(p).includes('You are a clinical accuracy auditor')) { auditPrompts.push(String(p)); return '{"results":[]}'; } return auditCall(p); },
        studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
      })));
      await click(steps()[8]);
      const auditButton = host.querySelector('button[aria-label="Run accuracy check"]') || host.querySelector('button[aria-label="Re-check accuracy"]');
      await click(auditButton);
      for (let i = 0; i < 200 && auditPrompts.length === 0; i++) await act(() => new Promise(r => setTimeout(r, 10)));
      expect(auditPrompts.length).toBeGreaterThan(0);
      expect(auditPrompts[0]).toContain('does not achieve adequately');
      expect(auditPrompts[0]).toMatch(/verified only if one of these passages says it/);
    } finally {
      await React.act(async () => root.unmount());
      host.remove();
    }
  }, 30000);

  it('"References Consulted" lists each cited passage with its heading and the sections that used it', () => {
    const passage = U.referencePassages(LIB, 'Specific Learning Disability').passages.find(p => /does not achieve adequately/.test(p.content));
    const map = { Summary: ['c1', passage.id], 'Eligibility Considerations': [passage.id], Background: ['c2'] };
    const list = U.referencesConsulted(map);
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('MUSER Ch. 101');
    expect(list[0].passages[0].heading).toBe('VII.2.L. Specific Learning Disability');
    expect(list[0].passages[0].where).toMatch(/^lines \d+–\d+$/);
    expect(list[0].passages[0].sections).toEqual(['Summary', 'Eligibility Considerations']);

    const html = U.buildReportPrintHtml({ reportSections: { Summary: 'x' }, referencesConsulted: list });
    expect(html).toMatch(/<h2 id="rw-print-refs">References Consulted<\/h2>/);
    expect(html).toMatch(/VII\.2\.L\. Specific Learning Disability \(lines \d+–\d+\) — cited in Summary, Eligibility Considerations/);
    expect(U.referencesConsultedText(list)).toMatch(/^REFERENCES CONSULTED/);
    expect(U.buildReportPrintHtml({ reportSections: { Summary: 'x' }, referencesConsulted: U.referencesConsulted({ Summary: ['c1'] }) })).not.toMatch(/References Consulted/);
  });

  it('escapes reference titles, headings and section names in the printed appendix', () => {
    // Titles come from what the clinician typed or a file's name; the print view
    // is written into a new window, so markup in them must not execute.
    const html = U.buildReportPrintHtml({ reportSections: { Summary: 'x' }, referencesConsulted: [
      { title: '<img src=x onerror=alert(1)>', passages: [{ heading: '<b>Heading</b>', where: 'lines 1–2', sections: ['<i>Summary</i>'] }] },
    ] });
    expect(html).not.toMatch(/<img src=x|<b>Heading|<i>Summary/);
    expect(html).toMatch(/&lt;img src=x/);
  });

  it('without Lumen, falls back to the first part and says so', () => {
    const saved = window.LumenEvidence;
    try {
      delete window.LumenEvidence;
      const r = U.referencePassages(LIB, 'Specific Learning Disability');
      expect(r.mode).toBe('truncated');
      expect(U.referencePromptBlock(r, 1)).toMatch(/Only the first 6000 of \d+ characters/);
    } finally {
      window.LumenEvidence = saved;
    }
  });
});
