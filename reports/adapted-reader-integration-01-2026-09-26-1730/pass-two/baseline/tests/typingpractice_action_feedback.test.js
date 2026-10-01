import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(
  path.join(root, 'stem_lab/stem_tool_typingpractice.js'),
  'utf8'
);

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

function makeCopy(navigatorValue, legacyCopy) {
  return Function(
    'navigator',
    'legacyCopy',
    'return (' + extractFunction('copyTextToClipboard') + ')'
  )(navigatorValue, legacyCopy);
}

function makeLegacyCopy(documentValue) {
  return Function(
    'document',
    'return (' + extractFunction('legacyCopy') + ')'
  )(documentValue);
}

function makeCsv(environment) {
  const start = source.indexOf('function downloadSessionsCSV(');
  const end = source.indexOf('\n\n  // Estimate a drill', start);
  if (start < 0 || end < 0) throw new Error('CSV function boundaries not found');
  const csvFunctionSource = source.slice(start, end).trim();
  return Function(
    'Blob',
    'URL',
    'document',
    'setTimeout',
    'console',
    'applySessionFilters',
    'reportTypingPracticeIssue',
    'return (' + csvFunctionSource + ')'
  )(
    environment.Blob,
    environment.URL,
    environment.document,
    environment.setTimeout,
    environment.console,
    environment.applySessionFilters,
    environment.reportIssue
  );
}

function csvSession() {
  return {
    date: '2026-07-01T10:00:00.000Z',
    drillId: 'words',
    drillName: 'Words',
    wpm: 30,
    accuracy: 94,
    durationSec: 60,
    errors: 2,
    charCount: 150
  };
}

describe('Typing Practice action outcome feedback', () => {
  it('resolves clipboard success only after the Clipboard API succeeds', async () => {
    const legacy = vi.fn();
    const notify = vi.fn();
    const copy = makeCopy({
      clipboard: { writeText: vi.fn(() => Promise.resolve()) }
    }, legacy);

    await expect(copy('report', notify)).resolves.toBe(true);
    expect(legacy).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toContain('Copied to clipboard');
  });

  it('falls back to legacy copy and reports the real failure outcome', async () => {
    const notify = vi.fn();
    const legacy = vi.fn((text, ok, fail) => fail());
    const copy = makeCopy({
      clipboard: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) }
    }, legacy);

    await expect(copy('report', notify)).resolves.toBe(false);
    expect(legacy).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toContain('Copy failed');
  });

  it('removes the temporary textarea even when legacy focus throws', () => {
    const textarea = {
      style: {},
      setAttribute: vi.fn(),
      focus: vi.fn(() => { throw new Error('focus unavailable'); }),
      select: vi.fn(),
      parentNode: null
    };
    const body = {
      appendChild: vi.fn((node) => { node.parentNode = body; }),
      removeChild: vi.fn((node) => { node.parentNode = null; })
    };
    const documentValue = {
      body,
      createElement: vi.fn(() => textarea),
      execCommand: vi.fn(() => true)
    };
    const ok = vi.fn();
    const fail = vi.fn();

    makeLegacyCopy(documentValue)('text', ok, fail);

    expect(body.removeChild).toHaveBeenCalledWith(textarea);
    expect(ok).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledTimes(1);
  });

  it('returns false and explains when no sessions can be exported', () => {
    const reportIssue = vi.fn();
    const csv = makeCsv({
      Blob: vi.fn(),
      URL: {},
      document: {},
      setTimeout: vi.fn(),
      console: { warn: vi.fn() },
      applySessionFilters: vi.fn(() => []),
      reportIssue
    });

    expect(csv({ sessions: [] }, {}, vi.fn())).toBe(false);
    expect(reportIssue).toHaveBeenCalledTimes(1);
    expect(reportIssue.mock.calls[0][0]).toContain('no CSV to download');
  });

  it('returns true only after creating and clicking a CSV download', () => {
    const anchor = { click: vi.fn(), parentNode: null };
    const body = {
      appendChild: vi.fn((node) => { node.parentNode = body; }),
      removeChild: vi.fn((node) => { node.parentNode = null; })
    };
    const revokeObjectURL = vi.fn();
    const csv = makeCsv({
      Blob: vi.fn(),
      URL: {
        createObjectURL: vi.fn(() => 'blob:typing'),
        revokeObjectURL
      },
      document: {
        body,
        createElement: vi.fn(() => anchor)
      },
      setTimeout: vi.fn((callback) => callback()),
      console: { warn: vi.fn() },
      applySessionFilters: (sessions) => sessions,
      reportIssue: vi.fn()
    });

    expect(csv({ sessions: [csvSession()], studentName: 'Student' }, null, vi.fn())).toBe(true);
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(body.removeChild).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:typing');
  });

  it('cleans up and reports failure when the CSV click throws', () => {
    const anchor = {
      click: vi.fn(() => { throw new Error('download blocked'); }),
      parentNode: null
    };
    const body = {
      appendChild: vi.fn((node) => { node.parentNode = body; }),
      removeChild: vi.fn((node) => { node.parentNode = null; })
    };
    const revokeObjectURL = vi.fn();
    const reportIssue = vi.fn();
    const csv = makeCsv({
      Blob: vi.fn(),
      URL: {
        createObjectURL: vi.fn(() => 'blob:typing'),
        revokeObjectURL
      },
      document: {
        body,
        createElement: vi.fn(() => anchor)
      },
      setTimeout: vi.fn(),
      console: { warn: vi.fn() },
      applySessionFilters: (sessions) => sessions,
      reportIssue
    });

    expect(csv({ sessions: [csvSession()] }, null, vi.fn())).toBe(false);
    expect(body.removeChild).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:typing');
    expect(reportIssue).toHaveBeenCalledTimes(1);
  });

  it('waits for real outcomes at every user-facing action site', () => {
    expect(source).toContain('copyTextToClipboard(report, addToast).then(function(copied)');
    expect(source).toContain('copyTextToClipboard(summary, addToast).then(function(copied)');
    expect(source).toContain('copyTextToClipboard(json, addToast).then(function(copied)');
    expect(source).toContain('var started = downloadSessionsCSV(state, filterOpts, addToast)');
    expect(source).toContain('ttsRequest.catch(reportTtsFailure)');
    expect(source).toContain('Read aloud failed. The passage remains available on screen.');
  });
});
