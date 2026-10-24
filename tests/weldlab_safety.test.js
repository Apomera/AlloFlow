import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

/**
 * SAFE lane: PPE & Safety (module 7) and Safety + Health (module 19).
 * Pins the numbers a student is taught to act on: lens shades, noise dose,
 * the 35-ft hot-work line, fire-watch times, helplines; the dress-up and
 * floor-plan checkers; the scenario rotation; and that every new state and
 * hostile saved value renders the view it should.
 */
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const src = readFileSync(resolve(process.cwd(), SRC), 'utf8');

function region(startNeedle, endNeedle) {
  const a = src.indexOf(startNeedle);
  const b = src.indexOf(endNeedle, a);
  expect(a, startNeedle).toBeGreaterThan(-1);
  expect(b, endNeedle).toBeGreaterThan(a);
  return src.slice(a, b);
}
const MOD7 = region('// MODULE 7: PPE & SAFETY', '// MODULE 8: CAREER PATHWAYS');
const MOD19 = region('// MODULE 19: SAFETY + HEALTH DEEP-DIVE', '// MODULE 20: WELDING MATH');
const HELPERS = region('// \u27e6lane SAFE:', '// \u27e6/lane SAFE\u27e7');
const MINE = HELPERS + MOD7 + MOD19;

let core;
beforeEach(() => {
  try { delete window.__alloflowWeldLab; } catch (e) { window.__alloflowWeldLab = undefined; }
  resetStemLab();
  loadTool(SRC, 'weldLab');
  core = window.__WeldLabCore;
});
const render = (state) => renderTool('weldLab', { weldLab: state });
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

describe('noise dose (OSHA 1910.95 vs NIOSH REL)', () => {
  const dose = (rows, std) => core.safe2NoiseDose(rows, std).dose;
  it('OSHA: 90 dBA for 8 h and 95 dBA for 4 h are each 100%', () => {
    expect(dose([{ db: 90, h: 8 }], 'osha')).toBeCloseTo(100, 6);
    expect(dose([{ db: 95, h: 4 }], 'osha')).toBeCloseTo(100, 6);
    expect(dose([{ db: 100, h: 2 }], 'osha')).toBeCloseTo(100, 6);
    expect(dose([{ db: 105, h: 1 }], 'osha')).toBeCloseTo(100, 6);
    expect(dose([{ db: 85, h: 8 }], 'osha')).toBeCloseTo(50, 6); // action level
  });
  it('NIOSH: 85 dBA for 8 h and 88 dBA for 4 h are each 100%', () => {
    expect(dose([{ db: 85, h: 8 }], 'niosh')).toBeCloseTo(100, 6);
    expect(dose([{ db: 88, h: 4 }], 'niosh')).toBeCloseTo(100, 6);
    expect(dose([{ db: 91, h: 2 }], 'niosh')).toBeCloseTo(100, 6);
    expect(dose([{ db: 94, h: 1 }], 'niosh')).toBeCloseTo(100, 6);
  });
  it('mixed exposures add as D = 100 x sum(C/T)', () => {
    expect(dose([{ db: 90, h: 4 }, { db: 95, h: 2 }], 'osha')).toBeCloseTo(100, 6);
    expect(dose([{ db: 85, h: 4 }, { db: 88, h: 2 }], 'niosh')).toBeCloseTo(100, 6);
    expect(dose([{ db: 100, h: 1 }, { db: 85, h: 6 }], 'osha')).toBeCloseTo(87.5, 6);
    expect(dose([{ db: 100, h: 1 }, { db: 85, h: 6 }], 'niosh')).toBeCloseTo(475, 6);
  });
  it('TWA matches the criterion at 100% and ignores levels under 80 dBA and junk rows', () => {
    expect(core.safe2NoiseDose([{ db: 90, h: 8 }], 'osha').twa).toBeCloseTo(90, 2);
    expect(core.safe2NoiseDose([{ db: 85, h: 8 }], 'niosh').twa).toBeCloseTo(85, 6);
    // At 200% the TWA sits one exchange step above the criterion.
    expect(core.safe2NoiseDose([{ db: 95, h: 8 }], 'osha').twa).toBeCloseTo(95, 1);
    expect(core.safe2NoiseDose([{ db: 88, h: 8 }], 'niosh').twa).toBeCloseTo(88, 1);
    expect(dose([{ db: 75, h: 8 }], 'niosh')).toBe(0);
    expect(dose([{ db: 'x', h: 2 }, null, { db: 100, h: -1 }], 'osha')).toBe(0);
    expect(dose('nope', 'osha')).toBe(0);
  });
  it('the shown "time per +5 / +3 dB" text is computed, not typed', () => {
    const html = text(render({ view: 'safetyHealth', sh_sect: 'noise' }));
    expect(html).toContain('95 dBA → 4 h, 100 dBA → 2 h, 105 dBA → 1 h');
    expect(html).toContain('88 dBA → 4 h, 91 dBA → 2 h, 94 dBA → 1 h');
    expect(html).toContain('in 15 min');
    expect(html).not.toMatch(/85 dB = 8 hr\. 90 dB = 4 hr/);
  });
});

