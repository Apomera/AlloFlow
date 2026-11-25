// a11y batch (audit D1/B1, 2026-06-28). D1: five student-facing modals (Visual Supports, Save, Translate,
// Cloud Warning, Adventure Confirmation) rendered WITHOUT a focus trap — Tab escaped into background content
// and focus didn't return to the trigger on close (WCAG 2.4.3). The codebase already has a proven useFocusTrap
// hook applied to ~8 sibling modals; these 5 now copy it (a ref + binding + ref={...} on the modal wrapper).
// B1: the project auto-save swallowed a Blob-creation/quota failure with a bare `return false` — no toast, no
// log — so a teacher lost work silently; it now surfaces an error toast. These pin the source against drift.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

describe('D1: the 5 modals are each bound to useFocusTrap AND attach the ref at their render site', () => {
  const modals = [
    ['visualSupportsModalRef', 'showVisualSupports', 'setShowVisualSupports'],
    ['saveModalRef', 'showSaveModal', 'setShowSaveModal'],
    ['cloudWarningModalRef', 'showCloudWarning', 'setShowCloudWarning'],
    ['adventureConfirmModalRef', 'showAdventureConfirmation', 'setShowAdventureConfirmation'],
  ];
  it.each(modals)('%s — hook binding + render-site ref', (ref, show, setter) => {
    expect(anti).toContain(`useFocusTrap(${ref}, ${show}, () => ${setter}(false));`);
    expect(anti).toContain(`ref={${ref}}`);
  });
  // 2026-11-17: the Translate dialog is a lazy view now (TranslateModalView in view_cold_path_screens_source.jsx)
  // and took its trap with it: the view makes the ref and calls the same host hook, for as long as it is mounted;
  // the host hands it what Escape should do. tests/third_wave_cdn_extraction.test.js runs it with the real hook.
  it('translateModalRef — the trap lives in the lazy view, with the host hook and the host close', () => {
    const view = readFileSync(resolve(process.cwd(), 'view_cold_path_screens_source.jsx'), 'utf8');
    const dialog = view.slice(view.indexOf('function TranslateModalView(props) {'));
    // The view now goes through the shared cold-path lock, which calls the same host hook
    // (and adds the shared scroll lock).
    expect(dialog).toContain('_useColdPathDialogLock(translateModalRef, props.onTrapEscape || handleSetIsTranslateModalOpenToFalse);');
    const lock = view.slice(view.indexOf('function _useColdPathDialogLock(dialogRef, onEscape) {'), view.indexOf('function _coldPathAiUsable('));
    expect(lock).toContain('window.__alloHooks.useFocusTrap');
    expect(lock).toContain('hostHook(dialogRef, true, onEscape);');
    expect(dialog).toContain('ref={translateModalRef}');
    expect(anti).toContain('window.__alloHooks = { useFocusTrap };');
    expect(anti).toContain('onTrapEscape={() => setIsTranslateModalOpen(false)}');
    expect(anti).not.toContain('translateModalRef');
  });
});

describe('B1: the silent auto-save failure now warns the teacher', () => {
  it('the saveProjectToFile blob-failure catch emits an error toast, not a bare `return false`', () => {
    expect(anti).toContain("t('toasts.save_failed')");
    // the old silent `return true; } catch (e) { return false; }` is gone
    expect(anti).not.toMatch(/return true;\s*\n\s*\} catch \(e\) \{ return false; \}/);
  });
});
