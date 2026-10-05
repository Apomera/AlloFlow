const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {createFixtureServer} = require('./browser-fixture.cjs');

const reportDir = __dirname;
const out = path.join(reportDir, 'browser-qa-results.json');
const results = {fixture:'Local React 18 browser mount of canonical ATC source; test-only exposure of gameRef; seeded random generator.',started:new Date().toISOString(),checks:[],errors:[],screenshots:[]};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function check(name, fn) {
  try {const detail = await fn();results.checks.push({name,pass:true,detail:detail||null});console.log('PASS '+name);}
  catch(error){results.checks.push({name,pass:false,error:error.message});console.error('FAIL '+name+': '+error.message);}
}
async function screenshot(page,name){const file=path.join(reportDir,name+'.png');await page.screenshot({path:file,fullPage:true});results.screenshots.push(file);}
async function fits(page,name){await check(name,async()=>{const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(dims.scroll<=dims.width+1,JSON.stringify(dims));return dims;});}
async function axeCheck(page,name){await sleep(300);await check(name,async()=>{const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,checks:n.any.map(c=>c.data)}))}));});assert.deepEqual(audit,[]);return audit;});}

(async()=>{
  const fixture = await createFixtureServer();
  let browser;
  try {
    browser=await chromium.launch({headless:true,channel:'chrome'});
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>results.errors.push(e.message));
    await page.goto(fixture.url);
    await page.addScriptTag({url:fixture.url+'axe.js'});
    await page.getByRole('button',{name:'Start Tower Shift',exact:true}).waitFor();
    await check('Desktop menu fits viewport',async()=>{
      const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
      assert.ok(dims.scroll<=dims.width+1,JSON.stringify(dims));return dims;
    });
    await screenshot(page,'menu-desktop');
    await check('Menu tab keyboard moves and exposes active panel',async()=>{
      const tabs=page.getByRole('tab');await tabs.first().focus();await page.keyboard.press('End');
      await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-selected')==='true');
      const id=await page.locator(':focus').getAttribute('id');assert.equal(id,'stem-atctower-tab-badges');
      await page.keyboard.press('Home');
      await page.waitForFunction(()=>document.activeElement?.id==='stem-atctower-tab-airports');
    });
    for(const width of [390,320]){
      await page.setViewportSize({width,height:900});await sleep(100);
      await check('Menu fits '+width+'px viewport',async()=>{
        const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(dims.scroll<=dims.width+1,JSON.stringify(dims));return dims;
      });await screenshot(page,'menu-'+width);
      await page.locator('#stem-atctower-tab-ops').click();await fits(page,'Ops Lab fits '+width+'px viewport');await screenshot(page,'ops-'+width);
      await page.locator('#stem-atctower-tab-lessons').click();await fits(page,'Lesson cards fit '+width+'px viewport');await screenshot(page,'lessons-'+width);
      await page.getByRole('tabpanel').getByRole('button').first().click();await fits(page,'Lesson detail fits '+width+'px viewport');await screenshot(page,'lesson-detail-'+width);
      await page.getByRole('button',{name:/Back to Tower/}).click();await page.locator('#stem-atctower-tab-airports').click();
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.getByRole('button',{name:'Start Tower Shift',exact:true}).click();
    await page.locator('[data-atctower-playing]').waitFor();
    await page.evaluate(()=>{window.__atcGameRef.current.nextSpawn=0;});
    await page.waitForFunction(()=>window.__atcGameRef.current.aircraft.length>0);
    await page.locator('[data-atctower-aircraft]').first().waitFor();
    await check('Keyboard focus exits the radar with Tab',async()=>{
      await page.getByRole('application').focus();await page.keyboard.press('Tab');
      assert.notEqual(await page.locator(':focus').evaluate(el=>el.tagName),'CANVAS');
      return await page.locator(':focus').evaluate(el=>({tag:el.tagName,text:el.textContent,aria:el.getAttribute('aria-label')}));
    });
    await check('Pause freezes simulation time and aircraft',async()=>{
      await page.getByRole('button',{name:'Pause shift',exact:true}).click();
      const before=await page.evaluate(()=>{const g=window.__atcGameRef.current;return {time:g.time,aircraft:g.aircraft.map(a=>({x:a.x,y:a.y,fuel:a.fuel,altitude:a.altitude}))};});
      await sleep(550);
      const after=await page.evaluate(()=>{const g=window.__atcGameRef.current;return {time:g.time,aircraft:g.aircraft.map(a=>({x:a.x,y:a.y,fuel:a.fuel,altitude:a.altitude}))};});
      assert.deepEqual(after,before);
    });
    await check('Aircraft strips and runway commands work with clicks',async()=>{
      await page.locator('[data-atctower-aircraft]').first().click();
      await page.locator('[data-atctower-command="r"]').click();
      assert.ok(await page.evaluate(()=>window.__atcGameRef.current.aircraft.find(a=>a.id===window.__atcGameRef.current.selected).assignedRunway));
    });
    await check('Heading entry receives keys without changing radar state',async()=>{
      await page.getByRole('button',{name:'Resume shift',exact:true}).click();
      await page.getByRole('button',{name:'Set heading',exact:true}).click();
      const input=page.getByRole('spinbutton');await input.waitFor();await input.fill('135');
      const before=await page.evaluate(()=>{const g=window.__atcGameRef.current;return {selected:g.selected,paused:g.paused,time:g.time,view:window.__atcToolData.atcTower.view};});
      await sleep(350);
      await input.press('Home');await input.press('h');await input.press('r');await input.press('p');await input.press(' ');
      const after=await page.evaluate(()=>{const g=window.__atcGameRef.current;return {selected:g.selected,paused:g.paused,time:g.time,view:window.__atcToolData.atcTower.view};});
      assert.deepEqual(after,before);await input.fill('135');await page.getByRole('button',{name:'Send instruction',exact:true}).click();
      assert.equal(await page.evaluate(()=>window.__atcGameRef.current.aircraft.find(a=>a.id===window.__atcGameRef.current.selected).targetHeading),135);
      await page.getByRole('button',{name:'Pause shift',exact:true}).click();
    });
    await check('Paused radar remains painted after command entry',async()=>{
      const size=await page.getByRole('application').evaluate(c=>({width:c.width,height:c.height}));assert.ok(size.width>0&&size.height>0);return size;
    });
    await axeCheck(page,'Paused playing UI has no serious/critical axe violations');
    await screenshot(page,'playing-desktop');
    for(const width of [390,320]){
      await page.setViewportSize({width,height:900});await sleep(150);
      await check('Playing controls fit '+width+'px viewport',async()=>{
        const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(dims.scroll<=dims.width+1,JSON.stringify(dims));return dims;
      });await screenshot(page,'playing-'+width);
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('details[data-atctower-display-settings] > summary').click();
    await page.getByRole('button',{name:'High contrast',exact:true}).click();await screenshot(page,'playing-high-contrast');
    await page.emulateMedia({forcedColors:'active'});await screenshot(page,'playing-forced-colors');await page.emulateMedia({forcedColors:'none'});
    await check('Math challenge accepts exact zero and decimal answers',async()=>{
      await page.evaluate(()=>{const g=window.__atcGameRef.current;g.mathChallenge={type:'wind_correction',rwyHdg:270,windDir:270,windSpd:10,answer:0,unit:'kts',precision:0,explanation:'Zero crosswind when aligned.',answered:false,inputBuffer:''};});
      await page.locator('[data-atctower-math-challenge]').waitFor();
      const input=page.locator('[data-atctower-math-challenge]').getByRole('spinbutton');await input.fill('0');
      await page.locator('[data-atctower-math-challenge]').getByRole('button',{name:/check|submit|answer/i}).first().click();
      assert.equal(await page.evaluate(()=>window.__atcGameRef.current.mathChallenge.correct),true);
      await page.getByRole('button',{name:'Continue traffic',exact:true}).click();
      await page.evaluate(()=>{const g=window.__atcGameRef.current;g.mathChallenge={type:'separation',d:20,rate:300,sep:3,answer:3.4,unit:'min',precision:1,explanation:'(20 − 3) / 300 × 60 = 3.4 minutes.',answered:false,inputBuffer:''};});
      await page.locator('[data-atctower-math-challenge]').waitFor();
      await page.locator('[data-atctower-math-challenge]').getByRole('spinbutton').fill('3.4');
      await page.locator('[data-atctower-math-challenge]').getByRole('button',{name:'Check answer',exact:true}).click();
      assert.equal(await page.evaluate(()=>window.__atcGameRef.current.mathChallenge.correct),true);
    });
    await axeCheck(page,'Math feedback UI has no serious/critical axe violations');
    await screenshot(page,'math-desktop');
    await check('Arrival-order ties use the Same time choice and count as solved',async()=>{
      await page.getByRole('button',{name:'Continue traffic',exact:true}).click();
      const before=await page.evaluate(()=>window.__atcGameRef.current.mathCorrect||0);
      await page.evaluate(()=>{const g=window.__atcGameRef.current;g.mathChallenge={type:'arrival_order',d1:20,s1:120,d2:30,s2:180,answer:'TIE',explanation:'Both take 10 minutes.',answered:false};});
      await page.getByRole('button',{name:'Same time',exact:true}).click();
      assert.equal(await page.evaluate(()=>window.__atcGameRef.current.mathChallenge.correct),true);
      assert.equal(await page.evaluate(()=>window.__atcGameRef.current.mathCorrect),before+1);
    });
    await check('End shift creates debrief and persists totals once',async()=>{
      await page.evaluate(()=>{const g=window.__atcGameRef.current;g.mathChallenge=null;g.score=50;g.landed=3;g.streak=1;g.sessionBestStreak=3;});
      await page.getByRole('button',{name:'End shift',exact:true}).click();await page.locator('[data-atctower-debrief]').waitFor();
      const totals=await page.evaluate(()=>{const d=window.__atcToolData.atcTower;return {score:d.totalScore,landed:d.totalLanded,bestStreak:d.bestStreak};});
      assert.deepEqual(totals,{score:50,landed:3,bestStreak:3});return totals;
    });
    await screenshot(page,'debrief-desktop');
    await axeCheck(page,'Debrief has no serious/critical axe violations');
    await check('Restart and a second end accumulate totals exactly once',async()=>{
      await page.getByRole('button',{name:'Try another shift',exact:true}).click();await page.locator('[data-atctower-playing]').waitFor();
      await page.evaluate(()=>{const g=window.__atcGameRef.current;g.paused=true;g.score=25;g.landed=2;g.streak=0;g.sessionBestStreak=2;});
      await page.getByRole('button',{name:'End shift',exact:true}).dblclick();await page.locator('[data-atctower-debrief]').waitFor();
      const totals=await page.evaluate(()=>{const d=window.__atcToolData.atcTower;return {score:d.totalScore,landed:d.totalLanded,bestStreak:d.bestStreak};});
      assert.deepEqual(totals,{score:75,landed:5,bestStreak:3});return totals;
    });
    await check('Touch flight strips and commands are usable at 390px',async()=>{
      const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
      mobile.on('pageerror',e=>results.errors.push(e.message));await mobile.goto(fixture.url);
      await mobile.getByRole('button',{name:'Start Tower Shift',exact:true}).tap();await mobile.locator('[data-atctower-playing]').waitFor();
      await mobile.evaluate(()=>{window.__atcGameRef.current.nextSpawn=0;});await mobile.locator('[data-atctower-aircraft]').first().waitFor();
      await mobile.getByRole('button',{name:'Pause shift',exact:true}).tap();await mobile.locator('[data-atctower-aircraft]').first().tap();await mobile.locator('[data-atctower-command="r"]').tap();
      assert.ok(await mobile.evaluate(()=>window.__atcGameRef.current.aircraft.find(a=>a.id===window.__atcGameRef.current.selected).assignedRunway));
      await mobile.getByRole('button',{name:'Set heading',exact:true}).tap();await mobile.getByRole('spinbutton').fill('090');await mobile.getByRole('button',{name:'Send instruction',exact:true}).tap();
      assert.equal(await mobile.evaluate(()=>window.__atcGameRef.current.aircraft.find(a=>a.id===window.__atcGameRef.current.selected).targetHeading),90);
      await mobile.close();
    });
    for(const airportId of ['simple','crossing'])await check('Same-frame arrivals protect '+airportId+' runway occupancy',async()=>{
      const runwayPage=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
      runwayPage.on('pageerror',e=>results.errors.push(e.message));await runwayPage.goto(fixture.url);
      await runwayPage.getByRole('button',{name:'Start Tower Shift',exact:true}).waitFor();
      await runwayPage.evaluate(id=>window.__fixtureSetData({atcTower:{view:'menu',atcSelectedAirport:id,soundEnabled:false}}),airportId);
      await runwayPage.waitForFunction(id=>window.__atcToolData.atcTower.atcSelectedAirport===id,airportId);
      await runwayPage.getByRole('button',{name:'Start Tower Shift',exact:true}).click();await runwayPage.locator('[data-atctower-playing]').waitFor();
      await runwayPage.evaluate(()=>{
        const g=window.__atcGameRef.current;const template=g.aircraft[0];
        g.paused=false;g.nextSpawn=1000;g.mathChallenge=null;g.runwayBusyUntil={};g.landed=0;g.goArounds=0;
        g.aircraft=[0,1].map(index=>{const r=g.airport.runways[index]||g.airport.runways[0];const rad=r.hdg*Math.PI/180;return Object.assign({},template,{id:900+index,callsign:'Final '+index,x:r.x-Math.sin(rad)*r.len/2,y:r.y+Math.cos(rad)*r.len/2,heading:r.hdg,altitude:100,state:'approach',approachStage:'final',touchdownReady:true,assignedRunway:r,targetHeading:null,targetSpeed:null,targetAltitude:null,fuel:30});});
      });
      await runwayPage.waitForFunction(()=>{const g=window.__atcGameRef.current;return g.landed===1&&g.goArounds===1;});
      const state=await runwayPage.evaluate(()=>{const g=window.__atcGameRef.current;g.paused=true;return {landed:g.landed,goArounds:g.goArounds,states:g.aircraft.map(a=>a.state),messages:g.messages.map(m=>m.text)};});
      assert.deepEqual(state.states,['landed','goAround']);assert.ok(state.messages.some(m=>/runway.*occupied/i.test(m)));
      await runwayPage.getByText(/Occupied/, {exact:false}).first().waitFor();await screenshot(runwayPage,'runway-'+airportId+'-protected');await runwayPage.close();return state;
    });
    await check('No uncaught browser errors',async()=>assert.deepEqual(results.errors,[]));
  }catch(error){results.errors.push(error.stack);console.error(error);}
  finally{
    results.finished=new Date().toISOString();fs.writeFileSync(out,JSON.stringify(results,null,2)+'\n');
    if(browser)await browser.close();await new Promise(resolve=>fixture.server.close(resolve));
    process.exitCode=results.errors.length||results.checks.some(c=>!c.pass)?1:0;
  }
})();
