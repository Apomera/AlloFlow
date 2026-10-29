import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// WCAG 1.4.3 in the high-contrast theme: the app forces text in STEM tools to #ffff00, so a
// tool panel that keeps its own light background (class CSS or inline style) fails at ~1.1:1.
// Each tool below carries a generated .theme-contrast block, scoped to its own host shell, that
// turns its light panels black and its dark inks yellow. HC_SCOPE_DIR points the check at
// another copy of the files (used to confirm the check fails on the pre-fix backups).
const DIR = process.env.HC_SCOPE_DIR || path.join(process.cwd(), 'stem_lab');
const TOOLS = ['applab', 'dissection', 'evolab', 'trajectorycomputing', 'watercycle', 'dna', 'cellatlas', 'cell', 'microbiology', 'galaxy',
  'companionplanting', 'llm_literacy', 'fisherlab', 'accesslens', 'climateExplorer', 'fractions', 'areamodel', 'unitconvert', 'arithmetic',
  'astronomy', 'coordgrid', 'epidemic', 'brainatlas', 'dinolab', 'atctower', 'echotrainer', 'kitchenlab', 'fireecology', 'numberline', 'oratory',
  'punnett', 'singing', 'behaviorlab', 'consciousness', 'dataplot', 'economicslab', 'lifeskills', 'nuclearlab', 'optics', 'pets',
  'schoolbehaviortoolkit', 'spacecolony', 'statslab', 'typingpractice', 'worldbuilder', 'geo', 'magnetism', 'birdlab', 'bridgelab'];

// Hand-written blocks (gradient-button and panel flips from the Oct 28 gradient-text pass): no generated
// ink flip, but every selector must still stay inside .theme-contrast and the tool's own shell.
const SMALL_BLOCKS = ['angles', 'calculus', 'circuitshelf', 'coding', 'datalab', 'funcgrapher', 'gamestudio', 'inequality', 'logiclab',
  'manipulatives', 'money', 'semiconductor', 'solarsystem', 'volume', 'wave'];

// Hand-targeted rules (authored ink restored over the forced yellow; °F/°C toggle cue kept).
const TARGETED = {
  brainatlas: ':is(.brainatlas-stim-preset-symbol,.brainatlas-stim-compare-symbol){color:#fff!important}',
  magnetism: ' .mag-material-magnet span{color:#fff!important}',
  dinolab: ' .dinolab-survey-layer:is([style*="background: rgb(156, 114, 68)"]){color:#000!important}',
  kitchenlab: '> span[style^="opacity: 1;"]{text-decoration:underline!important',
};
const blockCss = (tool) => {
  const file = fs.existsSync(path.join(DIR, `stem_tool_${tool}.js`)) ? path.join(DIR, `stem_tool_${tool}.js`) : path.join(DIR, `public_stem_tool_${tool}.js`);
  const m = /st\.id = 'allo-[\w]+-hc-css';\s*st\.textContent = ("(?:[^"\\]|\\.)*");/.exec(fs.readFileSync(file, 'utf8'));
  return m ? JSON.parse(m[1]) : '';
};

describe('STEM high-contrast targeted rules', () => {
  for (const [tool, rule] of Object.entries(TARGETED)) {
    it(`${tool} keeps its targeted high-contrast rule`, () => {
      expect(blockCss(tool).includes(rule), `${tool}: missing ${rule}`).toBe(true);
    });
  }
});

describe('STEM high-contrast theme scope', () => {
  for (const tool of TOOLS) {
    it(`${tool} injects a high-contrast block scoped to its own shell`, () => {
      const file = fs.existsSync(path.join(DIR, `stem_tool_${tool}.js`)) ? path.join(DIR, `stem_tool_${tool}.js`) : path.join(DIR, `public_stem_tool_${tool}.js`);
      const src = fs.readFileSync(file, 'utf8');
      const id = /registerTool\(\s*['"]([^'"]+)['"]/.exec(src)[1];
      const m = /st\.id = 'allo-([\w]+)-hc-css';\s*st\.textContent = ("(?:[^"\\]|\\.)*");/.exec(src);
      expect(m, `${tool}: no allo-${tool}-hc-css block`).not.toBeNull();
      expect(m[1]).toBe(tool);
      const css = JSON.parse(m[2]);
      const scope = `.theme-contrast [data-stem-tool-shell="${id}"]`;
      const rules = css.split('}').filter(Boolean);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.startsWith(scope)), `${tool}: every rule must start with ${scope}`).toBe(true);
      // every repaint spares text-free swatches (:empty) and media (svg/canvas/video keep their own backdrop)
      const flips = rules.filter((r) => /\{background(-color)?:#000!important$/.test(r));
      // (or, for a tool whose only failures were bright chips, the black-ink-on-chip rule)
      const chipInk = rules.filter((r) => r.endsWith('{color:#000!important'));
      expect(flips.length + chipInk.length, `${tool}: no light-panel flip or chip-ink rule`).toBeGreaterThan(0);
      expect(flips.every((r) => r.includes(':not(:empty):not(svg,canvas,video,iframe,object){')), `${tool}: a repaint is missing the swatch/media guard`).toBe(true);
      expect(css.includes('{color:#ffff00!important'), `${tool}: no ink flip`).toBe(true);
    });
  }
});

describe('STEM hand-written high-contrast blocks stay scoped', () => {
  // Split a selector list on top-level commas only (keeps :is(a,b) and :not(a,b) whole).
  const selectors = (list) => { const out = []; let depth = 0, cur = ''; for (const ch of list) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch; } return out.concat(cur.trim()).filter(Boolean); };
  for (const tool of SMALL_BLOCKS) {
    it(`${tool} scopes every high-contrast selector to its own shell`, () => {
      const src = fs.readFileSync(path.join(DIR, `stem_tool_${tool}.js`), 'utf8');
      const id = /registerTool\(\s*['"]([^'"]+)['"]/.exec(src)[1];
      const m = /st\.id = 'allo-([\w]+)-hc-css';\s*st\.textContent = ("(?:[^"\\]|\\.)*");/.exec(src);
      expect(m, `${tool}: no allo-${tool}-hc-css block`).not.toBeNull();
      expect(m[1]).toBe(tool);
      const scope = `.theme-contrast [data-stem-tool-shell="${id}"]`;
      const rules = JSON.parse(m[2]).split('}').map((r) => r.trim()).filter(Boolean);
      expect(rules.length).toBeGreaterThan(0);
      const stray = rules.flatMap((r) => selectors(r.slice(0, r.indexOf('{')))).filter((s) => !s.startsWith(scope));
      expect(stray, `${tool}: selectors outside ${scope}`).toEqual([]);
    });
  }
});
