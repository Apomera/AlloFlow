import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { validatePayload, mergePack, placeholders, lookup } = require('../dev-tools/i18n/apply_reader_contract_locales.cjs');
const payload = JSON.parse(readFileSync('translations/reader-contract-locales.json', 'utf8'));
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
describe('frozen reader locale contract', () => {
  it('has 66 stable English strings and five complete locale packs', () => { expect(validatePayload(payload, english)).toHaveLength(66); });
  it('refuses translations after English copy changes', () => {
    const changed = structuredClone(english); changed.simplified.review_title = 'Changed copy';
    expect(() => validatePayload(payload, changed)).toThrow(/English copy changed/);
  });
  it('rejects broken placeholders and raw keys', () => {
    const changed = structuredClone(payload); changed.locales.arabic['simplified.place_continue'] = 'متابعة {wrong}';
    expect(() => validatePayload(changed, english)).toThrow(/Placeholder mismatch/);
    changed.locales.arabic['simplified.place_continue'] = 'simplified.place_continue';
    expect(() => validatePayload(changed, english)).toThrow(/Missing translation/);
  });
  it('preserves unrelated keys and rejects competing translations', () => {
    const untouched = { common: { custom: 'keep' }, simplified: { future_key: 'keep me' } };
    const merged = mergePack(untouched, payload.locales.arabic);
    expect(merged.common).toBe(untouched.common); expect(merged.simplified.future_key).toBe('keep me');
    expect(untouched.simplified).toEqual({ future_key: 'keep me' });
    expect(() => mergePack({ simplified: { review_title: 'another owner' } }, payload.locales.arabic)).toThrow(/Existing translation differs/);
  });
  for (const [locale, values] of Object.entries(payload.locales)) {
    it(locale + ': source and public mirror contain the scoped translations with identical placeholders', () => {
      for (const prefix of ['lang', 'desktop/web-app/public/lang']) {
        const pack = JSON.parse(readFileSync(prefix + '/' + locale + '.js', 'utf8'));
        for (const [key, value] of Object.entries(values)) {
          expect(lookup(pack, key), prefix + '/' + locale + ': ' + key).toBe(value);
          expect(placeholders(value)).toEqual(placeholders(payload.english[key]));
        }
      }
    });
  }
});
