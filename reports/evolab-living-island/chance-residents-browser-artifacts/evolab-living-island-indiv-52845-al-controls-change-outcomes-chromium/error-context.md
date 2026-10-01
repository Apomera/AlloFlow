# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> individual chance on a phone keeps the selected spriglet while keyboard trial controls change outcomes
- Location: tests\e2e\evolab-living-island.spec.ts:2289:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.ei-chance-residents')
Expected substring: "LongNamedSprigletExplorer"
Received string:    "Who survived? Follow an individualChoose a spriglet, then switch trials to follow its outcomes. Its inherited traits and modeled chance stay the same.7Survived in both8Recorded only12Trial only9Neither20 of 36 individuals have different outcomes in the recorded round and this trial.Individual to followSage · #1LongNamedSprigletExplore · #2Mica · #3Wren · #4Juniper · #5Ember · #6Ash · #7Pico · #8Clover · #9Pip · #10Kelp · #11Coco · #12Lumi · #13Roo · #14Sunny · #15Moss · #16Cove · #17Dune · #18Nori · #19Tavi · #20Basil · #21Tide · #22Pebble · #23Flint · #24Sage · #25Fern · #26Mica · #27Wren · #28Juniper · #29Ember · #30Ash · #31Pico · #32Clover · #33Pip · #34Kelp · #35Coco · #36Previous individualNext individualFind a changed outcomeLongNamedSprigletExplore#2 · Generation 049.0%Modeled survival chance in every trialCoat lightness69.5Insulation56.9Leg length10.6Inherited traits · 0–100 teaching scale. Higher is not always better.Recorded round✓ SurvivedTrial 5✓ Survived—1✓2✓3—4✓5Survived 3 of 5 explored trials. This observed share can differ from its modeled probability.Trial survival does not change the recorded life or imply offspring. Each trial gives the original individual a fresh survival draw.Save individual comparison"
Timeout: 15000ms

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('.ei-chance-residents')
    31 × locator resolved to <details open="" data-resident-trial="5" class="ei-chance-residents">…</details>
       - unexpected value "Who survived? Follow an individualChoose a spriglet, then switch trials to follow its outcomes. Its inherited traits and modeled chance stay the same.7Survived in both8Recorded only12Trial only9Neither20 of 36 individuals have different outcomes in the recorded round and this trial.Individual to followSage · #1LongNamedSprigletExplore · #2Mica · #3Wren · #4Juniper · #5Ember · #6Ash · #7Pico · #8Clover · #9Pip · #10Kelp · #11Coco · #12Lumi · #13Roo · #14Sunny · #15Moss · #16Cove · #17Dune · #18Nori · #19Tavi · #20Basil · #21Tide · #22Pebble · #23Flint · #24Sage · #25Fern · #26Mica · #27Wren · #28Juniper · #29Ember · #30Ash · #31Pico · #32Clover · #33Pip · #34Kelp · #35Coco · #36Previous individualNext individualFind a changed outcomeLongNamedSprigletExplore#2 · Generation 049.0%Modeled survival chance in every trialCoat lightness69.5Insulation56.9Leg length10.6Inherited traits · 0–100 teaching scale. Higher is not always better.Recorded round✓ SurvivedTrial 5✓ Survived—1✓2✓3—4✓5Survived 3 of 5 explored trials. This observed share can differ from its modeled probability.Trial survival does not change the recorded life or imply offspring. Each trial gives the original individual a fresh survival draw.Save individual comparison"

