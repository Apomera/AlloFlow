const fs = require('fs');
const p = 'view_export_preview_source.jsx';
const original = fs.readFileSync(p, 'utf8');
let s = original;
function replace(oldText, newText) {
  if (s.split(oldText).length !== 2) throw new Error('Expected unique anchor: ' + oldText.slice(0, 100));
  s = s.replace(oldText, newText);
}
const helpers = `// One catalog drives the visible resources, their defaults and bulk selection.
function _builderResourceOptions(history, t) {
  const translate = typeof t === 'function' ? t : () => '';
  const entries = [
    ['includeAnalysis', '📊 Source Analysis', 'analysis'],
    ['includeSimplified', '📖 Adapted Text', 'simplified'],
    ['includeGlossary', '📚 Glossary', 'glossary'],
    ['includeQuiz', '❓ Quiz', 'quiz'],
    ['includeOutline', '🗂️ Graphic Organizer', 'outline'],
    ['includeFaq', '💬 FAQ', 'faq'],
    ['includeMemoryAid', translate('sidebar.tool_memory_aid') || 'Memory Aid Studio', 'memory-aid'],
    ['includeAppliedChallenge', translate('sidebar.tool_applied_challenge') || 'Applied Challenge Studio', 'applied-challenge'],
    ['includeSentenceFrames', '✍️ Sentence Frames', 'sentence-frames'],
    ['includeImage', '🎨 Visual Support', 'image'],
    ['includeMath', '🔢 Math', 'math'],
    ['includeDbq', '📜 DBQ', 'dbq'],
    ['includeLessonPlan', '📋 Lesson Plan', 'lesson-plan'],
    ['includeUdlAdvice', '🧩 UDL Advice', 'udl-advice'],
    ['includeBrainstorm', '💡 Brainstorm', 'brainstorm'],
  ];
  const types = new Set((Array.isArray(history) ? history : []).filter(Boolean).map(item => item.type));
  return entries.filter(([, , type]) => types.has(type));
}
function _builderResourceIncluded(config, key) {
  return ['includeMemoryAid', 'includeAppliedChallenge'].includes(key) ? config?.[key] !== false : !!config?.[key];
}
function _builderBulkResourceUpdate(history, config, t) {
  const available = _builderResourceOptions(history, t);
  const allOn = available.length > 0 && available.every(([key]) => _builderResourceIncluded(config, key));
  return Object.fromEntries(available.map(([key]) => [key, !allOn]));
}
function _builderSelectedResourceItems(history, config, t) {
  const options = _builderResourceOptions(history, t);
  const definitions = new Map(options.map(([key, label, type]) => [type, { key, label }]));
  return (Array.isArray(history) ? history : []).filter(Boolean).flatMap((item, index) => {
    const definition = definitions.get(item.type);
    if (!definition) return [];
    const candidate = item.title || item.data?.title || item.result?.title;
    const title = typeof candidate === 'string' && candidate.trim() ? candidate.replace(/<[^>]*>/g, '').trim().slice(0, 120) : definition.label;
    return [{ id: String(item.id || index), title, type: definition.label, included: _builderResourceIncluded(config, definition.key) }];
  });
}
function _builderVisibleDocumentTitle(doc, fallback) {
  const title = doc?.querySelector?.('h1')?.textContent || doc?.title || fallback || 'Untitled document';
  return String(title).replace(/\\s+/g, ' ').trim().slice(0, 160) || 'Untitled document';
}
function _builderSaveStatusLabel(state, at) {
  const labels = { capturing: 'Saving changes…', saved: 'Saved on this device', restored: 'Local draft restored', captured: 'Saved for this session', ready: 'No local changes yet' };
  const label = labels[state] || 'Local save unavailable';
  const date = new Date(at || 0);
  return at && Number.isFinite(date.getTime()) && ['saved', 'restored', 'captured'].includes(state)
    ? label + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : label;
}

`;
replace('function ExportPreviewView(props) {', helpers + 'function ExportPreviewView(props) {');
replace("  const isAdvancedReview = builderWorkspaceMode === 'advanced-review' && exportPreviewSource === 'remediation';", `  const isAdvancedReview = builderWorkspaceMode === 'advanced-review' && exportPreviewSource === 'remediation';
  const isRemediationDocument = exportPreviewSource === 'remediation';
  const resourceItems = _builderSelectedResourceItems(history, exportConfig, t);
  const includedResourceCount = resourceItems.filter(item => item.included).length;
  const documentSourceLabel = isRemediationDocument ? 'Remediated document' : (Array.isArray(builderResourceIds) ? 'Current lesson' : 'History selection');
  const [previewDocumentTitle, setPreviewDocumentTitle] = React.useState(() => _builderVisibleDocumentTitle(null, exportConfig?.title || exportConfig?.docTitle || exportConfig?.lessonTitle));
  React.useEffect(() => {
    if (isRemediationDocument && exportPreviewMode === 'worksheet') setExportPreviewMode('print');
  }, [isRemediationDocument, exportPreviewMode, setExportPreviewMode]);`);
