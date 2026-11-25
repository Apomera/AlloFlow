// Fire Ecology, sports-labs pass round 10 (2026-11-24): last source pass + light-color pass.
// 1. Named claims: chaparral smoke cue (Keeley and Pausas 2016: nitrogen dioxide, karrikins, more than one chemical),
//    black-backed woodpecker (Hutto 2008; FEIS), savanna "Without both" (Archibald 2005; Bond 2005), Black Summer smoke
//    (NOAA), longleaf "every few years" and its practices (Fowler and Konopik 2007), the grade 3-5 intro, and every
//    ecosystem fire interval (FEIS, NPS, van Wilgen 2000, NSW NPWS).
// 2. Whole-file sweep items: jack pine cones 60 C (FEIS), fire poppy / eucalyptus-oil quiz keys, fire facts.
// 3. Light theme: the pale SVG labels and the Studied / Explored marks go through feInk() and clear 4.5:1.
// Fail-first: FE_FILE=C:/tmp/sports_labs_1123/fireecology/start_r9.js runs every block against the round-9 copy.
import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.FE_FILE || 'stem_lab/stem_tool_fireecology.js';
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'fireEcology');
});
const render = (state = {}, ctx = {}) => renderTool('fireEcology', { fireEcology: state }, ctx);
const src = () => fs.readFileSync(FILE, 'utf8');
const code = () => src().split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const unesc = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const nation = (id, ctx) => unesc(render({ tab: 'indigenous', selectedNation: id }, ctx));
const eco = (id, ctx) => unesc(render({ tab: 'ecosystems', selectedEcosystem: id }, ctx));
const kase = (id) => unesc(render({ tab: 'caseStudies', selectedCase: id }));
const practices = (html) => {
  const at = html.indexOf('Key Practices');
  expect(at, 'Key Practices heading').toBeGreaterThan(-1);
  const end = html.indexOf('Fire-Managed Plants', at);
  return [...html.slice(at, end).matchAll(/\u2022<\/span><span>([^<]+)<\/span>/g)].map((m) => m[1]);
};

describe('named claims follow their sources', () => {
  it('chaparral: no "senescent" or "mass germination"; more than one smoke chemical, with Keeley and Pausas', () => {
    const html = eco('chaparral');
    for (const gone of ['senescent', 'mass germination', 'Many species require fire for seed germination']) expect(html).not.toContain(gone);
    expect(html).toContain('nitrogen dioxide from smoke made every seed of whispering bells, a chaparral annual, sprout in a lab test (Keeley and Fotheringham 1997), but some other chaparral plants ignore it (Keeley and Pausas 2016).');
    expect(html).toContain('Most fires here are crown fires that kill or top-kill the shrubs (US Forest Service FEIS).');
    const s = src();
    expect(s).toContain('can generate 100% germination in the chaparral annual');
    expect(s).toContain('karrikin is clearly not the responsible compound');
    expect(s).toContain('mostly stand-replacement crown fire at moderate intervals');
  });
  it('black-backed woodpecker no longer "depends entirely" on burns', () => {
    const c = code();
    expect(c).not.toContain('depends entirely on recent burns');
    expect(c).not.toContain('depends on recently burned forest');
    expect(eco('boreal')).toContain('In western Montana it is very closely tied to severely burned forest (Hutto 2008), though it can also nest and feed in unburned forest (US Forest Service FEIS)');
    const s = src();
    expect(s).toContain('this bird species is extremely specialized on severely burned forests');
    expect(s).toContain('Black-backed woodpeckers may\n        // nest in areas lacking fire or insect outbreaks');
  });
  it('savanna drops "Without both" and the unsourced species; cites Archibald and Bond', () => {
    const html = eco('savanna');
    for (const gone of ['Without both', 'engineers', 'Elephant Grass', 'Protea', 'Secretarybird', 'Termite Mounds', 'within weeks']) expect(html).not.toContain(gone);
    expect(html).toContain('patches they keep grazed short can stop a fire from spreading (Archibald and others 2005)');
    expect(html).toContain('much of the wetter savanna of Africa and South America could grow into forest (Bond and others 2005)');
    const s = src();
    expect(s).toContain('"Persistent heavy grazing can prevent the spread of fire by breaking up the grass layer"');
    expect(s).toContain('"Without fire, closed forests would double from 27% to 56% of vegetated grid cells"');
  });
  it('Black Summer smoke line carries NOAA and drops the unsourced lightning clause', () => {
    const html = kase('blackSummer');
    expect(html).toContain('Smoke crossed the Pacific to South America (NOAA).');
    expect(html).not.toContain('whose lightning started new fires');
    expect(src()).toContain('"is continuing to stream over the region in the form of a grayish haze."');
  });
  it('Southeast nations card follows Fowler and Konopik 2007', () => {
    const html = nation('southeast_nations');
    for (const gone of ['every few years', 'wild strawberries', 'medicinal herbs', 'chiggers', 'Saw palmetto', 'Pitcher plants']) expect(html).not.toContain(gone);
    expect(html).toContain('At Fort Center, Florida, Native Americans used fire to clear gardens, manage grasslands, and keep longleaf pine forests open.');
    const p = practices(html);
    expect(p).toHaveLength(5);
    for (const line of p) expect(line).toMatch(/Fowler and Konopik 2007\)$/);
    expect(src()).toContain('"Native Americans at\n      // Fort Center cleared garden land with fire.');
  });
  it('grade 3-5 intro names its dated record instead of "For thousands of years"', () => {
    const c = code();
    expect(c).not.toContain("'For thousands of years, Indigenous peoples");
    expect(c).toContain('In Tasmania, dated charcoal shows people burning the land about 41,600 years ago (Adeleye and others 2024).');
  });
});

