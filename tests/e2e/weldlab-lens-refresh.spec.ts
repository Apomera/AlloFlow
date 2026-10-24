import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-lens-refresh');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
test.describe.configure({ retries: 0, timeout: 120_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, width: number, state: object, contrast = false) {
  await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
  if (contrast) await page.evaluate(() => {
    document.body.classList.add('theme-contrast');
    (window as any).__ctx.isContrast = true; (window as any).__ctx.theme = 'contrast'; (window as any).__rerender();
  });
}
async function inspect(page: any, name: string, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
  await page.locator(selector).screenshot({ path: resolve(output, name + '.png') });
  const result = await page.evaluate(async (selector: string) => {
    const audit = await (window as any).axe.run(document.querySelector(selector), { runOnly: { type: 'rule',
      values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'nested-interactive'] } });
    return { overflow: document.documentElement.scrollWidth - innerWidth, overflowNodes: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('[data-noise-chart-scroll],.overflow-x-auto,.preview-bar')).slice(0, 12).map(el => ({ tag: el.tagName, className: el.getAttribute('class'), right: el.getBoundingClientRect().right })), violations: audit.violations.map((v: any) => ({ id: v.id,
      nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })) };
  }, selector);
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(result, null, 2));
  expect(result.overflow).toBeLessThanOrEqual(1); expect(result.violations).toEqual([]);
}




