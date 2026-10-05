import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

test.use({ video: 'off', trace: 'off', screenshot: 'off' });
test.describe.configure({ retries: 0, mode: 'serial' });
test('measure baseline and current Epidemic document overflow at 320px', async ({ page }, info) => {
  const records: any[] = [];
  const baseline = resolve('reports/stem-refinement-team-2026-10-01/source-before/stem_tool_epidemic.js');
  const log = Array.from({ length: 8 }, (_, n) => ({ c: n, i: 30, t: 2.5, rE: n / 100, reg: 'declining' }));
  for (const variant of ['baseline', 'current']) {
    if (variant === 'baseline') process.env.STEM_GL_SUBSTITUTE = 'stem_lab/stem_tool_epidemic.js=' + baseline;
    else delete process.env.STEM_GL_SUBSTITUTE;
    const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_epidemic.js', toolId: 'epidemicSim', width: 900, height: 800, layout: 'document', appStyles: true });
    try {
      await harness.start();
      await page.setViewportSize({ width: 320, height: 900 });
      await harness.mount(page, { epidemicSim: { tab: 'inquiry', tabsViewed: { inquiry: true }, inquiry: { contact: 50, intervention: 30, transmissibility: 2.5, hypothesis: 'Working explanation', explanation: 'Saved evidence explanation', understood: true, log } } }, undefined, { expectCanvas: false });
      await page.addStyleTag({ content: '#wrap{width:100%;max-width:900px;box-sizing:border-box}' });
      await page.evaluate(() => document.fonts.ready);
      const served = await (await page.request.get(harness.url + '/stem_lab/stem_tool_epidemic.js')).body();
      const expected = readFileSync(variant === 'baseline' ? baseline : 'stem_lab/stem_tool_epidemic.js');
      expect(served.equals(expected)).toBe(true);
      const cssUrl = await page.locator('link[rel="stylesheet"]').getAttribute('href');
      const css = await (await page.request.get(harness.url + cssUrl)).body();
      async function measure(stage: string) {
        return page.evaluate(({ variant, stage }) => {
          const selector = (e: Element) => e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '');
          function row(e: Element): any {
            const r = e.getBoundingClientRect(), c = getComputedStyle(e);
            const ancestors: any[] = []; let p = e.parentElement;
            while (p) { const a = p.getBoundingClientRect(), s = getComputedStyle(p); ancestors.push({ selector: selector(p), left: a.left, right: a.right, width: a.width, clientWidth: p.clientWidth, scrollWidth: p.scrollWidth, overflowX: s.overflowX, overflowY: s.overflowY, position: s.position, clip: s.clip, clipPath: s.clipPath, contain: s.contain }); p = p.parentElement; }
            return { selector: selector(e), text: e.textContent?.trim().slice(0, 100), left: r.left, right: r.right, width: r.width, clientWidth: e.clientWidth, scrollWidth: e.scrollWidth, display: c.display, minWidth: c.minWidth, computedWidth: c.width, overflowX: c.overflowX, overflowY: c.overflowY, whiteSpace: c.whiteSpace, gridTemplateColumns: c.gridTemplateColumns, flexWrap: c.flexWrap, transform: c.transform, position: c.position, clip: c.clip, clipPath: c.clipPath, contain: c.contain, offsetParent: (e as HTMLElement).offsetParent ? { selector: selector((e as HTMLElement).offsetParent!), bounds: (e as HTMLElement).offsetParent!.getBoundingClientRect().toJSON() } : null, ancestors };
          }
          const elements = [...document.querySelectorAll('#wrap, #wrap *')];
          const offViewport = elements.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).map(row);
          const explicit = elements.filter(e => e.matches('#wrap,[data-epidemic-tool],[data-epidemic-triage],[role="tabpanel"],header,table,button,[data-epidemic-inquiry-recovery]') || /grid|flex/.test(getComputedStyle(e).display) || e.querySelector(':scope > table')).map(row);
          return { variant, stage, innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollX, dpr: devicePixelRatio, fontsStatus: document.fonts.status, offViewport, explicit, inquiry: (window as any).__toolData.epidemicSim.inquiry };
        }, { variant, stage });
      }
      const before = await measure('before-log');
      await page.getByRole('button', { name: /Log observation/ }).focus();
      await page.keyboard.press('Enter');
      const after = await measure('after-log');
      records.push({ variant, servedSourceSha256: createHash('sha256').update(served).digest('hex'), cssUrl, cssSha256: createHash('sha256').update(css).digest('hex'), before, after });
    } finally { await harness.destroy(page); await harness.stop(); delete process.env.STEM_GL_SUBSTITUTE; }
  }
  const body = JSON.stringify(records, null, 2);
  writeFileSync('reports/stem-refinement-team-2026-10-01/epidemic/overflow-diagnostic-20261001.json', body + '\n');
  await info.attach('baseline-current-overflow-measurements', { body, contentType: 'application/json' });
});
