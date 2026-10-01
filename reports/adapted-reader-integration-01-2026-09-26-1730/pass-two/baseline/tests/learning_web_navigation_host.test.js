import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

function between(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from, `missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(to, `missing end marker: ${end}`).toBeGreaterThan(from);
  return source.slice(from, to);
}

describe('Learning Web operational host contracts', () => {
  it('publishes only canonical, bounded Unit Path graphs with exact known resource references', () => {
    const bridge = between('const handleRegisterUnitPathGraph =', 'const handleUnregisterUnitPathGraph =');

    expect(bridge).toContain("candidate.version !== 'acg/v1'");
    expect(bridge).toContain('candidate.nodes.length > 240');
    expect(bridge).toContain('candidate.edges.length > 480');
    expect(bridge).toContain("/^unit-path:[A-Za-z0-9._:-]{1,180}$/.test(graphId)");
    expect(bridge).toContain("return id && id.length <= 200 ? id : ''");
    expect(bridge).toContain(".filter(id => id && knownById.has(id))");
    expect(bridge).toContain("kind: 'unit-path'");
    expect(bridge).toContain('const scopeId = _alloLearningWebScopeId()');
    expect(bridge).toContain("const payloadScopeId = String(payload?.scopeId || '')");
    expect(bridge).toContain('if (payloadScopeId && payloadScopeId !== scopeId) return false');
    expect(bridge).toContain('scopeId,');
    expect(bridge).toContain('if (!saved || saved.storagePersisted === false) return false');
    expect(bridge).toContain('setLearningWebRegistryRevision(value => value + 1)');
    expect(bridge).toContain('return saved;');
    expect(bridge).not.toContain('return saved || false');
    expect(bridge).toContain("provider: 'AlloFlow Unit Path'");
    // A hook dependency array is evaluated during render. This bridge is
    // declared before history state, so [history] here is a fatal TDZ read.
    // history's setter was underscored when direct writes were removed.
    const historyDeclaration = source.indexOf('const [history, _setHistory]');
    const bridgeDeclaration = source.indexOf('const handleRegisterUnitPathGraph =');
    expect(bridgeDeclaration).toBeLessThan(historyDeclaration);
    expect(bridge).not.toMatch(/\},\s*\[[^\]]*\bhistory\b/);
    expect(bridge).not.toContain('payload?.provenance');

    const mount = between('<CDNModuleGate moduleKey="MindMap"', '<CDNModuleGate moduleKey="PoetTree"');
    expect(mount).toContain('unitPathScopeId: _alloLearningWebScopeId()');
    expect(mount).toContain('onRegisterUnitPathGraph: handleRegisterUnitPathGraph');
  });

  it('removes only an exact Unit Path entry from the current project scope', () => {
    const bridge = between('const handleUnregisterUnitPathGraph =', 'const handleConfirmAlignmentAttribution =');

    expect(bridge).toContain("const graphId = String(payload?.id || '')");
    expect(bridge).toContain("/^unit-path:[A-Za-z0-9._:-]{1,180}$/.test(graphId)");
    expect(bridge).toContain('const scopeId = _alloLearningWebScopeId()');
    expect(bridge).toContain("if (String(payload?.scopeId || '') !== scopeId) return false");
    expect(bridge).toContain("typeof registry.removeGraphOfKind !== 'function'");
    expect(bridge).toContain("if (typeof registry.getGraph === 'function')");
    expect(bridge).toContain('const entry = registry.getGraph(graphId, scopeId)');
    expect(bridge).toContain("if (entry && (String(entry.scopeId || '') !== scopeId");
    expect(bridge).toContain("String(entry.graphKind || entry.kind || '') !== 'unit-path'");
    expect(bridge).toContain("registry.removeGraphOfKind(graphId, scopeId, 'unit-path')");
    expect(bridge).toContain('if (!result || result.ok !== true) return false');
    expect(bridge).toContain('An absent in-memory entry still goes through the durable API');
    expect(bridge).not.toContain('if (!entry');
    expect(bridge).not.toContain('registry.removeGraph(');
    expect(bridge).toContain('setLearningWebRegistryRevision(value => value + 1)');
    expect(bridge).toContain('} catch (_) { return false; }');
    expect(bridge).not.toContain("'lexical-graph'");
    expect(bridge).not.toContain("'alignment-map'");
    expect(bridge).not.toContain("'project-resources'");
    expect(bridge).toMatch(/\},\s*\[\]\);/);

    const mount = between('<CDNModuleGate moduleKey="MindMap"', '<CDNModuleGate moduleKey="PoetTree"');
    expect(mount).toContain('unitPathScopeId: _alloLearningWebScopeId()');
    expect(mount).toContain('onUnregisterUnitPathGraph: handleUnregisterUnitPathGraph');
  });

  it('offers and opens only exact, bounded resources already present in the active project', () => {
    const bridge = between('// BEGIN LEARNING_WEB_RESOURCE_OPEN_BRIDGE', '// END LEARNING_WEB_RESOURCE_OPEN_BRIDGE');

    expect(bridge).toContain('(Array.isArray(history) ? history : []).slice(-160)');
    expect(bridge).toContain('.filter(id => id && id.length <= 200)');
    expect(bridge).toContain("const resourceId = String(payload?.resourceId || '')");
    expect(bridge).toContain('if (!resourceId || resourceId.length > 200) return false');
    expect(bridge).toContain(".find(candidate => String(candidate?.id || '') === resourceId)");
    expect(bridge).toContain("addToast('That Learning Web resource is no longer available in this project.', 'info')");
    expect(bridge).toContain('setShowLearningWebExplorer(false)');
    expect(bridge).toContain('const requestedScopeId = _alloLearningWebScopeId()');
    expect(bridge).toContain('if (_alloLearningWebScopeId() !== requestedScopeId) return');
    expect(bridge).toContain('const latestContext = learningWebOpenContextRef.current');
    expect(bridge).toContain(".find(candidate => String(candidate?.id || '') === resourceId)");
    expect(bridge).toContain('const restore = learningWebRestoreViewRef.current');
    expect(bridge).toContain('restore(latestItem)');
    expect(bridge).not.toContain('handleRestoreView(item)');
    expect(bridge).toContain('clearTimeout(learningWebOpenTimerRef.current)');
    expect(bridge).not.toContain('window.open');
    expect(bridge).not.toContain('location');

    const mount = between('<CDNModuleGate moduleKey="LearningWebExplorer"', '<CDNModuleGate moduleKey="MindMap"');
    expect(mount).toContain('openableResourceIds: _alloOpenableLearningWebResourceIds()');
    expect(mount).toContain('onOpenResource: handleOpenLearningWebResource');
    expect(mount).not.toContain('history:');
  });

  it('keeps the existing Lingua lexical registration contract separate', () => {
    const lexical = between('const handleRegisterLearningWebGraph =', 'const handleRegisterUnitPathGraph =');
    expect(lexical).toContain("kind: 'lexical-graph'");
    expect(lexical).not.toContain("kind: 'unit-path'");
  });
});
