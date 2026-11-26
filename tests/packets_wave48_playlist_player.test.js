// @vitest-environment jsdom
// Wave 48 Playlist & Player UX Tests:
// 1. STEM Lab, Life Skills & Math Manipulatives recognition, badges, labels, summaries, build & verifyPacket in Playlists.
// 2. Collapsible Keyboard shortcuts section (data-tool-shortcuts) inside Aa tools panel in Practice & Check modes.
// 3. Calm "Halfway there" milestone banner (data-halfway-banner) in Practice mode (>=10 scored items yes, <10 no, Check mode never).
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');

const PL = require(resolve(ROOT, 'packet_playlist_builder.js'));
const SW = require(resolve(ROOT, 'packet_sort_write_adapters.js'));
const CH = require(resolve(ROOT, 'packet_choice_builder.js'));
const MZ = require(resolve(ROOT, 'packet_maze_builder.js'));
const MN = require(resolve(ROOT, 'packet_manipulative_builder.js'));
const SL = require(resolve(ROOT, 'packet_stem_lab_builder.js'));
const LS = require(resolve(ROOT, 'packet_life_skills_builder.js'));
const SEL = require(resolve(ROOT, 'packet_sel_builder.js'));
const SB = require(resolve(ROOT, 'packets_station_bilingual.js'));
const V = require(resolve(ROOT, 'packets_verify_core.js'));
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { core, loader } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });

require(resolve(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;

const ALL_BUILDERS = {
  choice: CH,
  sortWrite: SW,
  maze: MZ,
  manipulatives: MN,
  stemLab: SL,
  lifeSkills: LS,
  sel: SEL,
};

const opened = [];
afterEach(() => {
  while (opened.length) {
    try { opened.pop().close(); } catch (_) {}
  }
});

const wav = (tag) => {
  const b = Buffer.alloc(64);
  b.write('RIFF');
  b.write('WAVE', 8);
  b.write(String(tag).slice(0, 12), 44);
  return 'data:audio/wav;base64,' + b.toString('base64');
};

function openPacket(html, { learner = 'Sam' } = {}) {
  let fakeNow = 1000;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://packet.test/wave48.html',
    beforeParse(w) {
      Object.defineProperty(w.performance, 'now', { configurable: true, value: () => (fakeNow += 200) });
      w.Audio = class {
        constructor() { this.playbackRate = 1; this.paused = true; }
        play() { this.paused = false; return Promise.resolve(); }
        pause() { this.paused = true; }
      };
    },
  });
  opened.push(dom.window);
  const w = dom.window;
  const d = w.document;
  if (learner && d.getElementById('learner-name')) d.getElementById('learner-name').value = learner;
  const startBtn = [...d.querySelectorAll('#app button')].find((b) => b.textContent.trim() === 'Start');
  if (startBtn) startBtn.click();
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  return {
    w,
    d,
    seen,
    button: (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent.trim() === text),
    next: () => {
      const n = d.querySelector('[data-next]');
      if (n) { n.hidden = false; n.click(); }
    },
  };
}

