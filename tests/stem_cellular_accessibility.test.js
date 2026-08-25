import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_cellular.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_cellular.js');

describe('Cellular Lab accessibility', () => {
  beforeEach(() => resetStemLab());

  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(readFileSync(sourcePath, 'utf8'));
  });

  it('uses a semantic tool title and focus-panel heading', () => {
    const source = readFileSync(sourcePath, 'utf8');
    expect(source).toContain("h('h1', { style: { margin: 0, fontSize: '17px', fontWeight: 800 } }, 'Cellular Automaton Lab')");
    expect(source).toContain("h('h2', { style: { margin: '2px 0 0', fontSize: '16px', fontWeight: 900, color: C.text } }, 'Pick the world you want to investigate')");
  });

  it('chooses text tokens for the host surface rather than dark app chrome', () => {
    loadTool('stem_lab/stem_tool_cellular.js', 'cellularLab');
    const light = renderTool('cellularLab', {}, { theme: 'light', isDark: false, isContrast: false });
    const darkApp = renderTool('cellularLab', {}, { theme: 'dark', isDark: true, isContrast: false });
    const contrast = renderTool('cellularLab', {}, { theme: 'contrast', isDark: true, isContrast: true });

    expect(darkApp).toBe(light);
    expect(contrast).not.toBe(light);
  });
});
