import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';

const HOST_PATHS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
  'desktop/web-app/src/AlloFlowANTI.txt',
];

const readReferenceBlock = (path, includePanel = false) => {
  const source = readFileSync(path, 'utf8');
  const start = source.indexOf('  const REFERENCES_HEADER_RE = ');
  const endMarker = includePanel
    ? '  const getSideBySideContent = (text) => {'
    : '  const SourceReferencesPanel = React.memo';
  const end = source.indexOf(endMarker, start);
  expect(start, `${path}: reference helper start`).toBeGreaterThanOrEqual(0);
  expect(end, `${path}: reference helper end`).toBeGreaterThan(start);
  return source.slice(start, end);
};

const loadPureHelpers = (windowValue = {}) => {
  const source = readReferenceBlock(HOST_PATHS[0]);
  return new Function('window', `${source}\nreturn { splitReferencesFromBody, parseReferenceItems, getReferenceSupplementaryText, toSafeReferenceHref };`)(windowValue);
};

describe('reference renderer hardening', () => {
  it('delegates splitting and parsing to TextPipelineHelpers when it is available', () => {
    const splitResult = { body: 'delegated body', references: 'delegated references' };
    const parseResult = [{ num: '9', title: 'Delegated', url: 'https://example.test', raw: 'x', index: 0 }];
    const splitReferencesFromBody = vi.fn(() => splitResult);
    const parseReferenceItems = vi.fn(() => parseResult);
    const helpers = loadPureHelpers({
      AlloModules: { TextPipelineHelpers: { splitReferencesFromBody, parseReferenceItems } },
    });

    expect(helpers.splitReferencesFromBody('input')).toBe(splitResult);
    expect(helpers.parseReferenceItems('references')).toBe(parseResult);
    expect(splitReferencesFromBody).toHaveBeenCalledWith('input');
    expect(parseReferenceItems).toHaveBeenCalledWith('references');
  });

  it('migrates a legacy references-before-English block without swallowing English', () => {
    const helpers = loadPureHelpers();
    const text = [
      'Texto adaptado.',
      '',
      '### Sources / Web research',
      '',
      '*AI-assisted sources; verify before citing.*',
      '',
      '2. [Report (2026)](https://example.test/a_(b)?q=one)',
      '5. [Report (2026)](https://example.test/a_(b)?q=one)',
      '',
      'Partial grounding: two of three claims have direct support.',
      '',
      '--- ENGLISH TRANSLATION ---',
      '',
      'Adapted English text.',
    ].join('\n');

    const split = helpers.splitReferencesFromBody(text);
    expect(split.body).toBe('Texto adaptado.\n\n--- ENGLISH TRANSLATION ---\n\nAdapted English text.');
    expect(split.references).toContain('### Sources / Web research');
    expect(split.references).toContain('Partial grounding: two of three claims have direct support.');
    expect(split.references).not.toContain('Adapted English text.');

    const staleHelpers = loadPureHelpers({
      AlloModules: { TextPipelineHelpers: {
        splitReferencesFromBody: () => ({ body: 'Texto adaptado.', references: text.slice(text.indexOf('### Sources')) }),
      } },
    });
    expect(staleHelpers.splitReferencesFromBody(text)).toEqual(split);
  });

  it.each(['R\u00e9f\u00e9rences', 'Sources du texte', 'Referencias', 'Quellen'])(
    'recognizes the localized "%s" reference heading in the fallback',
    (header) => {
      const helpers = loadPureHelpers();
      const split = helpers.splitReferencesFromBody(`Body.\n\n### ${header}\n\n7. [Source](https://example.test/7)`);
      expect(split.body).toBe('Body.');
      expect(split.references).toContain(`### ${header}`);
      expect(helpers.parseReferenceItems(split.references).map(item => item.num)).toEqual(['7']);
    },
  );

  it('keeps duplicate sources and sparse original numbers while parsing balanced destinations', () => {
    const helpers = loadPureHelpers();
    const references = [
      '### Sources',
      '2. [Report (2026)](https://example.test/a_(b)?q=one)',
      '5. [Report (2026)](https://example.test/a_(b)?q=one)',
    ].join('\n');
    const items = helpers.parseReferenceItems(references);

    expect(items).toHaveLength(2);
    expect(items.map(item => item.num)).toEqual(['2', '5']);
    expect(items.map(item => item.url)).toEqual([
      'https://example.test/a_(b)?q=one',
      'https://example.test/a_(b)?q=one',
    ]);
  });

  it('retains caveats and partial-support notes after parsed entries are masked', () => {
    const helpers = loadPureHelpers();
    const references = [
      '### Referenced Sources',
      '*AI-assisted sources; verify before citing.*',
      '2. [A source](https://example.test/a)',
      'Partial grounding: one sentence has no direct source support.',
    ].join('\n');
    const notes = helpers.getReferenceSupplementaryText(references, helpers.parseReferenceItems(references));

    expect(notes).toContain('AI-assisted sources; verify before citing.');
    expect(notes).toContain('Partial grounding: one sentence has no direct source support.');
    expect(notes).not.toContain('https://example.test/a');
    expect(notes).not.toContain('### Referenced Sources');
  });

  it('allows only explicit HTTP(S) reference links', () => {
    const { toSafeReferenceHref } = loadPureHelpers();
    expect(toSafeReferenceHref('https://example.test/a?q=1')).toBe('https://example.test/a?q=1');
    expect(toSafeReferenceHref('http://example.test')).toBe('http://example.test');
    expect(toSafeReferenceHref('javascript:alert(1)')).toBe('');
    expect(toSafeReferenceHref('data:text/html,unsafe')).toBe('');
    expect(toSafeReferenceHref('/relative/path')).toBe('');
  });

  it('keeps the three app copies aligned and pins safe panel rendering', () => {
    const blocks = HOST_PATHS.map(path => readReferenceBlock(path, true).replace(/\r\n/g, '\n'));
    expect(blocks[1]).toBe(blocks[0]);
    expect(blocks[2]).toBe(blocks[0]);
    for (const block of blocks) {
      expect(() => parse(block, { sourceType: 'script', plugins: ['jsx'] })).not.toThrow();
      expect(block).toContain("window.AlloModules.TextPipelineHelpers");
      expect(block).toContain('value={itemNumber}');
      expect(block).toContain('const safeHref = toSafeReferenceHref(item.url);');
      expect(block).toContain('{supplementaryText && (');
      expect(block).not.toContain('const seen = new Set()');
      expect(block).not.toContain('<a href={item.url}');
    }
  });
});
