import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import babel from '@babel/core';
const require = createRequire(import.meta.url);
const traverse = traverseModule.default || traverseModule;
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
const moduleText = readFileSync('view_sidebar_panels_module.js', 'utf8');
const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
const ast = parse(source, { sourceType: 'script', plugins: ['jsx'] });
const names = ['GeneratorActionsView', 'SourceInputShellView'];
const functions = ast.program.body.filter(n => n.type === 'FunctionDeclaration' && names.includes(n.id.name));
let api, Gate, root, host;
beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React; window.AlloModules = {};
  vm.runInNewContext(moduleText, { window, console, FileReader: function () { return new globalThis.FileReader(); } });
  api = window.AlloModules.SidebarPanels;
  const gateStart = shell.indexOf('const CDNModuleGate = (function () {');
  const gateEnd = shell.indexOf('\n})();', gateStart);
  if (gateStart < 0 || gateEnd < gateStart) throw new Error('Missing host CDN gate');
  const compiled = babel.transformSync(shell.slice(gateStart, gateEnd + 6), { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code;
  Gate = new Function('React', compiled + '\nreturn CDNModuleGate;')(React);
}, 60000);
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); root = host = null;
  window.AlloModules.SidebarPanels = api; window.__alloModuleRegistry = {};
  delete window.__alloEnsureSidebarPanels; delete window.AlloModules.createDocPipeline;
  vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});
function fixture(name, overrides = {}) {
  const node = functions.find(n => n.id.name === name);
  const props = {};
  for (const prop of node.body.body[0].declarations[0].id.properties) {
    const key = prop.key.name;
    props[key] = /^[A-Z]/.test(key) ? () => null : /^(set|handle|open|toggle|capture|start|isGuided|isTool)/.test(key) ? vi.fn() : undefined;
  }
  return { ...props, t: k => k, expandedTools: [], guidedMode: false, activeView: 'input',
    isTeacherMode: true, isGuidedToolVisible: () => true, isToolCatalogItemVisible: () => true,
    TOOL_CATALOG_GROUPS: { all: ['math', 'quiz'], essentials: ['math'] }, guidedActiveSteps: [], guidedStep: 0,
    toolCatalogGroup: 'all', toolCatalogQuery: '', isToolCatalogExpanded: true, isToolCatalogHidden: false,
    fileInputRef: { current: { click: vi.fn() } }, pdfProjectLoadEpochRef: { current: 0 },
    capturePdfDocumentIntakeEpoch: () => 1, isPdfDocumentIntakeCurrent: () => true,
    startNewPdfAudit: vi.fn(() => 2), addToast: vi.fn(),
    rehydrateVerificationHtmlBinding: vi.fn(async project => project),
    deriveVerificationState: () => ({ verificationState: 'complete', afterScoreVerified: true }),
    isLiveVerificationHtmlBound: () => false, attachVerificationHtmlProof: vi.fn(),
    ...overrides };
}
function all(node) {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray(node.props.children).flatMap(all)];
}
function sourceUpload(p) { return all(api.SourceInputShellView(p)).find(n => n.type === 'input' && n.props.accept === '.json'); }
function readers() {
  const created = [];
  vi.stubGlobal('FileReader', class { constructor() { created.push(this); } readAsText = vi.fn(); });
  return created;
}
function upload(p, size = 10) { const event = { target: { files: [{ size }], value: 'selected.json' } }; sourceUpload(p).props.onChange(event); return event; }
const unfinished = { version: 1, incomplete: true, fileName: 'lesson.pdf', docKey: 'digest', extractedText: 'Retained source', pageRange: [2, 4] };
function sanitizer() { window.AlloModules.createDocPipeline = { sanitizeRemediationProject: vi.fn(project => ({ project })) }; }

