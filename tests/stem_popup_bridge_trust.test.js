import { describe, expect, it, vi, afterEach } from 'vitest';
import { loadTool, resetStemLab, makeCtx, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// The pop-up companion bridges (Molecule Shelf, Sim Shelf, Timeline, Zoom Gallery,
// Circuit Shelf, AlphaFold Explorer) answered window 'message' events from ANY
// window: any page holding a handle to the app could ask for AI coaching on the
// student's behalf, read notes, or write them. Each bridge now accepts only the
// pop-up it opened, at the companion's own origin, and replies to that origin.

const act = React.act;
const TOOLS = [
  { file: 'stem_lab/stem_tool_moleculeshelf.js', id: 'moleculeShelf', prefix: 'allocmol' },
  { file: 'stem_lab/stem_tool_simshelf.js', id: 'simShelf', prefix: 'allosimshelf' },
  { file: 'stem_lab/stem_tool_circuitshelf.js', id: 'circuitShelf', prefix: 'alloccircuit' },
  { file: 'stem_lab/stem_tool_alphafold.js', id: 'alphaFoldExplorer', prefix: 'allocaf' },
  { file: 'stem_lab/stem_tool_zoomgallery.js', id: 'zoomGallery', prefix: 'alloczoom' },
  { file: 'stem_lab/stem_tool_timeline.js', id: 'timelineStudio', prefix: 'allotimeline' },
];
const OPEN_RE = /open|pop out|build by hand|inspect|launch/i;
let cleanup = [];

afterEach(() => {
  cleanup.forEach((fn) => { try { fn(); } catch (_) {} });
  cleanup = [];
  vi.restoreAllMocks();
});

function fakeWin() { return { closed: false, postMessage: vi.fn(), focus: vi.fn(), location: { href: '' } }; }

function mount(tool) {
  resetStemLab();
  loadTool(tool.file, tool.id);
  const popup = fakeWin();
  const openSpy = vi.spyOn(window, 'open').mockReturnValue(popup);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const out = { state: null };
  function Host() {
    const [toolData, setToolData] = React.useState({});
    out.state = toolData;
    return window.StemLab._registry[tool.id].render(makeCtx({
      toolData,
      setToolData: (fn) => setToolData((p) => (typeof fn === 'function' ? fn(p) : fn)),
      theme: 'dark', lang: 'en', aiHintsEnabled: true, aiAvailable: true,
      callGemini: () => Promise.resolve('ok'),
    }));
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Host)); });
  cleanup.push(() => { act(() => root.unmount()); host.remove(); });
  const openIt = () => {
    for (const b of host.querySelectorAll('button')) {
      const label = (b.textContent || '') + ' ' + (b.getAttribute('aria-label') || '');
      if (!OPEN_RE.test(label)) continue;
      act(() => { b.click(); });
      if (openSpy.mock.calls.length) return true;
    }
    return false;
  };
  return { popup, openIt, out };
}

function send(source, origin, data) {
  act(() => { window.dispatchEvent(new MessageEvent('message', { source, origin, data })); });
}

// Timeline has no AI request; its observable bridge effect is the manual-add counter.
function probe(tool, ctx, source, origin) {
  if (tool.id === 'timelineStudio') {
    send(source, origin, { type: 'allotimeline-manual-added' });
    return ((ctx.out.state && ctx.out.state._timeline && ctx.out.state._timeline.manualCount) || 0);
  }
  send(source, origin, { type: tool.prefix + '-hello' });
  return source.postMessage.mock.calls.filter((c) => c[0] && c[0].type === tool.prefix + '-ready').length;
}

describe('STEM pop-up bridges accept only their own pop-up at the companion origin', () => {
  for (const tool of TOOLS) {
    it(tool.id + ': ignores a foreign window and a wrong origin, still answers its own pop-up', () => {
      const ctx = mount(tool);
      const origin = window.location.origin;
      const stranger = fakeWin();
      // Before anything is open, nothing is trusted.
      expect(probe(tool, ctx, stranger, origin)).toBe(0);
      expect(ctx.openIt(), 'found the button that opens the pop-up').toBe(true);
      // A different window at the right origin: ignored.
      expect(probe(tool, ctx, stranger, origin)).toBe(0);
      expect(stranger.postMessage).not.toHaveBeenCalled();
      // The real pop-up but a foreign origin (it navigated away): ignored.
      expect(probe(tool, ctx, ctx.popup, 'https://evil.example')).toBe(0);
      // The real pop-up at the companion origin: works.
      expect(probe(tool, ctx, ctx.popup, origin)).toBe(1);
      if (tool.id !== 'timelineStudio') {
        const ready = ctx.popup.postMessage.mock.calls.find((c) => c[0] && c[0].type === tool.prefix + '-ready');
        expect(ready[1]).toBe(origin === 'null' ? '*' : origin);
      }
    });
  }
});
