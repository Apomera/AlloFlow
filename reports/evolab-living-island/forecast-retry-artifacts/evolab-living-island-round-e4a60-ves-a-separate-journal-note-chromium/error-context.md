# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> round forecast locks before a climate-boundary round, reveals real evidence and saves a separate journal note
- Location: tests\e2e\evolab-living-island.spec.ts:2113:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Living Island · round forecast', { exact: true }).first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('Living Island · round forecast', { exact: true }).first()

```

```yaml
- button "Back to EvoLab menu": ← Menu
- text: 📓
- heading "My Learning Journal" [level=1]
- text: Evolution field journal
- heading "My Learning Journal" [level=1]
- paragraph: "Everything you have done in EvoLab, in one place: what you finished, what you predicted and whether the population agreed, the checks you passed, the experiments and challenges you logged. Print it or hand it to your teacher."
- button "🖨️ Print journal"
- button "📋 Copy as text"
- button "Read this aloud": 🔊
- text: Completed 0/17 Experiments 0 Challenges 0 Predictions held — Checks passed —
- heading "➡️ Next steps" [level=2]
- list:
  - listitem:
    - text: "Not started yet: Predator Vision, Mate Choice Lab, Climate Pressure Lab"
    - button "Go →"
- heading "✅ Modules completed" [level=2]
- paragraph: Nothing completed yet. Finish a hunt, run 20 generations, grade a tree, or finish a quiz to earn a badge.
- heading "🔮 Predictions vs what happened" [level=2]
- paragraph: No predictions yet. Each simulator asks for one before you run it.
- heading "🧠 Check-yourself questions" [level=2]
- paragraph: No checks answered yet. They appear after your first run in each simulator.
- heading "🎟️ Exit tickets" [level=2]
- paragraph: No exit tickets answered yet. Open Exit Tickets from the menu; there is one per day of the unit.
- heading "📝 My field notes" [level=2]
- list:
  - listitem:
    - text: Living Island · 9/29/2026
    - paragraph: My own explanation.
  - listitem:
    - text: Living Island — recorded evidence · 9/29/2026
    - paragraph: My earlier evidence.
  - listitem:
    - text: Living Island · round forecast · 9/29/2026
    - paragraph: "Living Island · round forecast · seed 2026 · G4 → G5 Forecast: 0 / 60 survivors. Recorded survivors: 32 / 60. Offspring: 60. Habitat: snow. Trait selection: true. Expected survivor count: 28.711. The forecast was locked before this round ran. The expected count sums individual modeled probabilities; it is an average over repetitions with the same residents and conditions, not a guaranteed outcome. Chance affects each survival draw, and survival does not guarantee offspring."
