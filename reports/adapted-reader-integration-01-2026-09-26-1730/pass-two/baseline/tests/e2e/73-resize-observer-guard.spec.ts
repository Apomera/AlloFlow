import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Bootloader ResizeObserver guard (2026-09-07).
 *
 * Chrome fires "ResizeObserver loop completed with undelivered notifications" as a
 * window ErrorEvent whenever an observer callback changes layout in the frame it was
 * notified — a canvas sized from its container inside the callback is enough. AlloFlow
 * drops that message in its own two handlers, but the Gemini Canvas host logs it as
 * "[GLOBAL] ResizeObserver loop …" from its own hook, ahead of ours, so the only fix is
 * to stop the browser emitting it: the bootloader wraps window.ResizeObserver once and
 * delivers every callback on the next animation frame.
 *
 * Nothing else in the repo covers this. The jsdom gate
 * (tests/resize_observer_loop_guard.test.js) pins the block's presence in all three
 * bootloader copies; jsdom has neither rAF nor layout, so only a browser can show that
 * the notice actually stops and that callbacks still arrive. GlHarness does not load the
 * bootloader, so the guard is injected here exactly as it ships.
 *
 * Two failures this guards against, both real:
 *   - the notice returns (someone unwraps the observer, or reorders the block after the
 *     error hook so a tool constructs an observer first);
 *   - the deferral breaks a tool — 15 STEM tools resize a canvas inside their callback,
 *     and a canvas that grows every frame is a bug this codebase has actually shipped
 *     (Geometry World, ~8px per 220ms, a ResizeObserver feeding its own output back in).
 */

test.describe.configure({ timeout: 240_000 });

// Run the code that ships, not a copy of it.
const ANTI = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const GUARD_START = "if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'function' && !window.__alloResizeObserverDeferred) {";
const GUARD_END = '// Uncaught errors and rejections never reached the ring buffer';
const guardStart = ANTI.indexOf(GUARD_START);
const guardEnd = ANTI.indexOf(GUARD_END, guardStart);
const GUARD = ANTI.slice(guardStart, guardEnd);

test('the guard block is extractable from the shipped bootloader', () => {
  expect(guardStart, 'guard present in AlloFlowANTI.txt').toBeGreaterThan(-1);
  expect(guardEnd).toBeGreaterThan(guardStart);
  expect(GUARD).toContain('window.ResizeObserver = __AlloDeferredResizeObserver;');
});

/**
 * Chrome delivers the loop notice as a window ErrorEvent with no exception object, so
 * page.on('console') and page.on('pageerror') never see it — the listener has to live in
 * the page, which is also where the Canvas host's own logger hooks it.
 */
async function runSelfFeedingObserver(page: Page, withGuard: boolean) {
  await page.setContent('<div id="box" style="width:100px;height:40px;background:#ccc"></div>');
  await page.evaluate(() => {
    const w = window as any;
    w.__winErrors = [];
    window.addEventListener('error', (e) => { w.__winErrors.push(String(e.message || '')); });
  });
  if (withGuard) await page.addScriptTag({ content: GUARD });
  // Every notification grows the observed element: the classic shape behind the notice.
  await page.evaluate(() => {
    const w = window as any;
    w.__calls = 0;
    const box = document.getElementById('box') as HTMLElement;
    const ro = new ResizeObserver((entries) => {
      w.__calls++;
      if (w.__calls < 6) box.style.width = (entries[0].contentRect.width + 10) + 'px';
    });
    ro.observe(box);
  });
  await page.waitForTimeout(800);
  return await page.evaluate(() => {
    const w = window as any;
    return {
      calls: w.__calls,
      finalWidth: (document.getElementById('box') as HTMLElement).offsetWidth,
      patched: !!w.__alloResizeObserverDeferred,
      notices: (w.__winErrors as string[]).filter((m) => /ResizeObserver loop/.test(m)).length,
      otherErrors: (w.__winErrors as string[]).filter((m) => !/ResizeObserver loop/.test(m)),
    };
  });
}

test('WITHOUT the guard the browser really does emit the notice', async ({ page }) => {
  // If this ever stops reproducing, the guarded case below proves nothing.
  const r = await runSelfFeedingObserver(page, false);
  expect(r.patched).toBe(false);
  expect(r.notices).toBeGreaterThan(0);
});

test('WITH the guard the notice is gone and the callbacks still arrive', async ({ page }) => {
  const r = await runSelfFeedingObserver(page, true);
  expect(r.patched).toBe(true);
  expect(r.notices).toBe(0);
  expect(r.otherErrors).toEqual([]);
  expect(r.calls).toBeGreaterThanOrEqual(6); // deferral must not swallow deliveries
  expect(r.finalWidth).toBe(150);            // and the resizes really happened
});

