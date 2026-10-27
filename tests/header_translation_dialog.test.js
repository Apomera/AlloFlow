import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const babel = require('@babel/core');
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const factory = new Function(readFileSync('host_handlers_source.jsx', 'utf8') + '\nreturn createHostHandlers;')();
const roots = [];
const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('text_pipeline_helpers_module.js');
});
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });
afterEach(async () => {
  for (const { root, node } of roots.splice(0)) {
    await React.act(async () => root.unmount());
    node.remove();
  }
});

function t(key, params = {}) {
  const value = key.split('.').reduce((object, part) => object?.[part], strings);
  return typeof value === 'string' ? value.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match) : undefined;
}

async function mount(file, overrides = {}) {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('{isTranslateModalOpen &&');
  const end = source.indexOf('      {showCloudWarning &&', start);
  if (start < 0 || end < 0) throw new Error('Missing translation dialog');
  const expression = source.slice(start + 1, end).trim().slice(0, -1);
  const code = babel.transformSync('const Dialog = () => (' + expression + ');', {
    plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false
  }).code;
  const current = { id: 'one', type: 'simplified', config: { language: 'Spanish', unitId: 'lesson-a' }, data: 'Hola' };
  const history = [current, { id: 'two', type: 'quiz', config: { unitId: 'lesson-a' } },
    { id: 'other', type: 'simplified', config: { unitId: 'lesson-b' } },
    { id: 'copy', type: 'quiz', translationOf: 'two', config: { unitId: 'lesson-a' } }];
  const context = { generatedContent: current, history, ...overrides };
  const actions = { translate: vi.fn(), close: vi.fn(), setScope: vi.fn() };
  const helpers = window.AlloModules.TextPipelineHelpers;
  const host = factory(context);
  const bindings = {
    React, isTranslateModalOpen: true, currentUiLanguage: 'French', translationMode: 'auto',
    selectedLanguages: ['Spanish', 'Arabic'], generatedContent: context.generatedContent,
    resolveTranslationPolicy: helpers.resolveTranslationPolicy,
    translationTargetChoices: helpers.translationTargetChoices,
    _alloHostHandlersOptional: () => host,
    translateModalRef: { current: null }, handleSetIsTranslateModalOpenToFalse: actions.close,
    setTranslateScope: actions.setScope, handleTranslateAction: actions.translate,
    t, X: () => null, Languages: () => null, isProcessing: false, ...overrides
  };
  const renderDialog = new Function(...Object.keys(bindings), 'targetTranslationLang', 'setTargetTranslationLang',
    'headerTranslationMode', 'setHeaderTranslationMode', code + '\nreturn Dialog();');
  function Component() {
    const [language, setLanguage] = React.useState('German');
    const [mode, setMode] = React.useState(null);
    return renderDialog(...Object.values(bindings), language, setLanguage, mode, setMode);
  }
  const node = document.createElement('div'); document.body.appendChild(node);
  const root = createRoot(node); roots.push({ root, node });
  await React.act(async () => root.render(React.createElement(Component)));
  return { node, actions };
}

describe.each(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'])('%s header translation dialog', file => {
  it('shows the app-language companion and the actual current-pack count', async () => {
    const { node, actions } = await mount(file);
    expect(node.querySelector('#header-translate-companion').value).toBe('auto');
    expect(node.querySelector('#header-translate-companion-hint').textContent).toContain('French');
    const batchButton = [...node.querySelectorAll('button')].find(button => button.textContent.includes('current pack'));
    expect(batchButton.textContent).toContain('(2)');
    await React.act(async () => batchButton.click());
    expect(actions.translate).toHaveBeenCalledWith('pack', { translationMode: 'auto' });
    expect(node.querySelector('[role="dialog"]').getAttribute('aria-labelledby')).toBe('header-translate-dialog-title');
    expect(node.querySelector('label[for="header-translate-companion"]')).not.toBeNull();
  }, 15000);

  it('allows None and explicit languages without changing generation defaults', async () => {
    const { node, actions } = await mount(file);
    const select = node.querySelector('#header-translate-companion');
    await React.act(async () => { select.value = 'off'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(node.querySelector('#header-translate-companion-hint').textContent).toContain('No companion');
    const currentButton = [...node.querySelectorAll('button')].find(button => button.textContent.includes('Translate Current'));
    await React.act(async () => currentButton.click());
    expect(actions.translate).toHaveBeenLastCalledWith('single', { translationMode: 'off' });
    await React.act(async () => { select.value = 'Arabic'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(node.querySelector('#header-translate-companion-hint').textContent).toContain('Arabic');
    await React.act(async () => currentButton.click());
    expect(actions.translate).toHaveBeenLastCalledWith('single', { translationMode: 'Arabic' });
  }, 15000);

  it('names the workspace fallback and exposes the glossary exception', async () => {
    const glossary = { id: 'glossary', type: 'glossary', data: [{ term: 'Leaf', def: 'Plant part' }] };
    const { node } = await mount(file, { history: [glossary], generatedContent: glossary, translationMode: 'off' });
    expect(node.textContent).toContain('Translate workspace (1)');
    expect(node.textContent).toContain('New glossaries translate their terms and definitions. Older English-base glossaries add translation columns.');
    expect(node.querySelector('#header-translate-companion').value).toBe('off');
  }, 15000);
});
