import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
test.use({video:'off'});

test.describe('Raptor smooth flight and practice trail', () => {
  test.describe.configure({mode:'serial',timeout:240000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:660,appStyles:true,probes:'window.AlloPostFXEnabled=false;'});
  test.beforeAll(async()=>{await harness.start();});
  test.afterAll(async()=>{await harness.stop();});
  test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.setViewportSize({width:920,height:1000});
    await page.addInitScript(()=>{
      let time=1000,next=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      performance.now=()=>time;
      window.requestAnimationFrame=cb=>{const id=next++;callbacks.set(id,cb);return id;};
      window.cancelAnimationFrame=id=>callbacks.delete(id);
      (window as any).stepPractice=(ms:number)=>{time+=ms;const pending=[...callbacks.values()];callbacks.clear();pending.forEach(cb=>cb(time));};
    });
  });
  async function mount(page:any,quality:string){
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'open',flightSession:{speciesId:'peregrine',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('environment',{windSpeed:0,cloudCover:0.15,dayPhase:0.44});c._rhCommand('assist');});
  }
  test('smooths keyboard and pointer input, clears it on pause, and limits shadow work',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await mount(page,'balanced');
    const result=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const step=(window as any).stepPractice,before=c._rhSnapshot();
      c._rhCommand('hold',{key:'d',pressed:true});step(1000/60);const onset=c._rhSnapshot();
      for(let i=0;i<29;i++)step(1000/60);const banking=c._rhSnapshot();
      c._rhCommand('hold',{key:'d',pressed:false});
      for(let i=0;i<30;i++)step(1000/60);
      return {before,onset,banking,settled:c._rhSnapshot()};
    });
    expect(result.onset.steeringTurn).toBeGreaterThan(0);expect(result.onset.steeringTurn).toBeLessThan(0.5);
    expect(result.banking.wingBankFlex).toBeGreaterThan(0.02);expect(result.banking.wingBankFlex).toBeLessThan(0.08);
    expect(Math.abs(result.settled.wingBankFlex)).toBeLessThan(0.006);
    expect(Math.abs(result.settled.steeringTurn)).toBeLessThan(0.001);
    expect(result.settled.shadowRefreshCount-result.before.shadowRefreshCount).toBeGreaterThan(10);
    expect(result.settled.shadowRefreshCount-result.before.shadowRefreshCount).toBeLessThan(28);
    expect(result.settled.renderedFlightFrames-result.before.renderedFlightFrames).toBe(60);
    const box=(await page.locator('[data-raptor-canvas]').boundingBox())!;
    const before=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot());
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+90,box.y+box.height/2-20);
    const queued=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot());
    expect(queued.headingRadians).toBe(before.headingRadians);expect(queued.pendingPointerYaw).toBeGreaterThan(0);
    const moved=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{(window as any).stepPractice(25);return c._rhSnapshot();});
    expect(moved.headingRadians).toBeGreaterThan(queued.headingRadians);expect(moved.pendingPointerYaw).toBeLessThan(queued.pendingPointerYaw);
    await page.mouse.up();
    const paused=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('pause');const before=c._rhSnapshot();(window as any).stepPractice(60000);const after=c._rhSnapshot();c._rhCommand('pause');(window as any).stepPractice(16);return {before,after,resumed:c._rhSnapshot()};});
    expect(paused.before.pendingPointerYaw).toBe(0);expect(paused.before.steeringTurn).toBe(0);
    expect(paused.after.shadowRefreshCount).toBe(paused.before.shadowRefreshCount);expect(paused.after.raptorPosition).toEqual(paused.before.raptorPosition);
    expect(paused.resumed.headingRadians).toBeCloseTo(paused.before.headingRadians,6);expect(errors).toEqual([]);
  });
  test('flies a complete trail, pauses its progress, and starts another without resetting flight',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await mount(page,'low');
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();
    await page.getByRole('button',{name:'Flight trail',exact:true}).click();
    await expect(page.getByRole('button',{name:'Flight trail',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.evaluate(()=>{(window as any).stepPractice(16);});
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/flight-trail.png',timeout:90000});
    await page.emulateMedia({reducedMotion:'reduce'});
    const pause=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('pause');const before=c._rhSnapshot();(window as any).stepPractice(60000);const after=c._rhSnapshot();c._rhCommand('pause');return {before,after};});
    expect(pause.after.practiceTrailIndex).toBe(pause.before.practiceTrailIndex);expect(pause.after.raptorPosition).toEqual(pause.before.raptorPosition);
    const finished=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      for(let i=0;i<500 && c._rhSnapshot().practiceTrailActive;i++){
        const s=c._rhSnapshot(),g=s.practiceNextGate,bearing=Math.atan2(g.x-s.raptorPosition.x,-(g.z-s.raptorPosition.z));
        const error=Math.atan2(Math.sin(bearing-s.headingRadians),Math.cos(bearing-s.headingRadians));
        for(const [key,pressed] of [['d',error>0.035],['a',error<-.035],['e',g.y-s.raptorPosition.y>0.7],['q',s.raptorPosition.y-g.y>0.7]])c._rhCommand('hold',{key,pressed});
        (window as any).stepPractice(40);
      }
      for(const key of ['d','a','e','q'])c._rhCommand('hold',{key,pressed:false});
      return c._rhSnapshot();
    });
    expect(finished.reducedMotion).toBe(true);expect(finished.wingBankFlex).toBe(0);expect(Math.abs(finished.tailLift)).toBeLessThan(0.001);expect(finished.practiceTrailComplete).toBe(true);expect(finished.practiceTrailPassed).toBe(5);expect(finished.practiceTrailScore).toBeGreaterThanOrEqual(5);expect(finished.drawCalls).toBeLessThan(150);
    await expect(page.getByRole('group',{name:'Flight trail progress'})).toContainText('Trail finished');
    await expect(page.locator('.rh-practice-pip[data-state=passed],.rh-practice-pip[data-state=centered]')).toHaveCount(5);
    await expect(page.locator('.rh-practice-score')).toHaveText(finished.practiceTrailScore+' / 10 points');
    await expect(page.locator('.rh-practice-best')).toHaveText('Best this flight: '+finished.practiceTrailScore+' / 10 · 1 completed');
    await expect(page.locator('.rh-practice-coach')).not.toBeEmpty();
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{for(let i=0;i<145;i++)(window as any).stepPractice(50);c._rhCommand('pause');});
    await expect(page.getByRole('group',{name:'Flight trail progress'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Fly trail again',exact:true})).toBeDisabled();
    await page.setViewportSize({width:420,height:900});await page.addStyleTag({content:'#wrap{width:420px}'});
    const resultFit=await page.locator('.rh-practice-hud').evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement!.getBoundingClientRect();return {left:r.left-p.left,right:p.right-r.right,overflow:el.scrollWidth-el.clientWidth};});
    expect(resultFit.left).toBeGreaterThanOrEqual(0);expect(resultFit.right).toBeGreaterThanOrEqual(0);expect(resultFit.overflow).toBeLessThanOrEqual(1);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/trail-result-narrow.png',timeout:90000});
    const beforeRetry=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot());
    await page.getByRole('button',{name:'Fly trail again',exact:true}).focus();await page.keyboard.press('Enter');
    await expect(page.locator('[data-raptor-canvas]')).toBeFocused();
    const restarted=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot());
    expect(restarted.raptorPosition).toEqual(beforeRetry.raptorPosition);expect(restarted.practiceTrailBestScore).toBe(finished.practiceTrailScore);expect(restarted.practiceTrailAttempts).toBe(1);expect(restarted.practiceTrailIndex).toBe(0);expect(restarted.practiceTrailScore).toBe(0);
    await expect(page.locator('.rh-practice-pip[aria-current=step]')).toHaveCount(1);
    await expect(page.locator('.rh-practice-pip[data-state=waiting]')).toHaveCount(4);
    await page.setViewportSize({width:420,height:900});await page.addStyleTag({content:'#wrap{width:420px}'});
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:HTMLCanvasElement)=>Math.abs(c.width-c.clientWidth))).toBeLessThan(2);
    await page.evaluate(()=>{(window as any).stepPractice(16);});
    const fit=await page.locator('.rh-practice-hud').evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement!.getBoundingClientRect();return {left:r.left-p.left,right:p.right-r.right,overflow:el.scrollWidth-el.clientWidth};});
    expect(fit.left).toBeGreaterThanOrEqual(0);expect(fit.right).toBeGreaterThanOrEqual(0);expect(fit.overflow).toBeLessThanOrEqual(1);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/flight-trail-narrow.png',timeout:90000});
    const second=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      for(let i=0;i<500 && c._rhSnapshot().practiceTrailActive;i++){
        const s=c._rhSnapshot(),g=s.practiceNextGate,bearing=Math.atan2(g.x-s.raptorPosition.x,-(g.z-s.raptorPosition.z));
        const error=Math.atan2(Math.sin(bearing-s.headingRadians),Math.cos(bearing-s.headingRadians));
        for(const [key,pressed] of [['d',error>0.035],['a',error<-.035],['e',g.y+7-s.raptorPosition.y>0.7],['q',s.raptorPosition.y-g.y-7>0.7]])c._rhCommand('hold',{key,pressed});
        (window as any).stepPractice(40);
      }
      for(const key of ['d','a','e','q'])c._rhCommand('hold',{key,pressed:false});
      return c._rhSnapshot();
    });

    expect(second.practiceTrailComplete).toBe(true);expect(second.practiceTrailAttempts).toBe(2);
    expect(second.practiceTrailBestScore).toBe(Math.max(finished.practiceTrailScore,second.practiceTrailScore));
    expect(second.practiceTrailScore).toBeLessThan(finished.practiceTrailScore);
    await expect(page.locator('.rh-practice-result')).toBeVisible();
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/trail-result-instruments-narrow.png',timeout:90000});
    await page.getByRole('button',{name:'Return to hunt',exact:true}).focus();await page.keyboard.press('Enter');
    await expect(page.locator('[data-raptor-canvas]')).toBeFocused();
    await expect(page.getByRole('group',{name:'Flight trail progress'})).toBeHidden();
    const dismissed=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot());
    expect(dismissed.practiceTrailComplete).toBe(false);expect(dismissed.practiceTrailActive).toBe(false);expect(dismissed.raptorPosition).toEqual(second.raptorPosition);
    expect(errors).toEqual([]);
  });

  test('keeps instrument states and accessible shortcuts aligned with the selected controls',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await mount(page,'low');
    await page.getByRole('button',{name:'Perched practice',exact:true}).click();
    await page.evaluate(()=>{for(let i=0;i<5;i++)(window as any).stepPractice(40);});
    await expect(page.locator('[data-readout-kind=status] .rh-flight-readout-value')).toHaveText('Perched');
    await expect(page.locator('[data-readout-kind=strike] .rh-flight-readout-value')).toHaveText('Launch first');
    await page.getByRole('button',{name:'Flight trail',exact:true}).click();
    expect(await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().practiceTrailActive)).toBe(false);
    await page.getByLabel('Open flight view and sound settings',{exact:true}).click();
    await page.getByLabel('Keyboard control preset',{exact:true}).selectOption('simple');
    await expect(page.locator('[data-raptor-canvas]')).toHaveAttribute('aria-keyshortcuts',/ArrowLeft ArrowRight/);
    await expect(page.getByRole('button',{name:'Strike target - keyboard Space',exact:true})).toHaveAttribute('aria-keyshortcuts','Space Enter');
    await expect(page.locator('[data-readout-kind=strike]')).toContainText('Space key / Strike');
    await expect(page.getByRole('button',{name:'Hold to dive and accelerate - keyboard ↓',exact:true})).toHaveAttribute('aria-keyshortcuts','ArrowDown');
    await expect(page.getByRole('button',{name:'Hold to descend',exact:true})).not.toHaveAttribute('aria-keyshortcuts');
    await page.getByLabel('Keyboard control preset',{exact:true}).selectOption('custom');
    await page.locator('[data-raptor-rebind-action=view]').click();await page.keyboard.press('b');
    await expect(page.getByRole('button',{name:'Toggle chase and first-person camera',exact:true})).toHaveAttribute('aria-keyshortcuts','B');
    await page.locator('[data-raptor-rebind-action=strike]').click();await page.keyboard.press('r');
    await expect(page.locator('[data-readout-kind=strike]')).toContainText('R key / Strike');
    await expect(page.getByRole('button',{name:'Strike target - keyboard R',exact:true})).toHaveAttribute('aria-keyshortcuts','R');
    await page.locator('[data-raptor-rebind-action=pause]').click();await page.keyboard.press('c');
    await expect(page.getByRole('button',{name:'Pause flight',exact:true})).toHaveAttribute('aria-keyshortcuts','C');
    await page.getByRole('button',{name:'Pause flight',exact:true}).click();
    await expect(page.locator('[data-readout-kind=status] .rh-flight-readout-value')).toHaveText('Paused');
    await page.getByRole('button',{name:'Resume flight',exact:true}).click();
    await expect(page.locator('[data-readout-kind=status] .rh-flight-readout-value')).toHaveText('Perched');
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('hold',{key:' ',pressed:true});(window as any).stepPractice(40);c._rhCommand('hold',{key:' ',pressed:false});});
    await expect(page.locator('[data-readout-kind=status] .rh-flight-readout-value')).not.toHaveText('Perched');
    expect(errors).toEqual([]);
  });
});
