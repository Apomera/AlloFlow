import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshTool, mountState, unmountState, node, click, change, SRC } from './helpers/weldlab_interaction_mount.js';
import { stripBidRateExplorer } from './helpers/weldlab_bid_rate_restore.js';
const BASE = { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'estimate', sym2_m_seed: 12345, sym2_m_score: 4, sym2_m_tries: 8, sym2_m_rounds: {} };
const problem = () => node().querySelector('[data-sym2-math="bid"]');
const panel = () => node().querySelector('[data-bid-rate]');
const named = text => [...problem().querySelectorAll('button')].find(button => button.textContent.trim() === text);
const n = (element, attr) => Number(element.getAttribute(attr));
function generated(round = 0) { const c = window.__WeldLabCore.sym2; return c.gen('bid', c.mixSeed(12345, c.KINDS.indexOf('bid'), round)); }
async function answer(value) { await change(problem().querySelector('input'), String(value)); await click(named('Check answer')); }
async function reveal() { await answer(0); await click(named('Show the worked solution')); }
const mount = (extra = {}, contrast = false) => mountState({ ...BASE, ...extra }, contrast);
beforeEach(freshTool); afterEach(unmountState);
describe('Revealed small-job rate comparison', () => {
  it('keeps every comparison answer absent until an attempt and worked-solution reveal', async () => {
    const app = await mount(); expect(panel()).toBeNull(); await answer('bad'); expect(panel()).toBeNull(); expect(app.latest().sym2_m_tries).toBe(8);
    await answer(0); expect(panel()).toBeNull(); expect(app.latest().sym2_m_tries).toBe(9); expect(app.latest().sym2_m_score).toBe(4);
    await click(named('Show the worked solution')); expect(panel().tagName).toBe('DETAILS'); expect(panel().open).toBe(false);
    expect(problem().textContent).toContain('Worked solution:'); expect(n(panel(), 'data-rate')).toBe(generated().p.rate);
  });
  it('uses all seven original rates on one fixed dollar scale with exact three-term totals', async () => {
    const app = await mount(); await reveal(); const saved = JSON.stringify(app.latest()), writes = app.writes.length, p = generated().p;
    const maximum = p.hours * 95 + p.materials + p.overhead;
    for (const rate of [65, 70, 75, 80, 85, 90, 95]) {
      await change(panel().querySelector('input'), String(rate)); const total = p.hours * rate + p.materials + p.overhead;
      expect(n(panel(), 'data-total')).toBe(total); expect(n(panel(), 'data-delta')).toBe(p.hours * (rate - p.rate));
      for (const [slot, hourly] of [['reference', p.rate], ['candidate', rate]]) {
        const card = panel().querySelector(`[data-bid-rate-card="${slot}"]`), bar = card.querySelector('[data-bid-rate-bar]');
        expect(n(bar, 'data-max')).toBe(maximum);
        for (const [id, amount] of [['labor', p.hours * hourly], ['materials', p.materials], ['overhead', p.overhead]]) {
          const segment = bar.querySelector(`[data-bid-rate-segment="${id}"]`); expect(n(segment, 'data-value')).toBe(amount);
          expect(parseFloat(segment.style.flexBasis)).toBeCloseTo(amount / maximum * 100, 9);
          expect(n(card.querySelector(`[data-bid-rate-term="${id}"]`), 'data-value')).toBe(amount);
        }
      }
    }
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
  });
  it('restores equal-rate zero change and bounds malformed reference inputs without altering the original answer', async () => {
    await mount(); await reveal(); await click(panel().querySelector('[data-bid-rate-set="high"]'));
    await click(panel().querySelector('[data-bid-rate-set="reference"]')); expect(n(panel(), 'data-delta')).toBe(0);
    const old = n(panel(), 'data-rate'); for (const invalid of ['', null, undefined, {}, 'bad', 'Infinity']) await change(panel().querySelector('input'), invalid);
    expect(n(panel(), 'data-rate')).toBe(old); await change(panel().querySelector('input'), '1'); expect(n(panel(), 'data-rate')).toBe(65);
    await change(panel().querySelector('input'), '200'); expect(n(panel(), 'data-rate')).toBe(95);
    expect(problem().querySelector('#sym2-m-in-bid').value).toBe('0'); expect(problem().textContent).toContain('first try missed');
  });
  it('hides and rebases the comparison for new numbers without changing first-try scoring', async () => {
    const app = await mount(); await reveal(); await click(panel().querySelector('[data-bid-rate-set="high"]')); const oldSeed = n(panel(), 'data-seed');
    await click(named('New numbers')); expect(panel()).toBeNull(); expect(app.latest().sym2_m_rounds.bid).toBe(1);
    await answer(generated(1).answer); expect(n(panel(), 'data-seed')).not.toBe(oldSeed); expect(n(panel(), 'data-rate')).toBe(generated(1).p.rate);
    expect(app.latest().sym2_m_score).toBe(5); expect(app.latest().sym2_m_tries).toBe(10);
  });
  it('opens the original correct worked solution automatically and keeps exploration outside scoring', async () => {
    const app = await mount(); await answer(generated().answer); expect(panel()).toBeTruthy(); expect(problem().textContent).toContain('★ first try');
    const saved = JSON.stringify(app.latest()); await click(panel().querySelector('summary')); await change(panel().querySelector('input'), '95');
    expect(JSON.stringify(app.latest())).toBe(saved); expect(problem().querySelector('#sym2-m-in-bid').value).toBe(String(generated().answer));
  });
  it.each([false, true])('provides native44px controls, full terms and explicit contrast (%s)', async contrast => {
    await mount({}, contrast); await reveal();
    expect(panel().style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    for (const control of panel().querySelectorAll('summary,input,button')) expect(control.style.minHeight).toBe('44px');
    expect(panel().querySelector('input').step).toBe('5'); expect(panel().querySelectorAll('[data-bid-rate-term]')).toHaveLength(6);
    expect(panel().querySelector('style').textContent).toContain('outline:3px solid');
  });
  it('recovers every original math prompt, answer, gate and model after removing this explorer', () => {
    const source = stripBidRateExplorer(stripWeldlabWcagFixes(readFileSync(resolve(SRC), 'utf8')));
    const region = source.slice(source.indexOf('      function MathBlueprintLab() {'), source.indexOf('      function CareerStories() {'));
    const hashes = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-sequence-region-hashes.json'), 'utf8'));
    expect(createHash('sha256').update(region).digest('hex')).toBe(hashes.math);
  });
});
