import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const wrap = body => '<!doctype html><html lang="en"><body><main>' + body
  + '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8) + '</main></body></html>';
const group = '<fieldset id="student"><legend>Student details</legend><label for="name">Name</label><input id="name"></fieldset>';
const units = '<label for="area">Area (m²)</label><input id="area">';
const failures = [
  ...['textarea', 'input'].flatMap(tag => {
    const control = attrs => '<' + tag + ' aria-label="Response" ' + attrs + '>' + (tag === 'textarea' ? '</textarea>' : '');
    return [
      [tag + ' shortened limit', control('maxlength="200"'), s => s.replace('maxlength="200"', 'maxlength="5"')],
      [tag + ' removed limit', control('maxlength="200"'), s => s.replace(' maxlength="200"', '')],
      [tag + ' new limit', control(''), s => s.replace('aria-label=', 'maxlength="5" aria-label=')],
      [tag + ' raised minimum', control('minlength="2"'), s => s.replace('minlength="2"', 'minlength="20"')],
      [tag + ' removed minimum', control('minlength="2"'), s => s.replace(' minlength="2"', '')],
    ];
  }),
  ...['search', 'url', 'tel', 'email', 'password'].map(type => [type + ' length limit', '<input type="' + type + '" maxlength="200" aria-label="Response">', s => s.replace('maxlength="200"', 'maxlength="5"')]),
  ['lost named fieldset', group, s => s.replace('<label', '</fieldset><label').replace('<input id="name"></fieldset>', '<input id="name">')],
  ['removed legend association', group, s => s.replace('<legend>', '<p>').replace('</legend>', '</p>')],
  ['overridden fieldset name', group, s => s.replace('<fieldset ', '<fieldset aria-label="Teacher details" ')],
  ['reassigned fieldset name', '<span id="student-label">Student details</span><span id="teacher-label">Teacher details</span>' + group.replace('<fieldset ', '<fieldset aria-labelledby="student-label" '), s => s.replace('aria-labelledby="student-label"', 'aria-labelledby="teacher-label"')],
  ['lost outer fieldset', '<fieldset><legend>School</legend>' + group + '</fieldset>', s => s.replace('</legend><fieldset', '</legend></fieldset><fieldset').replace('</fieldset></fieldset>', '</fieldset>')],
  ['nested group order', '<fieldset aria-label="School"><fieldset aria-label="Student"><label>Name<input></label></fieldset></fieldset>', s => s.replace('aria-label="School"', 'aria-label="TEMP"').replace('aria-label="Student"', 'aria-label="School"').replace('aria-label="TEMP"', 'aria-label="Student"')],
  ['image legend name', group.replace('Student details</legend>', '<img alt="Student details" src="group.png"></legend>'), s => s.replace('<fieldset ', '<fieldset aria-label="Teacher details" ')],
  ['units in native label overridden', units, s => s.replace('<input ', '<input aria-label="Area (m2)" ')],
  ['units in descendant ARIA name', '<label for="area"><span role="img" aria-label="Area (m²)"></span></label><input id="area">', s => s.replace('aria-label="Area (m²)"', 'aria-label="Area (m2)"')],
  ['units in description', '<input aria-label="Area" aria-description="Answer in m²">', s => s.replace('Answer in m²', 'Answer in m2')],
  ['units in referenced alternative', '<span id="units"><img src="units.png" alt="Answer in m²"></span><input aria-label="Area" aria-describedby="units">', s => s.replace('Answer in m²', 'Answer in m2')],
  ['subscript in input name', '<input aria-label="H₂O volume">', s => s.replace('H₂O', 'H2O')],
  ['units in legend alternative', '<fieldset aria-label="Area (m²)"><label>Answer<input></label></fieldset>', s => s.replace('Area (m²)', 'Area (m2)')],
];

describe('form context preservation', () => {
  for (const [label, body, change] of failures) it('rejects ' + label, async () => {
    const source = wrap(body), candidate = change(source), h = make(change);
    expect(candidate).not.toBe(source);
    expect(h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' })).toMatchObject({ accepted: false, reason: 'form-state-changed' });
    expect(await h.run(source)).toBe(source);
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason: 'form-state-changed' }));
  });
});

const controls = [
  ['length formatting', '<textarea aria-label="Response" maxlength="200" minlength="2"></textarea>', s => s.replace('maxlength="200"', 'maxlength="0200"').replace('minlength="2"', 'minlength="02"')],
  ['textarea wrapper', '<textarea aria-label="Response" maxlength="200"></textarea>', s => s.replace('<textarea', '<div><textarea').replace('</textarea>', '</textarea></div>')],
  ['invalid lengths remain ineffective', '<textarea aria-label="Response" maxlength="-1" minlength="-1"></textarea>', s => s.replace(' maxlength="-1" minlength="-1"', '')],
  ['number length attributes ineffective', '<input type="number" aria-label="Response" maxlength="200">', s => s.replace('maxlength="200"', 'maxlength="5"')],
  ['group wrapper', group, s => s.replace('<label', '<div><label').replace('</fieldset>', '</div></fieldset>')],
  ['group identifier rename', group, s => s.replace('id="student"', 'id="learner"')],
  ['equivalent group ARIA name', group, s => s.replace('<fieldset ', '<fieldset aria-label="Student details" ')],
  ['added unnamed outer fieldset', group, s => s.replace('<fieldset ', '<fieldset><fieldset ').replace('</fieldset>', '</fieldset></fieldset>')],
  ['existing unnamed group acquires name', '<fieldset><label>Name<input></label></fieldset>', s => s.replace('<fieldset>', '<fieldset aria-label="Student">')],
  ['existing context gains outer context', group, s => s.replace('<fieldset ', '<fieldset aria-label="School"><fieldset ').replace('</fieldset>', '</fieldset></fieldset>')],
  ['canonical native name', '<label for="name">Café</label><input id="name">', s => s.replace('<input ', '<input aria-label="Cafe\u0301" ')],
  ['canonical descendant name', '<label><span aria-label="Café"></span><input></label>', s => s.replace('aria-label="Café"', 'aria-label="Cafe\u0301"')],
  ['canonical description', '<input aria-label="Response" aria-description="Café">', s => s.replace('aria-description="Café"', 'aria-description="Cafe\u0301"')],
  ['canonical fieldset', '<fieldset aria-label="Café"><label>Name<input></label></fieldset>', s => s.replace('aria-label="Café"', 'aria-label="Cafe\u0301"')],
  ['preserved units name', units, s => s.replace('<input ', '<input aria-label="Area (m²)" ')],
];
describe('equivalent form context repairs', () => {
  for (const [label, body, change] of controls) it('accepts ' + label, async () => {
    const source = wrap(body), candidate = change(source), h = make(change);
    expect(h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' })).toMatchObject({ accepted: true });
    expect(await h.run(source)).toBe(candidate);
    expect(h.evidence[0].candidateRejectionCount).toBe(0);
  });
});
