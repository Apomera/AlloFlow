# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> birth comparison on a phone supports keyboard parent round trips and honest legacy records
- Location: tests\e2e\evolab-living-island.spec.ts:1870:5

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 307
Received:    259.203125
```

# Test source

```ts
  1779 |     const child=world.history[1].population[0],names:any={};child.parents.concat([child.id]).forEach((id:number)=>names[id]='WWWWWWWWWWWWWWWWWWWWWWWW');return {world,child,names};
  1780 |   });
  1781 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.child.parents[0],names:fixture.names,introDismissed:true}}});
  1782 |   await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  1783 |   await page.getByRole('button',{name:'Follow this life',exact:false}).click();await page.selectOption('#ei-life-child',String(fixture.child.id));
  1784 |   const summary=page.getByText('Compare this offspring with both parents',{exact:true});await summary.focus();await page.keyboard.press('Enter');
  1785 |   const comparison=page.locator('.ei-resemblance');await expect(comparison).toBeVisible();
  1786 |   await page.selectOption('#ei-resemblance-trait','shade');
  1787 |   await page.getByText('Try the four allele pairings',{exact:true}).focus();await page.keyboard.press('Enter');
  1788 |   await expect(comparison.locator('[data-recorded-pair=true]')).toHaveCount(0);await expect(comparison.locator('.ei-resemblance-record')).toHaveCount(0);
  1789 |   await expect(comparison).toContainText('which one occurred and whether mutations happened are unknown');
  1790 |   await comparison.locator('[data-allele-pair="3"]').focus();await page.keyboard.press('Space');await expect(comparison.locator('[data-pairing-value]')).toHaveAttribute('data-pairing-value','3');
  1791 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  1792 |   const bottoms=await comparison.locator('.ei-meter').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().bottom));expect(Math.max(...bottoms)-Math.min(...bottoms)).toBeLessThan(1);
  1793 |   await comparison.screenshot({path:report+'/family-resemblance-phone.png',style:'.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  1794 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  1795 |   expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-resemblance',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  1796 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  1797 | });
  1798 | 
  1799 | test('family resemblance without WebGL explains a zero-valued offspring beyond both parents without mutation', async ({ page }) => {
  1800 |   await page.setViewportSize({width:1440,height:1100});
  1801 |   await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  1802 |   await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  1803 |   const fixture=await page.evaluate(()=>{
  1804 |     const m=(window as any).StemLab.evoIslandModel;
  1805 |     for(let seed=1;seed<100;seed++) {
  1806 |       const w=m.create(seed);w.history[0].population=w.history[0].population.slice(0,2).map((o:any)=>({...o,genes:{shade:[0,1],fur:[0,1],legs:[0,1]}}));w.history[0].stats=m.stats(w.history[0].population);w.nextId=3;w.mutation=0;w.selection=false;
  1807 |       const world=m.step(w),child=world.history[1].population.find((o:any)=>m.value(o,'fur')===0);
  1808 |       if(child){if(!m.restore(world))throw new Error('Invalid zero-value fixture');return {world,child};}
  1809 |     }
  1810 |   });expect(fixture).toBeTruthy();
  1811 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture!.world,islandStudy:{seed:fixture!.world.seed,selectedId:fixture!.child.parents[0],introDismissed:true}}},undefined,{expectCanvas:false});
  1812 |   await page.getByRole('button',{name:'Follow this life',exact:false}).click();await page.selectOption('#ei-life-child',String(fixture!.child.id));
  1813 |   await page.getByText('Compare this offspring with both parents',{exact:true}).click();
  1814 |   const comparison=page.locator('.ei-resemblance');await expect(comparison.locator('[data-resemblance-value]')).toHaveText(['50.00','50.00','0.00']);
  1815 |   await expect(comparison.locator('[data-resemblance-position]')).toHaveAttribute('data-resemblance-position','below');
  1816 |   await page.getByText('Try the four allele pairings',{exact:true}).click();
  1817 |   await expect(comparison.locator('[data-allele-pair] strong')).toHaveText(['0.00','50.00','50.00','100.00']);
  1818 |   await expect(comparison).toContainText('Neither inherited copy mutated for this trait');
  1819 |   await expect(comparison.locator('[data-recorded-pair=true]')).toHaveAttribute('data-allele-pair','0');
  1820 |   await comparison.locator('[data-allele-pair="3"]').click();
  1821 |   await expect(comparison.locator('[data-pairing-value]')).toHaveText('(100.00 + 100.00) ÷ 2 ≈ 100.00');
  1822 |   await expect(comparison.locator('[data-resemblance-value="2"]')).toHaveText('0.00');
  1823 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture!.world);
  1824 | });
  1825 | 
  1826 | test('birth comparison opens for a newborn and visits either real parent without losing the way back', async ({ page }) => {
  1827 |   test.setTimeout(180_000);
  1828 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  1829 |   await page.setViewportSize({width:1440,height:1100});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  1830 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;let world=m.create(2026);for(let i=0;i<3;i++)world=m.step(world);world.habitat='snow';world.selection=false;const child=world.history[3].population[0];return {world,child};});
  1831 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.child.id,trackedId:1,introDismissed:true}}});
  1832 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene','ready');
  1833 |   const contexts=(await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id);expect(contexts).toHaveLength(1);
  1834 |   await page.locator('.ei-birth-shortcut').click();
  1835 |   const birth=page.locator('.ei-birth-resemblance'),life=page.locator('.ei-life');
  1836 |   await expect(birth).toHaveAttribute('open','');await expect(birth.locator('> summary')).toBeFocused();
  1837 |   await expect(life).toHaveAttribute('data-life-outcome','pending');await expect(life.locator('[data-life-children]')).toHaveCount(0);
  1838 |   expect(await birth.locator('[data-resemblance-member]').evaluateAll(es=>es.map(e=>Number(e.getAttribute('data-resemblance-member'))))).toEqual([...fixture.child.parents,fixture.child.id]);
  1839 |   const bounds=await birth.locator('> summary').evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,bodyTop:el.closest('.ei-desk-body')!.getBoundingClientRect().top,bodyBottom:el.closest('.ei-desk-body')!.getBoundingClientRect().bottom}));
  1840 |   expect(bounds.top).toBeGreaterThanOrEqual(bounds.bodyTop-1);expect(bounds.bottom).toBeLessThanOrEqual(bounds.bodyBottom+1);
  1841 |   await page.selectOption('#ei-birth-resemblance-trait','legs');await birth.getByText('Try the four allele pairings',{exact:true}).click();await birth.locator('[data-allele-pair="2"]').click();
  1842 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  1843 |   await birth.locator('[data-visit-parent="'+fixture.child.parents[0]+'"]').click();
  1844 |   await expect(life).toHaveAttribute('data-life-id',String(fixture.child.parents[0]));await expect(life).toBeFocused();
  1845 |   await expect(page.locator('.ei-parent-return')).toContainText('#'+fixture.child.id);
  1846 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation','2');
  1847 |   // This middle-generation organism has both its own parents and offspring.
  1848 |   await birth.locator('> summary').click();await page.selectOption('#ei-birth-resemblance-trait','shade');
  1849 |   const outgoing=life.locator('.ei-resemblance-details:not(.ei-birth-resemblance)');await outgoing.locator('> summary').click();
  1850 |   await page.selectOption('#ei-resemblance-trait','legs');await expect(page.locator('#ei-birth-resemblance-trait')).toHaveValue('shade');
  1851 |   const ids=await life.locator('[id]').evaluateAll(es=>es.map(e=>e.id));expect(new Set(ids).size).toBe(ids.length);
  1852 |   await expect(birth.getByLabel('Compare an inherited trait',{exact:true})).toHaveValue('shade');await expect(outgoing.getByLabel('Compare an inherited trait',{exact:true})).toHaveValue('legs');
  1853 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  1854 |   expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-life',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  1855 |   await page.getByRole('button',{name:'Back to this offspring',exact:true}).click();
  1856 |   await expect(life).toHaveAttribute('data-life-id',String(fixture.child.id));await expect(birth.locator('> summary')).toBeFocused();await expect(birth).toHaveAttribute('open','');
  1857 |   await expect(page.locator('.ei-parent-return')).toHaveCount(0);
  1858 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation','3');
  1859 |   const habitatName=await page.evaluate((key:string)=>(window as any).StemLab.evoIslandModel.habitats[key].name,fixture.world.history[3].habitat);
  1860 |   await expect(page.locator('.ei-stage-label').first()).toContainText(habitatName);await expect(page.locator('[data-island-phase]')).toContainText('recorded offspring');
  1861 |   await page.setViewportSize({width:1440,height:2200});await birth.screenshot({path:report+'/birth-comparison-desktop.png',style:'.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}'});await page.setViewportSize({width:1440,height:1100});
  1862 |   await birth.locator('[data-visit-parent="'+fixture.child.parents[1]+'"]').click();await expect(life).toHaveAttribute('data-life-id',String(fixture.child.parents[1]));
  1863 |   await page.getByRole('tab',{name:'Explore',exact:true}).click();const other=fixture.world.history[2].population.find((o:any)=>o.id!==fixture.child.parents[1]);await page.selectOption('#ei-organism',String(other.id));
  1864 |   await expect(page.locator('.ei-parent-return')).toHaveCount(0);
  1865 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.islandStudy.trackedId)).toBe(1);
  1866 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  1867 |   expect((await harness.glContexts(page)).filter(r=>r.connected&&!r.lost).map(r=>r.id)).toEqual(contexts);expect(errors).toEqual([]);
  1868 | });
  1869 | 
  1870 | test('birth comparison on a phone supports keyboard parent round trips and honest legacy records', async ({ page }) => {
  1871 |   test.setTimeout(180_000);
  1872 |   await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{evoLab:{view:'livingIsland'}});
  1873 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,world=m.step(m.create(2026));world.history.forEach((f:any)=>f.population.forEach((o:any)=>delete o.inheritance));if(!m.restore(world))throw new Error('Invalid legacy fixture');const child=world.history[1].population[0];return {world,child};});
  1874 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.child.id,introDismissed:true}}});
  1875 |   await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';document.body.style.padding='0';});
  1876 |   await page.locator('.ei-birth-shortcut').focus();await page.keyboard.press('Enter');const birth=page.locator('.ei-birth-resemblance');
  1877 |   await expect(birth.locator('> summary')).toBeFocused();
  1878 |   const bounds=await birth.locator('> summary').evaluate(el=>({top:el.getBoundingClientRect().top,bar:document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom,tabs:document.querySelector('.ei-desk-tabs')!.getBoundingClientRect().bottom}));
