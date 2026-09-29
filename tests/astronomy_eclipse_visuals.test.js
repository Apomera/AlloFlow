import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
const mounts = [];
const previousActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
const eclipseState = patch => ({ tab: 'eclipses', observingList: [], simMeteorView: '2d', eclipseType: 'solar', eclipseGeometry: 'total', eclipsePhase: 50, ...patch });
const render = patch => renderTool('astronomy', { astronomy: eclipseState(patch) });

beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => {
  mounts.splice(0).forEach(view => view.unmount());
  vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActFlag;
});

function mount(patch) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let state;
  function App() {
    const [data, setData] = React.useState({ astronomy: eclipseState(patch) });
    state = data.astronomy;
    return window.StemLab._registry.astronomy.render(makeCtx({ toolData: data, setToolData: setData }));
  }
  act(() => root.render(React.createElement(App)));
  const view = { host, get state() { return state; }, unmount() { act(() => root.unmount()); host.remove(); } };
  mounts.push(view); return view;
}

describe('Eclipse visual geometry and interaction', () => {
  it('reveals the corona only when the complete solar disk is hidden', () => {
    const partial = render({ eclipsePhase: 48 });
    expect(partial).toContain('data-eclipse-stage="Partial eclipse"');
    expect(partial).not.toContain('data-eclipse-corona');
    expect(render({ eclipsePhase: 50 })).toContain('data-eclipse-corona="true"');
  });

  it('recognizes annularity while the Sun remains partly uncovered', () => {
    const html = render({ eclipseGeometry: 'annular' });
    expect(html).toContain('data-eclipse-stage="Annularity"');
    expect(html).toContain('77% of the Sun covered');
    expect(html).toContain('BRIGHT RING REMAINS');
    expect(html).not.toContain('data-eclipse-corona');
  });

  it('keeps coverage symmetric on entry and exit with clear endpoints', () => {
    const covered = phase => Number(render({ eclipsePhase: phase, eclipseGeometry: 'partial' }).match(/(\d+)% of the Sun covered/)[1]);
    expect(covered(0)).toBe(0);
    expect(covered(100)).toBe(0);
    expect(covered(30)).toBe(covered(70));
    expect(covered(50)).toBe(42);
  });

  it('clips both lunar shadow layers to the disk while keeping a sunlit base', () => {
    const html = render({ eclipseType: 'lunar', eclipsePhase: 40 });
    const host = document.createElement('div'); host.innerHTML = html;
    const shadows = host.querySelectorAll('g[clip-path="url(#astr-eclipse-lunar-disk)"] [data-eclipse-shadow]');
    expect(shadows.length).toBe(2);
    expect(host.querySelector('circle[fill="url(#lunar-moon-grad)"]')).toBeTruthy();
    expect(host.querySelector('[data-eclipse-stage]').textContent).toBe('Partial lunar eclipse');
    expect(html).toContain('not a prediction of a dated eclipse');
  });

  it('stage shortcuts pause playback and change with eclipse type', () => {
    const view = mount({ eclipsePhase: 30, eclipsePlaying: true });
    const section = () => view.host.querySelector('#astronomy-eclipse-simulator');
    expect(section().querySelectorAll('[aria-label="Eclipse stage shortcuts"] button').length).toBe(5);
    act(() => section().querySelector('[aria-label="Show eclipse stage: Maximum"]').click());
    expect(view.state.eclipsePhase).toBe(50);
    expect(view.state.eclipsePlaying).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    act(() => Array.from(section().querySelectorAll('button')).find(button => button.textContent.includes('Lunar eclipse')).click());
    expect(section().querySelectorAll('[aria-label="Eclipse stage shortcuts"] button').length).toBe(7);
    act(() => section().querySelector('[aria-label="Show eclipse stage: Umbra"]').click());
    expect(section().querySelector('[data-eclipse-stage]').textContent).toBe('Partial lunar eclipse');
  });

  it('stops at the end without wrapping and replays from the beginning', () => {
    const view = mount({ eclipsePhase: 98, eclipsePlaying: true });
    const status = () => view.host.querySelector('#astronomy-eclipse-status');
    expect(status().getAttribute('aria-live')).toBe('off');
    act(() => vi.advanceTimersByTime(100));
    expect(view.state.eclipsePhase).toBe(100);
    expect(view.state.eclipsePlaying).toBe(false);
    expect(status().getAttribute('aria-live')).toBe('polite');
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(500));
    expect(view.state.eclipsePhase).toBe(100);
    act(() => view.host.querySelector('#astronomy-eclipse-simulator [aria-label="Play animation"]').click());
    expect(view.state.eclipsePhase).toBe(0);
    expect(view.state.eclipsePlaying).toBe(true);
    act(() => vi.advanceTimersByTime(100));
    expect(view.state.eclipsePhase).toBe(2);
  });
});
