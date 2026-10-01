/**
 * Bird Lab — Bird Topography: a songbird whose every named region is a shape.
 *
 * The old diagram was a circle on an ellipse with numbered dots, several of
 * them on the wrong part (the "rump" sat on the wing, "primaries" and "tail"
 * off the bird). Each region is now its own shape, numbered clockwise with a
 * leader to a point on that shape; picking a part paints it; a quiz asks the
 * student to find a named part on the bird.
 */
import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'birdLab',
  toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'],
  width: 1100,
  height: 900,
  appStyles: true,
  layout: 'document',
});

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const DARK_TEXT = ['slate', 'gray', 'zinc', 'neutral', 'stone'].flatMap((c) => [700, 800, 900].map((n) => `.text-${c}-${n}`));
const LIGHT_BG = ['.bg-white', '.bg-slate-100', '.bg-gray-100', '.from-white',
  ...['slate', 'gray', 'zinc', 'neutral', 'stone', 'indigo', 'blue', 'sky', 'cyan', 'teal', 'emerald', 'green', 'lime', 'yellow',
    'amber', 'orange', 'red', 'rose', 'pink', 'fuchsia', 'purple', 'violet'].map((c) => `.bg-${c}-50`)];
const SHIM = DARK_TEXT.map((c) => `[data-stem-tool-shell] ${c}`).join(', ') + ' { color: inherit; }\n'
  + LIGHT_BG.map((c) => `[data-stem-tool-shell] ${c}`).join(', ') + ' { color: #1e293b; }';

async function mount(page: Page, shell = false) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(({ shim, shell }) => {
    if (shell) {
      const wrap = document.querySelector('#wrap') as HTMLElement;
      wrap.setAttribute('data-stem-tool-shell', 'true'); wrap.style.background = '#0f172a'; wrap.style.color = '#e2e8f0';
      const st = document.createElement('style'); st.textContent = shim; document.head.appendChild(st);
    }
    (window as any).__mount({ birdLab: { view: 'topology' } });
  }, { shim: SHIM, shell });
  await page.waitForSelector('[data-topo-figure] [data-topo-region]');
}

/** Screen point of a region's leader anchor (the dot ignores the pointer). */
const anchorOf = (page: Page, id: string) => page.evaluate((id) => {
  const r = document.querySelector(`[data-topo-anchor="${id}"]`)!.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, id);
async function clickRegion(page: Page, id: string) {
  const p = await anchorOf(page, id);
  await page.mouse.click(p.x, p.y);
}
const fillOf = (page: Page, id: string) => page.evaluate((id) => getComputedStyle(document.querySelector(`[data-topo-region="${id}"]`)!).fill, id);

test('every number points at the part it names, and no leader crosses another', async ({ page }) => {
  await mount(page);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-topo-part]')].map((g) => {
    const id = g.getAttribute('data-topo-part') as string;
    const dot = document.querySelector(`[data-topo-anchor="${id}"]`)!.getBoundingClientRect();
    const el = document.elementFromPoint(dot.left + dot.width / 2, dot.top + dot.height / 2);
    const line = document.querySelector(`[data-topo-leader="${id}"]`) as SVGLineElement;
    const badge = g.querySelector('[data-topo-badge]') as SVGCircleElement;
    const outline = document.querySelector('[data-topo-outline]') as SVGPathElement;
    const bx = Number(badge.getAttribute('cx')), by = Number(badge.getAttribute('cy')), br = Number(badge.getAttribute('r'));
    let onBird = 0;
    for (let k = 0; k < 24; k++) {
      const t = k / 24 * 2 * Math.PI;
      if (outline.isPointInFill(new DOMPoint(bx + (br + 2) * Math.cos(t), by + (br + 2) * Math.sin(t)))) onBird++;
    }
    return { id, hit: el?.getAttribute('data-topo-region') ?? el?.tagName, onBird, num: g.textContent,
      seg: [Number(line.getAttribute('x1')), Number(line.getAttribute('y1')), Number(line.getAttribute('x2')), Number(line.getAttribute('y2'))] };
  }));
  expect(rows.length).toBe(24);
  for (const r of rows) {
    expect(r.hit, `number ${r.num} (${r.id}) lands on`).toBe(r.id);
    expect(r.onBird, `badge ${r.num} (${r.id}) sits on the bird`).toBe(0);
  }
  expect(rows.map((r) => r.num)).toEqual(rows.map((_, i) => String(i + 1)));
  const o = (p: number[], q: number[], r: number[]) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const crossings: string[] = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const [a, b] = [[rows[i].seg[0], rows[i].seg[1]], [rows[i].seg[2], rows[i].seg[3]]];
    const [c, d] = [[rows[j].seg[0], rows[j].seg[1]], [rows[j].seg[2], rows[j].seg[3]]];
    if (o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0) crossings.push(`${rows[i].id} x ${rows[j].id}`);
  }
  expect(crossings).toEqual([]);
});

