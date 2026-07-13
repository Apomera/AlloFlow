// Regression guard for the echolocation biology-tab comma-operator bug (same
// class as beehive). renderBiologyTab() returned a 3-element comma sequence:
//   return h('div',{space-y-4}, subTabs, anatomySection),
//          bioSection==='species'      && h(...),
//          bioSection==='conservation' && h(...);
// The space-y-4 container closed after the anatomy section (line ~4041), so the
// Species Gallery and Conservation sections were comma operands. The comma
// operator returns only the LAST, so: the sub-tab switcher (in operand[0]) was
// always discarded, the Species Gallery NEVER rendered, and the tab showed only
// the bare Conservation section (and only when bioSection happened to be
// 'conservation' — unreachable without the tabs). Otherwise the tab was blank.
// Fix: space-y-4 now wraps all three gated sections + the sub-tabs.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_echolocation.js', 'echolocation'); });
const render = (state) => renderTool('echolocation', { echolocation: state });

describe('echolocation — biology tab wraps every section (comma-operator regression)', () => {
  it('species section: renders the sub-tab switcher AND the Species Gallery (was discarded)', () => {
    const html = render({ tab: 'biology', bioSection: 'species' });
    expect(html).toContain('Biology sections');    // sub-tab switcher (operand[0], previously discarded)
    expect(html).toContain('Bat Species Gallery');  // operand[1] — never rendered before the fix
  });

  it('anatomy section (default): renders the sub-tab switcher, not a blank tab', () => {
    const html = render({ tab: 'biology', bioSection: 'anatomy' });
    expect(html).toContain('Biology sections');
    expect(html.length).toBeGreaterThan(500);
  });

  it('conservation section: renders alongside the sub-tabs (not bare/orphaned)', () => {
    const html = render({ tab: 'biology', bioSection: 'conservation' });
    expect(html).toContain('Biology sections');
  });
});
