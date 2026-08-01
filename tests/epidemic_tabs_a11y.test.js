import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Epidemic Lab mode tabs accessibility', () => {
  it('keeps mirrored source aligned and exposes keyboard-operable mode tabs', () => {
    const source = readFileSync('stem_lab/stem_tool_epidemic.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_epidemic.js', 'utf8')).toBe(source);
    expect(source).toContain("var epiTabKeyDown = function(e, index)");
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("id: 'stem-epidemic-tab-' + st.id");
    expect(source).toContain("'aria-controls': 'stem-epidemic-panel-' + st.id");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { epiTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel', id: 'stem-epidemic-panel-' + tab");
    expect(source).toContain("'aria-labelledby': 'stem-epidemic-tab-' + tab");
  });
});
