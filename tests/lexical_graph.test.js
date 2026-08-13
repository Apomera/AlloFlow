import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(testDir, '..');

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

describe('LexicalGraph/v1 core', () => {
    let sandbox;
    let api;
    let provider;

    beforeAll(() => {
        sandbox = { console };
        sandbox.window = sandbox;
        sandbox.globalThis = sandbox;
        vm.createContext(sandbox);
        const source = fs.readFileSync(path.join(workspaceDir, 'lexical_graph_module.js'), 'utf8');
        vm.runInContext(source, sandbox, { filename: 'lexical_graph_module.js' });
        api = sandbox.AlloModules.LexicalGraph;
        if (!api) throw new Error('LexicalGraph did not register.');
        provider = api.createLocalProvider(api.PILOT_SNAPSHOT);
    });

    it('registers the versioned standalone browser API', () => {
        expect(api.VERSION).toBe('lexical-graph/v1');
        expect(api.SNAPSHOT_VERSION).toBe('alloflow-lexical-snapshot/v1');
        expect(api.NODE_TYPES).toEqual(['lexeme', 'sense', 'form', 'morpheme', 'etymon']);
        expect(api.RELATION_TYPES).toEqual(expect.arrayContaining([
            'hasSense', 'containsMorpheme', 'inflectedFormOf', 'derivedFrom', 'borrowedFrom',
            'inheritedFrom', 'cognateWith', 'translationEquivalent',
            'semanticShiftFrom', 'sharesRoot', 'falseFriendOf', 'sharesRime',
            'pronunciationSimilar'
        ]));
    });

    it('uses language-, entry-, and sense-aware stable ids', () => {
        const english = api.makeLexemeId('English', 'actual', 'adjective-real');
        const spanish = api.makeLexemeId('es-ES', 'actual', 'adjective-current');
        expect(english).toBe('lex:en:actual:adjective-real');
        expect(spanish).toBe('lex:es:actual:adjective-current');
        expect(english).not.toBe(spanish);
        expect(api.makeSenseId(english, 'real-not-imagined')).toBe('sense:lex:en:actual:adjective-real:real-not-imagined');
        expect(api.makeLexemeId('Spanish', 'portátil', 'adjective')).toBe('lex:es:portatil:adjective');
    });

    it('validates a reviewed, attributed, versioned pilot snapshot', () => {
        const report = api.validateSnapshot(api.PILOT_SNAPSHOT);
        expect(report.ok, JSON.stringify(report.errors)).toBe(true);
        expect(report.value.dataset).toMatchObject({
            provider: 'alloflow-reviewed-lexical-pilot',
            datasetVersion: '2026-08-12.2',
            snapshotId: 'alloflow-lexical-en-fr-es-pilot-2026-08-12-r2',
            license: 'CC BY-SA 4.0',
            reviewStatus: 'reviewed'
        });
        expect(report.value.dataset.sources.length).toBeGreaterThanOrEqual(12);
        expect(report.value.dataset.sources).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'wiktionary-fr-transporter', url: 'https://en.wiktionary.org/wiki/transporter#French' }),
            expect.objectContaining({ id: 'wiktionary-es-portatil', url: 'https://en.wiktionary.org/wiki/port%C3%A1til#Spanish' }),
            expect.objectContaining({ id: 'wiktionary-fr-actuel', url: 'https://en.wiktionary.org/wiki/actuel#French' })
        ]));
        expect(report.value.relationships.every((edge) => (
            edge.label
            && edge.direction
            && edge.verification === 'reviewed'
            && edge.provenance.license === 'CC BY-SA 4.0'
            && edge.provenance.sourceIds.length > 0
            && edge.provenance.sourceUrls.every((url) => url.startsWith('https://'))
        ))).toBe(true);
    });

    it('models the portable lineages without conflating portabilis and portatilis', () => {
        const snapshot = api.PILOT_SNAPSHOT;
        const spanishBorrowing = snapshot.relationships.find((edge) => (
            edge.fromId === 'lex:es:portatil:adjective' && edge.relationType === 'borrowedFrom'
        ));
        expect(spanishBorrowing).toMatchObject({ toId: 'ety:la-medieval:portatilis' });
        expect(snapshot.nodes.find((node) => node.id === 'ety:la-medieval:portatilis')).toMatchObject({
            label: 'portātilis', historicalLanguage: 'Medieval Latin'
        });
        expect(snapshot.relationships.some((edge) => (
            edge.fromId === 'ety:la-medieval:portatilis' && edge.toId === 'ety:la:portatus'
        ))).toBe(true);
        expect(snapshot.relationships.some((edge) => (
            edge.fromId === 'lex:es:portatil:adjective' && edge.toId === 'ety:la:portabilis'
        ))).toBe(false);

        expect(snapshot.relationships.find((edge) => edge.id === 'edge:en-portable-middle-english')).toMatchObject({
            fromId: 'lex:en:portable:adjective',
            toId: 'ety:enm:portable',
            relationType: 'inheritedFrom'
        });
        expect(snapshot.relationships).toEqual(expect.arrayContaining([
            expect.objectContaining({ fromId: 'ety:enm:portable', toId: 'ety:frm:portable', relationType: 'derivedFrom' }),
            expect.objectContaining({ fromId: 'ety:enm:portable', toId: 'ety:la:portabilis', relationType: 'derivedFrom' })
        ]));
        const portableClaims = snapshot.relationships.filter((edge) => edge.id.includes('portable') || edge.id.includes('portatil'));
        expect(JSON.stringify(portableClaims)).not.toContain('Anglo-Norman');
    });

    it('validates graph manifests and binds every edge to exact manifest provenance', () => {
        const graph = provider.getNeighborhood('transport', {
            language: 'English', depth: 2, maxNodes: 18, maxEdges: 30
        });
        expect(graph.manifest.reviewedAt).toBe('2026-08-12');
        expect(graph.edges.every((edge) => edge.provenance.reviewedAt === graph.manifest.reviewedAt)).toBe(true);
        expect(api.validateGraph(graph).ok).toBe(true);

        const invalidProbe = (mutate, code) => {
            const candidate = clone(graph);
            mutate(candidate);
            const report = api.validateGraph(candidate);
            expect(report.ok).toBe(false);
            expect(report.errors.some((entry) => entry.code === code), JSON.stringify(report.errors)).toBe(true);
        };
        invalidProbe((candidate) => { delete candidate.manifest.reviewedAt; }, 'manifest-reviewed-at-required');
        invalidProbe((candidate) => { candidate.edges[0].provenance.license = 'MIT'; }, 'edge-provenance-license-mismatch');
        invalidProbe((candidate) => { candidate.edges[0].provenance.attribution = 'Unlisted attribution'; }, 'edge-source-attribution-mismatch');
        invalidProbe((candidate) => { candidate.edges[0].provenance.sourceIds[0] = 'unlisted-source'; }, 'edge-source-unknown');
        invalidProbe((candidate) => { candidate.edges[0].provenance.sourceUrls[0] = 'https://example.com/unlisted'; }, 'edge-source-url-mismatch');
        invalidProbe((candidate) => { delete candidate.edges[0].provenance.reviewedAt; }, 'edge-provenance-reviewed-at-required');
        invalidProbe((candidate) => { candidate.edges[0].provenance.reviewedAt = '2025-01-01'; }, 'edge-provenance-reviewed-at-mismatch');
    });

    it('rejects unknown relations, missing provenance, duplicates, and wrong direction', () => {
        const unknown = clone(api.PILOT_SNAPSHOT);
        unknown.relationships[0].relationType = 'looksLike';
        expect(api.validateSnapshot(unknown).errors.some((entry) => entry.code === 'edge-relation-invalid')).toBe(true);

        const noProvenance = clone(api.PILOT_SNAPSHOT);
        delete noProvenance.relationships[0].provenance;
        expect(api.validateSnapshot(noProvenance).errors.some((entry) => entry.code === 'edge-provenance-required')).toBe(true);

        const duplicate = clone(api.PILOT_SNAPSHOT);
        duplicate.nodes.push(clone(duplicate.nodes[0]));
        expect(api.validateSnapshot(duplicate).errors.some((entry) => entry.code === 'node-id-duplicate')).toBe(true);

        const direction = clone(api.PILOT_SNAPSHOT);
        direction.relationships.find((edge) => edge.relationType === 'cognateWith').direction = 'directed';
        expect(api.validateSnapshot(direction).errors.some((entry) => entry.code === 'edge-direction-invalid')).toBe(true);
    });

    it('requires translation relationships to remain sense-specific', () => {
        const notSenseSpecific = clone(api.PILOT_SNAPSHOT);
        const edge = notSenseSpecific.relationships.find((item) => item.relationType === 'translationEquivalent');
        edge.fromId = 'lex:en:transport:verb';
        edge.toId = 'lex:fr:transporter:verb';
        const report = api.validateSnapshot(notSenseSpecific);
        expect(report.ok).toBe(false);
        expect(report.errors.some((entry) => entry.code === 'translation-not-sense-specific')).toBe(true);
    });

    it('resolves language names and BCP-47 bases without conflating languages', () => {
        const english = provider.resolveLexeme('actual', { language: 'English' });
        const french = provider.resolveLexeme('actuel', { languageTag: 'fr-FR' });
        const spanish = provider.resolveLexeme('actual', { languageTag: 'es-MX' });
        expect(english).toMatchObject({ status: 'resolved', id: 'lex:en:actual:adjective' });
        expect(french).toMatchObject({ status: 'resolved', id: 'lex:fr:actuel:adjective' });
        expect(spanish).toMatchObject({ status: 'resolved', id: 'lex:es:actual:adjective' });
        expect(english.match.senses[0]).toMatchObject({ senseKey: 'real-not-imagined' });
        expect(spanish.match.senses[0]).toMatchObject({ senseKey: 'current-present-time' });
        expect(provider.resolveLexeme('actual').status).toBe('ambiguous');
        expect(provider.resolveLexeme('portatil', { language: 'Spanish' })).toMatchObject({
            status: 'resolved', id: 'lex:es:portatil:adjective'
        });
    });

    it('distinguishes borrowed lookalikes from a genuine inherited cognate set', () => {
        const snapshot = api.PILOT_SNAPSHOT;
        const nodeById = Object.fromEntries(snapshot.nodes.map((node) => [node.id, node]));
        const cognates = snapshot.relationships.filter((edge) => edge.relationType === 'cognateWith');
        expect(cognates).toHaveLength(3);
        expect(cognates.every((edge) => ['night', 'nuit', 'noche'].includes(nodeById[edge.fromId].lemma)
            && ['night', 'nuit', 'noche'].includes(nodeById[edge.toId].lemma))).toBe(true);
        expect(snapshot.relationships.some((edge) => edge.relationType === 'borrowedFrom'
            && edge.fromId === 'lex:en:actual:adjective')).toBe(true);
        expect(snapshot.relationships.some((edge) => edge.relationType === 'inheritedFrom'
            && edge.fromId === 'lex:en:night:noun')).toBe(true);

        const graph = provider.getNeighborhood('night', { language: 'English', depth: 3, maxNodes: 20, maxEdges: 30 });
        expect(graph.edges.some((edge) => edge.relationType === 'cognateWith')).toBe(true);
        expect(graph.nodes.some((node) => node.id === 'lex:fr:nuit:noun')).toBe(true);
        expect(graph.nodes.some((node) => node.id === 'lex:es:noche:noun')).toBe(true);
    });

    it('returns a deterministic bounded multilingual neighborhood', () => {
        const options = { depth: 2, maxNodes: 18, maxEdges: 30, languages: ['English', 'French', 'Spanish'] };
        const first = provider.getNeighborhood('lex:en:transport:verb', options);
        const second = provider.getNeighborhood('lex:en:transport:verb', options);
        expect(first).toEqual(second);
        expect(first).toMatchObject({
            version: 'lexical-graph/v1',
            focusId: 'lex:en:transport:verb',
            meta: { status: 'resolved', depth: 2, maxNodes: 18, maxEdges: 30 }
        });
        expect(first.nodes[0].id).toBe(first.focusId);
        expect(first.nodes.length).toBeLessThanOrEqual(18);
        expect(first.edges.length).toBeLessThanOrEqual(30);
        expect(first.nodes.some((node) => node.id === 'morph:la:port')).toBe(true);
        expect(first.edges.some((edge) => edge.relationType === 'hasSense'
            && edge.fromId === first.focusId
            && edge.toId === 'sense:lex:en:transport:verb:move-from-place-to-place')).toBe(true);
        expect(first.nodes.some((node) => node.id === 'lex:fr:transporter:verb')).toBe(true);
        expect(first.edges.every((edge) => edge.provenance.sourceUrls.length > 0)).toBe(true);
        expect(api.validateGraph(first).ok).toBe(true);
    });

    it('applies strict query bounds and relation filters', () => {
        // Errors originate in the vm realm, so assert their stable messages rather than
        // comparing the realm-specific RangeError constructor.
        expect(() => provider.getNeighborhood('transport', { maxNodes: api.LIMITS.maxGraphNodes + 1 })).toThrow(/maxNodes must be an integer/);
        expect(() => provider.getNeighborhood('transport', { depth: api.LIMITS.maxDepth + 1 })).toThrow(/depth must be an integer/);
        expect(() => provider.getNeighborhood('transport', { relations: ['madeUpRelation'] })).toThrow(/Unknown lexical relation/);

        const rootsOnly = provider.getNeighborhood('lex:en:transport:verb', {
            depth: 2,
            relations: ['containsMorpheme', 'sharesRoot'],
            maxNodes: 12,
            maxEdges: 20
        });
        expect(rootsOnly.edges.length).toBeGreaterThan(0);
        expect(rootsOnly.edges.every((edge) => ['containsMorpheme', 'sharesRoot'].includes(edge.relationType))).toBe(true);
    });

    it('creates a deterministic accessible outline despite symmetric cycles', () => {
        const graph = provider.getNeighborhood('lex:en:actual:adjective', {
            depth: 3, maxNodes: 20, maxEdges: 30
        });
        const first = api.deriveAccessibleOutline(graph);
        const second = api.deriveAccessibleOutline(graph);
        expect(first).toEqual(second);
        expect(first.version).toBe('lexical-outline/v1');
        expect(first.order[0]).toBe(graph.focusId);
        expect(new Set(first.order).size).toBe(graph.nodes.length);
        expect(first.relationships.some((item) => item.relationType === 'sharesRoot')).toBe(true);
        expect(first.text).toContain('Verification: reviewed.');
        expect(first.relationships.every((item) => item.sourceUrls.length > 0)).toBe(true);

        const parallel = clone(graph.edges[0]);
        parallel.id = 'edge:test-parallel-relationship';
        parallel.relationType = 'pronunciationSimilar';
        parallel.label = 'has a similar pronunciation to';
        parallel.direction = 'symmetric';
        graph.edges.push(parallel);
        const withParallelEdge = api.deriveAccessibleOutline(graph);
        expect(withParallelEdge.order).toHaveLength(graph.nodes.length);
        expect(new Set(withParallelEdge.order).size).toBe(graph.nodes.length);
    });

    it('adapts to acg/v1 while retaining exact lexical semantics', () => {
        const graph = provider.getNeighborhood('lex:en:actual:adjective', {
            depth: 3, maxNodes: 20, maxEdges: 30
        });
        const acg = api.toACG(graph);
        expect(acg.version).toBe('acg/v1');
        expect(acg.nodes.find((node) => node.id === graph.focusId)).toMatchObject({
            type: 'main', lexicalType: 'lexeme', language: 'en'
        });
        const falseFriend = acg.edges.find((edge) => edge.relationType === 'falseFriendOf');
        expect(falseFriend).toMatchObject({
            type: 'contrast',
            direction: 'symmetric',
            verification: 'reviewed'
        });
        expect(falseFriend.provenance).toMatchObject({
            provider: 'alloflow-reviewed-lexical-pilot',
            license: 'CC BY-SA 4.0',
            reviewedAt: '2026-08-12'
        });
        expect(acg.meta.manifest.reviewedAt).toBe('2026-08-12');
        expect(acg.meta.lexicalGraphVersion).toBe('lexical-graph/v1');
        expect(acg.meta.accessibleOutline.order[0]).toBe(graph.focusId);
        expect(['contains', 'elaborates', 'relatedTo', 'associates', 'contrast'])
            .toEqual(expect.arrayContaining([...new Set(acg.edges.map((edge) => edge.type))]));
    });
});
