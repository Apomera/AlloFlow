// The STEM tool shell must never make a tool's own text unreadable.
//
// renderTool() wraps every tool in a themed shell. That shell's background was
// also the SURFACE tool content painted on, and tools are authored for a light
// substrate: Tailwind dark-text utilities plus their own white/50-tint panels.
// Any text that did NOT sit on one of those panels inherited the shell, so in
// .theme-dark it became dark-on-dark. Measured across eight tools, 32 elements
// failed that way — the worst were tool titles at 1.0-1.2:1 — extrapolating to
// 400+ across the ~132 registered tools.
//
// Fix: in the dark theme the themed canvas stays as the page BACKDROP and tool
// content renders on its own light card. One change, every tool, including ones
// added later.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const HOST = 'stem_lab/stem_lab_module.js';

/**
 * Load the REAL host module so renderTool (and its shell) is exercised.
 * The host installs itself only `if (!window.StemLab)`, so the smoke harness's
 * stub registry — which has its own shell-less renderTool — has to be cleared
 * first or this silently tests the stub instead of the real thing.
 */
function loadHost() {
  delete window.StemLab;
  delete globalThis.StemLab;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(HOST, 'utf8'))();
  if (!window.StemLab || typeof window.StemLab.renderTool !== 'function') {
    throw new Error('host module did not install its registry');
  }
  return window.StemLab;
}

function renderThroughHost(toolId, toolData, theme) {
  const ctx = makeCtx({ toolData, theme });
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(() => window.StemLab.renderTool(toolId, ctx))
  );
}

/** Resolve each text element's effective background by walking ancestors. */
const TW = { white: '#ffffff', black: '#000000' };
[['slate', 'f8fafc,f1f5f9,e2e8f0,cbd5e1,94a3b8,64748b,475569,334155,1e293b,0f172a'],
 ['orange', 'fff7ed,ffedd5,fed7aa,fdba74,fb923c,f97316,ea580c,c2410c,9a3412,7c2d12'],
 ['violet', 'f5f3ff,ede9fe,ddd6fe,c4b5fd,a78bfa,8b5cf6,7c3aed,6d28d9,5b21b6,4c1d95'],
 ['sky', 'f0f9ff,e0f2fe,bae6fd,7dd3fc,38bdf8,0ea5e9,0284c7,0369a1,075985,0c4a6e'],
 ['amber', 'fffbeb,fef3c7,fde68a,fcd34d,fbbf24,f59e0b,d97706,b45309,92400e,78350f'],
].forEach(([n, list]) => list.split(',').forEach((h, i) => {
  TW[n + '-' + [50, 100, 200, 300, 400, 500, 600, 700, 800, 900][i]] = '#' + h;
}));

const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

function bgOf(el) {
  const cls = el.getAttribute('class') || '';
  const style = el.getAttribute('style') || '';
  const im = /background(?:-color)?:\s*(#[0-9a-fA-F]{6})/.exec(style);
  if (im) return im[1];
  if (/bg-gradient/.test(cls)) {
    const g = /(?:^|\s)from-([a-z]+-\d{2,3}|white|black)(?=\s|$)/.exec(cls);
    if (g && TW[g[1]]) return TW[g[1]];
  }
  const m = /(?:^|\s)bg-([a-z]+-\d{2,3}|white|black)(?:\/\d+)?(?=\s|$)/.exec(cls);
  return m ? TW[m[1]] || null : null;
}
function fgOf(el) {
  const m = /(?:^|\s)text-([a-z]+-\d{2,3}|white|black)(?=\s|$)/.exec(el.getAttribute('class') || '');
  return m ? TW[m[1]] || null : null;
}

function failures(markup, shellHex) {
  const doc = new JSDOM('<div id="r">' + markup + '</div>').window.document;
  const out = [];
  const walk = (el, bg) => {
    const next = bgOf(el) || bg;
    const fg = fgOf(el);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (fg && hasText) {
      const r = contrast(fg, next);
      if (r < 4.5) out.push({ r: +r.toFixed(2), fg, bg: next, text: el.textContent.trim().slice(0, 40) });
    }
    [...el.children].forEach((c) => walk(c, next));
  };
  [...doc.getElementById('r').children].forEach((c) => walk(c, shellHex));
  return out;
}

// ONCE, not per test: the host module guards its own side effects (it bails
// early on a second evaluation once its style tag exists), so re-loading it in
// a beforeEach silently leaves no registry behind.
beforeAll(() => {
  resetStemLab();
  loadHost();
  loadTool('stem_lab/stem_tool_rocks.js', 'rocks');
});

describe('STEM tool shell — dark theme surface', () => {
  it('gives dark-theme tool content its own light surface', () => {
    const markup = renderThroughHost('rocks', { rocks: { mode: 'rocks' }, rockCycle: {} }, 'dark');
    expect(markup).toContain('data-stem-tool-surface');
    expect(markup).toContain('background:#ffffff');
  });

  it('leaves the light theme exactly as it was — no extra surface', () => {
    const markup = renderThroughHost('rocks', { rocks: { mode: 'rocks' }, rockCycle: {} }, 'light');
    expect(markup).not.toContain('data-stem-tool-surface');
  });

  it('leaves the contrast theme on its own black palette', () => {
    // That theme's whole point is maximum separation and its palette is built
    // for it; a light card would fight it.
    const markup = renderThroughHost('rocks', { rocks: { mode: 'rocks' }, rockCycle: {} }, 'contrast');
    expect(markup).not.toContain('data-stem-tool-surface');
  });

  it('makes dark theme no worse than light for tool text', () => {
    // The regression this exists to prevent: the shell degrading a tool's own
    // contrast purely because of the theme.
    [['rocks', { rocks: { mode: 'rocks', selectedRock: 'granite' }, rockCycle: {} }],
     ['rockCycle', { rocks: {}, rockCycle: {} }]].forEach(([id, data]) => {
      const dark = failures(renderThroughHost(id, data, 'dark'), '#0f172a');
      const light = failures(renderThroughHost(id, data, 'light'), '#ffffff');
      expect(dark.length, `${id}: dark ${dark.length} vs light ${light.length}\n` +
        dark.slice(0, 4).map((f) => `  ${f.r}:1 ${f.fg} on ${f.bg} "${f.text}"`).join('\n')
      ).toBeLessThanOrEqual(light.length);
    });
  });

  it('still honours lightBackground opt-out', () => {
    // Printable/artifact tools that genuinely need a white page must not get
    // wrapped at all.
    const reg = window.StemLab._registry;
    reg.__probe = {
      id: '__probe', label: 'Probe', lightBackground: true,
      render: (c) => c.React.createElement('div', { className: 'text-slate-800' }, 'plain'),
    };
    const ctx = makeCtx({ toolData: {}, theme: 'dark' });
    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(() => window.StemLab.renderTool('__probe', ctx))
    );
    expect(markup).not.toContain('data-stem-tool-shell');
    expect(markup).not.toContain('data-stem-tool-surface');
  });
});
