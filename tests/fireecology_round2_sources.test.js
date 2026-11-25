// Fire Ecology, sports-labs pass round 2 (2026-11-23): dated nation records with sources, Wabanaki
// words limited to ones verified on the Passamaquoddy-Maliseet Language Portal (pmportal.org),
// re-keyed registered strings, per-distractor quiz feedback, no "flashover" promise, no flag emoji.
// Fail-first: FE_FILE=C:/tmp/sports_labs_1123/fireecology/start_r2.js runs every block against the
// round-2 reference copy, where each one fails.
import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.FE_FILE || 'stem_lab/stem_tool_fireecology.js';
let cfg;
beforeEach(() => {
  resetStemLab();
  cfg = loadTool(FILE, 'fireEcology');
});
const render = (state = {}) => renderTool('fireEcology', { fireEcology: state });
const src = () => fs.readFileSync(FILE, 'utf8');

describe('nation records: a dated start only where a source gives one', () => {
  // Each value is the source's own date (see the comments above INDIGENOUS_FIRE_NATIONS).
  const DATED = { aboriginal_au: 41600, karuk_yurok: 1000, plains_nations: 900, amazon_terra_preta: 6500, maori_nz: 700, paiute: 600 };

  it('keeps sourced numbers and drops the unsourced ones', () => {
    const nations = (cfg.model && cfg.model.nations) || [];
    expect(nations.length).toBe(12);
    for (const n of nations) {
      expect(n.years).toBeUndefined();
      expect(n.since === null || typeof n.since === 'number').toBe(true);
      expect(n.since).toBe(DATED[n.id] === undefined ? null : DATED[n.id]);
      expect(typeof n.sinceSource).toBe('string');
      // a dated record names its study; an undated one says so plainly
      if (n.since) expect(n.sinceSource).toMatch(/\(.*(19|20)\d\d\)/);
    }
    const label = cfg.model.nationSinceLabel;
    expect(label(nations.find((n) => n.id === 'aboriginal_au'))).toBe('Fire use in the record since about 41,600 years ago');
    expect(label(nations.find((n) => n.id === 'san_bushmen'))).toBe('Fire stewardship since time immemorial');
    expect(label(nations.find((n) => n.id === 'sami'))).toBe('Knowledge of the land since time immemorial');
  });

  it('charts only dated records and lists the rest without a bar', () => {
    const html = render({ tab: 'indigenous' });
    expect(html).toContain('data-fe-deeptime="6"');
    expect(html).toContain('data-fe-deeptime-undated="6"');
    expect(html).toContain('Since time immemorial, with no dated start in the sources we checked');
    expect(html).toContain('A bar shows how old the evidence is, not when the practice began.');
    expect(html).not.toContain('65,000+');
    expect(html).not.toContain('colonization reaches most of these territories');
    expect(html).not.toContain('Every bar crosses the marker');
  });

  it('shows the source line on a nation card', () => {
    const html = render({ tab: 'indigenous', selectedNation: 'maori_nz' });
    expect(html).toContain('data-fe-since-source="maori_nz"');
    expect(html).toContain('McWethy and others, PNAS 2010');
    expect(html).toContain('Fire use in the record since about 700 years ago');
  });
});

