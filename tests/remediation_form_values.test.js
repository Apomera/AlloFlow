import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const wrap = body => '<!doctype html><html lang="en"><body><main>' + body
  + '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8) + '</main></body></html>';
const form = '<form><label>Required response<input required></label><button>Submit response</button></form>';
const range = '<label>Temperature<input type="range" value="50" aria-valuetext="Warm"></label>';
const failures = [
  ['form bypass added', form, s => s.replace('<form>', '<form novalidate>')],
  ['form bypass removed', form.replace('<form>', '<form novalidate>'), s => s.replace(' novalidate', '')],
  ['default submitter bypass added', form, s => s.replace('<button>', '<button formnovalidate>')],
  ['submitter bypass removed', form.replace('<button>', '<button formnovalidate>'), s => s.replace(' formnovalidate', '')],
  ...['submit', 'image'].map(type => [type + ' input bypass added', '<form><label>Response<input required></label><input type="' + type + '" aria-label="Submit response"></form>', s => s.replace('aria-label="Submit response"', 'aria-label="Submit response" formnovalidate')]),
  ['external submitter bypass added', '<form id="answers"><input required aria-label="Response"></form><button form="answers">Submit</button>', s => s.replace('<button ', '<button formnovalidate ')],
  ['range value text changed', range, s => s.replace('aria-valuetext="Warm"', 'aria-valuetext="Cold"')],
  ['range value text removed', range, s => s.replace(' aria-valuetext="Warm"', '')],
  ['number value text changed', '<input type="number" value="2" aria-label="Volume" aria-valuetext="Two liters">', s => s.replace('Two liters', 'Two gallons')],
  ['value text units flattened', '<input type="range" aria-label="Area" aria-valuetext="2 m²">', s => s.replace('2 m²', '2 m2')],
];
const controls = [
  ['form bypass boolean spelling', form.replace('<form>', '<form novalidate>'), s => s.replace('novalidate>', 'novalidate="novalidate">')],
  ['submitter bypass boolean spelling', form.replace('<button>', '<button formnovalidate>'), s => s.replace('formnovalidate>', 'formnovalidate="false">')],
  ['non-submit button attribute is inert', form.replace('<button>', '<button type="button">'), s => s.replace('type="button"', 'type="button" formnovalidate')],
  ['non-submit input attribute is inert', '<input type="text" aria-label="Response">', s => s.replace('<input ', '<input formnovalidate ')],
  ['canonical value text', '<input type="range" aria-label="Choice" aria-valuetext="Café">', s => s.replace('Café', 'Cafe\u0301')],
  ['value text whitespace', range, s => s.replace('aria-valuetext="Warm"', 'aria-valuetext="  Warm  "')],
  ['missing value text repaired', range.replace(' aria-valuetext="Warm"', ''), s => s.replace('value="50"', 'value="50" aria-valuetext="Warm"')],
  ['existing empty value text repaired', range.replace('aria-valuetext="Warm"', 'aria-valuetext=""'), s => s.replace('aria-valuetext=""', 'aria-valuetext="Warm"')],
];
describe('form validation and accessible values', () => {
  for (const [name, body, change] of failures) it('rejects ' + name, async () => {
    const source = wrap(body), candidate = change(source), h = make(change);
    expect(h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' })).toMatchObject({ accepted: false, reason: 'form-state-changed' });
    expect(await h.run(source)).toBe(source);
  });
  for (const [name, body, change] of controls) it('accepts ' + name, async () => {
    const source = wrap(body), candidate = change(source), h = make(change);
    expect(h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' })).toMatchObject({ accepted: true });
    expect(await h.run(source)).toBe(candidate);
  });
});

const optionLabels = JSON.parse(fs.readFileSync('tests/fixtures/remediation_option_labels.json', 'utf8'));
describe('native option labels preserve choice meaning', () => {
  for (const entry of optionLabels) it(entry.id, async () => {
    const source = wrap(entry.source), candidate = wrap(entry.candidate), h = make(() => candidate);
    const decision = h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' });
    expect(decision.accepted).toBe(entry.accepted);
    if (!entry.accepted) expect(decision.reason).toBe('form-state-changed');
    expect(await h.run(source)).toBe(entry.accepted ? candidate : source);
  });
});

const submissionState = JSON.parse(fs.readFileSync('tests/fixtures/remediation_submission_state.json', 'utf8'));
describe('native form submission rules preserve payloads', () => {
  for (const entry of submissionState) it(entry.id, async () => {
    const h = make(() => entry.candidate);
    const decision = h.acceptFixedHtmlDetailed(entry.candidate, entry.source, { strictContent: true, mode: 'faithful' });
    expect(decision.accepted).toBe(entry.accepted);
    if (!entry.accepted) expect(decision.reason).toBe('form-state-changed');
    expect(await h.run(entry.source)).toBe(entry.accepted ? entry.candidate : entry.source);
  });
});

const submissionTargets = JSON.parse(fs.readFileSync('tests/fixtures/remediation_submission_targets.json', 'utf8'));
describe('effective form submission destinations survive remediation', () => {
  for (const entry of submissionTargets) it(entry.id, async () => {
    const h = make(() => entry.candidate);
    const decision = h.acceptFixedHtmlDetailed(entry.candidate, entry.source, { strictContent: true, mode: 'faithful' });
    expect(decision.accepted).toBe(entry.accepted);
    if (!entry.accepted) expect(decision.reason).toBe('form-state-changed');
    expect(await h.run(entry.source)).toBe(entry.accepted ? entry.candidate : entry.source);
  });
});
