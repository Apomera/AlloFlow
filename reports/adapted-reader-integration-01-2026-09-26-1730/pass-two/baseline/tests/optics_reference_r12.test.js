// Optics Lab, audit round 12 (Sept 2026): the reference collections (glossary,
// scientists, instruments, careers, deep dives), the practice logic (sleuth,
// quiz, mastery) and the Visual Lab search. Each check reads what the page shows.
//
// What the audit found:
//   - 38 glossary terms were listed twice ("Snell's law", "Photon", "Cornea"...);
//   - the tab descriptions promised "120+ terms", "30+ problems"... (456/51 real),
//     and the glossary header promised pronunciation and etymology for every term;
//   - the Visual Lab's ~150 cards had no way to find one;
//   - the AI grader crashed the tool on a non-string feedback item, paid XP on
//     every click for a draft with a space added, and could stick on "Grading...";
//   - near-duplicate quiz questions landed in the same 5-question quiz;
//   - after a perfect FIRST quiz every progress surface said "not started";
//   - four of ten Sleuth keys were "real, inverted, reduced", in the same order
//     for every student;
//   - a Deep Dive card was one big role="button" around all its text.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_optics.js'), 'utf8');
function between(a, b) {
  const i = SRC.indexOf(a);
  const j = SRC.indexOf(b, i + a.length);
  if (i < 0 || j < 0) throw new Error('marker not found: ' + (i < 0 ? a : b));
  return SRC.slice(i, j);
}
function table(name) {
  const open = `  var ${name} = [`;
  const start = SRC.indexOf(open);
  let depth = 0, i = start + open.length - 1;
  for (; i < SRC.length; i += 1) {
    if (SRC[i] === '[') depth += 1;
    else if (SRC[i] === ']') { depth -= 1; if (depth === 0) break; }
  }
  return vm.runInNewContext(`(${SRC.slice(start + open.length - 1, i + 1)})`, {});
}

const RENDER_TIMEOUT = 30000;
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
function render(state) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
  return renderTool('opticsLab', { opticsLab: state });
}
const ALL = { phDbLimit: 9999, scientistLimit: 9999, historyLimit: 9999, instrumentLimit: 9999, kitLimit: 9999, careerLimit: 9999, workedLimit: 9999, glossaryLimit: 9999 };

describe('Reference collections say what they hold', () => {
  it('every glossary term appears once', () => {
    const html = render({ mode: 'glossary_ex', ...ALL });
    const terms = [...html.matchAll(/<span style="font-size:13px;font-weight:800;color:#86efac">([^<]+)<\/span>/g)].map((m) => decode(m[1]).trim().toLowerCase());
    expect(terms.length).toBeGreaterThan(400);
    const dups = terms.filter((t, i) => terms.indexOf(t) !== i);
    expect(dups).toEqual([]);
    expect(decode(html)).toContain(terms.length + ' optics terms, each defined.');
  }, RENDER_TIMEOUT);

  it('each tab description counts what its tab shows', () => {
    // The tab strip (whose buttons carry the descriptions) shows outside Home.
    const home = decode(render({ mode: 'reference', opticsLibraryGroup: 'all' }));
    const tabs = [
      ['scientists', /title="(\d+) scientists of light and optics, from antiquity to today"/],
      ['history', /title="(\d+) optics milestones"/],
      ['instruments', /title="(\d+) telescopes, microscopes, cameras, lasers, displays"/],
      ['lab_kits', /title="(\d+) hands-on experiments"/],
      ['worked', /title="(\d+) step-by-step AP problems"/],
      ['careers', /title="(\d+) optics career paths"/],
      ['glossary_ex', /title="(\d+) optics terms defined"/],
    ];
    for (const [mode, re] of tabs) {
      const claimed = Number((home.match(re) || [])[1]);
      const shown = Number((render({ mode, ...ALL }).match(/Showing (\d+) of (\d+)/) || [])[2]);
      expect(claimed, mode).toBeGreaterThan(0);
      expect(claimed, mode).toBe(shown);
    }
  }, RENDER_TIMEOUT);
});

