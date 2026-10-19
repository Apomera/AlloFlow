import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab, React, ReactDOMClient, makeCtx } from './helpers/stem_widgets_smoke_harness.js';
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));

/**
 * Lane PROC: Process Comparison, Joint Catalog and Process Sleuth.
 * The three modules now share ONE scoring model (window.__WeldLabCore.proc):
 * ratings, Job Matcher, decision guide and Sleuth clue maps all read it, so
 * these tests pin the model's verdicts and then check each module agrees.
 */

beforeEach(() => {
  resetStemLab();
  delete window.__alloflowWeldLab;
  try { localStorage.clear(); } catch (e) { /* ignore */ }
  loadTool(SRC, 'weldLab');
});
const P = () => window.__WeldLabCore.proc;
const R = (st, over) => renderTool('weldLab', { weldLab: st }, over);
const src = () => readFileSync(resolve(process.cwd(), SRC), 'utf8');
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const job = (o) => Object.assign({}, P().DEFAULT_JOB, o);

describe('Job Matcher ranks processes from the shared scoring table', () => {
  it('puts TIG first for thin stainless with a sanitary finish', () => {
    ['one', 'batch', 'line'].forEach((vol) => {
      ['low', 'mid', 'high'].forEach((budget) => {
        const r = P().rank(job({ mat: 'stainless', thk: 'sheet', look: 'sanitary', vol, budget }));
        expect(r[0].id, vol + '/' + budget).toBe('tig');
      });
    });
  });

  it('puts stick or self-shielded FCAW first for outdoor, windy structural steel', () => {
    ['plate', 'heavy'].forEach((thk) => {
      ['flat', 'vert', 'over'].forEach((pos) => {
        ['one', 'batch'].forEach((vol) => {
          const r = P().rank(job({ mat: 'steel', thk, loc: 'wind', pos, vol }));
          expect(['stick', 'fcaws'], thk + pos + vol).toContain(r[0].id);
          // and every gas-shielded process sits below both of them
          const at = (id) => r.findIndex((x) => x.id === id);
          ['mig', 'tig', 'fcawg'].forEach((g) => expect(at(g)).toBeGreaterThan(Math.max(at('stick'), at('fcaws'))));
        });
      });
    });
  });

  it('puts resistance spot welding first for high-volume thin sheet', () => {
    ['mid', 'high'].forEach((budget) => {
      ['flat', 'horiz'].forEach((pos) => {
        const r = P().rank(job({ mat: 'steel', thk: 'sheet', vol: 'line', budget, pos }));
        expect(r[0].id, budget + pos).toBe('spot');
      });
    });
    // and it is ruled out the moment the work is plate
    const plate = P().rank(job({ thk: 'plate', vol: 'line' })).find((x) => x.id === 'spot');
    expect(plate.out).toBe(true);
  });

  it('shows that ranking in the rendered matcher, with reasons for each move', () => {
    const html = R({ view: 'processCompare', proc2_job: { mat: 'stainless', thk: 'sheet', loc: 'shop', pos: 'flat', vol: 'batch', look: 'sanitary', surf: 'clean', budget: 'mid', port: 'cart' } });
    const t = text(html);
    const ranking = t.slice(t.indexOf('Ranking for this job'));
    expect(ranking.indexOf('TIG / GTAW')).toBeLessThan(ranking.indexOf('Best match'));
    expect(ranking.indexOf('Best match')).toBeLessThan(ranking.indexOf('MIG / GMAW'));
    expect(ranking).toContain('Why it rises');
    expect(ranking).toContain('Ruled out because');
    expect(ranking).toContain('Sanitary specs (food, dairy, pharma) are written around TIG');
  });

  it('every reason code in the table has words to show', () => {
    const html = R({ view: 'processCompare' });
    expect(html).toContain('proc2-matcher');
    const codes = new Set();
    const p = P();
    p.FACTOR_KEYS.forEach((f) => p.FACTORS[f].forEach((v) => p.IDS.forEach((id) => {
      const c = p.cell(f, v, id);
      if (c.code && c.d !== 0) codes.add(c.code);
    })));
    const s = src();
    codes.forEach((c) => expect(s, 'no text for reason ' + c).toMatch(new RegExp('\\b' + c + ': __alloT\\(')));
  });
});

