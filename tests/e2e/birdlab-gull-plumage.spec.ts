import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Gull ID plates: the same bird at first winter, adult winter and adult
// breeding, each drawn with the marks a birder uses for that age: scalloped
// or checkered young birds, pale adult eyes on the large gulls, white mirrors
// in black wingtips, winter head streaks, hoods, ear spots and bill marks.
test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const SPECIES = ['Herring Gull', 'Great Black-backed Gull', 'Ring-billed Gull', 'Laughing Gull', "Bonaparte's Gull", 'Iceland Gull', 'Glaucous Gull'];
const PALE_EYED = ['Herring Gull', 'Great Black-backed Gull', 'Ring-billed Gull', 'Glaucous Gull'];
const MIRRORS = ['Herring Gull', 'Great Black-backed Gull', 'Ring-billed Gull'];

test('each age carries the marks that identify it', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { birdLab: { view: 'gullId' } }, undefined, { expectCanvas: false });
  await page.waitForSelector('[data-gull-stage]');
  const seen: Record<string, any> = {};
  for (const name of SPECIES) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('[data-gull-stage]')).toHaveCount(3);
    seen[name] = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('clipPath')].map(c => c.id);
      const stages = Object.fromEntries([...document.querySelectorAll('[data-gull-stage]')].map(svg => {
        const has = (part: string) => !!svg.querySelector(`[data-gull-part="${part}"]`);
        const streaks = svg.querySelector('[data-gull-part="head-streaks"]');
        return [svg.getAttribute('data-gull-stage'), {
          iris: svg.querySelector('[data-gull-iris]')!.getAttribute('data-gull-iris'),
          parts: ['feet', 'primaries', 'mirrors', 'tertials', 'mottling', 'checker', 'carpal-bar', 'head-streaks', 'half-hood', 'ear-spot', 'gonys-spot', 'bill-ring'].filter(has),
          // Streaks are clipped to the head, never loose on the page.
          streaksClipped: !streaks || /url\(#glB-/.test(streaks.closest('[clip-path]')?.getAttribute('clip-path') || '')
        }];
      }));
      return { unique: new Set(ids).size === ids.length, stages };
    });
  }
  for (const name of SPECIES) {
    const { unique, stages } = seen[name];
    expect(unique, name).toBe(true);
    for (const stage of ['juv', 'win', 'br']) {
      expect(stages[stage].parts, name + ' ' + stage).toEqual(expect.arrayContaining(['feet', 'primaries']));
      expect(stages[stage].streaksClipped, name + ' ' + stage).toBe(true);
    }
    // First-winter birds: dark eyes, a patterned wing, no adult marks.
    expect(stages.juv.iris, name).toBe('dark');
    expect(stages.juv.parts.some((p: string) => ['mottling', 'checker'].includes(p)), name).toBe(true);
    for (const adultOnly of ['mirrors', 'tertials', 'gonys-spot', 'bill-ring']) expect(stages.juv.parts, name + ' juv').not.toContain(adultOnly);
    // Adults: tertial crescents; pale eyes only on the large gulls; mirrors in black tips.
    for (const stage of ['win', 'br']) {
      expect(stages[stage].parts, name).toContain('tertials');
      expect(stages[stage].iris !== 'dark', name + ' iris').toBe(PALE_EYED.includes(name));
      expect(stages[stage].parts.includes('mirrors'), name + ' mirrors').toBe(MIRRORS.includes(name));
    }
    expect(stages.br.parts, name).not.toContain('head-streaks');
  }
  expect(seen['Great Black-backed Gull'].stages.juv.parts).toContain('checker');
  expect(seen["Bonaparte's Gull"].stages.juv.parts).toContain('carpal-bar');
  expect(seen["Bonaparte's Gull"].stages.win.parts).toContain('ear-spot');
  expect(seen['Laughing Gull'].stages.win.parts).toContain('half-hood');
  for (const name of ['Herring Gull', 'Ring-billed Gull', 'Iceland Gull', 'Glaucous Gull']) expect(seen[name].stages.win.parts, name).toContain('head-streaks');
  for (const name of ['Herring Gull', 'Great Black-backed Gull', 'Iceland Gull', 'Glaucous Gull']) expect(seen[name].stages.br.parts, name).toContain('gonys-spot');
  expect(seen['Ring-billed Gull'].stages.br.parts).toContain('bill-ring');
  const axe = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-gull-stage]')!.closest('.rounded-lg'), { resultTypes: ['violations'] })).violations.map((v: any) => v.id));
  expect(axe).toEqual([]);
  expect(errors).toEqual([]);
});
