// LMS (IMS) package carries the working single-file page (2026-11-11).
//
// The header-menu package used to wrap each resource's bare fragment: no page
// runtime, so sorts and quiz checks did nothing and typed answers vanished on
// reload. It now packages the same student page as Download HTML. The Builder
// package keeps its scripts too, and any copy of the live preview drops an
// unanswered page prompt (overlay plus the inert it set), which otherwise
// shipped a page students could not click.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { loadAlloModule } from './setup.js';

const viewSource = readFileSync('view_export_preview_source.jsx', 'utf8');
const clearOpenPagePrompt = new Function(viewSource.slice(viewSource.indexOf('function _builderClearOpenPagePrompt'), viewSource.indexOf('function _builderExportPreflight')) + '\nreturn _builderClearOpenPagePrompt;')();

beforeAll(() => {
  loadAlloModule('export_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('doc_pipeline_module.js');
}, 60000);
afterEach(() => vi.restoreAllMocks());

const mockZip = () => {
  const holder = {};
  window.JSZip = class MockZip { constructor() { holder.zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); } file(name, value) { this.files.set(name, value); } };
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:ims');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return holder;
};
const exporter = (live) => window.AlloModules.createExport({
  liveRef: { current: { sourceTopic: 'Rivers', studentResponses: {}, addToast: vi.fn(), t: (key) => key, generateResourceHTML: (item) => '<p>' + item.title + '</p>', ...live } },
  warnLog: vi.fn(), debugLog: vi.fn(), escapeXml: (v) => String(v), generateUUID: () => '12345678-1234-1234-1234-123456789abc',
});
const history = [{ id: 'r1', type: 'simplified', title: 'Reading', data: 'Text' }, { id: 'g1', type: 'glossary', title: 'Words', data: [{ term: 'delta', def: 'mouth of a river' }] }];

describe('IMS package from the header menu', () => {
  it('packages one working student page, built like Download HTML', async () => {
    const holder = mockZip();
    const full = vi.fn(() => '<!DOCTYPE html><html lang="en"><head><title>Rivers</title><script>window.runtime = 1;</script></head><body><main>pack</main></body></html>');
    await exporter({ history, generateFullPackHTML: full }).handleExportIMS();
    const { zip } = holder;
    expect(full).toHaveBeenCalledTimes(1);
    const [items, topic, isWorksheet, , config] = full.mock.calls[0];
    expect(items.map((item) => item.id)).toEqual(expect.arrayContaining(['r1']));
    expect(topic).toBe('Rivers');
    expect(isWorksheet).toBe(false);
    expect(config).toMatchObject({ includeTeacherKey: false, audience: 'student' });
    expect(zip.files.get('resource_0.html')).toContain('<script>window.runtime = 1;</script>');
    expect(zip.files.has('resource_1.html')).toBe(false);
    const profile = JSON.parse(zip.files.get('alloflow-object-profile.json'));
    expect(profile.packaged).toHaveLength(1);
    expect(profile.packaged[0]).toMatchObject({ type: 'resource-pack', interactiveHtml: true, renderedInIms: true });
    expect(profile.packaged[0].includedItems.map((item) => item.id)).toEqual(items.map((item) => item.id));
    const manifest = zip.files.get('imsmanifest.xml');
    expect(new DOMParser().parseFromString(manifest, 'application/xml').querySelector('parsererror')).toBeNull();
    expect((manifest.match(/<item /g) || [])).toHaveLength(1);
  });

  it('keeps separate resources for an older app that does not pass the full-page builder', async () => {
    const holder = mockZip();
    await exporter({ history }).handleExportIMS();
    expect([...holder.zip.files.keys()].filter((name) => /^resource_\d+\.html$/.test(name)).length).toBeGreaterThan(0);
    expect(JSON.parse(holder.zip.files.get('alloflow-object-profile.json')).packaged[0].type).not.toBe('resource-pack');
  });

  it('falls back to separate resources when the full page fails to render', async () => {
    const holder = mockZip();
    await exporter({ history, generateFullPackHTML: () => { throw new Error('boom'); } }).handleExportIMS();
    expect(holder.zip.files.has('resource_0.html')).toBe(true);
    expect(holder.zip.files.get('resource_0.html')).not.toContain('<main>pack</main>');
  });
});

