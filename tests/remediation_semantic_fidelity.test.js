import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Review = require('../remediation_review_helpers.js');
const { normalizeCandidateRejectionEvidence } = require('../desktop/mcp/remediation_verification.cjs');
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const doc = body => '<!DOCTYPE html><html lang="en"><body><main>' + body + '<p>Read the instructions carefully and record the original observations in your notebook. '.repeat(5) + '</p></main></body></html>';
const table = '<table><tr><th id="name" scope="col">Name</th><th id="score" scope="col">Score</th></tr><tr><td headers="name">Ada</td><td headers="score">95</td></tr></table>';
const cases = [
 ['ARIA hiding', '<p>Retain this important instruction.</p>', s => s.replace('<p>', '<p aria-hidden="true">'), 'source-visibility-changed'],
 ['inline hiding', '<p>Retain this important instruction.</p>', s => s.replace('<p>', '<p style="display:none">'), 'source-visibility-changed'],
 ['hidden ancestor', '<section><p>Retain this instruction.</p></section>', s => s.replace('<section>', '<section hidden>'), 'source-visibility-changed'],
 ['CSS hiding', '<style>.quiet{display:none}</style><p>Retain this instruction.</p>', s => s.replace('<p>', '<p class="quiet">'), 'source-visibility-changed'],
 ['table role', table, s => s.replace('<table>', '<table role="presentation">'), 'table-semantics-changed'],
 ['header downgrade', table, s => s.replace(/<th /g, '<td ').replace(/<\/th>/g, '</td>'), 'table-semantics-changed'],
 ['wrong header association', table, s => s.replace('headers="score"', 'headers="name"'), 'table-semantics-changed'],
 ['form value', '<label>Name <input name="student" value="Ada"></label>', s => s.replace('value="Ada"', 'value="Lin"'), 'form-state-changed'],
 ['checkbox state', '<label><input type="checkbox" checked>Consent</label>', s => s.replace(' checked', ''), 'form-state-changed'],
 ['form destination', '<form action="/submit"><input name="student" value="Ada"></form>', s => s.replace('/submit', '/other'), 'form-state-changed'],
 ['form label', '<label for="student">Name</label><input id="student" value="Ada">', s => s.replace('for="student"', 'for="missing"'), 'form-state-changed'],
 ['ARIA form label', '<input aria-label="Student name" value="Ada">', s => s.replace('Student name', 'Teacher name'), 'form-state-changed'],
 ['select state', '<select><option selected>North</option><option>South</option></select>', s => s.replace('<option selected>North</option><option>', '<option>North</option><option selected>'), 'form-state-changed'],
 ['math operator', '<math><mi>x</mi><mo>+</mo><mi>y</mi></math>', s => s.replace('<mo>+</mo>', '<mo>−</mo>'), 'math-content-changed'],
 ['math structure', '<math><msup><mi>x</mi><mn>2</mn></msup></math>', s => s.replace(/msup/g, 'msub'), 'math-content-changed'],
 ['CJK wording', '<p>不要打开容器。</p>', s => s.replace('不要打开', '现在打开'), 'source-reading-order-changed'],
 ['Arabic wording', '<p>لا تفتح الحاوية.</p>', s => s.replace('لا تفتح', 'ثم افتح'), 'source-reading-order-changed'],
];
describe('semantic fidelity failures retain source content', () => {
 for (const [label, body, change, reason] of cases) it(label, async () => {
  const input = doc(body), h = make(change);
  expect(await h.run(input)).toBe(input);
  expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason }));
  expect(normalizeCandidateRejectionEvidence(h.evidence[0])).toEqual(Review.evidence(h.evidence[0]));
 });
});
describe('legitimate semantic repairs remain accepted', () => {
 it.each([
  ['unhide', '<p hidden>Read this instruction.</p>', s => s.replace(' hidden', '')],
  ['contrast', '<p style="color:#aaa">Read this instruction.</p>', s => s.replace('#aaa', '#111')],
  ['form label', '<input id="name" value="Ada">', s => s.replace('<input', '<input aria-label="Student name"')],
  ['math description', '<math><mi>x</mi><mo>+</mo><mi>y</mi></math>', s => s.replace('<math>', '<math aria-label="x plus y">')],
  ['multilingual span', '<p>不要打开容器。</p>', s => s.replace('不要打开容器。', '<span lang="zh">不要打开容器。</span>')],
  ['header IDs', table, s => s.replace(/"score"/g, '"score-new"')],
 ])('%s', async (_, body, change) => {
  const input = doc(body), h = make(change);
  expect(await h.run(input)).toBe(change(input));
 });
});

describe('source-location evidence remains bounded and useful', () => {
 it('retains an exact cell location through canonical JSON and review rendering', async () => {
  const h = make(s => s.replace('<td headers="score">95</td>', '<td headers="score">96</td>'));
  await h.run(doc(table));
  const evidence = normalizeCandidateRejectionEvidence(JSON.parse(JSON.stringify(h.evidence[0])));
  expect(evidence.candidateRejections[0].sourceLocation).toBe('table:1/row:2/cell:2');
  expect(Review.reviewItems(evidence, {})[0].locationLabel).toContain('table 1, row 2, cell 2');
 });
 it.each(['PRIVATE', '<img src=x>', 'table:0', 'table:1/row:999999999', 'table:1/cell:2\nPRIVATE'])('drops malformed location %s', sourceLocation => {
  const input = { candidateRejections: [{ chunkId: '1', phase: 'chunk', reason: 'table-content-changed', sourceLocation }] };
  expect(Review.evidence(input).candidateRejections[0]).not.toHaveProperty('sourceLocation');
  expect(normalizeCandidateRejectionEvidence(input)).toEqual(Review.evidence(input));
 });
});
