import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const view = readFileSync('view_export_preview_source.jsx', 'utf8');
const host = readFileSync('AlloFlowANTI.txt', 'utf8') /* extracted-sources appended 2026-07-20 */ + ['misc_handlers_source.jsx','view_export_preview_source.jsx','udl_chat_source.jsx'].map(f => readFileSync(require('node:path').join(process.cwd(), f), 'utf8')).join('\n');
const pipeline = readFileSync('doc_pipeline_source.jsx', 'utf8');
const handlers = readFileSync('export_handlers_module.js', 'utf8');
const gate = readFileSync('dev-tools/check_pipeline_tests.cjs', 'utf8');
const viewModule = readFileSync('view_export_preview_module.js', 'utf8');
const viewDeploy = readFileSync('desktop/web-app/public/view_export_preview_module.js', 'utf8');
const pipelineModule = readFileSync('doc_pipeline_module.js', 'utf8');
const pipelineDeploy = readFileSync('desktop/web-app/public/doc_pipeline_module.js', 'utf8');
const handlersDeploy = readFileSync('desktop/web-app/public/export_handlers_module.js', 'utf8');

describe('Document Builder refinement pass', () => {
  it('captures the opener before moving focus into the dialog', () => {
    expect(view.indexOf('openerRef.current = document.activeElement')).toBeGreaterThan(-1);
    expect(view.indexOf('openerRef.current = document.activeElement'))
      .toBeLessThan(view.indexOf('if (!dialog.contains(document.activeElement))'));
  });

  it('bounds image formats, bytes, decoded dimensions, and marks insertion dirty', () => {
    expect(view).toContain('accept="image/png,image/jpeg,image/gif,image/webp"');
    expect(view).toContain('file.size > 8 * 1024 * 1024');
    expect(view).toContain('pixels > 25000000');
    expect(view).toContain('savedRange.startContainer?.isConnected');
    expect(view).toContain("doc.body.setAttribute('data-allo-user-edited', '1')");
    expect(view).toContain("dispatchEvent(new InputEventCtor('input', { bubbles: true }))");
  });

  it('binds async writing, audit, and Workbench results to current HTML', () => {
    expect(view).toContain('currentDoc?.documentElement?.outerHTML !== sourceHtml');
    expect(view).toContain('currentDoc?.documentElement?.outerHTML !== html');
    expect(view).toContain('const resultIsCurrent = mountedRef.current');
    expect(view).toContain('its older result was not applied');
    expect(view).toContain('auditRunRef.current += 1');
    expect(view).toContain('writingCheckRunRef.current += 1');
  });

  it('announces outcomes and exposes control state and semantic navigation', () => {
    expect(view).toContain('aria-pressed={a11yInspectMode}');
    expect(view).toContain('Skip to editable preview');
    expect(view).toContain('id="document-builder-preview"');
    expect(view).toContain('role="alert" aria-live="assertive"');
    expect(view).toContain('role="status" aria-live="polite" aria-atomic="true"');
    for (const heading of ['Quick Start', 'Appearance', 'Word Art', 'Content', 'Export']) {
      expect(view).toMatch(new RegExp(`<h3[^>]*>[\\s\\S]*?${heading}[\\s\\S]*?</h3>`));
    }
  });

  it('uses AA-safe small-text colors for the confirmed Builder failures', () => {
    expect(view).toContain("background: '#b45309', color: 'white'");
    expect(view).toContain('from-amber-700 to-rose-700');
    expect(view).toContain('text-purple-200 font-bold shrink-0');
    expect(view).toContain('text-indigo-700 font-bold');
    expect(view).toContain('font-bold text-green-700 uppercase');
    expect(view).not.toContain("background: '#f59e0b', color: 'white'");
    expect(view).not.toContain('text-purple-700 font-bold shrink-0');
  });

  it('restores matching history drafts and uses structural short-document validity', () => {
    expect(host).toContain('const _getBuilderHistorySignature = (items = history) =>');
    expect(host).toContain("draft.source === 'history'");
    expect(host).toContain('historySignature: _getBuilderHistorySignature()');
    expect(host).toContain("doc.body.querySelector('img,svg,canvas,video,audio,math,table,form,input,textarea,select')");
    expect(host).not.toContain("doc.body.querySelector('img,svg,canvas,video,audio,math,table,form,input,textarea,select,hr')");
    expect(host).not.toContain("(doc.body.textContent || '').trim().length < 50");
  });

  it('writes remediation previews back only after a real edit and never persists an error preview', () => {
    const syncStart = host.indexOf('const _syncBuilderEditsToRemediation = () => {');
    const syncEnd = host.indexOf('// All builder close paths go through this wrapped setter', syncStart);
    const sync = host.slice(syncStart, syncEnd);
    expect(sync).toContain("const hasLiveEdits = doc.body.getAttribute('data-allo-user-edited') === '1';");
    expect(sync).toContain("if (exportPreviewSource === 'remediation' && !hasLiveEdits) return;");
    expect(sync).toContain("doc.body.getAttribute('data-allo-preview-error') === '1'");
    expect(host).toContain('data-allo-preview-error="1"');
  });


  it('uses the canonical close wrapper and closes only after export handoff', () => {
    expect(host).toContain('setShowExportPreview: setShowExportPreviewWrapped, handleExportSlides');
    const execute = handlers.slice(
      handlers.indexOf('const executeExportFromPreview = async'),
      handlers.indexOf('// ── handleExport', handlers.indexOf('const executeExportFromPreview = async')),
    );
    expect(execute).not.toContain("if (typeof setShowExportPreview === 'function') setShowExportPreview(false);\n    if (mode === 'slides')");
    expect(execute).toContain('Failed popups/ZIP generation remain recoverable');
    expect(execute).toContain('return false;');
    expect(execute).toContain('return true;');
  });

  it('makes crop entry, iframe boundaries, and the crop modal keyboard contained', () => {
    expect(host).toContain("img.setAttribute('aria-keyshortcuts', 'Enter Space')");
    expect(host).toContain("(e.key === 'Enter' || e.key === ' ') && e.target");
    expect(host).toContain('Key events inside an iframe do not bubble to the parent dialog');
    expect(host).toContain("if (e.key === 'Tab')");
    expect(host).toContain('returnFocus && returnFocus.isConnected');
    expect(host).toContain("overlay.setAttribute('aria-describedby', 'allo-crop-instructions')");
  });

  it('makes generated Concept Sort placement keyboard-completable', () => {
    expect(pipeline).toContain('class="alloflow-cs-place-btn"');
    expect(pipeline).toContain('Place selected item in ${_escTxt(cat.label)}');
    expect(pipeline).toContain('b.disabled = false');
    expect(pipeline).toContain("resultsEl.textContent = 'Selected '");
    expect(pipeline).toContain("resultsEl.textContent = 'Placed '");
  });

  it('makes editable A11y Inspector badges keyboard operable without self-scanning', () => {
    expect(handlers).toContain("b.setAttribute('role', 'button')");
    expect(handlers).toContain("ev.key === 'Enter' || ev.key === ' '");
    expect(handlers).toContain('[aria-label]:not(.a11y-inspect-badge)');
    expect(handlers).toContain('[role]:not(.a11y-inspect-badge)');
  });

  it('keeps the newly relevant Builder suites in the blocking gate', () => {
    expect(gate).toContain("'builder_', 'export_preview', 'docsuite_theme'");
  });
    expect(gate).toContain("'_test_doc_builder_renderers.cjs'");

  it('provides paper view and live ruler controls while keeping styling editor-only', () => {
    expect(view).toContain("const [editorPageView, setEditorPageView] = React.useState(() => _readBuilderViewPreferences().pageView);");
    expect(view).toContain('data-allo-page-css');
    expect(view).toContain('background-image: linear-gradient');
    expect(view).toContain('aria-label="Interactive paragraph ruler"');
    expect(view).toContain('nudgeParagraphIndent(0.25)');
    expect(view).toContain('applyParagraphLayout({ lineSpacing:');
    expect(view).toContain('#allo-builder-edit-css');
  });

  it('provides a functional selection-safe ruler and paragraph layout model', () => {
    expect(view).toContain('_BUILDER_PARAGRAPH_DEFAULTS');
    expect(view).toContain('_builderSelectedParagraphBlocks');
    expect(view).toContain('const applyParagraphLayout');
    expect(view).toContain('aria-label="First-line indent"');
    expect(view).toContain('aria-label="Hanging indent"');
    expect(view).toContain('role="slider" aria-orientation="horizontal"');
    expect(view).toContain('key={tab.id || index}');
    expect(view).toContain('aria-label={`Add ${rulerTabAlignment} tab stop`}');
    expect(view).toContain('data-allo-tab-stops');
    expect(view).toContain('_builderInsertParagraphTab');
    expect(view).toContain('aria-keyshortcuts="Control+Tab"');
    expect(view).toContain('Keep with next');
    expect(view).toContain('Widow/orphan');
  });

  it('supports persistent Fit Width and Fit Page zoom modes', () => {
    expect(view).toContain("zoomMode: 'custom'");
    expect(view).toContain('calculateEditorZoomPreset');
    expect(view).toContain("useEditorZoomPreset('fit-width')");
    expect(view).toContain("useEditorZoomPreset('fit-page')");
    expect(view).toContain('new ResizeObserverCtor');
    expect(view).toContain('min="50" max="200"');
  });

  it('supports backward-compatible named section breaks and section management', () => {
    expect(view).toContain('_BUILDER_SECTION_BREAK_SELECTOR');
    expect(view).toContain('function _builderInsertDocumentBreak');
    expect(view).toContain("marker.setAttribute('data-allo-section-break', startType)");
    expect(view).toContain("insertSectionBreak('next-page')");
    expect(view).toContain("insertSectionBreak('continuous')");
    expect(view).toContain('const commitSectionName');
    expect(view).toContain('const setActiveSectionStartType');
    expect(view).toContain('const removeActiveSectionBreak');
    expect(view).toContain('Current section name');
  });

  it('aligns forced breaks to visible pages and exposes page and section navigation', () => {
    expect(view).toContain('function _builderSyncBreakFill');
    expect(view).toContain('function _builderStripEditorBreakMetadata');

    expect(view).toContain('Math.min(200');
    expect(view).toContain('builder-navigation-tab-sections');
    expect(view).toContain('builder-navigation-panel-sections');
    expect(view).toContain('Page {pageMetrics.active + 1} of {pageMetrics.count}');
    expect(view).toContain('aria-keyshortcuts="Control+Enter"');
    expect(view).toContain("insertedBreak = _builderInsertDocumentBreak(doc, 'page')");
  });

  it('provides selection-aware Word Count details and classic keyboard access', () => {
    expect(view).toContain('function _builderDocumentStatistics');
    expect(view).toContain('function _builderSelectionStatistics');
    expect(view).toContain('builder-word-count-panel');
    expect(view).toContain('Characters (no spaces)');
    expect(view).toContain('Speaking time');
    expect(view).toContain('alloflow-builder-open-word-count');
    expect(view).toContain('aria-keyshortcuts="Control+Shift+G"');
    expect(view).toContain('Words: ${selectionStatistics.words.toLocaleString()} of ${wordCount.toLocaleString()}');
  });

  it('provides selection-anchored comment threads with review navigation and clean exports', () => {
    for (const contract of [
      '_BUILDER_COMMENT_SELECTOR',
      'function _builderInsertReviewComment',
      'builder-navigation-tab-comments',
      'builder-navigation-panel-comments',
      'alloflow-builder-new-comment',
      'aria-keyshortcuts="Control+Alt+M"',
      'Show resolved',
      'Reply',
      'Resolve',
      'options?.forExport',
      '_builderSuspendReviewComments',
    ]) expect(view).toContain(contract);
  });

  it('offers local draft recovery and active long-document navigation', () => {
    expect(view).toContain('alloflow-builder-draft-v1:');
    expect(view).toContain('Local draft available');
    expect(view).toContain('Saved on this device');
    expect(view).toContain('aria-current={activeHeadingIndex === heading.index ? \'location\' : undefined}');
    expect(view).toContain('countFindMatches');
    expect(view).toContain('Find previous match');
    expect(view).toContain('Find next match');
  });

  it('provides live page thumbnails and export-safe explicit page breaks', () => {
    expect(view).toContain('builder-navigation-panel-pages');
    expect(view).toContain('Page thumbnails');
    expect(view).toContain('aria-label="Insert page break"');
    expect(view).toContain('data-allo-page-break="1"');
    expect(view).toContain('break-before:page;page-break-before:always');
    expect(view).toContain('refreshPageMetrics');
  });

  it('provides local version history and manual restore points', () => {
    expect(view).toContain('_normalizeBuilderLocalDraft');
    expect(view).toContain('builder-version-history');
    expect(view).toContain('Save snapshot');
    expect(view).toContain('restoreVersionSnapshot');
    expect(view).toContain('snapshots');
    expect(view).toContain('Version History');
  });
  it('promotes save and editor keyboard shortcuts for classic workflows', () => {
    expect(view).toContain('Save a local version snapshot');
    expect(view).toContain("alloflow-builder-save-snapshot");
    expect(view).toContain("e.key === 'y' || e.key === 'Y'");
    expect(view).toContain("e.shiftKey ? 'redo' : 'undo'");
    expect(view).toContain('Ctrl+S');
  });
  it('remembers Builder view preferences with a safe reset', () => {
    expect(view).toContain('_readBuilderViewPreferences');
    expect(view).toContain("alloflow-builder-view-prefs-v1");
    expect(view).toContain('Reset Builder view preferences');
    expect(view).toContain('navigationTab: navigationPaneTab');
    expect(view).toContain('navigationWidth: navigationPaneWidth');
    expect(view).toContain('ribbonTab: activeRibbonTab');
    expect(view).toContain('navigationPane: showNavigationPane');
  });
  it('uses a compact ribbon and one resizable tabbed navigation pane', () => {
    expect(view).toContain('aria-label="Document Builder ribbon"');
    expect(view).toContain('builder-ribbon-panel-home');
    expect(view).toContain('builder-ribbon-panel-insert');
    expect(view).toContain('builder-ribbon-panel-layout');
    expect(view).toContain('builder-ribbon-panel-review');
    expect(view).toContain('builder-ribbon-panel-view');
    expect(view).toContain('builder-ribbon-panel-expert');
    expect(view).toContain('Collapse ribbon');
    expect(view).toContain('aria-label="Navigation view"');
    expect(view).toContain('builder-navigation-panel-headings');
    expect(view).toContain('builder-navigation-panel-pages');
    expect(view).toContain('aria-label="Resize document navigation"');
    expect(view).toContain('alloflow-builder-open-find');
    expect(view).not.toContain('document-builder-thumbnails');
  });
  it('provides advanced, non-destructive find and replace options', () => {
    expect(view).toContain('Match case');
    expect(view).toContain('Whole words');
    expect(view).toContain('Highlight all');
    expect(view).toContain('Replace current');
    expect(view).toContain("CSS?.highlights?.delete('allo-builder-find')");
    expect(view).toContain("registry.set('allo-builder-find'");
    expect(view).toContain("doc.execCommand('insertText', false, replaceQuery)");
    expect(view).toContain('::highlight(allo-builder-find)');
  });
  it('keeps rich font controls selection-safe across the Home ribbon', () => {
    expect(view).toContain('editorSelectionRangeRef');
    expect(view).toContain('restoreEditorSelection');
    expect(view).toContain("runEditorCommand('fontSize'");
    expect(view).toContain("runEditorCommand('hiliteColor'");
    expect(view).toContain('Strikethrough');
    expect(view).toContain('Subscript');
    expect(view).toContain('Superscript');
    expect(view).toContain('Text highlight color');
  });
  it('adds an accessible Insert ribbon with semantic and contextual table tools', () => {
    expect(view).toContain('builder-ribbon-panel-insert');
    expect(view).toContain('Table body rows');
    expect(view).toContain("doc.createElement('thead')");
    expect(view).toContain("th.setAttribute('scope', 'col')");
    expect(view).toContain('Table caption');
    expect(view).toContain("'table-caption'");
    expect(view).toContain('Selected table tools');
    expect(view).toContain("editSelectedTable('add-row')");
    expect(view).toContain('Move through table cells like a desktop word processor');
    expect(view).toContain("['home', 'insert', 'layout', 'review', 'view', 'expert']");
  });
  it('provides semantic named styles and a selection-safe single-use Format Painter', () => {
    expect(view).toContain('_BUILDER_STYLE_GALLERY');
    expect(view).toContain('aria-label="Document styles"');
    expect(view).toContain("id: 'title'");
    expect(view).toContain("id: 'callout'");
    expect(view).toContain("block.setAttribute('data-allo-style', definition.id)");
    expect(view).toContain('const useFormatPainter');
    expect(view).toContain('Formatting copied. Select the destination');
    expect(view).toContain('Apply format');
    expect(view).toContain('Cancel Format Painter');
    expect(view).toContain('formatPainterRef.current = null');
  });
  it('provides export-safe page layout and semantic repeating page elements', () => {
    expect(view).toContain('_BUILDER_PAGE_SIZES');
    expect(view).toContain('_builderPageDimensions(pageSetup).heightPx');
    expect(view).toContain('builder-ribbon-panel-layout');
    expect(view).toContain('aria-label="Paper size"');
    expect(view).toContain('aria-label="Page orientation"');
    expect(view).toContain('aria-label="Page margins"');
    expect(view).toContain('allo-page-setup-style');
    expect(view).toContain('counter(page)');
    expect(view).toContain("header[data-allo-page-header]");
    expect(view).toContain("footer[data-allo-page-footer]");
    expect(view).toContain('[data-allo-page-element]');
    expect(view).toContain('Page numbers');
    expect(view).toContain('syncPageSetupFromDocument');
    expect(view).toContain('syncPageElementsFromDocument');
  });
  it('ships the same refinements in generated and deployable runtimes', () => {
    expect(viewModule).toContain('The document changed during the audit');
    expect(viewModule).toContain('image/png,image/jpeg,image/gif,image/webp');
    expect(viewModule).toContain('builder-ribbon-panel-layout');
    expect(viewModule).toContain('allo-page-setup-style');
    expect(viewModule).toContain('Interactive paragraph ruler');
    expect(viewModule).toContain('"aria-keyshortcuts": "Control+Tab"');
    expect(viewModule).toContain('calculateEditorZoomPreset');
    expect(viewModule).toContain('builder-navigation-panel-sections');
    expect(viewModule).toContain('data-allo-section-break');
    expect(viewModule).toContain('"aria-keyshortcuts": "Control+Enter"');
    expect(viewModule).toContain('builder-word-count-panel');
    expect(viewModule).toContain('"aria-keyshortcuts": "Control+Shift+G"');
    expect(viewModule).toContain('alloflow-builder-open-word-count');
    expect(viewModule).toContain('builder-navigation-panel-comments');
    expect(viewModule).toContain('alloflow-builder-new-comment');
    expect(viewModule).toContain('data-allo-comment-thread');
    expect(pipelineModule).toContain('alloflow-cs-place-btn');
    expect(handlersDeploy).toBe(handlers);
    expect(viewDeploy).toBe(viewModule);
    expect(pipelineDeploy).toBe(pipelineModule);
  });
});