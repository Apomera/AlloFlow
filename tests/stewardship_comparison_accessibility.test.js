import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });
const outcome = { label: 'Completed', tier: 'strong', desc: 'Recorded environmental evidence.', color: '#86efac' };
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
const evidence = freeze([
  { year: 1, cascades: [{ id: 'regrowth', msg: 'Mosaic burns support habitat.' }, { id: 'trust', msg: 'Community trust improves.' }] },
  { year: 2, feedbacks: [{ id: 'regrowth', msg: 'Mosaic burns support habitat.' }, 'Legacy watershed recovery.'] },
  { year: 3, cascadesFired: [{ id: 'regrowth' }, { msg: 'Legacy watershed recovery.' }, { id: 'older-rule' }] },
  null, { cascades: null }, { cascades: [null, '', 4, {}] }
]);
async function mount(mode = 'selecting', logs = evidence, overrides = {}) {
  resetStemLab(); const tool = loadTool(process.env.STEWARDSHIP_SOURCE || 'stem_lab/stem_tool_stewardship.js', 'stewardshipHub'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host); mounts.push({ root, host }); let latest;
  function Host() {
    const [data, setData] = React.useState({
      stewardshipHub: { tutorialSeen: true, comparing: mode === 'viewing' ? { mode, a: 'mosaic', b: 'conserve' } : { mode, a: null, b: null }, stewIQ: { hypothesis: 'Keep my hypothesis.', explanation: 'Keep my reasoning.', log: [{ t: '12:00', odds: 47 }] } },
      fireEcology: { mosaic: { phase: 'debrief', year: 8, maxYears: 8, finalOutcome: outcome, zones: [], yearLog: logs, custom: 'keep' } },
      ecosystem: { conserve: { phase: 'debrief', year: 10, maxYears: 10, finalOutcome: outcome, species: [], yearLog: [] } }
    }); latest = data;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, ...overrides }, store));
  }
  await act(async () => root.render(React.createElement(Host)));
  return { host, state: () => latest, action: key => host.querySelector('[data-stewardship-action="' + key + '"]'),
    prompt: () => host.querySelector('[data-stewardship-comparison-selection]'),
    card: id => host.querySelector('[data-stewardship-comparison-card="' + id + '"]') };
}
async function activate(button) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); }); }

