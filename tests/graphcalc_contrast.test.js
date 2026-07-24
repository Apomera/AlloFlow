import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_FILE = 'stem_lab/stem_tool_graphcalc.js';
const PUBLIC_FILE = 'desktop/web-app/public/stem_lab/stem_tool_graphcalc.js';

function read(path) {
  return readFileSync(path, 'utf8');
}

function renderGraphCalc(toolData) {
  loadTool(SOURCE_FILE, 'graphCalc');
  return renderTool('graphCalc', toolData || {});
}

describe('Graphing Calculator theme contrast', () => {
  beforeEach(() => resetStemLab());

  it('keeps source and public copies aligned', () => {
    expect(read(PUBLIC_FILE)).toBe(read(SOURCE_FILE));
  });

  it('defines readable local tokens for light, dark, and high contrast themes', () => {
    const source = read(SOURCE_FILE);

    expect(source).toContain('allo-graphcalc-contrast-css');
    expect(source).toContain('.graphcalc-shell{--gc-panel');
    expect(source).toContain('--gc-accent:#4338ca');
    expect(source).toContain('--gc-muted:#475569');
    expect(source).toContain('.theme-dark .graphcalc-shell');
    expect(source).toContain('--gc-muted:#cbd5e1');
    expect(source).toContain('.theme-contrast .graphcalc-shell');
    expect(source).toContain('--gc-button-text:var(--allo-stem-button-text,#000)');
  });

  it('renders the main panel with contrast tokens instead of washed-out lavender controls', () => {
    const html = renderGraphCalc({});

    expect(html).toContain('class="graphcalc-shell"');
    expect(html).toContain('color:var(--gc-text)');
    expect(html).toContain('color:var(--gc-muted)');
    expect(html).toContain('color:var(--gc-button-text)');
    expect(html).toContain('background:var(--gc-card)');
    expect(html).not.toContain('rgba(255,255,255,0.05)');
    expect(html).not.toContain('color:#a5b4fc');
  });

  it('keeps the secondary tabs readable too', () => {
    ['challenge', 'ai', 'badges', 'inquiry'].forEach((sideTab) => {
      const html = renderGraphCalc({ graphCalc: { _sideTab: sideTab } });

      expect(html).toContain('class="graphcalc-shell"');
      expect(html).toContain('color:var(--gc-text)');
      expect(html).toContain('var(--gc-border)');
      expect(html).not.toContain('color:#94a3b8');
      expect(html).not.toContain('background:rgba(99,102,241,0.1)');
    });
  });

  it('keeps optional calculator panels on the readable token system', () => {
    const html = renderGraphCalc({
      graphCalc: {
        showTable: true,
        showWindow: true,
        showSliders: true,
        showDeriv: true,
        showAnalysis: true
      }
    });

    expect(html).toContain('WINDOW:');
    expect(html).toContain('var(--gc-button-bg)');
    expect(html).toContain('background:var(--gc-card)');
    expect(html).toContain('border-top:1px solid var(--gc-border)');
    expect(html).not.toContain('color:var(--allo-stem-text-soft, #94a3b8)');
    expect(html).not.toContain('background:rgba(30,27,75,0.9)');
  });
});