- heading "🧪 Experiments logged" [level=2]
- paragraph: No experiments logged yet. Each simulator lists five; the tool detects most of them for you.
- heading "🏅 Challenges and personal bests" [level=2]
- paragraph: No challenges met yet. Each simulator lists one or two under its experiments.
- heading "🎓 Capstone investigation" [level=2]
- paragraph: No Capstone started. Pick a scenario in the Capstone Project to begin an investigation.
- button "Reset my EvoLab progress…"
```

# Test source

```ts
  2041 |   const verify=async(habitat:string,selection:boolean)=>{
  2042 |     const expected=await page.evaluate(({world,habitat,selection})=>{const m=(window as any).StemLab.evoIslandModel;return world.history[1].population.map((o:any)=>m.chance(o,m.habitats[habitat],selection));},{world,habitat,selection});
  2043 |     const scene=await readScene();expect(scene.heights).toHaveLength(expected.length);scene.heights.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],5));
  2044 |     expect(scene.geometry).toBe(original.geometry);expect(scene.sameBuffer).toBe(true);expect(scene.coats).toEqual(original.coats);
  2045 |     await expect(lens).toHaveAttribute('data-chance-habitat',habitat);await expect(lens).toHaveAttribute('data-chance-selection',String(selection));
  2046 |     await expect(lens.locator('[data-survival-chance]')).toHaveText(expected.map((v:number)=>(v*100).toFixed(1)+'%'));
  2047 |     return expected;
  2048 |   };
  2049 |   await verify(world.habitat,true);await expect(lens.locator('[data-chance-outcome]')).toHaveCount(0);
  2050 |   await page.getByRole('button',{name:'Long winter',exact:false}).click();const winter=await verify('snow',true);
  2051 |   await lens.getByText('Compare low and high chances',{exact:true}).click();await lens.getByRole('button',{name:'Inspect highest survival chance',exact:true}).click();
  2052 |   const high=world.history[1].population[winter.indexOf(Math.max(...winter))];await expect(page.locator('#ei-organism')).toHaveValue(String(high.id));await expect(page.locator('.ei-name-chip')).toContainText('Survival chance '+(Math.max(...winter)*100).toFixed(1)+'%');
  2053 |   await page.getByRole('button',{name:'Creature close-up',exact:true}).click();expect((await readScene()).heights).toHaveLength(1);
  2054 |   await page.getByRole('button',{name:'Island overview',exact:true}).click();
  2055 |   await page.getByRole('tab',{name:'Investigate',exact:true}).click();await page.getByText('Experiment settings',{exact:true}).click();await page.getByRole('checkbox',{name:'Traits affect survival',exact:false}).uncheck();
  2056 |   await verify('snow',false);await expect(lens).toContainText('Every organism has the same modeled chance');await expect(lens.getByText('Compare low and high chances',{exact:true})).toHaveCount(0);
  2057 |   await page.getByRole('checkbox',{name:'Traits affect survival',exact:false}).check();await verify('snow',true);
  2058 |   await page.getByRole('tab',{name:'Explore',exact:true}).click();
  2059 |   await lens.getByText('Read every survival chance',{exact:true}).click();await lens.getByText('Compare low and high chances',{exact:true}).click();
  2060 |   await page.setViewportSize({width:1440,height:1700});await page.locator('.ei-stage').screenshot({path:report+'/survival-lens-desktop.png',style:'.ei-main,.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}'});await page.setViewportSize({width:1440,height:1100});
  2061 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-lenses',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  2062 |   const final=await page.evaluate(()=>(window as any).__toolData.evoLab.island);expect(final).toEqual({...world,habitat:'snow',living:false});
  2063 |   expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);
  2064 |   await page.getByRole('button',{name:'All EvoLab activities',exact:false}).click();await page.getByRole('button',{name:'Explore Living Island',exact:false}).click();await expect(page.locator('#ei-lens')).toHaveValue('survival');await expect(page.locator('.ei-survival-lens')).toHaveAttribute('data-chance-habitat','snow');expect(errors).toEqual([]);
  2065 | });
  2066 | 
  2067 | test('survival chance lens on a phone distinguishes the coming climate from recorded probabilities and outcomes', async ({ page }) => {
  2068 |   test.setTimeout(180_000);
  2069 |   await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  2070 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;let world=m.create(2026);for(let i=0;i<4;i++)world=m.step(world);return {world,next:m.step(world),plan:m.preview(world)};});
  2071 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,introDismissed:true}}});await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  2072 |   await page.locator('#ei-lens').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#ei-lens')).toHaveValue('survival');
  2073 |   const lens=page.locator('.ei-survival-lens');await expect(lens).toHaveAttribute('data-chance-habitat',fixture.world.habitat);await expect(lens.locator('[data-chance-next-habitat]')).toHaveAttribute('data-chance-next-habitat',fixture.plan.habitat);
  2074 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  2075 |   await page.getByRole('button',{name:'Watch a generation',exact:true}).focus();await page.keyboard.press('Enter');
  2076 |   await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','parents');await expect(lens).toHaveAttribute('data-chance-habitat',fixture.plan.habitat);await expect(lens).toHaveAttribute('data-chance-phase','parents');await expect(lens.locator('[data-chance-next-habitat]')).toHaveCount(0);
  2077 |   await lens.getByText('Read every survival chance',{exact:true}).focus();await page.keyboard.press('Enter');
  2078 |   const parentChances=await page.evaluate((world:any)=>{const m=(window as any).StemLab.evoIslandModel;return world.history[4].population.map((o:any)=>m.chance(o,m.habitats[world.history[5].habitat],world.history[5].selection));},fixture.next);
  2079 |   await expect(lens.locator('[data-survival-chance]')).toHaveText(parentChances.map((v:number)=>(v*100).toFixed(1)+'%'));
  2080 |   const outcomes=await lens.locator('[data-chance-organism]').evaluateAll(rows=>rows.map(row=>({id:Number(row.getAttribute('data-chance-organism')),survived:row.querySelector('[data-chance-outcome]')!.getAttribute('data-chance-outcome')==='true'})));
  2081 |   expect(outcomes).toEqual(fixture.next.history[4].population.map((o:any)=>({id:o.id,survived:fixture.next.history[5].survivors.includes(o.id)})));
  2082 |   await page.getByRole('button',{name:'Reveal survivors',exact:false}).focus();await page.keyboard.press('Enter');await expect(lens).toContainText('original probabilities, not 100% certainty');
  2083 |   await expect(lens.locator('[data-chance-outcome=true]')).toHaveCount(fixture.next.history[5].survivors.length);await expect(lens.locator('[data-chance-outcome=false]')).toHaveCount(0);
  2084 |   const chances=await lens.locator('[data-survival-chance]').evaluateAll(es=>es.map(e=>Number(e.getAttribute('data-survival-chance'))));expect(chances.every(v=>v<1)).toBe(true);
  2085 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  2086 |   const panelBounds=await lens.evaluate(el=>({right:el.getBoundingClientRect().right,stageRight:el.closest('.ei-stage')!.getBoundingClientRect().right,width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth}));
  2087 |   expect(panelBounds.right).toBeLessThanOrEqual(panelBounds.stageRight-1);expect(panelBounds.scrollWidth).toBeLessThanOrEqual(panelBounds.width+1);
  2088 |   const chanceTable=lens.getByRole('region',{name:'Survival chance table',exact:true});await chanceTable.focus();await page.keyboard.press('ArrowRight');
  2089 |   await expect.poll(()=>chanceTable.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await expect(chanceTable).toBeFocused();
  2090 |   await page.waitForTimeout(250);await chanceTable.evaluate(el=>{el.scrollLeft=0;});await lens.getByText('Read every survival chance',{exact:true}).focus();
  2091 |   await lens.screenshot({path:report+'/survival-lens-phone.png',style:'.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  2092 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-lenses',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  2093 |   await page.getByRole('button',{name:'Meet the offspring',exact:false}).click();await expect(lens).toContainText('what-if estimate');await expect(lens.locator('[data-chance-outcome]')).toHaveCount(0);await expect(lens.getByRole('columnheader',{name:'Recorded outcome',exact:true})).toHaveCount(0);
  2094 |   await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await page.getByRole('button',{name:'Watch generation story',exact:true}).click();await expect(page.locator('.ei-story-chapter')).toBeVisible();await expect(page.locator('.ei-story-readings')).toContainText('Insulation');await page.getByRole('button',{name:'Pause generation story',exact:true}).click();
  2095 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);
  2096 | });
  2097 | 
  2098 | test('survival chance lens without WebGL preserves historical conditions and has no invented probabilities after extinction', async ({ page }) => {
  2099 |   await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  2100 |   await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  2101 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;for(let seed=1;seed<50;seed++){const start=m.create(seed);start.history[0].population=start.history[0].population.slice(0,2);start.history[0].stats=m.stats(start.history[0].population);start.nextId=3;const world=m.step(start);if(world.history[1].survivors.length===1){world.habitat='snow';world.selection=false;return {world,probabilities:start.history[0].population.map((o:any)=>m.chance(o,m.habitats.meadow,true))};}}throw new Error('No extinction fixture');});
  2102 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:fixture.world.seed,introDismissed:true,lens:'survival'}}},undefined,{expectCanvas:false});
  2103 |   const lens=page.locator('.ei-survival-lens');await expect(lens).toContainText('no individual survival probabilities to display');await expect(lens.locator('[data-chance-range]')).toHaveCount(0);await expect(page.locator('.ei-map-creature')).toHaveCount(0);
  2104 |   await page.getByRole('button',{name:'Show parents',exact:true}).click();await expect(lens).toHaveAttribute('data-chance-habitat','meadow');await expect(lens).toHaveAttribute('data-chance-selection','true');
  2105 |   const names=await page.locator('.ei-map-creature').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));fixture.probabilities.forEach((v:number,i:number)=>expect(names[i]).toContain('Survival chance '+(v*100).toFixed(1)+'%'));
  2106 |   await page.locator('.ei-map-creature').first().click();await expect(page.locator('#ei-organism')).toHaveValue('1');await expect(page.locator('.ei-name-chip')).toContainText((fixture.probabilities[0]*100).toFixed(1)+'%');
  2107 |   await page.getByRole('button',{name:'Show survivors',exact:true}).click();await expect(page.locator('.ei-map-creature')).toHaveCount(1);await expect(lens).toContainText('original probabilities, not 100% certainty');
  2108 |   await page.getByRole('button',{name:'Show offspring',exact:true}).click();await expect(lens).toContainText('no individual survival probabilities to display');
  2109 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  2110 | });
  2111 | 
  2112 | 
  2113 | test('round forecast locks before a climate-boundary round, reveals real evidence and saves a separate journal note', async ({ page }) => {
  2114 |   test.setTimeout(180_000);
  2115 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  2116 |   await page.setViewportSize({width:1440,height:1100});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  2117 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;let world=m.create(2026);for(let i=0;i<4;i++)world=m.step(world);return {world,next:m.step(world),plan:(window as any).StemLab.evoIslandObservation.forecast(world)};});
  2118 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,introDismissed:true,trackedId:1,lens:'survival'},evoProgress:{notes:{livingIsland:{text:'My own explanation.',at:'2026-09-29T12:00:00Z'},livingIslandData:{text:'My earlier evidence.',at:'2026-09-29T12:00:00Z'}}}}});
  2119 |   const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);expect(contexts).toHaveLength(1);
  2120 |   await page.getByRole('button',{name:'Predict this round',exact:true}).click();const draft=page.locator('.ei-round-forecast');await expect(draft).toBeFocused();await expect(draft).toHaveAttribute('data-forecast-generation','5');
  2121 |   const habitat=await page.evaluate((key:string)=>(window as any).StemLab.evoIslandModel.habitats[key].name,fixture.plan.habitat);await expect(draft).toContainText(habitat);
  2122 |   await expect(page.getByRole('button',{name:'Next generation',exact:false})).toBeDisabled();await expect(page.getByRole('button',{name:'Play evolution',exact:false})).toBeDisabled();
  2123 |   await draft.getByText('Reveal a probability clue',{exact:true}).click();await expect(draft.locator('.ei-forecast-clue')).toContainText(fixture.plan.expected.toFixed(1));
  2124 |   await page.locator('#ei-forecast-range').fill('0');await expect(page.locator('#ei-forecast-number')).toHaveValue('0');await expect(draft.locator('.ei-forecast-dots circle')).toHaveCount(fixture.plan.count);
  2125 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  2126 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-round-forecast',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  2127 |   await draft.screenshot({path:report+'/forecast-desktop-predict.png',style:'.ei-main{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar{position:static!important}'});
  2128 |   // A double activation before React rerenders must still record exactly one round.
  2129 |   await draft.getByRole('button',{name:'Lock forecast & watch',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
  2130 |   const guide=page.locator('.ei-watch-guide'),result=page.locator('.ei-forecast-result');await expect(guide).toBeFocused();await expect(guide).toHaveAttribute('data-watch-phase','parents');await expect(result).toHaveAttribute('data-forecast-guess','0');await expect(result).toHaveAttribute('data-forecast-revealed','false');await expect(result.locator('[data-forecast-actual]')).toHaveCount(0);
  2131 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);
  2132 |   await guide.getByRole('button',{name:'Reveal survivors',exact:false}).click();await expect(result).toHaveAttribute('data-forecast-revealed','true');await expect(result.locator('[data-forecast-actual]')).toHaveAttribute('data-forecast-actual',String(fixture.next.history[5].survivors.length));await expect(result).toContainText('differed from your forecast');
  2133 |   await guide.getByRole('button',{name:'Previous stage',exact:true}).click();await expect(result).toHaveAttribute('data-forecast-revealed','true');await expect(page.locator('#ei-forecast-number')).toHaveCount(0);
  2134 |   await result.getByRole('button',{name:'Save forecast to journal',exact:true}).click();
  2135 |   const notes=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);expect(notes.livingIsland.text).toBe('My own explanation.');expect(notes.livingIslandData.text).toBe('My earlier evidence.');expect(notes.livingIslandForecast.text).toContain('Forecast: 0 / '+fixture.plan.count);expect(notes.livingIslandForecast.text).toContain('Recorded survivors: '+fixture.next.history[5].survivors.length);expect(notes.livingIslandForecast.text).toContain('Habitat: '+fixture.plan.habitat);expect(notes.livingIslandForecast.text.length).toBeLessThan(2000);
  2136 |   await guide.getByRole('button',{name:'Reveal survivors',exact:false}).click();await guide.screenshot({path:report+'/forecast-desktop-result.png',style:'.ei-main{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar{position:static!important}'});
  2137 |   expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-watch-guide',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  2138 |   await guide.getByRole('button',{name:'Meet the offspring',exact:false}).click();await guide.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await expect(result).toHaveCount(0);await expect(page.getByRole('button',{name:'Predict this round',exact:true})).toBeFocused();
  2139 |   await page.getByRole('button',{name:'Predict this round',exact:true}).click();await expect(draft).toHaveAttribute('data-forecast-generation','6');await draft.getByRole('button',{name:'Cancel forecast',exact:true}).click();await expect(page.getByRole('button',{name:'Predict this round',exact:true})).toBeFocused();
  2140 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);
