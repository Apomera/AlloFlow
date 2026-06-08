// Golden master for games_module.js — the 21 game components registered on
// window.AlloModules by _build_games_module.js. Before this file there was
// ZERO runtime coverage for the games bundle (node --check is static-only),
// so a first-render ReferenceError / undefined-deref in any game shipped
// undetected.
//
// SCOPE (v1): render-smoke + registration lock.
//   • Registration: all 21 expected game names register, count is pinned,
//     no copy-paste name collisions.
//   • Per game: under a minimal-but-valid props shape the FIRST synchronous
//     SSR render does NOT throw. Games whose initial render shows real chrome
//     (ssr:true) must produce non-trivial markup containing stable assertable
//     substrings; games that intentionally `return null` until a useEffect
//     populates state (ssr:false) must render EMPTY rather than throw — a
//     guard against a future un-guarded data deref on the pre-effect state.
//
// HONEST LIMITS: renderToStaticMarkup runs only the first synchronous render
// — useEffect/refs/timers/interaction do not fire, so this is a crash gate +
// initial-shell characterization, NOT full-gameplay or pixel snapshots. The
// per-game prop shapes are the minimum to expose the initial render; they are
// NOT representative of real student data. Most labels go through the games
// LanguageContext whose built-module default is `{ t: k => k }` (no host
// AlloLanguageContext in the harness), so assertable substrings are the raw
// i18n KEYS (e.g. 'memory.title'), except the sort-family games that render
// hardcoded English titles. Prop shapes were mapped + adversarially verified
// against games_source.jsx by a read-only agent pass (2026-06-08).

import { describe, it, expect, beforeAll } from 'vitest';
import { loadGames, getGame, renderGame } from './helpers/games_harness.js';

// The exact set registered by _build_games_module.js (see the module's
// window.AlloModules.* block + "[GamesBundle] 21 game components registered").
const EXPECTED_GAMES = [
  'MemoryGame', 'MatchingGame', 'TimelineGame', 'ConceptSortGame', 'VennGame',
  'CauseEffectSortGame', 'PipelineBuilderGame', 'CrosswordGame', 'SyntaxScramble',
  'BingoGame', 'StudentBingoGame', 'WordScrambleGame', 'TChartSortGame',
  'ConceptMapSortGame', 'OutlineSortGame', 'FishboneSortGame',
  'ProblemSolutionSortGame', 'MultiZoneSortGame', 'FrayerSortGame',
  'SeeThinkWonderSortGame', 'StoryMapSortGame',
];

