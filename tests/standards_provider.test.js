import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(testDir, '..');
const fixturePath = path.join(workspaceDir, 'test_data', 'standards_context', 'local_snapshot_v1.json');

function loadIntoSandbox(sandbox, filename) {
    const source = fs.readFileSync(path.join(workspaceDir, filename), 'utf8');
    vm.runInContext(source, sandbox, { filename });
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

describe('local standards provider', () => {
    let sandbox;
    let fixture;
    let api;
    let provider;

    beforeAll(() => {
        sandbox = { console };
        sandbox.window = sandbox;
        sandbox.globalThis = sandbox;
        vm.createContext(sandbox);
        loadIntoSandbox(sandbox, 'standards_context_module.js');
        loadIntoSandbox(sandbox, 'standards_provider_module.js');
        loadIntoSandbox(sandbox, 'agent_core_contracts_module.js');
        loadIntoSandbox(sandbox, 'agent_core_blueprint_service_module.js');
        fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
        api = sandbox.AlloModules.StandardsProvider;
        provider = api.createLocalProvider(fixture);
    });

    it('validates the versioned synthetic snapshot and exposes provenance', () => {
        const report = api.validateSnapshot(fixture);
        expect(report.ok).toBe(true);
        expect(report.value.schemaVersion).toBe('alloflow-standards-snapshot/v1');
        expect(provider.getManifest()).toMatchObject({
            provider: 'fixture-local-standards',
            datasetVersion: 'fixture-2026-08-01',
            snapshotId: 'fixture-local-standards-2026-08-01',
            attribution: 'AlloFlow synthetic standards fixture'
        });
    });

    it('registers and clears only validated local snapshots', () => {
        expect(api.getRegisteredProvider()).toBeNull();
        const registered = api.registerLocalSnapshot(fixture);
        expect(api.getRegisteredProvider()).toBe(registered);
        expect(registered.getManifest().snapshotId).toBe('fixture-local-standards-2026-08-01');
        api.clearRegisteredProvider();
        expect(api.getRegisteredProvider()).toBeNull();

        const invalid = clone(fixture);
        invalid.schemaVersion = 'invalid/v1';
        expect(() => api.registerLocalSnapshot(invalid)).toThrow('Invalid local standards snapshot.');
        expect(api.getRegisteredProvider()).toBeNull();
    });
    it('rejects invalid schema and duplicate standard ids while warning on broken links', () => {
        const badSchema = clone(fixture);
        badSchema.schemaVersion = 'unknown/v9';
        expect(api.validateSnapshot(badSchema).ok).toBe(false);

        const duplicate = clone(fixture);
        duplicate.standards.push(clone(duplicate.standards[0]));
        const duplicateReport = api.validateSnapshot(duplicate);
        expect(duplicateReport.ok).toBe(false);
        expect(duplicateReport.errors.some((entry) => entry.code === 'duplicate-standard-id')).toBe(true);

        const brokenLink = clone(fixture);
        brokenLink.relationships.push({ fromId: 'missing:standard', toId: 'ngss:5-ess2-1', type: 'broken' });
        const brokenReport = api.validateSnapshot(brokenLink);
        expect(brokenReport.ok).toBe(true);
        expect(brokenReport.warnings.some((entry) => entry.code === 'relationship-missing-node')).toBe(true);
        expect(brokenReport.value.relationships.some((entry) => entry.fromId === 'missing:standard')).toBe(false);
    });

    it('resolves exact codes, including Unicode dash normalization and filters', () => {
        const ambiguous = provider.resolveStandard('5-ESS2-1');
        expect(ambiguous.status).toBe('ambiguous');
        expect(ambiguous.candidates).toHaveLength(2);

        const resolved = provider.resolveStandard('5–ESS2–1', { framework: 'NGSS' });
        expect(resolved.status).toBe('resolved');
        expect(resolved.match.id).toBe('ngss:5-ess2-1');
        expect(resolved.context.version).toBe('standards-context/v1');
        expect(resolved.context.attribution).toBe('AlloFlow synthetic standards fixture');
        expect(resolved.context.provenance).toMatchObject({
            provider: 'fixture-local-standards',
            datasetVersion: 'fixture-2026-08-01',
            snapshotId: 'fixture-local-standards-2026-08-01',
            license: 'Synthetic fixture for local development and tests; not an official standards source.',
            attribution: 'AlloFlow synthetic standards fixture'
        });
        expect(resolved.context.standards[0].relationships.length).toBeGreaterThan(0);
    });

    it('resolves stable ids and never auto-resolves fuzzy text', () => {
        const byId = provider.resolveStandard('ccss:ri.5.1');
        expect(byId.status).toBe('resolved');
        expect(byId.match.code).toBe('CCSS.ELA-LITERACY.RI.5.1');

        const fuzzy = provider.resolveStandard('Earth systems');
        expect(fuzzy.status).toBe('not-found');
        expect(fuzzy.match).toBeNull();
        expect(fuzzy.candidates.length).toBeGreaterThan(0);

        const missing = provider.resolveStandard('does-not-exist');
        expect(missing.status).toBe('not-found');
        expect(missing.candidates).toEqual([]);
    });

    it('returns deterministic filtered search results and honors limits', () => {
        const first = provider.searchStandards('', { grade: '5', subject: 'Science' });
        const second = provider.searchStandards('', { grade: '5', subject: 'Science' });
        expect(first).toEqual(second);
        expect(first.matches.every((entry) => entry.grade === '5' && entry.subject === 'Science')).toBe(true);

        const limited = provider.searchStandards('', {}, { maxResults: 1 });
        expect(limited.matches).toHaveLength(1);
        expect(limited.total).toBeGreaterThan(1);
        expect(limited.truncated).toBe(true);
    });

    it('builds bounded neighborhoods from validated relationships only', () => {
        const neighborhood = provider.getNeighborhood('ngss:5-ess2-1', { depth: 2, maxNodes: 3, maxEdges: 5 });
        expect(neighborhood.rootId).toBe('ngss:5-ess2-1');
        expect(neighborhood.nodes[0].id).toBe('ngss:5-ess2-1');
        expect(neighborhood.nodes.length).toBeLessThanOrEqual(3);
        expect(neighborhood.relationships.length).toBeLessThanOrEqual(5);
        expect(neighborhood.truncated).toBe(true);
        expect(neighborhood.relationships.every((edge) =>
            neighborhood.nodes.some((node) => node.id === edge.fromId)
            && neighborhood.nodes.some((node) => node.id === edge.toId)
        )).toBe(true);
        expect(provider.getNeighborhood('missing:standard')).toBeNull();
        expect(provider.getStandardContext('missing:standard')).toBeNull();
    });

    it('preserves provider attribution through Blueprint context normalization', async () => {
        const resolved = provider.resolveStandard('5-ESS2-1', { framework: 'NGSS' });
        const contracts = sandbox.AlloModules.AgentCoreContracts;
        const service = sandbox.AlloModules.AgentCoreBlueprintService.createBlueprintService({ contracts });
        const draft = await service.createDraft({
            blueprintId: 'bp-local-provider',
            gradeLevel: '5th Grade',
            standards: '5-ESS2-1',
            standardsContext: resolved.context,
            plan: ['analysis']
        });
        expect(draft.standardsContext.attribution).toBe('AlloFlow synthetic standards fixture');
        expect(draft.standardsContext.provenance.attribution).toBe('AlloFlow synthetic standards fixture');
    });

    it('has no network dependency in the provider implementation', () => {
        const source = fs.readFileSync(path.join(workspaceDir, 'standards_provider_module.js'), 'utf8');
        expect(source).not.toMatch(/\bfetch\s*\(/);
        expect(source).not.toMatch(/XMLHttpRequest/);
    });
});
