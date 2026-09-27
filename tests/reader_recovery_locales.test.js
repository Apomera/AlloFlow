import { beforeAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { setupRecoveryReader, prepareRecoveryCase, cleanupRecoveryCase, recoveryFixtures, mountReader, openPrompts, typeAnswer, failWrites, storageKey, act, click, reasonKeys, openRecoveryFailure } from './helpers/reader_recovery_locale_harness.js';
beforeAll(setupRecoveryReader);
beforeEach(prepareRecoveryCase);
afterEach(cleanupRecoveryCase);
function expectReadable(panel) { expect(panel).not.toBeNull(); expect(panel.textContent).not.toMatch(/simplified\.[a-z_]+|\{snippet\}/); }
describe('localized save and recovery contract', () => {
  for (const fixture of recoveryFixtures) {
    it(fixture.id + ': failed save, temporary bookmark, answer copy and successful retry', async () => {
      const view = mountReader(fixture), { host, t } = view, input = await openPrompts(view);
      expect(host.querySelector('[data-reading-persistence="ready"]').textContent).toContain(t('simplified.place_save_ready'));
      await typeAnswer(input, 'Previously committed');
      const durable = localStorage.getItem(storageKey), writes = failWrites();
      await typeAnswer(input, fixture.answer);
      const panel = host.querySelector('[data-reading-persistence="failed"]');
      expectReadable(panel);
      expect(panel.querySelector('[role="status"]').textContent).toBe(t('simplified.place_save_failed'));
      expect(panel.querySelector('[data-reading-save-retry]').textContent).toBe(t('simplified.place_retry'));
      const workCopy = panel.querySelector('[data-reading-work-copy]');
      expect(workCopy.closest('details').querySelector('summary').textContent).toBe(t('simplified.place_copy_work'));
      expect(workCopy.closest('label').textContent).toContain(t('simplified.place_work_to_copy'));
      expect(panel.querySelector('[data-reading-work-copy]').value).toContain(fixture.answer);
      expect(panel.querySelector('[data-reading-work-copy]').value).toContain(t('simplified.prompt_main_idea'));
      expect(panel.querySelector('[data-reading-work-copy]').value).not.toMatch(/"mainIdea"\s*:/);
      expect(input.value).toBe(fixture.answer);
      expect(localStorage.getItem(storageKey)).toBe(durable);
      await click(host.querySelector('[data-reading-outline-toggle]'));
      await click(host.querySelector('[data-reading-bookmark]'));
      const notice = host.querySelector('[data-reading-place-notice]');
      expectReadable(notice);
      expect(notice.textContent).toContain(t('simplified.place_bookmark_temporary', { snippet: '' }).trim());
      writes.mockRestore();
      await click(host.querySelector('[data-reading-save-retry]'));
      expect(host.querySelector('[data-reading-persistence="saved"]').textContent).toContain(t('simplified.place_saved_device'));
      expect(JSON.parse(localStorage.getItem(storageKey))[Object.keys(JSON.parse(localStorage.getItem(storageKey)))[0]].responses[0].mainIdea).toBe(fixture.answer);
    });
    it(fixture.id + ': pending write is described as saving', async () => {
      let complete;
      navigator.locks.request = (_key, callback) => new Promise(resolve => { complete = () => resolve(callback()); });
      const view = mountReader(fixture), input = await openPrompts(view);
      await typeAnswer(input, fixture.answer);
      expect(view.host.querySelector('[data-reading-persistence="saving"]').textContent).toContain(view.t('simplified.place_saving'));
      expect(localStorage.getItem(storageKey)).toBeNull();
      await act(async () => complete());
      expect(view.host.querySelector('[data-reading-persistence="saved"]').textContent).toContain(view.t('simplified.place_saved_device'));
    });
    it.each([false, true])(fixture.id + ': session-only scope, preview=%s', async preview => {
      const view = mountReader(fixture, { readingLearnerKey: preview ? fixture.id : '', isStudentPreview: preview });
      await typeAnswer(await openPrompts(view), fixture.answer);
      const panel = view.host.querySelector('[data-reading-persistence="session-only"]');
      expectReadable(panel);
      expect(panel.textContent).toContain(view.t('simplified.' + (preview ? 'place_preview_only' : 'place_page_only')));
      expect(localStorage.getItem(storageKey)).toBeNull();
    });
    it.each(['local', 'saved'])(fixture.id + ': localized conflict review and recovery copy, choose %s', async choice => {
      const view = await openRecoveryFailure(fixture, 'conflict'), { host, t } = view;
      await click(host.querySelector('[data-reading-conflict-review]'));
      const panel = host.querySelector('[data-reading-conflict-panel]');
      expectReadable(panel);
      expect(panel.getAttribute('aria-label')).toBe(t('simplified.place_review_title'));
      for (const key of ['place_review_retained', 'place_review_local', 'place_review_saved']) expect(panel.textContent).toContain(t('simplified.' + key));
      expect(panel.querySelector('[data-reading-conflict-local]').value).toContain(fixture.answer);
      expect(panel.querySelector('[data-reading-conflict-saved]').value).toContain('Other tab answer');
      expect(panel.querySelector('[data-reading-conflict-keep]').textContent).toBe(t('simplified.place_review_keep'));
      expect(panel.querySelector('[data-reading-conflict-use]').textContent).toBe(t('simplified.place_review_use'));
      await click(panel.querySelector(choice === 'local' ? '[data-reading-conflict-keep]' : '[data-reading-conflict-use]'));
      const copies = host.querySelector('[data-reading-recovery-copies]');
      expectReadable(copies);
      expect(copies.textContent).toContain(t('simplified.place_recovery_copies'));
      expect(copies.textContent).toContain(t('simplified.place_recovery_lifetime'));
      expect(copies.textContent).toContain(t('simplified.' + (choice === 'local' ? 'place_recovery_saved' : 'place_recovery_local')));
      expect(copies.querySelector('[data-reading-recovery-copy]').value).toContain(choice === 'local' ? 'Other tab answer' : fixture.answer);
    });
    it(fixture.id + ': a changed review asks the reader to review again in the selected language', async () => {
      const view = await openRecoveryFailure(fixture, 'conflict');
      await click(view.host.querySelector('[data-reading-conflict-review]'));
      const rows = JSON.parse(localStorage.getItem(storageKey)); Object.values(rows)[0].responses[0].mainIdea = 'A newer saved answer';
      localStorage.setItem(storageKey, JSON.stringify(rows));
      await click(view.host.querySelector('[data-reading-conflict-keep]'));
      expect(view.host.querySelector('[data-reading-persistence="failed"]').textContent).toContain(view.t('simplified.place_review_changed'));
      expect(view.host.querySelector('[data-reading-work-copy]').value).toContain(fixture.answer);
    });
    for (const [reason, key] of Object.entries(reasonKeys)) {
      it(fixture.id + ': ' + reason + ' keeps its translated action and verbatim draft', async () => {
        const view = await openRecoveryFailure(fixture, reason), panel = view.host.querySelector('[data-reading-persistence="failed"]');
        expectReadable(panel);
        expect(panel.querySelector('[role="status"]').textContent).toContain(view.t('simplified.' + key));
        expect(panel.querySelector('[data-reading-work-copy]').value).toContain(view.answer);
        expect(localStorage.getItem(storageKey)).toBe(view.durableBefore);
      });
    }
  }
  it.each(['missing', 'echoed'])('falls back honestly to English when the translator is %s', async kind => {
    const t = kind === 'echoed' ? key => key : () => undefined;
    const view = mountReader(recoveryFixtures[2], { t });
    failWrites();
    await typeAnswer(await openPrompts(view), recoveryFixtures[2].answer);
    const panel = view.host.querySelector('[data-reading-persistence="failed"]');
    expectReadable(panel);
    expect(panel.textContent).toContain('Couldn’t save on this device.');
    expect(panel.querySelector('[data-reading-save-retry]').textContent).toBe('Retry saving');
    expect(panel.querySelector('[data-reading-work-copy]').closest('details').querySelector('summary').textContent).toBe('Copy your work');
  });
});