describe('1. STEM Lab, Life Skills & Math Manipulatives in Packet Playlists', () => {
  const TARGET_ACTIVITIES = [
    { activity: 'stem_circuit', domain: 'STEM Lab', source: 'stemLab' },
    { activity: 'stem_data_explorer', domain: 'STEM Lab', source: 'stemLab' },
    { activity: 'stem_geometry_grid', domain: 'STEM Lab', source: 'stemLab' },
    { activity: 'life_money', domain: 'Life Skills', source: 'lifeSkills' },
    { activity: 'life_transit', domain: 'Life Skills', source: 'lifeSkills' },
    { activity: 'life_kitchen', domain: 'Life Skills', source: 'lifeSkills' },
    { activity: 'life_laundry', domain: 'Life Skills', source: 'lifeSkills' },
    { activity: 'life_signs', domain: 'Life Skills', source: 'lifeSkills' },
    { activity: 'manip_base_ten', domain: 'Math Manipulatives', source: 'manipulatives' },
    { activity: 'manip_fraction_bars', domain: 'Math Manipulatives', source: 'manipulatives' },
    { activity: 'manip_number_line', domain: 'Math Manipulatives', source: 'manipulatives' },
    { activity: 'manip_balance_scale', domain: 'Math Manipulatives', source: 'manipulatives' },
  ];

  it('recognizes all 12 STEM Lab, Life Skills, and Math Manipulatives activities with friendly labels, badges, summaries, and catalog entries', () => {
    for (const spec of TARGET_ACTIVITIES) {
      const info = PL.describeActivity(spec.activity);
      expect(info, spec.activity).toBeTruthy();
      expect(info.domain).toBe(spec.domain);
      expect(info.badge).toBe(spec.domain);
      expect(info.source).toBe(spec.source);
      expect(info.label.length).toBeGreaterThan(4);
      expect(info.summary.length).toBeGreaterThan(10);
      expect(info.defaultStarterId).toBeTruthy();

      const cat = PL.STAGE_CATALOG.find((s) => s.activity === spec.activity);
      expect(cat, `${spec.activity} in STAGE_CATALOG`).toBeTruthy();
      expect(cat.domain).toBe(spec.domain);
      expect(cat.summary.length).toBeGreaterThan(10);
    }
  });

  it('builds and verifies mixed playlists combining STEM Lab, Life Skills (kitchen & laundry), and Math Manipulatives cleanly', async () => {
    const made = PL.buildPlaylistPacket({
      loader: TH,
      builders: ALL_BUILDERS,
      title: 'STEM, Kitchen, Laundry & Algebra Arc',
      stages: [
        { activity: 'stem_circuit', maxItems: 1 },
        { activity: 'life_kitchen', maxItems: 1 },
        { activity: 'life_laundry', maxItems: 1 },
        { activity: 'manip_balance_scale', maxItems: 1 },
      ],
      stationBilingual: SB,
    });

    expect(made.sourcesUsed.sort()).toEqual(['lifeSkills', 'manipulatives', 'stemLab']);
    expect(made.stages.map((s) => s.domain)).toEqual(['STEM Lab', 'Life Skills', 'Life Skills', 'Math Manipulatives']);
    expect(made.stages.every((s) => s.label && s.summary && s.summary.length > 10)).toBe(true);

    const report = await V.verifyPacket(made.html);
    expect(report.ok).toBe(true);
    expect(report.result).toBe('closed');
    expect(report.counts.look).toBe(0);
    expect(report.counts.notExpected).toBe(0);

    const reopened = PL.readPlaylistPacket(made.html, V);
    expect(reopened.ok).toBe(true);
    expect(reopened.stages).toHaveLength(4);
    expect(reopened.stages.map((s) => s.activity)).toEqual(['stem_circuit', 'life_kitchen', 'life_laundry', 'manip_balance_scale']);
    expect(reopened.stages.map((s) => s.domain)).toEqual(['STEM Lab', 'Life Skills', 'Life Skills', 'Math Manipulatives']);
    expect(reopened.stages.every((s) => s.summary && s.summary.length > 10)).toBe(true);
  });

  it('renders subject badges, summaries, and Life Skills kitchen/laundry options in packets-playlist.html UI', () => {
    const html = read('packets-playlist.html');
    const dom = new JSDOM(html, { url: 'https://alloflow.local/packets-playlist.html', runScripts: 'outside-only' });
    opened.push(dom.window);
    const w = dom.window;
    const d = w.document;
    w.AlloWordSoundsTakeHome = TH;
    w.AlloPacketSortWriteAdapters = SW;
    w.AlloPacketChoice = CH;
    w.AlloPacketMaze = MZ;
    w.AlloPacketManipulatives = MN;
    w.AlloPacketStemLab = SL;
    w.AlloPacketLifeSkills = LS;
    w.AlloPacketSel = SEL;
    w.AlloPacketPlaylist = PL;
    w.AlloPacketStationBilingual = SB;
    w.AlloPacketVerify = V;
    w.URL.createObjectURL = () => 'blob:test';
    w.URL.revokeObjectURL = () => {};

    w.eval(read('packets-page.js'));
    w.eval(read('packets-playlist.js'));
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    d.getElementById('next-1').click();
    const sel = d.getElementById('f-add-stage');
    const optionValues = [...sel.querySelectorAll('option')].map((o) => o.value);
    expect(optionValues).toContain('st_life_kitchen');
    expect(optionValues).toContain('st_life_laundry');
    expect(optionValues).toContain('st_stem_circuit_series');
    expect(optionValues).toContain('st_manip_balance_g6');

    sel.value = 'st_life_kitchen';
    d.getElementById('btn-add-stage').click();
    const cards = [...d.querySelectorAll('#stage-list > li')];
    const kitchenCard = cards.find((li) => li.getAttribute('data-stage-activity') === 'life_kitchen');
    expect(kitchenCard).toBeTruthy();
    expect(kitchenCard.getAttribute('data-stage-domain')).toBe('Life Skills');
    expect(kitchenCard.querySelector('[data-stage-badge]').textContent).toContain('Life Skills');
    expect(kitchenCard.querySelector('[data-stage-summary]').textContent).toContain('stove');

    d.getElementById('next-2').click();
    const summaryText = d.getElementById('summary-rows').textContent;
    expect(summaryText).toContain('Subjects');
    expect(summaryText).toContain('Life Skills');
    expect(summaryText).toContain('STEM Lab');
  });
});

