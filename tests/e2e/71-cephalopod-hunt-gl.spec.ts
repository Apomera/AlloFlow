import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Cephalopod Lab — Hunter Sim on real WebGL.
 *
 * The jsdom suites never invoke the canvas ref, so the 4,000-line 3D hunt
 * (terrain, prey AI, predators, HUD, minimap, audio) has had no automated
 * eyes on it at all. This spec mounts the real scene under SwiftShader and
 * pins the things a student would notice first:
 *   1. the dive reaches a live, non-blank GL scene with the HUD attached;
 *   2. moving (W) changes the frame — the loop runs and input reaches it;
 *   3. the canvas follows its container when the container resizes
 *      (renderer.setSize must not pin the CSS box);
 *   4. surfacing releases the context.
 *
 * Set CL_SHOTS=<dir> to also save PNGs for eyeballing.
 */

const SHOT_DIR = process.env.CL_SHOTS || '';
function save(name: string, buf: Buffer) {
  if (!SHOT_DIR) return;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.writeFileSync(path.join(SHOT_DIR, name), buf);
}

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cephalopodlab.js',
  toolId: 'cephalopodLab',
  width: 960,
  height: 1150,
  probes: `
    window.__hunt = function () {
      var c = document.querySelector('#wrap canvas[role="application"]');
      if (!c) return null;
      var p = c.parentElement.getBoundingClientRect();
      var b = c.getBoundingClientRect();
      var gl = c.getContext('webgl2') || c.getContext('webgl');
      return { canvas: { w: Math.round(b.width), h: Math.round(b.height) }, parent: { w: Math.round(p.width), h: Math.round(p.height) },
               lost: gl ? gl.isContextLost() : null, styleW: c.style.width, hud: !!c.parentElement.querySelector('div'),
               wrapW: Math.round(document.querySelector('#wrap').getBoundingClientRect().width), rootW: Math.round(document.querySelector('#wrap > *').getBoundingClientRect().width) };
    };
    // The HUD is a plain div sibling of the canvas; read its text so a test
    // can assert what a student actually sees, not just that pixels changed.
    window.__hud = function () {
      var c = document.querySelector('#wrap canvas[role="application"]');
      if (!c) return null;
      var divs = c.parentElement.querySelectorAll('div');
      var best = '';
      for (var i = 0; i < divs.length; i++) {
        var t = divs[i].textContent || '';
        if (t.indexOf('HEALTH') >= 0 && t.length > best.length) best = t;
      }
      return best;
    };
  `,
});

