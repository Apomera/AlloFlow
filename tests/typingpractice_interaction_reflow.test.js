import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');

function extractFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Function not found: ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

describe('Typing Practice interaction and reflow refinements', () => {
  it('moves and activates drill filters with Arrow, Home, and End keys', () => {
    const handler = Function('return (' + extractFunction('handleTypingPracticeFilterKeys') + ')')();
    const buttons = Array.from({ length: 3 }, () => ({ focus: vi.fn(), click: vi.fn() }));
    const eventFor = (key, target) => ({
      key,
      target,
      currentTarget: { querySelectorAll: () => buttons },
      preventDefault: vi.fn()
    });

    const right = eventFor('ArrowRight', buttons[1]);
    handler(right);
    expect(right.preventDefault).toHaveBeenCalledOnce();
    expect(buttons[2].focus).toHaveBeenCalledOnce();
    expect(buttons[2].click).toHaveBeenCalledOnce();

    const wrap = eventFor('ArrowLeft', buttons[0]);
    handler(wrap);
    expect(buttons[2].focus).toHaveBeenCalledTimes(2);

    const home = eventFor('Home', buttons[2]);
    handler(home);
    expect(buttons[0].focus).toHaveBeenCalledOnce();

    const end = eventFor('End', buttons[0]);
    handler(end);
    expect(buttons[2].focus).toHaveBeenCalledTimes(3);
  });

  it('does not consume unrelated keys in the filter group', () => {
    const handler = Function('return (' + extractFunction('handleTypingPracticeFilterKeys') + ')')();
    const event = { key: 'Tab', preventDefault: vi.fn() };
    handler(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('provides stable accessible names for every routed view', () => {
    const label = Function('return (' + extractFunction('typingPracticeViewLabel') + ')')();
    expect(label('menu')).toBe('Typing Practice home');
    expect(label('drill-intro')).toBe('Drill preparation');
    expect(label('summary')).toBe('Typing session summary');
    expect(label('progress')).toBe('Progress and goals');
    expect(label('tradeoffHunt')).toBe('Typing target tradeoff activity');
    expect(label('unknown')).toBe('Typing Practice');
  });

  it('restores navigation focus without stealing active-drill input', () => {
    expect(source).toContain('var viewRegionRef = useRef(null)');
    expect(source).toContain("if (state.view === 'drill') return;");
    expect(source).toContain('region.focus({ preventScroll: true })');
    expect(source).toContain("'aria-label': typingPracticeViewLabel(state.view)");
    expect(source).toContain("className: 'tp-view-shell'");
  });

  it('uses zoom-safe chart targets and returns focus after closing details', () => {
    expect(source).toContain("className: 'tp-session-chart'");
    expect(source).toContain("className: 'tp-session-bar'");
    expect(source).toContain("className: 'tp-session-bar-fill'");
    expect(source).toContain("flex: '1 0 24px'");
    expect(source).toContain("'aria-expanded': compareMode ? undefined");
    expect(source).toContain("document.querySelector('[data-session-index");
    expect(source).toContain("className: 'tp-table-scroll tp-progress-comparison'");
    expect(source).toContain("minWidth: '520px'");
  });

  it('enforces touch sizing and motion-safe chart feedback', () => {
    expect(source).toContain("'@media (pointer: coarse) {'");
    expect(source).toContain("'.tp-root button { touch-action: manipulation; }'");
    expect(source).toContain("minHeight: '44px'");
    expect(source).toContain("'  .tp-root .tp-session-bar-fill { transition: none !important; transform: none !important; }'");
  });

  it('announces both filter context and query text with result totals', () => {
    expect(source).toContain('var drillResultSummary = visibleDrillIds.length');
    expect(source).toContain("' shown in ' + (drillFilterLabels[drillFilter] || 'all drills')");
    expect(source).toContain('}, drillResultSummary)');
  });

  it('moves through session bars with Arrow, Home, and End without selecting them', () => {
    const scroll = vi.fn();
    const handler = Function('scrollTypingPracticeIntoView', 'return (' + extractFunction('handleTypingPracticeSessionBarKeys') + ')')(scroll);
    const bars = Array.from({ length: 4 }, () => ({ focus: vi.fn(), click: vi.fn() }));
    const eventFor = (key, target) => ({
      key,
      target,
      currentTarget: { querySelectorAll: () => bars },
      preventDefault: vi.fn()
    });

    const right = eventFor('ArrowRight', bars[1]);
    handler(right);
    expect(right.preventDefault).toHaveBeenCalledOnce();
    expect(bars[2].focus).toHaveBeenCalledOnce();
    expect(bars[2].click).not.toHaveBeenCalled();
    expect(scroll).toHaveBeenLastCalledWith(bars[2], 'nearest');

    handler(eventFor('ArrowLeft', bars[0]));
    expect(bars[3].focus).toHaveBeenCalledOnce();
    handler(eventFor('Home', bars[2]));
    expect(bars[0].focus).toHaveBeenCalledOnce();
    handler(eventFor('End', bars[1]));
    expect(bars[3].focus).toHaveBeenCalledTimes(2);
  });

  it('keeps custom-drill validation persistent and programmatically connected', () => {
    expect(source).toContain("var customDraftStatus = atCapacity");
    expect(source).toContain("? 'Library full. Delete a saved drill before adding another.'");
    expect(source).not.toContain('(atCapacity && !isValidDraft)');
    expect(source).toContain("'aria-describedby': 'tp-custom-text-count tp-custom-text-status'");
    expect(source).toContain("'aria-invalid': showDraftError ? 'true' : 'false'");
    expect(source).toContain("'aria-errormessage': showDraftError ? 'tp-custom-text-status' : undefined");
    expect(source).toContain("id: 'tp-custom-text-status'");
    expect(source).toContain("'aria-describedby': 'tp-custom-text-status'");
  });

  it('connects passage generation loading and errors to the triggering action', () => {
    expect(source).toContain("'aria-busy': genLoading ? 'true' : 'false'");
    expect(source).toContain("id: 'tp-passage-generation-error'");
    expect(source).toContain("id: 'tp-passage-generation-status'");
    expect(source).toContain("'aria-describedby': genError ? 'tp-passage-generation-error'");
    expect(source).toContain("'aria-describedby': 'tp-passage-topic-help tp-passage-topic-count'");
  });

  it('focuses the drill library before scrolling keyboard users to it', () => {
    const scroll = vi.fn();
    const focusLibrary = Function('scrollTypingPracticeIntoView', 'return (' + extractFunction('focusTypingPracticeLibrary') + ')')(scroll);
    const library = { focus: vi.fn() };
    focusLibrary(library);
    expect(library.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(scroll).toHaveBeenCalledWith(library, 'start');
    expect(source).toContain("tabIndex: -1, 'aria-labelledby': 'tp-drill-library-title'");
    expect(source).toContain('focusTypingPracticeLibrary(library)');
  });

  it('changes the live result message when sorting changes', () => {
    expect(source).toContain('var drillSortLabels = {');
    expect(source).toContain("quickest: 'shortest first'");
    expect(source).toContain("', sorted ' + (drillSortLabels[drillSort] || 'recommended first')");
  });

  it('announces favorite changes and preserves focus when a filtered card disappears', () => {
    expect(source).toContain("var removingFavorite = idx !== -1");
    expect(source).toContain("setAnnounceText((removingFavorite ? 'Removed ' : 'Added ')");
    expect(source).toContain("if (removingFavorite && drillFilter === 'favorites')");
    expect(source).toContain("document.querySelector('#tp-drill-results .tp-favorite-toggle')");
    expect(source).toContain("'data-favorite-drill': drill.id");
  });
});
