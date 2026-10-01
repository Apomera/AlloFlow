import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const sourcePath = 'stem_lab/stem_tool_typingpractice.js';
const mirrorPath = 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js';

describe('Typing Lab interruption persistence', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('flushes a private draft when focus or page lifecycle interrupts typing', () => {
    expect(source).toContain("saveInterruptedDrill('interruption')");
    expect(source).toContain("var onPageHide = function()");
    expect(source).toContain("saveInterruptedDrill('pagehide')");
    expect(source).toContain("window.addEventListener('pagehide', onPageHide)");
    expect(source).toContain("window.removeEventListener('pagehide', onPageHide)");
  });

  it('keeps the deployed mirror byte-identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });
});