describe('2. Student Keyboard Shortcuts card inside Aa tools panel', () => {
  it('renders collapsible data-tool-shortcuts with plain-language shortcuts in Practice and Check modes and syncs ui_strings.js', () => {
    const row = { word: 'cat', targetWord: 'cat', _ttsAssets: { cat: wav('cat') }, activityItems: { spelling_bee: {} } };
    const made = loader.lessonFromPack([row], { core, banks: BANKS, activities: ['spelling_bee'], title: 'Shortcuts Practice', lessonId: 'L-sc-p' });
    const practiceHtml = loader.buildHtml(made.lesson, { core });

    const tp = openPacket(practiceHtml);
    tp.d.querySelector('[data-tools-open]').click();
    const sc = tp.d.querySelector('[data-tool-shortcuts]');
    expect(sc).toBeTruthy();
    expect(sc.tagName).toBe('DETAILS');
    expect(sc.open).toBe(false);
    expect(sc.textContent).toContain('Keyboard shortcuts');
    expect(sc.textContent).toContain('1\u20139');
    expect(sc.textContent).toContain('Replay audio');
    expect(sc.textContent).toContain('Check or continue');
    expect(sc.textContent).toContain('Undo or remove');
    expect(sc.textContent).toContain('Stop audio or close');
    expect(sc.textContent).toContain('Arrow keys');

    // Also present in Check (probe) mode
    const checksMod = {};
    new Function('window', read('packet_check_builder.js')).call(checksMod, checksMod);
    const C = checksMod.AlloPacketChecks;
    const { html: checkHtml } = C.buildCheckPacket({
      lesson: C.lessonFromMathProblems({ title: 'Shortcuts Check', problems: C.parseProblems('2+2,3+3'), timeLimitS: null }),
      loader,
    });
    const tc = openPacket(checkHtml);
    tc.d.querySelector('[data-tools-open]').click();
    const scCheck = tc.d.querySelector('[data-tool-shortcuts]');
    expect(scCheck).toBeTruthy();
    expect(scCheck.textContent).toContain('Keyboard shortcuts');
    expect(scCheck.textContent).toContain('Enter');

    // ui_strings.js sync check
    const ui = JSON.parse(read('ui_strings.js')).word_sounds;
    for (const k of [
      'halfway_banner',
      'tools_shortcuts',
      'tools_shortcuts_keys_num',
      'tools_shortcuts_keys_r',
      'tools_shortcuts_keys_enter',
      'tools_shortcuts_keys_back',
      'tools_shortcuts_keys_esc',
      'tools_shortcuts_keys_arrows_key',
      'tools_shortcuts_keys_arrows',
    ]) {
      expect(typeof ui['take_home_player_' + k], k).toBe('string');
    }
  });
});

