// Read-aloud degradation, and the announcement channel itself.
//
// A click-probe flagged every "Read X aloud" control as inert. It is not: `announce()`
// blanks the live region and writes the message on a 30ms timer, the standard trick that
// forces a screen reader to re-announce identical text. A synchronous assertion reads the
// deliberate blank and calls a working control dead — so any test of announced output has
// to wait, and this file is the reference for that.
//
// The path under test is the real one for a browser with no speech synthesis: the button
// still renders, and clicking it must SAY so rather than doing nothing.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
if (typeof act !== 'function') throw new Error('React.act unavailable');

let cfg;
let live = null;

beforeAll(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_geologyexplorer.js', 'geologyExplorer');
});

afterEach(() => {
  if (live) {
    act(() => live.root.unmount());
    live.container.remove();
    live = null;
  }
});

function mount(mode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const store = newStore({ geologyExplorer: { scene: 'crust', mode } });
  const ctx = makeCtx({ toolData: store.toolData }, store);
  const root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(() => cfg.render(ctx))));
  live = { container, root, store, ctx };
  return container;
}

const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
// announce() writes after 30ms; settle past it before reading the live region.
const settle = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 80)); }); };
const liveText = (c) => (c.querySelector('[aria-live]') || {}).textContent || '';

describe('Geology Explorer — read aloud without speech synthesis', () => {
  it('has no speech synthesis in this environment', () => {
    // Guards the premise. If jsdom ever gains speechSynthesis, this file tests nothing and
    // should be revisited rather than quietly passing.
    expect(window.speechSynthesis).toBeUndefined();
    const c = mount('explore');
    expect(typeof live.ctx.callTTS).not.toBe('function');
    expect(c.querySelector('[data-geology-read-aloud]'), 'no read-aloud control rendered').toBeTruthy();
  });

  it('says read aloud is unavailable instead of doing nothing', async () => {
    const c = mount('explore');
    const btn = c.querySelector('[data-geology-read-aloud]');
    expect(btn.disabled, 'the control is offered, so it must respond').toBe(false);
    click(btn);
    await settle();
    expect(liveText(c)).toMatch(/read aloud is not available in this browser/i);
  });

  it('blanks the live region first so identical messages re-announce', async () => {
    const c = mount('explore');
    const btn = c.querySelector('[data-geology-read-aloud]');
    click(btn);
    await settle();
    expect(liveText(c)).toMatch(/not available/i);
    // Same message twice: the region must go empty in between, or a screen reader stays silent.
    click(btn);
    expect(liveText(c), 'live region was not cleared before the repeat message').toBe('');
    await settle();
    expect(liveText(c)).toMatch(/not available/i);
  });

  it('keeps its label honest while nothing is speaking', () => {
    const c = mount('explore');
    for (const btn of c.querySelectorAll('[data-geology-read-aloud]')) {
      const label = btn.getAttribute('aria-label') || '';
      expect(label, 'idle control must not claim to stop reading').not.toMatch(/^stop reading/i);
      expect(btn.textContent.trim()).toBe('Read aloud');
    }
  });
});
