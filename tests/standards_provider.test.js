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

describe('learning components in the local provider (2026-08-17)', () => {
    let sandbox;
    let api;

    function componentSnapshot() {
        const standards = [
            { id: 's-root', code: 'X.1', label: 'Root standard', text: 'Root standard', kind: 'standard', resolvable: true, framework: 'F', frameworkId: 'f1', jurisdiction: 'J', grade: '5', subject: 'S', sourceUrl: '', sourceUrls: [] },
            { id: 's-peer', code: 'X.2', label: 'Peer standard', text: 'Peer standard', kind: 'standard', resolvable: true, framework: 'F', frameworkId: 'f1', jurisdiction: 'J', grade: '5', subject: 'S', sourceUrl: '', sourceUrls: [] },
            { id: 's-next', code: 'X.3', label: 'Next standard', text: 'Next standard', kind: 'standard', resolvable: true, framework: 'F', frameworkId: 'f1', jurisdiction: 'J', grade: '5', subject: 'S', sourceUrl: '', sourceUrls: [] },
        ];
        const relationships = [
            { fromId: 's-root', toId: 's-next', type: 'buildsTowards', source: 'test' },
            { fromId: 's-root', toId: 's-peer', type: 'relatesTo', source: 'test' },
        ];
        for (let i = 0; i < 10; i += 1) {
            standards.push({ id: 'c-' + i, code: 'c-' + i, label: 'Component ' + i, text: 'Component ' + i, kind: 'component', resolvable: false, framework: '', frameworkId: '', jurisdiction: '', grade: '', subject: '', sourceUrl: '', sourceUrls: [] });
            relationships.push({ fromId: 'c-' + i, toId: 's-root', type: 'supports', source: 'test' });
        }
        return {
            schemaVersion: 'alloflow-standards-snapshot/v1',
            dataset: { provider: 'test', datasetVersion: 'v0', snapshotId: 'component-fixture', license: 'x', attribution: 'y' },
            standards,
            relationships,
        };
    }

    beforeAll(() => {
        sandbox = { console };
        sandbox.window = sandbox;
        sandbox.globalThis = sandbox;
        vm.createContext(sandbox);
        loadIntoSandbox(sandbox, 'standards_provider_module.js');
        api = sandbox.AlloModules.StandardsProvider;
    });

    it('getLearningComponents prefers supports edges and reports edgeSource', () => {
        const provider = api.createLocalProvider(componentSnapshot());
        const result = provider.getLearningComponents('s-root');
        expect(result.edgeSource).toBe('supports');
        expect(result.components.length).toBe(10);
        expect(result.components.every((component) => component.kind === 'component')).toBe(true);
        // A standard with no supports edges falls back to the hasChild approximation.
        const fallback = provider.getLearningComponents('s-peer');
        expect(fallback.edgeSource).toBe('hasChild');
        expect(fallback.components.length).toBe(0);
    });

    it('components stay invisible to search and resolution', () => {
        const provider = api.createLocalProvider(componentSnapshot());
        expect(provider.resolveStandard('c-0').status).not.toBe('resolved');
        expect(provider.resolveStandard('X.1').status).toBe('resolved');
    });

    it('caps components in neighborhoods so they cannot starve standards context', () => {
        const provider = api.createLocalProvider(componentSnapshot());
        // maxNodes 12: default cap = max(4, floor(12 / 3)) = 4 components.
        const bounded = provider.getNeighborhood('s-root', { depth: 2, maxNodes: 12, maxEdges: 48 });
        const kinds = {};
        bounded.nodes.forEach((node) => { kinds[node.kind] = (kinds[node.kind] || 0) + 1; });
        expect(kinds.component).toBe(4);
        expect(kinds.standard).toBe(3);
        expect(bounded.truncated).toBe(true);
        // Explicit override restores the uncapped behavior.
        const open = provider.getNeighborhood('s-root', { depth: 2, maxNodes: 20, maxEdges: 48, maxComponents: 99 });
        const openKinds = {};
        open.nodes.forEach((node) => { openKinds[node.kind] = (openKinds[node.kind] || 0) + 1; });
        expect(openKinds.component).toBe(10);
        // maxComponents: 0 removes components entirely.
        const none = provider.getNeighborhood('s-root', { depth: 2, maxNodes: 20, maxEdges: 48, maxComponents: 0 });
        expect(none.nodes.every((node) => node.kind !== 'component')).toBe(true);
        expect(none.truncated).toBe(true);
    });

    it('getPrerequisiteGaps reports prerequisiteEdgesExamined so "no gaps" is distinguishable from "nothing checked"', () => {
        const provider = api.createLocalProvider(componentSnapshot());
        const checked = provider.getPrerequisiteGaps(['X.3']);
        expect(checked.prerequisiteEdgesExamined).toBe(1);
        expect(checked.missing.length).toBe(1);
        const nothingToCheck = provider.getPrerequisiteGaps(['X.1']);
        expect(nothingToCheck.missing.length).toBe(0);
        expect(nothingToCheck.prerequisiteEdgesExamined).toBe(0);
    });
});
