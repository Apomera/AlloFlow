import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_allobotsage.js');
const mirrorPath = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_allobotsage.js');

describe('AlloBot Sage dialog accessibility', () => {
  beforeEach(() => resetStemLab());

  it('keeps mirrored deploy files identical and removes native dialogs', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const mirror = readFileSync(mirrorPath, 'utf8');
    expect(mirror).toBe(source);
    expect(source).not.toContain("typeof prompt === 'function'");
    expect(source).not.toContain("typeof confirm === 'function'");
    expect(source).not.toContain('window.prompt(');
    expect(source).not.toContain('window.confirm(');
    expect(source).toContain('window.AlloModules.PromptDialog.PromptDialog');
    expect(source).toContain('window.AlloModules.ConfirmDialog.ConfirmDialog');
    expect(source).toContain('maxLength: 24');
  });

  it('renders the preset controls in the loadout phase', () => {
    loadTool('stem_lab/stem_tool_allobotsage.js', 'alloBotSage');
    const html = renderTool('alloBotSage', {
      spaceExplorer: { completedMissions: 3, totalScience: 150 },
      alloBotSage: { phase: 'loadout', equippedLoadout: ['quantum_leap'], loadoutPresets: [] },
    });
    expect(html).toContain('Loadout Presets');
    expect(html).toContain('Save current');
  });
});
