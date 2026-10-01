import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const wrap = body => '<!doctype html><html lang="en"><body><main>' + body
  + '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8) + '</main></body></html>';
const nativeField = '<label for="student">Student name</label><input id="student" value="Ada">';
const weightField = '<label for="weight">Weight</label><input id="weight" aria-describedby="kg"><p id="kg">Enter weight in kilograms.</p><p id="lb">Enter weight in pounds.</p>';
const table = '<table><tr><th scope="col">Group</th><th scope="col">Score</th></tr><tr><td>North</td><td>95</td></tr></table>';

const rejected = [
  ['native label ARIA override', nativeField, s => s.replace('<input ', '<input aria-label="Teacher name" '), 'form-state-changed'],
  ['native label reference override', nativeField + '<span id="other">Teacher name</span>', s => s.replace('<input ', '<input aria-labelledby="other" '), 'form-state-changed'],
  ['implicit label ARIA override', '<label>Student name<input value="Ada"></label>', s => s.replace('<input ', '<input aria-label="Teacher name" '), 'form-state-changed'],
  ['button native text override', '<button>Save original work</button>', s => s.replace('<button>', '<button aria-label="Delete original work">'), 'form-state-changed'],
  ['image button native alt override', '<input type="image" alt="Save original work">', s => s.replace('<input ', '<input aria-label="Delete original work" '), 'form-state-changed'],
  ['description reassignment', weightField, s => s.replace('aria-describedby="kg"', 'aria-describedby="lb"'), 'form-state-changed'],
  ['description removal', weightField, s => s.replace(' aria-describedby="kg"', ''), 'form-state-changed'],
  ['description reference missing after ID change', weightField, s => s.replace('id="kg"', 'id="renamed"'), 'form-state-changed'],
  ['direct ARIA description change', '<input aria-label="Weight" aria-description="Enter kilograms">', s => s.replace('Enter kilograms', 'Enter pounds'), 'form-state-changed'],
  ['new description overrides title', '<input aria-label="Weight" title="Enter kilograms">', s => s.replace('<input ', '<input aria-description="Enter pounds" '), 'form-state-changed'],
  ['ordered multi-reference description', '<input aria-label="Direction" aria-describedby="first second"><p id="first">First go north.</p><p id="second">Then go south.</p>', s => s.replace('first second', 'second first'), 'form-state-changed'],
  ['details reassignment', weightField.replace('aria-describedby', 'aria-details'), s => s.replace('aria-details="kg"', 'aria-details="lb"'), 'form-state-changed'],
  ['error association reassignment', weightField.replace('aria-describedby', 'aria-errormessage'), s => s.replace('aria-errormessage="kg"', 'aria-errormessage="lb"'), 'form-state-changed'],
  ['linked exponent attachment', '<p>Compute <a href="https://school.example/expression">x<sup>2</sup> plus y2</a>.</p>', s => s.replace('x<sup>2</sup> plus y2', 'x2 plus y<sup>2</sup>'), 'math-content-changed'],
  ['linked subscript attachment', '<p>Compare <a href="https://school.example/expression">H<sub>2</sub>O plus N2</a>.</p>', s => s.replace('H<sub>2</sub>O plus N2', 'H2O plus N<sub>2</sub>'), 'math-content-changed'],
  ['exponent moved between links', '<p>Compute <a href="https://school.example/first">x<sup>2</sup></a> plus <a href="https://school.example/second">y2</a>.</p>', s => s.replace('x<sup>2</sup>', 'x2').replace('>y2</a>', '>y<sup>2</sup></a>'), 'math-content-changed'],
  ['linked exponent base changed', '<p>Compute <a href="https://school.example/expression">x<sup>2</sup></a>.</p>', s => s.replace('>x<sup>', '>y<sup>'), 'math-content-changed'],
  ...['cell', 'gridcell', 'button', 'none', 'presentation', 'rowheader', 'unknown cell columnheader'].map(role => ['header explicit role ' + role, table, s => s.replace(/<th /g, '<th role="' + role + '" '), 'table-semantics-changed']),
];

