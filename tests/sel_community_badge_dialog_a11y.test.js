import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_community.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_community.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Community Builder badge dialog accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('exposes both overlays as named modal dialogs with close buttons', () => {
    const text = source();
    expect(text).toContain("'aria-labelledby': 'community-badge-earned-title'");
    expect(text).toContain("'aria-describedby': 'community-badge-earned-desc'");
    expect(text).toContain("'aria-labelledby': 'community-badges-panel-title'");
    expect(text).toContain("'aria-label': 'Close badge announcement'");
    expect(text).toContain("'aria-label': 'Close badges panel'");
    expect((text.match(/'aria-modal': 'true'/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('moves and traps focus, closes with Escape, and restores the opener', () => {
    const text = source();
    expect(text).toContain("document.addEventListener('keydown', handleCommunityBadgeDialogKeyDown, true)");
    expect(text).toContain("if (event.key === 'Escape')");
    expect(text).toContain("if (event.key !== 'Tab') return");
    expect(text).toContain('focusable[0].focus()');
    expect(text).toContain('last.focus()');
    expect(text).toContain('previous.focus()');
    expect(text).toContain("document.removeEventListener('keydown', handleCommunityBadgeDialogKeyDown, true)");
  });

  it('does not impose a three-second reading limit on earned-badge content', () => {
    const text = source();
    expect(text).not.toContain("setTimeout(function() { upd({ showBadgePopup: null }); }, 3000)");
    expect((text.match(/onClick: closeCommunityBadgeDialogs/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('dismisses only from a direct backdrop click without clickable content divs', () => {
    const text = source();
    expect((text.match(/e.target === e.currentTarget/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(text).not.toContain("onClick: function(e) { e.stopPropagation(); }");
  });

  it('keeps the clipboard fallback labeled and out of the tab order', () => {
    const text = source();
    expect(text).toContain("ta.setAttribute('aria-label', 'Cultural heritage project text for copying');");
    expect(text).toContain("ta.setAttribute('readonly', '');");
    expect(text).toContain('ta.tabIndex = -1;');
  });
});
