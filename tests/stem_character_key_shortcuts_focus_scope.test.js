import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// WCAG 2.1.4 Character Key Shortcuts. These seven math tools listen for bare
// letter / digit / "?" keys on window. A shortcut like that must act only while
// focus is inside the tool (or be turn-off-able / remappable), so a speech-input
// user dictating elsewhere on the page does not fire it.
//
// Each case renders the tool, then presses its shortcut three ways:
//   1. with focus outside the tool (document.body)  -> state must NOT change
//   2. on a control inside the tool, with Ctrl held -> state must NOT change
//   3. on a control inside the tool, no modifier     -> state MUST change
//
// VPAT_KEYS_SRC_DIR points the suite at another copy of stem_lab/ (mutation
// check: the pre-fix copies must turn case 1 red).

const DIR = process.env.VPAT_KEYS_SRC_DIR || 'stem_lab';
const WINDOW_HANDLERS = ['_areaModelKbHandler', '_coordGridKeyHandler', '_fracKbHandler', '_volumeKeyHandler', '_multTableKbHandler'];

// stem_tool_areamodel.js left this list on 2026-11-03: its single-letter
// shortcuts were removed outright (they fired from focused buttons, and "c"
// swapped an open distributive challenge). tests/areamodel_deep_regressions.test.js
// asserts that bare c/n/w/b on a focused control change nothing.
const CASES = [
  { file: 'stem_tool_coordgrid.js', id: 'coordinate', key: '?' },
  { file: 'stem_tool_fractions.js', id: 'fractions', key: 'b' },
  { file: 'stem_tool_volume.js', id: 'volume', key: 'b' },
  // multtable (2026-11-03): its bare-key shortcuts no longer fire from a
  // focused button at all, only from the practice panel itself, so case 3
  // below does not apply. tests/multtable_deep_a11y.test.js checks all three
  // cases for it (outside, Ctrl, on a button) plus the panel.
  // numberline (2026-11-03): same change as multtable; its shortcuts fire only
  // from the tool area (e.g. the tabpanel), never from a focused button.
  // tests/numberline_deep_ui.test.js checks outside, on a button, and the panel.
  { file: 'stem_tool_inequality.js', id: 'inequality', key: 'b' },
];

let root = null;
let host = null;
const realGetContext = window.HTMLCanvasElement.prototype.getContext;
beforeEach(() => {
  resetStemLab();
  // jsdom has no 2D context; a do-nothing stand-in keeps canvas refs from throwing.
  const fake = new Proxy(function () {}, {
    get: (t, p) => (p === 'measureText' ? () => ({ width: 0 }) : (p === Symbol.toPrimitive ? () => 0 : () => fake)),
    set: () => true,
    apply: () => fake,
  });
  window.HTMLCanvasElement.prototype.getContext = () => fake;
  if (!window.ResizeObserver) {
    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    globalThis.ResizeObserver = window.ResizeObserver;
  }
});
afterEach(async () => {
  window.HTMLCanvasElement.prototype.getContext = realGetContext;
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  WINDOW_HANDLERS.forEach((k) => { if (window[k]) { window.removeEventListener('keydown', window[k]); window[k] = null; } });
  if (host) { host.remove(); host = null; }
  document.body.innerHTML = '';
});

async function mount(id) {
  const tool = window.StemLab._registry[id];
  const view = { snap: null };
  function App() {
    const [toolData, setToolData] = React.useState({});
    const [labToolData, setLabToolData] = React.useState({});
    view.snap = JSON.stringify([toolData, labToolData]);
    const ctx = makeCtx({
      toolData, setToolData, labToolData, setLabToolData,
      update: (k, v) => setToolData((p) => Object.assign({}, p, { [k]: v })),
      updateMulti: (o) => setToolData((p) => Object.assign({}, p, o || {})),
    });
    return tool.render(ctx);
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(App)); });
  // let setTimeout-registered handlers (area model) and first-render state writes settle
  await React.act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  return view;
}

async function press(target, key, extra) {
  await React.act(async () => {
    target.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, extra || {})));
  });
}

describe('WCAG 2.1.4: single-key shortcuts act only while focus is inside the tool', () => {
  it.each(CASES)('$file', async ({ file, id, key }) => {
    loadTool(DIR + '/' + file, id);
    const view = await mount(id);
    const inside = host.querySelector('button');
    expect(inside, 'tool rendered no button to focus').toBeTruthy();

    const before = view.snap;
    await press(document.body, key);
    expect(view.snap === before, `"${key}" pressed with focus outside the tool changed its state`).toBe(true);

    await press(inside, key, { ctrlKey: true });
    expect(view.snap === before, `Ctrl+"${key}" inside the tool fired the single-key shortcut`).toBe(true);

    await press(inside, key);
    expect(view.snap !== before, `"${key}" pressed on a control inside the tool did nothing`).toBe(true);
  });
});
