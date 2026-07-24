import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_hub_module.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_hub_module.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('SEL Hub clear-data confirmation accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('uses a named and described modal instead of a browser confirmation', () => {
    const text = source();
    expect(text).not.toContain('window.confirm(');
    expect(text).toContain("id: 'sel-clear-data-confirm-modal'");
    expect(text).toContain("'aria-labelledby': 'sel-clear-data-confirm-title'");
    expect(text).toContain("'aria-describedby': 'sel-clear-data-confirm-description'");
  });

  it('focuses the safe action first and keeps both actions large enough', () => {
    const text = source();
    expect(text).toContain("'data-primary-action': 'true'");
    expect(text).toContain("}, 'Cancel')");
    expect(text.match(/minHeight: 44/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('includes the confirmation in Escape handling, focus trapping, and restoration', () => {
    const text = source();
    expect(text).toContain("if (showClearSelConfirm) { closeClearSelConfirm(); }");
    expect(text.match(/showClearSelConfirm \? 'sel-clear-data-confirm-modal'/g)?.length).toBe(2);
    expect(text).toContain("document.getElementById('sel-clear-all-data-button')");
    expect(text).toContain("id: 'sel-clear-all-data-button'");
  });
});
