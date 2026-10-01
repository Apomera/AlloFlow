// Lesson plan fixes (2026-09-28 audit, batch 1).
//
// - The header button showed "PDF" and was named "Download PDF", but it opens
//   the print window (Save as PDF lives there); nothing downloads. It now says
//   "Print / PDF", with no second, different name for screen readers.
// - Edit mode was one app-wide flag that nothing reset, so the next plan a
//   teacher opened was already in edit mode. The host now leaves edit mode
//   whenever the open resource changes.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, PlanView;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  for (const file of ['resource_content_fingerprint_module.js', 'lesson_teaching_script_module.js', 'view_lesson_teaching_script_module.js']) new Function(readFileSync(file, 'utf8'))();
  new Function(readFileSync(process.env.ALLO_LESSON_PLAN_CANDIDATE || 'view_lesson_plan_module.js', 'utf8'))();
  PlanView = window.AlloModules.LessonPlanView;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; });
const plan = { id: 'plan-a', type: 'lesson-plan', data: { essentialQuestion: 'How can we compare fractions?', objectives: ['Compare fractions using models'], directInstruction: 'Teacher plan' } };
function mount(extra = {}) {
  const props = { generatedContent: plan, history: [], isTeacherMode: true, isParentMode: false, isIndependentMode: false, t: () => undefined, capabilities: { canGenerate: true, canResearch: true }, handleExportPDF: vi.fn(), handleCopyToClipboard: vi.fn(), handleToggleIsEditingLessonPlan: vi.fn(), ...extra };
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(React.createElement(PlanView, props)));
  return props;
}

describe('Print / PDF button', () => {
  it('says what it does and has no second name', () => {
    const props = mount();
    const button = host.querySelector('[data-lesson-plan-print-pdf]');
    expect(button).not.toBeNull();
    expect(button.textContent.trim()).toBe('Print / PDF');
    expect(button.hasAttribute('aria-label')).toBe(false);
    expect(button.getAttribute('title')).toContain('Save as PDF');
    act(() => button.click());
    expect(props.handleExportPDF).toHaveBeenCalledTimes(1);
  });
});

describe('edit mode', () => {
  it.each(['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'])('%s leaves edit mode when the open resource changes', (file) => {
    const hostSource = readFileSync(file === 'AlloFlowANTI.txt' ? (process.env.ALLO_ANTI_CANDIDATE || file) : file, 'utf8');
    const state = hostSource.indexOf('const [isEditingLessonPlan, setIsEditingLessonPlan] = useState(false);');
    expect(state).toBeGreaterThan(-1);
    const effect = 'React.useEffect(() => { setIsEditingLessonPlan(false); }, [generatedContent?.id]);';
    expect(hostSource.split(effect).length - 1).toBe(1);
    expect(hostSource.indexOf(effect)).toBeGreaterThan(state);
    expect(hostSource.indexOf(effect)).toBeGreaterThan(hostSource.indexOf('const [generatedContent, _setGeneratedContent] = useState(null);'));
  });
});