```

```yaml
- group:
  - text: Who survived? Follow an individual
  - paragraph: Choose a spriglet, then switch trials to follow its outcomes. Its inherited traits and modeled chance stay the same.
  - text: 7 Survived in both 8 Recorded only 12 Trial only 9 Neither
  - status: 20 of 36 individuals have different outcomes in the recorded round and this trial.
  - text: Individual to follow
  - combobox "Individual to follow":
    - 'option "Sage · #1"'
    - 'option "LongNamedSprigletExplore · #2" [selected]'
    - 'option "Mica · #3"'
    - 'option "Wren · #4"'
    - 'option "Juniper · #5"'
    - 'option "Ember · #6"'
    - 'option "Ash · #7"'
    - 'option "Pico · #8"'
    - 'option "Clover · #9"'
    - 'option "Pip · #10"'
    - 'option "Kelp · #11"'
    - 'option "Coco · #12"'
    - 'option "Lumi · #13"'
    - 'option "Roo · #14"'
    - 'option "Sunny · #15"'
    - 'option "Moss · #16"'
    - 'option "Cove · #17"'
    - 'option "Dune · #18"'
    - 'option "Nori · #19"'
    - 'option "Tavi · #20"'
    - 'option "Basil · #21"'
    - 'option "Tide · #22"'
    - 'option "Pebble · #23"'
    - 'option "Flint · #24"'
    - 'option "Sage · #25"'
    - 'option "Fern · #26"'
    - 'option "Mica · #27"'
    - 'option "Wren · #28"'
    - 'option "Juniper · #29"'
    - 'option "Ember · #30"'
    - 'option "Ash · #31"'
    - 'option "Pico · #32"'
    - 'option "Clover · #33"'
    - 'option "Pip · #34"'
    - 'option "Kelp · #35"'
    - 'option "Coco · #36"'
  - button "Previous individual"
  - button "Next individual"
  - button "Find a changed outcome"
  - strong: LongNamedSprigletExplore
  - text: "#2 · Generation 0 49.0% Modeled survival chance in every trial Coat lightness 69.5 Insulation 56.9 Leg length 10.6 Inherited traits · 0–100 teaching scale. Higher is not always better. Recorded round"
  - strong: Survived
  - text: Trial 5
  - strong: Survived
  - group "Follow this individual across trials":
    - button "Trial 1 · Did not survive": "1"
    - button "Trial 2 · Survived": "2"
    - button "Trial 3 · Survived": "3"
    - button "Trial 4 · Did not survive": "4"
    - button "Trial 5 · Survived" [pressed]: "5"
  - paragraph: Survived 3 of 5 explored trials. This observed share can differ from its modeled probability.
  - text: Trial survival does not change the recorded life or imply offspring. Each trial gives the original individual a fresh survival draw.
  - button "Save individual comparison"
