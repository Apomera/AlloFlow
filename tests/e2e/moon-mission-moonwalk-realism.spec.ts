import { test, expect, type Page, type Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// The moonwalk's sky and gait, in real WebGL. Stars shone over sunlit ground (the
// Apollo photographs show none); looking into the Sun washed half the frame in a haze
// the Moon has no air to make; and the cuff never said that above about 0.85 m/s the
// natural lunar gait is the lope.
// MM_SOURCE_E2E: a repo-relative copy to load instead, for mutation checks.
const harness = new GlHarness({ toolFile: process.env.MM_SOURCE_E2E || 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1180, height: 900, appStyles: true });
const AT_EVA = { moonMission: { missionPhase: 6, evaStarted: true } };
const EVA_READY = 'document.querySelector(\'canvas[data-eva-canvas="true"]\')';

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 180_000 });

async function drag(page: Page, cv: Locator, dx: number, dy: number) {
  const box = await cv.boundingBox();
  const cx = box!.x + box!.width / 2, cy = box!.y + box!.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) { await page.mouse.move(cx + dx * i / 20, cy + dy * i / 20); await page.waitForTimeout(25); }
  await page.mouse.up();
}

async function surface(page: Page) {
  await harness.mount(page, AT_EVA, EVA_READY);
  const cv = page.locator('canvas[data-eva-canvas="true"]');
  await cv.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  return cv;
}