test('disconnect cancels a pending deferred callback', async ({ page }) => {
  await page.setContent('<div id="box" style="width:100px;height:40px"></div>');
  await page.addScriptTag({ content: GUARD });
  const late = await page.evaluate(async () => {
    const w = window as any; w.__late = 0;
    const box = document.getElementById('box') as HTMLElement;
    const ro = new ResizeObserver(() => { w.__late++; });
    ro.observe(box);
    box.style.width = '200px';
    await new Promise((r) => setTimeout(r, 0));
    ro.disconnect();                        // before the deferred frame runs
    await new Promise((r) => setTimeout(r, 300));
    return w.__late;
  });
  expect(late).toBe(0);
});

test('unobserve drops that target from a pending batch, matching native semantics', async ({ page }) => {
  await page.setContent('<div id="a" style="width:100px;height:40px"></div><div id="b" style="width:100px;height:40px"></div>');
  await page.addScriptTag({ content: GUARD });
  const seen: string[] = await page.evaluate(async () => {
    const w = window as any; w.__targets = [];
    const a = document.getElementById('a') as HTMLElement;
    const b = document.getElementById('b') as HTMLElement;
    const ro = new ResizeObserver((entries) => {
      entries.forEach((e) => w.__targets.push((e.target as HTMLElement).id));
    });
    ro.observe(a); ro.observe(b);
    a.style.width = '200px'; b.style.width = '200px';
    await new Promise((r) => setTimeout(r, 0));
    ro.unobserve(a);                        // native would drop a's queued record too
    await new Promise((r) => setTimeout(r, 300));
    return w.__targets;
  });
  expect(seen).toContain('b');
  expect(seen).not.toContain('a');
});

/**
 * Blast radius. These four are confirmed to render a canvas on a default mount and to
 * resize it from inside a ResizeObserver callback, so they are the tools whose timing
 * the guard actually changes. Deferring must not make a canvas oscillate or grow.
 * (areamodel, numberline, moneyMath and logicLab also resize a canvas in-callback but
 * need state to reach one, so they are not mountable bare here.)
 */
const CANVAS_TOOLS: Array<{ id: string; file: string; canvases: number }> = [
  { id: 'fractions', file: 'stem_lab/stem_tool_fractions.js', canvases: 1 },
  { id: 'funcGrapher', file: 'stem_lab/stem_tool_funcgrapher.js', canvases: 1 },
  { id: 'cell', file: 'stem_lab/stem_tool_cell.js', canvases: 1 },
  { id: 'physics', file: 'stem_lab/stem_tool_physics.js', canvases: 1 },
];

for (const tool of CANVAS_TOOLS) {
  test(`${tool.id}: canvas stays stable and silent with the guard installed`, async ({ page }) => {
    const harness = new GlHarness({
      toolFile: tool.file,
      toolId: tool.id,
      width: 1100,
      height: 800,
      probes: GUARD, // injected before the tool loads, as the bootloader would
    });
    await harness.start();
    try {
      await harness.mount(page, {}, undefined, { expectCanvas: false });
      await page.evaluate(() => {
        const w = window as any; w.__notices = [];
        window.addEventListener('error', (e) => {
          if (/ResizeObserver loop/.test(String(e.message || ''))) w.__notices.push(String(e.message));
        });
      });
      const read = () => page.evaluate(() => ({
        patched: !!(window as any).__alloResizeObserverDeferred,
        sizes: (Array.from(document.querySelectorAll('#wrap canvas')) as HTMLCanvasElement[])
          .map((c) => `${c.width}x${c.height}@${c.offsetWidth}x${c.offsetHeight}`),
        notices: ((window as any).__notices || []).length,
      }));
      const first = await read();
      await page.waitForTimeout(1800);
      const second = await read();

      expect(first.patched, 'guard active').toBe(true);
      expect(first.sizes.length, 'canvas count').toBe(tool.canvases);
      expect(first.sizes.every((s) => !/^0x|x0@|@0x|x0$/.test(s)), 'no zero-sized canvas').toBe(true);
      expect(second.sizes, 'dimensions stable, no runaway resize loop').toEqual(first.sizes);
      expect(second.notices, 'no loop notice while mounted').toBe(0);
    } finally {
      await harness.destroy(page).catch(() => {});
      await harness.stop().catch(() => {});
    }
  });
}
