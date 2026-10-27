import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { host, root } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });
const outcome = { tier: 'strong', label: 'Strong stewardship', color: '#86efac', desc: 'Saved result.' };
const complete = { phase: 'debrief', year: 8, finalOutcome: outcome, yearLog: [] };
const entities = { wolf: 70, elk: 30, willow: 70, beaver: 65, support: 80 };
async function mount(seed = {}, translated = false) {
  resetStemLab(); const tool = loadTool(process.env.STEWARDSHIP_SOURCE || 'stem_lab/stem_tool_stewardship.js', 'stewardshipHub'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ host, root }); let latest, update;
  function Host() {
    const [data, setData] = React.useState({ stewardshipHub: { tutorialSeen: true, ...seed.stewardshipHub }, ...seed });
    latest = data; update = patch => setData(old => ({ ...old, stewardshipHub: { ...old.stewardshipHub, ...patch } }));
    const t = (key, fallback) => translated ? '⟦' + key + '⟧ ' + fallback : fallback;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, t, announceToSR: vi.fn() }, store));
  }
  await act(async () => root.render(React.createElement(Host)));
  return { host, state: () => latest, update: patch => act(async () => update(patch)), buttons: () => [...host.querySelectorAll('button')] };
}
async function activate(button) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); }); }
function assertVisibleNames(t) {
  const controls = t.buttons().filter(button => button.hasAttribute('aria-label') && /[a-z]/i.test(button.textContent));
  expect(controls.length).toBeGreaterThan(0);
  for (const button of controls) expect(button.getAttribute('aria-label'), button.outerHTML).toContain(button.textContent.trim());
}

describe('Stewardship visible action names', () => {
  for (const translated of [false, true]) {
    it.each([
      ['notStarted', 'Launch →', 'Begin →'],
      ['inProgress', 'Continue →', 'Continue →'],
      ['complete', 'Replay →', 'Review →']
    ])('matches campaign and scenario actions for %s (translated=' + translated + ')', async (status, campaignWord, scenarioWord) => {
      const scenarioState = status === 'complete' ? { phase: 'debrief', step: 4, outcome, entities, decisionLog: [] } : status === 'inProgress' ? { phase: 'playing', step: 1, entities, decisionLog: [] } : undefined;
      const campaignState = status === 'complete' ? complete : status === 'inProgress' ? { phase: 'playing', year: 2 } : undefined;
      const seed = { stewardshipHub: { tutorialSeen: true, scenarioStates: scenarioState ? { yellowstone: scenarioState } : {} }, fireEcology: campaignState ? { mosaic: campaignState } : {} };
      const t = await mount(seed, translated), before = JSON.stringify(t.state());
      const campaign = t.host.querySelector('[data-stewardship-action="campaign:mosaic"]');
      const scenario = t.buttons().find(button => button.getAttribute('aria-label')?.endsWith(': Yellowstone Wolf Restoration') && button.textContent.includes(scenarioWord));
      expect(campaign.textContent).toContain(campaignWord); expect(scenario).toBeTruthy();
      expect(campaign.getAttribute('aria-label')).toContain(campaign.textContent.trim());
      expect(campaign.getAttribute('aria-label')).toContain('Cultural Mosaic');
      expect(scenario.getAttribute('aria-label')).toContain(scenario.textContent.trim());
      if (translated) { expect(campaign.textContent).toContain('⟦stem.stewardship.'); expect(scenario.textContent).toContain('⟦stem.stewardship.'); }
      assertVisibleNames(t); expect(JSON.stringify(t.state())).toBe(before);
    });

    it('keeps every tutorial action aligned while advancing and returning (translated=' + translated + ')', async () => {
      const t = await mount({}, translated);
      await activate(t.buttons().find(button => button.textContent.includes('Take the tour')));
      assertVisibleNames(t);
      for (let step = 0; step < 4; step++) { await activate(t.buttons().find(button => button.textContent.endsWith('Next →'))); assertVisibleNames(t); }
      const finish = t.buttons().find(button => button.textContent.endsWith('Got it, take me to the hub →'));
      expect(finish.getAttribute('aria-label')).toBe(finish.textContent);
      await activate(finish); expect(t.state().stewardshipHub.tutorialSeen).toBe(true); assertVisibleNames(t);
    });

    it('uses visible words for comparison, report, and scenario controls (translated=' + translated + ')', async () => {
      const t = await mount({ stewardshipHub: { tutorialSeen: true }, fireEcology: { mosaic: complete }, ecosystem: { conserve: complete } }, translated);
      assertVisibleNames(t);
      await t.update({ comparing: { mode: 'selecting', a: null, b: null } }); assertVisibleNames(t);
      await t.update({ comparing: { mode: 'viewing', a: 'mosaic', b: 'conserve' } }); assertVisibleNames(t);
      await t.update({ comparing: null, viewingReport: 'mosaic' }); assertVisibleNames(t);
      await t.update({ viewingReport: null, playingScenario: 'yellowstone' }); assertVisibleNames(t);
      await activate(t.buttons().find(button => button.textContent.includes('Begin scenario'))); assertVisibleNames(t);
      expect(t.state().stewardshipHub.scenarioStates.yellowstone.phase).toBe('playing');
      await t.update({ scenarioStates: { yellowstone: { phase: 'debrief', step: 4, entities, outcome, decisionLog: [] } } }); assertVisibleNames(t);
    });
  }
});
