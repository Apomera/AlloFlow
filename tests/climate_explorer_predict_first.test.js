// Climate Explorer, 2026-11-23 pass: predict-first activities, an unanswered
// calculator start, sourced benchmark numbers, and quiz explanations.
// Most of these fail on the pre-pass tool (C:/tmp/sports_labs_1123/climate/start.js).
import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = 'stem_lab/stem_tool_climateExplorer.js';
const render = (state = {}, ctx = {}) => renderTool('climateExplorer', { climateExplorer: state }, ctx);
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// A tiny store so click handlers can be driven through the SSR element tree.
function newStore(initial) {
  const store = { toolData: initial };
  store.set = (u) => { store.toolData = typeof u === 'function' ? u(store.toolData) : u; };
  return store;
}
function tree(store, extra = {}) {
  const tool = window.StemLab._registry.climateExplorer;
  return tool.render({
    React: window.React, toolData: store.toolData, setToolData: store.set, setStemLabTool() {},
    t: (k, fb) => (fb == null ? k : fb), icons: new Proxy({}, { get: () => () => null }),
    awardXP: extra.awardXP || (() => {}), addToast() {}, announceToSR() {}, gradeLevel: '6th Grade'
  });
}
function findById(node, id) {
  let found = null;
  (function walk(n) {
    if (found || n == null || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.props && n.props.id === id) { found = n; return; }
    if (n.props) walk(n.props.children);
  })(node);
  return found;
}
function click(store, id, extra) {
  const btn = findById(tree(store, extra), id);
  if (!btn) throw new Error('no element #' + id);
  btn.props.onClick({ preventDefault() {} });
}

beforeEach(() => { resetStemLab(); loadTool(TOOL, 'climateExplorer'); });

describe('Carbon calculator starts unanswered', () => {
  it('shows no total and no selected answer until the student answers', () => {
    const html = render({ tab: 'carbon' });
    expect(html).not.toContain('aria-pressed="true" id="ce-carbon-choice');
    expect(html).not.toMatch(/id="ce-carbon-choice-[a-z]+-\d"[^>]*aria-pressed="true"/);
    expect(html).toContain('0 of 4 questions answered');
    expect(html).not.toContain('id="ce-carbon-total"');
    expect(text(html)).not.toContain('900 kg');
    expect(text(html)).toContain('Answer the 4 questions below to see your footprint.');
  });

  it('treats a corrupt saved answer as unanswered, not as the greenest option', () => {
    const html = render({ tab: 'carbon', ccTransport: 99, ccFood: 'x', ccEnergy: -1, ccWaste: true });
    expect(html).toContain('0 of 4 questions answered');
  });

  it('awards First Calculation only when the fourth answer completes the estimate', () => {
    const store = newStore({ climateExplorer: { tab: 'carbon' } });
    click(store, 'ce-carbon-choice-transport-2');
    expect(Object.keys(store.toolData.climateExplorer.badges || {})).not.toContain('firstCalc');
    click(store, 'ce-carbon-choice-food-1');
    click(store, 'ce-carbon-choice-energy-1');
    expect(Object.keys(store.toolData.climateExplorer.badges || {})).not.toContain('firstCalc');
    click(store, 'ce-carbon-choice-waste-1');
    expect(Object.keys(store.toolData.climateExplorer.badges || {})).toContain('firstCalc');
  });
});

describe('Carbon calculator: predict the biggest cut first', () => {
  // 2026-11-23 worked-out values: car 720 (low 0), mix 2060 (low 1390), grid 1320 (low 0), recycle-some 370 (low 230)
  const answered = { tab: 'carbon', ccTransport: 2, ccFood: 1, ccEnergy: 1, ccWaste: 1 };

  it('hides the breakdown until a prediction is made', () => {
    const html = render(answered);
    expect(html).toContain('Predict first: which ONE change would cut your footprint the most?');
    expect(html).not.toContain('id="ce-carbon-results"');
    expect(html).not.toContain('Carbon footprint breakdown');
  });

  it('scores the prediction from the option table: energy saves 1,320 kg, the most', () => {
    const award = [];
    const store = newStore({ climateExplorer: Object.assign({}, answered) });
    click(store, 'ce-carbon-predict-transport', { awardXP: (...a) => award.push(a) });
    const ce = store.toolData.climateExplorer;
    expect(ce.ccPrediction.pick).toBe('transport');
    expect(award).toHaveLength(0); // wrong guess: no XP
    const html = text(render(ce));
    expect(html).toContain('Not this time.');
    expect(html).toContain('Biggest cut: What powers my home, switching to Solar / Wind saves 1,320 kg a year.');
    expect(html).toContain('What I eat: save 670 kg');
    expect(render(ce)).toContain('Carbon footprint breakdown');
  });

  it('gives XP for a right prediction, once', () => {
    const award = [];
    const store = newStore({ climateExplorer: Object.assign({}, answered) });
    click(store, 'ce-carbon-predict-energy', { awardXP: (...a) => award.push(a) });
    expect(award.map((a) => a.slice(0, 2))).toEqual([['climateExplorer', 10]]);
    expect(text(render(store.toolData.climateExplorer))).toContain('Yes!');
  });

  it('asks again after an answer changes', () => {
    const html = render(Object.assign({}, answered, { ccEnergy: 2, ccPrediction: { pick: 'energy', sig: '2,1,1,1' } }));
    expect(html).toContain('You changed an answer, so predict again for your new choices.');
    expect(html).toContain('id="ce-carbon-results"'); // results already earned stay visible
  });

  it('skips the prediction when every answer is already the lowest option', () => {
    const html = render({ tab: 'carbon', ccTransport: 0, ccFood: 0, ccEnergy: 0, ccWaste: 0 });
    expect(html).toContain('You picked the lowest-carbon answer in every group');
    expect(html).toContain('id="ce-carbon-results"');
  });
});

