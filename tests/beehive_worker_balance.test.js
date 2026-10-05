import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Bee adult worker balance practice', () => {
  let BH, config, host, root, latest, setGrade, originalRaf, originalCancelRaf;
  beforeEach(() => {
    resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive;
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    originalRaf = globalThis.requestAnimationFrame; originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
  });
  afterEach(() => {
    if (root) act(() => root.unmount()); if (host) host.remove(); root = host = null;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    vi.restoreAllMocks();
  });
  function colony(overrides = {}) {
    return { ...BH.bhCreateNewColonyState(777, 1), viewMode: 'beekeeper', beeView: 'lifecycle',
      day: 60, tutorialDone: true, soundOn: false, motionPaused: true, ...overrides };
  }
  async function mount(overrides = {}, grade = '7th Grade') {
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    function Component() {
      const [toolData, setToolData] = React.useState({ beehive: colony(overrides), otherTool: { retained: true } });
      const [gradeLevel, updateGrade] = React.useState(grade); setGrade = updateGrade; latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, gradeLevel }));
    }
    await act(async () => root.render(React.createElement(Component)));
  }
  function lab() { return host.querySelector('[data-worker-balance-lab]'); }
  async function click(selector) {
    const control = lab().querySelector(selector); expect(control).toBeTruthy(); expect(control.disabled).toBe(false);
    await act(async () => control.click());
  }
  async function select(flow, index) {
    await act(async () => { const control = lab().querySelector('[data-worker-balance-flow="' + flow + '"]');
      control.value = String(index); control.dispatchEvent(new Event('change', { bubbles: true })); });
  }
  async function reason(value) {
    await act(async () => { const area = lab().querySelector('textarea');
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, value);
      area.dispatchEvent(new Event('input', { bubbles: true })); });
  }
  async function review(direction = 'decrease') { await click('input[value="' + direction + '"]'); await click('[data-worker-balance-check]'); }

  it.each([
    ['K–2', 2, 3, 10, 3, 5, 8, -2, 'decrease'],
    ['3–5', 2, 3, 100, 20, 40, 80, -20, 'decrease'],
    ['6–8', 1, 1, 100, 5, 5, 100, 0, 'same'],
    ['9–12', 3, 0, 100, 40, 0, 140, 40, 'increase'],
    ['6–8', 0, 0, 100, 0, 0, 100, 0, 'same'],
    ['9–12', 0, 3, 100, 0, 40, 60, -40, 'decrease'],
  ])('accounts for both flows in %s: arrivals choice %i, loss choice %i', (band, incoming, lost, start, arrivals, losses, after, delta, direction) => {
    const result = BH.bhWorkerBalancePractice(band, incoming, lost);
    expect(result).toMatchObject({ start, arrivals, losses, after, delta, direction });
  });

  it('uses the starting population, rather than arrivals, for percent change', () => {
    expect(BH.bhWorkerBalancePractice('9–12', 2, 3).percentChange).toBe(-20);
    expect(BH.bhWorkerBalancePractice('K–2', 2, 3).percentChange).toBe(-20);
  });

  it('keeps small counts for young learners and handles unsupported choices without negative totals', () => {
    const young = BH.bhWorkerBalancePractice('K–2', 0, 3);
    expect(young.choices).toEqual([0, 1, 3, 5]); expect(young.after).toBe(5);
    expect(BH.bhWorkerBalancePractice('unknown', -1, Infinity)).toEqual(BH.bhWorkerBalancePractice('6–8', 2, 3));
    expect(BH.bhWorkerBalancePractice('K–2', '3', null).start).toBe(10);
  });

  it('keeps practice deterministic without random draws or time reads', () => {
    const random = vi.spyOn(Math, 'random'), clock = vi.spyOn(Date, 'now');
    expect(BH.bhWorkerBalancePractice('6–8', 2, 3)).toEqual(BH.bhWorkerBalancePractice('6–8', 2, 3));
    expect(random).not.toHaveBeenCalled(); expect(clock).not.toHaveBeenCalled();
  });

  it('gives younger learners a counting task and older learners a percentage and model-limits task', () => {
    expect(BH.bhWorkerBalanceLesson('K–2').reasoning).toContain('Count');
    expect(BH.bhWorkerBalanceLesson('9–12').reasoning).toContain('percent change');
    expect(BH.bhWorkerBalanceLesson('9–12').reasoning).toContain('leaves out');
    expect(BH.bhWorkerBalanceLesson('6–8').explanation).toContain('not the net change');
  });

  it('preserves a mistaken prediction alongside the checked counts and the learner’s explanation', () => {
    const practice = BH.bhWorkerBalancePractice('6–8', 2, 3);
    const text = BH.bhBuildWorkerBalanceEvidence(practice, 'increase', 'Losses are larger than arrivals.');
    expect(text).toContain('Hypothetical worker balance practice (not a colony observation)');
    expect(text).toContain('100 starting adults + 20 newly emerged workers − 40 adult workers lost = 80 adults');
    expect(text).toContain('I predicted the count would increase; the arithmetic shows it would decrease');
    expect(text).toContain('My explanation: Losses are larger than arrivals.');
  });

  it('refuses missing reasoning, unsupported predictions and tampered results', () => {
    const practice = BH.bhWorkerBalancePractice('6–8', 2, 3);
    expect(BH.bhBuildWorkerBalanceEvidence(practice, 'decrease', '   ')).toBe('');
    expect(BH.bhBuildWorkerBalanceEvidence(practice, 'unknown', 'A reason')).toBe('');
    expect(BH.bhBuildWorkerBalanceEvidence({ ...practice, after: 200 }, 'increase', 'A reason')).toBe('');
    expect(BH.bhBuildWorkerBalanceEvidence(practice, 'decrease', 'x'.repeat(281))).toBe('');
  });

  it('starts collapsed, requires a prediction, and hides the answer until it is checked', async () => {
    await mount();
    expect(lab().querySelector('details').open).toBe(false);
    expect(lab().querySelector('[data-worker-balance-check]').disabled).toBe(true);
    expect(lab().querySelector('[data-worker-balance-result]')).toBeNull();
    await click('input[value="increase"]');
    expect(lab().querySelector('[data-worker-balance-result]')).toBeNull();
    await click('[data-worker-balance-check]');
    expect(lab().querySelector('[data-worker-balance-equation]').textContent).toBe('100 + 20 − 40 = 80');
    expect(lab().textContent).toContain('Revise your prediction using both flows');
  });

  it('clears a stale prediction when a flow changes while preserving explanation and colony inputs', async () => {
    await mount(); const before = structuredClone(latest);
    await review(); await reason('My reasoning is kept while I try another case.');
    await select('losses', 0);
    expect(lab().querySelector('[data-worker-balance-result]')).toBeNull();
    expect(lab().querySelector('input:checked')).toBeNull();
    expect(lab().querySelector('[data-worker-balance-check]').disabled).toBe(true);
    await review('increase');
    expect(lab().querySelector('[data-worker-balance-equation]').textContent).toBe('100 + 20 − 0 = 120');
    expect(lab().querySelector('textarea').value).toBe('My reasoning is kept while I try another case.');
    expect(latest).toEqual(before);
  });

  it('invalidates checked answers on a grade change and maps inputs to the smaller practice colony', async () => {
    await mount(); await review(); await reason('Use both flows.');
    await act(async () => setGrade('Kindergarten'));
    expect(lab().textContent).toContain('starts with 10 adult workers');
    expect(lab().querySelector('[data-worker-balance-result]')).toBeNull();
    expect(lab().querySelector('input:checked')).toBeNull();
    await review();
    expect(lab().querySelector('[data-worker-balance-equation]').textContent).toBe('10 + 3 − 5 = 8');
    expect(lab().querySelector('textarea').value).toBe('Use both flows.');
  });

  it('adds labeled practice once, preserves all writing, and resets only the evidence review', async () => {
    const notebook = { beekeeper: { evidence: 'My observation.', claim: 'My claim', reasoning: 'My reasoning',
      review: { claim: true, evidence: true, reasoning: true } }, queen: { evidence: 'Queen writing' } };
    await mount({ notebook }); const before = structuredClone(latest);
    await review('increase');
    expect(lab().querySelector('[data-worker-balance-evidence]').disabled).toBe(true);
    await reason('More workers were lost than joined.');
    const button = lab().querySelector('[data-worker-balance-evidence]');
    await act(async () => { button.click(); button.click(); });
    const { notebook: saved, ...afterInputs } = latest.beehive, { notebook: _old, ...beforeInputs } = before.beehive;
    expect(afterInputs).toEqual(beforeInputs); expect(latest.otherTool).toEqual(before.otherTool);
    expect(saved.beekeeper.evidence).toMatch(/^My observation\.\nHypothetical worker balance practice/);
    expect(saved.beekeeper.evidence.match(/Hypothetical worker balance practice/g)).toHaveLength(1);
    expect(saved.beekeeper.claim).toBe('My claim'); expect(saved.beekeeper.reasoning).toBe('My reasoning');
    expect(saved.beekeeper.review).toEqual({ claim: true, evidence: false, reasoning: true });
    expect(saved.queen).toEqual(notebook.queen); expect(lab().querySelector('[data-worker-balance-evidence]').disabled).toBe(true);
  });

  it('keeps a full notebook intact and shows the space needed for the practice entry', async () => {
    await mount({ notebook: { beekeeper: { evidence: 'x'.repeat(1200) } } });
    await review(); await reason('Losses are larger.');
    expect(lab().querySelector('[data-worker-balance-evidence]').disabled).toBe(true);
    expect(lab().querySelector('#bee-worker-balance-evidence-hint').textContent).toContain('Make room for');
    expect(latest.beehive.notebook.beekeeper.evidence).toBe('x'.repeat(1200));
  });

  it('supports the expanded layout without requiring saved brood ages', async () => {
    await mount({ focusLayout: false, broodCohorts: undefined, day: 0 });
    expect(lab()).toBeTruthy(); await review();
    expect(lab().querySelector('[data-worker-balance-result]')).toBeTruthy();
  });
});
