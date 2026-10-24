import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
let root, host;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest, patch;
  function App() {
    const [data, setData] = React.useState({ weldLab: { view: 'processSleuth', psIdx: 0, psShown: [0], ...extra } });
    latest = data.weldLab;
    patch = next => setData(prev => ({ ...prev, weldLab: { ...prev.weldLab, ...next } }));
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })),
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, patch: async next => React.act(() => patch(next)) };
}
const C = () => window.__WeldLabCore.proc;
const inspector = () => host.querySelector('[data-sleuth-effects]');
const cells = () => [...inspector().querySelectorAll('[data-sleuth-effect-process]')];
async function observation(n) { await React.act(() => Simulate.change(inspector().querySelector('select'), { target: { value: String(n) } })); }
async function processCell(id) { await React.act(() => inspector().querySelector('[data-sleuth-effect-process="' + id + '"]').click()); }
async function clickText(text) { const b = [...host.querySelectorAll('button')].find(n => n.textContent.trim() === text); expect(b, text).toBeTruthy(); await React.act(() => b.click()); }
async function answerFirst() { const group = host.querySelector('[aria-label="Pick the right welding process"]'); await React.act(() => group.querySelector('button').click()); }
const answered = { psAns: true, psPick: 'tig', proc2_psLocked: true, psRounds: 1, psScore: 1 };

