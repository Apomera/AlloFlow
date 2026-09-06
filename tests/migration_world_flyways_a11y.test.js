import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, beforeAll } from 'vitest';

// The World Flyways tab, plus the two accessibility checks that caught real
// failures here and that no linter in this repo runs for you:
//  - WCAG 2.5.3 Label in Name. axe's label-content-name-mismatch is an
//    EXPERIMENTAL rule, so it is off by default and never fires. 16 controls
//    were failing it.
//  - Accessible names that never went through t(). 66 of them shipped in
//    English to every locale.
const require_ = createRequire(import.meta.url);
const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_migration.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_migration.js');
const webapp = path.join(process.cwd(), 'desktop/web-app', 'node_modules');

const TABS = ['flight3d', 'vformation', 'wind', 'routes', 'world', 'aero', 'navigate', 'inquiry'];
const MARK = '«';

let React;
let renderToStaticMarkup;
let tool;

beforeAll(() => {
  React = require_(path.join(webapp, 'react'));
  renderToStaticMarkup = require_(path.join(webapp, 'react-dom/server')).renderToStaticMarkup;
  require_(sourcePath);
  tool = window.StemLab._registry.migration;
});

function render(tab, opts = {}) {
  const store = { migration: Object.assign({ tab }, opts.state || {}) };
  const ctx = {
    React,
    toolData: store,
    update: () => {},
    updateMulti: () => {},
    addToast: () => {},
    announceToSR: () => {},
    t: opts.mark ? (k, fb) => MARK + (fb == null ? k : fb) : (k, fb) => (fb == null ? k : fb),
    isDark: opts.isDark !== false,
    setStemLabTool: () => {},
    awardXP: () => {}
  };
  return renderToStaticMarkup(React.createElement(() => tool.render(ctx)));
}

function parse(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}
const norm = (s) => (s || '').replace(/[\s ]+/g, ' ').replace(/[^\w\s]/g, '').trim().toLowerCase();

