import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('story_forge_source.jsx', 'utf8');

describe('Story Forge nested dialog accessibility', () => {
  it('places every nested dialog on the shared topmost focus stack', () => {
    expect(source).toContain('_storyForgeUseFocusTrap(restorePromptDialogRef, showRestorePrompt');
    expect(source).toContain('_storyForgeUseFocusTrap(closeConfirmDialogRef, showCloseConfirm');
    expect(source).toContain('_storyForgeUseFocusTrap(exportConsentDialogRef, !!exportConsent');
    expect(source).toContain('ref={restorePromptDialogRef} tabIndex={-1}');
    expect(source).toContain('ref={closeConfirmDialogRef} tabIndex={-1}');
  });

  it('dismisses only the top nested layer with Escape', () => {
    expect(source).toContain('else if (showCloseConfirm) setShowCloseConfirm(false)');
    expect(source).toContain('else if (showRestorePrompt) setShowRestorePrompt(false)');
    expect(source).toContain('[isOpen, exportConsent, showCloseConfirm, showRestorePrompt');
  });

  it('names and describes both confirmation dialogs', () => {
    expect(source).toContain('aria-describedby="sf-restore-description"');
    expect(source).toContain('id="sf-restore-description"');
    expect(source).toContain('aria-describedby="sf-close-confirm-description"');
    expect(source).toContain('id="sf-close-confirm-description"');
  });

  it('guards nested dialog entrance motion', () => {
    expect(source.match(/motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200/g) || []).toHaveLength(2);
  });
});
