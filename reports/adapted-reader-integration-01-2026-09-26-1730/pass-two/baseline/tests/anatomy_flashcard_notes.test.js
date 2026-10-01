import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function text(node) { return node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children); }
function session(file, extra = {}) {
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { _activeTab: 'flashcards', system: 'skeletal', view: 'anterior', complexity: 3, _structureConfidence: { ribs: 'practice', skull: 'mastered' }, _confidenceAt: { skull: Date.now() - 10 * 86400000 }, ...extra } };
  const render = () => tool.render(makeCtx({ toolData: data, setToolData: (updater) => { data = typeof updater === 'function' ? updater(data) : updater; } }));
  return {
    data: () => data.anatomy,
    click(label) { const button = find(render(), (node) => node.type === 'button' && (text(node).trim() === label || node.props['aria-label'] === label)); expect(button).not.toBeNull(); button.props.onClick(); },
    edit(value) { const input = find(render(), (node) => node.type === 'textarea' && String(node.props.id).startsWith('anatomy-own-words-')); expect(input).not.toBeNull(); input.props.onChange({ target: { value } }); },
    html() { const root = document.createElement('div'); root.innerHTML = renderTool('anatomy', data); return root; }
  };
}
beforeEach(resetStemLab);
describe('Anatomy notes during card review', () => {
  it.each(paths)('keeps notes hidden until reveal and shares edits with Explore and the study sheet in %s', (file) => {
    const s = session(file, { _structureNotes: { ribs: 'Original explanation' } });
    s.click('Due for review (2)');
    expect(s.html().querySelector('[data-anatomy-note-context="flashcard"]')).toBeNull();
    s.click('Reveal function');
    expect(s.html().querySelector('textarea').value).toBe('Original explanation');
    s.edit('Ribs protect the chest organs.');
    expect(s.data()._structureNotes.ribs).toBe('Ribs protect the chest organs.');
    expect(s.html().querySelector('#anatomy-flashcard-content').textContent).not.toContain('Ribs protect the chest organs.');
    expect(s.data()._flashcardRoundRated).toEqual({});
    expect(s.data()._flashcardFlipped).toBe(true);
    s.click('Explore');
    expect(s.html().querySelector('[data-anatomy-note-context="explore"] textarea').value).toBe('Ribs protect the chest organs.');
    s.edit('My revised explanation'); s.click('Cards');
    expect(s.html().querySelector('textarea').value).toBe('My revised explanation');
    s.click('📄 Study sheet');
    expect(s.html().querySelector('.anatomy-study-sheet-note').textContent).toContain('My revised explanation');
  });
  it.each(paths)('keeps each card note separate through navigation in %s', (file) => {
    const s = session(file); s.click('Due for review (2)'); s.click('Reveal function'); s.edit('Rib note');
    s.click('Next flashcard');
    expect(s.html().querySelector('[data-anatomy-note-context="flashcard"]')).toBeNull();
    s.click('Reveal function'); expect(s.html().querySelector('textarea').value).toBe('');
    s.edit('Skull note'); s.click('Previous'); s.click('Reveal function');
    expect(s.html().querySelector('textarea').value).toBe('Rib note');
    expect(s.data()._structureNotes).toEqual({ ribs: 'Rib note', skull: 'Skull note' });
  });
  it.each(paths)('enforces the note limit and associates the hint and count with the editor in %s', (file) => {
    const s = session(file); s.click('Due for review (2)'); s.click('Reveal function'); s.edit('x'.repeat(400));
    const root = s.html(); const editor = root.querySelector('textarea');
    expect(editor.value).toHaveLength(280);
    expect(editor.maxLength).toBe(280);
    expect(root.querySelector(`label[for="${editor.id}"]`).textContent).toContain('Ribs');
    for (const id of editor.getAttribute('aria-describedby').split(' ')) expect(root.querySelector(`[id="${id}"]`)).not.toBeNull();
    expect(root.querySelector(`[id="${editor.id}-count"]`).textContent).toContain('280 / 280 · Character limit reached');
  });
  it.each(paths)('clears saved notes and renders entered markup as plain text in %s', (file) => {
    const s = session(file); s.click('Due for review (2)'); s.click('Reveal function');
    s.edit('<img src=x onerror=alert(1)>');
    expect(s.html().querySelector('textarea').value).toBe('<img src=x onerror=alert(1)>');
    expect(s.html().querySelector('[data-anatomy-own-words] img')).toBeNull();
    s.edit('');
    expect(s.data()._structureNotes.ribs).toBeUndefined();
    expect(s.html().querySelector('[data-anatomy-own-words] [role="status"]').textContent).toContain('No note saved');
    s.click('📄 Study sheet'); expect(s.html().querySelector('.anatomy-study-sheet-note')).toBeNull();
  });
});