describe('lens shade selector (OSHA 1910.133(a)(5) + ANSI Z49.1 / AWS F2.2)', () => {
  it('matches the OSHA fact-sheet bands, including the boundaries', () => {
    const s = core.safe2ShadeFor;
    expect([s('smaw', 59).min, s('smaw', 59).sug]).toEqual([7, null]);
    expect([s('smaw', 60).min, s('smaw', 60).sug]).toEqual([8, 10]);
    expect([s('smaw', 160).min, s('smaw', 161).min]).toEqual([8, 10]);
    expect([s('smaw', 400).min, s('smaw', 400).sug]).toEqual([11, 14]);
    expect([s('gmaw', 200).min, s('gmaw', 200).sug]).toEqual([10, 12]);
    expect([s('gmaw', 300).min, s('gmaw', 300).sug]).toEqual([10, 14]);
    expect([s('gtaw', 49).min, s('gtaw', 120).sug, s('gtaw', 151).min]).toEqual([8, 12, 10]);
    expect([s('pac', 350).min, s('pac', 350).sug]).toEqual([9, 12]);
    expect([s('cac', 600).min, s('cac', 600).sug]).toEqual([11, 14]);
    expect([s('ofc', 0.5).min, s('ofc', 0.5).sug, s('ofc', 7).min]).toEqual([3, 4, 5]);
    expect([s('ofw', 0.1).min, s('ofw', 0.125).min, s('ofw', 1).sug]).toEqual([4, 5, 8]);
    expect(s('smaw', 600).beyond).toBe(true);
    expect(s('bogus', 100)).toBeNull();
    expect(s('__proto__', 100)).toBeNull();
    expect(s('gmaw', 'abc')).toBeNull();
  });
  it('minimum and suggested shades never get lighter as current or thickness rises', () => {
    Object.keys(core.SAFE2_SHADE_TABLE).forEach((p) => {
      const t = core.SAFE2_SHADE_TABLE[p];
      const top = t.bands[t.bands.length - 1][0];
      const hi = isFinite(top) ? top : 12;
      let prevMin = 0, prevSug = 0, n = 0;
      for (let v = hi / 400; v <= hi; v += hi / 400) {
        const r = core.safe2ShadeFor(p, v);
        if (!r || r.beyond) continue;
        n++;
        expect(r.min, p + ' @ ' + v).toBeGreaterThanOrEqual(prevMin);
        if (r.sug != null) { expect(r.sug, p + ' @ ' + v).toBeGreaterThanOrEqual(prevSug); expect(r.sug).toBeGreaterThanOrEqual(r.min); prevSug = r.sug; }
        prevMin = r.min;
      }
      expect(n, p).toBeGreaterThan(100);
    });
  });
  it('the Safety + Health eye table is built from the same model', () => {
    const html = text(render({ view: 'safetyHealth', sh_sect: 'eyes' }));
    expect(html).not.toContain('MIG (GMAW) <100A');
    expect(html).toMatch(/MIG \/ flux-core \(GMAW, FCAW\) < 60 A 7 —/);
    expect(html).toMatch(/> 160–250 A 10 12/);
  });
});

