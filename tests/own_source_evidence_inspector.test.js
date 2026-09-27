import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import MarkdownIt from 'markdown-it';

let E;
beforeAll(() => {
  new Function(readFileSync('own_sources_module.js', 'utf8'))();
  E = window.AlloResearchEvidence;
});
afterEach(() => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  document.body.innerHTML = '';
});
const rows = () => [{ sourceId: 'a', evidenceId: 'a-1', title: 'Climate notes', locatorLabel: 'page 7', version: 2, snippet: 'Warm air can hold more water vapor. Cooling causes condensation.' },
  { sourceId: 'b', evidenceId: 'b-1', title: 'Other notes', locatorLabel: 'slide 4', snippet: 'Rain falls when water drops grow large enough.' }];

describe('document passage citations', () => {
  it('keeps web and document references independent and distinguishes supplied from cited', () => {
    const items = E.snapshot(rows());
    const result = E.finish('Clouds form. [Your document 1] A web fact [⁽¹⁾](https://example.org).', items);
    expect(result.text).toContain('[Document 1](#allo-doc-');
    expect(result.text).toContain('[⁽¹⁾](https://example.org)');
    expect(result.text).toContain('2 document(s) supplied (2 passages); 1 document(s) cited (1 passages).');
    expect(result.text).toContain('page 7');
    expect(result.text).toContain(rows()[0].snippet);
    expect(result.evidence.citedIds).toEqual([items[0].id]);
  });
  it('does not invent support or retain an out-of-range marker', () => {
    const result = E.finish('Clouds. [Your document 99]', E.snapshot(rows()));
    expect(result.text).not.toContain('[Your document');
    expect(result.text).toContain('0 document(s) cited');
    expect(result.text).toContain('No document citation');
  });
  it('preserves the supplied snapshot when the source object changes later', () => {
    const source = rows();
    const items = E.snapshot(source);
    E.remember(items);
    source[0].snippet = 'Changed after generation';
    items[0].passage = 'Changed after persistence';
    expect(E.lookup(items[0].id).passage).toBe(rows()[0].snippet);
    const copy = E.lookup(items[0].id); copy.passage = 'mutated caller';
    expect(E.lookup(items[0].id).passage).toBe(rows()[0].snippet);
  });
  it('opens an accessible passage dialog without following the hash and returns focus', () => {
    const items = E.snapshot(rows()); E.remember(items);
    const link = document.createElement('a');
    link.href = '#allo-doc-' + items[0].id; link.textContent = 'Document 1';
    link.target = '_blank'; document.body.appendChild(link); link.focus();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(document.querySelector('[role="dialog"]').textContent).toContain('page 7');
    expect(document.querySelector('blockquote').textContent).toBe(rows()[0].snippet);
    expect(document.activeElement.textContent).toBe('Close passage');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement.textContent).toBe('Close passage');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('[role="dialog"]')).toBe(null);
    expect(document.activeElement).toBe(link);
  });
  it('renders untrusted file labels and text as text, never executable markup', () => {
    const items = E.snapshot([{ ...rows()[0], title: '<img src=x onerror=alert(1)>', snippet: '<script>alert(1)</script> harmless passage content.' }]);
    E.remember(items); E.show(items[0].id);
    expect(document.querySelector('img,script')).toBe(null);
    expect(document.querySelector('blockquote').textContent).toContain('<script>');
  });
  it('explains missing snapshots without pretending to have inspected the source', () => {
    E.show('unavailable-1');
    expect(document.querySelector('[role="dialog"]').textContent).toContain('does not have the saved citation snapshot');
  });
});

describe('strict documents-only excerpts', () => {
  it('retains literal HTML entities and punctuation in rendered excerpts and reference passages', () => {
    const literal = 'Literal &not;, &#65;, &amp;, *stars*, [brackets](text), and \\ paths remain unchanged.';
    const items = E.snapshot([{ ...rows()[0], snippet: literal }]);
    const text = E.exactExcerpts({ excerpts: [{ document: 1, quote: literal }] }, items, 'Symbols');
    const finished = E.finish(text, items).text;
    const html = new MarkdownIt().render(finished);
    const container = document.createElement('div'); container.innerHTML = html;
    const quotes = [...container.querySelectorAll('blockquote')];
    expect(quotes).toHaveLength(2);
    expect(quotes[0].textContent).toContain(literal);
    expect(quotes[1].textContent.trim()).toBe(literal);
  });
  it('outputs only validated source quotations, ignoring model-added prose', () => {
    const items = E.snapshot(rows());
    const text = E.exactExcerpts({ excerpts: [{ document: 1, quote: rows()[0].snippet }], explanation: 'Invented facts' }, items, 'Clouds');
    expect(text).toContain('> ' + rows()[0].snippet);
    expect(text).not.toContain('Invented facts');
    expect(text).toContain('[Your document 1]');
  });
  it.each([
    { excerpts: [] },
    { excerpts: [{ document: 1, quote: 'Water boils at ten degrees.' }] },
    { excerpts: [{ document: 2, quote: rows()[0].snippet }] },
    { excerpts: [{ document: 1, quote: rows()[0].snippet.toLowerCase() }] },
    { excerpts: [{ document: '1', quote: rows()[0].snippet }] },
    { excerpts: [{ document: 1, quote: rows()[0].snippet }, { document: 2, quote: 'Invented additional statement.' }] },
  ])('rejects unsupported or misattributed selections %#', response => {
    expect(E.exactExcerpts(response, E.snapshot(rows()), 'Clouds')).toBe(null);
  });
});
