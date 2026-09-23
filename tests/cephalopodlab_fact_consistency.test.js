// Cephalopod Lab — cross-section fact consistency.
//
// This tool states the same numbers in many places: the glossary, the facts
// pool, SKIN_ANATOMY, the world-records table, quiz explanations, the
// Camouflage Lab primer and several teaching cards all describe the same
// animal. Nothing kept them in agreement, and two had drifted apart:
//
//   * each arm's ganglion held "~40 million neurons" in the glossary and
//     "~50 million neurons" in the facts pool. The tool's own totals settle
//     it — ~500M overall, ~170M central, so ~330M across eight arms — and
//     8 x 50M would overshoot the stated total.
//   * cuttlefish chromatophore density was "~250 per mm²" in five places
//     (two of them citing Hanlon & Messenger 2018) and "~200 per square mm"
//     in two uncited ones.
//
// A contradiction like this is worse than a plain error: whichever sentence a
// student reads first is the one they will carry, and the disagreement is
// invisible unless you read the whole 22,000-line file at once. These tests
// pin the agreement, not the truth of any figure — if a number is wrong, fix
// it everywhere and update the expectation in one place here.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = 'stem_lab/stem_tool_cephalopodlab.js';
const DEPLOY = 'desktop/web-app/public/stem_lab/stem_tool_cephalopodlab.js';
const src = readFileSync(SOURCE, 'utf8');

describe('Cephalopod Lab repeated facts agree with each other', () => {
  it('states one arm-ganglion neuron count, consistent with the stated totals', () => {
    // every mention of neurons in a single arm ganglion
    const perArm = Array.from(src.matchAll(/ganglion[^.]{0,60}?~?(\d+) million neurons/gi)).map((m) => Number(m[1]));
    expect(perArm.length).toBeGreaterThan(0);
    expect(new Set(perArm).size).toBe(1);
    const each = perArm[0];
    // and it must square with the tool's own total and central-brain figures
    expect(src).toMatch(/~500 million neurons/);
    expect(src).toMatch(/~?170 ?[Mm]/);
    expect(each * 8 + 170).toBeLessThanOrEqual(520);
    expect(each * 8 + 170).toBeGreaterThanOrEqual(480);
  });

  it('states one cuttlefish chromatophore density', () => {
    const densities = Array.from(src.matchAll(/(\d+) (?:chromatophores )?per (?:square mm|mm²|square millimet)/gi)).map((m) => Number(m[1]));
    expect(densities.length).toBeGreaterThan(3);
    // a stated range is allowed to mention its lower bound, so ignore 100
    const headline = densities.filter((n) => n !== 100);
    expect(new Set(headline).size).toBe(1);
    expect(headline[0]).toBe(250);
  });

  it('states one number of hearts, and the same split between them', () => {
    expect(src).not.toMatch(/(two|2) hearts/i);
    const branchial = Array.from(src.matchAll(/(two|2) branchial hearts/gi));
    expect(branchial.length).toBeGreaterThan(0);
    // "three hearts" and "one systemic" must both be present and never contradicted
    expect(src).toMatch(/(three|3) hearts/i);
    expect(src).not.toMatch(/(two|three|3) systemic hearts/i);
  });

  it('keeps the two live copies byte-identical', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(src);
  });
});

