import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_decisions.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_decisions.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Decisions tool dialog and table accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('exposes named modal dialogs with explicit close controls', () => {
    const text = source();
    expect(text).toContain("'aria-labelledby': 'decision-badge-earned-title'");
    expect(text).toContain("'aria-describedby': 'decision-badge-earned-desc'");
    expect(text).toContain("'aria-labelledby': 'decision-badges-panel-title'");
    expect(text).toContain("'aria-label': 'Close badge announcement'");
    expect(text).toContain("'aria-label': 'Close badges panel'");
    expect((text.match(/'aria-modal': 'true'/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('traps dialog focus, closes with Escape, and restores the opener', () => {
    const text = source();
    expect(text).toContain("document.addEventListener('keydown', handleDecisionBadgeDialogKeyDown, true)");
    expect(text).toContain("if (event.key === 'Escape')");
    expect(text).toContain("if (event.key !== 'Tab') return");
    expect(text).toContain('focusable[0].focus()');
    expect(text).toContain('last.focus()');
    expect(text).toContain('previous.focus()');
  });

  it('keeps earned-badge content open until dismissed by the user', () => {
    expect(source()).not.toContain("setTimeout(function() { upd('showBadgePopup', null); }, 3000)");
  });

  it('associates worksheet table headers with their columns and rows', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Consequences across time by option'");
    expect((text.match(/h\('th', \{ scope: 'col'/g) || []).length).toBe(3);
    expect(text).toContain("h('th', { scope: 'row'");
  });

  it('dismisses only from direct backdrop clicks', () => {
    const text = source();
    expect((text.match(/e.target === e.currentTarget/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(text).not.toContain("onClick: function(e) { e.stopPropagation(); }");
  });
});