describe('Ratings: one cheapest, one slowest, one direction', () => {
  it('names exactly one process cheapest and exactly one slowest', () => {
    expect(P().extreme('afford', true)).toEqual(['stick']);
    expect(P().extreme('speed', false)).toEqual(['oxy']);
    const html = R({ view: 'processCompare' });
    expect(html.split('>Lowest equipment cost<').length - 1).toBe(1);
    expect(html.split('>Slowest<').length - 1).toBe(1);
    expect(text(html)).toContain('Read from the table: lowest equipment cost Stick / SMAW; slowest Oxy-Fuel / OFW.');
  });

  it('no card repeats the old contradictory superlatives', () => {
    ['mig', 'tig', 'stick', 'fcawg', 'fcaws', 'oxy', 'spot'].forEach((id) => {
      const t = text(R({ view: 'processCompare', proc2_sel: id }));
      expect(t, id).not.toMatch(/cheapest/i);
      expect(t, id).not.toMatch(/Slowest deposition rate of any|Slowest of the four|of the four/);
    });
  });

  it('runs every row "more is better" and derives the matcher rows from it', () => {
    const p = P();
    // The legend says so, in words, above the table.
    expect(text(R({ view: 'processCompare' }))).toContain('every row is scored so that MORE dots is BETTER for the welder');
    // Spot checks that only hold if more = better on that row.
    expect(p.RATINGS.mig.learn).toBeGreaterThan(p.RATINGS.tig.learn);      // TIG is the hardest to learn
    expect(p.RATINGS.fcawg.speed).toBeGreaterThan(p.RATINGS.tig.speed);    // flux-core is faster
    expect(p.RATINGS.stick.outdoor).toBeGreaterThan(p.RATINGS.mig.outdoor); // stick shrugs off wind
    expect(p.RATINGS.tig.finish).toBe(5);
    // No row is just another row upside down (the old skill vs easy-to-learn).
    const keys = p.RATING_KEYS;
    keys.forEach((a) => keys.forEach((b) => {
      if (a >= b) return;
      const inverse = p.IDS.every((id) => p.RATINGS[id][a] + p.RATINGS[id][b] === 6);
      expect(inverse, a + ' vs ' + b).toBe(false);
    }));
    // Derived rows: more dots on the source rating never scores lower.
    Object.keys(p.DERIVED).forEach((fv) => {
      const [f, v] = fv.split('.');
      const dr = p.DERIVED[fv];
      p.IDS.forEach((a) => p.IDS.forEach((b) => {
        const ca = p.cell(f, v, a), cb = p.cell(f, v, b);
        if (ca.d === null || cb.d === null) return;
        if (p.RATINGS[a][dr.key] > p.RATINGS[b][dr.key]) expect(ca.d, fv + ' ' + a + '>' + b).toBeGreaterThanOrEqual(cb.d);
      }));
    });
  });

  it('keeps the rating dots readable in the contrast theme and gradients off it', () => {
    // The shared BackBar is outside this lane; check only this module's content.
    const mine = (x) => x.slice(x.indexOf('</h1></div>'));
    const html = mine(R({ view: 'processCompare' }, { isContrast: true }));
    expect(html.includes('proc2-matcher')).toBe(true);
    expect(/linear-gradient/.test(html), 'inline gradient under contrast').toBe(false);
    expect(/bg-gradient-to-/.test(html), 'gradient class under contrast').toBe(false);
    expect(/bg-gradient-to-/.test(mine(R({ view: 'jointCatalog' }, { isContrast: true }))), 'joint catalog intro').toBe(false);
    const light = R({ view: 'processCompare' });
    expect(/linear-gradient/.test(light)).toBe(true);
    // accessible count on every cell: 7 ratings x 7 processes
    expect((light.match(/role="img" aria-label="\d of 5"/g) || []).length).toBe(49);
  });
});

describe('Every process the Sleuth scores is taught in Process Comparison', () => {
  it('maps each Sleuth answer to a compared process, with a cutaway and a card', () => {
    const p = P();
    p.PS_OPTS.forEach((o) => {
      expect(p.PS_MAP[o].length).toBeGreaterThan(0);
      p.PS_MAP[o].forEach((id) => {
        expect(p.IDS).toContain(id);
        const html = R({ view: 'processCompare', proc2_sel: id });
        expect(html, id).toContain('data-proc2="cutaway-' + id + '"');
      });
    });
    const t = text(R({ view: 'processCompare' }));
    ['FCAW-G / gas-shielded flux-core', 'FCAW-S / self-shielded flux-core', 'Resistance spot / RSW'].forEach((n) => expect(t).toContain(n));
  });

  it('numbers each cutaway part once, matching its legend', () => {
    P().IDS.forEach((id) => {
      const html = R({ view: 'processCompare', proc2_sel: id });
      const svg = html.slice(html.indexOf('data-proc2="cutaway-'), html.indexOf('</svg>', html.indexOf('data-proc2="cutaway-')));
      const nums = [...svg.matchAll(/<text[^>]*>(\d+)<\/text>/g)].map((m) => Number(m[1]));
      const legend = html.slice(html.indexOf('Numbered parts'), html.indexOf('lg:col-span-2', html.indexOf('Numbered parts')));
      const items = (legend.match(/aria-pressed=/g) || []).length;
      expect(nums, id).toEqual(Array.from({ length: items }, (_, i) => i + 1));
      expect(items, id).toBeGreaterThanOrEqual(6);
    });
  });
});

