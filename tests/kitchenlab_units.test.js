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