describe('fire return intervals come from named sources', () => {
  const WANT = { longleafPine: '1\u201310 years', chaparral: '30\u201390 years', boreal: '60\u2013150 years', savanna: '3\u20137 years', eucalyptus: '7\u201330 years', tallgrass: '1\u20135 years' };
  it('each card shows its sourced interval', () => {
    for (const [id, txt] of Object.entries(WANT)) expect(eco(id), id).toContain('Fire return interval: ' + txt);
  });
  it('the interval chart reads the same values, names its sources, and no longer says holding fire back always harms', () => {
    const html = unesc(render({ tab: 'ecosystems' }));
    const aria = /aria-label="Fire return intervals by ecosystem, most frequent first\. ([^"]+)"/.exec(html);
    expect(aria).not.toBeNull();
    for (const txt of Object.values(WANT)) expect(aria[1]).toContain(': ' + txt + '.');
    expect(aria[1].indexOf('Tallgrass')).toBeLessThan(aria[1].indexOf('Longleaf'));
    expect(html).toContain('Sources: US Forest Service FEIS (longleaf, chaparral), National Park Service (tallgrass; boreal spruce in central Alaska)');
    expect(html).not.toContain('holding fire back from either one is what causes damage');
    expect(html).toContain('in chaparral, fire coming too often is the bigger threat');
    const s = src();
    expect(s).toContain('"The natural fire\n      // interval is every year to every 5 to 10 years."');
    expect(s).toContain('"In central Alaska, the spruce forest usually\n      // burns every 60 years to 150 years."');
    expect(s).toContain('fires were frequent, occurring every 1-5 years."');
    expect(s).toContain('"mean fire return periods ranged from 2.7 to 7.1 years in the 11\n      // major land systems of the park"');
    expect(s).toContain('"Avoid successive\n      // fires at intervals of < 7 years"; "Avoid fire exclusion for a period of > 30 years"');
  });
});

describe('whole-file sweep', () => {
  it('jack pine cones open above about 60 C (FEIS), not 50 C', () => {
    const c = code();
    expect(c).not.toContain('50\\u00B0C (122\\u00B0F)');
    expect(c.split('about 60\\u00B0C (140\\u00B0F)').length - 1).toBe(2);
    expect(src()).toContain('usually at temperatures in\n      // excess of 140 degrees Fahrenheit (60 deg C)');
  });
  it('smoke chemicals: nitrogen dioxide replaces the unsourced nitric oxide and ethylene cards', () => {
    const html = unesc(render({ tab: 'smokeSeeds' }));
    const c = code();
    expect(c).not.toContain("name: 'Ethylene'");
    expect(c).not.toContain("name: 'Nitric Oxide (NO)'");
    expect(c).not.toContain('works at extremely low amounts');
    expect(c).not.toContain('Seeds may wait decades');
    expect(c).not.toContain('Examples: manzanita, chamise');
    expect(c).toContain('it made every seed of whispering bells, a chaparral annual, sprout in the lab (Keeley and Fotheringham 1997)');
    expect(html.length).toBeGreaterThan(1000);
  });
  it('quiz keys: whispering bells replaces fire poppy; eucalypts survive by resprouting; blueberry fruit timing', () => {
    const s = code();
    const line = (q) => s.split('\n').find((l) => l.includes("{ q: '" + q));
    const choicesOf = (l) => JSON.parse(l.match(/choices: (\[[^\]]+\])/)[1].replace(/"/g, '\\"').replace(/'/g, '"'));
    const check = (q, key) => {
      const l = line(q);
      expect(l, q).toBeTruthy();
      const ch = choicesOf(l);
      const ans = Number(l.match(/answer: (\d)/)[1]);
      expect(ch[ans]).toBe(key);
      expect(Math.max(...ch.map((x) => x.length))).toBeGreaterThan(key.length);
      // every wrong choice has a misconception note keyed by its exact text
      const miss = s.slice(s.indexOf("'" + q + "': {"));
      for (const w of ch.filter((x, i) => i !== ans)) expect(miss.slice(0, 900)).toContain("'" + w + "':");
    };
    check('Which plant is a "fire follower" whose seeds sprout mainly after fire?', 'Whispering Bells');
    check('Many eucalypts survive a fire by:', 'Sprouting from buds hidden under their bark');
    check('Wabanaki people burned blueberry barrens because:', 'Fire prunes old stems so new ones grow and bear fruit');
    expect(s).not.toContain('Eucalyptus trees promote fire by');
    expect(s).not.toContain("'California Fire Poppy'");
    expect(s).not.toContain('a few years after a gentle burn');
  });
  it('fire facts drop the overstated lines and carry sources', () => {
    const c = code();
    for (const gone of ['nests only in young jack pine', 'hundreds to thousands of years later', 'they help it spread: oily leaves', 'costs the US billions of dollars a year', 'Seeds respond to extremely tiny amounts', 'fruits best a few years after', 'the only nesting habitat of the Kirtland']) {
      expect(c, gone).not.toContain(gone);
    }
    expect(c).toContain('more than 3 billion dollars a year in 2021, 2022 and 2023 (National Interagency Fire Center)');
    expect(src()).toContain('2021 "$4,389,000,000"; 2022 "$3,549,000,000"; 2023 "$3,166,300,000"');
  });
});

