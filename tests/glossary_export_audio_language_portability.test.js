import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let implementations;
const read = file => readFileSync(file, 'utf8');
const bytes = Buffer.alloc(48);
bytes.write('RIFF'); bytes.writeUInt32LE(40, 4); bytes.write('WAVE', 8);
bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
bytes.write('data', 36); bytes.writeUInt32LE(4, 40); bytes.writeInt16LE(50, 44); bytes.writeInt16LE(-50, 46);
const clip = bytes.toString('base64');
const entry = translation => ({ entryId: 'leaf', term: 'Leaf', def: 'A plant part.', translations: { Spanish: translation } });
const resourceFor = value => ({ id: 'glossary', type: 'glossary', language: 'English', data: [value] });
beforeAll(() => {
  new Function(read('karaoke_audio_store_module.js'))();
  implementations = {};
  for (const [name, service, exporter] of [['source', 'read_aloud_audio_service_source.jsx', 'export_source.jsx'], ['runtime', 'read_aloud_audio_service_module.js', 'export_module.js']]) {
    delete window.AlloModules.ReadAloudAudioServiceModule; delete window.AlloModules.Export;
    new Function(read(service))(); new Function(read(exporter))();
    implementations[name] = { factory: window.AlloModules.createExport, bridge: window.AlloModules.createReadAloudLegacyBridge,
      normalize: window.AlloModules.normalizeGlossaryTranslation, enumerate: window.AlloModules.enumerateGlossaryReadAloudSegments };
  }
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:portable-audio');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  document.querySelectorAll('.agx-overlay').forEach(node => node.remove());
  delete window.AlloModules.ModuleScopeExtras;
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
function exported(implementation, resource, mode = 'standard', shared = true) {
  if (shared) window.AlloModules.normalizeGlossaryTranslation = implementation.normalize;
  else delete window.AlloModules.normalizeGlossaryTranslation;
  const files = [], addToast = vi.fn();
  vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
  const api = implementation.factory({ liveRef: { current: { generatedContent: resource, t: key => key, addToast } }, escapeXml: String });
  api.handleExportFlashcards(mode, { includeAudio: true, useReadingSettings: false });
  return { files, addToast, doc: new DOMParser().parseFromString(files.at(-1).text, 'text/html') };
}
function recording(resource, field, language, text, profile = {}, source = 'ai') {
  const suffix = field === 'translation' ? 'translation/spanish' : field;
  resource.karaokeAudio = { version: 4, entries: { clip: { audio: clip, mime: 'audio/wav', source,
    identity: { identityVersion: 4, adapterId: 'alloflow.glossary.read-aloud', adapterVersion: 1, scopeId: 'main', segmentId: 'entry/leaf/' + suffix, spokenText: text },
    synthesisProfile: { ...profile, ...(language ? { language } : {}) } } } };
}

describe.each(['source', 'runtime'])('Glossary audio/language portability: %s', name => {
  const implementation = () => implementations[name];
  it.each(['term', 'definition'])('excludes a stale-language %s recording while preserving the original bytes', field => {
    const resource = resourceFor({ ...entry('Hoja'), term: 'pain', termLanguage: 'French', definitionLanguage: 'French', def: 'Bread.' });
    recording(resource, field, 'English', field === 'term' ? 'pain' : 'pain: Bread.', { voice: 'Kore', provider: 'gemini', synthesisRate: 1, voiceResolverVersion: 2 });
    const saved = JSON.stringify(resource.karaokeAudio);
    const result = exported(implementation(), resource);
    expect(result.doc.querySelector('[data-card-audio]')).toBeNull();
    expect(JSON.stringify(resource.karaokeAudio)).toBe(saved);
    expect(result.addToast).toHaveBeenCalledWith('1 recording was left out because its saved language no longer matches the card. Refresh the audio to include it.', 'info');
  });
  it('excludes mismatched translation recording language without discarding its saved data', () => {
    const resource = resourceFor(entry('Hoja: Parte de una planta.'));
    recording(resource, 'translation', 'French', 'Hoja: Parte de una planta.');
    const saved = JSON.stringify(resource.karaokeAudio);
    const result = exported(implementation(), resource, 'language');
    expect(result.doc.querySelector('.back [data-card-audio]')).toBeNull();
    expect(JSON.stringify(resource.karaokeAudio)).toBe(saved);
  });
  it.each([['French', 'fr'], ['English', 'en'], ['English', 'English'], ['en-US', 'en-US'], ['French (Canadian)', 'fr-CA'], ['ar-Latn', 'ar-Latn']])('accepts compatible language name/tag recordings: %s / %s', (stored, current) => {
    const resource = resourceFor({ ...entry('Hoja'), termLanguage: current });
    recording(resource, 'term', stored, 'Leaf');
    const result = exported(implementation(), resource);
    expect(result.doc.querySelector('.front [data-card-audio]')).toBeTruthy();
    expect(result.addToast).not.toHaveBeenCalled();
  });
  it.each([['fr-FR', 'fr-CA'], ['az-Latn', 'az-Arab'], ['English', 'en-US'], ['ar', 'ar-Latn'], ['fr-CA', 'fr'], ['az', 'az-Arab']])('keeps explicit dialect/script mismatches out: %s / %s', (stored, current) => {
    const resource = resourceFor({ ...entry('Hoja'), termLanguage: current });
    recording(resource, 'term', stored, 'Leaf');
    expect(exported(implementation(), resource).doc.querySelector('.front [data-card-audio]')).toBeNull();
  });
  it('preserves the legacy exact-text lane when the saved clip has no language profile', () => {
    const resource = resourceFor({ ...entry('Hoja'), termLanguage: 'French' });
    recording(resource, 'term', '', 'Leaf');
    delete resource.karaokeAudio.entries.clip.synthesisProfile;
    expect(exported(implementation(), resource).doc.querySelector('.front [data-card-audio]')).toBeTruthy();
  });
  it.each([[' UNLISTED language ', true], ['Another unlisted language', false]])('uses literal language identity for unknown names: %s', (stored, included) => {
    const resource = resourceFor({ ...entry('Hoja'), termLanguage: 'Unlisted language' });
    recording(resource, 'term', stored, 'Leaf');
    expect(!!exported(implementation(), resource).doc.querySelector('.front [data-card-audio]')).toBe(included);
  });
  it('retains human recordings in the resource but does not export a known conflicting language', () => {
    const resource = resourceFor({ ...entry('Hoja'), termLanguage: 'French' });
    recording(resource, 'term', 'English', 'Leaf', {}, 'human-teacher');
    const saved = JSON.stringify(resource.karaokeAudio);
    expect(exported(implementation(), resource).doc.querySelector('.front [data-card-audio]')).toBeNull();
    expect(JSON.stringify(resource.karaokeAudio)).toBe(saved);
  });

  it.each([
    'Hoja: Parte de una planta.',
    { term: 'Hoja', def: 'Parte de una planta.' },
    { word: 'Hoja', definition: 'Parte de una planta.' },
    { text: '', term: 'Hoja', def: 'Parte de una planta.' },
    { text: { invalid: true }, translation: [], word: 'Hoja', meaning: 'Parte de una planta.' },
  ])('prepares and exports the same usable translation text: %j', async translation => {
    const active = implementation(), resource = resourceFor(entry(translation));
    const store = window.AlloModules.KaraokeAudioStore.createStore();
    const synthesize = vi.fn(async () => ({ b64: clip, mime: 'audio/wav', url: 'blob:synthesized' }));
    const bridge = active.bridge({ getResource: () => resource, getStore: () => store,
      getProfile: () => ({ voice: 'Kore', language: 'English', provider: 'gemini', synthesisRate: 1, voiceResolverVersion: 2 }),
      synthesize, encode: async audio => audio, persist: async () => { resource.karaokeAudio = store.serialize(); } });
    const result = await bridge.prepare(undefined, () => {}, {});
    expect(result).toMatchObject({ ok: true, remaining: 0, generated: 3 });
    expect(synthesize.mock.calls.map(([request]) => request.text)).toContain('Hoja: Parte de una planta.');
    resource.karaokeAudio = store.serialize();
    const withShared = exported(active, resource, 'language');
    expect(withShared.doc.querySelector('.back [data-card-audio]')).toBeTruthy();
    expect(withShared.doc.querySelector('.back .primary-text').textContent).toBe('Hoja');
    const fallback = exported(active, resource, 'language', false);
    expect(fallback.doc.querySelector('.back [data-card-audio]')).toBeTruthy();
    expect(fallback.doc.querySelector('.back .def-text').textContent).toBe('Parte de una planta.');
    expect(JSON.stringify(active.enumerate(resource))).not.toContain('[object Object]');
  });
  it('does not invent speech for malformed-only translation leaves', () => {
    const active = implementation(), resource = resourceFor(entry({ text: {}, term: [], def: 23 }));
    expect(active.normalize(resource.data[0].translations.Spanish)).toMatchObject({ spoken: '', usable: false });
    expect(active.enumerate(resource).filter(segment => segment.field === 'translation')).toHaveLength(0);
  });

  it.each([
    ['az-Arab', 'az-Arab', 'rtl'], ['ar-Latn', 'ar-Latn', 'ltr'], ['zh-Hant', 'zh-Hant', 'ltr'],
    ['es-MX', 'es-MX', 'ltr'], ['French (Canadian)', 'fr-CA', 'ltr'], ['pa_Arab', 'pa-Arab', 'rtl'],
    ['ar-u-nu-latn', 'ar-u-nu-latn', 'rtl'],
  ])('retains canonical full language/script metadata for %s', (language, tag, dir) => {
    // The host helper intentionally loses subtags: explicit saved metadata wins.
    window.AlloModules.ModuleScopeExtras = { getSpeechLangCode: input => input.split('-')[0], isRtlLang: () => false };
    const resource = resourceFor({ ...entry('Hoja'), termLanguage: language, definitionLanguage: 'fr-CA', translations: { 'ar-Latn': 'kitab' } });
    const result = exported(implementation(), resource, 'language');
    const term = result.doc.querySelector('.front .primary-text');
    expect(term.lang).toBe(tag); expect(term.dir).toBe(dir);
    expect(result.doc.querySelector('.front .def-text').lang).toBe('fr-CA');
    expect(result.doc.querySelector('.back .def-text').lang).toBe('ar-Latn');
    expect(result.doc.querySelector('.back .def-text').dir).toBe('ltr');
  });
  it('uses the resource source language when entry metadata is absent, and leaves unknown names automatic', () => {
    const resource = { ...resourceFor(entry('Hoja')), language: 'French (Canadian)' };
    expect(exported(implementation(), resource).doc.querySelector('.front .primary-text').lang).toBe('fr-CA');
    window.AlloModules.ModuleScopeExtras = { getSpeechLangCode: () => 'en-US' };
    resource.data[0].termLanguage = 'Unlisted language';
    const term = exported(implementation(), resource).doc.querySelector('.front .primary-text');
    expect(term.hasAttribute('lang')).toBe(false); expect(term.dir).toBe('auto');
  });
});
