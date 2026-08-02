import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const sourcePath = 'stem_lab/stem_tool_typingpractice.js';
const mirrorPath = 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js';

describe('Typing Lab forced-colors accessibility', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('keeps controls, progress, and focus states legible in Windows High Contrast mode', () => {
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain('background: Canvas !important');
    expect(source).toContain('background: ButtonFace !important');
    expect(source).toContain('color: ButtonText !important');
    expect(source).toContain('background: Highlight !important');
    expect(source).toContain('color: HighlightText !important');
    expect(source).toContain('color: GrayText !important');
    expect(source).toContain('[role="progressbar"]');
  });

  it('keeps the deployed mirror byte-identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });
});
