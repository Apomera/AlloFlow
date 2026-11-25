// Accuracy audit, 2026-11-24 (Microbiology Lab). Wrong or unsourced numbers were corrected or cut, health advice now
// follows CDC wording, registered ui_strings text can no longer override the corrected wording, and the "Earth history
// in one year" card became a predict-first activity whose dates come from microCosmicCalendar.
// Fail-first check: MICRO_TOOL_FILE=C:/tmp/sports_labs_1123/microbiology/start.js npx vitest run <this file>
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MICRO_TOOL_FILE || 'stem_lab/stem_tool_microbiology.js';
const TOOL_ID = 'microbiology';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
// Student-facing code only: drop whole-line comments (the source notes quote the old claims on purpose).
const CODE = SOURCE.split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n');

function registeredMicrobiologyKeys() {
  const ui = readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8').split('\n');
  const start = ui.findIndex((l) => /^\s*"microbiology": \{/.test(l));
  const keys = new Set();
  for (let i = start + 1; i < ui.length; i++) {
    if (/^\s*\},?\s*$/.test(ui[i])) break;
    const m = ui[i].match(/^\s*"([^"]+)":/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

function home(extra) {
  resetStemLab();
  loadTool(FILE, TOOL_ID);
  return renderTool(TOOL_ID, { microbiology: Object.assign({ tab: 'world' }, extra || {}) });
}

afterEach(() => { vi.restoreAllMocks(); });

describe('Microbiology accuracy audit (2026-11-24)', () => {
  it('no longer shows the wrong or unsourced numbers found in the audit', () => {
    const banned = [
      /over 1,400 confirmed cases/, /~100 trillion/, /~50 billion (cells )?per gram/, /~10 million per mL/, /Norman Pace/,
      /trillions of cells in any given liter/, /Cool-shower/, /24-36 hours/, /cannot transmit the virus/, /eliminated from the Americas/,
      /December 14 = Cambrian/, /11:58 pm = first humans/, /last 13 seconds/, /~14,000× longer/, /About 0\.1% of human gut/,
      /Roughly 1\.5 million deaths/, /About 240 million cases/, /Diatoms produce roughly 20% of all oxygen/, /most potent natural carcinogens/,
      /Without mycorrhizae, most plants would die/, /The forest is one organism/, /About 70% of atmospheric methane/,
      /shows up pink from the carotenoid/, /Bacteriorhodopsin is the basis of "optogenetics"/, /Predates baker\\'s yeast by ~5,000/,
      /7,000 BCE in the Fertile Crescent/, /over 90% of cases - better than any antibiotic/, /Diet matters more for gut health than supplements/,
      /faster than 99% of the world ocean/, /1\.5-2 million deaths globally/, /Abbott BinaxNOW \+ GeneXpert/, /100 million sensory neurons/,
      /10¹⁴ phage particles/, /roughly 10× more virus particles/, /a few hundred thousand serious infections/, /10²⁴ transduction events/,
      /9 months in a coma/, /6 of the world\\'s top 10 pharma/, /single highest-yield public-health intervention/, /~20-30 million deaths/,
      /About 99% of all the cells on Earth/, /~1 trillion species \(most uncharacterized\)/, /Antibiotic resistance is killing more people every year/,
      /essentially unchanged in 3\.5 billion years/, /the only human disease eliminated/, /65-80% of all human bacterial infections/,
    ];
    const found = banned.filter((re) => re.test(CODE)).map(String);
    expect(found).toEqual([]);
  });

  it('states the corrected figures with their sources in the code', () => {
    const required = [
      [/1\.23 million TB deaths worldwide in 2024/, /global-tuberculosis-report-2025/],
      [/282 million cases and 610,000 deaths in 2024/, /world-malaria-report-2025/],
      [/2,942 probable cases in 2023, about 211 for every 100,000/, /LD-SR-2023\.pdf/],
      [/~38 trillion bacteria/, /journal\.pbio\.1002533/],
      [/About 500,000 per mL/, /pnas\.95\.12\.6578/],
      [/US declared measles eliminated in 2000/, /measles-elimination-status-us/],
      [/effectively no risk of passing HIV to sexual partners/, /cdc\.gov\/hivpartners/],
      [/Edward DeLong\\'s and Jed Fuhrman\\'s/, /PNAS 89:5685/],
      [/about 85% of plant species/, /nph\.14976/],
    ];
    for (const [claim, source] of required) {
      expect(CODE, String(claim)).toMatch(claim);
      expect(SOURCE, String(source)).toMatch(source);
    }
  });

  it('gives CDC tick, Vibrio, and mosquito advice in CDC terms', () => {
    expect(CODE).toMatch(/treat clothing and gear with 0\.5% permethrin/);
    expect(CODE).toMatch(/Shower within two hours of coming indoors/);
    expect(CODE).toMatch(/Tumble dry clothes on high heat for 10 minutes/);
    expect(CODE).toMatch(/Removing a tick within 24 hours greatly reduces your chance of getting Lyme disease/);
    expect(CODE).toMatch(/do not eat raw or undercooked oysters or other seafood; cook them before eating/);
    expect(CODE).toMatch(/about 30% of people who develop severe EEE die/);
  });

  it('re-keys every corrected t() string so registered ui_strings text cannot override it', () => {
    const registered = registeredMicrobiologyKeys();
    expect(registered.size).toBeGreaterThan(1000);
    // The four antibiotic-advice keys whose registered text still said "finish the full course".
    for (const key of ['not_finishing_the_full_course_kills_th', 'take_antibiotics_only_when_prescribed_', 'antibiotics_never_for_viral_infections', 'finish_the_full_course_exactly_as_pres']) {
      expect(registered.has(key)).toBe(true);
      expect(CODE).not.toContain("'stem.microbiology." + key + "'");
      expect(CODE).toContain("'stem.microbiology." + key + "_v2'");
      expect(registered.has(key + '_v2')).toBe(false);
    }
    // Every _v2 key used by the tool is new (unregistered), so its English fallback is what students see.
    const v2 = [...CODE.matchAll(/'stem\.microbiology\.([A-Za-z0-9_]+_v2)'/g)].map((m) => m[1]);
    expect(v2.length).toBeGreaterThan(40);
    expect(v2.filter((k) => registered.has(k))).toEqual([]);
  });

  it('makes the overview (domains, origins timeline, Maine microbes) reachable from the topic library', () => {
    resetStemLab();
    loadTool(FILE, TOOL_ID);
    const library = renderTool(TOOL_ID, { microbiology: { tab: 'home', showMicroLibrary: true } });
    expect(library).toContain('id="micro-tab-world"');
    const world = renderTool(TOOL_ID, { microbiology: { tab: 'world' } });
    expect(world).toContain('The origins of life');
    expect(world).toContain('Microbes in Maine');
    expect(world).toContain('aria-labelledby="micro-tab-world"');
    // The core (collapsed) navigation is unchanged.
    expect(renderTool(TOOL_ID, { microbiology: { tab: 'home' } })).not.toContain('id="micro-tab-world"');
  });

  it('computes the Earth-history calendar from the timeline ages', () => {
    resetStemLab();
    loadTool(FILE, TOOL_ID);
    const cc = window.__MicrobiologyCore && window.__MicrobiologyCore.cosmicCalendar;
    expect(cc).toBeTruthy();
    const at = (id) => cc.dateText(cc.calendar(cc.events.find((e) => e.id === id).yearsAgo));
    expect(at('earth')).toBe('January 1');
    expect(at('fossils')).toBe('March 29');
    expect(at('eukaryotes')).toBe('July 18');
    expect(at('cambrian')).toBe('November 19');
    expect(at('humans')).toBe('December 31, 11:25 pm');
    expect(at('writing')).toBe('December 31, 34 seconds before midnight');
    // The old card claimed Dec 14 for the Cambrian and 11:58 pm for humans; the model rules both out.
    const cambrian = cc.calendar(5.4e8);
    expect(cambrian.month).toBe(10);
    expect(cc.calendar(3e5).secondsBeforeEnd / 60).toBeGreaterThan(30);
    // Exactly one choice holds the Cambrian, and each wrong choice holds a different real event.
    expect(cc.answerId()).toBe('november');
    for (const choice of cc.choices) {
      expect(cc.choiceHolds(choice, cc.events.find((e) => e.id === choice.event).yearsAgo)).toBe(true);
    }
    expect(cc.choices.findIndex((c) => c.id === cc.answerId())).not.toBe(0);
  });

  it('asks for a prediction before showing any calendar date, then explains with model numbers', () => {
    const before = home();
    expect(before).toContain('data-earth-calendar="true"');
    expect(before).toContain('Predict first');
    expect(before).not.toContain('data-earth-calendar-table');
    expect(before).not.toContain('November 19');

    const right = home({ earthCalendarPrediction: 'november' });
    expect(right).toContain('data-earth-calendar-feedback="right"');
    expect(right).toMatch(/only 11\.7% of Earth/);
    expect(right).toContain('November 19, with about 6 weeks left');
    expect(right).toContain('data-earth-calendar-table');

    const early = home({ earthCalendarPrediction: 'july' });
    expect(early).toContain('data-earth-calendar-feedback="wrong"');
    expect(early).toMatch(/July 18 is when this happens: first cells with a nucleus/);
    expect(early).toMatch(/about 1\.6 billion years later, on November 19/);

    const late = home({ earthCalendarPrediction: 'dec31' });
    expect(late).toMatch(/December 31, 11:25 pm is when our own species appears/);

    // The fossil-to-human ratio on the timeline comes from the same ages (3.5 billion / 300,000, nearest thousand).
    expect(before).toContain('about 12,000 times older than our species');
    expect(before).toContain('about 38 trillion');
  });
});

describe('Earth calendar prediction in a mounted tool', () => {
  const act = React.act;
  let prior, view;
  beforeEach(() => { prior = globalThis.IS_REACT_ACT_ENVIRONMENT; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
  afterEach(() => {
    if (view) { act(() => view.root.unmount()); view.container.remove(); view = null; }
    globalThis.IS_REACT_ACT_ENVIRONMENT = prior;
  });

  it('locks the other choices after a prediction, announces feedback, and can be reset', () => {
    resetStemLab();
    const tool = loadTool(FILE, TOOL_ID);
    const container = document.createElement('div');
    document.body.appendChild(container);
    view = { container, root: ReactDOMClient.createRoot(container), awardXP: vi.fn() };
    function Host() {
      const [data, setData] = React.useState({ microbiology: { tab: 'world' } });
      view.data = data;
      return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP: view.awardXP }));
    }
    act(() => view.root.render(React.createElement(Host)));
    const choice = (id) => container.querySelector('[data-earth-calendar-choice="' + id + '"]');
    expect(choice('march')).toBeTruthy();
    expect(container.querySelector('[data-earth-calendar] [role="status"]').textContent).toBe('');
    act(() => { choice('march').click(); });
    expect(view.data.microbiology.earthCalendarPrediction).toBe('march');
    expect(choice('march').getAttribute('aria-pressed')).toBe('true');
    expect(choice('november').disabled).toBe(true);
    const status = container.querySelector('[data-earth-calendar] [role="status"]');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toMatch(/March 29 is when this happens/);
    expect(status.textContent).toMatch(/about 3 billion years later, on November 19/);
    expect(view.awardXP).not.toHaveBeenCalled();
    const again = [...container.querySelectorAll('[data-earth-calendar] button')].find((b) => /Predict again/.test(b.textContent));
    act(() => { again.click(); });
    expect(view.data.microbiology.earthCalendarPrediction).toBe(null);
    expect(container.querySelector('[data-earth-calendar-table]')).toBeNull();
  });
});
