import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_conflicttheater.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_conflicttheater.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Conflict Theater control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names the message field at its definition', () => {
    expect(source()).toContain("h('textarea', { 'aria-label': 'Your message',");
  });

  it('keeps the compact memory reset target at least 24 CSS pixels high', () => {
    expect(source()).toContain("style: { padding: '4px 10px', minHeight: 24");
  });

  it('uses a labelled modal confirmation before irreversible memory deletion', () => {
    const text = source();
    expect(text).not.toContain('window.confirm');
    expect(text).toContain("role: 'alertdialog'");
    expect(text).toContain("'aria-modal': 'true'");
    expect(text).toContain("'aria-labelledby': 'cft-memory-reset-title'");
    expect(text).toContain("'aria-describedby': 'cft-memory-reset-description'");
    expect(text).toContain('This cannot be undone.');
  });

  it('contains keyboard focus and restores a meaningful focus target', () => {
    const text = source();
    expect(text).toContain("if (event.key === 'Escape')");
    expect(text).toContain("if (event.key !== 'Tab') return;");
    expect(text).toContain("focusConflictControl('cft-memory-reset-cancel')");
    expect(text).toContain("focusConflictControl('cft-memory-reset-trigger')");
    expect(text).toContain("focusConflictControl('cft-scenario-heading')");
  });

  it('only clears memory from the confirmed action', () => {
    const text = source();
    expect(text).toContain('if (!memoryResetConfirm) return;');
    expect(text).toContain('upd({ memoryResetConfirm: false, memory: {} });');
    expect(text).toContain('onClick: openMemoryResetConfirm');
  });
});
