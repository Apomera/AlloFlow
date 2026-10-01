# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> variation explorer spotlights real trait ranges in 3D and compares recorded cohorts without changing organisms
- Location: tests\e2e\evolab-living-island.spec.ts:1465:5

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 115
Received:    -0.015625
```

# Test source

```ts
  1412 |   await expect(page.locator('.ei-watch-steps [aria-current=step]')).toHaveText('2Survivors');
  1413 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  1414 |   await page.locator('.ei-watch-guide').screenshot({ path: report + '/watch-generation-phone.png' });
  1415 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-watch-guide', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id:v.id,nodes:v.nodes.map((n:any)=>n.target) }))))).toEqual([]);
  1416 |   // Ordinary cohort controls remain connected to the same guided round.
  1417 |   await page.getByRole('button', { name: 'Show parents', exact: true }).click();
  1418 |   await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase', 'parents');
  1419 |   await page.getByRole('button', { name: 'Leave walkthrough', exact: true }).click();
  1420 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(snapshot);
  1421 |   await page.locator('#ei-time').focus(); await page.keyboard.press('Home');
  1422 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  1423 |   await expect(page.getByRole('button', { name: 'Watch a generation', exact: true })).toBeDisabled();
  1424 |   await expect(page.locator('.ei-next-round')).toHaveCount(0);
  1425 |   await page.getByRole('button', { name: 'Return to present', exact: true }).click();
  1426 |   await expect(page.getByRole('button', { name: 'Watch a generation', exact: true })).toBeEnabled();
  1427 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(snapshot);
  1428 | });
  1429 | 
  1430 | test('watch a generation without WebGL preserves the real survivor when the population goes extinct', async ({ page }) => {
  1431 |   await page.setViewportSize({ width: 1440, height: 1100 });
  1432 |   await page.addInitScript(() => {
  1433 |     const get = HTMLCanvasElement.prototype.getContext;
  1434 |     HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  1435 |   });
  1436 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } }, undefined, { expectCanvas: false });
  1437 |   const fixture = await page.evaluate(() => {
  1438 |     const m = (window as any).StemLab.evoIslandModel;
  1439 |     for (let seed = 1; seed < 50; seed++) {
  1440 |       const world = m.create(seed); world.history[0].population = world.history[0].population.slice(0, 2);
  1441 |       world.history[0].stats = m.stats(world.history[0].population); world.nextId = 3;
  1442 |       const next = m.step(world); if (next.history[1].survivors.length === 1) return { world, next };
  1443 |     }
  1444 |   });
  1445 |   expect(fixture).toBeTruthy();
  1446 |   await harness.mount(page, { evoLab: { view: 'livingIsland', island: fixture!.world, islandStudy: { seed: fixture!.world.seed, introDismissed: true } } }, undefined, { expectCanvas: false });
  1447 |   await page.getByRole('button', { name: 'Watch a generation', exact: true }).click();
  1448 |   await expect(page.locator('.ei-map-creature')).toHaveCount(2);
  1449 |   await page.getByRole('button', { name: 'Reveal survivors', exact: false }).click();
  1450 |   await expect(page.locator('.ei-map-creature')).toHaveCount(1);
  1451 |   await expect(page.locator('.ei-watch-count')).toHaveText('1Survivors');
  1452 |   await page.getByRole('button', { name: 'Meet the offspring', exact: false }).click();
  1453 |   await expect(page.locator('.ei-map-creature')).toHaveCount(0);
  1454 |   await expect(page.locator('.ei-watch-guide')).toContainText('There is no offspring cohort or mean trait to report.');
  1455 |   await expect(page.getByRole('button', { name: 'Watch a generation', exact: true })).toBeDisabled();
  1456 |   await page.getByRole('button', { name: 'Previous stage', exact: true }).click();
  1457 |   await expect(page.locator('.ei-map-creature')).toHaveCount(1);
  1458 |   await page.getByRole('button', { name: 'Leave walkthrough', exact: true }).click();
  1459 |   await expect(page.locator('.ei-stage')).toBeFocused();
  1460 |   await expect(page.locator('.ei-next-round')).toHaveCount(0);
  1461 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture!.next);
  1462 | });
  1463 | 
  1464 | 
  1465 | test('variation explorer spotlights real trait ranges in 3D and compares recorded cohorts without changing organisms', async ({ page }) => {
  1466 |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  1467 |   await page.setViewportSize({ width: 1440, height: 1100 });
  1468 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  1469 |   const world = await page.evaluate(() => { const m = (window as any).StemLab.evoIslandModel; let w = m.create(2026); for (let i = 0; i < 5; i++) w = m.step(w); return w; });
  1470 |   await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 2026, introDismissed: true, trackedId: 1 } } });
  1471 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  1472 |   const contexts = (await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id); expect(contexts).toHaveLength(1);
  1473 |   await page.selectOption('#ei-lens', 'fur');
  1474 |   const bins = await page.evaluate(() => { const w = window as any; return w.StemLab.evoIslandObservation.distribution(w.__toolData.evoLab.island.history[5].population, 'fur').bins; });
  1475 |   const chosen = bins.reduce((a: any, b: any) => a.count >= b.count ? a : b).index;
  1476 |   async function sceneData() {
  1477 |     return page.evaluate(() => {
  1478 |       const w = window as any, scene = w.__glRecorder.records.find((r: any) => r.scene && r.canvas.isConnected).scene;
  1479 |       const marks = scene.getObjectByName('Trait range spotlight'), sites: any[] = [], coats: any[] = [];
  1480 |       scene.traverse((o: any) => { if (o.userData.islandResident) { sites.push([o.name, ...o.position.toArray()]); o.children[0].traverse((m: any) => { if (m.isMesh && m.material.map) coats.push(m.material.color.getHexString()); }); } });
  1481 |       return { count: marks.count, ids: marks.userData.organismIds, geometry: marks.geometry.uuid, sameBuffer: marks.instanceMatrix === (w.__rangeBuffer || (w.__rangeBuffer = marks.instanceMatrix)), sites, coats };
  1482 |     });
  1483 |   }
  1484 |   const baseline = await sceneData(); expect(baseline.count).toBe(0);
  1485 |   await expect(page.locator('[data-variation-bin]')).toHaveCount(5);
  1486 |   await page.locator('[data-variation-bin="' + chosen + '"]').click();
  1487 |   let marked = await sceneData(); expect(marked.ids).toEqual(bins[chosen].members.map((o: any) => o.id));
  1488 |   expect(marked.sites).toEqual(baseline.sites); expect(marked.coats).toEqual(baseline.coats);
  1489 |   const transition = await page.evaluate(() => { const w = window as any; return w.StemLab.evoIslandStudy.transition(w.__toolData.evoLab.island, 5); });
  1490 |   for (const phase of ['parents', 'survivors', 'offspring']) {
  1491 |     const population = transition[phase];
  1492 |     const members = population.filter((o: any) => { const v = (o.genes.fur[0] + o.genes.fur[1]) / 2; return v >= chosen / 5 && (chosen === 4 ? v <= 1 : v < (chosen + 1) / 5); });
  1493 |     const button = page.locator('[data-range-phase="' + phase + '"]');
  1494 |     await expect(button).toHaveAttribute('data-range-count', String(members.length));
  1495 |     await expect(button).toHaveAttribute('data-range-total', String(population.length));
  1496 |     await expect(button).toContainText((members.length / population.length * 100).toFixed(1) + '%');
  1497 |     await button.click();
  1498 |     await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', phase);
  1499 |     await expect(page.locator('[data-selected-range]')).toHaveAttribute('data-selected-range', String(chosen));
  1500 |     await expect(page.locator('[data-spotlight-count]')).toHaveAttribute('data-spotlight-count', String(members.length));
  1501 |     marked = await sceneData(); expect(marked.ids).toEqual(members.map((o: any) => o.id)); expect(marked.sameBuffer).toBe(true); expect(marked.geometry).toBe(baseline.geometry);
  1502 |     expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  1503 |   }
  1504 |   await page.getByRole('button', { name: 'Meet the next match', exact: true }).click();
  1505 |   await expect(page.locator('#ei-organism')).toHaveValue(String(bins[chosen].members[0].id));
  1506 |   await page.getByRole('button', { name: 'Creature close-up', exact: true }).click(); expect((await sceneData()).count).toBe(1);
  1507 |   await page.getByRole('button', { name: 'Find this range on the island', exact: true }).click();
  1508 |   await expect(page.locator('.ei-stage')).toBeFocused();
  1509 |   await expect(page.getByRole('button', { name: 'Creature close-up', exact: true })).toBeVisible();
  1510 |   expect((await sceneData()).count).toBe(bins[chosen].count);
  1511 |   const placement = await page.evaluate(() => ({ stageTop: document.querySelector('.ei-stage')!.getBoundingClientRect().top, barBottom: document.querySelector('.ei-commandbar')!.getBoundingClientRect().bottom }));
