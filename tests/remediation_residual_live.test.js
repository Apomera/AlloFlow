import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const wrap = body => '<!doctype html><html lang="en"><body><main>' + body
  + '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8) + '</main></body></html>';
const image = '<img src="label.png" alt="Student name">';
const field = '<label for="student">' + image + '</label><input id="student" value="Ada">';
const table = '<table><tr><th scope="col">Group</th><th scope="col">Score</th></tr><tr><td>North</td><td>95</td></tr></table>';
const caption = (tag, text) => tag === 'figure' ? '<figure><figcaption>' + text + '</figcaption></figure>'
  : table.replace('<table>', '<table><caption>' + text + '</caption>');

const failures = [
  ['hidden native label overridden', '<label for="student" hidden>Student name</label><input id="student">', s => s.replace('<input ', '<input aria-label="Teacher name" '), 'form-state-changed'],
  ['hidden image native label overridden', field.replace('<label ', '<label style="display:none" '), s => s.replace('<input ', '<input aria-label="Teacher name" '), 'form-state-changed'],
  ['native label hidden by ancestor overridden', '<div hidden><label for="student"><span hidden>Student name</span></label></div><input id="student">', s => s.replace('<input ', '<input aria-label="Teacher name" '), 'form-state-changed'],
  ['image native label overridden', field, s => s.replace('<input ', '<input aria-label="Teacher name" '), 'form-state-changed'],
  ['implicit image label overridden', '<label>' + image + '<input value="Ada"></label>', s => s.replace('<input ', '<input aria-label="Teacher name" '), 'form-state-changed'],
  ['image alternative in native label changed', field, s => s.replace('alt="Student name"', 'alt="Teacher name"'), 'form-state-changed'],
  ['image label reference overridden', '<span id="label">' + image + '</span><input aria-labelledby="label">', s => s.replace('alt="Student name"', 'alt="Teacher name"'), 'form-state-changed'],
  ['descendant ARIA native label overridden', '<label for="student"><span role="img" aria-label="Student name"></span></label><input id="student">', s => s.replace('<input ', '<input aria-label="Teacher name" '), 'form-state-changed'],
  ['mixed text and alternative overridden', '<label for="student">Student <img src="label.png" alt="name"></label><input id="student">', s => s.replace('<input ', '<input aria-label="Teacher name" '), 'form-state-changed'],
  ['SVG title native label overridden', '<label for="student"><svg><title>Student name</title></svg></label><input id="student">', s => s.replace('<input ', '<input aria-label="Teacher name" '), 'form-state-changed'],
  ['button descendant alternative overridden', '<button>' + image + '</button>', s => s.replace('<button>', '<button aria-label="Teacher name">'), 'form-state-changed'],
  ['image description units retargeted', '<input aria-label="Weight" aria-describedby="kg"><span id="kg"><img src="kg.png" alt="Enter kilograms"></span><span id="lb"><img src="lb.png" alt="Enter pounds"></span>', s => s.replace('aria-describedby="kg"', 'aria-describedby="lb"'), 'form-state-changed'],
  ...['list', 'button', 'generic', 'grid', 'unknown list table', 'none table', 'presentation table'].map(role => [
    'native table role ' + role, table, s => s.replace('<table>', '<table role="' + role + '">'), 'table-semantics-changed',
  ]),
  ['existing grid downgraded', table.replace('<table>', '<table role="grid">'), s => s.replace('role="grid"', 'role="list"'), 'table-semantics-changed'],
  ['existing treegrid downgraded', table.replace('<table>', '<table role="treegrid">'), s => s.replace('role="treegrid"', 'role="list"'), 'table-semantics-changed'],
  ...['figure', 'table'].flatMap(tag => [
    [tag + ' caption exponent base moved', caption(tag, 'Compare x<sup>2</sup> plus y2.'), s => s.replace('x<sup>2</sup> plus y2', 'x2 plus y<sup>2</sup>'), 'math-content-changed'],
    [tag + ' caption subscript base moved', caption(tag, 'Compare H<sub>2</sub>O plus N2.'), s => s.replace('H<sub>2</sub>O plus N2', 'H2O plus N<sub>2</sub>'), 'math-content-changed'],
    [tag + ' caption script nesting changed', caption(tag, 'Compare x<sup>n<sub>i</sub></sup>.'), s => s.replace('<sup>n<sub>i</sub></sup>', '<sup>n</sup><sub>i</sub>'), 'math-content-changed'],
  ]),
];

describe('residual source meaning regressions', () => {
  for (const [label, body, change, reason] of failures) it('rejects ' + label + ' in the direct and repair gates', async () => {
    const source = wrap(body), candidate = change(source), h = make(change);
    expect(h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' })).toMatchObject({ accepted: false, reason });
    expect(await h.run(source)).toBe(source);
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason }));
  });
});

