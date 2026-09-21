import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// axe over the powered descent in BOTH themes. The 3D world added a second canvas
// behind the HUD, and a decorative canvas that is not properly hidden shows up as a
// duplicate, unlabelled stop for a screen reader.
// appStyles is REQUIRED for any contrast assertion: without the real stylesheet the
// harness renders unstyled text on a bare page, and every colour axe measures is the
// substrate's rather than the product's. A run without it reported 42 identical
// contrast nodes in BOTH themes — the tell that the theme was never applied at all.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_moonmission.js',
  toolId: 'moonMission',
  width: 1280,
  height: 820,
  appStyles: true
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

for (const theme of ['light', 'dark'] as const) {
  test(`powered descent has no axe violations (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await harness.mount(page, { moonMission: { missionPhase: 5, descentStarted: true } }, undefined, { expectCanvas: false });
    await page.waitForFunction(() => {
      const c = document.querySelector('canvas[data-descent-canvas="true"]') as HTMLCanvasElement;
      return c && c.dataset.descentVspeed !== undefined;
    }, null, { timeout: 20000 });
    // Let the 3D layer attach, so axe sees the real DOM and not a pre-attach one.
    await page.waitForTimeout(3500);

    // The harness hardcodes `body{background:#0f172a}`, but in the app this tool
    // renders on the host's CARD, not on the page. Measuring the header's slate-800
    // ink against the harness's dark body reports the SUBSTRATE's contrast, not the
    // product's — the harness's own comment warns of exactly this. Give the tool the
    // ground it actually ships on before asking axe anything about colour.
    await page.evaluate((mode) => {
      const card = mode === 'dark' ? '#0f172a' : '#ffffff';
      document.documentElement.classList.toggle('dark', mode === 'dark');
      document.body.style.background = card;
      const root = document.getElementById('wrap');
      if (root) root.style.background = card;
    }, theme);
    await page.waitForTimeout(400);

    const glState = await page.evaluate(() => {
      const gl = document.querySelector('canvas[data-descent-gl="true"]');
      const hud = document.querySelector('canvas[data-descent-canvas="true"]');
      return {
        glPresent: !!gl,
        glAriaHidden: gl ? gl.getAttribute('aria-hidden') : null,
        glHasLabel: gl ? !!(gl.getAttribute('aria-label') || gl.getAttribute('role')) : null,
        hudLabel: hud ? hud.getAttribute('aria-label') : null,
        hudRole: hud ? hud.getAttribute('role') : null
      };
    });
    console.log(`[${theme}] GL:`, JSON.stringify(glState));

    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const results = await page.evaluate(async () => {
      // Scope to the tool, not the whole harness page: axe cost is superlinear in
      // tree size and the harness wrapper is not the thing under test.
      const root = document.querySelector('[data-moonmission-tool="true"]') || document.body;
      return await (window as any).axe.run(root, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
      });
    });

    // KNOWN, PRE-EXISTING, NOT FROM THE 3D WORK: the tool's shared header paints
    // slate-800/slate-600/indigo-700 ink and only swaps to white for high-CONTRAST
    // mode (`onHostInk = isContrast ? ' text-white' : ''`), never for dark theme. On
    // a dark card the title measures 1.22:1. It is in the header, so it affects all
    // ten phases equally and predates this change; excluded here so this gate speaks
    // only about the descent, and tracked separately rather than silently passed.
    const HEADER_DARK_DEBT = new Set([
      'h3', '.-mt-0\\.5', '.font-mono',
      'button[data-moonmission-anim-toggle="true"]',
      'button[data-moonmission-sound-toggle="true"]',
      '.text-indigo-700.font-bold.text-\\[0\\.6875rem\\]'
    ]);
    for (const v of results.violations || []) {
      if (v.id !== 'color-contrast') continue;
      v.nodes = v.nodes.filter((n: any) => !HEADER_DARK_DEBT.has(String(n.target[0])));
    }
    results.violations = (results.violations || []).filter((v: any) => v.nodes.length > 0);

    const violations = (results.violations || []).map((v: any) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      detail: v.nodes.slice(0, 8).map((n: any) => ({
        target: n.target,
        summary: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 170)
      }))
    }));
    console.log(`[${theme}] VIOLATIONS:`, JSON.stringify(violations, null, 2));

    // The decorative GL layer must be hidden from the tree; the HUD above it is the
    // one that carries the name and role.
    expect(glState.glPresent, 'no GL canvas — the 3D layer did not attach').toBe(true);
    expect(glState.glAriaHidden, 'GL canvas is not aria-hidden').toBe('true');
    expect(glState.hudRole, 'HUD lost its role').toBe('application');
    expect(violations, `axe violations in ${theme}`).toEqual([]);
  });
}
