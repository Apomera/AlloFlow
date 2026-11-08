// Resources made after a lesson plan: listed under the matching phase, with Open
// and "Make an updated plan". Derived on render; the plan's own data never changes.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, PlanView, root, host;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule(resolve(process.env.LESSON_PLAN_MODULE_DIR || '.', 'view_lesson_plan_module.js'));
  PlanView = window.AlloModules.LessonPlanView;
}, 30000);

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
});

const inventory = ids => ids.map(id => ({ id, title: id, type: 'resource', fingerprint: null }));
function plan({ mode = 'teacher', known = ['reading', 'old-quiz'], unitId = 'unit-a', where = 'top', status = 'recorded' } = {}) {
  const record = { version: 1, mode, route: 'sidebar', summaries: [{ id: 'reading', title: 'Reading', type: 'analysis', kind: 'Source' }], inventory: inventory(known), inventoryStatus: status, traceComplete: true };
  return { id: 'plan-1', type: 'lesson-plan', ...(where === 'top' ? { unitId } : {}),
    data: { hook: 'Hook text', directInstruction: 'Teach', guidedPractice: 'Guide', independentPractice: 'Alone', closure: 'Close' },
    config: { generationInputs: record, ...(where === 'config' ? { unitId } : {}) } };
}
const item = (id, type, extra = {}) => ({ id, type, title: id.replace(/-/g, ' '), unitId: 'unit-a', data: {}, ...extra });
const history = p => [
  item('reading', 'analysis'), item('old-quiz', 'quiz'), p,
  item('new-quiz', 'quiz'), item('new-glossary', 'glossary'), item('new-organizer', 'outline'),
  item('new-frames', 'sentence-frames'), item('new-picture', 'image'), item('odd-tool', 'pipeline'),
  item('other-unit-quiz', 'quiz', { unitId: 'unit-b' }), item('story-submission', 'storyforge-submission'),
  item('second-plan', 'lesson-plan'), item('ai-guide', 'udl-advice'), item('planned', 'quiz', { _fullPackPlannedArtifact: true }),
];

describe('finding resources made after the plan', () => {
  it('lists only same-unit resources the plan was never given, each under its phase', () => {
    const p = plan();
    const rows = PlanView.addedResources(p, history(p));
    expect(rows.map(row => [row.id, row.phase])).toEqual([
      ['new-quiz', 'closure'], ['new-glossary', 'directInstruction'], ['new-organizer', 'guidedPractice'],
      ['new-frames', 'independentPractice'], ['new-picture', 'hook'], ['odd-tool', 'other'],
    ]);
  });

  it('reads the unit from config, as plans from the sidebar button store it', () => {
    const p = plan({ where: 'config' });
    expect(PlanView.addedResources(p, history(p)).map(row => row.id)).toContain('new-quiz');
    expect(PlanView.addedResources(p, history(p)).map(row => row.id)).not.toContain('other-unit-quiz');
  });

  it('treats no unit, "all" and "uncategorized" as the same place', () => {
    const p = plan({ unitId: null });
    const rows = PlanView.addedResources(p, [p, item('loose', 'quiz', { unitId: 'all' }), item('loose2', 'faq', { unitId: undefined }), item('filed', 'quiz')]);
    expect(rows.map(row => row.id)).toEqual(['loose', 'loose2']);
  });

  it('says nothing when it cannot know what the plan was given', () => {
    const p = plan();
    expect(PlanView.addedResources(plan({ mode: 'study' }), history(p))).toBeNull();
    expect(PlanView.addedResources(plan({ status: 'untraced' }), history(p))).toBeNull();
    expect(PlanView.addedResources({ ...p, config: {} }, history(p))).toBeNull();
    expect(PlanView.addedResources(p, [p, item('reading', 'analysis'), item('old-quiz', 'quiz')])).toEqual([]);
  });

  it('will not offer to open a resource whose id appears twice', () => {
    const p = plan();
    const rows = PlanView.addedResources(p, [p, item('twin', 'quiz'), item('twin', 'quiz')]);
    expect(rows).toEqual([expect.objectContaining({ id: 'twin', openable: false })]);
  });
});

function mount(p, props = {}) {
  const open = vi.fn(), update = vi.fn();
  const all = { generatedContent: p, isTeacherMode: true, t: () => '', history: history(p), activeUnitId: 'unit-a',
    onOpenPlanningResource: open, onUpdateLessonPlan: update, ...props };
  host = document.createElement('div'); document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(React.createElement(PlanView, all)));
  return { open, update, rerender: next => act(() => root.render(React.createElement(PlanView, { ...all, ...next }))) };
}
const phase = name => host.querySelector(`[data-plan-added-phase="${name}"]`);