describe('Visual Lab search', () => {
  it('filters the cards by title and description, and says when nothing matches', () => {
    const all = render({ mode: 'viz' });
    const total = (all.match(/id="opviz-t-/g) || []).length;
    expect(total).toBeGreaterThan(140);
    expect(all).toMatch(new RegExp('data-op-viz-count="' + total + '"'));

    const rainbow = render({ mode: 'viz', vizQuery: 'Rainbow' });
    const titles = [...rainbow.matchAll(/id="opviz-t-[^"]+"[^>]*>([^<]+)</g)].map((m) => decode(m[1]));
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.length).toBeLessThan(total);
    expect(rainbow).toMatch(new RegExp('data-op-viz-count="' + titles.length + '"'));
    for (const t of titles) expect(t.toLowerCase() + ' ' + rainbow.toLowerCase()).toContain('rainbow');

    const none = decode(render({ mode: 'viz', vizQuery: 'zzqx' }));
    expect(none).toContain('No card matches "zzqx"');
    expect(none).toMatch(/data-op-viz-count="0"/);
    expect(none).toContain('aria-label="Search the Visual Lab"');
  }, RENDER_TIMEOUT);
});

describe('AI grader — fails closed, pays once, never sticks', () => {
  // A fresh copy of the grader per test: its in-flight and paid records are module state.
  function makeGrader() {
    return vm.runInNewContext(`(function () {
      ${between('function _localOpticsRubric(', 'function _renderSleuthPanel(')}
      return _renderAiGrader;
    })()`, { _isNum: (x) => typeof x === 'number' && isFinite(x), __alloT: (k, s) => s, t: (k, s) => s, Promise });
  }
  const h = (type, props, ...children) => ({ type, props: props || {}, children });
  function button(node) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) { for (const c of node) { const f = button(c); if (f) return f; } return null; }
    if (node.type === 'button' && node.props.onClick) return node;
    return button(node.children);
  }
  function setup(gemini, d0) {
    const grader = makeGrader();
    const d = Object.assign({ aiDrafts: { lenses: 'The image is real because the object is beyond the focal point.' } }, d0);
    const xp = []; let calls = 0;
    const upd = (k, v) => { if (typeof k === 'string') d[k] = v; else Object.assign(d, k); };
    const counted = (...a) => { calls++; return gemini(...a); };
    const click = () => button(grader('lenses', d, upd, h, () => {}, (n) => xp.push(n), counted, null)).props.onClick();
    return { d, xp, click, calls: () => calls, render: () => grader('lenses', d, upd, h, () => {}, () => {}, counted, null) };
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));

  it('a reply whose feedback items are not strings is no grade (it used to crash the tool)', async () => {
    for (const reply of ['{"score":5,"strengths":[{"point":"good"}],"issues":[]}', '{"score":5,"strengths":[],"issues":[3]}',
      '{"score":5,"strengths":[],"issues":[],"improved_version":{"text":"x"}}']) {
      const g = setup(() => Promise.resolve(reply));
      g.click(); await tick(); await tick();
      expect(g.d.aiResponse && g.d.aiResponse.error, reply).toBeTruthy();
      expect(g.xp, reply).toEqual([]);
    }
  });

  it('a second draft for the same topic is graded but not paid again', async () => {
    const good = '{"score": 6, "strengths": ["a"], "issues": [], "improved_version": "b"}';
    const g = setup(() => Promise.resolve(good));
    g.click(); await tick(); await tick();
    expect(g.xp).toEqual([10]);
    g.d.aiDrafts = { lenses: g.d.aiDrafts.lenses + ' ' };
    g.click(); await tick(); await tick();
    expect(g.d.aiResponse.score).toBe(6);
    expect(g.xp, 'a trailing space paid again').toEqual([10]);
  });

  it('one request at a time per topic, and a thrown request does not leave "Grading..." on', async () => {
    let release;
    const g = setup(() => new Promise((r) => { release = r; }));
    g.click(); await tick();
    g.click(); await tick();
    expect(g.calls(), 'a second click sent a second request').toBe(1);
    release('{"score": 6, "strengths": [], "issues": []}'); await tick(); await tick();
    expect(g.d.aiLoadingTab).toBe(null);
    const thrower = setup(() => { throw undefined; });
    thrower.click(); await tick(); await tick();
    expect(thrower.d.aiLoadingTab).toBe(null);
    expect(thrower.d.aiResponse.error).toContain('AI request failed');
    expect(button(thrower.render()).props['aria-busy']).toBe(false);
  });
});

