import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const source = fs.readFileSync(path.resolve('text_pipeline_helpers_source.jsx'), 'utf8');
const helpers = vm.runInNewContext(source + '\ncreateTextPipelineHelpers();', { URL, window: {} });
const api = helpers.studentSources;
const body = 'Clouds form in cooling air. [⁽¹⁾](https://example.edu/clouds)\n\nA classroom observation. [Document 1](#allo-doc-doc-a)';
const text = body + '\n\n### Source Text References\n\n1. [Cloud reference](https://example.edu/clouds)\n\n### Your Document References\n\nPRIVATE_TITLE\n\n> PRIVATE_QUOTE\n\n### Research Review\n\nPRIVATE_QUERY\n\n> UNUSED_WEB_PASSAGE';
const report = () => ({
  supplied: [
    { id: 'web-a', kind: 'web', title: 'Cloud reference', url: 'https://example.edu/clouds#section', passage: 'Clouds form when air cools.', evidenceType: 'Page excerpt', locatorLabel: 'Characters 1-26' },
    { id: 'web-unused', kind: 'web', title: 'Unused source', url: 'https://unused.example', passage: 'UNUSED_WEB_PASSAGE', evidenceType: 'Search snippet' },
    { id: 'doc-a', kind: 'document', title: 'PRIVATE_TITLE', passage: 'PRIVATE_QUOTE', evidenceType: 'Document passage', locatorLabel: 'PRIVATE_LOCATION' }
  ],
  citedIds: ['web-a', 'doc-a'],
  documents: { supplied: [{ id: 'doc-a' }] },
  activity: [{ detail: 'PRIVATE_QUERY' }]
});

