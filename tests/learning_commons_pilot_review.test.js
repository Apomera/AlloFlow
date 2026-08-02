import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(testDir, '..');
const reviewer = require(path.join(workspaceDir, 'dev-tools', 'review_learning_commons_pilot.cjs'));
const builder = require(path.join(workspaceDir, 'dev-tools', 'build_learning_commons_snapshot.cjs'));
const nodesPath = path.join(workspaceDir, 'test_data', 'standards_context', 'learning_commons_nodes_fixture.jsonl');
const relationshipsPath = path.join(workspaceDir, 'test_data', 'standards_context', 'learning_commons_relationships_fixture.jsonl');

async function structuralSnapshot() {
    const snapshot = await builder.buildSnapshot({
        nodesPath,
        relationshipsPath,
        jurisdiction: 'Massachusetts',
        subject: 'Science',
        grades: ['5'],
        includeStructural: true,
        includeDeprecated: true,
        sourceVersion: 'fixture-v1',
        generatedAt: '2026-08-01T00:00:00.000Z'
    });
    snapshot.dataset.sourceIntegrity = {
        nodes: { bytes: 1, sha256: 'fixture-nodes' },
        relationships: { bytes: 1, sha256: 'fixture-relationships' }
    };
    snapshot.standards.filter((record) => record.resolvable !== false).forEach((record) => {
        record.frameworkId = record.frameworkId || 'fixture-framework-id';
        record.sourceUrl = record.sourceUrl || `https://example.invalid/source/${record.id}`;
    });
    return snapshot;
}

describe('Learning Commons pilot reviewer', () => {
    it('passes a typed structural snapshot with bounded graph and provenance checks', async () => {
        const report = reviewer.reviewSnapshot(await structuralSnapshot());
        expect(report.ok).toBe(true);
        expect(report.counts).toMatchObject({ resolvableStandards: 3, structuralNodes: 2, relationships: 3 });
        expect(report.checks).toMatchObject({
            structuralNodesExcludedFromResolution: true,
            neighborhoodEndpointsValid: true,
            contextProvenanceMatches: true
        });
    });

    it('fails a pilot that lacks source integrity metadata', async () => {
        const snapshot = await structuralSnapshot();
        delete snapshot.dataset.sourceIntegrity;
        const report = reviewer.reviewSnapshot(snapshot);
        expect(report.ok).toBe(false);
        expect(report.failures.some((failure) => failure.includes('source-integrity'))).toBe(true);
    });

    it('writes a bounded JSON review report through the CLI contract', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-lc-review-'));
        const snapshotPath = path.join(tempDir, 'snapshot.json');
        const reportPath = path.join(tempDir, 'review.json');
        fs.writeFileSync(snapshotPath, JSON.stringify(await structuralSnapshot()), 'utf8');
        const args = reviewer.parseArgs(['--snapshot', snapshotPath, '--out', reportPath]);
        const report = reviewer.reviewSnapshot(JSON.parse(fs.readFileSync(args.snapshotPath, 'utf8')));
        fs.writeFileSync(args.outPath, JSON.stringify(report), 'utf8');
        expect(JSON.parse(fs.readFileSync(reportPath, 'utf8')).reviewVersion).toBe('alloflow-learning-commons-pilot-review/v1');
    });
});