describe('Decision guide: predict first, answers agree with the matcher', () => {
  it('each answer key is the matcher\'s top pick among that row\'s options', () => {
    const p = P();
    p.GUIDE.forEach((g) => {
      expect(p.rank(g.job, g.opts)[0].id, g.id).toBe(g.opts[g.answer]);
      // and still so once "Check it in the Job Matcher" fills the defaults in
      expect(p.rank(p.normJob(Object.assign({}, p.DEFAULT_JOB, g.job)), g.opts)[0].id, g.id + ' with defaults').toBe(g.opts[g.answer]);
    });
  });

  it('hides each answer until a guess is committed, then explains it', () => {
    const fresh = text(R({ view: 'processCompare' }));
    expect(fresh).not.toContain('Your prediction was right');
    expect(fresh).not.toContain('MIG: short-circuit transfer welds 14-gauge sheet');
    const wrong = text(R({ view: 'processCompare', proc2_guess: { g1: 1 } }));
    expect(wrong).toContain('You predicted Stick / SMAW; the best fit is MIG / GMAW');
    expect(wrong).toContain('Why not Stick / SMAW? Stick burns through thin sheet');
    const right = text(R({ view: 'processCompare', proc2_guess: { g1: 0 } }));
    expect(right).toContain('Your prediction was right: MIG / GMAW');
    expect(right).not.toContain('Why not');
    expect(right).toContain('First-try score: 1 of 1 answered');
  });
});

