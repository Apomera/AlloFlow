import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_execfunction.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_execfunction.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Executive Function destructive-action confirmation accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('uses one named and described alert dialog instead of browser confirmations', () => {
    const text = source();
    expect(text).not.toMatch(/\b(?:window\.)?confirm\s*\(/);
    expect(text).toContain("role: 'alertdialog'");
    expect(text).toContain("'aria-labelledby': 'ef-confirm-title'");
    expect(text).toContain("'aria-describedby': 'ef-confirm-description'");
    expect(text.match(/renderDestructiveConfirm\(\)/g)?.length).toBe(3);
  });

  it('focuses the safe action first and traps keyboard focus', () => {
    const text = source();
    expect(text).toContain("focusExecControl('ef-confirm-cancel')");
    expect(text).toContain("'data-primary-action': 'true'");
    expect(text).toContain("event.key === 'Escape'");
    expect(text).toContain("querySelectorAll('button:not([disabled])')");
  });

  it('restores focus after cancellation and confirmed deletion', () => {
    const text = source();
    expect(text).toContain("triggerId: 'ef-clear-distractions'");
    expect(text).toContain("triggerId: 'ef-remove-habit-' + hid");
    expect(text).toContain("focusExecControl('ef-distraction-heading')");
    expect(text).toContain("focusExecControl('ef-habits-heading')");
  });

  it('provides WCAG 2.2 target sizes for destructive actions', () => {
    const text = source();
    expect(text.match(/minHeight: 44/g)?.length).toBeGreaterThanOrEqual(2);
    expect(text).toContain("style: { minWidth: 24, minHeight: 24");
  });
});
