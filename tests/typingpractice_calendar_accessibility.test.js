import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'stem_lab/stem_tool_typingpractice.js');
const mirrorPath = path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js');
const source = fs.readFileSync(sourcePath, 'utf8');

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
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

describe('Typing Practice calendar accessibility and measurement integrity', () => {
  it('summarizes participation separately from comparable performance', () => {
    const summarize = Function(
      'return (' + extractFunction('typingPracticeCalendarStats') + ')'
    )();
    expect(summarize([
      { count: 0, totalChars: 0, comparable: 0, assisted: 0, best: 0 },
      { count: 3, totalChars: 450, comparable: 2, assisted: 1, best: 34 },
      { count: 1, totalChars: 90, comparable: 0, assisted: 1, best: 0 }
    ])).toEqual({
      practiceDays: 2,
      sessions: 4,
      characters: 540,
      comparableSessions: 2,
      assistedSessions: 2,
      bestComparableWpm: 34
    });
  });

  it('excludes assisted sessions from each day’s best speed', () => {
    expect(source).toContain("if (s.measurementComparable === false)");
    expect(source).toContain('bucket[key].assisted += 1');
    expect(source).toContain('bucket[key].best = Math.max');
    expect(source).toContain(
      "' included in participation totals and excluded from best speed.'"
    );
  });

  it('provides a visible summary and native day-by-day disclosure table', () => {
    expect(source).toContain("id: 'tp-practice-calendar-summary'");
    expect(source).toContain("'aria-labelledby': 'tp-practice-calendar-summary'");
    expect(source).toContain("h('details'");
    expect(source).toContain("'View day-by-day calendar data'");
    expect(source).toContain("h('table', { className: 'tp-calendar-table' }");
    expect(source).toContain("h('caption'");
    expect(source).toContain("h('th', { scope: 'col' }, 'Best comparable WPM')");
    expect(source).toContain("h('th', { scope: 'row' }");
  });

  it('marks the redundant color grid visual-only and supports narrow reflow', () => {
    expect(source).toContain("className: 'tp-practice-calendar-grid'");
    expect(source).toContain("'aria-hidden': 'true'");
    expect(source).toContain(
      "'.tp-root .tp-practice-calendar-grid { display: grid; grid-template-columns: repeat(15, minmax(12px, 1fr)); gap: 3px; }'"
    );
    expect(source).toContain(
      "'  .tp-root .tp-practice-calendar-grid { grid-template-columns: repeat(10, minmax(16px, 1fr)) !important; }'"
    );
    expect(source).toContain(".tp-calendar-day-active { background: Highlight !important;");
  });

  it('keeps the desktop mirror identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });
});
