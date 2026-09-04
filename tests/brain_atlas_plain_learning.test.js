import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool, makeCtx, newStore } from './helpers/stem_widgets_smoke_harness.js';
const file = 'stem_lab/stem_tool_brainatlas.js';
const ids = ['frontal','prefrontal','motor_cortex','parietal','temporal','occipital','cerebellum','brainstem'];
function panel(state) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderTool('brainAtlas', { brainAtlas: { view: 'lateral', ...state } });
  return wrapper.querySelector('#brainatlas-region-detail');
}
function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
beforeEach(() => resetStemLab());
afterEach(() => { vi.useRealTimers(); document.getElementById('brainatlas-region-detail')?.remove(); });
describe('Brain Atlas authored plain learning cards', () => {
  for (const id of ids) it('teaches '+id+' in plain language with an optional explanation', () => {
    loadTool(file, 'brainAtlas');
    const detail = panel({ selectedRegion: id });
    expect(detail).not.toBeNull();
    expect(detail.querySelector('[data-brainatlas-authored-plain]').getAttribute('data-brainatlas-authored-plain')).toBe(id);
    expect(detail.textContent).toContain('Big idea');
    expect(detail.textContent).toContain('Everyday example');
    expect(detail.textContent).toContain('Connected idea');
    expect(detail.textContent).toContain('Brain regions work together');
    expect(detail.closest('[data-brainatlas-tool]').querySelector('[data-brainatlas-teacher-prompt]').textContent).toContain(detail.querySelector('.brainatlas-plain-lesson > p').textContent);
    expect(detail.textContent).not.toContain('Associated Conditions');
    expect(detail.textContent).not.toContain('If Damaged');
    expect(detail.querySelector('.brainatlas-plain-explanation').open).toBe(false);
    expect(detail.querySelector('.brainatlas-plain-explanation summary').textContent).toBe('One way to explain it');
    const next = detail.querySelector('[data-brainatlas-plain-next]').getAttribute('data-brainatlas-plain-next');
    expect(ids).toContain(next); expect(next).not.toBe(id);
    expect(detail.querySelector('.brainatlas-plain-lesson a').getAttribute('rel')).toBe('noopener noreferrer');
  });
  it('retains the detailed science in Advanced and leaves other regions unchanged', () => {
    loadTool(file, 'brainAtlas');
    const advanced = panel({ selectedRegion: 'cerebellum', detailMode: 'advanced' });
    expect(advanced.querySelector('[data-brainatlas-authored-plain]')).toBeNull();
    expect(advanced.textContent).toContain('~80%');
    expect(advanced.textContent).toContain('Motor coordination');
    expect(advanced.textContent).toContain('Associated Conditions');
    expect(advanced.textContent).toContain('Blood Supply');
    const other = panel({ selectedRegion: 'brocas' });
    expect(other.querySelector('[data-brainatlas-authored-plain]')).toBeNull();
    expect(other.textContent).toContain('Student takeaway');
  });
  it('moves to the related detail and uses a fresh explanation disclosure without AI', () => {
    vi.useFakeTimers();
    const tool = loadTool(file, 'brainAtlas');
    const store = newStore({ brainAtlas: { view: 'lateral', selectedRegion: 'frontal', search: 'plan', selected3DStructure: 'old' } });
    const callGemini = vi.fn();
    const tree = () => flatten(tool.render(makeCtx({ callGemini }, store)));
    const previousKey = tree().find(el => el.props?.className === 'brainatlas-plain-explanation').key;
    tree().find(el => el.props?.['data-brainatlas-plain-next']).props.onClick();
    expect(store.toolData.brainAtlas).toMatchObject({ view:'lateral', selectedRegion:'motor_cortex', search:'', selected3DStructure:'' });
    const target = document.createElement('div'); target.id='brainatlas-region-detail'; target.tabIndex=-1; target.scrollIntoView=vi.fn(); document.body.appendChild(target);
    vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(target);
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(tree().find(el => el.props?.className === 'brainatlas-plain-explanation').key).not.toBe(previousKey);
    expect(callGemini).not.toHaveBeenCalled();
  });
});