```

# Test source

```ts
  2195 |   await expect(lab.locator('svg')).toHaveCount(0);await lab.getByRole('button',{name:'Try one survival trial',exact:true}).click();await lab.getByRole('button',{name:'Try five trials',exact:true}).click();
  2196 |   await expect(lab).toHaveAttribute('data-chance-trials','6');await expect(lab.locator('[data-inspected-trial]')).toHaveAttribute('data-inspected-trial','6');
  2197 |   await expect(lab.locator('[data-trial-count]')).toHaveCount(6);
  2198 |   expect(await lab.locator('[data-trial-count]').evaluateAll(es=>es.map(e=>Number(e.getAttribute('data-trial-count'))))).toEqual(fixture.trials.slice(0,6).map(row=>row.count));
  2199 |   await page.locator('#ei-chance-trial').selectOption('0');await expect(lab.getByRole('button',{name:'Previous trial',exact:true})).toBeDisabled();
  2200 |   await expect(lab.locator('[data-inspected-trial]')).toHaveAttribute('data-inspected-trial','1');expect(await lab.locator('.ei-chance-inspected circle').evaluateAll(es=>es.filter(e=>e.getAttribute('fill')==='#527b72').length)).toBe(fixture.trials[0].count);
  2201 |   await lab.getByRole('button',{name:'Next trial',exact:true}).click();await expect(lab.locator('[data-inspected-trial]')).toHaveAttribute('data-inspected-trial','2');
  2202 |   await page.getByRole('button',{name:'Previous stage',exact:true}).click();await expect(lab).toHaveAttribute('data-chance-trials','6');await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','parents');
  2203 |   await lab.getByRole('button',{name:'Try five trials',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});await expect(lab).toHaveAttribute('data-chance-trials','16');
  2204 |   await lab.getByRole('button',{name:'Try five trials',exact:true}).click();await expect(lab).toHaveAttribute('data-chance-trials','20');
  2205 |   await expect(lab.getByRole('button',{name:'Try one survival trial',exact:true})).toBeDisabled();await expect(lab.getByRole('button',{name:'Try five trials',exact:true})).toBeDisabled();await expect(lab.locator('[data-trial-count]')).toHaveCount(20);
  2206 |   const counts=fixture.trials.map(row=>row.count),mean=counts.reduce((a,b)=>a+b,0)/20;
  2207 |   await expect(lab.locator('[data-chance-range]')).toHaveAttribute('data-chance-range',Math.min(...counts)+':'+Math.max(...counts));await expect(lab.locator('[data-chance-mean]')).toHaveAttribute('data-chance-mean',String(mean));await expect(lab.locator('[data-chance-recorded]')).toHaveAttribute('data-chance-recorded',String(fixture.next.history[5].survivors.length));
  2208 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);
  2209 |   await page.setViewportSize({width:1440,height:1800});await lab.screenshot({path:report+'/chance-lab-desktop.png',style:'.ei-main{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar{position:static!important}'});await page.setViewportSize({width:1440,height:1100});
  2210 |   await lab.getByText('Read trial counts and seeds',{exact:true}).click();await expect(lab.locator('tbody tr')).toHaveCount(20);
  2211 |   expect(await lab.locator('tbody tr').evaluateAll(es=>es.map(e=>e.textContent))).toEqual(fixture.trials.map(row=>String(row.index)+row.count+' / 60'+row.seed));
  2212 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-chance-lab',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  2213 |   await lab.getByRole('button',{name:'Save chance trials to journal',exact:true}).click();const notes=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  2214 |   expect(notes.livingIsland.text).toBe('My explanation.');expect(notes.livingIslandData.text).toBe('Earlier evidence.');expect(notes.livingIslandForecast.text).toContain('Forecast: 25 / 60');expect(notes.livingIslandChanceTrials.text).toContain('20 survival-only trials: '+counts.join(', '));expect(notes.livingIslandChanceTrials.text).toContain('habitat: '+fixture.next.history[5].habitat);expect(notes.livingIslandChanceTrials.text).toContain(fixture.trials.map(row=>row.seed).join(', '));expect(notes.livingIslandChanceTrials.text.length).toBeLessThan(2000);
  2215 |   await page.getByRole('button',{name:'Leave walkthrough',exact:true}).click();await expect(lab).toHaveCount(0);await expect(page.getByRole('button',{name:'Predict this round',exact:true})).toBeFocused();
  2216 |   await page.getByRole('button',{name:'Field journal',exact:false}).click();const note=page.getByRole('listitem').filter({has:page.getByText(notes.livingIslandChanceTrials.text,{exact:true})});await expect(note).toBeVisible();await expect(note).toContainText('Living Island · chance trials · ');expect(errors).toEqual([]);
  2217 | });
  2218 | 
  2219 | test('chance lab on a phone supports keyboard trial browsing and preserves the next real outcome', async ({ page }) => {
  2220 |   await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  2221 |   const world=await page.evaluate(()=>({...((window as any).StemLab.evoIslandModel.create(2026)),selection:false,living:false,habitat:'drought'}));
  2222 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:world,islandStudy:{seed:2026,introDismissed:true}}});await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  2223 |   await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.locator('#ei-forecast-number').fill('18');await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Reveal survivors',exact:false}).click();
  2224 |   const current=await page.evaluate(()=>(window as any).__toolData.evoLab.island),next=await page.evaluate(()=>(window as any).StemLab.evoIslandModel.step((window as any).__toolData.evoLab.island));
  2225 |   const summary=page.getByText('Explore chance: repeat this round',{exact:true});await summary.focus();await page.keyboard.press('Enter');const lab=page.locator('.ei-chance-lab');
  2226 |   await lab.getByRole('button',{name:'Try five trials',exact:true}).focus();await page.keyboard.press('Enter');await expect(lab).toHaveAttribute('data-chance-trials','5');
  2227 |   await page.locator('#ei-chance-trial').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#ei-chance-trial')).toHaveValue('1');await expect(lab.locator('[data-inspected-trial]')).toHaveAttribute('data-inspected-trial','2');
  2228 |   await lab.getByRole('button',{name:'Previous trial',exact:true}).focus();await page.keyboard.press('Enter');await expect(lab.locator('[data-inspected-trial]')).toHaveAttribute('data-inspected-trial','1');
  2229 |   await lab.evaluate(el=>el.scrollIntoView({block:'start'}));
  2230 |   const bounds=await lab.evaluate(el=>({top:el.getBoundingClientRect().top,bar:document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth}));expect(bounds.top).toBeGreaterThanOrEqual(bounds.bar-1);expect(bounds.right).toBeLessThanOrEqual(390);expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width+1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  2231 |   await page.setViewportSize({width:390,height:1700});await lab.evaluate(el=>el.scrollIntoView({block:'start'}));await lab.screenshot({path:report+'/chance-lab-phone.png'});await page.setViewportSize({width:390,height:844});
  2232 |   await lab.getByText('Read trial counts and seeds',{exact:true}).focus();await page.keyboard.press('Enter');await expect(lab.locator('tbody tr')).toHaveCount(5);expect(await lab.evaluate(el=>el.scrollWidth<=el.getBoundingClientRect().width+1)).toBe(true);
  2233 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-chance-lab',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  2234 |   await summary.focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');await expect(lab).toHaveAttribute('data-chance-trials','5');
  2235 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(current);await page.getByRole('button',{name:'Meet the offspring',exact:false}).click();await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await page.getByRole('button',{name:'Next generation',exact:false}).click();expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(next);
  2236 |   await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Reveal survivors',exact:false}).click();await expect(lab).toHaveAttribute('data-chance-trials','0');
  2237 | });
  2238 | 
  2239 | test('chance lab without WebGL retains zero and one survivor trials after the real island goes extinct', async ({ page }) => {
  2240 |   await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  2241 |   await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  2242 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,t=(window as any).StemLab.evoIslandChanceTrials;for(let seed=1;seed<50;seed++){const world=m.create(seed);world.history[0].population=world.history[0].population.slice(0,2);world.history[0].stats=m.stats(world.history[0].population);world.nextId=3;const next=m.step(world);if(next.history[1].survivors.length===1)return {world,next,trials:Array.from({length:20},(_,i)=>t.run(world,i+1))};}throw new Error('No extinction fixture');});
  2243 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:fixture.world.seed,introDismissed:true}}},undefined,{expectCanvas:false});
  2244 |   await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Show offspring',exact:true}).click();await page.getByText('Explore chance: repeat this round',{exact:true}).click();const lab=page.locator('.ei-chance-lab');
  2245 |   for(let i=0;i<4;i++)await lab.getByRole('button',{name:'Try five trials',exact:true}).click();await expect(lab).toHaveAttribute('data-chance-trials','20');
  2246 |   expect(fixture.trials.some(row=>row.count===0)).toBe(true);expect(fixture.trials.some(row=>row.count===1)).toBe(true);
  2247 |   expect(await lab.locator('[data-trial-count]').evaluateAll(es=>es.map(e=>Number(e.getAttribute('data-trial-count'))))).toEqual(fixture.trials.map(row=>row.count));
  2248 |   await page.locator('#ei-chance-trial').selectOption(String(fixture.trials.findIndex(row=>row.count===0)));expect(await lab.locator('.ei-chance-inspected circle').evaluateAll(es=>es.filter(e=>e.getAttribute('fill')==='#527b72').length)).toBe(0);
  2249 |   await expect(lab.locator('[data-chance-recorded]')).toHaveAttribute('data-chance-recorded','1');await expect(page.locator('.ei-map-creature')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);
  2250 |   await lab.getByRole('button',{name:'Save chance trials to journal',exact:true}).click();const note=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandChanceTrials.text);expect(note).toContain('No offspring are produced');
  2251 |   await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await expect(page.locator('.ei-stage')).toBeFocused();await expect(lab).toHaveCount(0);
  2252 |   await page.getByRole('button',{name:'All EvoLab activities',exact:false}).click();await page.getByRole('button',{name:'Explore Living Island',exact:false}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandChanceTrials.text)).toBe(note);await expect(lab).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);
  2253 | });
  2254 | 
  2255 | 
  2256 | test('individual chance follows real parent identities across trials and saves separate evidence', async ({ page }) => {
  2257 |   test.setTimeout(180_000);const errors:string[]=[];page.on('pageerror',err=>errors.push(err.message));
  2258 |   await page.setViewportSize({width:1440,height:1100});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  2259 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,t=(window as any).StemLab.evoIslandChanceTrials;let world=m.create(2026);for(let i=0;i<4;i++)world=m.step(world);const next=m.step(world),trials=Array.from({length:20},(_,i)=>t.run(world,i+1)),actual=next.history[5].survivors;return {world,next,trials,match:trials.findIndex(row=>row.count===actual.length&&row.survivors.some((id:number)=>!actual.includes(id)))};});
  2260 |   expect(fixture.match).toBeGreaterThanOrEqual(0);const parents=fixture.world.history[4].population,firstId=parents[0].id;
  2261 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,introDismissed:true,selectedId:1,trackedId:1,names:{[firstId]:'Pebble chance explorer'}},evoProgress:{notes:{livingIsland:{text:'My own field note.',at:'2026-09-30'}}}}});
  2262 |   const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);
  2263 |   await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Reveal survivors',exact:false}).click();
  2264 |   await page.getByText('Explore chance: repeat this round',{exact:true}).click();for(let i=0;i<4;i++)await page.getByRole('button',{name:'Try five trials',exact:true}).click();
  2265 |   await page.locator('#ei-chance-trial').selectOption(String(fixture.match));await page.getByText('Who survived? Follow an individual',{exact:true}).click();const panel=page.locator('.ei-chance-residents');
  2266 |   await expect(panel).toContainText('Same survivor count, different individuals');await expect(panel).toContainText('Pebble chance explorer');await expect(page.locator('#ei-chance-resident option')).toHaveCount(parents.length);
  2267 |   const check=async(index:number,id:number)=>{
  2268 |     const trial=fixture.trials[index-1],recorded=fixture.next.history[5].survivors,o=parents.find((parent:any)=>parent.id===id),groups={both:0,recorded:0,trial:0,neither:0};
  2269 |     parents.forEach((parent:any)=>{const a=recorded.includes(parent.id),b=trial.survivors.includes(parent.id);groups[a?b?'both':'recorded':b?'trial':'neither']++;});
  2270 |     for(const [key,value] of Object.entries(groups))await expect(panel.locator('[data-outcome-group='+key+']')).toHaveText(String(value));
  2271 |     await expect(panel.locator('[data-chance-resident]')).toHaveAttribute('data-chance-resident',String(id));await expect(panel.locator('[data-resident-outcome=recorded]')).toHaveAttribute('data-survived',String(recorded.includes(id)));await expect(panel.locator('[data-resident-outcome=trial]')).toHaveAttribute('data-survived',String(trial.survivors.includes(id)));
  2272 |     const chance=await page.evaluate(({o,habitat})=>(window as any).StemLab.evoIslandModel.chance(o,(window as any).StemLab.evoIslandModel.habitats[habitat],true),{o,habitat:fixture.next.history[5].habitat});await expect(panel.locator('[data-resident-chance]')).toHaveAttribute('data-resident-chance',String(chance));
  2273 |     for(const key of ['shade','fur','legs'])await expect(panel.locator('[data-resident-trait='+key+']')).toHaveText(((o.genes[key][0]+o.genes[key][1])*50).toFixed(1));
  2274 |     expect(await panel.locator('[data-resident-trial-chip]').evaluateAll(es=>es.map(e=>e.getAttribute('data-survived')==='true'))).toEqual(fixture.trials.map(row=>row.survivors.includes(id)));
  2275 |   };
  2276 |   await check(fixture.match+1,firstId);const portrait=await panel.locator('.ei-portrait').evaluate(el=>el.outerHTML);
  2277 |   await panel.locator('[data-resident-trial-chip="1"]').click();await expect(page.locator('#ei-chance-trial')).toHaveValue('0');await check(1,firstId);expect(await panel.locator('.ei-portrait').evaluate(el=>el.outerHTML)).toBe(portrait);
  2278 |   await panel.getByRole('button',{name:'Find a changed outcome',exact:true}).click();const selectedId=Number(await page.locator('#ei-chance-resident').inputValue());expect(fixture.next.history[5].survivors.includes(selectedId)).not.toBe(fixture.trials[0].survivors.includes(selectedId));await check(1,selectedId);
  2279 |   await panel.locator('[data-resident-trial-chip="20"]').click();await check(20,selectedId);await expect(panel.locator('[data-resident-trial-chip="20"]')).toHaveAttribute('aria-pressed','true');
  2280 |   await page.getByRole('button',{name:'Previous stage',exact:true}).click();await expect(page.locator('#ei-chance-resident')).toHaveValue(String(selectedId));await check(20,selectedId);
  2281 |   await page.setViewportSize({width:1440,height:1750});await panel.screenshot({path:report+'/chance-residents-desktop.png',style:'.ei-main{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar{position:static!important}'});await page.setViewportSize({width:1440,height:1100});
  2282 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-chance-residents',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  2283 |   await page.getByRole('button',{name:'Save chance trials to journal',exact:true}).click();await panel.getByRole('button',{name:'Save individual comparison',exact:true}).click();const notes=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  2284 |   expect(notes.livingIsland.text).toBe('My own field note.');expect(notes.livingIslandChanceTrials.text).toContain('20 survival-only trials');expect(notes.livingIslandChanceResident.text).toContain('Individual #'+selectedId);expect(notes.livingIslandChanceResident.text).toContain('Trial 20 survival: '+fixture.trials[19].survivors.includes(selectedId));expect(notes.livingIslandChanceResident.text).toContain('chance seed: '+fixture.trials[19].seed);expect(notes.livingIslandChanceResident.text.length).toBeLessThan(2000);
  2285 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);await expect(page.locator('#ei-organism')).toHaveValue('1');
  2286 |   await page.getByRole('button',{name:'Leave walkthrough',exact:true}).click();await expect(panel).toHaveCount(0);await page.getByRole('button',{name:'Field journal',exact:false}).click();const entry=page.getByRole('listitem').filter({has:page.getByText(notes.livingIslandChanceResident.text,{exact:true})});await expect(entry).toBeVisible();await expect(entry).toContainText('Living Island · individual chance evidence · ');expect(errors).toEqual([]);
  2287 | });
  2288 | 
  2289 | test('individual chance on a phone keeps the selected spriglet while keyboard trial controls change outcomes', async ({ page }) => {
  2290 |   await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  2291 |   const world=await page.evaluate(()=>({...((window as any).StemLab.evoIslandModel.create(2026)),selection:false,living:false,habitat:'drought'}));
  2292 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:world,islandStudy:{seed:2026,introDismissed:true,names:{2:'LongNamedSprigletExplorer'}}}});await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  2293 |   await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Reveal survivors',exact:false}).click();
  2294 |   await page.getByText('Explore chance: repeat this round',{exact:true}).click();await page.getByRole('button',{name:'Try five trials',exact:true}).click();const summary=page.getByText('Who survived? Follow an individual',{exact:true});await summary.focus();await page.keyboard.press('Enter');const panel=page.locator('.ei-chance-residents');
