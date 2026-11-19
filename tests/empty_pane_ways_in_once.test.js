// Empty Create screen (2026-11-18): side by side, the main pane repeated the sidebar's ways in (Reading catalog,
// Find online, Write with AI) right next to the same buttons. They now show only when the sidebar is a separate
// pane (narrow screens, isWide false), where they are the only way in from this pane. Paste stays in both.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ANTI = readFileSync('AlloFlowANTI.txt', 'utf8');
const at = ANTI.indexOf("{t('input.quickstart_heading') || 'Or choose a starting point'}");

describe('the empty Create screen shows each way in once', () => {
  it('the starting-point cards sit inside an isWide-false branch', () => {
    expect(at).toBeGreaterThan(0);
    const before = ANTI.slice(Math.max(0, at - 400), at);
    expect(before).toContain('{!isWide && <>');
    const after = ANTI.slice(at, at + 6000);
    expect(after.indexOf('</>}')).toBeGreaterThan(after.indexOf("key: 'find'"));
    expect(after.indexOf('</>}')).toBeLessThan(after.indexOf('{history.length > 0 && !guidedMode && ('));
  });
  it('the paste button stays on every width', () => {
    const paste = ANTI.lastIndexOf("{t('sidebar.source_paste_or_type') || 'Paste or type your own text'}", at);
    expect(paste).toBeGreaterThan(0);
    // The branch opens after the paste button, so the button is outside it.
    expect(ANTI.lastIndexOf('{!isWide && <>', at)).toBeGreaterThan(paste);
    expect(ANTI.slice(ANTI.lastIndexOf('{isTeacherMode && !guidedMode && (', paste), paste)).not.toContain('isWide');
  });
});
