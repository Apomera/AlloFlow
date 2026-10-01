// Lane 1 (fleet 2026-08-16), issues G6 and G7.
//
// G6  Aaron hit "no words match your search" in the glossary without typing a
//     search term and could not reproduce it deliberately. Three separate
//     things can empty that table and only one of them is a search, so the
//     single catch-all message was wrong more often than it was right.
//
// G7  Crossword needed to be printable like the rest of the activity set,
//     reusing the existing mechanism (window.print() over the live modal with
//     `no-print` on the chrome and `print:` variants on the sheet) rather than
//     growing a second one.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const glossary = readFileSync('view_glossary_source.jsx', 'utf8');
const games = readFileSync('games_source.jsx', 'utf8');
const anti = readFileSync('AlloFlowANTI.txt', 'utf8');

const region = (src, from, to) => {
  const a = src.indexOf(from);
  expect(a, 'region start not found: ' + from).toBeGreaterThan(-1);
  const b = to ? src.indexOf(to, a) : src.length;
  return src.slice(a, b === -1 ? src.length : b);
};

describe('G6 the empty state can only mention a search when one exists', () => {
  const emptyState = region(glossary, 'function glossaryEmptyStateInfo()', 'function toggleGlossaryToolPanel');

  it('branches on the query and the tier filter separately', () => {
    expect(emptyState).toContain('empty_search_and_filter');
    expect(emptyState).toContain('empty_search_only');
    expect(emptyState).toContain('empty_filter_only');
    expect(emptyState).toContain('empty_no_tiers');
  });

  it('treats a whitespace-only query as no query', () => {
    expect(emptyState).toContain("typeof glossarySearchTerm === 'string' ? glossarySearchTerm.trim() : ''");
    expect(emptyState).toContain('query.length > 0');
  });

  it('never renders the search wording on the filter-only or tierless branch', () => {
    // The tier-only and tierless branches must not reach for info.query.
    const filterOnly = region(emptyState, 'if (info.tierActive) {', 'Nothing is filtering');
    expect(filterOnly).not.toContain('info.query');
    const tierless = region(emptyState, 'if (info.tierless) {', 'if (info.hasQuery && info.tierActive)');
    expect(tierless).not.toContain('info.query');
  });

  it('the old catch-all wording is gone', () => {
    expect(glossary).not.toContain('No terms match this search or vocabulary filter.');
  });

  it('a glossary with no tier data is called out as data, not as the teacher filtering', () => {
    // AlloFlowANTI.txt's target-terms generator writes `tier: ... : undefined`,
    // so a tier filter left over from a previous glossary matches zero rows
    // with no search involved. Saying "no terms match your filter" would send
    // a teacher hunting for a filter they set correctly.
    expect(emptyState).toContain('allTerms.every(function (item) { return !item || !item.tier; })');
  });
});

describe('G6 the sticky state that produced it is now reset at the source', () => {
  // Wave 2 (W5) took L1's recommended root fix. This guard is the same guard,
  // turned the other way up: it used to assert GLOSS_RESET had NO call site and
  // to point at the G6 notes when that changed. It now asserts the call site
  // exists and does the two things it has to do.
  it('GLOSS_RESET is dispatched when the active resource changes', () => {
    expect(anti).toContain("glossaryDispatch({ type: 'GLOSS_RESET' })");
    const effect = region(anti, 'const prevGlossaryResourceIdRef', 'const toFocusText');
    expect(effect).toContain('generatedContent?.id');
    // Keyed on the id through a ref, not on the object: generatedContent is
    // re-created on every edit to the SAME resource, and resetting there would
    // clear the teacher's filter mid-session.
    expect(effect).toContain('prevGlossaryResourceIdRef.current === currentId');
  });

  it('the search term is cleared alongside it', () => {
    const effect = region(anti, 'const prevGlossaryResourceIdRef', 'const toFocusText');
    expect(effect).toContain("setGlossarySearchTerm('')");
  });

  it('GLOSS_RESET preserves the teacher GENERATION settings', () => {
    // Resetting to GLOSS_INITIAL_STATE wholesale would wipe the tier counts,
    // definition level, image size/style and etymology settings on every
    // content change, which is a worse bug than the stale filter it fixes.
    const reducer = region(anti, 'function glossaryReducer', 'const CS_INITIAL_STATE');
    expect(reducer).not.toContain("if (action.type === 'GLOSS_RESET') return { ...GLOSS_INITIAL_STATE };");
    expect(reducer).toContain('glossaryFilter: GLOSS_INITIAL_STATE.glossaryFilter');
    ['glossaryTier2Count', 'glossaryTier3Count', 'glossaryDefinitionLevel', 'glossaryImageSize', 'glossaryImageStyle', 'includeEtymology', 'etymologyScope'].forEach(setting => {
      expect(reducer, setting + ' must not be reset on a content change').not.toContain(setting + ':');
    });
  });

  it('clears the index-keyed maps, whose indices point at the OLD term list', () => {
    const reducer = region(anti, 'function glossaryReducer', 'const CS_INITIAL_STATE');
    ['isGeneratingTermImage', 'glossaryRefinementInputs', 'isGeneratingEtymology'].forEach(mapField => {
      expect(reducer).toContain(mapField + ': {}');
    });
  });

  it('opening a flashcard in the glossary still writes a search term', () => {
    // This is the other way a query appears without the user typing one. Not a
    // defect on its own, but the empty state must survive it gracefully.
    expect(glossary).toContain('setGlossarySearchTerm(currentFlashcardItem.term)');
  });
});

describe('G7 the crossword prints through the existing mechanism', () => {
  const crossword = region(games, 'const CrosswordGame =', 'const SyntaxScramble =');

  it('uses window.print over the live modal, like Matching and Bingo', () => {
    expect(crossword).toContain('const printCrossword = ()');
    expect(crossword).toContain('window.print()');
    // No popup window: the word search's separate document.write printer stays
    // where it is and is not duplicated here.
    expect(crossword).not.toContain('window.open(');
    expect(crossword).not.toContain('document.write');
  });

  it('prints a header, the grid, the clue list and a separate answer key', () => {
    expect(crossword).toContain("hidden print:block w-full mb-6 text-center");
    expect(crossword).toContain("matching.print_name");
    expect(crossword).toContain('print:columns-2');
    expect(crossword).toContain('break-before-page');
    expect(crossword).toContain('glossary.print_answer_key');
  });

  it('reveals the answer key only for the duration of the print', () => {
    expect(crossword).toContain('const [showAnswerKey, setShowAnswerKey] = useState(false)');
    expect(crossword).toContain('setShowAnswerKey(true)');
    expect(crossword).toContain('finally { setShowAnswerKey(false); }');
  });

  it('keeps screen-only chrome off the sheet', () => {
    expect(crossword).toContain('<span className="no-print"><SpeakButton');
    expect(crossword).toContain('bg-slate-50 text-[11px] text-center text-slate-600 border-t no-print');
    expect(crossword).toContain('print:hidden');
  });

  it('squares print as black on white regardless of the screen theme', () => {
    expect(crossword).toContain('print:bg-white print:text-black print:ring-slate-500');
  });
});
