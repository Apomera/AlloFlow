import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let M;
const mounted = [];
const firstGuidance = 'Keep your first response here. Leave it unchanged when you write a later version.';
const secondGuidance = 'Name a fact and explain how it supports your decision. State what still needs checking.';

beforeAll(() => {
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  new Function(readFileSync(resolve('note_taking_templates_module.js'), 'utf8'))();
  M = window.AlloModules;
});

afterEach(() => {
  for (const { root, host } of mounted.splice(0)) {
    act(() => root.unmount());
    host.remove();
  }
  vi.restoreAllMocks();
});

function fixture() {
  return {
    templateType: 'cornell-notes', title: 'My decision portfolio',
    cues: [{ id: 'cue-1', text: 'First response', guidance: firstGuidance }, { id: 'cue-2', text: 'Evidence', guidance: secondGuidance }],
    notes: [{ id: 'note-1', text: '' }, { id: 'note-2', text: '' }],
    summary: '', connections: ''
  };
}

function mount(data = fixture(), extraProps = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  let latest;
  function StatefulView() {
    const [current, setCurrent] = React.useState(data);
    latest = current;
    return React.createElement(M.CornellNotesView, {
      generatedContent: { id: 'same-resource-id', type: 'note-taking', data: current },
      handleNoteUpdate: (field, value) => setCurrent((previous) => ({ ...previous, [field]: value })),
      allowRuntimeAi: false,
      t: (key, fallback) => fallback || key,
      ...extraProps
    });
  }
  mounted.push({ root, host });
  act(() => root.render(React.createElement(StatefulView)));
  return { host, data: () => latest };
}