// Per-game minimal render recipe. `ssr:true` => initial render shows chrome and
// must contain every `assert` substring; `ssr:false` => component returns null
// until an effect runs, so the first render must be empty (no throw).
const GAMES = [
  { name: 'MemoryGame', ssr: true, assert: ['memory.title', 'memory.moves', 'memory.score'],
    props: { data: [{ term: 'Photosynthesis', def: 'How plants make food from light' }, { term: 'Mitosis', def: 'Cell division producing two identical cells' }, { term: 'Osmosis', def: 'Water moving across a membrane' }], onClose: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'MatchingGame', ssr: true, assert: ['matching.title', 'matching.instructions', 'matching.check_answers'],
    props: { data: [{ term: 'Noun', def: 'A person, place, or thing' }, { term: 'Verb', def: 'An action word' }, { term: 'Adjective', def: 'Describes a noun' }], onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'TimelineGame', ssr: true, assert: ['timeline.game.header', '0 pts', 'timeline.game.arrange_instruction'],
    props: { data: { progressionLabel: 'Chronological', items: [{ event: 'Egg laid', date: '1900' }, { event: 'Chick hatches', date: '1901' }, { event: 'Adult bird', date: '1902' }] }, onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {}, onExplainIncorrect: () => {}, initialImageSize: 96 } },

  { name: 'VennGame', ssr: true, assert: ['common.venn_sort_title', 'common.score', 'concept_map.venn.bank_empty'],
    props: { data: { setA: ['mammal', 'fur'], setB: ['fish', 'gills'], shared: ['has a backbone'] }, onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {}, titles: { setA: { text: 'Mammals' }, setB: { text: 'Fish' } }, primaryLanguage: 'English' } },

  { name: 'ConceptSortGame', ssr: true, assert: ['concept_sort.title', 'pts', 'concept_sort.unsorted_cards'],
    props: { data: { categories: [{ id: 'cat-a', label: 'Mammals', color: 'blue' }, { id: 'cat-b', label: 'Birds', color: 'green' }], items: [{ id: 'i1', content: 'Dog', categoryId: 'cat-a' }, { id: 'i2', content: 'Eagle', categoryId: 'cat-b' }, { id: 'i3', content: 'Cat', categoryId: 'cat-a' }] }, onClose: () => {}, playSound: () => {}, onGenerateItem: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {}, onExplainIncorrect: () => {}, imageScale: 1.5, onImageScaleChange: () => {} } },

  { name: 'CauseEffectSortGame', ssr: true, assert: ['games.ce_sort.title', 'games.ce_sort.causes_label', 'games.ce_sort.effects_label'],
    props: { data: { causes: ['Heavy rain', 'Dropped the glass'], effects: ['Flooding', 'It shattered'] }, onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {}, topicTitle: 'Weather' } },

  { name: 'TChartSortGame', ssr: true, assert: ['games.tchart_sort.title', 'Renewable', 'Nonrenewable'],
    props: { data: { leftTitle: 'Renewable', rightTitle: 'Nonrenewable', leftItems: ['Solar', 'Wind'], rightItems: ['Coal', 'Oil'] }, onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {}, topicTitle: 'Energy Sources' } },

  { name: 'ConceptMapSortGame', ssr: true, assert: ['Concept Map Sort'],
    props: { data: { branches: [{ title: 'Animals', items: ['Dog', 'Cat'] }, { title: 'Plants', items: ['Rose', 'Fern'] }] }, topicTitle: 'Taxonomy', onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'ProblemSolutionSortGame', ssr: true, assert: ['Prioritize the Solutions', 'Try First', 'Last Resort'],
    props: { data: { branches: [{ title: 'Solutions', items: ['Ask a friend', 'Read the manual', 'Call support'] }] }, topicTitle: 'Troubleshooting', onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'FishboneSortGame', ssr: true, assert: ['Fishbone Sort', 'People', 'Process'],
    props: { data: { branches: [{ title: 'People', items: ['Training', 'Staffing'] }, { title: 'Process', items: ['Workflow', 'Approval'] }] }, topicTitle: 'Defects', onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'OutlineSortGame', ssr: true, assert: ['Outline Sort', 'Introduction', 'Body'],
    props: { data: { branches: [{ title: 'Introduction', items: ['Hook', 'Thesis'] }, { title: 'Body', items: ['Point A', 'Point B'] }] }, topicTitle: 'Essay', onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'MultiZoneSortGame', ssr: true, assert: ['Demo Zone Sort', 'Zone One', 'Bank'],
    props: { data: { zones: { z1: ['Alpha', 'Beta'], z2: ['Gamma'] } }, zoneConfig: [{ id: 'z1', label: 'Zone One', color: 'indigo' }, { id: 'z2', label: 'Zone Two', color: 'emerald' }], gameKey: 'demoZone', gameLabel: 'Demo Zone Sort', layoutMode: 'columns', captionText: 'Sort the items.', topicTitle: 'Demo', onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'FrayerSortGame', ssr: true, assert: ['Frayer Model Sort', 'Definition', 'Non-Examples'],
    props: { data: { main: 'Mammal', branches: [{ title: 'Definition', items: ['Warm-blooded vertebrate'] }, { title: 'Characteristics', items: ['Has fur', 'Produces milk'] }, { title: 'Examples', items: ['Dog', 'Whale'] }, { title: 'Non-Examples', items: ['Snake', 'Frog'] }] }, topicTitle: 'Mammal', onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'SeeThinkWonderSortGame', ssr: true, assert: ['See-Think-Wonder Sort', 'Wonder'],
    props: { data: { main: 'Painting', branches: [{ title: 'See', items: ['A red barn', 'Two figures'] }, { title: 'Think', items: ['It is autumn'] }, { title: 'Wonder', items: ['Who lives here?'] }] }, topicTitle: 'Painting', onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'StoryMapSortGame', ssr: true, assert: ['Story Map Sort', 'Exposition', 'Resolution'],
    props: { data: { main: 'Cinderella', branches: [{ title: 'Exposition', items: ['Cinderella lives with stepfamily'] }, { title: 'Rising Action', items: ['Invitation to the ball'] }, { title: 'Climax', items: ['Clock strikes midnight'] }, { title: 'Falling Action', items: ['Prince searches with the slipper'] }, { title: 'Resolution', items: ['They marry'] }] }, topicTitle: 'Cinderella', onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'PipelineBuilderGame', ssr: false, assert: [],
    props: { data: { steps: [{ title: 'Collect data', items: ['raw rows'], connectsTo: null }, { title: 'Clean data', items: [], connectsTo: null }, { title: 'Analyze', items: [], connectsTo: null }] }, topicTitle: 'Data Pipeline', onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'CrosswordGame', ssr: true, assert: ['clues'],
    props: { data: [{ term: 'photon', def: 'A quantum of light' }, { term: 'energy', def: 'Capacity to do work' }, { term: 'atom', def: 'Smallest unit of an element' }], onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'SyntaxScramble', ssr: false, assert: [],
    props: { text: 'The cat sat on the warm mat. Dogs love to run fast outside.', onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {} } },

  { name: 'WordScrambleGame', ssr: true, assert: ['games.scramble.title', 'games.scramble.loading'],
    props: { data: [{ term: 'photon', def: 'A quantum of light' }, { term: 'energy', def: 'Capacity to do work' }, { term: 'atom', def: 'Smallest unit of an element' }], onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {} } },

  { name: 'BingoGame', ssr: true, assert: ['bingo.generator_title', 'bingo.card_count', 'bingo.initializing_board'],
    props: { data: [{ term: 'Cat', def: 'A small pet animal' }, { term: 'Dog', def: 'A loyal pet animal' }, { term: 'Sun', def: 'The star at the center of our solar system' }], onClose: () => {}, settings: { cardCount: 20, includeImages: true }, setSettings: () => {}, onGenerate: () => {}, bingoState: { cards: [] }, setBingoState: () => {}, onGenerateAudio: () => {}, selectedVoice: '', alloBotRef: { current: null } } },

  { name: 'StudentBingoGame', ssr: true, assert: ['bingo.student_title', 'bingo.click_hint'],
    props: { data: [{ term: 'Cat', image: null }, { term: 'Dog', image: null }, { term: 'Sun', image: null }], onClose: () => {}, playSound: () => {}, onGameComplete: () => {} } },
];

beforeAll(() => {
  loadGames();
});

describe('games_module.js — registration lock', () => {
  it('loads the bundle and sets the GamesBundle flag', () => {
    expect(window.AlloModules.GamesBundle).toBe(true);
  });

  it('registers all 21 expected game components', () => {
    for (const name of EXPECTED_GAMES) {
      // React.memo(...) components are objects ($$typeof react.memo), plain
      // function components are functions — both are valid renderable types.
      const C = getGame(name); // throws with a clear message if not registered
      expect(['function', 'object'].includes(typeof C), name + ' should be a renderable component type').toBe(true);
      expect(C, name + ' should be truthy').toBeTruthy();
    }
  });

  it('pins the registered game count at 21 (no silent add/drop)', () => {
    const registered = Object.keys(window.AlloModules).filter((k) => EXPECTED_GAMES.includes(k));
    expect(registered.length).toBe(21);
  });

  it('has no duplicate names in the expected catalog', () => {
    expect(new Set(EXPECTED_GAMES).size).toBe(EXPECTED_GAMES.length);
  });
});

describe('games_module.js — render-smoke (21 games, first synchronous SSR render)', () => {
  for (const g of GAMES) {
    const title = g.name + ' — ' + (g.ssr
      ? 'renders initial chrome without throwing'
      : 'cleanly renders empty (returns null pre-effect) without throwing');
    it(title, () => {
      let html;
      expect(() => { html = renderGame(g.name, g.props); }, g.name + ' first render threw').not.toThrow();

      if (g.ssr) {
        expect(html.length, g.name + ' rendered empty/near-empty HTML').toBeGreaterThan(50);
        for (const sub of g.assert) {
          expect(html.includes(sub), g.name + ' SSR output missing expected substring ' + JSON.stringify(sub)).toBe(true);
        }
      } else {
        // Pre-effect early-return null: pin "empty, not crashing" so a future
        // change that derefs data before the null-guard is caught.
        expect(html, g.name + ' expected empty pre-effect render').toBe('');
      }
    });
  }

  it('every registered game has a render-smoke entry (catalog ⊇ registry)', () => {
    const covered = new Set(GAMES.map((g) => g.name));
    for (const name of EXPECTED_GAMES) {
      expect(covered.has(name), name + ' is registered but has no render-smoke entry').toBe(true);
    }
    expect(GAMES.length).toBe(EXPECTED_GAMES.length);
  });
});
