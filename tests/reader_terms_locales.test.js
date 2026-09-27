import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { helpers, fixtures, translator } from './helpers/reader_locale_harness.js';
import { setupRecoveryReader as setupPreviewLocales, prepareRecoveryCase as preparePreviewLocale, cleanupRecoveryCase as cleanupPreviewLocale, mountReader, act } from './helpers/reader_recovery_locale_harness.js';
const previewFixtures = [...fixtures, { ...fixtures.find(f => f.locale === 'spanish_latin_america'), id: 'reader_esES_vocabulary_contract_v1', locale: 'spanish_castilian' }];
const require = createRequire(import.meta.url);
const { validatePayload, placeholders, lookup, run, parseArgs } = require('../dev-tools/i18n/apply_reader_contract_locales.cjs');
const payload = JSON.parse(readFileSync('translations/reader-terms-locales.json', 'utf8'));
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
beforeAll(setupPreviewLocales, 60000);
beforeEach(preparePreviewLocale);
afterEach(cleanupPreviewLocale);
const readable = value => { expect(value).not.toMatch(/simplified\.[a-z_]+|\{(?:terms|count|limit|details)\}/); };
describe('vocabulary feedback across named reader languages', () => {
  for (const fixture of previewFixtures) {
    it(fixture.id + ': preserves learner terms and localizes the source pane names', () => {
      const t = translator(fixture.locale), vocabulary = helpers.preservedVocabulary;
      const term = fixture.snippet, literalTerm = '$& <x> NaCl';
      const terms = '\u201c' + term + '\u201d (' + t('simplified.adapt_terms_primary') + '); \u201c' + literalTerm + '\u201d (' + t('simplified.adapt_terms_translation') + ')';
      const missing = vocabulary.feedback({ missingTerms: [{ term, pane: 'primary' }, { term: literalTerm, pane: 'translation' }] }, t);
      expect(missing).toBe(t('simplified.adapt_terms_missing', { terms })); readable(missing);
      const absent = vocabulary.feedback({ absentFromSource: [term] }, t);
      expect(absent).toBe(t('simplified.adapt_terms_absent', { terms: '\u201c' + term + '\u201d' })); readable(absent);
    });
    it(fixture.id + ': substitutes distinct-count and size limits in nested validation details', () => {
      const t = translator(fixture.locale), vocabulary = helpers.preservedVocabulary;
      const errors = [{ code: 'too-many-terms', count: 31, limit: 30 }, { code: 'term-too-long', limit: 256 }, { code: 'terms-too-long', count: 4097, limit: 4096 }, { code: 'invalid-term' }];
      const details = [t('simplified.adapt_terms_many', errors[0]), t('simplified.adapt_term_long', errors[1]), t('simplified.adapt_terms_long', errors[2]), t('simplified.adapt_terms_text')].join(' ');
      const result = vocabulary.feedback({ errors }, t);
      expect(result).toBe(t('simplified.adapt_terms_invalid', { details })); readable(result);
      expect(vocabulary.feedback({ reason: 'preview-validation-unavailable' }, t)).toBe(t('simplified.adapt_preview_expired'));
      expect(vocabulary.feedback({}, t)).toBe(t('simplified.adapt_terms_unverified'));
    });
    it(fixture.id + ': exposes a localized input error and blocks an invalid request', async () => {
      const handleComplexityAdjustment = vi.fn(), { host, t } = mountReader(fixture, { handleComplexityAdjustment });
      const input = host.querySelector('[data-adapt-keep-terms]');
      expect(host.querySelector('[data-adaptation-controls]').textContent).toContain(t('simplified.adapt_exact_terms_hint'));
      for (const [value, key] of [['"unclosed', 'adapt_terms_quote'], ['"term"next', 'adapt_terms_separator']]) {
        await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
        expect(input.getAttribute('aria-invalid')).toBe('true');
        const error = input.getAttribute('aria-describedby').split(' ').map(id => document.getElementById(id)).find(node => node?.getAttribute('role') === 'alert');
        expect(error.textContent).toBe(t('simplified.' + key)); readable(error.textContent);
        expect(host.querySelector('[data-apply-complexity]').disabled).toBe(true);
      }
      expect(handleComplexityAdjustment).not.toHaveBeenCalled();
      expect(helpers.preservedVocabulary.parseInput('"uno,dos";สาม,كلمة')).toEqual({ valid: true, terms: ['uno,dos', 'สาม', 'كلمة'] });
    });
  }
  it.each(['missing', 'echoed', 'throws'])('%s translator produces readable English fallback without modifying learner terms', mode => {
    const t = mode === 'missing' ? () => undefined : mode === 'echoed' ? key => key : () => { throw Error('translator unavailable'); };
    const term = 'النهر แม่น้ำ 河流';
    const text = helpers.preservedVocabulary.feedback({ missingTerms: [{ term, pane: 'primary' }] }, t);
    expect(text).toBe('Current text kept. The proposed version is missing: \u201c' + term + '\u201d (primary reading). Retry or edit the preserved-term list.'); readable(text);
  });
});
describe('frozen vocabulary locale payload', () => {
  it('checks all seventeen keys without replacing existing Spanish values', () => {
    expect(validatePayload(payload, english, 17)).toHaveLength(17);
    expect(run(false, 'terms')).toMatchObject({ keys: 17, locales: 5, changedFiles: 0 });
    expect(parseArgs(['--check', '--batch=terms'])).toEqual({ apply: false, batch: 'terms' });
    for (const locale of ['spanish_latin_america', 'spanish_castilian']) for (const [key, value] of Object.entries(payload.locales[locale])) expect(lookup(JSON.parse(readFileSync('lang/' + locale + '.js', 'utf8')), key)).toBe(value);
  });
  it('rejects changed validation copy and broken nested placeholders', () => {
    const changed = structuredClone(english); changed.simplified.adapt_exact_terms_hint = 'All occurrences remain.';
    expect(() => validatePayload(payload, changed, 17)).toThrow(/English copy changed/);
    const invalid = structuredClone(payload); invalid.locales.arabic['simplified.adapt_terms_invalid'] = 'تعذر التحقق {detail}';
    expect(() => validatePayload(invalid, english, 17)).toThrow(/Placeholder mismatch/);
  });
  for (const [locale, values] of Object.entries(payload.locales)) it(locale + ': mirrors every term label and placeholder', () => {
    for (const prefix of ['lang', 'desktop/web-app/public/lang']) {
      const pack = JSON.parse(readFileSync(prefix + '/' + locale + '.js', 'utf8'));
      for (const [key, value] of Object.entries(values)) { expect(lookup(pack, key)).toBe(value); expect(placeholders(value)).toEqual(placeholders(payload.english[key])); }
    }
  });
});
