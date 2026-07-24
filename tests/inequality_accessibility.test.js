import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_inequality.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_inequality.js');

beforeEach(() => resetStemLab());

describe('Inequality Lab text accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('preserves translated badge labels while removing tiny text', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('var _badgeT = {');
    expect(source).toContain('_bt(badge.desc)');
    expect(source).toContain('_bt(badge.label)');
    expect(source).not.toMatch(/text-\[(?:[0-9])px\]/);
    expect(source).not.toMatch(/fontSize:\s*(?:[0-9](?:\.[0-9]+)?)\b/);
  });

  it('renders Inequality Lab without tiny utility text', () => {
    loadTool('stem_lab/stem_tool_inequality.js', 'inequality');
    const html = renderTool('inequality', { inequality: {} });
    expect(html).not.toMatch(/text-\[(?:[0-9])px\]/);
    expect(html).toContain('text-[10px]');
  });
});
