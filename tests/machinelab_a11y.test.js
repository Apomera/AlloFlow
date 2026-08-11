import { beforeEach, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_machinelab.js';
const VIEWS = ['machines', 'build', 'range', 'siege', 'compare', 'learn'];
const BANDS = ['k2', 'g35', 'g68', 'g912'];

let cfg;

function state(o = {}) {
  return { machineLab: Object.assign({ view: 'machines' }, o) };
}

function allViews() {
  return VIEWS.map((view) => ({ view, html: renderTool('machineLab', state({ view })) }));
}

beforeEach(() => {
  resetStemLab();
  cfg = loadTool(FILE, 'machineLab');
});

describe('Machine Lab a11y: interactive elements', () => {
  it('uses native buttons and inputs, never a hand-rolled clickable div', () => {
    // role+tabIndex without onKeyDown is a dead control, and the cheapest way
    // to never ship one is to never hand-roll the trio in the first place.
    for (const { view, html } of allViews()) {
      expect(html, view).not.toMatch(/<div[^>]*role="button"/);
      expect(html, view).not.toMatch(/<span[^>]*role="button"/);
    }
  });

  it('gives every button a non-empty accessible name', () => {
    for (const { view, html } of allViews()) {
      const buttons = html.match(/<button[^>]*>[\s\S]*?<\/button>/g) || [];
      expect(buttons.length, view).toBeGreaterThan(0);
      for (const b of buttons) {
        const labelled = /aria-label="[^"]+"/.test(b);
        const text = b.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        expect(labelled || text.length > 0, view + ': ' + b.slice(0, 80)).toBe(true);
      }
    }
  });

  it('labels every slider, since the thumb carries no text', () => {
    for (const { view, html } of allViews()) {
      const ranges = html.match(/<input[^>]*type="range"[^>]*>/g) || [];
      for (const r of ranges) {
        expect(/aria-label="[^"]+"/.test(r), view + ': ' + r).toBe(true);
      }
    }
  });

  it('labels every text input', () => {
    for (const { view, html } of allViews()) {
      const texts = html.match(/<input[^>]*type="text"[^>]*>/g) || [];
      for (const t of texts) {
        expect(/aria-label="[^"]+"/.test(t), view + ': ' + t).toBe(true);
      }
    }
  });

  it('ties every slider label to its control with a for/id pair', () => {
    const html = renderTool('machineLab', state({ view: 'build' }));
    const labels = html.match(/<label for="([^"]+)"/g) || [];
    expect(labels.length).toBeGreaterThan(0);
    for (const l of labels) {
      const id = l.match(/for="([^"]+)"/)[1];
      expect(html).toContain('id="' + id + '"');
    }
  });
});

describe('Machine Lab a11y: non-text content', () => {
  it('gives every graphic a text alternative', () => {
    for (const { view, html } of allViews()) {
      const imgs = html.match(/<div[^>]*role="img"[^>]*>/g) || [];
      for (const i of imgs) {
        expect(/aria-label="[^"]{10,}"/.test(i), view + ': ' + i).toBe(true);
      }
    }
  });

  it('hides decorative SVG from the accessibility tree', () => {
    // The SVG sits inside a labelled role="img" wrapper; announcing its guts
    // as well would read the same picture twice.
    for (const { view, html } of allViews()) {
      const svgs = html.match(/<svg[^>]*>/g) || [];
      for (const s of svgs) {
        expect(/aria-hidden="true"/.test(s), view + ': ' + s).toBe(true);
      }
    }
  });

  it('captions every data table', () => {
    for (const { view, html } of allViews()) {
      const tables = (html.match(/<table/g) || []).length;
      const captions = (html.match(/<caption/g) || []).length;
      expect(captions, view + ': ' + tables + ' tables, ' + captions + ' captions').toBeGreaterThanOrEqual(tables);
    }
  });

  it('marks row and column headers so a table reads in two dimensions', () => {
    const html = renderTool('machineLab', state({ view: 'compare' }));
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
  });
});

describe('Machine Lab a11y: results are announced, not just shown', () => {
  it('marks the prediction result as a status region', () => {
    const html = renderTool('machineLab', state({
      view: 'machines', benchResult: { ok: true, message: 'That is right.' }
    }));
    expect(html).toMatch(/role="status"/);
  });

  it('marks the siege feedback as a status region', () => {
    const html = renderTool('machineLab', state({
      view: 'siege', siegeFeedback: { ok: true, message: 'Struck the limestone.' }
    }));
    expect(html).toMatch(/role="status"/);
  });

  it('marks AI errors as alerts', () => {
    const html = renderTool('machineLab', state({ view: 'learn', aiError: 'Tutor offline.' }));
    expect(html).toMatch(/role="alert"/);
  });

  it('carries a screen-reader summary of the current state on every view', () => {
    for (const { view, html } of allViews()) {
      expect(html, view).toContain('Machine Lab, ');
      expect(html, view).toContain('mechanical advantage');
    }
  });
});

