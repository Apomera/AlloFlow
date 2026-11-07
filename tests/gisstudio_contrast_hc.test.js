// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Contrast theme: Leaflet's attribution strip is translucent white and the host forces its ink yellow (1.0-1.4:1).
// Attribution is a licence requirement, so it must stay visible and readable, not be hidden or restyled away.
const DIR = process.env.GISSTUDIO_HC_DIR || path.join(process.cwd(), 'stem_lab');
const src = fs.readFileSync(path.join(DIR, 'stem_tool_gisstudio.js'), 'utf8');
const m = /st\.id = 'allo-gisstudio-hc-extra-css';\s*st\.textContent = ("(?:[^"\\]|\\.)*");/.exec(src);
const css = m ? JSON.parse(m[1]) : '';
const scope = '.theme-contrast [data-stem-tool-shell="gisStudio"]';

const rules = css.split('}').filter(Boolean).map((r) => { const [sel, body] = r.split('{'); return { sel, body }; });
function bodyFor(el) { return rules.filter((r) => el.matches(r.sel)).map((r) => r.body).join(';'); }
function mount(inner) {
  document.body.innerHTML = `<div class="theme-contrast"><div data-stem-tool-shell="gisStudio">${inner}</div></div>`;
  return document.body.querySelector('[data-stem-tool-shell]').firstElementChild;
}

describe('GIS Studio contrast theme: map attribution', () => {
  it('has its own block, scoped to the shell', () => {
    expect(m, 'allo-gisstudio-hc-extra-css is missing').not.toBeNull();
    for (const r of rules) expect(r.sel.startsWith(scope), r.sel).toBe(true);
  });
  it('puts the attribution strip on opaque black with yellow ink', () => {
    const strip = mount('<div class="leaflet-control-attribution leaflet-control"><a href="https://leafletjs.com">Leaflet</a> OpenStreetMap contributors</div>');
    const body = bodyFor(strip);
    expect(body).toContain('background:#000!important');
    expect(body).toContain('color:#ff0!important');
  });
  it('keeps the attribution links readable and marked as links', () => {
    const strip = mount('<div class="leaflet-control-attribution leaflet-control"><a href="https://leafletjs.com">Leaflet</a></div>');
    const body = bodyFor(strip.querySelector('a'));
    expect(body).toContain('color:#ff0!important');
    expect(body).toContain('text-decoration:underline!important');
  });
  it('never hides the attribution', () => {
    expect(/leaflet-control-attribution[^{]*\{[^}]*(display:\s*none|visibility:\s*hidden|opacity:\s*0)/.test(css)).toBe(false);
  });
  it('flattens the composer claim callout (yellow on #fff7ed read 1.01:1), keeping its amber edge', () => {
    const box = mount('<div style="margin-top: 10px; border-left: 4px solid rgb(217, 119, 6); background: rgb(255, 247, 237);">Takeaway:</div>');
    expect(bodyFor(box)).toContain('background:#000!important');
    expect(bodyFor(box).includes('border')).toBe(false);
  });
  it('does not touch the attribution outside the contrast theme', () => {
    document.body.innerHTML = '<div data-stem-tool-shell="gisStudio"><div id="x" class="leaflet-control-attribution"></div></div>';
    expect(bodyFor(document.getElementById('x'))).toBe('');
  });
});
