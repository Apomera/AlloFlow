// The exported student page's own text (who-is-working dialog, Save/Submit,
// Class Mailbox messages, skip link, accessibility note) in the content
// language: export_runtime_copy_module.js adds 45 languages to the inline
// en/es/fr/pt/ar/zh catalog in doc_pipeline_source.jsx. Uses the real
// generateFullPackHTML.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const moduleSource = fs.readFileSync('export_runtime_copy_module.js', 'utf8');
const pipelineSource = fs.readFileSync('doc_pipeline_source.jsx', 'utf8');
const state = {};
let pipeline;
let loadPlugin;

function inlineEnglish() {
  const a = pipelineSource.indexOf('const _runtimeCopyCatalog = ') + 'const _runtimeCopyCatalog = '.length;
  const b = pipelineSource.indexOf('\n      const _runtimeLanguage', a);
  return new Function('return ' + pipelineSource.slice(a, b).trim().replace(/;$/, ''))().en;
}
function catalogFromModule() {
  const win = {};
  new Function('window', moduleSource)(win);
  return win.AlloModules.ExportRuntimeCopy.catalog;
}
const copyFor = (language) => {
  state.leveledTextLanguage = language;
  try {
    const doc = new JSDOM(pipeline.generateFullPackHTML([{ type: 'simplified', id: 'r1', title: 'Reading', data: 'Text' }], 'Lesson', false, {}, {})).window.document;
    return { copy: JSON.parse(doc.getElementById('alloflow-runtime-copy').textContent), skip: doc.querySelector('a[href="#main-export-content"]').textContent, lang: doc.documentElement.lang };
  } finally { delete state.leveledTextLanguage; }
};

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadPlugin = vi.fn(async () => true);
  window.__alloLoadPlugin = loadPlugin;
  delete window.AlloModules?.ExportRuntimeCopy;
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Document', getState: () => state,
  });
});

describe('the language file', () => {
  it('has every key of the English catalog, as plain text with the same placeholders, for 45 languages', () => {
    const en = inlineEnglish();
    const catalog = catalogFromModule();
    expect(Object.keys(catalog)).toHaveLength(45);
    for (const [tag, entry] of Object.entries(catalog)) {
      expect(Object.keys(entry).sort(), tag).toEqual(Object.keys(en).sort());
      for (const key of Object.keys(en)) {
        expect(entry[key], tag + '.' + key).not.toMatch(/[<>]/);
        const ph = s => (s.match(/\{[a-z]+\}/g) || []).sort().join();
        expect(ph(entry[key]), tag + '.' + key).toBe(ph(en[key]));
      }
    }
    // Languages the app offers in the page language map are covered, except the
    // few left in English on purpose (no reliable translation yet).
    for (const tag of ['so', 'vi', 'ht', 'sw', 'ru', 'uk', 'fa', 'fa-AF', 'ps', 'zh-TW', 'hmn', 'am', 'ti', 'my', 'km', 'ne']) expect(catalog[tag], tag).toBeTruthy();
  });
});

describe('the exported page', () => {
  it('starts loading the language file when the export pipeline starts', () => {
    expect(loadPlugin).toHaveBeenCalledWith('export_runtime_copy_module.js');
  });

  it('falls back to English until the language file has loaded', () => {
    const { copy } = copyFor('Somali');
    expect(copy.saveMyWork).toBe('Save my work');
  });

  it('uses the content language once it has loaded, choosing the exact variant first', () => {
    new Function('window', moduleSource)(window);
    const catalog = window.AlloModules.ExportRuntimeCopy.catalog;
    const so = copyFor('Somali');
    expect(so.lang).toBe('so');
    expect(so.copy.saveMyWork).toBe(catalog.so.saveMyWork);
    expect(so.copy.workspaceTitle).toBe(catalog.so.workspaceTitle);
    expect(so.skip).toBe(catalog.so.skipToContent);
    // Traditional Chinese gets its own text, not the inline Simplified catalog.
    expect(copyFor('Chinese (Traditional)').copy.saveMyWork).toBe(catalog['zh-TW'].saveMyWork);
    expect(copyFor('Dari').copy.saveMyWork).toBe(catalog['fa-AF'].saveMyWork);
    // The hand-written languages keep their own text.
    expect(copyFor('Spanish').copy.saveMyWork).toBe('Guardar mi trabajo');
    // Languages without a translation stay English.
    expect(copyFor('Acholi').copy.saveMyWork).toBe('Save my work');
  });

  it('ignores a loaded entry that carries markup', () => {
    const real = window.AlloModules.ExportRuntimeCopy;
    try {
      window.AlloModules.ExportRuntimeCopy = { catalog: { so: { ...real.catalog.so, saveMyWork: '<img src=x onerror=alert(1)>' } } };
      const { copy } = copyFor('Somali');
      expect(copy.saveMyWork).toBe('Save my work');
      expect(copy.workspaceTitle).toBe(real.catalog.so.workspaceTitle);
    } finally {
      window.AlloModules.ExportRuntimeCopy = real;
    }
  });
});
