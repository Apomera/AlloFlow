import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_ecosystem.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_ecosystem.js');

describe('Ecosystem Simulator inline deep-dive accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('exposes species deep-dives as labeled focusable regions', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'region', 'aria-labelledby': 'ecosystem-deep-dive-title-' + def.id, tabIndex: 0");
    expect(source).toContain("id: 'ecosystem-deep-dive-title-' + def.id");
    expect(source).not.toContain("role: 'dialog', 'aria-modal': 'true', 'aria-label': __alloT('stem.ecosystem.aria_cultural_deepdive_pre'");
  });
});