describe('showing them in the plan', () => {
  it('tells the teacher what is new, slots each one under its phase and opens it', () => {
    const p = plan(), before = JSON.stringify(p);
    const { open } = mount(p);
    const notice = host.querySelector('[data-plan-added-resources]');
    expect(notice.textContent).toContain('6 resources were made after this plan:');
    expect(notice.textContent).toContain('new quiz');
    expect(phase('closure').textContent).toContain('new quiz');
    expect(phase('directInstruction').textContent).toContain('new glossary');
    expect(phase('guidedPractice').textContent).toContain('new organizer');
    expect(phase('independentPractice').textContent).toContain('new frames');
    expect(phase('hook').textContent).toContain('new picture');
    expect(phase('closure').textContent).not.toContain('old quiz');
    expect(notice.textContent).toContain('Other resources');
    expect(notice.textContent).toContain('odd tool');
    expect(host.textContent).not.toContain('other unit quiz');
    act(() => phase('closure').querySelector('button').click());
    expect(open).toHaveBeenCalledWith('new-quiz');
    expect(phase('closure').querySelector('button').getAttribute('aria-label')).toBe('Open: new quiz');
    expect(JSON.stringify(p)).toBe(before);
  });

  it('uses the singular for one new resource', () => {
    const p = plan();
    mount(p, { history: [p, item('reading', 'analysis'), item('old-quiz', 'quiz'), item('new-quiz', 'quiz')] });
    expect(host.querySelector('[data-plan-added-resources]').textContent).toContain('One resource was made after this plan:');
  });

  it('makes an updated plan only from the plan’s own unit, and not twice while busy', () => {
    const p = plan();
    const { update, rerender } = mount(p);
    const button = () => host.querySelector('[data-plan-update]');
    act(() => button().click());
    expect(update).toHaveBeenCalledOnce();
    rerender({ isProcessing: true });
    expect(button().disabled).toBe(true);
    rerender({ isProcessing: false, activeUnitId: 'unit-b' });
    expect(button()).toBeNull();
    expect(host.textContent).toContain('open this plan’s unit first');
    rerender({ activeUnitId: 'unit-a', onUpdateLessonPlan: null });
    expect(button()).toBeNull();
    expect(host.querySelector('[data-plan-added-resources]')).not.toBeNull();
  });

  it('keeps the lists out of print, editing, and every learner or family view', () => {
    const p = plan();
    const { rerender } = mount(p);
    expect(host.querySelector('[data-plan-added-resources]').classList.contains('no-print')).toBe(true);
    expect(phase('closure').classList.contains('no-print')).toBe(true);
    rerender({ isEditingLessonPlan: true });
    expect(phase('closure')).toBeNull();
    expect(host.querySelector('[data-plan-added-resources]')).not.toBeNull();
    for (const view of [{ isTeacherMode: false }, { isParentMode: true }, { isIndependentMode: true }]) {
      rerender({ isEditingLessonPlan: false, isTeacherMode: true, isParentMode: false, isIndependentMode: false, ...view });
      expect(host.querySelector('[data-plan-added-resources]')).toBeNull();
      expect(host.querySelector('[data-plan-added-phase]')).toBeNull();
    }
  });

  it('shows nothing when everything was already in the plan', () => {
    const p = plan();
    mount(p, { history: [p, item('reading', 'analysis'), item('old-quiz', 'quiz')] });
    expect(host.querySelector('[data-plan-added-resources]')).toBeNull();
    expect(host.querySelector('[data-plan-added-phase]')).toBeNull();
  });
});

describe('host wiring', () => {
  const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
  const mountAt = shell.indexOf("activeView === 'lesson-plan' && generatedContent?.data && window.AlloModules && window.AlloModules.LessonPlanView");
  const block = shell.slice(mountAt, shell.indexOf('BilingualFieldRenderer', mountAt));
  it('passes a teacher-only update that makes a new plan, plus the active unit and busy state', () => {
    expect(mountAt).toBeGreaterThan(0);
    expect(block).toContain('onUpdateLessonPlan: isTeacherMode && !isIndependentMode && !isParentMode ? () => handleGenerateLessonPlan(true) : null');
    expect(block).toMatch(/activeUnitId, isProcessing,/);
  });
  it('registers every new string in both copies of ui_strings', () => {
    const view = readFileSync('view_lesson_plan_source.jsx', 'utf8');
    const keys = [...new Set([...view.matchAll(/tl\('lesson_plan\.((?:added|update_plan)[a-z_]*)'/g)].map(m => m[1]))];
    expect(keys.length).toBe(10);
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const strings = readFileSync(file, 'utf8');
      for (const key of keys) expect(strings, file + ' ' + key).toContain(`"${key}": "`);
    }
  });
});
