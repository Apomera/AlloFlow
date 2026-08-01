import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_firstresponse.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_firstresponse.js');

describe('First Response Call tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives Call sections tab semantics and roving keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.firstresponse.call_module_sections'");
    expect(source).toContain("var CALL_TAB_IDS = ['overview', 'tap-to-call', 'practice'];");
    expect(source).toContain("role: 'tab'");
    expect(source).toContain("id: 'firstresponse-call-tab-' + id");
    expect(source).toContain("'aria-controls': 'firstresponse-call-panel-' + id");
    expect(source).toContain("'aria-selected': active ? 'true' : 'false'");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { callTabKeyDown(e, CALL_TAB_IDS.indexOf(id)); }');
    expect(source).toContain("key !== 'ArrowRight' && key !== 'ArrowDown'");
    expect(source).toContain("key === 'ArrowLeft' || key === 'ArrowUp'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("key === 'End'");
  });

  it('links the active Call section to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("id: 'firstresponse-call-panel-' + callView");
    expect(source).toContain("'aria-labelledby': 'firstresponse-call-tab-' + callView");
    expect(source).toContain('tabIndex: 0');
    expect(source).toContain("'aria-label': __alloT('stem.firstresponse.hypothesis_input', 'First-aid readiness hypothesis')");
    expect(source).toContain("'aria-label': __alloT('stem.firstresponse.explanation_input', 'First-aid readiness explanation')");
  });
});
