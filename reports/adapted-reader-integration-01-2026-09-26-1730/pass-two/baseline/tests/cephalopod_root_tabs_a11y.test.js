import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_cephalopodlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_cephalopodlab.js');

describe('Cephalopod Lab root navigation accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('makes topic-area and section tabs keyboard navigable', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("var GROUP_TAB_IDS = TAB_GROUPS.map(function(g) { return g.id; });");
    expect(source).toContain("id: 'cephalopod-group-tab-' + g.id");
        // Conditional on purpose: only the selected tab's panel is rendered, so an
    // unconditional aria-controls names an element that is not in the document.
    // The reference is kept where it is real and dropped where it is not.
    expect(source).toContain("'aria-controls': on ? 'cephalopod-group-panel-' + g.id : undefined");
    expect(source).toContain("tabIndex: on ? 0 : -1");
    expect(source).toContain('onKeyDown: function(e) { groupTabKeyDown(e, gi); }');
    expect(source).toContain("var SECTION_TAB_IDS = openGroup.tabs.map(function(t) { return t.id; });");
    expect(source).toContain("id: 'cephalopod-section-tab-' + t.id");
    expect(source).toContain("'aria-controls': active ? 'cephalopod-section-panel-' + t.id : undefined");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain('onKeyDown: function(e) { sectionTabKeyDown(e, ti); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links both navigation levels to focusable panels', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'cephalopod-group-panel-' + openGroup.id");
    expect(source).toContain("'aria-labelledby': 'cephalopod-group-tab-' + openGroup.id");
    expect(source).toContain("role: 'tabpanel', id: 'cephalopod-section-panel-' + section");
    expect(source).toContain("'aria-labelledby': 'cephalopod-section-tab-' + section");
    expect(source).toContain('tabIndex: 0');
  });
});
