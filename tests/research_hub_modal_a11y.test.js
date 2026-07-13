import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('research_hub_source.jsx', 'utf8');

describe('Research Hub modal accessibility', () => {
  it('places named and described modal semantics on the panel', () => {
    expect(source).toContain('role="presentation"\n        data-help-key="research_hub"');
    expect(source).toContain('ref={dialogRef}\n          tabIndex={-1}\n          role="dialog"');
    expect(source).toContain('aria-labelledby="research-hub-dialog-title"');
    expect(source).toContain('aria-describedby="research-hub-dialog-description"');
  });

  it('focuses Close, contains Tab, dismisses with Escape, and returns focus', () => {
    expect(source).toContain('(closeButtonRef.current || getFocusable()[0] || dialog).focus()');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('previousFocus.isConnected');
    expect(source).toContain('ref={closeButtonRef}');
  });

  it('announces lane and educator-view changes', () => {
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain("activeLane ? activeLane.label");
  });

  it('connects the inquiry question to its visible help', () => {
    expect(source).toContain('id="research-hub-question-help"');
    expect(source).toContain('aria-describedby="research-hub-question-help"');
  });

  it('uses a safe-default alert dialog for destructive inquiry reset', () => {
    expect(source).not.toContain('window.confirm');
    expect(source).toContain('role="alertdialog"');
    expect(source).toContain('aria-labelledby="research-hub-reset-title"');
    expect(source).toContain('aria-describedby="research-hub-reset-description"');
    expect(source).toContain('data-safe-default="true"');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
  });

  it('restores focus after reset cancellation or completion', () => {
    expect(source).toContain('requestClearJournal');
    expect(source).toContain('trigger.isConnected');
    expect(source).toContain('closeButtonRef.current.focus()');
    expect(source).toContain("minHeight: '44px'");
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('prismflow-deploy/public/research_hub_module.js', 'utf8')).toBe(fs.readFileSync('research_hub_module.js', 'utf8'));
  });
});
