// A fillable PDF becomes an unfillable web page, and until now it did so silently.
//
// Extraction reads text and pixels; a form control is neither, so all 35 Widget
// annotations in a real practice form vanished from the output with no note. That
// matters more than it first looks: those fields usually carry the author's own
// tooltip (the PDF /TU entry) as an accessible NAME, so in that one respect the
// source was MORE accessible than the remediated result — and a teacher handing
// the HTML to a student expecting them to type answers has no way to know.
//
// The pipeline already had exactly the right machinery for this: the structural
// fidelity notes that report dropped links and collapsed tables. This adds form
// controls to it, with advice a teacher can act on rather than a bare count.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const start = 'function _computeStructuralFidelityNotes(srcText, outHtml, srcCounts) {';
const i = SRC.indexOf(start);
if (i === -1) throw new Error('_computeStructuralFidelityNotes not found');
// Runs to the first return of the notes array at function scope.
const end = '\n  return notes;\n}';
const j = SRC.indexOf(end, i);
if (j === -1) throw new Error('end marker not found');
// The function calls exactly one helper it does not define (_detectRefusalText,
// which spots a model refusing to process a document). Stubbing it keeps this a
// focused test of the fidelity-note logic; the scan below fails loudly if a
// future edit adds another dependency, rather than silently testing a stub.
const externalHelpers = [...new Set([...SRC.slice(i, j).matchAll(/\b(_[A-Za-z][A-Za-z0-9_]*)\s*\(/g)].map((m) => m[1]))]
  .filter((n) => !new RegExp('\\b(?:const|let|var|function)\\s+' + n + '\\b').test(SRC.slice(i, j)));
if (externalHelpers.join(',') !== '_detectRefusalText') {
  throw new Error('unexpected external dependencies: ' + externalHelpers.join(', ') + ' — add a stub or rework this harness');
}
// eslint-disable-next-line no-new-func
const notesFor = new Function('_detectRefusalText', SRC.slice(i, j + end.length) + '\nreturn _computeStructuralFidelityNotes;')(() => null);

const kinds = (notes) => notes.map((n) => n.kind);
const find = (notes, kind) => notes.find((n) => n.kind === kind);

describe('form-field loss is reported, not swallowed', () => {
  it('flags a fillable source whose output has no controls', () => {
    const notes = notesFor('some text', '<main><p>Name:</p></main>', { formFields: { fields: 35, widgets: 35, withAccessibleName: 35 } });
    const n = find(notes, 'formFields');
    expect(n, 'no formFields note: ' + kinds(notes).join(',')).toBeTruthy();
    expect(n.msg).toContain('35 field(s)');
    expect(n.msg).toContain('can be read but not filled in');
    // The actionable half — a bare count would leave the teacher stuck.
    expect(n.msg).toMatch(/tagged PDF|editable copy/);
  });

  // Losing an author-supplied accessible name is the sharper part of the loss.
  it('says how many fields carried the author’s own label', () => {
    const n = find(notesFor('t', '<main></main>', { formFields: { fields: 35, widgets: 35, withAccessibleName: 30 } }), 'formFields');
    expect(n.msg).toContain('30');
    expect(n.msg).toMatch(/field label/);
  });

  it('omits the label clause when the source supplied none', () => {
    const n = find(notesFor('t', '<main></main>', { formFields: { fields: 4, widgets: 4, withAccessibleName: 0 } }), 'formFields');
    expect(n.msg).toContain('4 field(s)');
    expect(n.msg).not.toMatch(/field label/);
  });

  // The note must describe a real loss, or it is just noise on every run.
  it('stays quiet when the output carries the controls through', () => {
    const html = '<form>' + '<input type="text">'.repeat(4) + '</form>';
    expect(find(notesFor('t', html, { formFields: { fields: 4, widgets: 4, withAccessibleName: 4 } }), 'formFields')).toBeUndefined();
  });

  it('counts textarea and select as carried-through controls too', () => {
    const html = '<form><input><textarea></textarea><select></select></form>';
    expect(find(notesFor('t', html, { formFields: { fields: 3, widgets: 3, withAccessibleName: 0 } }), 'formFields')).toBeUndefined();
  });

  it('still flags a partial carry-through', () => {
    const html = '<form><input type="text"></form>';
    const n = find(notesFor('t', html, { formFields: { fields: 35, widgets: 35, withAccessibleName: 35 } }), 'formFields');
    expect(n).toBeTruthy();
    expect(n.msg).toContain('output has 1');
  });

  it('stays quiet for documents that were never forms', () => {
    for (const counts of [undefined, {}, { links: 12 }, { formFields: { fields: 0, widgets: 0, withAccessibleName: 0 } }]) {
      expect(find(notesFor('t', '<main><p>text</p></main>', counts), 'formFields')).toBeUndefined();
    }
  });

  it('does not disturb the existing link note', () => {
    const notes = notesFor('t', '<main></main>', { links: 13, formFields: { fields: 35, widgets: 35, withAccessibleName: 35 } });
    expect(kinds(notes)).toContain('links');
    expect(kinds(notes)).toContain('formFields');
  });
});