const controls = [
  ['equivalent hidden native name', '<label for="student" hidden>Student name</label><input id="student">', s => s.replace('<input ', '<input aria-label="Student name" ')],
  ['equivalent hidden image native name', field.replace('<label ', '<label style="display:none" '), s => s.replace('<input ', '<input aria-label="Student name" ')],
  ['equivalent native name hidden by ancestor', '<div hidden><label for="student"><span hidden>Student name</span></label></div><input id="student">', s => s.replace('<input ', '<input aria-label="Student name" ')],
  ['equivalent image native name', field, s => s.replace('<input ', '<input aria-label="Student name" ')],
  ['equivalent image reference name', field, s => s.replace('<label ', '<label id="label" ').replace('<input ', '<input aria-labelledby="label" ')],
  ['native image label ID rename', field, s => s.replace(/"student"/g, '"learner"')],
  ['image reference ID rename', '<span id="label">' + image + '</span><input aria-labelledby="label">', s => s.replace(/"label"/g, '"label-new"')],
  ['image label inline wrapper', field, s => s.replace(image, '<span>' + image + '</span>')],
  ['mixed equivalent name', '<label for="student">Student <img src="label.png" alt="name"></label><input id="student">', s => s.replace('<input ', '<input aria-label="Student name" ')],
  ['descendant ARIA equivalent name', '<label for="student"><span role="img" aria-label="Student name"></span></label><input id="student">', s => s.replace('<input ', '<input aria-label="Student name" ')],
  ['hidden decorative label content excluded', '<label for="student">Student name<span aria-hidden="true"> decorative</span></label><input id="student">', s => s.replace('<input ', '<input aria-label="Student name" ')],
  ['hidden directly referenced image name', '<span id="label" hidden>' + image + '</span><input aria-labelledby="label">', s => s.replace(/"label"/g, '"renamed"')],
  ['empty source image name repaired', field.replace('alt="Student name"', 'alt=""'), s => s.replace('alt=""', 'alt="Student name"')],
  ['empty reference cycle repaired', '<span id="label" aria-labelledby="label"></span><input aria-labelledby="label">', s => s.replace('<span id="label"', '<span aria-label="Student name" id="label"')],
  ...['table', 'unknown table', 'unknown', 'table list', 'unknown table list'].map(role => [
    'effective native table role ' + role, table, s => s.replace('<table>', '<table role="' + role + '">'),
  ]),
  ['explicit table role removed', table.replace('<table>', '<table role="table">'), s => s.replace(' role="table"', '')],
  ['existing list table repaired', table.replace('<table>', '<table role="list">'), s => s.replace(' role="list"', '')],
  ['existing presentation table repaired', table.replace('<table>', '<table role="presentation">'), s => s.replace(' role="presentation"', '')],
  ['existing grid role fallback retained', table.replace('<table>', '<table role="grid">'), s => s.replace('role="grid"', 'role="unknown grid table"')],
  ...['figure', 'table'].flatMap(tag => [
    [tag + ' caption expression inline wrapper', caption(tag, 'Compare x<sup>2</sup> plus y2.'), s => s.replace('x<sup>2</sup>', '<span>x</span><sup><span>2</span></sup>')],
    [tag + ' caption surrounding wrapper', caption(tag, 'Compare x<sup>2</sup> plus y2.'), s => s.replace('x<sup>2</sup>', '<strong>x<sup>2</sup></strong>')],
    [tag + ' nested caption inline wrapper', caption(tag, 'Compare x<sup>n<sub>i</sub></sup>.'), s => s.replace('<sub>i</sub>', '<sub><span>i</span></sub>')],
    [tag + ' caption footnote wrapper', caption(tag, 'Read the source<sup><a href="https://school.example/note">Read the original source note</a></sup>.'), s => s.replace('<sup>', '<sup><span>').replace('</sup>', '</span></sup>')],
    [tag + ' canonically equivalent prefix', caption(tag, 'Cafe\u0301 area in m<sup>2</sup>.'), s => s.replace('Cafe\u0301', 'Caf\u00e9')],
  ]),
  ['descriptive footnote link improvement', '<p>Read the source<sup><a href="https://school.example/note">Note</a></sup>.</p>', s => s.replace('>Note</a>', '>Read the original source note</a>')],
];

describe('valid repairs retain native naming and source attachment', () => {
  for (const [label, body, change] of controls) it('accepts ' + label, async () => {
    const source = wrap(body), candidate = change(source), h = make(change);
    expect(h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' })).toMatchObject({ accepted: true });
    expect(await h.run(source)).toBe(candidate);
    expect(h.evidence[0].candidateRejectionCount).toBe(0);
    expect(candidate).not.toContain('alloflowpreservation');
  });
});
