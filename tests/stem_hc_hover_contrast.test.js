import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Contrast theme, real mouse hover. The host paints a hovered button #00ff00 with black ink
// (app_styles_module.js, `.theme-contrast button:hover`, specificity 0,2,1). A tool's own contrast rule
// (generated or hand-written) usually out-ranks that for the fill, so the fill stayed black while the host
// still made the ink black: black on black. Each tool below re-asserts the host's hover look over its own
// rules. Only a browser can read the pixels (C:\tmp\stem_engage_2026-11-04\round4\hover\sweep.cjs), so this
// checks that the rules are present and that they can only act on hover.
// HC_SCOPE_DIR points this at another copy of the files.
const DIR = process.env.HC_SCOPE_DIR || path.join(process.cwd(), 'stem_lab');

const FIXED = {
  'stem_tool_accesslens.js': 'accessLens',
  'stem_tool_anatomy.js': 'anatomy',
  'stem_tool_angles.js': 'protractor',
  'stem_tool_aquarium.js': 'aquarium',
  'stem_tool_arccity.js': 'arccity',
  'stem_tool_archstudio.js': 'archStudio',
  'stem_tool_areamodel.js': 'areamodel',
  'stem_tool_artstudio.js': 'artStudio',
  'stem_tool_autorepair.js': 'autoRepair',
  'stem_tool_beehive.js': 'beehive',
  'stem_tool_behaviorlab.js': 'behaviorLab',
  'stem_tool_bikelab.js': 'bikeLab',
  'stem_tool_birdlab.js': 'birdLab',
  'stem_tool_brainatlas.js': 'brainAtlas',
  'stem_tool_calculus.js': 'calculus',
  'stem_tool_cell.js': 'cell',
  'stem_tool_cellatlas.js': 'cellAtlasLab',
  'stem_tool_cellular.js': 'cellularLab',
  'stem_tool_circuit.js': 'circuit',
  'stem_tool_coding.js': 'codingPlayground',
  'stem_tool_companionplanting.js': 'companionPlanting',
  'stem_tool_coordgrid.js': 'coordinate',
  'stem_tool_decomposer.js': 'decomposer',
  'stem_tool_dissection.js': 'dissection',
  'stem_tool_dna.js': 'dnaLab',
  'stem_tool_economicslab.js': 'economicsLab',
  'stem_tool_fireecology.js': 'fireEcology',
  'stem_tool_fisherlab.js': 'fisherLab',
  'stem_tool_flightsim.js': 'flightSim',
  'stem_tool_galaxy.js': 'galaxy',
  'stem_tool_gamestudio.js': 'gameStudio',
  'stem_tool_geometryworld.js': 'geometryWorld',
  'stem_tool_heatlab.js': 'heatLab',
  'stem_tool_inequality.js': 'inequality',
  'stem_tool_lifeskills.js': 'lifeSkills',
  'stem_tool_llm_literacy.js': 'llmLiteracy',
  'stem_tool_machinelab.js': 'machineLab',
  'stem_tool_magnetism.js': 'magnetism',
  'stem_tool_manipulatives.js': 'base10',
  'stem_tool_migration.js': 'migration',
  'stem_tool_money.js': 'moneyMath',
  'stem_tool_music.js': 'musicSynth',
  'stem_tool_nutritionlab.js': 'nutritionLab',
  'stem_tool_physics.js': 'physics',
  'stem_tool_platetectonics.js': 'plateTectonics',
  'stem_tool_playlab.js': 'playlab',
  'stem_tool_punnett.js': 'punnett',
  'stem_tool_solarsystem.js': 'solarSystem',
  'stem_tool_sourcebook.js': 'sourcebook',
  'stem_tool_spacecolony.js': 'spaceColony',
  'stem_tool_spaceexplorer.js': 'spaceExplorer',
  'stem_tool_spacestation.js': 'spaceStation',
  'stem_tool_statslab.js': 'statsLab',
  'stem_tool_titration.js': 'titrationLab',
  'stem_tool_trajectorycomputing.js': 'trajectoryComputing',
  'stem_tool_treelab.js': 'treeLab',
  'stem_tool_typingpractice.js': 'typingPractice',
  'stem_tool_volume.js': 'volume',
  'stem_tool_watercycle.js': 'waterCycle',
  'stem_tool_weathersystems.js': 'weatherSystems',
};

