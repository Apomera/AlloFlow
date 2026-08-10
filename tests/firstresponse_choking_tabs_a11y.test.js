import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_firstresponse.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_firstresponse.js');

describe('First Response Choking tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives Choking tabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.firstresponse.choking_module_sections'");
    expect(source).toContain("var CHOKING_TAB_IDS = ['select', 'practice', 'protocol'];");
    expect(source).toContain("id: 'firstresponse-choking-tab-' + id");
    expect(source).toContain("'aria-controls': 'firstresponse-choking-panel-' + id");
    expect(source).toContain("'aria-selected': active ? 'true' : 'false'");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { chokingTabKeyDown(e, CHOKING_TAB_IDS.indexOf(id)); }');
    expect(source).toContain("key !== 'ArrowRight' && key !== 'ArrowDown'");
    expect(source).toContain("key === 'ArrowLeft' || key === 'ArrowUp'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("key === 'End'");
  });

  it('links the active Choking section to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("id: 'firstresponse-choking-panel-' + chokeView");
    expect(source).toContain("'aria-labelledby': 'firstresponse-choking-tab-' + chokeView");
    expect(source).toContain('tabIndex: 0');
  });

  it('pins the interactive 2025 choking sequence and training boundary', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("tabBtn('practice', 'Interactive practice')");
    expect(source).toContain("p.sequence.push('five-back-blows')");
    expect(source).toContain("p.sequence.push('five-thrusts')");
    expect(source).toContain("p.sequence.push('start-cpr-compressions')");
    expect(source).toContain("p.sequence.push('remove-visible-object-only')");
    expect(source).toContain('Never use abdominal thrusts on an infant');
    expect(source).toContain('In late pregnancy, use chest thrusts on the center of the breastbone');
    expect(source).toContain('It cannot assess real force, hand position, body support, or skill quality');
    expect(source).toContain("role: 'status', 'aria-live': 'polite'");
  });
});
