# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 17-memory-palace-gl.spec.ts >> Memory Palace — real WebGL walk >> keeps the space environment stable through mobile study, recall, and teardown
- Location: tests\e2e\17-memory-palace-gl.spec.ts:701:9

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  638 |       const start = await position();
  639 |       await page.tap('[data-palace-action="step-forward"]');
  640 |       await page.waitForFunction(start => Math.hypot((window as any).__lastCamera.position.x-start[0], (window as any).__lastCamera.position.z-start[2]) > 60, start);
  641 |       const forward = await position();
  642 |       expect(Math.hypot(forward[0]-start[0], forward[2]-start[2])).toBeCloseTo(64, 1);
  643 |       await page.tap('[data-palace-action="step-back"]');
  644 |       await page.waitForFunction(start => Math.hypot((window as any).__lastCamera.position.x-start[0], (window as any).__lastCamera.position.z-start[2]) < 1, start);
  645 |       const rotation = await page.evaluate(() => (window as any).__lastCamera.quaternion.toArray());
  646 |       await page.tap('[data-palace-action="turn-left"]');
  647 |       await page.waitForFunction(q => (window as any).__lastCamera.quaternion.toArray().some((v: number, i: number) => Math.abs(v-q[i]) > .01), rotation);
  648 |       await page.evaluate(() => { for (let i=0;i<30;i++) (document.querySelector('[data-palace-action="step-forward"]') as HTMLButtonElement).click(); });
  649 |       await expect(page.locator('[data-palace-overlay="free-nav"]')).toHaveAttribute('data-blocked', 'true');
  650 |       const roomKey = await page.evaluate(data => {
  651 |         const w=window as any; const p=w.AlloModules.MemoryPalace.buildPalace(data);
  652 |         return w.AlloModules.MemoryPalace.roomAtPoint(p,w.__lastCamera.position.x,w.__lastCamera.position.z)?.roomKey;
  653 |       }, SAMPLE);
  654 |       expect(roomKey).toBe('b0');
  655 |       await page.evaluate(() => { document.getElementById('wrap')!.style.width='320px'; document.documentElement.style.fontSize='28px'; });
  656 |       await page.waitForTimeout(200);
  657 |       const viewportBox=(await page.locator('[data-memory-palace-viewport]').boundingBox())!;
  658 |       for(const action of ['turn-left','step-forward','step-back','turn-right']) {
  659 |         const box=(await page.locator('[data-palace-action="'+action+'"]').boundingBox())!;
  660 |         expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  661 |         expect(box.x).toBeGreaterThanOrEqual(viewportBox.x); expect(box.x+box.width).toBeLessThanOrEqual(viewportBox.x+viewportBox.width);
  662 |       }
  663 |       const box=(await controls.boundingBox())!;
  664 |       const dock=(await page.locator('[data-palace-overlay="dock"]').boundingBox())!;
  665 |       expect(box.y+box.height).toBeLessThan(dock.y);
  666 |       await page.getByRole('button', { name: 'Return to guided route', exact: true }).tap();
  667 |       await expect(controls).toBeHidden();
  668 |       await expect(page.locator('[data-palace-overlay="focus"]')).toContainText('Evaporation');
  669 |       await expect(page.locator('#wrap canvas')).toBeFocused();
  670 |       expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  671 |     });
  672 |   });
  673 | 
  674 |   test('fits the framed memory on portrait resize while keeping the camera inside the room', async ({ page }) => {
  675 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  676 |     await mount(page);
  677 |     await page.evaluate(() => { (window as any).__handle.goTo(1); document.getElementById('wrap')!.style.width='390px'; document.getElementById('wrap')!.style.height='740px'; });
  678 |     const frameEdges = () => page.evaluate(() => {
  679 |       const w=window as any; let frame: any;
  680 |       w.__lastScene.traverse((o: any) => { if(o.userData.visualRole==='locus-caption' && o.userData.locusId==='b0_i0') frame=o.parent; });
  681 |       if(!frame) return [-2,2];
  682 |       const projected: number[]=[];
  683 |       frame.children.filter((o: any) => o.userData.visualRole==='frame-molding').forEach((rail: any) => {
  684 |         const box=new w.THREE.Box3().setFromObject(rail);
  685 |         for(const x of [box.min.x,box.max.x]) for(const y of [box.min.y,box.max.y]) for(const z of [box.min.z,box.max.z]) projected.push(new w.THREE.Vector3(x,y,z).project(w.__lastCamera).x);
  686 |       });
  687 |       return [Math.min(...projected),Math.max(...projected)];
  688 |     });
  689 |     await expect.poll(async () => { const [left,right]=await frameEdges(); return left > -.9 && right < .9; }, { timeout: 15000 }).toBe(true);
  690 |     const roomKey=await page.evaluate(data => { const w=window as any; return w.AlloModules.MemoryPalace.roomAtPoint(w.AlloModules.MemoryPalace.buildPalace(data),w.__lastCamera.position.x,w.__lastCamera.position.z)?.roomKey; }, SAMPLE);
  691 |     expect(roomKey).toBe('b0');
  692 |     expect(await page.evaluate(() => (window as any).__lastCamera.fov)).toBe(58);
  693 |     await page.locator('[data-palace-action="inspect-room"]').click();
  694 |     await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  695 |     const position=await page.evaluate(() => (window as any).__lastCamera.position.toArray());
  696 |     await page.evaluate(() => { document.getElementById('wrap')!.style.width='500px'; document.getElementById('wrap')!.style.height='600px'; });
  697 |     await expect.poll(() => page.evaluate(() => (window as any).__lastCamera.aspect)).toBeCloseTo(500/600,3);
  698 |     expect(await page.evaluate(() => (window as any).__lastCamera.position.toArray())).toEqual(position);
  699 |   });
  700 | 
  701 |   for (const theme of ['gallery', 'pasture', 'space']) {
  702 |     test('keeps the ' + theme + ' environment stable through mobile study, recall, and teardown', async ({ page }) => {
  703 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  704 |       await mount(page, SAMPLE, { theme });
  705 |       const skyFingerprint = () => page.evaluate(() => {
  706 |         const w = window as any; let sky: any;
  707 |         w.__lastScene.traverse((o: any) => { if (o.userData.visualRole === 'sky-dome') sky = o; });
  708 |         if (!sky?.material?.map?.image) return null;
  709 |         const canvas = sky.material.map.image;
  710 |         const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  711 |         let hash = 2166136261; const colors = new Set<string>();
  712 |         for (let i = 0; i < pixels.length; i += 64) {
  713 |           hash = Math.imul(hash ^ pixels[i], 16777619);
  714 |           colors.add(pixels[i] + ',' + pixels[i + 1] + ',' + pixels[i + 2]);
  715 |         }
  716 |         return { theme: sky.userData.environment, hash: hash >>> 0, colors: colors.size };
  717 |       });
  718 |       const studySky = await skyFingerprint();
  719 |       expect(studySky?.theme).toBe(theme);
  720 |       expect(studySky?.colors).toBeGreaterThan(100);
  721 |       await page.setViewportSize({ width: 390, height: 844 });
  722 |       await page.evaluate(() => { const wrap = document.getElementById('wrap')!; wrap.style.width = '390px'; wrap.style.height = '740px'; (window as any).__handle.goTo(1); });
  723 |       await expect(page.locator('[data-palace-overlay="focus"]')).toContainText('Evaporation');
  724 |       await expect.poll(() => page.evaluate(() => (window as any).__lastCamera.aspect)).toBeCloseTo(390 / 740, 3);
  725 |       expect(await skyFingerprint()).toEqual(studySky);
  726 |       await page.locator('[data-palace-action="overview"]').click();
  727 |       await expect.poll(() => page.evaluate(() => (window as any).__lastCamera.position.y)).toBeGreaterThan(1000);
  728 |       expect(await skyFingerprint()).toEqual(studySky);
  729 |       await page.evaluate(() => {
  730 |         const w = window as any; w.__skyDisposals = 0;
  731 |         w.__lastScene.traverse((o: any) => { if (o.userData.visualRole === 'sky-dome') o.material.map.addEventListener('dispose', () => w.__skyDisposals++); });
  732 |         w.__handle.destroy();
  733 |       });
  734 |       expect(await page.evaluate(() => (window as any).__skyDisposals)).toBeGreaterThan(0);
  735 |       await page.evaluate(([data, theme]) => (window as any).__mount(data, { theme, recall: true }), [SAMPLE, theme]);
  736 |       await expect.poll(skyFingerprint).toEqual(studySky);
  737 |       await expect(page.locator('[data-palace-overlay="focus"]')).toBeHidden();
> 738 |       await page.evaluate(() => (window as any).__handle.goTo(1));
      |                                                                                        ^ Error: expect(received).toBe(expected) // Object.is equality
  739 |       await expect(page.locator('[data-palace-action="expand-cue"]')).toBeHidden();
  740 |       await expect(page.locator('[data-palace-overlay="journey"]')).toBeHidden();
  741 |       expect(await skyFingerprint()).toEqual(studySky);
  742 |       expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  743 |       expect((await page.evaluate(() => (window as any).__glLive())).lost).toBe(false);
  744 |     });
  745 |   }
  746 | 
  747 | });
  748 | 
```