> 1879 |   expect(bounds.top).toBeGreaterThanOrEqual(Math.max(bounds.bar,bounds.tabs)-1);
       |                      ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  1880 |   await birth.getByText('Try the four allele pairings',{exact:true}).focus();await page.keyboard.press('Enter');
  1881 |   await expect(birth).toContainText('which one occurred and whether mutations happened are unknown');await expect(birth.locator('[data-recorded-pair=true]')).toHaveCount(0);
  1882 |   await birth.locator('[data-visit-parent]').first().focus();await page.keyboard.press('Enter');
  1883 |   await expect(page.locator('.ei-life')).toBeFocused();await expect(page.locator('.ei-birth-resemblance')).toHaveCount(0);
  1884 |   await expect(page.locator('.ei-life')).toContainText('No earlier parents are recorded.');await expect(page.locator('.ei-parent-return')).toContainText('#'+fixture.child.id);
  1885 |   await page.getByRole('button',{name:'Back to this offspring',exact:true}).focus();await page.keyboard.press('Enter');await expect(birth.locator('> summary')).toBeFocused();
  1886 |   await birth.getByText('Try the four allele pairings',{exact:true}).click();await birth.locator('[data-allele-pair="0"]').focus();await page.keyboard.press('Space');
  1887 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  1888 |   await birth.screenshot({path:report+'/birth-comparison-phone.png',style:'.ei-commandbar,.ei-desk-tabs{position:static!important}'});
  1889 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  1890 |   expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-life',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  1891 |   await page.getByRole('button',{name:'All EvoLab activities',exact:false}).click();await page.getByRole('button',{name:'Explore Living Island',exact:false}).click();
  1892 |   await expect(page.locator('#ei-organism')).toHaveValue(String(fixture.child.id));await expect(page.locator('.ei-parent-return')).toHaveCount(0);
  1893 |   await page.locator('.ei-birth-shortcut').click();await expect(birth).toHaveAttribute('open','');expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  1894 | });
  1895 | 
  1896 | test('birth comparison without WebGL pauses playback and returns from a parent on the habitat map', async ({ page }) => {
  1897 |   await page.setViewportSize({width:1440,height:1100});await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  1898 |   await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  1899 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel,world=m.step(m.step(m.create(2026)));return {world,child:world.history[2].population[0]};});
  1900 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture.world,islandStudy:{seed:2026,selectedId:fixture.child.id,introDismissed:true}}},undefined,{expectCanvas:false});
  1901 |   await page.getByRole('button',{name:'Play evolution',exact:false}).evaluate(async button=>{(button as HTMLButtonElement).click();await new Promise(resolve=>setTimeout(resolve,80));(document.querySelector('.ei-birth-shortcut') as HTMLButtonElement).click();});
  1902 |   await expect(page.getByRole('button',{name:'Play evolution',exact:false})).toBeVisible();await page.waitForTimeout(2000);
  1903 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  1904 |   const birth=page.locator('.ei-birth-resemblance');await birth.locator('[data-visit-parent]').first().click();
  1905 |   await page.locator('[data-life-visit="birth"]').click();await expect(page.locator('.ei-stage')).toBeFocused();await expect(page.locator('.ei-parent-return')).toBeAttached();
  1906 |   await expect(page.locator('.ei-map-creature').filter({hasText:new RegExp('^'+fixture.child.parents[0]+'$')})).toHaveCount(1);
  1907 |   await page.getByRole('button',{name:'Back to this offspring',exact:true}).click();await expect(birth.locator('> summary')).toBeFocused();
  1908 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation','2');await expect(page.locator('.ei-parent-return')).toHaveCount(0);
  1909 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  1910 | });
  1911 | 
```