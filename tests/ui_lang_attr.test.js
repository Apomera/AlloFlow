// <html lang>/<html dir> follow the UI language (WCAG 3.1.1). The host's language helpers are stubs
// (en / ltr) until ModuleScopeExtras registers, and that module sits in the background queue
// (it landed ~50 s after boot in the real shell), so a Somali or Arabic page read as English/LTR.
// applyUiDocumentLanguage now promotes the module for a non-English UI; its footer hook reapplies.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const hostSource = readFileSync(resolve(root, process.env.ANTI_SOURCE || 'AlloFlowANTI.txt'), 'utf8');
const moduleSource = readFileSync(resolve(root, 'module_scope_extras_module.js'), 'utf8');

const START = "let getSpeechLangCode = (n) => 'en-US';";
const END = '// SafetyContentChecker body extracted';
function hostLanguageBlock(source) {
  const from = source.indexOf(START), to = source.indexOf(END, from);
  if (from < 0 || to < from) throw new Error('host language block markers missing');
  return source.slice(from, to);
}
const block = hostLanguageBlock(hostSource);

function installHost(liveRef) {
  return new Function('window', 'document', '_ttsLiveRef',
    block + '\nreturn { applyUiDocumentLanguage };')(window, document, liveRef);
}
// Runs the real module file, footer included (it calls window._upgradeModuleScopeExtras).
function registerModule() {
  window.React = window.React || { Component: class {}, createElement: () => null };
  window.AlloLanguageContext = window.AlloLanguageContext || {};
  new Function(moduleSource)();
}
const html = () => ({ lang: document.documentElement.lang, dir: document.documentElement.dir });

let saved;
beforeEach(() => {
  saved = { mods: window.AlloModules, promote: window.__alloPromoteModule, lu: window._upgradeLanguageUtils, mu: window._upgradeModuleScopeExtras, su: window._upgradeSessionAssets };
  window.AlloModules = {};
  delete window.__alloPromoteModule;
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});
afterEach(() => {
  window.AlloModules = saved.mods;
  window.__alloPromoteModule = saved.promote;
  window._upgradeLanguageUtils = saved.lu;
  window._upgradeModuleScopeExtras = saved.mu;
  window._upgradeSessionAssets = saved.su;
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

// The host's real call order: the provider effect runs while the module is still queued.
function bootWith(language) {
  const liveRef = { current: { currentUiLanguage: language } };
  const host = installHost(liveRef);
  const promoted = [];
  // Same contract as the host's: a registered module is a no-op, a queued one loads now.
  window.__alloPromoteModule = (name) => {
    if (window.AlloModules[name]) return true;
    promoted.push(name);
    if (name === 'ModuleScopeExtras') registerModule();
    return true;
  };
  host.applyUiDocumentLanguage(language);
  return { host, promoted, liveRef };
}

describe('<html lang> and dir from the UI language', () => {
  it.each([
    ['Somali', 'so', 'ltr'],
    ['Spanish (Latin America)', 'es', 'ltr'],
    ['Spanish (Castilian)', 'es', 'ltr'],
    ['Arabic', 'ar', 'rtl'],
    ['Farsi', 'fa', 'rtl'],
    ['Urdu', 'ur', 'rtl'],
    ['Hebrew', 'he', 'rtl'],
    ['Chinese (Traditional)', 'zh', 'ltr'],
    ['Chinese (Simplified)', 'zh', 'ltr'],
  ])('a %s UI asks for the language module before it lands and ends lang=%s dir=%s', (language, lang, dir) => {
    const { promoted } = bootWith(language);
    expect(promoted).toContain('ModuleScopeExtras');
    expect(html()).toEqual({ lang, dir });
  });

  it('English stays en/ltr and does not pull the module out of the background queue', () => {
    const { promoted } = bootWith('English');
    expect(promoted).toEqual([]);
    expect(html()).toEqual({ lang: 'en', dir: 'ltr' });
  });

  it('a later switch back to English after the module is in resets lang and dir', () => {
    const { host, liveRef } = bootWith('Arabic');
    expect(html()).toEqual({ lang: 'ar', dir: 'rtl' });
    liveRef.current.currentUiLanguage = 'English';
    host.applyUiDocumentLanguage('English');
    expect(html()).toEqual({ lang: 'en', dir: 'ltr' });
  });

  it('a throwing or missing promote never breaks the attribute write', () => {
    const host = installHost({ current: { currentUiLanguage: 'Somali' } });
    expect(() => host.applyUiDocumentLanguage('Somali')).not.toThrow();
    window.__alloPromoteModule = () => { throw new Error('boom'); };
    expect(() => host.applyUiDocumentLanguage('Somali')).not.toThrow();
    expect(html()).toEqual({ lang: 'en', dir: 'ltr' });
  });

  it('every pack in lang/manifest.json maps to its own language once the module is in', () => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'lang/manifest.json'), 'utf8'));
    const { host } = bootWith('English');
    registerModule();
    const english = manifest.available.filter((p) => {
      host.applyUiDocumentLanguage(p.display);
      return document.documentElement.lang === 'en';
    }).map((p) => p.display);
    expect(manifest.available.length).toBeGreaterThan(50);
    expect(english).toEqual([]);
  });
});