describe('Cephalopod Lab species datasets do not contradict each other', () => {
  // SPECIES (field guide) and CONSERVATION_STATUS are keyed differently
  // (giantPac vs giantPacific, blueRing vs blueRinged ...), so they are matched
  // on the scientific name — the one field both datasets agree on.
  const fgSeg = src.slice(src.indexOf('  var SPECIES = ['), src.indexOf('var HABITATS'));
  const species = Array.from(fgSeg.matchAll(/\{ id: '([A-Za-z]+)', name: '([^']*)', scientific: '([^']*)'[\s\S]*?conservation: '([^']*)'/g))
    .map((m) => ({ id: m[1], name: m[2], sci: m[3], cons: m[4] }));
  const csStart = src.indexOf('var CONSERVATION_STATUS = {');
  const records = Array.from(src.slice(csStart, csStart + 20000).matchAll(/\n {8}([A-Za-z]+): \{\n\s*species: '([^']*)',\n\s*iucn: '([^']*)'/g))
    .map((m) => ({ key: m[1], species: m[2], iucn: m[3] }));

  it('reads both datasets', () => {
    expect(species.length).toBe(15);
    expect(records.length).toBe(12);
  });

  it('never presents a non-IUCN word as an IUCN category', () => {
    // "Threatened" is not a Red List category and CITES is a trade listing, not
    // a status. The nautilus entry used to conflate the two.
    const VALID = /Least Concern|Near Threatened|Vulnerable|Endangered|Critically Endangered|Data Deficient|Not Evaluated|Not (formally )?assessed/;
    species.forEach((sp) => {
      if (/\bThreatened\b/.test(sp.cons)) {
        // only allowed as part of "Near Threatened"
        expect(sp.cons).toMatch(/Near Threatened/);
      }
      if (/IUCN/.test(sp.cons)) expect(sp.cons).toMatch(VALID);
    });
  });

  it('agrees with the IUCN record wherever a species has one', () => {
    const findRecord = (sp) => {
      const genus = sp.sci.split(' ')[0];
      return records.find((r) => r.species.indexOf(sp.sci) === 0)
        || records.find((r) => genus && r.species.indexOf(genus + ' spp.') === 0)
        || null;
    };
    const matched = species.map((sp) => ({ sp, rec: findRecord(sp) })).filter((x) => x.rec);
    // most of the guide should resolve to a record; if this drops, the two
    // datasets have drifted apart again
    expect(matched.length).toBeGreaterThanOrEqual(11);
    matched.forEach(({ sp, rec }) => {
      const head = rec.iucn.split(' ')[0];
      if (head === 'Least') expect(sp.cons).toMatch(/Least Concern/);
      if (head === 'Not') expect(sp.cons).toMatch(/Not (formally )?(assessed|Evaluated)/i);
      if (head === 'Vulnerable') expect(sp.cons).toMatch(/Vulnerable/);
    });
  });
});

describe('Cephalopod Lab species join', () => {
  const aliasSeg = src.slice(src.indexOf('var SPECIES_RECORD_ID = {'), src.indexOf('  var SPECIES = ['));
  const alias = Object.fromEntries(Array.from(aliasSeg.matchAll(/\n\s{4}([A-Za-z]+): '([A-Za-z]+)'/g)).map((m) => [m[1], m[2]]));
  const fgSeg = src.slice(src.indexOf('  var SPECIES = ['), src.indexOf('var HABITATS'));
  const fgIds = Array.from(fgSeg.matchAll(/\{ id: '([A-Za-z]+)', name: '/g)).map((m) => m[1]);
  const ddSeg = src.slice(src.indexOf('var SPECIES_DEEP_DIVES = {'), src.indexOf('var CONSERVATION_STATUS'));
  const ddKeys = Array.from(ddSeg.matchAll(/\n {8}([A-Za-z]+): \{\n\s*species: /g)).map((m) => m[1]);
  const csSeg = src.slice(src.indexOf('var CONSERVATION_STATUS = {'), src.indexOf('var CONSERVATION_STATUS = {') + 20000);
  const csKeys = Array.from(csSeg.matchAll(/\n {8}([A-Za-z]+): \{\n\s*species: /g)).map((m) => m[1]);

  it('maps only real field-guide species', () => {
    expect(Object.keys(alias).length).toBeGreaterThanOrEqual(11);
    Object.keys(alias).forEach((fgId) => expect(fgIds).toContain(fgId));
  });

  it('every mapped target exists in both of the datasets it joins', () => {
    Object.values(alias).forEach((recordId) => {
      expect(ddKeys, 'deep dive missing ' + recordId).toContain(recordId);
      expect(csKeys, 'conservation record missing ' + recordId).toContain(recordId);
    });
  });

  it('does not silently drop a species that has a record under another key', () => {
    // an unmapped field-guide species must genuinely have no record, otherwise
    // the join is incomplete and the two datasets can drift again
    const unmapped = fgIds.filter((id) => !alias[id]);
    unmapped.forEach((id) => {
      expect(ddKeys, id + ' has a deep dive but no alias').not.toContain(id);
      expect(csKeys, id + ' has a conservation record but no alias').not.toContain(id);
    });
  });
});

describe('Cephalopod Lab data accents stay readable as text', () => {
  // Several datasets carry a period or event colour — deep Triassic browns, the
  // sky blue of a glaciation. Those are fine as a band fill with white on top,
  // but used directly as TEXT on this tool's dark ground they collapse: the
  // Triassic heading measured 1.88:1. axe cannot see it, because the root
  // paints a gradient and axe reports gradient-backed text as unmeasurable, so
  // this pins the rule in source instead.
  const textSites = [
    /color: clReadableInk\(era\.color\)/,
    /color: clReadableInk\(ext\.color\)/,
    /color: clReadableInk\(stage\.color\)/,
  ];

  it('routes every data colour used as heading text through the ink helper', () => {
    textSites.forEach((re) => expect(src).toMatch(re));
    // and no raw data colour is used as text at those sites any more
    expect(src).not.toMatch(/fontWeight: 900, color: era\.color/);
    expect(src).not.toMatch(/fontWeight: 900, color: ext\.color[^)]/);
    expect(src).not.toMatch(/fontWeight: 900, color: stage\.color/);
  });

  it('lifts a dark accent to a readable ink and leaves a light one alone', () => {
    // reimplement the helper's contract to check its stated behaviour
    const GROUND = [16, 24, 45];
    const lum = (rgb) => {
      const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratio = (rgb) => (Math.max(lum(rgb), lum(GROUND)) + 0.05) / (Math.min(lum(rgb), lum(GROUND)) + 0.05);
    const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    // the Triassic brown is the colour that failed at 1.88:1
    expect(ratio(hexToRgb('#7c2d12'))).toBeLessThan(2.5);
    // the helper must aim above the 4.5 line, since the real ground measures
    // lighter than a naive constant
    expect(src).toMatch(/var want = minRatio \|\| 5\.2;/);
    expect(src).toMatch(/var GROUND = \[16, 24, 45\];/);
  });
});

describe('Cephalopod Lab entry headings never use a raw data colour', () => {
  // Culture myths, art works and dishes each carry an identity colour. Two of
  // them (#0c4a6e, #dc2626) measured 1.87:1 and 3.63:1 when used as the entry
  // heading on this tool's dark card — invisible to axe because the root is a
  // gradient. Every such heading goes through the ink helper now.
  it('routes culture entry names through the ink helper', () => {
    expect(src).not.toMatch(/fontWeight: 800, color: m\.color \}/);
    expect(src).not.toMatch(/fontWeight: 800, color: a\.color \}/);
    expect(src).toMatch(/fontWeight: 800, color: clReadableInk\(m\.color\)/);
    expect(src).toMatch(/fontWeight: 800, color: clReadableInk\(a\.color\)/);
  });

  it('does not hardcode slate-500 as body text on the dark ground', () => {
    // #64748b measured ~3.68:1 here; the tool pins its own soft ink to #94a3b8
    const asText = Array.from(src.matchAll(/color: '#64748b'/g));
    // the only remaining uses are disabled-control states, not prose
    asText.forEach((m) => {
      const around = src.slice(Math.max(0, m.index - 160), m.index + 60);
      expect(around).toMatch(/disabled|qIdx === 0|active \?/);
    });
  });
});

describe('Cephalopod Lab lesson plans can actually be run', () => {
  // The pressure-and-depth lesson asks students to "record: max depth they
  // descended". The sim tracked verticalY frame to frame but never kept the
  // deepest point, so that number could not be read off the end-of-dive
  // summary and the lesson step was not runnable as written.
  it('tracks the deepest point of a dive and reports it at the end', () => {
    expect(src).toMatch(/deepestY: 0\.55/);
    expect(src).toMatch(/if \(gameState\.verticalY < gameState\.runStats\.deepestY\) gameState\.runStats\.deepestY = gameState\.verticalY;/);
    expect(src).toMatch(/statCard\('Deepest', formatDepthM\(rs\.deepestY\)/);
  });

  // The same lesson teaches "1 atm per 10 m of depth" and asks students to
  // "calculate the pressure at 1000 m, 3000 m, and 7000 m" and then check
  // their answers against "simulator behavior". The HUD used to print the raw
  // scene unit as metres, so the deepest reachable point read "45m" next to a
  // zone card claiming "Hadal zone, 4000m+", and there was nothing to check
  // against. Depth is now reported in the real metres each zone claims, with
  // the hydrostatic pressure beside it.
  it('reports depth in real metres and the pressure that goes with it', () => {
    // Every zone declares the real depth band its description already states.
    // Contiguous: each zone starts where the one above it ended, or the HUD
    // depth reads backwards at the boundary (the behavioural test below
    // sweeps the whole column to prove it never does).
    ['realMinM: 0, realMaxM: 5', 'realMinM: 5, realMaxM: 30',
     'realMinM: 30, realMaxM: 1000', 'realMinM: 1000, realMaxM: 4000',
     'realMinM: 4000, realMaxM: 7000'].forEach((frag) => {
      expect(src).toContain(frag);
    });
    // Pressure follows the rule the warm-up demonstrates: 1 atm of air + 1 per 10 m.
    expect(src).toMatch(/return 1 \+ realDepthFor\(y\) \/ 10;/);
    // and both reach the player, in the live HUD and the end-of-dive summary.
    expect(src).toContain("formatDepthM(gameState.verticalY) + 'm · ' + pressureAtmFor(gameState.verticalY).toFixed(0) + ' atm");
    expect(src).toMatch(/statCard\('Pressure there', pressureAtmFor\(rs\.deepestY\)/);
  });

  // Pressure damage was a flat 8 HP/s that began the instant a shallow species
  // crossed into the deep zone, with no flash, no caption, no sound and no HUD
  // row. Health just fell, indistinguishable from a bite the student never saw.
  it('warns before pressure damage and signals it while it happens', () => {
    // A warning band above crush depth that costs no health.
    expect(src).toContain('var PRESSURE_WARN_BAND_M = 400;');
    expect(src).toMatch(/realM > crushM - PRESSURE_WARN_BAND_M/);
    // Damage is graded by how far past crush depth you are, not a cliff.
    expect(src).toMatch(/var pDmg = 3 \+ over \* 11;/);
    // and it announces itself on every channel the sim uses for damage.
    expect(src).toContain("pushCaption(__alloT('stem.cephalopodlab.caption_pressure_crushing'");
    expect(src).toContain("clAnnounce(__alloT('stem.cephalopodlab.sr_crushing_pressure'");
    expect(src).toContain('CRUSHING PRESSURE —');
    expect(src).toContain('PRESSURE BUILDING —');
    // Deep-adapted species stay exempt — that contrast is the lesson's point.
    expect(src).toMatch(/var crushM = isDeepSpecies\(species\.id\) \? Infinity : CRUSH_DEPTH_M;/);
  });

  it('reports the other quantities its lesson plans ask students to record', () => {
    // prey caught by type, time survived and predator damage are all asked for
    // by the camouflage and food-web lessons
    ["statCard('Crabs'", "statCard('Fish'", "statCard('Clams'", "statCard('Bites taken'"].forEach((frag) => {
      expect(src).toContain(frag);
    });
    expect(src).toMatch(/elapsedSec \+ 's survived/);
  });
});

describe('Cephalopod Lab shows labels, not data keys', () => {
  // Comparative tables build column headings from row keys. Capitalising only
  // the first letter left camelCase intact, so a reader saw "SameOrDifferent".
  it('humanises a multi-word key rather than only capitalising it', () => {
    expect(src).toMatch(/function clHumaniseKey\(key\)/);
    expect(src).toMatch(/borderBottom: '2px solid rgba\(167,139,250,0\.4\)' \} \}, clHumaniseKey\(k\)\)/);
    expect(src).not.toMatch(/\} \}, k\.charAt\(0\)\.toUpperCase\(\) \+ k\.slice\(1\)\)/);
  });

  it('leaves no camelCase key reaching a table heading', () => {
    // every key used as a heading in COMPARATIVE_TABLES
    const seg = src.slice(src.indexOf('COMPARATIVE_TABLES'), src.indexOf('COMPARATIVE_TABLES') + 14000);
    const keys = new Set(Array.from(seg.matchAll(/([a-z][a-zA-Z]*): '/g)).map((m) => m[1]));
    const camel = Array.from(keys).filter((k) => /[a-z][A-Z]/.test(k));
    // these exist in the data and must be rendered readably, not hidden
    expect(camel.length).toBeGreaterThan(0);
    const humanise = (key) => String(key)
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/^./, (ch) => ch.toUpperCase());
    expect(humanise('sameOrDifferent')).toBe('Same or different');
    expect(camel.every((k) => !/[a-z][A-Z]/.test(humanise(k)))).toBe(true);
  });

  it('applies the same treatment to the sample-data tables, and keeps abbreviations', () => {
    // these tables printed the raw key with no transform at all
    expect(src).toMatch(/borderBottom: '2px solid rgba\(167,139,250,0\.4\)' \} \}, clHumaniseKey\(k\)\);/);
    // "sd" is an abbreviation, not a word: humanising it to "Sd" reads worse
    expect(src).toMatch(/var CL_KEY_ABBREV = \{ sd: 'SD'/);
  });
});

// The tests above pin the source text. These RUN the depth model, by lifting
// the real DEPTH_ZONES table and the real conversion functions out of the
// file and evaluating them, so a change to the numbers has to keep the
// behaviour the lesson plans depend on rather than just keep the wording.
describe('Cephalopod Lab depth model behaves the way its lessons assume', () => {
  // Lift the zone table + conversions straight out of the tool source. If the
  // shape ever changes these throw, which is the point — a silent skip here
  // would let the model drift away from the prose that describes it.
  const zonesSrc = src.slice(src.indexOf('var DEPTH_ZONES = {'), src.indexOf('function depthZoneFor(y)'));
  const fnsSrc = src.slice(src.indexOf('function depthZoneFor(y)'), src.indexOf('function isDeepSpecies'));
  // __alloT is the i18n wrapper; inside the table it only wraps display names.
  const harness = 'var __alloT = function (k, fallback) { return fallback; };\n'
    + zonesSrc + fnsSrc
    + '\nreturn { DEPTH_ZONES: DEPTH_ZONES, depthZoneFor: depthZoneFor, realDepthFor: realDepthFor, pressureAtmFor: pressureAtmFor, formatDepthM: formatDepthM };';
  // eslint-disable-next-line no-new-func
  const model = new Function(harness)();

  const CRUSH_DEPTH_M = Number(/var CRUSH_DEPTH_M = (\d+);/.exec(src)[1]);
  const WARN_BAND_M = Number(/var PRESSURE_WARN_BAND_M = (\d+);/.exec(src)[1]);
  // The descent speed a non-deep species actually moves at (Q/Z handling).
  const SHALLOW_VERT_SPEED = 2.5;

  it('declares depth bands that join up, deepest zone to shallowest', () => {
    // Derived from the table itself rather than restated here, so this keeps
    // holding if the numbers change for a good reason.
    const order = ['surface', 'reef', 'midwater', 'deep', 'abyssal'];
    for (let i = 1; i < order.length; i += 1) {
      const above = model.DEPTH_ZONES[order[i - 1]];
      const here = model.DEPTH_ZONES[order[i]];
      expect(here.realMinM).toBe(above.realMaxM);
      // and the scene-Y bands have to meet too, or depthZoneFor leaves a hole.
      expect(here.maxY).toBe(above.minY);
    }
  });

  it('starts the dive on the reef, not in midwater', () => {
    // The octopus rests at y = 0.55 just above a seafloor at y ~ 0, and
    // gameState declares currentDepthZone: 'reef' at that altitude.
    const spawnY = Number(/verticalY: ([\d.]+),/.exec(src)[1]);
    expect(model.depthZoneFor(spawnY)).toBe('reef');
    expect(src).toMatch(/currentDepthZone: 'reef'/);
    // and the reef is a shallow, safe, breathable-looking number.
    expect(model.realDepthFor(spawnY)).toBeLessThan(50);
  });

  it('agrees with the "1 atm per 10 m" rule the warm-up demonstrates', () => {
    // Surface is one atmosphere of air and nothing else.
    expect(model.pressureAtmFor(20)).toBeCloseTo(1, 5);
    // and every depth adds exactly one atm per 10 m on top of that.
    [-1, -5, -8, -14, -20, -33, -45].forEach((y) => {
      expect(model.pressureAtmFor(y)).toBeCloseTo(1 + model.realDepthFor(y) / 10, 6);
    });
  });

  it('can actually reach the depths the formative check asks students to compute', () => {
    // "Calculate the pressure at 1000 m, 3000 m, and 7000 m." All three have
    // to be somewhere in the playable column or the step cannot be checked.
    [1000, 3000, 7000].forEach((target) => {
      let reached = false;
      for (let y = 18; y >= -45; y -= 0.01) {
        if (Math.abs(model.realDepthFor(y) - target) < 25) { reached = true; break; }
      }
      expect(reached).toBe(true);
    });
    // and the driver question's "300 atmospheres" is reachable too.
    expect(model.pressureAtmFor(-45)).toBeGreaterThan(300);
  });

  it('never reports a depth that goes backwards as you descend', () => {
    // A student reading the HUD while holding Z must see the number rise
    // monotonically; a zone boundary that overlaps would make it stutter.
    let prev = -Infinity;
    for (let y = 18; y >= -45; y -= 0.05) {
      const d = model.realDepthFor(y);
      expect(d).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = d;
    }
  });

  it('gives the player a readable warning before pressure starts hurting', () => {
    // Sweep the column and measure how long the warning band lasts at the
    // speed a shallow species descends. A band that flicks past in a fraction
    // of a second is a cliff with a label on it, not a warning.
    let warnUnits = 0;
    const step = 0.005;
    for (let y = 18; y >= -45; y -= step) {
      const d = model.realDepthFor(y);
      if (d > CRUSH_DEPTH_M - WARN_BAND_M && d <= CRUSH_DEPTH_M) warnUnits += step;
    }
    const warnSeconds = warnUnits / SHALLOW_VERT_SPEED;
    expect(warnSeconds).toBeGreaterThan(1.0);
  });

  it('leaves the reef and the surface completely safe', () => {
    // Nothing a student does in the habitat the tool is actually about
    // should cost health to depth.
    for (let y = 18; y >= -1; y -= 0.05) {
      expect(model.realDepthFor(y)).toBeLessThan(CRUSH_DEPTH_M - WARN_BAND_M);
    }
  });

  it('formats deep readouts without implying false precision', () => {
    // Past 1000 m the column is compressed enough that single metres are
    // noise; the readout rounds to 10 m there but stays exact up top.
    expect(model.formatDepthM(-20)).toBe('4000');
    expect(Number(model.formatDepthM(-20)) % 10).toBe(0);
    expect(model.formatDepthM(0.55)).toBe(model.realDepthFor(0.55).toFixed(0));
  });
});

// The sim states in five places — glossary, Q&A, escape-tactics card, the
// controls card ("crawl ... oxygen-cheap") and a graded quiz citing O'Dor 1988
// + Bartol 2010 — that jetting is ~5x more expensive than crawling. The hunger
// drain was a flat 1.6/s regardless of behaviour, so jetting cost stamina but
// never a calorie: the headline simulation contradicted the number it grades
// students on, and nothing in the run summary let anyone notice.
describe('Cephalopod Lab charges the metabolic cost it teaches', () => {
  const BASAL = Number(/var BASAL_HUNGER_RATE = ([\d.]+);/.exec(src)[1]);
  const CRAWL = Number(/var CRAWL_LOCOMOTION_RATE = ([\d.]+);/.exec(src)[1]);
  const MULT = Number(/var JET_COST_MULTIPLIER = (\d+);/.exec(src)[1]);

  // Mirror of the drain the loop computes, kept in terms of the real constants.
  const rateFor = (mode) => BASAL + (mode === 'jet' ? CRAWL * MULT : mode === 'crawl' ? CRAWL : 0);

  it('uses the multiplier the quiz marks correct', () => {
    // The quiz's correct option and its explanation both say 5x.
    expect(src).toContain("'5x more expensive'), correct: true");
    expect(MULT).toBe(5);
  });

  it('applies the multiplier to locomotion, not to basal metabolism', () => {
    // Scaling the whole drain would charge basal metabolism five times over.
    const jetLocomotion = rateFor('jet') - BASAL;
    const crawlLocomotion = rateFor('crawl') - BASAL;
    expect(jetLocomotion / crawlLocomotion).toBeCloseTo(MULT, 6);
  });

  it('leaves ordinary crawling balanced exactly as it was', () => {
    // The tool shipped a flat 1.6/s for years; crawling play must not change.
    expect(rateFor('crawl')).toBeCloseTo(1.6, 6);
  });

  it('makes holding still cheaper than moving, which is what camo play needs', () => {
    expect(rateFor('rest')).toBeLessThan(rateFor('crawl'));
    expect(rateFor('crawl')).toBeLessThan(rateFor('jet'));
  });

  it('still leaves a jetting dive survivable', () => {
    // Stamina (100 max, 45/s drain, 18/s regen) caps sustained jetting at a
    // ~29% duty cycle. At that mix a full belly has to last long enough to
    // cross the reef and catch something, or the cost is a punishment rather
    // than a trade-off. Crabs refill 15-30.
    const duty = (100 / 45) / ((100 / 45) + (100 / 18));
    const mixed = rateFor('jet') * duty + rateFor('crawl') * (1 - duty);
    const seconds = 100 / mixed;
    expect(seconds).toBeGreaterThan(35);
    expect(seconds).toBeLessThan(63);   // and it must genuinely cost something
  });

  it('exempts the fin-propelled dumbo octopus, as its own description claims', () => {
    // "lowest energy cost per movement" — it would be a contradiction to bill
    // it the squid's jet premium.
    expect(src).toContain("lowest energy cost per movement");
    expect(src).toMatch(/if \(isJetting && species\.specialAbility === 'finPropulsion'\) \{\s*\n\s*locomotionCost = CRAWL_LOCOMOTION_RATE;/);
  });

  it('bills turning as movement, so the two HUD rows cannot disagree', () => {
    // `isMoving` is translation OR turning — the same predicate that resets
    // stationaryTime and that the substrate row prints as "still"/"moving".
    // Billing only moveFwd would print "moving" and "resting 1.0 cal/s" on
    // the same frame while the player turns in place.
    expect(src).toMatch(/var isMoving = moveFwd !== 0 \|\| turn !== 0;/);
    expect(src).toMatch(/else if \(isMoving\) locomotionCost = CRAWL_LOCOMOTION_RATE;/);
    expect(src).toContain('gameState.isMovingOnFloor = isMoving;');
    // and the substrate row still keys off the same stationaryTime it always did
    expect(src).toContain("gameState.stationaryTime > 0.5 ? ' · still' : ' · moving'");
  });

  it('shows the burn rate live and reports the budget at the end', () => {
    // A cost the player cannot see is just a bar draining faster for no reason.
    expect(src).toContain("hungerRateHud.toFixed(1) + ' cal/s'");
    expect(src).toMatch(/statCard\('Time jetting'/);
    expect(src).toMatch(/statCard\('Calories burned'/);
    expect(src).toMatch(/jetMs: 0,/);
    expect(src).toMatch(/caloriesBurned: 0,/);
  });
});

// A carried/dropped shelter is meant to work as a den: the tool's own
// shelter cards advertise a camo bonus and "ambush from the shelter", and
// coconut-octopus tool use is one of the headline biology facts. The shelter
// block set gameState.inDen, but the authoritative den scan further down the
// same frame resets that flag before the HUD and half the predators read it.
// The result was a shelter that warded off the shark and the zone predators
// (which run BEFORE the reset) but not the grouper or the moray (which run
// after), while the HUD never said "IN DEN" at all.
describe('Cephalopod Lab shelters count as dens for everything, not just some things', () => {
  it('records shelter cover in its own flag rather than one that gets reset', () => {
    // Writing gameState.inDen at the shelter site is the bug; it must set a
    // flag that survives the later scan.
    expect(src).toContain('gameState.inShelterDen = nearAnyShelterDen;');
    expect(src).not.toMatch(/if \(nearAnyShelterDen && !gameState\.inDen\) \{\s*\n\s*gameState\.inDen = true;/);
  });

  it('folds shelter cover into the same flag every consumer reads', () => {
    // The HUD, the regen, and all four predator families read gameState.inDen.
    expect(src).toContain('if (gameState.inShelterDen) gameState.inDen = true;');
  });

  it('keeps a real den stronger than an improvised shelter', () => {
    expect(src).toMatch(/var _denRegen = gameState\.inDen \? 12 : \(gameState\.inShelterDen \? 8 : 0\);/);
  });

  it('regenerates once per frame, never twice', () => {
    // Two regen sites that can both fire in one frame would silently double
    // the rate for anyone standing in a shelter inside a den.
    const regenSites = src.match(/gameState\.health = Math\.min\(gameState\.maxHealth, gameState\.health \+ [^)]*\* dt\)/g) || [];
    // den regen is now a single site driven by _denRegen; the other legitimate
    // site is the separate mimic/rest recovery block.
    expect(regenSites.some((s) => s.includes('_denRegen'))).toBe(true);
    expect(regenSites.filter((s) => /\+ (8|12) \* dt/.test(s)).length).toBe(0);
  });
});

// Ink used to work two incompatible ways. The grouper and the moray gated
// attack INITIATION on `!gameState.isInked` — total immunity — while the shark
// and the zone predators merely halved their detection range and never broke
// off a charge at all. So the defence was absolute against two predators and
// close to worthless against the one that hits hardest (45 damage), and the
// HUD announced "predators can't see you" over the top of both behaviours.
// Derby 2007/2014, which this tool cites five times, describe a cloud that
// degrades vision and chemoreception and may even draw a predator toward it.
describe('Cephalopod Lab ink degrades detection instead of switching it off', () => {
  it('routes every predator through one shared factor', () => {
    expect(src).toContain('var INK_DETECTION_FACTOR = 0.5;');
    // All four families read the same constant rather than a private number.
    const uses = (src.match(/INK_DETECTION_FACTOR/g) || []).length;
    expect(uses).toBeGreaterThanOrEqual(5);   // 1 declaration + >=4 call sites
  });

  it('no longer gates attack initiation on being inked', () => {
    // These were the immunity checks. Their absence is the fix.
    expect(src).not.toMatch(/grDist < grEffectiveRange && !gameState\.isInked/);
    expect(src).not.toMatch(/mDistHome < morayEffectiveRange && !gameState\.isInked/);
    // and both now fold ink into the range calculation instead.
    expect(src).toMatch(/grEffectiveRange = gr\.aggroRange[\s\S]{0,200}?gameState\.isInked \? INK_DETECTION_FACTOR/);
    expect(src).toMatch(/morayEffectiveRange = me\.aggroRange[\s\S]{0,200}?gameState\.isInked \? INK_DETECTION_FACTOR/);
  });

  it('lets ink break off a charge from the hard hitters too', () => {
    // The shark's charge ignored ink entirely, so the pseudomorph escape the
    // glossary describes did not exist against it.
    expect(src).toMatch(/if \(gameState\.inDen \|\| gameState\.isInked \|\| sk\.stateTimer > 4\)/);
    expect(src).toMatch(/if \(gameState\.inDen \|\| zpInkEscapes \|\| zpud\.stateTimer > 4\.5\)/);
  });

  it('keeps the two hunters it already models as ink-resistant resistant', () => {
    // zpInkMod 0.6 marks these two; the escape must respect that rather than
    // handing ink a blanket win and flattening the depth-zone contrast.
    expect(src).toMatch(/zpInkMod = \(zpud\.kind === 'spermWhale' \|\| zpud\.kind === 'giantSquid'\) \? 0\.6/);
    expect(src).toMatch(/zpInkEscapes = gameState\.isInked &&\s*\n\s*zpud\.kind !== 'spermWhale' && zpud\.kind !== 'giantSquid';/);
  });

  it('stops telling the player ink makes them unseeable', () => {
    expect(src).not.toMatch(/predators can.{0,2}t see you/);
    expect(src).toContain('INKED — harder to track, breaks off attacks');
  });
});

// The ink HUD said "recharging Ns" and the screen reader said "Ink
// recharging", but nothing in the file ever increments inkReserves — the 8s
// window only gates when the NEXT dot may be spent. Once all three were gone
// the row read "depleted" for the rest of the dive. The mechanic matches the
// tool's own cited biology (Derby 2014: "3-5 squirts per refill cycle
// (~30 days)"), so the labels were the thing that was wrong.
describe('Cephalopod Lab ink labels describe the mechanic that exists', () => {
  it('never claims a reserve recharges', () => {
    // Nothing refills a reserve, so no label may promise one.
    expect(src).not.toMatch(/recharging/);
    expect(src).not.toMatch(/Ink recharging/);
  });

  it('still has exactly one place that spends a reserve and none that grants one', () => {
    expect((src.match(/gameState\.inkReserves--/g) || []).length).toBe(1);
    expect(src).not.toMatch(/inkReserves\+\+/);
    expect(src).not.toMatch(/inkReserves = gameState\.inkReserves \+/);
    expect(src).not.toMatch(/inkReserves \+= /);
  });

  it('names what the 8s window actually is, and says the sac will not refill', () => {
    expect(src).toContain('refilling siphon ');
    expect(src).toContain('sac empty — no refill this dive');
    expect(src).toContain('Siphon refilling — ');
    expect(src).toContain('Ink sac empty. It does not refill during a dive.');
  });

  it('tells the player up front, on the controls card, that ink is finite', () => {
    // The card used to read "3 charges, 8s cooldown between", which reads as
    // a regenerating resource.
    expect(src).not.toContain('Ink defense — 3 charges');
    expect(src).toMatch(/Ink — 3 per dive, 8s between\..*never comes back mid-dive/);
  });

  it('keeps the two species the tool says do not ink unable to ink', () => {
    expect(src).toMatch(/canInk = species\.id !== 'dumboOcto' && species\.id !== 'vampireSquid'/);
  });
});

// detectSubstrate samples X/Z only, so substrate camouflage used to work
// identically whether the animal lay on the sand or hovered 40 m up in open
// water. That contradicts this tool's own taxonomy, which separates
// background matching (benthic, needs something behind you) from
// counter-illumination (the open-water answer, modelled on the bobtail squid).
describe('Cephalopod Lab background matching needs a background', () => {
  const FLOOR = Number(/var FLOOR_REST_Y = ([\d.]+);/.exec(src)[1]);
  const FADE = Number(/var SUBSTRATE_CAMO_FADE_M = ([\d.]+);/.exec(src)[1]);
  const contact = (y) => Math.max(0, 1 - Math.abs(y - FLOOR) / FADE);

  it('gives full substrate camo to an animal resting on the floor', () => {
    // The spawn altitude is the resting altitude; normal seafloor play must
    // be completely unaffected by this rule.
    const spawnY = Number(/verticalY: ([\d.]+),/.exec(src)[1]);
    expect(spawnY).toBe(FLOOR);
    expect(contact(spawnY)).toBe(1);
  });

  it('fades the substrate component out in BOTH directions', () => {
    // Descending into open water leaves the substrate behind just as surely
    // as rising above it. A one-sided clamp would keep full camo all the way
    // down to the abyssal floor.
    expect(src).toContain('var distFromFloor = Math.abs(gameState.verticalY - FLOOR_REST_Y);');
    expect(contact(FLOOR + FADE)).toBe(0);
    expect(contact(FLOOR - FADE)).toBe(0);
    expect(contact(-20)).toBe(0);
  });

  it('multiplies it into camoEff rather than replacing the other factors', () => {
    expect(src).toMatch(/camoEff = matchScore \* stillnessBonus \* species\.camoQualityMul \* substrateContact;/);
  });

  it('leaves counter-illumination working in open water', () => {
    // The bobtail squid's ventral glow is exactly the open-water answer, so
    // it must be added AFTER the substrate fade, not scaled by it.
    const fadeAt = src.indexOf('* substrateContact;');
    const ciAt = src.indexOf("species.specialAbility === 'counterIllumination'");
    expect(fadeAt).toBeGreaterThan(0);
    expect(ciAt).toBeGreaterThan(fadeAt);
    expect(src).toMatch(/camoEff = Math\.min\(1, gameState\.camoEff \+ 0\.5 \* gameState\.counterIlluminationActive\)/);
  });

  it('keeps the reef floor generous enough to still play the camo game', () => {
    // Crabs sit at floor level, so hunting must not be penalised. Require a
    // comfortable band of near-full contact around the resting altitude.
    expect(contact(FLOOR + 1)).toBeGreaterThan(0.6);
    expect(contact(FLOOR - 1)).toBeGreaterThan(0.6);
  });

  it('tells the player why camo dropped instead of just sagging the bar', () => {
    expect(src).toContain('off the bottom — nothing behind you to match');
    // and the shell species gets its own explanation rather than a dead 0%.
    expect(src).toContain('shell — no chromatophores, camo cannot rise');
    expect(src).toMatch(/species\.camoQualityMul === 0/);
  });
});


// The Field Guide ships a PREY table with calories and a difficulty rating,
// and the 3D sim hands out hunger and score for catching the same animals.
// Nothing kept the two in agreement and they had inverted: the clam is the
// SMALLEST meal (60 cal) and the EASIEST catch (difficulty 2) in the table,
// but the sim paid it the most hunger (50) AND the most score (3) of any
// prey, while the crab paid the least. A student who reads the Field Guide
// and then plays the sim gets opposite answers about what is worth hunting.
// These tests read BOTH tables out of the source and compare them, rather
// than restating either set of numbers here.
describe('Cephalopod Lab sim payouts agree with the Field Guide prey table', () => {
  // --- the taught table ---
  const taught = {};
  const preyRe = /\{ id: '(crab|fish|clam)', name: '[^']*', emoji: '[^']*', difficulty: (\d+), calories: (\d+),/g;
  for (let m = preyRe.exec(src); m; m = preyRe.exec(src)) {
    taught[m[1]] = { difficulty: Number(m[2]), calories: Number(m[3]) };
  }

  // --- what the sim actually pays ---
  const crabTypes = {};
  const crabRe = /(rock|red|hermit):\s+\{ score: (\d+), hunger: (\d+),/g;
  for (let m = crabRe.exec(src); m; m = crabRe.exec(src)) {
    crabTypes[m[1]] = { score: Number(m[2]), hunger: Number(m[3]) };
  }
  const clamPay = /gameState\.score \+= (\d+);\s*\n\s*gameState\.hunger = Math\.min\(gameState\.maxHunger, gameState\.hunger \+ (\d+)\);/;
  const payouts = [...src.matchAll(new RegExp(clamPay.source, 'g'))]
    .map((m) => ({ score: Number(m[1]), hunger: Number(m[2]) }));

  it('reads both tables out of the source', () => {
    // If these ever stop matching, the tests below would silently pass on an
    // empty set. Fail loudly instead.
    ['crab', 'fish', 'clam'].forEach((k) => expect(taught[k]).toBeTruthy());
    ['rock', 'red', 'hermit'].forEach((k) => expect(crabTypes[k]).toBeTruthy());
    expect(payouts.length).toBeGreaterThanOrEqual(2);
  });

  it('teaches fish > crab > clam by calories, and pays them in that order', () => {
    expect(taught.fish.calories).toBeGreaterThan(taught.crab.calories);
    expect(taught.crab.calories).toBeGreaterThan(taught.clam.calories);

    const fish = payouts.find((p) => p.hunger === 50);
    const clam = payouts.find((p) => p.hunger === 30);
    expect(fish).toBeTruthy();
    expect(clam).toBeTruthy();

    const crabHungers = Object.values(crabTypes).map((c) => c.hunger);
    const crabAvg = crabHungers.reduce((a, b) => a + b, 0) / crabHungers.length;

    expect(fish.hunger).toBeGreaterThan(crabAvg);
    expect(crabAvg).toBeGreaterThan(clam.hunger);
  });

  it('pays hunger as the taught calories halved, for every prey', () => {
    // One scale, derived from the table, rather than three invented numbers.
    const fish = payouts.find((p) => p.hunger === 50);
    const clam = payouts.find((p) => p.hunger === 30);
    expect(fish.hunger).toBe(taught.fish.calories / 2);
    expect(clam.hunger).toBe(taught.clam.calories / 2);
    // the crab's three varieties straddle its taught value
    const crabTarget = taught.crab.calories / 2;
    const hungers = Object.values(crabTypes).map((c) => c.hunger);
    expect(Math.min(...hungers)).toBeLessThanOrEqual(crabTarget);
    expect(Math.max(...hungers)).toBeGreaterThanOrEqual(crabTarget);
  });

  it('scores by how hard the prey is to catch, not by how big it is', () => {
    expect(taught.fish.difficulty).toBeGreaterThan(taught.crab.difficulty);
    expect(taught.crab.difficulty).toBeGreaterThan(taught.clam.difficulty);

    const fish = payouts.find((p) => p.hunger === 50);
    const clam = payouts.find((p) => p.hunger === 30);
    const crabScores = Object.values(crabTypes).map((c) => c.score);

    expect(fish.score).toBeGreaterThan(Math.min(...crabScores));
    expect(Math.min(...crabScores)).toBeGreaterThan(clam.score);
  });

  it('stops advertising the clam as the jackpot', () => {
    expect(src).not.toContain('big calorie payoff');
    expect(src).not.toContain('Pays out big calorie reward');
    expect(src).toContain('small but reliable meal');
  });
});

// ── Deep time ──
// The first cephalopod was "~530 MYA" in ten places, once as "~530 MYA (Late
// Cambrian)" although the Late Cambrian starts ~497 Ma (Plectronoceras is
// upper Jiangshanian, ~494-490 Ma). Pohlsepia was the "earliest octopus" at
// 150, ~300 and ~296 MYA in different sections; Clements et al. 2026 moved it
// to the nautiloids. The octopus/squid split was ~200, ~330 and ~400 MYA.
// Period bounds below are the ICS chart (Ma), not a claim of this tool.
describe('Cephalopod Lab deep-time dates agree with each other and with the named period', () => {
  const ICS = {
    Cambrian: [538.8, 485.4], 'Early Cambrian': [538.8, 506.5], 'Middle Cambrian': [506.5, 497], 'Late Cambrian': [497, 485.4],
    Ordovician: [485.4, 443.8], 'Early Ordovician': [485.4, 470], 'Middle Ordovician': [470, 458.4], 'Late Ordovician': [458.4, 443.8],
    Silurian: [443.8, 419.2],
    Devonian: [419.2, 358.9], 'Early Devonian': [419.2, 393.3], 'Middle Devonian': [393.3, 382.7], 'Late Devonian': [382.7, 358.9],
    Carboniferous: [358.9, 298.9], Permian: [298.9, 251.9],
    Triassic: [251.9, 201.4], 'Early Triassic': [251.9, 247.2], 'Middle Triassic': [247.2, 237], 'Late Triassic': [237, 201.4],
    Jurassic: [201.4, 145], 'Early Jurassic': [201.4, 174.7], 'Middle Jurassic': [174.7, 161.5], 'Late Jurassic': [161.5, 145],
    Cretaceous: [145, 66], 'Early Cretaceous': [145, 100.5], 'Late Cretaceous': [100.5, 66],
    Eocene: [56, 33.9], today: [0, 0],
  };
  // "Ordovician-Devonian", "Devonian to today", "End-Permian ...", "K-Pg boundary"
  const span = (name) => {
    const end = /^End-(\w+)/.exec(name);
    if (end && ICS[end[1]]) return [ICS[end[1]][1], ICS[end[1]][1]];
    if (/^K-Pg/.test(name)) return [66, 66];
    const clean = name.replace(/\s+extinction$/, '');
    const parts = clean.split(/\s*-\s*|\s+to\s+/);
    const a = ICS[parts[0]], b = ICS[parts[parts.length - 1]];
    return a && b ? [a[0], b[1]] : null;
  };
  const dated = () => {
    const out = [];
    for (const m of src.matchAll(/id: '([a-z0-9_-]+)'[^\n]*?era: '([^']+)', age: '([^']+)'/g)) out.push({ what: m[1], period: m[2], date: m[3] });
    for (const m of src.matchAll(/date: '([^']+)',\s*\n\s*period: '([^']+)',\s*\n\s*event: '([^']+)'/g)) out.push({ what: m[3], period: m[2], date: m[1] });
    return out;
  };

  it('puts every dated fossil and timeline event inside the period it names', () => {
    const items = dated();
    expect(items.length).toBeGreaterThan(20);
    let checked = 0;
    for (const it of items) {
      const years = /^~?\s*(\d{4})/.test(it.date);            // CE years: "2017", "~1880-1990"
      if (years || /^(Present|Modern)/.test(it.period)) continue;
      const sp = span(it.period);
      expect(sp, it.what + ': unknown period ' + it.period).not.toBeNull();
      const m = /~?\s*([\d.]+)(?:\s*-\s*([\d.]+))?\s*MYA/.exec(it.date);
      expect(m, it.what + ': no MYA date in ' + it.date).not.toBeNull();
      const [old, young] = [Number(m[1]), Number(m[2] || m[1])];
      // "~" allows a few million years either side of the chart boundary
      expect(old, it.what + ' ' + it.date + ' vs ' + it.period).toBeLessThanOrEqual(sp[0] + 3);
      expect(young, it.what + ' ' + it.date + ' vs ' + it.period).toBeGreaterThanOrEqual(sp[1] - 3);
      checked++;
    }
    expect(checked).toBeGreaterThan(14);
  });

  it('dates the first cephalopods the same way everywhere', () => {
    const strings = Array.from(src.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)).map((m) => m[1]);
    const about = strings.filter((t) => /Plectronoceras|first cephalopod|earliest cephalopod|oldest cephalopod|cephalopod fossil record|branching history of cephalopods|Cambrian ancestor/i.test(t));
    const dates = new Set();
    // the FIRST date in each string: one sentence also dates the (later) octopuses
    about.forEach((t) => { const m = /(\d{3})[- ](?:MYA|million)/.exec(t); if (m) dates.add(Number(m[1])); });
    expect(about.filter((t) => /(\d{3})[- ](?:MYA|million)/.test(t)).length).toBeGreaterThanOrEqual(6);
    // record + node + fossil card carry the date in a separate field: include them
    for (const m of src.matchAll(/(?:holder: 'Plectronoceras', value|node: 'Cephalopoda',\s*\n\s*age|id: 'plectronoceras'[^\n]*?age): '~(\d{3}) MYA/g)) dates.add(Number(m[1]));
    for (const m of src.matchAll(/date: '~(\d{3}) MYA',\s*\n\s*period: '[^']+',\s*\n\s*event: 'First cephalopods appear'/g)) dates.add(Number(m[1]));
    expect(dates.size, [...dates].join(', ')).toBe(1);
    const [d] = [...dates];
    expect(d).toBeLessThanOrEqual(ICS['Late Cambrian'][0] + 3);
    expect(d).toBeGreaterThanOrEqual(ICS['Late Cambrian'][1]);
  });

  it('gives one date range for the octopus/squid split', () => {
    const node = (name) => Number(new RegExp("node: '" + name + " \\(split ~(\\d+) MYA\\)'").exec(src)[1]);
    expect(node('Octopodiformes')).toBe(node('Decapodiformes'));
    const ranges = [/split occurred in the Permian or Triassic, roughly (\d+)-(\d+) MYA/, /~(\d+)-(\d+) MYA \(octopus and squid lineages split/]
      .map((re) => { const m = re.exec(src); expect(m, String(re)).not.toBeNull(); return [Number(m[1]), Number(m[2])]; });
    expect(ranges[0]).toEqual(ranges[1]);
    const [old, young] = ranges[0];
    expect(node('Octopodiformes')).toBeLessThanOrEqual(old);
    expect(node('Octopodiformes')).toBeGreaterThanOrEqual(young);
    expect(src).not.toMatch(/split occurred ~330 MYA|Coleoidea diverged into octopus \+ decapods/);
  });

  it('never calls Pohlsepia the earliest octopus without saying it was reclassified', () => {
    const strings = Array.from(src.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)).map((m) => m[1]);
    // A claim can sit on a neighbouring line of the same entry (Through Time
    // puts the name in `highlight` and the claim in `after`), so read each
    // mention with two lines either side.
    const L = src.split('\n');
    const at = L.map((l, i) => (/Pohlsepia/.test(l) ? i : -1)).filter((i) => i >= 0);
    expect(at.length).toBeGreaterThan(4);
    const claim = /(earliest|first|oldest)\s+(known\s+)?octopus|Pohlsepia is the (earliest|first|oldest)/i;
    at.forEach((i) => {
      const win = L.slice(Math.max(0, i - 2), i + 3).join('\n');
      if (claim.test(win)) expect(win, L[i].trim().slice(0, 140)).toMatch(/reclassif|nautiloid/i);
    });
    expect(strings.some((t) => /Clements et al\., 2026/.test(t))).toBe(true);
  });
});
