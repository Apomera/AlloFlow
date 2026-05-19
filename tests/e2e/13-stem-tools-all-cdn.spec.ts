import { test, expect } from '@playwright/test';

/**
 * Verify every STEM Lab tool's CDN module is reachable + serves valid JS.
 * 104 tools — one test per tool.
 */
const STEM_TOOLS = [
  'a11yauditor', 'algebraCAS', 'allobotsage', 'anatomy', 'angles',
  'applab', 'aquaculture', 'aquarium', 'archstudio', 'areamodel',
  'artstudio', 'assessmentliteracy', 'astronomy', 'atctower', 'autorepair',
  'bakingscience', 'beehive', 'behaviorlab', 'bikelab', 'birdlab',
  'brainatlas', 'bridgelab', 'calculus', 'cell', 'cephalopodlab',
  'chembalance', 'circuit', 'climateExplorer', 'coding', 'companionplanting',
  'coordgrid', 'cyberdefense', 'dataplot', 'datastudio', 'decomposer',
  'dissection', 'dna', 'echolocation', 'echotrainer', 'economicslab',
  'ecosystem', 'epidemic', 'evolab', 'fireecology', 'firstresponse',
  'fisherlab', 'flightsim', 'fractions', 'funcgrapher', 'galaxy',
  'gamestudio', 'geo', 'geometryworld', 'geosandbox', 'graphcalc',
  'inequality', 'kitchenlab', 'learning_lab', 'lifeskills', 'llm_literacy',
  'logiclab', 'manipulatives', 'microbiology', 'migration', 'molecule',
  'money', 'moonmission', 'multtable', 'music', 'numberline',
  'nutritionlab', 'optics', 'oratory', 'pets', 'physics',
  'platetectonics', 'playlab', 'printingpress', 'probability', 'punnett',
  'raptorhunt', 'renewables', 'roadready', 'rocks', 'schoolbehaviortoolkit',
  'semiconductor', 'singing', 'skatelab', 'solarsystem', 'spacecolony',
  'spaceexplorer', 'statslab', 'stewardship', 'swimlab', 'throwlab',
  'titration', 'typingpractice', 'unitconvert', 'universe', 'volume',
  'watercycle', 'wave', 'weldlab', 'worldbuilder',
];

test.describe('Every STEM Lab tool CDN file is reachable + valid', () => {
  for (const id of STEM_TOOLS) {
    test(`stem_tool_${id}.js`, async ({ request }) => {
      const url = `https://alloflow-cdn.pages.dev/stem_lab/stem_tool_${id}.js`;
      const resp = await request.get(url);
      expect(resp.ok(), `${id}: HTTP ${resp.status()}`).toBeTruthy();
      const body = await resp.text();
      expect(body.length, `${id}: too small (${body.length} bytes)`).toBeGreaterThan(500);
      // Sanity: looks like JS
      expect(/window\.StemLab|registerTool|React|createElement|module/i.test(body), `${id}: doesn't look like a STEM tool`).toBeTruthy();
    });
  }
});
