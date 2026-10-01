import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Unit Convert section tabs accessibility', () => {
  it('keeps mirrored source aligned and exposes keyboard-operable tabs', () => {
    const source = readFileSync('stem_lab/stem_tool_unitconvert.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_unitconvert.js', 'utf8')).toBe(source);
    expect(source).toContain("var UNIT_CONVERT_TAB_ORDER = ['convert', 'table', 'quiz', 'wordproblem', 'magHunt'];");
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("id: 'stem-unitconvert-tab-' + item[0]");
    expect(source).toContain("'aria-controls': 'stem-unitconvert-panel-' + item[0]");
    expect(source).toContain("tabIndex: tab === item[0] ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { unitConvertTabKeyDown(e, idx); }");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("'aria-labelledby': 'stem-unitconvert-tab-' + tab");
  });
});
