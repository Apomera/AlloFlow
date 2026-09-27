import { readFileSync } from 'node:fs';
import { fixtures as baseFixtures, contentFor, translator } from './reader_locale_harness.js';
import { setupRecoveryReader, prepareRecoveryCase, cleanupRecoveryCase, mountReader, disposeReader, act, click } from './reader_recovery_locale_harness.js';
export { contentFor, translator, mountReader, disposeReader, act, click };
export const setupPreviewLocales = setupRecoveryReader;
export const preparePreviewLocale = prepareRecoveryCase;
export const cleanupPreviewLocale = cleanupRecoveryCase;
export const previewFixtures = JSON.parse(readFileSync('tests/fixtures/reader_preview_locales.json', 'utf8')).map(f => ({ ...baseFixtures.find(base => base.id === f.baseFixture), ...f }));
export async function openLocalePreview(fixture, extra = {}) {
  const view = mountReader(fixture, extra);
  await click(view.host.querySelector('[data-student-preview-open]'));
  return { ...view, preview: view.host.querySelector('[data-student-preview]') };
}