replace('    const statistics = _builderDocumentStatistics(doc);', '    setPreviewDocumentTitle(_builderVisibleDocumentTitle(doc));\n    const statistics = _builderDocumentStatistics(doc);');
const listStart = s.indexOf('                      const available = [', s.indexOf('{/* Resource Toggles */}'));
const listEndMarker = '].filter(([,, type]) => history.some(h => h && h.type === type));';
const listEnd = s.indexOf(listEndMarker, listStart);
if (listStart < 0 || listEnd < listStart) throw Error('Resource catalog not found');
s = s.slice(0, listStart) + '                      const available = _builderResourceOptions(history, t);' + s.slice(listEnd + listEndMarker.length);
replace("                      const resourceKeys = ['includeAnalysis','includeSimplified','includeGlossary','includeQuiz','includeOutline','includeFaq','includeSentenceFrames','includeImage','includeMath','includeDbq','includeLessonPlan','includeUdlAdvice','includeBrainstorm'];\n                      const allOn = resourceKeys.every(k => exportConfig[k]);\n                      return history.some(h => h) && (", "                      const available = _builderResourceOptions(history, t);\n                      const allOn = available.length > 0 && available.every(([key]) => _builderResourceIncluded(exportConfig, key));\n                      return available.length > 0 && (");
replace("                          const update = {};\n                          resourceKeys.forEach(k => { update[k] = !allOn; });\n                          setExportConfigAndRefresh(p => ({ ...p, ...update }));", "                          setExportConfigAndRefresh(p => ({ ...p, ..._builderBulkResourceUpdate(history, p, t) }));");
replace("checked={['includeMemoryAid', 'includeAppliedChallenge'].includes(key) ? exportConfig[key] !== false : exportConfig[key]}", 'checked={_builderResourceIncluded(exportConfig, key)}');
const contentStart = s.indexOf('                {/* ── SECTION: Content ── */}');
const contentEnd = s.indexOf('                {/* ── SECTION: Export ── */}', contentStart);
if (contentStart < 0 || contentEnd < contentStart) throw Error('Content boundaries missing');
const content = s.slice(contentStart, contentEnd);
s = s.slice(0, contentStart) + s.slice(contentEnd);
const itemList = `                  <details className="rounded-lg border border-slate-300 bg-white p-2" data-builder-resource-list>
                    <summary className="cursor-pointer text-xs font-bold text-slate-700">{includedResourceCount} of {resourceItems.length} resources included</summary>
                    <ol className="mt-2 space-y-1 text-xs text-slate-700">
                      {resourceItems.map((item, index) => <li key={item.id + '-' + index} className="flex items-start gap-2"><span aria-label={item.included ? 'Included' : 'Excluded'}>{item.included ? '✓' : '−'}</span><span>{item.title}<span className="block text-[10px] text-slate-500">{item.type}</span></span></li>)}
                    </ol>
                  </details>
`;
replace('                {/* ── SECTION: Quick Start ── */}', '                {!isRemediationDocument && (<React.Fragment>\n' + content + itemList + '                </React.Fragment>)}\n\n                {/* ── SECTION: Quick Start ── */}');
replace('<details open className="rounded-lg border border-indigo-200 bg-indigo-50 overflow-hidden" data-help-key="doc_builder_block_suggestions">', '<details className="rounded-lg border border-indigo-200 bg-indigo-50 overflow-hidden" data-help-key="doc_builder_block_suggestions">');
replace('                {/* Presets */}\n                <div>', '                {/* Presets apply to assembled resources. */}\n                {!isRemediationDocument && <div>');
replace('                </div>\n\n                {/* Export Mode.', '                </div>}\n\n                {/* Export Mode.');
replace("{[['print', '📄 PDF'], ['worksheet', '📝 Worksheet'], ['html', '💻 HTML'], ['slides', '📊 Slides']].map", "{[['print', '📄 PDF'], ['worksheet', '📝 Worksheet'], ['html', '💻 HTML'], ['slides', '📊 Slides']].filter(([mode]) => !isRemediationDocument || mode !== 'worksheet').map");
replace("                    {exportPreviewMode === 'worksheet'\n", "                    {isRemediationDocument\n                      ? 'Exports use the document shown in the editor. PDF opens your print window; HTML opens as a web page; Slides creates an editable PowerPoint. Review the downloaded layout before sharing.'\n                      : exportPreviewMode === 'worksheet'\n");
// Group optional decoration without adding another navigation row.
const wordStart = s.indexOf('                {/* ── SECTION: Word Art ── */}');
const wordEnd = s.indexOf('                {/* ── SECTION: Export ── */}', wordStart);
if (wordStart < 0 || wordEnd < wordStart) throw Error('Word Art boundaries missing');
let word = s.slice(wordStart, wordEnd);
word = word.replace(/                <h3[^\n]+>Word Art[^\n]+<\/h3>\n/, '');
s = s.slice(0, wordStart) + '                <details className="rounded-lg border border-slate-300 p-2">\n                  <summary className="cursor-pointer text-xs font-bold text-slate-700">Word Art</summary>\n' + word + '                </details>\n\n' + s.slice(wordEnd);
// Resource packaging settings do not rebuild a remediated document.
replace('                {/* ── SECTION: Export ── */}', '                {!isRemediationDocument && <React.Fragment>\n                {/* ── SECTION: Export ── */}');
const aiLabel = '                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">✨ AI Style Studio</div>';
const aiAt = s.indexOf(aiLabel);
const aiDiv = s.lastIndexOf('                <div', aiAt);
if (aiAt < 0 || aiDiv < 0) throw Error('AI studio boundary missing');
s = s.slice(0, aiDiv) + '                </React.Fragment>}\n\n' + s.slice(aiDiv);
replace(`                    <h3 className="text-sm font-bold text-slate-700">{isFocusMode ? 'Document Builder' : 'Live Preview'}</h3>`, `                    <div className="min-w-0" style={{ maxWidth: '28rem' }}>
                      <h3 id="builder-current-document-title" className="truncate text-sm font-bold text-slate-800" title={previewDocumentTitle}>{previewDocumentTitle}</h3>
                      <p className="text-[11px] text-slate-600" data-builder-document-context>{documentSourceLabel}{!isRemediationDocument && ' · ' + includedResourceCount + ' of ' + resourceItems.length + ' resources'}</p>
                      <p className="text-[11px] text-slate-600" data-builder-save-status>{_builderSaveStatusLabel(draftCaptureState, draftCaptureAt)}</p>
                    </div>`);
// Preserve task-local writes from other agents if a concurrent edit wins this window.
require('@babel/parser').parse(s, { sourceType: 'script', plugins: ['jsx'] });
if (fs.readFileSync(p, 'utf8') !== original) throw Error('Source changed while patch was prepared; retry from a fresh read');
fs.writeFileSync(p + '.context.tmp', s);
fs.renameSync(p + '.context.tmp', p);
const hostPath = 'AlloFlowANTI.txt';
const host = fs.readFileSync(hostPath, 'utf8');
const oldWrapper = 'handleExportSlides: () => handleExportSlides({ history: getBuilderHistory() })';
if (host.split(oldWrapper).length !== 2) throw Error('Host slide wrapper not unique');
const nextHost = host.replace(oldWrapper, 'handleExportSlides: (options = {}) => handleExportSlides({ ...options, history: getBuilderHistory() })');
if (fs.readFileSync(hostPath, 'utf8') !== host) throw Error('Host changed while patch was prepared');
fs.writeFileSync(hostPath + '.context.tmp', nextHost);
fs.renameSync(hostPath + '.context.tmp', hostPath);
console.log('Builder document context, source-aware settings, resource catalog and slide option forwarding updated.');