describe('Benchmarks are sourced and honest about the partial footprint', () => {
  const src = fs.readFileSync(TOOL, 'utf8');
  it('says per person, not household, and uses the 2024 OWID figures', () => {
    expect(src).not.toContain('Average US household emits ~16 tons');
    expect(src).toContain('about 14 tons of CO\\u2082 per person each year (2024)');
    expect(src).toMatch(/country: 'USA',\s+emoji: '[^']+', kg: 14200/);
    expect(src).toMatch(/country: 'China',\s+emoji: '[^']+', kg: 8700/);
    expect(src).toContain('var GLOBAL_AVG_KG = 4700;');
    expect(src).not.toContain('var globalAvgKg = 4800;');
  });
  it('compares only the 4 answers with the 2.3 t share and names what is left out', () => {
    const html = text(render({ tab: 'carbon', ccTransport: 2, ccFood: 2, ccEnergy: 2, ccWaste: 2, ccPrediction: { pick: 'energy', sig: '2,2,2,2' } }));
    expect(html).toContain('These 4 answers alone are 5,330 kg over the 2.3 t share.'); // 720+2620+3770+520-2300
    expect(html).toContain('that these 4 questions leave out');
    expect(html).not.toContain('Below global average');
  });
});

describe('Header and hero CO2 figure is dated and current', () => {
  it('shows the NOAA 2025 annual mean, not an undated monthly peak', () => {
    const html = text(render({ tab: 'keeling' }));
    expect(html).toContain('427.4 ppm CO₂ · 2025 avg');
    expect(html).toContain('NOAA Mauna Loa yearly average, 2025: 427.35 ppm CO₂');
    expect(html).not.toContain('431.4 ppm');
  });
});

describe('Keeling Curve: predict the next point', () => {
  it('asks before it reveals, and the reveal comes from the data table', () => {
    const before = text(render({ tab: 'keeling' }));
    expect(before).toContain('Predict the next point: 2025');
    expect(before).not.toContain('NOAA measured 427.35');
    const after = text(render({ tab: 'keeling', kcPredict: { val: 428, locked: true } }));
    expect(after).toContain('NOAA measured 427.35 ppm for 2025. You predicted 428.0 ppm, off by 0.6 ppm.');
    // (424.6 - 418.5) / 2 = 3.05 per year -> 427.65
    expect(after).toContain('rose 6.1 ppm, about 3.1 ppm a year, so the trend points to about 427.7 ppm');
  });
});

describe('Tipping Points: predict, then explore warming levels', () => {
  it('asks how many are past their best guess at 2 C before showing the list', () => {
    const html = text(render({ tab: 'tipping' }));
    expect(html).toContain('Predict first: at 2.0°C of warming, how many of these 7 systems');
    expect(html).not.toContain('Past best guess');
  });
  it('counts from the Armstrong McKay thresholds: 4 of 7 at 2 C', () => {
    const html = text(render({ tab: 'tipping', tpPredict: 3, tpWarm: 2 }));
    expect(html).toContain('At 2.0°C, 4 of 7 are past their best guess');
    expect(html).toContain('4 of 7 past their best guess at 2.0°C.');
    const hot = text(render({ tab: 'tipping', tpPredict: 3, tpWarm: 4 }));
    expect(hot).toContain('7 of 7 past their best guess at 4.0°C.');
  });
  it('labels the Gulf of Maine as regional, not a tipping threshold', () => {
    const html = text(render({ tab: 'tipping' }));
    expect(html).toContain('Regional warming, not a global tipping element');
    expect(html).not.toContain('Threshold: ~1°C');
  });
});

