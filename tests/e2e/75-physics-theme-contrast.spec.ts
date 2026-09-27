import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * The Physics Simulator's results panels, contrast-checked in the themes the host
 * actually produces. Nothing else covers this: the jsdom suites have no layout,
 * and GlHarness hardcodes `isDark: false, isContrast: false`, so every existing
 * browser test renders exactly one theme.
 *
 * The host's per-theme contract (stem_lab_module.js ~1857):
 *   default  — the tool paints its own light surface.
 *   dark     — the host wraps the tool in a WHITE card (#fff, color-scheme:light),
 *              because these tools are authored for a light substrate.
 *   contrast — deliberately NO card: pure black ground, theme class on <main>.
 * So a panel has to hold up on a light card AND on black, and the tool paints its
 * own root colour underneath either. This reproduces that wrapper and measures.
 *
 * ★Only panels with a SOLID background are asserted. The header's recommendation
 * button sits on a Tailwind gradient, which is `background-image`, not
 * `background-color` — a computed-style walk cannot see it and reports ~1:1 for
 * text that is plainly readable on screen. That is a known blind spot (axe shares
 * it); measuring it here would encode a false failure, so it is excluded by
 * design rather than by omission.
 */

test.describe.configure({ timeout: 240_000 });

const PANELS = [
  { sel: '[data-physics-last-flight]', name: 'Last flight' },
  { sel: '[data-physics-run-log]', name: 'Experiment log' },
];
const THEMES = ['default', 'dark', 'contrast'] as const;
const AA_NORMAL = 4.5;

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js',
  toolId: 'physics',
  width: 1200,
  height: 900,
  appStyles: true, // without the real stylesheet every ratio here is fiction
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

/** Rebuild the host's per-theme wrapper, which the harness does not provide. */
async function installThemeSwitch(page: Page) {
  await page.evaluate(() => {
    const wrap = document.getElementById('wrap') as HTMLElement;
    const main = document.createElement('main');
    wrap.parentNode!.insertBefore(main, wrap);
    main.appendChild(wrap);
    const card = document.createElement('div');
    main.insertBefore(card, wrap);
    card.appendChild(wrap);
    (window as any).__setTheme = (t: string) => {
      const ctx = (window as any).__ctx;
      ctx.isDark = t === 'dark';
      ctx.isContrast = t === 'contrast';
      ctx.theme = t;
      main.className = t === 'default' ? '' : 'theme-' + t;
      card.setAttribute('style', t === 'dark'
        ? 'background:#ffffff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : (t === 'contrast' ? 'background:#000000;color:#ffffff;padding:10px' : ''));
      (window as any).__rerender();
    };
  });
}

/** Worst text-vs-background ratio inside a panel, skipping transparent stacks. */
const WORST = `(sel) => {
  const lum = (c) => { const s = c.map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }); return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2]; };
  const parse = (s) => { const m = String(s).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { rgb: p.slice(0,3), a: p.length > 3 ? p[3] : 1 }; };
  const bgOf = (el) => { let n = el; while (n && n !== document.documentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const c = parse(cs.backgroundColor); if (c && c.a > 0.9) return c.rgb; n = n.parentElement; } return null; };
  const root = document.querySelector(sel);
  if (!root) return { missing: true };
  let worst = null, checked = 0;
  for (const n of Array.from(root.querySelectorAll('td,th,div,span,p,b'))) {
    const txt = (n.textContent || '').trim();
    if (!txt || n.children.length > 0) continue;
    const cs = getComputedStyle(n);
    const fg = parse(cs.color); if (!fg) continue;
    const bg = bgOf(n); if (!bg) continue;   // gradient or fully transparent stack
    const L1 = lum(fg.rgb), L2 = lum(bg);
    const ratio = (Math.max(L1,L2) + 0.05) / (Math.min(L1,L2) + 0.05);
    checked++;
    if (!worst || ratio < worst.ratio) worst = { ratio: +ratio.toFixed(2), text: txt.slice(0,44), color: cs.color, bg: 'rgb(' + bg.join(',') + ')' };
  }
  return { worst, checked };
}`;

test('Last flight and Experiment log stay readable in default, dark and contrast', async ({ page }) => {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { timeout: 30_000 });

  // Two landed flights, so both panels have real content to measure.
  await page.evaluate(() => {
    (window as any).__ctx.setLabToolData((p: any) => ({ ...p, physics: { ...p.physics, angle: 45, velocity: 25, gravity: 9.8, mass: 1, airResist: false, simSpeed: 1 } }));
  });
  for (const v of [25, 35]) {
    await page.evaluate((vel) => {
      (window as any).__ctx.setLabToolData((p: any) => ({ ...p, physics: { ...p.physics, velocity: vel } }));
    }, v);
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Launch!' }).click();
    await page.waitForFunction(() => !(document.getElementById('physicsCanvas') as any)._launched, null, { timeout: 30_000 });
  }

  await installThemeSwitch(page);

  for (const theme of THEMES) {
    await page.evaluate((t) => (window as any).__setTheme(t), theme);
    await page.waitForTimeout(300);
    for (const panel of PANELS) {
      const r: any = await page.evaluate(`(${WORST})(${JSON.stringify(panel.sel)})`);
      expect(r.missing, `${panel.name} rendered in ${theme}`).toBeFalsy();
      // Guard against a vacuous pass: a panel whose text we could not resolve a
      // background for proves nothing about its readability.
      expect(r.checked, `${panel.name} had measurable text in ${theme}`).toBeGreaterThan(3);
      expect(
        r.worst.ratio,
        `${panel.name} in ${theme}: "${r.worst.text}" is ${r.worst.ratio}:1 (${r.worst.color} on ${r.worst.bg})`,
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  }
});

test('velocity and range graphs keep text, axes, curves and markers visible in every theme', async ({ page }) => {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { timeout: 30_000 });
  await page.evaluate(() => {
    (window as any).__ctx.setLabToolData((p: any) => ({ ...p, physics: {
      ...p.physics, angle: 30, velocity: 10, gravity: 9.8, mass: 1,
      airResist: false, simSpeed: 1, showGraphs: true,
    } }));
  });
  await page.getByRole('button', { name: 'Launch!' }).click();
  await page.waitForFunction(() => !!(window as any).__ctx.toolData.physics.lastFlight, null, { timeout: 30_000 });
  await expect(page.locator('svg[data-physics-graph]')).toHaveCount(3);
  await installThemeSwitch(page);

  for (const theme of THEMES) {
    await page.evaluate((t) => (window as any).__setTheme(t), theme);
    await expect(page.locator('#physics-fs-outer')).toHaveAttribute('data-physics-theme', theme === 'default' ? 'light' : theme);
    const graphs = await page.evaluate(() => {
      const rgb = (value: string) => {
        const match = value.match(/^rgba?\(([^)]+)\)$/);
        if (!match) throw new Error('Cannot resolve graph color: ' + value);
        return match[1].split(',').slice(0, 3).map(Number);
      };
      const lum = (c: number[]) => {
        const s = c.map(v => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
      };
      return Array.from(document.querySelectorAll<SVGSVGElement>('svg[data-physics-graph]')).map(svg => {
        // Graphs own a solid background. Measure SVG fill and stroke explicitly:
        // checking CSS text color alone misses unreadable chart labels/lines.
        const background = getComputedStyle(svg).backgroundColor;
        if (background === 'rgba(0, 0, 0, 0)') throw new Error('Graph surface is transparent');
        const bgLum = lum(rgb(background));
        return {
          name: svg.dataset.physicsGraph,
          labels: svg.querySelectorAll('text').length,
          axes: svg.querySelectorAll('line').length,
          curves: svg.querySelectorAll('path').length,
          elements: Array.from(svg.querySelectorAll('text,line,path,circle')).map(node => {
            const cs = getComputedStyle(node);
            const color = node.tagName === 'text' || node.tagName === 'circle' ? cs.fill : cs.stroke;
            const fgLum = lum(rgb(color));
            return {
              kind: node.tagName,
              label: (node.textContent || '').slice(0, 40),
              color, background,
              ratio: (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05),
            };
          }),
        };
      });
    });
    expect(graphs.map(graph => graph.name)).toEqual(['vx', 'vy', 'range']);
    for (const graph of graphs) {
      expect(graph.labels, `${theme} ${graph.name} labels measured`).toBeGreaterThanOrEqual(5);
      expect(graph.axes, `${theme} ${graph.name} axes measured`).toBeGreaterThanOrEqual(2);
      expect(graph.curves, `${theme} ${graph.name} curve measured`).toBe(1);
      for (const mark of graph.elements) {
        const required = theme === 'contrast' ? 7 : mark.kind === 'text' ? AA_NORMAL : 3;
        expect(mark.ratio,
          `${theme} ${graph.name} ${mark.kind} ${mark.label}: ${mark.color} on ${mark.background}`,
        ).toBeGreaterThanOrEqual(required);
      }
    }
  }
});
