import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('host_handlers_source.jsx', 'utf8').replace(/__d\./g, '');
const start = source.indexOf('const handleLessonPlanChange =');
const end = source.indexOf('const handleQuizOptionClick =', start);
if (start < 0 || end < 0) throw new Error('Lesson edit handler missing');
const code = source.slice(start, end);
function editor(openPlan, savedPlan = openPlan) {
  let saved = savedPlan;
  const onUpdateResource = vi.fn((id, update) => {
    if (String(saved.id) !== String(id)) return false;
    saved = update(saved);
    return true;
  });
  const edit = new Function('generatedContent', 'onUpdateResource', code + '\nreturn handleLessonPlanChange;')(openPlan, onUpdateResource);
  return { edit, get: () => saved, onUpdateResource };
}
const plan = () => ({ id: 'lesson-1', type: 'lesson-plan', data: { hook: 'Original hook', objectives: ['Explain equal parts'], materialsNeeded: ['Paper strips'] } });

describe('lesson plan edits preserve saved teaching work', () => {
  it('keeps a script and extension guide added since the editor rendered', () => {
    const opened = plan();
    const scripts = [{ id: 'script-1', steps: [{ teacherSays: 'Model the whole.' }] }];
    const extensions = [{ title: 'Further practice', guide: 'Use number lines.' }];
    const h = editor(opened, { ...opened, data: { ...opened.data, teachingScripts: scripts, extensions } });
    h.edit('hook', 'Updated classroom hook');
    expect(h.get().data).toEqual({ ...opened.data, hook: 'Updated classroom hook', teachingScripts: scripts, extensions });
    expect(opened.data.hook).toBe('Original hook');
  });
  it('merges successive edits from the same render instead of dropping the earlier edit', () => {
    const h = editor(plan());
    h.edit('hook', 'Show a paper whole');
    h.edit('objectives', 'Explain equal fourths', 0);
    expect(h.get().data.hook).toBe('Show a paper whole');
    expect(h.get().data.objectives).toEqual(['Explain equal fourths']);
  });
  it('turns legacy scalar list fields into editable lists without losing their text', () => {
    const p = plan(); p.data.materialsNeeded = 'Paper strips';
    const h = editor(p);
    h.edit('materialsNeeded', 'Four paper strips', 0);
    expect(h.get().data.materialsNeeded).toEqual(['Four paper strips']);
  });
  it('applies extension text edits without removing a guide that just finished', () => {
    const p = plan(); p.data.extensions = [{ title: 'Practice', description: 'Original task' }];
    const latest = { ...p, data: { ...p.data, extensions: [{ ...p.data.extensions[0], id: 'extension-1', guide: 'New teacher guide' }] } };
    const h = editor(p, latest);
    h.edit('extensions', previous => ({ ...previous, description: 'Revised task' }), 0);
    expect(h.get().data.extensions[0]).toEqual({ title: 'Practice', description: 'Revised task', id: 'extension-1', guide: 'New teacher guide' });
  });
  it('rejects stale or invalid item indexes without replacing the entire field', () => {
    for (const index of [-1, 1, 0.5, '0']) {
      const p = plan(), h = editor(p);
      h.edit('objectives', 'Do not apply', index);
      expect(h.get()).toBe(p);
    }
  });
  it('keeps edits scoped to the saved lesson and ignores other resource types', () => {
    const h = editor(plan(), { ...plan(), id: 'other' });
    h.edit('hook', 'Do not apply to another lesson');
    expect(h.get().data.hook).toBe('Original hook');
    const other = editor({ ...plan(), type: 'quiz' });
    other.edit('hook', 'Do not apply');
    expect(other.onUpdateResource).not.toHaveBeenCalled();
  });
});