describe('Quiz explains every answer', () => {
  it('every question has a why, and it is shown after answering', () => {
    const src = fs.readFileSync(TOOL, 'utf8');
    const qCount = (src.match(/\{ q: '/g) || []).length;
    const whyCount = (src.slice(src.indexOf('var QUIZ_WHY = ['), src.indexOf('QUIZ.forEach(function(item) {')).match(/\n\s+\['/g) || []).length;
    expect(qCount).toBeGreaterThan(30);
    expect(whyCount).toBe(qCount);
    const html = text(render({ tab: 'carbon', quizOpen: true, quizIdx: 0, quizAnswer: 0 }));
    expect(html).toMatch(/Why: \S/);
  });
});

describe('No free XP for opening a tab', () => {
  it('visiting a tab awards nothing', () => {
    const award = [];
    const store = newStore({ climateExplorer: { tab: 'carbon' } });
    click(store, 'ce-tab-keeling', { awardXP: (...a) => award.push(a) });
    expect(store.toolData.climateExplorer.tab).toBe('keeling');
    expect(award).toEqual([]);
  });
});

describe('Text floor', () => {
  it('has no HTML text under 12 px (SVG viewBox text excepted)', () => {
    const src = fs.readFileSync(TOOL, 'utf8');
    const small = [...src.matchAll(/fontSize:\s?(9|10|10\.5|11)(?![\d.])/g)].filter((m) => {
      const before = src.slice(Math.max(0, m.index - 400), m.index);
      const tags = [...before.matchAll(/el\(\s*'([a-zA-Z0-9]+)'/g)];
      return !tags.length || tags[tags.length - 1][1] !== 'text';
    });
    expect(small.length).toBe(0);
  });
});

describe('Edge states found in screenshots', () => {
  it('Keeling: the value shown before locking is the value scored after (0.5 ppm slider step)', () => {
    const store = newStore({ climateExplorer: { tab: 'keeling' } });
    expect(text(render(store.toolData.climateExplorer))).toContain('My prediction: 424.5 ppm');
    click(store, 'ce-keeling-predict-lock');
    expect(store.toolData.climateExplorer.kcPredict).toEqual({ val: 424.5, locked: true });
    expect(text(render(store.toolData.climateExplorer))).toContain('You predicted 424.5 ppm, off by 2.9 ppm.');
  });
  it('Tipping: a far-off guess reads Not quite, a near one Close', () => {
    expect(text(render({ tab: 'tipping', tpPredict: 0 }))).toContain('Not quite. At 2.0°C');
    expect(text(render({ tab: 'tipping', tpPredict: 5 }))).toContain('Close. At 2.0°C');
    expect(text(render({ tab: 'tipping', tpPredict: 4 }))).toContain('Right on. At 2.0°C');
  });
  it('Tipping: a predict cannot be changed once made', () => {
    const store = newStore({ climateExplorer: { tab: 'tipping', tpPredict: 2 } });
    expect(findById(tree(store), 'ce-tip-predict-4')).toBeNull();
  });
  it('the mission panel is one closed disclosure; advanced labs stay one click away', () => {
    const html = render({ tab: 'carbon' });
    expect(html).toMatch(/id="ce-mission-toggle"[^>]*aria-expanded="false"/);
    expect(html).toMatch(/id="ce-mission-body"[^>]*hidden/);
    expect(html).toContain('id="ce-advanced-toggle"');
    expect(render({ tab: 'carbon', missionOpen: true })).not.toMatch(/id="ce-mission-body"[^>]*hidden/);
  });
});

describe('Export report carries the predictions', () => {
  it('lists the carbon, Keeling and tipping predictions next to what the model or data says', () => {
    let report = null;
    const saved = window.StemLab.writeClipboard;
    window.StemLab.writeClipboard = (r) => { report = r; return true; };
    try {
      const store = newStore({ climateExplorer: { tab: 'carbon', ccTransport: 2, ccFood: 1, ccEnergy: 1, ccWaste: 1,
        ccPrediction: { pick: 'food', sig: '2,1,1,1' }, kcPredict: { val: 426, locked: true }, tpPredict: 3 } });
      click(store, 'ce-export');
    } finally { window.StemLab.writeClipboard = saved; }
    expect(report).toContain('Predicted biggest cut: What I eat · Model says: What powers my home (saves 1,320 kg/yr)');
    expect(report).toContain('Keeling prediction for 2025: 426.0 ppm (NOAA measured 427.35)');
    expect(report).toContain('Tipping prediction at 2°C: 3 systems past their best guess (assessment says 4 of 7)');
  });
  it('leaves out a partial quick estimate', () => {
    let report = null;
    const saved = window.StemLab.writeClipboard;
    window.StemLab.writeClipboard = (r) => { report = r; return true; };
    try { click(newStore({ climateExplorer: { tab: 'carbon', ccTransport: 2 } }), 'ce-export'); }
    finally { window.StemLab.writeClipboard = saved; }
    expect(report).not.toContain('Quick Footprint Estimate');
  });
});
