// A revision changes the words that were selected, not the first match.
//
// WHY (2026-09-24): applyTextRevision used currentFullText.replace(selection,
// result). Selecting "the cell" in paragraph 4 changed paragraph 1; a
// selection crossing bold text was "not found" because the selection has no
// Markdown markers; and "$&" or "$$" in the AI's wording was expanded as a
// replacement pattern. The selected occurrence is now recorded when the
// selection is made and used when the revision is applied.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
beforeAll(() => { window.__alloUtils = { cleanJson: x => x }; loadAlloModule(process.env.ALLO_CE_CANDIDATE || 'content_engine_module.js'); });

function engineFor(text, revision) {
  const state = {
    generatedContent: { id: 'one', type: 'simplified', data: text, config: { grade: '5', language: 'English' } },
    revisionData: { resourceId: 'one', resourceText: text, ...revision },
    interactionMode: 'revise', leveledTextLanguage: 'English', gradeLevel: '5',
    handleSimplifiedTextChange: vi.fn(), setRevisionData: vi.fn(), setSelectionMenu: value => { state.selectionMenu = value; },
  };
  const engine = window.AlloModules.createContentEngine({ getState: () => state, callGemini: vi.fn(), addToast: vi.fn(), t: x => x });
  return { engine, state };
}
const applied = async (text, revision) => {
  const { engine, state } = engineFor(text, revision);
  await engine.applyTextRevision();
  return state.handleSimplifiedTextChange.mock.calls[0]?.[0];
};

describe('applying a revision', () => {
  it('changes the occurrence that was selected', async () => {
    const text = 'In the cell, energy is made. Later, the cell divides.';
    expect(await applied(text, { original: 'the cell', occurrence: 1, result: 'the organelle' }))
      .toBe('In the cell, energy is made. Later, the organelle divides.');
    expect(await applied(text, { original: 'the cell', occurrence: 0, result: 'the organelle' }))
      .toBe('In the organelle, energy is made. Later, the cell divides.');
  });
  it('finds a selection that crosses bold text and leaves no stray markers', async () => {
    // A whole bold phrase keeps its bold; a selection across a marker takes the pair with it.
    expect(await applied('The **cell wall** is strong.', { original: 'cell wall', occurrence: 0, result: 'outer layer' }))
      .toBe('The **outer layer** is strong.');
    expect(await applied('A **cell** wall holds it.', { original: 'cell wall', occurrence: 0, result: 'outer layer' }))
      .toBe('A outer layer holds it.');
  });
  it('keeps dollar signs in the new wording literally', async () => {
    expect(await applied('It costs five dollars.', { original: 'five dollars', occurrence: 0, result: '$5 ($& not a pattern) and $$x$$' }))
      .toBe('It costs $5 ($& not a pattern) and $$x$$.');
  });
});

describe('selecting words to revise', () => {
  it('records how many times the words appear earlier in the passage', () => {
    const { engine, state } = engineFor('x', {});
    if (!Range.prototype.getBoundingClientRect) Range.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 });
    document.body.innerHTML = '<div data-simplified-reading-body="true"><p id="p">the cell grows and the cell splits</p></div>';
    const node = document.getElementById('p').firstChild;
    const range = document.createRange();
    const second = node.textContent.lastIndexOf('the cell');
    range.setStart(node, second); range.setEnd(node, second + 'the cell'.length);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    engine.handleTextMouseUp({ currentTarget: document.getElementById('p') });
    expect(state.selectionMenu.text).toBe('the cell');
    expect(state.selectionMenu.occurrence).toBe(1);
  });
  it('carries that count into the revision request', () => {
    const { engine, state } = engineFor('the cell grows and the cell splits', {});
    state.selectionMenu = { text: 'the cell', occurrence: 1, x: 0, y: 0 };
    let revision = null;
    state.setRevisionData = value => { revision = typeof value === 'function' ? value(revision) : value; };
    Object.assign(state, { setIsCustomReviseOpen: vi.fn(), setCustomReviseInstruction: vi.fn() });
    engine.handleReviseSelection('explain');
    expect(revision.occurrence).toBe(1);
    expect(revision.original).toBe('the cell');
  });
});
