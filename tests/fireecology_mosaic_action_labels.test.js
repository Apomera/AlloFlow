import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });
async function mount(mosaic = {}, translated = false, overrides = {}) {
  resetStemLab(); const tool = loadTool(process.env.FIREECOLOGY_SOURCE || 'stem_lab/stem_tool_fireecology.js', 'fireEcology'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host); mounts.push({ root, host }); let latest, setter;
  const t = (key, fallback) => translated ? '⟦' + key + '⟧ ' + fallback : fallback;
  function Host() {
    const [data, setData] = React.useState({ fireEcology: { tab: 'mosaic', mosaic: { seed: 'mosaic-label-test', ...mosaic }, inquiry: { hypothesis: 'Keep my observation.' } }, stewardshipHub: { custom: 'preserve' } });
    latest = data; setter = setData; return tool.render(makeCtx({ toolData: data, setToolData: setData, t, ...overrides }, store));
  }
  await act(async () => root.render(React.createElement(Host)));
  return { host, state: () => latest, button: text => [...host.querySelectorAll('button')].find(el => el.textContent.includes(text)),
    update: patch => act(async () => setter(old => ({ ...old, fireEcology: { ...old.fireEcology, mosaic: { ...old.fireEcology.mosaic, ...patch } } }))) };
}
async function activate(button) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); }); }
function nameIncludesVisible(button) { expect(button.getAttribute('aria-label'), button.outerHTML).toContain(button.textContent.trim()); }

describe('Cultural Mosaic action names and zone context', () => {
  it.each([false, true])('matches setup action labels and supplies deep-dive zone context (translated=%s)', async translated => {
    const t = await mount({}, translated), begin = t.button('Begin 8-year Stewardship'); nameIncludesVisible(begin);
    const dives = [...t.host.querySelectorAll('[id^="fireecology-deep-dive-trigger-setup-"]')]; expect(dives.length).toBeGreaterThan(1);
    for (const button of dives) nameIncludesVisible(button);
    expect(new Set(dives.map(el => el.getAttribute('aria-label'))).size).toBe(dives.length);
    expect(t.host.querySelector('#fireecology-deep-dive-trigger-setup-blueberryBarren').getAttribute('aria-label')).toContain('Blueberry Barren');
    const saved = JSON.stringify(t.state().stewardshipHub); await activate(begin);
    expect(t.state().fireEcology.mosaic.phase).toBe('year'); expect(t.state().fireEcology.inquiry.hypothesis).toBe('Keep my observation.'); expect(JSON.stringify(t.state().stewardshipHub)).toBe(saved);
    const yearDive = t.host.querySelector('#fireecology-deep-dive-trigger-year-blueberryBarren'); expect(yearDive.getAttribute('aria-label')).toContain(yearDive.title); expect(yearDive.getAttribute('aria-label')).toContain('Blueberry Barren');
  });

  it.each([false, true])('matches replay and new-mosaic labels while retaining reproducible replay (translated=%s)', async translated => {
    const t = await mount({ phase: 'debrief', year: 8, finalOutcome: { tier: 'excellent', label: 'Healthy mosaic', desc: 'Recorded campaign outcome.', color: '#86efac' } }, translated);
    const replay = t.button('Replay same conditions'), reset = t.button('New mosaic, new conditions'); nameIncludesVisible(replay); nameIncludesVisible(reset);
    expect(replay.title).toContain('Same seed'); await activate(replay);
    expect(t.state().fireEcology.mosaic.seed).toBe('mosaic-label-test'); expect(t.state().fireEcology.mosaic.phase).toBe('year'); expect(t.state().stewardshipHub.custom).toBe('preserve');
  });

  it('keeps season action names aligned in both warm and cold phases', async () => {
    const t = await mount({ phase: 'year', subPhase: 'warm', year: 2 }); const warm = t.button('End Warm Season'); nameIncludesVisible(warm); expect(warm.getAttribute('aria-label')).toContain('Begin Cold Season');
    await activate(warm); expect(t.state().fireEcology.mosaic.subPhase).toBe('cold'); const cold = t.button('End Cold Season + Run Year'); nameIncludesVisible(cold); expect(cold.getAttribute('aria-label')).toContain('Resolve the year');
    expect(t.state().fireEcology.inquiry.hypothesis).toBe('Keep my observation.');
  });

  it('includes visible technique labels, zone names, and unavailable reasons', async () => {
    const t = await mount({ phase: 'year', subPhase: 'warm', year: 2, hoursLeft: 24 });
    const buttons = [...t.host.querySelectorAll('[data-fe-mosaic-technique]')]; expect(buttons.length).toBeGreaterThan(12);
    for (const button of buttons) nameIncludesVisible(button);
    expect(new Set(buttons.map(el => el.getAttribute('aria-label'))).size).toBe(buttons.length);
    const burn = t.host.querySelector('[data-fe-mosaic-technique=culturalBurn][data-fe-mosaic-zone=blueberryBarren]');
    expect(burn.disabled).toBe(true); expect(burn.getAttribute('aria-label')).toContain('Blueberry Barren'); expect(burn.getAttribute('aria-label')).toContain('unavailable: Cold Season work');
    const thin = t.host.querySelector('[data-fe-mosaic-technique=handThin][data-fe-mosaic-zone=blueberryBarren]'); expect(thin.disabled).toBe(false); expect(thin.getAttribute('aria-label')).toContain('Blueberry Barren');
    const before = JSON.stringify(t.state()); await activate(burn); expect(JSON.stringify(t.state())).toBe(before);
  });

  it('keeps a named technique bound to its own zone and preserves other saved work', async () => {
    const t = await mount(); await activate(t.button('Begin 8-year Stewardship')); await t.update({ hoursLeft: 24 });
    const before = t.state().fireEcology.mosaic, otherZones = JSON.stringify(before.zones.filter(z => z.id !== 'blueberryBarren'));
    const thin = t.host.querySelector('[data-fe-mosaic-technique=handThin][data-fe-mosaic-zone=blueberryBarren]'); await activate(thin);
    const after = t.state().fireEcology.mosaic; expect(after.hoursLeft).toBe(before.hoursLeft - 12); expect(after.yearActions).toHaveLength(1); expect(after.yearActions[0].zone).toBe('Blueberry Barren'); expect(after.yearActions[0].tech).toBe('Hand Thinning');
    expect(JSON.stringify(after.zones.filter(z => z.id !== 'blueberryBarren'))).toBe(otherZones); expect(t.state().fireEcology.inquiry.hypothesis).toBe('Keep my observation.'); expect(t.state().stewardshipHub.custom).toBe('preserve');
  });

  it('keeps the AI reading action name synchronized with its visible loading state', async () => {
    const callGemini = vi.fn(); const t = await mount({ phase: 'year', year: 2 }, false, { callGemini }); const read = t.button('Read the land (AI)'); nameIncludesVisible(read); expect(read.disabled).toBe(false);
    await t.update({ aiReadLoading: true }); const loading = t.button('Reading...'); nameIncludesVisible(loading); expect(loading.disabled).toBe(true); expect(callGemini).not.toHaveBeenCalled();
  });
});
