import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import babel from '@babel/core';
const require = createRequire(import.meta.url);
const traverse = traverseModule.default || traverseModule;
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
const source = readFileSync('view_persona_workspace_source.jsx', 'utf8');
const moduleText = readFileSync('view_persona_workspace_module.js', 'utf8');
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const t = (key, params = {}) => {
  const value = key.split('.').reduce((obj, part) => obj?.[part], strings);
  return typeof value === 'string' ? value.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '') : '';
};
let View, LazyView, root, host;
beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  window.AlloModules = {};
  vm.runInNewContext(moduleText, { window, localStorage });
  View = window.AlloModules.PersonaWorkspace.PersonaWorkspaceView;
  const ast = parse(shell, { sourceType: 'module', plugins: ['jsx'] });
  const helpers = ast.program.body.filter(node => node.type === 'FunctionDeclaration' && ['_AlloRecoverableLazyView', 'PersonaWorkspaceView'].includes(node.id.name));
  const compiled = babel.transformSync(helpers.map(node => shell.slice(node.start, node.end)).join('\n'), { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code;
  LazyView = new Function('React', compiled + '\nreturn PersonaWorkspaceView;')(React);
});
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); root = host = null;
  delete window.__alloLazyPersonaWorkspace; delete window.__alloRetryFailedModules;
  window.__alloModuleRegistry = {}; window.AlloModules.PersonaWorkspace = { PersonaWorkspaceView: View };
  localStorage.clear(); vi.restoreAllMocks();
});
function fixture(overrides = {}) {
  const Icon = () => React.createElement('span', { 'aria-hidden': true });
  const ada = { name: 'Ada', year: '1843', role: 'Mathematician', context: 'Computing and the analytical engine.' };
  const grace = { name: 'Grace', year: '1952', role: 'Computer scientist', context: 'Compilers and programming languages.' };
  return {
    ErrorBoundary: ({ children }) => children, t, isProcessing: false, isGeneratingPersona: false,
    History: Icon, Sparkles: Icon, MessageCircleQuestion: Icon, CheckCircle2: Icon, Plus: Icon, RefreshCw: Icon, Users: Icon,
    personaState: { mode: 'single', selectedCharacters: [] }, setPersonaState: vi.fn(), isTeacherMode: true,
    normalizePersonaResumeDays: value => [0, 7, 14, 30].includes(Number(value)) && value !== null ? Number(value) : 14,
    clearPersonaResumeSnapshots: vi.fn(async () => true), addToast: vi.fn(),
    generatedContent: { id: 'resource-1', type: 'persona', data: [ada, grace] },
    extractPersonaGroundingDisclosure: () => ({ links: [], queries: [] }),
    handleTogglePanelSelection: vi.fn(), openPersonaTeacherEditor: vi.fn(), handleSelectPersona: vi.fn(), handleStartPanelChat: vi.fn(),
    personaTeacherEditor: null, setPersonaTeacherEditor: vi.fn(), personaTeacherEditorRef: React.createRef(),
    updatePersonaTeacherEditor: vi.fn(), getPersonaVoiceOptions: () => [], savePersonaTeacherEditor: vi.fn(), onBack: vi.fn(), ...overrides,
  };
}
function render(props = fixture(), Component = View) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(React.createElement(Component, props))); return props;
}
function update(props, Component = View) { act(() => root.render(React.createElement(Component, props))); }
function button(label) { return [...host.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === label || el.textContent.trim() === label); }
describe('Persona workspace extraction', () => {
  it('passes all external dependencies explicitly and leaves only browser globals unbound', () => {
    const ast = parse(source, { sourceType: 'script', plugins: ['jsx'] });
    const names = ast.program.body[0].params[0].properties.map(prop => prop.key.name);
    for (const name of names) expect(shell).toContain(name + '={' + name + '}');
    const free = new Set(); traverse(ast, { ReferencedIdentifier(p) { if (!p.scope.getBinding(p.node.name)) free.add(p.node.name); } });
    expect([...free].sort()).toEqual(['Array', 'Date', 'Error', 'String', 'localStorage', 'undefined']);
    expect(shell).not.toContain('data-help-key="persona_card"');
    expect(shell).toContain('useFocusTrap(personaTeacherEditorRef, Boolean(personaTeacherEditor)');
    expect(shell).toContain("const [personaTeacherEditor, setPersonaTeacherEditor] = useState(null)");
    expect(readFileSync('desktop/web-app/public/view_persona_workspace_module.js', 'utf8')).toBe(moduleText);
  });
  it('selects characters and changes interview mode through the existing host actions', () => {
    const p = render();
    act(() => host.querySelector('[data-help-key="persona_select_button"]').click());
    expect(p.handleSelectPersona).toHaveBeenCalledWith(p.generatedContent.data[0]);
    act(() => button(t('persona.mode_panel')).click());
    expect(p.setPersonaState.mock.calls[0][0]({ mode: 'single', selectedCharacters: [], retained: true })).toMatchObject({ mode: 'panel', retained: true });
    update({ ...p, personaState: { mode: 'panel', selectedCharacters: [] } });
    expect(button(t('common.start_panel_chat')).disabled).toBe(true);
    act(() => host.querySelector('[data-help-key="persona_select_button"]').click());
    expect(p.handleTogglePanelSelection).toHaveBeenCalledTimes(1);
    update({ ...p, personaState: { mode: 'panel', selectedCharacters: p.generatedContent.data } });
    expect(button(t('common.start_panel_chat')).disabled).toBe(false);
    act(() => button(t('common.start_panel_chat')).click()); expect(p.handleStartPanelChat).toHaveBeenCalledTimes(1);
  });
  it('blocks selection, mode changes, and teacher editing while generation is busy', () => {
    const p = render(fixture({ isGeneratingPersona: true }));
    expect(host.querySelector('[data-help-key="persona_panel"]').getAttribute('aria-busy')).toBe('true');
    act(() => host.querySelector('[data-help-key="persona_select_button"]').click());
    act(() => host.querySelector('[data-help-key="persona_card"]').click());
    act(() => button(t('persona.mode_panel')).click());
    act(() => button(t('common.edit')).click());
    expect(p.handleSelectPersona).not.toHaveBeenCalled(); expect(p.handleTogglePanelSelection).not.toHaveBeenCalled();
    expect(p.openPersonaTeacherEditor).not.toHaveBeenCalled(); expect(p.setPersonaState).not.toHaveBeenCalled();
  });
  it('keeps teacher editing, completed-quest protection, and save/Escape actions', () => {
    const editor = { candidateName: 'Ada', role: 'Mathematician', voice: 'Existing voice', context: 'Context', guardrails: 'Stay grounded', quests: [{ id: 'q1', text: 'Explain the engine', difficulty: 20, isCompleted: true }] };
    const p = render(fixture({ personaTeacherEditor: editor }));
    const dialog = host.querySelector('[role="dialog"]'); expect(dialog).toBe(p.personaTeacherEditorRef.current);
    expect(dialog.querySelector('select').value).toBe('Existing voice');
    expect(button(t('persona.completed')).disabled).toBe(true);
    act(() => Simulate.change(dialog.querySelector('input'), { target: { value: 'Computing pioneer' } }));
    expect(p.updatePersonaTeacherEditor).toHaveBeenCalledWith({ role: 'Computing pioneer' });
    act(() => button(t('persona.save_changes')).click()); expect(p.savePersonaTeacherEditor).toHaveBeenCalledTimes(1);
    act(() => Simulate.keyDown(dialog, { key: 'Escape' })); expect(p.setPersonaTeacherEditor).toHaveBeenCalledWith(null);
  });
  it('keeps retention opt-out and source disclosure behavior', async () => {
    const p = fixture({ generatedContent: { data: [], config: { personaSource: { topic: 'Computing', excerpt: 'Bound source', fingerprint: 'source-123' } } }, extractPersonaGroundingDisclosure: () => ({ links: [{ url: 'https://example.org/source', title: 'Source document' }], queries: ['computing history'] }) });
    render(p); expect(host.textContent).toContain('Bound source');
    expect(host.querySelector('a[href="https://example.org/source"]').getAttribute('rel')).toBe('noopener noreferrer');
    await act(async () => Simulate.change(host.querySelector('select'), { target: { value: '0' } }));
    expect(p.clearPersonaResumeSnapshots).toHaveBeenCalledTimes(1); expect(localStorage.getItem('allo_persona_resume_days')).toBe('0');
    expect(p.addToast).toHaveBeenCalledWith(t('persona.retention_updated'), 'success');
  });
  it('loads on demand, exposes retry/back, and renders the latest props after registration', () => {
    delete window.AlloModules.PersonaWorkspace; window.__alloModuleRegistry = {};
    window.__alloLazyPersonaWorkspace = vi.fn(); window.__alloRetryFailedModules = vi.fn();
    const p = render(fixture(), LazyView);
    expect(window.__alloLazyPersonaWorkspace).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('Loading the Persona workspace');
    act(() => button(t('common.back')).click()); expect(p.onBack).toHaveBeenCalledTimes(1);
    window.__alloModuleRegistry.PersonaWorkspace = { status: 'failed' };
    act(() => window.dispatchEvent(new Event('alloflow:module-registry-changed')));
    expect(host.textContent).toContain('could not load');
    act(() => button('Retry loading').click()); expect(window.__alloRetryFailedModules).toHaveBeenCalledTimes(1);
    const latest = { ...p, generatedContent: { data: [{ name: 'Latest character', context: 'Updated while loading' }] } };
    update(latest, LazyView);
    window.AlloModules.PersonaWorkspace = { PersonaWorkspaceView: View };
    act(() => window.dispatchEvent(new Event('alloflow:module-registry-changed')));
    expect(host.textContent).toContain('Latest character'); expect(host.textContent).not.toContain('could not load');
  });
  it('deduplicates module registration and wires retriable, lazy-only loading in all shells', () => {
    const existing = { PersonaWorkspaceView: View }; const windowObject = { React, AlloModules: { PersonaWorkspace: existing } };
    vm.runInNewContext(moduleText, { window: windowObject }); expect(windowObject.AlloModules.PersonaWorkspace).toBe(existing);
    for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const text = readFileSync(file, 'utf8');
      expect(text.match(/loadModule\('PersonaWorkspace',/g)).toHaveLength(1);
      expect(text).toContain("window.__alloLazyPersonaWorkspace = () => { loadModule('PersonaWorkspace',");
      expect(text).toContain('onBack={() => setActiveView(\'input\')}');
      if (file !== 'AlloFlowANTI.txt') expect(text).toContain("loadModule('PersonaWorkspace', './view_persona_workspace_module.js')");
    }
    expect(readFileSync('build.js', 'utf8')).toContain("buildPersonaWorkspaceModule(src)");
  });
});
