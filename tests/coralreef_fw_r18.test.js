import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';

// Round 18 lane web: the dash-and-dot goatfish and the sixbar wrasse join "Who eats whom".
// Each eats only what its own sources say, hunters reach them through the "Smaller reef
// fishes" group (as for the other member species), the prepared cases give the same
// answers, nothing leaks before the reveal, and their arrows route without crossing a box.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, React, ReactDOMClient, W, X, V;
const t = (k, f) => f || k;
const NEW = ['dash_and_dot_goatfish', 'sixbar_wrasse'];
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  const E = window.__RR_TEST_EXPORTS__;
  W = E.coralReefWeb; X = E.coralReef; V = E.coralReefDataVisuals;
});
const mounted = [];
afterEach(async () => {
  while (mounted.length) { const m = mounted.pop(); await React.act(async () => m.root.unmount()); m.host.remove(); }
});
async function mount(seed) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Shell() { const [d, setD] = React.useState({ coralReef: { section: 'science', sciTopic: 'web', ...seed } }); return window.StemLab._registry.coralReef.render({ React, toolData: d, setToolData: setD, t, announceToSR() {} }); }
  mounted.push({ host, root });
  await React.act(async () => root.render(React.createElement(Shell)));
  return host;
}
const linksFrom = (id) => W.LINKS.filter((l) => l.from === id);

describe('two new fish on the food web', () => {
  it('are boxes in the middle row, each placed once, and members of the smaller reef fishes group', () => {
    const all = W.allIds(), mid = W.ROWS.find((r) => r.id === 'mid');
    for (const id of NEW) {
      expect(all.filter((x) => x === id).length, id).toBe(1);
      expect(mid.ids, id).toContain(id);
      expect(W.GROUPS.reef_fishes, id).toContain(id);
    }
    // Wrasse beside wrasse, goatfish beside the other fish that eat small animals (fewest arrow crossings measured).
    expect(mid.ids.indexOf('sixbar_wrasse') + 1).toBe(mid.ids.indexOf('cleaner_wrasse'));
    expect(mid.ids.indexOf('porcupinefish') + 1).toBe(mid.ids.indexOf('dash_and_dot_goatfish'));
    const catalog = all.filter((id) => !W.EXTRA.includes(id));
    expect(catalog.length).toBeLessThanOrEqual(32);
  });

  it('eat only what their own sources name, and every link resolves to a real source', () => {
    const want = { dash_and_dot_goatfish: { small_animals: /crabs|crustaceans/ }, sixbar_wrasse: { small_animals: /crustaceans/, plankton: /planktonic crustaceans/ } };
    const profiles = X.marineProfiles(t);
    for (const id of NEW) {
      const got = linksFrom(id);
      expect(got.map((l) => l.to + ':' + l.kind).sort(), id).toEqual(Object.keys(want[id]).map((k) => k + ':eats').sort());
      for (const l of got) {
        expect(l.sources.length, id + '>' + l.to).toBeGreaterThan(0);
        const src = X.marineEntrySources({ sources: l.sources });
        expect(src.map((s) => s.id)).toEqual(l.sources);
        for (const s of src) expect(profiles[id].sources, s.id).toContain(s.id);
        // At least one cited text names this food.
        expect(src.some((s) => want[id][l.to].test(s.text)), id + '>' + l.to).toBe(true);
      }
      // Nothing is drawn as eating them directly: no species source names them as prey.
      expect(W.LINKS.filter((l) => l.to === id), id).toEqual([]);
      // And no fish-eating link of their own: that would loop inside their own group.
      expect(got.some((l) => l.to === 'reef_fishes'), id).toBe(false);
    }
  });

  it('list the hunters of their group, and only those, as reaching them through the group', () => {
    const hunters = W.LINKS.filter((l) => l.kind === 'eats' && l.to === 'reef_fishes').map((l) => l.from).sort();
    expect(hunters.length).toBeGreaterThan(5);
    for (const id of NEW) {
      const r = W.related(id);
      expect(r.eatenBy.every((e) => e.viaGroup === 'reef_fishes'), id).toBe(true);
      expect(r.eatenBy.map((e) => e.id).sort(), id).toEqual(hunters);
      expect(r.groups).toEqual(['reef_fishes']);
    }
  });

  it('leave every prepared case with the answers it had', () => {
    const expected = {
      grazers: { algae: 'more', polyps: 'fewer', clown_triggerfish: 'same' },
      triton: { crown_of_thorns: 'more', polyps: 'fewer', parrotfish: 'same' },
      sharks: { reef_fishes: 'more', peacock_grouper: 'more', algae: 'fewer' },
      cleaner: { parasites: 'more', reef_fishes: 'fewer', blackfin_barracuda: 'fewer' },
      farmer: { farm_turf: 'fewer', algae: 'more', polyps: 'fewer' }
    };
    expect(W.CASES.map((c) => c.id).sort()).toEqual(Object.keys(expected).sort());
    for (const c of W.CASES) {
      const got = {};
      for (const g of W.caseResult(c).groups) got[g.id] = g.dir;
      expect(got, c.id).toEqual(expected[c.id]);
    }
    // Group members share the group's change, as the rule says.
    const e = W.effects(['whitetip_reef_shark', 'blacktip_reef_shark']);
    for (const id of NEW) expect(e[id], id).toMatchObject({ dir: 'more', reason: 'in_group' });
  });

  it('do not appear in the sharks case until the rule is run, then show in its full list', async () => {
    const inv = (host) => host.querySelector('[aria-labelledby="cr-fw-inv-title"]');
    let host = await mount({ sciWeb: { caseId: 'sharks' } });
    let text = inv(host).textContent;
    expect(text.includes('Reef sharks')).toBe(true);
    for (const n of ['Dash-and-dot goatfish', 'Sixbar wrasse']) expect(text.includes(n), n).toBe(false);
    expect(inv(host).querySelector('[data-fw-result]')).toBe(null);
    const pred = { reef_fishes: 'more', peacock_grouper: 'same', algae: 'same' };
    host = await mount({ sciWeb: { caseId: 'sharks', cases: { sharks: { pred, revealed: true } } } });
    text = inv(host).textContent;
    expect(inv(host).querySelector('[data-fw-result="sharks"]')).toBeTruthy();
    expect(text.includes('Dash-and-dot goatfish: Likely more.')).toBe(true);
    expect(text.includes('Sixbar wrasse: Likely more.')).toBe(true);
  });

  it('show their food and their group hunters in the chosen-species panel', async () => {
    const host = await mount({ sciWeb: { sel: 'sixbar_wrasse' } });
    const panel = host.querySelector('[data-fw-panel="sixbar_wrasse"]');
    expect(panel).toBeTruthy();
    expect(panel.textContent.includes('It eats (2)')).toBe(true);
    expect(panel.textContent.includes('Their sources name fishes in general, not this species')).toBe(true);
    const chip = host.querySelector('.fw-chip[data-fw-id="dash_and_dot_goatfish"]');
    expect(chip.textContent.includes('Dash-and-dot goatfish')).toBe(true);
  });
});

