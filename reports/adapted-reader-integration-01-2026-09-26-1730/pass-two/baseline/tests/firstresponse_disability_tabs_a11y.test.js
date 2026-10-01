import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_firstresponse.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_firstresponse.js');

describe('First Response Disability-aware tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives Disability-aware tabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.firstresponse.disability_aware_sections'");
    expect(source).toContain("var DISABILITY_TAB_IDS = ['overview', 'deaf', 'autism', 'seizure', 'diabetes', 'hidden', 'self'];");
    expect(source).toContain("id: 'firstresponse-disability-tab-' + id");
    expect(source).toContain("'aria-controls': 'firstresponse-disability-panel-' + id");
    expect(source).toContain("'aria-selected': active ? 'true' : 'false'");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { disabilityTabKeyDown(e, DISABILITY_TAB_IDS.indexOf(id)); }');
    expect(source).toContain("key !== 'ArrowRight' && key !== 'ArrowDown'");
    expect(source).toContain("key === 'ArrowLeft' || key === 'ArrowUp'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("key === 'End'");
  });

  it('links the active Disability-aware section to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("id: 'firstresponse-disability-panel-' + daSection");
    expect(source).toContain("'aria-labelledby': 'firstresponse-disability-tab-' + daSection");
    expect(source).toContain('tabIndex: 0');
  });
});
