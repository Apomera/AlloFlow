// Teacher actions are not in a student's view.
//
// WHY (2026-09-24 audit):
// - Timeline: the "Detected: <mode>" chip was a button for everyone. A student
//   who clicked it locked the mode and rewrote the resource and history
//   (host_handlers handleLockTimelineMode).
// - Organizers: Regenerate was rendered for students and hidden only by a CSS
//   class, and it and Edit text were announced as "Refresh" and "Toggle edit
//   outline" instead of the words they show.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, renderToStaticMarkup, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ renderToStaticMarkup } = require(resolve('desktop/web-app/node_modules/react-dom/server')));
  global.React = window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule(process.env.ALLO_TIMELINE_CANDIDATE || 'view_timeline_module.js');
  loadAlloModule(process.env.ALLO_OUTLINE_CANDIDATE || 'view_outline_module.js');
  loadAlloModule(process.env.ALLO_SORT_CANDIDATE || 'view_concept_sort_module.js');
  loadAlloModule(process.env.ALLO_FAQ_CANDIDATE || 'view_faq_module.js');
});
afterEach(() => { host?.remove(); host = null; });

// Each view renders with only the props it reads while drawing; handlers are
// not needed for static markup.
const render = (Component, props) => {
  host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(React.createElement(Component, props));
  document.body.append(host);
  return host;
};
const t = (key) => ({ 'common.regenerate': 'Regenerate', 'outline.edit_text': 'Edit text', 'timeline.detected_label': 'Detected' }[key] || key);

describe('the timeline mode chip', () => {
  const MODES = { chronological: { label: 'In time order' } };
  const content = { id: 'tl', type: 'timeline', data: { mode: 'chronological', autoDetected: true, progressionLabel: 'Order', items: [{ date: '1900', event: 'A thing happened.' }] } };
  const props = isTeacherMode => ({ t, isTeacherMode, generatedContent: content, TIMELINE_MODE_DEFINITIONS: MODES, history: [], isEditingTimeline: false, timelineImageSize: 100, handleLockTimelineMode: vi.fn() });
  it('is only a label for a student', () => {
    const el = render(window.AlloModules.TimelineView, props(false));
    const chip = el.querySelector('[data-timeline-mode-chip]');
    expect(chip.textContent).toBe('In time order');
    expect([...el.querySelectorAll('button')].some(b => b.textContent.includes('Detected'))).toBe(false);
  });
  it('is the lock button for a teacher', () => {
    const el = render(window.AlloModules.TimelineView, props(true));
    expect([...el.querySelectorAll('button')].some(b => b.textContent.includes('Detected: In time order'))).toBe(true);
  });
});

describe('the organizer toolbar', () => {
  const props = isTeacherMode => ({ t, isTeacherMode, generatedContent: { id: 'o', type: 'outline', data: { main: 'Plants', branches: [] } }, history: [], isEditingOutline: false, outlineType: 'Structured Outline', isProcessing: false, renderOutlineContent: () => null });
  it('has no Regenerate or Edit text for a student', () => {
    const el = render(window.AlloModules.OutlineView, props(false));
    expect(el.querySelector('[data-outline-regenerate]')).toBeNull();
    expect(el.textContent).not.toContain('Regenerate');
  });
  it('names Regenerate and Edit text by what they show, for a teacher', () => {
    const el = render(window.AlloModules.OutlineView, props(true));
    const regenerate = el.querySelector('[data-outline-regenerate]');
    const edit = el.querySelector('[data-outline-edit-text]');
    expect(regenerate.textContent.trim()).toBe('Regenerate');
    expect(regenerate.getAttribute('aria-label')).toBeNull();
    expect(regenerate.className).not.toMatch(/\bhidden\b/);
    expect(edit.textContent.trim()).toBe('Edit text');
    expect(edit.getAttribute('aria-label')).toBeNull();
  });
});

