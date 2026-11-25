// The glossary's stress add-on (lane stress, 2026-11-23): syllable_stress_en.js marks the main-stress
// syllable (a·NAL·y·sis) for words syllable_table_en.js divides, so the glossary no longer needs
// word_sounds_pronunciations.js (126k words, ~380 KB compressed) just to bold one syllable.
//  - the generator is deterministic and its rules leave out heteronyms and count mismatches,
//  - the real file gives the right syllable for real words and switches itself off beside a different table,
//  - it is approved for delivery, content-pinned in ANTI, mirrored, and carries the CMUdict licence,
//  - the glossary loads it lazily, bolds from it, and never fetches the pronunciation data.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const REPO = process.cwd().replace(/\\/g, '/');
const require = createRequire(import.meta.url);
const generator = require(REPO + '/dev-tools/build_syllable_stress_en.cjs');
const { glossaryMediaProps } = require(REPO + '/tests/helpers/glossary_media_fixture.cjs');
const FILE = 'syllable_stress_en.js';
const COPIES = [FILE, 'desktop/web-app/public/' + FILE, 'desktop/app-build/' + FILE, 'desktop/web-app/build/' + FILE];
const stressSource = readFileSync(REPO + '/' + FILE, 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Fresh copies in a throwaway scope, so each check sees the real files and not the window globals.
function loadFresh() {
  const scope = {};
  new Function('window', 'module', readFileSync(REPO + '/syllable_table_en.js', 'utf8'))(scope, undefined);
  new Function('window', 'module', stressSource)(scope, undefined);
  return { table: scope.AlloModules.SyllableTableEn, stress: scope.AlloModules.SyllableStressEn };
}
const marked = (table, stress, word) => {
  const found = table.lookup(word), at = stress.stressIndex(word);
  return found.parts.map((part, i) => (i === at ? part.toUpperCase() : part)).join('·');
};

describe('generator', () => {
  it('same input, same bytes, and every shipped copy is exactly what it builds', () => {
    const first = generator.buildArtifacts().moduleSource, second = generator.buildArtifacts().moduleSource;
    expect(second === first, 'deterministic').toBe(true);
    for (const copy of COPIES) expect(existsSync(REPO + '/' + copy) && readFileSync(REPO + '/' + copy, 'utf8') === first, copy).toBe(true);
  }, 60000);

  it('heteronyms (stress moves with meaning) and count mismatches are left out', () => {
    expect(generator.stressFor(['rec', 'ord'], ['01', '10'])).toEqual({ index: -1, reason: 'stress-moves' });
    expect(generator.stressFor(['ac', 'quire'], ['010']), 'CMUdict says 3 syllables, the table splits 2').toEqual({ index: -1, reason: 'count-mismatch' });
    expect(generator.stressFor(['his', 'to', 'ry'], ['100', '10']), 'a shorter variant with the same main stress is fine').toEqual({ index: 0, reason: 'covered' });
    expect(generator.stressFor(['ac', 'tu', 'ate'], ['121'])).toEqual({ index: -1, reason: 'not-one-primary' });
    expect(generator.stressFor(['a', 'bi', 'ot', 'ic'], undefined).index).toBe(-1);
  });
});

describe('the real syllable_stress_en.js', () => {
  const { table, stress } = loadFresh();

  it('marks the stressed syllable of real words', () => {
    expect(stress.usable(table)).toBe(true);
    expect(marked(table, stress, 'analyze')).toBe('AN·a·lyze');
    expect(marked(table, stress, 'analysis')).toBe('a·NAL·y·sis');
    expect(marked(table, stress, 'photosynthesis')).toBe('pho·to·SYN·the·sis');
    expect(marked(table, stress, 'photograph')).toBe('PHO·to·graph');
    expect(marked(table, stress, 'photography')).toBe('pho·TOG·ra·phy');
    expect(marked(table, stress, 'democracy')).toBe('de·MOC·ra·cy');
    expect(stress.stressIndex('Analysis'), 'case does not matter').toBe(1);
  });

  it('heteronyms and count mismatches the table does divide get no stress', () => {
    for (const word of ['record', 'present', 'object', 'address', 'abstract', 'acquire', 'alienation']) {
      const found = table.lookup(word);
      expect(found && !found.check && found.parts.length >= 2, word + ' is a sure split, so the -1 comes from the rule').toBe(true);
      expect(stress.stressIndex(word), word).toBe(-1);
    }
  });

  it('one-syllable words, phrases, unknown words and non-strings: -1', () => {
    for (const word of ['cat', 'food chain', 'zzqxv', '', 'x', null, 42]) expect(stress.stressIndex(word)).toBe(-1);
  });

  it('a table that is not the one it was built against switches stress off', () => {
    const counts = { ...table.source.counts, sure: table.source.counts.sure + 1 };
    const otherCounts = { source: { counts }, lookup: table.lookup };
    expect(stress.usable(otherCounts)).toBe(false);
    expect(stress.stressIndex('analysis', otherCounts), 'counts differ').toBe(-1);
    const resplit = { source: table.source, lookup: (w) => { const f = table.lookup(w); return f && f.parts.length > 2 ? { parts: [f.parts[0] + f.parts[1]].concat(f.parts.slice(2)), check: f.check } : f; } };
    expect(stress.usable(resplit)).toBe(false);
    expect(stress.stressIndex('analysis', resplit), 'same counts, different splits (probe words)').toBe(-1);
    expect(stress.stressIndex('analysis', table), 'the real table again').toBe(1);
    const lone = {};
    new Function('window', 'module', stressSource)(lone, undefined);
    expect(lone.AlloModules.SyllableStressEn.stressIndex('analysis'), 'without the table').toBe(-1);
  });

  it('is small, covers most sure words, and records the table it was built against', () => {
    expect(gzipSync(stressSource, { level: 9 }).length).toBeLessThan(30 * 1024);
    expect(stress.source.covered).toBeGreaterThan(45000);
    expect(stress.source.table.sha256).toBe(createHash('sha256').update(readFileSync(REPO + '/syllable_table_en.js')).digest('hex').slice(0, 8));
  });

  it('carries the CMUdict licence notice exactly as the syllable table does', () => {
    const notice = (text) => /\/\*!\n([\s\S]*?)\n\*\//.exec(text)[1];
    const license = readFileSync(REPO + '/data/vendor/cmudict/LICENSE', 'utf8').replace(/\r\n/g, '\n').trim();
    expect(notice(stressSource)).toBe(license);
    expect(notice(stressSource)).toBe(notice(readFileSync(REPO + '/syllable_table_en.js', 'utf8')));
  });
});

describe('delivery', () => {
  it('is on the approved delivery list right after the syllable table', () => {
    const build = readFileSync(REPO + '/build.js', 'utf8');
    expect(/'syllable_table_en\.js',\n(?:\s*\/\/[^\n]*\n)*\s*'syllable_stress_en\.js',/.test(build)).toBe(true);
    const assets = JSON.stringify(require(REPO + '/dev-tools/build_browser_delivery_manifest.cjs').discoverAssets());
    expect(assets.includes(FILE)).toBe(true);
  });

  it('ANTI pins it to its sha256-8 in the one pluginContentPins table (as build.js computes pins)', () => {
    const anti = readFileSync(REPO + '/AlloFlowANTI.txt', 'utf8');
    expect(anti.match(/var pluginContentPins = \{/g)).toHaveLength(1);
    const pin = createHash('sha256').update(readFileSync(REPO + '/' + FILE)).digest('hex').slice(0, 8);
    expect(/var pluginContentPins = \{[^}]*'syllable_stress_en\.js': '([0-9a-f]{8})'/.exec(anti)[1]).toBe(pin);
  });
});

describe('glossary details line with the add-on', () => {
  beforeAll(() => {
    window.React = React;
    new Function(readFileSync(REPO + '/syllable_table_en.js', 'utf8'))();
    new Function(readFileSync(REPO + '/games_module.js', 'utf8'))();
    new Function(readFileSync(REPO + '/export_module.js', 'utf8'))();
    new Function(readFileSync((process.env.LANE_DIR || REPO) + '/view_glossary_module.js', 'utf8'))();
  }, 60000);

  const cleanups = [];
  afterEach(() => {
    cleanups.splice(0).reverse().forEach((fn) => fn());
    delete window.AlloModules.SyllableStressEn;
    delete window.AlloModules.WordSoundsPronunciations;
    delete window.__alloLoadPlugin;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  function mount(data) {
    const container = document.createElement('div');
    document.body.append(container);
    const root = ReactDOMClient.createRoot(container);
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const props = glossaryMediaProps({ generatedContent: { id: 'g', type: 'glossary', language: 'English', data }, filteredGlossaryData: data.map((item, i) => ({ ...item, _originalIdx: i })), displayLanguages: [], selectedLanguages: [] });
    act(() => root.render(React.createElement(window.AlloModules.GlossaryView, props)));
    cleanups.push(() => { act(() => root.unmount()); container.remove(); quiet.mockRestore(); });
    return container;
  }
  const entry = (id, term) => ({ entryId: id, term, def: 'A meaning.', tier: 'Academic' });
  const line = (container, id) => container.querySelector('tr[data-glossary-entry-key="entry:' + id + '"] [data-glossary-details]');
  const bold = (container, id) => [...(line(container, id) || document.createElement('p')).querySelectorAll('[data-glossary-syllables] span.font-bold')].map((s) => s.textContent);
  const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  const installAddon = () => new Function(stressSource)();

  it('loads the add-on after first paint and bolds the stressed syllable, with no pronunciation download', async () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('no network')));
    vi.stubGlobal('fetch', fetchSpy);
    const load = vi.fn((file) => { if (file === FILE) installAddon(); return Promise.resolve(true); });
    window.__alloLoadPlugin = load;
    const container = mount([entry('a', 'Analysis'), entry('p', 'photosynthesis'), entry('r', 'record'), entry('f', 'food chain')]);
    expect(load, 'nothing loads during render').not.toHaveBeenCalled();
    expect(bold(container, 'a'), 'first paint: syllables only').toEqual([]);
    await settle();
    expect(load.mock.calls.map((c) => c[0])).toEqual([FILE]);
    expect(line(container, 'a').textContent.trim()).toBe('A·nal·y·sis');
    expect(bold(container, 'a')).toEqual(['nal']);
    expect(bold(container, 'p')).toEqual(['syn']);
    expect(line(container, 'r').textContent.trim(), 'heteronym: syllables, no stress').toBe('rec·ord');
    expect(bold(container, 'r')).toEqual([]);
    expect(line(container, 'f'), 'multi-word term: no syllables').toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.querySelector('script[src*="word_sounds_pronunciations"]')).toBeNull();
    expect(window.AlloModules.WordSoundsPronunciations).toBeUndefined();
  });

  it('refused by the delivery list (the state until the next release build): syllables, quietly no stress', async () => {
    const load = vi.fn(() => Promise.resolve(false));
    window.__alloLoadPlugin = load;
    const container = mount([entry('a', 'analysis')]);
    await settle();
    expect(load.mock.calls.map((c) => c[0])).toEqual([FILE]);
    expect(line(container, 'a').textContent.trim()).toBe('a·nal·y·sis');
    expect(bold(container, 'a')).toEqual([]);
  });

  it('with Word Sounds\' pronunciation data too: shown when both agree, nothing when they disagree', async () => {
    installAddon();
    window.AlloModules.WordSoundsPronunciations = { lookup: (w) => ({ analysis: ['0100'], democracy: ['1000'] })[String(w).toLowerCase()] || [] };
    const container = mount([entry('a', 'analysis'), entry('d', 'democracy'), entry('p', 'photograph')]);
    expect(bold(container, 'a'), 'agree').toEqual(['nal']);
    expect(bold(container, 'd'), 'disagree: no stress').toEqual([]);
    expect(bold(container, 'p'), 'no pronunciation answer: the add-on alone').toEqual(['pho']);
  });

  it('beside a different syllable table the add-on stays out and the old pronunciation rule still works', async () => {
    installAddon();
    const real = window.AlloModules.SyllableTableEn;
    window.AlloModules.SyllableTableEn = { source: { counts: { ...real.source.counts, sure: 1 } }, lookup: real.lookup };
    cleanups.push(() => { window.AlloModules.SyllableTableEn = real; });
    const without = mount([entry('a', 'analysis')]);
    expect(bold(without, 'a'), 'mismatched table: no stress at all').toEqual([]);
    window.AlloModules.WordSoundsPronunciations = { lookup: (w) => (String(w).toLowerCase() === 'analysis' ? ['0100'] : []) };
    const withPron = mount([entry('b', 'analysis')]);
    expect(bold(withPron, 'b'), 'lane B behaviour: the full data alone').toEqual(['nal']);
  });
});
