// Reading view polish from the rest of the 2026-09-24 audit.
//
// WHY:
// - Status messages ("Word supports are ready", "Generating more...", audio
//   saving) were inserted with their text already in them; VoiceOver and some
//   other screen readers do not announce a region that arrives filled.
// - The teacher's role card opened for every reading, adding a panel above the
//   text even when nothing needed deciding.
// - Any whole italic line was promoted to a heading, so a poem line or
//   "*Figure 2*" became a section title.
// - Novak's ramp: an adaptation prepares students to read the original, but its
//   end did not lead there.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase, api;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });

function pair(role = 'supplemental', captured = true) {
  const snapshot = api.createSourceSnapshot('The heath was quiet. Three figures met there.', { language: 'English', sourceArtifactId: 'analysis', selection: 'input' });
  const original = api.createSupportedReading(snapshot, { id: 'orig', title: 'Scene' });
  const adapted = { id: 'adapted', type: 'simplified', data: 'The open land was quiet. Three people met there.', ...(captured ? { sourceSnapshot: snapshot } : {}), instructionalText: { role, form: 'adapted' }, config: { language: 'English', grade: '5' } };
  return { original, adapted };
}
function mount(extra = {}) {
  const { original, adapted } = pair();
  const props = { ComplexityGauge: () => null, t: k => k, generatedContent: adapted, leveledTextLanguage: 'English', isTeacherMode: false, isZenMode: true, interactionMode: 'read', history: [original, adapted], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleSpeak: vi.fn(), stopPlayback: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [], setFocusedParagraphIndex: () => {}, onReadOriginal: vi.fn(), onOpenReadingArtifact: vi.fn(), setIsCompareMode: vi.fn(), setInteractionMode: vi.fn(), ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return props;
}

describe('status messages are in place before they have text', () => {
  it('"generating more" is announced into a region that was already there', () => {
    mount();
    const region = host.querySelector('[data-generating-status]');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.textContent).toBe('');
  });
  it('audio saving has its region in the teacher tools', () => {
    mount({ isTeacherMode: true, isZenMode: false, isTeacherToolbarExpanded: true });
    const region = host.querySelector('[data-tts-prep-status]');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.textContent).toBe('');
  });
});

describe('the teacher role card', () => {
  const card = () => host.querySelector('details[data-instructional-role]');
  it('starts as its one-line summary when the role is set', () => {
    mount({ isTeacherMode: true });
    expect(card().open).toBe(false);
  });
  it('opens when no role has been chosen', () => {
    const { adapted } = pair('unspecified');
    mount({ isTeacherMode: true, generatedContent: adapted });
    expect(card().open).toBe(true);
  });
  it('opens when the original was not captured, so the warning shows', () => {
    const { adapted } = pair('supplemental', false);
    mount({ isTeacherMode: true, generatedContent: adapted, history: [adapted] });
    expect(card().open).toBe(true);
    expect(card().textContent).toMatch(/Original not captured/);
  });
});

describe('an italic line', () => {
  it('stays a line of text; a bold label line is still a heading', () => {
    const { adapted } = pair();
    mount({ generatedContent: { ...adapted, data: '*Figure 2*\n\nThe land was quiet.\n\n**Key idea**\n\nPeople met there.' } });
    const body = host.querySelector('[data-simplified-reading-body]');
    expect([...body.querySelectorAll('h2,h3,h4')].map(h => h.textContent.trim())).toEqual(['Key idea']);
    expect(body.textContent).toContain('Figure 2');
  });
});

describe('the end of an adaptation leads to the original', () => {
  const next = () => host.querySelector('[data-read-original-next] button');
  it('with a button that opens it', () => {
    const props = mount();
    expect(next().textContent).toMatch(/Now read the original/);
    act(() => next().click());
    expect(props.onReadOriginal).toHaveBeenCalledTimes(1);
  });
  it('not when the adaptation is the main reading, in Both, or without a captured original', () => {
    mount({ generatedContent: pair('primary').adapted });
    expect(next()).toBeNull();
    act(() => root.unmount()); host.remove(); root = null;
    mount({ isCompareMode: true });
    expect(next()).toBeNull();
    act(() => root.unmount()); host.remove(); root = null;
    const { adapted } = pair('supplemental', false);
    mount({ generatedContent: adapted, history: [adapted] });
    expect(next()).toBeNull();
  });
  it('not during fill in the blanks, where the original would give the answers', () => {
    mount({ interactionMode: 'cloze', latestGlossary: [{ term: 'quiet' }] });
    expect(host.querySelector('[data-simplified-reading-body]')).not.toBeNull();
    expect(next()).toBeNull();
  });
});
