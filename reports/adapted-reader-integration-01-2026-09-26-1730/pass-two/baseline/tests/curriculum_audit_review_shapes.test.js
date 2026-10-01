// Curriculum Audit: AI reviewer lists are strings by the time they render (2026-09-13).
//
// Aaron hit "Objects are not valid as a React child (found: object with keys {profile,
// encounter})" in the Content accessibility section. The accessibility prompt said each
// student-impact entry "pairs a student profile with what they would encounter"; the model
// returned {profile, encounter} objects; the dispatcher only checked Array.isArray and sliced;
// the view rendered each entry as an <li> child; React threw; the error boundary replaced the
// whole report with an error card. Two guards now exist: the dispatcher coerces every review
// list to strings before caching (auditReviewList), and the view renders every entry through
// auditText. These tests pin both, and prove the crash class against real react-dom.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const dispatcher = readFileSync(resolve(process.cwd(), 'generate_dispatcher_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_alignment_report_source.jsx'), 'utf8');

const helperStart = dispatcher.indexOf('const AUDIT_REVIEW_LEAD_KEYS = ');
const helperEnd = dispatcher.indexOf('\nfunction applyAuditReviewStatus', helperStart);
if (helperStart < 0 || helperEnd < 0) throw new Error('auditReviewList not found in the dispatcher source');
const { auditReviewText, auditReviewList } = new Function(dispatcher.slice(helperStart, helperEnd) + '\nreturn { auditReviewText, auditReviewList };')();

const IMPACT = { profile: 'A student using a screen reader', encounter: 'would hear "image" with no description for 3 of the 4 figures.' };

describe('dispatcher: auditReviewList coerces reviewer entries to sentences', () => {
  it('passes strings through and trims them', () => {
    expect(auditReviewList(['  Add alt text to figure 2. '], 5)).toEqual(['Add alt text to figure 2.']);
  });
  it('flattens the {profile, encounter} shape the model returned on the pilot into one sentence', () => {
    expect(auditReviewText(IMPACT)).toBe('A student using a screen reader would hear "image" with no description for 3 of the 4 figures.');
  });
  it('joins a capitalised continuation with a colon and unknown keys after known ones', () => {
    expect(auditReviewText({ profile: 'A student with dyslexia', encounter: 'The 400-word passage has no breaks.' })).toBe('A student with dyslexia: The 400-word passage has no breaks.');
    // metadata beside a real sentence is dropped; a model-invented key is kept when nothing else carries text
    expect(auditReviewText({ severity: 'high', fix: 'Split the passage into three paragraphs.' })).toBe('Split the passage into three paragraphs.');
    expect(auditReviewText({ callout: 'Captions are missing on both videos.' })).toBe('Captions are missing on both videos.');
    expect(auditReviewText({ word: 'photosynthesis', correction: 'Tier 3, not Tier 2' })).toBe('photosynthesis: Tier 3, not Tier 2');
  });
  it('drops entries with nothing textual and applies the cap after coercion', () => {
    expect(auditReviewList([IMPACT, null, 7, { count: 3 }, ['nested'], '', 'plain'], 2)).toEqual([auditReviewText(IMPACT), '7']);
    expect(auditReviewList('not an array', 5)).toEqual([]);
  });
  it('is applied to every reviewer list field, and the prompt asks for strings', () => {
    expect(dispatcher).not.toMatch(/Array\.isArray\(review\.\w+\) \? review\.\w+\.slice\(0, \d+\) : \[\]/);
    for (const field of ['studentImpacts', 'fixes', 'corrections', 'missedTier2', 'recommendations', 'formatGaps', 'claimsToVerify', 'priorityAdditions', 'qualityFlags', 'specificAdjustments', 'strengths', 'gaps', 'additions']) {
      expect(dispatcher, field).toMatch(new RegExp(field + ': auditReviewList\\(review\\.' + field + ', \\d+\\)'));
    }
    expect(dispatcher).toContain('"studentImpacts": array of 1-3 specific student-experience callouts. Each entry is ONE STRING (a full sentence, not an object)');
    expect(dispatcher).toContain('every array holds plain strings.');
  });
});

describe('view: every reviewer entry renders through auditText', () => {
  it('has no raw entry left as a list-item or chip child', () => {
    expect(view).not.toMatch(/return <li key=\{i\}>\{[a-z]\}<\/li>;/);
    expect(view).not.toMatch(/return <span key=\{i\} className="[^"]*">\{[a-z]\}<\/span>;/);
    expect(view).toContain("return <li key={i}>{auditText(s)}</li>;");
    expect(view).toContain("return <li key={i}>{auditText(f)}</li>;");
  });
});