describe('sidebar shell CDN boundaries', () => {
  it('supplies every view dependency explicitly and introduces no unresolved host captures', () => {
    for (const node of functions) {
      const text = source.slice(node.start, node.end);
      const mini = parse(text, { sourceType: 'script', plugins: ['jsx'] });
      const free = new Set(); traverse(mini, { ReferencedIdentifier(p) { if (!p.scope.getBinding(p.node.name)) free.add(p.node.name); } });
      expect([...free].filter(n => !['React', 'window', 'document', 'String', 'Array', 'Number', 'JSON', 'Error', 'FileReader', 'undefined'].includes(n))).toEqual([]);
      expect(text.includes('useState(')).toBe(false); expect(text.includes('useEffect(')).toBe(false);
    }
    for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const s = readFileSync(file, 'utf8');
      expect(s.includes('id="tour-generator-actions"')).toBe(false);
      expect(s.includes('id="tour-input-panel"')).toBe(false);
      for (const name of names) expect(s.includes('moduleKey="SidebarPanels.' + name + '"')).toBe(true);
      expect(s.includes('const pdfProjectLoadEpochRef =')).toBe(true);
      expect(s.includes('window.__alloEnsureSidebarPanels = () =>')).toBe(true);
    }
  });
  it('builds deterministically and preserves older panel exports', () => {
    const check = require('node:child_process').execFileSync(process.execPath, ['-e', "const fs=require('fs');const b=require('./_build_view_sidebar_panels_module.js');if(b.buildSidebarPanelsModule(fs.readFileSync('view_sidebar_panels_source.jsx','utf8'))!==fs.readFileSync('view_sidebar_panels_module.js','utf8'))process.exit(1);"], { cwd: process.cwd() });
    expect(check.length).toBe(0);
    expect(readFileSync('desktop/web-app/public/view_sidebar_panels_module.js', 'utf8') === moduleText).toBe(true);
    for (const name of ['SourceInputPanel', 'MathPanel', 'QuizPanel', 'ToolCatalogControls']) expect(typeof window.AlloModules[name]).toBe('function');
    expect(typeof api.GeneratorActionsView).toBe('function'); expect(typeof api.SourceInputShellView).toBe('function');
    expect(readFileSync('build.js', 'utf8').includes("buildSidebarPanelsModule(src)")).toBe(true);
  });
  it('keeps direct-child tool IDs and host toggle actions', () => {
    const p = fixture('GeneratorActionsView'); const tree = api.GeneratorActionsView(p);
    expect(tree.props.id).toBe('tour-generator-actions');
    const math = all(tree).find(n => n.props.id === 'tour-tool-math');
    expect(React.Children.toArray(tree.props.children).some(n => n.props?.id === 'tour-tool-math')).toBe(true);
    all(math).find(n => n.type === 'button').props.onClick();
    expect(p.toggleTool).toHaveBeenCalledWith('math');
    const hidden = api.GeneratorActionsView({ ...p, isGuidedToolVisible: () => false });
    expect(all(hidden).find(n => n.props.id === 'tour-tool-math').props.style.display).toBe('none');
  });
  it('preserves catalog callbacks and suppresses discovery in Guided Mode', () => {
    const p = fixture('GeneratorActionsView'); const tree = api.GeneratorActionsView(p);
    const controls = all(tree).find(n => n.type === window.AlloModules.ToolCatalogControls);
    controls.props.onGroupChange('essentials'); expect(p.setToolCatalogQuery).toHaveBeenCalledWith(''); expect(p.setToolCatalogGroup).toHaveBeenCalledWith('essentials');
    controls.props.onCollapse(); expect(p.setIsToolCatalogExpanded).toHaveBeenCalledWith(false);
    expect(all(api.GeneratorActionsView({ ...p, guidedMode: true })).some(n => n.type === window.AlloModules.ToolCatalogControls)).toBe(false);
  });
  it('preserves source upload guards, file ref and transcript actions', () => {
    const p = fixture('SourceInputShellView', { expandedTools: ['source-input'], videoTranscriptSourceContext: { title: 'Lesson', wordCount: 20, cueCount: 2, chapterCount: 0 } });
    const tree = api.SourceInputShellView(p); expect(tree.props.id).toBe('tour-input-panel');
    all(tree).find(n => n.props.id === 'tour-upload-source').props.onClick(); expect(p.fileInputRef.current.click).toHaveBeenCalledOnce();
    const busy = api.SourceInputShellView({ ...p, isExtracting: true });
    expect(all(busy).find(n => n.props.id === 'tour-upload-source').props.disabled).toBe(true);
    all(tree).find(n => n.props['aria-label'] === 'a11y.hide_transcript_shortcuts').props.onClick(); expect(p.handleTranscriptSourceAction).toHaveBeenCalledWith('dismiss');
  });
});