describe('Process Sleuth post-answer clue effect inspector', () => {
  it('reveals no new effects before a valid first answer, including after clues are locked', async () => {
    const app = await mount({ proc2_psClues: [1, 2] });
    expect(inspector()).toBeNull(); expect(host.querySelector('[data-sleuth-effect-kind]')).toBeNull();
    await clickText('Done marking: choose the process →');
    expect(app.latest().proc2_psLocked).toBe(true); expect(inspector()).toBeNull();
    await answerFirst(); expect(inspector()).toBeTruthy();
    const committed = structuredClone(app.latest());
    await observation(5); await processCell('fcaws');
    const choices = host.querySelector('[aria-label="Pick the right welding process"]').querySelectorAll('button');
    await React.act(() => choices[1].click());
    expect(app.latest()).toEqual(committed);
    expect([...choices].every(n => n.getAttribute('aria-disabled') === 'true')).toBe(true);
  });

  it('matches the six exact model cells for every authored observation across all ten vignettes', async () => {
    const app = await mount(answered);
    for (const [i, vignette] of C().PS_V.entries()) {
      await app.patch({ psIdx: i, psShown: [i], psAns: true, psPick: vignette.correct, proc2_psLocked: true });
      expect([...inspector().querySelector('select').options].map(n => Number(n.value))).toEqual(Object.keys(vignette.clues).map(Number));
      for (const [n, clue] of Object.entries(vignette.clues)) {
        await observation(n);
        const kind = C().clueKind(clue);
        expect(inspector().dataset.kind).toBe(kind);
        expect(cells().map(n => n.dataset.sleuthEffectProcess)).toEqual(C().PS_SHOWN);
        const effects = kind === 'noise' ? null : C().effects(clue.f, clue.v, C().PS_SHOWN);
        for (const node of cells()) {
          const id = node.dataset.sleuthEffectProcess;
          if (kind === 'noise') {
            expect(node.dataset.effect).toBe('context'); expect(node.dataset.points).toBe('');
          } else {
            const cell = C().cell(clue.f, clue.v, id);
            const effect = cell.d === null ? 'out' : cell.d > 0 ? 'up' : cell.d < 0 ? 'down' : 'neutral';
            expect(node.dataset.points).toBe(cell.d === null ? 'out' : String(cell.d));
            expect(node.dataset.effect).toBe(effect);
            if (effect !== 'neutral') expect(effects[effect].includes(id)).toBe(true);
          }
        }
      }
    }
  });

  it('distinguishes modeled zero-effect facts from background and preserves the authored background note', async () => {
    const app = await mount(answered);
    await observation(4); expect(inspector().dataset.kind).toBe('neutral');
    expect(cells().every(n => n.dataset.effect === 'neutral' && n.dataset.points === '0')).toBe(true);
    expect(inspector().querySelector('[data-sleuth-effect-reading]').textContent).toContain('Every process here handles this alike');
    await observation(3); expect(inspector().dataset.kind).toBe('noise');
    expect(cells().every(n => n.dataset.effect === 'context' && n.dataset.points === '')).toBe(true);
    expect(inspector().querySelector('[data-sleuth-effect-reading]').textContent).toContain('does not change the process choice');
    await app.patch({ psIdx: 3, psShown: [3], psPick: 'fcaw', proc2_psClues: [3] }); await observation(3);
    expect(inspector().querySelector('[data-sleuth-effect-reading]').textContent).toContain('the question is about the fill and cap passes');
    expect(inspector().querySelector('[data-sleuth-effect-prose]').textContent).toContain('the root pass\'s process does not decide this one');
  });

  it('identifies repeated wording as one factor rather than adding another contribution', async () => {
    await mount({ ...answered, psIdx: 8, psShown: [8], psPick: 'spot' });
    await observation(1); const first = cells().map(n => [n.dataset.sleuthEffectProcess, n.dataset.effect, n.dataset.points]);
    expect(inspector().querySelector('[data-sleuth-effect-duplicate]')).toBeNull();
    for (const n of [4, 5, 6]) {
      await observation(n);
      expect(inspector().dataset.duplicateOf).toBe('1');
      expect(inspector().querySelector('[data-sleuth-effect-duplicate]').textContent).toContain('Repeated wording does not add another contribution');
      expect(cells().map(n => [n.dataset.sleuthEffectProcess, n.dataset.effect, n.dataset.points])).toEqual(first);
    }
    expect(inspector().querySelector('[data-sleuth-effect-prose]').textContent).toContain('Same clue as above, said another way.');
    expect(inspector().textContent).not.toMatch(/Combined score|Total contribution|score ledger/);
  });

  it('keeps FCAW variants distinct and explains the selected process without changing clues, scores or records', async () => {
    const saved = { ...answered, psIdx: 1, psShown: [0, 1], psPick: 'fcaw', proc2_psClues: [3, 5], psRounds: 2, psScore: 2, psStreak: 2, psBest: 2,
      proc2_psLog: [{ v: 1, pick: 'fcaw', ok: true, found: 2, keys: 3, noise: 0 }] };
    const app = await mount(saved); const original = structuredClone(app.latest());
    await observation(3); await processCell('fcawg');
    expect(inspector().querySelector('[data-sleuth-effect-process="fcawg"]').dataset.effect).toBe('down');
    expect(inspector().querySelector('[data-sleuth-effect-reading]').dataset.sleuthEffectReading).toBe('fcawg');
    expect(inspector().querySelector('[data-sleuth-effect-reading]').textContent).toContain('gas');
    await processCell('fcaws');
    expect(inspector().querySelector('[data-sleuth-effect-process="fcaws"]').dataset.effect).toBe('up');
    expect(inspector().querySelector('[data-sleuth-effect-reading]').textContent).not.toContain('undefined');
    await observation(1); await observation(6); await processCell('spot');
    expect(app.latest()).toEqual(original);
    expect([...host.querySelectorAll('[data-sleuth-hotspot]')].every(button => button.disabled)).toBe(true);
  });

  it('keeps every original clue explanation accessible in a native disclosure and the matcher transfer available once', async () => {
    await mount({ ...answered, psIdx: 0, proc2_psClues: [1, 6] });
    const prose = inspector().querySelector('[data-sleuth-effect-prose]');
    expect(prose.textContent).toContain('✓ You marked'); expect(prose.textContent).toContain('○ You missed');
    expect(prose.textContent).toContain('· Fact'); expect(prose.textContent).toContain('▲ Points toward:');
    expect(prose.textContent).toContain('▼ Argues against:'); expect(prose.textContent).toContain('✕ Rules out:');
    expect(prose.textContent).toContain('Every process here handles this alike');
    expect(prose.textContent).toContain('You also marked details that do not change the choice');
    await React.act(() => prose.querySelector('summary').click()); expect(prose.open).toBe(true);
    expect([...host.querySelectorAll('button')].filter(b => b.textContent === 'Try these clues in the Job Matcher →')).toHaveLength(1);
  });

  it('normalizes inspection for the next vignette and preserves the original next/answer/reset flow', async () => {
    const app = await mount(answered); await observation(6); await processCell('spot');
    await clickText('➡️ Next vignette');
    expect(app.latest().psAns).toBe(false); expect(app.latest().proc2_psClues).toEqual([]); expect(inspector()).toBeNull();
    const nextCase = app.latest().psIdx;
    await clickText('Done marking: choose the process →'); expect(inspector()).toBeNull();
    await answerFirst();
    expect(inspector().dataset.case).toBe(String(nextCase)); expect(inspector().dataset.process).toBe('mig');
    const firstKey = Object.keys(C().PS_V[nextCase].clues).map(Number).find(n => C().clueKind(C().PS_V[nextCase].clues[n]) === 'key');
    expect(inspector().dataset.clue).toBe(String(firstKey));
    await app.patch({ psIdx: 0, psShown: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], psAns: true, psPick: 'tig', psRounds: 10, psScore: 5 });
    await clickText('🔄 Restart');
    expect(app.latest().psIdx).toBe(-1); expect(app.latest().psScore).toBe(0); expect(inspector()).toBeNull();
  });

  it('starts a fresh inspector when a one-case missed retry presents the same vignette ID again', async () => {
    const app = await mount({ ...answered, psIdx: 0, psShown: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], psPick: 'mig', psRounds: 10, psScore: 9,
      proc2_psClues: [1, 2], proc2_psLog: [{ v: 0, pick: 'mig', ok: false, found: 2, keys: 3, noise: 0 }] });
    await observation(6); await processCell('spot');
    expect(inspector().dataset.clue).toBe('6'); expect(inspector().dataset.process).toBe('spot');
    await clickText('Retry the 1 you missed');
    expect(app.latest().psIdx).toBe(0); // the real retry path deliberately selects this same case
    expect(app.latest().psAns).toBe(false); expect(app.latest().proc2_psClues).toEqual([]);
    expect(app.latest().psRounds).toBe(0); expect(app.latest().psScore).toBe(0); expect(inspector()).toBeNull();
    await clickText('Done marking: choose the process →'); await answerFirst();
    expect(inspector().dataset.case).toBe('0'); expect(inspector().dataset.clue).toBe('1'); expect(inspector().dataset.process).toBe('mig');
    expect(app.latest().psRounds).toBe(1); expect(app.latest().psPick).toBe('mig');
  });

  it('rejects invalid selector values and does not reveal effects for malformed committed-answer saves', async () => {
    const app = await mount({ psAns: true, psPick: 'constructor', proc2_psLocked: true }); expect(inspector()).toBeNull();
    await app.patch({ psAns: 'true', psPick: 'tig' }); expect(inspector()).toBeNull();
    await app.patch({ ...answered, proc2_psClues: [1, 999, '__proto__'], proc2_psLog: 'invalid' });
    const state = structuredClone(app.latest()); const n = inspector().dataset.clue;
    await observation('__proto__'); await observation(999); expect(inspector().dataset.clue).toBe(n);
    await processCell('spot'); expect(app.latest()).toEqual(state);
    expect(inspector().innerHTML).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('uses labelled native controls, wrapping HTML cells and explicit contrast text in both current and retained readings', async () => {
    await mount(answered, true); await observation(5); await processCell('stick');
    expect(inspector().style.background).toBe('rgb(0, 0, 0)'); expect(inspector().style.color).toBe('rgb(255, 255, 255)');
    const select = inspector().querySelector('select'); expect(inspector().querySelector('label').htmlFor).toBe(select.id);
    expect(select.style.minHeight).toBe('44px'); expect(select.style.width).toBe('100%');
    for (const button of inspector().querySelectorAll('button')) {
      expect(button.style.minHeight).toBe('44px'); expect(button.className).toContain('focus:ring-4');
      expect(button.style.color).toBe('rgb(255, 255, 255)');
    }
    const active = inspector().querySelector('[data-sleuth-effect-process][aria-pressed="true"]'); expect(active.style.borderColor).toBe('rgb(255, 255, 0)');
    expect(cells()[0].parentElement.style.gridTemplateColumns).toContain('auto-fit');
    const prose = inspector().querySelector('[data-sleuth-effect-prose]'); await React.act(() => prose.querySelector('summary').click());
    expect(prose.open).toBe(true);
    for (const row of prose.querySelectorAll('li')) { expect(row.style.color).toBe('rgb(255, 255, 255)'); expect(row.style.background).toBe('rgb(0, 0, 0)'); }
    expect(prose.querySelector('[class*="text-slate-"], [class*="text-emerald-"]')).toBeNull();
    expect(inspector().querySelector('[data-sleuth-effect-legend]').textContent).toContain('— background context');
  });
});