describe('their arrows stay off every box', () => {
  // The same page-like layout as the round 7 routing test: 86 px chips, centered, wrapping.
  function layout(webW, chipH) {
    const chips = {}, heads = {};
    let y = 0;
    W.ROWS.forEach((row, bi) => {
      heads[bi] = { left: 18, right: Math.min(webW - 20, 18 + 520), top: y + 10, bottom: y + 28 };
      y += 36;
      const perLine = Math.max(1, Math.floor((webW - 20 + 6) / 92));
      for (let i = 0; i < row.ids.length; i += perLine) {
        const line = row.ids.slice(i, i + perLine), lw = line.length * 92 - 6;
        line.forEach((id, k) => { const left = (webW - lw) / 2 + k * 92; chips[id] = { left, right: left + 86, top: y, bottom: y + chipH, band: bi }; });
        y += chipH + 6;
      }
      y += 6;
    });
    return { W: webW, H: y, chips, heads };
  }
  function linksFor(sel) {
    const r = W.related(sel), out = [];
    const eats = (id) => r.eats.some((e) => e.id === id) || r.eatenBy.some((e) => e.id === id);
    r.eats.forEach((e) => out.push({ key: 'f' + e.id, from: e.id, to: sel }));
    r.eatenBy.forEach((e) => { if (!e.viaGroup) out.push({ key: 'e' + e.id, from: sel, to: e.id }); });
    r.ties.forEach((tie) => { if (!tie.viaGroup && !eats(tie.id)) out.push({ key: 't' + tie.id, from: tie.active ? sel : tie.id, to: tie.active ? tie.id : sel, dashed: true }); });
    r.groups.forEach((g) => out.push({ key: 'g' + g, from: sel, to: g, dashed: true }));
    r.members.forEach((m) => out.push({ key: 'm' + m, from: sel, to: m, dashed: true }));
    return out;
  }
  const segHits = (p, q, b) => Math.min(p[0], q[0]) < b.right && Math.max(p[0], q[0]) > b.left && Math.min(p[1], q[1]) < b.bottom && Math.max(p[1], q[1]) > b.top;
  for (const [webW, chipH] of [[754, 110], [524, 118], [860, 96]]) {
    it('web ' + webW + ' px: each new link is drawn and crosses no species box', () => {
      const geom = layout(webW, chipH), bad = [], drawn = new Set();
      for (const sel of [...NEW, 'small_animals', 'plankton', 'reef_fishes']) {
        const want = linksFor(sel);
        const lines = V.fwRouteAll(want, geom);
        expect(lines.length, sel).toBe(want.length);
        for (const line of lines) {
          if (NEW.includes(line.from) || NEW.includes(line.to)) drawn.add(line.from + '>' + line.to);
          for (let i = 1; i < line.points.length; i++) {
            const p = line.points[i - 1], q = line.points[i];
            for (const id of Object.keys(geom.chips)) if (id !== line.from && id !== line.to && segHits(p, q, geom.chips[id])) bad.push(sel + ': ' + line.key + ' crosses ' + id);
          }
        }
      }
      // Arrows run from food to eater; dashed lines from member to group.
      for (const k of ['small_animals>dash_and_dot_goatfish', 'small_animals>sixbar_wrasse', 'plankton>sixbar_wrasse', 'dash_and_dot_goatfish>reef_fishes', 'sixbar_wrasse>reef_fishes', 'reef_fishes>dash_and_dot_goatfish', 'reef_fishes>sixbar_wrasse']) expect(drawn.has(k), k).toBe(true);
      expect(bad).toEqual([]);
    });
  }
});
