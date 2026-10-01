/**
 * The Virtual Dissection Lab's pointer path, driven end to end.
 *
 * WHY THIS EXISTS
 * Thirty-two rounds of review covered rendering, layout, accessibility and the keyboard, and the
 * pointer path had no test at all: nothing had ever driven a scalpel stroke from press to release
 * and checked that an incision was recorded. Reasoning about the code missed two things a real
 * drag found immediately - a refusal that told the student "a tap does not record technique" after
 * a genuine 18-step drag, and every message about the drag landing ~1000px below the canvas.
 *
 * The protocol gates each instrument behind a predict/perform/explain checkpoint whose options are
 * shuffled, so the helpers below answer by trying options until the gate's data-phase advances
 * rather than by index. The teaching corridor is found by asking the tool itself: hover a grid and
 * read the intent label it publishes on the canvas as _toolIntentState.
 */
import { test, expect, chromium } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_dissection.js',
  toolId: 'dissection',
  width: 1180,
  height: 900,
  appStyles: true,
  preScripts: ['stem_lab/stem_lab_module.js'],
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

async function clickByText(page: any, needle: string) {
  const hit = await page.evaluate((text: string) => {
    const button = Array.from(document.querySelectorAll('button'))
      .find((candidate) => (candidate.textContent || '').includes(text)) as HTMLElement | undefined;
    if (!button) return false;
    button.click();
    return true;
  }, needle);
  await page.waitForTimeout(380);
  return hit;
}

async function gatePhase(page: any) {
  return await page.evaluate(() => {
    const gate = document.querySelector('.diss-learning-check');
    return gate ? gate.getAttribute('data-phase') + '|' + gate.getAttribute('data-learning-action') : null;
  });
}

/** A correct answer does not remove the panel, it advances the phase - so that is the signal. */
async function answerUntilAdvanced(page: any) {
  const count = await page.evaluate(() => document.querySelectorAll('.diss-learning-check__option').length);
  for (let index = 0; index < count; index++) {
    const before = await gatePhase(page);
    await page.evaluate((idx: number) => {
      const options = Array.from(document.querySelectorAll('.diss-learning-check__option')) as HTMLElement[];
      if (options[idx]) options[idx].click();
    }, index);
    await page.waitForTimeout(400);
    if ((await gatePhase(page)) !== before) return true;
  }
  return false;
}

async function reachPerform(page: any, action: string) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const phase = await gatePhase(page);
    if (!phase) return true;
    if (phase === 'perform|' + action) return true;
    if (!(await answerUntilAdvanced(page))) return false;
  }
  return false;
}

