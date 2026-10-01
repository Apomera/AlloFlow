import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_echolocation.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_echolocation.js');

describe('Echolocation Lab main tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('keeps arrow navigation and adds Home/End plus tab relationships', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': t('stem.echolocation.echolocation_lab_sections'");
    expect(source).toContain("key: tb.id, role: 'tab', id: 'echolocation-tab-' + tb.id");
    expect(source).toContain("'aria-controls': 'echolocation-panel-' + tb.id");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active Echolocation mode hero to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'echolocation-panel-' + tab");
    expect(source).toContain("'aria-labelledby': 'echolocation-tab-' + tab");
    expect(source).toContain("tabIndex: 0");
  });
});