describe('Joint Catalog drawings', () => {
  function rectsAndWelds(html, tag) {
    const at = html.indexOf('data-proc2="' + tag + '"');
    expect(at, tag + ' not rendered').toBeGreaterThan(-1);
    const svg = html.slice(at, html.indexOf('</svg>', at));
    const rects = [...svg.matchAll(/<rect data-part="plate" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => m.slice(1, 5).map(Number));
    const welds = [...svg.matchAll(/<polygon data-part="weld" points="([^"]+)"/g)].map((m) => m[1].split(' ').map((q) => q.split(',').map(Number)));
    return { rects, welds };
  }
  const inside = (p, r) => p[0] > r[0] + 1e-6 && p[0] < r[0] + r[2] - 1e-6 && p[1] > r[1] + 1e-6 && p[1] < r[1] + r[3] - 1e-6;

  it('draws the corner fillet OUTSIDE both plates (it used to sit inside the upright one)', () => {
    const { rects, welds } = rectsAndWelds(R({ view: 'jointCatalog', jc_tab: 'corner' }), 'joint-corner');
    expect(rects.length).toBe(2);
    expect(welds.length).toBeGreaterThanOrEqual(1);
    welds.forEach((w) => {
      const c = P().centroid(w);
      rects.forEach((r) => {
        expect(inside(c, r), 'weld centroid ' + c + ' inside plate ' + r).toBe(false);
        w.forEach((pt) => expect(inside(pt, r), 'weld vertex ' + pt + ' inside plate ' + r).toBe(false));
      });
    });
  });

  it('keeps every joint\'s weld metal out of its plates', () => {
    ['lap', 'tjoint', 'edge'].forEach((k) => {
      const { rects, welds } = rectsAndWelds(R({ view: 'jointCatalog', jc_tab: k }), 'joint-' + k);
      welds.forEach((w) => rects.forEach((r) => expect(inside(P().centroid(w), r), k).toBe(false)));
    });
    const g = P().JOINT_GEOM.butt; // square groove with a root opening between the plates
    expect(g.plates[1][0] - (g.plates[0][0] + g.plates[0][2])).toBeGreaterThan(0);
  });

  it('shows every edge preparation on the butt joint', () => {
    ['square', 'v', 'bevel', 'j', 'u'].forEach((pp) => {
      const html = R({ view: 'jointCatalog', jc_tab: 'butt', proc2_prep: pp });
      expect(html, pp).toContain('data-proc2="prep-' + pp + '"');
    });
    expect(text(R({ view: 'jointCatalog', jc_tab: 'butt', proc2_prep: 'v' }))).toContain('60° groove angle');
  });

  it('covers 1G-4G, 1F-4F and the pipe positions, each with a picture', () => {
    const codes = P().POS_CODES;
    ['1G', '2G', '3G', '4G', '1F', '2F', '3F', '4F', '5G', '6G'].forEach((c) => {
      expect(codes).toContain(c);
      const html = R({ view: 'jointCatalog', proc2_pos: c });
      const at = html.indexOf('data-proc2="pos-' + c + '"');
      expect(at, c).toBeGreaterThan(-1);
      const svg = html.slice(at, html.indexOf('</svg>', at));
      expect((svg.match(/<polygon/g) || []).length, c + ' has no geometry').toBeGreaterThan(6);
      expect(svg, c + ' gravity arrow').toContain('>g</text>');
    });
    expect(text(R({ view: 'jointCatalog', proc2_pos: '2F' }))).toContain('One plate flat and one standing up');
    expect(R({ view: 'jointCatalog', proc2_pos: '6G' })).toMatch(/Pipe positions in depth/);
    expect(R({ view: 'jointCatalog', proc2_pos: '2G' })).not.toMatch(/Pipe positions in depth/);
  });
});

describe('Joint quiz v2: transfer, honest feedback', () => {
  const NAMES = /\b(butt|lap|corner|edge|tee|t-joint)\b/i;

  it('balances answer slots, uses every treatment, and never shows the catalog picture', () => {
    const p = P();
    for (let seed = 1; seed <= 300; seed++) {
      const items = p.jqBuild(seed);
      expect(items.length).toBe(10);
      const perJoint = {}, perVar = {};
      items.forEach((it) => { perJoint[it.joint] = (perJoint[it.joint] || []).concat([it]); perVar[it.variant] = (perVar[it.variant] || 0) + 1; });
      p.JOINT_KEYS.forEach((k) => {
        expect(perJoint[k].length, 'slot balance ' + k).toBe(2); // every slot correct 20% of the time
        expect(perJoint[k][0].variant).not.toBe(perJoint[k][1].variant);
      });
      p.JQ_VARIANTS.forEach((v) => expect(perVar[v], 'variant ' + v + ' seed ' + seed).toBeGreaterThanOrEqual(2));
      // A 2-D item must not land on the catalog drawing (section shifted down 45).
      items.filter((it) => it.variant === 'rot' || it.variant === 'flip').forEach((it) => {
        const g = p.JOINT_GEOM[it.joint];
        const shape = (map) => g.plates.map((pl) => p.platePoly(pl)).concat(g.welds)
          .map((poly) => poly.map((pt) => map(pt).map((x) => Math.round(x * 10) / 10).join(',')).sort().join(' ')).sort().join('|');
        const catalog = shape((pt) => [pt[0], pt[1] + 45]);
        expect(shape(p.jqXform(it).map), 'seed ' + seed + ' ' + it.joint + ' ' + it.variant + ' ' + it.rot + it.flip).not.toBe(catalog);
      });
    }
  });

  it('never names the joint in the drawing\'s accessible name', () => {
    const items = P().jqBuild(77);
    items.forEach((it, i) => {
      const html = R({ view: 'jointCatalog', proc2_jqOn: true, proc2_jqSeed: 77, proc2_jqIdx: i, proc2_jqAns: items.slice(0, i).map((x) => x.joint) });
      const at = html.indexOf('data-proc2="jq-figure"');
      expect(at, 'figure ' + i).toBeGreaterThan(-1);
      const open = html.slice(html.lastIndexOf('<svg', at), html.indexOf('>', at));
      const label = /aria-label="([^"]*)"/.exec(open)[1];
      expect(label, label).not.toMatch(NAMES);
      expect(label.length).toBeGreaterThan(40);
      const svg = html.slice(at, html.indexOf('</svg>', at));
      expect(svg).not.toMatch(/aria-label/);
    });
  });

  it('explains why the picked distractor is wrong', () => {
    const items = P().jqBuild(77);
    const i = items.findIndex((it) => it.joint === 'corner');
    const ans = items.slice(0, i).map((x) => x.joint).concat(['tjoint']);
    const t = text(R({ view: 'jointCatalog', proc2_jqOn: true, proc2_jqSeed: 77, proc2_jqIdx: i, proc2_jqAns: ans }));
    expect(t).toContain('This is a Corner Joint');
    expect(t).toContain('Why not T-Joint? T or corner? Look where one plate\'s edge lands.');
  });

  it('builds the end message from the actual misses', () => {
    const p = P();
    const items = p.jqBuild(4242);
    const confuse = (a, b) => items.map((it) => (it.joint === a ? b : (it.joint === b ? a : it.joint)));
    const ce = p.jqSummary(items, confuse('corner', 'edge'));
    expect(ce.topPair).toBe('corner|edge');
    expect(ce.score).toBe(6);
    const tc = p.jqSummary(items, confuse('tjoint', 'corner'));
    expect(tc.topPair).toBe('tjoint|corner');
    expect(p.jqSummary(items, items.map((it) => it.joint)).topPair).toBe(null);

    const endCE = text(R({ view: 'jointCatalog', proc2_jqOn: true, proc2_jqSeed: 4242, proc2_jqIdx: 10, proc2_jqAns: confuse('corner', 'edge') }));
    expect(endCE).toContain('Your most-missed pair: Corner or edge?');
    expect(endCE).not.toContain('T or corner?');
    const endTC = text(R({ view: 'jointCatalog', proc2_jqOn: true, proc2_jqSeed: 4242, proc2_jqIdx: 10, proc2_jqAns: confuse('tjoint', 'corner') }));
    expect(endTC).toContain('Your most-missed pair: T or corner?');
    expect(endTC).not.toContain('Corner or edge?');
    const perfect = text(R({ view: 'jointCatalog', proc2_jqOn: true, proc2_jqSeed: 4242, proc2_jqIdx: 10, proc2_jqAns: items.map((it) => it.joint) }));
    expect(perfect).not.toContain('most-missed');
    expect(perfect).toContain('Joint Reader badge earned');
  });

  it('records the best score so the badge is real, not display-only', () => {
    expect(text(R({ view: 'jointCatalog', proc2_jqBest: 9 }))).toContain('Best score: 9 of 10. 🏅 Joint Reader badge earned.');
    expect(text(R({ view: 'jointCatalog', proc2_jqBest: 5 }))).toContain('Score 8 or more to earn the Joint Reader badge');
  });
});

