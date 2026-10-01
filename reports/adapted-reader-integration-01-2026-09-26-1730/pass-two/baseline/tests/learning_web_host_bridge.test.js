import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

function between(start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex, `missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `missing end marker: ${end}`).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe('Learning Web host bridge', () => {
  it('keeps imported graph data in an isolated session buffer', () => {
    expect(source).toContain('const [importedAlignmentGraphExport, setImportedAlignmentGraphExport] = useState(null);');
    const importer = between('const handleImportAlignmentGraph = (payload) => {', 'const clearImportedAlignmentGraph = () => {');
    expect(importer).toContain('normalizeAlignmentGraphExport(payload, { maxNodes: 240, maxEdges: 480 })');
    expect(importer).toContain('setImportedAlignmentGraphExport({');
    expect(importer).not.toContain('setHistory(');
    expect(importer).not.toContain('setGeneratedContent(');
  });

  it('persists teacher-confirmed graph snapshots on the current audit resource and history item', () => {
    const bridge = between('// BEGIN LEARNING_WEB_HOST_BRIDGE', '// END LEARNING_WEB_HOST_BRIDGE');
    expect(bridge).toContain('confirmExplicitAttributions');
    expect(bridge).toContain('alignmentMapGraph: normalized.graph');
    expect(bridge).toContain('nextComprehensive.alignmentMapGraphOriginal = normalized.originalGraph');
    expect(bridge).toContain('setGeneratedContent(prev => updateResource(prev));');
    expect(bridge).toContain('setHistory(prev => prev.map(item =>');
    expect(bridge).toContain('LearningWebRegistry');
    expect(bridge).toContain('registry.saveGraph(normalized.graph');
    expect(bridge).toContain("getLatestForResources(candidateIds, 'alignment-map', scopeId)");
    expect(bridge).toContain('const candidateIds = unitId');
    expect(bridge).toContain('Never leak the unrelated');
    expect(source).toContain('registry.reconcileGraphs(records');
    expect(source).toContain("safeGetItem(_alloLearningWebWorkspaceKey");
    expect(source).toContain("registry.removeScope('workspace:' + canvasRecoveryImportPreviousIdRef.current)");
    expect(bridge).toContain('scopeId: _alloLearningWebScopeId()');
    expect(bridge).toContain('registrySaved.storagePersisted === false');
    expect(bridge).toContain("id: 'alignment-map:' + resourceId");
    expect(bridge).toContain("const _alloAlignmentExportSchema = 'alloflow-alignment-graph-export/v1'");
  });

  it('exports only a canonical bounded graph and retains compact audit metadata', () => {
    const exporter = between('const handleExportAlignmentGraph = (payload) => {', 'const handleImportAlignmentGraph = (payload) => {');
    expect(exporter).toContain('_alloNormalizeAlignmentGraphExportForHost({');
    expect(exporter).toContain('safeDownloadBlob(new Blob([JSON.stringify(exportPayload, null, 2)]');
    expect(exporter).toContain('const persisted = _alloPersistCurrentAlignmentGraph');
    expect(exporter).toContain('originalGraph: persisted.originalGraph');
    expect(exporter).toContain('audit: _alloAlignmentAuditSummary(generatedContent, persisted.graph)');
  });

  it('loads the graph engine and durable registry before audit rendering', () => {
    expect(source).toContain("loadModule('ConceptGraphEngine', 'https://alloflow-cdn.pages.dev/concept_graph_engine_module.js");
    expect(source).toContain("loadModule('LearningWebRegistry', 'https://alloflow-cdn.pages.dev/learning_web_registry_module.js");
    expect(source).toContain("loadModule('LexicalGraph', 'https://alloflow-cdn.pages.dev/lexical_graph_module.js");
  });

  it('wires the existing Alignment Map callbacks and Throughline graph contract', () => {
    const reportMount = between("window.AlloModules.AlignmentReportView && React.createElement(window.AlloModules.AlignmentReportView, {", "{activeView === 'timeline'");
    expect(reportMount).toContain('onConfirmAttribution: handleConfirmAlignmentAttribution');
    expect(reportMount).toContain('onExportAlignmentGraph: handleExportAlignmentGraph');

    const throughlineMount = between('<CDNModuleGate moduleKey="MindMap"', '<CDNModuleGate moduleKey="PoetTree"');
    expect(throughlineMount).toContain('displayName="Learning Web: Unit Path"');
    expect(throughlineMount).toContain('alignmentGraphExport: _alloAlignmentGraphExportForContext(generatedContent, throughlineSeedUnitId, history)');
    expect(throughlineMount).toContain('importedAlignmentGraphExport');
    expect(throughlineMount).toContain('onImportAlignmentGraph: handleImportAlignmentGraph');
    expect(throughlineMount).toContain('onClearImportedAlignmentGraph: clearImportedAlignmentGraph');
  });
});
