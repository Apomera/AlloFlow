import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_echotrainer.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_echotrainer.js');

describe('EchoTrainer inline challenge accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('uses focusable regions for inline tutorial and challenge cards', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'region', 'aria-label': 'Tutorial step ' + (tutStep + 1) + ' of 4', tabIndex: 0");
    expect(source).toContain("role: 'region', 'aria-label': t('stem.echotrainer.distance_estimation_challenge', 'Distance estimation challenge'),\n          tabIndex: 0");
    expect(source).toContain("role: 'region', 'aria-label': t('stem.echotrainer.material_identification_quiz', 'Material identification quiz'),\n          tabIndex: 0");
    expect(source).not.toContain("role: 'dialog', 'aria-label': 'Tutorial step ' + (tutStep + 1) + ' of 4'");
    expect(source).not.toContain("role: 'dialog', 'aria-label': t('stem.echotrainer.distance_estimation_challenge'");
    expect(source).not.toContain("role: 'dialog', 'aria-label': t('stem.echotrainer.material_identification_quiz'");
  });
});
