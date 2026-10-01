import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_nutritionlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_nutritionlab.js');

describe('Nutrition Lab Dinner Roulette status accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('replaces blocking native alerts with an announced status message', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).not.toContain("alert('Add some dinners first!")
    expect(source).not.toContain("alert('Tonight: '");
    expect(source).toContain("setNotice('Add some dinners first.')");
    expect(source).toContain("setNotice('Tonight: ' + r.name");
    expect(source).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
  });
});
