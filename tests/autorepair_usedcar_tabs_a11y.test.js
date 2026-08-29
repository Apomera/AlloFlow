import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_autorepair.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_autorepair.js');

describe('AutoRepair Used-Car tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives Used-Car tabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.autorepair.used_car_sub_modes'");
    expect(source).toContain("var USED_CAR_TAB_IDS = ['overview', 'flags', 'walk'];");
    expect(source).toContain("id: 'autorepair-usedcar-tab-' + id");
    expect(source).toContain("'aria-controls': 'autorepair-usedcar-panel-' + id");
    expect(source).toContain("'aria-selected': active ? 'true' : 'false'");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { usedCarTabKeyDown(e, USED_CAR_TAB_IDS.indexOf(id)); }');
    expect(source).toContain("key !== 'ArrowRight' && key !== 'ArrowDown'");
    expect(source).toContain("key === 'ArrowLeft' || key === 'ArrowUp'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("key === 'End'");
  });

  it('keeps every Used-Car tab linked to a stable reciprocal panel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('function usedCarPanel(id, content)');
    expect(source).toContain("id: 'autorepair-usedcar-panel-' + id");
    expect(source).toContain("'aria-labelledby': 'autorepair-usedcar-tab-' + id");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('hidden: active ? undefined : true');
    expect(source).toContain("'data-ar-usedcar-panel': id");
    expect(source).toContain("'data-ar-panel-state': active ? 'active' : 'inactive'");
  });
});
