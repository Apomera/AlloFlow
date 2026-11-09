import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 20 goals: the round 19 goal card (goal, Check yourself, Words to know) on Dive and
// explore and on the Species guide. Answers come from the guide's own data; nothing leaks
// before a pick; the dive card is the same on every site and never pairs a species picture
// with a name, so it cannot spoil the identify step.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, React, ReactDOMClient, X;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  window.__RR_TEST_EXPORTS__ = {};
  resetStemLab(); loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__;
});

function setWidth(width) {
  window.matchMedia = (query) => {
    const max = /max-width:\s*(\d+)px/.exec(query), min = /min-width:\s*(\d+)px/.exec(query);
    const matches = (!max || width <= Number(max[1])) && (!min || width >= Number(min[1])) && !!(max || min);
    return { media: query, matches, addEventListener() {}, removeEventListener() {} };
  };
}
const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  delete window.matchMedia;
});
async function mount(seed = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const box = { data: null };
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: { ...seed } });
    box.data = toolData.coralReef;
    return cfg.render({ React, toolData, setToolData, t: (k, f) => f || k, announceToSR() {} });
  }
  mounted.push({ host, root });
  await React.act(async () => root.render(React.createElement(Shell)));
  return { host, box };
}
async function click(el) { await React.act(async () => { el.click(); }); }
const DIVE = { section: 'explore' }, GUIDE = { section: 'guide' };
const opts = (q) => [...q.querySelectorAll('[data-pd19-opt]')];
const env = { t: (k, f) => f, fill: (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m)) };
// The guide's own words for a species, read from its card.
function cardMarks(host, id) { return [...host.querySelectorAll('[data-species="' + id + '"] .crds-marks li')].map((li) => li.textContent); }
function cardName(host, id) { const h = host.querySelector('[data-species="' + id + '"] .cr-sp-name'); return h ? h.firstChild.textContent.replace(/\s*\([^)]*\)\s*$/, '') : ''; }