describe('student source projection', () => {
  it('projects only cited evidence and whitelists public fields', () => {
    const record = api.capture(report(), text, { writingMode: 'synthesis' });
    expect(record.sources).toHaveLength(2);
    expect(record.sources[0].passages[0].text).toBe('Clouds form when air cools.');
    expect(record.sources[0].citationHref).toBe('https://example.edu/clouds');
    expect(record.writingMode).toBe('synthesis');
    expect(JSON.stringify(record)).not.toMatch(/PRIVATE_|UNUSED_|activity|supplied/);
    expect(record.sources[1].title).toBe('Teacher-provided source');
    expect(record.sources[1].passages).toEqual([]);
  });
  it('requires an explicit sharing choice for document text and identity', () => {
    const evidence = report(); evidence.supplied[2].shareWithStudents = true;
    const record = api.capture(evidence, text, { writingMode: 'quotes' });
    expect(record.sources[1].title).toBe('PRIVATE_TITLE');
    expect(record.sources[1].passages[0].text).toBe('PRIVATE_QUOTE');
    expect(record.sources[1].passages[0].locatorLabel).toBe('PRIVATE_LOCATION');
    expect(record.writingMode).toBe('quotes');
  });
  it('removes private appendices and preserves instructional prose and web references', () => {
    const output = api.publicText(text, api.capture(report(), text));
    expect(output).toContain(body);
    expect(output).toContain('[Cloud reference](https://example.edu/clouds)');
    expect(output).toContain('Source excerpt not shared.');
    expect(output).not.toMatch(/PRIVATE_|UNUSED_|Research Review/);
  });
  it('rebuilds approved document excerpts without raw report or uncited passages', () => {
    const evidence = report(); evidence.supplied[2].shareWithStudents = true;
    const record = api.capture(evidence, text);
    const output = api.publicText(text, record);
    expect(output).toContain('PRIVATE\\_TITLE');
    expect(output).toContain('> PRIVATE\\_QUOTE');
    expect(output).not.toMatch(/PRIVATE_QUERY|UNUSED_WEB_PASSAGE|Research Review/);
    expect(api.publicText(output, record)).toBe(output);
  });
  it('fails closed without metadata while retaining document citation labels', () => {
    const output = api.publicText(text, null);
    expect(output).not.toMatch(/PRIVATE_|UNUSED_/);
    expect(output).toContain('Document 1');
    expect(output).toContain('Teacher-provided source');
  });
  it('drops stale excerpts after an edit, including same-length middle changes', () => {
    const record = api.capture(report(), text);
    const edited = text.replace('cooling', 'warming');
    expect(api.forText(record, edited).sources.every(item => !item.passages.length)).toBe(true);
    expect(api.forText(record, edited).writingMode).toBe('unknown');
  });
  it('can rebind after the caller verifies adaptation citation conservation', () => {
    const record = api.capture(report(), text);
    const edited = text.replace('Clouds form in cooling air.', 'Cooling air can form clouds.');
    const adapted = api.forText(record, edited, { adapted: true });
    expect(adapted.bodyKey).toBe(api.bodyKey(edited));
    expect(adapted.sources[0].passages).toHaveLength(1);
    expect(api.forText(adapted, edited).sources[0].passages).toHaveLength(1);
  });
  it('does not carry removed citations or source excerpts into a different reading', () => {
    const record = api.capture(report(), text);
    expect(api.forText(record, 'A different uncited reading.')).toBeNull();
    const adapted = api.forText(record, 'Another reading. [Document 1](#allo-doc-doc-a)', { adapted: true });
    expect(adapted.sources.map(item => item.kind)).toEqual(['document']);
  });
  it('supports ordinary reference-only research without inventing excerpts', () => {
    const basic = api.forText(null, 'Reading.\n\n### Source Text References\n\n1. [Reference](https://example.edu)');
    expect(basic.sources[0].title).toBe('Reference');
    expect(basic.sources[0].passages).toEqual([]);
    expect(basic.writingMode).toBe('unknown');
  });
  it('retains ordinary nonresearch references unchanged', () => {
    const manual = 'Reading.\n\n### References\n\nA printed book, 2020.';
    expect(api.publicText(manual)).toBe(manual);
    expect(api.forText(null, manual)).toBeNull();
  });
  it('sanitizes malicious, private and oversized source records', () => {
    const record = api.sanitize({ version: 1, activity: 'SECRET', sources: [
      { citationHref: 'javascript:alert(1)', title: 'Unsafe' },
      { citationHref: 'https://user:password@example.edu', title: 'Credentials' },
      { citationHref: '#allo-doc-secret', title: 'SECRET', shareExcerpt: false, passages: [{ text: 'SECRET', evidenceType: 'Document passage', locatorLabel: 'SECRET' }] },
      { citationHref: 'https://example.edu', title: 'a'.repeat(1000), shareExcerpt: true, passages: [{ text: 'b'.repeat(1199) + '\uD83D\uDE00', evidenceType: 'Page excerpt', unknown: 'SECRET' }] }
    ] });
    expect(record.sources).toHaveLength(2);
    expect(JSON.stringify(record)).not.toContain('SECRET');
    expect(record.sources[1].title).toHaveLength(300);
    expect(record.sources[1].passages[0].text).toHaveLength(1199);
  });
  it('removes nested and unknown sections after a private appendix boundary', () => {
    const sample = 'Body.\n\n### Research Review\n\nSECRET\n\n### Other References\n\nKeep this.\n\n### Your Document References\n\nPRIVATE';
    expect(api.publicText(sample)).toBe('Body.');
  });
  it.each(['### Research Review:', '### Your Document References:'])('recognizes colon-suffixed private headings: %s', heading => {
    expect(api.publicText('Body.\n\n' + heading + '\n\nSECRET\n\n#### More notes\n\nPRIVATE')).toBe('Body.');
  });
  it('does not upgrade private document metadata through a public URL', () => {
    expect(api.sanitize({ version: 1, sources: [{ kind: 'document', citationHref: 'https://example.edu', shareExcerpt: false, title: 'PRIVATE', passages: [{ text: 'PRIVATE', evidenceType: 'Document passage' }] }] })).toBeNull();
  });
  it('treats pasted text as private even when the teacher attaches a web URL', () => {
    const evidence = report();
    evidence.supplied[0].evidenceType = 'Pasted text';
    evidence.supplied[0].passage = 'PRIVATE_PASTE';
    evidence.supplied[0].title = 'PRIVATE_TITLE';
    const record = api.capture(evidence, text);
    expect(record.sources[0].title).toBe('Teacher-provided source');
    expect(record.sources[0].passages).toEqual([]);
    expect(JSON.stringify(record)).not.toContain('PRIVATE_');
  });
  it.each([false, true])('keeps permitted evidence when private pasted text shares its URL (private first: %s)', privateFirst => {
    const publicRow = { id: 'public', kind: 'web', title: 'Public cloud page', url: 'https://example.edu/clouds', passage: 'A public cloud passage.', evidenceType: 'Page excerpt', locatorLabel: 'Paragraph 2' };
    const privateRow = { id: 'private', kind: 'web', title: 'PRIVATE_TITLE', url: 'https://example.edu/clouds', passage: 'PRIVATE_PASSAGE', evidenceType: 'Pasted text', locatorLabel: 'PRIVATE_LOCATION', shareWithStudents: false };
    const evidence = { supplied: privateFirst ? [privateRow, publicRow] : [publicRow, privateRow], citedIds: ['public', 'private'] };
    const before = JSON.stringify(evidence);
    const reading = 'Clouds form. [1](https://example.edu/clouds)\n\n### Source Text References\n\n1. [PRIVATE_TITLE](https://example.edu/clouds)';
    const record = api.capture(evidence, reading);
    expect(record.sources).toHaveLength(1);
    expect(record.sources[0].title).toBe('Public cloud page');
    expect(record.sources[0].shareExcerpt).toBe(true);
    expect(record.sources[0].passages).toEqual([{ text: 'A public cloud passage.', evidenceType: 'Page excerpt', locatorLabel: 'Paragraph 2' }]);
    expect(JSON.stringify(record)).not.toContain('PRIVATE_');
    expect(JSON.stringify(evidence)).toBe(before);
    expect(api.publicText(reading, record)).toContain('[Public cloud page](https://example.edu/clouds)');
    expect(api.publicText(reading, record)).not.toContain('PRIVATE_');
  });
  it.each([false, true])('projects private pasted bibliography titles without changing instructional prose (sharing: %s)', shareWithStudents => {
    const reading = 'A reading about PRIVATE_TITLE. [1](https://example.edu/clouds)\n\n### Source Text References\n\n1. [PRIVATE_TITLE](https://example.edu/clouds)\n2. Printed reference, 2020.\n3. [Unrelated reference](https://other.example/book)';
    const evidence = { supplied: [{ id: 'paste', kind: 'web', title: 'PRIVATE_TITLE', url: 'https://example.edu/clouds', passage: 'PRIVATE_PASSAGE', evidenceType: 'Pasted text', shareWithStudents }], citedIds: ['paste'] };
    const record = api.capture(evidence, reading);
    const output = api.publicText(reading, record);
    expect(output).toContain('A reading about PRIVATE_TITLE. [1](https://example.edu/clouds)');
    expect(output).toContain('2. Printed reference, 2020.');
    expect(output).toContain('3. [Unrelated reference](https://other.example/book)');
    expect(output).toContain('1. [' + (shareWithStudents ? 'PRIVATE\\_TITLE' : 'Teacher-provided source') + '](https://example.edu/clouds)');
    expect(api.publicText(output, record)).toBe(output);
  });
  it('keeps safe bibliography identities after a body edit without reviving excerpts', () => {
    const reading = 'Clouds form. [1](https://example.edu/clouds)\n\n### Source Text References\n\n1. [PRIVATE_TITLE](https://example.edu/clouds)';
    const evidence = { supplied: [{ id: 'paste', kind: 'web', title: 'PRIVATE_TITLE', url: 'https://example.edu/clouds', passage: 'PRIVATE_PASSAGE', evidenceType: 'Pasted text' }], citedIds: ['paste'] };
    const record = api.capture(evidence, reading);
    const edited = reading.replace('Clouds form.', 'Clouds form in cooling air.');
    const rebound = api.forText(record, edited);
    expect(rebound.sources[0].title).toBe('Teacher-provided source');
    expect(rebound.sources[0].passages).toEqual([]);
    expect(api.publicText(edited, record)).not.toContain('PRIVATE_');
    expect(api.publicText(edited, rebound)).not.toContain('PRIVATE_');
  });
  it('projects both bilingual bibliographies while leaving body links and code examples unchanged', () => {
    const url = 'https://example.edu/Cloud_(weather)';
    const reference = '1. [PRIVATE_TITLE](' + url + ')';
    const bodyLink = '[PRIVATE_BODY_LABEL](' + url + ')';
    const reading = 'Lecture. [1](' + url + ')\n\n### Referencias\n\n' + reference + '\n`' + reference + '`\n\n```\n' + reference + '\n```\n\n--- ENGLISH TRANSLATION ---\n\nReading ' + bodyLink + '.\n\n### References\n\n' + reference;
    const record = api.sanitize({ version: 1, bodyKey: api.bodyKey(reading), sources: [{ citationHref: url, title: 'Teacher-provided source', shareExcerpt: false }] });
    const output = api.publicText(reading, record);
    expect(output.split('[Teacher-provided source](' + url + ')')).toHaveLength(3);
    expect(output).toContain('`' + reference + '`');
    expect(output).toContain('```\n' + reference + '\n```');
    expect(output).toContain('Reading ' + bodyLink + '.');
    expect(api.publicText(output, record)).toBe(output);
  });
  it('matches parentheses-encoded citation destinations to reviewed URLs', () => {
    const evidence = report(); evidence.supplied[0].url = 'https://example.edu/Cloud_(weather)';
    const reading = text.replaceAll('https://example.edu/clouds', 'https://example.edu/Cloud_%28weather%29');
    const record = api.capture(evidence, reading);
    expect(record.sources[0].title).toBe('Cloud reference');
    expect(record.sources[0].passages).toHaveLength(1);
  });
  it.each(['Your Document References', 'Research Review'])('keeps %s out of instructional text', heading => {
    const split = helpers.splitReferencesFromBody('Reading.\n\n### ' + heading + ':\n\nAppendix.');
    expect(split.body).toBe('Reading.');
    expect(split.references).toContain('Appendix.');
  });
  it('does not treat citation examples in code as sources', () => {
    expect(api.forText(null, 'Example `[' + 'Document 1](#allo-doc-code)`\n\n```\n[⁽¹⁾](https://example.edu)\n```')).toBeNull();
  });
  it('binds the whole bilingual body, not only its first language', () => {
    const bilingual = 'Lecture. [⁽¹⁾](https://example.edu)\n\n### References\n\n1. [Source](https://example.edu)\n\n--- ENGLISH TRANSLATION ---\n\nReading.';
    expect(api.bodyKey(bilingual)).not.toBe(api.bodyKey(bilingual.replace('Reading.', 'Changed.')));
  });
  it('preserves literal research-heading examples inside fenced code', () => {
    const reading = 'Markdown example:\n\n```\n### Research Review\nExample text.\n```';
    expect(api.publicText(reading)).toBe(reading);
  });
});
