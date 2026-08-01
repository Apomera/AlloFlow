import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_autorepair.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_autorepair.js');

describe('AutoRepair Diagnose tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives Diagnose tabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.autorepair.diagnose_sub_modes'");
    expect(source).toContain("var DX_TAB_IDS = ['overview', 'obd', 'listen', 'listenQuiz', 'fluid', 'visual'];");
    expect(source).toContain("id: 'autorepair-diagnose-tab-' + id");
    expect(source).toContain("'aria-controls': 'autorepair-diagnose-panel-' + id");
    expect(source).toContain("'aria-selected': active ? 'true' : 'false'");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { dxTabKeyDown(e, DX_TAB_IDS.indexOf(id)); }');
    expect(source).toContain("key !== 'ArrowRight' && key !== 'ArrowDown'");
    expect(source).toContain("key === 'ArrowLeft' || key === 'ArrowUp'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("key === 'End'");
  });

  it('links the active Diagnose mode to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("id: 'autorepair-diagnose-panel-' + dxView");
    expect(source).toContain("'aria-labelledby': 'autorepair-diagnose-tab-' + dxView");
    expect(source).toContain('tabIndex: 0');
  });
});