const DIVE = { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', _threeLoaded: true, huntsAttempted: 1 } };

test.describe.configure({ timeout: 180_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

test.describe('Cephalopod Lab — Hunter Sim on real WebGL', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('dives into a live, non-blank scene with the HUD attached', async ({ page }) => {
    // Force the full environment (sun shafts, surface) so the screenshot shows what a
    // GPU-equipped student sees; the sim disables them under a software rasteriser.
    await page.addInitScript(() => { (window as any).__alloForceFX = true; });
    await harness.mount(page, DIVE);
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => (window as any).__hunt());
    expect(info).not.toBeNull();
    expect(info.lost).toBe(false);
    expect(info.hud).toBe(true);
    const shot = await page.locator('#wrap').screenshot();
    save('hunt_0_dive.png', shot);
    expect(shot.length).toBeGreaterThan(20_000);
  });

  test('W moves the octopus: the frame changes and the loop is running', async ({ page }) => {
    await harness.mount(page, DIVE);
    await page.waitForTimeout(2000);
    const canvas = page.locator('#wrap canvas[role="application"]');
    await canvas.click({ position: { x: 20, y: 20 } });
    const before = await canvas.screenshot();
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1800);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(300);
    const after = await canvas.screenshot();
    save('hunt_1_moved.png', await page.locator('#wrap').screenshot());
    expect(Buffer.compare(before, after)).not.toBe(0);
    await page.keyboard.down('KeyW'); await page.keyboard.down('Space');
    await page.waitForTimeout(900);
    await page.keyboard.up('Space'); await page.keyboard.up('KeyW');
    save('hunt_2_jet.png', await page.locator('#wrap').screenshot());
    await page.keyboard.press('KeyI');
    await page.waitForTimeout(700);
    save('hunt_3_ink.png', await page.locator('#wrap').screenshot());
  });

  test('the canvas follows its container when the container resizes', async ({ page }) => {
    await harness.mount(page, DIVE);
    await page.waitForTimeout(1500);
    const wide = await page.evaluate(() => (window as any).__hunt());
    await page.evaluate(() => {
      // #wrap is a flex box; the tool root is a flex item whose min-width is its content, so shrink both.
      (document.querySelector('#wrap') as HTMLElement).style.width = '560px';
      const root = document.querySelector('#wrap > *') as HTMLElement; root.style.width = '560px'; root.style.minWidth = '0'; root.style.flex = '0 0 560px';
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForTimeout(900);
    const narrow = await page.evaluate(() => (window as any).__hunt());
    expect(narrow.parent.w).toBeLessThan(wide.parent.w);
    // the whole point: the canvas box must track the parent box, not its first measurement
    expect(Math.abs(narrow.canvas.w - narrow.parent.w)).toBeLessThanOrEqual(2);
    expect(Math.abs(narrow.canvas.h - narrow.parent.h)).toBeLessThanOrEqual(2);
  });

  // The depth readout used to print the raw scene unit as metres, so the
  // deepest reachable point read "45m" beside a zone card claiming "4000m+",
  // and the pressure lesson had nothing to check its arithmetic against.
  test('the HUD reports a real reef depth and pressure on arrival', async ({ page }) => {
    await harness.mount(page, DIVE);
    await page.waitForTimeout(2000);
    const hud = await page.evaluate(() => (window as any).__hud());
    expect(hud).toBeTruthy();
    // Reef zone, a plausible shallow depth, and the matching pressure.
    expect(hud).toMatch(/Reef Zone/);
    const m = /(\d+)m · (\d+) atm/.exec(hud);
    expect(m).not.toBeNull();
    const depth = Number(m![1]);
    const atm = Number(m![2]);
    expect(depth).toBeGreaterThan(0);
    expect(depth).toBeLessThan(60);          // a reef, not the abyss
    expect(atm).toBe(Math.round(1 + depth / 10));   // 1 atm per 10 m
  });

  // Pressure damage used to start with no flash, caption, sound or HUD row.
  test('descending warns about pressure before it starts doing damage', async ({ page }) => {
    await harness.mount(page, DIVE);
    await page.waitForTimeout(1800);
    const canvas = page.locator('#wrap canvas[role="application"]');
    await canvas.click({ position: { x: 20, y: 20 } });

    // Hold Z and sample the HUD on the way down.
    const seen = { warning: false, crushing: false };
    let warnedBeforeDamage = false;
    await page.keyboard.down('KeyZ');
    for (let i = 0; i < 40; i += 1) {
      await page.waitForTimeout(150);
      const hud: string = await page.evaluate(() => (window as any).__hud() || '');
      if (hud.indexOf('PRESSURE BUILDING') >= 0) seen.warning = true;
      if (hud.indexOf('CRUSHING PRESSURE') >= 0) {
        if (seen.warning) warnedBeforeDamage = true;
        seen.crushing = true;
        break;
      }
    }
    await page.keyboard.up('KeyZ');

    expect(seen.warning).toBe(true);
    expect(seen.crushing).toBe(true);
    // The warning has to come first, or it is not a warning.
    expect(warnedBeforeDamage).toBe(true);
    save('hunt_4_pressure.png', await page.locator('#wrap').screenshot());
  });

  // Jetting used to cost stamina but not a single calorie, contradicting the
  // 5x figure this tool quizzes students on. Measure both drains in the real
  // engine: a unit test cannot see that the HUD row renders or that the
  // hunger bar actually falls faster with Space held.
  // Jetting used to cost stamina but not a single calorie, contradicting the
  // 5x figure this tool quizzes students on. Measure both drains in the real
  // engine: a unit test cannot see that the HUD row renders or that the
  // hunger bar actually falls faster with Space held.
  test('jetting burns calories faster than crawling, and says so', async ({ page }) => {
    await harness.mount(page, DIVE);
    await page.waitForTimeout(1800);
    const canvas = page.locator('#wrap canvas[role="application"]');
    await canvas.click({ position: { x: 20, y: 20 } });

    const readHud = () => page.evaluate(() => ((window as any).__hud() || '').replace(/ /g, ' '));
    // Regex literals, not `new RegExp('...' + '\s*')`: a single-backslash
    // string collapses '\s' to 's' and the pattern silently never matches,
    // which reads as "the HUD has no HUNGER row" rather than as a typo.
    const HUNGER_RE = /HUNGER\s*(\d+)/;
    const STAMINA_RE = /STAMINA\s*(\d+)/;
    const numFrom = (hud: string, re: RegExp) => {
      const m = re.exec(hud);
      return m ? Number(m[1]) : null;
    };

    // The HUD prints hunger as an integer, so a 3s window resolves to only a
    // handful of units and rounding swamps the difference. Measure over a
    // window long enough that the drop is tens of units, and let stamina
    // refill (100 max, 18/s regen) before the jet leg so Space actually jets
    // rather than idling against an empty bar.
    const LEG_MS = 9000;

    await page.keyboard.down('KeyW');
    const crawlStart = numFrom(await readHud(), HUNGER_RE);
    expect(crawlStart).not.toBeNull();
    await page.waitForTimeout(600);
    const crawlHud = await readHud();
    await page.waitForTimeout(LEG_MS - 600);
    const crawlEnd = numFrom(await readHud(), HUNGER_RE);
    await page.keyboard.up('KeyW');
    const crawlDrop = crawlStart! - crawlEnd!;

    // The row has to name the crawl state and its rate while it happens.
    expect(crawlHud).toMatch(/crawling [\d.]+ cal\/s/);

    // Let stamina come back before the jet leg.
    await page.waitForTimeout(6000);
    expect(numFrom(await readHud(), STAMINA_RE)).toBeGreaterThan(80);

    await page.keyboard.down('KeyW');
    await page.keyboard.down('Space');
    const jetStart = numFrom(await readHud(), HUNGER_RE);
    await page.waitForTimeout(600);
    const jetHud = await readHud();
    await page.waitForTimeout(LEG_MS - 600);
    const jetEnd = numFrom(await readHud(), HUNGER_RE);
    await page.keyboard.up('Space');
    await page.keyboard.up('KeyW');
    const jetDrop = jetStart! - jetEnd!;

    // Sampled 600ms in, while stamina certainly still has ~2.2s of jet in it.
    expect(jetHud).toMatch(/jetting [\d.]+ cal\/s/);
    expect(jetHud).toContain('5× crawl');

    // Stamina caps sustained jetting at a ~29% duty cycle, so a 9s jet leg
    // costs roughly 9 * 2.3 = 21 cal against the crawl leg's 9 * 1.6 = 14.
    // Require a real margin so frame-timing noise cannot pass this for free,
    // but do not assume the full 4.0/s that only continuous jetting would give.
    expect(jetDrop).toBeGreaterThan(crawlDrop + 3);
    save('hunt_5_energy.png', await page.locator('#wrap').screenshot());
  });

  // The ink HUD row used to promise "predators can't see you" while the code
  // only halved the shark's detection range and never broke off its charge.
  test('inking reports what ink actually does', async ({ page }) => {
    await harness.mount(page, DIVE);
    await page.waitForTimeout(1800);
    const canvas = page.locator('#wrap canvas[role="application"]');
    await canvas.click({ position: { x: 20, y: 20 } });

    const readHud = () => page.evaluate(() => ((window as any).__hud() || '').replace(/ /g, ' '));

    // Three reserve dots before, two after — ink is a limited resource and the
    // HUD has to show the spend.
    const before = await readHud();
    expect(before).toMatch(/INK/);

    await page.keyboard.press('KeyI');
    await page.waitForTimeout(500);
    const inked = await readHud();

    // The row says what ink does, and no longer overclaims invisibility.
    expect(inked).toContain('INKED');
    expect(inked).toContain('harder to track');
    expect(inked).not.toMatch(/can.{0,2}t see you/);

    // Ink is temporary (3.2s), so the row must clear itself again.
    await page.waitForTimeout(3600);
    const cleared = await readHud();
    expect(cleared).not.toContain('INKED');
    save('hunt_6_ink.png', await page.locator('#wrap').screenshot());
  });

  // Substrate camouflage used to work identically 40 m up in open water,
  // because detectSubstrate samples X/Z only. Prove the falloff runs.
  test('camouflage fades when the animal leaves the bottom', async ({ page }) => {
    await harness.mount(page, DIVE);
    await page.waitForTimeout(2200);
    const canvas = page.locator('#wrap canvas[role="application"]');
    await canvas.click({ position: { x: 20, y: 20 } });

    const readHud = () => page.evaluate(() => ((window as any).__hud() || '').replace(/ /g, ' '));
    const CAMO_RE = /CAMO\s*(\d+)%/;
    const camo = async () => {
      const m = CAMO_RE.exec(await readHud());
      return m ? Number(m[1]) : null;
    };

    // Settle on the bottom: camo climbs as stationaryTime builds.
    await page.waitForTimeout(2500);
    const onFloor = await camo();
    expect(onFloor).not.toBeNull();
    expect(onFloor!).toBeGreaterThan(40);

    // Rise into open water and hold still there. Stillness is unchanged, so
    // any drop is the substrate falloff and nothing else.
    await page.keyboard.down('KeyQ');
    await page.waitForTimeout(2000);
    await page.keyboard.up('KeyQ');
    await page.waitForTimeout(2500);
    const aloft = await camo();
    const hud = await readHud();

    expect(aloft!).toBeLessThan(onFloor!);
    expect(hud).toContain('off the bottom');
    save('hunt_7_camo.png', await page.locator('#wrap').screenshot());
  });

  test('surfacing releases the WebGL context', async ({ page }) => {
    await harness.mount(page, DIVE);
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /End run/ }).click();
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => document.querySelectorAll('#wrap canvas[role="application"]').length);
    expect(after).toBe(0);
  });
});

