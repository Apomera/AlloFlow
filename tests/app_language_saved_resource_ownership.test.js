import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

beforeAll(() => loadAlloModule('text_pipeline_helpers_module.js'));
const files = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
function between(source, first, last) {
  const start = source.indexOf(first), end = source.indexOf(last, start);
  if (start < 0 || end < start) throw new Error('Missing language ownership code: ' + first);
  return source.slice(start, end);
}
function harness(file, current) {
  const source = readFileSync(file, 'utf8');
  const helpers = between(source, 'const getSavedResourceLanguage =', 'export const LanguageProvider =');
  const policy = new Function(helpers + '\nreturn {getSavedResourceLanguage,getSavedCompanionLanguage,getSavedReadingSentenceSegments};')();
  const enumerator = between(source, '  const _enumerateReadAloudResourceSegments =', '  const _encodeReadAloudBridgeAudio =');
  const split = value => String(value || '').trim() ? [String(value).trim()] : [];
  const getSideBySideContent = value => {
    const parts = value.split('--- ENGLISH TRANSLATION ---');
    return parts.length === 2 ? { source: [parts[0].trim()], target: [parts[1].trim()] } : null;
  };
  const enumerate = new Function('generatedContent', 'history', 'leveledTextLanguage', 'currentUiLanguage',
    'getSavedResourceLanguage', 'getSavedCompanionLanguage', 'splitTextToSentences', 'getSideBySideContent',
    '_ensureGlossaryReadAloudEntryIds', enumerator + '\nreturn _enumerateReadAloudResourceSegments;')(
    current, [current], 'Arabic', 'Arabic', policy.getSavedResourceLanguage, policy.getSavedCompanionLanguage,
    split, getSideBySideContent, () => current
  );
  return { ...policy, enumerate, source };
}

describe.each(files)('%s saved language ownership', file => {
  it('enumerates each saved reading pane in its recorded language despite an Arabic app/output setting', () => {
    const item = { id: 'reading', type: 'simplified', config: { language: 'Spanish', translationTarget: 'French' },
      data: 'El agua importa.\n\n--- ENGLISH TRANSLATION ---\n\nL’eau compte.',
      karaokeAudio: { source: 'human-teacher', language: 'Spanish', clips: ['unchanged'] } };
    const original = JSON.stringify(item), h = harness(file, item);
    const result = h.enumerate(item);
    expect(result.map(segment => [segment.text, segment.language])).toEqual([
      ['El agua importa.', 'Spanish'], ['L’eau compte.', 'French']
    ]);
    expect(JSON.stringify(item)).toBe(original);
  });

  it('retains the English interpretation of a metadata-less legacy reading', () => {
    const item = { id: 'legacy', type: 'simplified', data: 'Water flows.' };
    expect(harness(file, item).enumerate(item)[0].language).toBe('English');
  });

  it('carries the saved language of each sentence through immersive Read Along', () => {
    const item = { id: 'paired', type: 'simplified', config: { language: 'French', translationTarget: 'Arabic' },
      data: 'Bonjour.\n\n--- ENGLISH TRANSLATION ---\n\nمرحبا.' };
    const h = harness(file, item);
    const split = text => [text];
    const paired = () => ({ source: ['Bonjour.'], target: ['مرحبا.'] });
    expect(h.getSavedReadingSentenceSegments(item, split, paired)).toEqual([
      { text: 'Bonjour.', language: 'French' }, { text: 'مرحبا.', language: 'Arabic' }
    ]);
    expect(h.source).toContain('sentenceSegments[chunkReaderIdx]?.language || getSavedResourceLanguage(generatedContent)');
  });

  it('uses the argument resource rather than the currently open resource for FAQ narration', () => {
    const current = { id: 'other', type: 'simplified', config: { language: 'Arabic' }, data: 'آخر' };
    const faq = { id: 'faq', type: 'faq', config: { language: 'French' }, data: [{ question: 'Pourquoi ?', answer: 'Voici pourquoi.' }] };
    const result = harness(file, current).enumerate(faq);
    expect(result.map(segment => segment.language)).toEqual(['French', 'French']);
  });

  it('keeps the read-aloud profile tied to the saved resource language', () => {
    const item = { id: 'reading', type: 'simplified', config: { language: 'Spanish' } };
    const h = harness(file, item);
    const block = between(h.source, '  const _karaokeAudioMetadata =', '  // True when a stored NON-HUMAN');
    const metadata = new Function('getSavedResourceLanguage', 'generatedContent', 'selectedVoice', 'voiceSpeed',
      block + '\nreturn _karaokeAudioMetadata;')(h.getSavedResourceLanguage, item, 'Kore', 1);
    expect(metadata('microphone', false).language).toBe('Spanish');
  });
});

describe('review adapter preserves concrete native execution settings', () => {
  it('retains native language context through the actual UI adapter', () => {
    const code = readFileSync('agent_core_ui_adapter_module.js', 'utf8');
    const normalizer = between(code, '  function normalizeContext(context)', '  function createUIAdapter(deps)');
    const normalize = new Function(normalizer + '\nreturn normalizeContext;')();
    const settings = { language: 'All Selected Languages', nativeLanguageDefaultsVersion: 1, appLanguage: 'French',
      currentUiLanguage: 'French', selectedLanguages: ['Spanish'], effectiveLanguageList: ['French', 'Spanish'],
      outputLanguagePreference: { mode: 'all-selected' } };
    const normalized = normalize(settings);
    settings.effectiveLanguageList.push('English');
    expect(normalized.effectiveLanguageList).toEqual(['French', 'Spanish']);
    expect(normalized.nativeLanguageDefaultsVersion).toBe(1);
    expect(normalized.appLanguage).toBe('French');
    expect(normalized.outputLanguagePreference).toEqual({ mode: 'all-selected' });
  });
});
