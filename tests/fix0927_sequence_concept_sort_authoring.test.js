// 2026-09-27 review of Sequence Builder and Concept Sort authoring.
// S1: the picture-description field sat under the invisible full-size
//     "Regenerate image" overlay (one click replaced the teacher's picture),
//     and the refine popover was absolutely positioned over the next row.
// S4: manual edits and moves kept "Verified" badges for old text/positions,
//     and structural issues were never recomputed after them.
// C1: nothing checked that a card's categoryId names a category (generation,
//     classification of an added card, teacher review).
// C2: the misconception report counted every retry as another student.
// C3: "Upload your own image" was a hidden input inside a non-focusable label.
// C5: a run guard sat inside the classification prompt text, so it never ran.
// Mutation checks: each FIX0927_* variable swaps in a scratch copy of that file.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const file = (envName, fallback) => readFileSync(resolve(process.env[envName] || fallback), 'utf8');
const run = (src) => new Function(src)(); // eslint-disable-line no-new-func

beforeAll(() => {
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  run(file('FIX0927_TIMELINE_REVISION', 'timeline_revision_module.js'));
  run(file('FIX0927_TIMELINE_VIEW', 'view_timeline_module.js'));
  run(file('FIX0927_CS_VIEW', 'view_concept_sort_module.js'));
});

let root = null, host = null;
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  vi.restoreAllMocks();
});
function render(Component, props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(React.createElement(Component, props)));
  return host;
}
const t = (k) => k;
const ancestorsWithin = (el, stop) => { const out = []; for (let n = el.parentElement; n && n !== stop; n = n.parentElement) out.push(n); return out; };

describe('Sequence edit row: the picture tools are not under the regenerate overlay', () => {
  function mountEditRow() {
    window.AlloModules.AltText = { hashImage: (v) => 'hash:' + v, draftAlts: vi.fn() };
    window.AlloModules.ImageAltField = (props) => React.createElement('textarea', { 'data-alt-id': props.id, 'aria-label': 'Picture description' });
    const regen = vi.fn();
    const el = render(window.AlloModules.TimelineView, {
      t, isTeacherMode: true, isEditingTimeline: true, leveledTextLanguage: 'English',
      generatedContent: { id: 'seq', type: 'timeline', data: { items: [{ date: '1492', event: 'Columbus sails', image: 'data:image/png;base64,AAAA' }, { date: '1620', event: 'Mayflower lands' }] } },
      dismissedVerifications: new Set(), isGeneratingTimelineImage: {}, timelineRefinementInputs: {}, TIMELINE_MODE_DEFINITIONS: {}, timelineImageSize: 100,
      handleTimelineChange: vi.fn(), handleGenerateTimelineItemImage: regen, setTimelineRefinementInputs: vi.fn(),
    });
    const row = el.querySelector('[data-timeline-row]');
    const overlay = Array.from(row.querySelectorAll('button')).find((b) => /\babsolute\b/.test(b.className) && /\binset-0\b/.test(b.className));
    return { el, row, overlay, regen, alt: row.querySelector('[data-alt-id]'), refine: row.querySelector('input[aria-label="timeline.visuals.refine_placeholder"]') };
  }

  it('keeps the description field and refine box outside the overlay box and out of any floating layer', () => {
    const { row, overlay, alt, refine } = mountEditRow();
    expect(overlay, 'regenerate overlay').toBeTruthy();
    expect(alt, 'description field').toBeTruthy();
    expect(refine, 'refine box').toBeTruthy();
    expect(overlay.parentElement.contains(alt)).toBe(false);
    expect(overlay.parentElement.contains(refine)).toBe(false);
    for (const field of [alt, refine]) {
      expect(ancestorsWithin(field, row).some((n) => /(^|\s)absolute(\s|$)/.test(n.className))).toBe(false);
    }
  });

  it('keeps the overlay visible on keyboard focus and bounded to the picture', () => {
    const { overlay } = mountEditRow();
    expect(overlay.className).toContain('focus:opacity-100');
    expect(overlay.parentElement.querySelectorAll('img')).toHaveLength(1);
    expect(overlay.parentElement.querySelectorAll('input, textarea')).toHaveLength(0);
  });
});

// host_handlers_source.jsx is plain JS inside createHostHandlers(__d).
const createHostHandlers = new Function(file('FIX0927_HOST_HANDLERS_SOURCE', 'host_handlers_source.jsx') + '\nreturn createHostHandlers;')(); // eslint-disable-line no-new-func
function timelineHost(data, extra = {}) {
  const state = { active: { id: 'seq', type: 'timeline', data }, history: [] };
  const d = {
    get generatedContent() { return state.active; },
    setGeneratedContent: (v) => { state.active = typeof v === 'function' ? v(state.active) : v; },
    setHistory: () => {}, setDraggedTimelineIndex: () => {}, draggedTimelineIndex: null,
    addToast: vi.fn(), warnLog: vi.fn(), t: () => undefined, ...extra,
  };
  return { state, h: createHostHandlers(d) };
}
const ok = { factual: true, position: true, concern: '', rationale: 'Checked.' };

