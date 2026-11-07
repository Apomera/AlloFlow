import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Lane tc10: the For teachers visual pass. The planner widths and period marks
// come from one table that must agree with the words, the misconception cards
// and related tool names are split from the one translated string with a safe
// fallback, and no words are lost or retyped.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SRC = readFileSync(TOOL, 'utf8');
const IDS = ['explore', 'methods', 'survey', 'compare', 'science', 'model'];
const MINUTES = { explore: 40, methods: 25, survey: 45, compare: 30, science: 50, model: 45 };
let loadTool, resetStemLab, renderTool, React, ReactDOMClient, T, PR, runIsolatedAxe;

beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, renderTool, React, ReactDOMClient } = mod);
  ({ runIsolatedAxe } = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/isolated_axe_harness.js').replace(/\\/g, '/')));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  T = window.__RR_TEST_EXPORTS__.coralReefTeacher; PR = window.__RR_TEST_EXPORTS__.coralReefPrint;
});

const mounted = [];
afterEach(async () => {
  while (mounted.length) { const m = mounted.pop(); await React.act(async () => m.root.unmount()); m.host.remove(); }
  vi.restoreAllMocks();
});
const parse = (html) => new DOMParser().parseFromString('<!doctype html><body>' + html + '</body>', 'text/html').body;
const teacher = (theme) => parse(renderTool('coralReef', { coralReef: { section: 'teacher' } }, theme ? { theme } : undefined));
async function mount(extra, seed) {
  let data = { coralReef: Object.assign({ section: 'teacher' }, seed) };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data); data = toolData;
    return cfg.render(Object.assign({ React, toolData, setToolData, theme: 'light', t: (k, f) => f || k, announceToSR: () => {} }, extra || {}));
  }
  await React.act(async () => { root.render(React.createElement(Shell)); });
  mounted.push({ host, root });
  return { host, get data() { return data.coralReef; } };
}
const english = (key) => {
  const m = new RegExp("__alloT\\('stem\\.coralreef\\." + key + "',\\s*'((?:[^'\\\\]|\\\\.)*)'\\)").exec(SRC);
  expect(m, key).not.toBe(null);
  return m[1].replace(/\\'/g, "'");
};

describe('planner: minutes come from one table that matches the words', () => {
  it('the table holds the six numbers and each one is in its English time string', () => {
    expect(T.MINUTES).toEqual(MINUTES);
    IDS.forEach((id) => {
      const said = english('w2_t_time_' + id);
      // The first number in the string is the step's whole time.
      expect(/\d+/.exec(said)[0], id).toBe(String(T.MINUTES[id]));
    });
  });

  it('draws a real list of six labelled segments as wide as their minutes', () => {
    const host = teacher();
    const plan = host.querySelector('ol[data-tc10-plan]');
    expect(plan).not.toBe(null);
    expect(plan.closest('[aria-hidden="true"]')).toBe(null);
    const heading = plan.closest('section').querySelector('h3');
    expect(plan.getAttribute('aria-labelledby')).toBe(heading.id);
    const segs = [...plan.children];
    expect(segs.map((li) => li.tagName)).toEqual(IDS.map(() => 'LI'));
    expect(segs.map((li) => li.getAttribute('data-tc10-seg'))).toEqual(IDS);
    segs.forEach((li, i) => {
      const id = IDS[i];
      expect(li.getAttribute('data-min')).toBe(String(MINUTES[id]));
      expect(String(li.style.flexGrow), id).toBe(String(MINUTES[id]));
      // Words, not colour: number, name and minutes are all text.
      const copy = li.cloneNode(true);
      copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
      expect(copy.textContent).toContain(String(i + 1));
      expect(copy.textContent).toContain(MINUTES[id] + ' min');
    });
    expect(segs[0].textContent).toContain('Dive and explore');
    expect(segs[5].textContent).toContain('Reef future');
    // The art strip above it keeps the same proportions.
    const art = [...host.querySelectorAll('[data-pg-art="timeline"] .pg-tseg')];
    art.forEach((a, i) => expect(a.style.flexGrow).toBe(segs[i].style.flexGrow));
  });

  it('states the total, worked out from the table', () => {
    const total = IDS.reduce((s, id) => s + MINUTES[id], 0);
    expect(total).toBe(235);
    expect(teacher().querySelector('[data-tc10-plan-note]').textContent).toContain('about ' + total + ' in all');
  });
});

describe('planner: period marks agree with the heading and claim no exact boundary', () => {
  it('the heading still says what the marks use', () => {
    const said = english('w2_t_flow_title');
    expect(said).toContain('about five class periods of 45 to 50 minutes');
    expect(T.PERIODS).toEqual({ count: 5, lo: 45, hi: 50 });
  });

  it('marks each break as a range, from the same table', () => {
    const p = T.periods(IDS, T.MINUTES);
    expect(p.total).toBe(235);
    expect(p.bands.map((b) => [b.from, b.to])).toEqual([[45, 50], [90, 100], [135, 150], [180, 200]]);
    p.bands.forEach((b) => expect(b.to).toBeGreaterThan(b.from));
    expect(p.labels.map((l) => l.n)).toEqual([1, 2, 3, 4, 5]);
    // Each label sits inside its own period.
    p.labels.forEach((l, i) => {
      if (i > 0) expect(l.at).toBeGreaterThan(p.bands[i - 1].from);
      if (i < p.bands.length) expect(l.at).toBeLessThan(p.bands[i].to);
    });
  });

  it('draws no marks when the minutes stop agreeing with five periods', () => {
    const short = { a: 100, b: 100 }, long = { a: 200, b: 200 };
    expect(T.periods(['a', 'b'], short).bands).toEqual([]);
    expect(T.periods(['a', 'b'], long).bands).toEqual([]);
    expect(T.periods(['a', 'b'], short).labels).toEqual([]);
    expect(T.periods(['a', 'b'], { a: 112, b: 113 }).bands.length).toBe(4); // 225, the lowest that agrees
    expect(T.periods(['a', 'b'], { a: 125, b: 125 }).bands.length).toBe(4); // 250, the highest that agrees
  });

  it('renders the bands hidden from screen readers, with the note saying they are rough', () => {
    const host = teacher();
    const ruler = host.querySelector('[data-tc10-ruler]');
    expect(ruler.getAttribute('aria-hidden')).toBe('true');
    expect([...ruler.querySelectorAll('[data-tc10-band]')].map((b) => b.getAttribute('data-from') + '-' + b.getAttribute('data-to'))).toEqual(['45-50', '90-100', '135-150', '180-200']);
    const note = host.querySelector('[data-tc10-plan-note]');
    expect(note.closest('[aria-hidden="true"]')).toBe(null);
    expect(note.textContent).toMatch(/roughly/);
    expect(note.textContent).toContain('45 to 50 minutes');
  });

  it('places a band with gaps counted, so it lines up with the segments', () => {
    // 135 to 150 crosses the end of step 4 at minute 140: one more 4 px gap inside it.
    const c = T.bandCss(IDS, T.MINUTES, 135, 150);
    expect(c.start).toBe('calc((100% - 20px) * 0.57447 + 12px)');
    expect(c.width).toBe('calc((100% - 20px) * 0.06383 + 4px)');
    expect(T.bandCss(IDS, T.MINUTES, 45, 50).start).toBe('calc((100% - 20px) * 0.19149 + 4px)');
  });
});

describe('step cards', () => {
  const STEP_KEYS = {
    explore: ['t_flow_dive', 'w2_t_do_explore', 'w2_t_goal_explore', 'w2_t_ask_explore'],
    methods: ['t_flow_1', 'inv_t_do_methods', 'w2_t_goal_methods', 'w2_t_ask_methods'],
    survey: ['w2_t_flow_survey', 'inv_t_do_survey', 'w2_t_goal_survey', 'w2_t_ask_survey'],
    compare: ['w2_t_flow_compare', 'w2_t_do_compare', 'w2_t_goal_compare', 'w2_t_ask_compare'],
    science: ['w2_t_flow_science', 'w2_t_do_science', 'w2_t_goal_science', 'w2_t_ask_science']
  };
  it('keeps every word and puts Students, Goal and Ask in their own blocks', () => {
    const host = teacher();
    const lis = [...host.querySelectorAll('ol.cr-teacher-flow > li')];
    expect(lis.length).toBe(6);
    lis.forEach((li, i) => {
      const id = IDS[i];
      const blocks = [...li.querySelectorAll('dl > .tc10-b')];
      expect(blocks.map((b) => b.querySelector('dt').textContent), id).toEqual(['Students', 'Goal', 'Ask']);
      blocks.forEach((b) => {
        const icon = b.querySelector('dt svg');
        expect(icon.getAttribute('aria-hidden')).toBe('true');
        expect(icon.getAttribute('focusable')).toBe('false');
      });
      expect(blocks[2].getAttribute('data-tc10-ask')).toBe('true');
      expect(blocks.filter((b) => b.hasAttribute('data-tc10-ask')).length).toBe(1);
      // Lead first, then the time, so "lead sentence and time on top" is also the reading order.
      expect(li.children[0].classList.contains('tc10-lead')).toBe(true);
      const kids = [...li.children];
      expect(kids.indexOf(li.querySelector('.tc10-time'))).toBeLessThan(kids.indexOf(li.querySelector('dl')));
      if (STEP_KEYS[id]) {
        const [lead, does, goal, ask] = STEP_KEYS[id].map(english);
        expect(li.querySelector('.tc10-lead').textContent).toBe(lead);
        expect(blocks[0].querySelector('dd').textContent).toBe(does);
        expect(blocks[1].querySelector('dd').textContent).toBe(goal);
        expect(blocks[2].querySelector('dd').textContent).toBe(ask);
      }
    });
  });

  it('shows the scenario names as a list of chips', () => {
    const X = window.__RR_TEST_EXPORTS__.coralReef;
    const host = teacher();
    const last = host.querySelector('[data-w2-tstep="model"]');
    const chips = last.querySelector('ul.tc10-chips');
    expect(chips).not.toBe(null);
    expect(chips.children.length).toBe(X.SCENARIOS.length);
    expect([...chips.children].every((n) => n.tagName === 'LI' && n.textContent.length > 0)).toBe(true);
  });
});

describe('claim split: never breaks a translation', () => {
  const split = (s) => T.splitClaim(s);
  const claimOf = (s) => split(s).claim;
  it.each([
    ['English straight', '"Bleached coral is dead." Bleached coral is alive.', '"Bleached coral is dead."', 'Bleached coral is alive.'],
    ['curly', '\u201CBleached coral is dead.\u201D Bleached coral is alive.', '\u201CBleached coral is dead.\u201D', 'Bleached coral is alive.'],
    ['German low-high', '\u201EGebleichte Koralle ist tot.\u201C Sie lebt.', '\u201EGebleichte Koralle ist tot.\u201C', 'Sie lebt.'],
    ['French guillemets with spaces', '\u00AB\u00A0Le corail blanchi est mort.\u00A0\u00BB Il est vivant.', '\u00AB\u00A0Le corail blanchi est mort.\u00A0\u00BB', 'Il est vivant.'],
    ['reversed guillemets', '\u00BBTot.\u00AB Lebt.', '\u00BBTot.\u00AB', 'Lebt.'],
    ['Japanese brackets, no space', '\u300C\u767D\u5316\u3057\u305F\u30B5\u30F3\u30B4\u306F\u6B7B\u3093\u3067\u3044\u308B\u300D\u751F\u304D\u3066\u3044\u307E\u3059\u3002', '\u300C\u767D\u5316\u3057\u305F\u30B5\u30F3\u30B4\u306F\u6B7B\u3093\u3067\u3044\u308B\u300D', '\u751F\u304D\u3066\u3044\u307E\u3059\u3002'],
    ['Chinese curly, no space', '\u201C\u767D\u5316\u7684\u73CA\u745A\u6B7B\u4E86\u3002\u201D\u5B83\u8FD8\u6D3B\u7740\u3002', '\u201C\u767D\u5316\u7684\u73CA\u745A\u6B7B\u4E86\u3002\u201D', '\u5B83\u8FD8\u6D3B\u7740\u3002'],
    ['no sentence mark, capital after', '\u00ABLe corail est mort\u00BB Il est vivant.', '\u00ABLe corail est mort\u00BB', 'Il est vivant.'],
    ['full stop after the quote', '"Bleached coral is dead". It is alive.', '"Bleached coral is dead".', 'It is alive.'],
    ['single curly', '\u2018Dead.\u2019 Alive.', '\u2018Dead.\u2019', 'Alive.'],
    ['leading direction mark', '\u200F\u00ABDead.\u00BB Alive.', '\u200F\u00ABDead.\u00BB', 'Alive.']
  ])('%s', (_n, text, claim, rest) => {
    const s = split(text);
    expect(s.claim).toBe(claim);
    expect(s.rest).toBe(rest);
    expect(s.claim + s.sep + s.rest).toBe(text);
  });

  it.each([
    ['no quotes at all', 'Bleached coral is alive and can recover.'],
    ['quote that never closes', '"Bleached coral is dead. It is alive.'],
    ['nothing after the quote', '"Bleached coral is dead."'],
    ['nothing inside the quote', '"" It is alive.'],
    ['quote is not at the start', 'Students say "dead". It is alive.'],
    ['an apostrophe word at the start', "L'algue n'est pas morte, elle vit."],
    ['straight quotes nested in the claim', '"A "model" run is a forecast." Each run differs.'],
    ['a quoted word opening a sentence', '"Bleached" coral is alive and can recover.'],
    ['word stuck to the closing quote', '"Dead."Alive.'],
    ['empty', ''],
    ['not a string', null]
  ])('falls back to the whole text: %s', (_n, text) => {
    const s = split(text);
    expect(s.claim).toBe(null);
    expect(s.sep).toBe('');
    expect(s.rest).toBe(text == null ? '' : text);
  });

  it('keeps later quotes in the correction', () => {
    expect(claimOf('"A model run is a forecast." Each run differs; try "Run it 20 times" to see.')).toBe('"A model run is a forecast."');
  });
});

describe('misconception cards', () => {
  it('splits every English string, loses nothing, and keeps where lines on five cards', () => {
    const host = teacher();
    const list = host.querySelector('ul.tc10-mis');
    expect(list).not.toBe(null);
    const cards = [...list.children];
    expect(cards.length).toBe(8);
    cards.forEach((li) => {
      expect(li.tagName).toBe('LI');
      expect(li.getAttribute('data-split')).toBe('true');
      expect(li.querySelector('.tc10-claim').textContent).toMatch(/^".+"$/);
      expect(li.querySelector('.tc10-fix').textContent.length).toBeGreaterThan(20);
    });
    expect(cards.map((c) => !!c.querySelector('.tc10-where'))).toEqual([true, true, true, true, true, false, false, false]);
    // A card with no where line has no empty element standing in for it.
    cards.slice(5).forEach((c) => expect([...c.querySelectorAll('p')].every((p) => p.textContent.trim().length > 0)).toBe(true));
    const one = english('t_mis_1');
    expect(cards[0].querySelector('.tc10-claim').textContent + ' ' + cards[0].querySelector('.tc10-fix').textContent).toBe(one);
    const heading = list.closest('section').querySelector('h3');
    expect(heading.textContent).toBe('Misconceptions each step is built to test');
  });

  it('shows the whole text as one block when a translation has no quotes', async () => {
    const t = (k, f) => (k === 'stem.coralreef.t_mis_1' ? 'Korallen ohne Anfuehrungszeichen leben noch.' : k === 'stem.coralreef.t_mis_2' ? '\u00ABAlgues.\u00BB Elles font partie du recif.' : f || k);
    const { host } = await mount({ t });
    const cards = [...host.querySelectorAll('ul.tc10-mis > li')];
    expect(cards[0].getAttribute('data-split')).toBe('false');
    expect(cards[0].querySelector('.tc10-claim')).toBe(null);
    expect(cards[0].querySelector('.tc10-fix').textContent).toBe('Korallen ohne Anfuehrungszeichen leben noch.');
    expect(cards[0].querySelector('.tc10-where')).not.toBe(null);
    const fr = cards[5];
    expect(fr.getAttribute('data-split')).toBe('true');
    expect(fr.querySelector('.tc10-claim').textContent).toBe('\u00ABAlgues.\u00BB');
  });
});

describe('printables picker thumbnails', () => {
  it('adds one distinct hidden paper drawing per handout and keeps the controls', async () => {
    const { host, data } = await mount();
    expect(data.pr4Handout).toBe(undefined);
    const box = host.querySelector('fieldset.pr4-pick');
    const opts = [...box.querySelectorAll('.pr4-opt')];
    expect(opts.map((o) => o.getAttribute('data-pr4-opt'))).toEqual(['datasheet', 'cards', 'notebook', 'key']);
    const drawn = opts.map((o) => {
      const svg = o.querySelector('svg[data-tc10-thumb]');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.getAttribute('data-tc10-thumb')).toBe(o.getAttribute('data-pr4-opt'));
      return svg.innerHTML;
    });
    expect(new Set(drawn).size).toBe(4);
    const radios = [...box.querySelectorAll('input[type=radio]')];
    expect(new Set(radios.map((r) => r.name)).size).toBe(1);
    expect(radios.filter((r) => r.checked).map((r) => r.value)).toEqual(['datasheet']);
    // Label text stays exactly the handout name and description.
    expect(opts[0].querySelector('strong').textContent).toBe('Survey data sheet');
    expect(opts[0].textContent.startsWith('Survey data sheet')).toBe(true);
    await React.act(async () => radios[2].click());
    expect(box.querySelector('.pr4-opt.pr4-on').getAttribute('data-pr4-opt')).toBe('notebook');
  });

  it('draws as many cards on the thumbnail as a printed page holds', () => {
    const host = teacher();
    const svg = host.querySelector('svg[data-tc10-thumb="cards"]');
    expect(PR.CARDS_PER_PAGE).toBe(6);
    expect(svg.querySelectorAll('[data-tc10-card]').length).toBe(PR.CARDS_PER_PAGE);
  });

  it('leaves the printed paper alone', () => {
    const host = teacher();
    expect(host.querySelector('[data-pr4-doc] [data-tc10-thumb]')).toBe(null);
  });
});

