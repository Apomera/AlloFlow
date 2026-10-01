// #6 (2026-06-15): tagged form fields wrote the MACHINE field name (field.getName(), a default
// like "Text1"/"Check Box 3"/"undefined_2" or a dotted FQN) into /TU + /Alt — so a screen reader
// announced the identifier, not what to type, while PAC/veraPDF saw a present /TU and passed.
// Fix: _deriveFieldLabel preserves a source /TU, else uses a human name, else a flagged placeholder.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('function _deriveFieldLabel(sourceTU, fieldName, index) {');
const end = src.indexOf('var createDocPipeline', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _deriveFieldLabel missing');
const _deriveFieldLabel = new Function(src.slice(start, end) + '\n; return _deriveFieldLabel;')();
const label = (tu, name, i = 0) => _deriveFieldLabel(tu, name, i).label;

describe('#6 _deriveFieldLabel — human SR label, never a raw machine id', () => {
  it('preserves a non-empty source /TU (a well-authored form already has the right label)', () => {
    const r = _deriveFieldLabel("Student's first name", 'Text1', 0);
    expect(r).toEqual({ label: "Student's first name", needsReview: false });
  });
  it('flags bare author-tool defaults instead of announcing them', () => {
    for (const bad of ['Text1', 'Text 12', 'Check Box 3', 'Checkbox2', 'Radio Button 1', 'undefined_2', 'Button5', 'Field3', 'form field']) {
      const r = _deriveFieldLabel('', bad, 0);
      expect(r.needsReview, bad).toBe(true);
      expect(r.label).toMatch(/label needs review/);
    }
  });
  it('keeps a meaningful name (single word or phrase)', () => {
    expect(label('', 'StudentName')).toBe('StudentName');
    expect(label('', 'Email')).toBe('Email');
    expect(label('', 'Parent Signature')).toBe('Parent Signature');
  });
  it('extracts the meaningful leaf from a dotted fully-qualified name + strips array indices', () => {
    expect(label('', 'topmostSubform[0].Page1[0].StudentName[0]')).toBe('StudentName');
  });
  it('never returns an empty label, even for an empty/garbage field name', () => {
    expect(label('', '')).not.toBe('');
    expect(label('', '   ')).not.toBe('');
    expect(label(null, null, 4)).toContain('Form field 5');
  });

  it('anti-drift: the tag loop reads the source /TU and writes the derived label, not the raw name', () => {
    expect(src).toContain('const fieldLabelText = _deriveFieldLabel(_srcTU, fieldName, _fieldLabelIdx++).label;');
    expect(src).toContain('Alt: PDFString.of(fieldLabelText),');
    expect(src).toContain('_fieldDictObj.TU = PDFString.of(fieldLabelText);');
  });
});