describe('dress the welder', () => {
  const CORRECT = {
    migIndoor: ['adfHelmet', 'safetyGlasses', 'frJacket', 'leatherGloves', 'cufflessPants', 'leatherBoots'],
    tigStainless: ['adfHelmet', 'safetyGlasses', 'frJacket', 'leatherGloves', 'cufflessPants', 'leatherBoots'],
    stickGalv: ['adfHelmet', 'safetyGlasses', 'frJacket', 'leatherGloves', 'cufflessPants', 'leatherBoots', 'respirator'],
    overheadStick: ['adfHelmet', 'safetyGlasses', 'leatherJacket', 'leatherGloves', 'cufflessPants', 'leatherBoots', 'frCap', 'earplugs'],
    grinding: ['safetyGlasses', 'faceShield', 'frJacket', 'leatherGloves', 'cufflessPants', 'leatherBoots', 'earplugs'],
    oxyCut: ['helmet5', 'safetyGlasses', 'frJacket', 'leatherGloves', 'cufflessPants', 'leatherBoots']
  };
  const shadeFor = (job) => { const j = core.SAFE2_JOBS.find((x) => x.id === job); return j.proc ? core.safe2ShadeFor(j.proc, j.value).sug : 10; };

  it('the right outfit passes for every job', () => {
    expect(Object.keys(CORRECT).sort()).toEqual(core.SAFE2_JOBS.map((j) => j.id).sort());
    Object.keys(CORRECT).forEach((job) => {
      const r = core.safe2CheckGear(job, CORRECT[job], shadeFor(job));
      expect(r.pass, job + ' ' + JSON.stringify(r)).toBe(true);
    });
  });
  it('flags every distractor, in every job, with its reason', () => {
    const D = core.SAFE2_DISTRACTORS;
    expect(Object.keys(D).sort()).toEqual(['cottonGloves', 'cuffedJeans', 'earbuds', 'polyHoodie', 'sneakers', 'sunglasses']);
    Object.keys(CORRECT).forEach((job) => {
      Object.keys(D).forEach((bad) => {
        const r = core.safe2CheckGear(job, CORRECT[job].concat([bad]), shadeFor(job));
        expect(r.pass, job + '+' + bad).toBe(false);
        expect(r.wrong.map((w) => w.id), job + '+' + bad).toEqual([bad]);
        expect(r.wrong[0].why).toBe(D[bad]);
      });
    });
  });
  it('reports each missing item per job', () => {
    Object.keys(CORRECT).forEach((job) => {
      CORRECT[job].forEach((item) => {
        const r = core.safe2CheckGear(job, CORRECT[job].filter((x) => x !== item), shadeFor(job));
        expect(r.pass, job + ' without ' + item).toBe(false);
        expect(r.missing.length, job + ' without ' + item).toBe(1);
      });
    });
  });
  it('a shade-5 lens fails 200 A MIG but passes oxy-fuel cutting; the ADF is checked at its setting', () => {
    const mig = core.safe2CheckGear('migIndoor', CORRECT.migIndoor.filter((x) => x !== 'adfHelmet').concat(['helmet5']), 10);
    expect(mig.pass).toBe(false);
    expect(mig.wrong).toEqual([{ id: 'helmet5', why: 'tooLight', shade: 5, min: 10 }]);
    expect(mig.missing).toEqual(['eyeFilter']);
    expect(core.safe2CheckGear('oxyCut', CORRECT.oxyCut, 10).pass).toBe(true);
    expect(core.safe2CheckGear('migIndoor', CORRECT.migIndoor, 9).wrong[0]).toMatchObject({ id: 'adfHelmet', why: 'tooLight', min: 10 });
    expect(core.safe2CheckGear('migIndoor', CORRECT.migIndoor, 10).pass).toBe(true);
    expect(core.safe2CheckGear('tigStainless', CORRECT.tigStainless, 8).pass).toBe(true);
    expect(core.safe2CheckGear('tigStainless', CORRECT.tigStainless, 7).pass).toBe(false);
  });
  it('job-specific needs: respirator for galvanized, leather + cap + plugs overhead, face shield for grinding', () => {
    expect(core.safe2CheckGear('stickGalv', CORRECT.migIndoor, 10).missing).toEqual(['respirator']);
    const oh = core.safe2CheckGear('overheadStick', CORRECT.migIndoor, 10);
    expect(oh.missing.sort()).toEqual(['cap', 'hearing', 'leatherTorso']);
    // An ADF helmet in grind mode is face protection; a passive shade-5 lens is not.
    expect(core.safe2CheckGear('grinding', CORRECT.migIndoor, 10).missing).toEqual(['hearing']);
    const g5 = core.safe2CheckGear('grinding', CORRECT.migIndoor.filter((x) => x !== 'adfHelmet').concat(['helmet5']), 10);
    expect(g5.missing.sort()).toEqual(['faceShield', 'hearing']);
    expect(g5.extra).toEqual(['helmet5']);
  });
  it('hostile worn lists and shades do not crash or count junk', () => {
    expect(core.safe2CheckGear('nope', [], 10)).toBeNull();
    expect(core.safe2CheckGear('migIndoor', 'polyHoodie', 'x').wrong).toEqual([]);
    const r = core.safe2CheckGear('migIndoor', [1, null, '__proto__', 'polyHoodie', 'polyHoodie'], NaN);
    expect(r.wrong).toEqual([{ id: 'polyHoodie', why: 'melts' }]);
    expect(r.adfShade).toBe(10);
  });
});

