import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
// The HUD said "STOOP - hold Shift", and holding Shift ended the state that said it, so obeying the hint strobed
// STOOP/CLOSE. The mission panel also shrink-fit its text, so each change moved the whole panel 63 px sideways.
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.huntScene=scene;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor HUD stability',()=>{
  test.describe.configure({mode:'serial',timeout:240000});
  // Overridable so the failing-first check can run against a saved COPY of the old tool.
  const harness=new GlHarness({toolFile:process.env.RAPTOR_SOURCE_E2E||'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.setViewportSize({width:960,height:1100});
    await page.addInitScript(()=>{
      let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
      window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
      (window as any).stepHunt=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
      (window as any).advanceHunt=(ms:number)=>{while(ms>0){const dt=Math.min(ms,50);(window as any).stepHunt(dt);ms-=dt;}};
    });
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'open',flightSession:{speciesId:'peregrine',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;c._rhCommand('environment',{windSpeed:0});
      // Real scene prey a set distance ahead along the heading; the rest far away. Prey snaps back to the terrain each
      // frame, so a test cannot set its height: distance ahead sets the look angle from the bird's altitude instead.
      const preyList=()=>w.huntScene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
      w.placePrey=(ahead:number,side=0)=>{
        const s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians;
        preyList().forEach((o:any,i:number)=>{if(i===0)o.position.set(p.x+Math.sin(yaw)*ahead+Math.cos(yaw)*side,o.position.y,p.z-Math.cos(yaw)*ahead+Math.sin(yaw)*side);else o.position.set(2000+i*20,2000,2000);});
      };
      w.aheadForDot=(dot:number)=>{const below=Math.abs(preyList()[0].position.y-c._rhSnapshot().raptorPosition.y);return below*dot/Math.sqrt(1-dot*dot);};
    });
  });
  const state=(page:any)=>page.locator('[data-raptor-target-guidance]').getAttribute('data-target-state');

  test('holding the dive key the hint asks for keeps the stoop state, with no flips',async({page})=>{
    const seen=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any,cue=()=>c._rhSnapshot().targetState,rows:string[]=[];
      w.placePrey(70);w.advanceHunt(150);rows.push(String(cue()));
      c._rhCommand('hold',{key:'shift',pressed:true});
      for(let i=0;i<20;i++){w.placePrey(70);w.advanceHunt(50);rows.push(String(cue()));}
      c._rhCommand('hold',{key:'shift',pressed:false});
      return rows;
    });
    expect(seen[0]).toBe('stoop');
    expect(seen.filter((x:string)=>x!=='stoop')).toEqual([]);
  });

  test('tapping the dive key does not strobe the guidance',async({page})=>{
    const seen=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any,cue=()=>c._rhSnapshot().targetState,rows:string[]=[];
      w.placePrey(70);w.advanceHunt(150);
      for(let i=0;i<8;i++){
        c._rhCommand('hold',{key:'shift',pressed:i%2===0});
        w.placePrey(70);w.advanceHunt(150);rows.push(String(cue()));
      }
      c._rhCommand('hold',{key:'shift',pressed:false});
      return rows;
    });
    expect(seen.filter((x:string)=>x!=='stoop')).toEqual([]);
  });

  test('an approach angle resting on the entry threshold holds instead of chattering',async({page})=>{
    const seen=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any,cue=()=>c._rhSnapshot().targetState,rows:string[]=[];
      w.placePrey(70);w.advanceHunt(150);rows.push(String(cue()));
      // The look angle wobbles either side of the 0.45 entry line, as it does when a person holds a line.
      for(let i=0;i<16;i++){w.placePrey(w.aheadForDot(i%2?0.5:0.42));w.stepHunt(25);rows.push(String(cue()));}
      return rows;
    });
    expect(seen[0]).toBe('stoop');
    expect(seen.filter((x:string)=>x!=='stoop')).toEqual([]);
  });

  test('the stoop state still ends when the prey falls behind the look angle or off to the side',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]');
    const settle=(ahead:number|null,side=0)=>canvas.evaluate((c:any,a:any)=>{const w=window as any;w.placePrey(a.ahead===null?w.aheadForDot(0.2):a.ahead,a.side);w.stepHunt(25);},{ahead,side});
    await settle(70);await expect.poll(()=>state(page)).toBe('stoop');
    // Nearly under the bird: past the 0.38 exit.
    await settle(null);await expect.poll(()=>state(page)).toBe('align');
    await settle(70);await expect.poll(()=>state(page)).toBe('stoop');
    // Inside the look angle but far off the heading: steering guidance has to come back.
    await settle(40,60);await expect.poll(()=>state(page)).toBe('align');
  });

  test('the mission panel does not move or change width across hunt steps',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),panel=page.getByRole('group',{name:'Free Hunt progress',exact:true});
    const box=()=>panel.evaluate((el:any)=>{const r=el.getBoundingClientRect();return {left:Math.round(r.left),width:Math.round(r.width),text:el.textContent};});
    const rows:any[]=[];
    for(const place of [2000,70,null]){
      await canvas.evaluate((_:any,a:any)=>{const w=window as any;w.placePrey(a===null?w.aheadForDot(0.2):a);w.advanceHunt(100);w.placePrey(a===null?w.aheadForDot(0.2):a);w.stepHunt(1);},place);
      await page.waitForTimeout(250);rows.push(await box());
    }
    expect(new Set(rows.map(r=>r.text)).size,JSON.stringify(rows)).toBeGreaterThan(1);
    expect(new Set(rows.map(r=>r.left)).size).toBe(1);
    expect(new Set(rows.map(r=>r.width)).size).toBe(1);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
