import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

function readReport(relativePath) {
  return JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
}

describe('Pass the EPPP legacy-bank audit', () => {
  it('produces a complete, traceable migration queue', () => {
    const report = readReport('quality/eppp_provenance/evidence/audit/content_audit.json');

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
    const report = readReport('quality/eppp_provenance/evidence/audit/content_audit.json');

    expect(report.summary.referenceCoveragePercent).toBeLessThan(50);
    expect(report.summary.duplicateGroups).toBeGreaterThan(100);
    expect(report.flagCounts.missing_reference).toBeGreaterThan(1000);
    expect(report.flagCounts.correct_answer_length_clue).toBeGreaterThan(500);
    expect(report.summary.dominantAnswerIndex).toBe(1);
    expect(report.summary.dominantAnswerPercent).toBeGreaterThan(75);
  });

  it('keeps the report canonical, archive-backed, and outside runtime trees', () => {
    const source = fs.readFileSync(resolve(process.cwd(), 'quality/eppp_provenance/evidence/audit/content_audit.json'), 'utf8');
    const builder = fs.readFileSync(resolve(process.cwd(), 'dev-tools/audit_eppp_content.cjs'), 'utf8');

    expect(JSON.parse(source).sourceArchive.payloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(fs.existsSync(resolve(process.cwd(), 'quality/eppp_provenance/evidence/audit/content_audit.md'))).toBe(true);
    expect(fs.existsSync(resolve(process.cwd(), 'test_prep/eppp_legacy/content_audit.json'))).toBe(false);
    expect(builder).toContain('openEpppMigrationSourceArchive');
    expect(builder).toContain("ensureFamily('audit')");
  });
});
