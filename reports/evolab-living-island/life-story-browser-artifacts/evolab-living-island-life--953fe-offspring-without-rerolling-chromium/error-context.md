# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> life story replays an individual across a climate shift and follows any real offspring without rerolling
- Location: tests\e2e\evolab-living-island.spec.ts:1589:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.ei-stage-label')
Expected substring: "Sunlit meadow"
Error: strict mode violation: locator('.ei-stage-label') resolved to 2 elements:
    1) <div class="ei-stage-label">…</div> aka getByText('☀ Sunlit meadowWorld seed')
    2) <div class="ei-stage-label">…</div> aka getByText('Generation 4Replay · recorded')

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('.ei-stage-label')

```

# Test source

```ts
  1518 |   await expect(page.locator('[data-variation-bin="' + chosen + '"]')).toBeFocused();
  1519 |   expect((await sceneData()).count).toBe(0);
  1520 |   await page.locator('[data-variation-bin="' + chosen + '"]').click(); await page.selectOption('#ei-lens', 'legs');
  1521 |   await expect(page.locator('[data-selected-range]')).toHaveCount(0); expect((await sceneData()).count).toBe(0);
  1522 |   expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(contexts);
  1523 |   await page.locator('[data-variation-bin="2"]').click();
  1524 |   await page.evaluate(() => { const w = window as any, mesh = w.__glRecorder.records.find((r:any)=>r.scene && r.canvas.isConnected).scene.getObjectByName('Trait range spotlight'); w.__rangeDisposed = { mesh:0, material:0, geometry:0 }; mesh.addEventListener('dispose',()=>w.__rangeDisposed.mesh++); mesh.material.addEventListener('dispose',()=>w.__rangeDisposed.material++); mesh.geometry.addEventListener('dispose',()=>w.__rangeDisposed.geometry++); });
  1525 |   await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  1526 |   expect(await page.evaluate(() => (window as any).__rangeDisposed)).toEqual({ mesh:1,material:1,geometry:1 });
  1527 |   await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  1528 |   await expect(page.locator('#ei-lens')).toHaveValue('legs'); await expect(page.locator('[data-selected-range]')).toHaveCount(0);
  1529 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  1530 |   expect(errors).toEqual([]);
  1531 | });
  1532 | 
  1533 | test('variation explorer on a phone supports exact boundary values, keyboard spotlight and zero-valued organisms', async ({ page }) => {
  1534 |   await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion:'reduce' });
  1535 |   await harness.mount(page, { evoLab: { view:'livingIsland' } });
  1536 |   const world = await page.evaluate(() => {
  1537 |     const m = (window as any).StemLab.evoIslandModel, w = m.create(42), values = [0,0.2,0.4,0.6,0.8,1];
  1538 |     w.history[0].population = w.history[0].population.slice(0,6).map((o:any,i:number)=>({ ...o, genes:{...o.genes,fur:[values[i],values[i]]} })); w.history[0].stats=m.stats(w.history[0].population); w.nextId=7; if (!m.restore(w)) throw new Error('Invalid boundary fixture'); return w;
  1539 |   });
  1540 |   await harness.mount(page, { evoLab: { view:'livingIsland',island:world,islandStudy:{seed:42,introDismissed:true,lens:'fur'} } });
  1541 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width='100%'; document.body.style.padding='0'; });
  1542 |   await expect(page.locator('[data-variation-bin] strong')).toHaveText(['1','1','1','1','2']);
  1543 |   await page.locator('[data-variation-bin="4"]').focus(); await page.keyboard.press('Enter');
  1544 |   await expect(page.locator('.ei-variation-detail')).toContainText('2 / 6 · 33.3%');
  1545 |   await expect(page.locator('.ei-variation-detail')).toContainText('Advance once to compare');
  1546 |   await page.getByRole('button', { name:'Meet the next match',exact:true }).click(); await expect(page.locator('#ei-organism')).toHaveValue('5');
  1547 |   await page.getByRole('button', { name:'Meet the next match',exact:true }).click(); await expect(page.locator('#ei-organism')).toHaveValue('6');
  1548 |   await page.locator('[data-variation-bin="0"]').click(); await page.getByRole('button',{name:'Meet the next match',exact:true}).click();
  1549 |   await expect(page.locator('#ei-organism')).toHaveValue('1'); await expect(page.locator('.ei-name-chip')).toContainText('0.0/100');
  1550 |   await page.getByRole('button',{name:'Find this range on the island',exact:true}).click();
  1551 |   await expect(page.locator('.ei-stage')).toBeFocused();
  1552 |   const placement=await page.evaluate(()=>({stageTop:document.querySelector('.ei-stage')!.getBoundingClientRect().top,barBottom:document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom}));
  1553 |   expect(placement.stageTop).toBeGreaterThanOrEqual(placement.barBottom-1);
  1554 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  1555 |   await page.locator('.ei-variation').screenshot({path:report+'/variation-explorer-phone.png'});
  1556 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  1557 |   expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-variation',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  1558 |   await page.getByRole('button',{name:'Clear spotlight',exact:true}).click(); await expect(page.locator('[data-variation-bin="0"]')).toBeFocused();
  1559 |   await page.selectOption('#ei-lens','natural'); await expect(page.locator('.ei-variation')).toHaveCount(0); await expect(page.locator('[data-spotlight-count]')).toHaveCount(0);
  1560 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(world);
  1561 | });
  1562 | 
  1563 | test('variation explorer without WebGL follows a watched extinction with no invented percentage', async ({ page }) => {
  1564 |   await page.setViewportSize({width:1440,height:1100});
  1565 |   await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  1566 |   await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  1567 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;for(let seed=1;seed<50;seed++){const world=m.create(seed);world.history[0].population=world.history[0].population.slice(0,2);world.history[0].stats=m.stats(world.history[0].population);world.nextId=3;const next=m.step(world);if(next.history[1].survivors.length===1){const survivor=world.history[0].population.find((o:any)=>o.id===next.history[1].survivors[0]);return {world,next,bin:Math.min(4,Math.floor(m.value(survivor,'fur')*5))};}}});
  1568 |   expect(fixture).toBeTruthy();
  1569 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture!.world,islandStudy:{seed:fixture!.world.seed,introDismissed:true,lens:'fur'}}},undefined,{expectCanvas:false});
  1570 |   await page.locator('[data-variation-bin="'+fixture!.bin+'"]').click();
  1571 |   await page.getByRole('button',{name:'Watch a generation',exact:true}).click();
  1572 |   await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','parents');
  1573 |   await expect(page.locator('.ei-map-creature')).toHaveCount(2);
  1574 |   await page.locator('[data-range-phase="survivors"]').click();
  1575 |   await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','survivors');
  1576 |   await expect(page.locator('.ei-map-creature')).toHaveCount(1); await expect(page.locator('.ei-map-creature[data-spotlight=true]')).toHaveCount(1);
  1577 |   await expect(page.locator('[data-range-phase="survivors"]')).toContainText('100.0%');
  1578 |   await page.locator('[data-range-phase="offspring"]').click();
  1579 |   await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','offspring');
  1580 |   await expect(page.locator('.ei-map-creature')).toHaveCount(0);
  1581 |   await expect(page.locator('[data-range-phase="offspring"] strong')).toHaveText('—');
  1582 |   await expect(page.locator('[data-range-phase="offspring"]')).toHaveAttribute('data-range-total','0');
  1583 |   await expect(page.locator('.ei-variation-detail')).toContainText('No organisms fall in this range');
  1584 |   await expect(page.getByRole('button',{name:'Meet the next match',exact:true})).toBeDisabled();
  1585 |   await page.locator('[data-range-phase="parents"]').click(); await expect(page.locator('.ei-map-creature')).toHaveCount(2);
  1586 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture!.next);
  1587 | });
  1588 | 
  1589 | test('life story replays an individual across a climate shift and follows any real offspring without rerolling', async ({ page }) => {
  1590 |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  1591 |   await page.setViewportSize({ width: 1440, height: 1100 });
  1592 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  1593 |   const fixture = await page.evaluate(() => {
  1594 |     const w = window as any, m = w.StemLab.evoIslandModel; let world = m.create(2026);
  1595 |     for (let i = 0; i < 6; i++) world = m.step(world);
  1596 |     world.habitat = 'snow'; world.selection = false;
  1597 |     const lives = world.history[4].population.map((o: any) => w.StemLab.evoIslandStudy.lineage(world, o.id));
  1598 |     const life = lives.find((l: any) => l.children.length > 4);
  1599 |     return { world, life, birthName: m.habitats[life.birthHabitat].name, roundName: m.habitats[life.round.habitat].name };
  1600 |   });
  1601 |   expect(fixture.life).toBeTruthy();
  1602 |   await harness.mount(page, { evoLab: { view: 'livingIsland', island: fixture.world, islandStudy: { seed: 2026, introDismissed: true, selectedId: fixture.life.organism.id } } });
  1603 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  1604 |   const contexts = (await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id); expect(contexts).toHaveLength(1);
  1605 |   await page.getByRole('button', { name: 'Follow this life', exact: false }).click();
  1606 |   const life = page.getByRole('region', { name: 'Life story', exact: true });
  1607 |   await expect(life).toBeFocused(); await expect(life).toHaveAttribute('data-life-id', String(fixture.life.organism.id));
  1608 |   await expect(life.locator('[data-life-step="birth"]')).toContainText(fixture.birthName);
  1609 |   await expect(life.locator('[data-life-step="survival"]')).toContainText(fixture.roundName);
  1610 |   await expect(life).toContainText('The habitat changed after this organism was born');
  1611 |   await expect(life.locator('[data-life-chance]')).toHaveText((fixture.life.round.chance * 100).toFixed(1) + '%');
  1612 |   await expect(page.locator('#ei-life-child option')).toHaveCount(fixture.life.children.length);
  1613 |   for (const chapter of ['birth', 'parents', 'survivors', 'offspring']) {
  1614 |     await life.locator('[data-life-visit="' + chapter + '"]').click();
  1615 |     await expect(page.locator('.ei-stage')).toBeFocused();
  1616 |     await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', chapter === 'birth' ? '4' : '5');
  1617 |     await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', chapter === 'birth' ? 'offspring' : chapter);
> 1618 |     await expect(page.locator('.ei-stage-label')).toContainText(chapter === 'birth' ? fixture.birthName : fixture.roundName);
       |                                                   ^ Error: expect(locator).toContainText(expected) failed
  1619 |     if (chapter === 'survivors') await expect(page.locator('.ei-life-context')).toContainText('Still here among the recorded survivors');
  1620 |     if (chapter === 'offspring') await expect(page.locator('.ei-life-context')).toContainText('viewing the entire offspring cohort');
  1621 |     expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  1622 |     const placement = await page.evaluate(() => ({ stageTop: document.querySelector('.ei-stage')!.getBoundingClientRect().top, barBottom: document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom }));
  1623 |     expect(placement.stageTop).toBeGreaterThanOrEqual(placement.barBottom - 1);
  1624 |     await page.getByRole('button', { name: 'Back to life story', exact: true }).click(); await expect(life).toBeFocused();
  1625 |   }
  1626 |   await life.screenshot({ path: report + '/life-story-desktop.png', style: '.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  1627 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  1628 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-life', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id:v.id,nodes:v.nodes.map((n:any)=>n.target) }))))).toEqual([]);
  1629 |   const child = fixture.life.children[fixture.life.children.length - 1];
  1630 |   await page.selectOption('#ei-life-child', String(child.id));
  1631 |   await page.getByRole('button', { name: 'Follow this offspring', exact: true }).click();
  1632 |   await expect(life).toHaveAttribute('data-life-id', String(child.id)); await expect(life).toBeFocused();
  1633 |   await expect(page.locator('.ei-life-context')).toHaveCount(0);
  1634 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  1635 |   expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(contexts);
  1636 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  1637 |   await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  1638 |   await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  1639 |   await page.getByRole('button', { name: 'Follow this life', exact: false }).click();
  1640 |   await expect(life).toHaveAttribute('data-life-id', String(child.id)); await expect(page.locator('.ei-life-context')).toHaveCount(0);
  1641 |   expect(errors).toEqual([]);
  1642 | });
  1643 | 
  1644 | test('life story on a phone keeps an unwritten fate unknown and updates after one watched generation', async ({ page }) => {
  1645 |   await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  1646 |   await harness.mount(page, { evoLab: { view: 'livingIsland', islandStudy: { seed: 2026, selectedId: 1, introDismissed: true } } });
  1647 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width='100%'; document.body.style.padding='0'; });
  1648 |   const world = await page.evaluate(() => (window as any).__toolData.evoLab.island);
  1649 |   await page.getByRole('button', { name: 'Follow this life', exact: false }).focus(); await page.keyboard.press('Enter');
  1650 |   const life = page.locator('.ei-life'); await expect(life).toBeFocused();
  1651 |   await expect(life).toHaveAttribute('data-life-outcome', 'pending'); await expect(life).toContainText('Unrecorded offspring are unknown, not zero.');
  1652 |   await expect(life.locator('[data-life-chance]')).toHaveCount(0); await expect(life.locator('[data-life-children]')).toHaveCount(0);
  1653 |   await page.locator('[data-life-visit="birth"]').focus(); await page.keyboard.press('Enter');
  1654 |   await expect(page.locator('.ei-stage')).toBeFocused(); await expect(page.locator('.ei-life-context')).toContainText('birth generation');
  1655 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  1656 |   const next = await page.evaluate(() => { const w = window as any; return w.StemLab.evoIslandModel.step(w.__toolData.evoLab.island); });
  1657 |   await page.getByRole('button', { name: 'Watch a generation', exact: true }).click();
  1658 |   await expect(page.locator('.ei-life-context')).toHaveCount(0);
  1659 |   await page.getByRole('button', { name: 'Reveal survivors', exact: false }).click();
  1660 |   await page.getByRole('button', { name: 'Meet the offspring', exact: false }).click();
  1661 |   await page.getByRole('button', { name: 'Finish walkthrough', exact: true }).click();
  1662 |   await page.getByRole('tab', { name: 'Families', exact: true }).click();
  1663 |   const observed = await page.evaluate(() => { const w = window as any; return w.StemLab.evoIslandStudy.lineage(w.__toolData.evoLab.island, 1); });
  1664 |   await expect(life).toHaveAttribute('data-life-outcome', observed.outcome);
  1665 |   await expect(life.locator('[data-life-children]')).toHaveText(observed.children.length + ' direct offspring');
  1666 |   await life.screenshot({ path: report + '/life-story-phone.png', style: '.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  1667 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  1668 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  1669 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-life', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id:v.id,nodes:v.nodes.map((n:any)=>n.target) }))))).toEqual([]);
  1670 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(next);
  1671 | });
  1672 | 
  1673 | test('life story without WebGL separates a lone survivor from the organism that died', async ({ page }) => {
  1674 |   await page.setViewportSize({ width:1440,height:1100 });
  1675 |   await page.addInitScript(() => { const get=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any; });
  1676 |   await harness.mount(page, { evoLab:{view:'livingIsland'} }, undefined, {expectCanvas:false});
  1677 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;for(let seed=1;seed<50;seed++){const w=m.create(seed);w.history[0].population=w.history[0].population.slice(0,2);w.history[0].stats=m.stats(w.history[0].population);w.nextId=3;const world=m.step(w);if(world.history[1].survivors.length===1)return {world,id:world.history[1].survivors[0],other:world.history[0].population.find((o:any)=>!world.history[1].survivors.includes(o.id)).id};}});
  1678 |   expect(fixture).toBeTruthy();
  1679 |   await harness.mount(page, {evoLab:{view:'livingIsland',island:fixture!.world,islandStudy:{seed:fixture!.world.seed,selectedId:fixture!.id,introDismissed:true}}}, undefined, {expectCanvas:false});
  1680 |   await page.getByRole('button',{name:'Follow this life',exact:false}).click();
  1681 |   const life=page.locator('.ei-life'); await expect(life).toHaveAttribute('data-life-outcome','no-offspring');
  1682 |   await expect(life).toContainText('Fewer than two residents survived'); await expect(life.locator('[data-life-children]')).toHaveText('0 direct offspring');
  1683 |   await page.locator('[data-life-visit="survivors"]').click(); await expect(page.locator('.ei-map-creature')).toHaveCount(1); await expect(page.locator('.ei-life-context')).toContainText('Still here');
  1684 |   await page.getByRole('button',{name:'Back to life story',exact:true}).click();
  1685 |   await page.locator('[data-life-visit="offspring"]').click(); await expect(page.locator('.ei-map-creature')).toHaveCount(0); await expect(page.locator('.ei-life-context')).toContainText('0 direct offspring');
  1686 |   await page.getByRole('button',{name:'Back to life story',exact:true}).click(); await page.locator('[data-life-visit="birth"]').click();
  1687 |   await page.getByRole('tab',{name:'Explore',exact:true}).click(); await page.selectOption('#ei-organism',String(fixture!.other));
  1688 |   await expect(page.locator('.ei-life-context')).toHaveCount(0); await page.getByRole('button',{name:'Follow this life',exact:false}).click();
  1689 |   await expect(life).toHaveAttribute('data-life-outcome','not-survived'); await expect(life).toContainText('did not survive to reproduce');
  1690 |   await page.locator('[data-life-visit="parents"]').click(); await expect(page.locator('.ei-map-creature')).toHaveCount(2);
  1691 |   await page.getByRole('button',{name:'Back to life story',exact:true}).click(); await page.locator('[data-life-visit="survivors"]').click();
  1692 |   await expect(page.locator('.ei-map-creature')).toHaveCount(1); await expect(page.locator('.ei-life-context')).toContainText('Absent from this survivor group');
  1693 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture!.world);
  1694 | });
  1695 | 
```