const CHAIN = ':not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h)';

// Every double-quoted style text in the file that holds a hover rule.
const hoverRules = (src) => src.split('\n').filter((line) => line.includes('#hc-h') && line.includes('st.textContent')).flatMap((line) => {
  const a = line.indexOf('"'), b = line.lastIndexOf('"');
  return JSON.parse(line.slice(a, b + 1)).split('}').filter((r) => r.includes('#hc-h'));
});

describe.each(Object.entries(FIXED))('hovered buttons in %s', (file, shellId) => {
  const src = fs.readFileSync(path.join(DIR, file), 'utf8');
  const rules = hoverRules(src);
  const SCOPE = `.theme-contrast [data-stem-tool-shell="${shellId}"] button:hover${CHAIN}`;

  it('re-asserts the host green fill and black ink over the tool\'s own rules', () => {
    const own = rules.find((r) => r.startsWith(SCOPE + '{'));
    expect(own, 'no hover rule for this shell').toBeTruthy();
    expect(own).toContain('background-color:#00ff00!important');
    expect(own).toContain('background-image:none!important');
    expect(own).toContain('color:#000!important');
  });

  it('makes everything inside black, and turns inner text-bearing fills green but keeps empty swatches', () => {
    expect(rules.some((r) => r.startsWith(SCOPE + ' *{') && r.includes('color:#000!important'))).toBe(true);
    const fill = rules.find((r) => r.startsWith(SCOPE + ' *:not(:empty)'));
    expect(fill, 'no inner-fill rule').toBeTruthy();
    expect(fill).toContain('background-color:#00ff00!important');
    expect(fill).toContain('svg *');
  });

  it('acts only on hover and leaves the selected ring and the focus ring to the host', () => {
    for (const r of rules) {
      expect(r.startsWith('.theme-contrast [data-stem-tool-shell=') && r.includes(' button:hover' + CHAIN), r.slice(0, 120)).toBe(true);
      expect(/box-shadow|outline|border/.test(r), r.slice(-120)).toBe(false);
    }
  });
});

describe.each([['stem_tool_gisstudio.js', 'gisStudio'], ['stem_tool_geo.js', 'geoQuiz']])('Leaflet zoom buttons in %s', (file, shellId) => {
  it('are black with yellow ink at rest and green with black ink on hover (were yellow on white, 1.07:1)', () => {
    const src = fs.readFileSync(path.join(DIR, file), 'utf8');
    const S = `.theme-contrast [data-stem-tool-shell=\\"${shellId}\\"] .leaflet-bar a`;
    expect(src.includes(`${S}{background:#000!important;color:#ffff00!important`)).toBe(true);
    expect(src.includes(`${S}:hover{background:#00ff00!important;color:#000!important`)).toBe(true);
  });
});

describe('brainAtlas selected view button', () => {
  it('leaves the shadow to the host ring (its own white stripe out-ranked the ring, so it read like its peers)', () => {
    const src = fs.readFileSync(path.join(DIR, 'stem_tool_brainatlas.js'), 'utf8');
    expect(src.includes('box-shadow:inset 4px 0 0 #fff!important')).toBe(false);
  });
});

describe('the check itself', () => {
  it('reads rules from a generated style line', () => {
    const line = 'st.textContent = ' + JSON.stringify(`.theme-contrast [data-stem-tool-shell="x"] button:hover${CHAIN}{color:#000!important}.a{color:red}`) + ';';
    expect(hoverRules(line)).toHaveLength(1);
  });

  it('lists at least one tool', () => {
    expect(Object.keys(FIXED).length).toBeGreaterThan(0);
  });
});