describe('Stewardship comparison evidence and accessible structure', () => {
  it('connects campaign choices to stable selection instructions that announce changes', async () => {
    const t = await mount(), prompt = t.prompt(), pick = t.action('pick:mosaic');
    expect(prompt.getAttribute('role')).toBe('status'); expect(prompt.getAttribute('aria-live')).toBe('polite'); expect(prompt.getAttribute('aria-atomic')).toBe('true');
    for (const button of t.host.querySelectorAll('[data-stewardship-action^="pick:"]')) expect(button.getAttribute('aria-describedby')).toBe(prompt.id);
    expect(prompt.textContent).toContain('Pick any two'); await activate(pick);
    expect(t.prompt()).toBe(prompt); expect(prompt.textContent).toContain('Selected: Cultural Mosaic. Pick a second'); expect(pick.getAttribute('aria-pressed')).toBe('true'); expect(document.activeElement).toBe(pick);
    await activate(pick); expect(t.prompt()).toBe(prompt); expect(prompt.textContent).toContain('Pick any two'); expect(pick.getAttribute('aria-pressed')).toBe('false'); expect(document.activeElement).toBe(pick);
  });

  it('groups comparison results into named sections with heading navigation and native feedback lists', async () => {
    const t = await mount('viewing');
    for (const id of ['mosaic', 'conserve']) {
      const card = t.card(id), heading = card.querySelector('h3'), feedback = card.querySelector('h4');
      expect(card.tagName).toBe('SECTION'); expect(card.getAttribute('aria-labelledby')).toBe(heading.id); expect(feedback.textContent).toBe('Feedback rules fired');
      expect(t.host.querySelectorAll('[id="' + heading.id + '"]')).toHaveLength(1);
    }
    const list = t.card('mosaic').querySelector('ul'); expect(list.getAttribute('aria-labelledby')).toBe(t.card('mosaic').querySelector('h4').id); expect(list.querySelectorAll(':scope > li')).toHaveLength(4);
    expect(t.card('conserve').querySelector('ul')).toBeNull(); expect(t.card('conserve').querySelector('[data-stewardship-feedback-empty]').textContent).toContain('No feedback rules fired');
  });

  it('groups repeated rule IDs while displaying recorded descriptions and readable counts', async () => {
    const t = await mount('viewing'); const items = [...t.card('mosaic').querySelectorAll('li')].map(el => el.textContent);
    expect(items).toEqual(['Recorded 3 times: Mosaic burns support habitat.', 'Recorded 2 times: Legacy watershed recovery.', 'Recorded once: Community trust improves.', 'Recorded once: older-rule']);
    expect(t.card('mosaic').textContent).not.toContain('regrowth'); expect(t.card('mosaic').textContent).not.toContain('unknown');
    expect(t.state().fireEcology.mosaic.yearLog).toBe(evidence);
  });

  it('uses a later recorded description for a previously ID-only rule and keeps different IDs distinct', async () => {
    const logs = freeze([{ cascades: [{ id: '__proto__' }, { id: 'second', msg: 'Habitat recovery.' }] }, { cascades: [{ id: '__proto__', msg: 'Habitat recovery.' }] }]);
    const t = await mount('viewing', logs), items = [...t.card('mosaic').querySelectorAll('li')].map(el => el.textContent);
    expect(items).toEqual(['Recorded 2 times: Habitat recovery.', 'Recorded once: Habitat recovery.']); expect(t.state().fireEcology.mosaic.yearLog).toBe(logs);
  });

  it('preserves inquiry writing and campaign logs through pair selection and reselection', async () => {
    const t = await mount(), saved = JSON.stringify({ iq: t.state().stewardshipHub.stewIQ, fire: t.state().fireEcology, eco: t.state().ecosystem });
    await activate(t.action('pick:mosaic')); await activate(t.action('pick:conserve'));
    expect(document.activeElement).toBe(t.host.querySelector('[data-stewardship-heading=comparison]')); expect(t.card('mosaic')).toBeTruthy();
    await activate(t.action('pick-again')); expect(t.prompt().textContent).toContain('Pick any two');
    expect(JSON.stringify({ iq: t.state().stewardshipHub.stewIQ, fire: t.state().fireEcology, eco: t.state().ecosystem })).toBe(saved);
  });

  it('keeps selection and result relationships unique across two mounted instances', async () => {
    const a = await mount(), b = await mount(); expect(a.prompt().id).not.toBe(b.prompt().id);
    await activate(b.action('pick:mosaic')); expect(a.prompt().textContent).toContain('Pick any two'); expect(b.prompt().textContent).toContain('Selected: Cultural Mosaic');
    await activate(b.action('pick:conserve')); await activate(a.action('pick:mosaic')); await activate(a.action('pick:conserve'));
    expect(a.card('mosaic').getAttribute('aria-labelledby')).not.toBe(b.card('mosaic').getAttribute('aria-labelledby'));
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id); expect(new Set(ids).size).toBe(ids.length);
    expect(b.state().stewardshipHub.comparing).toEqual({ mode: 'viewing', a: 'mosaic', b: 'conserve' });
  });

  it('supports translated occurrence text without altering the underlying evidence', async () => {
    const t = await mount('viewing', evidence, { t: (key, fallback) => ({ 'stem.stewardship.feedback_recorded_once': 'Consigné une fois', 'stem.stewardship.feedback_recorded_times': 'Consigné {count} fois' }[key] || fallback) });
    expect(t.card('mosaic').querySelector('li').textContent).toBe('Consigné 3 fois: Mosaic burns support habitat.'); expect(t.card('mosaic').textContent).toContain('Consigné une fois'); expect(t.state().fireEcology.mosaic.yearLog).toBe(evidence);
  });
});
