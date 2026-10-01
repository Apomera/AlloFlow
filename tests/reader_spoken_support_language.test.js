// A word support is introduced in the reading's own language, whatever the
// interface language is, and the reader's label table matches every pack.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, api, pure, phase, root, host, props;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const file of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js']) loadAlloModule(file);
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; vi.restoreAllMocks(); });

// Read one key straight from a pack without parsing the whole 7 MB file.
function packValue(slug, key) {
  const text = readFileSync(resolve('lang', slug + '.js'), 'utf8');
  const at = text.indexOf('\n  "simplified": {');
  const match = at >= 0 && text.slice(at).match(new RegExp('\\n    "' + key + '": ("(?:[^"\\\\]|\\\\.)*")'));
  return match ? JSON.parse(match[1]) : undefined;
}

function mountReading(language, text, word, help) {
  // The app passes a source snapshot, which carries the reading's language.
  const original = api.createSupportedReading(api.createSourceSnapshot(text, { language }), { id: 'original-' + language, sourceFamilyId: 'lang-' + language, config: { language } });
  expect(original.config.language).toBe(language);
  const start = text.indexOf(word);
  original.readingSupports = api.upsertReadingSupport(original, undefined, { id: 'w', start, end: start + word.length, quote: word, text: help, origin: 'generated', kind: 'gloss' });
  const noop = () => {};
  props = { ComplexityGauge: () => null, t: key => key, generatedContent: original, history: [original], isTeacherMode: false, isZenMode: false, isCompareMode: false,
    isEditingLeveledText: false, interactionMode: 'read', readingLearnerKey: 'student', leveledTextLanguage: 'English', selectedVoice: 'Kore', voiceSpeed: 1, textEditorRef: React.createRef(),
    splitTextToSentences: value => pure.splitTextToSentences(value, {}), getSideBySideContent: () => null, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
    renderFormattedText: value => value, formatInteractiveText: (value, cloze) => phase.formatInteractiveText(value, cloze, false, { highlightGlossaryTerms: v => v, latestGlossary: [], MathSymbol: () => null }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: value => value, latestGlossary: [], setFocusedParagraphIndex: noop,
    onReadOriginal: vi.fn(), setInteractionMode: vi.fn(), setReadingTheme: vi.fn(), handleSpeak: vi.fn(), stopPlayback: vi.fn(), closeDefinition: noop, closePhonics: noop, closeRevision: noop, ...extraProps };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  act(() => host.querySelector('[data-reader-listen-supports]').click());
  return props.handleSpeak.mock.calls.at(-1)[0];
}
let extraProps = {};

describe('spoken word-support label', () => {
  it('uses the reading language even when the interface is English', () => {
    const spoken = mountReading('Spanish', 'El caballero llegó al castillo. Todos lo saludaron.', 'caballero', 'un hombre noble.');
    expect(spoken).toContain('Ayuda con la palabra «caballero»: un hombre noble.');
    expect(spoken).not.toContain('Word support');
  });

  it('introduces a French support in French, and an English support in English', () => {
    expect(mountReading('French', 'Le chevalier arrive au château.', 'chevalier', 'un noble à cheval.')).toContain('Aide pour le mot « chevalier » : un noble à cheval.');
    act(() => root.unmount()); host.remove(); root = null;
    expect(mountReading('English', 'The knight rode on.', 'knight', 'a noble soldier.')).toContain('Word support for "knight": a noble soldier.');
  });

  it('falls back to the interface string for a language without a label', () => {
    extraProps = { t: key => (key === 'simplified.original_support_spoken' ? 'Aide « {word} » : {support}' : key) };
    try {
      expect(mountReading('Klingon', 'The ship arrived.', 'ship', 'a vessel.')).toContain('Aide « ship » : a vessel.');
    } finally { extraProps = {}; }
  });

  it('knows Romanian and Portuguese (Portugal)', () => {
    expect(View.languageTag('Romanian')).toBe('ro');
    expect(View.languageTag('Portuguese (Portugal)')).toBe('pt-PT');
    expect(View.spokenSupportTemplate('Romanian')).toContain('{word}');
    expect(View.spokenSupportTemplate('Portuguese (Portugal)')).not.toBe(View.spokenSupportTemplate('Portuguese (Brazil)'));
  });

  it('matches every language pack, looked up by the pack language name', () => {
    const manifest = JSON.parse(readFileSync(resolve('lang/manifest.json'), 'utf8'));
    const english = JSON.parse(readFileSync(resolve('ui_strings.js'), 'utf8')).simplified.original_support_spoken;
    expect(View.spokenSupportTemplate('English')).toBe(english);
    const mismatches = manifest.available.map(entry => [entry.slug, View.spokenSupportTemplate(entry.display), packValue(entry.slug, 'original_support_spoken')])
      .filter(([, table, pack]) => !table || table !== pack);
    expect(mismatches).toEqual([]);
    expect(manifest.available).toHaveLength(63);
  });

  it('keeps every placeholder in every label', () => {
    for (const label of Object.values(View.spokenSupportLabels)) {
      expect(label).toContain('{word}');
      expect(label).toContain('{support}');
    }
  });
});
