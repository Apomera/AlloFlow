// Bugs the student AI-off browser pass found in a real browser (2026-11-05) that jsdom runs had missed.
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const { createRoot } = require(resolve(modulesDir, 'react-dom/client'));
const { act } = React;

function contrast(hexA, hexB) {
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
  };
  const [hi, lo] = [lum(hexA), lum(hexB)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The real registry block, cut from the shipped module.
function loadArcadeRegistry() {
  const source = readFileSync('allohaven_module.js', 'utf8');
  const start = source.indexOf('if (!window.AlloHavenArcade) {');
  const end = source.indexOf('// ── Print stylesheet (Phase 2h)', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  delete window.AlloHavenArcade;
  window.React = React;
  new Function(source.slice(start, end))();
  return window.AlloHavenArcade;
}

describe('Arcade modes keep their own hooks', () => {
  let root;
  let host;
  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    if (host) host.remove();
    root = null;
    host = null;
    delete window.AlloHavenArcade;
  });

  it('a mode registering late does not break the hook order of the modes already on screen', async () => {
    const Arcade = loadArcadeRegistry();
    const realError = console.error;
    const errors = [];
    console.error = (...args) => { errors.push(args.map(String).join(' ')); };
    try {
      const withHooks = (label) => ({
        render: () => {
          const [n] = React.useState(0);
          React.useEffect(() => {}, []);
          return React.createElement('span', { 'data-card': label }, label + n);
        },
      });
      Arcade.registerMode('alpha', withHooks('alpha'));
      const Hub = () => React.createElement('div', null, Arcade.getRegisteredModes().map((mode) =>
        React.createElement('div', { key: mode.id }, Arcade.renderMode(mode.id, {}))));
      host = document.createElement('div');
      document.body.appendChild(host);
      root = createRoot(host);
      await act(async () => root.render(React.createElement(Hub)));
      Arcade.registerMode('beta', withHooks('beta'));
      await act(async () => root.render(React.createElement(Hub, { tick: 1 })));
      expect(host.querySelector('[data-card="alpha"]')).toBeTruthy();
      expect(host.querySelector('[data-card="beta"]')).toBeTruthy();
      expect(errors.filter((e) => /order of Hooks|more hooks|Error rendering/.test(e))).toEqual([]);
    } finally {
      console.error = realError;
    }
  });

  it('a mode that throws still renders nothing rather than taking the hub down', async () => {
    const Arcade = loadArcadeRegistry();
    const realError = console.error;
    console.error = () => {};
    try {
      Arcade.registerMode('boom', { render: () => { throw new Error('boom'); } });
      Arcade.registerMode('fine', { render: () => React.createElement('span', { 'data-card': 'fine' }, 'fine') });
      const Hub = () => React.createElement('div', null, Arcade.getRegisteredModes().map((mode) =>
        React.createElement('div', { key: mode.id }, Arcade.renderMode(mode.id, {}))));
      host = document.createElement('div');
      document.body.appendChild(host);
      root = createRoot(host);
      await act(async () => root.render(React.createElement(Hub)));
      expect(host.querySelector('[data-card="fine"]')).toBeTruthy();
    } finally {
      console.error = realError;
    }
  });
});

describe('light theme readability', () => {
  it('Culture Explorer headings use a class the dark theme remaps, not near-white text', () => {
    // text-slate-100 sat on a near-white card: 1.05:1 in the light theme.
    expect(readFileSync('sel_hub/sel_tool_cultureexplorer.js', 'utf8')).not.toMatch(/\btext-slate-(100|300)\b/);
  });

  it('Conflict Theater primary buttons reach 4.5:1 with white text', () => {
    const source = readFileSync('sel_hub/sel_tool_conflicttheater.js', 'utf8');
    const white = source.match(/background: _cftHC \? _cftBg\('#14b8a6'\) : '(#[0-9a-f]{6})', color: _cftFg\('#fff'\)/g) || [];
    expect(white.length).toBeGreaterThanOrEqual(3);
    white.forEach((style) => {
      expect(contrast(/: '(#[0-9a-f]{6})'/.exec(style)[1], '#ffffff')).toBeGreaterThanOrEqual(4.5);
    });
    expect(source).not.toMatch(/background: _cftBg\('#14b8a6'\), color: _cftFg\('#fff'\)/);
  });
});

describe('open bugs from the browser pass', () => {
  const host = readFileSync('AlloFlowANTI.txt', 'utf8');
  it('a project opening on a windowed tool has a way into it', () => {
    const types = /_ALLO_WINDOWED_RESOURCE_TYPES = new Set\(\[([^\]]+)\]/.exec(host)[1];
    for (const type of ['storyforge-config', 'poettree-config', 'litlab-config', 'lingua-config', 'lingua-submission']) expect(types).toContain("'" + type + "'");
    expect(host.includes('data-allo-windowed-open')).toBe(true);
  });
  it('every view with a module has a loading state, not a blank pane', () => {
    const views = [...host.matchAll(/\{activeView === '([a-z-]+)' && window\.AlloModules && window\.AlloModules\.([A-Za-z]+)/g)];
    expect(views.length).toBeGreaterThan(10);
    const map = /_ALLO_VIEW_MODULE_KEYS = (\{[^}]+\})/.exec(host)[1];
    for (const [, view, mod] of views) expect(map.includes(mod), view + ' -> ' + mod).toBe(true);
  });
  it('the Adventure panel stacks above AlloBot', () => {
    const z = (source, re) => Number(re.exec(source)[1]);
    // Inline, not a new z-[n] class: the built stylesheet may not contain a class it has not seen.
    const panel = z(readFileSync('adventure_offline_source.jsx', 'utf8'), /role="presentation" style=\{\{ zIndex: (\d+) \}\}/);
    const bot = z(readFileSync('allobot_source.jsx', 'utf8'), /className=\{`fixed z-\[(\d+)\] group/);
    expect(panel).toBeGreaterThan(bot);
  });
  it('AlloBot does not call itself an AI guide when no AI is usable', () => {
    const source = readFileSync('allobot_source.jsx', 'utf8');
    expect(source.includes("noAi ? 'sidebar.allobot_welcome_no_ai' : 'sidebar.ai_guide_welcome'")).toBe(true);
    expect(/I'm your AI|AI [Gg]uide/.test(JSON.parse(readFileSync('ui_strings.js', 'utf8')).sidebar.allobot_welcome_no_ai)).toBe(false);
  });
  it('Coping light-theme text colours reach 4.5:1 on white', () => {
    const source = readFileSync('sel_hub/sel_tool_coping.js', 'utf8');
    const map = /_cop_FGL = (\{[^}]+\})/.exec(source)[1];
    for (const [, from, to] of map.matchAll(/'(#[0-9a-f]+)':'(#[0-9a-f]+)'/g)) {
      const expand = to.length === 4 ? '#' + [...to.slice(1)].map((c) => c + c).join('') : to;
      if (from === '#94a3b8') continue;
      expect(contrast(expand, '#ffffff'), from + ' -> ' + to).toBeGreaterThanOrEqual(4.5);
    }
    for (const needed of ['#fed7aa', '#22c55e', '#14b8a6', '#ef4444', '#a855f7']) expect(map.includes("'" + needed + "'"), needed).toBe(true);
  });
});