test.describe('Moon Mission moonwalk realism (real WebGL)', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('stars come out only once the sunlit ground leaves the view', async ({ page }) => {
    const cv = await surface(page);
    const stars = () => cv.evaluate((c: HTMLElement) => Number(c.dataset.evaStars || 0));
    expect(await stars(), 'no stars over sunlit ground').toBeLessThan(0.05);
    await drag(page, cv, 0, -420);                       // look straight up
    await expect.poll(stars, { timeout: 30000 }).toBeGreaterThan(0.6);
    await drag(page, cv, 0, 420);                        // and back down to the ground
    await expect.poll(stars, { timeout: 30000 }).toBeLessThan(0.05);
  });

  test('looking into the Sun: a glare on it, and flare ghosts on the line through the centre', async ({ page }) => {
    const cv = await surface(page);
    await drag(page, cv, 560, -100);                     // near the Sun, off-centre
    await expect.poll(() => cv.evaluate((c: HTMLElement) => c.dataset.evaSunScreen || ''), { timeout: 30000 }).not.toBe('');
    await page.waitForTimeout(500);
    const geo = await page.evaluate(() => {
      const lens = document.querySelector('[data-eva-lens-glare]') as HTMLElement;
      const cvs = document.querySelector('canvas[data-eva-canvas="true"]') as HTMLElement;
      const [sx, sy] = (cvs.dataset.evaSunScreen || '0,0').split(',').map(Number);
      const ghosts = Array.from(lens.querySelectorAll('[data-eva-flare-ghost]')).map((el) => {
        const g = el as HTMLElement;
        const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(g.style.transform) || ['', 'NaN', 'NaN'];
        const w = parseFloat(g.style.width);
        return { t: Number(g.getAttribute('data-eva-flare-ghost')), x: Number(m[1]) + w / 2, y: Number(m[2]) + w / 2 };
      });
      return { opacity: Number(getComputedStyle(lens).opacity), sx, sy, W: cvs.clientWidth, H: cvs.clientHeight, ghosts };
    });
    expect(geo.opacity, 'the glare shows').toBeGreaterThan(0);
    expect(geo.ghosts.length).toBe(5);
    // Each ghost sits at its fraction t of the way from the Sun to the frame's centre.
    for (const gh of geo.ghosts) {
      expect(Math.abs(gh.x - (geo.sx + (geo.W / 2 - geo.sx) * gh.t)), 'ghost ' + gh.t + ' x').toBeLessThan(2);
      expect(Math.abs(gh.y - (geo.sy + (geo.H / 2 - geo.sy) * gh.t)), 'ghost ' + gh.t + ' y').toBeLessThan(2);
    }
  });

  test('the rover throws a rooster tail, and every grain flies until it lands', async ({ page }) => {
    // Grains rose 5 cm and were retired by a half-second timer, in mid-air; and the
    // pool was frustum-culled from its idle position 100 m underground, so near the LM
    // no dust was drawn at all.
    const cv = await surface(page);
    await cv.focus();
    await page.keyboard.down('KeyW');
    await page.keyboard.down('KeyD');
    try {
      await page.waitForFunction(() => /Board LRV/i.test(String(document.getElementById('eva-lrv-action')?.textContent || '')), null, { timeout: 60000 });
      await page.keyboard.press('KeyV');
    } finally { await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW'); }
    await expect(page.locator('#eva-lrv-action')).toContainText(/Exit LRV/i, { timeout: 30000 });
    await page.keyboard.down('KeyW');
    let flight: { peak: number; retired: number; midAir: number[]; frames: number };
    try {
      // Sample the pool every frame; each grain that is retired must have reached the
      // ground on the step that retired it.
      flight = await cv.evaluate((c: any, ms: number) => new Promise((resolve) => {
        const d = c._evaDust, g = 1.62;
        let prev: any = null, prevT = 0, peak = 0, retired = 0, frames = 0;
        const midAir: number[] = [];
        const t0 = performance.now();
        const step = () => {
          const now = performance.now();
          const cur = { life: Float32Array.from(d.life), pos: Float32Array.from(d.pos), vy: Float32Array.from(d.vy) };
          if (prev) {
            frames++;
            const dt = (now - prevT) / 1000;
            for (let i = 0; i < d.count; i++) {
              if (prev.life[i] <= 0) continue;
              const h = prev.pos[i * 3 + 1] - d.ground(prev.pos[i * 3], prev.pos[i * 3 + 2]);
              peak = Math.max(peak, h);
              if (cur.life[i] <= 0) {
                retired++;
                const next = h + prev.vy[i] * dt - 0.5 * g * dt * dt;
                if (next > 0.15 + Math.abs(prev.vy[i]) * 0.05) midAir.push(+h.toFixed(2));
              }
            }
          }
          prev = cur; prevT = now;
          if (now - t0 < ms) requestAnimationFrame(step); else resolve({ peak, retired, midAir, frames });
        };
        requestAnimationFrame(step);
      }), 6000) as any;
    } finally { await page.keyboard.up('KeyW'); }
    expect(await cv.evaluate((c: any) => c._evaDust.count)).toBeGreaterThanOrEqual(120);
    expect(flight.frames, 'frames sampled').toBeGreaterThan(10);
    expect(flight.peak, 'the rooster tail rises over a metre at speed (m)').toBeGreaterThan(1);
    expect(flight.retired, 'grains came down').toBeGreaterThan(5);
    expect(flight.midAir, 'grains retired in mid-air, at these heights (m)').toEqual([]);
  });

  test('the cuff names the gait: a walk first, then a lope once the stride passes the switch speed', async ({ page }) => {
    const cv = await surface(page);
    await cv.focus();
    const gait = () => cv.evaluate((c: HTMLElement) => c.dataset.evaGait || '');
    // Comfort mode never settles into the lope, so it holds a steady walk to read.
    await page.keyboard.press('KeyC');
    await page.keyboard.down('KeyW');
    try {
      await expect.poll(gait, { timeout: 30000 }).toBe('walk');
    } finally { await page.keyboard.up('KeyW'); }
    await expect.poll(gait, { timeout: 30000 }).toBe('standing');
    // Out of comfort mode a sustained stride passes the switch speed and lopes.
    await page.keyboard.press('KeyC');
    await page.keyboard.down('KeyW');
    try {
      await expect.poll(gait, { timeout: 30000 }).toBe('lope');
    } finally { await page.keyboard.up('KeyW'); }
    await expect.poll(gait, { timeout: 30000 }).toBe('standing');
    await expect(page.locator('#eva-weight')).toHaveText('like 27 kg');
  });
});