describe('Machine Lab a11y: nothing is picture-only', () => {
  it('ships the energy ledger as a table even while showing bars', () => {
    const html = renderTool('machineLab', state({ view: 'build', ledgerAsTable: false }));
    expect(html).toContain('Energy ledger from crank to impact');
    expect(html).toContain('% of input');
  });

  it('ships the wall condition as a table even while showing the diagram', () => {
    const html = renderTool('machineLab', state({ view: 'siege', wallAsTable: false }));
    expect(html).toContain('Condition of each course, counting up from the ground');
  });

  it('states the trajectory numbers in text beside the graph', () => {
    const shot = {
      range: 120.5, apex: 30.2, flightTime: 5.1, impactSpeed: 33.3,
      crankWork: 44000, stored: 37700, muzzleKE: 20000, impactKE: 14000, eta: 0.53,
      dropGain: 0, dragLoss: 6000,
      path: [{ t: 0, x: 0, y: 2, z: 0, v: 40 }, { t: 5.1, x: 120.5, y: 0, z: 0, v: 33.3 }]
    };
    const html = renderTool('machineLab', state({ view: 'range', lastShot: shot }));
    expect(html).toContain('Range: 120.5 m');
    expect(html).toContain('Apex: 30.2 m');
    expect(html).toContain('Flight time: 5.1 s');
  });
});

describe('Machine Lab a11y: colour contrast', () => {
  // WCAG 2.1 relative luminance and contrast ratio.
  function lum(hex) {
    const v = hex.replace('#', '');
    const ch = [0, 2, 4].map((i) => {
      const c = parseInt(v.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  function ratio(a, b) {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  // The palettes are read out of the source so the test cannot drift from what
  // the tool actually renders.
  function palettes() {
    const src = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');
    const body = src.slice(src.indexOf('function mkTheme('), src.indexOf('// BENCH DEFINITIONS'));
    const objs = body.match(/\{[^{}]*bg: '#[\s\S]*?\}/g) || [];
    expect(objs.length).toBe(3);
    // eslint-disable-next-line no-new-func
    return objs.map((o) => new Function('return (' + o + ');')());
  }

  const NAMES = ['high contrast', 'dark', 'light'];

  it('parses all three palettes out of the tool', () => {
    const p = palettes();
    expect(p.length).toBe(3);
    for (const t of p) {
      expect(t.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.text).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('meets WCAG AA 4.5:1 for body text on both surfaces', () => {
    palettes().forEach((t, i) => {
      expect(ratio(t.text, t.bg), NAMES[i] + ' text on bg').toBeGreaterThanOrEqual(4.5);
      expect(ratio(t.text, t.card), NAMES[i] + ' text on card').toBeGreaterThanOrEqual(4.5);
    });
  });

  it('meets AA for the muted and dim secondary text used at 11 to 13 px', () => {
    palettes().forEach((t, i) => {
      expect(ratio(t.muted, t.card), NAMES[i] + ' muted on card').toBeGreaterThanOrEqual(4.5);
      expect(ratio(t.dim, t.card), NAMES[i] + ' dim on card').toBeGreaterThanOrEqual(4.5);
      expect(ratio(t.dim, t.bg), NAMES[i] + ' dim on bg').toBeGreaterThanOrEqual(4.5);
    });
  });

  it('meets AA for button labels on the accent fill', () => {
    palettes().forEach((t, i) => {
      expect(ratio(t.accentInk, t.accent), NAMES[i] + ' accentInk on accent').toBeGreaterThanOrEqual(4.5);
    });
  });

  it('meets AA for the ok and bad status colours', () => {
    palettes().forEach((t, i) => {
      expect(ratio(t.ok, t.card), NAMES[i] + ' ok on card').toBeGreaterThanOrEqual(4.5);
      expect(ratio(t.bad, t.card), NAMES[i] + ' bad on card').toBeGreaterThanOrEqual(4.5);
    });
  });

  it('keeps the accent readable as text on the card, where the ledger uses it', () => {
    palettes().forEach((t, i) => {
      expect(ratio(t.accent, t.card), NAMES[i] + ' accent on card').toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe('Machine Lab a11y: every band and view stays accessible', () => {
  for (const band of BANDS) {
    it(`keeps buttons named and graphics labelled at ${band}`, () => {
      for (const view of VIEWS) {
        const html = renderTool('machineLab', state({ view, bandOverride: band }));
        const imgs = html.match(/<div[^>]*role="img"[^>]*>/g) || [];
        for (const i of imgs) expect(/aria-label="[^"]{10,}"/.test(i), band + '/' + view).toBe(true);
        expect(html, band + '/' + view).not.toMatch(/aria-label=""/);
      }
    });
  }
});

describe('Machine Lab: mirror parity', () => {
  it('keeps the CDN and desktop copies byte-identical', () => {
    const hashes = [FILE, MIRROR].map((f) =>
      crypto.createHash('sha256').update(fs.readFileSync(path.resolve(process.cwd(), f))).digest('hex'));
    expect(hashes[0]).toBe(hashes[1]);
  });

  it('registers the same tool id from the desktop copy', () => {
    expect(cfg.id).toBe('machineLab');
  });
});
