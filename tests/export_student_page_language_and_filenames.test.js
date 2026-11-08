// Student HTML from the main resource export: the page language tag follows
// the content language (including languages the old map lacked), saved work
// keeps non-Latin names in its file name, and a Class Mailbox send gives up
// after a time limit so the download fallback still runs. Uses the real
// generateFullPackHTML.
import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let pipeline;
const state = {};
const history = [{ type: 'simplified', id: 'resource-1', title: 'Reading', data: 'Text' }];

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Document', getState: () => state,
  });
});

const pageLang = (config = {}) => new JSDOM(pipeline.generateFullPackHTML(history, 'Lesson', false, {}, config)).window.document.documentElement.lang;

describe('page language tag', () => {
  it('tags languages the app offers that the export map used to miss', () => {
    const expected = { Turkish: 'tr', Dutch: 'nl', Gujarati: 'gu', Marathi: 'mr', Malayalam: 'ml', Kannada: 'kn', Esperanto: 'eo', Mandarin: 'zh', Malay: 'ms', Mongolian: 'mn', Spanish: 'es' };
    for (const [name, tag] of Object.entries(expected)) {
      state.leveledTextLanguage = name;
      expect(pageLang(), name).toBe(tag);
    }
  }, 60000);

  it('asks the host for a typed-in language, but never trusts its English default', () => {
    const old = window.getSpeechLangCode;
    try {
      window.getSpeechLangCode = name => (name === 'Kiswahili' ? 'sw' : 'en-US');
      state.leveledTextLanguage = 'Kiswahili';
      expect(pageLang()).toBe('sw');
      state.leveledTextLanguage = 'Elvish';
      expect(pageLang()).toBe('en');
      window.getSpeechLangCode = () => 'not a tag"><script>';
      expect(pageLang()).toBe('en');
    } finally {
      window.getSpeechLangCode = old;
      delete state.leveledTextLanguage;
    }
  });
});

// The file-name helper the generated page defines, run as the page would.
function filePartsFrom(html) {
  const found = [...html.matchAll(/var filePart = (function\(value, fallback\) \{[\s\S]*?\n\s*\});/g)].map(m => m[1]);
  return found.map(src => new Function('return (' + src + ')')());
}

describe('saved-work file names', () => {
  it('keep names and titles in any script on both save paths', () => {
    const plain = pipeline.generateFullPackHTML(history, 'Lesson', false, {}, {});
    const encrypted = pipeline.generateFullPackHTML(history, 'Lesson', false, {}, { classPublicJwk: { kty: 'RSA', n: 'test', e: 'AQAB' } });
    const helpers = [...filePartsFrom(plain), ...filePartsFrom(encrypted)];
    expect(helpers.length).toBeGreaterThanOrEqual(2);
    expect(plain).toContain("var safeNick = filePart(nick, 'student');");
    expect(encrypted).toContain("var safeName = filePart(nickname, 'student');");
    for (const filePart of helpers) {
      expect(filePart('سارة', 'student')).toBe('سارة');
      expect(filePart('李明', 'student')).toBe('李明');
      expect(filePart('Ana López', 'student')).toBe('Ana_López');
      expect(filePart('../../etc', 'student')).not.toMatch(/[./]/);
      expect(filePart('???', 'student')).toBe('student');
      expect(filePart('', 'worksheet')).toBe('worksheet');
    }
    // Two students with different Arabic names no longer collide.
    expect(helpers[0]('سارة', 's')).not.toBe(helpers[0]('مريم', 's'));
  });
});

describe('small page fixes', () => {
  it('escapes a translated contents title in both the label and the heading', () => {
    const local = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: key => (key === 'export.toc' ? 'Contents "A" <b>' : key), isRtlLang: () => false,
      updateExportPreview: () => {}, getDefaultTitle: () => 'Document', getState: () => state,
    });
    const two = [{ type: 'simplified', id: 'a', title: 'One', data: 'Text' }, { type: 'simplified', id: 'b', title: 'Two', data: 'More' }];
    const doc = new JSDOM(local.generateFullPackHTML(two, 'Lesson', false, {}, {})).window.document;
    const nav = doc.querySelector('nav.alloflow-toc');
    expect(nav.getAttribute('aria-label')).toBe('Contents "A" <b>');
    expect(nav.querySelector('h2 b')).toBeNull();
    expect(nav.querySelector('h2').textContent).toContain('Contents "A" <b>');
  });

  it('gives the Memory Aid and Applied Challenge print pages a translated title', () => {
    const local = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, isRtlLang: () => false,
      t: key => ({ 'memory_aid.export_memory_aid_fallback': 'Ayuda de memoria', 'applied_challenge.product_name': 'Resolución aplicada' })[key] || key,
      updateExportPreview: () => {}, getDefaultTitle: () => 'Document', getState: () => state,
    });
    const memory = local.generateFullPackHTML([{ type: 'memory-aid', id: 'm', title: 'M', data: { memoryAidExportPreset: 'study' } }], 'Lesson', false, {}, {});
    expect(new JSDOM(memory).window.document.title).toBe('Ayuda de memoria');
    const applied = local.generateFullPackHTML([{ type: 'applied-challenge', id: 'c', title: 'C', data: { appliedChallengeExportPreset: 'task' } }], 'Lesson', false, {}, {});
    expect(new JSDOM(applied).window.document.title).toBe('Resolución aplicada');
  });
});

describe('Class Mailbox send from the student page', () => {
  it('limits each part so a hung request reaches the download fallback', () => {
    const html = pipeline.generateFullPackHTML(history, 'Lesson', false, {}, { classPublicJwk: { kty: 'RSA', n: 'test', e: 'AQAB' } });
    const send = html.slice(html.indexOf("a: 'putsubmission'"), html.indexOf('mailboxDelivered = true;'));
    expect(send).toContain('new AbortController()');
    expect(send).toContain('partCtl.abort(); }, 25000)');
    expect(send).toContain('signal: partCtl ? partCtl.signal : undefined');
    expect(send).toContain('clearTimeout(partTimer)');
    // The timeout error lands in the existing catch, which runs the download.
    const after = html.slice(html.indexOf('mailboxDelivered = true;'));
    expect(after.indexOf('catch (mailboxErr)')).toBeLessThan(after.indexOf('if (!mailboxDelivered)'));
  });
});
