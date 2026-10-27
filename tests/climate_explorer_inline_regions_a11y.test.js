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
    expect(source).toMatch(/id\s*:\s*'ce-pathway-deep-dive'\s*,\s*role\s*:\s*'region'\s*,\s*'aria-labelledby'\s*:\s*'climate-explorer-deep-dive-title-'\s*\+\s*def\.id\s*,\s*'aria-describedby'\s*:\s*'ce-pathway-deep-dive-description'\s*,\s*tabIndex\s*:\s*-1\s*,\s*'data-ce-focus'\s*:\s*true/);
    expect(source).toMatch(/id\s*:\s*'climate-explorer-deep-dive-title-'\s*\+\s*def\.id/);
    expect(source).toMatch(/id\s*:\s*'ce-pathway-deep-dive'\s*,\s*hidden\s*:\s*true/);
    expect(source).not.toContain("role: 'dialog', 'aria-modal': 'true',\n                style: { background: 'linear-gradient(135deg, ' + def.color");
  });
});