describe('a goal card at the top of Dive and explore and the Species guide', () => {
  it('shows one "I can" goal, first on the page, closed until asked', async () => {
    const { host: dive } = await mount(DIVE);
    const card = dive.querySelectorAll('[data-pd19]');
    expect(card.length).toBe(1);
    expect(card[0].getAttribute('data-pd19')).toBe('dive');
    expect(card[0].querySelector('[data-pd19-goal]').textContent).toBe('Goal: I can identify reef animals by their field marks and say what they do on the reef.');
    // Before the dive's first card, and outside the 3D stage.
    const first = [...dive.querySelector('.crf-explore').children].find((el) => el.tagName !== 'STYLE');
    expect(first).toBe(card[0]);
    expect(card[0].closest('.cr-dive-stage')).toBe(null);
    expect(card[0].querySelector('[data-pd19-panel]')).toBe(null);

    const { host: guide } = await mount(GUIDE);
    const g = guide.querySelectorAll('[data-pd19]');
    expect(g.length).toBe(1);
    expect(g[0].getAttribute('data-pd19')).toBe('guide');
    expect(g[0].querySelector('[data-pd19-goal]').textContent).toBe('Goal: I can use field marks to tell look-alikes apart and read an IUCN Red List status.');
    expect(g[0].nextElementSibling.classList.contains('crdx-hero')).toBe(true);
    expect(g[0].querySelector('[data-pd19-panel]')).toBe(null);
  });

  it('gives nothing away before a pick, and the order of the options follows their words', async () => {
    for (const [sec, seed] of [['dive', DIVE], ['guide', GUIDE]]) {
      const { host } = await mount(seed);
      await click(host.querySelector('[data-pd19-open=check]'));
      const panel = host.querySelector('[data-pd19-panel=check]');
      const qs = X.coralReefGl20.questions(env, sec);
      expect(qs.length, sec).toBe(2);
      expect(host.querySelector('[data-pd19-open=check]').textContent).toBe('Check yourself (2)');
      expect(panel.querySelectorAll('[data-pd19-q]').length, sec).toBe(2);
      expect(panel.querySelector('[data-pd19-fb], [data-pd19-explain]'), sec).toBe(null);
      const html = panel.outerHTML;
      expect(html.includes('✓') || html.includes('✗'), sec).toBe(false);
      for (const q of qs) {
        expect(html.includes(q.explain), sec + ' ' + q.id + ' explanation').toBe(false);
        for (const o of q.options) expect(html.includes('"' + o.id + '"'), sec + ' option id ' + o.id).toBe(false);
      }
      panel.querySelectorAll('[data-pd19-q]').forEach((li) => {
        expect(li.getAttribute('data-pd19-state')).toBe('open');
        const shapes = opts(li).map((b) => [...b.attributes].filter((a) => a.name !== 'data-pd19-opt').map((a) => a.name + '=' + a.value).join(';'));
        expect(new Set(shapes).size, sec).toBe(1);
        const words = opts(li).map((b) => b.textContent);
        expect(words, sec + ' sorted').toEqual([...words].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
      });
    }
  });

  it('the dive checks: a wrong pick names the answer and explains it; the first pick counts', async () => {
    const { host } = await mount(DIVE);
    await click(host.querySelector('[data-pd19-open=check]'));
    const marks = host.querySelector('[data-pd19-q=marks]');
    expect(marks.querySelector('p').textContent).toBe('Which of these is a field mark that helps you name an animal?');
    // Distance and view are what the dive's chips show beside an organism, not field marks. One form, about one length.
    expect(opts(marks).map((b) => b.textContent)).toEqual(['How far away it is', 'Its color pattern', 'Whether it is in view']);
    await click(opts(marks)[0]);
    expect(marks.querySelector('[data-pd19-fb]').textContent).toBe('Not quite. The answer is: Its color pattern.');
    expect(marks.querySelector('[data-pd19-explain]').textContent).toMatch(/^Things you can see that help you name a species/);
    await click(opts(marks)[2]);
    expect(marks.querySelector('[data-pd19-fb]').getAttribute('data-pd19-fb')).toBe('wrong');
    const role = host.querySelector('[data-pd19-q=role]');
    await click(opts(role).find((b) => b.textContent === 'Filter feeder'));
    expect(role.querySelector('[data-pd19-fb]').textContent).toBe('Correct.');
    expect(role.querySelector('[data-pd19-explain]').textContent).toMatch(/strains tiny bits of food out of the water/);
  });

  it('the guide checks use the guide\'s own field marks and Red List statuses', async () => {
    setWidth(1280);
    const { host } = await mount(GUIDE);
    const [a, b] = X.coralReefGl20.LOOKS_Q;
    // They are look-alikes in the guide itself.
    expect(!!host.querySelector('[data-species="' + a + '"] [data-lookalike="' + b + '"]')).toBe(true);
    const ma = cardMarks(host, a), mb = cardMarks(host, b);
    await click(host.querySelector('[data-pd19-open=check]'));
    const looks = host.querySelector('[data-pd19-q=looks]');
    expect(looks.querySelector('p').textContent).toBe(cardName(host, a) + ' and ' + cardName(host, b) + ' are look-alikes. Which field mark tells you it is a ' + cardName(host, b) + '?');
    const words = opts(looks).map((o) => o.textContent);
    expect(words.length).toBe(2);
    const right = words.filter((w) => mb.includes(w)), wrong = words.filter((w) => ma.includes(w));
    expect([right.length, wrong.length]).toEqual([1, 1]);
    expect(ma.includes(right[0]) || mb.includes(wrong[0])).toBe(false);
    await click(opts(looks).find((o) => o.textContent === wrong[0]));
    expect(looks.querySelector('[data-pd19-fb]').textContent).toBe('Not quite. The answer is: ' + right[0] + '.');
    const why = looks.querySelector('[data-pd19-explain]').textContent;
    expect(why.includes(right[0]) && why.includes(wrong[0])).toBe(true);

    // Risk: the answer is the look-alike whose Red List chip sits higher in IUCN's order.
    const order = X.coralReefGl20.IUCN_ORDER;
    const [r0, r1] = X.coralReefGl20.RISK_Q;
    expect(!!host.querySelector('[data-species="' + r1 + '"] [data-lookalike="' + r0 + '"]')).toBe(true);
    const code = (id) => host.querySelector('[data-species="' + id + '"] [data-iucn]').getAttribute('data-iucn');
    expect(code(r0)).not.toBe(code(r1));
    const top = order.indexOf(code(r0)) > order.indexOf(code(r1)) ? r0 : r1;
    const risk = host.querySelector('[data-pd19-q=risk]');
    const pick = opts(risk).find((o) => o.textContent.startsWith(cardName(host, top)));
    expect(pick.textContent).toBe(cardName(host, top) + ' (' + host.querySelector('[data-species="' + top + '"] [data-iucn] span:last-child').textContent.replace(/^IUCN Red List: /, '').replace(/ \(\d{4}\)$/, '') + ')');
    await click(pick);
    expect(risk.querySelector('[data-pd19-fb]').textContent).toBe('Correct.');
    expect(risk.querySelector('[data-pd19-explain]').textContent).toBe('How likely a species is to die out, as judged by IUCN scientists. From lowest to highest risk: Least Concern, Near Threatened, Vulnerable, Endangered, Critically Endangered.');
  });

  it('the dive card is the same on every site and names no guide species', async () => {
    setWidth(1280);
    const { host: guide } = await mount(GUIDE);
    const names = [...guide.querySelectorAll('[data-species] .cr-sp-name')].map((h) => h.firstChild.textContent.replace(/\s*\([^)]*\)\s*$/, '')).filter(Boolean);
    expect(names.length).toBeGreaterThan(40);
    const seen = [];
    for (const site of ['healthy', 'restoration', 'heatwave']) {
      const { host } = await mount({ section: 'explore', diveSiteId: site });
      const card = host.querySelector('[data-pd19=dive]');
      await click(card.querySelector('[data-pd19-open=check]'));
      let text = card.textContent;
      await click(card.querySelector('[data-pd19-open=words]'));
      text += card.textContent;
      // No species picture in the dive card at all.
      expect(card.querySelector('img'), site).toBe(null);
      for (const n of names) expect(text.includes(n), site + ' names ' + n).toBe(false);
      seen.push(text);
    }
    expect(new Set(seen).size).toBe(1);
  });

  it('words to know: a picture for each word, the right words for each page', async () => {
    const { host: dive } = await mount(DIVE);
    await click(dive.querySelector('[data-pd19-open=words]'));
    expect([...dive.querySelectorAll('[data-pd19-word]')].map((li) => li.getAttribute('data-pd19-word'))).toEqual(['marks', 'species', 'grazers', 'predator', 'filter']);
    const terms = [...dive.querySelectorAll('[data-pd19-word] strong')].map((s) => s.textContent);
    expect(terms).toEqual(['Field marks', 'Species', 'Grazing fish', 'Predator', 'Filter feeder']);
    dive.querySelectorAll('[data-pd19-word]').forEach((li) => expect(li.querySelector('[data-pd19-pic]').getAttribute('aria-hidden')).toBe('true'));

    setWidth(1280);
    const { host } = await mount(GUIDE);
    await click(host.querySelector('[data-pd19-open=words]'));
    expect([...host.querySelectorAll('[data-pd19-word]')].map((li) => li.getAttribute('data-pd19-word'))).toEqual(['marks', 'looks', 'iucn', 'species']);
    expect([...host.querySelectorAll('[data-pd19-word] strong')].map((s) => s.textContent)).toEqual(['Field marks', 'Look-alikes', 'IUCN Red List', 'Species']);
    host.querySelectorAll('[data-pd19-word]').forEach((li) => expect(li.querySelector('[data-pd19-pic]').getAttribute('aria-hidden')).toBe('true'));
    // The look-alike picture: the real portraits of two look-alikes in the guide, unnamed.
    const pics = [...host.querySelectorAll('[data-pd19-word=looks] [data-pd19-pic] img')];
    expect(pics.length).toBe(2);
    expect(pics.every((img) => img.getAttribute('alt') === '')).toBe(true);
    const ids = pics.map((img) => /species\/([a-z_]+)\.webp/.exec(img.getAttribute('src'))[1]);
    expect(!!host.querySelector('[data-species="' + ids[0] + '"] [data-lookalike="' + ids[1] + '"]')).toBe(true);
    // The Red List picture: five steps, each taller than the last.
    const bars = [...host.querySelectorAll('[data-pd19-word=iucn] rect')].slice(1).map((r) => Number(r.getAttribute('height')));
    expect(bars.length).toBe(5);
    expect(bars.every((v, i) => i === 0 || v > bars[i - 1])).toBe(true);
  });

  it('keyboard and screen reader: real buttons that say what they open, labelled groups', async () => {
    for (const seed of [DIVE, GUIDE]) {
      const { host } = await mount(seed);
      const card = host.querySelector('[data-pd19]');
      expect(card.tagName).toBe('SECTION');
      expect(card.getAttribute('aria-label')).toBe('Goal');
      for (const which of ['check', 'words']) {
        const btn = card.querySelector('[data-pd19-open=' + which + ']');
        expect(btn.tagName).toBe('BUTTON');
        expect(btn.getAttribute('type')).toBe('button');
        expect(btn.getAttribute('aria-expanded')).toBe('false');
        btn.focus();
        expect(document.activeElement).toBe(btn);
        await click(btn);
        expect(btn.getAttribute('aria-expanded')).toBe('true');
        const panel = document.getElementById(btn.getAttribute('aria-controls'));
        expect(panel.getAttribute('role')).toBe('region');
        expect(panel.getAttribute('aria-label')).toBe(btn.textContent);
        if (which === 'check') panel.querySelectorAll('[role=group]').forEach((g) => {
          const label = document.getElementById(g.getAttribute('aria-labelledby'));
          expect(label && label.textContent.length > 10).toBe(true);
          g.querySelectorAll('button').forEach((b) => expect(b.getAttribute('aria-pressed')).toBe('false'));
        });
        await click(btn);
        expect(host.querySelector('[data-pd19-panel]')).toBe(null);
      }
    }
  });

  it('answers are not saved: the tool data does not change', async () => {
    for (const seed of [DIVE, GUIDE]) {
      const { host, box } = await mount(seed);
      const before = JSON.stringify(box.data);
      await click(host.querySelector('[data-pd19-open=check]'));
      await click(host.querySelector('[data-pd19-q] [data-pd19-opt]'));
      expect(host.querySelector('[data-pd19-fb]')).not.toBe(null);
      expect(JSON.stringify(box.data)).toBe(before);
    }
  });
});

