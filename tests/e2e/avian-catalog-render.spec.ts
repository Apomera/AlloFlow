import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// Sweep the existing activities after changing their shared discovery surfaces.
// Simulators have separate real-WebGL coverage; this checks catalog mounting,
// React render failures, and document overflow in the remaining activity views.
const output = resolve(process.env.AVIAN_CATALOG_REPORT || 'reports/avian-richness-2026-10-17');
test.use({ video: 'off' });
for (const tool of ['raptor', 'bird'] as const) {
  test.describe(`${tool} catalog render sweep`, () => {
    test.describe.configure({ timeout: 300_000, mode: 'serial', retries: 0 });
    const toolId = tool === 'raptor' ? 'raptorHunt' : 'birdLab';
    const filename = tool === 'raptor' ? 'stem_tool_raptorhunt' : 'stem_tool_birdlab';
    const source = readFileSync(`stem_lab/${filename}.js`, 'utf8');
    const views = tool === 'raptor'
      ? [...source.slice(source.indexOf('var SECTIONS = ['), source.indexOf('var CATEGORIES = [')).matchAll(/id: '([^']+)'/g)].map(m => m[1]).filter(v => v !== 'hunt')
      : ['menu', ...new Set([...source.matchAll(/if \(view === '([A-Za-z0-9_]+)'\) return/g)].map(m => m[1]))].filter(v => v !== 'observatory3d');
    const harness = new GlHarness({ toolId, toolFile: `stem_lab/${filename}.js`, preScripts: ['stem_lab/stem_lab_module.js'], width:1280, height:960, appStyles:true, layout:'document' });
    test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
    test.afterAll(async () => { await harness.stop(); });
    test.afterEach(async ({ page }) => { await harness.destroy(page); });
    for (const width of [1280,390]) {
      test(`activity views render at ${width}px`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.setViewportSize({width, height:960});
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await harness.mount(page, tool === 'raptor' ? {raptorHunt:{activeSection:'hub'}} : {birdLab:{view:'menu',blSceneMotion:false}}, undefined, {expectCanvas:false});
        await page.addStyleTag({content:'#wrap{width:100%;height:auto;display:block}'});
        const results: any[] = [];
        const birdWorkbenches: Record<string, string> = {
          optics: '[data-birdlab-optics-workbench]',
          photo: '[data-birdlab-photo-workbench]',
          flightPatterns: '[data-birdlab-flight-workbench]',
        };
        for (const view of views) {
          await page.evaluate(({toolId,tool,view}) => {
            const w=window as any;
            if (tool === 'bird') {
              // BirdLab initializes its local view state at mount. Changing
              // __toolData.view and rerendering leaves the old activity visible.
              w.__destroy();
              w.__mount({birdLab:{view,blSceneMotion:false}});
            } else {
              w.__toolData[toolId] = Object.assign({}, w.__toolData[toolId], {activeSection:view});
              w.__rerender();
            }
          }, {toolId,tool,view});
          // A destroy/mount starts a fresh asynchronous React render. Await its
          // actual DOM before measuring, rather than sampling the empty root.
          await page.waitForFunction(() => !!document.querySelector('#wrap')?.firstElementChild, undefined, {timeout:10_000});
          await page.waitForTimeout(80);
          results.push(await page.evaluate(({view,workbenchSelector}) => {
            const root = document.querySelector('#wrap')!;
            const content = (root.textContent || '').replace(/\s+/g, ' ').trim();
            // Record a compact fingerprint of what rendered, not just its length.
            let hash = 2166136261;
            for (let i = 0; i < content.length; i++) hash = Math.imul(hash ^ content.charCodeAt(i), 16777619);
            return {
              view, characters:content.length,
              firstHeading:root.querySelector('h1,h2,h3,[role="heading"]')?.textContent?.trim() || '',
              contentFingerprint:(hash >>> 0).toString(16).padStart(8,'0'),
              birdMenuPresent:!!root.querySelector('[data-birdlab-menu]'),
              expectedWorkbench:workbenchSelector || null,
              workbenchPresent:workbenchSelector ? !!root.querySelector(workbenchSelector) : null,
              overflow:document.documentElement.scrollWidth-innerWidth,
              errors:(window as any).__events.errors.splice(0),
            };
          }, {view,workbenchSelector:tool === 'bird' ? birdWorkbenches[view] : undefined}));
        }
        writeFileSync(resolve(output, `${tool}-catalog-${width}.json`), JSON.stringify({tool,width,views:results,errors},null,2));
        expect(results.length).toBeGreaterThan(90);
        expect(results.filter(item => item.characters < 100 || item.errors.length > 0)).toEqual([]);
        expect(errors).toEqual([]);
        if (tool === 'bird') {
          const menu = results.find(item => item.view === 'menu');
          expect(menu.birdMenuPresent).toBe(true);
          // A sweep that renders the menu 119 times must fail even if its text
          // length, overflow, and console output all look healthy.
          expect(results.filter(item => item.view !== 'menu' &&
            (item.birdMenuPresent || item.contentFingerprint === menu.contentFingerprint))).toEqual([]);
          for (const view of Object.keys(birdWorkbenches)) {
            const rendered = results.find(item => item.view === view);
            expect(rendered, `The catalog must include ${view}`).toBeDefined();
            expect(rendered.workbenchPresent, `${view} must render its own workbench`).toBe(true);
          }
        }
        // Wide internal rails/tables may scroll, but must not widen the document.
        expect(results.filter(item => item.overflow > 1)).toEqual([]);
      });
    }
  });
}