describe('Process Sleuth v2: clues map to the same model', () => {
  it('the matcher picks every vignette\'s answer from its own clues', () => {
    const p = P();
    p.PS_V.forEach((v, i) => {
      const r = p.psRank(p.psJob(i));
      expect(r[0].id, 'V' + v.id).toBe(v.correct);
      expect(r[0].out).toBe(false);
    });
  });

  it('no clue rules out the right answer, and each scenario has real clues and distractors', () => {
    const p = P();
    const html0 = R({ view: 'processSleuth', psIdx: 0, psShown: [0] });
    expect(html0).toContain('ps-text');
    p.PS_V.forEach((v, i) => {
      const mapped = p.PS_MAP[v.correct];
      let keys = 0, noise = 0;
      Object.keys(v.clues).forEach((n) => {
        const c = v.clues[n];
        const kind = p.clueKind(c);
        if (kind === 'key') keys++;
        if (kind === 'noise') noise++;
        if (!c || !c.f) return;
        const e = p.effects(c.f, c.v, p.PS_SHOWN);
        // FCAW counts as ruled out only if BOTH variants are
        const out = mapped.every((id) => e.out.indexOf(id) !== -1);
        expect(out, 'V' + v.id + ' clue ' + n + ' rules out the answer').toBe(false);
      });
      expect(keys, 'V' + v.id + ' key clues').toBeGreaterThanOrEqual(2);
      expect(noise, 'V' + v.id + ' distractors').toBeGreaterThanOrEqual(1);
      // every marked phrase in the text has a meaning, and every meaning a phrase
      const t = text(R({ view: 'processSleuth', psIdx: i, psShown: [i] }));
      const prose = R({ view: 'processSleuth', psIdx: i, psShown: [i] }).match(/data-proc2="ps-text"[^>]*>([\s\S]*?)<\/p>/)[1];
      const btns = (prose.match(/aria-pressed="(true|false)"/g) || []).length;
      expect(btns, 'V' + v.id + ' tappable phrases').toBe(Object.keys(v.clues).length);
      expect(t).toContain('Scenario ' + v.id + ' · vignette');
    });
  });

  it('marks exactly the phrases the clue table defines, in every vignette', () => {
    const s = src();
    P().PS_V.forEach((v) => {
      const m = new RegExp("__alloT\\('stem\\.weldlab\\.proc2_ps_v" + v.id + "',\\s*'((?:[^'\\\\]|\\\\.)*)'\\)").exec(s);
      expect(m, 'V' + v.id + ' text').not.toBe(null);
      const marked = P().parseMarked(m[1].replace(/\\'/g, "'")).filter((x) => x.n > 0).map((x) => x.n).sort((a, b) => a - b);
      const defined = Object.keys(v.clues).map(Number).sort((a, b) => a - b);
      expect(marked, 'V' + v.id).toEqual(defined);
    });
  });

  it('feedback maps each clue to what it rules in or out and explains a wrong pick', () => {
    const t = text(R({ view: 'processSleuth', psIdx: 4, psShown: [4], proc2_psClues: [1, 4], proc2_psLocked: true, psAns: true, psPick: 'tig', psRounds: 1 }));
    expect(t).toContain('The best fit is MIG (GMAW) (you picked TIG (GTAW))');
    expect(t).toContain('Why TIG (GTAW) does not fit:');
    expect(t).toContain('You marked 1 of 3 deciding clues.');
    expect(t).toContain('Points toward: Stick, FCAW-S');            // tight budget
    expect(t).toContain('Argues against: TIG, Spot');
    expect(t).toContain('"rusty" does not apply here');             // the distractor they tapped
    // every wrong pick in every vignette has its own explanation
    P().PS_V.forEach((v, i) => {
      P().PS_OPTS.filter((o) => o !== v.correct).forEach((o) => {
        const html = R({ view: 'processSleuth', psIdx: i, psShown: [i], proc2_psLocked: true, psAns: true, psPick: o, psRounds: 1 });
        expect(html, 'V' + v.id + ' ' + o).toContain('data-proc2="ps-whynot"');
      });
    });
  });

  it('accepts self-shielded flux-core as a defensible answer in the windy-site scenario only', () => {
    const t = text(R({ view: 'processSleuth', psIdx: 1, psShown: [1], proc2_psLocked: true, psAns: true, psPick: 'fcaw', psRounds: 1 }));
    expect(t).toContain('Accepted: Flux-cored (FCAW) (the matcher ranks Stick (SMAW) first)');
    expect(P().PS_V.filter((v) => v.alsoOk).map((v) => v.id)).toEqual([2]);
  });

  it('reviews the missed vignettes at the end and can retry just those', () => {
    const t = text(R({ view: 'processSleuth', psIdx: 1, psShown: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], proc2_psLocked: true, psAns: true, psPick: 'stick', psRounds: 10, psScore: 8,
      proc2_psLog: [{ v: 4, pick: 'tig', ok: false }, { v: 7, pick: 'mig', ok: false }, { v: 1, pick: 'stick', ok: true }] }));
    expect(t).toContain('Review your misses');
    expect(t).toContain('Scenario 5: you picked TIG (GTAW); the best fit is MIG (GMAW).');
    expect(t).toContain('Scenario 8: you picked MIG (GMAW); the best fit is Flux-cored (FCAW).');
    expect(t).toContain('Retry the 2 you missed');
  });

  it('teacher notes count the scenarios the data actually holds', () => {
    const p = P();
    const stainless = p.PS_V.filter((v) => Object.values(v.clues).some((c) => c && c.v === 'stainless')).map((v) => v.id);
    const stick = p.PS_V.filter((v) => v.correct === 'stick').map((v) => v.id);
    expect(stainless).toEqual([1, 6]);
    expect(stick).toEqual([2, 7, 10]);
    const t = text(R({ view: 'processSleuth' }));
    expect(t).toContain('Two scenarios are stainless: 1 (food-service sheet) and 6 (brewery tube)');
    expect(t).toContain('three scenarios (2, 7 and 10) answer Stick');
    expect(t).not.toMatch(/Three scenarios in this set are stainless|two scenarios answer Stick/);
  });

  it('asks scenario 4 only about the fill and cap, so the stick root is context', () => {
    const v4 = P().PS_V[3];
    expect(v4.correct).toBe('fcaw');
    expect(v4.clues[3]).toEqual({ note: 'rootDone' });
    expect(text(R({ view: 'processSleuth', psIdx: 3, psShown: [3] }))).toContain('Which process for the fill and cap?');
  });

  it('balances the correct slots across the five Sleuth answers', () => {
    const counts = {};
    P().PS_V.forEach((v) => { counts[v.correct] = (counts[v.correct] || 0) + 1; });
    P().PS_OPTS.forEach((o) => expect(counts[o], o).toBeGreaterThan(0));
    Object.values(counts).forEach((n) => expect(n / 10).toBeLessThanOrEqual(0.35));
    // decision guide: A-D twice each
    const g = [0, 0, 0, 0];
    P().GUIDE.forEach((r) => { g[r.answer]++; });
    expect(g).toEqual([2, 2, 2, 2]);
  });
});

describe('Saved state is untrusted', () => {
  const hostileTabs = [{}, 'zzz', 7, null, '__proto__', ['butt'], 'constructor'];
  it('survives hostile jc_tab and quiz/position keys', () => {
    hostileTabs.forEach((tab) => {
      const html = R({ view: 'jointCatalog', jc_tab: tab, proc2_prep: { x: 1 }, proc2_pos: '9G', proc2_jqBest: 'lots' });
      expect(html, String(tab)).toContain('proc2-joint-panel');
      expect(html).toContain('aria-selected="true"');
    });
    [{ proc2_jqOn: true, proc2_jqSeed: 'abc', proc2_jqIdx: 'x', proc2_jqAns: 'abc' },
      { proc2_jqOn: true, proc2_jqSeed: -5, proc2_jqIdx: 99, proc2_jqAns: [1, 2, 'butt'] },
      { proc2_jqOn: true, proc2_jqSeed: 3, proc2_jqIdx: 9.7, proc2_jqAns: ['butt', 'lap', 'nope', 'edge'] },
      { proc2_jqOn: 'true', proc2_jqIdx: 3 }].forEach((st) => {
      const html = R(Object.assign({ view: 'jointCatalog' }, st));
      expect(html, JSON.stringify(st)).toMatch(/jq-figure|proc2-joint-panel|jq-end/);
    });
    const n = P().normJq({ proc2_jqOn: true, proc2_jqSeed: 3, proc2_jqIdx: 99, proc2_jqAns: ['butt', 'lap', 'nope'] });
    expect(n).toMatchObject({ on: true, idx: 2, ans: ['butt', 'lap'] });
  });

  it('survives hostile ps* keys and normalises them', () => {
    const states = [
      { psIdx: 'abc' }, { psIdx: 99 }, { psIdx: -3 }, { psIdx: 2.5, psShown: 'abc' },
      { psIdx: 2, psShown: [99, -1, 'x', 2, 2], psScore: 'NaN', psRounds: -4, psPick: 'laser', psAns: 'yes' },
      { psIdx: 2, psShown: [2], psAns: true, psPick: 'tig', psScore: 1e9, psRounds: 3, psStreak: 'x', psBest: {}, psSeed: 'q' },
      { psIdx: 2, psShown: [2], proc2_psClues: 'x', proc2_psLocked: 'yes', proc2_psLog: 'nope' },
      { psIdx: 2, psShown: [2], proc2_psClues: [1, 'a', 99, 1.5], proc2_psLog: [null, { v: 'a' }, { v: 2, pick: 'mig', ok: true }, { v: 2, pick: 'zzz' }] }
    ];
    states.forEach((st) => {
      const html = R(Object.assign({ view: 'processSleuth' }, st));
      expect(html, JSON.stringify(st)).toMatch(/ps-text|10 welding scenarios/);
    });
    const s = P().normPs({ psShown: [99, -1, 'x', 2, 2, 3], psScore: 1e9, psRounds: 3, psPick: 'laser', psAns: true, proc2_psClues: [1, 'a', 99, 1], proc2_psLog: [null, { v: 2, pick: 'mig', ok: 1 }] }, 10);
    expect(s.shown).toEqual([2, 3]);
    expect(s.score).toBe(3);
    expect(s.pick).toBe(null);
    expect(s.ans).toBe(false);
    expect(s.clues).toEqual([1]);
    expect(s.log).toEqual([{ v: 2, pick: 'mig', ok: false, found: 0, keys: 0, noise: 0 }]);
  });

  it('survives hostile Process Comparison keys', () => {
    [{ proc2_sel: 'laser', proc2_job: 'abc', proc2_guess: [1] },
      { proc2_sel: {}, proc2_job: [1, 2], proc2_guess: { g1: 9, g2: 'a', g3: 1.5, zz: 1 } },
      { proc2_sel: null, proc2_job: { mat: 'unobtainium', thk: '__proto__' }, proc2_guess: null }].forEach((st) => {
      const html = R(Object.assign({ view: 'processCompare' }, st));
      expect(html, JSON.stringify(st)).toContain('proc2-matcher');
      expect(html).toContain('data-proc2="cutaway-mig"');
      expect(text(html)).toContain('First-try score: 0 of 0 answered');
    });
    expect(P().normJob({ mat: 'unobtainium', thk: 'sheet' })).toEqual(Object.assign({}, P().DEFAULT_JOB, { thk: 'sheet' }));
  });
});

describe('Every new state renders', () => {
  it('Process Comparison: each process, guide answered, matcher presets', () => {
    P().IDS.forEach((id) => {
      const t = text(R({ view: 'processCompare', proc2_sel: id }));
      expect(t).toContain('How the weld is protected');
    });
    const all = {};
    P().GUIDE.forEach((g) => { all[g.id] = (g.answer + 1) % 4; });
    const t = text(R({ view: 'processCompare', proc2_guess: all }));
    expect(t).toContain('First-try score: 0 of 8 answered');
    expect((t.match(/Check it in the Job Matcher/g) || []).length).toBe(8);
    expect(t).toContain('Reset the guide');
  });

  it('Joint Catalog: every tab in section view, the quiz at every step', () => {
    P().JOINT_KEYS.forEach((k) => {
      const html = R({ view: 'jointCatalog', jc_tab: k });
      expect(html, k).toMatch(new RegExp('data-proc2="(joint-' + k + '|prep-square)"'));
    });
    const items = P().jqBuild(9);
    for (let i = 0; i < 10; i++) {
      const before = R({ view: 'jointCatalog', proc2_jqOn: true, proc2_jqSeed: 9, proc2_jqIdx: i, proc2_jqAns: items.slice(0, i).map((x) => x.joint) });
      expect(before, 'q' + i).toContain('jq-figure');
      expect(before).not.toContain('Next drawing');
      const after = text(R({ view: 'jointCatalog', proc2_jqOn: true, proc2_jqSeed: 9, proc2_jqIdx: i, proc2_jqAns: items.slice(0, i + 1).map((x) => x.joint) }));
      expect(after).toMatch(i === 9 ? /See your results/ : /Next drawing/);
    }
  });

  it('Process Sleuth: intro, step 1, step 2, answered', () => {
    expect(text(R({ view: 'processSleuth' }))).toContain('First tap the words that decide the process');
    expect(text(R({ view: 'processSleuth', psIdx: 0, psShown: [0] }))).toContain('Step 1: tap every phrase');
    const s2 = R({ view: 'processSleuth', psIdx: 0, psShown: [0], proc2_psLocked: true });
    expect(text(s2)).toContain('Step 2: pick the process');
    expect(s2).toMatch(/role="radiogroup" data-arrow-select="false"|data-arrow-select="false"[^>]*role="radiogroup"/);
    expect(text(R({ view: 'processSleuth', psIdx: 0, psShown: [0], proc2_psLocked: true, psAns: true, psPick: 'tig', psRounds: 1, psScore: 1 }))).toContain('Correct: TIG (GTAW)');
  });
});

describe('Source hygiene for this lane', () => {
  it('drops the mislabelled banner and the dead Speed Challenge tier table', () => {
    // "MODULE 10: SPEED CHALLENGE" sat over the Process Sleuth code, and the
    // tier table under it died when the Live Bead Run got its own tiers.
    const s = src();
    expect(s).not.toContain('// MODULE 10: SPEED CHALLENGE');
    expect(s).not.toMatch(/var SPEED_TIERS = \{/);
    expect(s).toContain('function ProcessSleuth(');
  });

  it('marks the lock-on-first-pick quiz groups for the shared arrow-key opt-out', () => {
    const lines = src().split('\n').filter((l) => /role:\s*'radiogroup'/.test(l) && /proc2_g_aria|joint_type_choices|pick_the_right_welding_process/.test(l));
    expect(lines.length).toBe(3);
    lines.forEach((l) => expect(l).toContain("'data-arrow-select': 'false'"));
  });

  it('ships every new key in keys.json with the fallback used in code', () => {
    const kp = resolve(process.cwd(), SRC.replace(/stem_tool_weldlab\.js$/, 'keys.json'));
    if (SRC.indexOf('lanes') === -1 || !existsSync(kp)) return; // lane-only check; the integrator registers keys
    const keys = JSON.parse(readFileSync(kp, 'utf8'));
    const s = src();
    const re = /__alloT\('(stem\.weldlab\.proc2_[^']+)',\s*'((?:[^'\\]|\\.)*)'\)/g;
    let m, n = 0;
    while ((m = re.exec(s))) {
      n++;
      const val = m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      expect(keys[m[1]], m[1]).toBe(val);
    }
    expect(n).toBeGreaterThan(300);
  });
});

// ── Live mount: the interactions SSR cannot reach ──
const mounted = [];
afterEach(() => {
  mounted.forEach((m) => { try { act(() => m.root.unmount()); } catch (e) { /* ignore */ } m.host.remove(); });
  mounted.length = 0;
});
function mountLive(seed) {
  const cfg = window.StemLab._registry.weldLab;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const state = { td: null };
  function Shell() {
    const [td, setTd] = React.useState({ weldLab: Object.assign({}, seed) });
    state.td = td;
    const ctx = makeCtx({ toolData: td, update: (tool, key, val) => setTd((p) => Object.assign({}, p, { [tool]: Object.assign({}, p[tool] || {}, { [key]: val }) })) });
    return cfg.render(ctx);
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Shell)); });
  mounted.push({ root, host });
  return { host, state };
}
function click(host, re, sel) {
  const b = Array.from(host.querySelectorAll(sel || 'button')).find((x) => re.test((x.textContent || '').trim()));
  if (!b) throw new Error('no button ' + re);
  act(() => { b.click(); });
}

