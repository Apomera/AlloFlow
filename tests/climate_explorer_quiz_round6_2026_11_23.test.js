// Climate Explorer, sports-labs pass round 6 (2026-11-23).
// 1. Quiz: every joke distractor is now a plausible misconception, and every wrong option has its own one-line
//    "why not" (QUIZ_MISS, keyed by question start + option TEXT because the load-time rotation moves options).
//    Facts re-checked: NOAA (400 ppm, daily, May 2013), EEA tree estimate, GE Haliade-X homes, Ember wind share,
//    Armstrong McKay 2022 thresholds, OWID per-person totals, CISL pledge share, MIT Technology Review AI energy.
// 2. Habit tracker: the 11 habits with no reliable number sit behind one disclosure, sliders and pledges kept.
// Fail-first: CLIMATE_TOOL_FILE=C:/tmp/sports_labs_1123/climateExplorer/start_r5.js runs these on the round-5 copy.
import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.CLIMATE_TOOL_FILE || 'stem_lab/stem_tool_climateExplorer.js';
const SRC = fs.readFileSync(TOOL, 'utf8');
const render = (state = {}) => renderTool('climateExplorer', { climateExplorer: state }, {});
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// The shipped bank after its load-time rotation, with the why / why-not tables applied (no re-implementation).
function bank() {
  const i = SRC.indexOf('      var QUIZ = [');
  const rot = SRC.indexOf('})();', i) + 5;
  const w = SRC.indexOf('      var QUIZ_WHY = [');
  const tail = SRC.slice(w, SRC.indexOf('// ═══ CANVAS: Donut Chart', w));
  const pre = 'var CARBON_BUDGETS=[{gtRemaining:170},{gtRemaining:525},{gtRemaining:1055}];var GLOBAL_EMISSIONS_RATE=42;';
  return new Function('t', pre + SRC.slice(i, rot) + ';' + tail + '; return QUIZ;')((k, fb) => fb || k);
}
const ALL_OPEN = { transport: true, food: true, energy: true, digital: true, shopping: true, waste: true };
const UNCOUNTED = ['stream_4k', 'gaming', 'videocall', 'pc_work', 'ai_video', 'ai_voice', 'ai_code', 'tshirt', 'online_order', 'fastfashion', 'bottled_water'];

function newStore(initial) {
  const store = { toolData: initial };
  store.set = (u) => { store.toolData = typeof u === 'function' ? u(store.toolData) : u; };
  return store;
}
function findById(node, id) {
  let found = null;
  (function walk(n) {
    if (found || n == null || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.props && n.props.id === id) { found = n; return; }
    if (n.props) walk(n.props.children);
  })(node);
  return found;
}
function click(store, id) {
  const tool = window.StemLab._registry.climateExplorer;
  const tree = tool.render({ React: window.React, toolData: store.toolData, setToolData: store.set, setStemLabTool() {},
    t: (k, fb) => (fb == null ? k : fb), icons: new Proxy({}, { get: () => () => null }), awardXP() {}, addToast() {}, announceToSR() {}, gradeLevel: '6th Grade' });
  const btn = findById(tree, id);
  if (!btn) throw new Error('no element #' + id);
  btn.props.onClick({ preventDefault() {} });
}

beforeEach(() => { resetStemLab(); loadTool(TOOL, 'climateExplorer'); });

describe('quiz distractors are plausible misconceptions', () => {
  it('drops every joke or throwaway option', () => {
    for (const gone of ['Pure oxygen gas', 'Birds fly upside down', 'Trees grow sideways', "The Moon\\'s orbit", 'It kills all plants',
      'It changes the magnetic compass', 'A type of solar panel', "'Skyscrapers'", 'Wing molting', 'Hibernation depth in winter dens',
      "'Produces oxygen'", "'Voice TTS'", 'A weather disaster loan']) {
      expect(SRC, gone).not.toContain(gone);
    }
  });

  it('gives every question a why and every wrong option its own why-not', () => {
    const b = bank();
    expect(b.length).toBe(40);
    for (const q of b) {
      expect(q.why, q.q).toBeTruthy();
      q.opts.forEach((o, k) => {
        if (k === q.a) return;
        expect(q.miss && q.miss[o], q.q + ' :: ' + o).toBeTruthy();
        expect(q.miss[o].length, o).toBeLessThan(200);
      });
      expect(Object.keys(q.miss).length, q.q).toBe(q.opts.length - 1);
    }
  });

  it('has no length or position cue', () => {
    const b = bank();
    let longest = 0;
    const placed = [0, 0, 0, 0];
    for (const q of b) {
      const L = q.opts.map((o) => o.length);
      if (L[q.a] === Math.max(...L) && L.filter((x) => x === L[q.a]).length === 1) longest++;
      placed[q.a]++;
    }
    expect(longest / b.length).toBeLessThanOrEqual(0.3);
    expect(Math.max(...placed) / b.length).toBeLessThan(0.35);
  });
});