async function canvasBox(page: any) {
  await page.locator('[data-diss-canvas]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(220);
  return (await page.locator('[data-diss-canvas]').boundingBox())!;
}

async function procedure(page: any) {
  return await page.evaluate(() => {
    const data: any = (window as any).__ctx?.toolData?.dissection || {};
    const step = (data.procedureByLayer || {})[data.activeLayer] || {};
    const echo = document.querySelector('[data-diss-gesture-echo]');
    return {
      inspected: !!step.inspected,
      incisionStarted: !!step.incisionStarted,
      feedback: echo ? (echo.textContent || '').trim() : null,
    };
  });
}

test('a mouse drag cuts along the teaching corridor and records the incision', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 900 });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForSelector('[data-diss-canvas]', { timeout: 30000 });

  await clickByText(page, 'Align to ventral view');
  expect(await reachPerform(page, 'inspect'), 'reach the inspect step').toBe(true);

  let box = await canvasBox(page);
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.42);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.47);
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.52);
  await page.mouse.up();
  await page.waitForTimeout(450);
  expect((await procedure(page)).inspected, 'the probe records the orientation').toBe(true);

  await clickByText(page, 'Scalpel');
  expect(await reachPerform(page, 'scalpel'), 'reach the scalpel step').toBe(true);

  // Ask the tool where its own corridor is rather than hard-coding coordinates that would drift
  // with any change to specimen geometry.
  box = await canvasBox(page);
  const readyPoints: Array<{ fx: number; fy: number }> = [];
  let labelled = 0;
  for (let row = 0; row <= 12; row++) {
    for (let col = 0; col <= 8; col++) {
      const fx = 0.30 + (0.40 * col) / 8;
      const fy = 0.22 + (0.56 * row) / 12;
      await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
      await page.waitForTimeout(8);
      const label = await page.evaluate(() => {
        const canvas: any = document.querySelector('[data-diss-canvas]');
        return canvas._toolIntentState ? canvas._toolIntentState.label : null;
      });
      if (label) labelled++;
      if (label === 'READY') readyPoints.push({ fx, fy });
    }
  }
  // A scan that reads nothing would let every assertion below pass vacuously.
  expect(labelled, 'the scan must read intent labels').toBeGreaterThan(50);
  expect(readyPoints.length, 'a teaching corridor must exist to cut along').toBeGreaterThan(4);

  const lane = readyPoints.slice().sort((a, b) => a.fy - b.fy);
  const laneFx = lane[Math.floor(lane.length / 2)].fx;
  const spine = lane.filter((point) => Math.abs(point.fx - laneFx) < 0.001);
  expect(spine.length, 'the corridor must run some distance').toBeGreaterThan(3);

  await page.mouse.move(box.x + box.width * spine[0].fx, box.y + box.height * spine[0].fy);
  await page.mouse.down();
  for (let index = 1; index < spine.length; index++) {
    const previous = spine[index - 1];
    const current = spine[index];
    await page.mouse.move(box.x + box.width * current.fx, box.y + box.height * ((previous.fy + current.fy) / 2));
    await page.mouse.move(box.x + box.width * current.fx, box.y + box.height * current.fy);
    await page.waitForTimeout(28);
  }
  await page.mouse.up();
  await page.waitForTimeout(600);

  const after = await procedure(page);
  expect(after.incisionStarted, 'the stroke records an incision').toBe(true);
  // Round 30: a refused stroke used to be told it was a tap. Whatever happens, never that.
  expect(after.feedback || '').not.toContain('A tap does not record technique');
  // Round 31: whatever the lab says about the drag begins where the specimen is, rather than
  // ~1000px below it. Only the START is asserted, and that is a real limit rather than a lazy
  // assertion: a 780px canvas in a 900px viewport leaves ~60px, which holds the two lines of a
  // refusal but not the four of a completed-technique report with its precision and control
  // scores. The short cautions - the ones that explain why a drag did nothing - fit; a long
  // success report runs past the fold and the student scrolls for the detail.
  const echoBox = await page.locator('[data-diss-gesture-echo]').boundingBox();
  expect(echoBox, 'the gesture echo is rendered').not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(echoBox!.y, 'the echo starts on screen with the canvas').toBeLessThan(viewport.height);
  const canvasBottom = (await page.locator('[data-diss-canvas]').boundingBox())!.y
    + (await page.locator('[data-diss-canvas]').boundingBox())!.height;
  expect(echoBox!.y - canvasBottom, 'and sits directly under it').toBeLessThan(60);
});

