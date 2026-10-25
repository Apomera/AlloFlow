import { test } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const out = resolve('tmp/weld-wcag-reader-contrast');
const fixtures = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-wcag-coverage-audit.json'), 'utf8'));
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js', preScripts: ['stem_lab/stem_lab_module.js', 'app_styles_module.js'], appStyles: true, layout: 'document' });
test.describe.configure({ timeout: 900_000, retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('Collect real host-style contrast candidates and accessibility-tree names', async ({ page }) => {
  const rows: any[] = [];
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const fixture of fixtures) {
    await harness.mount(page, { weldLab: fixture.state }, undefined, { expectCanvas: false });
    await page.evaluate(() => {
      const host = document.createElement('div'); document.body.append(host); const w = window as any;
      w.ReactDOM.render(w.React.createElement(w.AlloModules.AppStyles.AppStyles), host);
    });
    await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
    await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.height = 'auto'; el.style.display = 'block'; });
    const cdp = await page.context().newCDPSession(page);
    for (const contrast of [false, true]) {
      if (contrast) await page.evaluate(() => { document.body.classList.add('theme-contrast'); Object.assign((window as any).__ctx, { isContrast: true, theme: 'contrast' }); (window as any).__rerender(); });
      await page.waitForTimeout(250);
      const measurement = await page.evaluate(() => {
        const rgba = (s: string) => { const n = s.match(/[\d.]+/g)?.map(Number) || []; return n.length >= 3 ? [n[0], n[1], n[2], n[3] ?? 1] : null; };
        const lum = (c: number[]) => c.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
        const mix = (a: number[], b: number[]) => [0, 1, 2].map(i => a[i] * a[3] + b[i] * (1 - a[3])).concat(1);
        const ratio = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
        const low: any[] = [], gradients: any[] = [], svg: any[] = [];
        const path = (el: Element) => el.id ? '#' + el.id : el.tagName.toLowerCase() + [...el.attributes].filter(a => a.name.startsWith('data-')).map(a => '[' + a.name + '="' + a.value + '"]').join('');
        for (const el of document.querySelectorAll('#wrap *')) {
          const s = getComputedStyle(el), r = el.getBoundingClientRect();
          if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0 || el.closest('.sr-only,[hidden],[aria-hidden="true"]')) continue;
          if (el instanceof SVGTextElement) { svg.push({ text: el.textContent, html: el.outerHTML, fill: s.fill, stroke: s.stroke, font: s.fontSize, parentLabel: el.closest('svg')?.getAttribute('aria-label') }); continue; }
          if (!(el instanceof HTMLElement)) continue;
          const text = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
          if (!text || !/[a-zA-Z0-9]/.test(text)) continue;
          const foreground = rgba(s.color); if (!foreground) continue;
          const chain: any[] = []; let gradient = false;
          for (let p: HTMLElement | null = el; p; p = p.parentElement) {
            const ps = getComputedStyle(p), color = rgba(ps.backgroundColor);
            if (ps.backgroundImage !== 'none') gradient = true;
            chain.push({ node: path(p), color: ps.backgroundColor, image: ps.backgroundImage });
            if (color && color[3] === 1) break;
          }
          let bg = [255, 255, 255, 1]; for (const p of [...chain].reverse()) { const c = rgba(p.color); if (c) bg = mix(c, bg); }
          const threshold = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.666 && +s.fontWeight >= 700) ? 3 : 4.5;
          const entry = { text, target: path(el), html: el.outerHTML.slice(0, 700), foreground: s.color, background: bg, ratio: ratio(mix(foreground, bg), bg), threshold, chain, inactive: !!el.closest(':disabled,[aria-disabled="true"]') };
          if (gradient) gradients.push(entry); else if (entry.ratio < threshold && !entry.inactive) low.push(entry);
        }
        return { low, gradients, svg };
      });
      const ax = await cdp.send('Accessibility.getFullAXTree');
      const accessible = ax.nodes.filter((n: any) => !n.ignored && ['image', 'slider', 'application', 'progressbar', 'meter', 'status', 'radiogroup', 'table'].includes(n.role?.value)).map((n: any) => ({ id: n.nodeId, role: n.role.value, name: n.name?.value, description: n.description?.value, value: n.value?.value, properties: n.properties }));
      rows.push({ name: fixture.name, state: fixture.state, contrast, ...measurement, accessible });
    }
    await cdp.detach();
    writeFileSync(resolve(out, 'computed-contrast-and-ax.json'), JSON.stringify(rows, null, 2));
    console.log(fixture.name + ': ' + rows.slice(-2).map(r => r.low.length + ' solid candidates/' + r.gradients.length + ' gradient targets').join(', '));
  }
});
