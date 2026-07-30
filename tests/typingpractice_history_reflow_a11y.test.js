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

describe('Typing Practice history reflow and accessibility', () => {
  it('builds clear result announcements for search and progress filters', () => {
    const resultText = Function(
      'return (' + extractFunction('typingPracticeHistoryResultText') + ')'
    )();
    expect(resultText(3, '', false)).toBe('3 history sessions shown.');
    expect(resultText(1, '', true)).toBe(
      '1 history session shown by the active progress filters.'
    );
    expect(resultText(0, 'headache', true)).toBe(
      '0 history sessions match "headache".'
    );
  });

  it('connects note search, result status, and the scrollable history list', () => {
    expect(source).toContain("id: 'tp-history-search'");
    expect(source).toContain("'aria-controls': 'tp-history-list'");
    expect(source).toContain("'aria-describedby': 'tp-history-count'");
    expect(source).toContain("id: 'tp-history-count'");
    expect(source).toContain("role: 'status'");
    expect(source).toContain("id: 'tp-history-list'");
    expect(source).toContain("tabIndex: 0");
    expect(source).toContain("'aria-labelledby': 'tp-history-title'");
  });

  it('supports Escape and a 44-pixel clear control with focus recovery', () => {
    expect(source).toContain("if (e.key === 'Escape' && noteQuery)");
    expect(source).toContain('clearHistoryNoteSearch();');
    expect(source).toContain("'aria-label': 'Clear history note search'");
    expect(source).toContain("document.getElementById('tp-history-search')");
    expect(source).toContain("minHeight: '44px'");
  });

  it('provides a named empty result and direct recovery path', () => {
    expect(source).toContain("'aria-labelledby': 'tp-history-empty-title'");
    expect(source).toContain("id: 'tp-history-empty-title'");
    expect(source).toContain("'No note matches'");
    expect(source).toContain("'Clear note search'");
    expect(source).toContain('Progress filters remain unchanged.');
  });

  it('stacks fixed-width history columns at narrow widths and wraps notes', () => {
    expect(source).toContain("className: 'tp-history-item'");
    expect(source).toContain("className: 'tp-history-primary'");
    expect(source).toContain("className: 'tp-history-metrics'");
    expect(source).toContain("key: 'hist-' + s.date");
    expect(source).toContain("overflowWrap: 'anywhere'");
    expect(source).toContain(
      ".tp-history-toolbar, .tp-root .tp-history-item { flex-direction: column !important; align-items: stretch !important; }"
    );
    expect(source).toContain(
      ".tp-history-primary, .tp-root .tp-history-metrics { flex-basis: auto !important; width: 100%; }"
    );
  });

  it('keeps the desktop mirror identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });
});
