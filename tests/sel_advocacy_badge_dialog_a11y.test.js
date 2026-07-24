import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_advocacy.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_advocacy.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Advocacy badge dialog accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('exposes named modal dialogs with explicit close controls', () => {
    const text = source();
    expect(text).toContain("'aria-labelledby': 'advocacy-badge-earned-title'");
    expect(text).toContain("'aria-describedby': 'advocacy-badge-earned-desc'");
    expect(text).toContain("'aria-labelledby': 'advocacy-badges-panel-title'");
    expect(text).toContain("'aria-label': 'Close badge announcement'");
    expect(text).toContain("'aria-label': 'Close badges panel'");
    expect((text.match(/'aria-modal': 'true'/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('moves and traps focus, closes with Escape, and restores the opener', () => {
    const text = source();
    expect(text).toContain("document.addEventListener('keydown', handleAdvocacyBadgeDialogKeyDown, true)");
    expect(text).toContain("if (event.key === 'Escape')");
    expect(text).toContain("if (event.key !== 'Tab') return");
    expect(text).toContain('focusable[0].focus()');
    expect(text).toContain('last.focus()');
    expect(text).toContain('previous.focus()');
    expect(text).toContain("document.removeEventListener('keydown', handleAdvocacyBadgeDialogKeyDown, true)");
  });

  it('keeps earned-badge content open until dismissed', () => {
    const text = source();
    expect(text).not.toContain("setTimeout(function() { upd('showBadgePopup', null); }, 3000)");
    expect((text.match(/if \(e\.target === e\.currentTarget\) closeAdvocacyBadgeDialogs\(\)/g) || []).length).toBe(2);
    expect((text.match(/onClick: closeAdvocacyBadgeDialogs/g) || []).length).toBe(2);
    expect(text).not.toContain('e.stopPropagation()');
  });
});
