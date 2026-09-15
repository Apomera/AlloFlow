# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 17-memory-palace-gl.spec.ts >> keeps newer art when image loads fail or finish out of order
- Location: tests\e2e\17-memory-palace-gl.spec.ts:818:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  749 |     await expect.poll(() => page.evaluate(() => (window as any).__lastCamera.aspect)).toBeCloseTo(500/600,3);
  750 |     expect(await page.evaluate(() => (window as any).__lastCamera.position.toArray())).toEqual(position);
  751 |   });
  752 | 
  753 |   for (const theme of ['gallery', 'pasture', 'space']) {
  754 |     test('keeps the ' + theme + ' environment stable through mobile study, recall, and teardown', async ({ page }) => {
  755 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  756 |       await mount(page, SAMPLE, { theme });
  757 |       const skyFingerprint = () => page.evaluate(() => {
  758 |         const w = window as any; let sky: any;
  759 |         w.__lastScene.traverse((o: any) => { if (o.userData.visualRole === 'sky-dome') sky = o; });
  760 |         if (!sky?.material?.map?.image) return null;
  761 |         const canvas = sky.material.map.image;
  762 |         const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  763 |         let hash = 2166136261; const colors = new Set<string>();
  764 |         for (let i = 0; i < pixels.length; i += 64) {
  765 |           hash = Math.imul(hash ^ pixels[i], 16777619);
  766 |           colors.add(pixels[i] + ',' + pixels[i + 1] + ',' + pixels[i + 2]);
  767 |         }
  768 |         return { theme: sky.userData.environment, hash: hash >>> 0, colors: colors.size };
  769 |       });
  770 |       const studySky = await skyFingerprint();
  771 |       expect(studySky?.theme).toBe(theme);
  772 |       expect(studySky?.colors).toBeGreaterThan(100);
  773 |       await page.setViewportSize({ width: 390, height: 844 });
  774 |       await page.evaluate(() => { const wrap = document.getElementById('wrap')!; wrap.style.width = '390px'; wrap.style.height = '740px'; (window as any).__handle.goTo(1); });
  775 |       await expect(page.locator('[data-palace-overlay="focus"]')).toContainText('Evaporation');
  776 |       await expect.poll(() => page.evaluate(() => (window as any).__lastCamera.aspect)).toBeCloseTo(390 / 740, 3);
  777 |       expect(await skyFingerprint()).toEqual(studySky);
  778 |       await page.locator('[data-palace-action="overview"]').click();
  779 |       await expect.poll(() => page.evaluate(() => (window as any).__lastCamera.position.y)).toBeGreaterThan(1000);
  780 |       expect(await skyFingerprint()).toEqual(studySky);
  781 |       await page.evaluate(() => {
  782 |         const w = window as any; w.__skyDisposals = 0;
  783 |         w.__contactDisposals = { texture: 0, geometry: 0 };
  784 |         w.__entranceDisposals = { globe: 0, pedestal: 0 };
  785 |         w.__lastScene.traverse((o: any) => {
  786 |           if (o.userData.visualRole === 'entrance-globe') o.material.map.addEventListener('dispose', () => w.__entranceDisposals.globe++);
  787 |           if (o.userData.visualRole === 'entrance-pedestal') o.material.map.addEventListener('dispose', () => w.__entranceDisposals.pedestal++);
  788 |         });
  789 |         w.__lastScene.traverse((o: any) => {
  790 |           if (o.userData.visualRole !== 'ground-contact-shades') return;
  791 |           o.material.map.addEventListener('dispose', () => w.__contactDisposals.texture++);
  792 |           o.geometry.addEventListener('dispose', () => w.__contactDisposals.geometry++);
  793 |         });
  794 |         w.__lastScene.traverse((o: any) => { if (o.userData.visualRole === 'sky-dome') o.material.map.addEventListener('dispose', () => w.__skyDisposals++); });
  795 |         w.__handle.destroy();
  796 |       });
  797 |       expect(await page.evaluate(() => (window as any).__skyDisposals)).toBeGreaterThan(0);
  798 |       const contactDisposals = await page.evaluate(() => (window as any).__contactDisposals);
  799 |       expect(contactDisposals.texture).toBeGreaterThan(0);
  800 |       expect(contactDisposals.geometry).toBeGreaterThan(0);
  801 |       const entranceDisposals = await page.evaluate(() => (window as any).__entranceDisposals);
  802 |       expect(entranceDisposals.globe).toBeGreaterThan(0);
  803 |       expect(entranceDisposals.pedestal).toBeGreaterThan(0);
  804 |       await page.evaluate(([data, theme]) => (window as any).__mount(data, { theme, recall: true }), [SAMPLE, theme]);
  805 |       await expect.poll(skyFingerprint).toEqual(studySky);
  806 |       await expect(page.locator('[data-palace-overlay="focus"]')).toBeHidden();
  807 |       await page.evaluate(() => (window as any).__handle.goTo(1));
  808 |       await expect(page.locator('[data-palace-action="expand-cue"]')).toBeHidden();
  809 |       await expect(page.locator('[data-palace-overlay="journey"]')).toBeHidden();
  810 |       expect(await skyFingerprint()).toEqual(studySky);
  811 |       expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  812 |       expect((await page.evaluate(() => (window as any).__glLive())).lost).toBe(false);
  813 |     });
  814 |   }
  815 | 
  816 | });
  817 | 
  818 | test('keeps newer art when image loads fail or finish out of order', async ({ page }) => {
  819 |   await mount(page);
  820 |   const result = await page.evaluate(() => {
  821 |     const w = window as any, T = w.THREE, h = w.__handle;
  822 |     let frame: any; w.__lastScene.traverse((o: any) => { if(o.userData.locusId === 'b0_i0' && o.material?.map) frame=o; });
  823 |     const old = frame.material.map, requests: any[] = [];
  824 |     const original = T.TextureLoader.prototype.load;
  825 |     T.TextureLoader.prototype.load = function(url: string, ok: any, progress: any, fail: any) {
  826 |       const texture = new T.Texture(); let disposed = false; texture.addEventListener('dispose',()=>{disposed=true;});
  827 |       requests.push({url,ok,fail,texture,disposed:()=>disposed}); return texture;
  828 |     };
  829 |     try {
  830 |       h.setLocusImage('b0_i0','broken');
  831 |       const keptDuringLoad=frame.material.map===old; requests[0].fail();
  832 |       const keptOnFailure=frame.material.map===old;
  833 |       h.setLocusImage('b0_i0','older'); h.setLocusImage('b0_i0','newer');
  834 |       requests[2].ok(requests[2].texture); requests[1].ok(requests[1].texture);
  835 |       const newestWins=frame.material.map===requests[2].texture && requests[1].disposed();
  836 |       h.setLocusImage('b0_i0','cleared'); h.clearLocus('b0_i0'); const cleared=frame.material.map;
  837 |       requests[3].ok(requests[3].texture);
  838 |       const clearWins=frame.material.map===cleared && requests[3].disposed();
  839 |       h.setLocusRelief('b0_i0','color-one','depth-one');
  840 |       h.setLocusRelief('b0_i0','color-two','depth-two');
  841 |       const oldDepthDisposed=requests[5].disposed();
  842 |       const replacement=frame.material.map; requests[4].fail();
  843 |       const staleFailureIgnored=frame.material.map===replacement;
  844 |       requests[7].fail();
  845 |       const failedDepthFlat=frame.material.displacementMap===null && frame.material.displacementBias===0;
  846 |       return {keptDuringLoad,keptOnFailure,newestWins,clearWins,oldDepthDisposed,staleFailureIgnored,failedDepthFlat};
  847 |     } finally { T.TextureLoader.prototype.load=original; }
  848 |   });
> 849 |   expect(Object.values(result).every(Boolean)).toBe(true);
      |                                                ^ Error: expect(received).toBe(expected) // Object.is equality
  850 | });
  851 | 
  852 | test('isolates failed and empty model loads from replacement sculptures', async ({ page }) => {
  853 |   await mount(page);
  854 |   const result = await page.evaluate(async () => {
  855 |     const w=window as any, T=w.THREE, h=w.__handle, pending:any[]=[];
  856 |     w.AlloModules.GlbLibrary={listCatalog:()=>[{id:'test'}],loadModel:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))};
  857 |     h.setLocusObject('b0_i0',{glbItem:'test'});
  858 |     h.replaceLocusObject('b0_i0',{glbItem:'test'});
  859 |     pending[0].reject(Error('late old failure')); await Promise.resolve(); await Promise.resolve();
  860 |     const fig=new T.Group();fig.name='replacement-model';fig.add(new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial()));
  861 |     pending[1].resolve(fig);await Promise.resolve();await Promise.resolve();
  862 |     const replacementSurvived=!!w.__lastScene.getObjectByName('replacement-model');
  863 |     h.setLocusObject('b0_i1',{glbItem:'test'});pending[2].resolve(null);await Promise.resolve();await Promise.resolve();
  864 |     h.setLocusObject('b0_i1',{glbItem:'test'});
  865 |     const emptyLoadRetry=pending.length===4;
  866 |     pending[3]?.resolve(null);
  867 |     return {replacementSurvived,emptyLoadRetry};
  868 |   });
  869 |   expect(result).toEqual({replacementSurvived:true,emptyLoadRetry:true});
  870 | });
  871 | 
```