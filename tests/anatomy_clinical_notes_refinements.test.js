import fs from 'node:fs';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const bank = JSON.parse(fs.readFileSync('reports/anatomy-clinical-notes-refinements-2026-09-12/content.json', 'utf8'));
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function session(file, initial = {}, context = {}) {
  resetStemLab(); const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'explore', ...initial } };
  const ctx = { gradeLevel: '9', ...context };
  return {
    data: () => data.anatomy,
    patch: patch => { data = { anatomy: { ...data.anatomy, ...patch } }; },
    node(predicate) { return find(tool.render(makeCtx({ ...ctx, toolData: data, setToolData: u => { data = typeof u === 'function' ? u(data) : u; } })), predicate); },
    html() { const root = document.createElement('div'); root.innerHTML = renderTool('anatomy', data, ctx); return root; }
  };
}
beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

for (const file of ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js']) describe('Clinical note learning: ' + file, () => {
  for (const [id, row] of Object.entries(bank)) it('keeps the complete sourced explanation and optional reasoning for ' + id, () => {
    const spoken = [], s = session(file, { system: row.system, view: row.view, selectedStructure: id }, { callTTS: text => spoken.push(text) });
    const note = s.html().querySelector('[data-anatomy-clinical-note="' + id + '"]');
    expect(note).not.toBeNull();
    expect(note.querySelector('[data-anatomy-clinical-note-text]').textContent).toBe(row.clinical);
    const source = note.querySelector('[data-anatomy-clinical-note-source]');
    expect(source.href).toBe(row.reference); expect(source.textContent).toContain(row.source);
    expect(source.target).toBe('_blank'); expect(source.rel).toContain('noopener');
    const prompt = note.querySelector('details');
    expect(prompt.open).toBe(false); expect(prompt.querySelector('summary').textContent).toBe('Reason it through');
    expect(prompt.textContent).toContain(row.prompt);
    s.node(n => n.props?.['aria-label'] === 'Read the clinical note aloud').props.onClick();
    expect(spoken.at(-1)).toBe(row.clinical);
    s.node(n => n.props?.['aria-label'] === 'Read the reasoning prompt aloud').props.onClick();
    expect(spoken.at(-1)).toBe(row.prompt);
    expect(s.data()._structureConfidence).toBeUndefined(); expect(s.data()._retrievalEvidence).toBeUndefined();
  });
  it('reveals every reviewed clinical note in full only after the flashcard answer is shown', () => {
    for (const [id, row] of Object.entries(bank)) {
      const confidence = { [id]: 'practice' };
      const s = session(file, { system: row.system, view: row.view, _activeTab: 'flashcards', _structureConfidence: confidence, _flashcardFlipped: false });
      expect(s.html().querySelector('[data-anatomy-recall-card]').dataset.anatomyRecallCard).toBe(id);
      expect(s.html().querySelector('[data-anatomy-clinical-note]')).toBeNull();
      s.patch({ _flashcardFlipped: true });
      const note = s.html().querySelector('[data-anatomy-clinical-note]');
      expect(note.dataset.anatomyClinicalNote).toBe(id);
      expect(note.querySelector('[data-anatomy-clinical-note-text]').textContent).toBe(row.clinical);
      expect(note.querySelector('[data-anatomy-clinical-note-source]').href).toBe(row.reference);
      expect(s.data()._structureConfidence).toEqual(confidence); expect(s.data()._retrievalEvidence).toBeUndefined();
    }
  });
  it.each(['1', '4'])('keeps adult clinical context and reasoning out of grade %s Explore and Cards', grade => {
    const s = session(file, { system: 'lymphatic', complexity: 1, selectedStructure: 'spleen', _structureConfidence: { spleen: 'practice' } }, { gradeLevel: grade });
    for (const tab of ['explore', 'flashcards']) {
      s.patch({ _activeTab: tab, _flashcardFlipped: true });
      const root = s.html(); expect(root.querySelector('[data-anatomy-clinical-note]')).toBeNull();
      expect(root.querySelector('[data-anatomy-clinical-note-source]')).toBeNull();
      expect(root.textContent).not.toContain(bank.spleen.clinical);
      expect(root.textContent).not.toContain(bank.spleen.prompt);
      if (grade === '4' && tab === 'explore') expect(root.textContent).toContain(bank.spleen.clinicalKid);
    }
  });
  it('keeps source attribution with its structure across system changes', () => {
    const s = session(file, { system: 'lymphatic', selectedStructure: 'spleen' });
    const original = s.node(n => n.props?.['data-anatomy-clinical-note'] === 'spleen');
    expect(original.key).toBe('spleen');
    s.patch({ system: 'organs', view: 'posterior', selectedStructure: 'kidneys' });
    expect(s.html().querySelector('[data-anatomy-clinical-note-text]').textContent).toBe(bank.kidneys.clinical);
    expect(s.html().querySelector('[data-anatomy-clinical-note-source]').href).toBe(bank.kidneys.reference);
    s.patch({ system: 'skeletal', view: 'anterior', selectedStructure: 'skull' });
    expect(s.html().querySelector('[data-anatomy-clinical-note-source]')).toBeNull();
    expect(s.html().querySelector('[data-anatomy-clinical-reasoning]')).toBeNull();
  });
});
