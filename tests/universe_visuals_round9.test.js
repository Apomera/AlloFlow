// Universe Explorer, ninth pass (2026-10-19): a redshift lab where hydrogen's lines slide
// out of visible light (the shift and the look-back numbers come from the same expansion
// model as the timeline), and "practice here" links from citizen-science projects.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true }, state) });

describe('Line-shift data (pure)', () => {
  it('uses hydrogen’s real rest wavelengths and a cue-free question', () => {
    const lines = Object.fromEntries(pure.UNIVERSE_HYDROGEN_LINES);
    expect(lines['Hα']).toBeCloseTo(656.3, 1);
    expect(lines['Hβ']).toBeCloseTo(486.1, 1);
    expect(lines['Lyα']).toBeCloseTo(121.6, 1);
    const item = pure.UNIVERSE_LINESHIFT_PREDICTION, lengths = item.options.map((o) => o.length), max = Math.max(...lengths);
    expect(lengths[item.answer] === max && lengths.filter((l) => l === max).length === 1).toBe(false);
  });
});

describe('Line-shift lab (rendered)', () => {
  it('asks first, then stretches every line by 1 + z', () => {
    const fresh = render({ showRedshift: true });
    expect(fresh.includes('In a galaxy at redshift z = 1, where does that line arrive?')).toBe(true);
    expect(fresh.includes('Redshift z: '), 'lab waits for a prediction').toBe(false);
    const quasar = render({ showRedshift: true, lineShiftGuess: 1 });
    expect(quasar.includes('It arrives at about 1,312 nm, in the infrared.')).toBe(true);
    expect(quasar.includes('Every wavelength is stretched by 1 + z = 1.158. Hydrogen’s red line (656.3 nm) arrives at 760 nm (infrared, too red for our eyes).')).toBe(true);
    expect(render({ showRedshift: true, lineShiftGuess: 0, lineShiftZ: 0 }).includes('No shift: these are hydrogen’s lines')).toBe(true);
    // The picture moves too: at z = 1 the drawn Hα line sits at 1,313 nm and Lyα at 243 nm.
    const doubled = render({ showRedshift: true, lineShiftGuess: 0, lineShiftZ: 1 });
    expect(doubled.includes('data-nm="1313"')).toBe(true);
    expect(doubled.includes('data-nm="243"')).toBe(true);
    expect(doubled.includes('data-nm="656"'), 'no line left at its rest wavelength').toBe(false);
  });

  it('places GN-z11’s light with the expansion model', () => {
    const html = render({ showRedshift: true, lineShiftGuess: 0, lineShiftZ: 10.6 });
    expect(html.includes('stretched by 1 + z = 11.6. Hydrogen’s red line (656.3 nm) arrives at 7,613.1 nm')).toBe(true);
    expect(html.includes('This light left when the universe was 436 million years old, and that galaxy is now 32 billion light-years away.')).toBe(true);
  });

  it('links citizen-science projects to a lab that practises the same skill', () => {
    expect(render({ showCitizenSci: true, citPick: 0 }).includes('Practice the same skill here: Galaxy Types →')).toBe(true);
    expect(render({ showCitizenSci: true, citPick: 3 }).includes('Practice the same skill here: Supernovae →')).toBe(true);
    expect(render({ showCitizenSci: true, citPick: 4 }).includes('Practice the same skill here'), 'no lab for Globe at Night').toBe(false);
  });
});

describe('Round 9 (live)', () => {
  const { act } = React;
  let host, root, config, state;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    Element.prototype.scrollIntoView = vi.fn();
    resetStemLab();
    config = loadTool(TOOL, 'universe');
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => {
    if (window._universeTimeLapse) clearInterval(window._universeTimeLapse);
    window._universeTimeLapse = null;
    await act(async () => root.unmount());
    host.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  });
  async function mount(initial) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ universe: Object.assign({ tutorialDismissed: true }, initial) });
      state = toolData.universe;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => root.render(React.createElement(Harness)));
  }
  async function slide(el, value) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('moves the redshift slider to z = 1 and doubles every wavelength', async () => {
    await mount({ showRedshift: true, lineShiftGuess: 0 });
    await slide(host.querySelector('#universe-lineshift-z'), Math.log10(2) / Math.log10(12));
    expect(state.lineShiftZ).toBe(1);
    expect(host.querySelector('#unisec-redshift .uni-lab-readout').textContent).toContain('arrives at 1,312.6 nm');
    expect(state.uniEngaged.redshift).toBe(1);
  });

  it('opens the matching lab from a citizen-science project', async () => {
    await mount({ showCitizenSci: true, citPick: 1 });
    await act(async () => host.querySelector('#unisec-citizen-science .uni-practice-link').click());
    expect(state.showExoplanets).toBe(true);
    expect(state.uniEngaged['citizen-science']).toBe(1);
  });
});
