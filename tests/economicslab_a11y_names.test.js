import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_economicslab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_economicslab.js');

describe('Economics Lab accessibility names', () => {
  it('names interactive inputs, policy explanation, and chart', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("'aria-label': t('stem.economicslab.advisor_question'");
      expect(source).toContain("'aria-label': t('stem.economicslab.market_theme'");
      expect(source).toContain("'aria-label': t('stem.economicslab.business_idea'");
      expect(source).toContain("'aria-label': t('stem.economicslab.policy_explanation'");
      expect(source).toContain("role: 'img', 'aria-label': t('stem.economicslab.policy_outcomes_chart'");
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
