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

function snippet(marker, length = 900) {
  const start = source.indexOf(marker);
  expect(start, 'Missing marker: ' + marker).toBeGreaterThanOrEqual(0);
  return source.slice(start, start + length);
}

describe('Typing Practice dynamic result announcements', () => {
  it('debounces changed messages and cancels superseded announcements', () => {
    const component = extractFunction('TypingPracticeDebouncedStatus');
    expect(component).toContain("React.useState('')");
    expect(component).toContain('React.useRef(message)');
    expect(component).toContain('if (message === previousMessageRef.current) return');
    expect(component).toContain('Math.max(200, Number(props.delay) || 400)');
    expect(component).toContain('setTimeout(function()');
    expect(component).toContain('return function() { clearTimeout(timer); }');
    expect(component).toContain("'aria-relevant': 'text'");
  });

  it('keeps drill counts immediate and sends speech through one hidden status', () => {
    const visible = snippet("id: 'tp-drill-results-status'");
    expect(visible).not.toContain("role: 'status'");
    expect(visible).not.toContain("'aria-live'");
    expect(visible).toContain("id: 'tp-drill-results-announcer'");
    expect(visible).toContain('message: drillResultSummary');
    expect(visible).toContain('delay: 400');
    expect(source).toContain("'aria-describedby': 'tp-drill-results-status'");
  });

  it('debounces history counts while preserving descriptive relationships', () => {
    const visible = snippet("id: 'tp-history-count'");
    expect(visible).not.toContain("role: 'status'");
    expect(visible).not.toContain("'aria-live'");
    expect(visible).toContain("id: 'tp-history-results-announcer'");
    expect(visible).toContain('message: historyResultText');
    expect(source).toContain("'aria-describedby': 'tp-history-count'");
  });

  it('avoids parallel announcements for clear and report-filter actions', () => {
    const reportHeading = snippet("id: 'tp-report-filters-title'", 450);
    expect(reportHeading).not.toContain("'aria-live'");
    expect(reportHeading).not.toContain("'aria-atomic'");
    expect(source).not.toContain("setAnnounceText('Drill search cleared.')");
    expect(source).not.toContain("setAnnounceText('Drill filters reset. All drills are shown.')");
    expect(source).not.toContain("setAnnounceText('History note search cleared. All filtered sessions are shown.')");
    expect(source).toContain("setProgressFilters('', '', '', 'Progress filters cleared. Showing all sessions.')");
  });
});
