import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

function readReport(relativePath) {
  return JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
}

describe('Pass the EPPP legacy-bank audit', () => {
  it('produces a complete, traceable migration queue', () => {
    const report = readReport('test_prep/eppp_legacy/content_audit.json');

    expect(report.schemaVersion).toBe(1);
    expect(report.summary.totalItems).toBeGreaterThan(2500);
    expect(report.summary.domains).toBe(8);
    expect(report.summary.sourceFiles).toBeGreaterThan(40);
    expect(report.reviewQueue).toHaveLength(report.summary.totalItems);
    expect(new Set(report.reviewQueue.map((item) => item.id)).size).toBe(report.summary.totalItems);
    expect(report.reviewQueue.every((item) => item.sourceFile.startsWith('js/'))).toBe(true);
    expect(report.summary.blocker).toBe(0);
  });

  it('makes citation, duplication, and answer-position risks explicit', () => {
    const report = readReport('test_prep/eppp_legacy/content_audit.json');

    expect(report.summary.referenceCoveragePercent).toBeLessThan(50);
    expect(report.summary.duplicateGroups).toBeGreaterThan(100);
    expect(report.flagCounts.missing_reference).toBeGreaterThan(1000);
    expect(report.flagCounts.correct_answer_length_clue).toBeGreaterThan(500);
    expect(report.summary.dominantAnswerIndex).toBe(1);
    expect(report.summary.dominantAnswerPercent).toBeGreaterThan(75);
  });

  it('keeps development and deployment reports identical and reproducible', () => {
    const source = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/content_audit.json'), 'utf8');
    const deployed = fs.readFileSync(resolve(process.cwd(), 'desktop/web-app/public/test_prep/eppp_legacy/content_audit.json'), 'utf8');
    const importer = fs.readFileSync(resolve(process.cwd(), 'dev-tools/import_eppp_legacy.cjs'), 'utf8');

    expect(deployed).toBe(source);
    expect(fs.existsSync(resolve(process.cwd(), 'test_prep/eppp_legacy/content_audit.md'))).toBe(true);
    expect(fs.existsSync(resolve(process.cwd(), 'dev-tools/audit_eppp_content.cjs'))).toBe(true);
    expect(importer).toContain("audit_eppp_content.cjs");
  });
});