describe('Migration Lab world flyways', () => {
  it('shows all eight global flyways and nine migrants', () => {
    const html = render('world');
    for (const name of ['Pacific Americas', 'Mississippi Americas', 'Atlantic Americas', 'East Atlantic',
      'Mediterranean / Black Sea', 'West Asian / East African', 'Central Asian', 'East Asian / Australasian']) {
      expect(html, name).toContain(name);
    }
    for (const name of ['Arctic Tern', 'Bar-tailed Godwit', 'Monarch Butterfly', 'Globe Skimmer Dragonfly',
      'Humpback Whale', 'Porcupine Caribou', 'Sockeye Salmon', 'European Eel', 'Leatherback Turtle']) {
      expect(html, name).toContain(name);
    }
  });

  it('covers taxa beyond birds', () => {
    const html = render('world');
    for (const kind of ['insect', 'mammal', 'fish', 'reptile']) expect(html).toContain('>' + kind + '<');
  });

  it('lifts the pen at the antimeridian instead of drawing back across the world', () => {
    // The leatherback runs Indonesia to California and the godwit Alaska to New
    // Zealand; both cross 180. Drawn straight through, each would read as a
    // journey the long way round over Europe.
    for (const id of ['leatherback', 'bartailed_godwit_world']) {
      const el = parse(render('world', { state: { worldMigrant: id } }));
      const route = Array.from(el.querySelectorAll('path')).find((p) => (p.getAttribute('stroke-dasharray') || '') === '7 4');
      expect(route, id).toBeTruthy();
      // A second M command is the pen lift; without it the path is one run.
      expect((route.getAttribute('d').match(/M/g) || []).length, id).toBeGreaterThan(1);
    }
  });

  it('keeps a route that does not cross the seam in one stroke', () => {
    const el = parse(render('world', { state: { worldMigrant: 'monarch_world' } }));
    const route = Array.from(el.querySelectorAll('path')).find((p) => (p.getAttribute('stroke-dasharray') || '') === '7 4');
    expect((route.getAttribute('d').match(/M/g) || []).length).toBe(1);
  });

  it('draws the basemap with an even-odd fill so enclosed seas are water', () => {
    const el = parse(render('world'));
    const land = Array.from(el.querySelectorAll('path')).find((p) => p.getAttribute('fill-rule') === 'evenodd');
    expect(land).toBeTruthy();
    expect(land.getAttribute('d').length).toBeGreaterThan(4000);
  });

  it('uses a different line palette per theme', () => {
    // One palette cannot clear 3:1 on both a dark ocean and pale land. Each
    // entry carries a variant per theme; this checks the accessor actually
    // picks a different one rather than silently falling back.
    const dark = parse(render('world', { state: { worldFlyway: 'central_asian' }, isDark: true }));
    const light = parse(render('world', { state: { worldFlyway: 'central_asian' }, isDark: false }));
    const strokeOf = (el) => Array.from(el.querySelectorAll('path'))
      .map((p) => p.getAttribute('stroke')).filter(Boolean).join(',');
    expect(strokeOf(dark)).not.toBe(strokeOf(light));
  });

  it('names the map and points at the text alternative', () => {
    const el = parse(render('world'));
    const svg = el.querySelector('svg[role="img"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('aria-label')).toContain('same information as text');
  });
});

describe('Migration Lab accessible names', () => {
  it('has no Label-in-Name mismatches on any tab (WCAG 2.5.3)', () => {
    const bad = [];
    for (const tab of TABS) {
      for (const el of parse(render(tab)).querySelectorAll('button, [role="button"], a[href]')) {
        const visible = norm(el.textContent);
        const label = el.getAttribute('aria-label');
        if (visible && label && !norm(label).includes(visible)) {
          bad.push(tab + ': "' + el.textContent.trim().slice(0, 40) + '" not in "' + label.slice(0, 50) + '"');
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('gives every control an accessible name', () => {
    const bad = [];
    for (const tab of TABS) {
      for (const el of parse(render(tab)).querySelectorAll('button, [role="button"], a[href]')) {
        if (!norm(el.textContent) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
          bad.push(tab + ': ' + el.outerHTML.slice(0, 60));
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('passes every accessible name through the translator', () => {
    const bad = [];
    for (const tab of TABS) {
      for (const el of parse(render(tab, { mark: true })).querySelectorAll('[aria-label]')) {
        const label = el.getAttribute('aria-label');
        if (label && label.indexOf(MARK) === -1 && /[a-z]{4}/i.test(label)) bad.push(tab + ': ' + label.slice(0, 70));
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});

describe('Migration Lab map colour contrast', () => {
  // WCAG 1.4.11 for the lines on the map, 1.4.3 for the same colours used as
  // bold label text on a card. All 17 failed at least one of these before.
  const GROUND = {
    dark: { land: '#1f5f43', ocean: '#0b2a3d', card: '#1e293b' },
    light: { land: '#bbe7cd', ocean: '#dbeafe', card: '#f8fafc' }
  };
  const lum = (hex) => {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const ratio = (a, b) => {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  it('clears 3:1 on both map fills and 4.5:1 as card text, in both themes', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    const rx = /\{ id: '([a-z_]+)',[^\n]*?color: '(#[0-9a-f]{6})', colorLight: '(#[0-9a-f]{6})',/g;
    const rows = [];
    let m;
    while ((m = rx.exec(src))) rows.push({ name: m[1], dark: m[2], light: m[3] });
    expect(rows.length).toBe(17);

    const bad = [];
    for (const r of rows) {
      const checks = [
        ['dark land', ratio(r.dark, GROUND.dark.land), 3],
        ['dark ocean', ratio(r.dark, GROUND.dark.ocean), 3],
        ['dark card text', ratio(r.dark, GROUND.dark.card), 4.5],
        ['light land', ratio(r.light, GROUND.light.land), 3],
        ['light ocean', ratio(r.light, GROUND.light.ocean), 3],
        ['light card text', ratio(r.light, GROUND.light.card), 4.5]
      ];
      for (const [where, got, need] of checks) {
        if (got < need) bad.push(r.name + ' on ' + where + ': ' + got.toFixed(2) + ' < ' + need);
      }
    }
    expect(bad).toEqual([]);
  });
});
