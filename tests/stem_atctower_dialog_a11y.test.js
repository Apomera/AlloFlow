import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_atctower.js');
const mirrorPath = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_atctower.js');

describe('ATC Tower numeric dialog accessibility', () => {
  beforeEach(() => resetStemLab());

  it('keeps mirrored deploy files identical and removes native heading/speed prompts', () => {
    const source = readFileSync(sourcePath, 'utf8');
    expect(readFileSync(mirrorPath, 'utf8')).toBe(source);
    expect(source).not.toContain("prompt('Heading for ");
    expect(source).not.toContain("prompt('Speed for ");
    expect(source).not.toContain('var hdgStr');
    expect(source).not.toContain('var spdStr');
    expect(source).toContain('window.AlloModules.PromptDialog.PromptDialog');
    expect(source).toContain('window.AlloFlowUX && window.AlloFlowUX.prompt');
    expect(source).toContain("inputType: 'number'");
    expect(source).toContain('Enter a heading from 0 to 360 degrees.');
  });

  it('still renders the ATC menu after the dialog refactor', () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const html = renderTool('atcTower', { atcTower: { view: 'menu' } });
    expect(html.length).toBeGreaterThan(200);
    expect(html).toContain('ATC');
  });
});
