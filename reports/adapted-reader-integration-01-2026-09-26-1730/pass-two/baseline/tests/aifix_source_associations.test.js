import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Review = require('../remediation_review_helpers.js');
const { normalizeCandidateRejectionEvidence } = require('../desktop/mcp/remediation_verification.cjs');
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const doc = s => '<!DOCTYPE html><html lang="en"><body><main id="main">' + s + '</main></body></html>';
const prose = '<p>' + 'Read the instructions carefully and record observations in your science notebook. '.repeat(10) + '</p>';
const table = '<table><tr><td>Group</td><td>Score</td></tr><tr><td>Alpha</td><td>95</td></tr><tr><td>Bravo</td><td>102</td></tr></table>';
const img = '<img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="Seedling">';
const badCases = [
 ['link href', '<a href="https://school.example/alpha">Assignment resource</a>', s => s.replace('/alpha', '/bravo'), 'link-destination-changed'],
 ['email href', '<a href="mailto:teacher@school.example">Teacher</a>', s => s.replace('teacher@', 'someone@'), 'link-destination-changed'],
 ['internal href', '<a href="#main">Main content</a>', s => s.replace('href="#main"', 'href="#other"'), 'link-destination-changed'],
 ['table value', table, s => s.replace('<td>95</td>', '<td>96</td>'), 'table-content-changed'],
 ['table semantics', table, s => s.replace(/<table>/g, '<div class="grid">').replace(/<\/table>/g, '</div>').replace(/<tr>/g, '<div>').replace(/<\/tr>/g, '</div>').replace(/<td>/g, '<span>').replace(/<\/td>/g, '</span>'), 'table-content-changed'],
 ['table span', table, s => s.replace('<td>95', '<td colspan="2">95'), 'table-content-changed'],
 ['single digit', '<p>Complete 3 trials for each sample.</p>', s => s.replace('Complete 3', 'Complete 8'), 'source-value-changed'],
 ['added number', '<p>The study enrolled participants.</p>', s => s.replace('enrolled participants', 'enrolled 8742 participants'), 'source-value-changed'],
 ['negative sign', '<p>Record -15 degrees.</p>', s => s.replace('-15', '15'), 'source-value-changed'],
 ['percent sign', '<p>Record 15% dilution.</p>', s => s.replace('15%', '15'), 'source-value-changed'],
 ['unit', '<p>Wait 3 minutes before sampling.</p>', s => s.replace('3 minutes', '3 seconds'), 'source-reading-order-changed'],
 ['negation', '<p>Do not open the sample container.</p>', s => s.replace('Do not open', 'Do now open'), 'source-reading-order-changed'],
 ['figure section', '<section><h2>Sunlight</h2>' + img + '<p>Record sunlight growth.</p></section><section><h2>Shade</h2><p>Record shade growth.</p></section>', s => s.replace(img, '').replace('<h2>Shade</h2>', '<h2>Shade</h2>' + img), 'image-association-changed'],
];
describe('strict repair preserves source associations in every document size', () => {
 for (const [label, body, change, reason] of badCases) {
  it.each([1, 36])('rejects ' + label + ' with %i paragraphs and retains review evidence', async count => {
   const h = make(change), input = doc(body + prose.repeat(count));
   expect(await h.run(input)).toBe(input);
   expect(h.evidence).toHaveLength(1);
   expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason }));
   expect(normalizeCandidateRejectionEvidence(JSON.parse(JSON.stringify(h.evidence[0])))).toEqual(Review.evidence(h.evidence[0]));
   expect(Review.evidence(h.evidence[0]).candidateRejections).toContainEqual(expect.objectContaining({ reason }));
   expect(JSON.stringify(h.evidence)).not.toMatch(/8742|teacher@|Seedling/);
  });
 }
});
describe('bounded accessibility additions remain useful', () => {
 it('accepts a useful alt on an image-only document', async () => {
  const input = doc('<img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="">');
  const out = input.replace('alt=""', 'alt="Two seedlings compare growth: the seedling under sunlight has four leaves and an upright stem; the seedling in shade has two leaves and a bent stem."');
  const h = make(() => out);
  expect(await h.run(input)).toBe(out);
  expect(h.evidence[0].candidateRejectionCount).toBe(0);
 });
 it('accepts descriptive link wording without changing the destination', async () => {
  const input = doc('<a href="https://school.example/assignment">Click here</a>' + prose);
  const h = make(s => s.replace('Click here', 'Read the assignment instructions'));
  expect(await h.run(input)).toContain('Read the assignment instructions');
  expect(h.evidence[0].candidateRejectionCount).toBe(0);
 });
 it('accepts a new local skip link with a real target', async () => {
  const input = doc(prose);
  const h = make(s => s.replace('<body>', '<body><a class="skip-link" href="#main">Skip to content</a>'));
  expect(await h.run(input)).toContain('Skip to content');
  expect(h.evidence[0].candidateRejectionCount).toBe(0);
 });
 it('accepts removal of explicit list ordinals without discarding prose digits', async () => {
  const input = doc('<ol><li>1. Complete 3 trials.</li><li>2. Record 8 observations.</li></ol>' + prose);
  const h = make(s => s.replace('1. Complete', 'Complete').replace('2. Record', 'Record'));
  expect(await h.run(input)).toContain('<li>Complete 3 trials.');
  expect(h.evidence[0].candidateRejectionCount).toBe(0);
 });
 it('keeps header promotion and language spans valid', async () => {
  const input = doc(table + prose);
  const h = make(s => s.replace('<td>Group</td>', '<th scope="col"><span lang="en">Group</span></th>'));
  expect(await h.run(input)).toContain('<th scope="col">');
 });
 it('does not allow unbounded alt text or unrelated attribute padding', async () => {
  const input = doc('<img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="">');
  for (const replacement of ['alt="' + 'A'.repeat(3000) + '"', 'alt="" data-padding="' + 'A'.repeat(3000) + '"']) {
   const h = make(s => s.replace('alt=""', replacement));
   expect(await h.run(input)).toBe(input);
   expect(h.evidence[0].candidateRejections[0].reason).toBe('size-growth-unexpected');
  }
 });
});

