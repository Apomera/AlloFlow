import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

// Access Lens is built for students who are blind or have low vision, so its
// cautions are a safety feature, not boilerplate. The existing tab test greps
// the source text and would pass with every one of these removed, so this
// suite renders the real component and asserts what a student is actually told.

const src = fs.readFileSync('stem_lab/stem_tool_accesslens.js', 'utf8');

function render(opts) {
  opts = opts || {};
  resetStemLab();
  loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
  const ctx = { React, toolData: {}, isDark: !!opts.dark, isContrast: !!opts.contrast,
    setToolData() {}, updateMulti() {}, gradeBand: 'g68' };
  return ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.accessLens.render(ctx));
}

describe('Access Lens safety guidance', () => {
  let html;
  beforeAll(() => { html = render(); });

  it('warns against the uses where being wrong would hurt, before any photo', () => {
    // The banner lives in the capture panel, which renders with no photo taken.
    for (const use of ['cross a road', 'path is clear', 'identify medicine', 'safe to eat', 'warning label']) {
      expect(html, use).toContain(use);
    }
    expect(html).toContain('ask a person');
  });

  it('does not tell a blind student to check the answer by looking', () => {
    // The old disclaimer said 'Check it against what you can observe yourself',
    // which is advice the headline user of this tool cannot act on.
    expect(html).not.toContain('observe yourself');
    // Scoped to the shipped copy: the comment above the fix quotes the old
    // wording on purpose, and a bare source search would match that.
    const literals = src.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    expect(literals).not.toContain('observe yourself');
  });

  it('offers a check that does not require sight', () => {
    expect(src).toContain('Ask someone you trust');
  });

  it('says the AI can miss what is there and invent what is not', () => {
    expect(src).toContain('miss things that are there');
    expect(src).toContain('describe things that are not');
  });

  it('keeps the cautions at readable size, not the smallest text on screen', () => {
    // 11px in the faintest palette colour was the smallest, lowest-contrast
    // text in a tool for low-vision students.
    const disclaimer = src.slice(src.indexOf('function aiDisclaimer'), src.indexOf('function speakBtn'));
    expect(disclaimer).not.toContain("fontSize: '11px'");
    expect(disclaimer).not.toContain('color: C.sub');
    const sizes = [...disclaimer.matchAll(/fontSize: '(\d+(?:\.\d+)?)px'/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    for (const px of sizes) expect(px).toBeGreaterThanOrEqual(13);
  });

  it('renders the safety banner in dark and high-contrast themes too', () => {
    for (const opts of [{ dark: true }, { contrast: true }, { dark: true, contrast: true }]) {
      const out = render(opts);
      expect(out, JSON.stringify(opts)).toContain('not for staying safe');
      expect(out, JSON.stringify(opts)).toContain('cross a road');
    }
  });

  it('ships the same guidance in the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_accesslens.js', 'utf8')).toBe(src);
  });
});
