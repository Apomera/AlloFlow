import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_playlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_playlab.js');

describe('Play Lab workspace tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives workspace tabs roving focus and panel linkage', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.playlab.workspace'");
    expect(source).toContain("var PLAYLAB_WORKSPACE_TABS = ['field', 'scout'];");
    expect(source).toContain("id: 'playlab-workspace-tab-' + wt.id");
    expect(source).toContain("'aria-controls': 'playlab-workspace-panel-' + wt.id");
    expect(source).toContain("onKeyDown: function(e) { playLabWorkspaceTabKeyDown(e, PLAYLAB_WORKSPACE_TABS.indexOf(wt.id)); }");
    expect(source).toContain("id: 'playlab-workspace-panel-' + (workspaceTab || 'field')");
    expect(source).toContain("'aria-labelledby': 'playlab-workspace-tab-' + (workspaceTab || 'field')");
  });
});
