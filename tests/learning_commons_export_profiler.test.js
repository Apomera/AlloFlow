import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(testDir, '..');
const profiler = require(path.join(workspaceDir, 'dev-tools', 'profile_learning_commons_export.cjs'));
const nodesPath = path.join(workspaceDir, 'test_data', 'standards_context', 'learning_commons_nodes_fixture.jsonl');
const relationshipsPath = path.join(workspaceDir, 'test_data', 'standards_context', 'learning_commons_relationships_fixture.jsonl');

describe('Learning Commons export profiler', () => {
    it('requires both local JSONL inputs and never invents a remote source', () => {
        expect(() => profiler.parseArgs(['--nodes', nodesPath])).toThrow('Both --nodes and --relationships are required');
        expect(profiler.usage()).not.toContain('fetch(');
        expect(profiler.usage()).not.toContain('API key');
    });

    it('profiles node coverage, statement distributions, endpoint coverage, and hierarchy depth', async () => {
        const report = await profiler.profileExport({ nodesPath, relationshipsPath, top: 20, maxHierarchyEdges: 500000 });
        expect(report.profilerVersion).toBe('alloflow-learning-commons-profiler/v1');
        expect(report.nodes).toMatchObject({
            total: 7,
            frameworks: 1,
            frameworkItems: 6,
            currentItems: 5,
            deprecatedItems: 1
        });
        expect(report.nodes.distributions.jurisdictions).toContainEqual({ value: 'Massachusetts', count: 5 });
        expect(report.nodes.distributions.normalizedStatementTypes).toContainEqual({ value: 'Standard', count: 5 });
        expect(report.nodes.academicStandardsCoverage.caseIdentifierUUID).toMatchObject({ count: 6, total: 6, ratio: 1 });
        expect(report.relationships).toMatchObject({
            total: 4,
            endpointsBothKnown: 4,
            endpointsBothStandardsItems: 3,
            hasChild: 2
        });
        expect(report.hierarchy).toMatchObject({ frameworkRoots: 1, reachableNodes: 3, maxDepth: 2, cycleDetected: false, truncated: false });
    });

    it('honors the bounded hierarchy profile and can write a JSON review report', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-lc-profile-'));
        const jsonOutPath = path.join(tempDir, 'profile.json');
        const report = await profiler.profileExport({ nodesPath, relationshipsPath, top: 2, maxHierarchyEdges: 1, jsonOutPath });
        expect(report.hierarchy.truncated).toBe(true);
        const saved = JSON.parse(fs.readFileSync(jsonOutPath, 'utf8'));
        expect(saved.profilerVersion).toBe(report.profilerVersion);
        expect(saved.nodes.distributions.jurisdictions.length).toBe(2);
    });
});