describe('related tools', () => {
  it.each([
    ['English', 'Climate Explorer: warming and tipping points', 'Climate Explorer', ': ', 'warming and tipping points'],
    ['French space before the colon', 'Explorateur du climat : rechauffement', 'Explorateur du climat', ' : ', 'rechauffement'],
    ['full-width colon', '\u6C14\u5019\u63A2\u7D22\uFF1A\u53D8\u6696', '\u6C14\u5019\u63A2\u7D22', '\uFF1A', '\u53D8\u6696'],
    ['only the first colon splits', 'Lab: one: two', 'Lab', ': ', 'one: two']
  ])('splits %s', (_n, text, head, sep, rest) => {
    const s = T.splitName(text);
    expect([s.head, s.sep, s.rest]).toEqual([head, sep, rest]);
    expect(s.head + s.sep + s.rest).toBe(text);
  });
  it.each([
    ['no colon', 'Climate Explorer'],
    ['colon first', ': warming'],
    ['colon last', 'Climate Explorer:'],
    ['a clock time', 'Reef at 12:30 today'],
    ['empty', '']
  ])('falls back: %s', (_n, text) => {
    const s = T.splitName(text);
    expect(s.head).toBe(null);
    expect(s.rest).toBe(text);
  });

  const related = (host) => [...host.querySelectorAll('section')].find((s) => (s.querySelector('h3') || {}).textContent === 'Related tools');
  it('shows plain text in a list when the tool cannot jump', async () => {
    // The smoke harness passes setStemLabTool, so this one mounts without it.
    const box = related((await mount()).host);
    const items = [...box.querySelectorAll('ul.tc10-rel > li')];
    expect(items.length).toBe(4);
    expect(box.querySelector('button')).toBe(null);
    expect(items[0].textContent).toBe('Aquaculture & Ocean Lab: coral care, water chemistry and bleaching in a tank');
    expect(items[0].querySelector('strong').textContent).toContain('Aquaculture & Ocean Lab');
  });
  it('shows buttons that still jump when it can, and none when embedded', async () => {
    const setStemLabTool = vi.fn();
    const { host } = await mount({ setStemLabTool });
    const buttons = [...related(host).querySelectorAll('ul.tc10-rel > li > button')];
    expect(buttons.length).toBe(4);
    expect(buttons[2].getAttribute('type')).toBe('button');
    expect(buttons[2].textContent).toBe('Climate Explorer: warming and tipping points');
    await React.act(async () => buttons[2].click());
    expect(setStemLabTool).toHaveBeenCalledWith('climateExplorer');
    const embedded = await mount({ setStemLabTool, embedded: true });
    expect(related(embedded.host).querySelector('button')).toBe(null);
  });
  it('shows a translation with no colon as one line', async () => {
    const t = (k, f) => (k === 'stem.coralreef.t_link_climate' ? 'Klima ohne Doppelpunkt' : f || k);
    const { host } = await mount({ t });
    const item = related(host).querySelectorAll('ul.tc10-rel > li')[2];
    expect(item.textContent).toBe('Klima ohne Doppelpunkt');
    expect(item.querySelector('strong')).toBe(null);
  });
});

