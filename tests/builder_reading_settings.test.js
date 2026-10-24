// Lane R4: "Use my reading settings" in the Document Builder: the Typography
// option (exportConfig.useReadingSettings) and the HTML generateFullPackHTML builds.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const DIR = process.env.LANE_DIR || '.';
const REPO = process.cwd().replace(/\\/g, '/');
const { JSDOM, VirtualConsole } = createRequire(REPO + '/package.json')('jsdom');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  window.React = React;
  new Function(readFileSync(REPO + '/ui_font_library_module.js', 'utf8'))();
  new Function(readFileSync(DIR + '/doc_pipeline_module.js', 'utf8'))();
});

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  delete window.__alloReadingSettings;
  vi.restoreAllMocks();
});

let state = null;
function bridge(patch = {}) {
  const font = window.FONT_OPTIONS.find((f) => f.id === (patch.fontId || 'default'));
  state = { fontId: 'default', baseFontSize: 16, lineHeight: 1.6, letterSpacing: 0, colorOverlay: 'none', readingRuler: false, fonts: window.FONT_OPTIONS, fontFamily: font.family, fontClass: font.cssClass, ...patch };
  window.__alloReadingSettings = {
    get: () => ({ ...state }),
    set: (p) => { Object.assign(state, p); window.dispatchEvent(new CustomEvent('alloflow:reading-settings-changed', { detail: { ...state } })); },
    subscribe: (fn) => { const h = (e) => fn(e.detail); window.addEventListener('alloflow:reading-settings-changed', h); return () => window.removeEventListener('alloflow:reading-settings-changed', h); },
  };
}
const glossary = () => [{ term: 'Leaf', def: 'A plant part that makes food.' }, { term: 'Root', def: 'The part under the ground.' }];
function pack(config) {
  const pipeline = window.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (key) => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Vocabulary', state: {} });
  return pipeline.generateFullPackHTML([{ type: 'glossary', id: 'g1', title: 'Plant words', data: glossary() }], 'Pack', false, {}, { includeGlossary: true, includeTeacherKey: false, annotations: [], ...config });
}
const bodyRule = (html) => (html.match(/\n\s*body \{ font-family:[^\n]*/) || [''])[0];
const SCOPE = 'html:not([data-rt-custom]) body';

describe('generateFullPackHTML with useReadingSettings', () => {
  it('off (the default): the Builder font and size stay, and there is no reader CSS', () => {
    bridge({ fontId: 'opendyslexic', baseFontSize: 22, lineHeight: 2 });
    const html = pack({ fontId: 'georgia', fontSize: 18 });
    expect(bodyRule(html).includes('font-family: Georgia')).toBe(true);
    expect(bodyRule(html).includes('font-size: 18px;')).toBe(true);
    expect(html.includes(SCOPE)).toBe(false);
    expect(html.includes('html{font-size:22px}')).toBe(false);
  });
  it('on: the reader font, size and spacing win over the Builder font and size', () => {
    bridge({ fontId: 'opendyslexic', baseFontSize: 22, lineHeight: 2, letterSpacing: 0.05 });
    const html = pack({ fontId: 'georgia', fontSize: 18, useReadingSettings: true });
    expect(bodyRule(html).includes("font-family: 'OpenDyslexic', sans-serif;")).toBe(true);
    expect(bodyRule(html).includes('font-size: 22px;')).toBe(true);
    expect(html.includes('html{font-size:22px}')).toBe(true);
    expect(html.includes(SCOPE + ',' + SCOPE + " *:not(svg):not(svg *):not(math):not(math *){font-family:'OpenDyslexic', sans-serif !important}")).toBe(true);
    expect(html.includes('line-height:2 !important;letter-spacing:0.05em !important')).toBe(true);
    expect(html.includes("@font-face { font-family: 'OpenDyslexic'"), 'the font face ships with it').toBe(true);
    expect(bodyRule(html).includes('Georgia')).toBe(false);
  });
  it('a web reader font ships its @import; a default reader font keeps the theme font', () => {
    bridge({ fontId: 'lexend' });
    expect(pack({ useReadingSettings: true }).includes("@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;700&display=swap');")).toBe(true);
    bridge({ baseFontSize: 20 });
    const themed = pack({ useReadingSettings: true });
    const theme = bodyRule(pack({})).match(/font-family: ([^;]*);/)[1];
    expect(bodyRule(themed).includes('font-family: ' + theme + ';')).toBe(true);
    expect(bodyRule(themed).includes('font-size: 20px;')).toBe(true);
    expect(themed.includes('html{font-size:20px}')).toBe(true);
    expect(themed.includes(SCOPE + ' :is('), 'spacing still applies').toBe(true);
    expect(themed.includes(SCOPE + ',' + SCOPE + ' *'), 'no forced font family for the default font').toBe(false);
  });
  it('without the host bridge the option changes nothing', () => {
    const on = pack({ fontId: 'georgia', fontSize: 18, useReadingSettings: true });
    expect(bodyRule(on)).toBe(bodyRule(pack({ fontId: 'georgia', fontSize: 18 })));
    expect(on.includes(SCOPE)).toBe(false);
  });
  it('the page tools still work: choosing a font or spacing there sets the baked settings aside', () => {
    bridge({ fontId: 'opendyslexic', baseFontSize: 22, lineHeight: 2 });
    const html = pack({ useReadingSettings: true });
    const dom = new JSDOM(html, { url: 'https://export.test/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
    cleanups.push(() => dom.window.close());
    const doc = dom.window.document;
    const root = doc.documentElement;
    expect(root.hasAttribute('data-rt-custom')).toBe(false);
    doc.querySelector('[data-rt-text="larger"]').click();
    expect(root.hasAttribute('data-rt-custom'), 'a bigger size keeps the baked font and spacing').toBe(false);
    doc.querySelector('[data-rt-text="spacing"]').click();
    expect(root.hasAttribute('data-rt-custom')).toBe(true);
    doc.querySelector('[data-rt-text="reset"]').click();
    expect(root.hasAttribute('data-rt-custom')).toBe(false);
    const select = doc.querySelector('[data-rt-font]');
    select.value = 'serif';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(root.hasAttribute('data-rt-custom')).toBe(true);
    expect(root.matches(SCOPE.split(' ')[0])).toBe(false);
  });
});

// The Builder is a large view; a busy machine can take most of the default timeout to mount it.
describe('the Builder option', { timeout: 60000 }, () => {
  beforeAll(() => {
    if (!window.AlloModules.ExportPreviewView) new Function(readFileSync(DIR + '/view_export_preview_module.js', 'utf8'))();
  }, 60000);
  const FUNCTION_PROPS = ['_ensureDiffLib', 'addToast', 'applyExportPreset', 'auditOutputAccessibility', 'deleteExportPreset', 'executeExportFromPreview', 'generateCustomExportStyle', 'getExportPreviewHTML', 'handleExportH5P', 'handleExportIMS', 'handleExportQTI', 'openInAlloStudio', 'processExpertCommand', 'proposeRestyles', 'runAxeAudit', 'saveExportPreset', 'setAgentActivityLog', 'setAgentLogFullView', 'setCustomExportCSS', 'setDiffViewOpen', 'setExpertCommandInput', 'setExportAuditLoading', 'setExportAuditResult', 'setExportPreviewMode', 'setExportStylePrompt', 'setExportTheme', 'setIsAgentRunning', 'setShowBrandProfileEditor', 'setShowExportPreview', 'toggleA11yInspect', 'updateExportPreview', 'onBuilderDraftCapture', 'onExportSuccess', 'setBuilderWorkspaceMode', 'onAdvancedReviewSessionChange'];
  let latest = null;
  function mountBuilder(initial, extra = {}) {
    const View = window.AlloModules.ExportPreviewView;
    const base = { showExportPreview: true, history: [{ id: 'g1', type: 'glossary', data: glossary() }], t: (k) => k, exportPreviewMode: 'html', exportPreviewRef: { current: null }, STYLE_SEEDS: {}, FONT_OPTIONS: window.FONT_OPTIONS, BUILT_IN_PRESETS: [], exportPresets: [], agentActivityLog: [], exportTheme: 'professional', theme: 'light', exportStylePrompt: '', expertCommandInput: '', customExportCSS: '', selectedFont: 'default', exportPreviewSource: 'history', getSkippedResources: () => [] };
    FUNCTION_PROPS.forEach((name) => { base[name] = () => undefined; });
    function Builder() {
      const [config, setConfig] = React.useState({ includeGlossary: true, fontSize: 16, ...initial });
      latest = config;
      return React.createElement(View, { ...base, ...extra, exportConfig: config, setExportConfigAndRefresh: (update) => setConfig((prev) => (typeof update === 'function' ? update(prev) : update)) });
    }
    const container = document.createElement('div');
    document.body.append(container);
    const root = ReactDOMClient.createRoot(container);
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => root.render(React.createElement(Builder)));
    cleanups.push(() => { act(() => root.unmount()); container.remove(); quiet.mockRestore(); });
    return container;
  }
  const option = (container) => container.querySelector('label[data-export-reading-settings] input[type="checkbox"]');
  const fontSelect = (container) => container.querySelector('select[data-help-key="doc_builder_font_select"]');
  const sizeSlider = (container) => container.querySelector('input[data-help-key="doc_builder_font_size_slider"]');

  it('is in Typography, off by default, and round-trips into exportConfig and the generated HTML', () => {
    bridge({ fontId: 'opendyslexic', baseFontSize: 22 });
    const container = mountBuilder({ fontId: 'georgia' });
    const box = option(container);
    expect(box.closest('label').querySelector('.font-bold').textContent).toBe('Use my reading settings');
    expect(container.querySelector('[id="' + box.getAttribute('aria-describedby') + '"]').textContent).toBe('Prints with your font, text size and spacing.');
    expect(box.checked).toBe(false);
    expect(fontSelect(container).disabled || sizeSlider(container).disabled).toBe(false);
    act(() => box.click());
    expect(latest.useReadingSettings).toBe(true);
    expect(option(container).checked).toBe(true);
    expect(fontSelect(container).disabled, 'the reader font wins while on').toBe(true);
    expect(sizeSlider(container).disabled, 'the reader size wins while on').toBe(true);
    const html = pack(latest);
    expect(html.includes(SCOPE)).toBe(true);
    expect(bodyRule(html).includes("'OpenDyslexic'")).toBe(true);
    act(() => option(container).click());
    expect(latest.useReadingSettings).toBe(false);
    expect(fontSelect(container).disabled).toBe(false);
    expect(pack(latest).includes(SCOPE)).toBe(false);
  });
  it('is not offered without the host bridge, for slides, or for a remediated document', () => {
    expect(option(mountBuilder({}))).toBeNull();
    bridge();
    expect(option(mountBuilder({}))).not.toBeNull();
    expect(option(mountBuilder({}, { exportPreviewMode: 'slides' }))).toBeNull();
    expect(option(mountBuilder({}, { exportPreviewSource: 'remediation' }))).toBeNull();
  });
  it('while on, a change to the reading settings re-renders the preview (and so the export)', async () => {
    bridge({ baseFontSize: 18 });
    const refresh = vi.fn();
    mountBuilder({ useReadingSettings: true }, { updateExportPreview: refresh });
    act(() => window.__alloReadingSettings.set({ colorOverlay: 'peach' }));
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(refresh, 'an overlay change does not touch the export').not.toHaveBeenCalled();
    act(() => window.__alloReadingSettings.set({ baseFontSize: 24 }));
    act(() => window.__alloReadingSettings.set({ baseFontSize: 26 }));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });
  it('while off, reading-settings changes leave the preview alone', async () => {
    bridge({ baseFontSize: 18 });
    const refresh = vi.fn();
    mountBuilder({}, { updateExportPreview: refresh });
    act(() => window.__alloReadingSettings.set({ baseFontSize: 24 }));
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(refresh).not.toHaveBeenCalled();
  });
});
