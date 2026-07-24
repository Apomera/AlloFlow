import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_multtable.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_multtable.js');

beforeEach(() => resetStemLab());

describe('Multiplication Table text accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('does not retain persistent seven, eight, or nine pixel labels', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).not.toMatch(/text-\[(?:7|8|9)px\]/);
    expect(source).not.toMatch(/fontSize:\s*(?:7|8|9)\b/);
    expect(source).toContain('fontSize: 10, fontWeight: 800');
  });

  it('renders the Multiplication Table surface without tiny utility text', () => {
    loadTool('stem_lab/stem_tool_multtable.js', 'multtable');
    const html = renderTool('multtable', { multtable: {} });
    expect(html).not.toMatch(/text-\[(?:7|8|9)px\]/);
    expect(html).toContain('text-[10px]');
  });
});
