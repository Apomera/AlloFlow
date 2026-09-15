// SEL standard-shell save pills must follow the hub's reactive viewport state.
//
// `_wrapStandardToolShell` used to hide the "Private checkpoint" / "Share
// Packet eligible" pills by reading `window.innerWidth` DIRECTLY during render:
//
//     !(typeof window !== 'undefined' && window.innerWidth < 720) && pill(...)
//
// The hub already tracks width reactively (viewportWidth state + resize
// listener + `isCompact`), and every other responsive decision in the module
// uses it. These two lines were the only raw reads, so the pills never
// re-evaluated on resize or rotation — rotate a tablet and the rest of the
// header reflows while these two keep their mount-time state.
//
// The behavioural tests drive the REAL shell through window.SelHub.renderTool,
// the same entry point dev-tools/check_sel_render.cjs uses. A source pin alone
// would pass just as happily against a raw read that never updates.

import { describe, expect, it, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const require2 = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const SOURCE = resolve(process.cwd(), 'sel_hub/sel_hub_module.js');
const MIRROR = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_hub_module.js');

const noop = () => {};
let React;
let RDS;
let SelHub;

beforeAll(() => {
  React = require2(resolve(modulesDir, 'react'));
  RDS = require2(resolve(modulesDir, 'react-dom/server'));
  global.React = window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });

  // Boot the real hub module; it installs window.SelHub.
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(SOURCE, 'utf8')).call(window);
  SelHub = window.SelHub;
  expect(SelHub, 'hub module must install window.SelHub').toBeTruthy();

  // A minimal tool that opts into the standard shell.
  SelHub.registerTool('pillProbe', {
    label: 'Pill Probe',
    title: 'Pill Probe',
    category: 'care-of-self',
    render: () => React.createElement('div', null, 'probe body'),
  });
});

function makeCtx(isCompact) {
  const palProxy = new Proxy({}, { get: () => '#888888' });
  const theme = new Proxy(
    { isDark: false, isContrast: false, reduceMotion: false, palette: palProxy },
    { get: (o, p) => (p in o ? o[p] : '#888888') },
  );
  const base = {
    React,
    isCompact,
    theme,
    isDark: false,
    isContrast: false,
    toolData: {}, setToolData: noop, labToolData: {}, setLabToolData: noop,
    update: noop, updateMulti: noop,
    setSelHubTool: noop, setSelHubTab: noop,
    addToast: noop, awardXP: noop, getXP: () => 0,
    announceToSR: noop, celebrate: noop, beep: noop,
    t: (k) => k,
    callGemini: null, onSafetyFlag: noop,
    icons: new Proxy({}, { get: () => () => null }),
    gradeLevel: '5th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    getSavePolicy: () => ({
      checkpointLabel: 'Private checkpoint',
      sharePacketLabel: 'Share Packet eligible',
    }),
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t),
    a11yClick: (h) => ({ onClick: h, onKeyDown: noop, role: 'button', tabIndex: 0 }),
    props: {},
  };
  return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
}

/** Render the probe tool through the real shell at a given ctx/window width. */
function shellHtml({ isCompact, innerWidth }) {
  const prior = window.innerWidth;
  try {
    Object.defineProperty(window, 'innerWidth', { value: innerWidth, configurable: true });
  } catch (e) { /* jsdom allows it; ignore if not */ }
  const html = RDS.renderToStaticMarkup(SelHub.renderTool('pillProbe', makeCtx(isCompact)));
  try {
    Object.defineProperty(window, 'innerWidth', { value: prior, configurable: true });
  } catch (e) { /* ignore */ }
  return html;
}

describe('SEL shell save pills follow reactive viewport state', () => {
  it('renders the standard shell for a registered tool', () => {
    const html = shellHtml({ isCompact: false, innerWidth: 1280 });
    expect(html).toContain('probe body');
    expect(html).toContain('data-sel-standard-shell');
  });

  it('shows both pills when ctx reports a wide viewport', () => {
    const html = shellHtml({ isCompact: false, innerWidth: 1280 });
    expect(html).toContain('Private checkpoint');
    expect(html).toContain('Share Packet eligible');
  });

  it('hides both pills when ctx reports a compact viewport', () => {
    const html = shellHtml({ isCompact: true, innerWidth: 390 });
    expect(html).not.toContain('Private checkpoint');
    expect(html).not.toContain('Share Packet eligible');
  });

  it('follows ctx even when window.innerWidth disagrees', () => {
    // The regression under test: a stale raw read answers from innerWidth and
    // gets this backwards in BOTH directions.
    expect(
      shellHtml({ isCompact: false, innerWidth: 320 }),
      'ctx says wide, so the pills must show',
    ).toContain('Private checkpoint');

    expect(
      shellHtml({ isCompact: true, innerWidth: 1600 }),
      'ctx says compact, so the pills must hide',
    ).not.toContain('Private checkpoint');
  });

  it('renders the unconditional privacy sentence at every width', () => {
    // This is why hiding the pills on a phone is acceptable: the actual policy
    // disclosure is not width-gated, so a mobile student still reads it.
    for (const isCompact of [true, false]) {
      expect(
        shellHtml({ isCompact, innerWidth: isCompact ? 390 : 1280 }),
        `compact=${isCompact}`,
      ).toContain('Tool checkpoints stay private here unless you choose them for a Share Packet.');
    }
  });

  it('keeps the export control at every width', () => {
    for (const isCompact of [true, false]) {
      expect(shellHtml({ isCompact, innerWidth: isCompact ? 390 : 1280 }), `compact=${isCompact}`)
        .toContain('Export SEL project file now');
    }
  });

  it('makes no raw render-time innerWidth read in the shell', () => {
    const src = readFileSync(SOURCE, 'utf8');
    const start = src.indexOf('_wrapStandardToolShell: function(id, tool, content, ctx) {');
    expect(start).toBeGreaterThan(-1);
    const shellSrc = src.slice(start, start + 12000);
    // Exactly one guarded fallback is allowed, for a ctx predating the field.
    expect((shellSrc.match(/window\.innerWidth/g) || []).length).toBeLessThanOrEqual(1);
    expect(shellSrc).toContain("typeof ctx.isCompact === 'boolean'");
  });

  it('exposes isCompact on the SEL tool ctx', () => {
    expect(readFileSync(SOURCE, 'utf8')).toContain('isCompact: isCompact,');
  });

  it('keeps source and public mirror byte-identical', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
