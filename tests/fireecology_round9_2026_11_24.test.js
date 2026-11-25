// Fire Ecology, sports-labs pass round 9 (2026-11-24): finish the whole-file source rule.
// 1. Black Summer numbers follow the 2020 Royal Commission report (more than 3,000 homes; smoke up to 429 deaths);
//    Oregon 2020 numbers follow Oregon Emergency Management; the Chumash line drops "thousands of years" for a UC
//    Santa Barbara source; chaparral wildflowers follow the NPS "Fire Followers" page; biochar says "centuries" to
//    match Wang and others 2016.
// 2. Longleaf loses its two unsourced key practices; the tallgrass fact drops "Indigenous burning helped keep it open";
//    San description and science follow Humphrey 2018; savanna and boreal "without fire" follow Stevens and others
//    2017 and Simard and others 2007.
// 3. The "Without Fire" box and the plant chips clear 4.5:1 in light and dark, measured on the translucent wash.
// Fail-first: FE_FILE=C:/tmp/sports_labs_1123/fireecology/start_r8.js runs every block against the round-8 copy.
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
// Shipped code only: source comments quote what was removed and why.
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

describe('Black Summer and Oregon 2020 follow their primary sources', () => {
  it('Black Summer stats say more than 3,000 homes and up to 429 smoke deaths', () => {
    const html = kase('blackSummer');
    expect(html).toContain('more than 24 million hectares (about 59 million acres)');
    expect(html).toContain('more than 3,000 homes');
    expect(html).not.toContain('about 3,000 homes');
    expect(html).toContain('33 in the fires; smoke may have added up to 429 early deaths (estimate)');
    expect(html).not.toContain('about 400 more');
    expect(html).toContain('nearly 3 billion animals killed or displaced (estimate)');
  });
  it('quotes the Royal Commission and the WWF-Australia study in comments', () => {
    const s = src();
    expect(s).toContain('"Over 24 million hectares were burnt"');
    expect(s).toContain('"Over 3,000 homes were destroyed"');
    expect(s).toContain('"may have contributed up to 429 premature deaths"');
    expect(s).toContain('"Nearly three billion animals were\n      // killed or displaced"');
    expect(s).toContain('relationship between Indigenous land and fire management and natural disaster resilience');
    expect(s).toContain('commissioned by the World Wide Fund for');
  });
  it('Oregon numbers and towns carry their sources', () => {
    const html = kase('oregonLabor2020');
    expect(html).toContain('more than 1 million acres');
    expect(html).toContain('more than 5,000 homes and businesses');
    const s = src();
    expect(s).toContain('more than 1 million acres, destroyed over 5,000 homes and businesses" and "ended with 11 lives lost"');
    expect(s).toContain('"with more than 40,000 having to leave their homes"');
    expect(s).toContain('towns of Detroit in Marion County, Blue River and Vida in Lane County, and Phoenix and Talent');
  });
});