describe('page rules', () => {
  it('keeps standards collapsed', () => {
    const d = teacher().querySelector('details[data-w2-standards]');
    expect(d).not.toBe(null);
    expect(d.hasAttribute('open')).toBe(false);
  });
  it('keeps headings in order and renders in every theme with no key warnings', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const theme of ['light', 'dark', 'contrast']) {
      const { host } = await mount({ theme });
      expect(host.querySelector('ol[data-tc10-plan]'), theme).not.toBe(null);
      const levels = [...host.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((n) => +n.tagName[1]);
      for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
    const keyErrors = spy.mock.calls.filter((c) => /unique "key"|same key/.test(String(c[0])));
    expect(keyErrors).toEqual([]);
  });
  it('uses two arguments for every tc10 string and no em or en dashes', () => {
    const calls = SRC.match(/__alloT\('stem\.coralreef\.tc10_[a-z0-9_]+'[^)]*\)/g) || [];
    expect(calls.length).toBeGreaterThan(0);
    calls.forEach((c) => {
      expect(c).toMatch(/__alloT\('stem\.coralreef\.tc10_[a-z0-9_]+',\s*'/);
      expect(c).not.toMatch(/[\u2013\u2014]/);
    });
  });
  it('has no axe violations on the page', async () => {
    const result = await runIsolatedAxe(renderTool('coralReef', { coralReef: { section: 'teacher' } }));
    expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', '))).toEqual([]);
  });
});
