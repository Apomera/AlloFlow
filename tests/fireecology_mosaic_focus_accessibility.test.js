import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });
const outcome = { tier: 'good', label: 'Healthy mosaic', desc: 'Saved campaign result.', color: '#86efac' };
async function mount(mosaic = {}) {
  resetStemLab(); const tool = loadTool(process.env.FIREECOLOGY_SOURCE || 'stem_lab/stem_tool_fireecology.js', 'fireEcology'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host); mounts.push({ root, host }); let latest, setter;
  function Host() {
    const [data, setData] = React.useState({ fireEcology: { tab: 'mosaic', mosaic: { seed: 'mosaic-focus-test', ...mosaic }, inquiry: { hypothesis: 'Keep this hypothesis.', explanation: 'Keep this reasoning.' } }, stewardshipHub: { progress: 'preserve' }, ecosystem: { conserve: { phase: 'year', year: 4 } } });
    latest = data; setter = setData;
    return React.createElement('div', null, tool.render(makeCtx({ toolData: data, setToolData: setData }, store)), React.createElement('button', { 'data-other-task': true }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Host)));
  return { host, state: () => latest, action: key => host.querySelector('[data-mosaic-action="' + key + '"]'), heading: () => host.querySelector('[data-mosaic-heading]'), view: () => host.querySelector('[data-fireecology-mosaic]'), other: () => host.querySelector('[data-other-task]'),
    update: patch => act(async () => setter(old => ({ ...old, fireEcology: { ...old.fireEcology, mosaic: { ...old.fireEcology.mosaic, ...patch } } }))) };
}
async function activate(button) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); }); }
function expectHeading(t, phase) { expect(t.view().getAttribute('data-fireecology-mosaic')).toBe(phase); expect(t.heading().getAttribute('data-mosaic-heading')).toBe(phase); expect(t.heading().tabIndex).toBe(-1); expect(document.activeElement).toBe(t.heading()); }
function unrelated(t) { return JSON.stringify({ inquiry: t.state().fireEcology.inquiry, hub: t.state().stewardshipHub, ecosystem: t.state().ecosystem }); }

