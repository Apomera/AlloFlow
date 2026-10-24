// One Edit toggle for a lesson plan and its teaching script (2026-10-20).
//
// Before: the plan's Edit/Done button saved plan fields as you typed, while the teaching
// script inside it had its own "Edit script" button with a draft, checks and Save/Discard.
// Two edit modes on one screen, not linked. Now, inside a lesson plan, the plan's Edit opens
// a script draft (without moving focus), and Done saves a changed draft, drops an unchanged
// one, or stays in edit mode when the script's checks fail. Used on its own (no plan), the
// script panel keeps its "Edit script" button, which the existing script tests cover.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, View, PlanView;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  for (const file of ['resource_content_fingerprint_module.js', 'lesson_teaching_script_module.js', 'view_lesson_teaching_script_module.js', 'view_lesson_plan_module.js']) new Function(readFileSync(file, 'utf8'))();
  View = window.AlloModules.LessonTeachingScriptView;
  PlanView = window.AlloModules.LessonPlanView;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; vi.restoreAllMocks(); });

function script() {
  return {
    id: 'script-a', schemaVersion: 2, scope: 'segment', title: 'Compare fractions', createdAt: '2026-09-04T12:00:00.000Z', durationMinutes: 15, researchStatus: 'not-requested',
    inputSnapshot: { settings: { grade: '4th Grade', subject: 'mathematics', topic: 'Fractions' }, materialIds: [], materialTitles: [] }, sources: [],
    steps: [1, 2, 3].map(index => ({ id: 'step-' + index, title: 'Compare fractions ' + index, minutes: 5, phase: 'directInstruction', teacherSays: 'Place one half on our shared number line. Explain how the equal spaces help you choose its position.', studentDoes: 'Learners explain their placements.', checkQuestion: 'How do you know where one half belongs?', possibleResponse: 'It is halfway between zero and one.', ifStruggling: 'Fold a paper strip into halves.', ifReady: 'Compare one half with three fourths.', resourceIds: [], recommendationIds: [] })),
  };
}
const plan = () => ({ id: 'plan-a', type: 'lesson-plan', data: { essentialQuestion: 'How can we compare fractions?', objectives: ['Compare fractions'], directInstruction: 'Teacher plan', teachingScripts: [script()] } });
const scriptProps = (extra = {}) => ({ generatedContent: plan(), history: [], isTeacherMode: true, isParentMode: false, isIndependentMode: false, t: () => '', capabilities: { canGenerate: true, canResearch: true }, defaultSettings: { grade: '4th Grade', subject: 'mathematics', topic: 'Fractions', suggestedDuration: { segment: 15, lesson: 45 } }, onGenerateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), onCancelTeachingScript: vi.fn(), onUpdateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), onOpenTeachingMaterial: vi.fn(), ...extra });
function render(element) {
  if (!host) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  act(() => root.render(element));
}
const buttonByText = text => Array.from(host.querySelectorAll('button')).find(node => node.textContent.trim() === text);
const firstSayAloud = () => Array.from(host.querySelectorAll('textarea')).find(node => (node.getAttribute('aria-label') || '').startsWith('Teacher says') || (node.getAttribute('aria-label') || '').includes('· 1'));
function type(node, value) {
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('teaching script panel inside a lesson plan', () => {
  it('has no separate Edit script button while the plan is not being edited, and says where editing lives', () => {
    const bridge = { current: null };
    render(React.createElement(View, scriptProps({ planEditing: false, planEditBridge: bridge })));
    act(() => buttonByText('Teaching script+').click());
    expect(host.textContent).toContain('Compare fractions 1');
    expect(buttonByText('Edit script')).toBeUndefined();
    expect(host.querySelector('[data-script-edit-with-plan]')?.textContent).toContain('press Edit at the top of the lesson plan');
  });

  it('opens a draft when the plan enters edit mode, without moving focus away from the plan', () => {
    const bridge = { current: null };
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    render(React.createElement(View, scriptProps({ planEditing: false, planEditBridge: bridge })));
    render(React.createElement(View, scriptProps({ planEditing: true, planEditBridge: bridge })));
    expect(host.textContent).toContain('Unsaved script edits');
    expect(host.textContent).toContain('saved when you press Done');
    expect(host.querySelectorAll('textarea').length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(outside);
    expect(typeof bridge.current).toBe('function');
    outside.remove();
  });

  it('Done with no script changes closes the draft without saving', async () => {
    const bridge = { current: null }, p = scriptProps({ planEditing: true, planEditBridge: bridge });
    render(React.createElement(View, p));
    let finished;
    await act(async () => { finished = await bridge.current(); });
    expect(finished).toBe(true);
    expect(p.onUpdateTeachingScript).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain('Unsaved script edits');
  });

  it('Done saves a valid change and refuses to finish while a check fails', async () => {
    const bridge = { current: null }, p = scriptProps({ planEditing: true, planEditBridge: bridge });
    render(React.createElement(View, p));
    const say = firstSayAloud();
    type(say, 'Too short.');
    let finished;
    await act(async () => { finished = await bridge.current(); });
    expect(finished).toBe(false);
    expect(p.onUpdateTeachingScript).not.toHaveBeenCalled();
    expect(host.textContent).toContain('need attention before you finish editing');
    type(firstSayAloud(), 'Place one half on our shared number line, then explain to your partner why equal spaces matter.');
    await act(async () => { finished = await bridge.current(); });
    expect(finished).toBe(true);
    expect(p.onUpdateTeachingScript).toHaveBeenCalledTimes(1);
  });
});

describe('the lesson plan Done button', () => {
  const planProps = (extra = {}) => ({ ...scriptProps(), handleExportPDF: vi.fn(), handleCopyToClipboard: vi.fn(), handleToggleIsEditingLessonPlan: vi.fn(), handleLessonPlanChange: vi.fn(), ...extra });
  const doneButton = () => host.querySelector('button[aria-pressed]');

  it('stays in edit mode when the script draft cannot be saved yet', async () => {
    const p = planProps({ isEditingLessonPlan: true });
    render(React.createElement(PlanView, p));
    type(firstSayAloud(), 'Too short.');
    await act(async () => { doneButton().click(); });
    expect(p.handleToggleIsEditingLessonPlan).not.toHaveBeenCalled();
    expect(p.onUpdateTeachingScript).not.toHaveBeenCalled();
  });

  it('saves script changes and then leaves edit mode', async () => {
    const p = planProps({ isEditingLessonPlan: true });
    render(React.createElement(PlanView, p));
    type(firstSayAloud(), 'Place one half on our shared number line, then explain to your partner why equal spaces matter.');
    await act(async () => { doneButton().click(); });
    expect(p.onUpdateTeachingScript).toHaveBeenCalledTimes(1);
    expect(p.handleToggleIsEditingLessonPlan).toHaveBeenCalledTimes(1);
  });
});
