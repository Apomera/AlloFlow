import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_coding.js');
const publicPath = path.join(process.cwd(), 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_coding.js');
const originalMatchMedia = window.matchMedia;

function renderCoding(reducedMotion) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: reducedMotion,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener() {},
    removeEventListener() {},
  });
  loadTool('stem_lab/stem_tool_coding.js', 'codingPlayground');
  return renderTool('codingPlayground', {
    _codingPlayground: {
      tutorialDismissed: true,
      showCoordPicker: true,
      running: true,
      aiLoading: true,
      showAIPanel: true,
    },
  });
}

beforeEach(() => resetStemLab());

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

describe('Coding Lab reduced motion', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('omits pulse and spin classes when reduced motion is requested', () => {
    const html = renderCoding(true);
    expect(html).toContain('Running... step');
    expect(html).toContain('Thinking...');
    expect(html).not.toContain('animate-pulse');
    expect(html).not.toContain('animate-spin');
  });

  it('retains state animations when reduced motion is not requested', () => {
    const html = renderCoding(false);
    expect(html).toContain('animate-pulse');
    expect(html).toContain('animate-spin');
  });

  it('keeps the loading spinner decorative while exposing the status text', () => {
    const html = renderCoding(true);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('Thinking...');
  });
});
