// @ts-nocheck
// Night Sky: sky journey, daily question and quiz, plus the WCAG findings from the
// 2026-10-25 audit. Real Chromium, so SVG text is measured against the shapes drawn
// behind it (axe reports those checks as "incomplete" and never fails them).
import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const HARNESS = readFileSync('tests/e2e/astronomy-observatory-3d.spec.ts', 'utf8').split('const HARNESS = `')[1].split('`;')[0]
  .replace("gradeLevel: '8th Grade',", "gradeLevel: '8th Grade', isContrast: window.__contrast === true, theme: window.__contrast ? 'contrast' : 'dark',")
  .replace('awardXP: function () {}', 'awardXP: function (id, pts, why) { (window.__xp = window.__xp || []).push([id, pts, why]); }');
let server: Server, base: string;
test.use({ viewport: { width: 1280, height: 980 }, reducedMotion: 'reduce' });
test.describe.configure({ timeout: 120000 });
test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    if (req.url === '/__harness') { res.setHeader('content-type', 'text/html'); res.end(HARNESS); return; }
    const file = resolve(ROOT, '.' + decodeURIComponent((req.url || '/').split('?')[0]));
    if (!file.startsWith(ROOT + sep)) { res.writeHead(403); res.end(); return; }
    try {
      res.setHeader('content-type', ({ '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' })[extname(file)] || 'text/plain');
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
test.afterAll(async () => { await new Promise<void>(done => server.close(() => done())); });
test.afterEach(async ({ page }) => { await page.evaluate(() => (window as any).__destroy?.()).catch(() => {}); });

async function mount(page, state, contrast = false) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/__harness');
  await page.evaluate(({ state, contrast }) => { (window as any).__contrast = contrast; (window as any).__mount(state); }, { state, contrast });
  await page.locator('#astronomy-main').waitFor();
  // Buttons fade their background over 150 ms; a colour read taken mid-fade is not what the learner settles on.
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
  return errors;
}

// Resolve every visible text run against what is actually painted behind it, including the
// SVG shapes under SVG text and translucent layers. Returns the runs that miss WCAG 1.4.3.
const PROBE = () => {
  const parse = c => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (t, b) => { const a = t.a + b.a * (1 - t.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (t.r * t.a + b.r * b.a * (1 - t.a)) / a, g: (t.g * t.a + b.g * b.a * (1 - t.a)) / a, b: (t.b * t.a + b.b * b.a * (1 - t.a)) / a, a }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); };
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const opacityChain = (el, stop) => { let o = 1; for (let n = el; n && n.nodeType === 1 && n !== stop; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
  function htmlBg(el) {
    const layers: any[] = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (n !== el && ['CANVAS', 'VIDEO', 'IMG'].includes(n.tagName)) return { skip: true };
      const bi = cs.backgroundImage, bc = parse(cs.backgroundColor);
      if (bi && bi !== 'none') { const stops = (bi.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean); if (!stops.length) return { skip: true }; layers.push({ stops }); }
      if (bc && bc.a > 0) layers.push({ solid: bc });
      if (layers.some(l => l.solid && l.solid.a === 1)) break;
    }
    let cands = [{ r: 255, g: 255, b: 255, a: 1 }];
    for (let i = layers.length - 1; i >= 0; i--) { const l = layers[i]; cands = l.solid ? cands.map(c => over(l.solid, c)) : l.stops.flatMap(s => cands.map(c => over(s, c))); }
    return { cands };
  }
  function svgBg(t) {
    const svg = t.ownerSVGElement, base = htmlBg(svg); if (base.skip) return base; let cands = base.cands;
    const bb = t.getBoundingClientRect(), sx = bb.left + bb.width / 2, sy = bb.top + bb.height / 2;
    const shapes = [...svg.querySelectorAll('circle,rect,ellipse,path,polygon,polyline')].filter(s => (s.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) && !s.closest('defs,clipPath,mask,marker,pattern,symbol'));
    for (const s of shapes) {
      const cs = getComputedStyle(s); if (cs.visibility === 'hidden' || cs.display === 'none' || !cs.fill || cs.fill === 'none') continue;
      const m = s.getScreenCTM(); if (!m) continue; const pt = svg.createSVGPoint(); pt.x = sx; pt.y = sy; const lp = pt.matrixTransform(m.inverse());
      let inside = false; try { inside = s.isPointInFill(lp); } catch (e) {} if (!inside) continue;
      const op = parseFloat(cs.fillOpacity) * opacityChain(s, svg.parentElement);
      let stops;
      if (cs.fill.startsWith('url(')) { const id = /url\(["']?#([^"')]+)/.exec(cs.fill); const g = id && document.getElementById(id[1]); stops = g ? [...g.querySelectorAll('stop')].map(st => { const sc = getComputedStyle(st), c = parse(sc.stopColor); if (c) c.a *= parseFloat(sc.stopOpacity); return c; }).filter(Boolean) : null; }
      else stops = [parse(cs.fill)];
      if (!stops || !stops.length) return { skip: true };
      cands = stops.flatMap(st => cands.map(c => over({ ...st, a: st.a * op }, c)));
    }
    return { cands };
  }
  const root = document.getElementById('wrap'), out: any[] = [], seen = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const tn = walker.currentNode, txt = (tn.nodeValue || '').replace(/\s+/g, ' ').trim(); if (!txt) continue;
    const el = tn.parentElement; if (!el || seen.has(el) || ['SCRIPT', 'STYLE', 'OPTION', 'TITLE', 'DESC'].includes(el.tagName.toUpperCase())) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('.astr-sr-only')) continue;
    seen.add(el);
    const isSvg = !!el.closest('svg'), fg = parse(isSvg ? cs.fill : cs.color); if (!fg) continue;
    let bg = isSvg ? svgBg(el) : htmlBg(el); if (bg.skip) continue;
    // A halo painted under the glyphs (paint-order: stroke, >= 2 units) is the text's real background (WCAG 1.4.3 understanding).
    const halo = isSvg && /^stroke/.test(cs.paintOrder || '') && parseFloat(cs.strokeWidth) >= 2 ? parse(cs.stroke) : null;
    if (halo) { const o = opacityChain(el, root); bg = { cands: bg.cands.map(c => over({ ...halo, a: halo.a * o }, c)) }; }
    const disabled = !!el.closest('button:disabled,input:disabled,select:disabled,textarea:disabled,[aria-disabled=true]');
    if (disabled) continue; // WCAG exempts inactive components
    let size = parseFloat(cs.fontSize); if (isSvg) { const m = el.getScreenCTM(); if (m) size *= Math.hypot(m.a, m.b); }
    const weight = parseInt(cs.fontWeight) || 400, need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5, op = opacityChain(el, root);
    let worst = 99;
    for (const b of bg.cands) { const f = (fg.a < 1 || op < 1) ? over({ ...fg, a: fg.a * op }, b) : fg; worst = Math.min(worst, ratio(f, b)); }
    if (worst < need) out.push(`${worst.toFixed(2)}:1 < ${need} ${hex(fg)} ${Math.round(size)}px "${txt.slice(0, 40)}"`);
  }
  return out;
};

const AXE = 'desktop/web-app/node_modules/axe-core/axe.min.js';
async function axeViolations(page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run('#wrap', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, rules: { 'color-contrast': { enabled: false } }, resultTypes: ['violations'] });
    return r.violations.map(v => v.id + ': ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | '));
  });
}

