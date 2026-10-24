// The MCP driver hands the pipeline a host isRtlLang. It used to be `() => false`, so the pipeline's
// deterministic dir="rtl" step never fired in the MCP lane and an Arabic letter came back laid out
// left to right unless the model happened to add dir itself (keyless run, 2026-10-19). The driver
// now carries a copy of the app's isRtlLang (module_scope_extras_module.js); this keeps them in step
// and checks both page setups use it.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const { isRtlLanguage } = require('../desktop/mcp/remediation_headless_driver.cjs');
// The app's own function, sliced from the shipped module (loading the whole module needs React).
const appSrc = sliceBetween(readFileSync('module_scope_extras_module.js', 'utf8'), 'const isRtlLang = (languageNameOrCode) => {', 'const getContentDirection',
  { file: 'module_scope_extras_module.js' });
const appIsRtl = new Function(appSrc + '\nreturn isRtlLang;')();

const SAMPLES = ['ar', 'ar-SA', 'he', 'iw', 'fa', 'fa-IR', 'prs', 'ur', 'ps', 'ku', 'ckb', 'sd', 'ug', 'yi', 'dv', 'syr', 'nqo', 'arc',
  'Arabic', 'Hebrew', 'Persian (Farsi)', 'Dari', 'Urdu', 'Kurdish (Sorani)', 'Pashto', 'Yiddish', 'Uyghur', 'Dhivehi', 'Syriac',
  'en', 'en-US', 'es', 'English', 'Spanish', 'French', 'zh-CN', 'Chinese', 'ja', 'ko', 'hi', 'Somali', 'so', 'pt', 'Portuguese',
  'Arabic-script Persian', 'ar_EG', '  AR  ', '', null, undefined, 'arabica', 'sdk', 'heb'];

describe('MCP driver isRtlLanguage', () => {
  it('agrees with the app isRtlLang on every sample', () => {
    const disagree = SAMPLES.filter((s) => isRtlLanguage(s) !== appIsRtl(s));
    expect(disagree).toEqual([]);
  });
  it('says RTL for the languages the pipeline lays out right to left, and not for LTR ones', () => {
    for (const s of ['ar', 'he', 'fa', 'ur', 'Arabic', 'Hebrew']) expect(isRtlLanguage(s), s).toBe(true);
    for (const s of ['en', 'es', 'so', 'English', 'Somali', '']) expect(isRtlLanguage(s), s).toBe(false);
  });
  it('both page setups pass it to createDocPipeline instead of a stub', () => {
    const src = readFileSync('desktop/mcp/remediation_headless_driver.cjs', 'utf8');
    expect(src.includes('isRtlLang: () => false')).toBe(false);
    expect(src.split("isRtlLang: (0, eval)('(' + cfg.rtlFn + ')')").length - 1).toBe(1);
    expect(src.split("isRtlLang: (0, eval)('(' + rtlFn + ')')").length - 1).toBe(1);
    expect(src.includes('rtlFn: isRtlLanguage.toString(),')).toBe(true);
    expect(src.includes('}, isRtlLanguage.toString());')).toBe(true);
    // the serialized copy is self-contained (it runs inside the page)
    const pageCopy = (0, eval)('(' + isRtlLanguage.toString() + ')');
    expect(pageCopy('ar')).toBe(true);
    expect(pageCopy('en')).toBe(false);
  });
});
