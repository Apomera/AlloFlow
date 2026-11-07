// Contrast theme: Universe pinned pale surfaces (--uni-panel:#fff and friends), so the host's forced yellow
// ink measured about 1:1 on 126 buttons and 1,263 other text runs across the tool (2026-11-05 browser walk).
// The fix is the tool's own dark palette plus one scoped <style>. Pixel readings live in a browser probe; this
// file pins what produces them.
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SCOPE = '.theme-contrast [data-stem-tool-shell="universe"]';
// UNIVERSE_HC_FILE=<path> runs against another copy, to show a failure on an old file.
const FILE = process.env.UNIVERSE_HC_FILE || 'stem_lab/stem_tool_universe.js';

function sheetText() {
  const el = document.getElementById('allo-universe-hc-extra-css');
  return el ? el.textContent : '';
}
function rules() {
  return sheetText().replace(/^@media screen\{/, '').replace(/\}$/, '').split('}').map((r) => r.trim()).filter(Boolean).map((r) => {
    const i = r.indexOf('{');
    return { sel: r.slice(0, i), body: r.slice(i + 1) };
  });
}
function ruleFor(needle) {
  return rules().find((r) => r.sel.includes(needle));
}

beforeEach(() => {
  const old = document.getElementById('allo-universe-hc-extra-css');
  if (old) old.remove();
  resetStemLab();
  loadTool(FILE, 'universe');
});

describe('Universe in the contrast theme', () => {
  it('draws with its own dark palette, whatever the saved toggle says', () => {
    for (const saved of [undefined, false, true]) {
      const html = renderTool('universe', { universe: { tutorialDismissed: true, isDark: saved } }, { isContrast: true });
      expect(html.includes('data-uni-theme="dark"'), 'saved isDark=' + saved).toBe(true);
    }
  });

  it('offers no appearance toggle that could not do anything', () => {
    const html = renderTool('universe', { universe: { tutorialDismissed: true } }, { isContrast: true });
    expect(html.includes('Light appearance')).toBe(false);
    expect(html.includes('Dark appearance')).toBe(false);
    expect(html.includes(' Dark Mode')).toBe(false);
  });

  it('leaves light and dark as they were', () => {
    const light = renderTool('universe', { universe: { tutorialDismissed: true } });
    expect(light.includes('data-uni-theme="light"')).toBe(true);
    expect(light.includes('Dark appearance')).toBe(true);
    expect(light.includes(' Dark Mode')).toBe(true);
    const dark = renderTool('universe', { universe: { tutorialDismissed: true, isDark: true } });
    expect(dark.includes('data-uni-theme="dark"')).toBe(true);
    expect(dark.includes('Light appearance')).toBe(true);
  });

  it('keeps every rule of its sheet under the contrast scope', () => {
    // Screen only, like the host's contrast rules: on paper yellow ink would be the unreadable one.
    expect(sheetText().startsWith('@media screen{')).toBe(true);
    const all = rules();
    expect(all.length).toBeGreaterThan(5);
    for (const r of all) {
      for (const part of r.sel.split(/,(?![^(]*\))/)) {
        expect(part.trim().startsWith(SCOPE), part).toBe(true);
      }
    }
  });

  it('sets every surface variable to black, and ink and edge to yellow', () => {
    const root = rules().find((r) => r.sel.trim() === SCOPE + ' [data-universe-tool]');
    expect(root).toBeTruthy();
    for (const v of ['--uni-page', '--uni-panel', '--uni-soft', '--uni-accent-soft', '--uni-surface', '--uni-chip']) {
      expect(root.body.includes(v + ':#000'), v).toBe(true);
    }
    for (const v of ['--uni-ink', '--uni-muted', '--uni-accent', '--uni-edge']) {
      expect(root.body.includes(v + ':#ffff00'), v).toBe(true);
    }
  });

  it('gives chips with a bright fill black ink, and the star-class disc a black fill', () => {
    expect(ruleFor('.uni-element-symbol').body).toContain('color:#000!important');
    expect(ruleFor('.inline-block.px-2.py-1.rounded-full.mb-2').body).toContain('color:#000!important');
    expect(ruleFor('.w-12.h-12.rounded-full').body).toContain('background:#000!important');
  });

  // The pie labels are safe because they are drawn black, on every theme, and the host leaves SVG fill alone
  // (browser reading in the real wrapper, 2026-11-05: rgb(0,0,0) with or without any rule). So: pin the drawn
  // colour against each slice, and keep the sheet free of a rule that would look like protection and match nothing.
  it('draws the composition pie labels black, which clears 4.5:1 on all five slices', () => {
    const html = renderTool('universe', { universe: { tutorialDismissed: true, showDark: true } }, { isContrast: true });
    const box = document.createElement('div');
    box.innerHTML = html;
    const donut = box.querySelector('.uni-donut svg');
    expect(donut, 'the composition chart did not render').toBeTruthy();
    const slices = [...donut.querySelectorAll('g > path')].map((p) => p.getAttribute('stroke'));
    expect(slices.length).toBe(5);
    const labels = [...donut.querySelectorAll('g > text')];
    expect(labels.length).toBeGreaterThanOrEqual(4);
    for (const label of labels) expect(label.getAttribute('fill'), label.textContent).toBe('#000000');
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255); };
    for (const s of slices) expect((lum(s) + 0.05) / 0.05, s).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps no sheet rule that targets an SVG text colour nothing draws', () => {
    expect(sheetText().includes('text[fill=')).toBe(false);
    // #0b1220 is still the panel behind these charts and the casing round some labels, never a text fill.
    const src = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');
    const textFills = [...src.matchAll(/h\('text', \{[^}]*?[{,\s]fill: '#0b1220'/gi)].map((m) => m[0]);
    expect(textFills).toEqual([]);
  });

  it('restores a readable hover: the tool hover backgrounds would otherwise give black on black', () => {
    const hover = ruleFor('button:hover:not(:disabled)');
    expect(hover.body).toContain('background-color:#00ff00!important');
    expect(hover.body).toContain('color:#000!important');
    expect(ruleFor('button:hover:not(:disabled) .uni-topic-icon').body).toContain('background:transparent!important');
  });

  it('does not let flattening erase selected, right or wrong', () => {
    expect(ruleFor('button[aria-pressed=true]').body).toContain('box-shadow:inset');
    expect(ruleFor('button[aria-expanded=true]').body).toContain('box-shadow:inset');
    expect(ruleFor('button[data-result=right]::after').body).toContain('content:" \\2713"');
    // data-result=fits already carries the tool's own ::before tick in every theme; a second one would read twice.
    expect(ruleFor('button[data-result=fits]::after')).toBeUndefined();
    expect(ruleFor('button[data-result=wrong]::after').body).toContain('content:" \\2717"');
    expect(ruleFor('button[data-result=miss]::after').body).toContain('content:" \\2717"');
  });

  it('adds the sheet once, however often the file loads', () => {
    loadTool(FILE, 'universe');
    expect(document.querySelectorAll('#allo-universe-hc-extra-css').length).toBe(1);
  });
});
