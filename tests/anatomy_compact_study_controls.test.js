import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
function find(node, predicate) { if (!node || typeof node !== 'object') return null; if (Array.isArray(node)) { for (const child of node) { const hit = find(child, predicate); if (hit) return hit; } return null; } return predicate(node) ? node : find(node.props?.children, predicate); }
function session(file, extra = {}) {
  const tool = loadTool(file, 'anatomy'); let data = { anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'flashcards', ...extra } };
  const render = () => tool.render(makeCtx({ toolData: data, setToolData: updater => { data = typeof updater === 'function' ? updater(data) : updater; } }));
  return { data: () => data.anatomy,
    toggle() { find(render(), n => n.props?.['data-anatomy-study-controls-toggle']).props.onClick(); },
    change(id, value) { const control = find(render(), n => n.props?.id === id); expect(control).not.toBeNull(); control.props.onChange({ target: { value } }); },
    html() { const root = document.createElement('div'); root.innerHTML = renderTool('anatomy', data); return root; }
  };
}
beforeEach(resetStemLab);
describe('Anatomy compact study controls', () => {
  it.each(paths)('toggles additional controls without resetting study state in %s', file => {
    const initial = { _flashcardIdx: 2, _flashcardFlipped: true, selectedStructure: 'clavicle', _structureConfidence: { skull: 'learning' }, _structureNotes: { skull: 'Saved note' }, quizScore: 4 };
    const s = session(file, initial); const before = { ...s.data() };
    s.toggle(); expect(s.data()).toEqual({ ...before, _studyControlsExpanded: true });
    expect(s.html().querySelector('[data-anatomy-study-controls-toggle]').getAttribute('aria-expanded')).toBe('true');
    s.toggle(); expect(s.data()).toEqual({ ...before, _studyControlsExpanded: false });
  });
  it.each(paths)('uses the same card transitions for compact system and level selectors in %s', file => {
    const s = session(file, { _flashcardIdx: 6, _flashcardFlipped: true, _structureConfidence: { skull: 'mastered' } });
    s.change('anatomy-study-system', 'respiratory');
    expect(s.data().system).toBe('respiratory'); expect(s.data()._flashcardIdx).toBe(0); expect(s.data()._flashcardFlipped).toBe(false);
    expect(s.data().selectedStructure).toBe(s.html().querySelector('[data-anatomy-recall-card]').dataset.anatomyRecallCard);
    s.change('anatomy-study-level', '1'); expect(s.data().complexity).toBe(1);
    expect(s.data()._structureConfidence.skull).toBe('mastered');
    expect(s.data().selectedStructure).toBe(s.html().querySelector('[data-anatomy-recall-card]').dataset.anatomyRecallCard);
    const saved = { ...s.data() }; s.change('anatomy-study-level', 'bogus'); s.change('anatomy-study-system', 'bogus'); expect(s.data()).toEqual(saved);
  });
  it.each(paths)('provides valid labels and disclosure targets for 2D and 3D study controls in %s', file => {
    for (const _bodyView3d of [false, true]) {
      const s = session(file, { _bodyView3d }); const root = s.html();
      const controls = root.querySelector('[data-anatomy-study-controls]');
      expect(controls.querySelectorAll('select')).toHaveLength(2);
      expect(controls.querySelector('#anatomy-study-system option:checked').value).toBe('skeletal');
      expect(controls.querySelector('#anatomy-study-system').options).toHaveLength(10);
      for (const select of controls.querySelectorAll('select')) expect(root.querySelector(`label[for="${select.id}"]`)).not.toBeNull();
      for (const id of controls.querySelector('button').getAttribute('aria-controls').split(' ')) expect(root.querySelector(`[id="${id}"]`)).not.toBeNull();
    }
  });
  it.each(paths)('limits compact controls to Quiz and Cards in %s', file => {
    for (const _activeTab of ['quiz', 'flashcards', 'explore', 'tour', 'spotter']) {
      const s = session(file, { _activeTab }); const root = s.html();
      expect(!!root.querySelector('[data-anatomy-study-controls]')).toBe(['quiz', 'flashcards'].includes(_activeTab));
    }
  });
});