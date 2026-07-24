import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_selfadvocacy.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_selfadvocacy.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Self-Advocacy Studio destructive-action confirmation accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('uses one named modal alert dialog instead of browser confirmations', () => {
    const text = source();
    expect(text).not.toContain('window.confirm');
    expect(text).toContain("role: 'alertdialog'");
    expect(text).toContain("'aria-modal': 'true'");
    expect(text).toContain("'aria-labelledby': 'selfadv-confirm-title'");
    expect(text).toContain("'aria-describedby': 'selfadv-confirm-description'");
  });

  it('focuses the safe action first, traps Tab, supports Escape, and restores focus on cancel', () => {
    const text = source();
    expect(text).toContain("focusSelfAdvocacyControl('selfadv-confirm-cancel')");
    expect(text).toContain("if (event.key === 'Escape')");
    expect(text).toContain("if (event.key !== 'Tab') return");
    expect(text).toContain("event.currentTarget.querySelectorAll('button:not([disabled])')");
    expect(text).toContain('if (triggerId) focusSelfAdvocacyControl(triggerId)');
    expect(text.indexOf("}, 'Cancel')")).toBeLessThan(text.indexOf('}, copy[2])'));
  });

  it('routes every destructive operation through the shared confirmation state', () => {
    const text = source();
    for (const type of [
      'clear-profile',
      'clear-meeting',
      'delete-journal',
      'clear-card',
      'clear-action-plan',
      'import-data',
      'reset-all',
    ]) {
      expect(text).toContain(`type: '${type}'`);
    }
  });

  it('keeps parsed imports transient until replacement is confirmed', () => {
    const text = source();
    expect(text).toContain('var pendingSelfAdvocacyImport = null');
    expect(text).toContain('pendingSelfAdvocacyImport = patch');
    expect(text).toContain('Object.keys(pendingSelfAdvocacyImport).forEach');
    expect(text).toContain("openDestructiveConfirm({ type: 'import-data'");
    expect(text).toContain("id: 'selfadv-import-trigger'");
    expect(text).toContain("tabIndex: -1,\n              'aria-hidden': 'true'");
  });

  it('moves focus to meaningful context after confirmed data changes', () => {
    const text = source();
    for (const id of [
      'selfadv-profile-heading',
      'selfadv-meeting-heading',
      'selfadv-journey-heading',
      'selfadv-card-heading',
      'selfadv-plan-heading',
      'selfadv-data-heading',
    ]) {
      expect(text).toContain(`id: '${id}', tabIndex: -1`);
    }
  });
});