// Students see a Start card of their own; the banner's second Start, the image
// slider (the game has its own size control) and the teacher's UDL rationale
// were extra controls before it. Independent learners have no Start card, so
// they keep the banner's start button and slider.
describe('the timeline and concept sort banners', () => {
  const MODES = { chronological: { label: 'In time order' } };
  const timeline = extra => ({ t, isTeacherMode: false, isIndependentMode: false, generatedContent: { id: 'tl', type: 'timeline', data: { mode: 'chronological', items: [{ date: '1900', event: 'A thing happened.' }] } }, TIMELINE_MODE_DEFINITIONS: MODES, history: [], isEditingTimeline: false, timelineImageSize: 100, ...extra });
  const sort = extra => ({ t, isTeacherMode: false, isIndependentMode: false, generatedContent: { id: 'cs', type: 'concept-sort', data: { categories: [], items: [] } }, isConceptSortGame: false, ...extra });
  const buttons = el => [...el.querySelectorAll('button')];
  it('a student meets only the timeline Start card', () => {
    const el = render(window.AlloModules.TimelineView, timeline());
    expect(el.querySelector('[data-timeline-toolbar]')).toBeNull();
    expect(el.querySelector('input[type="range"]')).toBeNull();
    expect(buttons(el)).toHaveLength(1);
    expect(buttons(el)[0].getAttribute('aria-label')).toBeNull();
  });
  it('a teacher keeps the timeline toolbar with the UDL goal', () => {
    const el = render(window.AlloModules.TimelineView, timeline({ isTeacherMode: true }));
    expect(el.querySelector('[data-timeline-toolbar]').textContent).toContain('timeline.udl_goal_desc');
    expect(buttons(el).every(b => !b.getAttribute('aria-label') || b.getAttribute('aria-label').includes(b.textContent.trim()))).toBe(true);
  });
  it('an independent learner keeps the start button and slider, without the UDL rationale', () => {
    const el = render(window.AlloModules.TimelineView, timeline({ isIndependentMode: true }));
    const bar = el.querySelector('[data-timeline-toolbar]');
    expect(bar).not.toBeNull();
    expect(bar.querySelector('input[type="range"]')).not.toBeNull();
    expect(bar.textContent).not.toContain('timeline.udl_goal_desc');
  });
  it('a student meets only the concept sort Start card; a teacher keeps the preview bar', () => {
    let el = render(window.AlloModules.ConceptSortView, sort());
    expect(el.querySelector('[data-concept-sort-teacher-bar]')).toBeNull();
    expect(el.querySelectorAll('[data-help-key="concept_sort_start_button"]')).toHaveLength(1);
    expect(buttons(el)[0].getAttribute('aria-label')).toBeNull();
    host.remove();
    el = render(window.AlloModules.ConceptSortView, sort({ isTeacherMode: true }));
    expect(el.querySelector('[data-concept-sort-teacher-bar]')).not.toBeNull();
  });
});

// The UDL goal is the teacher's rationale ("Providing options for perception..."),
// and was the first thing a student read above an organizer or an FAQ.
describe('the UDL goal', () => {
  const outline = isTeacherMode => ({ t, isTeacherMode, generatedContent: { id: 'o', type: 'outline', data: { main: 'Plants', branches: [] } }, history: [], isEditingOutline: false, outlineType: 'Structured Outline', isProcessing: false, gradeLevel: '5', leveledTextLanguage: 'English', renderOutlineContent: () => null });
  const faq = isTeacherMode => ({ t, isTeacherMode, generatedContent: { id: 'f', type: 'faq', data: [{ question: 'What is a root?', answer: 'It holds the plant.' }] }, history: [], isEditingFaq: false, splitTextToSentences: text => [text], formatInteractiveText: text => text, renderFormattedText: text => text, formatInlineText: text => text });
  it('is shown to teachers only above an organizer', () => {
    expect(render(window.AlloModules.OutlineView, outline(false)).querySelector('[data-organizer-udl-goal]')).toBeNull();
    host.remove();
    expect(render(window.AlloModules.OutlineView, outline(true)).querySelector('[data-organizer-udl-goal]').textContent).toContain('UDL Goal');
  });
  it('is shown to teachers only above an FAQ', () => {
    expect(render(window.AlloModules.FaqView, faq(false)).querySelector('[data-help-key="faq_goal_panel"]')).toBeNull();
    host.remove();
    expect(render(window.AlloModules.FaqView, faq(true)).querySelector('[data-help-key="faq_goal_panel"]')).not.toBeNull();
  });
});

describe('organizer game buttons are named by what they show', () => {
  const src = readFileSync(process.env.ALLO_RENDERERS_SOURCE || 'view_renderers_source.jsx', 'utf8');
  it('the Pipeline and Venn starts carry no different spoken name', () => {
    expect(src).not.toContain("aria-label={t('games.pipeline.title') || 'Pipeline Builder'}");
    const venn = src.slice(src.indexOf('data-venn-interactive-start'), src.indexOf("t('concept_map.venn.interactive_mode')"));
    expect(venn).not.toMatch(/aria-label/);
  });
});