describe('Sequence manual edits drop stale verification and recompute issues', () => {
  const items = () => [
    { date: '1492', event: 'Columbus sails', verification: { ...ok } },
    { date: '1607', event: 'Jamestown founded', verification: { ...ok } },
    { date: '1620', event: 'Mayflower lands', verification: { factual: false, position: true, concern: 'Wrong year', rationale: '' } },
  ];
  it('clears the verdict on an item whose text changed, and keeps the others', () => {
    const { state, h } = timelineHost({ mode: 'chronological', items: items() });
    h.handleTimelineChange(0, 'event', 'Columbus lands in the Bahamas');
    const out = state.active.data.items;
    expect(out[0].verification).toBeUndefined();
    expect(out[1].verification).toEqual(ok);
  });
  it('keeps a picture-description patch from clearing the verdict', () => {
    const { state, h } = timelineHost({ items: items() });
    h.handleTimelineChange(1, { alt: 'A fort', altSource: 'author' });
    expect(state.active.data.items[1].verification).toEqual(ok);
  });
  it('drops "Verified" from moved items but keeps a factual flag', () => {
    const { state, h } = timelineHost({ mode: 'chronological', items: items() });
    h.handleTimelineMove(2, 0);
    const out = state.active.data.items;
    expect(out.map((it) => it.date)).toEqual(['1620', '1492', '1607']);
    expect(out[1].verification).toBeUndefined();
    expect(out[2].verification).toBeUndefined();
    expect(out[0].verification.factual).toBe(false);
    expect(out[0].verification.position).toBeUndefined();
  });
  it('recomputes structural issues after a manual move and after the fix', () => {
    const { state, h } = timelineHost({ mode: 'chronological', items: items() });
    h.handleTimelineMove(2, 0);
    expect(state.active.data.validationIssues.map((i) => i.code)).toContain('NON_MONOTONIC_DATES');
    h.handleTimelineMove(0, 2);
    expect(state.active.data.validationIssues).toBeUndefined();
  });
  it('recomputes structural issues after a text edit that creates a duplicate position', () => {
    const { state, h } = timelineHost({ items: items() });
    h.handleTimelineChange(1, 'date', '1492');
    expect(state.active.data.validationIssues.map((i) => i.code)).toContain('DUPLICATE_DATE');
  });
});

describe('Concept Sort classification of an added card', () => {
  function conceptHost(reply) {
    const prompts = [];
    const d = {
      csGeneratedItemBudgetRef: { current: { documentId: '', used: 0 } }, csLiveDocumentIdRef: { current: '' }, CS_GENERATED_ITEM_BUDGET: 50,
      callGemini: async (prompt) => { prompts.push(prompt); return JSON.stringify(reply); }, cleanJson: (s) => s,
      gradeLevel: '5th Grade', conceptImageMode: 'never', warnLog: vi.fn(), addToast: vi.fn(), t: (k) => k,
    };
    return { d, prompts, h: createHostHandlers(d) };
  }
  const cats = [{ id: 'c1', label: 'Renewable' }, { id: 'c2', label: 'Non-renewable' }];
  it('maps a category label returned as the id to the real id', async () => {
    const { h } = conceptHost({ categoryId: ' renewable ', content: 'Wind' });
    const item = await h.handleGenerateConceptItem('wind', cats);
    expect(item.categoryId).toBe('c1');
  });
  it('refuses an unknown category instead of making an unwinnable card', async () => {
    const { h, d } = conceptHost({ categoryId: 'zzz', content: 'Wind' });
    expect(await h.handleGenerateConceptItem('wind', cats)).toBeNull();
    expect(d.addToast).toHaveBeenCalled();
  });
  it('does not send the run guard to the model as prompt text', async () => {
    const { h, prompts } = conceptHost({ categoryId: 'c1', content: 'Wind' });
    await h.handleGenerateConceptItem('wind', cats);
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).not.toContain('stillCurrent');
  });
});

