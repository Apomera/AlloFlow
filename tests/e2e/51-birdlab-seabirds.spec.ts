/**
 * Bird Lab — Gulf of Maine seabirds, drawn as they are seen.
 *
 * The four auks stand on a ledge (side view); the other eight are in flight,
 * seen from above, where the marks a seabird watcher has seconds to catch
 * show: black wingtips, a black cap, a white rump, the depth of a tail fork.
 * These checks walk all twelve and read the painted parts.
 */
import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'birdLab',
  toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1100,
  height: 900,
  appStyles: true,
  layout: 'document',
});

test.describe.configure({ timeout: 600_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

type Bird = { kind: string; tail: string | null; parts: Record<string, { fill: string; stroke: string | null; w: number; h: number }>; height: number };

async function walk(page: Page) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'seabirds' } }));
  await page.waitForSelector('[data-seabird-plate]');
  const chips = page.locator('button[aria-pressed]');
  const n = await chips.count();
  const out: Record<string, Bird | null> = {};
  for (let i = 0; i < n; i++) {
    const name = (await chips.nth(i).innerText()).trim();
    await chips.nth(i).click();
    await expect(chips.nth(i)).toHaveAttribute('aria-pressed', 'true');
    out[name] = await page.evaluate((nm) => {
      const svg = document.querySelector(`[data-seabird="${CSS.escape(nm)}"]`) as SVGSVGElement | null;
      if (!svg) return null;
      const parts: Record<string, { fill: string; stroke: string | null; w: number; h: number }> = {};
      svg.querySelectorAll('[data-seabird-part]').forEach((p) => {
        const b = (p as SVGGraphicsElement).getBBox();
        parts[p.getAttribute('data-seabird-part')!] = { fill: p.getAttribute('fill')!, stroke: p.getAttribute('stroke'), w: b.width, h: b.height };
      });
      return { kind: svg.getAttribute('data-seabird-kind')!, tail: svg.getAttribute('data-seabird-tail'), parts, height: svg.getBoundingClientRect().height };
    }, name);
  }
  return out;
}

const rgb = (hex: string) => { const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) throw new Error(`not a color: ${hex}`); const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const is = {
  black: (c: string) => Math.max(...rgb(c)) < 60,
  white: (c: string) => Math.min(...rgb(c)) > 225,
  yellow: (c: string) => { const [r, g, b] = rgb(c); return r > 200 && g > 160 && b < 130; },
  red: (c: string) => { const [r, g, b] = rgb(c); return r > 150 && g < 100 && b < 100; },
  orange: (c: string) => { const [r, g, b] = rgb(c); return r > 200 && g > 90 && g < 170 && b < 90; },
  brown: (c: string) => { const [r, g, b] = rgb(c); return r > g && g > b && r - b > 12 && Math.max(r, g, b) < 120; },
};
const color = (p: { fill: string; stroke: string | null }) => (p.fill && p.fill !== 'none' ? p.fill : p.stroke!);

test('all twelve drawn: auks standing, the rest in flight from above', async ({ page }) => {
  const s = await walk(page);
  expect(Object.keys(s).length).toBe(12);
  const auks = ['Atlantic Puffin', 'Razorbill', 'Common Murre', 'Black Guillemot'];
  const bad: string[] = [];
  for (const [name, b] of Object.entries(s)) {
    if (!b) { bad.push(`${name}: no plate`); continue; }
    if (b.kind !== (auks.includes(name) ? 'auk' : 'fly')) bad.push(`${name}: ${b.kind}`);
    for (const [k, p] of Object.entries(b.parts)) if (!/^#[0-9a-f]{6}$/i.test(color(p))) bad.push(`${name}.${k}=${color(p)}`);
    if (b.height < 100) bad.push(`${name}: ${Math.round(b.height)}px`);
  }
  expect(bad).toEqual([]);
});

test('the auks: bills, faces, feet and the guillemot wing patch', async ({ page }) => {
  const s = await walk(page);
  const pf = s['Atlantic Puffin']!;
  expect(is.white(pf.parts.face.fill) && is.red(pf.parts.bill.fill) && is.orange(pf.parts.feet.fill)).toBe(true);
  expect(pf.parts.billBase && is.yellow(color(pf.parts.billRidge))).toBeTruthy();
  const rz = s['Razorbill']!;
  expect(is.white(color(rz.parts.billLine)) && is.white(color(rz.parts.faceLine)) && is.black(rz.parts.bill.fill)).toBe(true);
  // A Razorbill bill is deep and blunt; a murre's long and thin.
  expect(rz.parts.bill.h / rz.parts.bill.w).toBeGreaterThan(s['Common Murre']!.parts.bill.h / s['Common Murre']!.parts.bill.w * 1.4);
  expect(is.brown(s['Common Murre']!.parts.head.fill) && !is.black(s['Common Murre']!.parts.head.fill)).toBe(true);
  const bg = s['Black Guillemot']!;
  expect(is.white(bg.parts.wingPatch.fill) && is.red(bg.parts.feet.fill) && is.black(bg.parts.belly.fill)).toBe(true);
});

test('in flight: wingtips, caps, rumps, bills and tail forks', async ({ page }) => {
  const s = await walk(page);
  const g = s['Northern Gannet']!, k = s['Black-legged Kittiwake']!;
  expect(is.black(g.parts.wingtips.fill) && is.white(g.parts.wing.fill) && g.tail === 'wedge').toBe(true);
  expect(is.black(k.parts.wingtips.fill) && is.yellow(k.parts.bill.fill)).toBe(true);
  const sp = s["Wilson's Storm-Petrel"]!;
  expect(is.white(sp.parts.rump.fill) && !is.white(sp.parts.body.fill)).toBe(true);
  const sh = s['Great Shearwater']!;
  expect(!is.white(sh.parts.cap.fill) && is.white(sh.parts.collar.fill) && is.white(sh.parts.rump.fill)).toBe(true);
  expect(is.white(s['Northern Fulmar']!.parts.head.fill)).toBe(true);
  // A fulmar's stubby tube-nosed bill against a gannet's dagger.
  expect(s['Northern Fulmar']!.parts.bill.w).toBeLessThan(g.parts.bill.w * 0.6);
  const ct = s['Common Tern']!, at = s['Arctic Tern']!, rt = s['Roseate Tern']!;
  for (const t of [ct, at, rt]) { expect(is.black(t.parts.cap.fill)).toBe(true); expect(t.tail).toBe('fork'); }
  // Bills: Common red with a black tip, Arctic all red, Roseate mostly black.
  expect(is.red(ct.parts.bill.fill) && is.black(ct.parts.billTip.fill)).toBe(true);
  expect(is.red(at.parts.bill.fill) && !at.parts.billTip).toBe(true);
  expect(is.black(rt.parts.bill.fill)).toBe(true);
  // Tail streamers: Roseate longest, then Arctic, then Common.
  expect(rt.parts.tail.w).toBeGreaterThan(at.parts.tail.w);
  expect(at.parts.tail.w).toBeGreaterThan(ct.parts.tail.w);
});