> 2295 |   await page.locator('#ei-chance-resident').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#ei-chance-resident')).toHaveValue('2');await expect(panel).toContainText('LongNamedSprigletExplorer');
       |                                                                                                                                                                                                                                                        ^ Error: expect(locator).toContainText(expected) failed
  2296 |   await expect(panel.locator('[data-resident-chance]')).toHaveAttribute('data-resident-chance',String(.68*.72));const portrait=await panel.locator('.ei-portrait').evaluate(el=>el.outerHTML);
  2297 |   await panel.locator('[data-resident-trial-chip="1"]').focus();await page.keyboard.press('Enter');await expect(page.locator('#ei-chance-trial')).toHaveValue('0');await expect(page.locator('#ei-chance-resident')).toHaveValue('2');await expect(panel.locator('[data-resident-trial-chip="1"]')).toBeFocused();
  2298 |   await panel.getByRole('button',{name:'Next individual',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('#ei-chance-resident')).toHaveValue('3');await panel.getByRole('button',{name:'Previous individual',exact:true}).click();await expect(page.locator('#ei-chance-resident')).toHaveValue('2');expect(await panel.locator('.ei-portrait').evaluate(el=>el.outerHTML)).toBe(portrait);
  2299 |   await page.getByRole('button',{name:'Try five trials',exact:true}).click();await expect(panel.locator('[data-resident-trial-chip]')).toHaveCount(10);await expect(page.locator('#ei-chance-resident')).toHaveValue('2');await expect(page.locator('#ei-chance-trial')).toHaveValue('9');
  2300 |   await panel.evaluate(el=>el.scrollIntoView({block:'start'}));const bounds=await panel.evaluate(el=>({top:el.getBoundingClientRect().top,bar:document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth}));expect(bounds.top).toBeGreaterThanOrEqual(bounds.bar-1);expect(bounds.right).toBeLessThanOrEqual(390);expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width+1);
  2301 |   await page.setViewportSize({width:390,height:1700});await panel.evaluate(el=>el.scrollIntoView({block:'start'}));await panel.screenshot({path:report+'/chance-residents-phone.png'});await page.setViewportSize({width:390,height:844});
  2302 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-chance-residents',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  2303 |   const current=await page.evaluate(()=>(window as any).__toolData.evoLab.island),expected=await page.evaluate(()=>(window as any).StemLab.evoIslandModel.step((window as any).__toolData.evoLab.island));await summary.click();await summary.click();await expect(page.locator('#ei-chance-resident')).toHaveValue('2');
  2304 |   await page.getByRole('button',{name:'Meet the offspring',exact:false}).click();await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await expect(panel).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(current);await page.getByRole('button',{name:'Next generation',exact:false}).click();expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(expected);
  2305 | });
  2306 | 
  2307 | test('individual chance without WebGL explains identical and different survivors after actual extinction', async ({ page }) => {
  2308 |   await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  2309 |   await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  2310 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,t=(window as any).StemLab.evoIslandChanceTrials;for(let seed=1;seed<50;seed++){const world=m.create(seed);world.history[0].population=world.history[0].population.slice(0,2);world.history[0].stats=m.stats(world.history[0].population);world.nextId=3;const next=m.step(world);if(next.history[1].survivors.length===1){const actual=next.history[1].survivors,trials=Array.from({length:20},(_,i)=>t.run(world,i+1));return {world,next,trials,identical:trials.findIndex(row=>row.count===1&&row.survivors[0]===actual[0]),empty:trials.findIndex(row=>row.count===0)};}}throw new Error('No extinction fixture');});
  2311 |   expect(fixture.identical).toBeGreaterThanOrEqual(0);expect(fixture.empty).toBeGreaterThanOrEqual(0);
  2312 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:fixture.world.seed,introDismissed:true}}},undefined,{expectCanvas:false});
  2313 |   await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();await page.getByRole('button',{name:'Show offspring',exact:true}).click();await page.getByText('Explore chance: repeat this round',{exact:true}).click();for(let i=0;i<4;i++)await page.getByRole('button',{name:'Try five trials',exact:true}).click();
  2314 |   await page.locator('#ei-chance-trial').selectOption(String(fixture.identical));await page.getByText('Who survived? Follow an individual',{exact:true}).click();const panel=page.locator('.ei-chance-residents');await expect(panel).toContainText('The same individuals survived in this comparison');await expect(panel.getByRole('button',{name:'Find a changed outcome',exact:true})).toBeDisabled();await expect(panel.locator('[data-outcome-group=both]')).toHaveText('1');await expect(panel.locator('[data-outcome-group=neither]')).toHaveText('1');
  2315 |   await page.locator('#ei-chance-resident').selectOption(String(fixture.next.history[1].survivors[0]));await panel.locator('[data-resident-trial-chip="'+(fixture.empty+1)+'"]').click();await expect(panel.locator('[data-resident-outcome=recorded]')).toHaveAttribute('data-survived','true');await expect(panel.locator('[data-resident-outcome=trial]')).toHaveAttribute('data-survived','false');await expect(panel.getByRole('button',{name:'Find a changed outcome',exact:true})).toBeEnabled();
  2316 |   await expect(page.locator('.ei-map-creature')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);await panel.getByRole('button',{name:'Save individual comparison',exact:true}).click();const note=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandChanceResident.text);expect(note).toContain('Recorded survival: true');expect(note).toContain('survival: false');
  2317 |   await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await expect(page.locator('.ei-stage')).toBeFocused();await page.getByRole('button',{name:'All EvoLab activities',exact:false}).click();await page.getByRole('button',{name:'Explore Living Island',exact:false}).click();await expect(panel).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandChanceResident.text)).toBe(note);
  2318 | });
  2319 | 
```