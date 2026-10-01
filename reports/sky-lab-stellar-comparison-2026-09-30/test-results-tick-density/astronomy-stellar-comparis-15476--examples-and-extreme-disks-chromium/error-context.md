# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: astronomy-stellar-comparison.spec.ts >> phone contrast labels remain readable and contained for the source examples and extreme disks
- Location: tests\e2e\astronomy-stellar-comparison.spec.ts:101:5

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 3
Received:   1.155242919921875
```

# Test source

```ts
  26  |   base = `http://127.0.0.1:${(server.address() as any).port}`;
  27  | });
  28  | test.afterAll(async () => { await new Promise<void>(done => server.close(() => done())); });
  29  | test.afterEach(async ({ page }) => {
  30  |   try {
  31  |     const events = await page.evaluate(() => (window as any).__events);
  32  |     expect(events).toEqual({ errors: [], rejections: [] });
  33  |   } finally {
  34  |     await page.evaluate(() => (window as any).__destroy?.()).catch(() => {});
  35  |   }
  36  | });
  37  | async function mount(page, state, contrast = false) {
  38  |   const errors: string[] = [];
  39  |   page.on('pageerror', error => errors.push(error.message));
  40  |   await page.goto(base + '/__simulators');
  41  |   await page.evaluate(({ state, contrast }) => { (window as any).__contrast = contrast; (window as any).__mount(state); }, { state, contrast });
  42  |   return errors;
  43  | }
  44  | 
  45  | 
  46  | 
  47  | 
  48  | 
  49  | 
  50  | const state=page=>page.evaluate(()=>(window as any).__toolData.astronomy.hrHunt);
  51  | const disks=page=>page.locator('#astronomy-hr-size').evaluate(svg=>{
  52  |  const sun=Number(svg.querySelector('[data-hr-disk="sun"]')!.getAttribute('r'));
  53  |  const star=Number(svg.querySelector('[data-hr-disk="star"]')!.getAttribute('r'));
  54  |  return {sun,star,ratio:star/sun};
  55  | });
  56  | test('published inputs link exact controls, plot, radius and luminosity explanation while keeping notes',async({page})=>{
  57  |  const errors=await mount(page,{tab:'hrDiagram',hrHunt:{hypothesis:'Compare small hot stars',log:[{m:1,t:5772,l:1,c:'sunLike'}]}});
  58  |  await page.getByRole('button',{name:'Sirius B',exact:true}).click();
  59  |  await expect(page.locator('#hr-mass')).toHaveValue('1.018');
  60  |  await expect(page.locator('#hr-tempK')).toHaveValue('25369');
  61  |  await expect(page.locator('[data-hr-marker]')).toHaveAttribute('data-luminosity','0.02448');
  62  |  await expect(page.locator('#astronomy-hr-reference-status')).toHaveAttribute('data-reference','siriusB');
  63  |  await expect(page.locator('#astronomy-hr-classification')).toContainText('White-dwarf region');
  64  |  await expect(page.getByRole('textbox',{name:'H-R diagram hypothesis'})).toHaveValue('Compare small hot stars');
  65  |  await expect(page.getByRole('table',{name:'Logged H-R diagram observations'}).locator('tbody tr')).toHaveCount(1);
  66  |  const values=await page.locator('[data-hr-metric]').evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('data-value'))));
  67  |  expect(values[0]*values[1]).toBeCloseTo(.02448,12);
  68  |  await page.getByText('Sources, uncertainties and model',{exact:true}).click();
  69  |  await expect(page.locator('#astronomy-hr-references')).toContainText('25,369 ± 46 K');
  70  |  await expect(page.getByRole('link',{name:'Sirius study · Bond et al., 2017'})).toHaveAttribute('href','https://arxiv.org/abs/1703.10625');
  71  |  await page.getByText('Sources, uncertainties and model',{exact:true}).click();
  72  |  await page.getByRole('button',{name:'True scale',exact:true}).click();
  73  |  expect((await disks(page)).ratio).toBeCloseTo(.008098,5);
  74  |  await page.locator('#astronomy-hr-explorer').screenshot({path:OUT+'/sirius-white-dwarf-desktop.png'});
  75  |  await page.locator('#hr-mass').fill('1.02');
  76  |  await expect(page.locator('#astronomy-hr-reference-status')).toHaveAttribute('data-reference','custom');
  77  |  expect((await state(page)).tempK).toBe(25369);
  78  |  expect((await disks(page)).ratio).toBeCloseTo(.008098,5);
  79  |  await page.getByRole('button',{name:'Sirius A',exact:true}).click();
  80  |  await expect(page.locator('#hr-mass')).toHaveValue('2.063');
  81  |  await expect(page.locator('#astronomy-hr-reference-status')).toContainText('Published inputs: Sirius A');
  82  |  expect(errors).toEqual([]);
  83  | });
  84  | test('true scale stays proportional at both extremes and mode changes preserve the investigation',async({page})=>{
  85  |  const errors=await mount(page,{tab:'hrDiagram',hrHunt:{tempK:2000,lumin:100000,mass:1,sizeScale:'true',hypothesis:'Big surface',log:[{m:1,t:5772,l:1,c:'sunLike'}]}});
  86  |  let d=await disks(page);expect(d.star).toBe(80);expect(d.sun).toBeLessThan(.04);
  87  |  await expect(page.locator('#astronomy-hr-size')).toContainText('Tiny disk');
  88  |  await page.getByRole('button',{name:'Readable sizes',exact:true}).click();
  89  |  d=await disks(page);expect(d.sun).toBe(36);expect(d.star).toBe(72);
  90  |  await page.getByRole('button',{name:'True scale',exact:true}).click();
  91  |  expect((await disks(page)).star).toBe(80);
  92  |  await page.locator('#hr-tempK').fill('50000');await page.locator('#hr-lumin').fill('-3');
  93  |  d=await disks(page);expect(d.sun).toBe(80);expect(d.star).toBeLessThan(.04);
  94  |  await expect(page.getByRole('textbox',{name:'H-R diagram hypothesis'})).toHaveValue('Big surface');
  95  |  await expect(page.getByRole('table',{name:'Logged H-R diagram observations'}).locator('tbody tr')).toHaveCount(1);
  96  |  await page.getByRole('button',{name:'Reset investigation',exact:true}).click();
  97  |  await expect(page.getByRole('button',{name:'Readable sizes',exact:true})).toHaveAttribute('aria-pressed','true');
  98  |  await expect(page.getByRole('textbox',{name:'H-R diagram hypothesis'})).toHaveValue('');
  99  |  expect(errors).toEqual([]);
  100 | });
  101 | test('phone contrast labels remain readable and contained for the source examples and extreme disks',async({page})=>{
  102 |  await page.setViewportSize({width:320,height:850});
  103 |  const errors=await mount(page,{tab:'hrDiagram'},true);
  104 |  for(const name of ['Sirius A','Sirius B','Cool giant','White dwarf','Sun reference']){
  105 |   await page.getByRole('button',{name,exact:true}).click();
  106 |   await page.getByRole('button',{name:'True scale',exact:true}).click();
  107 |   const bad=await page.locator('#astronomy-hr-size, #astronomy-hr-plot').evaluateAll(svgs=>svgs.flatMap(svg=>{
  108 |    const vb=(svg as SVGSVGElement).viewBox.baseVal, factor=svg.getBoundingClientRect().width/vb.width;
  109 |    return Array.from(svg.querySelectorAll('text')).flatMap(t=>{
  110 |     const b=(t as SVGTextElement).getBBox(),font=parseFloat(getComputedStyle(t).fontSize)*factor;
  111 |     return b.x < -1 || b.y < -1 || b.x+b.width > vb.width+1 || b.y+b.height > vb.height+1 || font<11 ? [{text:t.textContent,b:{x:b.x,y:b.y,w:b.width,h:b.height},font}]:[];
  112 |    });
  113 |   }));
  114 |   expect(bad,name).toEqual([]);
  115 |   const axisGap=await page.locator('#astronomy-hr-plot').evaluate(svg=>{
  116 |    const labels=Array.from(svg.querySelectorAll('text'));
  117 |    const axis=labels.find(t=>t.textContent!.includes('kelvin'))! as SVGTextElement;
  118 |    const ticks=labels.filter(t=>['50,000','10,000','5,000','2,000'].includes(t.textContent!));
  119 |    return Math.min(...ticks.map(t=>axis.getBBox().y-((t as SVGTextElement).getBBox().y+(t as SVGTextElement).getBBox().height)));
  120 |   });expect(axisGap).toBeGreaterThan(3);
  121 |   const tickSpacing=await page.locator('#astronomy-hr-plot').evaluate(svg=>{
  122 |    const ticks=Array.from(svg.querySelectorAll('text')).filter(t=>['50,000','10,000','5,000','2,000'].includes(t.textContent!))
  123 |      .map(t=>(t as SVGTextElement).getBBox()).filter(b=>b.width>0).sort((a,b)=>a.x-b.x);
  124 |    return {visible:ticks.length,gap:Math.min(...ticks.slice(1).map((b,i)=>b.x-ticks[i].x-ticks[i].width))};
  125 |   });
> 126 |   expect(tickSpacing.visible).toBeGreaterThanOrEqual(3);expect(tickSpacing.gap).toBeGreaterThan(3);
      |                                                                                 ^ Error: expect(received).toBeGreaterThan(expected)
  127 |   const circles=await page.locator('#astronomy-hr-size [data-hr-disk]').evaluateAll(nodes=>nodes.map(n=>{
  128 |    const x=Number(n.getAttribute('cx')),y=Number(n.getAttribute('cy')),r=Number(n.getAttribute('r'));
  129 |    return x-r>=0&&x+r<=360&&y-r>=0&&y+r<=230;
  130 |   }));expect(circles).toEqual([true,true]);
  131 |  }
  132 |  await page.getByRole('button',{name:'Sirius B',exact:true}).click();
  133 |  await page.locator('#astronomy-hr-explorer').screenshot({path:OUT+'/sirius-white-dwarf-phone-contrast.png'});
  134 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  135 |  const targets=await page.locator('#astronomy-hr-explorer button, #astronomy-hr-explorer summary').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
  136 |  expect(targets.every(height=>height>=44)).toBe(true);
  137 |  expect(errors).toEqual([]);
  138 | });
  139 | test('saved scale choices survive restore and malformed choices recover without losing notes',async({page})=>{
  140 |  let errors=await mount(page,{tab:'hrDiagram',hrHunt:{tempK:9845,lumin:24.74,mass:2.063,sizeScale:'true',hypothesis:'My source comparison'}});
  141 |  await expect(page.locator('#astronomy-hr-reference-status')).toHaveAttribute('data-reference','siriusA');
  142 |  await expect(page.getByRole('button',{name:'True scale',exact:true})).toHaveAttribute('aria-pressed','true');
  143 |  const saved=await state(page);
  144 |  errors.push(...await mount(page,{tab:'hrDiagram',hrHunt:saved}));
  145 |  await expect(page.getByRole('textbox',{name:'H-R diagram hypothesis'})).toHaveValue('My source comparison');
  146 |  await expect(page.locator('#astronomy-hr-size')).toHaveAttribute('data-size-scale','true');
  147 |  for(const mode of [true,[],{mode:'true'},'bad']){
  148 |   errors.push(...await mount(page,{tab:'hrDiagram',hrHunt:{sizeScale:mode,tempK:{},lumin:false,mass:'',hypothesis:'Keep valid notes'}}));
  149 |   await expect(page.locator('#astronomy-hr-size')).toHaveAttribute('data-size-scale','compressed');
  150 |   await expect(page.locator('#hr-tempK')).toHaveValue('5800');
  151 |   await expect(page.getByRole('textbox',{name:'H-R diagram hypothesis'})).toHaveValue('Keep valid notes');
  152 |   await page.getByRole('button',{name:'Sirius B',exact:true}).click();
  153 |   await expect(page.locator('#hr-mass')).toHaveValue('1.018');
  154 |  }
  155 |  expect(errors).toEqual([]);
  156 | });
  157 | test('diagram touch and keyboard edits update custom inputs without changing the selected size mode',async({page})=>{
  158 |  const errors=await mount(page,{tab:'hrDiagram'});
  159 |  await page.getByRole('button',{name:'Sirius A',exact:true}).click();
  160 |  await page.getByRole('button',{name:'True scale',exact:true}).click();
  161 |  const chart=page.locator('#astronomy-hr-plot');await chart.scrollIntoViewIfNeeded();
  162 |  const box=(await chart.boundingBox())!;
  163 |  await page.touchscreen.tap(box.x+box.width*240/430,box.y+box.height*186/440);
  164 |  await expect(chart).toBeFocused();
  165 |  expect((await state(page)).tempK).toBeGreaterThan(9000);
  166 |  expect((await state(page)).tempK).toBeLessThan(11000);
  167 |  await expect(page.locator('#astronomy-hr-reference-status')).toHaveAttribute('data-reference','custom');
  168 |  const old=(await state(page)).tempK;await chart.press('ArrowLeft');expect((await state(page)).tempK).toBeGreaterThan(old);
  169 |  await chart.press('Home');await expect(page.locator('#hr-tempK')).toHaveValue('5772');
  170 |  await expect(page.locator('#astronomy-hr-size')).toHaveAttribute('data-size-scale','true');
  171 |  await page.getByRole('button',{name:'Sun reference',exact:true}).click();
  172 |  await expect(page.locator('#astronomy-hr-reference-status')).toHaveAttribute('data-reference','sun');
  173 |  expect((await disks(page)).ratio).toBeCloseTo(1,12);
  174 |  expect(errors).toEqual([]);
  175 | });
  176 | 
```