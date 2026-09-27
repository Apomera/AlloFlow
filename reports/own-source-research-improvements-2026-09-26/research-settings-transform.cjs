// Bounded lifecycle integration. No canonical files are read or written here.
// Root prepare-integration supplies the latest source after its base transforms.
function normalizeResearchSettings(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const documentsOnly = input.documentsOnly === true;
  const rawIds = input.selectedOwnSourceIds;
  // Null is the legacy/uninitialized state; [] explicitly selects no documents.
  // Malformed supplied values must never broaden back to the shared library.
  let selectedOwnSourceIds = rawIds == null ? null : [];
  if (Array.isArray(rawIds)) {
    selectedOwnSourceIds = Array.from(new Set(rawIds.filter(id =>
      typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(id)
    ))).slice(0, 2000);
  }
  if (documentsOnly && selectedOwnSourceIds === null) selectedOwnSourceIds = [];
  return {
    selectedOwnSourceIds,
    documentsOnly,
    useOwnSources: documentsOnly || input.useOwnSources === true,
    includeSourceCitations: !documentsOnly && input.includeSourceCitations === true,
  };
}

function transform(file, original, change) {
  if (original.includes('// Own-source lesson research settings lifecycle (2026-09-26).')) return original;
  const crlf = original.includes('\r\n');
  let source = original.replace(/\r\n/g, '\n');
  const replace = (before, after) => {
    if (source.split(before).length !== 2) throw new Error(`${file}: expected one research-settings seam: ${before.slice(0, 100)}`);
    source = source.replace(before, after);
  };
  change(replace);
  return crlf ? source.replace(/\n/g, '\r\n') : source;
}
const helper = '// Own-source lesson research settings lifecycle (2026-09-26).\nconst _alloNormalizeResearchSettings = ' + normalizeResearchSettings.toString() + ';\n';
const directReset = [
  'setSelectedOwnSourceIds(null);', 'setDocumentsOnly(false);',
  'setUseOwnSources(false);', 'setIncludeSourceCitations(false);',
].join('\n      ');
const hostRestore = [
  "const researchSettings = _alloNormalizeResearchSettings(settings);",
  "if (typeof __d.setSelectedOwnSourceIds === 'function') __d.setSelectedOwnSourceIds(researchSettings.selectedOwnSourceIds);",
  "if (typeof __d.setDocumentsOnly === 'function') __d.setDocumentsOnly(researchSettings.documentsOnly);",
  "if (typeof __d.setUseOwnSources === 'function') __d.setUseOwnSources(researchSettings.useOwnSources);",
  "if (typeof __d.setIncludeSourceCitations === 'function') __d.setIncludeSourceCitations(researchSettings.includeSourceCitations);",
].join('\n          ');

const transforms = {
  'AlloFlowANTI.txt': source => transform('AlloFlowANTI.txt', source, replace => {
    replace('  const clearCanvasWorkspaceState = (options = {}) => {', '  ' + helper + '\n  const clearCanvasWorkspaceState = (options = {}) => {');
    // Clear directly too: the optional host module can be unavailable on reset.
    replace("      setInputText('');\n      setSourceTopic('');", "      setInputText('');\n      setSourceTopic('');\n      " + directReset);
    replace('              lessonSettings: {\n                  gradeLevel,', '              lessonSettings: {\n                  ..._alloNormalizeResearchSettings({ selectedOwnSourceIds, documentsOnly, useOwnSources, includeSourceCitations }),\n                  gradeLevel,');
    replace('      sourceTone, sourceLevel, sourceVocabulary, sourceLength, sourceCustomInstructions, resourceCount,\n      fullPackTargetGroup, studentProjectSettings,', '      sourceTone, sourceLevel, sourceVocabulary, sourceLength, sourceCustomInstructions, resourceCount,\n      selectedOwnSourceIds, documentsOnly, useOwnSources, includeSourceCitations,\n      fullPackTargetGroup, studentProjectSettings,');
    // Imported project formats do not currently carry these settings. Reset
    // only once a new project successfully commits, preserving a failed import.
    replace('            if (success) resetAllMathRuntimeState();', '            if (success) {\n                resetAllMathRuntimeState();\n                ' + directReset.replace(/\n      /g, '\n                ') + '\n            }');
  }),
  'host_handlers_source.jsx': source => transform('host_handlers_source.jsx', source, replace => {
    replace('const resetCanvasWorkspaceSettings = () => {', helper + '\nconst resetCanvasWorkspaceSettings = () => {');
    replace("      __d.setSourceTone('Informative');\n      __d.setSourceLevel('5th Grade');", "      __d.setSourceTone('Informative');\n      __d.setSourceLevel('5th Grade');\n      if (typeof __d.setSelectedOwnSourceIds === 'function') __d.setSelectedOwnSourceIds(null);\n      if (typeof __d.setDocumentsOnly === 'function') __d.setDocumentsOnly(false);\n      if (typeof __d.setUseOwnSources === 'function') __d.setUseOwnSources(false);\n      if (typeof __d.setIncludeSourceCitations === 'function') __d.setIncludeSourceCitations(false);");
    replace('          const settings = workspace.lessonSettings || {};', '          const settings = workspace.lessonSettings || {};\n          ' + hostRestore);
  }),
};

module.exports = transforms;
Object.defineProperty(module.exports, 'normalizeResearchSettings', { value: normalizeResearchSettings });