/**
 * WebGL context loss — ordinary in the field (GPU driver reset, a tab restored on a
 * low-memory device, another page claiming contexts; browsers cap simultaneous
 * contexts and evict the oldest).
 *
 * Creation failure was already handled: the catch around initHuntSim3D sets
 * { hunt3DActive: false, _threeError: true, _threeLoaded: false }, which renders a
 * panel with a Retry button. Nothing was bound to `webglcontextlost`, so a context lost
 * AFTER the dive began left the hunt canvas black with no panel and no way back.
 */
test.describe('Cephalopod Lab — WebGL context loss', () => {
  test('a lost context during the hunt raises Retry, and Retry dives again', async ({ page }) => {
    test.setTimeout(120000);
    await harness.mount(page, DIVE, 'document.querySelector(\'#wrap canvas[role="application"]\')');
    await page.waitForTimeout(1200);

    const before = await page.evaluate(() => {
      const c = document.querySelector('#wrap canvas[role="application"]') as HTMLCanvasElement | null;
      const g: any = c && (c.getContext('webgl2') || c.getContext('webgl'));
      return { canvas: !!c, live: !!g && !g.isContextLost() };
    });
    expect(before.canvas, 'no hunt canvas before the loss').toBe(true);
    expect(before.live, 'no live GL context before the loss').toBe(true);

    const killed = await page.evaluate(() => {
      const c = document.querySelector('#wrap canvas[role="application"]') as HTMLCanvasElement;
      const g: any = c.getContext('webgl2') || c.getContext('webgl');
      const ext = g && g.getExtension('WEBGL_lose_context');
      if (!ext) return false;
      ext.loseContext();
      return true;
    });
    expect(killed, 'could not force a context loss').toBe(true);

    // The student must land on something they can act from.
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button'))
      .some((b) => /^retry$/i.test((b.textContent || '').trim())
        && (b as HTMLElement).offsetParent !== null),
      null, { timeout: 15000 });

    const after = await page.evaluate(() => ({
      retry: Array.from(document.querySelectorAll('button'))
        .filter((b) => /^retry$/i.test((b.textContent || '').trim()) && (b as HTMLElement).offsetParent !== null).length,
      warned: /WebGL failed to load or initialize/i.test(document.body.textContent || ''),
      deadCanvas: document.querySelectorAll('#wrap canvas[role="application"]').length
    }));
    console.log('after context loss:', JSON.stringify(after));
    expect(after.retry, 'the hunt went black with no way back').toBeGreaterThan(0);
    expect(after.warned, 'no explanation of what happened').toBe(true);

    // An unrecoverable panel is barely better than a black canvas: prove Retry works.
    // It clears the error and returns the student to the pre-dive screen, from which
    // the Dive control must be reachable again.
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button'))
        .find((x) => /^retry$/i.test((x.textContent || '').trim()) && (x as HTMLElement).offsetParent !== null);
      (b as HTMLElement).click();
    });
    await page.waitForFunction(() => !/WebGL failed to load or initialize/i.test(document.body.textContent || ''),
      null, { timeout: 15000 });

    const recovered = await page.evaluate(() => ({
      stillWarned: /WebGL failed to load or initialize/i.test(document.body.textContent || ''),
      canDive: Array.from(document.querySelectorAll('button'))
        .some((b) => /dive/i.test(b.textContent || '') && (b as HTMLElement).offsetParent !== null)
    }));
    console.log('after retry:', JSON.stringify(recovered));
    expect(recovered.stillWarned, 'Retry did not clear the error').toBe(false);
    expect(recovered.canDive, 'Retry cleared the error but left no way to dive again').toBe(true);
  });
});
