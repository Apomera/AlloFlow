import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootPath = resolve(process.cwd(), 'export_handlers_module.js');
const deployPath = resolve(process.cwd(), 'desktop/web-app/public/export_handlers_module.js');
const source = readFileSync(rootPath, 'utf8');
let handlers;

beforeAll(() => {
  window.AlloModules = {};
  new Function(source)();
  handlers = window.AlloModules.ExportHandlers;
});

beforeEach(() => {
  document.body.innerHTML = '';
  window.AlloFlowUX = undefined;
  vi.restoreAllMocks();
});

function previewDoc() {
  const doc = document.implementation.createHTMLDocument('Accessible notice');
  doc.body.innerHTML = '<main><h1>Export preview</h1><p>Ready to print.</p></main>';
  return doc;
}

function previewDeps(overrides = {}) {
  return {
    _docPipeline: {},
    addToast: undefined,
    t: () => 'Pop-up blocked — please allow pop-ups for this site to print.',
    exportPreviewMode: 'print',
    exportPreviewRef: { current: { contentDocument: previewDoc() } },
    generateFullPackHTML: () => '<!doctype html><html><body><main>Fallback</main></body></html>',
    getExportableHistory: () => [],
    getSkippedResources: () => [],
    sourceTopic: 'Topic',
    studentResponses: {},
    exportConfig: {},
    history: [],
    setShowExportPreview: vi.fn(),
    handleExportSlides: vi.fn(),
    ...overrides,
  };
}

describe('Export notification accessibility', () => {
  it('ships identical mirrors without native export or read-aloud alerts', () => {
    expect(readFileSync(deployPath, 'utf8')).toBe(source);
    expect(source).not.toContain('else alert(');
    expect(source).not.toContain('alert("Browser read-aloud is not available here.")');
    expect(source).toContain("notice.setAttribute('role', 'alert')");
    expect(source).toContain("notice.setAttribute('aria-live', 'assertive')");
    expect(source).toContain("notice.setAttribute('aria-atomic', 'true')");
    expect(source).toContain('min-height:44px');
    expect(source).toContain('n.setAttribute("role","alert")');
  });

  it('shows a persistent assertive banner with a keyboard-sized dismiss control when no toast API exists', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const deps = previewDeps();
    const ok = await handlers.executeExportFromPreview(deps);
    expect(ok).toBe(false);
    expect(deps.setShowExportPreview).not.toHaveBeenCalled();

    const notice = document.getElementById('allo-export-notice');
    expect(notice).not.toBeNull();
    expect(notice.getAttribute('role')).toBe('alert');
    expect(notice.getAttribute('aria-live')).toBe('assertive');
    expect(notice.getAttribute('aria-atomic')).toBe('true');
    expect(notice.textContent).toContain('Pop-up blocked');
    const dismiss = notice.querySelector('button');
    expect(dismiss.getAttribute('aria-label')).toBe('Dismiss export notification');
    expect(dismiss.style.minHeight).toBe('44px');
    dismiss.click();
    expect(document.getElementById('allo-export-notice')).toBeNull();
  });

  it('preserves the shared accessible toast path when it is available', async () => {
    const toast = vi.fn();
    const addToast = vi.fn();
    window.AlloFlowUX = { toast };
    vi.spyOn(window, 'open').mockReturnValue(null);
    await handlers.executeExportFromPreview(previewDeps({ addToast }));
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Pop-up blocked'), 'error');
    expect(addToast).not.toHaveBeenCalled();
    expect(document.getElementById('allo-export-notice')).toBeNull();
  });

  it('announces unavailable browser read-aloud without opening a native alert', async () => {
    const match = source.match(/_sc\.textContent = `([\s\S]*?)`;/);
    expect(match).not.toBeNull();
    const injectedScript = new Function('return `' + match[1] + '`;')();
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    doc.body.innerHTML = '<section class="section"><span class="ka-s">A readable sentence.</span><button type="button" class="allo-ka-play" data-ka-mode="browser">Read aloud</button></section>';
    const nativeAlert = vi.spyOn(iframe.contentWindow, 'alert').mockImplementation(() => {});
    new Function('window', 'document', 'setTimeout', injectedScript)(iframe.contentWindow, doc, setTimeout);
    doc.querySelector('.allo-ka-play').click();
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(nativeAlert).not.toHaveBeenCalled();
    const live = doc.getElementById('allo-ka-live');
    expect(live).not.toBeNull();
    expect(live.getAttribute('role')).toBe('alert');
    expect(live.getAttribute('aria-live')).toBe('assertive');
    expect(live.getAttribute('aria-atomic')).toBe('true');
    expect(live.textContent).toBe('Browser read-aloud is not available here.');
    expect(doc.querySelector('.allo-ka-play').getAttribute('aria-pressed')).toBe('false');
  });
});