describe('live source guard rejects reviewed semantic regressions', () => {
  for (const [name, body, change, reason] of rejected) it(name, async () => {
    const input = wrap(body), candidate = change(input), h = make(change);
    expect(h.acceptFixedHtmlDetailed(candidate, input, { strictContent: true, mode: 'faithful' })).toMatchObject({ accepted: false, reason });
    expect(await h.run(input)).toBe(input);
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason }));
  });
});

const accepted = [
  ['equivalent native label', nativeField, s => s.replace('<input ', '<input aria-label="Student name" ')],
  ['equivalent native reference', nativeField, s => s.replace('<label ', '<label id="label" ').replace('<input ', '<input aria-labelledby="label" ')],
  ['multiple equivalent native labels', '<label for="student">Student</label><label for="student">name</label><input id="student">', s => s.replace('<input ', '<input aria-label="Student name" ')],
  ['consistent native label ID rename', nativeField, s => s.replace(/"student"/g, '"learner"')],
  ['consistent description ID rename', weightField, s => s.replace(/"kg"/g, '"kilograms"')],
  ['equivalent description source', '<input aria-label="Weight" aria-description="Enter kilograms"><p id="kg">Enter kilograms</p>', s => s.replace('aria-description="Enter kilograms"', 'aria-describedby="kg"')],
  ['description addition to unlabeled description', '<input aria-label="Weight"><p id="kg">Enter kilograms</p>', s => s.replace('<input ', '<input aria-describedby="kg" ')],
  ['missing description reference repaired', '<input aria-label="Weight" aria-describedby="missing"><p id="kg">Enter kilograms</p>', s => s.replace('aria-describedby="missing"', 'aria-describedby="kg"')],
  ['details and error consistent ID rename', weightField.replace('aria-describedby="kg"', 'aria-details="kg" aria-errormessage="kg"'), s => s.replace(/"kg"/g, '"kilograms"')],
  ['linked exponent inline wrapper', '<p>Compute <a href="https://school.example/expression">x<sup>2</sup> plus y2</a>.</p>', s => s.replace('x<sup>2</sup>', '<span>x</span><sup><span>2</span></sup>')],
  ['linked numeric formatting', '<p>Compute <a href="https://school.example/expression">1000x<sup>2</sup></a>.</p>', s => s.replace('>1000x<sup>', '>1,000x<sup>')],
  ['descriptive link inside footnote', '<p>Read the source<sup><a href="https://school.example/note">Note</a></sup>.</p>', s => s.replace('>Note</a>', '>Read the original source note</a>')],
  ['descriptive ordinary link', '<p><a href="https://school.example/note">Read more</a>.</p>', s => s.replace('Read more', 'Read the original source note')],
  ['explicit matching header role', table, s => s.replace(/<th /g, '<th role="columnheader" ')],
  ['invalid fallback then matching role', table, s => s.replace(/<th /g, '<th role="unknown columnheader" ')],
  ['unrecognized role retains native header', table, s => s.replace(/<th /g, '<th role="unknown" ')],
  ['correct simple first-row scope', table.replace(/scope="col"/g, 'scope="row"'), s => s.replace(/scope="row"/g, 'scope="col"')],
  ['correct explicit role with simple scope', table.replace(/scope="col"/g, 'scope="row" role="rowheader"'), s => s.replace(/scope="row" role="rowheader"/g, 'scope="col" role="columnheader"')],
  ['repair existing downgraded header', table.replace(/<th /g, '<th role="cell" '), s => s.replace(/ role="cell"/g, '')],
];

describe('live source guard retains valid accessibility repairs', () => {
  for (const [name, body, change] of accepted) it(name, async () => {
    const input = wrap(body), candidate = change(input), h = make(change);
    expect(h.acceptFixedHtmlDetailed(candidate, input, { strictContent: true, mode: 'faithful' })).toMatchObject({ accepted: true });
    expect(await h.run(input)).toBe(candidate);
    expect(h.evidence[0].candidateRejectionCount).toBe(0);
  });
});
