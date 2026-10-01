// Visual Organizer fixes (2026-09-27 review of the 24 core resources).
// O2: a translated Problem-Solution / Cause-Effect map uses the generated branch role in
//     the interactive map and the saved-diagram blueprint, like the static view.
// O3/O4: learner 3D / palace work goes to the learner's own store, never the teacher's
//     resource; persists are bound to the resource that made them.
// O5: the organizer toggle and remove-concept control are translated and named.
// O1: "Edit diagram layout" work is persisted (host source contract; no app harness).
// Mutation runs point the *_CANDIDATE env vars at pre-fix builds kept in a scratch dir.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const load = (file, env) => new Function(readFileSync(process.env[env] || resolve(process.cwd(), file), 'utf8') + '\n//# sourceURL=' + file)();
const antiSource = () => readFileSync(process.env.FIX0927_ORG_ANTI || resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

let React, createRoot, act, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null, has: () => true });
  window.warnLog = window.warnLog || (() => {});
  load('resource_content_fingerprint_module.js', 'FIX0927_ORG_FINGERPRINT');
  load('utils_pure_module.js', 'FIX0927_ORG_UTILS');
  load('concept_map_handlers_module.js', 'FIX0927_ORG_CMAP');
  load('host_handlers_module.js', 'FIX0927_ORG_HOST');
  load('view_outline_module.js', 'FIX0927_ORG_OUTLINE');
  load('view_renderers_module.js', 'FIX0927_ORG_RENDERERS');
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; });

async function interactive(data, t) {
  let nodes = null, edges = null;
  await window.AlloModules.CmapHandlers.handleInitializeMap({
    generatedContent: { id: 'org', data }, mapContainerRef: { current: { offsetWidth: 800, offsetHeight: 600 } },
    hasAutoLayoutRunRef: { current: false }, setConceptMapNodes: v => { nodes = v; }, setConceptMapEdges: v => { edges = v; },
    setIsConceptMapReady: () => {}, handleAutoLayout: async () => true, parseFlowChartData: () => ({ nodes: [], edges: [] }), warnLog: () => {}, t,
  });
  return { nodes, edges };
}
const shape = nodes => nodes.map(n => n.id + '=' + n.type).sort();

describe('O2: translated organizers classify branches by their generated role', () => {
  const ps = { structureType: 'Problem Solution', main: 'El agua se contamina', branches: [
    { role: 'solution', title: 'Filtrar', items: ['Arena', 'Carbon'] },
    { role: 'solution', title: 'Hervir', items: ['Calor'] },
    { role: 'outcome', title: 'Desenlace', items: ['Agua limpia'] } ] };
  const ce = { structureType: 'Cause and Effect', main: 'Inundacion', branches: [
    { role: 'cause', title: 'Causas', items: ['Lluvia'] },
    { role: 'effect', title: 'Efectos', items: ['Casas dañadas'] },
    { role: 'chain', title: 'Reacción en cadena', items: ['Paso 1', 'Paso 2'] } ] };

  it('Problem-Solution: the role=outcome branch is the outcome, with no invented English node', async () => {
    const { nodes } = await interactive(ps, k => k);
    expect(nodes.filter(n => n.type === 'ps-solution').map(n => n.text)).toEqual(['Filtrar', 'Hervir']);
    expect(nodes.find(n => n.type === 'ps-outcome').text).toBe('Desenlace');
    expect(nodes.some(n => n.text === 'Outcome')).toBe(false);
    expect(shape(window.AlloModules.UtilsPure.outlineNodeBlueprints(ps).nodes)).toEqual(shape(nodes));
  });

  it('Cause-Effect: the role=chain branch keeps its chain nodes and chain link', async () => {
    const { nodes, edges } = await interactive(ce, k => k);
    expect(nodes.filter(n => n.type === 'chain-node').map(n => n.text)).toEqual(['Paso 1', 'Paso 2']);
    expect(nodes.filter(n => n.type === 'effect-node').map(n => n.text)).toEqual(['Casas dañadas']);
    expect(edges.some(e => e.fromId === 'chain-2-0' && e.toId === 'chain-2-1')).toBe(true);
    const blueprint = window.AlloModules.UtilsPure.outlineNodeBlueprints(ce);
    expect(shape(blueprint.nodes)).toEqual(shape(nodes));
    expect(blueprint.links.some(e => e.fromId === 'chain-2-0' && e.toId === 'chain-2-1')).toBe(true);
  });

  it('a Problem-Solution map with no outcome branch gets a translated outcome node', async () => {
    const two = { ...ps, branches: ps.branches.slice(0, 2) };
    const { nodes } = await interactive(two, k => (k === 'outline.labels.outcome' ? 'Resultado y evaluación' : undefined));
    expect(nodes.find(n => n.type === 'ps-outcome').text).toBe('Resultado y evaluación');
  });

  it('the generated role wins over English title words', () => {
    const roles = window.AlloModules.UtilsPure.organizerBranchRoles('Cause and Effect', [
      { role: 'cause', title: 'Why' }, { role: 'chain', title: 'Effects chain' }, { title: 'Consequences' }]);
    expect(roles).toEqual(['cause', 'chain', 'effect']);
  });
});

