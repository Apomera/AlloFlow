import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
const source = fs.readFileSync('doc_pipeline_source.jsx', 'utf8');
const begin = source.indexOf('        const formState = doc => {');
const end = source.indexOf('        const af = formState(before)', begin);
if (begin < 0 || end < 0) throw Error('Missing form-state boundaries');
const norm = s => String(s || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
const nodes = (root, selector) => Array.from(root.querySelectorAll(selector));
const indexed = new Function('nodes', 'norm', source.slice(begin, end) + '\nreturn formState;')(nodes, norm);
const parse = html => new DOMParser().parseFromString(html, 'text/html');
const fixtures = [
 ['implicit', '<label>Name <input value="Ada"></label>'],
 ['explicit', '<label for="student">Student name</label><input id="student" value="Ada">'],
 ['multiple', '<label for="x">First label</label><input id="x"><label for="x">Second label</label>'],
 ['explicit overrides nested', '<label for="x">Name <input id="y"></label><input id="x">'],
 ['unresolved explicit', '<label for="missing">Name <input></label>'],
 ['empty explicit', '<label for="">Name <input></label>'],
 ['hidden controls', '<label>Hidden <input type="hidden"><input type="text"></label>'],
 ['duplicate IDs', '<label for="x">Name</label><input id="x"><input id="x">'],
 ['nonlabelable first ID', '<div id="x">First match</div><label for="x">Name</label><input id="x">'],
 ['nested labels', '<label>Outer<label>Inner<input></label></label>'],
 ['other controls', '<label>Choice<select><option>North</option></select></label><label>Notes<textarea>Text</textarea></label><label>Submit<button>Go</button></label>'],
 ['external form', '<form id="first"></form><form id="second"></form><input form="second"><label for="a">Name</label><input id="a" form="first">'],
 ['explicit form overrides ancestor', '<form id="first"><input form="second"></form><form id="second"></form>'],
 ['invalid form target', '<div id="first"></div><form id="first"><input form="first"></form>'],
];
describe('indexed form associations match native DOM semantics', () => {
 it.each(fixtures)('%s', (_, html) => {
  const doc = parse(html), controls = nodes(doc, 'form,input,select,textarea,button'), forms = nodes(doc, 'form');
  const actual = indexed(doc);
  expect(actual.map(x => x.labels)).toEqual(controls.map(el => Array.from(el.labels || []).map(label => norm(label.textContent))));
  expect(actual.map(x => x.state[2])).toEqual(controls.map(el => el.form ? forms.indexOf(el.form) : -1));
 });
 it('does not reuse stale label or form indexes after the document changes', () => {
  const doc = parse('<form id="a"></form><form id="b"></form><label for="x">Name</label><input id="x" form="a"><input id="y" form="b">');
  expect(indexed(doc)[2]).toMatchObject({ labels: ['Name'] });
  doc.querySelector('label').htmlFor = 'y'; doc.getElementById('x').setAttribute('form', 'b');
  const updated = indexed(doc);
  expect(updated[2].labels).toEqual([]); expect(updated[2].state[2]).toBe(1);
  expect(updated[3].labels).toEqual(['Name']);
 });
});
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
describe('indexed associations still enforce source preservation', () => {
 it('rejects reassignment of a label between unchanged controls', async () => {
  const input = '<html><body><label for="a">Student name</label><input id="a" value="Ada"><input id="b" value="Lin"><p>Read the original instructions carefully before completing the worksheet.</p></body></html>';
  const h = make(s => s.replace('for="a"', 'for="b"'));
  expect(await h.run(input)).toBe(input);
  expect(h.evidence[0].candidateRejections[0]).toMatchObject({ reason: 'form-state-changed', sourceLocation: 'control:1' });
 });
 it('accepts a label-preserving ID rename in a document with many controls', async () => {
  const input = '<html lang="en"><body>' + Array.from({ length: 80 }, (_, i) => '<label for="f' + i + '">Student ' + i + '</label><input id="f' + i + '" value="Ada">').join('') + '</body></html>';
  const change = s => s.replace(/"f([0-9]+)"/g, '"field$1"');
  const h = make(change);
  expect(await h.run(input)).toBe(change(input));
 });
});
