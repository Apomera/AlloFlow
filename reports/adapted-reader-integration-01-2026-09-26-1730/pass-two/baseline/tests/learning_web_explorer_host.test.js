import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const host = read('AlloFlowANTI.txt');

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from, `missing start: ${start}`).toBeGreaterThanOrEqual(0);
  expect(to, `missing end: ${end}`).toBeGreaterThan(from);
  return source.slice(from, to);
}

describe('Learning Web Explorer host integration', () => {
  it('registers and lazy-loads the dedicated module without replacing Unit Path', () => {
    const build = read('build.js');
    expect(build).toContain("name: 'LearningWebExplorer'");
    expect(build).toContain("filename: 'learning_web_explorer_module.js'");
    // Hash-agnostic: the post-deploy job rotates ?v= on every release.
    expect(host).toMatch(/loadModule\('LearningWebExplorer', 'https:\/\/alloflow-cdn\.pages\.dev\/learning_web_explorer_module\.js\?v=[a-z0-9]+'\)/);
    expect(host).toContain('moduleKey="LearningWebExplorer"');
    expect(host).toContain('displayName="Learning Web: Explore"');
    expect(host).toContain('moduleKey="MindMap"');
    expect(host).toContain('displayName="Learning Web: Unit Path"');
  });

  it('passes only a bounded project-scoped graph contract to the Explorer', () => {
    const helper = between(host, 'const _alloBoundLearningWebGraphForExplorer =', 'const _alloAlignmentRegistryRecordFromResource =');
    expect(helper).toContain("registry.buildUnifiedGraph({ scopeId })");
    expect(helper).toContain("registry.listGraphs({ scopeId })");
    expect(helper).toContain('normalized.nodes.length <= 600');
    expect(helper).toContain('normalized.edges.length <= 1800');
    expect(helper).toContain('totalBytes + bytes > 3000000');

    const mount = between(host, '<CDNModuleGate moduleKey="LearningWebExplorer"', '<CDNModuleGate moduleKey="MindMap"');
    expect(mount).toContain('React.createElement(LearningWebExplorer.View || LearningWebExplorer, {');
    expect(mount).toContain('graph: explorerPayload.graph');
    expect(mount).toContain('registrySnapshot: explorerPayload.registrySnapshot');
    expect(mount).toContain('isModal: true');
    expect(mount).toContain('scopeId: explorerPayload.scopeId');
    expect(mount).toContain("currentResourceId: String(generatedContent?.id || '').slice(0, 200)");
    expect(mount).not.toContain('history:');
  });

  it('reconciles broad resources and independently removes stale alignment indexes', () => {
    const reconcile = between(host, 'const reconcileLearningWeb = () => {', 'const onModuleChange =');
    expect(reconcile).toContain("typeof registry.reconcileResources === 'function'");
    expect(reconcile).toContain('registry.reconcileResources(projectResources, { scopeId, includeEmbeddedAlignment: false })');
    expect(reconcile).toContain("typeof registry.reconcileGraphs === 'function'");
    expect(reconcile).toContain("const alignmentResult = registry.reconcileGraphs(records, { scopeId, kind: 'alignment-map' })");
    expect(reconcile).not.toContain("else if (typeof registry.reconcileGraphs");
    expect(reconcile).toContain('const projectResourceHistoryLimit = blueprintResource ? 159 : 160');
    expect(reconcile).toContain('(Array.isArray(history) ? history : []).slice(-projectResourceHistoryLimit)');
    expect(reconcile).toContain('if (blueprintResource) projectResources.push(blueprintResource)');
    expect(host).toContain('[history, activeBlueprint, isHistoryLoaded, isCanvas, canvasRecoveryDecisionMade]');
  });

  it('adds only a bounded Blueprint projection and an optional Lingua graph callback', () => {
    const blueprint = between(host, 'const _alloBlueprintLearningWebResource =', 'const _alloBoundLearningWebGraphForExplorer =');
    expect(blueprint).toContain('blueprint.resourcePlan.slice(0, 80)');
    expect(blueprint).toContain("title: bounded(blueprint.title || blueprint.name || 'Active Blueprint', 200)");
    expect(blueprint).not.toContain('prompt');
    expect(blueprint).not.toContain('instructions');

    const linguaBridge = between(host, 'const handleRegisterLearningWebGraph =', 'const handleConfirmAlignmentAttribution =');
    expect(linguaBridge).toContain("const resourceId = bounded(payload?.resourceId || generatedContent?.id || 'lingua-session', 200)");
    expect(linguaBridge).toContain("resourceType: bounded(payload?.resourceType || generatedContent?.type || 'lingua-practice', 100)");
    expect(linguaBridge).not.toContain('generatedContent?.id || payload?.resourceId');
    expect(linguaBridge).toContain("kind: 'lexical-graph'");
    expect(linguaBridge).toContain('scopeId: _alloLearningWebScopeId()');
    expect(linguaBridge).toContain('const graphManifest = graphMeta?.source?.manifest || graphMeta?.manifest || {}');
    expect(linguaBridge).toContain('provider: bounded(graphManifest.provider || graphMeta.provider, 120)');
    expect(linguaBridge).toContain('license: bounded(graphManifest.license || graphMeta.license, 120)');
    expect(linguaBridge).not.toContain('payload?.provenance');
    expect(host).toContain('onRegisterLearningWebGraph: handleRegisterLearningWebGraph');
  });

  it('exposes separate Learning Hub and command entries for Explore and Unit Path', () => {
    const hubSource = read('view_learning_hub_modal_source.jsx');
    const commandSource = read('allo_commands_source.jsx');
    expect(hubSource).toContain('data-hub-id="learning-web-explorer"');
    expect(hubSource).toContain("'Learning Web: Explore'");
    expect(hubSource).not.toContain('data-hub-id="throughline"');
    const educatorSource = read('view_educator_hub_modal_source.jsx');
    expect(educatorSource).toContain('data-hub-id="throughline"');
    expect(educatorSource).toContain('setShowMindMap(true)');
    expect(commandSource).toContain("id: 'open_learning_web_explorer'");
    expect(commandSource).toContain("roles: 'teacher'");
    expect(commandSource).toContain("open_mind_map:['educatorHub','content','mindMap']");
    expect(commandSource).toContain("id: 'open_mind_map'");
    expect(commandSource).toContain("roles: 'teacher'");
    expect(commandSource).toContain("open_mind_map:['educatorHub','content','mindMap']");
  });

  it('keeps generated launch modules synchronized with their public mirrors', () => {
    expect(read('view_learning_hub_modal_module.js')).toContain('Learning Web: Explore');
    expect(read('allo_commands_module.js')).toContain('open_learning_web_explorer');
    expect(read('desktop/web-app/public/view_learning_hub_modal_module.js')).toBe(read('view_learning_hub_modal_module.js'));
    expect(read('desktop/web-app/public/allo_commands_module.js')).toBe(read('allo_commands_module.js'));
    expect(read('desktop/web-app/public/learning_web_registry_module.js')).toBe(read('learning_web_registry_module.js'));
    expect(read('desktop/web-app/public/learning_web_explorer_module.js')).toBe(read('learning_web_explorer_module.js'));
    expect(read('desktop/web-app/public/lingua_practice_module.js')).toBe(read('lingua_practice_module.js'));
    expect(read('desktop/web-app/public/lexical_graph_module.js')).toBe(read('lexical_graph_module.js'));
  });
});