describe('O3/O4: learner 3D and palace work stays out of the teacher resource', () => {
  function hostFor(extra) {
    const resource = { id: 'org-1', type: 'outline', data: { main: 'M', branches: [{ title: 'A', items: ['x'] }], conceptSpace: { owner: 'teacher' } } };
    const state = { responses: {}, updates: [], set: null };
    const deps = new Proxy({
      generatedContent: resource, isTeacherMode: true,
      setStudentResponses: f => { state.responses = typeof f === 'function' ? f(state.responses) : f; },
      onUpdateResource: (id, updater) => { state.updates.push({ id, next: updater(resource) }); return true; },
      setGeneratedContent: v => { state.set = v; }, setHistory: () => {}, ...extra,
    }, { get: (o, k) => (k in o ? o[k] : undefined) });
    return { H: window.AlloModules.createHostHandlers(deps), state, resource };
  }

  it('a student (or a teacher previewing as one) writes to their own work, not the resource', () => {
    const { H, state, resource } = hostFor({ isTeacherMode: false });
    H.handleConceptSpacePersist({ positions: { b0: [1, 2, 3] } }, 'conceptSpace', 'org-1');
    H.handleConceptSpacePersist({ 'b0|b1': { w: 0.8, why: 'mine' } }, 'constellation', 'org-1');
    H.handleConceptSpacePersist(null, 'memoryPalace', 'org-1');
    expect(state.set).toBe(null);
    expect(state.updates).toEqual([]);
    expect(resource.data.conceptSpace).toEqual({ owner: 'teacher' });
    expect(state.responses['org-1'].organizerWork).toEqual({
      conceptSpace: { positions: { b0: [1, 2, 3] } }, constellation: { 'b0|b1': { w: 0.8, why: 'mine' } }, memoryPalace: null });
  });

  it('a teacher write is bound to the resource that made it, even after navigation', () => {
    const { H, state } = hostFor({});
    H.handleConceptSpacePersist({ positions: {} }, 'conceptSpace', 'org-2');
    expect(state.set).toBe(null);
    expect(state.updates.map(u => u.id)).toEqual(['org-2']);
  });

  it('the learner view overlays the learner store without touching the teacher data', () => {
    const merge = window.AlloModules.ViewRenderers.organizerDataWithLearnerWork;
    const data = { main: 'M', conceptSpace: { owner: 'teacher' }, memoryPalace: { images: { a: 1 } } };
    const work = { conceptSpace: { owner: 'learner' }, memoryPalace: null };
    const merged = merge(data, work);
    expect(merged.conceptSpace).toEqual({ owner: 'learner' });
    expect(merged.memoryPalace).toBe(null);
    expect(data.conceptSpace).toEqual({ owner: 'teacher' });
    expect(merge(data, work)).toBe(merged);
    expect(merge(data, null)).toBe(data);
  });

  it('the learner store is handed to the organizer renderers and Reset stays a teacher control', () => {
    const anti = antiSource();
    expect((anti.match(/organizerLearnerWork: isTeacherMode \? null : \(studentResponses\[generatedContent\?\.id\]\?\.organizerWork \|\| null\)/g) || []).length).toBe(3);
    const renderers = readFileSync(resolve(process.cwd(), process.env.FIX0927_ORG_RENDERERS_SRC || 'view_renderers_source.jsx'), 'utf8');
    expect(renderers).toMatch(/hasContent && persist && isTeacherMode && data\?\.conceptSpace && !failed/);
    expect(renderers).toMatch(/if \(canPersist && opts\.canReset !== false\)/);
    expect(renderers).toMatch(/if \(!artAliveRef\.current \|\| graphRef\.current !== startGraph\) return;/);
  });
});

