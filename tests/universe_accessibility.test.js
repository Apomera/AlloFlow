import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_universe.js');
const publicPath = path.join(process.cwd(), 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_universe.js');
beforeEach(() => resetStemLab());

describe('Universe text accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
  it('does not retain persistent text below ten pixels', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).not.toMatch(/text-\[(?:[0-9])px\]/);
    expect(source).not.toMatch(/fontSize:\s*(?:[0-9](?:\.[0-9]+)?)\b/);
  });
  it('renders Universe without tiny utility or SVG text', () => {
    loadTool('stem_lab/stem_tool_universe.js', 'universe');
    const html = renderTool('universe', { universe: {} });
    expect(html).not.toMatch(/text-\[(?:[0-9])px\]/);
    expect(html).not.toMatch(/font-size="(?:[0-9](?:\.[0-9]+)?)"/);
  });
});