describe('no length or place cue across every goal card', () => {
  it('the right option is not reliably the longest, the shortest, or in one place', async () => {
    setWidth(1280);
    const pages = [['methods', 'pd19'], ['survey', 'pd19'], ['compare', 'pd19'], ['science', 'pd19'], ['model', 'pd19'], ['explore', 'gl20', 'dive'], ['guide', 'gl20', 'guide']];
    const rows = [];
    for (const [section, lane, sec] of pages) {
      const { host } = await mount({ section });
      await click(host.querySelector('[data-pd19-open=check]'));
      const list = lane === 'pd19' ? X.coralReefPd19.questions(env, section) : X.coralReefGl20.questions(env, sec);
      for (const q of list) {
        const answer = q.options.find((o) => o.id === q.answer).label;
        const shown = opts(host.querySelector('[data-pd19-q="' + q.id + '"]')).map((b) => b.textContent);
        const at = shown.indexOf(answer), others = shown.filter((w, i) => i !== at).map((w) => w.length);
        expect(at, section + ' ' + q.id).toBeGreaterThanOrEqual(0);
        rows.push({ id: section + ':' + q.id, longest: answer.length > Math.max(...others), shortest: answer.length < Math.min(...others), first: at === 0, last: at === shown.length - 1 });
      }
    }
    expect(rows.length).toBe(13);
    const n = (k) => rows.filter((r) => r[k]).length;
    // Never always, and never most of the time.
    for (const k of ['longest', 'shortest', 'first', 'last']) expect(n(k), k + ' ' + JSON.stringify(rows.filter((r) => r[k]).map((r) => r.id))).toBeLessThanOrEqual(Math.floor(rows.length * 0.6));
    // The dive field-mark options are one form and close in length.
    const { host } = await mount(DIVE);
    await click(host.querySelector('[data-pd19-open=check]'));
    const lens = opts(host.querySelector('[data-pd19-q=marks]')).map((b) => b.textContent.length);
    expect(Math.max(...lens) - Math.min(...lens)).toBeLessThanOrEqual(5);
  });
});