> 1512 |   expect(placement.stageTop).toBeGreaterThanOrEqual(placement.barBottom - 1);
       |                              ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  1513 |   await page.locator('.ei-stage-wrap').screenshot({ path: report + '/variation-spotlight-island.png', style: '.ei-commandbar{position:static!important}' });
  1514 |   await page.locator('.ei-variation').screenshot({ path: report + '/variation-explorer-desktop.png' });
  1515 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  1516 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-lenses', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id:v.id,nodes:v.nodes.map((n:any)=>n.target) }))))).toEqual([]);
  1517 |   await page.getByRole('button', { name: 'Clear spotlight', exact: true }).click();
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
  1550 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  1551 |   await page.locator('.ei-variation').screenshot({path:report+'/variation-explorer-phone.png'});
  1552 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  1553 |   expect(await page.evaluate(async ()=>(window as any).axe.run('.ei-variation',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then((r:any)=>r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))))).toEqual([]);
  1554 |   await page.getByRole('button',{name:'Clear spotlight',exact:true}).click(); await expect(page.locator('[data-variation-bin="0"]')).toBeFocused();
  1555 |   await page.selectOption('#ei-lens','natural'); await expect(page.locator('.ei-variation')).toHaveCount(0); await expect(page.locator('[data-spotlight-count]')).toHaveCount(0);
  1556 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(world);
  1557 | });
  1558 | 
  1559 | test('variation explorer without WebGL follows a watched extinction with no invented percentage', async ({ page }) => {
  1560 |   await page.setViewportSize({width:1440,height:1100});
  1561 |   await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){return type.includes('webgl')?null:(get as any).call(this,type,...args);} as any;});
  1562 |   await harness.mount(page,{evoLab:{view:'livingIsland'}},undefined,{expectCanvas:false});
  1563 |   const fixture=await page.evaluate(()=>{const m=(window as any).StemLab.evoIslandModel;for(let seed=1;seed<50;seed++){const world=m.create(seed);world.history[0].population=world.history[0].population.slice(0,2);world.history[0].stats=m.stats(world.history[0].population);world.nextId=3;const next=m.step(world);if(next.history[1].survivors.length===1){const survivor=world.history[0].population.find((o:any)=>o.id===next.history[1].survivors[0]);return {world,next,bin:Math.min(4,Math.floor(m.value(survivor,'fur')*5))};}}});
  1564 |   expect(fixture).toBeTruthy();
  1565 |   await harness.mount(page,{evoLab:{view:'livingIsland',island:fixture!.world,islandStudy:{seed:fixture!.world.seed,introDismissed:true,lens:'fur'}}},undefined,{expectCanvas:false});
  1566 |   await page.locator('[data-variation-bin="'+fixture!.bin+'"]').click();
  1567 |   await page.getByRole('button',{name:'Watch a generation',exact:true}).click();
  1568 |   await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','parents');
  1569 |   await expect(page.locator('.ei-map-creature')).toHaveCount(2);
  1570 |   await page.locator('[data-range-phase="survivors"]').click();
  1571 |   await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','survivors');
  1572 |   await expect(page.locator('.ei-map-creature')).toHaveCount(1); await expect(page.locator('.ei-map-creature[data-spotlight=true]')).toHaveCount(1);
  1573 |   await expect(page.locator('[data-range-phase="survivors"]')).toContainText('100.0%');
  1574 |   await page.locator('[data-range-phase="offspring"]').click();
  1575 |   await expect(page.locator('.ei-watch-guide')).toHaveAttribute('data-watch-phase','offspring');
  1576 |   await expect(page.locator('.ei-map-creature')).toHaveCount(0);
  1577 |   await expect(page.locator('[data-range-phase="offspring"] strong')).toHaveText('—');
  1578 |   await expect(page.locator('[data-range-phase="offspring"]')).toHaveAttribute('data-range-total','0');
  1579 |   await expect(page.locator('.ei-variation-detail')).toContainText('No organisms fall in this range');
  1580 |   await expect(page.getByRole('button',{name:'Meet the next match',exact:true})).toBeDisabled();
  1581 |   await page.locator('[data-range-phase="parents"]').click(); await expect(page.locator('.ei-map-creature')).toHaveCount(2);
  1582 |   expect(await page.evaluate(()=>(window as any).__toolData.evoLab.island)).toEqual(fixture!.next);
  1583 | });
  1584 | 
```