describe('Concept Sort generation validates the answer key', () => {
  const stub = { AlloModules: {}, console };
  new Function('window', 'console', file('FIX0927_DISPATCHER', 'generate_dispatcher_module.js'))(stub, console); // eslint-disable-line no-new-func
  const normalize = (raw) => stub.AlloModules.GenDispatcher.normalizeConceptSortContent(raw);
  it('maps labels to ids ignoring case and spacing, merges duplicates, and keeps unmatched cards for review', () => {
    const out = normalize({
      categories: [{ id: 'c1', label: 'Renewable' }, { id: 'c2', label: 'Non-renewable' }, { id: 'c3', label: ' renewable ' }],
      items: [
        { id: 'i1', content: 'Solar', categoryId: 'c1' },
        { id: 'i2', content: 'Wind', categoryId: 'RENEWABLE' },
        { id: 'i3', content: 'Coal', categoryId: 'c3' },
        { id: 'i4', content: 'solar ', categoryId: 'c2' },
        { id: 'i4', content: 'Oil', categoryId: 'Fossil' },
      ],
    });
    expect(out.categories.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(out.items.map((i) => [i.content, i.categoryId])).toEqual([['Solar', 'c1'], ['Wind', 'c1'], ['Coal', 'c1'], ['Oil', 'Fossil']]);
    expect(new Set(out.items.map((i) => i.id)).size).toBe(out.items.length);
  });
  it('rejects a board with no categories or no sortable cards', () => {
    const tooFew = /without enough categories and cards/;
    expect(() => normalize({ categories: [], items: [{ content: 'Solar', categoryId: 'c1' }] })).toThrow(tooFew);
    expect(() => normalize({ categories: [{ id: 'c1', label: 'A' }, { id: 'c2', label: 'B' }], items: [] })).toThrow(tooFew);
    expect(() => normalize({ categories: [{ id: 'c1', label: 'A' }, { id: 'c2', label: 'B' }], items: [{ content: 'x', categoryId: 'nope' }, { content: 'y', categoryId: 'nope' }] })).toThrow(tooFew);
    expect(normalize({ categories: [{ id: 'c1', label: 'A' }, { id: 'c2', label: 'B' }], items: [{ content: 'x', categoryId: 'c1' }, { content: 'y', categoryId: 'c2' }] }).items).toHaveLength(2);
  });
});

describe('Concept Sort teacher review', () => {
  const data = { categories: [{ id: 'c1', label: 'Renewable' }, { id: 'c2', label: 'Non-renewable' }], items: [
    { id: 'i1', content: 'Solar', categoryId: 'c1' }, { id: 'i2', content: 'Coal', categoryId: 'c2' }, { id: 'i3', content: 'Wind', categoryId: 'Renewable' },
  ] };
  const props = (extra = {}) => ({ t, isTeacherMode: true, isIndependentMode: false, generatedContent: { id: 'cs', type: 'concept-sort', data }, csEdit: null, csAddingCatId: null, csAddingText: '', csBusyId: null, isConceptSortGame: false,
    setCsEdit: vi.fn(), setCsAddingCatId: vi.fn(), setCsAddingText: vi.fn(), csMoveItem: vi.fn(), csUploadItemImage: vi.fn(), ...extra });
  it('lists a card with no matching category in an Uncategorized group where it can be assigned', () => {
    const csMoveItem = vi.fn();
    const el = render(window.AlloModules.ConceptSortView, props({ csMoveItem }));
    expect(el.querySelectorAll('[data-help-key="concept_sort_item"]')).toHaveLength(3);
    const group = el.querySelector('[data-concept-sort-uncategorized]');
    expect(group).not.toBeNull();
    expect(group.textContent).toContain('Wind');
    const select = group.querySelector('select');
    expect(select.value).toBe('');
    act(() => { select.value = 'c1'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(csMoveItem).toHaveBeenCalledWith('i3', 'c1');
  });
  it('offers image upload as a real button that opens the file picker', () => {
    const el = render(window.AlloModules.ConceptSortView, props());
    const clicks = vi.spyOn(window.HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const upload = el.querySelector('button[data-concept-sort-upload="i1"]');
    expect(upload).not.toBeNull();
    expect(upload.getAttribute('aria-label')).toBeTruthy();
    act(() => { upload.click(); });
    expect(clicks).toHaveBeenCalledTimes(1);
    expect(clicks.mock.instances[0].type).toBe('file');
  });
});

describe('Concept Sort misconception report counts students, not retries', () => {
  const src = file('FIX0927_TEACHER_SOURCE', 'teacher_source.jsx');
  const anchor = src.indexOf("id: 'concept-sort', label: 'Concept Sorts'");
  const start = src.indexOf('misconceptions: (dashboardData) =>', anchor);
  let i = src.indexOf('{', start), depth = 0;
  for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}') { depth--; if (depth === 0) break; } }
  const misconceptions = new Function('return ' + src.slice(src.indexOf('(dashboardData)', start), i + 1))(); // eslint-disable-line no-new-func
  const miss = { itemText: 'Oil', placedCategoryLabel: 'Renewable', correctCategoryLabel: 'Non-renewable' };
  const student = (id, attempts) => ({ id, gameCompletions: { conceptSortAttempt: attempts } });
  it('one student retrying the same mistake is not a class pattern', () => {
    const data = [student('a', [{ incorrectPlacements: [miss] }, { incorrectPlacements: [miss] }, { incorrectPlacements: [miss] }]),
      student('b', [{ incorrectPlacements: [] }]), student('c', [{ incorrectPlacements: [] }]), student('d', [{ incorrectPlacements: [] }])];
    expect(misconceptions(data)).toEqual([]);
  });
  it('the same mistake by three of five students is still reported', () => {
    const data = [student('a', [{ incorrectPlacements: [miss] }]), student('b', [{ incorrectPlacements: [miss] }, { incorrectPlacements: [miss] }]),
      student('c', [{ incorrectPlacements: [miss] }]), student('d', [{ incorrectPlacements: [] }]), student('e', [{ incorrectPlacements: [] }])];
    const out = misconceptions(data);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ itemText: 'Oil', count: 3, missPct: 60 });
  });
});
