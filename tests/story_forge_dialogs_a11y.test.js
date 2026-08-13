import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('story_forge_source.jsx', 'utf8');

describe('Story Forge nested dialog accessibility', () => {
  it('places every nested dialog on the shared topmost focus stack', () => {
    expect(source).toContain('_storyForgeUseFocusTrap(restorePromptDialogRef, showRestorePrompt');
    expect(source).toContain('_storyForgeUseFocusTrap(discardDraftConfirmDialogRef, showDiscardDraftConfirm');
    expect(source).toContain('_storyForgeUseFocusTrap(closeConfirmDialogRef, showCloseConfirm');
    expect(source).toContain('_storyForgeUseFocusTrap(exportConsentDialogRef, !!exportConsent');
    expect(source).toContain('ref={restorePromptDialogRef}');
    expect(source).toContain('ref={discardDraftConfirmDialogRef}');
    expect(source).toContain('ref={closeConfirmDialogRef} tabIndex={-1}');
  });

  it('dismisses only the top nested layer with Escape', () => {
    expect(source).toContain('else if (showCloseConfirm) setShowCloseConfirm(false)');
    expect(source).toContain('else if (showDiscardDraftConfirm) cancelDiscardDraftConfirmation()');
    expect(source).toContain('else if (showRestorePrompt) dismissRestorePrompt()');
    expect(source).toContain('[isOpen, exportConsent, importConfirmation, showCloseConfirm, showRestorePrompt, showDiscardDraftConfirm');
  });

  it('names and describes restore, deletion, and close confirmation dialogs', () => {
    expect(source).toContain('aria-describedby="sf-restore-description sf-restore-summary"');
    expect(source).toContain('id="sf-restore-description"');
    expect(source).toContain('data-sf-discard-draft-confirmation');
    expect(source).toContain('aria-labelledby="sf-discard-draft-title"');
    expect(source).toContain('aria-describedby="sf-discard-draft-description"');
    expect(source).toContain('aria-describedby="sf-close-confirm-description"');
    expect(source).toContain('id="sf-close-confirm-description"');
  });

  it('guards nested dialog entrance motion', () => {
    expect(source.match(/motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200/g) || []).toHaveLength(2);
  });
});
