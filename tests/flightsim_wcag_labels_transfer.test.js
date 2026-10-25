import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, tool, api, latest, externalPatch, outside, errors;
const feedback = () => host.querySelector('[data-stall-transfer-feedback]');
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
const inquiry = patch => api.stallInvestigationRecord({
  phase: 'transfer', prediction: 'angle', hypothesis: 'Angle changes the flow state.',
  startingIdea: { version: 1, status: 'committed', prediction: 'speed', hypothesis: 'My first idea.' },
  airspeed: 130, altitude: 5000, aoa: 8,
  observations: [{ airspeed: 130, altitude: 5000, aoa: 8 }, { airspeed: 130, altitude: 5000, aoa: 20 }, { airspeed: 80, altitude: 5000, aoa: 20 }],
  explanation: 'Changing angle changed flow; the higher angle still stalled at another speed.',
  transferChoice: '', transferAnswer: '', transferAttempts: 0, completedAt: null, ...patch,
});
async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => { node.focus(); node.click(); });
}
async function flushFocus() { await act(async () => vi.advanceTimersByTime(0)); }
function expectStatus(node) {
  expect(node).toBeTruthy();
  expect(node.getAttribute('role')).toBe('status');
  expect(node.getAttribute('aria-live')).toBe('polite');
  expect(node.getAttribute('aria-atomic')).toBe('true');
  expect(node.tabIndex).toBe(-1);
  expect(node.closest('[hidden],[aria-hidden="true"]')).toBeNull();
  expect(node.querySelector('button,a,input,select,textarea')).toBeNull();
}
async function mount(seed, { delay = 0, translate } = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', ...seed } });
    latest = data.flightSim;
    externalPatch = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    const setToolData = React.useCallback(update => {
      if (delay) window.setTimeout(() => setData(update), delay);
      else setData(update);
    }, [setData, delay]);
    return tool.render(makeCtx({ toolData: data, setToolData, ...(translate ? { t: translate } : {}),
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool(process.env.SKYSCHOOL_LABEL_TRANSFER_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null;
  host?.remove(); outside?.remove(); outside = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School visible control labels', () => {
  it('uses the linked From and To labels for airport controls while retaining precise context and native selection', async () => {
    await mount();
    for (const [id, text, title, value, field] of [
      ['skyschool-route-from', 'From', 'Departure airport', 'kden', 'planDep'],
      ['skyschool-route-to', 'To', 'Destination airport', 'ksfo', 'planDest'],
    ]) {
      const select = host.querySelector('#' + id);
      expect(select).toBeTruthy(); expect(select.labels[0].textContent).toBe(text);
      expect(select.getAttribute('aria-label')).toBeNull(); expect(select.title).toBe(title);
      await act(async () => {
        select.focus();
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, value);
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(latest[field]).toBe(value); expect(document.activeElement).toBe(select);
    }
  });

  it.each([false, true])('keeps the Learn search name equal to its visible prompt after typing (translated=%s)', async translated => {
    const strings = { 'stem.flightsim.search_aviation_topics': 'Rechercher des sujets d’aviation…',
      'stem.flightsim.search_skyschool_learn_topics': 'Recherche dans SkySchool Learn' };
    await mount({ view: 'learn' }, { translate: translated ? (key, fallback) => strings[key] ?? fallback : undefined });
    const search = host.querySelector('input[type="search"]');
    const expected = translated ? strings['stem.flightsim.search_aviation_topics'] : 'Search aviation topics…';
    expect(search.placeholder).toBe(expected); expect(search.getAttribute('aria-label')).toBe(expected);
    expect(search.title).toBe(translated ? strings['stem.flightsim.search_skyschool_learn_topics'] : 'Search SkySchool Learn topics');
    await act(async () => {
      search.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, 'angle');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(latest.learnQuery).toBe('angle'); expect(document.activeElement).toBe(search);
    expect(search.getAttribute('aria-label')).toBe(expected);
  });
});

describe('Sky School investigation transfer announcements and focus', () => {
  it.each(['stall', 'normal'])('updates the persistent result and focuses it when checking %s removes the submit control', async choice => {
    await mount({ view: 'stallHunt', stallInvestigation: inquiry({ transferChoice: choice }) });
    const region = feedback(); expectStatus(region); expect(region.textContent).toBe('');
    const submit = button('Check prediction'); await click(submit);
    expect(submit.isConnected).toBe(false); expect(feedback()).toBe(region); expectStatus(region);
    expect(region.textContent).toContain(choice === 'stall' ? 'Correct:' : 'Revisit your angle comparison:');
    expect(latest.stallInvestigation.transferAttempts).toBe(1);
    await flushFocus(); expect(document.activeElement).toBe(region);
    expect([...host.querySelectorAll('input[name="stall-transfer"]')].every(node => node.disabled)).toBe(true);
  });

  it('clears the same result and focuses the first choice on retry, then checks the replacement answer', async () => {
    await mount({ view: 'stallHunt', stallInvestigation: inquiry({ transferChoice: 'normal' }) });
    const region = feedback(); expectStatus(region);
    await click(button('Check prediction')); await flushFocus();
    await click(button('Try transfer again'));
    expect(feedback()).toBe(region); expect(region.textContent).toBe('');
    await flushFocus();
    const first = host.querySelector('input[name="stall-transfer"]');
    expect(document.activeElement).toBe(first); expect(first.disabled).toBe(false); expect(first.checked).toBe(false);
    await click(host.querySelector('#stall-transfer-choice-stall'));
    await click(button('Check prediction')); await flushFocus();
    expect(feedback()).toBe(region); expect(region.textContent).toContain('Correct:');
    expect(document.activeElement).toBe(region); expect(latest.stallInvestigation.transferAttempts).toBe(2);
    expect(latest.stallInvestigation.hypothesis).toBe('Angle changes the flow state.');
  });

  it('waits for a delayed host commit before focusing the rendered transfer result', async () => {
    await mount({ view: 'stallHunt', stallInvestigation: inquiry({ transferChoice: 'stall' }) }, { delay: 50 });
    const region = feedback(); expectStatus(region); const submit = button('Check prediction');
    await click(submit); await act(async () => vi.advanceTimersByTime(49));
    expect(latest.stallInvestigation.transferAnswer).toBe(''); expect(region.textContent).toBe('');
    expect(document.activeElement).toBe(submit);
    await act(async () => vi.advanceTimersByTime(1)); await flushFocus();
    expect(region.textContent).toContain('Correct:'); expect(document.activeElement).toBe(region);
  });

  it('does not pull focus back when the learner moves to an app control before the post-commit task', async () => {
    await mount({ view: 'stallHunt', stallInvestigation: inquiry({ transferChoice: 'stall' }) });
    await click(button('Check prediction'));
    outside = document.createElement('button'); outside.textContent = 'App navigation'; document.body.appendChild(outside); outside.focus();
    await flushFocus(); expect(document.activeElement).toBe(outside);
    expect(feedback().textContent).toContain('Correct:');
  });

  it('retires a pending focus request when another transfer record replaces the checked work', async () => {
    await mount({ view: 'stallHunt', stallInvestigation: inquiry({ transferChoice: 'stall' }) });
    await click(button('Check prediction'));
    const replacement = inquiry({ hypothesis: 'Another saved investigation.', transferChoice: 'normal', transferAttempts: 4 });
    await act(async () => externalPatch({ stallInvestigation: replacement }));
    expect(feedback().textContent).toBe('');
    await flushFocus(); expect(document.activeElement).not.toBe(feedback());
    expect(latest.stallInvestigation.hypothesis).toBe(replacement.hypothesis);
    expect(latest.stallInvestigation.transferAttempts).toBe(4);
  });

  it('does not apply or focus a delayed check after authoritative work replaces its owner', async () => {
    await mount({ view: 'stallHunt', stallInvestigation: inquiry({ transferChoice: 'stall' }) }, { delay: 50 });
    await click(button('Check prediction'));
    const replacement = inquiry({ hypothesis: 'Authoritative replacement.', transferChoice: 'normal', transferAttempts: 5 });
    await act(async () => externalPatch({ stallInvestigation: replacement }));
    const currentSubmit = button('Check prediction'); currentSubmit.focus();
    await act(async () => vi.advanceTimersByTime(50)); await flushFocus();
    expect(document.activeElement).toBe(currentSubmit); expect(feedback().textContent).toBe('');
    expect(latest.stallInvestigation.transferAnswer).toBe(''); expect(latest.stallInvestigation.transferAttempts).toBe(5);
    expect(latest.stallInvestigation.hypothesis).toBe(replacement.hypothesis);
  });
});