test.describe('text contrast measured against what is really painted behind it', () => {
  for (const contrast of [false, true]) {
    const theme = contrast ? 'contrast theme' : 'night theme';
    test(`diagrams and cards pass 4.5:1 (${theme})`, async ({ page }) => {
      const states = [
        { tab: 'stars' },                                                               // Sun cross-section labels sit on coloured rings
        { tab: 'eclipses', eclipseType: 'solar', eclipseGeometry: 'total', eclipsePhase: 50 },   // CORONA REVEALED over a bright glow
        { tab: 'eclipses', eclipseType: 'solar', eclipseGeometry: 'annular', eclipsePhase: 50 },
        { tab: 'exoplanets' },                                                           // selected-card habitability text
        { tab: 'tonight', journeyOpen: true },
        { tab: 'quiz', quizPractice: true, quizAnswers: [0, 1, 2, null, null, null, null, null, null, null, null, null, null, null, null] }
      ];
      for (const state of states) {
        const errors = await mount(page, { observingList: [], ...state }, contrast);
        const bad = await page.evaluate(PROBE);
        expect(bad, `${state.tab} ${JSON.stringify(state).slice(0, 60)}`).toEqual([]);
        expect(errors).toEqual([]);
        await page.evaluate(() => (window as any).__destroy());
      }
    });
  }

  test('Sky Map labels stay readable while another object is the focus', async ({ page }) => {
    let dimmedLabels = 0;
    for (const hours of [0, 4, 8, 12]) {
      await mount(page, { tab: 'skymap', observingList: [], skyHourOffset: hours });
      // The target buttons name the object in aria-label ("Moon, Naked eye, 34° ESE horizon"), not in their text.
      const targets = page.locator('#astronomy-main button[aria-pressed="false"][aria-label*="horizon"]');
      const n = Math.min(await targets.count(), 3);
      expect(n, `offset ${hours}h found no sky targets, so nothing was measured`).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        await targets.nth(i).click();
        // Once a target is chosen, every other marker dims. Count the labels that dimmed, so this cannot pass vacuously.
        dimmedLabels += await page.evaluate(() => [...document.querySelectorAll('#astronomy-main svg text')].filter(t => parseFloat(getComputedStyle(t).opacity) < 1).length);
        expect(await page.evaluate(PROBE), `offset ${hours}h, target ${i}`).toEqual([]);
      }
      await page.evaluate(() => (window as any).__destroy());
    }
    expect(dimmedLabels, 'no dimmed label was ever measured').toBeGreaterThan(3);
  });
});

