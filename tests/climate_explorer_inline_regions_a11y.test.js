import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_climateExplorer.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_climateExplorer.js');

describe('Climate Explorer inline sector deep-dive accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('exposes sector deep-dives as labeled focusable regions', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'region', 'aria-labelledby': 'climate-explorer-deep-dive-title-' + def.id, tabIndex: 0");
    expect(source).toContain("id: 'climate-explorer-deep-dive-title-' + def.id");
    expect(source).not.toContain("role: 'dialog', 'aria-modal': 'true',\n                style: { background: 'linear-gradient(135deg, ' + def.color");
  });
});