test('each region sits where a field guide puts it', async ({ page }) => {
  await mount(page);
  const S = await page.evaluate(() => {
    document.querySelectorAll('[data-topo-part]').forEach((g) => ((g as HTMLElement).style.display = 'none'));
    const box = document.querySelector('[data-topo-figure]')!.getBoundingClientRect();
    const acc: Record<string, { n: number; sx: number; sy: number; x0: number; x1: number; y0: number; y1: number }> = {};
    for (let y = box.top; y < box.bottom; y += 1.5) for (let x = box.left; x < box.right; x += 1.5) {
      const id = document.elementFromPoint(x, y)?.getAttribute('data-topo-region');
      if (!id) continue;
      const a = acc[id] || (acc[id] = { n: 0, sx: 0, sy: 0, x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
      a.n++; a.sx += x; a.sy += y; a.x0 = Math.min(a.x0, x); a.x1 = Math.max(a.x1, x); a.y0 = Math.min(a.y0, y); a.y1 = Math.max(a.y1, y);
    }
    const eye = document.querySelector('[data-topo-eye]')!.getBoundingClientRect();
    const out: Record<string, any> = { eye: { x: eye.left + eye.width / 2, y: eye.top + eye.height / 2, r: eye.width / 2 } };
    for (const [id, a] of Object.entries(acc)) out[id] = { n: a.n, cx: a.sx / a.n, cy: a.sy / a.n, x0: a.x0, x1: a.x1, y0: a.y0, y1: a.y1 };
    out.bars = (document.querySelector('[data-topo-region="wingbars"]')!.getAttribute('d')!.match(/M/g) || []).length;
    return out;
  });
  const ids = ['crown', 'forehead', 'eyering', 'lores', 'bill', 'malar', 'throat', 'breast', 'belly', 'flank', 'legs', 'undertail',
    'primary', 'tail', 'rump', 'tertials', 'secondary', 'wingbars', 'back', 'wing-coverts', 'cheek', 'nape', 'eyeline', 'eyebrow'];
  for (const id of ids) expect(S[id]?.n ?? 0, `${id} is visible`).toBeGreaterThan(20);
  const { eye } = S;
  // The bird faces right: forward is +x, up is -y.
  for (const id of ids) if (id !== 'bill') expect(S.bill.x1, `bill is the front of the bird, not ${id}`).toBeGreaterThan(S[id].x1);
  for (const id of ids) if (id !== 'tail') expect(S.tail.x0, `tail is the back of the bird, not ${id}`).toBeLessThan(S[id].x0);
  // Head: crown over the eyebrow over the eye; eyeline level with the eye, behind it; lores between eye and bill.
  expect(S.crown.cy).toBeLessThan(S.eyebrow.cy);
  expect(S.eyebrow.cy).toBeLessThan(eye.y - eye.r * 0.6);
  expect(Math.abs(S.eyeline.cy - eye.y)).toBeLessThan(eye.r * 1.5);
  expect(S.eyeline.cx).toBeLessThan(eye.x);
  expect(S.lores.cx).toBeGreaterThan(eye.x);
  expect(S.lores.cx).toBeLessThan(S.bill.x0);
  expect(S.forehead.cx).toBeGreaterThan(S.crown.cx);
  expect(S.nape.cx).toBeLessThan(S.crown.cx);
  expect(S.nape.cy).toBeGreaterThan(S.crown.cy);
  expect(Math.hypot(S.eyering.cx - eye.x, S.eyering.cy - eye.y)).toBeLessThan(eye.r);
  expect(S.cheek.cy).toBeGreaterThan(eye.y);
  expect(S.cheek.cx).toBeLessThan(eye.x);
  expect(S.malar.cy).toBeGreaterThan(S.cheek.cy);
  expect(S.throat.cy).toBeGreaterThan(S.malar.cy);
  // Body: breast over belly; flanks below the folded wing; rump on the lower back above the tail;
  // undertail coverts under the tail base, behind the legs.
  expect(S.breast.cy).toBeLessThan(S.belly.cy);
  expect(S.flank.cy).toBeGreaterThan(S['wing-coverts'].cy);
  expect(S.rump.cy).toBeGreaterThan(S.back.cy);
  expect(S.rump.cx).toBeLessThan(S.back.cx);
  expect(S.rump.cx).toBeGreaterThan(S.tail.cx);
  expect(S.undertail.cy).toBeGreaterThan(S.rump.cy);
  expect(S.undertail.cx).toBeLessThan(S.legs.cx);
  expect(S.legs.cy).toBeGreaterThan(S.belly.cy);
  // Wing: two bars; the primaries reach past the tertials (primary projection).
  expect(S.bars).toBe(2);
  expect(S.primary.x0).toBeLessThan(S.tertials.x0 - 5);
  expect(S.tertials.x0).toBeLessThan(S.secondary.x0);
});

test('a number, a name or the bird itself paints the part', async ({ page }) => {
  await mount(page);
  const plain = await fillOf(page, 'rump');
  await page.locator('[data-topo-badge="rump"]').click();
  await expect(page.locator('[data-topo-info]')).toHaveAttribute('data-topo-info', 'rump');
  await expect(page.getByRole('heading', { name: 'Rump', exact: true })).toBeVisible();
  expect(await fillOf(page, 'rump')).toBe('rgb(253, 224, 71)');
  const others = await page.evaluate(() => [...document.querySelectorAll('[data-topo-region]')]
    .filter((e) => e.getAttribute('data-topo-region') !== 'rump' && getComputedStyle(e).fill === 'rgb(253, 224, 71)').map((e) => e.getAttribute('data-topo-region')));
  expect(others).toEqual([]);
  await expect(page.locator('[data-topo-name="rump"]')).toHaveAttribute('aria-pressed', 'true');

  await clickRegion(page, 'eyebrow');
  await expect(page.locator('[data-topo-info]')).toHaveAttribute('data-topo-info', 'eyebrow');
  expect(await fillOf(page, 'rump')).toBe(plain);

  await page.locator('[data-topo-name="tertials"]').click();
  expect(await fillOf(page, 'tertials')).toBe('rgb(253, 224, 71)');
  await expect(page.locator('[data-topo-part="tertials"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('[data-topo-part="nape"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-topo-info]')).toHaveAttribute('data-topo-info', 'nape');
});

test('quiz: find the named part on the bird', async ({ page }) => {
  await mount(page);
  await page.locator('[data-topo-mode="quiz"]').click();
  const box = page.locator('[data-topo-quiz]');
  // In the quiz the numbers and the shapes stop naming themselves.
  const labels = await page.$$eval('[data-topo-part]', (els) => els.map((e) => e.getAttribute('aria-label')));
  expect(labels.filter((l) => !/^Region \d+$/.test(l || ''))).toEqual([]);
  expect(await page.locator('[data-topo-region] title').count()).toBe(0);

  let target = (await box.getAttribute('data-topo-quiz'))!;
  const wrong = target === 'bill' ? 'tail' : 'bill';
  await clickRegion(page, wrong);
  await expect(page.locator('[data-topo-feedback]')).toHaveAttribute('data-topo-feedback', 'wrong');
  expect(await fillOf(page, wrong)).toBe('rgb(252, 165, 165)');
  await clickRegion(page, target);
  await expect(page.locator('[data-topo-feedback]')).toHaveAttribute('data-topo-feedback', 'right');
  expect(await fillOf(page, target)).toBe('rgb(134, 239, 172)');
  const seen = new Set([target]);
  for (let q = 2; q <= 10; q++) {
    await page.getByRole('button', { name: 'Next part' }).click();
    await expect(page.locator('[data-topo-feedback]')).toHaveAttribute('data-topo-feedback', 'waiting');
    target = (await box.getAttribute('data-topo-quiz'))!;
    expect(seen.has(target), `question ${q} repeats ${target}`).toBe(false);
    seen.add(target);
    await clickRegion(page, target);
    await expect(page.locator('[data-topo-feedback]')).toHaveAttribute('data-topo-feedback', 'right');
  }
  await page.getByRole('button', { name: 'See my score' }).click();
  await expect(box).toHaveAttribute('data-topo-quiz', 'done');
  await expect(page.locator('[data-topo-score]')).toHaveAttribute('data-topo-score', '9');
});

test('topography view is readable in the host shell', async ({ page }) => {
  await mount(page, true);
  // axe cannot judge text over a gradient (the figure's sky-to-sand panel) and
  // files it as "incomplete", so that text is measured here against every stop.
  const scan = () => page.evaluate(async () => {
    const r = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'rule', values: ['color-contrast'] } });
    const bad = (r.violations[0]?.nodes || []).map((n: any) => `${n.target[0]} ${n.any[0]?.data?.fgColor} on ${n.any[0]?.data?.bgColor}`);
    const rgb = (c: string) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const ratioOf = (a: number[], b: number[]) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };
    // SVG numbers are painted with fill, on their own badge disc.
    for (const g of document.querySelectorAll('[data-topo-part]')) {
      const t = g.querySelector('text')!, disc = g.querySelector('[data-topo-badge]')!;
      const ratio = ratioOf(rgb(getComputedStyle(t).fill), rgb(getComputedStyle(disc).fill));
      if (ratio < 4.5) bad.push(`number ${t.textContent} ${getComputedStyle(t).fill} on ${getComputedStyle(disc).fill}: ${ratio.toFixed(2)}`);
    }
    let judged = 0;
    for (const n of (r.incomplete[0]?.nodes || [])) {
      const el = document.querySelector(n.target[0]) as HTMLElement | null;
      if (!el || el instanceof SVGElement) continue;
      let a: HTMLElement | null = el, img = 'none';
      while (a && (img = getComputedStyle(a).backgroundImage) === 'none' && rgb(getComputedStyle(a).backgroundColor)[3] === 0) a = a.parentElement;
      if (!img.includes('gradient')) continue;
      judged++;
      const fg = rgb(getComputedStyle(el).color);
      for (const stop of img.match(/rgba?\([^)]+\)/g) || []) {
        const bg = rgb(stop);
        if (bg.length > 3 && bg[3] === 0) continue;
        const ratio = ratioOf(fg, bg);
        if (ratio < 4.5) bad.push(`${n.target[0]} ${getComputedStyle(el).color} on gradient stop ${stop}: ${ratio.toFixed(2)}`);
      }
    }
    return { bad, judged };
  }).then((x) => { expect(x.judged, 'gradient text found and measured').toBeGreaterThan(0); return x.bad; });
  expect(await scan()).toEqual([]);
  await page.locator('[data-topo-badge="flank"]').click();
  expect(await scan()).toEqual([]);
  await page.locator('[data-topo-mode="quiz"]').click();
  const target = (await page.locator('[data-topo-quiz]').getAttribute('data-topo-quiz'))!;
  await clickRegion(page, target === 'bill' ? 'tail' : 'bill');
  expect(await scan()).toEqual([]);
  await clickRegion(page, target);
  expect(await scan()).toEqual([]);
});