test.describe('axe on the new and rebuilt surfaces', () => {
  test('Tonight: unanswered, answered and with the mission list open', async ({ page }) => {
    await mount(page, { tab: 'tonight', observingList: [] });
    expect(await axeViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Show all missions' }).click();
    expect(await axeViolations(page)).toEqual([]);
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Check my answer' }).click();
    await expect(page.locator('#astronomy-daily .astr-answer-list')).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test('Quiz: fresh, practice mode, results', async ({ page }) => {
    await mount(page, { tab: 'quiz', observingList: [] });
    expect(await axeViolations(page)).toEqual([]);
    await page.getByRole('checkbox', { name: /Practice mode/ }).check();
    await page.locator('#astronomy-quiz-q-0-c-0').click();
    expect(await axeViolations(page)).toEqual([]);
    await mount(page, { tab: 'quiz', observingList: [], quizAnswers: Array(15).fill(0), quizSubmitted: true });
    expect(await axeViolations(page)).toEqual([]);
  });

  test('every other section is still free of axe violations in the states the audit reached', async ({ page }) => {
    for (const tab of ['skymap', 'constellations', 'moon', 'planets', 'exoplanets', 'seasons', 'stars', 'galaxies', 'eclipses', 'indigenous', 'history', 'observe', 'print', 'hrDiagram']) {
      await mount(page, { tab, observingList: [] });
      expect(await axeViolations(page), tab).toEqual([]);
      await page.evaluate(() => (window as any).__destroy());
    }
  });
});

test.describe('keyboard and reflow', () => {
  test('the daily question can be answered with the keyboard alone and focus lands on the next action', async ({ page }) => {
    await mount(page, { tab: 'tonight', observingList: [] });
    const radios = page.getByRole('radio');
    await radios.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(radios.nth(1)).toBeChecked();
    await page.keyboard.press('Enter');
    await expect(page.locator('#astronomy-daily-open')).toBeFocused();
    await expect(page.locator('#astronomy-daily [role="status"]')).toContainText(/Correct\.|Not quite\./);
    const xp = await page.evaluate(() => (window as any).__xp);
    expect(xp).toEqual([['astronomyJourney', 4, 'Night Sky missions']]);
  });

  test('submitting an empty daily question explains itself and returns focus to the choices', async ({ page }) => {
    await mount(page, { tab: 'tonight', observingList: [] });
    await page.getByRole('button', { name: 'Check my answer' }).click();
    await expect(page.getByRole('alert')).toHaveText('Choose an answer first.');
    await expect(page.getByRole('radio').first()).toBeFocused();
  });

  test('the quiz never invents answers, and an incomplete submit names the first open question', async ({ page }) => {
    await mount(page, { tab: 'quiz', observingList: [] });
    await page.locator('#astronomy-quiz-q-2-c-1').click();
    await expect(page.locator('#astronomy-main button[aria-pressed="true"]')).toHaveCount(1);
    // aria-disabled keeps the button focusable and clickable for assistive technology; Playwright treats it as inert.
    await page.getByRole('button', { name: /Answer all questions to submit \(1\/15\)/ }).click({ force: true });
    await expect(page.getByRole('alert')).toContainText('Question 1 needs an answer');
    await expect(page.locator('#astronomy-quiz-q-0-c-0')).toBeFocused();
  });

  test('completing the quiz moves focus to the results and announces one short sentence', async ({ page }) => {
    await mount(page, { tab: 'quiz', observingList: [] });
    for (let i = 0; i < 15; i++) await page.locator(`#astronomy-quiz-q-${i}-c-0`).click();
    await page.getByRole('button', { name: 'Submit quiz' }).click();
    await expect(page.locator('#astronomy-quiz-results-title')).toBeFocused();
    await expect(page.locator('[role="status"][aria-atomic="true"]')).toHaveText(/^Quiz results: \d+ of 15 correct, \d+ percent\.$/);
    await page.getByRole('button', { name: 'Retake quiz' }).click();
    await expect(page.locator('#astronomy-quiz-intro')).toBeFocused();
  });

  for (const tab of ['tonight', 'quiz', 'stars']) {
    test(`${tab} reflows at 320 CSS px with text spacing applied and keeps 24px targets`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await mount(page, { tab, observingList: [], journeyOpen: true });
      await page.addStyleTag({ content: '#wrap *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} #wrap p{margin-bottom:2em!important}' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      const clipped = await page.evaluate(() => [...document.querySelectorAll('#wrap *')].filter((n: any) => !n.closest('svg') && !n.closest('.astr-sr-only') && /(hidden|clip)/.test(getComputedStyle(n).overflowY) && (n.textContent || '').trim() && n.scrollHeight > n.clientHeight + 1).map((n: any) => n.tagName + '.' + n.className));
      expect(clipped).toEqual([]);
      const small = await page.evaluate(() => [...document.querySelectorAll('#wrap button, #wrap input:not([type=hidden]), #wrap select, #wrap a[target=_blank]')].filter((n: any) => { const r = n.getBoundingClientRect(); return r.width > 0 && (r.width < 24 || r.height < 24) && !n.closest('.astr-sr-only') && getComputedStyle(n).display !== 'inline'; }).map((n: any) => n.tagName + ':' + (n.getAttribute('aria-label') || n.textContent || '').trim().slice(0, 30)));
      expect(small).toEqual([]);
    });
  }
});