describe('copies of the live preview drop an unanswered page prompt', () => {
  const blockedPage = () => new JSDOM('<!DOCTYPE html><html><body>'
    + '<main data-alloflow-prompt-inert="" data-alloflow-prompt-aria="-" inert="" aria-hidden="true">Work</main>'
    + '<nav inert="" data-alloflow-prompt-aria="false" aria-hidden="true">Already inert before the prompt</nav>'
    + '<div class="alloflow-export-prompt-overlay" role="presentation"><div role="dialog">Who is working?</div></div>'
    + '<script>window.pageRuntime = 1;</script></body></html>').window.document;

  it('restores exactly what the prompt changed', () => {
    const doc = blockedPage();
    clearOpenPagePrompt(doc.documentElement);
    expect(doc.querySelector('.alloflow-export-prompt-overlay')).toBeNull();
    const main = doc.querySelector('main');
    expect(main.hasAttribute('inert')).toBe(false);
    expect(main.hasAttribute('aria-hidden')).toBe(false);
    const nav = doc.querySelector('nav');
    expect(nav.hasAttribute('inert')).toBe(true);
    expect(nav.getAttribute('aria-hidden')).toBe('false');
    expect(doc.querySelectorAll('[data-alloflow-prompt-aria],[data-alloflow-prompt-inert]')).toHaveLength(0);
    expect(doc.querySelector('script')).not.toBeNull();
  });

  it('cleans the page handed on by Download HTML / slides', async () => {
    const preview = blockedPage();
    let handed = '';
    await window.AlloModules.ExportHandlers.executeExportFromPreview({
      _docPipeline: {}, addToast: vi.fn(), t: (key) => key, exportPreviewMode: 'slides', exportPreviewRef: { current: { contentDocument: preview } },
      generateFullPackHTML: () => '', getExportableHistory: () => [], getSkippedResources: () => [], sourceTopic: 'Rivers', studentResponses: {}, exportConfig: {}, history: [],
      handleExportSlides: async ({ liveHtml }) => { handed = liveHtml; return true; }, setShowExportPreview: () => {},
    });
    expect(handed).toContain('Work');
    expect(handed).not.toContain('alloflow-export-prompt-overlay');
    expect(handed).not.toMatch(/<main[^>]*\sinert/);
    expect(preview.querySelector('.alloflow-export-prompt-overlay')).not.toBeNull();
  });

  it('has the page prompt mark what it blocks and clear the marks when answered', async () => {
    const pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {},
      t: (key) => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: (type) => type, state: {},
    });
    const html = pipeline.generateFullPackHTML([{ id: 'n', type: 'note-taking', title: 'Notes', data: { templateType: 'cornell' } }], 'Notes', false, {}, { annotations: [] });
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/p.html', virtualConsole: new VirtualConsole() });
    const win = dom.window, doc = win.document;
    await new Promise((done) => (doc.readyState === 'complete' ? done() : win.addEventListener('load', done, { once: true })));
    await new Promise((done) => win.setTimeout(done, 100));
    const overlay = doc.querySelector('.alloflow-export-prompt-overlay');
    expect(overlay).not.toBeNull();
    const marked = doc.querySelectorAll('body > [data-alloflow-prompt-aria]');
    expect(marked.length).toBeGreaterThan(0);
    expect([...marked].every((node) => node.hasAttribute('inert'))).toBe(true);
    const once = [...overlay.querySelectorAll('button')].find((button) => /useOnce|once/i.test(button.textContent));
    once.click();
    await new Promise((done) => win.setTimeout(done, 50));
    expect(doc.querySelector('.alloflow-export-prompt-overlay')).toBeNull();
    expect(doc.querySelectorAll('[data-alloflow-prompt-aria],[data-alloflow-prompt-inert]')).toHaveLength(0);
    expect(doc.querySelectorAll('body > [inert]')).toHaveLength(0);
    win.close();
  });
});

describe('IMS package from the Builder preview', () => {
  const start = viewSource.indexOf('  const runPackageExport = React.useCallback(');
  const end = viewSource.indexOf('  // `sink` (optional)', start);
  const helperStart = viewSource.indexOf('function _removeStudentPackageTeacherSections(root) {');
  const removeTeacher = new Function(viewSource.slice(helperStart, viewSource.indexOf('\nfunction ', helperStart + 10)) + '\nreturn _removeStudentPackageTeacherSections;')();
  const runPackage = (scope) => { const names = Object.keys(scope); return new Function('React', ...names, viewSource.slice(start, end) + '\nreturn runPackageExport;')({ useCallback: (fn) => fn }, ...names.map((name) => scope[name])); };
  const page = '<!DOCTYPE html><html><head><script>window.pageRuntime = 1;</script></head><body><main><p>Student page</p><div class="question" data-correct="2">Q</div></main></body></html>';
  const scope = (overrides) => ({
    _removeStudentPackageTeacherSections: removeTeacher, altExportBusy: '', addToast: vi.fn(), t: () => '', onExportSuccess: vi.fn(), exportConfig: {},
    beginAlternativeExport: () => true, finishAlternativeExport: () => {}, qtiAssessments: [], selectedQtiKey: '', h5pActivities: [], selectedH5PKey: '',
    handleExportQTI: null, handleExportH5P: null, handleExportIMS: vi.fn(async () => true),
    getCleanBuilderDocument: vi.fn((options) => { const clone = new DOMParser().parseFromString(page, 'text/html').documentElement; if (!options.keepScripts) clone.querySelectorAll('script').forEach((n) => n.remove()); return { clone, title: 'Lesson', html: '<!DOCTYPE html>\n' + clone.outerHTML }; }),
    ...overrides,
  });

  it('asks for the page with its scripts and hands them to the package', async () => {
    const s = scope();
    await runPackage(s)('ims');
    expect(s.getCleanBuilderDocument).toHaveBeenCalledWith({ forExport: true, keepScripts: true });
    expect(s.handleExportIMS.mock.calls[0][0].liveHtml).toContain('window.pageRuntime = 1;');
  });

  it('runs the Download HTML answer pass for an assessment, or drops the scripts without it', async () => {
    const real = window.AlloModules.ExportHandlers.sanitizeAssessmentStudentHtml;
    const sanitized = scope({ exportConfig: { assessmentMode: true } });
    await runPackage(sanitized)('ims');
    expect(sanitized.handleExportIMS.mock.calls[0][0].liveHtml).toBe(real(sanitized.getCleanBuilderDocument.mock.results[0].value.html));
    try {
      window.AlloModules.ExportHandlers.sanitizeAssessmentStudentHtml = undefined;
      const bare = scope({ exportConfig: { assessmentMode: true } });
      await runPackage(bare)('ims');
      expect(bare.handleExportIMS.mock.calls[0][0].liveHtml).not.toContain('<script');
    } finally { window.AlloModules.ExportHandlers.sanitizeAssessmentStudentHtml = real; }
  });
});
