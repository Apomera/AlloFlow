// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Kitchen Lab is authored in °F. One header switch must turn every temperature
// the student reads into °C — readouts, step text, judge notes, aria-labels —
// through the element factory, so no site can be missed.
let E;
beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_kitchenlab.js', 'kitchenLab');
  E = window.StemLab._registry.kitchenLab.engine;
});

const strip = (html) => html.replace(/<[^>]+>/g, ' ');
// The header switch itself shows both units; every other °F must be gone.
const fCount = (text) => (text.match(/°F/g) || []).length;

describe('localizeTemps', () => {
  it('converts singles, ranges and keeps the author’s own Celsius in dual forms', () => {
    expect(E.localizeTemps('Pull at 165°F.')).toBe('Pull at 74°C.');
    expect(E.localizeTemps('Medium is 330-380°F.')).toBe('Medium is 166-193°C.');
    expect(E.localizeTemps('about 250°F (120°C)')).toBe('about 120°C');
    expect(E.localizeTemps('Danger zone 40–140°F (4–60°C)')).toBe('Danger zone 4–60°C');
    expect(E.localizeTemps('165°F+ for poultry, -4°F freezer')).toBe('74°C+ for poultry, -20°C freezer');
    expect(E.localizeTemps('no temperatures here')).toBe('no temperatures here');
    expect(E.localizeTemps(42)).toBe(42);
    expect(E.fToC(212)).toBe(100);
  });
});

