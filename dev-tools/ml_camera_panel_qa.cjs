const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');source=source.slice(0,source.indexOf('  const manifest = [];')).replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || '.');").replace('deviceScaleFactor: 2','deviceScaleFactor: 1');
source=source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source+=String.raw`
const checks=[],shots=[];let overflow=false;const theme={dark:DARK||CONTRAST,contrast:CONTRAST,band:BAND};const bay=pg.locator('.ml-shop-bay');
try{
 for(const width of [1150,390,320])for(const kind of ['lever','pulley','windlass','ramp','wedge','screw']){
  await pg.setViewportSize({width,height:1000});await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,shopFocusMechanism:true,shopMotionProgress:0.5}),theme]);await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(kind=>window.__qaShop?.mlDemo?.kind===kind,kind);
  const panel=pg.locator('.ml-shop-camera');
  const layout=await panel.evaluate(el=>({overflow:document.documentElement.scrollWidth>innerWidth,short:[...el.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().height<39).map(b=>b.textContent),count:el.querySelectorAll('button').length,groups:[...el.querySelectorAll('[role=group]')].map(g=>g.getAttribute('aria-label'))}));
  if(layout.overflow||layout.short.length||layout.count!==(kind==='windlass'?12:11)||layout.groups.join(',')!=='Views,Rotate,Zoom')errors.push(kind+'/'+width+': '+JSON.stringify(layout));overflow=overflow||layout.overflow;checks.push('Layout '+kind+'/'+width);
  for(const [label,yaw,pitch,zoom] of [['Show the machine from the side',0,8,1.08],['Show a close three-quarter view',24,kind==='screw'?32:12,1.38]]){
    const button=panel.getByRole('button',{name:label,exact:true});await button.focus();await pg.keyboard.press('Enter');await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(([y,p,z])=>{const d=window.__qaShop.data;return d.rotY===y&&d.rotX===p&&d.zoom===z;},[yaw,pitch,zoom]);if(await button.getAttribute('aria-pressed')!=='true')errors.push('Preset not selected '+label);if(await pg.evaluate(()=>window.__qaShop.data.motionProgress)!==0.5)errors.push('Pose changed');checks.push('Keyboard '+label+' '+kind+'/'+width);
  }
  await panel.getByRole('button',{name:'Turn right',exact:true}).click();await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(()=>window.__qaShop.data.rotY===39);if(await panel.getByRole('button',{name:'Show a close three-quarter view',exact:true}).getAttribute('aria-pressed')!=='false')errors.push('Stale Close selection');checks.push('Custom angle clears preset '+kind+'/'+width);
  await panel.getByRole('button',{name:'Reset the view',exact:true}).click();await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(()=>{const d=window.__qaShop.data;return d.rotY===28&&d.rotX===16&&d.zoom===1;});checks.push('Reset '+kind+'/'+width);
  if(kind==='windlass'||(kind==='lever'&&width===1150)){await panel.getByRole('button',{name:'Show the machine from the side',exact:true}).click();await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(()=>window.__qaShop.data.rotY===0);const name='camera-'+kind+'-'+width;await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,name+'.png')});shots.push(name);}
 }
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({errors,overflow,checks,shots},null,2));if(errors.length||overflow)process.exitCode=1;
}finally{await b.close();}
})();`;vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
