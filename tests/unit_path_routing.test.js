// Unit Path routing through the existing lesson progression: the registered
// unit-path graph (Learning Web) resolves the current plan's node, the
// progression offers the next node as option 1 ("On the path"), activating it
// remembers the node so the plan generated next is stamped as that node, and
// the plan prompt gets the path context. Also: synthetic options (Reteach from
// a success criterion) pass the stale-request gate deliberately, and nothing
// here infers a node from a title. Pure resolver run through the real source;
// wiring pinned in sources and the shipped modules.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const utilsSource = read('utils_pure_source.jsx');
const hostSource = read('host_handlers_source.jsx');
const dispatcher = read('generate_dispatcher_source.jsx');
const planView = read('view_lesson_plan_source.jsx');

function loadResolver() {
    const start = utilsSource.indexOf('// --- Unit Path context ---');
    const end = utilsSource.indexOf('const getAssetManifest = (historyItems, options = {}) => {');
    if (start === -1 || end === -1) throw new Error('resolveUnitPathContext not found');
    const sandbox = {};
    vm.runInNewContext(utilsSource.slice(start, end) + '\nthis.resolve = resolveUnitPathContext;', sandbox, { filename: 'unit-path-resolver.js' });
    return sandbox.resolve;
}

const graphEntry = (overrides = {}) => ({
    id: 'unit-path:abc',
    title: 'Ancient Egypt',
    graph: {
        version: 'acg/v1',
        nodes: [
            { id: 'n1', label: 'The Nile floods', resourceId: 'plan-1', type: 'lesson' },
            { id: 'n2', label: 'Surplus and specialists', type: 'plannedLesson' },
            { id: 'n3', label: 'Writing and record keeping', type: 'plannedLesson' },
        ],
        edges: [{ source: 'n1', target: 'n2' }, { source: 'n2', target: 'n3' }],
    },
    ...overrides,
});

describe('resolveUnitPathContext', () => {
    const resolve = loadResolver();

    it('finds the plan by exact resourceId and reports prior, next, index and count', () => {
        const out = resolve([graphEntry()], { id: 'plan-1' });
        expect(out).toMatchObject({ graphId: 'unit-path:abc', title: 'Ancient Egypt', index: 1, count: 3 });
        expect(out.current).toEqual({ id: 'n1', label: 'The Nile floods', resourceId: 'plan-1', planned: false });
        expect(out.prior).toBeNull();
        expect(out.next).toEqual({ id: 'n2', label: 'Surplus and specialists', resourceId: '', planned: true });
    });

    it('finds a plan by its stamped node when it has no resourceId on the graph yet, and walks from/to edge shapes', () => {
        const entry = graphEntry({ graph: { version: 'acg/v1', nodes: graphEntry().graph.nodes, edges: [{ from: 'n1', to: 'n2' }, { fromId: 'n2', toId: 'n3' }] } });
        const out = resolve([entry], { id: 'plan-2', data: { unitPath: { graphId: 'unit-path:abc', nodeId: 'n2' } } });
        expect(out.current.id).toBe('n2');
        expect(out.prior.id).toBe('n1');
        expect(out.next.id).toBe('n3');
        expect(out.index).toBe(2);
    });

    it('never infers a node from titles, ignores non-unit-path graphs, and tolerates junk', () => {
        const titled = graphEntry({ graph: { version: 'acg/v1', nodes: [{ id: 'n1', label: 'Plan 9 lesson', type: 'plannedLesson' }], edges: [] } });
        expect(resolve([titled], { id: 'plan-9', title: 'Plan 9 lesson' })).toBeNull();
        expect(resolve([graphEntry({ id: 'concept-map:xyz' })], { id: 'plan-1' })).toBeNull();
        expect(resolve([graphEntry()], { id: 'plan-1', data: { unitPath: { graphId: 'unit-path:other', nodeId: 'n2' } } }).current.id).toBe('n1');
        expect(resolve(null, { id: 'plan-1' })).toBeNull();
        expect(resolve([null, {}, { id: 'unit-path:x', graph: null }], { id: 'plan-1' })).toBeNull();
        expect(resolve([graphEntry()], null)).toBeNull();
    });

    it('reports no next node at the end of the path and self-loops do not count', () => {
        const last = graphEntry({ graph: { version: 'acg/v1', nodes: [{ id: 'n1', label: 'A', resourceId: 'p' }, { id: 'n2', label: 'B', resourceId: 'plan-1' }], edges: [{ source: 'n1', target: 'n2' }, { source: 'n2', target: 'n2' }] } });
        const out = resolve([last], { id: 'plan-1' });
        expect(out.index).toBe(2);
        expect(out.next).toBeNull();
        expect(out.prior.id).toBe('n1');
    });
});

