import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

let internals;

beforeAll(() => {
  const ReactLib = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = ReactLib;
  window.ReactDOM = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom'));
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('accessibility_evidence_module.js');
  loadAlloModule('accessibility_lab_module.js');
  internals = window.AlloModules.AccessibilityLabInternals;
});

const checks = {
  keyboard: 'pass', focus: 'pass', reflow: 'pass', text_spacing: 'pass',
  errors: 'fail', motion: 'not_applicable', media: 'pass', assistive_tech: 'untested',
};

describe('Accessibility Lab -> AlloSheet handoff', () => {
  const item = {
    id: 'history-1',
    type: 'quiz',
    title: 'Student entered title must not leave the Lab',
    text: 'Student-entered content must not leave the Lab',
    data: { html: '<div class="secret">DOM and code must stay local</div>' },
  };
  const scorecard = {
    lastReviewedAt: '2026-07-31T12:00:00.000Z',
    updatedAt: '2026-07-31T12:00:00.000Z',
    checks,
    automated: { violationRules: 2, affectedElements: 4, needsReview: 1, engine: 'axe-core', engineVersion: '4' },
    findings: [{
      source: 'axe', ruleId: 'color-contrast', wcag: '1.4.3', severity: 'serious', status: 'open', count: 2,
      description: 'This description contains student content and must not export.',
      target: ['.secret'], html: '<p>secret DOM</p>',
    }],
    notes: 'Private reviewer notes must not export.',
    reviewHistory: [{ lastReviewedAt: '2026-07-20T12:00:00.000Z', checks, findings: [] }],
  };

  it('exports audit summaries and excludes artifact content, notes, DOM, and selectors', () => {
    const artifact = internals.buildAccessibilityLabAlloSheetEnvelope({ history: [item], scorecards: { 'history-1': { ...scorecard, reviewedFingerprint: internals.artifactFingerprint(item), automated: { ...scorecard.automated, artifactFingerprint: internals.artifactFingerprint(item) } } } }, {
      createdAt: '2026-07-31T13:00:00.000Z', dateRange: 'all',
    });
    expect(artifact).toMatchObject({
      kind: 'alloflow.tabular.v1',
      source: { tool: 'accessibility-lab' },
      capabilities: { aiEnabled: false, writeBack: false },
    });
    expect(JSON.stringify(artifact)).not.toContain('Student entered title');
    expect(JSON.stringify(artifact)).not.toContain('Student-entered content');
    expect(JSON.stringify(artifact)).not.toContain('secret DOM');
    expect(JSON.stringify(artifact)).not.toContain('Private reviewer notes');
    expect(JSON.stringify(artifact)).not.toContain('.secret');
    const review = artifact.tables.find((table) => table.id === 'a11y-review-summary');
    expect(review.rows[0].values).toMatchObject({
      artifact_code: 'artifact-1', artifact_type: 'quiz', audit_status: 'in-progress',
      remediation_status: 'open-findings', finding_count: 3, open_finding_count: 3,
      automated_violation_rule_count: 2,
    });
    const criterion = artifact.tables.find((table) => table.id === 'a11y-criterion-summary');
    const contrast = criterion.rows.find((row) => row.values?.rule_code === 'color-contrast');
    expect(contrast.values).toMatchObject({ rule_code: 'color-contrast', wcag_criterion: '1.4.3', impact: 'serious', finding_count: 2 });
  });

  it('supports dataset selection and date windows without exposing stable IDs', () => {
    const older = { ...scorecard, reviewedFingerprint: internals.artifactFingerprint(item), lastReviewedAt: '2026-05-01T12:00:00.000Z', updatedAt: '2026-05-01T12:00:00.000Z' };
    const artifact = internals.buildAccessibilityLabAlloSheetEnvelope({
      history: [item, { ...item, id: 'history-2', type: 'outline', title: 'another private title' }],
      scorecards: { 'history-1': { ...scorecard, reviewedFingerprint: internals.artifactFingerprint(item) }, 'history-2': older },
    }, { createdAt: '2026-07-31T13:00:00.000Z', dateRange: '30d', datasets: { reviewSummary: true, criterionSummary: false, trendSummary: false } });
    expect(artifact.metadata.auditedArtifactCount).toBe(1);
    expect(artifact.tables.map((table) => table.id)).toEqual(['a11y-review-summary']);
    expect(JSON.stringify(artifact)).not.toContain('history-1');
    expect(JSON.stringify(artifact)).not.toContain('history-2');
  });
});