describe('source project import ownership and verification', () => {
  it('rejects oversized files before reading or changing host state', () => {
    const rs = readers(), p = fixture('SourceInputShellView'); const event = upload(p, 64 * 1024 * 1024 + 1);
    expect(rs).toHaveLength(0); expect(p.addToast).toHaveBeenCalledWith(expect.stringContaining('64 MB'), 'error'); expect(event.target.value).toBe(''); expect(p.startNewPdfAudit).not.toHaveBeenCalled();
  });
  it('ignores superseded file readers and restores only the newest valid project', async () => {
    const rs = readers(), p = fixture('SourceInputShellView'); sanitizer(); upload(p); upload(p);
    await rs[0].onload({ target: { result: JSON.stringify(unfinished) } }); expect(p.startNewPdfAudit).not.toHaveBeenCalled();
    await rs[1].onload({ target: { result: JSON.stringify(unfinished) } }); expect(p.startNewPdfAudit).toHaveBeenCalledOnce(); expect(p.setInputText).toHaveBeenCalledWith('Retained source'); expect(p.setPendingPdfFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'lesson.pdf', documentDigest: 'digest' })); expect(p.setPdfPageRange).toHaveBeenCalledWith({ start: 2, end: 4 });
  });
  it('ignores late verification after the user changes document', async () => {
    let resolveImport, current = true; const rs = readers(), p = fixture('SourceInputShellView', { rehydrateVerificationHtmlBinding: () => new Promise(resolve => { resolveImport = resolve; }), isPdfDocumentIntakeCurrent: () => current });
    sanitizer(); upload(p); const pending = rs[0].onload({ target: { result: JSON.stringify(unfinished) } }); current = false; resolveImport(unfinished); await pending;
    expect(p.startNewPdfAudit).not.toHaveBeenCalled(); expect(p.setPendingPdfFile).not.toHaveBeenCalled(); expect(p.addToast).not.toHaveBeenCalled();
  });
  it('does not trust an imported complete score without a live HTML binding', async () => {
    const rs = readers(), p = fixture('SourceInputShellView'); sanitizer(); upload(p);
    await rs[0].onload({ target: { result: JSON.stringify({ version: 1, accessibleHtml: '<p>Lesson</p>', afterScoreVerified: true, verificationState: 'complete', _translation: { language: 'fr' } }) } });
    expect(p.setPdfFixResult).toHaveBeenCalledWith(expect.objectContaining({ afterScoreVerified: false, requiresManualReview: true, _translation: { language: 'fr' } })); expect(p.attachVerificationHtmlProof).not.toHaveBeenCalled();
  });
  it('reports unavailable sanitization without mutating the current document', async () => {
    const rs = readers(), p = fixture('SourceInputShellView'); upload(p); await rs[0].onload({ target: { result: JSON.stringify(unfinished) } });
    expect(p.addToast).toHaveBeenCalledWith(expect.stringContaining('security module'), 'error'); expect(p.startNewPdfAudit).not.toHaveBeenCalled();
  });
});

describe('existing CDN gate with the shared sidebar registration', () => {
  it('announces failure, retries the existing request, then renders current host props', () => {
    vi.useFakeTimers(); delete window.AlloModules.SidebarPanels;
    window.__alloModuleRegistry = { SidebarPanels: { status: 'failed' } };
    window.__alloEnsureSidebarPanels = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    const render = value => React.createElement(Gate, { moduleKey: 'SidebarPanels.GeneratorActionsView', loaderName: '__alloEnsureSidebarPanels', size: 'inline', displayName: 'Generator tools' }, View => React.createElement(View, { value }));
    act(() => root.render(render('initial')));
    expect(host.textContent).toContain('could not load');
    act(() => host.querySelector('button').click()); expect(window.__alloEnsureSidebarPanels).toHaveBeenCalledTimes(2);
    act(() => root.render(render('latest')));
    window.AlloModules.SidebarPanels = { GeneratorActionsView: ({ value }) => React.createElement('p', null, value) };
    act(() => window.dispatchEvent(new Event('alloflow:module-registry-changed')));
    expect(host.textContent).toBe('latest'); expect(vi.getTimerCount()).toBe(0);
  });
});