describe('hot-work floor plan', () => {
  const SOLVED = {
    cardboard: { x: 48, y: 12, covered: true }, ragBin: { x: 80, y: 44 }, solventCan: { x: 90, y: 36 }, sawdust: { x: 75, y: 22 },
    curtain: { x: 30, y: 36 }, extinguisher: { x: 40, y: 28 }, fireWatch: { x: 20, y: 20 }, extractor: { x: 33, y: 28 }
  };
  it('the starting shop fails, and the solved shop passes', () => {
    expect(core.safe2CheckPlan(null).pass).toBe(false);
    const r = core.safe2CheckPlan(SOLVED);
    expect(r.pass, JSON.stringify(r.rules.filter((x) => !x.ok))).toBe(true);
  });
  it('an item inside 35 ft fails and the same item moved out passes', () => {
    const inside = Object.assign({}, SOLVED, { ragBin: { x: 60, y: 28 } }); // exactly 30 ft
    const r = core.safe2CheckPlan(inside);
    expect(r.pass).toBe(false);
    expect(r.rules.find((x) => x.id === 'ragBin')).toMatchObject({ ok: false });
    expect(core.safe2CheckPlan(Object.assign({}, SOLVED, { ragBin: { x: 66, y: 28 } })).pass).toBe(true);
    expect(core.safe2CheckPlan(Object.assign({}, SOLVED, { ragBin: { x: 65, y: 28 } })).pass).toBe(false); // exactly 35 ft
  });
  it('a fire blanket counts for the fixed shelf only, never for the solvent can', () => {
    expect(core.safe2CheckPlan(Object.assign({}, SOLVED, { cardboard: { x: 48, y: 12, covered: false } })).pass).toBe(false);
    const solvent = core.safe2CheckPlan(Object.assign({}, SOLVED, { solventCan: { x: 40, y: 36, covered: true } }));
    expect(solvent.rules.find((x) => x.id === 'solventCan').ok).toBe(false);
  });
  it('controls: curtain must block the aisle, extinguisher and fire watch in the zone, extractor at the arc', () => {
    expect(core.safe2CheckPlan(Object.assign({}, SOLVED, { curtain: { x: 30, y: 20 } })).pass).toBe(false);
    expect(core.safe2CheckPlan(Object.assign({}, SOLVED, { extinguisher: { x: 90, y: 8 } })).pass).toBe(false);
    expect(core.safe2CheckPlan(Object.assign({}, SOLVED, { fireWatch: { x: 31, y: 29 } })).pass).toBe(false);
    expect(core.safe2CheckPlan(Object.assign({}, SOLVED, { extractor: { x: 50, y: 28 } })).pass).toBe(false);
  });
  it('hostile plans normalise to the start positions', () => {
    const n = core.safe2NormPlan({ cardboard: { x: 'NaN', y: Infinity, covered: 'yes' }, ragBin: 5, extra: {} });
    expect(n.cardboard).toEqual({ x: core.SAFE2_PLAN_START.cardboard.x, y: core.SAFE2_PLAN_START.cardboard.y, covered: false });
    expect(n.ragBin).toEqual(core.SAFE2_PLAN_START.ragBin);
    expect(n.extra).toBeUndefined();
    expect(core.safe2NormPlan({ ragBin: { x: -50, y: 900 } }).ragBin).toEqual({ x: 2, y: 58 });
  });
});