describe('quiz facts follow their sources', () => {
  const why = (start) => bank().find((q) => q.q.indexOf(start) === 0).why;
  it('attributes the numbers that depend on one estimate', () => {
    expect(why('In what year was a daily')).toContain('May 9, 2013');
    expect(why('A European agency estimated')).toContain('European Environment Agency');
    expect(why('A European agency estimated')).toContain('as much as 10 pounds');
    expect(why('One large 12-megawatt')).toContain('GE, the maker of the 12-megawatt Haliade-X');
    expect(why('Which country generates the highest share')).toContain('about 58% in 2024');
    expect(why('Counting fossil-fuel CO₂ since records began')).toContain('1,250 ÷ 11 is about 114');
    expect(why('At COP28 (2023)')).toContain('less than 0.2%');
    expect(why('In MIT Technology Review')).toContain('3.4 million joules');
    expect(why('In Project Drawdown\'s 2020 review')).toContain('about 148 Gt');
    for (const gone of ['the figure the Arbor Day Foundation uses', '1,545', '$400B/yr', 'its maker reports']) expect(SRC, gone).not.toContain(gone);
  });

  it('keeps each answer consistent with its own arithmetic', () => {
    expect(Math.round(1250 / 11)).toBe(114);
    expect(Math.round(170 / 42)).toBe(4);
    expect(Math.round(1055 / 42)).toBe(25);
    expect(700e6 / 400e9).toBeLessThan(0.002);
    const b = bank();
    const per = b.find((q) => q.q.indexOf('Counting fossil-fuel') === 0);
    expect(per.opts[per.a]).toBe('~110×');
    const tip = b.find((q) => q.q.indexOf('Which climate "tipping point"') === 0);
    expect(tip.opts[tip.a]).toBe('Tropical coral reefs dying off');
    expect(tip.miss['The Amazon rainforest dying back']).toContain('3.5°C');
  });
});

describe('quiz feedback explains a wrong pick', () => {
  it('shows the why-not line for the chosen wrong option only', () => {
    const b = bank();
    const idx = b.findIndex((q) => q.q.indexOf('What gas do cars') === 0);
    const q = b[idx];
    const wrong = q.opts.indexOf('Oxygen');
    const html = text(render({ tab: 'carbon', quizOpen: true, quizIdx: idx, quizAnswer: wrong }));
    expect(html).toContain('Why not your answer: Engines use up oxygen from the air to burn fuel.');
    expect(html).not.toContain('Most of the air that goes through an engine is nitrogen');
    const right = text(render({ tab: 'carbon', quizOpen: true, quizIdx: idx, quizAnswer: q.a }));
    expect(right).not.toContain('Why not your answer');
    expect(right).toMatch(/Why: \S/);
    const raw = render({ tab: 'carbon', quizOpen: true, quizIdx: idx, quizAnswer: wrong });
    expect(raw).toContain('aria-describedby="ce-quiz-feedback-detail ce-quiz-feedback-miss ce-quiz-feedback-why"');
  });
});

describe('habits without a reliable number sit behind one disclosure', () => {
  it('keeps them out of the category panels and lists them, with sliders, in one closed disclosure', () => {
    const freq = {}; UNCOUNTED.forEach((id) => { freq[id] = 2; });
    const closed = render({ tab: 'carbon', granularExpanded: ALL_OPEN, granularFreq: freq });
    for (const id of UNCOUNTED) expect(closed, id).not.toContain('id="ce-carbon-habit-' + id + '"');
    expect(closed).toContain('id="ce-carbon-habit-netflix_hd"');
    expect(text(closed)).toContain('Habits without a reliable number yet (11)');
    expect(closed).toMatch(/id="ce-carbon-habits-toggle-uncounted"[^>]*aria-expanded="false"/);
    const open = render({ tab: 'carbon', granularExpanded: Object.assign({ uncounted: true }, ALL_OPEN), granularFreq: freq });
    expect(open).toMatch(/id="ce-carbon-habits-toggle-uncounted"[^>]*aria-expanded="true"/);
    for (const id of UNCOUNTED) {
      expect(open, id).toContain('id="ce-carbon-habit-' + id + '"');
      expect(open, id).toContain('id="ce-carbon-pledge-toggle-' + id + '"');
    }
    expect(text(open)).toContain('No reliable number was found for these habits yet, so they are not added to your total.');
    expect(text(open)).toContain('0.00 t CO₂e/yr');
  });

  it('opens with one click and keeps the category state', () => {
    const store = newStore({ climateExplorer: { tab: 'carbon', granularExpanded: { food: true } } });
    click(store, 'ce-carbon-habits-toggle-uncounted');
    expect(store.toolData.climateExplorer.granularExpanded).toEqual({ food: true, uncounted: true });
  });
});