const modifierSpecs: [string, any, any][] = [
  ['allAround', {type:'fillet',side:'arrow',size:'1/4',allAround:true}, {type:'fillet',side:'arrow',size:'1/4'}],
  ['field', {type:'fillet',side:'arrow',size:'1/4',fieldWeld:true}, {type:'fillet',side:'arrow',size:'1/4'}],
  ['both', {type:'fillet',side:'both',size:'1/4'}, {type:'fillet',side:'arrow',size:'1/4'}],
  ['lp', {type:'fillet',side:'arrow',size:'3/16',length:'2',pitch:'6'}, {type:'fillet',side:'arrow',size:'3/16'}],
  ['flush', {type:'vGroove',side:'arrow',contour:'flush'}, {type:'vGroove',side:'arrow'}],
  ['convex', {type:'vGroove',side:'arrow',contour:'convex'}, {type:'vGroove',side:'arrow'}],
  ['concave', {type:'fillet',side:'arrow',size:'1/4',contour:'concave'}, {type:'fillet',side:'arrow',size:'1/4'}],
  ['finish', {type:'vGroove',side:'arrow',contour:'flush',finish:'G'}, {type:'vGroove',side:'arrow',contour:'flush'}],
  ['tail', {type:'fillet',side:'arrow',size:'1/4',tail:'GMAW'}, {type:'fillet',side:'arrow',size:'1/4'}],
  ['right', {type:'fillet',side:'arrow',size:'1/4',arrowAt:'right'}, {type:'fillet',side:'arrow',size:'1/4',arrowAt:'left'}]
];
const lengthValues = [1/64,1/32,3/64,1/16,5/64,3/32,1/8,5/32,3/16,7/32,1/4,5/16,3/8,7/16,1/2,5/8,3/4,7/8,1,1.5];
for (const width of [1280, 390]) {
  test('Modifier lens changes only the authored detail and keeps matching drawing scales at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view:'symbolsReader', sr_view:'library', sym2_lib_side:'both' });
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    for (const [id, example, baseline] of modifierSpecs) {
      await page.locator('[data-symbol-modifier-pick]').selectOption(id);
      await expect(page.locator('[data-symbol-modifier-lens]')).toHaveAttribute('data-symbol-modifier-lens', id);
      const data = await page.evaluate(({ example, baseline }: any) => {
        const core = (window as any).__WeldLabCore.sym2;
        const cards = (slot: string) => JSON.parse(document.querySelector('[data-symbol-modifier-card="' + slot + '"]')!.getAttribute('data-spec')!);
        const diagrams = [...document.querySelectorAll('[data-symbol-modifier-diagram]')] as SVGSVGElement[];
        const lineWidths = diagrams.map(el => el.querySelector('[data-part="ref"] line')!.getBoundingClientRect().width);
        return { example:cards('example'), baseline:cards('baseline'), expectedExample:core.normSpec(example), expectedBaseline:core.normSpec(baseline), viewBoxes:diagrams.map(el=>el.getAttribute('viewBox')), lineWidths };
      }, { example, baseline });
      expect(data.example).toEqual(data.expectedExample); expect(data.baseline).toEqual(data.expectedBaseline);
      expect(data.viewBoxes[0]).toBe(data.viewBoxes[1]); expect(Math.abs(data.lineWidths[0]-data.lineWidths[1])).toBeLessThan(0.2);
    }
    await page.locator('[data-symbol-modifier-pick]').selectOption('tail');
    const specs = await page.locator('[data-symbol-modifier-card]').evaluateAll(els=>els.map(el=>el.getAttribute('data-spec')));
    await page.locator('[data-symbol-modifier-highlight-toggle]').focus(); await page.keyboard.press('Space');
    await expect(page.locator('[data-symbol-modifier-lens]')).toHaveAttribute('data-highlight','false');
    expect(await page.locator('[data-symbol-modifier-card]').evaluateAll(els=>els.map(el=>el.getAttribute('data-spec')))).toEqual(specs);
    await page.locator('[data-symbol-modifier-highlight-toggle]').click();
    await inspect(page,'symbol-modifiers-'+width,'[data-symbol-modifier-lens]');
    expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved); expect(errors).toEqual([]);
  });
  test('Length readings distinguish exact conversion from rounding at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page,width,{view:'mathBlueprint',mb_mode:'browse',mb_sect:'arithmetic'});
    const saved = await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    await page.locator('[data-math-length-compare]').focus(); await page.keyboard.press('Space');
    const axisErrors = await page.locator('[data-math-length-axis]').evaluateAll(els => els.map(el => { const n = Number(el.getAttribute('data-math-length-axis')); const rect = el.getBoundingClientRect(); const at = n === 0 ? rect.left : n === 1.5 ? rect.right : rect.left + rect.width/2; const tick = document.querySelector('[data-math-length-tick="'+(n*16)+'"]')!.getBoundingClientRect(); return Math.abs(at-tick.left); }));
    expect(Math.max(...axisErrors)).toBeLessThan(1);
    for (const [index,inches] of lengthValues.entries()) {
      await page.locator('[data-math-length-preset]').selectOption(String(index));
      const data = await page.locator('[data-math-length]').evaluate((el:any)=>({inches:Number(el.dataset.inches),mm:Number(el.dataset.mm),rounded:Number(el.dataset.roundedInches),error:Number(el.dataset.errorInches)}));
      const rounded = Math.round(inches*16)/16;
      expect(data.inches).toBe(inches); expect(data.mm).toBeCloseTo(inches*25.4,10); expect(data.rounded).toBe(rounded); expect(data.error).toBe(rounded-inches);
      await expect(page.locator('[data-math-length-exact-marker]')).toHaveAttribute('data-x',String(20+400*inches));
      await expect(page.locator('[data-math-length-rounded-marker]')).toHaveAttribute('data-x',String(20+400*rounded));
    }
    await page.locator('[data-math-length-preset]').selectOption('1');
    await inspect(page,'length-readings-'+width,'[data-math-length]');
    await page.locator('[data-math-length-compare]').click();
    await expect(page.locator('[data-math-length-rounded-marker]')).toHaveCount(0);
    expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved); expect(errors).toEqual([]);
  });
  test('Shielding paths illustrate both flow extremes without changing consumable work at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page,width,{view:'consumables',cons_sect:'gases',cons_mode:'browse',cons_sc_score:3,cons_sc_picked:1});
    const saved = await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    const objects = await page.locator('[data-cons-shield-object]').evaluateAll(els=>els.map(el=>el.outerHTML));
    const reference = await page.locator('[data-cons-shield-reference]').textContent();
    for (const [mode,coverage] of [['low','partial'],['recommended','continuous'],['high','turbulent']]) {
      await page.locator('[data-cons-shield-mode="'+mode+'"]').focus(); await page.keyboard.press('Space');
      await expect(page.locator('[data-cons-shield]')).toHaveAttribute('data-cons-shield',mode);
      await expect(page.locator('[data-cons-shield-envelope]')).toHaveAttribute('data-coverage',coverage);
      if (mode==='recommended') await expect(page.locator('[data-cons-shield-inflow]')).toHaveCount(0);
      else expect(await page.locator('[data-cons-shield-inflow]').count()).toBeGreaterThan(0);
      expect(await page.locator('[data-cons-shield-object]').evaluateAll(els=>els.map(el=>el.outerHTML))).toEqual(objects);
      expect(await page.locator('[data-cons-shield-reference]').textContent()).toBe(reference);
    }
    await inspect(page,'shielding-gas-'+width,'[data-cons-shield]');
    expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved); expect(errors).toEqual([]);
  });
}
test('Modifier, conversion and shielding lenses remain readable in high contrast',async({page})=>{
  for(const [name,state,selector] of [
    ['symbol-modifiers',{view:'symbolsReader',sr_view:'library'},'[data-symbol-modifier-lens]'],
    ['length-readings',{view:'mathBlueprint',mb_mode:'browse',mb_sect:'arithmetic'},'[data-math-length]'],
    ['shielding-gas',{view:'consumables',cons_sect:'gases',cons_mode:'browse'},'[data-cons-shield]']
  ] as const){
    await mount(page,390,state,true);
    if(name==='symbol-modifiers')await page.locator('[data-symbol-modifier-pick]').selectOption('finish');
    if(name==='length-readings'){await page.locator('[data-math-length-preset]').selectOption('0');await page.locator('[data-math-length-compare]').click();}
    if(name==='shielding-gas')await page.locator('[data-cons-shield-mode="low"]').click();
    await inspect(page,name+'-contrast',selector);
  }
});
test('Local preview routes expose all three new lenses',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.goto('http://127.0.0.1:8741/tmp/weld-review/index.html?pass=lenses#lengths');
  await expect(page.locator('[data-math-length]')).toBeVisible();
  await page.getByRole('button',{name:'Symbol modifiers',exact:true}).click();await expect(page.locator('[data-symbol-modifier-lens]')).toBeVisible();
  await page.getByRole('button',{name:'Shielding gas paths',exact:true}).click();await expect(page.locator('[data-cons-shield]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
