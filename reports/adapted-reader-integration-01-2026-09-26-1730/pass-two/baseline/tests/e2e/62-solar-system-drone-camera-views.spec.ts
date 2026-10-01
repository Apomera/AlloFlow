import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const wide = new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1180,height:900,appStyles:true});
const phone = new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:340,height:820,appStyles:true});
test.beforeAll(async () => { await wide.start(); await phone.start(); });
test.afterAll(async () => { await wide.stop(); await phone.stop(); });
test.afterEach(async ({page}) => { await wide.destroy(page); });
// Includes software-rendered zoom-limit sweeps and native fullscreen transitions.
test.describe.configure({timeout:300000});

for (const mode of [{planet:'mars',mobile:false},{planet:'earth',mobile:true},{planet:'jupiter',mobile:false}]) {
  test(mode.planet+' supports camera presets, calibrated framing and scene focus', async ({page}, info) => {
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize(mode.mobile?{width:340,height:820}:{width:1180,height:900});
    const harness = mode.mobile?phone:wide;
    await harness.mount(page,{solarSystem:{selectedPlanet:'stem.solar_sys.'+mode.planet,viewTab:'drone',tutorialDismissed:true,paused:true}},'document.querySelector("[data-drone-camera-bar]")');
    const canvas = page.locator('[data-drone-canvas]');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.getElementById('descent-status'),null,{timeout:45000});
    const follow=page.getByRole('button',{name:'Follow camera',exact:true});
    const pilot=page.getByRole('button',{name:'Pilot camera',exact:true});
    const survey=page.getByRole('button',{name:'Survey camera',exact:true});
    const focus=page.getByRole('button',{name:'Scene focus',exact:true});
    await expect(follow).toHaveAttribute('aria-pressed','true');
    await survey.click();
    await expect(survey).toHaveAttribute('aria-pressed','true');
    await expect(follow).toHaveAttribute('aria-pressed','false');
    await expect(canvas).toHaveAttribute('data-drone-camera-view','survey');
    await expect(canvas).toHaveAttribute('data-drone-camera-fov','52.0');
    expect(Number(await canvas.getAttribute('data-drone-camera-elevation'))).toBeGreaterThan(15);
    await expect(canvas).toBeFocused();
    await expect(page.locator('#drone-camera-help')).toContainText('North stays at the top');
    const wider=page.getByRole('button',{name:'Wider survey view',exact:true});
    const closer=page.getByRole('button',{name:'Closer survey view',exact:true});
    const ruler=page.locator('[data-drone-survey-ruler]');
    await expect(ruler).toHaveAttribute('data-meters',/^[1-9]/);
    const metersPerPixel = async () => Number(await ruler.getAttribute('data-meters'))/Number(await ruler.getAttribute('data-pixels'));
    const initialScale=await metersPerPixel();
    const initialElevation=Number(await canvas.getAttribute('data-drone-camera-elevation'));
    await closer.click(); await closer.click();
    await expect(canvas).toHaveAttribute('data-drone-survey-zoom','1.5');
    await expect.poll(metersPerPixel).toBeLessThan(initialScale*0.9);
    expect(Number(await canvas.getAttribute('data-drone-camera-elevation'))).toBeLessThan(initialElevation);
    if(mode.planet==='mars') {
      for(let i=0;i<6;i++) await closer.click();
      await expect(closer).toBeDisabled();
      await expect(canvas).toHaveAttribute('data-drone-survey-zoom','3');
      for(let i=0;i<9;i++) await wider.click();
      await expect(wider).toBeDisabled();
      await expect(canvas).toHaveAttribute('data-drone-survey-zoom','0.75');
      for(let i=0;i<3;i++) await closer.click();
    }
    const rulerBounds=await ruler.evaluate(el=>({available:el.clientWidth,line:el.querySelector('[data-survey-scale-line]')!.getBoundingClientRect().width}));
    expect(rulerBounds.line).toBeLessThanOrEqual(rulerBounds.available);

    await pilot.click();
    await expect(page.locator('[data-drone-survey-controls]')).toBeHidden();
    await expect(canvas).toHaveAttribute('data-rover-view','first-person');
    await expect(canvas).toHaveAttribute('data-drone-camera-fov','70.0');
    await expect(canvas).toHaveAttribute('data-drone-camera-elevation','0.0');
    await page.keyboard.press('KeyV');
    await expect(follow).toHaveAttribute('aria-pressed','true');
    // A held V key must not oscillate between cameras on key repeat.
    await canvas.dispatchEvent('keydown',{key:'v',repeat:true});
    await expect(follow).toHaveAttribute('aria-pressed','true');
    await page.locator('[data-drone-command="n"]').click();
    const challenge = page.locator('[data-drone-navigation-card]');
    await expect(challenge).toBeVisible();
    await focus.click();
    await expect(focus).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('[data-drone-map-panel]')).toBeHidden();
    await expect(page.locator('[data-drone-action-dock]')).toBeHidden();
    if(mode.planet==='jupiter') await expect(page.locator('#hud-spectrometer')).toBeHidden();
    await expect(challenge).toBeVisible();
    await expect(page.locator('[data-drone-camera-bar]')).toBeVisible();
    await focus.click();
    await expect(page.locator('[data-drone-map-panel]')).toBeVisible();
    await expect(page.locator('[data-drone-action-dock]')).toBeVisible();
    if(mode.planet==='jupiter') await expect(page.locator('#hud-spectrometer')).toBeVisible();
    await expect(challenge).toBeVisible();
    await page.locator('[data-drone-command="n"]').click();
    await survey.click();
    await focus.click();
    if (mode.mobile) {
      await expect(page.locator('[data-drone-sound-caption]')).toBeHidden();
      for(const button of [follow,pilot,survey,focus,wider,closer]) {
        const box=await button.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x+box!.width).toBeLessThanOrEqual(340);
      }
    }
    await expect(canvas).toHaveAttribute('data-drone-survey-zoom','1.5');
    await expect(page.locator('[data-drone-survey-controls]')).toBeVisible();
    await page.locator('#drone-fullscreen-container').screenshot({path:info.outputPath(mode.planet+'-survey-focus.png'),timeout:60000});
    const beforeFullscreenHeight=(await canvas.boundingBox())!.height;
    const beforeFullscreenScale=await metersPerPixel();
    await page.locator('[data-drone-fullscreen-toggle]').click();
    await expect(page.locator('[data-drone-fullscreen-toggle]')).toHaveAttribute('aria-pressed','true');
    await expect.poll(async () => page.evaluate(() => {
      const bar = document.querySelector('[data-drone-camera-bar]')!.getBoundingClientRect();
      const stage = document.querySelector('[data-drone-canvas]')!.getBoundingClientRect();
      return stage.bottom <= bar.top + 1 && bar.bottom <= innerHeight + 1 && bar.left >= 0 && bar.right <= innerWidth + 1;
    })).toBe(true);
    const fullscreenHeight=(await canvas.boundingBox())!.height;
    const expectedFullscreenScale=beforeFullscreenScale*beforeFullscreenHeight/fullscreenHeight;
    await expect.poll(async()=>Math.abs((await metersPerPixel())/expectedFullscreenScale-1)).toBeLessThan(0.05);
    // Different helper text may wrap to a different height in fullscreen.
    await pilot.click();
    await expect(canvas).toHaveAttribute('data-drone-camera-fov','70.0');
    await expect(page.locator('[data-drone-camera-bar]')).toBeInViewport();
    await page.locator('[data-drone-fullscreen-toggle]').click();
    await expect(page.locator('[data-drone-fullscreen-toggle]')).toHaveAttribute('aria-pressed','false');
    expect((await page.evaluate(()=>(window as any).__events.errors)).filter((x:string)=>!/ResizeObserver loop/.test(x))).toEqual([]);
    await harness.destroy(page);
    await expect(page.locator('[data-drone-camera-bar]')).toHaveCount(0);
  });
}
