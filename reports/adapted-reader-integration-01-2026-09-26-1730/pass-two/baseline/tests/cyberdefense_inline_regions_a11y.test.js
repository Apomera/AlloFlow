import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_cyberdefense.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_cyberdefense.js');

describe('CyberDefense inline war-room accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('uses labeled focusable regions for inline quiz, replay, and welcome panels', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'region', 'aria-label': t('stem.cyberdefense.quick_quiz', 'Quick Quiz'), tabIndex: 0");
    expect(source).toContain("role: 'region', 'aria-label': t('stem.cyberdefense.campaign_replay', 'Campaign replay'), tabIndex: 0");
    expect(source).toContain("role: 'region', 'aria-labelledby': 'warroom-welcome-title', tabIndex: 0");
    expect(source).not.toContain("role: 'dialog', 'aria-label': t('stem.cyberdefense.quick_quiz'");
    expect(source).not.toContain("role: 'dialog', 'aria-label': t('stem.cyberdefense.campaign_replay'");
    expect(source).not.toContain("role: 'dialog', 'aria-labelledby': 'warroom-welcome-title'");
  });
});