describe('scenario rotation and balance', () => {
  const T = (k, fb) => (fb === undefined ? k : fb);
  function seg(startNeedle, endNeedle) {
    const s = src.indexOf(startNeedle);
    const anchor = src.indexOf(endNeedle, s);
    expect(s).toBeGreaterThan(-1);
    expect(anchor).toBeGreaterThan(s);
    return src.slice(s, src.lastIndexOf('\n', anchor)) + '\n';
  }
  // eslint-disable-next-line no-new-func
  const load = (rot) => new Function('__alloT', seg('var SAFETY_SCENARIOS = [', rot ? 'function PPESafetyLab()' : '// Every safety scenario authored') + '\nreturn SAFETY_SCENARIOS;')(T);
  const raw = load(false);
  const rotated = load(true);

  it('authored first; the rotation keeps every flag, feedback and citation', () => {
    expect(raw.length).toBe(7);
    raw.forEach((sc, i) => {
      expect(sc.choices[0].correct, sc.id).toBe(true);
      expect(sc.choices.length).toBe(4);
      const r = rotated[i];
      expect(r.choices.filter((c) => c.correct).length).toBe(1);
      expect(r.choices.find((c) => c.correct).text).toBe(sc.choices[0].text);
      expect(r.choices.find((c) => c.correct).fb).toBe(sc.choices[0].fb);
      expect(r.osha).toBe(sc.osha);
      expect(r.choices.findIndex((c) => c.correct), sc.id).toBe(sc.slot);
      expect(new Set(r.choices.map((c) => c.text)).size).toBe(4);
    });
  });
  it('correct answers use every slot A-D and no slot holds more than 35%', () => {
    const pos = rotated.map((sc) => sc.choices.findIndex((c) => c.correct));
    const counts = [0, 1, 2, 3].map((s) => pos.filter((p) => p === s).length);
    counts.forEach((c) => expect(c).toBeGreaterThan(0));
    counts.forEach((c) => expect(c / pos.length).toBeLessThanOrEqual(0.35));
    expect(pos[0]).not.toBe(0); // the old recipe left scenario 1 at A
    expect(pos[3]).not.toBe(0); // ...and scenario 4
  });
  it('the key is not given away by length (no rank holds most keys; within +10% / -15%)', () => {
    const ranks = [0, 0, 0, 0];
    raw.forEach((sc) => {
      const L = sc.choices.map((c) => c.text.length);
      const key = L[0];
      const rank = L.filter((x) => x > key).length; // 0 = longest
      ranks[Math.min(rank, 3)]++;
      L.slice(1).forEach((d) => {
        expect(key, sc.id).toBeLessThanOrEqual(d * 1.10);
        expect(key, sc.id).toBeGreaterThanOrEqual(d * 0.85);
      });
    });
    ranks.forEach((n) => expect(n / raw.length, JSON.stringify(ranks)).toBeLessThanOrEqual(0.43));
  });
  it('the arc-flash response holds and the new scenarios exist', () => {
    expect(rotated.find((s) => s.id === 'sc1').choices.find((c) => c.correct).text).toMatch(/^Stop welding/);
    expect(rotated.map((s) => s.id)).toEqual(['sc1', 'sc2', 'sc3', 'sc4', 'sc5', 'sc6', 'sc7']);
    expect(rotated.find((s) => s.id === 'sc5').situation).toMatch(/argon/);
    expect(rotated.find((s) => s.id === 'sc6').situation).toMatch(/galvanized/);
    expect(rotated.find((s) => s.id === 'sc7').situation).toMatch(/wet/);
  });
});