describe('Quiz — no twin questions in one quiz', () => {
  const BANK = table('AP_OPTICS_QUIZ').concat(table('QUIZ_EXTRA'));
  const Q = vm.runInNewContext(`(function () {
    ${between('  var OP_QUIZ_TWINS = [', '  // PLUGIN REGISTRATION')}
    return { pick: _pickOpticsQuizQuestions, group: _opQuizTwinGroup, twins: OP_QUIZ_TWINS };
  })()`, { AP_OPTICS_QUIZ: BANK, _shuffleOpticsQuestionChoices: (q) => q, Math });

  it('every twin rule matches real questions, and no quiz draws two of a group', () => {
    Q.twins.forEach((g, gi) => {
      const members = BANK.filter((q) => Q.group(q) === gi);
      expect(members.length, 'twin group ' + gi + ' (' + g[0] + ') matches too few questions').toBeGreaterThanOrEqual(2);
    });
    for (const tab of [null, 'reflection', 'refraction', 'lenses', 'interference', 'diffraction', 'polarization']) {
      for (let n = 0; n < 400; n++) {
        const quiz = Q.pick(tab);
        expect(quiz.length).toBe(5);
        const groups = quiz.map(Q.group).filter((g) => g !== -1);
        expect(new Set(groups).size, tab + ': two twins in one quiz').toBe(groups.length);
      }
    }
  });

  it('answer length and absolute words give the key away no more than chance', () => {
    // The key was the SECOND-longest choice in 39/62 questions: "always pick the
    // second-longest" scored 63%. Padding one distractor had moved the cue, not
    // removed it, so every rank is gated, and the mirror (shortest) with it.
    const counts = [0, 0, 0, 0];
    BANK.forEach((q) => {
      expect(q.choices.length, q.q).toBe(4);
      const k = q.choices[q.correct].length;
      counts[q.choices.filter((c) => c.length > k).length]++;
    });
    counts.forEach((n, r) => {
      expect(n / BANK.length, 'key at length rank ' + (r + 1)).toBeLessThanOrEqual(0.35);
      expect(n / BANK.length, 'key at length rank ' + (r + 1)).toBeGreaterThanOrEqual(0.15);
    });
    for (let r = 0; r < 4; r++) {
      let expected = 0;
      BANK.forEach((q) => {
        const sorted = q.choices.map((c, j) => ({ j, L: c.length })).sort((a, b) => b.L - a.L);
        const tied = sorted.filter((s) => s.L === sorted[r].L);
        if (tied.some((s) => s.j === q.correct)) expected += 1 / tied.length;
      });
      expect(expected / BANK.length, 'always pick length rank ' + (r + 1)).toBeLessThanOrEqual(0.35);
    }
    const ABS = /\b(always|never|only|all|none|every|completely|entirely|impossible|must)\b/i;
    const flagged = BANK.reduce((n, q) => n + q.choices.filter((c, j) => j !== q.correct && ABS.test(c)).length, 0);
    expect(flagged, 'absolute words marking wrong answers').toBeLessThanOrEqual(3);
  });

  it('TIR, myopia and reading-glasses questions are filed under their topics', () => {
    const tagsOf = (start) => BANK.find((q) => q.q.startsWith(start)).tags;
    expect(tagsOf('Total internal reflection requires:')).toContain('tir');
    expect(tagsOf('Myopia (nearsightedness) is corrected with:')).toContain('lenses');
    expect(tagsOf('A 50-year-old needs +1.5 D reading glasses.')).toContain('lenses');
  });
});

