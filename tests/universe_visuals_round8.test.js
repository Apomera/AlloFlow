// Universe Explorer, eighth pass (2026-10-19): a starlight lab (Planck curve, Wien peak,
// blackbody colour, light per square metre) tied to the spectral-class card, a labelled
// black-hole anatomy diagram that lights the picked part, and history timelines.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true }, state) });
const count = (html, text) => html.split(text).length - 1;
const rgb = (s) => s.match(/\d+/g).map(Number);

describe('Starlight physics (pure)', () => {
  it('peaks where Wien’s law says, on a curve shaped by Planck’s law', () => {
    expect(pure.universeWienPeakNm(5772)).toBeCloseTo(502, 0);
    expect(pure.universeWienPeakNm(3600)).toBeCloseTo(805, 0);
    let best = 0, bestNm = 0;
    for (let nm = 200; nm <= 2000; nm += 2) { const v = pure.universePlanck(nm, 5772); if (v > best) { best = v; bestNm = nm; } }
    expect(Math.abs(bestNm - 502)).toBeLessThanOrEqual(2);
    expect(pure.universePlanck(1000, 12000) / pure.universePlanck(1000, 6000), 'hotter is brighter at every wavelength').toBeGreaterThan(1);
  });

  it('colours stars red, white and blue as they heat up', () => {
    const cool = rgb(pure.universeBlackbodyRGB(3600)), sun = rgb(pure.universeBlackbodyRGB(5772)), hot = rgb(pure.universeBlackbodyRGB(40000));
    expect(cool[0]).toBe(255);
    expect(cool[2]).toBeLessThan(170);
    expect(sun[0]).toBe(255);
    expect(sun[1]).toBeGreaterThan(230);
    expect(sun[2]).toBeGreaterThan(215);
    expect(hot[2]).toBe(255);
    expect(hot[0]).toBeLessThan(170);
  });

  it('names classes, bands and years', () => {
    expect([40000, 12100, 9940, 6500, 5772, 4400, 3600].map(pure.universeSpectralClass).join('')).toBe('OBAFGKM');
    expect(pure.universeWavelengthBand(502)).toBe('green');
    expect(pure.universeWavelengthBand(239)).toContain('ultraviolet');
    expect(pure.universeWavelengthBand(805)).toContain('infrared');
    expect(pure.universeYearOf('~150 AD')).toBe(150);
    expect(pure.universeYearOf('1924–29')).toBe(1924);
    expect(pure.universeYearOf('1970s')).toBe(1970);
  });

  it('keeps the starlight question free of a length cue', () => {
    const item = pure.UNIVERSE_STARLIGHT_PREDICTION, lengths = item.options.map((o) => o.length), max = Math.max(...lengths);
    expect(lengths[item.answer] === max && lengths.filter((l) => l === max).length === 1).toBe(false);
  });
});

describe('Round 8 visuals (rendered)', () => {
  it('Starlight lab: predict first, then the Sun and Rigel worked out', () => {
    const fresh = render({ showSpectral: true });
    expect(fresh.includes('So why doesn’t the Sun look green?')).toBe(true);
    expect(fresh.includes('Surface temperature:'), 'lab waits for a prediction').toBe(false);
    const sun = render({ showSpectral: true, starlightGuess: 1 });
    expect(sun.includes('It is because its light mixes every colour.')).toBe(true);
    expect(sun.includes('Class G. Its light peaks at 502 nanometres (green). Each square metre of its surface gives out the same light as a square metre of the Sun.')).toBe(true);
    const rigel = render({ showSpectral: true, starlightGuess: 0, starTemp: 12100 });
    expect(rigel.includes('Class B. Its light peaks at 239 nanometres (ultraviolet, too blue for our eyes). Each square metre of its surface gives out about 19 times as much light')).toBe(true);
  });

  it('Black hole: a labelled diagram that lights the picked part', () => {
    const plain = render({ showBlackHole: true });
    expect(plain.includes('class="uni-bh-svg"')).toBe(true);
    expect(count(plain, 'data-on="true"')).toBe(0);
    const disk = render({ showBlackHole: true, bhPick: 3 });
    expect(count(disk, 'data-on="true"')).toBe(1);
    expect(disk.includes('Highlighted: Accretion Disk.')).toBe(true);
  });

  it('Timelines: one dot per entry, the picked one named', () => {
    const ast = render({ showAstronomers: true, astPick: 6 });
    expect(ast.includes('Highlighted: Henrietta Leavitt, 1912.')).toBe(true);
    expect(count(ast, 'data-on="true"')).toBe(1);
    const mis = render({ showMissions: true, missionPick: 4 });
    expect(mis.includes('Highlighted: Hubble Space Telescope, 1990.')).toBe(true);
  });
});

describe('Round 8 visuals (live)', () => {
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

  it('keeps the temperature slider and the class card in step, both ways', async () => {
    await mount({ showSpectral: true, starlightGuess: 0 });
    await slide(host.querySelector('#universe-star-temp'), Math.log10(3600));
    expect(state.starTemp).toBe(3600);
    expect(state.spectralIdx).toBe(6);
    expect(host.querySelector('#unisec-spectral .uni-lab-readout').textContent).toContain('Class M.');
    const k = host.querySelector('#unisec-spectral button[aria-label="Select spectral class K"]');
    await act(async () => k.click());
    expect(state.spectralIdx).toBe(5);
    expect(state.starTemp).toBe(4450);
    expect(host.querySelector('#unisec-spectral .uni-lab-readout').textContent).toContain('Class K.');
  });
});