// WCAG 2.x relative luminance and contrast.
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (c) => { const l = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * l(c[0]) + 0.7152 * l(c[1]) + 0.0722 * l(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const over = (wash, alpha, ground) => rgb(wash).map((v, i) => ground[i] + (v - ground[i]) * alpha);
const LIGHT = ['#ffffff', '#f8fafc', '#e2e8f0'].map(rgb);
const DARK = ['#0f172a', '#1e293b', '#020617'].map(rgb);
const feInkFrom = (s) => {
  const a = s.indexOf('  function feInk(');
  const b = s.indexOf('\n  }\n', a) + 4;
  return new Function(s.slice(a, b) + '; return feInk;')();
};

describe('light and dark: pale SVG labels and the viewed marks reach 4.5:1', () => {
  it('every named SVG label routes through tint()/tintDark()/feInk() at 12 px or more', () => {
    const c = code();
    const keys = ["key: 'd50L'", "key: 'd30L'", "key: 'b70L'", "key: 'cf'", "key: 'sf'", "key: 'runL'", "key: 'fl'", "key: 'fr'", "key: 'd25L'", "key: 'wf' + i", "key: 'bioL'", "key: 'fuelL'"];
    for (const k of keys) {
      const lines = c.split('\n').filter((l) => l.includes('text') && l.includes(k));
      expect(lines.length, k).toBeGreaterThan(0);
      for (const l of lines) {
        expect(l, k).toMatch(/fill: (tint|tintDark|feInk)\(/);
        expect(Number(l.match(/fontSize: ([\d.]+)/)[1]), k).toBeGreaterThanOrEqual(12);
      }
    }
    expect(c).not.toMatch(/fill: '#fca5a5'/);
  });
  it('tint() inks for those labels clear 4.5:1 on light and dark canvas grounds', () => {
    const feInk = feInkFrom(src());
    for (const c of ['#fca5a5', '#fde68a', '#93c5fd', '#fdba74', '#fcd34d', '#94a3b8']) {
      for (const g of LIGHT) expect(ratio(rgb(feInk(c, false, false)), g), c + ' light').toBeGreaterThanOrEqual(4.5);
      for (const g of DARK) expect(ratio(rgb(feInk(c, true, false)), g), c + ' dark').toBeGreaterThanOrEqual(4.5);
    }
    // the run-off label on the fixed grey burned hill (#57534e)
    expect(ratio(rgb(feInk('#fca5a5', true, false, [0x57, 0x53, 0x4e])), [0x57, 0x53, 0x4e])).toBeGreaterThanOrEqual(4.5);
  });
  for (const isDark of [false, true]) {
    it('Studied / Explored marks are 12 px and clear 4.5:1 on their card wash, ' + (isDark ? 'dark' : 'light'), () => {
      const grounds = isDark ? DARK : LIGHT;
      const nat = unesc(render({ tab: 'indigenous', nationsViewed: { san_bushmen: true, sami: true } }, { isDark }));
      const ecoHtml = unesc(render({ tab: 'ecosystems', ecosystemsViewed: { tallgrass: true, boreal: true } }, { isDark }));
      const marks = [...(nat + ecoHtml).matchAll(/data-fe-viewed-mark="([a-z_A-Z]+)" style="font-size:(\d+)px;font-weight:700;color:(#[0-9a-f]{6})/g)];
      expect(marks.length).toBe(4);
      const COLOR = { san_bushmen: '#a16207', sami: '#4338ca', tallgrass: '#854d0e', boreal: '#0369a1' };
      for (const [, id, px, col] of marks) {
        expect(Number(px)).toBeGreaterThanOrEqual(12);
        for (const g of grounds) expect(ratio(rgb(col), over(COLOR[id], 0x18 / 255, g)), id + ' ' + col).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
