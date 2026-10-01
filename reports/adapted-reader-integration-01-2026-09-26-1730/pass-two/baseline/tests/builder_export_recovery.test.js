import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';
import { loadAlloModule } from './setup.js';

const source = readFileSync('view_export_preview_source.jsx', 'utf8');
const component = parse(source, { sourceType: 'script', plugins: ['jsx'] }).program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'ExportPreviewView');
function callback(name, bindings) {
  const declaration = component.body.body.flatMap(node => node.declarations || []).find(node => node.id.name === name);
  const fn = declaration.init.arguments[0];
  return new Function(...Object.keys(bindings), 'return (' + source.slice(fn.start, fn.end) + ');')(...Object.values(bindings));
}

beforeAll(() => loadAlloModule('export_handlers_module.js'));
afterEach(() => { vi.restoreAllMocks(); window.localStorage.clear(); });

function exportDeps(html) {
  const doc = document.implementation.createHTMLDocument('Current draft');
  doc.body.innerHTML = html;
  return {
    _docPipeline: {}, addToast: vi.fn(), t: () => '', exportPreviewMode: 'print',
    exportPreviewRef: { current: { contentDocument: doc } },
    generateFullPackHTML: vi.fn(() => '<p>OLD HISTORY</p>'),
    getExportableHistory: () => [], getSkippedResources: () => [],
    sourceTopic: 'Topic', studentResponses: {}, exportConfig: {}, history: [],
    setShowExportPreview: vi.fn(),
  };
}

function popup() {
  const result = { document: { write: vi.fn(), close: vi.fn() }, print: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(result);
  return result;
}

describe('Builder export content preservation', () => {
  it.each(['<p>One edited sentence.</p>', '<img alt="Blue square">', '<table><tr><th>Result</th><td>3</td></tr></table>'])('exports the exact short or visual preview: %s', async html => {
    const d = exportDeps(html);
    const win = popup();
    await expect(window.AlloModules.ExportHandlers.executeExportFromPreview(d)).resolves.toBe(true);
    expect(d.generateFullPackHTML).not.toHaveBeenCalled();
    expect(win.document.write).toHaveBeenCalledWith(expect.stringContaining(d.exportPreviewRef.current.contentDocument.body.innerHTML));
    expect(win.document.write).not.toHaveBeenCalledWith(expect.stringContaining('OLD HISTORY'));
  });

  it.each(['', '<main></main>', '<style>body { color: red; }</style><span class="a11y-inspect-badge">Heading</span>', '<main data-allo-preview-error="1">Failure</main>'])('stops empty or failed previews without reviving old history: %s', async html => {
    const d = exportDeps(html);
    if (html.includes('data-allo-preview-error')) d.exportPreviewRef.current.contentDocument.body.setAttribute('data-allo-preview-error', '1');
    const win = popup();
    await expect(window.AlloModules.ExportHandlers.executeExportFromPreview(d)).resolves.toBe(false);
    expect(win.document.write).not.toHaveBeenCalled();
    expect(d.generateFullPackHTML).not.toHaveBeenCalled();
    expect(d.setShowExportPreview).not.toHaveBeenCalled();
  });

  it('does not change editor mode when the export fails', async () => {
    const d = exportDeps('<p>Keep editing</p>');
    d.exportPreviewRef.current.contentDocument.designMode = 'off';
    const win = popup();
    win.document.write.mockImplementation(() => { throw new Error('write failed'); });
    await expect(window.AlloModules.ExportHandlers.executeExportFromPreview(d)).rejects.toThrow('write failed');
    expect(d.exportPreviewRef.current.contentDocument.designMode).toBe('off');
  });
});

describe('Builder recovery and export coordination', () => {
  function lock() {
    const bindings = { exportActionLockRef: { current: false }, mountedRef: { current: true }, setAltExportBusy: vi.fn() };
    return { ...bindings, beginAlternativeExport: callback('beginAlternativeExport', bindings), finishAlternativeExport: callback('finishAlternativeExport', bindings) };
  }

  it('dismissing recovery preserves the stored draft and version list', () => {
    const store = JSON.stringify({ html: '<p>Recover me</p>', versions: [{ html: '<p>Earlier</p>' }] });
    window.localStorage.setItem('draft', store);
    const setDraftRecovery = vi.fn();
    callback('dismissLocalDraft', { setDraftRecovery })();
    expect(setDraftRecovery).toHaveBeenCalledWith(null);
    expect(window.localStorage.getItem('draft')).toBe(store);
  });

  it('blocks repeated jobs synchronously and releases the shared lock after completion', () => {
    const b = lock();
    expect(b.beginAlternativeExport('docx')).toBe(true);
    expect(b.beginAlternativeExport('ims')).toBe(false);
    expect(b.setAltExportBusy).toHaveBeenCalledTimes(1);
    b.finishAlternativeExport();
    expect(b.beginAlternativeExport('ims')).toBe(true);
  });

  it.each([false, 'throw'])('does not report a failed IMS package as successful: %s', async result => {
    const b = lock();
    const onExportSuccess = vi.fn();
    const handleExportIMS = result === 'throw' ? vi.fn().mockRejectedValue(new Error('Packaging failed')) : vi.fn().mockResolvedValue(false);
    const run = callback('runPackageExport', {
      ...b, altExportBusy: '', handleExportIMS, handleExportQTI: null, handleExportH5P: null,
      addToast: vi.fn(), onExportSuccess, getCleanBuilderDocument: () => ({ html: '<p>Latest edit</p>', title: 'Draft' }),
    });
    await run('ims');
    expect(handleExportIMS).toHaveBeenCalledWith({ liveHtml: '<p>Latest edit</p>', liveTitle: 'Draft' });
    expect(onExportSuccess).not.toHaveBeenCalled();
    expect(b.exportActionLockRef.current).toBe(false);
  });
});


describe('Builder preview initialization', () => {
  it('initializes paper styling from the iframe page setup after regeneration', async () => {
    const ast = parse(source, { sourceType: 'script', plugins: ['jsx'] });
    const refreshNode = ast.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'updateExportPreview');
    const helpers = source.slice(source.indexOf('const _BUILDER_STYLE_GALLERY'), source.indexOf('function ExportPreviewView'));
    const refresh = new Function(helpers + '\n' + source.slice(refreshNode.start, refreshNode.end) + '\nreturn updateExportPreview;')();
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    iframe.__alloBuilderPageSetup = { size: 'letter', orientation: 'landscape', margin: 'normal' };
    const warnLog = vi.fn();
    try {
      await refresh({
        exportPreviewRef: { current: iframe }, _exportPreviewErrorRef: { current: null },
        _builderRecoverySaveTimerRef: { current: null },
        getExportPreviewHTML: () => '<html lang="en"><head><title>Draft</title></head><body><p>Fresh preview</p></body></html>',
        t: () => '', addToast: vi.fn(), warnLog, setCanvasRecoveryRevision: vi.fn(), isCanvas: false, a11yInspectMode: false,
      });
      const style = iframe.contentDocument.getElementById('allo-builder-edit-css');
      expect(style).not.toBeNull();
      expect(style.textContent).toContain('width:11in');
      expect(style.textContent).toContain('min-height:8.5in');
      expect(warnLog).not.toHaveBeenCalled();
    } finally { iframe.remove(); }
  });
});
