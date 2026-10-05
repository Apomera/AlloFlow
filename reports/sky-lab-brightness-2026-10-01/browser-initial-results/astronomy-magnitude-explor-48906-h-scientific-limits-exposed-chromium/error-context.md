# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: astronomy-magnitude-explorer.spec.ts >> 320px contrast diagrams, controls and catalogue stay readable with scientific limits exposed
- Location: tests\e2e\astronomy-magnitude-explorer.spec.ts:129:5

# Error details

```
Error: astronomy-magnitude-curve m_V

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= -0.5
Received:    -5.551605224609375
```

# Test source

```ts
  46  | 
  47  | 
  48  | 
  49  | 
  50  | 
  51  | 
  52  | 
  53  | 
  54  | 
  55  | 
  56  | const root=page=>page.locator('#astronomy-magnitude-lab');
  57  | const saved=page=>page.evaluate(()=>(window as any).__toolData.astronomy);
  58  | const linked=page=>page.evaluate(()=>{
  59  |  const m=(window as any).__alloAstroPure.magnitudeModel((window as any).__toolData.astronomy),el=document.querySelector('#astronomy-magnitude-lab')!;
  60  |  return {m,values:Object.fromEntries(Array.from(el.querySelectorAll('[data-magnitude-metric]')).map(n=>[n.getAttribute('data-magnitude-metric'),Number(n.getAttribute('data-value'))])),
  61  |   curveDistance:Number(el.querySelector('#astronomy-magnitude-curve')!.getAttribute('data-distance-pc')),
  62  |   point:{x:Number(el.querySelector('[data-magnitude-selected]')!.getAttribute('cx')),y:Number(el.querySelector('[data-magnitude-selected]')!.getAttribute('cy')),value:Number(el.querySelector('[data-magnitude-selected]')!.getAttribute('data-value'))},
  63  |   paths:Object.fromEntries(Array.from(el.querySelectorAll('[data-magnitude-path]')).map(n=>[n.getAttribute('data-magnitude-path'),n.getAttribute('points')])),
  64  |   rows:Array.from(el.querySelectorAll('[data-magnitude-flux-row]')).map(n=>({id:n.getAttribute('data-magnitude-flux-row'),value:Number(n.getAttribute('data-value')),log:Number(n.getAttribute('data-log-value')),x:Number(n.querySelector('circle')!.getAttribute('cx'))}))};
  65  | });
  66  | function check(v){
  67  |  for(const[k,value]of Object.entries(v.values))expect(value,k).toBe(v.m[k]);
  68  |  expect(v.curveDistance).toBe(v.m.distancePc);expect(v.point.value).toBe(v.m.apparentV);
  69  |  expect(v.point.x).toBe(66+(v.m.distanceLog+1)/5*264);expect(v.point.y).toBe(46+(v.m.apparentV+20)/55*214);
  70  |  for(const[key,field]of[['unextinguished','unextinguishedV'],['apparent','apparentV']])expect(v.paths[key]).toBe(v.m.points.map(p=>(66+(p.distanceLog+1)/5*264)+','+(46+(p[field]+20)/55*214)).join(' '));
  71  |  for(const row of v.rows){expect(row.value).toBe(row.id==='distance'?v.m.distanceFlux:v.m.fluxRatio);expect(row.x).toBe(30+(row.log+8)/12*300);}
  72  | }
  73  | 
  74  | test('published examples reproduce the catalogue, link both figures and preserve other notes',async({page})=>{
  75  |  const errors=await mount(page,{tab:'stars',hrHunt:{hypothesis:'Keep my investigation'},selectedCC:'agriculture',rotationGalaxy:'NGC6503'}),lab=root(page);
  76  |  for(const[name,id]of[['Sun reference','sun'],['Sirius','sirius'],['Vega','vega']]){
  77  |   await lab.getByRole('button',{name,exact:true}).click();const v=await linked(page);check(v);expect(v.m.referenceId).toBe(id);
  78  |   await expect(page.locator('#astronomy-magnitude-mv')).toHaveValue(String(v.m.absoluteV));await expect(page.locator('#astronomy-magnitude-distance')).toHaveValue(String(v.m.distanceLog));
  79  |   if(id!=='sun')expect(v.m.apparentV).toBeCloseTo(v.m.reference.apparentV,10);
  80  |  }
  81  |  await lab.getByRole('button',{name:'100 pc',exact:true}).click();await lab.getByRole('button',{name:'A_V = 3',exact:true}).click();check(await linked(page));
  82  |  const state=await saved(page);expect(state.hrHunt.hypothesis).toBe('Keep my investigation');expect(state.selectedCC).toBe('agriculture');expect(state.rotationGalaxy).toBe('NGC6503');
  83  |  await lab.screenshot({path:OUT+'/brightness-desktop.png'});expect(errors).toEqual([]);
  84  | });
  85  | 
  86  | test('keyboard distance and magnitude controls preserve focus and express independent assumptions',async({page})=>{
  87  |  const errors=await mount(page,{tab:'stars'}),range=page.locator('#astronomy-magnitude-distance'),chart=page.locator('#astronomy-magnitude-curve'),mv=page.locator('#astronomy-magnitude-mv');
  88  |  await range.focus();await range.press('ArrowRight');expect((await linked(page)).m.distanceLog).toBeCloseTo(1.05,10);await expect(range).toBeFocused();
  89  |  await range.press('Shift+ArrowRight');expect((await linked(page)).m.distanceLog).toBeCloseTo(1.3,10);
  90  |  await chart.focus();await chart.press('Home');expect((await linked(page)).m.distancePc).toBe(.1);await expect(chart).toBeFocused();
  91  |  await chart.press('End');expect((await linked(page)).m.distancePc).toBe(10000);
  92  |  await mv.focus();await mv.press('ArrowRight');expect((await linked(page)).m.absoluteV).toBeCloseTo(4.91,10);expect((await saved(page)).magnitudeReference).toBe('custom');await expect(mv).toBeFocused();
  93  |  await mv.press('Shift+ArrowLeft');expect((await linked(page)).m.absoluteV).toBeCloseTo(3.91,10);
  94  |  const dust=page.locator('#astronomy-magnitude-av');await dust.focus();await dust.press('ArrowRight');expect((await linked(page)).m.extinctionV).toBe(.1);await expect(dust).toBeFocused();check(await linked(page));
  95  |  expect(errors).toEqual([]);
  96  | });
  97  | 
  98  | test('touch chooses distance continuously and cancellation leaves the plot usable',async({page})=>{
  99  |  const errors=await mount(page,{tab:'stars'}),chart=page.locator('#astronomy-magnitude-curve');await chart.scrollIntoViewIfNeeded();
  100 |  const box=(await chart.boundingBox())!;await page.touchscreen.tap(box.x+box.width*(66+264*3/5)/360,box.y+box.height*160/340);
  101 |  await expect(chart).toBeFocused();expect(Math.abs((await linked(page)).m.distanceLog-2)).toBeLessThan(.02);check(await linked(page));
  102 |  await chart.dispatchEvent('pointercancel',{pointerType:'touch',pointerId:91});await chart.press('Home');expect((await linked(page)).m.distancePc).toBe(.1);
  103 |  await root(page).getByRole('button',{name:'10 pc',exact:true}).click();await expect(page.locator('#astronomy-magnitude-status')).toHaveAttribute('data-regime','equal');expect(errors).toEqual([]);
  104 | });
  105 | 
  106 | test('five-magnitude examples give a hundredfold V-light change and bounded extremes stay visible',async({page})=>{
  107 |  const errors=await mount(page,{tab:'stars'}),lab=root(page);const base=(await linked(page)).m;
  108 |  await lab.getByRole('button',{name:'Brighten by 5 mag',exact:true}).click();let v=await linked(page);expect(v.m.vLightVsSun/base.vLightVsSun).toBeCloseTo(100,10);check(v);
  109 |  await lab.getByRole('button',{name:'Dim by 5 mag',exact:true}).click();expect((await linked(page)).m.absoluteV).toBeCloseTo(base.absoluteV,10);
  110 |  await page.locator('#astronomy-magnitude-mv').fill('15');await page.locator('#astronomy-magnitude-distance').fill('4');await page.locator('#astronomy-magnitude-av').fill('5');
  111 |  v=await linked(page);check(v);expect(v.m.apparentV).toBe(35);expect(v.m.fluxLog).toBe(-8);expect(v.point.y).toBe(260);
  112 |  await expect(lab.getByRole('button',{name:'Dim by 5 mag',exact:true})).toBeDisabled();
  113 |  await page.locator('#astronomy-magnitude-mv').fill('-10');await page.locator('#astronomy-magnitude-distance').fill('-1');await page.locator('#astronomy-magnitude-av').fill('0');
  114 |  v=await linked(page);check(v);expect(v.m.apparentV).toBe(-20);expect(v.m.fluxLog).toBe(4);expect(v.point.y).toBe(46);
  115 |  await expect(lab.getByRole('button',{name:'Brighten by 5 mag',exact:true})).toBeDisabled();
  116 |  await lab.screenshot({path:OUT+'/brightness-extreme.png'});
  117 |  await lab.getByRole('button',{name:'Reset brightness explorer',exact:true}).click();v=await linked(page);expect(v.m.referenceId).toBe('sun');expect(v.m.distancePc).toBe(10);expect(v.m.extinctionV).toBe(0);expect(errors).toEqual([]);
  118 | });
  119 | 
  120 | test('restored values recover without snapping catalogue distances or losing independent work',async({page})=>{
  121 |  let errors=await mount(page,{tab:'stars',magnitudeReference:'sirius',magnitudeDistancePc:'2.637061258',magnitudeAv:'1.26',hrHunt:{hypothesis:'Saved notebook'}});
  122 |  let v=await linked(page);check(v);expect(v.m.distancePc).toBe(2.637061258);expect(v.m.extinctionV).toBe(1.3);await expect(page.locator('#astronomy-magnitude-av')).toHaveValue('1.3');
  123 |  const state=await saved(page);errors.push(...await mount(page,state));v=await linked(page);expect(v.m.distancePc).toBe(2.637061258);expect(v.m.referenceId).toBe('sirius');expect((await saved(page)).hrHunt.hypothesis).toBe('Saved notebook');
  124 |  errors.push(...await mount(page,{tab:'stars',magnitudeReference:{forged:true},magnitudeMv:[],magnitudeDistancePc:true,magnitudeAv:'bad',hrHunt:{hypothesis:'Preserve me'}}));
  125 |  v=await linked(page);check(v);expect(v.m.referenceId).toBe('sun');expect(v.m.distancePc).toBe(10);expect(v.m.extinctionV).toBe(0);expect((await saved(page)).hrHunt.hypothesis).toBe('Preserve me');
  126 |  await page.locator('#astronomy-magnitude-mv').fill('2');expect((await linked(page)).m.referenceId).toBe('custom');expect((await linked(page)).m.absoluteV).toBe(2);expect(errors).toEqual([]);
  127 | });
  128 | 
  129 | test('320px contrast diagrams, controls and catalogue stay readable with scientific limits exposed',async({page})=>{
  130 |  await page.setViewportSize({width:320,height:900});const errors=await mount(page,{tab:'stars',magnitudeReference:'sirius',magnitudeDistancePc:100,magnitudeAv:3},true),lab=root(page);
  131 |  await lab.getByText('Published inputs and model limits',{exact:true}).click();
  132 |  await expect(lab).toContainText('ESA 1997');await expect(lab).toContainText('bolometric correction');await expect(lab).toContainText('uncertainty are not propagated');
  133 |  const geometry=await lab.evaluate(el=>{
  134 |   const svgs=Array.from(el.querySelectorAll('svg'));
  135 |   return {overflow:el.scrollWidth>el.clientWidth+1,background:getComputedStyle(el).backgroundColor,svgs:svgs.map(svg=>{
  136 |    const view=svg.viewBox.baseVal,scale=svg.getBoundingClientRect().width/view.width;
  137 |    return {id:svg.id,text:Array.from(svg.querySelectorAll('text')).map(t=>{
  138 |     const b=t.getBBox(),matrix=svg.getScreenCTM()!.inverse().multiply(t.getScreenCTM()!);const points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
  139 |     return {label:t.textContent,font:parseFloat(getComputedStyle(t).fontSize)*scale,left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y)),width:view.width,height:view.height};
  140 |    })};
  141 |   }),targets:Array.from(el.querySelectorAll('button,input,summary,a')).map(n=>({label:n.textContent,height:n.getBoundingClientRect().height})),
  142 |   table:{overflow:el.querySelector('table')!.scrollWidth>el.querySelector('table')!.clientWidth+1,columnHeaders:el.querySelectorAll('thead th[scope=\"col\"]').length,rowHeaders:el.querySelectorAll('tbody th[scope=\"row\"]').length}};
  143 |  });
  144 |  expect(geometry.overflow).toBe(false);expect(geometry.background).toBe('rgb(0, 0, 0)');expect(geometry.svgs).toHaveLength(2);expect(geometry.table).toEqual({overflow:false,columnHeaders:4,rowHeaders:2});
  145 |  for(const svg of geometry.svgs)for(const t of svg.text){
> 146 |   expect(t.font,svg.id+' '+t.label).toBeGreaterThanOrEqual(11);expect(t.left,svg.id+' '+t.label).toBeGreaterThanOrEqual(-.5);expect(t.top,svg.id+' '+t.label).toBeGreaterThanOrEqual(-.5);
      |                                                                                                  ^ Error: astronomy-magnitude-curve m_V
  147 |   expect(t.right,svg.id+' '+t.label).toBeLessThanOrEqual(t.width+.5);expect(t.bottom,svg.id+' '+t.label).toBeLessThanOrEqual(t.height+.5);
  148 |  }
  149 |  for(const svg of geometry.svgs)for(let i=0;i<svg.text.length;i++)for(let j=i+1;j<svg.text.length;j++){
  150 |   const a=svg.text[i],b=svg.text[j];expect(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1,svg.id+' '+a.label+' overlaps '+b.label).toBe(false);
  151 |  }
  152 |  for(const t of geometry.targets)expect(t.height,t.label||'range').toBeGreaterThanOrEqual(44);
  153 |  writeFileSync(OUT+'/phone-geometry.json',JSON.stringify(geometry,null,2)+'\n');
  154 |  await lab.screenshot({path:OUT+'/brightness-phone-contrast.png'});await lab.locator('figure').first().screenshot({path:OUT+'/brightness-curve-phone.png'});await lab.locator('figure').nth(1).screenshot({path:OUT+'/brightness-flux-phone.png'});
  155 |  await page.locator('#astronomy-magnitude-catalog').screenshot({path:OUT+'/brightness-catalog-phone.png'});
  156 |  await expect(lab.getByRole('link',{name:'Willmer 2018 · Solar magnitude reference'})).toHaveAttribute('href','https://arxiv.org/abs/1804.07788');expect(errors).toEqual([]);
  157 | });
  158 | 
```