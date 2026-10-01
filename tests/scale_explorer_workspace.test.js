import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  "  window.workspace = { read: readInquiry, history: readInvestigations, view: readWorkspaceView, evidence: inquiryEvidence, fit: fitDrawingPlan };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { read, history, view, evidence, fit } = sandbox.window.workspace;
const person = { id: 'human', size: 1.23, you: true }, earth = { id: 'earth' };
const record = () => ({ id: 'inquiry-workspace-1', theme: 'home', small: person, big: earth, guess: '6.5', revealed: true,
  question: 'How can my height anchor a model of Earth?', reflection: 'A stated length ratio compares the height with the diameter.',
  comparison: { small: person, big: earth }, drawing: { reference: earth, target: person, size: '16', unit: 'cm', note: 'Mark both lengths on paper.' } });

describe('Scale Explorer connected investigations', () => {
  it('restores one question, prediction, comparison, drawing and explanation with independent snapshots', () => {
    const raw = record(), saved = read(raw);
    expect(evidence(saved)).toEqual([true, true, true, true]);
    expect(saved.question).toBe(raw.question);
    expect(saved.drawing.target).toEqual(person);
    expect(saved.comparison.small).toEqual(person);
    raw.drawing.target = { ...person, size: 2.2 }; raw.drawing.note = 'Later drawing'; raw.question = 'Later question';
    expect(saved.drawing.target.size).toBe(1.23); expect(saved.drawing.note).toBe('Mark both lengths on paper.');
    expect(saved.question).toBe('How can my height anchor a model of Earth?');
  });

  it('rejects evidence for another personal height or pair while retaining the valid investigation', () => {
    const raw = record();
    raw.comparison.small = { ...person, size: 2.2 };
    raw.drawing.target = { ...person, size: 2.2 };
    expect(read(raw)).toMatchObject({ comparison: null, drawing: null });
    expect(evidence(read(raw))).toEqual([true, false, false, true]);
    expect(read({ ...record(), drawing: { reference: earth, target: { id: 'moon' }, size: '16', unit: 'cm' } }).drawing).toBeNull();
  });

  it('recognizes the investigation dimensions after a collection is fitted around a larger reference', () => {
    const raw = record();
    raw.drawing.extras = [{ id: 'jupiter' }, { id: 'dna' }];
    raw.drawing = fit(raw.drawing);
    const drawing = read(raw).drawing;
    expect(drawing.reference.id).toBe('jupiter'); expect(drawing.extras.map(item => item.id)).toContain('earth');
    expect([drawing.reference, drawing.target, ...drawing.extras]).toContainEqual(person);
    expect(drawing.size).toBe('16'); expect(drawing.unit).toBe('cm');
  });

  it('reconstructs catalog sizes and excludes malformed or incomplete evidence', () => {
    const raw = record();
    raw.comparison.big.size = 1;
    const restored = read(raw);
    expect(restored.comparison.big.size).toBe(12742000); expect(restored.big.size).toBe(12742000);
    for (const invalid of [null, [], true, { reference: { id: '__proto__' } }, { ...record().drawing, size: '0' }, { ...record().drawing, unit: 'feet' }]) {
      expect(read({ ...record(), drawing: invalid }).drawing).toBeNull();
    }
    expect(read({ ...record(), comparison: { small: { id: '__proto__' }, big: earth } }).comparison).toBeNull();
    expect(read({ ...record(), comparison: true }).comparison).toBeNull();
  });

  it('keeps legacy investigations usable without inventing comparison or drawing evidence', () => {
    const raw = record(); delete raw.question; delete raw.comparison; delete raw.drawing;
    const restored = read(raw);
    expect(restored.question).toBe(''); expect(restored.reflection).toBe(raw.reflection);
    expect(evidence(restored)).toEqual([true, false, false, true]);
    expect(history([raw, raw])).toHaveLength(1);
  });

  it('bounds plain questions and nested collections and counts only explicit completed steps', () => {
    const raw = record(); raw.question = '<b>literal</b>';
    expect(read(raw).question).toBe('<b>literal</b>');
    expect(read({ ...raw, question: 'x'.repeat(1000) }).question).toHaveLength(400);
    expect(read({ ...raw, question: { html: 'bad' } }).question).toBe('');
    raw.drawing.extras = Array.from({ length: 400 }, () => ({ id: 'jupiter' }));
    expect(read(raw).drawing.extras).toHaveLength(1);
    expect(evidence(read({ ...raw, guess: '', reflection: '   ' }))).toEqual([false, true, true, false]);
    expect(history(Array.from({ length: 20 }, (_, i) => ({ ...raw, id: 'inquiry-workspace-' + i })))).toHaveLength(12);
  });

  it('restores only supported workspace views', () => {
    for (const key of ['explore', 'investigate', 'compare', 'model', 'draw', 'notebook', 'all']) expect(view(key)).toBe(key);
    for (const invalid of [undefined, null, {}, [], true, '__proto__', 'constructor', '<script>']) expect(view(invalid)).toBe('explore');
  });

  it('keeps workspace labels in the English catalogs and the desktop source mirror in sync', () => {
    const labels = Object.fromEntries([...source.matchAll(/S\('(atlas_workspace_[a-z_]+)', ('(?:\\.|[^'\\])*')/g)].map(match => [match[1], vm.runInNewContext(match[2])]));
    expect(Object.keys(labels).length).toBeGreaterThan(20);
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js', 'desktop/web-app/build/ui_strings.js', 'desktop/app-build/ui_strings.js'].filter(file => fs.existsSync(file))) {
      const strings = JSON.parse(fs.readFileSync(file, 'utf8')).stem.scaleExplorer;
      for (const [key, label] of Object.entries(labels)) expect(strings[key], file + ' ' + key).toBe(label);
    }
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js', 'utf8')).toBe(source);
  });
});
