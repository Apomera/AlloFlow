import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

// WCAG 1.4.3: the Tilt + Seasons workbench paints itself dark (bg-slate-950)
// when ctx.isDark, but its muted-ink rule only switched to light ink under a
// `.dark` ancestor, which the app's dark theme does not set. The "45° N/S"
// labels and the model note rendered #475569 on #020617 (2.66:1).
// The tool's own workbench CSS strings are cascaded in Chromium against a
// minimal Tailwind palette. SOLAR_SEASONS_INK_SRC points at another copy
// (the pre-fix copy must go red).

const FILE = process.env.SOLAR_SEASONS_INK_SRC || 'stem_lab/stem_tool_solarsystem.js';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');
// Single-quoted CSS strings in the tool's style array that set muted workbench ink.
const RULES = (SRC.match(/'[^'\n]*\.solar-seasons-workbench[^'\n]*\.text-slate-4[^'\n]*'/g) || []).map(s => s.slice(1, -1));
const TAILWIND = '.text-slate-400{color:#94a3b8}.text-slate-500{color:#64748b}.bg-slate-950{background-color:#020617}.bg-white{background-color:#fff}';

function workbench(paint, label) {
  return '<section data-case="' + label + '" class="solar-seasons-workbench ' + paint + '">' +
    '<div data-season-hemisphere="north"><span class="text-[0.625rem] font-bold text-slate-400">45° N</span></div>' +
    '<p role="note" class="border-dashed text-slate-400">Model boundary</p>' +
    '<span class="text-slate-500">muted</span></section>';
}
const PAGE = '<!doctype html><html><head><style>' + TAILWIND + '</style><style>' + RULES.join('') + '</style></head><body>' +
  // App dark theme: the tool paints dark from ctx.isDark; no `.dark` ancestor.
  '<div class="theme-dark"><div class="solar-cosmos">' + workbench('bg-slate-950', 'app-dark') + '</div></div>' +
  '<div class="dark"><div class="solar-cosmos">' + workbench('bg-slate-950', 'dark-class') + '</div></div>' +
  '<div><div class="solar-cosmos">' + workbench('bg-white', 'light') + '</div></div>' +
  '</body></html>';

let browser, page;
beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.setContent(PAGE);
}, 60000);
afterAll(async () => { await browser?.close(); });

describe('Solar System Tilt + Seasons muted ink contrast (WCAG 1.4.3)', () => {
  it('finds the workbench muted-ink rules in the tool source', () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  it.each(['app-dark', 'dark-class', 'light'])('muted labels reach 4.5:1 on the %s workbench', async label => {
    const ratios = await page.evaluate(caseLabel => {
      const parse = c => c.match(/[\d.]+/g).slice(0, 3).map(Number);
      const lum = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const section = document.querySelector('[data-case="' + caseLabel + '"]');
      const bg = lum(parse(getComputedStyle(section).backgroundColor));
      return [...section.querySelectorAll('.text-slate-400,.text-slate-500')].map(el => {
        const fg = lum(parse(getComputedStyle(el).color));
        return { text: el.textContent, color: getComputedStyle(el).color, ratio: Math.round(((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)) * 100) / 100 };
      });
    }, label);
    expect(ratios).toHaveLength(3);
    const failing = ratios.filter(r => r.ratio < 4.5);
    expect(failing, JSON.stringify(failing)).toEqual([]);
  });
});
