import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(testDir, '..');
const builder = require(path.join(workspaceDir, 'dev-tools', 'build_learning_commons_snapshot.cjs'));
const provider = require(path.join(workspaceDir, 'standards_provider_module.js'));
const nodesPath = path.join(workspaceDir, 'test_data', 'standards_context', 'learning_commons_nodes_fixture.jsonl');
const relationshipsPath = path.join(workspaceDir, 'test_data', 'standards_context', 'learning_commons_relationships_fixture.jsonl');

function options(overrides = {}) {
    return {
        nodesPath,
        relationshipsPath,
        outPath: path.join(os.tmpdir(), 'alloflow-lc-fixture.json'),
        jurisdiction: 'Massachusetts',
        subject: 'Science',
        grades: ['5'],
        sourceVersion: 'fixture-v1',
        generatedAt: '2026-08-01T00:00:00.000Z',
        ...overrides
    };
}

describe('Learning Commons snapshot builder', () => {
    it('refuses an accidental unscoped corpus import', () => {
        expect(() => builder.parseArgs(['--nodes', nodesPath, '--relationships', relationshipsPath, '--out', 'snapshot.json']))
            .toThrow('requires both --jurisdiction and --subject');
    });

    it('builds a deterministic, valid, attributed subset', async () => {
        const snapshot = await builder.buildSnapshot(options());
        expect(snapshot.standards.map((entry) => entry.code)).toEqual(['MA.5.ESS.1', 'MA.5.ESS.2']);
        expect(snapshot.standards[0]).toMatchObject({
            id: '00000000-0000-4000-8000-000000000003',
            jurisdiction: 'Massachusetts',
            subject: 'Science',
            grade: '5',
            sourceUrl: 'https://example.invalid/case/item-ma-5-ess-1'
        });
        expect(snapshot.relationships).toEqual([{
            fromId: '00000000-0000-4000-8000-000000000003',
            toId: '00000000-0000-4000-8000-000000000004',
            type: 'supports',
            source: 'Learning Commons'
        }]);
        expect(snapshot.dataset).toMatchObject({
            provider: 'Learning Commons Knowledge Graph',
            datasetVersion: 'fixture-v1',
            generatedAt: '2026-08-01T00:00:00.000Z',
            license: 'https://creativecommons.org/licenses/by/4.0/',
            attribution: builder.ATTRIBUTION
        });
        expect(provider.validateSnapshot(snapshot).ok).toBe(true);
    });

    it('can include structural and deprecated records only by explicit opt-in', async () => {
        const snapshot = await builder.buildSnapshot(options({ includeStructural: true, includeDeprecated: true }));
        expect(snapshot.standards.map((entry) => entry.code)).toEqual(['00000000-0000-4000-8000-000000000001', 'GROUP-EARTH', 'MA.5.ESS.1', 'MA.5.ESS.2', 'MA.5.OLD.1']);
        expect(snapshot.relationships.some((edge) => edge.type === 'hasChild')).toBe(true);
    });

    it('fails when a reviewed maximum is exceeded', async () => {
        await expect(builder.buildSnapshot(options({ maxStandards: 1 }))).rejects.toThrow('exceeded --max-standards 1');
    });

    it('emits a load-order-safe browser registration module without network calls', async () => {
        const snapshot = await builder.buildSnapshot(options());
        const source = builder.registrationModule(snapshot);
        expect(source).toContain('provider.registerLocalSnapshot(snapshot)');
        expect(source).toContain('__ALLO_LOCAL_STANDARDS_SNAPSHOT__');
        expect(source).not.toContain('fetch(');
        expect(source).not.toContain('XMLHttpRequest');
    });

    it('includes grade and build-mode scope in the snapshot identity', async () => {
        const gradeFive = await builder.buildSnapshot(options());
        const gradeFour = await builder.buildSnapshot(options({ grades: ['4'] }));
        const withStructure = await builder.buildSnapshot(options({ includeStructural: true }));
        expect(gradeFive.dataset.snapshotId).not.toBe(gradeFour.dataset.snapshotId);
        expect(gradeFive.dataset.snapshotId).not.toBe(withStructure.dataset.snapshotId);
        expect(gradeFive.dataset.contentDigest).toMatch(/^[a-f0-9]{64}$/);
        expect(gradeFive.standards[0].kind).toBe('standard');
        expect(gradeFive.standards[0].resolvable).toBe(true);
    });

    it('keeps structural nodes available to graph traversal but excludes them from resolution', async () => {
        const snapshot = await builder.buildSnapshot(options({ includeStructural: true }));
        const local = provider.createLocalProvider(snapshot);
        const group = snapshot.standards.find((entry) => entry.kind === 'group');
        expect(group).toBeTruthy();
        expect(group.resolvable).toBe(false);
        expect(local.searchStandards('GROUP-EARTH').total).toBe(0);
        expect(local.resolveStandard('GROUP-EARTH').status).toBe('not-found');
        expect(local.getStandardContext(group.id)).toBeNull();
        expect(local.getNeighborhood(group.id).nodes.map((entry) => entry.id)).toContain('00000000-0000-4000-8000-000000000003');
    });
    it('preserves actual framework identity and verifies source-file hashes', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-lc-manifest-'));
        const nodesHash = await builder.sha256File(nodesPath);
        const relationshipsHash = await builder.sha256File(relationshipsPath);
        const manifestPath = path.join(tempDir, 'manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify({
            exportVersion: 'fixture-v1',
            access: {
                nodesUrl: 'https://example.invalid/nodes.jsonl',
                relationshipsUrl: 'https://example.invalid/relationships.jsonl'
            },
            sourceIntegrity: {
                nodes: { bytes: fs.statSync(nodesPath).size, sha256: nodesHash },
                relationships: { bytes: fs.statSync(relationshipsPath).size, sha256: relationshipsHash }
            }
        }), 'utf8');
        const snapshot = await builder.buildSnapshot(options({ verifySource: true, sourceManifestPath: manifestPath }));
        expect(snapshot.standards[0]).toMatchObject({
            framework: 'Synthetic Massachusetts Science Framework',
            frameworkId: '00000000-0000-4000-8000-000000000001'
        });
        expect(snapshot.dataset.sourceIntegrity.nodes).toMatchObject({ bytes: fs.statSync(nodesPath).size, sha256: nodesHash });
        expect(provider.createLocalProvider(snapshot).getManifest().sourceIntegrity.relationships.sha256).toBe(relationshipsHash);
    });
    it('writes JSON and optional CDN module outputs', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-lc-'));
        const outPath = path.join(tempDir, 'snapshot.json');
        const moduleOutPath = path.join(tempDir, 'snapshot.js');
        const snapshot = await builder.writeBuild(options({ outPath, moduleOutPath }));
        expect(JSON.parse(fs.readFileSync(outPath, 'utf8')).dataset.snapshotId).toBe(snapshot.dataset.snapshotId);
        expect(fs.readFileSync(moduleOutPath, 'utf8')).toContain('LocalStandardsSnapshot');
    });
});
