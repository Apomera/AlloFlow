import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_conflict.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_conflict.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Conflict Coach badge dialog accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('gives both modal dialogs programmatic heading relationships', () => {
    const text = source();
    expect(text).toContain("'aria-labelledby': 'conflict-badge-earned-title'");
    expect(text).toContain("id: 'conflict-badge-earned-title'");
    expect(text).toContain("'aria-labelledby': 'conflict-badges-panel-title'");
    expect(text).toContain("id: 'conflict-badges-panel-title'");
  });

  it('moves focus inside, traps Tab, supports Escape, and restores the opener', () => {
    const text = source();
    expect(text).toContain("document.addEventListener('keydown', handleBadgeDialogKeyDown, true)");
    expect(text).toContain("if (event.key === 'Escape')");
    expect(text).toContain("if (event.key !== 'Tab') return");
    expect(text).toContain('focusable[0].focus()');
    expect(text).toContain('last.focus()');
    expect(text).toContain('previous.focus()');
    expect(text).toContain("document.removeEventListener('keydown', handleBadgeDialogKeyDown, true)");
  });

  it('routes all dismissal methods through one state-safe close function', () => {
    const text = source();
    expect(text).toContain('function closeBadgeDialogs()');
    expect(text).toContain("upd('showBadgePopup', null)");
    expect(text).toContain("upd('showBadgesPanel', false)");
    expect((text.match(/onClick: closeBadgeDialogs/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('leaves earned-badge content available until the user dismisses it', () => {
    const text = source();
    expect(text).not.toContain("setTimeout(function() { upd('showBadgePopup', null); }, 3000)");
  });

  it('dismisses only from direct backdrop clicks', () => {
    const text = source();
    expect((text.match(/e.target === e.currentTarget/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(text).not.toContain("onClick: function(e) { e.stopPropagation(); }");
  });
});
