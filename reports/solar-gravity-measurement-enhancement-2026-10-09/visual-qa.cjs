const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const {buildSync}=require('esbuild'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),bundle=path.join(__dirname,'harness.cjs');process.chdir(root);
const sourceHash=()=>createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex');
const sourceSha256=sourceHash();
buildSync({entryPoints:['tests/e2e/helpers/stem_gl_harness.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs',external:['@playwright/test']});
const {GlHarness}=require('./harness.cjs');
const completed=['first_planet','visit_3','visit_all','gas_explorer','rover_deploy','quiz_ace','compare','gravity_calc','light_calc','ai_question','moon_explorer','night_sky','atmosphere_descent','planet_builder','orbital_learn','hohmann_plan','exo_explorer','what_if_thinker'];
const fixtures={journalEntries:[{planet:'Earth',observation:'Keep saved evidence'}],journalDrafts:{Earth:{observation:'Keep this draft'}},journalSynthesis:{claim:'Keep this claim'},missionLog:[{text:'Earlier observation',kind:'observation',time:'Earlier'}],signalNotebooks:{Mars:{explanation:'Keep signal notes'}},compareReasoningDrafts:{'Earth:Mars':'Keep reasoning'},activeAssignment:'inner_planets',asn_done_inner_planets:[0,2]};
(async()=>{
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1060,height:1400,appStyles:true,layout:'document'});
  let browser,page;const results=[];
  try {
    await harness.start();browser=await chromium.launch();page=await browser.newPage({deviceScaleFactor:1});page.setDefaultTimeout(30000);
    for(const[width,dark]of[[1060,true],[1060,false],[320,true],[320,false]]){
      const name=`gravity-measurement-${width}-${dark?'dark':'light'}`;
      const target=width===320?'Jupiter':'Mars',ratio=target==='Jupiter'?2.53:.38,height=target==='Jupiter'?1:10;
      console.log('Starting '+name);await page.setViewportSize({width,height:1400});await page.emulateMedia({reducedMotion:'reduce'});
      await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node,w)=>node.style.width=w+'px',width);
      await page.evaluate(({dark,fixtures,completed,target,height})=>{
        const worlds=['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
        window.__mount({solarSystem:{tutorialDismissed:true,solarMissionDashboardOpen:false,orreryMode:false,paused:true,selectedPlanet:target,viewTab:'overview',showGravityLab:true,gravMass:70,gravHeight:height,showChallengeBoard:false,researchPoints:350,totalRP:500,completedChallenges:completed,planetsVisited:[target],...fixtures}});
        window.__ctx.isDark=dark;window.__ctx.t=(key,fallback)=>worlds.find(w=>key==='stem.solar_sys.'+w.toLowerCase())||fallback||key;document.documentElement.classList.toggle('dark',dark);window.__rerender();
      },{dark,fixtures,completed,target,height});
      const lab=page.locator('#solar-gravity-lab'),stage=lab.locator('[data-gravity-measurement-stage]');
      const run=lab.getByRole('button',{name:'Step 2 · Run synchronized vacuum drop',exact:true});
      const checkpoint=id=>lab.locator(`[data-gravity-checkpoint="${id}"]`);
      const state=()=>page.evaluate(()=>window.__toolData.solarSystem);
      assert.equal(await stage.getAttribute('data-motion-state'),'setup');assert.equal(await run.isDisabled(),true);
      assert.equal(await stage.locator('[data-gravity-sample-time]').count(),0);
      assert.deepEqual(await stage.locator('.solar-drop-ball').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).top)),['12px','12px']);
      const prediction=lab.getByRole('group',{name:'Gravity drop prediction'}).getByRole('button',{name:ratio>1?target:'Earth',exact:true});
      await prediction.focus();await page.keyboard.press('Enter');await run.focus();await page.keyboard.press('Enter');
      assert.equal(await stage.getAttribute('data-motion-state'),'replay');
      assert.deepEqual(await stage.locator('.solar-drop-ball').evaluateAll(nodes=>nodes.map(n=>[getComputedStyle(n).animationName,getComputedStyle(n).top])),[['none','146px'],['none','146px']]);
      await checkpoint('half').focus();await page.keyboard.press('Enter');
      const elapsed=Math.max(Math.sqrt(2*height/9.80665),Math.sqrt(2*height/(9.80665*ratio)))/2;
      assert.equal(await stage.locator('[data-gravity-stage-clock]').textContent(),`Inspecting · ${elapsed.toFixed(2)} s`);
      assert.equal(await stage.locator('[data-gravity-sample-time]').count(),8);
      const geometry=await stage.evaluate(node=>{
        const rect=n=>n.getBoundingClientRect(),center=n=>rect(n).top+rect(n).height/2;
        const shafts=[...node.querySelectorAll('.solar-drop-shaft')];
        const ticks=[...node.querySelectorAll('[data-gravity-scale-value]')];
        return {shaftTops:shafts.map(n=>rect(n).top),rulerY:ticks.map(center),levelY:[...shafts[0].querySelectorAll('.solar-gravity-level')].filter((n,i)=>i%2===0).map(n=>rect(n).top),
          ballCenters:shafts.map(n=>center(n.querySelector('.solar-drop-ball'))-rect(n).top-n.clientTop),
          stamps:shafts.map(n=>[...n.querySelectorAll('[data-gravity-sample-time]')].map(s=>({time:+s.dataset.gravitySampleTime,distance:+s.dataset.gravitySampleDistance,center:center(s)-rect(n).top-n.clientTop}))),
          chartColors:[...node.closest('#solar-gravity-lab').querySelectorAll('[data-gravity-curve]')].map(n=>getComputedStyle(n).stroke),ballColors:shafts.map(n=>getComputedStyle(n.querySelector('.solar-drop-ball')).borderTopColor),
          targetDashed:getComputedStyle(node.querySelector('[data-gravity-shaft="target"] .solar-gravity-fallen-line')).borderLeftStyle};
      });
      assert.ok(Math.abs(geometry.shaftTops[0]-geometry.shaftTops[1])<.1);
      geometry.rulerY.forEach((y,i)=>assert.ok(Math.abs(y-geometry.levelY[i])<=1,`ruler alignment ${y} ${geometry.levelY[i]}`));
      geometry.stamps.forEach((samples,which)=>samples.forEach((s,index)=>{
        const g=9.80665*(which?ratio:1),time=elapsed*index/4,distance=Math.min(height,g*time*time/2);
        assert.ok(Math.abs(s.time-time)<1e-8);assert.ok(Math.abs(s.distance-distance)<1e-8);assert.ok(Math.abs(s.center-(21+134*distance/height))<.1);
      }));
      assert.deepEqual(geometry.ballColors,geometry.chartColors);assert.equal(geometry.targetDashed,'dashed');
      const metrics=await lab.evaluate(node=>{
        const visible=n=>n.getBoundingClientRect().height>0;
        const luminance=c=>{const a=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*a[0]+.7152*a[1]+.0722*a[2];};
        const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
        const stage=node.querySelector('[data-gravity-measurement-stage]'),bg=getComputedStyle(stage).backgroundColor;
        return {scrollWidth:document.documentElement.scrollWidth,minimumText:Math.min(...[...stage.querySelectorAll('p,span,strong')].filter(n=>visible(n)&&[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())).map(n=>parseFloat(getComputedStyle(n).fontSize))),minimumControlHeight:Math.min(...[...node.querySelectorAll('button,input')].filter(visible).map(n=>n.getBoundingClientRect().height)),
          minimumTextContrast:Math.min(...[...stage.querySelectorAll('.solar-gravity-world,.solar-gravity-arrival,.solar-gravity-stage-help,.solar-gravity-trail-note')].map(n=>contrast(getComputedStyle(n).color,bg))),
          overflow:[...stage.querySelectorAll('p,strong,span')].filter(n=>visible(n)&&n.textContent.trim()&&n.clientWidth&&n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)};
      });
      assert.ok(metrics.scrollWidth<=width+1);assert.ok(metrics.minimumText>=13);assert.ok(metrics.minimumControlHeight>=43.5);assert.ok(metrics.minimumTextContrast>=4.5);assert.deepEqual(metrics.overflow,[]);
      await stage.screenshot({path:path.join(__dirname,name+'-half.png'),animations:'disabled'});
      if(width===1060&&!dark)await lab.screenshot({path:path.join(__dirname,name+'-lab.png'),animations:'disabled'});
      await checkpoint('first').click();assert.ok((await stage.locator('[data-gravity-position="'+(ratio>1?'target':'earth')+'"]').textContent()).includes('Endpoint reached'));
      if(ratio>1)assert.equal(await stage.locator('[data-gravity-shaft="target"] .solar-gravity-endpoint').textContent(),'reference cloud level');
      await checkpoint('start').click();assert.equal(await stage.locator('[data-gravity-sample-time]').count(),0);
      await lab.locator('#solar-gravity-inspect-time').focus();await page.keyboard.press('ArrowRight');
      assert.ok((await state()).gravityInspection.time>0);assert.equal(await stage.locator('[data-gravity-sample-time]').count(),8);
      const entries=(await state()).journalEntries;await lab.getByRole('button',{name:'Step 3 · Save comparison to journal',exact:true}).click();
      const saved=(await state()).journalEntries;assert.equal(saved.length,entries.length+1);
      await page.emulateMedia({reducedMotion:'no-preference'});await run.click();
      assert.equal(await stage.locator('[data-gravity-sample-time]').count(),0);assert.deepEqual((await state()).journalEntries,saved);
      const animation=await stage.evaluate(async node=>{
        const balls=[...node.querySelectorAll('.solar-drop-ball')];
        const animations=balls.map(n=>n.getAnimations().find(a=>a.animationName==='solarGravityDrop'));
        if(animations.some(a=>!a))throw Error('Expected both falling-object animations');
        const durations=animations.map(a=>a.effect.getTiming().duration),time=Math.max(...durations)/4;
        animations.forEach(a=>{a.pause();a.currentTime=time;});await new Promise(requestAnimationFrame);
        const positions=balls.map(n=>parseFloat(getComputedStyle(n).top));animations.forEach(a=>{a.currentTime=a.effect.getTiming().duration;});
        return {durations,time,positions};
      });
      assert.ok(Math.abs(animation.durations[0]/animation.durations[1]-Math.sqrt(ratio))<.02);
      animation.positions.forEach((top,i)=>assert.ok(Math.abs(top-(12+134*Math.min(1,(animation.time/animation.durations[i])**2)))<.2));
      await page.emulateMedia({reducedMotion:'reduce'});await checkpoint('half').click();
      const mass=lab.locator('input[type="number"]');await mass.fill('5');assert.deepEqual((await state()).journalEntries,saved);
      await lab.locator('input[aria-label="Vacuum drop height in meters"]').fill('100');
      assert.equal(await stage.getAttribute('data-motion-state'),'setup');assert.equal(await stage.locator('[data-gravity-sample-time]').count(),0);
      assert.deepEqual(await stage.locator('[data-gravity-scale-value]').allTextContents(),['0','50','100']);
      const final=await state();for(const[key,value]of Object.entries(fixtures))if(key!=='journalEntries')assert.deepEqual(final[key],value,key+' preserved');
      assert.deepEqual(final.journalEntries[0],fixtures.journalEntries[0]);assert.equal(final.researchPoints,350);assert.equal(final.totalRP,500);
      assert.deepEqual(await page.evaluate(()=>window.__events.errors),[]);assert.equal(sourceHash(),sourceSha256);
      results.push({name,target,height,dark,...metrics,rulerAndShaftsAligned:true,sharedClockSamples:true,chartColorsMatch:true,keyboardInspector:true,reducedMotionEndpoints:true,physicalAnimationTiming:animation,predictionAndHeightReset:true,journalAndDraftsPreserved:true,browserErrors:[]});
      fs.writeFileSync(path.join(__dirname,'visual-results.json'),JSON.stringify({sourceSha256,completed:results.length===4,results},null,2));
      console.log('Checked '+name);await harness.destroy(page);
    }
  } catch(error){if(page&&!page.isClosed())console.error(JSON.stringify(await page.evaluate(()=>({errors:window.__events?.errors,active:document.activeElement?.outerHTML})).catch(()=>({}))));throw error;}
  finally {if(page)await page.close();if(browser)await browser.close();await harness.stop();if(fs.existsSync(bundle))fs.unlinkSync(bundle);}
})().catch(error=>{console.error(error);process.exitCode=1;});
