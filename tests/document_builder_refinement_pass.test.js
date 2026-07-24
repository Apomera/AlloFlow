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

  it('ships the same refinements in generated and deployable runtimes', () => {
    expect(viewModule).toContain('The document changed during the audit');
    expect(viewModule).toContain('image/png,image/jpeg,image/gif,image/webp');
    expect(pipelineModule).toContain('alloflow-cs-place-btn');
    expect(handlersDeploy).toBe(handlers);
    expect(viewDeploy).toBe(viewModule);
    expect(pipelineDeploy).toBe(pipelineModule);
  });
});