describe('facts that must not regress', () => {
  it('fire watch: never under 30 minutes, and NFPA 51B is stated as 60', () => {
    const hits = [];
    const re = /([^.'"]*(?:fire watch|watch stays|fire-watch)[^.'"]*?)(\d+)\s*(?:minutes|min)\b/gi;
    let m;
    while ((m = re.exec(MINE))) hits.push(Number(m[2]));
    expect(hits.length).toBeGreaterThan(4);
    hits.forEach((n) => expect(n).toBeGreaterThanOrEqual(30));
    expect(/NFPA 51B[^'"]{0,120}60 minutes/.test(MINE), 'NFPA 51B 60 minutes').toBe(true);
    expect(/\+ 30 minutes after \(NFPA 51B\)/.test(MINE), 'old 30-min NFPA claim').toBe(false);
  });
  it('helplines: no unverified 1-800-499-0027; SAMHSA national line and 988 present', () => {
    expect(src.includes('1-800-499-0027'), 'unverified Maine number').toBe(false);
    expect(MOD19.includes('1-800-662-4357'), 'SAMHSA').toBe(true);
    expect(/\b988\b/.test(MOD19), '988').toBe(true);
  });
  it('spelling, torch order, and the stainless / NFPA 2112 / respirator claims are fixed', () => {
    // Booleans, not toContain: a failing toContain diffs the whole module.
    const has = (s, x) => s.includes(x);
    expect(has(src, 'Berylium'), 'Berylium').toBe(false);
    expect(has(MOD19, 'Beryllium-copper'), 'Beryllium-copper').toBe(true);
    expect(has(MOD19, '(gas, oxygen, light, adjust)'), 'old torch order').toBe(false);
    expect(/crack the acetylene valve open, light it[^']*then open the oxygen[^']*Shut down oxygen first, then acetylene/.test(MOD19), 'torch order').toBe(true);
    expect(has(MOD7, 'PAPR + LEV required'), 'PAPR + LEV').toBe(false);
    expect(/NFPA 2112 rated/.test(MOD7), 'NFPA 2112 rated').toBe(false);
    expect(has(MOD7, 'ISO 11611'), 'ISO 11611').toBe(true);
    expect(has(MOD7, "'When req.'"), 'When req.').toBe(false);
    expect(/findById\s*\(/.test(MOD19 + MOD7), 'findById call').toBe(false);
    expect(has(MOD19, 'Cal/OSHA: 0.2'), 'Cal/OSHA claim').toBe(false);
    expect(has(MOD19, 'about 4× general rate'), 'suicide-rate claim').toBe(false);
  });  it('the PPE banner no longer says the arc burns the retina in seconds', () => {
    const html = text(render({ view: 'ppeSafety' }));
    expect(html).not.toContain('Arc burns the retina in seconds');
    expect(html).toContain('burns the surface of your eyes');
  });
});

describe('rendering every new state', () => {
  it('PPE tabs render their own content', () => {
    expect(text(render({ view: 'ppeSafety' }))).toContain('Step 1 — pick the job');
    expect(text(render({ view: 'ppeSafety', ps_view: 'shade', safe2_shProc: 'smaw', safe2_shAmps: 200 }))).toMatch(/Minimum shade \(the law\) 10/);
    expect(text(render({ view: 'ppeSafety', ps_view: 'shade', safe2_shProc: 'ofc', safe2_shThick: 0.5 }))).toMatch(/Minimum shade \(the law\) 3 /);
    expect(text(render({ view: 'ppeSafety', ps_view: 'floor' }))).toContain('Pick an item to move');
    expect(text(render({ view: 'ppeSafety', ps_view: 'scenarios' }))).toContain('Arc Flash / Bystander Exposure');
    expect(text(render({ view: 'ppeSafety', ps_view: 'reference' }))).toContain('Gear specs and the rule behind each');
  });
  it('the dress-up figure shows the worn items and a role=img summary', () => {
    const html = render({ view: 'ppeSafety', safe2_job: 'oxyCut', safe2_worn: ['helmet5', 'polyHoodie'] });
    expect(html).toMatch(/role="img" aria-label="Welder figure for the job: Oxy-fuel cutting, 1\/2-in\. plate\. Wearing: Helmet with a fixed shade-5 lens, Polyester hoodie\."/);
    expect(html).toContain('aria-pressed="true"');
    expect(text(html)).toContain('2 items on');
  });
  it('scenario answered state shows feedback; a full set shows the summary', () => {
    const one = text(render({ view: 'ppeSafety', ps_view: 'scenarios', safe2_scIdx: 4, safe2_scPick: { 4: 0 } }));
    expect(one).toMatch(/Argon is about 1\.4 times as heavy as air/);
    const all = text(render({ view: 'ppeSafety', ps_view: 'scenarios', safe2_scPick: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } }));
    expect(all).toContain('Scenario summary');
    expect(all).toMatch(/\d of 7 best responses on the first try/);
  });
  it('scenario radiogroup opts out of arrow-select', () => {
    const html = render({ view: 'ppeSafety', ps_view: 'scenarios' });
    expect(html).toMatch(/role="radiogroup" data-arrow-select="false"/);
  });
  it('Safety + Health new sections render', () => {
    expect(text(render({ view: 'safetyHealth', sh_sect: 'noise' }))).toContain('Noise-dose calculator');
    expect(text(render({ view: 'safetyHealth', sh_sect: 'noise', safe2_noise: [{ db: 90, h: 8 }] }))).toMatch(/OSHA dose \(90 dBA, 5-dB rule\) ✗ 100%/);
    expect(text(render({ view: 'safetyHealth', sh_sect: 'controls' }))).toContain('Hierarchy of controls: sort the fixes');
    const tank = text(render({ view: 'safetyHealth', sh_sect: 'electrical', safe2_gas: 'helium', safe2_level: 'top' }));
    expect(tank).toContain('Where do welding gases go in a tank?');
    expect(tank).toContain('OXYGEN-DEFICIENT');
    const fine = text(render({ view: 'safetyHealth', sh_sect: 'electrical', safe2_gas: 'helium', safe2_level: 'bottom' }));
    expect(fine).not.toContain('OXYGEN-DEFICIENT');
  });
  it('audit: a "No" shows its own fix, and category scores render without findById', () => {
    const html = text(render({ view: 'safetyHealth', sh_mode: 'audit', sh_audit: { lev: 'no', screens: 'yes' } }));
    expect(html).toContain('Fix: put a fume extractor or downdraft table at each station');
    expect(html).not.toContain('Fix: hang welding curtains');
    expect(html).toMatch(/0% \(0\/1\)/);
    expect(html).toMatch(/100% \(1\/1\)/);
  });
});

describe('hostile saved state does not crash', () => {
  const HOSTILE = [
    { view: 'ppeSafety', ps_view: 42 },
    { view: 'ppeSafety', ps_view: { a: 1 }, safe2_job: '__proto__', safe2_worn: 'polyHoodie', safe2_adf: 'abc' },
    { view: 'ppeSafety', ps_view: 'gear', safe2_worn: [1, null, {}, 'sneakers'], safe2_adf: 1e9 },
    { view: 'ppeSafety', ps_view: 'shade', safe2_shProc: 'toString', safe2_shAmps: 'NaN', safe2_shThick: -4 },
    { view: 'ppeSafety', ps_view: 'floor', safe2_plan: 'x' },
    { view: 'ppeSafety', ps_view: 'floor', safe2_plan: { cardboard: null, curtain: { x: 'a' } } },
    { view: 'ppeSafety', ps_view: 'scenarios', safe2_scIdx: 1e9, safe2_scPick: [3, 3] },
    { view: 'ppeSafety', ps_view: 'scenarios', safe2_scIdx: 'x', safe2_scPick: { 0: 99, 1: -1, 2: 'a', 3: 1.5 } },
    { view: 'safetyHealth', sh_sect: 7, sh_mode: [], sh_audit: 'str' },
    { view: 'safetyHealth', sh_mode: 'audit', sh_audit: { lev: 'maybe', __proto__: { x: 1 } } },
    { view: 'safetyHealth', sh_sect: 'noise', safe2_noise: 'x' },
    { view: 'safetyHealth', sh_sect: 'noise', safe2_noise: [{ db: 'a', h: -1 }, null, 5] },
    { view: 'safetyHealth', sh_sect: 'controls', safe2_hoc: { eng1: 9, ppe1: 'x', sub1: 1 } },
    { view: 'safetyHealth', sh_sect: 'electrical', safe2_gas: 'bogus', safe2_level: 5 }
  ];
  HOSTILE.forEach((st, i) => {
    it('state ' + i + ' renders its view', () => {
      const html = render(st);
      expect(html.length).toBeGreaterThan(2000);
      const want = st.view === 'ppeSafety' ? 'PPE &amp; Safety' : 'Safety + Health Deep-Dive';
      expect(html).toContain(want);
    });
  });
});
