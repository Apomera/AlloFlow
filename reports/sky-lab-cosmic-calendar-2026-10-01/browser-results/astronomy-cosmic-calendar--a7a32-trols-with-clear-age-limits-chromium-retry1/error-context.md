# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: astronomy-cosmic-calendar.spec.ts >> 320px contrast retains readable, unclipped figures and 44px controls with clear age limits
- Location: tests\e2e\astronomy-cosmic-calendar.spec.ts:132:5

# Error details

```
Error: astronomy-calendar-zoom Human fossils

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= -0.5
Received:    -1.2349003553390503
```

# Test source

```ts
  49  | 
  50  | 
  51  | 
  52  | 
  53  | 
  54  | 
  55  | const root=page=>page.locator('#astronomy-calendar-lab');
  56  | const saved=page=>page.evaluate(()=>(window as any).__toolData.astronomy);
  57  | const linked=page=>page.evaluate(()=>{
  58  |  const m=(window as any).__alloAstroPure.cosmicCalendarModel((window as any).__toolData.astronomy);
  59  |  const el=document.querySelector('#astronomy-calendar-lab')!;
  60  |  return {m, values:Object.fromEntries(Array.from(el.querySelectorAll('[data-calendar-metric]')).map(n=>[n.getAttribute('data-calendar-metric'),Number(n.getAttribute('data-value'))])),
  61  |   date:el.querySelector('[data-calendar-date]')!.textContent,yearX:Number(el.querySelector('#astronomy-cosmic-calendar-diagram')!.getAttribute('data-marker-x')),
  62  |   rows:Array.from(el.querySelectorAll('[data-calendar-row]')).map(n=>({id:n.getAttribute('data-calendar-row'),seconds:Number(n.getAttribute('data-before-end')),x:Number(n.getAttribute('data-marker-x'))})),
  63  |   lifetime:Number(el.querySelector('[data-calendar-lifetime-seconds]')!.getAttribute('data-calendar-lifetime-seconds'))};
  64  | });
  65  | function check(v) {
  66  |  for(const[k,n]of Object.entries(v.values))expect(n,k).toBe(v.m.selected.position[k]);
  67  |  expect(v.date).toBe(v.m.selected.position.date);expect(v.yearX).toBe(30+300*v.m.selected.position.yearFraction);
  68  |  expect(v.lifetime).toBe(v.m.lifetime.beforeEndSeconds);
  69  |  for(const row of v.rows){
  70  |   const p=row.id==='lifetime'?v.m.lifetime:v.m.events.find(e=>e.id===row.id).position;
  71  |   expect(row.seconds).toBe(p.beforeEndSeconds);expect(row.x).toBe(30+300*(1-p.beforeEndSeconds/v.m.windowSeconds));
  72  |  }
  73  | }
  74  | 
  75  | test('all milestone choices link computed dates, markers, source ages and saved notes',async({page})=>{
  76  |  const errors=await mount(page,{tab:'galaxies',hrHunt:{hypothesis:'Keep my notebook'},rotationGalaxy:'NGC6503',cosmoZ:4,inflationFolds:8}),lab=root(page);
  77  |  const events=(await linked(page)).m.events;
  78  |  for(const e of events){
  79  |   await page.locator('#astronomy-cc-tab-'+e.id).click();const v=await linked(page);check(v);expect(v.m.selectedId).toBe(e.id);
  80  |   await expect(page.locator('#astronomy-cc-panel')).toHaveAttribute('aria-labelledby','astronomy-cc-tab-'+e.id);
  81  |   await expect(page.locator('#astronomy-cc-panel a')).toHaveAttribute('href',e.href);
  82  |  }
  83  |  const state=await saved(page);expect(state.hrHunt.hypothesis).toBe('Keep my notebook');expect(state.rotationGalaxy).toBe('NGC6503');expect(state.cosmoZ).toBe(4);expect(state.inflationFolds).toBe(8);
  84  |  await page.locator('#astronomy-cc-tab-dec31').click();await lab.getByRole('button',{name:'Hour',exact:true}).click();
  85  |  await lab.screenshot({path:OUT+'/calendar-desktop.png'});expect(errors).toEqual([]);
  86  | });
  87  | 
  88  | test('roving tabs wrap, preserve focus and navigate with Home and End',async({page})=>{
  89  |  const errors=await mount(page,{tab:'galaxies'});const first=page.locator('#astronomy-cc-tab-jan1');
  90  |  await first.focus();await first.press('ArrowLeft');await expect(page.locator('#astronomy-cc-tab-now')).toBeFocused();
  91  |  expect((await linked(page)).m.selectedId).toBe('now');
  92  |  await page.locator('#astronomy-cc-tab-now').press('ArrowRight');await expect(first).toBeFocused();
  93  |  await first.press('ArrowDown');await expect(page.locator('#astronomy-cc-tab-cmb')).toBeFocused();
  94  |  await page.locator('#astronomy-cc-tab-cmb').press('End');await expect(page.locator('#astronomy-cc-tab-now')).toBeFocused();
  95  |  await page.locator('#astronomy-cc-tab-now').press('Home');await expect(first).toBeFocused();
  96  |  expect(await root(page).locator('[role=\"tab\"][tabindex=\"0\"]').count()).toBe(1);expect(errors).toEqual([]);
  97  | });
  98  | 
  99  | test('zoom rows accept touch and keyboard without jumping the scale or faking offscreen markers',async({page})=>{
  100 |  const errors=await mount(page,{tab:'galaxies',selectedCC:'dec31',ccZoom:'second'}),lab=root(page);
  101 |  await expect(page.locator('#astronomy-cc-zoom-status')).toHaveAttribute('data-selected-visible','false');expect(await lab.locator('[data-calendar-row=\"dec31\"]').count()).toBe(0);
  102 |  await lab.getByRole('button',{name:'Hour',exact:true}).click();const humans=page.locator('#astronomy-cc-zoom-dec31');
  103 |  await humans.focus();await humans.press('Enter');await expect(humans).toBeFocused();check(await linked(page));
  104 |  const farm=page.locator('#astronomy-cc-zoom-agriculture');await farm.tap();expect((await linked(page)).m.selectedId).toBe('agriculture');expect((await saved(page)).ccZoom).toBe('hour');
  105 |  await humans.focus();await humans.press('Space');expect((await linked(page)).m.selectedId).toBe('dec31');await expect(humans).toBeFocused();
  106 |  await humans.dispatchEvent('pointercancel',{pointerId:97,pointerType:'touch'});await farm.tap();
  107 |  await lab.getByRole('button',{name:'Minute',exact:true}).click();await expect(page.locator('#astronomy-cc-zoom-status')).toHaveAttribute('data-selected-visible','true');
  108 |  await lab.getByRole('button',{name:'Second',exact:true}).click();await expect(page.locator('#astronomy-cc-zoom-status')).toHaveAttribute('data-selected-visible','false');check(await linked(page));expect(errors).toEqual([]);
  109 | });
  110 | 
  111 | test('lifetime range and examples stay synchronized across scales, including zero',async({page})=>{
  112 |  const errors=await mount(page,{tab:'galaxies',ccLifetimeYears:12}),lab=root(page),range=page.locator('#astronomy-cc-lifetime');
  113 |  for(const age of[1,12,80]){await lab.getByRole('button',{name:age+' years',exact:true}).click();await expect(range).toHaveValue(String(age));check(await linked(page));}
  114 |  await range.focus();await range.press('ArrowRight');await expect(range).toBeFocused();expect((await linked(page)).m.lifetimeYears).toBe(81);
  115 |  await range.press('Home');expect((await linked(page)).lifetime).toBe(0);check(await linked(page));
  116 |  await range.press('End');expect((await linked(page)).m.lifetimeYears).toBe(100);
  117 |  for(const name of['Hour','Minute','Second']){await lab.getByRole('button',{name,exact:true}).click();check(await linked(page));}
  118 |  await lab.getByRole('button',{name:'12 years',exact:true}).click();await expect(page.locator('[data-calendar-lifetime-seconds]')).toContainText('0.0274');
  119 |  expect(errors).toEqual([]);
  120 | });
  121 | 
  122 | test('restored legacy selections and malformed controls recover coherently while retaining other work',async({page})=>{
  123 |  let errors=await mount(page,{tab:'galaxies',selectedCC:'aug28',ccZoom:'hour',ccLifetimeYears:'12.8',hrHunt:{hypothesis:'Saved investigation'}});
  124 |  let v=await linked(page);check(v);expect(v.m.selectedId).toBe('aug28');expect(v.date).toContain('September 1');expect(v.m.lifetimeYears).toBe(13);await expect(page.locator('#astronomy-cc-lifetime')).toHaveValue('13');
  125 |  await root(page).getByRole('button',{name:'Second',exact:true}).click();const state=await saved(page);
  126 |  errors.push(...await mount(page,state));v=await linked(page);expect(v.m.zoom).toBe('second');expect(v.m.selectedId).toBe('aug28');expect((await saved(page)).hrHunt.hypothesis).toBe('Saved investigation');
  127 |  errors.push(...await mount(page,{tab:'galaxies',selectedCC:{forged:true},ccZoom:[],ccLifetimeYears:true,hrHunt:{hypothesis:'Preserve me'}}));
  128 |  v=await linked(page);check(v);expect(v.m.selectedId).toBe('jan1');expect(v.m.zoom).toBe('minute');expect(v.m.lifetimeYears).toBe(12);expect((await saved(page)).hrHunt.hypothesis).toBe('Preserve me');
  129 |  await root(page).getByRole('button',{name:'80 years',exact:true}).click();expect((await saved(page)).ccLifetimeYears).toBe(80);expect(errors).toEqual([]);
  130 | });
  131 | 
  132 | test('320px contrast retains readable, unclipped figures and 44px controls with clear age limits',async({page})=>{
  133 |  await page.setViewportSize({width:320,height:900});const errors=await mount(page,{tab:'galaxies',selectedCC:'mar15',ccZoom:'hour'},true),lab=root(page);
  134 |  await lab.getByText('Scale, sources and limits',{exact:true}).click();
  135 |  await expect(lab.locator('[data-calendar-basis]')).toHaveAttribute('data-calendar-basis','phase');
  136 |  await expect(lab).toContainText('uncertainty is not propagated');
  137 |  const collect=()=>lab.evaluate(el=>{
  138 |   const svgs=Array.from(el.querySelectorAll('svg'));
  139 |   return {overflow:el.scrollWidth>el.clientWidth+1,background:getComputedStyle(el).backgroundColor,svgs:svgs.map(svg=>{
  140 |    const view=svg.viewBox.baseVal,scale=svg.getBoundingClientRect().width/view.width;
  141 |    return {id:svg.id,text:Array.from(svg.querySelectorAll('text')).map(t=>{
  142 |     const b=t.getBBox();return {label:t.textContent,font:parseFloat(getComputedStyle(t).fontSize)*scale,left:b.x,top:b.y,right:b.x+b.width,bottom:b.y+b.height,width:view.width,height:view.height};}),
  143 |     rows:Array.from(svg.querySelectorAll('[data-calendar-row]')).map(g=>({id:g.getAttribute('data-calendar-row'),height:g.getBoundingClientRect().height}))};
  144 |   }),targets:Array.from(el.querySelectorAll('button,input,summary,a')).map(n=>({label:n.textContent,height:n.getBoundingClientRect().height}))};
  145 |  });
  146 |  let geometry=await collect();expect(geometry.overflow).toBe(false);expect(geometry.background).toBe('rgb(0, 0, 0)');expect(geometry.svgs).toHaveLength(2);
  147 |  for(const svg of geometry.svgs)for(const t of svg.text){
  148 |   expect(t.font,svg.id+' '+t.label).toBeGreaterThanOrEqual(11);
> 149 |   expect(t.left,svg.id+' '+t.label).toBeGreaterThanOrEqual(-.5);expect(t.top,svg.id+' '+t.label).toBeGreaterThanOrEqual(-.5);
      |                                                                                                  ^ Error: astronomy-calendar-zoom Human fossils
  150 |   expect(t.right,svg.id+' '+t.label).toBeLessThanOrEqual(t.width+.5);expect(t.bottom,svg.id+' '+t.label).toBeLessThanOrEqual(t.height+.5);
  151 |  }
  152 |  for(const t of geometry.targets)expect(t.height,t.label||'range').toBeGreaterThanOrEqual(44);
  153 |  for(const svg of geometry.svgs)for(const r of svg.rows)expect(r.height,r.id).toBeGreaterThanOrEqual(44);
  154 |  writeFileSync(OUT+'/phone-geometry.json',JSON.stringify(geometry,null,2)+'\n');
  155 |  await lab.screenshot({path:OUT+'/calendar-phone-contrast.png'});
  156 |  await lab.locator('figure').first().screenshot({path:OUT+'/calendar-year-phone.png'});
  157 |  await lab.locator('figure').nth(1).screenshot({path:OUT+'/calendar-hour-phone.png'});
  158 |  await page.locator('#astronomy-cc-tab-now').click();await lab.getByRole('button',{name:'Second',exact:true}).click();
  159 |  await lab.locator('figure').nth(1).screenshot({path:OUT+'/calendar-second-phone.png'});
  160 |  const v=await linked(page);check(v);expect(v.date).toContain('Year end');expect(v.m.selected.position.beforeEndSeconds).toBe(0);expect(errors).toEqual([]);
  161 | });
  162 | 
```