test('a touch drag cuts too, once the instrument may act', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 420, height: 900 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  try {
    await harness.mount(page, {}, undefined, { expectCanvas: false });
    await page.waitForSelector('[data-diss-canvas]', { timeout: 30000 });
    const touchAction = () => page.evaluate(
      () => getComputedStyle(document.querySelector('[data-diss-canvas]') as HTMLElement).touchAction);

    // While no instrument may act the page keeps vertical panning, so a student can still scroll
    // past a canvas that is most of their screen.
    expect(await touchAction(), 'the page keeps panning while nothing can act').toBe('pan-y');

    await clickByText(page, 'Align to ventral view');
    expect(await reachPerform(page, 'inspect'), 'reach the inspect step').toBe(true);

    const cdp = await context.newCDPSession(page);
    let box = await canvasBox(page);
    // The inspect step commits through canvasClick, so it is a tap. A vertical drag here is taken
    // as a scroll: the sequence is cancelled and no click is synthesised.
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: box.x + box.width * 0.5, y: box.y + box.height * 0.42 }],
    });
    await page.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(600);
    expect((await procedure(page)).inspected, 'a tap records the orientation').toBe(true);

    await reachPerform(page, 'inspect');
    await clickByText(page, 'Scalpel');
    expect(await reachPerform(page, 'scalpel'), 'reach the scalpel step').toBe(true);
    // Now the canvas must claim the gesture, or the browser scrolls away the midline stroke.
    expect(await touchAction(), 'the canvas claims the gesture once the scalpel can act').toBe('none');

    await page.evaluate(() => {
      const win: any = window;
      win.__pointerLog = [];
      const canvas = document.querySelector('[data-diss-canvas]')!;
      ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((type) => {
        canvas.addEventListener(type, () => { win.__pointerLog.push(type); }, true);
      });
    });

    box = await canvasBox(page);
    const x = box.x + box.width * 0.5;
    const yStart = box.y + box.height * 0.28;
    const yEnd = box.y + box.height * 0.72;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: yStart }] });
    for (let step = 1; step <= 18; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x, y: yStart + ((yEnd - yStart) * step) / 18 }],
      });
      await page.waitForTimeout(24);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(700);

    const log: string[] = await page.evaluate(() => (window as any).__pointerLog || []);
    expect(log.filter((entry) => entry === 'pointermove').length, 'the stroke must actually travel').toBeGreaterThan(10);
    expect(log, 'the browser must not steal the stroke').not.toContain('pointercancel');
    expect((await procedure(page)).incisionStarted, 'the incision registers from touch').toBe(true);
  } finally {
    await context.close();
    await browser.close();
  }
});

test('the probe tells a dragging student something that works', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 420, height: 900 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  try {
    await harness.mount(page, {}, undefined, { expectCanvas: false });
    await page.waitForSelector('[data-diss-canvas]', { timeout: 30000 });
    await clickByText(page, 'Align to ventral view');
    expect(await reachPerform(page, 'inspect'), 'reach the inspect step').toBe(true);
    const box = await canvasBox(page);

    // Find a point the tool itself reports as a visible structure - the thing the old message
    // asked the student to do, which it then refused anyway.
    let target: { fx: number; fy: number } | null = null;
    for (let row = 0; row <= 10 && !target; row++) {
      for (let col = 0; col <= 6 && !target; col++) {
        const fx = 0.32 + (0.36 * col) / 6;
        const fy = 0.24 + (0.52 * row) / 10;
        await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
        await page.waitForTimeout(28);
        const organ = await page.evaluate(() => ((window as any).__ctx?.toolData?.dissection || {}).hoveredOrgan || null);
        if (organ) target = { fx, fy };
      }
    }
    expect(target, 'a visible structure must exist to press on').not.toBeNull();

    const cdp = await context.newCDPSession(page);
    const x = box.x + box.width * target!.fx;
    const y = box.y + box.height * target!.fy;

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 10; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + step * 6 }] });
      await page.waitForTimeout(22);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(800);

    const afterDrag = await page.evaluate(() => {
      const feedback = ((window as any).__ctx?.toolData?.dissection?.procedureFeedback) || {};
      return String(feedback.message || '');
    });
    // The drag cannot record this step - tracing needs two pins that do not exist yet - so the
    // message must name the gesture that CAN, not repeat the instruction the student just followed.
    expect(afterDrag, 'must not ask again for what was just done').not.toContain('Move the probe tip onto a visible structure');
    expect(afterDrag).toContain('Press and release');

    // And that gesture must actually work, on the same pixel.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(800);
    expect((await procedure(page)).inspected, 'the advice the lab gives must record the step').toBe(true);
  } finally {
    await context.close();
    await browser.close();
  }
});
