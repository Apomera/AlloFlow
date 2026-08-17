import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * X2 (wave 3): dark-mode printing stays light — the CLASS fix, pinned e2e.
 *
 * W2's 7b found the crossword printing near-black from dark mode; the fix
 * landed at the GENERATOR level (gen_docsuite_theme v4 emits inside
 * @media screen, plus 129 handwritten .theme-* rules screen-scoped), so this
 * spec pins the rule, not one tool: a crossword letter square AND a plain
 * docsuite .section card must compute white-ish backgrounds and dark text
 * under print emulation with the app theme dark — against the SHIPPED CSS and
 * the REAL built games module, reproducing the app's real nesting
 * (<div class="theme-dark"> ... <main class="allo-docsuite">).
 *
 * Self-contained page (no live-shell boot): the assertion is about CSS the
 * repo ships, so page.setContent with the shipped stylesheet is the honest
 * fixture and immune to CDN weather.
 */

test.describe.configure({ timeout: 120000 });

const ROOT = process.cwd();
const cssFile = readdirSync(`${ROOT}/app/static/css`).find((f) => /^main\..*\.css$/.test(f))!;
const SHIPPED_CSS = readFileSync(`${ROOT}/app/static/css/${cssFile}`, 'utf8');

function styleBlocks(): { remap: string; other: string } {
  const src = readFileSync(`${ROOT}/app_styles_source.jsx`, 'utf8');
  const open = '<style data-docsuite-theme="v1">{`';
  const s = src.indexOf(open);
  const remap = src.slice(s + open.length, src.indexOf('`}</style>', s));
  const out: string[] = [];
  const re = /<style(?: [^>]*)?>\{`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m[0].includes('data-docsuite-theme')) continue;
    const b = m.index + m[0].length;
    out.push(src.slice(b, src.indexOf('`}</style>', b)));
  }
  return { remap, other: out.join('\n') };
}

const GAMES = readFileSync(`${ROOT}/games_module.js`, 'utf8');
const REACT = readFileSync(`${ROOT}/desktop/web-app/node_modules/react/umd/react.development.js`, 'utf8');
const REACT_DOM = readFileSync(`${ROOT}/desktop/web-app/node_modules/react-dom/umd/react-dom.development.js`, 'utf8');

const DATA = [
  { term: 'photosynthesis', def: 'How a plant makes food from sunlight.' },
  { term: 'chlorophyll', def: 'The green colour inside a leaf.' },
  { term: 'stomata', def: 'Tiny holes on a leaf.' },
  { term: 'glucose', def: 'The sugar a plant makes.' },
  { term: 'oxygen', def: 'The gas a plant gives off.' },
  { term: 'root', def: 'The part that takes in water.' },
  { term: 'leaf', def: 'The flat green part.' },
  { term: 'water', def: 'What roots pull up.' },
];

function pageHtml(): string {
  const { remap, other } = styleBlocks();
  return `<!doctype html><html><head><meta charset="utf-8">
<style>${SHIPPED_CSS}</style><style>${other}</style><style>${remap}</style>
</head><body style="margin:0">
<div class="theme-dark"><main class="allo-docsuite theme-dark">
  <div class="section" data-x2="section"><h2>Plain card</h2><p>Docsuite body text.</p></div>
  <div id="mount"></div>
</main></div>
<script>${REACT}</script><script>${REACT_DOM}</script>
<script>
  window.__err = [];
  window.addEventListener('error', e => window.__err.push(String(e.message)));
  window.AlloLanguageContext = React.createContext({ t: (k, f) => f || null });
  window.fisherYatesShuffle = (a) => a.slice();
  window.AlloIcons = new Proxy({}, { get: () => (p) => React.createElement('svg', {
    width: 16, height: 16, 'aria-hidden': 'true' }) });
</script>
<script>${GAMES}</script>
<script>
  ReactDOM.createRoot(document.getElementById('mount')).render(
    React.createElement(window.AlloLanguageContext.Provider,
      { value: { t: (k, f) => f || null } },
      React.createElement(window.AlloModules.CrosswordGame, {
        data: ${JSON.stringify(DATA)}, onClose: () => {}, playSound: () => {},
        onScoreUpdate: () => {}, onGameComplete: () => {},
      })));
</script>
</body></html>`;
}

function luminance(rgb: string): number {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return -1;
  return (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255;
}

test('app-dark + print: crossword squares and docsuite cards print black-on-white', async ({ page }) => {
  await page.setContent(pageHtml(), { waitUntil: 'load' });
  await page.waitForSelector('[role="gridcell"]', { timeout: 30000 });
  const errs = await page.evaluate(() => (window as any).__err);
  expect(errs, 'module must mount clean').toEqual([]);

  await page.emulateMedia({ media: 'print' });

  const m = await page.evaluate(() => {
    const cs = (el: Element) => getComputedStyle(el as HTMLElement);
    const cell = [...document.querySelectorAll('[role="gridcell"]')]
      .find((e) => /(^|\s)bg-white(\s|$)/.test((e as HTMLElement).className));
    const section = document.querySelector('[data-x2="section"]')!;
    const header = document.querySelector('[data-help-key="crossword_game_container"] .bg-indigo-600');
    return {
      cellBg: cell ? cs(cell).backgroundColor : 'absent',
      cellFg: cell ? cs(cell).color : 'absent',
      sectionBg: cs(section).backgroundColor,
      sectionFg: cs(section).color,
      headerDisplay: header ? cs(header).display : 'absent',
    };
  });

  // Letter squares: light background, dark ink.
  expect(luminance(m.cellBg), `cell bg ${m.cellBg} must print light`).toBeGreaterThan(0.85);
  expect(luminance(m.cellFg), `cell fg ${m.cellFg} must print dark`).toBeLessThan(0.35);
  // The generator-level rule, not one tool: a plain .section card too.
  // (transparent backgrounds count as light — the page behind them is white.)
  const sectionLum = m.sectionBg.includes('0, 0, 0, 0') ? 1 : luminance(m.sectionBg);
  expect(sectionLum, `section bg ${m.sectionBg} must print light`).toBeGreaterThan(0.85);
  expect(luminance(m.sectionFg), `section fg ${m.sectionFg} must print dark`).toBeLessThan(0.35);
  // The modal chrome stays off paper.
  expect(m.headerDisplay).toBe('none');
});
