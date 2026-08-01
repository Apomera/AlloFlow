import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_pets.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_pets.js');

describe('Pets Simulator inline quiz accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('exposes the inline Toxic Foods Sleuth as a labeled focusable region', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("tfsOpen && h('div', { role: 'region', 'aria-label': 'Toxic Foods Sleuth quiz game', tabIndex: 0");
    expect(source).not.toContain("tfsOpen && h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Toxic Foods Sleuth quiz game'");
  });
});
