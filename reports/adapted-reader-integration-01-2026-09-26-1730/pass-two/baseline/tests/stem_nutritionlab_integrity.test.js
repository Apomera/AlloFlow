import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Deep-dive integrity pins for Nutrition Lab (2026-08-11 audit, which found
// the tool clean apart from the previously fixed quiz-bank stacking). These
// properties rot silently, so they get regression coverage:
//   - the 248-entry component registry stays complete and hub-reachable
//   - the food database stays Atwater-consistent (kcal ≈ 4c + 4p + 9f)
//   - the sweat-rate calculator keeps its input guards
//   - the supplement reference keeps its medical disclaimer
//   - calories stay framed as information, not goals (NEDA-aligned design)

const nut = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
const pub = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_nutritionlab.js', 'utf8');

describe('component registry and hub reachability', () => {
  const registryEntries = [...nut.matchAll(/^ {6}([a-zA-Z_0-9]+): \[([A-Za-z_0-9]+),/gm)]
    .map((m) => ({ key: m[1], component: m[2] }));
  const tileIds = (() => {
    const start = nut.indexOf('var allTools = [');
    const end = nut.indexOf('\n    ];', start);
    expect(start).toBeGreaterThan(-1);
    return [...nut.slice(start, end).matchAll(/\{ id: '([a-zA-Z_0-9]+)'/g)].map((m) => m[1]);
  })();

  it('every registered component has a definition', () => {
    expect(registryEntries.length).toBeGreaterThanOrEqual(248);
    for (const e of registryEntries) {
      expect(nut.includes('function ' + e.component + '('), e.component).toBe(true);
    }
  });

  it('registry keys and hub tiles match bidirectionally (export is the special case)', () => {
    const keys = new Set(registryEntries.map((e) => e.key));
    const tiles = new Set(tileIds);
    for (const key of keys) expect(tiles.has(key), 'tile for ' + key).toBe(true);
    for (const tile of tiles) {
      if (tile === 'export') continue; // wired directly to PersonalNutritionKitExport
      expect(keys.has(tile), 'registry entry for ' + tile).toBe(true);
    }
    expect(nut.includes('Comp = PersonalNutritionKitExport')).toBe(true);
  });
});

describe('food database integrity', () => {
  const start = nut.indexOf('var NUTRITION_KIT_FOOD_DB = [');
  const end = nut.indexOf('\n  ];', start);
  // eslint-disable-next-line no-new-func
  const DB = new Function(nut.slice(start, end) + '\n];\nreturn NUTRITION_KIT_FOOD_DB;')();

  it('every entry is Atwater-consistent and well-formed', () => {
    expect(DB.length).toBeGreaterThanOrEqual(119);
    const ids = new Set();
    for (const e of DB) {
      expect(ids.has(e.id), 'duplicate id ' + e.id).toBe(false);
      ids.add(e.id);
      for (const field of ['kcal', 'c', 'p', 'f']) {
        expect(typeof e[field], e.id + '.' + field).toBe('number');
        expect(e[field], e.id + '.' + field).toBeGreaterThanOrEqual(0);
      }
      // Label rounding and fiber discounting create legitimate slack; the
      // bound catches transposed macros and decimal-point typos.
      const atwater = 4 * e.c + 4 * e.p + 9 * e.f;
      const slack = Math.max(20, 0.25 * atwater, 4 * (e.fib || 0));
      expect(Math.abs(e.kcal - atwater), e.id + ' kcal=' + e.kcal + ' atwater=' + atwater.toFixed(0)).toBeLessThanOrEqual(slack + 0.25 * atwater);
    }
  });
});

describe('clinical-adjacent guardrails', () => {
  it('the sweat-rate calculator validates raw inputs before computing', () => {
    expect(nut).toContain('if (isNaN(pre) || isNaN(post) || form.durationMin <= 0) return;');
    expect(nut).toContain("fluidIntakeMl: parseInt(e.target.value) || 0");
  });

  it('the supplement reference keeps its consult-first disclaimer', () => {
    expect(nut).toContain('Always consult your doctor or pharmacist BEFORE starting any supplement');
    expect(nut).toContain('This reference is educational, not medical advice.');
  });

  it('calories stay framed as information, not goals', () => {
    expect(nut).toContain('"energy in kcal" as informational rather than as a goal');
    // No calorie-budget/deficit gamification language anywhere.
    expect(nut).not.toMatch(/calorie[s]?\s*(budget|remaining|deficit)/i);
  });

  it('the symptom-nutrient table keeps escalation language', () => {
    const start = nut.indexOf('var NUTRITION_KIT_SYMPTOM_NUTRIENT = [');
    const end = nut.indexOf('\n  ];', start);
    const table = nut.slice(start, end);
    const escalations = (table.match(/See doctor|See GI|medical eval|Neurological eval|dermatology assessment|Test ferritin|Test vit D|B12 test|Test TSH|TSH/g) || []).length;
    expect(escalations).toBeGreaterThanOrEqual(8);
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(pub()).toBe(nut);
  });
});

describe('nutrient body map (3D) data + wiring', () => {
  const slice = (startMarker, endMarker) => {
    const start = nut.indexOf(startMarker);
    expect(start, startMarker).toBeGreaterThan(-1);
    const end = nut.indexOf(endMarker, start);
    expect(end, endMarker).toBeGreaterThan(start);
    return nut.slice(start, end);
  };
  // The map is authored as plain object literals at module scope, so it can be
  // evaluated on its own (the Atlas tables are evaluated the same way).
  const regionsSrc = slice('var BODY_REGIONS = [', '\n  ];') + '\n  ];';
  const macrosSrc = slice('var BODY_MAP_MACROS = [', '\n  ];') + '\n  ];';
  const mapSrc = slice('var BODY_NUTRIENT_MAP = {', '\n  };') + '\n  };';
  const bankSrc = slice('var BODY_MAP_CHALLENGES = [', '];') + '];';
  const atlasSrc = slice('var VITAMINS = [', 'var R_NL =');
  // eslint-disable-next-line no-new-func
  const data = new Function(
    atlasSrc + '\n' + regionsSrc + '\n' + macrosSrc + '\n' + mapSrc + '\n' + bankSrc +
    '\nreturn { BODY_REGIONS, BODY_MAP_MACROS, BODY_NUTRIENT_MAP, BODY_MAP_CHALLENGES, VITAMINS, MINERALS, EFAS };'
  )();
  const regionIds = new Set(data.BODY_REGIONS.map((r) => r.id));
  const nutrientIds = new Set([...data.BODY_MAP_MACROS, ...data.VITAMINS, ...data.MINERALS, ...data.EFAS].map((n) => n.id));

  it('every region is well-formed and unique', () => {
    expect(data.BODY_REGIONS.length).toBe(12);
    expect(regionIds.size).toBe(data.BODY_REGIONS.length);
    for (const r of data.BODY_REGIONS) {
      expect(typeof r.label, r.id).toBe('string');
      expect(r.color, r.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(r.uses.length, r.id + '.uses').toBeGreaterThan(40);
      expect(r.short.length, r.id + '.short').toBeGreaterThan(20);
    }
  });

  it('every mapped nutrient is a real Atlas or macro id, and every region it names exists', () => {
    const keys = Object.keys(data.BODY_NUTRIENT_MAP);
    expect(keys.length).toBeGreaterThanOrEqual(35);
    for (const k of keys) {
      expect(nutrientIds.has(k), 'unknown nutrient id in map: ' + k).toBe(true);
      const m = data.BODY_NUTRIENT_MAP[k];
      expect(m.regions.length, k).toBeGreaterThan(0);
      for (const rid of m.regions) expect(regionIds.has(rid), k + ' -> unknown region ' + rid).toBe(true);
      expect(new Set(m.regions).size, k + ' duplicate region').toBe(m.regions.length);
      expect(typeof m.note, k).toBe('string');
      expect(m.note.length, k + '.note').toBeGreaterThan(30);
    }
  });

  it('every Atlas nutrient has a map entry, and every region is reachable from at least one nutrient', () => {
    for (const id of nutrientIds) expect(data.BODY_NUTRIENT_MAP[id], 'no body-map entry for ' + id).toBeTruthy();
    const reached = new Set();
    for (const k of Object.keys(data.BODY_NUTRIENT_MAP)) for (const rid of data.BODY_NUTRIENT_MAP[k].regions) reached.add(rid);
    for (const rid of regionIds) expect(reached.has(rid), 'region never lit: ' + rid).toBe(true);
  });

  it('the predict-then-check bank only names mapped nutrients and has no repeats', () => {
    expect(data.BODY_MAP_CHALLENGES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(data.BODY_MAP_CHALLENGES).size).toBe(data.BODY_MAP_CHALLENGES.length);
    for (const id of data.BODY_MAP_CHALLENGES) expect(data.BODY_NUTRIENT_MAP[id], id).toBeTruthy();
  });

  it('the view is wired: stable identity, badge, dispatch, hub card, null-viewer fallback', () => {
    expect(nut).toContain("NutrientBodyMap = stableType('NutrientBodyMap', NutrientBodyMap);");
    expect(nut).toContain("'hydrationLab','macroInquiry','bodyMap'];");
    expect(nut).toContain("if (view === 'bodyMap') return h(NutrientBodyMap);");
    expect(nut).toContain("id: 'bodyMap', title:");
    // Host older than the tool → 2D floor still works.
    expect(nut).toContain("if (!mk) { NUTRI_BODY3D_MISSING = 'host'; return NUTRI_BODY3D_NULL; }");
    // The glass shell must never intercept organ clicks.
    expect(nut).toContain('skin.userData.noPick = true;');
    // Scene reads live values in frame(), never at build time (sceneProps is null on the first build).
    const scene = slice('function nutriBuildBodyScene(THREE, api) {', 'var NUTRI_BODY3D_NULL');
    const beforeFrame = scene.slice(0, scene.indexOf('function frame(now, sp, reduced)'));
    expect(beforeFrame).not.toMatch(/api\.sceneProps/);
  });

  it('cross-links exist from the Macro Lab plate and the Atlas card, and the digestion strip is drawn', () => {
    expect(nut).toContain("upd('bm_plate', ids); upd('bm_nutrient', 'plate');");
    expect(nut).toContain("upd('bm_nutrient', item.id); upd('bm_region', null); goto('bodyMap');");
    expect(nut).toContain("'data-nutrition-journey': 'true'");
    expect(nut).toContain("'data-nutrition-start-here': 'true'");
    expect(nut).toContain("'data-nutrition-glossary': 'true'");
  });

  it('the region "when short" copy keeps the candidate-not-diagnosis framing', () => {
    expect(nut).toContain('These are candidates, not a diagnosis.');
  });
});

describe('nutrient body map renders (jsdom, 2D floor)', () => {
  beforeEach(() => resetStemLab());

  const render = (state) => {
    loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab');
    return renderTool('nutritionLab', { nutritionLab: state });
  };

  it('renders the body map view with the region list and a nutrient picked', () => {
    const html = render({ view: 'bodyMap', bm_nutrient: 'iron' });
    expect(html).toContain('Every nutrient has an address');
    expect(html).toContain('data-nutrition-bodymap="true"');
    for (const label of ['Brain &amp; nerves', 'Blood (red cells)', 'Immune system', 'Bones &amp; teeth']) {
      expect(html, label).toContain(label);
    }
    // Iron's detail card: 4 regions, note present.
    expect(html).toContain('Works in 4 regions');
    expect(html).toContain('Sits inside hemoglobin and myoglobin');
  });

  it('renders a region card when a region is selected', () => {
    const html = render({ view: 'bodyMap', bm_nutrient: 'calcium', bm_region: 'bones' });
    expect(html).toContain('When supply runs short');
    expect(html).toContain('Nutrients it depends on');
    expect(html).toContain('These are candidates, not a diagnosis.');
  });

  it('renders plate mode from a Macro Lab hand-off', () => {
    const html = render({ view: 'bodyMap', bm_nutrient: 'plate', bm_plate: ['carbs', 'iron', 'vitC'] });
    expect(html).toContain('Where your plate goes');
    expect(html).toContain('My plate');
  });

  it('renders the hub with the 3D card, start-here path and glossary', () => {
    const html = render({});
    expect(html).toContain('Nutrient Body Map');
    expect(html).toContain('data-nutrition-start-here="true"');
    expect(html).toContain('data-nutrition-glossary="true"');
    expect(html).toContain('Atwater factors');
  });

  it('renders the digestion journey strip', () => {
    const html = render({ view: 'digestion', dg_stage: 2 });
    expect(html).toContain('data-nutrition-journey="true"');
    expect(html).toContain('Digestion journey:');
  });
});

describe('body map modes: resting energy and compare-two', () => {
  const slice = (startMarker, endMarker) => {
    const start = nut.indexOf(startMarker);
    expect(start, startMarker).toBeGreaterThan(-1);
    const end = nut.indexOf(endMarker, start);
    expect(end, endMarker).toBeGreaterThan(start);
    return nut.slice(start, end);
  };
  const regionsSrc = slice('var BODY_REGIONS = [', '\n  ];') + '\n  ];';
  const energySrc = slice('var BODY_ENERGY_SHARE = {', '\n  };') + '\n  };';
  const otherSrc = slice('var BODY_ENERGY_OTHER_PCT', '\n');
  const maxSrc = slice('var BODY_ENERGY_MAX_PCT', '\n');
  const notesSrc = slice('var BODY_COMPARE_NOTES = {', '\n  };') + '\n  };';
  const mapSrc = slice('var BODY_NUTRIENT_MAP = {', '\n  };') + '\n  };';
  // eslint-disable-next-line no-new-func
  const data = new Function(
    [regionsSrc, energySrc, otherSrc, maxSrc, notesSrc, mapSrc].join('\n') +
    '\nreturn { BODY_REGIONS, BODY_ENERGY_SHARE, BODY_ENERGY_OTHER_PCT, BODY_ENERGY_MAX_PCT, BODY_COMPARE_NOTES, BODY_NUTRIENT_MAP };'
  )();
  const regionIds = new Set(data.BODY_REGIONS.map((r) => r.id));

  it('every energy share names a real region and the shares total 100%', () => {
    const ids = Object.keys(data.BODY_ENERGY_SHARE);
    expect(ids.length).toBe(5);
    let sum = data.BODY_ENERGY_OTHER_PCT;
    for (const id of ids) {
      expect(regionIds.has(id), 'unknown region in energy share: ' + id).toBe(true);
      const e = data.BODY_ENERGY_SHARE[id];
      expect(e.pct, id).toBeGreaterThan(0);
      expect(e.pct, id).toBeLessThanOrEqual(data.BODY_ENERGY_MAX_PCT);
      expect(e.note.length, id + '.note').toBeGreaterThan(30);
      sum += e.pct;
    }
    // A share that does not add up is the silent failure here: the bars would
    // still draw and the figure would still light.
    expect(sum, 'shares plus "everything else" must be 100%').toBe(100);
    // The scale the 3D levels divide by has to be the real maximum, or the
    // biggest organ would clip instead of reading as the biggest.
    expect(data.BODY_ENERGY_MAX_PCT).toBe(Math.max(...ids.map((id) => data.BODY_ENERGY_SHARE[id].pct)));
  });

  it('every compare note names two mapped nutrients and is stored under a sorted key', () => {
    for (const key of Object.keys(data.BODY_COMPARE_NOTES)) {
      const parts = key.split('|');
      expect(parts.length, key).toBe(2);
      // bodyMapCompareNote() looks the pair up by sorted key, so an unsorted
      // entry here would simply never be found.
      expect([...parts].sort().join('|'), key + ' must be sorted').toBe(key);
      for (const id of parts) expect(data.BODY_NUTRIENT_MAP[id], key + ' -> unknown nutrient ' + id).toBeTruthy();
      expect(data.BODY_COMPARE_NOTES[key].length, key).toBeGreaterThan(40);
    }
  });

  it('the level helpers grade shared, single and unlit regions apart', () => {
    // eslint-disable-next-line no-new-func
    const fns = new Function(
      [regionsSrc, energySrc, otherSrc, maxSrc, mapSrc,
        slice('function bodyMapEnergyLevels()', 'function bodyMapCompareSets'),
        slice('function bodyMapCompareSets', 'var BODY_COMPARE_NOTES')].join('\n') +
      '\nreturn { bodyMapEnergyLevels, bodyMapCompareLevels, bodyMapCompareSets };'
    )();
    const energy = fns.bodyMapEnergyLevels();
    expect(Object.keys(energy).length).toBe(5);
    expect(energy.muscles).toBe(1);
    expect(energy.kidneys).toBeLessThan(energy.brain);

    const levels = fns.bodyMapCompareLevels('iron', 'vitC');
    const sets = fns.bodyMapCompareSets('iron', 'vitC');
    expect(sets.shared.length).toBeGreaterThan(0);
    for (const r of sets.shared) expect(levels[r], 'shared ' + r).toBe(1);
    for (const r of sets.onlyA.concat(sets.onlyB)) expect(levels[r], 'single ' + r).toBeLessThan(1);
    // Order must not change the answer.
    expect(fns.bodyMapCompareSets('vitC', 'iron').shared.slice().sort())
      .toEqual(sets.shared.slice().sort());
  });

  it('the scene draws arrival pins outside the shell-owned mesh registry', () => {
    // The shell owns scale/emissive/opacity for everything in `meshes`, and a
    // pin in `picks` would swallow the organ click behind it.
    const scene = slice('function nutriBuildBodyScene(THREE, api) {', 'var NUTRI_BODY3D_NULL');
    expect(scene).toContain('var pins = {};');
    expect(scene).toContain('figure.add(pin);');
    expect(scene).not.toMatch(/picks\.push\(pin\)|meshes\[[^\]]+\] = pin/);
    // Half these organs sit behind ribs or inside the glass shell, so the cue
    // has to draw through them. (An earlier version of this test pinned the
    // spelling of a halo mesh that later turned out to be the wrong idea and
    // was deleted — assert the property, not the implementation.)
    expect(scene).toContain('depthTest: false');
    // The pin must sit ON the organ. Placing it at the label anchor — offset
    // above the part so the shell's chip clears it — put bright discs in mid-air.
    expect(scene).toContain('function pinAnchorFor(group)');
    expect(scene).not.toMatch(/pin\.position\.copy\(anchors\[/);
  });

  it('mode state is wired and a plate or a prediction returns to nutrient mode', () => {
    expect(nut).toContain("usePersistedState('bm_mode', 'nutrient')");
    expect(nut).toContain("usePersistedState('bm_compare', 'vitC')");
    expect(nut).toContain("if (id === 'plate') { setModeRaw('nutrient');");
    expect(nut).toContain("'data-nutrition-bm-modes': 'true'");
    expect(nut).toContain("upd('bm_mode', 'energy')");
  });
});

describe('body map modes render (jsdom, 2D floor)', () => {
  beforeEach(() => resetStemLab());

  const render = (state) => {
    loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab');
    return renderTool('nutritionLab', { nutritionLab: state });
  };

  it('renders resting-energy mode with shares and without the nutrient picker', () => {
    const html = render({ view: 'bodyMap', bm_mode: 'energy' });
    expect(html).toContain('data-nutrition-bm-energy="true"');
    expect(html).toContain('Where your resting energy goes');
    expect(html).toContain('22%');
    expect(html).toContain('Everything else');
    // The picker drives nothing in this mode, so it must not be offered. Assert
    // on a group heading unique to the picker: the intro's step-1 chip also says
    // "Pick a nutrient", so that phrase is not evidence either way.
    expect(html).not.toContain('Macronutrients + water');
  });

  it('renders compare mode with shared and single-nutrient region lists', () => {
    const html = render({ view: 'bodyMap', bm_mode: 'compare', bm_nutrient: 'iron', bm_compare: 'vitC' });
    expect(html).toContain('data-nutrition-bm-compare="true"');
    expect(html).toContain('Shared addresses');
    expect(html).toContain('Vitamin C makes plant iron far easier to absorb');
    expect(html).toContain('Pick the first nutrient');
  });

  it('a plate hand-off is read in nutrient mode even if compare was stored', () => {
    const html = render({ view: 'bodyMap', bm_mode: 'compare', bm_nutrient: 'plate', bm_plate: ['carbs', 'iron'] });
    expect(html).toContain('Where your plate goes');
    expect(html).not.toContain('data-nutrition-bm-compare="true"');
  });

  it('the Energy module offers the body-map hand-off', () => {
    const html = render({ view: 'energyBalance', em_tab: 'distribution' });
    expect(html).toContain('data-nutrition-energy-to-body="true"');
    expect(html).toContain('See these shares on the body');
  });
});

describe('kit legibility: darkened accents and a light-pinned substrate', () => {
  // These two mechanisms took the Nutrition Kit from 235 light / 485 dark axe
  // contrast violations to 0 / 0. Both fail silently if reverted: the accents
  // would still render (just unreadable) and the palette pin is one CSS rule
  // nobody would miss until a dark-theme student opened the kit.
  const nlInk = (() => {
    const start = nut.indexOf('  var _nlInkCache = {};');
    const end = nut.indexOf('\n  }\n', nut.indexOf('function nlInk(hex)')) + 4;
    expect(start, 'nlInk source').toBeGreaterThan(-1);
    // eslint-disable-next-line no-new-func
    return new Function(nut.slice(start, end) + '\nreturn nlInk;')();
  })();

  const luminance = (hex) => {
    const ch = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  };
  const ratio = (fg, bg) => {
    const a = luminance(fg);
    const b = luminance(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  // The kit's category palette, read from the source so a new category is covered.
  const accents = (() => {
    const start = nut.indexOf("    var categories = [\n      { id: 'all'");
    expect(start, 'kit category palette').toBeGreaterThan(-1);
    const end = nut.indexOf('\n    ];', start);
    return [...nut.slice(start, end).matchAll(/color: '(#[0-9a-f]{6})'/g)].map((m) => m[1]);
  })();

  it('every kit accent, darkened, is readable on its own pale tint', () => {
    expect(accents.length).toBeGreaterThanOrEqual(13);
    for (const accent of accents) {
      const ink = nlInk(accent);
      // The real grounds are the accent at ~7% over white; #e7f3f2 was the
      // darkest measured, so it is the case the threshold has to clear.
      expect(ratio(ink, '#e7f3f2'), accent + ' -> ' + ink).toBeGreaterThanOrEqual(4.5);
      expect(ratio(ink, '#ffffff'), accent + ' -> ' + ink + ' on white').toBeGreaterThanOrEqual(4.5);
    }
  });

  it('an accent that already passes is left alone, and junk is passed through', () => {
    expect(nlInk('#0f172a')).toBe('#0f172a');
    expect(nlInk('var(--allo-stem-text)')).toBe('var(--allo-stem-text)');
    expect(nlInk(null)).toBe(null);
  });

  it('the tool pins the themed palette light on its own root', () => {
    // The STEM host renders tools on a WHITE card even in dark theme, so themed
    // ink with no self-painted ground is light-on-light.
    expect(nut).toContain("'[data-nutritionlab-root] {'");
    expect(nut).toContain("'  --allo-stem-text-soft: #475569;'");
    // ★ The pin used to be written `html:not(.theme-contrast) [data-...]`, which
    // excluded nothing: `theme-${theme}` is stamped on <main>, never on <html>,
    // so the light pin also covered the contrast theme's black canvas and the
    // tool's own title measured 1.4:1 there. The real exclusion is a
    // .theme-contrast rule that wins on specificity — assert THAT.
    expect(nut).toContain("'.theme-contrast [data-nutritionlab-root] {'");
    expect(nut).toContain("'  --allo-stem-text: #ffff00;'");
    expect(nut).not.toContain("'html:not(.theme-contrast) [data-nutritionlab-root] {'");
    // Every view has to sit inside that root, or the pin covers only some of them.
    expect(nut).toContain("return h('div', { 'data-nutritionlab-root': 'true' }, __nlBody);");
    expect(nut).toContain('var __nlBody = (function () {');
  });
});