describe('view: the Content accessibility section survives object entries under real react-dom', () => {
  const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
  let React, ReactDOMClient, act, host, root;
  const silence = { error: console.error };
  beforeAll(() => {
    React = require(resolve(modulesDir, 'react'));
    ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
    ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloIcons = {};
    loadAlloModule('concept_graph_engine_module.js');
    loadAlloModule('view_alignment_report_module.js');
  });
  afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; console.error = silence.error; });

  const mount = (element) => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    act(() => root.render(element));
  };

  const report = (llmReview) => ({
    type: 'alignment-report',
    data: {
      reports: [],
      comprehensive: {
        auditLanguage: 'en',
        auditMetadata: { schemaVersion: 3, generatedAt: '2026-09-13T20:00:00.000Z', gradeLevel: '5th Grade' },
        auditScope: { includedArtifactIds: ['lesson-1'], includedArtifacts: [{ id: 'lesson-1', title: 'Lesson', type: 'lesson-plan', timestamp: '2026-09-13T19:00:00.000Z' }], includedTypes: ['lesson-plan'], selectionMode: 'explicit artifact IDs', excludedArtifactCount: 0, warnings: [], contextTruncated: false },
        overall: { score: 40, incomplete: false, status: 'Revise', label: 'Revise', totalDimensions: 9, dimensionsApplicable: 1, dimensionsEvaluated: 1, dimensionScores: { accessibility: { status: 'Not Aligned', points: 0 } }, perDimensionPercent: { accessibility: 0 }, blockingIssues: [], incompleteIssues: [], scoreBasis: 'Equal weighting.', notes: '' },
        accessibility: { status: 'Not Aligned', totalImages: 4, imagesWithAlt: 1, altCoveragePct: 25, colorOnlyCount: 0, implicitImageCount: 0, longestUnbrokenPassage: 120, recommendations: ['Add alt text.'], llmReview },
      },
    },
  });

  it('React itself rejects an object child, which is the crash the guard prevents', () => {
    console.error = () => {};
    expect(() => mount(React.createElement('ul', null, React.createElement('li', null, IMPACT)))).toThrow(/Objects are not valid as a React child/);
  });

  it('renders the pilot shape as sentences instead of crashing the report', () => {
    const View = window.AlloModules.AlignmentReportView;
    const llmReview = {
      status: 'Not Aligned', narrative: 'Most figures lack descriptions.',
      studentImpacts: [IMPACT, 'A student with low vision cannot enlarge the chart labels.', { count: 3 }],
      fixes: [{ fix: 'Write a one-sentence alt text for each of the three undescribed figures.' }, 'Break the 400-word passage into paragraphs.'],
    };
    expect(() => mount(React.createElement(View, { generatedContent: report(llmReview), t: () => 'Curriculum audit summary' }))).not.toThrow();
    const section = host.querySelector('#audit-accessibility');
    expect(section).toBeTruthy();
    const items = Array.from(section.querySelectorAll('li')).map((li) => li.textContent.trim());
    expect(items).toContain('A student using a screen reader would hear "image" with no description for 3 of the 4 figures.');
    expect(items).toContain('A student with low vision cannot enlarge the chart labels.');
    expect(items).toContain('Write a one-sentence alt text for each of the three undescribed figures.');
    expect(items).toContain('Break the 400-word passage into paragraphs.');
    expect(section.textContent).not.toContain('[object Object]');
  });

  // Belt and braces: a shape the guards do not cover (an object where a paragraph expects text)
  // must cost ONE card, not the report. Each dimension renders inside its own boundary.
  it('contains an unguarded render failure to the one dimension card', () => {
    console.error = () => {};
    const View = window.AlloModules.AlignmentReportView;
    // `notes` is the stand-in for "a field no coercer covers". It used to be
    // `llmReview.narrative`, but that one is now guarded at all six render sites
    // (2026-09-15), so it no longer throws and stopped exercising the boundary.
    // `notes` is written by the pipeline, not a model, so it is not a live crash
    // risk — it is simply an honest example of an unguarded child, which is what
    // this test needs. If it ever gains a guard, repoint this at another one
    // rather than deleting the case: the boundary still has to be proven.
    const poisoned = report({ status: 'Not Aligned', narrative: 'Most figures lack descriptions.', studentImpacts: [], fixes: [] });
    poisoned.data.comprehensive.accessibility.notes = { text: 'not a string' };
    poisoned.data.comprehensive.vocabulary = { status: 'Not evaluated', notEvaluated: true, recommendations: ['No vocabulary evidence was available.'] };
    expect(() => mount(React.createElement(View, { generatedContent: poisoned, t: () => 'Curriculum audit summary' }))).not.toThrow();
    const failed = host.querySelector('#audit-accessibility[data-audit-section-failed="true"]');
    expect(failed).toBeTruthy();
    expect(failed.textContent).toContain('Content accessibility could not be displayed');
    expect(failed.textContent).toContain('Objects are not valid as a React child');
    // the rest of the report is still there
    expect(host.querySelector('#audit-findings-heading')).toBeTruthy();
    expect(host.querySelector('#audit-vocabulary')).toBeTruthy();
    expect(host.querySelector('#audit-vocabulary').textContent).toContain('No vocabulary evidence was available.');
    expect(host.querySelectorAll('[data-audit-section-failed="true"]')).toHaveLength(1);
  });
});