describe('source values remain exact without blocking equivalent typography', () => {
 it.each([['3.50', '3.5'], ['1,234', '1234']])('permits equivalent %s to %s formatting', async (before, after) => {
  const input=doc('<p>Recorded value '+before+' units.</p>'+prose);
  const h=make(s=>s.replace(before,after));
  expect(await h.run(input)).toBe(input.replace(before,after));
  expect(h.evidence[0].candidateRejectionCount).toBe(0);
 });
 it('does not round away changed large identifiers', async () => {
  const input=doc('<p>Record 9007199254740992 identifies this sample.</p>'+prose);
  const h=make(s=>s.replace('9007199254740992','9007199254740993'));
  expect(await h.run(input)).toBe(input);
  expect(h.evidence[0].candidateRejections[0].reason).toBe('source-value-changed');
 });
 it('preserves a preexisting figure caption', async () => {
  const input=doc('<figure>'+img+'<figcaption>Sunlight experiment</figcaption></figure>'+prose);
  const h=make(s=>s.replace('Sunlight experiment','Shaded experiment'));
  expect(await h.run(input)).toBe(input);
  expect(h.evidence[0].candidateRejections[0].reason).toBe('image-association-changed');
 });
});

describe('formatting and skip-link boundary regressions',()=>{
 it('permits numeric typography inside a source table',async()=>{
  const input=doc(table.replace('<td>95</td>','<td>95.00</td>')+prose);
  const h=make(s=>s.replace('<td>95.00</td>','<td>95</td>'));
  expect(await h.run(input)).toBe(input.replace('<td>95.00</td>','<td>95</td>'));
 });
 it('does not normalize a changed dotted version identifier',async()=>{
  const input=doc('<p>Version 1.2.0 is required for the assignment.</p>'+prose);
  const h=make(s=>s.replace('1.2.0','1.2'));
  expect(await h.run(input)).toBe(input);
 });
 it('allows a skip control when an existing ordinary link shares its target',async()=>{
  const input=doc('<a href="#main">Main section</a>'+prose);
  const h=make(s=>s.replace('<body>','<body><a class="skip-link" href="#main">Skip to content</a>'));
  expect(await h.run(input)).toContain('Skip to content');
  expect(h.evidence[0].candidateRejectionCount).toBe(0);
 });
});
