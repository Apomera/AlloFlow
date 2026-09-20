const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');source=source.slice(0,source.indexOf('  const manifest = [];')).replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || '.');").replace('deviceScaleFactor: 2','deviceScaleFactor: 1');
source=source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source+=String.raw`
const checks=[],shots=[];let overflow=false;const theme={dark:DARK||CONTRAST,contrast:CONTRAST,band:BAND};const bay=pg.locator('.ml-shop-bay');
async function mount(kind,width,extra={}){await pg.setViewportSize({width,height:1000});await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,shopFocusMechanism:true,shopMotionProgress:0.5,...extra}),theme]);await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(kind=>window.__qaShop?.mlDemo?.kind===kind,kind);}
try{
 for(const width of [1150,390,320])for(const kind of ['lever','pulley','windlass','ramp','wedge','screw']){
  await mount(kind,width);const slider=pg.locator('#ml-shop-stroke');
  for(const [key,expected] of [['ArrowRight',51],['Home',0],['End',100],['ArrowLeft',99]]){
    await slider.focus();await pg.keyboard.press(key);await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(value=>window.__qaShop.data.motionProgress===value/100,expected);
    const state=await slider.evaluate(el=>({value:Number(el.value),text:el.getAttribute('aria-valuetext'),fill:el.style.getPropertyValue('--ml-stroke-fill'),readout:document.querySelector('[data-ml-stroke-readout]').textContent}));
    if(state.value!==expected||state.fill!==expected+'%'||state.readout!==expected+'%'||state.text!==expected+'% of the working stroke')errors.push(JSON.stringify(state));checks.push('Keyboard '+key+' '+kind+'/'+width);
  }
  await slider.fill('25');await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(()=>window.__qaShop.data.motionProgress===0.25);await slider.focus();
  const layout=await slider.evaluate(el=>{const r=el.getBoundingClientRect(),ticks=[...document.querySelectorAll('[data-ml-stroke-tick]')];return {overflow:document.documentElement.scrollWidth>innerWidth,height:r.height,outline:getComputedStyle(el).outlineStyle,aligned:ticks.every((t,i)=>Math.abs(t.getBoundingClientRect().left-(r.left+12+(r.width-24)*i/4))<1),labels:ticks.map(t=>t.textContent).join(',')};});
  if(layout.overflow||layout.height<44||layout.outline!=='solid'||!layout.aligned||layout.labels!=='0%,25%,50%,75%,100%')errors.push(kind+'/'+width+': '+JSON.stringify(layout));overflow=overflow||layout.overflow;checks.push('Ruler layout and focus '+kind+'/'+width);
  if(kind==='windlass'||(kind==='lever'&&width===1150)){const name='ruler-'+kind+'-'+width;await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,name+'.png')});shots.push(name);}
 }
 await mount('lever',390,{shopAnimating:true,shopDemoId:71,shopDemoDuration:6600});if(!await pg.locator('#ml-shop-stroke').isDisabled())errors.push('Running slider enabled');if(!await pg.locator('#ml-shop-stroke').evaluate(el=>document.querySelector('[data-ml-stroke-readout]').textContent===el.value+'%'))errors.push('Running readout out of sync');checks.push('Playback disabled state');
 await pg.emulateMedia({forcedColors:'active'});await mount('lever',390);await pg.locator('#ml-shop-stroke').focus();const forced=await pg.locator('#ml-shop-stroke').evaluate(el=>{const s=getComputedStyle(el);return {ink:s.getPropertyValue('--ml-stroke-ink').trim(),rest:s.getPropertyValue('--ml-stroke-rest').trim(),outline:s.outlineStyle};});if(forced.ink!=='Highlight'||forced.rest!=='Canvas'||forced.outline!=='solid')errors.push('Forced colors '+JSON.stringify(forced));const markers=await pg.locator('.ml-shop-inspector').evaluate(el=>{const e=getComputedStyle(el.querySelector('[data-ml-preview-marker=effort]')),l=getComputedStyle(el.querySelector('[data-ml-preview-marker=load]'));return {diamond:e.fill,ring:l.stroke,hole:l.fill};});if(markers.diamond!==markers.ring||markers.hole===markers.ring)errors.push('Forced-color shapes '+JSON.stringify(markers));checks.push('OS forced-color ruler and distance shapes');await pg.locator('.ml-shop-inspector').screenshot({path:path.join(OUT,'forced-colors-inspector.png')});shots.push('forced-colors-inspector');
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({errors,overflow,checks,shots},null,2));if(errors.length||overflow)process.exitCode=1;
}finally{await b.close();}
})();`;vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
