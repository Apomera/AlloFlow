import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let TPH;

beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  TPH = window.AlloModules.TextPipelineHelpers;
  if (!TPH) throw new Error('TextPipelineHelpers failed to register');
});

const source = (uri, title = 'Source') => ({ web: { uri, title } });
const citation = (number, url) =>
  `[\u207D${TPH.toSuperscript(number)}\u207E](${url})`;

describe('source hostname filtering', () => {
  it('rejects x.com only on hostname boundaries', () => {
    const chunks = [
      source('https://x.com/teacher/status/1', 'X post'),
      source('https://news.x.com/story', 'X subdomain'),
      source('https://edx.com/learn/science', 'edX course'),
      source('https://notx.com/article', 'Independent article'),
      source('https://example.edu/redirect?next=https://x.com/post', 'Query mention'),
    ];

    expect(TPH.filterEducationalSources(chunks).map(item => item.web.title)).toEqual([
      'edX course',
      'Independent article',
      'Query mention',
    ]);
  });
});

describe('citation formatting code boundaries', () => {
  it('preserves inline-code citation examples byte-for-byte', () => {
    const one = citation(1, 'https://a.test/path_(one)');
    const two = citation(2, 'https://b.test/two');
    const inlineExample = `\`${one}, ${two}.\``;
    const input = `Literal ${inlineExample} then a claim ${one}, ${two}.`;

    const result = TPH.normalizeCitationPlacement(input);

    expect(result).toContain(inlineExample);
    expect(result).toBe(`Literal ${inlineExample} then a claim. ${one} ${two}`);
  });

  it('handles multi-backtick inline code without interpreting its citations', () => {
    const one = citation(1, 'https://a.test');
    const literal = `\`\`${one}, punctuation.\`\``;
    expect(TPH.normalizeCitationPlacement(`Keep ${literal}`)).toBe(`Keep ${literal}`);
  });
});

describe('reference splitting code boundaries', () => {
  it('ignores recognized reference headings inside fenced code', () => {
    const input = [
      'Explain this Markdown:',
      '',
      '```md',
      '### References',
      '',
      '1. [Example](https://example.test)',
      '```',
      '',
      'The explanation continues.',
    ].join('\n');

    expect(TPH.splitReferencesFromBody(input)).toEqual({ body: input, references: '' });
  });

  it('ignores inline-code headings but finds a later real multilingual heading', () => {
    const input = [
      'Use `### References` as an example.',
      '',
      'Body.',
      '',
      '### R\u00e9f\u00e9rences',
      '',
      '1. [Source](https://example.test)',
    ].join('\n');

    const split = TPH.splitReferencesFromBody(input);
    expect(split.body).toBe('Use `### References` as an example.\n\nBody.');
    expect(split.references).toBe('### R\u00e9f\u00e9rences\n\n1. [Source](https://example.test)');
  });

  it('does not use an English-translation delimiter hidden in a fence', () => {
    const input = [
      'Body.',
      '',
      '### References',
      '',
      '```txt',
      '--- ENGLISH TRANSLATION ---',
      '```',
      '',
      '1. [Source](https://example.test)',
    ].join('\n');

    const split = TPH.splitReferencesFromBody(input);
    expect(split.body).toBe('Body.');
    expect(split.references).toContain('--- ENGLISH TRANSLATION ---');
    expect(split.references).toContain('1. [Source](https://example.test)');
  });
});
