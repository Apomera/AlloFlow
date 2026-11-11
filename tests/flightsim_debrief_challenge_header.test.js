// A challenge flight's debrief header must report the CHALLENGE's objectives. It used to show
// the free-flight milestone score, so a finished Energy Management run (which asks for no
// steady hold and no landing) read "Challenge complete" beside a large "0" and
// "0 of 2 practice milestones observed". Free flights keep the milestone score.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, host, root;
const flight = (patch = {}) => ({ attemptId: 'latest-flight', aircraftId: 'cessna172', aircraft: 'Cessna 172 Skyhawk',
  activityId: 'free_flight', investigation: false, startedAirborne: false,
  flightTime: 66, airborneSeconds: 66, bestStableSeconds: 0, stallSeconds: 0, lowAirspeedSeconds: 0,
  peakAGL: 5000, landings: 0, bestLanding: null, distance: 2, maxAlt: 5300, maxSpeed: 110,
  airports: 0, discovered: 0, badges: 0, samples: [], reflection: '', ...patch });
const energy = (objectives) => flight({ activityId: 'energy_management', startedAirborne: true,
  challenge: { version: 1, id: 'energy_management', objectives, elapsedSeconds: 66, airborneSeconds: 66, peakAGL: 5000, wasAirborne: true } });
async function mount(record) {
  if (root) await act(async () => root.unmount());
  host?.remove(); host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'debrief', lastDebrief: record, flightPracticeHistory: [] } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
const header = () => host.querySelector('section[aria-labelledby="skyschool-debrief-title"]');
const ring = () => header().querySelector('[role="img"]');

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  const canvas = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvas);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('SkySchool debrief header on a challenge flight', () => {
  it('a completed challenge shows its objectives, not a zero milestone score', async () => {
    await mount(energy({ glide: true, climb: true }));
    expect(header().textContent).toContain('Challenge complete: Energy Management.');
    expect(ring().getAttribute('data-flight-debrief-score')).toBe('challenge');
    expect(ring().getAttribute('aria-label')).toBe('Challenge objectives: 2 of 2 observed');
    expect(ring().textContent).toContain('2/2');
    expect(ring().textContent).toContain('CHALLENGE OBJECTIVES');
    expect(header().textContent).toContain('All challenge objectives observed.');
    expect(header().textContent).toContain('2/2 objectives');
    expect(header().textContent).not.toContain('practice milestones observed');
    expect(header().textContent).not.toContain('PRACTICE EVIDENCE');
    expect(ring().getAttribute('style')).toContain('100%');
  });

  it('a part-finished challenge counts the objectives actually observed', async () => {
    await mount(energy({ glide: true, climb: false }));
    expect(ring().getAttribute('aria-label')).toBe('Challenge objectives: 1 of 2 observed');
    expect(ring().textContent).toContain('1/2');
    expect(header().textContent).toContain('1 of 2 challenge objectives observed');
    expect(header().textContent).not.toContain('All challenge objectives observed.');
    expect(ring().getAttribute('style')).toContain('50%');
  });

  it('the milestone list below says it is separate from the challenge', async () => {
    await mount(energy({ glide: true, climb: true }));
    const note = host.querySelector('[data-flight-milestones-challenge-note]');
    expect(note).toBeTruthy();
    expect(note.textContent).toContain('separate from the challenge');
  });

  it('a free flight keeps the practice-milestone score and has no challenge note', async () => {
    await mount(flight({ bestStableSeconds: 15, landings: 1, bestLanding: 180, peakAGL: 1000 }));
    expect(ring().getAttribute('data-flight-debrief-score')).toBe('practice');
    expect(ring().getAttribute('aria-label')).toBe('Observed practice milestones: 100 percent');
    expect(header().textContent).toContain('3 of 3 practice milestones observed');
    expect(header().textContent).toContain('PRACTICE EVIDENCE');
    expect(host.querySelector('[data-flight-milestones-challenge-note]')).toBeNull();
  });

  it('a malformed challenge record falls back to the practice score', async () => {
    await mount(flight({ challenge: { version: 1, id: 'not_a_challenge', objectives: { x: true } } }));
    expect(ring().getAttribute('data-flight-debrief-score')).toBe('practice');
    expect(header().textContent).toContain('practice milestones observed');
  });
});