async function type(control, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(control, value);
    control.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const notes = (view, row) => view.host.querySelector(`textarea[aria-label="Notes for row ${row}"]`);
const guidanceFor = (textarea) => document.getElementById(textarea.getAttribute('aria-describedby'));

describe('Cornell authored guidance in the rendered learner view', () => {
  it('keeps full guidance outside blank learner fields and describes the matching response', () => {
    const view = mount();
    expect([...view.host.querySelectorAll('[data-cornell-guidance]')].map((node) => node.textContent)).toEqual([firstGuidance, secondGuidance]);
    expect(notes(view, 1).value).toBe('');
    expect(notes(view, 2).value).toBe('');
    expect(notes(view, 1).placeholder).toBe('Write your response');
    expect(notes(view, 2).placeholder).toBe('Write your response');
    expect(guidanceFor(notes(view, 1)).textContent).toBe(firstGuidance);
    expect(guidanceFor(notes(view, 2)).textContent).toBe(secondGuidance);
    expect(guidanceFor(notes(view, 1)).tagName).toBe('P');
    expect(view.data().summary).toBe('');
    expect(view.data().connections).toBe('');
  });

  it('retains guidance while the learner types and edits the short cue', async () => {
    const view = mount();
    const descriptionId = notes(view, 1).getAttribute('aria-describedby');
    await type(notes(view, 1), 'My first decision with a reason.');
    await type(view.host.querySelector('textarea[aria-label="Cue 1"]'), 'My first attempt');
    expect(notes(view, 1).value).toBe('My first decision with a reason.');
    expect(notes(view, 1).getAttribute('aria-describedby')).toBe(descriptionId);
    expect(guidanceFor(notes(view, 1)).textContent).toBe(firstGuidance);
    expect(view.data().cues[0]).toEqual({ id: 'cue-1', text: 'My first attempt', guidance: firstGuidance });
  });

  it('preserves cue/response pairing after removing a row and adding a blank row', async () => {
    const view = mount();
    await type(notes(view, 2), 'The remaining response.');
    await act(async () => view.host.querySelector('button[aria-label="Remove row 1"]').click());
    expect(view.data().cues).toEqual([{ id: 'cue-2', text: 'Evidence', guidance: secondGuidance }]);
    expect(view.data().notes).toEqual([{ id: 'note-2', text: 'The remaining response.' }]);
    expect(guidanceFor(notes(view, 1)).textContent).toBe(secondGuidance);
    expect(view.host.textContent).not.toContain(firstGuidance);
    await act(async () => view.host.querySelector('[data-help-key="cornell_notes_add_row_button"]').click());
    expect(view.data().cues).toHaveLength(2);
    expect(view.data().cues[1].text).toBe('');
    expect(view.data().cues[1]).not.toHaveProperty('guidance');
    expect(notes(view, 2).value).toBe('');
    expect(notes(view, 2).hasAttribute('aria-describedby')).toBe(false);
    expect(guidanceFor(notes(view, 1)).textContent).toBe(secondGuidance);
  });

  it('uses unique descriptions across simultaneous copies, including after removal', async () => {
    const first = mount();
    const second = mount();
    const ids = [...document.querySelectorAll('[data-cornell-guidance]')].map((node) => node.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids.every(Boolean)).toBe(true);
    await act(async () => first.host.querySelector('button[aria-label="Remove row 1"]').click());
    expect(first.host.contains(guidanceFor(notes(first, 1)))).toBe(true);
    expect(second.host.contains(guidanceFor(notes(second, 1)))).toBe(true);
    expect(guidanceFor(notes(first, 1)).textContent).toBe(secondGuidance);
    expect(guidanceFor(notes(second, 1)).textContent).toBe(firstGuidance);
    const remainingIds = [...document.querySelectorAll('[data-cornell-guidance]')].map((node) => node.id);
    expect(new Set(remainingIds).size).toBe(remainingIds.length);
  });

  it('omits empty, non-text, and over-limit guidance without coercing it into an answer', () => {
    const invalid = [undefined, null, false, 42, {}, [], ' \n\t ', 'x'.repeat(1001)];
    const data = fixture();
    data.cues = invalid.map((guidance, index) => ({ id: `cue-${index}`, text: `Cue ${index}`, guidance }));
    data.notes = invalid.map((_, index) => ({ id: `note-${index}`, text: '' }));
    const view = mount(data);
    expect(view.host.querySelectorAll('[data-cornell-guidance]')).toHaveLength(0);
    expect(view.host.querySelectorAll('textarea[aria-describedby]')).toHaveLength(0);
    expect([...view.host.querySelectorAll('textarea')].every((node) => !node.getAttribute('aria-label').startsWith('Notes for row') || node.value === '')).toBe(true);
    expect(view.data()).toBe(data);
  });

  it('renders allowed guidance as plain text, preserving lines and escaping markup', () => {
    const data = fixture();
    data.cues[0].guidance = '  First line\n<img src=x onerror="alert(1)">  ';
    data.cues[1].guidance = 'x'.repeat(1000);
    const view = mount(data);
    expect(guidanceFor(notes(view, 1)).textContent).toBe('First line\n<img src=x onerror="alert(1)">');
    expect(guidanceFor(notes(view, 1)).querySelector('img')).toBeNull();
    expect(guidanceFor(notes(view, 1)).className).toContain('whitespace-pre-wrap');
    expect(guidanceFor(notes(view, 2)).textContent).toHaveLength(1000);
  });

  it('stacks guided rows on narrow screens and reserves room for the remove control', () => {
    const view = mount();
    for (const row of view.host.querySelectorAll('[data-cornell-guided-row]')) {
      expect(row.className).toContain('grid-cols-1 sm:grid-cols-[35%_65%]');
      const responseCell = row.querySelector('textarea[aria-describedby]').parentElement;
      expect(responseCell.className).toContain('pr-9');
      expect(responseCell.className).toContain('min-w-0');
      expect(row.querySelector('textarea[aria-describedby]').className).toContain('bg-slate-50 border border-slate-300 resize-y p-2 min-h-[96px]');
      expect(row.firstElementChild.className).toContain('border-b sm:border-b-0 sm:border-r');
    }
    const legacy = fixture();
    legacy.cues.forEach((cue) => delete cue.guidance);
    const plain = mount(legacy);
    const legacyRow = notes(plain, 1).parentElement.parentElement;
    expect(legacyRow.className).toContain('grid-cols-[35%_65%]');
    expect(legacyRow.className).not.toContain('grid-cols-1');
    expect(plain.host.querySelectorAll('[data-cornell-guided-row]')).toHaveLength(0);
    expect(notes(plain, 1).className).toContain('bg-transparent resize-none p-1 min-h-[60px]');
    expect(notes(plain, 2).placeholder).toBe('');
  });

  it('uses the existing localized response prompt on every guided row', () => {
    const view = mount(fixture(), { t: (key) => key === 'quiz.live_student.write_response' ? 'Escribe tu respuesta' : key });
    expect(notes(view, 1).placeholder).toBe('Escribe tu respuesta');
    expect(notes(view, 2).placeholder).toBe('Escribe tu respuesta');
    expect(notes(view, 1).value).toBe('');
    expect(notes(view, 2).value).toBe('');
  });

  it('does not count instructions as completed work or include them in AI feedback input', async () => {
    const callGemini = vi.fn().mockResolvedValue(JSON.stringify({ strength: 'You gave a reason.', growthNudge: 'Add the evidence source.', rubric: { completion: 2, quality: 4, alignment: 0 } }));
    const addToast = vi.fn();
    const view = mount(fixture(), { allowRuntimeAi: true, callGemini, addToast });
    await act(async () => view.host.querySelector('[data-help-key="notes_feedback_button"]').click());
    expect(callGemini).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('notes_feedback.cornell_needs_notes', 'info');
    await type(notes(view, 1), 'A learner response with its first reason.');
    await type(notes(view, 2), 'A second learner response citing evidence.');
    await act(async () => view.host.querySelector('[data-help-key="notes_feedback_button"]').click());
    expect(callGemini).toHaveBeenCalledTimes(1);
    const prompt = callGemini.mock.calls[0][0];
    expect(prompt).toContain('A learner response with its first reason.');
    expect(prompt).toContain('A second learner response citing evidence.');
    expect(prompt).not.toContain(firstGuidance);
    expect(prompt).not.toContain(secondGuidance);
    const withoutGuidance = { ...view.data(), cues: view.data().cues.map(({ guidance, ...cue }) => cue) };
    expect(M.NoteTakingDraftFingerprint(view.data())).toBe(M.NoteTakingDraftFingerprint(withoutGuidance));
  });
});
