import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const babel = require('@babel/core');
const copies = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const priorActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
const mounted = [];
beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('text_pipeline_helpers_module.js');
});
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = priorActEnvironment; });
afterEach(async () => {
  for (const { root, node } of mounted.splice(0)) {
    await React.act(async () => root.unmount()); node.remove();
  }
  vi.restoreAllMocks();
});

function slice(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < from) throw new Error('Missing language boundary ' + start);
  return source.slice(from, to);
}
function hostParts(file) {
  const source = readFileSync(file, 'utf8');
  const policy = slice(source, 'const normalizeAppLanguageName =', 'export const LanguageProvider =');
  const provider = slice(source, 'export const LanguageProvider =', '// ── UiLanguageSelector extracted').replace('export const', 'const');
  const output = slice(source, '  const [outputLanguagePreference,', '  // Translations setting');
  return { policy, provider, output };
}
async function mount(file, storage = new Map(), throwStorage = false) {
  const { policy, provider, output } = hostParts(file);
  const LanguageContext = React.createContext(null);
  let state;
  const applyUiDocumentLanguage = vi.fn();
  const code = babel.transformSync(policy + '\n' + provider + `\n
    const Output = () => {
      const {currentUiLanguage, setUiLanguage} = React.useContext(LanguageContext);
      ${output}
      expose({currentUiLanguage,setUiLanguage,leveledTextLanguage,outputLanguagePreference,setOutputLanguagePreference,setLeveledTextLanguage});
      return null;
    };
    return () => React.createElement(LanguageProvider,null,React.createElement(Output));`, {
    plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false,
    parserOpts: { allowReturnOutsideFunction: true }
  }).code;
  const Component = new Function('React', 'useState', 'useRef', 'useCallback', 'useEffect', 'LanguageContext',
    'safeGetItem', 'safeSetItem', 'useTranslation', 'apiKey', 'applyUiDocumentLanguage', 'expose', code)(
    React, React.useState, React.useRef, React.useCallback, React.useEffect, LanguageContext,
    (key, fallback) => storage.get(key) ?? fallback,
    (key, value) => { if (throwStorage) return false; storage.set(key, value); return true; },
    () => ({}), '', applyUiDocumentLanguage, value => { state = value; }
  );
  const node = document.createElement('div'); document.body.appendChild(node);
  const root = createRoot(node); mounted.push({ root, node });
  await React.act(async () => root.render(React.createElement(Component)));
  return { root, node, storage, state: () => state, applyUiDocumentLanguage };
}

describe.each(copies)('%s native language lifecycle', file => {
  it('persists app language while fresh output continues to inherit it', async () => {
    const storage = new Map([['allo_app_language', 'French']]);
    const first = await mount(file, storage);
    expect(first.state().leveledTextLanguage).toBe('French');
    expect(first.state().outputLanguagePreference).toEqual({ mode: 'app' });
    await React.act(async () => first.state().setUiLanguage('Arabic'));
    expect(first.state().leveledTextLanguage).toBe('Arabic');
    expect(storage.get('allo_app_language')).toBe('Arabic');
    const next = await mount(file, storage);
    expect(next.state().currentUiLanguage).toBe('Arabic');
    expect(next.state().leveledTextLanguage).toBe('Arabic');
  });

  it('preserves explicit English and Spanish while changing the locale', async () => {
    const h = await mount(file, new Map([['allo_app_language', 'French']]));
    await React.act(async () => h.state().setLeveledTextLanguage('English'));
    await React.act(async () => h.state().setUiLanguage('Arabic'));
    expect(h.state().leveledTextLanguage).toBe('English');
    expect(h.state().outputLanguagePreference).toEqual({ mode: 'language', language: 'English' });
    await React.act(async () => h.state().setLeveledTextLanguage('Spanish'));
    await React.act(async () => h.state().setUiLanguage('French'));
    expect(h.state().leveledTextLanguage).toBe('Spanish');
    await React.act(async () => h.state().setOutputLanguagePreference({ mode: 'app' }));
    expect(h.state().leveledTextLanguage).toBe('French');
  });

  it('keeps all-selected explicit and resolves known aliases without leaking a sentinel', async () => {
    const h = await mount(file);
    await React.act(async () => h.state().setUiLanguage('fr'));
    expect(h.state().currentUiLanguage).toBe('French');
    await React.act(async () => h.state().setLeveledTextLanguage('All Selected Languages'));
    await React.act(async () => h.state().setUiLanguage('Arabic'));
    expect(h.state().outputLanguagePreference).toEqual({ mode: 'all-selected' });
    expect(h.state().leveledTextLanguage).toBe('All Selected Languages');
  });

  it('keeps the live preference usable when storage refuses a write', async () => {
    const h = await mount(file, new Map(), true);
    await React.act(async () => h.state().setUiLanguage('French'));
    expect(h.state().currentUiLanguage).toBe('French');
    expect(h.state().leveledTextLanguage).toBe('French');
    expect(h.applyUiDocumentLanguage).toHaveBeenLastCalledWith('French');
  });
});

const createHost = new Function(readFileSync('host_handlers_source.jsx', 'utf8') + '\nreturn createHostHandlers;')();
function profileHarness(config) {
  const state = { config: null, preferences: null };
  const noop = () => {};
  const deps = new Proxy({
    profiles: [{ id: 'saved', name: 'Saved', config }],
    currentUiLanguage: 'French', nativeLanguageDefaultsVersion: 1,
    normalizeOutputLanguagePreference: (...args) => window.AlloModules.TextPipelineHelpers.normalizeOutputLanguagePreference(...args),
    setOutputLanguagePreference: value => { state.preferences = value; },
    t: key => key, addToast: noop,
  }, { get: (target, key) => key in target ? target[key] : typeof key === 'string' && key.startsWith('set') ? noop : undefined });
  return { state, handlers: createHost(deps), deps };
}
describe('profile compatibility at the real host boundary', () => {
  it.each(['English', 'Spanish'])('restores legacy %s as explicit', language => {
    const h = profileHarness({ leveledTextLanguage: language, studentInterests: [] });
    h.handlers.handleLoadProfile('saved');
    expect(h.state.preferences).toEqual({ mode: 'language', language });
  });
  it('restores native inheritance separately from the old concrete compatibility field', () => {
    const h = profileHarness({ leveledTextLanguage: 'English', outputLanguagePreference: { mode: 'app' }, studentInterests: [] });
    h.handlers.handleLoadProfile('saved');
    expect(h.state.preferences).toEqual({ mode: 'app' });
  });
});
