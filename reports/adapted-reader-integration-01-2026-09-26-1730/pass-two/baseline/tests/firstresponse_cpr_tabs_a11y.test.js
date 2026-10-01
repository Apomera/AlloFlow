import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_firstresponse.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_firstresponse.js');

describe('First Response CPR + AED tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives CPR + AED tabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.firstresponse.cpr_aed_sections'");
    expect(source).toContain("var CPR_TAB_IDS = ['overview', 'metronome', 'practice', 'aed'];");
    expect(source).toContain("id: 'firstresponse-cpr-tab-' + id");
    expect(source).toContain("'aria-controls': 'firstresponse-cpr-panel-' + id");
    expect(source).toContain("'aria-selected': active ? 'true' : 'false'");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { cprTabKeyDown(e, CPR_TAB_IDS.indexOf(id)); }');
    expect(source).toContain("key !== 'ArrowRight' && key !== 'ArrowDown'");
    expect(source).toContain("key === 'ArrowLeft' || key === 'ArrowUp'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("key === 'End'");
  });

  it('links the active CPR + AED section to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("id: 'firstresponse-cpr-panel-' + cprView");
    expect(source).toContain("'aria-labelledby': 'firstresponse-cpr-tab-' + cprView");
    expect(source).toContain('tabIndex: 0');
  });
});