describe('the Species guide still works with the card', () => {
  it('phone picture grid stays, and a profile opens and closes without the card', async () => {
    setWidth(390);
    const { host } = await mount(GUIDE);
    expect(!!host.querySelector('.crds-guide[data-gd10-grid=true]')).toBe(true);
    expect(host.querySelectorAll('[data-pd19=guide]').length).toBe(1);
    await click(host.querySelector('[data-pd19-open=words]'));
    expect(host.querySelectorAll('[data-pd19-word]').length).toBe(4);
    await click(host.querySelector('[data-species=green_turtle] [data-open-profile]'));
    expect(host.querySelector('[data-marine-profile=green_turtle]')).not.toBe(null);
    expect(host.querySelector('[data-pd19]')).toBe(null);
    await click(host.querySelector('[data-close-profile]'));
    expect(host.querySelector('[data-marine-profile]')).toBe(null);
    expect(host.querySelectorAll('[data-pd19=guide]').length).toBe(1);
    expect(!!host.querySelector('.crds-guide[data-gd10-grid=true]')).toBe(true);
  });
});

describe('new strings', () => {
  it('every gl20 string has an English fallback, no dashes, and there are few', () => {
    const src = readFileSync(path.resolve(process.cwd(), TOOL), 'utf8');
    const keys = src.match(/stem\.coralreef\.gl20_[a-z0-9_]+/g) || [];
    const calls = src.match(/__alloT\('stem\.coralreef\.gl20_[a-z0-9_]+', '(?:[^'\\]|\\.)+'\)/g) || [];
    expect(calls.length).toBeGreaterThan(10);
    expect(calls.length).toBe(keys.length);
    expect(new Set(keys).size).toBeLessThanOrEqual(20);
    calls.forEach((c) => expect(/[–—]/.test(c), c).toBe(false));
  });
});