describe('Wabanaki words', () => {
  // Not found on pmportal.org or in the Penobscot Dictionary; PM "toqaq" means "last fall".
  const REMOVED = ['Sigwan', 'Toqaq', 'Sata ', 'Anaskimnesi', 'Skog', 'Pasekona', 'Welimanal', 'Senomozi', 'Olawagik', 'Skamonal', 'Malsanikuk'];

  it('shows only verified words in the glossary and zone deep dives', () => {
    const code = src().split('\n').filter((l) => !/^\s*\/\//.test(l) && !/\/\/ '?(Sata|Anaskimnesi|Olawagik|pmportal)/.test(l)).join('\n');
    for (const w of REMOVED) expect(code).not.toContain(w);
    const glossary = render({ tab: 'mosaic', mosaic: { phase: 'setup', glossaryOpen: true } });
    for (const w of ['nipon', 'pun', 'kuwes', 'qapit', 'wikp']) expect(glossary).toContain('>' + w + '<');
    expect(glossary).toContain('Passamaquoddy-Maliseet Language Portal (pmportal.org)');
    for (const w of REMOVED) expect(glossary).not.toContain(w.trim());
  });

  it('drops the word line, not the deep dive, where no word was verified', () => {
    const html = render({ tab: 'mosaic', mosaic: { phase: 'setup', deepDiveZone: 'blueberryBarren' } });
    expect(html).not.toContain('Sata');
    expect(html).not.toContain('>null<');
    const rip = render({ tab: 'mosaic', mosaic: { phase: 'setup', deepDiveZone: 'riparian' } });
    expect(rip).toContain('qapit · beaver');
  });
});

describe('registered-text mismatches resolved with new keys', () => {
  it('re-keys the strings whose registered text hid the accurate wording', () => {
    const s = src();
    for (const k of ['sliders_for_fuel_accumulation_fire_ret_v2', 'fuel_load_v2', 'biodiversity_v2',
      // Round 4 re-worded the deep-dive footnote again (no "paraphrased" voice), so it moved on to _v3.
      'the_bilingual_terms_across_this_sim_th_v2', 'paraphrased_from_documented_wabanaki_s_v3',
      'warm_season_sigwan_nipon_v2', 'cold_season_toqaq_pun_v2', 'how_did_the_seasonal_split_sigwan_nipo_v2',
      'the_fire_triangle_fuel_oxygen_heat_com_v2', 'combustion_chemistry_fire_triangle_fla_v2']) {
      expect(s).toContain("'stem.fireecology." + k + "'");
    }
    expect(s).not.toMatch(/'stem\.fireecology\.(fuel_load|biodiversity|warm_season_sigwan_nipon|cold_season_toqaq_pun)'/);
  });
});

describe('quiz: each wrong answer explains its own misconception', () => {
  it('has a distinct note for every distractor', () => {
    const quiz = cfg.model.quiz;
    const notes = [];
    quiz.forEach((q) => q.choices.forEach((c, ci) => {
      if (ci === q.answer) return;
      expect(q.miss && q.miss[c], q.q + ' / ' + c).toBeTruthy();
      notes.push(q.miss[c]);
    }));
    expect(notes.length).toBe(96);
    expect(new Set(notes).size).toBe(96);
    // positions stay varied after the rotation
    const pos = new Set(quiz.map((q) => q.answer));
    expect(pos.size).toBe(4);
  });

  it('shows the picked distractor note, and none after a right answer', () => {
    const q0 = cfg.model.quiz[0];
    const wrong = q0.answer === 0 ? 1 : 0;
    const miss = render({ tab: 'quiz', quizIdx: 0, quizAnswer: wrong, quizTotal: 1 });
    expect(miss).toContain('data-fe-quiz-miss="1"');
    expect(miss).toContain(q0.miss[q0.choices[wrong]].replace(/'/g, '&#x27;').replace(/"/g, '&quot;'));
    const hit = render({ tab: 'quiz', quizIdx: 0, quizAnswer: q0.answer, quizTotal: 1 });
    expect(hit).not.toContain('data-fe-quiz-miss');
  });
});

describe('promises and icons', () => {
  it('no longer promises flashover, which the tool does not teach', () => {
    expect(src().toLowerCase()).not.toContain('flashover');
  });

  it('has no flag emoji (Windows shows them as letters)', () => {
    const s = src();
    expect(s).not.toMatch(/\\uD83C\\uDD[EF][0-9A-F]\\uD83C\\uDD[EF][0-9A-F]/i);
    expect(s).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
    const eco = render({ tab: 'ecosystems', selectedEcosystem: 'eucalyptus' });
    expect(eco).toContain('data-fe-mark="leaf"');
    const cs = render({ tab: 'caseStudies' });
    expect(cs).toContain('data-fe-mark="flame"');
    expect(cs).toContain('data-fe-mark="house"');
  });
});
