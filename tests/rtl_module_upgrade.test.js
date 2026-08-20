import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const canonicalSource = readFileSync(resolve(root, 'AlloFlowANTI.txt'), 'utf8');
const desktopSource = readFileSync(resolve(root, 'desktop/web-app/src/App.jsx'), 'utf8');
const moduleSource = readFileSync(resolve(root, 'module_scope_extras_module.js'), 'utf8');

const HOST_BLOCK_START = "let getSpeechLangCode = (n) => 'en-US';";
const HOST_BLOCK_END = '// SafetyContentChecker body extracted';

function extractHostLanguageBlock(source) {
  const start = source.indexOf(HOST_BLOCK_START);
  const end = source.indexOf(HOST_BLOCK_END, start);
  if (start === -1 || end === -1) throw new Error('Host language upgrade markers missing');
  return source.slice(start, end);
}

function extractModulePostLoadHook(source) {
  const start = source.indexOf("if (typeof window._upgradeModuleScopeExtras === 'function')");
  const end = source.indexOf("\nconsole.log('[CDN] ModuleScopeExtrasModule", start);
  if (start === -1 || end === -1) throw new Error('ModuleScopeExtras post-load hook missing');
  return source.slice(start, end);
}

const canonicalHostBlock = extractHostLanguageBlock(canonicalSource);
const modulePostLoadHook = extractModulePostLoadHook(moduleSource);

function installHostLanguageUpgrade(liveRef) {
  // This is the browser-safe, non-JSX block used by both host entry points.
  return new Function(
    'window',
    'document',
    '_ttsLiveRef',
    `${canonicalHostBlock}\nreturn {\n` +
      '  isRtlLang: (value) => isRtlLang(value),\n' +
      '  getSpeechLangCode: (value) => getSpeechLangCode(value)\n' +
      '};'
  )(window, document, liveRef);
}

let previousAlloModules;
let previousLanguageUpgrade;
let previousModuleUpgrade;
let previousSessionUpgrade;

beforeEach(() => {
  previousAlloModules = window.AlloModules;
  previousLanguageUpgrade = window._upgradeLanguageUtils;
  previousModuleUpgrade = window._upgradeModuleScopeExtras;
  previousSessionUpgrade = window._upgradeSessionAssets;
  window.AlloModules = {};
  delete window._upgradeLanguageUtils;
  delete window._upgradeModuleScopeExtras;
  delete window._upgradeSessionAssets;
  document.documentElement.dir = 'ltr';
  document.documentElement.lang = 'en';
});

afterEach(() => {
  vi.useRealTimers();
  window.AlloModules = previousAlloModules;
  if (previousLanguageUpgrade === undefined) delete window._upgradeLanguageUtils;
  else window._upgradeLanguageUtils = previousLanguageUpgrade;
  if (previousModuleUpgrade === undefined) delete window._upgradeModuleScopeExtras;
  else window._upgradeModuleScopeExtras = previousModuleUpgrade;
  if (previousSessionUpgrade === undefined) delete window._upgradeSessionAssets;
  else window._upgradeSessionAssets = previousSessionUpgrade;
});

describe('late ModuleScopeExtras RTL upgrade', () => {
  it('reapplies direction and language when the module registers after the legacy five-second poll', () => {
    vi.useFakeTimers();
    const liveRef = { current: { currentUiLanguage: 'Arabic' } };
    const host = installHostLanguageUpgrade(liveRef);

    expect(window._upgradeModuleScopeExtras()).toBe(false);
    expect(host.isRtlLang('Arabic')).toBe(false);

    vi.advanceTimersByTime(6000);
    window.AlloModules.ModuleScopeExtras = {
      getSpeechLangCode: (name) => name === 'Arabic' ? 'ar-SA' : 'en-US',
      languageToTTSCode: (name) => name === 'Arabic' ? 'ar' : 'en',
      isRtlLang: (name) => name === 'Arabic',
      getContentDirection: (name) => name === 'Arabic' ? 'rtl' : 'ltr'
    };

    // Execute the actual footer contract used by module_scope_extras_module.js.
    new Function('window', modulePostLoadHook)(window);

    expect(host.isRtlLang('Arabic')).toBe(true);
    expect(host.getSpeechLangCode('Arabic')).toBe('ar-SA');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');

    liveRef.current.currentUiLanguage = 'English';
    expect(window._upgradeModuleScopeExtras()).toBe(true);
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('keeps the canonical and desktop host upgrade blocks in sync', () => {
    expect(extractHostLanguageBlock(desktopSource)).toBe(canonicalHostBlock);
  });
});
