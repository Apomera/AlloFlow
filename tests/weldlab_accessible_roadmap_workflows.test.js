import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React } from './helpers/stem_widgets_smoke_harness.js';
import { Simulate, node, freshTool, mountState, unmountState, click, button } from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(freshTool);
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; });

const query = selector => node().querySelector(selector);
const retained = { car2_reflect: 'Keep my career notes.', car2_pred: { a: 2, b: 1 }, weldBadges: { ppeSafety: true }, safe2_scPick: { 0: 2 } };
const decisionLabel = index => index === 1 ? 'Decision 1 — age 20: where do you weld next?' : 'Decision 2 — age 22: what do you add?';
const choices = index => [...query(`[role="radiogroup"][aria-label="${decisionLabel(index)}"]`).querySelectorAll('[role="radio"]')];
function keepOutsideFocus() {
  outside = document.createElement('button'); document.body.append(outside); outside.focus();
}
async function activate(element) {
  expect(element).toBeTruthy(); element.focus(); await click(element);
}
function expectFocus(selector) {
  const target = query(selector);
  expect(target, selector).toBeTruthy(); expect(document.activeElement).toBe(target);
  expect(target.tabIndex).toBe(-1); return target;
}
function expectRetained(app) {
  for (const [key, value] of Object.entries(retained)) expect(app.latest()[key]).toEqual(value);
}

describe('WeldLab Maine roadmap navigation', () => {
  it('focuses a selected path and the returned picker while leaving career decision focus on the chosen control', async () => {
    keepOutsideFocus();
    const app = await mountState({ ...retained, view: 'maineEcosystem', me_mode: 'roadmap' });
    expect(document.activeElement).toBe(outside);
    await activate(query('[data-maine-start-path="emcc_boatyard"]'));
    expectFocus('[data-maine-roadmap-heading]');
    expect(app.latest().me_road_path).toBe('emcc_boatyard');
    expect(app.latest().car2_road).toBeUndefined();
    const d1 = choices(1)[0]; await activate(d1);
    expect(document.activeElement).toBe(d1);
    expect(app.latest().car2_road).toEqual({ d1: 'stay', d2: null });
    const d2 = choices(2)[1]; await activate(d2);
    expect(document.activeElement).toBe(d2);
    expect(app.latest().car2_road).toEqual({ d1: 'stay', d2: 'cwi' });
    expect(node().textContent).toContain('Summary: your path against the alternatives');
    const otherD1 = choices(1)[1]; await activate(otherD1);
    expect(document.activeElement).toBe(otherD1);
    expect(app.latest().car2_road).toEqual({ d1: 'cianbro', d2: 'cwi' });
    await activate(button('← Pick a different path'));
    expectFocus('[data-maine-roadmap-picker]');
    expect(query('[data-maine-roadmap-heading]')).toBeNull();
    expect(app.latest()).toMatchObject({ me_road_path: null, car2_road: { d1: 'cianbro', d2: 'cwi' } });
    await activate(query('[data-maine-start-path="ua_apprentice"]'));
    expectFocus('[data-maine-roadmap-heading]');
    expect(app.latest()).toMatchObject({ me_road_path: 'ua_apprentice', car2_road: { d1: 'cianbro', d2: 'cwi' } });
    expectRetained(app);
  });

  it('focuses the first decision after clearing choices removes the summary and reset control', async () => {
    const app = await mountState({ ...retained, view: 'maineEcosystem', me_mode: 'roadmap', me_road_path: 'ua_apprentice', car2_road: { d1: 'stay', d2: 'keep' } });
    await activate(query('[data-maine-year-node="7"]'));
    expect(query('[data-maine-year-detail]').dataset.maineYearDetail).toBe('7');
    await activate(button('↺ Clear my two choices'));
    const prompt = expectFocus('[data-maine-decision-heading="d1"]');
    expect(prompt.textContent).toBe(decisionLabel(1));
    expect(app.latest()).toMatchObject({ me_road_path: 'ua_apprentice', car2_road: null });
    expect(query('[data-maine-decision-heading="d2"]')).toBeNull();
    expect(button('↺ Clear my two choices')).toBeUndefined();
    expect(node().textContent).not.toContain('Summary: your path against the alternatives');
    expect(query('[data-maine-year-detail]').dataset.maineYearDetail).toBe('1');
    const first = choices(1)[0]; await activate(first);
    expect(document.activeElement).toBe(first);
    expect(app.latest().car2_road).toEqual({ d1: 'stay', d2: null });
    expectRetained(app);
  });

  it('focuses the followed route but keeps local route inspection and reversible arrow decisions on their controls', async () => {
    const saved = { d1: 'pipeline', d2: 'shop' };
    const app = await mountState({ ...retained, view: 'maineEcosystem', me_mode: 'browse', me_sect: 'overview', car2_road: saved });
    const route = query('[data-maine-route-node="cte_smallshop"]'); await activate(route);
    expect(document.activeElement).toBe(route);
    expect(app.latest().me_road_path).toBeUndefined();
    expect(app.latest().car2_road).toEqual(saved);
    await activate(query('[data-maine-open-route="cte_smallshop"]'));
    expectFocus('[data-maine-roadmap-heading]');
    expect(app.latest()).toMatchObject({ me_mode: 'roadmap', me_road_path: 'cte_smallshop', car2_road: saved });
    const d1 = choices(1); d1[0].focus();
    await React.act(() => Simulate.keyDown(d1[0], { key: 'ArrowRight' }));
    expect(document.activeElement).toBe(d1[1]);
    expect(app.latest().car2_road).toEqual({ d1: 'cianbro', d2: 'shop' });
    await activate(button('🦞 Browse topics'));
    expect(document.activeElement).toBe(button('🦞 Browse topics'));
    const anotherRoute = query('[data-maine-route-node="biw_internal"]'); await activate(anotherRoute);
    expect(document.activeElement).toBe(anotherRoute);
    expect(app.latest()).toMatchObject({ me_road_path: 'cte_smallshop', car2_road: { d1: 'cianbro', d2: 'shop' } });
    expectRetained(app);
  });
});

describe('WeldLab restored Maine roadmap progress', () => {
  it.each([
    ['picker', { me_mode: 'roadmap', me_road_path: null }],
    ['selected path', { me_mode: 'roadmap', me_road_path: 'biw_internal' }],
    ['first choice', { me_mode: 'roadmap', me_road_path: 'emcc_boatyard', car2_road: { d1: 'cianbro', d2: null } }],
    ['completed summary', { me_mode: 'roadmap', me_road_path: 'ua_apprentice', car2_road: { d1: 'stay', d2: 'cwi' } }],
    ['route network', { me_mode: 'browse', me_sect: 'overview', me_road_path: 'cte_smallshop', car2_road: { d1: 'pipeline', d2: 'shop' } }],
  ])('leaves focus outside an initial saved %s mount', async (_name, state) => {
    keepOutsideFocus();
    const app = await mountState({ ...retained, view: 'maineEcosystem', ...state });
    expect(document.activeElement).toBe(outside);
    for (const [key, value] of Object.entries(state)) expect(app.latest()[key]).toEqual(value);
    expectRetained(app);
  });
});
