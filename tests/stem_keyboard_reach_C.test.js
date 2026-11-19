// Keyboard reach (WCAG 2.1.1) for actions that were pointer-only:
// - Raptor Hunt, Conservation reference: the status table's column headers sorted
//   the table on click, but they were plain <th> cells, so Tab never reached them
//   and Enter/Space did nothing. Each header now holds a real button.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const mounted = [];
const moduleObservers = new Set();

// The tool installs document MutationObservers at load; release them before jsdom
// tears the window down, or they fire into a missing window after the test.
beforeEach(() => {
  const NativeMutationObserver = globalThis.MutationObserver;
  vi.stubGlobal('MutationObserver', class TrackedMutationObserver extends NativeMutationObserver {
    constructor(callback) { super(callback); moduleObservers.add(this); }
  });
});

function mountStateful(toolId, initial) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const out = { state: null };
  function Harness() {
    const [data, setData] = React.useState(initial);
    out.state = data;
    const setter = (fn) => setData((prev) => (typeof fn === 'function' ? fn(prev) : fn));
    return window.StemLab._registry[toolId].render(makeCtx({ toolData: data, setToolData: setter }));
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Harness)); });
  mounted.push({ root, host });
  return { host, out };
}

afterEach(() => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    act(() => { root.unmount(); });
    host.remove();
  }
  for (const observer of moduleObservers) observer.disconnect();
  moduleObservers.clear();
  vi.unstubAllGlobals();
});

// A native button turns Enter and Space into a click; jsdom does not, so the
// test dispatches the click a keyboard activation produces after checking the
// control is a real, focusable button.
function activate(button) {
  act(() => { button.focus(); });
  expect(document.activeElement).toBe(button);
  act(() => { button.click(); });
}

describe('Raptor Hunt conservation status table sorts from the keyboard', () => {
  it('puts a focusable button in every sortable header and sorts on activation', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_raptorhunt.js', 'raptorHunt');
    const { host, out } = mountStateful('raptorHunt', {
      raptorHunt: { activeSection: 'conservation', selectedSpecies: 'peregrine', huntTutorialDismissed: true }
    });
    const buttons = [...host.querySelectorAll('button[data-rh-status-sort]')];
    expect(buttons.map((b) => b.getAttribute('data-rh-status-sort'))).toEqual(['name', 'iucn', 'trend', 'pop', 'esa']);
    for (const b of buttons) {
      expect(b.tagName).toBe('BUTTON');
      expect(b.getAttribute('type')).toBe('button');
      expect(b.closest('th')).not.toBeNull();
      expect(b.closest('th').getAttribute('onclick')).toBeNull();
    }
    // Default sort is IUCN ascending, announced on the header.
    const iucnHeader = buttons[1].closest('th');
    expect(iucnHeader.getAttribute('aria-sort')).toBe('ascending');

    const nameButton = host.querySelector('button[data-rh-status-sort="name"]');
    activate(nameButton);
    expect(out.state.raptorHunt.statusSort).toBe('name');
    expect(out.state.raptorHunt.statusDir).toBe('asc');
    expect(host.querySelector('button[data-rh-status-sort="name"]').closest('th').getAttribute('aria-sort')).toBe('ascending');

    // Activating the same header again reverses the order, exactly as a click did.
    activate(host.querySelector('button[data-rh-status-sort="name"]'));
    expect(out.state.raptorHunt.statusDir).toBe('desc');
    expect(host.querySelector('button[data-rh-status-sort="name"]').closest('th').getAttribute('aria-sort')).toBe('descending');
  });
});
