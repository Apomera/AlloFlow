import { beforeAll, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const scriptPath = resolve(root, 'dev-tools/audit_eppp_distractor_quality.cjs');
const sourceBankPath = resolve(root, 'test_prep/eppp_native_items.json');
const sourceJsonPath = resolve(root, 'test_prep/eppp_distractor_quality_diagnostics.json');
const deployJsonPath = resolve(root, 'desktop/web-app/public/test_prep/eppp_distractor_quality_diagnostics.json');
const sourceMarkdownPath = resolve(root, 'test_prep/eppp_distractor_quality_diagnostics.md');
const deployMarkdownPath = resolve(root, 'desktop/web-app/public/test_prep/eppp_distractor_quality_diagnostics.md');

let bank;
let report;

beforeAll(() => {
  execFileSync(process.execPath, [scriptPath], { cwd: root, stdio: 'pipe' });
  bank = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8'));
  report = JSON.parse(fs.readFileSync(sourceJsonPath, 'utf8'));
});

describe('EPPP distractor-quality warning diagnostics', () => {
  it('scans all 1,500 items without treating heuristic warnings as release failures', () => {
    expect(report).toMatchObject({
      schemaVersion: 1,
      analysisVersion: 'eppp-distractor-diagnostics-v1',
      reportType: 'warning-only-editorial-diagnostics',
    });
    expect(report.summary.totalItems).toBe(1500);
    expect(report.summary.warningOnly).toBe(true);
    expect(report.summary.forbiddenAggregateChoices).toBe(0);
    expect(report.policy.warningMeaning).toContain('human editorial review');
    expect(report.policy.warningMeaning).toContain('do not');
    expect(report.policy.hardGate).toContain('remain prohibited');
  });

  it('emits structurally valid candidates for every diagnostic family', () => {
    const bankIds = new Set(bank.map((item) => item.id));
    expect(report.uniqueKeyStemLexicalLeakage.length).toBeGreaterThan(0);
    expect(report.uniqueKeyStemLexicalLeakage.every((entry) => bankIds.has(entry.id) && entry.uniqueKeyStemTerms.length > 0)).toBe(true);

    expect(report.asymmetricExtremeDistractors.length).toBeGreaterThan(0);
    expect(report.asymmetricExtremeDistractors.every((entry) => bankIds.has(entry.id) && entry.extremeDistractorIndexes.length >= 2)).toBe(true);

    expect(report.advancedDirectRecall.length).toBeGreaterThan(0);
    expect(report.advancedDirectRecall.every((entry) => bankIds.has(entry.id) && entry.difficulty === 'advanced' && entry.reason)).toBe(true);

    expect(report.semanticConceptDuplicates.pairs.length).toBeGreaterThan(0);
    expect(report.semanticConceptDuplicates.pairs.every((pair) => bankIds.has(pair.leftId) && bankIds.has(pair.rightId) && pair.matchBasis.length > 0)).toBe(true);
    expect(report.semanticConceptDuplicates.pairs.some((pair) => pair.matchBasis.includes('high-tfidf-similarity'))).toBe(true);
  });

  it('publishes a bounded active docket and tracks the original editorial anchors separately', () => {
    expect(report.priorityDocket).toHaveLength(20);
    expect(report.priorityDocket.every((entry) => entry.diagnostics.length > 0 && entry.score > 0)).toBe(true);
    expect(report.editorialAnchorOutcomes).toHaveLength(10);
    expect(report.editorialAnchorOutcomes.map((entry) => entry.id)).toEqual([
      'eppp-b006-biological-2',
      'eppp-v3-assessment-051',
      'eppp-v2-professional-040',
      'eppp-v2-assessment-005',
      'eppp-v3-intervention-018',
      'eppp-b016-social-1',
      'eppp-b022-assessment-1',
      'eppp-b023-intervention-3',
      'eppp-v3-professional-030',
      'eppp-v2-professional-030',
    ]);
    const repairedNeuron = report.editorialAnchorOutcomes.find((entry) => entry.id === 'eppp-b006-biological-2');
    expect(repairedNeuron).toMatchObject({ practiceBank: 1, itemInBank: 98, status: 'no-current-warning', diagnostics: [] });
    expect(report.summary.editorialAnchorsWithNoCurrentWarning).toBeGreaterThanOrEqual(1);
  });

  it('keeps the report reproducible and source/deploy-identical', () => {
    const sourceBank = fs.readFileSync(sourceBankPath, 'utf8');
    expect(report.sourceSha256).toBe(crypto.createHash('sha256').update(sourceBank).digest('hex'));
    const firstJson = fs.readFileSync(sourceJsonPath, 'utf8');
    const firstMarkdown = fs.readFileSync(sourceMarkdownPath, 'utf8');
    execFileSync(process.execPath, [scriptPath], { cwd: root, stdio: 'pipe' });
    expect(fs.readFileSync(sourceJsonPath, 'utf8')).toBe(firstJson);
    expect(fs.readFileSync(sourceMarkdownPath, 'utf8')).toBe(firstMarkdown);
    expect(fs.readFileSync(deployJsonPath, 'utf8')).toBe(firstJson);
    expect(fs.readFileSync(deployMarkdownPath, 'utf8')).toBe(firstMarkdown);
  }, 30_000);

  it('retains the hard all/none-of-the-above prohibition in native QA', () => {
    expect(bank.some((item) => item.choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice)))).toBe(false);
    const qaScript = fs.readFileSync(resolve(root, 'dev-tools/qa_eppp_native_pack.cjs'), 'utf8');
    expect(qaScript).toContain('All/none-of-the-above choices are not permitted.');
  });
});