describe('O1: interactive layout edits are saved to the resource', () => {
  it('drag, add, link, delete, reset and auto layout mark the layout edited, and an id-bound debounced write saves it', () => {
    const anti = antiSource();
    for (const handler of ['handleNodeClick', 'handleAddManualNode', 'handleResetLayout']) {
      expect(anti, handler).toMatch(new RegExp('const ' + handler + ' = \\(\\.\\.\\.__a\\) => \\{ markOrganizerLayoutEdited\\(\\); return _alloHostHandlers\\(\\)\\.' + handler));
    }
    expect(anti).toMatch(/handleAutoLayout: \(\.\.\.__a\) => \{ markOrganizerLayoutEdited\(\); return handleAutoLayout\(\.\.\.__a\); \}/);
    expect(anti).toMatch(/e\.preventDefault\(\);\n\s+markOrganizerLayoutEdited\(\);/);
    expect(anti).toMatch(/onUpdateResource\(id, item => !item\?\.data \|\| item\.data\.challenge[^\n]*\{ \.\.\.item, data: \{ \.\.\.item\.data, nodes, edges \} \}\);/);
    // A saved graph reopens with its own edges (an edited-away edge must not come back).
    expect(anti).toMatch(/if \(Array\.isArray\(savedEdges\) && \(savedEdges\.length > 0 \|\| Array\.isArray\(savedNodes\)\)\)/);
  });
});

describe('O5: organizer toggle and remove-concept control are translated', () => {
  const T = { 'outline.edit_diagram_layout': 'Editar diseño', 'outline.view_diagram': 'Ver diagrama', 'outline.remove_concept_named': 'Quitar concepto {name}' };
  const render = (props) => {
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    act(() => root.render(React.createElement(window.AlloModules.OutlineView, {
      t: k => T[k], isTeacherMode: true, isProcessing: false, isInteractiveVenn: false, isVennPlaying: false,
      generatedContent: { id: 'o', type: 'outline', data: { structureType: 'Key Concept Map', main: 'Agua', branches: [{ title: 'Lluvia', items: [] }] } },
      renderInteractiveMap: () => null, renderOutlineContent: () => null, handleRemoveFromMapList: () => {}, setMapAddInput: () => {}, mapAddInput: '',
      ...props,
    })));
  };
  it('uses the translation keys for the toggle', () => {
    render({ isInteractiveMap: false });
    expect(host.textContent).toContain('Editar diseño');
    expect(host.textContent).not.toContain('Edit diagram layout');
  });
  it('names the remove control after the concept it removes', () => {
    render({ isInteractiveMap: true, isConceptMapReady: false, isChallengeActive: false });
    expect(host.textContent).toContain('Ver diagrama');
    const remove = host.querySelector('button[aria-label="Quitar concepto Lluvia"]');
    expect(remove).toBeTruthy();
  });
});
