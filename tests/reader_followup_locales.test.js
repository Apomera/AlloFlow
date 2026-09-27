import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { setupRecoveryReader, prepareRecoveryCase, cleanupRecoveryCase, recoveryFixtures, mountReader, click, openRecoveryFailure, storageKey } from './helpers/reader_recovery_locale_harness.js';
const require = createRequire(import.meta.url);
const { validatePayload, run, parseArgs, placeholders, lookup } = require('../dev-tools/i18n/apply_reader_contract_locales.cjs');
const payload = JSON.parse(readFileSync('translations/reader-followup-locales.json', 'utf8'));
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
beforeAll(setupRecoveryReader); beforeEach(prepareRecoveryCase); afterEach(cleanupRecoveryCase);
const fixtures = recoveryFixtures.filter(f => Object.hasOwn(payload.locales, f.locale));
fixtures.push({ ...fixtures.find(f => f.locale === 'spanish_latin_america'), id: 'castilian-followup', locale: 'spanish_castilian' });
const readable = text => expect(text).not.toMatch(/simplified\.[a-z_]+|\{(?:number|count|ready|total|stale|missing|unverified|corrupt)\}/);

describe('finalized reader follow-up translations', () => {
  it('guards exact current English, all five locale pairs and all frozen batches', () => {
    expect(validatePayload(payload, english, 70)).toHaveLength(70);
    expect(run(false, 'all')).toMatchObject({ keys: 187, locales: 5, changedFiles: 0 });
    expect(parseArgs(['--check', '--batch=followup'])).toEqual({ apply: false, batch: 'followup' });
    for (const [locale, values] of Object.entries(payload.locales)) {
      for (const prefix of ['lang', 'desktop/web-app/public/lang']) {
        const pack = JSON.parse(readFileSync(prefix + '/' + locale + '.js', 'utf8'));
        for (const [key, value] of Object.entries(values)) {
          expect(lookup(pack, key)).toBe(value);
          expect(placeholders(value)).toEqual(placeholders(payload.english[key]));
        }
      }
      expect(values['simplified.offline_audio_preparing_announcement']).toContain(values['simplified.save_audio_stop']);
      expect(values['simplified.place_copy_restored']).toContain(values['simplified.place_copy_save']);
    }
    const changed = structuredClone(english); changed.simplified.layout_preview_note = 'Different preview behavior.';
    expect(() => validatePayload(payload, changed, 70)).toThrow(/English copy changed/);
  });
  for (const fixture of fixtures) {
    it(fixture.locale + ': preview refresh uses final copy without changing durable state', async () => {
      const { host, t } = mountReader(fixture), before = localStorage.getItem(storageKey);
      await click(host.querySelector('[data-student-preview-open]'));
      const preview = host.querySelector('[data-student-preview]');
      expect(preview.textContent).toContain(t('simplified.layout_preview_note'));
      const refresh = preview.querySelector('[data-student-preview-refresh]');
      expect(refresh.textContent).toBe(t('simplified.layout_preview_refresh'));
      await click(refresh);
      expect(preview.textContent).toContain(t('simplified.layout_preview_refreshed'));
      expect(localStorage.getItem(storageKey)).toBe(before);
      expect(preview.textContent).not.toContain(english.simplified.layout_preview_note);
    });
    it(fixture.locale + ': lookup failures and retry names are localized independently', async () => {
      const retry = vi.fn(), retryDictionary = vi.fn();
      const { host, t } = mountReader(fixture, { definitionData: { word: 'river', x: 20, y: 20, aiStatus: 'error', aiErrorReason: 'timeout', dictionaryStatus: 'unavailable', dictionaryReason: 'timeout', retry, retryDictionary } });
      const status = host.querySelector('[data-lookup-status="definition"]');
      expect(status.textContent).toContain(t('simplified.lookup_ai_timeout'));
      expect(status.textContent).toContain(t('simplified.lookup_dictionary_timeout'));
      const button = status.querySelector('[data-dictionary-retry]');
      expect(button.textContent).toBe(t('simplified.lookup_dictionary_retry'));
      await click(button); expect(retryDictionary).toHaveBeenCalledOnce(); expect(retry).not.toHaveBeenCalled(); readable(status.textContent);
    });
    it(fixture.locale + ': recovery-copy controls preserve explicit-save semantics', async () => {
      const { host, t } = await openRecoveryFailure(fixture, 'conflict');
      await click(host.querySelector('[data-reading-conflict-review]'));
      await click(host.querySelector('[data-reading-conflict-use]'));
      const review = host.querySelector('[data-reading-copy-review]');
      expect(review.textContent).toBe(t('simplified.place_copy_review_action', { number: 1 }));
      await click(review);
      const panel = host.querySelector('[data-reading-copy-panel]');
      expect(panel.getAttribute('aria-label')).toBe(t('simplified.place_copy_review_title'));
      expect(panel.textContent).toContain(t('simplified.place_copy_restore_help'));
      const restore = panel.querySelector('[data-reading-copy-restore]');
      expect(restore.textContent).toBe(t('simplified.place_copy_restore'));
      const durable = localStorage.getItem(storageKey);
      await click(restore);
      expect(host.textContent).toContain(t('simplified.place_copy_restored'));
      expect(host.textContent).toContain(t('simplified.place_copy_save'));
      expect(localStorage.getItem(storageKey)).toBe(durable);
    });
  }
});