describe('Cultural Mosaic campaign phase focus', () => {
  it('focuses each phase heading from start through both seasons, review and the next year', async () => {
    const t = await mount(), saved = unrelated(t); await activate(t.action('start')); expectHeading(t, 'year'); expect(t.heading().textContent).toContain('Year 1 of 8'); expect(t.heading().textContent).toContain('Warm Season');
    const rest = t.host.querySelector('[data-fe-mosaic-technique=rest][data-fe-mosaic-zone=blueberryBarren]'); await activate(rest); const actions = JSON.stringify(t.state().fireEcology.mosaic.yearActions);
    const warmButton = t.action('end-season'), yearHeading = t.heading(); await activate(warmButton); expectHeading(t, 'year'); expect(t.action('end-season')).toBe(warmButton); expect(t.heading()).toBe(yearHeading); expect(t.heading().textContent).toContain('Cold Season'); expect(t.state().fireEcology.mosaic.subPhase).toBe('cold');
    await activate(t.action('end-season')); expectHeading(t, 'review'); expect(t.heading().textContent).toContain('Year 1 review'); expect(t.state().fireEcology.mosaic.yearLog).toHaveLength(1); expect(JSON.stringify(t.state().fireEcology.mosaic.yearLog[0].actions)).toBe(actions);
    const log = t.state().fireEcology.mosaic.yearLog; await activate(t.action('review-next')); expectHeading(t, 'year'); expect(t.heading().textContent).toContain('Year 2 of 8'); expect(t.heading().textContent).toContain('Warm Season'); expect(t.state().fireEcology.mosaic.yearLog).toBe(log); expect(unrelated(t)).toBe(saved);
  });

  it('focuses the final debrief and same-seed replay without changing other work', async () => {
    const t = await mount({ phase: 'year', subPhase: 'cold', year: 8, maxYears: 8, firstTipDismissed: true }), saved = unrelated(t);
    await activate(t.action('end-season')); expectHeading(t, 'review'); expect(t.state().fireEcology.mosaic.yearLog).toHaveLength(1);
    await activate(t.action('review-next')); expectHeading(t, 'debrief'); const before = t.state().fireEcology.mosaic; expect(t.heading().textContent).toBe(before.finalOutcome.label);
    await activate(t.action('replay')); expectHeading(t, 'year'); expect(t.state().fireEcology.mosaic.seed).toBe(before.seed); expect(t.state().fireEcology.mosaic.difficulty).toBe(before.difficulty); expect(t.state().fireEcology.mosaic.year).toBe(1); expect(unrelated(t)).toBe(saved);
  });

  it('returns a new-mosaic action to its setup heading', async () => {
    const t = await mount({ phase: 'debrief', year: 8, finalOutcome: outcome }), saved = unrelated(t); await activate(t.action('reset')); expectHeading(t, 'setup'); expect(t.heading().textContent).toBe('Wabanaki Cultural Mosaic'); expect(t.state().fireEcology.mosaic.yearLog).toEqual([]); expect(unrelated(t)).toBe(saved);
  });

  it.each([
    ['setup', { phase: 'setup' }],
    ['year', { phase: 'year', year: 3, subPhase: 'cold' }],
    ['review', { phase: 'review', year: 3 }],
    ['debrief', { phase: 'debrief', year: 8, finalOutcome: outcome }]
  ])('does not autofocus an initially restored %s phase', async (_, state) => {
    const guard = document.createElement('button'); document.body.appendChild(guard); guard.focus();
    try { const t = await mount(state); expect(document.activeElement).toBe(guard); expect(t.heading().tabIndex).toBe(-1); } finally { guard.remove(); }
  });

  it('does not autofocus programmatic activation or an externally restored phase', async () => {
    const t = await mount(); t.other().focus(); await act(async () => t.action('start').click()); expect(t.state().fireEcology.mosaic.phase).toBe('year'); expect(document.activeElement).toBe(t.other());
    await t.update({ phase: 'review', year: 3 }); expect(t.view().getAttribute('data-fireecology-mosaic')).toBe('review'); expect(document.activeElement).toBe(t.other());
    t.action('review-next').focus(); await t.update({ phase: 'debrief', year: 8, finalOutcome: outcome }); expect(document.activeElement).not.toBe(t.heading());
  });

  it('preserves focus intentionally moved to another task while a phase transition commits', async () => {
    const t = await mount(); const start = t.action('start');
    await act(async () => { start.focus(); start.click(); t.other().focus(); });
    expect(t.state().fireEcology.mosaic.phase).toBe('year'); expect(document.activeElement).toBe(t.other());
  });

  it.each(['hidden', 'inert'])('does not focus a campaign under a %s ancestor', async attribute => {
    const t = await mount(); t.host.setAttribute(attribute, '');
    try { await activate(t.action('start')); expect(t.state().fireEcology.mosaic.phase).toBe('year'); expect(document.activeElement).not.toBe(t.heading()); } finally { t.host.removeAttribute(attribute); }
  });

  it('keeps phase transitions inside the activating instance', async () => {
    const a = await mount(), b = await mount(); await activate(b.action('start')); expectHeading(b, 'year'); expect(a.view().getAttribute('data-fireecology-mosaic')).toBe('setup'); const before = JSON.stringify(b.state());
    await activate(a.action('start')); expectHeading(a, 'year'); expect(JSON.stringify(b.state())).toBe(before);
    await activate(b.action('end-season')); expectHeading(b, 'year'); expect(b.heading().textContent).toContain('Cold Season'); expect(a.heading().textContent).toContain('Warm Season');
  });

  it('leaves focus on difficulty and technique controls when the phase does not change', async () => {
    const t = await mount(); const difficulty = [...t.host.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Set difficulty: Apprentice');
    await activate(difficulty); expect(document.activeElement).toBe(difficulty); expect(t.state().fireEcology.mosaic.difficulty).toBe('apprentice');
    await activate(t.action('start')); const rest = t.host.querySelector('[data-fe-mosaic-technique=rest][data-fe-mosaic-zone=blueberryBarren]'); await activate(rest);
    expect(document.activeElement).toBe(rest); expect(t.state().fireEcology.mosaic.phase).toBe('year'); expect(t.state().fireEcology.mosaic.yearActions).toHaveLength(1); expect(t.state().fireEcology.mosaic.yearActions[0].zone).toBe('Blueberry Barren');
  });
});
