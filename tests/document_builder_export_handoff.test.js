import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let executeExportFromPreview;

beforeAll(() => {
  loadAlloModule('export_handlers_module.js');
  executeExportFromPreview = window.AlloModules.ExportHandlers.executeExportFromPreview;
});

beforeEach(() => {
  window.AlloFlowUX = { toast: vi.fn() };
});

function previewDoc() {
  const doc = document.implementation.createHTMLDocument('Builder handoff');
  doc.body.innerHTML = '<main><h1>Short valid document</h1><p>Ready.</p></main>';
  return doc;
}

function deps(overrides = {}) {
  return {
    _docPipeline: {},
    addToast: vi.fn(),
    t: (key) => key,
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

describe('Document Builder export handoff', () => {
  it('keeps the Builder open when the print popup is blocked', async () => {
    const d = deps();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const ok = await executeExportFromPreview(d);
    expect(ok).toBe(false);
    expect(d.setShowExportPreview).not.toHaveBeenCalled();
    expect(window.AlloFlowUX.toast).toHaveBeenCalled();
    open.mockRestore();
  });

  it('closes through the supplied canonical setter after print handoff succeeds', async () => {
    const popup = { document: { write: vi.fn(), close: vi.fn() }, print: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(popup);
    const d = deps();
    const ok = await executeExportFromPreview(d);
    expect(ok).toBe(true);
    expect(popup.document.write).toHaveBeenCalled();
    expect(d.setShowExportPreview).toHaveBeenCalledWith(false);
    open.mockRestore();
  });

  it('does not close when an asynchronous slide export fails', async () => {
    const d = deps({ exportPreviewMode: 'slides', handleExportSlides: vi.fn().mockRejectedValue(new Error('slide failure')) });
    await expect(executeExportFromPreview(d)).rejects.toThrow('slide failure');
    expect(d.setShowExportPreview).not.toHaveBeenCalled();
  });
});