> 2141 |   await page.getByRole('button',{name:'Field journal',exact:false}).click();await expect(page.getByText('Living Island · round forecast',{exact:true}).first()).toBeVisible();expect(errors).toEqual([]);
       |                                                                                                                                                                 ^ Error: expect(locator).toBeVisible() failed
  2142 | });
  2143 | 
  2144 | test('round forecast on a phone handles keyboard estimates, invalid counts and cancellation when conditions change', async ({ page }) => {
  2145 |   test.setTimeout(180_000);
  2146 |   await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  2147 |   const world=await page.evaluate(()=>({...((window as any).StemLab.evoIslandModel.create(2026)),selection:false,living:false,habitat:'drought'}));
  2148 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:world,islandStudy:{seed:2026,introDismissed:true}}});await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  2149 |   await page.getByRole('button',{name:'Predict this round',exact:true}).focus();await page.keyboard.press('Enter');const draft=page.locator('.ei-round-forecast');await expect(draft).toBeFocused();await expect(draft).toContainText('Equal chances do not guarantee equal outcomes');
  2150 |   const bounds=await draft.evaluate(el=>({top:el.getBoundingClientRect().top,bar:document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom,right:el.getBoundingClientRect().right}));expect(bounds.top).toBeGreaterThanOrEqual(bounds.bar-1);expect(bounds.right).toBeLessThanOrEqual(390);
  2151 |   await page.locator('#ei-forecast-range').focus();await page.keyboard.press('End');await expect(page.locator('#ei-forecast-number')).toHaveValue('36');
  2152 |   for(const value of ['', '-1', '37', '1.5']){await page.locator('#ei-forecast-number').fill(value);await expect(draft.getByRole('button',{name:'Lock forecast & watch',exact:true})).toBeDisabled();await expect(page.locator('#ei-forecast-number')).toHaveAttribute('aria-invalid','true');}
  2153 |   await page.locator('#ei-forecast-number').fill('12');await expect(page.locator('#ei-forecast-range')).toHaveValue('12');
  2154 |   await draft.getByText('Reveal a probability clue',{exact:true}).focus();await page.keyboard.press('Enter');await expect(draft.locator('.ei-forecast-clue')).toContainText((36*.68*.72).toFixed(1));
  2155 |   await draft.screenshot({path:report+'/forecast-phone-predict.png',style:'.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  2156 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-round-forecast',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  2157 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(world);
  2158 |   await draft.getByRole('button',{name:'Cancel forecast',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Predict this round',exact:true})).toBeFocused();
  2159 |   await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.getByRole('button',{name:'Long winter',exact:false}).click();await expect(draft).toHaveCount(0);await expect(page.getByRole('button',{name:'Predict this round',exact:true})).toBeEnabled();
  2160 |   const expected=await page.evaluate(()=>(window as any).StemLab.evoIslandModel.step((window as any).__toolData.evoLab.island));
  2161 |   await page.getByRole('button',{name:'Predict this round',exact:true}).click();await expect(draft).toContainText('Long winter');await page.locator('#ei-forecast-number').fill('20');await draft.getByRole('button',{name:'Lock forecast & watch',exact:true}).focus();await page.keyboard.press('Enter');
  2162 |   await page.getByRole('button',{name:'Reveal survivors',exact:false}).focus();await page.keyboard.press('Enter');await expect(page.locator('[data-forecast-actual]')).toHaveAttribute('data-forecast-actual',String(expected.history[1].survivors.length));
  2163 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  2164 |   await page.locator('.ei-forecast-result').screenshot({path:report+'/forecast-phone-result.png',style:'.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  2165 |   expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-watch-guide',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  2166 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(expected);
  2167 | });
  2168 | 
  2169 | test('round forecast without WebGL can match a count while extinction still follows the two-parent rule', async ({ page }) => {
  2170 |   await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  2171 |   await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  2172 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;for(let seed=1;seed<50;seed++){const world=m.create(seed);world.history[0].population=world.history[0].population.slice(0,2);world.history[0].stats=m.stats(world.history[0].population);world.nextId=3;const next=m.step(world);if(next.history[1].survivors.length===1)return {world,next};}throw new Error('No extinction fixture');});
  2173 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:fixture.world.seed,introDismissed:true}}},undefined,{expectCanvas:false});
  2174 |   await page.getByRole('button',{name:'Predict this round',exact:true}).click();await page.locator('#ei-forecast-number').fill('1');await page.getByRole('button',{name:'Lock forecast & watch',exact:true}).click();
  2175 |   await page.getByRole('button',{name:'Show offspring',exact:true}).click();await expect(page.locator('.ei-forecast-result')).toHaveAttribute('data-forecast-revealed','true');await expect(page.locator('.ei-forecast-result')).toContainText('matched this round');await expect(page.locator('[data-forecast-actual]')).toHaveAttribute('data-forecast-actual','1');await expect(page.locator('.ei-map-creature')).toHaveCount(0);await expect(page.locator('.ei-watch-guide')).toContainText('Fewer than two individuals survived to breed');
  2176 |   await page.getByRole('button',{name:'Save forecast to journal',exact:true}).click();const note=await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandForecast.text);expect(note).toContain('Recorded survivors: 1 / 2. Offspring: 0.');
  2177 |   await page.getByRole('button',{name:'Finish walkthrough',exact:true}).click();await expect(page.locator('.ei-stage')).toBeFocused();await expect(page.getByRole('button',{name:'Predict this round',exact:true})).toHaveCount(0);
  2178 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.next);
  2179 |   await page.getByRole('button',{name:'All EvoLab activities',exact:false}).click();await page.getByRole('button',{name:'Explore Living Island',exact:false}).click();await expect(page.locator('.ei-round-forecast,.ei-forecast-result')).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandForecast.text)).toBe(note);
  2180 | });
  2181 | 
```