describe('Chumash, chaparral and biochar wording', () => {
  it('Chumash line drops "thousands of years" and cites UC Santa Barbara', () => {
    const html = kase('montecito2018');
    expect(html).not.toContain('for thousands of years');
    expect(html).toContain('The Chumash people burned these coastal lands to help useful plants grow and to make hunting easier, until a Spanish governor banned the burning in 1793 (UC Santa Barbara).');
    expect(src()).toContain('"The tradition of burning came to an abrupt end in 1793,"');
  });
  it('chaparral wildflowers follow the NPS Fire Followers page', () => {
    const html = eco('chaparral');
    expect(html).not.toContain('explode with wildflowers');
    expect(html).toContain('sprout with the winter rains and can carpet the land with wildflowers. They come back each spring, but fewer each year as the shrubs grow back (National Park Service).');
    expect(src()).toContain('carpet the landscape with a\n      // profusion of wildflowers');
  });
  it('no shipped line says biochar lasts thousands of years; the quiz key is not the longest choice', () => {
    const c = code();
    expect(c).not.toContain('centuries to thousands of years');
    expect(c).not.toContain('Hundreds to thousands of years');
    expect(c).not.toContain('locks carbon for millennia');
    expect(c).toContain('can hold carbon in soil for centuries (Wang and others 2016)');
    const q = 'Biochar (charcoal in soil) can store carbon for how long?';
    expect(c.split("'" + q + "'").length - 1).toBe(2); // question + its misconception map
    const line = c.split('\n').find((l) => l.includes("{ q: '" + q));
    const choices = JSON.parse(line.match(/choices: (\[[^\]]+\])/)[1].replace(/'/g, '"'));
    const answer = Number(line.match(/answer: (\d)/)[1]);
    expect(choices[answer]).toBe('Hundreds of years');
    expect(Math.max(...choices.map((x) => x.length))).toBeGreaterThan(choices[answer].length);
    expect(src()).toContain('"biochar can\n        // persist in soils on a centennial scale"');
  });
});

describe('cut to sourced lines', () => {
  it('longleaf card drops the triennial and ticks / chiggers practices', () => {
    const html = nation('southeast_nations');
    expect(html).not.toContain('Annual to triennial');
    expect(html).not.toContain('chiggers');
    // Round 10 replaced these three unsourced lines with five sourced to Fowler and Konopik 2007 (see round 10 test).
    const p = practices(html);
    expect(p.length).toBeGreaterThanOrEqual(3);
    for (const line of p) expect(line).not.toMatch(/triennial|chiggers/);
  });
  it('tallgrass fact drops the unsourced Indigenous-burning line and cites NPS', () => {
    const c = code();
    expect(c).not.toContain('Indigenous burning helped keep it open grassland');
    expect(c).toContain('Before European settlement, fires there were frequent; without fire, shrubs and trees take over (National Park Service).');
  });
  it('San description and science follow Humphrey 2018', () => {
    const html = nation('san_bushmen');
    for (const gone of ['flush prey from dense vegetation', 'snakes and insects', 'edge habitat', 'springbok', 'gemsbok', 'wildebeest']) {
      expect(html).not.toContain(gone);
    }
    expect(html).toContain('to keep dangerous animals and snakes away (Humphrey 2018)');
    expect(html).toContain('late fires do more harm to trees than early ones (Humphrey 2018)');
    expect(src()).toContain('"chase snakes away"');
  });
  it('savanna and boreal "without fire" follow Stevens 2017 and Simard 2007', () => {
    const sav = eco('savanna');
    expect(sav).not.toContain('millions of hectares');
    expect(sav).not.toContain('water tables');
    expect(sav).toContain('It is fastest in South America, where fire suppression is a likely cause, and in Africa it is speeding up (Stevens and others 2017).');
    const bor = eco('boreal');
    expect(bor).not.toContain('insulate permafrost');
    expect(bor).not.toContain('converts forest to bog');
    expect(bor).toContain('black spruce grew 50 to 80 percent less as the layer thickened. Fires that burn deep into that layer slow it down (Simard and others 2007).');
    const s = src();
    expect(s).toContain('most likely due to fire suppression and land fragmentation');
    expect(s).toContain('"declines in black spruce productivity of 50-80% with increased\n      // paludification"');
  });
});

// WCAG 2.x relative luminance and contrast.
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (c) => { const l = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * l(c[0]) + 0.7152 * l(c[1]) + 0.0722 * l(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// A wash (hex at alpha) over a solid ground.
const over = (wash, alpha, ground) => rgb(wash).map((v, i) => ground[i] + (v - ground[i]) * alpha);
const A = 0x20 / 255;
// Light grounds the app uses for cards (white canvas, #f8fafc panel, #e2e8f0 deeper); dark: #0f172a, #1e293b.
const LIGHT = ['#ffffff', '#f8fafc', '#e2e8f0'].map(rgb);
const DARK = ['#0f172a', '#1e293b', '#020617'].map(rgb);

describe('light and dark: Without Fire box and plant chips reach 4.5:1 on their wash', () => {
  const colorAfter = (html, marker, tag) => {
    const at = html.indexOf(marker);
    expect(at, marker).toBeGreaterThan(-1);
    const m = new RegExp('<' + tag + '[^>]*style="[^"]*color:(#[0-9a-f]{6})', 'i').exec(html.slice(at));
    return m[1];
  };
  for (const isDark of [false, true]) {
    const grounds = isDark ? DARK : LIGHT;
    it('Without Fire heading and text, ' + (isDark ? 'dark' : 'light'), () => {
      for (const id of ['boreal', 'savanna', 'chaparral', 'tallgrass', 'longleafPine', 'eucalyptus']) {
        const html = eco(id, { isDark });
        const head = colorAfter(html, 'background:#7f1d1d20', 'div');
        const text = colorAfter(html.slice(html.indexOf('Without Fire')), 'Without Fire', 'p');
        for (const g of grounds) {
          const ground = over('#7f1d1d', A, g);
          expect(ratio(rgb(head), ground), id + ' heading ' + head).toBeGreaterThanOrEqual(4.5);
          expect(ratio(rgb(text), ground), id + ' text ' + text).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
    it('plant chips and their heading, ' + (isDark ? 'dark' : 'light'), () => {
      for (const id of ['san_bushmen', 'southeast_nations', 'plains_nations']) {
        const html = nation(id, { isDark });
        const at = html.indexOf('Fire-Managed Plants') > -1 ? html.indexOf('Fire-Managed Plants') : html.indexOf('background:#065f4620');
        const head = /color:(#[0-9a-f]{6})[^>]*>[^<]*$/i.exec(html.slice(0, at));
        const chips = [...html.slice(at).matchAll(/background:#065f4620[^"]*color:(#[0-9a-f]{6})/gi)].map((m) => m[1]);
        expect(chips.length, id + ' chips').toBeGreaterThan(2);
        for (const g of grounds) {
          for (const c of chips) expect(ratio(rgb(c), over('#065f46', A, g)), id + ' chip ' + c).toBeGreaterThanOrEqual(4.5);
          if (head) expect(ratio(rgb(head[1]), g), id + ' heading ' + head[1]).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
    it('case-study stat values on their panel, ' + (isDark ? 'dark' : 'light'), () => {
      const html = render({ tab: 'caseStudies', selectedCase: 'oregonLabor2020' }, { isDark });
      const at = html.indexOf('Acres Burned');
      expect(at, 'stat panel').toBeGreaterThan(-1);
      const vals = [...html.slice(at).matchAll(/font-size:14px;font-weight:700;color:(#[0-9a-f]{6})/gi)].map((m) => m[1]);
      expect(vals.length).toBeGreaterThanOrEqual(5);
      for (const g of grounds) for (const v of vals) expect(ratio(rgb(v), g), 'stat ' + v).toBeGreaterThanOrEqual(4.5);
    });
    it('Key Practices heading on the card, ' + (isDark ? 'dark' : 'light'), () => {
      const html = nation('san_bushmen', { isDark });
      const kp = /color:(#[0-9a-f]{6})[^>]*>[^<]*Key Practices/i.exec(html);
      expect(kp, 'Key Practices heading color').not.toBeNull();
      for (const g of grounds) expect(ratio(rgb(kp[1]), g), 'Key Practices ' + kp[1]).toBeGreaterThanOrEqual(4.5);
    });
  }
});
