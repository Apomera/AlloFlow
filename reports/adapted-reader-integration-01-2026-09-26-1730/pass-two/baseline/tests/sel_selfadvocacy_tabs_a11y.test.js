import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_selfadvocacy.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_selfadvocacy.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Self-Advocacy Studio tab accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('links the tablist, tabs, and displayed panel with roving focus', () => {
    const text = source();
    expect(text).toContain("role: 'tablist'");
    expect(text).toContain("id: 'selfadv-tab-' + t.id");
    expect(text).toContain("role: 'tab'");
    expect(text).toContain("'aria-selected': sel");
    expect(text).toContain("'aria-controls': 'selfadv-tabpanel'");
    expect(text).toContain('tabIndex: sel ? 0 : -1');
    expect(text).toContain("role: 'tabpanel'");
    expect(text).toContain("'aria-labelledby': 'selfadv-tab-' + activeTab");
  });

  it('supports the standard tablist arrow, Home, and End keys', () => {
    const text = source();
    expect(text).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(text).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(text).toContain("e.key === 'Home'");
    expect(text).toContain("e.key === 'End'");
    expect(text).toContain("document.getElementById('selfadv-tab-' + nextTab.id)");
  });

  it('moves pointer activation to the panel without suppressing focus outlines', () => {
    const text = source();
    expect(text).toContain("document.getElementById('selfadv-tabpanel')");
    expect(text).not.toContain("style: { outline: 'none' }");
  });
});
