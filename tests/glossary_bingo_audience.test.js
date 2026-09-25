// Students play Bingo on their own card; the card-set generator is the teacher's.
//
// WHY (2026-09-24, Aaron): the games panel showed students both "Bingo"
// ("Create cards for group play", which builds a set of cards to run group
// Bingo) and "Play Bingo" (one card to play). Students should see only their own
// card.
import { createRequire } from 'node:module';
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const data = ['Leaf', 'Root', 'Seed', 'Stem', 'Flower', 'Fruit'].map((term, i) => ({ entryId: String(i), term, def: 'Meaning ' + i }));
let cleanup;
beforeAll(() => { window.React = React; loadAlloModule(process.env.ALLO_GLOSSARY_CANDIDATE || 'view_glossary_module.js'); loadAlloModule('host_handlers_module.js'); loadAlloModule('text_utility_helpers_module.js'); });
afterEach(() => { cleanup?.(); cleanup = null; vi.restoreAllMocks(); });

async function openGames(isTeacherMode) {
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const base = glossaryMediaProps();
  const props = glossaryMediaProps({ generatedContent: { ...base.generatedContent, data }, filteredGlossaryData: data.map((x, i) => ({ ...x, _originalIdx: i })), isTeacherMode, ErrorBoundary: ({ children }) => children });
  act(() => root.render(React.createElement(window.AlloModules.GlossaryView, props)));
  cleanup = () => { act(() => root.unmount()); container.remove(); };
  const toggle = container.querySelector('[aria-controls="glossary-games-tools"]');
  await act(async () => toggle.click());
  return container;
}

describe('Bingo in the games panel', () => {
  it('a student sees Play Bingo and not the card-set generator', async () => {
    const panel = (await openGames(false)).querySelector('#glossary-games-tools');
    expect(panel.querySelector('[data-help-key="glossary_play_bingo"]')).not.toBeNull();
    expect(panel.querySelector('[data-help-key="glossary_bingo"]')).toBeNull();
  });
  it('a teacher sees both', async () => {
    const panel = (await openGames(true)).querySelector('#glossary-games-tools');
    expect(panel.querySelector('[data-help-key="glossary_play_bingo"]')).not.toBeNull();
    expect(panel.querySelector('[data-help-key="glossary_bingo"]')).not.toBeNull();
  });
});

// Glossary tidy-ups (2026-09-24): a skip link to the word list comes first, and
// the teacher's UDL rationale is not the first thing a student reads.
async function mountGlossary(isTeacherMode) {
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const base = glossaryMediaProps();
  const props = glossaryMediaProps({ generatedContent: { ...base.generatedContent, data }, filteredGlossaryData: data.map((x, i) => ({ ...x, _originalIdx: i })), isTeacherMode, ErrorBoundary: ({ children }) => children });
  act(() => root.render(React.createElement(window.AlloModules.GlossaryView, props)));
  cleanup = () => { act(() => root.unmount()); container.remove(); };
  return container;
}
describe('the glossary toolbar', () => {
  it('starts with a skip link that lands on the word list', async () => {
    const el = await mountGlossary(false);
    const first = el.querySelector('button, input, select, a[href], [tabindex="0"]');
    expect(first.hasAttribute('data-glossary-skip')).toBe(true);
    await act(async () => first.click());
    expect(document.activeElement).toBe(el.querySelector('[data-glossary-word-list]'));
  });
  it('shows the UDL goal to teachers only', async () => {
    expect((await mountGlossary(false)).querySelector('[data-glossary-udl-goal]')).toBeNull();
    cleanup(); cleanup = null;
    expect((await mountGlossary(true)).querySelector('[data-glossary-udl-goal]')).not.toBeNull();
  });
});