describe('progression routing pins', () => {
    it('offers the next node as option 1 with its node attached, and tells the model about the path', () => {
        const block = hostSource.slice(hostSource.indexOf('const handleGenerateProgression = async () => {'), hostSource.indexOf('const handleActivateNextLesson = (option, extra) => {'));
        expect(block).toContain("utils.resolveUnitPathContext(registry.listGraphs(scopeId ? { scopeId } : {}), plan || { id: context.planId })");
        expect(block).toContain("type: 'On the path',");
        expect(block).toContain('unitPath: { graphId: pathContext.graphId, nodeId: pathContext.next.id,');
        expect(block).toContain('options.unshift({');
        expect(block).toContain('UNIT PATH (content data)');
        // The path option is added AFTER the model's options are validated, never before.
        expect(block.indexOf("!['nextTopic', 'rationale', 'focus', 'type'].every(")).toBeLessThan(block.indexOf('options.unshift({'));
    });

    it('activating a path option remembers the node; synthetic options skip only the stale-request gate', () => {
        const block = hostSource.slice(hostSource.indexOf('const handleActivateNextLesson = (option, extra) => {'), hostSource.indexOf('const handleActivateNextLesson = (option, extra) => {') + 2600);
        expect(block).toContain("const synthetic = !!(extra && extra.synthetic === true && option && typeof option.nextTopic === 'string' && option.nextTopic.trim());");
        expect(block).toContain("if (synthetic) {\n          if (!syntheticContext) return;\n      } else if (!option || !request?.options?.includes(option)");
        expect(block).toContain('window.__alloPendingUnitPathNode = { ...option.unitPath, priorPlanId: context.planId || null, since: Date.now() };');
        expect(block).toContain('delete window.__alloPendingUnitPathNode;');
    });

    it('the dispatcher feeds the pending node into the plan prompt, stamps the plan, and clears the marker', () => {
        expect(dispatcher).toContain('--- UNIT PATH CONTEXT ---');
        expect(dispatcher).toContain('prompt = buildLessonPlanPrompt(context + _unitPathBlock, assetManifest, effectiveLanguage, effCustomInstructions);');
        expect(dispatcher).toContain('content.unitPath = {');
        expect(dispatcher).toContain("nodeId: String(_pendingUnitPathNode.nodeId),");
        expect(dispatcher).toContain('try { delete window.__alloPendingUnitPathNode; } catch (_) {}');
    });

    it('the plan shows its node and Reteach passes the synthetic flag the gate requires', () => {
        expect(planView).toContain('data-unit-path-node={generatedContent.data.unitPath.nodeId}');
        expect(planView).toContain("}, { synthetic: true })} className=");
        expect(planView).toContain("`node ${generatedContent.data.unitPath.index} of ${generatedContent.data.unitPath.count}`");
    });

    it('ships in the built modules and their public mirrors', () => {
        for (const [m, needle] of [['utils_pure_module.js', 'resolveUnitPathContext'], ['host_handlers_module.js', '__alloPendingUnitPathNode'], ['generate_dispatcher_module.js', 'UNIT PATH CONTEXT'], ['view_lesson_plan_module.js', 'data-unit-path-node']]) {
            const root = read(m);
            expect(root, m).toContain(needle);
            expect(root, m).toBe(read(path.join('desktop', 'web-app', 'public', m)));
        }
        expect(read('host_handlers_module.js')).toContain('On the path');
    });
});