describe('Mastery, Sleuth and the sample problems tell the truth', () => {
  it('after a perfect first quiz, nothing says the student has not started', () => {
    const bank = table('AP_OPTICS_QUIZ');
    const quizMastery = {};
    bank.slice(0, 5).forEach((q) => { quizMastery[q.q] = { correctCount: 1, streak: 1, lastCorrectAt: '2026-09-24T10:00:00Z' }; });
    const html = decode(render({ mode: 'mastery', quizCompletedCount: 1, quizMastery }));
    expect(html).not.toContain('Start the quiz to begin building mastery');
    expect(html).not.toContain('Take your first AP quiz attempt');
    expect(html).toContain('Started: answer the ◐ questions right once more to master them');
    expect(html).toMatch(/\d+ in progress/);
    const home = decode(render({ mode: 'home', quizCompletedCount: 1, quizMastery }));
    expect(home).toContain('Started: answer a question right a second time in a row to master it.');
  }, RENDER_TIMEOUT);

  it('a garbage mastery date prints nothing, not "Invalid Date"', () => {
    const q = table('AP_OPTICS_QUIZ')[0].q;
    const html = render({ mode: 'mastery', quizCompletedCount: 2, quizMastery: { [q]: { correctCount: 2, streak: 2, masteredAt: 'garbage' } } });
    expect(html).not.toContain('Invalid Date');
  }, RENDER_TIMEOUT);

  it('Sleuth keys are balanced, and each key follows from the lens or mirror equation', () => {
    const counts = {};
    let checked = 0;
    for (let i = 0; i < 10; i++) {
      const t = decode(render({ mode: 'sleuth', ssIdx: i, ssShown: [i], ssAns: true, ssPick: 'none', ssRounds: 1 }));
      const key = t.match(/The image is ([A-Za-z, ]+?)(?: \(you picked|<)/)[1].trim();
      counts[key] = (counts[key] || 0) + 1;
      const setup = t.match(/(Converging lens|Diverging lens|Concave[^,]*mirror|Convex[^,]*mirror)[^f]*f = (-?[0-9.]+) cm\. (?:Object placed at|Object placed|You stand) ([0-9.]+) cm/);
      if (setup) {
        const f = Number(setup[2]), dO = Number(setup[3]);
        const di = 1 / (1 / f - 1 / dO), m = -di / dO;
        const want = (di > 0 ? 'Real, inverted, ' : 'Virtual, upright, ') + (Math.abs(m) > 1 ? 'magnified' : 'reduced');
        expect(key, setup[0]).toBe(want);
        checked++;
      }
    }
    expect(checked, 'the setup parser matched too few vignettes').toBeGreaterThanOrEqual(8);
    expect(Math.max(...Object.values(counts)), JSON.stringify(counts)).toBeLessThanOrEqual(3);
    expect(Object.keys(counts).length).toBe(4);
  }, RENDER_TIMEOUT);

  it('the snorkeler problem uses the n it states', () => {
    const block = between("research_question: 'A snorkeler underwater", "id: 'fiber_optic'");
    const n = Number(block.match(/\(n = ([0-9.]+)\)/)[1]);
    const thetaC = Math.asin(1 / n) * 180 / Math.PI;
    expect(block).toContain('θ_c = ' + thetaC.toFixed(1) + '°');
    expect(block).toContain('refrN1: ' + n + ',');
  });
});

describe('Deep dives and scientists read correctly', () => {
  it('a deep-dive card has a real disclosure button and its text outside it', () => {
    const html = render({ mode: 'deep', deepDiveTopic: 'lasers', deepDiveOpenId: null });
    expect(html).not.toMatch(/role="button"[^>]*aria-expanded/);
    // Collapsed: no aria-controls (its target is not rendered, so the idref would dangle).
    const toggles = [...html.matchAll(/<button type="button" data-op-focusable="true" data-op-deep-toggle="([^"]+)" aria-expanded="false"(?! aria-controls)/g)];
    expect(toggles.length).toBeGreaterThan(3);
    const open = render({ mode: 'deep', deepDiveTopic: 'lasers', deepDiveOpenId: toggles[0][1] });
    expect(open).toContain('data-op-deep-toggle="' + toggles[0][1] + '" aria-expanded="true" aria-controls="op-deep-body-' + toggles[0][1] + '"');
    expect(open).toContain('id="op-deep-body-' + toggles[0][1] + '"');
    expect(open).toMatch(/aria-pressed="true"[^>]*>⚡ Lasers/);
  }, RENDER_TIMEOUT);

  it('scientists run in time order, and a description is not styled as a quotation', () => {
    const html = decode(render({ mode: 'scientists', ...ALL }));
    expect(html.indexOf('Euclid')).toBeGreaterThan(0);
    expect(html.indexOf('Euclid'), 'the ancients come first').toBeLessThan(html.indexOf('Johannes Kepler'));
    expect(html.indexOf('Johannes Kepler')).toBeLessThan(html.indexOf('Thomas Young'));
    expect(html.indexOf('Gustav Kirchhoff'), 'an added 19th-century card sat after the 21st century').toBeLessThan(html.indexOf('Anton Zeilinger'));
    const ptolemy = decode(render({ mode: 'scientists', ...ALL, scientistOpenId: 'ptolemy', scientistQuery: 'ptolemy' }));
    expect(ptolemy).toMatch(/data-op-scientist-note="true"[^>]*>💡 His apparent-depth demonstration/);
  }, RENDER_TIMEOUT);

  it('the headline corrections stay made', () => {
    expect(SRC).toContain('more atoms in the upper laser level than in the lower laser level ("population inversion")');
    expect(SRC).not.toContain('more atoms excited than de-excited');
    expect(SRC).toContain('so no more than 1 mW can enter an unaided eye');
    expect(SRC).toContain('N = focal length / aperture diameter, written f/N');
    expect(SRC).toContain('No smartwatch or ring that claims to measure blood glucose without a skin prick is FDA-authorized');
    expect(SRC).not.toContain('very hard to treat after age 10');
    expect(SRC).not.toContain('Cats have ~6-8x more rods than humans');
    expect(SRC).toContain('The expected shift (about 0.4 of a fringe) was easily large enough to see');
    expect(SRC).not.toContain('The expected ether wind effect was below detection threshold.');
    expect(SRC).toContain("that Dirac's theory said should not exist");
  });
});

describe('3D scenes', () => {
  it('each 3D toolbar offers zoom buttons, and the wheel no longer scrolls the page', () => {
    expect((SRC.match(/onZoom: function ?\(f\) \{ upd\(\{ [a-zA-Z0-9]+Camera: 'custom', [a-zA-Z0-9]+Zoom: Math\.max\(0\.5, Math\.min\(3, /g) || []).length).toBe(5);
    expect((SRC.match(/host\.addEventListener\('wheel', S\.wheelGuard, \{ passive: false \}\);/g) || []).length).toBe(5);
    expect((SRC.match(/if \(S\.wheelHost\) S\.wheelHost\.removeEventListener\('wheel', S\.wheelGuard\);/g) || []).length).toBe(5);
    expect(SRC).not.toContain('(ev.deltaY < 0 ? 1.12 : 0.89)');
  });

  it('virtual images use the pink the 2D view and the key call them', () => {
    expect(SRC).toContain("virtual: '#f0abfc'");
    expect(SRC).not.toContain('0xfca5a5');
    expect((SRC.match(/0xf0abfc/g) || []).length).toBeGreaterThanOrEqual(4);
  });
});
