// Universe Explorer, fourteenth pass (2026-10-19): What If? becomes a one-at-a-time picker
// with progress chips instead of eight stacked boxes.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true, showWhatIf: true }, state) });
const count = (html, text) => html.split(text).length - 1;

describe('What If picker (pure)', () => {
  it('tells new, drafted and compared experiments apart', () => {
    expect(pure.universeWhatIfState(0, {}, [])).toBe('new');
    expect(pure.universeWhatIfState(0, { 0: '   ' }, undefined)).toBe('new');
    expect(pure.universeWhatIfState(0, { 0: 'maybe' }, [])).toBe('drafted');
    expect(pure.universeWhatIfState(3, { 3: 'maybe' }, [3])).toBe('done');
  });

  it('opens the pick, else the latest compared one, else the first', () => {
    expect(pure.universeWhatIfOpen(5, [1], 8)).toBe(5);
    expect(pure.universeWhatIfOpen(undefined, [1, 4], 8)).toBe(4);
    expect(pure.universeWhatIfOpen(undefined, [], 8)).toBe(0);
    expect(pure.universeWhatIfOpen(99, [2], 8)).toBe(2);
    expect(pure.universeWhatIfOpen(-1, undefined, 8)).toBe(0);
  });

  it('has an icon for every experiment', () => {
    expect(pure.UNIVERSE_WHATIF_ICONS.length).toBeGreaterThanOrEqual(8);
  });
});

describe('What If picker (rendered)', () => {
  it('shows eight chips but only the open experiment’s box', () => {
    const html = render({});
    expect(count(html, 'class="uni-whatif-chip"')).toBe(8);
    expect(count(html, 'class="uni-whatif-input"')).toBe(1);
    expect(html.includes('0 of 8 compared')).toBe(true);
    const other = render({ whatIfPick: 6 });
    expect(other.includes('<strong>What if protons decayed?</strong>') || other.includes('❓ What if protons decayed?')).toBe(true);
    expect(other.includes('❓ What if the Big Bang never happened?')).toBe(false);
  });

  it('counts compared experiments and marks them on their chips', () => {
    const html = render({ whatIfShown: [1, 4], whatIfNotes: { 2: 'dark' } });
    expect(html.includes('2 of 8 compared')).toBe(true);
    expect(count(html, 'data-state="done"')).toBe(2);
    expect(count(html, 'data-state="drafted"')).toBe(1);
    expect((html.match(/class="uni-whatif-chip"[^>]*aria-pressed="true"/g) || []).length).toBe(1);
  });
});