describe('°C mode across the tool', () => {
  const sections = ['start', 'safety', 'knife', 'heat', 'maillard', 'recipe', 'resources'];

  it('renders every section with no Fahrenheit left in text or aria-labels', () => {
    for (const section of sections) {
      const html = renderTool('kitchenLab', { kitchenLab: { klUnits: 'C', activeSection: section } });
      const text = strip(html);
      expect(fCount(text), section + ' text (only the switch may say °F)').toBe(1);
      expect(html.includes('°F&'), section + ' attr').toBe(false);
      expect(/aria-label="[^"]*in Fahrenheit/.test(html), section + ' aria').toBe(false); // the switch itself may say "Switch to Fahrenheit"
    }
  });

  it('shows Celsius on the cockpit tiles, the dial and the trace mid-cook', () => {
    const html = renderTool('kitchenLab', { kitchenLab: {
      klUnits: 'C', activeSection: 'recipe', recipeActiveId: 'panSeared', recipePhase: 'paused', recipePausedAt: 1000, recipeStartedAt: 0,
      recipeCurrentStep: 2, recipePanTempF: 438, recipeMaxPanTempF: 438, recipeFoodInternalF: 120, recipeBurnerLevel: 8,
      recipeItemsInPan: ['oil', 'chicken'], recipeBrowning: 5, recipeSimElapsedSec: 300,
      recipeTempHistory: [{ t: 0, pan: 70, food: 40 }, { t: 150, pan: 400, food: 90 }, { t: 300, pan: 438, food: 120 }]
    } });
    const text = strip(html);
    expect(text).toContain('226°C');           // pan tile: 438°F
    expect(text).toContain('Internal: 49°C');  // chicken visual readout: 120°F
    expect(text).toContain('Boil 100°C');      // trace reference line
    expect(text).toContain('Maillard 154°C');
    expect(fCount(text)).toBe(1);
    expect(html).toContain('data-kl-units="C"');
    expect(html).toContain('aria-pressed="true"');
  });

  it('renders the rice pot mid-simmer in Celsius: pot floor card, pot sound, readout and rest clock', () => {
    const html = renderTool('kitchenLab', { kitchenLab: {
      klUnits: 'C', activeSection: 'recipe', recipeActiveId: 'rice', recipePhase: 'paused', recipePausedAt: 1000, recipeStartedAt: 0,
      recipeCurrentStep: 5, recipePanTempF: 212, recipeMaxPanTempF: 212, recipeFoodInternalF: 210, recipeBurnerLevel: 0,
      recipeItemsInPan: ['rice'], recipeBrowning: 0, recipeMoisture: 40, recipeAbsorbed: 120, recipeSimElapsedSec: 1500, recipeHeatRemovedSimSec: 1380,
      recipeTempHistory: [{ t: 0, pan: 70, food: 40 }, { t: 350, pan: 212, food: 190 }, { t: 1500, pan: 212, food: 210 }]
    } });
    const text = strip(html);
    expect(text).toContain('Pot floor');
    expect(text).toContain('clean');
    expect(text).toContain('liquid in the pot — pinned at 100°C, nothing can brown');
    expect(text).toContain('Sound of the pot: off the heat — the pot goes quiet');
    expect(text).toContain('Water 20% · rice 80% hydrated · 100°C');
    expect(text).toContain('Fluff and serve · rested 2:00');
    expect(text).toContain('Water to rice');
    expect(fCount(text)).toBe(1);
    expect(html).toContain('data-kl-rice="80,40"');
  });

  it('renders a finished experiment bench in Celsius: both sides, the verdict against the prediction, numbers and chart', () => {
    const html = renderTool('kitchenLab', { kitchenLab: { klUnits: 'C', activeSection: 'recipe', klBenchRecipe: 'steak', klBenchVar: 'pan', klBenchA: 'stainless', klBenchB: 'castIron', klBenchRan: true, klBenchPrediction: 'B' } });
    const text = strip(html);
    expect(html).toContain('data-kl-bench="100,100"');
    expect(text).toContain('You said B. Result: about the same. Worth reading why.');
    expect(text).toContain('A · 🥘 Clad stainless');
    expect(text).toContain('B · ⚫ Cast iron');
    expect(text).toContain('Pan peak');
    expect(text).toContain('243°C');            // 469°F sear peak, in the numbers table
    expect(text).toContain('dial 9 until the pan reads 221°C');
    expect(html).toContain('data-kl-bench-trace="1"');
    expect(html).toContain('Boil 100°C');
    expect(fCount(text)).toBe(1);
    expect(html.includes('°F&')).toBe(false);
    // idle bench: the run button is enabled once the two sides differ, and the prediction radios are live
    const idle = renderTool('kitchenLab', { kitchenLab: { klUnits: 'C', activeSection: 'recipe' } });
    expect(idle).toContain('data-kl-bench="idle"');
    expect(idle).toContain('data-kl-bench-run="1"');
    expect(idle).toContain('data-kl-bench-predict="same"');
  });

  it('renders a detective case in Celsius, and its reveal after an answer', () => {
    const open = renderTool('kitchenLab', { kitchenLab: { klUnits: 'C', activeSection: 'recipe', klDetectiveRecipe: 'rice', klDetectiveSeed: 1 } });
    expect(open).toContain('data-kl-detective="open"');
    expect(open).toContain('data-kl-detective-case="rice|opt:ratio:onehalf|1"');
    expect(open).toContain('data-kl-detective-option="opt:ratio:onehalf"');
    expect(open).toContain('data-kl-detective-commit="1"');
    const openText = strip(open);
    expect(openText).toContain('The plan: 🍚 Rice (Absorption Method)');
    expect(openText).toContain('dial 9 until it boils');
    expect(openText).not.toContain('A touch firm');          // the judge's labels are the reveal, not the evidence
    expect(fCount(openText)).toBe(1);
    const answered = renderTool('kitchenLab', { kitchenLab: { klUnits: 'C', activeSection: 'recipe', klDetectiveRecipe: 'rice', klDetectiveSeed: 1, klDetectiveAnswer: 'opt:lid:none', klDetectiveSolved: 0, klDetectiveCases: 1 } });
    expect(answered).toContain('data-kl-detective="wrong"');
    const text = strip(answered);
    expect(text).toContain('Not quite. The one thing: Water to rice · 1.5 : 1');
    expect(text).toContain('A touch firm');
    expect(text).toContain('Solved 0 of 1 on the first guess');
    expect(answered).toContain('data-kl-detective-next="1"');
    expect(fCount(text)).toBe(1);
    // the sheet pan, once a recipe with no fair case, now has its door
    expect(renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', klDetectiveRecipe: 'sheetPan' } })).toContain('data-kl-detective="open"');
  });

  it('shows the bench reminder in the cockpit when a side is cooked live', () => {
    const html = renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', recipeActiveId: 'steak', recipePhase: 'paused', recipePausedAt: 1000, recipeStartedAt: 0, recipeCurrentStep: 0, recipeItemsInPan: [], klBenchLiveHint: 'Bench pan B: two notches higher on the dial than the recipe says, at every step.' } });
    expect(html).toContain('data-kl-bench-live-hint="1"');
    expect(strip(html)).toContain('Bench pan B: two notches higher on the dial');
    const bench = renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', klBenchRecipe: 'steak', klBenchVar: 'dial', klBenchA: '0', klBenchB: '+2', klBenchRan: true } });
    expect(bench).toContain('data-kl-bench-live="A"');
    expect(bench).toContain('data-kl-bench-live="B"');
  });

  it('renders the pasta pot from sim state, paused, in Celsius', () => {
    const html = renderTool('kitchenLab', { kitchenLab: { klUnits: 'C', activeSection: 'recipe', recipeActiveId: 'pastaSauce', recipePhase: 'paused', recipePausedAt: 1000, recipeStartedAt: 0,
      recipeCurrentStep: 4, recipePanTempF: 212, recipeMaxPanTempF: 281, recipeItemsInPan: ['oil', 'garlic', 'tomatoes'], recipeMoisture: 240, recipeSimElapsedSec: 700,
      potState: 'pasta-in', potTempF: 212, potPastaSec: 300, potPastaInSimSec: 400, potPastaInTempF: 206 } });
    const text = strip(html);
    expect(text).toContain('Pasta cooking: 5:00 in boiling water (al dente at 9:00)');
    expect(html).toContain('data-kl-pot="drainKeep"');
    expect(text).toContain('Drain early (save water)');
    expect(text).toContain('Pan floor');
    expect(text).toContain('liquid in the pan — pinned at 100°C, nothing can brown');
    expect(text).toContain('Sound of the pan:');
    expect(fCount(text)).toBe(1);
    const heating = strip(renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', recipeActiveId: 'pastaSauce', recipePhase: 'paused', recipePausedAt: 1000, recipeStartedAt: 0, recipeCurrentStep: 1, recipeItemsInPan: [], potState: 'heating', potTempF: 150 } }));
    expect(heating).toContain('Heating: 150°F → 212°F (59%)');
    expect(heating).toContain('Drop pasta now (150°F, not boiling yet)');
  });

  it('renders the replay panel on the results screen from the cook log, in Celsius', () => {
    const log = [{ t: 0, k: 'dial', level: 3 }, { t: 30, k: 'add', id: 'butter' }, { t: 40, k: 'add', id: 'eggs' }, { t: 48, k: 'stir' }, { t: 56, k: 'stir' }, { t: 64, k: 'stir' }, { t: 72, k: 'stir' }, { t: 80, k: 'stir' }, { t: 88, k: 'dial', level: 0 }, { t: 88, k: 'add', id: 'saltPepper' }];
    const base = { klUnits: 'C', activeSection: 'recipe', recipeActiveId: 'scrambledEggs', recipePhase: 'done', recipeStartedAt: 5, recipeSimElapsedSec: 120, recipeLog: log,
      recipeJudgement: { score: 100, grade: 'A', verdict: 'Diner eggs.', notes: [{ neg: false, label: '✓ Kept moving', detail: 'Stirred 5 times.' }] },
      recipeMaxPanTempF: 278, recipeFoodPeakF: 160, recipeBrowning: 0, recipeTempHistory: [{ t: 0, pan: 70, food: 40 }, { t: 60, pan: 275, food: 120 }, { t: 120, pan: 150, food: 160 }] };
    const html = renderTool('kitchenLab', { kitchenLab: Object.assign({}, base, { klReplayVar: 'stir', klReplayChoice: 'never' }) });
    expect(html).toMatch(/data-kl-replay="\d+,\d+"/);
    const text = strip(html);
    expect(text).toContain('Your cook, one thing changed');
    expect(text).toContain('logged every move you made (10 of them, in 2:00)');
    expect(text).toContain('With never stir + fold:');
    expect(text).toContain('Left alone');
    expect(text).toContain('Replayed as you cooked it, the engine gives 100.');
    expect(text).toContain('137°C');            // your pan peak 278°F in the numbers table
    expect(html).toContain('data-kl-replay-live="1"');
    expect(fCount(text)).toBe(1);
    // the same choice as the cook says so instead of running
    expect(renderTool('kitchenLab', { kitchenLab: Object.assign({}, base, { klReplayVar: 'stir', klReplayChoice: 'you' }) })).toContain('data-kl-replay="same"');
    // no log (a cook from before the log existed), no panel
    expect(renderTool('kitchenLab', { kitchenLab: Object.assign({}, base, { recipeLog: [] }) })).not.toContain('data-kl-replay=');
  });

  it('shows the forecast strip in Celsius, and hides every coaching aid in demonstrate mode', () => {
    const base = { klUnits: 'C', activeSection: 'recipe', recipeActiveId: 'steak', recipePhase: 'paused', recipePausedAt: 1000, recipeStartedAt: 0, recipeLastTickAt: 1000,
      recipeCurrentStep: 2, recipePanTempF: 460, recipeMaxPanTempF: 460, recipeFoodInternalF: 110, recipeBurnerLevel: 9, recipeItemsInPan: ['oil', 'steak'], recipeBrowning: 6, recipeSimElapsedSec: 200, recipeOptions: { target: 'medium' } };
    const coached = renderTool('kitchenLab', { kitchenLab: base });
    expect(coached).toMatch(/data-kl-forecast="shade:\d+ your target:\d+ overdone:\d+"/);
    const text = strip(coached);
    expect(text).toContain('If you change nothing');
    expect(text).toContain('centre 63°C (your target) in');
    expect(text).toContain('pan settles near 243°C');
    expect(text).toContain('s happening:');
    expect(fCount(text)).toBe(1);
    const demo = renderTool('kitchenLab', { kitchenLab: Object.assign({}, base, { klIndependent: true }) });
    expect(demo).not.toContain('data-kl-forecast=');
    expect(demo).toContain('data-kl-demonstrate="1"');
    const demoText = strip(demo);
    expect(demoText).not.toContain('s happening:');
    expect(demoText).toContain('in range for this step');
    expect(demoText).not.toMatch(/in range for this step \(/);        // the verdict without the numbers
    // the picker toggle and the independent badge
    const picker = renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', klIndependent: true, recipeHistory: { steak: { attempts: 2, bestScore: 92, bestGrade: 'A', lastScore: 92, lastGrade: 'A', lastIssue: null, competitionRuns: 0, independentRuns: 1, independentBest: 92 } } } });
    expect(picker).toContain('data-kl-coaching="off"');
    expect(picker).toContain('data-kl-coaching-set="on"');
    expect(strip(picker)).toContain('🧭 1 without coaching, best 92');
  });

  it('real kitchen mode hides every thermometer, gives the pan its cues, and shows the number only while the probe is in', () => {
    const base = { klUnits: 'C', activeSection: 'recipe', recipeActiveId: 'steak', recipePhase: 'paused', recipePausedAt: 1000, recipeStartedAt: 0, recipeLastTickAt: 1000,
      recipeCurrentStep: 2, recipePanTempF: 460, recipeMaxPanTempF: 460, recipeFoodInternalF: 110, recipeBurnerLevel: 9, recipeItemsInPan: ['oil', 'steak'], recipeBrowning: 6, recipeSimElapsedSec: 200, recipeOptions: { target: 'medium' },
      recipeTempHistory: [{ t: 0, pan: 70, food: 40 }, { t: 100, pan: 400, food: 80 }, { t: 200, pan: 460, food: 110 }], klIndependent: true, klRealKitchen: true };
    const html = renderTool('kitchenLab', { kitchenLab: base });
    const text = strip(html);
    expect(renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', klIndependent: true, klRealKitchen: true } })).toContain('data-kl-coaching="real"');
    expect(html).toContain('data-kl-demonstrate="real"');
    expect(html).toContain('data-kl-real-pan="none"');
    expect(text).toContain('no readout');
    expect(text).toContain('the fat shimmers and runs like water');
    expect(html).toContain('data-kl-flick="1"');
    expect(html).toContain('data-kl-probe="idle"');
    expect(text).toContain('Internal: probe to read');
    expect(text).not.toContain('243°C');                       // the pan's 460°F appears nowhere
    expect(html).not.toContain('data-kl-trace="live"');        // the live trace is a thermometer log
    expect(html).not.toContain('data-kl-forecast=');
    expect(fCount(text)).toBe(1);
    // a flick five seconds ago shows the cue; a probe in progress shows the centre
    const flicked = strip(renderTool('kitchenLab', { kitchenLab: Object.assign({}, base, { klFlickUntil: Date.now() + 4000, klFlickReading: 460 }) }));
    expect(flicked).toContain('bead up and skitter across the pan');
    const probed = renderTool('kitchenLab', { kitchenLab: Object.assign({}, base, { klProbeUntil: Date.now() + 5000 }) });
    expect(probed).toContain('data-kl-probe="reading"');
    expect(probed).toContain('data-kl-probe-reading="110"');
    expect(strip(probed)).toContain('Internal: 43°C');
    // demonstrate mode without real kitchen keeps the pan number and the live trace
    const demo = renderTool('kitchenLab', { kitchenLab: Object.assign({}, base, { klRealKitchen: false }) });
    expect(strip(demo)).toContain('238°C');
    expect(demo).toContain('data-kl-trace="live"');
    expect(demo).not.toContain('data-kl-probe=');
  });

  it('reads the results trace at the scrubbed moment, in Celsius, with the last action named', () => {
    const base = { klUnits: 'C', activeSection: 'recipe', recipeActiveId: 'panSeared', recipePhase: 'done', recipeStartedAt: 0, recipeSimElapsedSec: 600,
      recipeJudgement: { score: 100, grade: 'A', verdict: 'x', notes: [] }, recipeItemAddSimSec: { oil: 60, chicken: 62 }, recipeHeatRemovedSimSec: 585,
      recipeTempHistory: [{ t: 0, pan: 70, food: 40, b: 0 }, { t: 300, pan: 438, food: 108, b: 5.1 }, { t: 585, pan: 317, food: 165, b: 13.2 }, { t: 600, pan: 300, food: 166, b: 13.2 }] };
    const end = renderTool('kitchenLab', { kitchenLab: base });
    expect(end).toContain('data-kl-scrub="klScrubResults"');
    expect(end).toContain('data-kl-trace-cursor="600"');
    expect(strip(end)).toContain('10:00 · pan 149°C · centre 74°C · browning 13.20 · after: Heat off at 9:45');
    const mid = renderTool('kitchenLab', { kitchenLab: Object.assign({}, base, { klScrubResults: 1 }) });
    expect(mid).toContain('data-kl-trace-cursor="300"');
    expect(mid).toContain('data-kl-scrub-readout="5:00"');
    expect(strip(mid)).toContain('5:00 · pan 226°C · centre 42°C · browning 5.10 · after: Seasoned chicken breast at 1:02');
    expect(mid).toContain('aria-valuetext="5:00: pan 226°C, centre 42°C"');
    expect(fCount(strip(mid))).toBe(1);
    // the detective's evidence has its own scrubber and the class-set button
    const det = renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', klDetectiveRecipe: 'rice', klDetectiveSeed: 1 } });
    expect(det).toContain('data-kl-scrub="klScrubDetective"');
    expect(det).toContain('data-kl-worksheet="idle"');
    expect(strip(det)).toContain('Copy a class set (5 cases)');
  });

  it('offers the altitude on the picker and moves the boil everywhere in the cockpit, in Celsius', () => {
    const picker = renderTool('kitchenLab', { kitchenLab: { klUnits: 'C', activeSection: 'recipe', klAltitudeFt: 5280 } });
    expect(picker).toContain('data-kl-altitude="5280"');
    const ptext = strip(picker);
    expect(ptext).toContain('Denver, 5,280 ft · water boils at 94°C');
    expect(ptext).toContain('Every pot and every sauce pins at 94°C instead of 100°C, and rice and pasta cook about 15% slower');
    expect(fCount(ptext)).toBe(1);
    const cockpit = renderTool('kitchenLab', { kitchenLab: { klUnits: 'C', activeSection: 'recipe', recipeActiveId: 'rice', recipePhase: 'paused', recipePausedAt: 1000, recipeStartedAt: 0, recipeLastTickAt: 1000, klAltitudeFt: 5280,
      recipeCurrentStep: 1, recipePanTempF: 201.4, recipeMaxPanTempF: 201.4, recipeFoodInternalF: 190, recipeBurnerLevel: 9, recipeItemsInPan: ['rice'], recipeMoisture: 200, recipeAbsorbed: 0, recipeSimElapsedSec: 400,
      recipeTempHistory: [{ t: 0, pan: 70, food: 40 }, { t: 200, pan: 150, food: 120 }, { t: 400, pan: 201, food: 190 }] } });
    const text = strip(cockpit);
    expect(text).toContain('in range for this step (90-94°C)');             // the boil step's range, at this altitude
    expect(text).toContain('liquid in the pot — pinned at 94°C, nothing can brown');
    expect(text).toContain('Boil 94°C');                                     // the trace's reference line
    expect(text).toContain('Sound of the pot: rolling boil');
    expect(fCount(text)).toBe(1);
  });

  it('shows the oven door in the cockpit and the record line with a portfolio button on the picker', () => {
    const oven = renderTool('kitchenLab', { kitchenLab: { klUnits: 'C', activeSection: 'recipe', recipeActiveId: 'sheetPan', recipePhase: 'paused', recipePausedAt: 1000, recipeStartedAt: 0, recipeLastTickAt: 1000,
      recipeCurrentStep: 3, recipePanTempF: 400, recipeMaxPanTempF: 410, recipeBurnerLevel: 7, recipeItemsInPan: ['oil', 'veg'], recipeSimElapsedSec: 600, recipePeeks: 3 } });
    expect(oven).toContain('data-kl-peek="3"');
    const text = strip(oven);
    expect(text).toContain('Open the oven door to look');
    expect(text).toContain('Opened 3 times — each look lets about 14°C out');   // a difference, converted as one
    expect(fCount(text)).toBe(1);
    const pan = renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', recipeActiveId: 'steak', recipePhase: 'paused', recipePausedAt: 1000, recipeStartedAt: 0, recipeCurrentStep: 0, recipeItemsInPan: ['oil'] } });
    expect(pan).not.toContain('data-kl-peek=');                      // a stovetop has no door
    const picker = renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', recipeHistory: { steak: { attempts: 1, bestScore: 92, bestGrade: 'A', lastScore: 92, lastGrade: 'A', competitionRuns: 0, independentRuns: 1, independentBest: 92 } }, aGradedRecipeIds: ['steak'], klUnlockedAchievements: ['firstCook'], klDetectiveSolved: 2, klDetectiveCases: 3 } });
    expect(picker).toContain('data-kl-portfolio="1/12"');
    expect(strip(picker)).toContain('1 of 12 cooked · 1 mastered · 1 without coaching · detective 2/3 · 1 of 27 badges');
    expect(picker).toContain('data-kl-portfolio-copy="idle"');
  });

  it('shows Celsius in judge notes on the results screen', () => {
    const rec = E.RECIPES.panSeared;
    const j = rec.judge({ maxPanTempF: 438, activeTimeSec: 600, foodInternalF: 158, itemAddTimes: { oil: 1, chicken: 2 }, itemAddPanF: { chicken: 413 }, heatRemovedAt: 5, lastTickAt: 6, doneness: { browning: 12, foodPeakF: 158, secAboveOverF: 0, set: false, stirCount: 0, unattendedSec: 0, smokeSec: 0, oil: null } });
    const html = renderTool('kitchenLab', { kitchenLab: { klUnits: 'C', activeSection: 'recipe', recipeActiveId: 'panSeared', recipePhase: 'done', recipeJudgement: j, recipeStartedAt: 0 } });
    const text = strip(html);
    expect(text).toContain('Internal 70°C');   // 158°F
    expect(text).toContain('74°C');            // the 165°F minimum, converted inside the note
    expect(fCount(text)).toBe(1);
  });

  it('stays in Fahrenheit by default, with the switch offered', () => {
    const html = renderTool('kitchenLab', { kitchenLab: { activeSection: 'heat' } });
    expect(strip(html)).toContain('°F');
    expect(html).toContain('data-kl-units="F"');
    expect(html).toContain('aria-pressed="false"');
  });
});

describe('Recipe Kitchen sub-view', () => {
  it('keeps the Recipe Sim tab selected and embeds recipe_lab.html', () => {
    const html = renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipeKitchen' } });
    expect(html).toContain('stem_lab/kitchen_studio/recipe_lab.html');
    expect(html).toMatch(/id="stem-kitchen-tab-recipe"[^>]*aria-selected="true"|aria-selected="true"[^>]*id="stem-kitchen-tab-recipe"/);
    expect(html).toContain('id="stem-kitchen-panel-recipe"');
    expect(html).toContain('data-kl-back="recipe"');
  });
});

describe('Stale-cook guard and danger clock render', () => {
  it('tells the student the cook was paused while they were away', () => {
    const html = renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', recipeActiveId: 'scrambledEggs', recipePhase: 'paused', recipeAutoPaused: true, recipePausedAt: 1000, recipeStartedAt: 0, recipeItemsInPan: [] } });
    expect(strip(html)).toContain('Paused while you were away');
  });
  it('renders the danger-zone clock over the limit at 98°F for 2 hours', () => {
    const html = renderTool('kitchenLab', { kitchenLab: { activeSection: 'safety', safetyTemp: 98, safetyHours: 2 } });
    expect(html).toContain('data-kl-danger-clock="over"');
    expect(html).toContain('data-kl-danger-mult="64"');
    expect(strip(html)).toContain('Past the limit');
  });
});

describe('Picker progress line', () => {
  it('shows best, last and the fix on a cooked recipe and nothing on an untried one', () => {
    const html = renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', recipeHistory: { stirFry: { attempts: 2, bestScore: 92, bestGrade: 'A', lastScore: 65, lastGrade: 'D', lastIssue: 'Steamed before it browned', competitionRuns: 0 } } } });
    const text = strip(html);
    expect(html).toContain('data-kl-history="stirFry"');
    expect(html).not.toContain('data-kl-history="pancakes"');
    expect(text).toContain('2 cooks'); expect(text).toContain('A 92'); expect(text).toContain('D 65');
    expect(text).toContain('Next time: Steamed before it browned');
  });
});

describe('Picker badges', () => {
  it('says Mastered only for an A-graded recipe, Cooked otherwise', () => {
    const html = strip(renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', recipeCompletedIds: ['scrambledEggs', 'omelet'], aGradedRecipeIds: ['omelet'] } }));
    expect((html.match(/✓ Mastered/g) || []).length).toBe(1);
    expect((html.match(/✓ Cooked/g) || []).length).toBe(1);
  });
});
