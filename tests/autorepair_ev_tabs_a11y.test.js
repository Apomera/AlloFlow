import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_autorepair.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_autorepair.js');

describe('AutoRepair EV tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives EV tabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.autorepair.ev_sections'");
    expect(source).toContain("var EV_TAB_IDS = ['overview', 'safety', 'diffs'];");
    expect(source).toContain("type: 'button'");
    expect(source).toContain("id: 'autorepair-ev-tab-' + id");
    expect(source).toContain("'aria-controls': 'autorepair-ev-panel-' + id");
    expect(source).toContain("'aria-selected': active ? 'true' : 'false'");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { evTabKeyDown(e, EV_TAB_IDS.indexOf(id)); }');
    expect(source).toContain("key !== 'ArrowRight' && key !== 'ArrowDown'");
    expect(source).toContain("key === 'ArrowLeft' || key === 'ArrowUp'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("key === 'End'");
  });

  it('links every EV section to a stable reciprocal tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'data-ar-ev-panel': id");
    expect(source).toContain("id: 'autorepair-ev-panel-' + id");
    expect(source).toContain("'aria-labelledby': 'autorepair-ev-tab-' + id");
    expect(source).toContain('hidden: active ? undefined : true');
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain("evPanel('overview'");
    expect(source).toContain("evPanel('safety'");
    expect(source).toContain("evPanel('diffs'");
  });
});