describe('3. Calm "Halfway there" milestone banner', () => {
  const WORDS_10 = ['cat', 'dog', 'sun', 'hat', 'pig', 'bug', 'cup', 'red', 'box', 'fan'];

  const makeSpellingPacket = (words) => {
    const rows = words.map((w) => ({
      word: w,
      targetWord: w,
      _ttsAssets: { [w]: wav(w) },
      activityItems: { spelling_bee: {} },
    }));
    const made = loader.lessonFromPack(rows, { core, banks: BANKS, activities: ['spelling_bee'], title: 'Halfway Test', lessonId: 'L-hw-' + words.length });
    return loader.buildHtml(made.lesson, { core });
  };

  const answerSpelling = (t, word) => {
    const inp = t.d.querySelector('#app input');
    inp.value = word;
    inp.dispatchEvent(new t.w.Event('input', { bubbles: true }));
    t.button('Check spelling').click();
  };

  it('shows data-halfway-banner once on item 5 of 10 in Practice mode and clears on item 6', () => {
    const t = openPacket(makeSpellingPacket(WORDS_10));

    for (let i = 0; i < 4; i++) {
      answerSpelling(t, WORDS_10[i]);
      const b = t.d.querySelector('[data-halfway-banner]');
      expect(b.hidden).toBe(true);
      t.next();
    }

    // Complete item 5 (index 4) -> halfway!
    answerSpelling(t, WORDS_10[4]);
    const banner = t.d.querySelector('[data-halfway-banner]');
    expect(banner).toBeTruthy();
    expect(banner.hidden).toBe(false);
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.textContent).toBe('Halfway there! You finished 5 of 10.');

    // Move to item 6 -> clears automatically and never returns
    t.next();
    expect(t.d.querySelector('[data-halfway-banner]').hidden).toBe(true);
    answerSpelling(t, WORDS_10[5]);
    expect(t.d.querySelector('[data-halfway-banner]').hidden).toBe(true);
  });

  it('never shows data-halfway-banner when packet has fewer than 10 scored items', () => {
    const words6 = WORDS_10.slice(0, 6);
    const t = openPacket(makeSpellingPacket(words6));
    for (let i = 0; i < 6; i++) {
      answerSpelling(t, words6[i]);
      expect(t.d.querySelector('[data-halfway-banner]').hidden).toBe(true);
      t.next();
    }
  });

  it('never shows data-halfway-banner in Check (probe) mode even with 10 scored items', () => {
    const checksMod = {};
    new Function('window', read('packet_check_builder.js')).call(checksMod, checksMod);
    const C = checksMod.AlloPacketChecks;
    const problems = C.parseProblems('1+1,2+2,3+3,4+4,5+5,1+2,2+3,3+4,4+5,1+3');
    const { html } = C.buildCheckPacket({
      lesson: C.lessonFromMathProblems({ title: 'Ten Item Check', problems, timeLimitS: null }),
      loader,
    });
    const t = openPacket(html);
    for (let step = 0; step < 18 && !t.d.querySelector('#app').textContent.includes('You finished'); step++) {
      const b = t.d.querySelector('[data-halfway-banner]');
      if (b) expect(b.hidden).toBe(true);
      const pad2 = t.d.querySelector('[data-key="2"]');
      const padNext = t.d.querySelector('[data-key="next"]');
      if (pad2 && padNext && t.seen(pad2)) {
        pad2.click();
        padNext.click();
      } else {
        const go = t.button('Start') || t.button('Next');
        if (go) go.click();
      }
    }
    expect(t.d.querySelector('#app').textContent).toContain('You finished');
  });
});
