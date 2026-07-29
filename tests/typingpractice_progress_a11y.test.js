import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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

function snippetAfter(marker, length = 1100) {
  const start = source.indexOf(marker);
  expect(start, 'Missing marker: ' + marker).toBeGreaterThanOrEqual(0);
  return source.slice(start, start + length);
}

describe('Typing Practice Progress accessibility and UX', () => {
  it('formats filter presets as local calendar dates', () => {
    const format = Function('return (' + extractFunction('typingPracticeLocalDateInputValue') + ')')();
    expect(format(new Date(2026, 0, 2, 23, 55))).toBe('2026-01-02');
    expect(format(new Date(2026, 10, 9, 0, 5))).toBe('2026-11-09');
    expect(format('not-a-date')).toBe('');
    expect(source).toContain('new Date(t.getTime() - 29*24*60*60*1000)');
    expect(source).toContain('new Date(t.getTime() - 89*24*60*60*1000)');
  });

  it('names filter groups and exposes selected quick ranges', () => {
    expect(source).toContain("allSessions.length > 0 ? h('section', {");
    expect(source).toContain("'aria-labelledby': 'tp-report-filters-title'");
    expect(source).toContain("role: 'group', 'aria-label': 'Quick date ranges'");
    const preset = snippetAfter("key: 'fpreset-' + preset.id");
    expect(preset).toContain("type: 'button'");
    expect(preset).toContain("'aria-pressed': isActive ? 'true' : 'false'");
  });

  it('identifies reversed date ranges and preserves the previous exploration state safely', () => {
    expect(source).toContain('var filterRangeInvalid = !!(filterStart && filterEnd && filterStart > filterEnd);');
    expect(source).toContain("id: 'tp-filter-range-error'");
    expect(source).toContain("role: 'alert'");
    for (const id of ['tp-filter-start', 'tp-filter-end']) {
      const block = snippetAfter("id: '" + id + "'");
      expect(block).toContain("'aria-invalid': filterRangeInvalid ? 'true' : 'false'");
      expect(block).toContain("'aria-errormessage': filterRangeInvalid ? 'tp-filter-range-error' : undefined");
    }
    expect(source).toContain('var resetProgressExploration = function()');
    expect(source).toContain('setCompareMode(false);');
    expect(source).toContain('setCompareSelections([]);');
    expect(source).toContain('onClick: clearProgressFilters');
  });

  it('uses a roving chart entry point with complete keyboard guidance', () => {
    expect(source).toContain("tabIndex: (isSelected || isComparePick || (selectedDetailIdx === null && compareSelections.length === 0 && i === 0)) ? 0 : -1");
    expect(source).toContain('Press Tab once to enter the chart.');
    expect(source).toContain("setAnnounceText('Session comparison mode on. Select two sessions.')");
    expect(source).toContain("'Two sessions selected. Comparison table ready.'");
    expect(source).toContain("'aria-hidden': 'true'");
    expect(source).not.toContain("'aria-label': 'Baseline reference");
  });

  it('structures session details and names all editing controls', () => {
    expect(source).toContain("'aria-labelledby': 'tp-session-detail-title'");
    expect(source).toContain("h('dl', { 'aria-label': 'Session metrics'");
    expect(source).toContain("h('dt', { style:");
    expect(source).toContain("h('dd', { style:");
    expect(source).toContain("role: 'group', 'aria-labelledby': 'tp-session-tag-label'");
    expect(source).toContain("role: 'group', 'aria-labelledby': 'tp-session-reflection-label'");
    for (const marker of ["key: 'retag-'", "key: 'rerefl-'"]) {
      const block = snippetAfter(marker);
      expect(block).toContain("type: 'button'");
      expect(block).toContain("'aria-pressed': isActive ? 'true' : 'false'");
    }
  });

  it('provides explicit note save and cancel behavior', () => {
    expect(source).toContain("htmlFor: 'tp-session-note'");
    expect(source).toContain("id: 'tp-session-note-help'");
    expect(source).toContain("'aria-describedby': 'tp-session-note-help'");
    expect(source).toContain("v ? 'Session note saved.' : 'Session note cleared.'");
    expect(source).toContain("e.currentTarget.value = d.note || '';");
    expect(source).toContain("setAnnounceText('Session note edit canceled.')");
  });

  it('labels comparison and report regions and announces report actions', () => {
    expect(source).toContain("'aria-labelledby': 'tp-session-comparison-title'");
    expect(source).toContain("'aria-describedby': 'tp-session-comparison-legend'");
    expect(source).toContain("'aria-label': 'Progress report actions'");
    expect(source).toContain("setAnnounceText('Progress report copied to the clipboard.')");
    expect(source).toContain("setAnnounceText('Progress CSV download started.')");
    expect(source).toContain("setAnnounceText('Parent summary copied to the clipboard.')");
  });

  it('gives both empty states a named recovery path', () => {
    expect(source).toContain("'aria-labelledby': 'tp-progress-empty-title'");
    expect(source).toContain("'aria-labelledby': 'tp-filter-empty-title'");
    expect(source).toContain("}, 'Choose a drill')");
    expect(source).toContain('(sessions.length === 0 && allSessions.length > 0 && !filterRangeInvalid)');
  });
});