describe('Live interactions', () => {
  it('a guide guess locks on the first pick', () => {
    const { host } = mountLive({ view: 'processCompare' });
    click(host, /^Stick \/ SMAW$/, '[role="radio"]');
    expect(host.textContent).toContain('You predicted Stick / SMAW; the best fit is MIG / GMAW');
    click(host, /MIG \/ GMAW$/, '[aria-label="Your process for job 1"] [role="radio"]');
    expect(host.textContent).toContain('You predicted Stick / SMAW');
    expect(host.textContent).toContain('First-try score: 0 of 1 answered');
  });

  it('a matcher choice re-ranks the processes', () => {
    const { host } = mountLive({ view: 'processCompare' });
    const top = () => host.querySelector('#proc2-matcher ol > li').textContent;
    expect(top()).toContain('FCAW-G');
    click(host, /^Stainless steel$/, '[aria-label="Material"] [role="radio"]');
    click(host, /^Sheet/, '[aria-label="Thickness"] [role="radio"]');
    click(host, /^Sanitary/, '[aria-label="Appearance"] [role="radio"]');
    expect(top()).toContain('TIG / GTAW');
  });

  it('shows the edge-prep dimensions once the weld is hidden', () => {
    const { host } = mountLive({ view: 'jointCatalog', jc_tab: 'butt', proc2_prep: 'v' });
    expect(host.querySelector('[data-proc2="prep-v"]').textContent).not.toContain('α');
    click(host, /^Hide the weld/);
    expect(host.querySelector('[data-proc2="prep-v"]').textContent).toContain('α');
    expect(host.textContent).toContain('R = root opening (the gap)');
  });

  it('Sleuth: mark clues, lock, then one final pick that is scored', () => {
    const { host, state } = mountLive({ view: 'processSleuth', psIdx: 4, psShown: [4] });
    // picking before the clues are locked does nothing (no radios yet)
    expect(host.querySelectorAll('[role="radio"]').length).toBe(0);
    click(host, /on a tight budget/);
    expect(state.td.weldLab.proc2_psClues).toEqual([3]);
    click(host, /^Done marking/);
    click(host, /TIG \(GTAW\)/, '[role="radio"]');
    expect(state.td.weldLab.psAns).toBe(true);
    expect(state.td.weldLab.psScore).toBe(0);
    click(host, /MIG \(GMAW\)/, '[role="radio"]');
    expect(state.td.weldLab.psPick).toBe('tig');
    expect(state.td.weldLab.psRounds).toBe(1);
    expect(state.td.weldLab.proc2_psLog).toEqual([{ v: 4, pick: 'tig', ok: false, found: 1, keys: 3, noise: 0 }]);
  });

  it('Joint quiz: answer, see why, finish, best score saved', () => {
    const { host, state } = mountLive({ view: 'jointCatalog', proc2_jqOn: true, proc2_jqSeed: 31, proc2_jqIdx: 0, proc2_jqAns: [] });
    const items = P().jqBuild(31);
    for (let i = 0; i < 10; i++) {
      const name = { butt: 'Butt Joint', lap: 'Lap Joint', tjoint: 'T-Joint', corner: 'Corner Joint', edge: 'Edge Joint' }[items[i].joint];
      click(host, new RegExp('^' + name + '$'), '[role="radio"]');
      click(host, /^(Next drawing|See your results)/);
    }
    expect(host.textContent).toContain('Perfect: every joint, from every angle');
    expect(state.td.weldLab.proc2_jqBest).toBe(10);
  });
});
