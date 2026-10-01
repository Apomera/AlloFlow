import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Geology Explorer scene tabs accessibility', () => {
  it('keeps mirrored source aligned and exposes keyboard-operable scene tabs', () => {
    const source = readFileSync('stem_lab/stem_tool_geologyexplorer.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_geologyexplorer.js', 'utf8')).toBe(source);
    expect(source).toContain("var GEOLOGY_SCENE_ORDER = Object.keys(SCENES);");
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("id: 'stem-geology-tab-' + sid");
    expect(source).toContain("'aria-controls': 'stem-geology-panel-' + sid");
    expect(source).toContain("tabIndex: on ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { geologySceneTabKeyDown(e, sceneIndex); }");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel', id: 'stem-geology-panel-' + scene");
    expect(source).toContain("'aria-labelledby': 'stem-geology-tab-' + scene");
  });
});
