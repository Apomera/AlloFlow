const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');source=source.slice(0,source.indexOf('  const manifest = [];')).replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || '.');").replace('deviceScaleFactor: 2','deviceScaleFactor: 1');
source=source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source+=String.raw`
const checks=[],shots=[];let overflow=false;const theme={dark:DARK||CONTRAST,contrast:CONTRAST,band:BAND};const bay=pg.locator('.ml-shop-bay');
async function mount(kind,width,extra={}){await pg.setViewportSize({width,height:1000});await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,shopMotionProgress:0.5,...extra}),theme]);await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(kind=>window.__qaShop?.mlDemo?.kind===kind,kind);}
async function checkLayout(label){const r=await pg.locator('.ml-proof-feedback').evaluate(el=>({overflow:document.documentElement.scrollWidth>innerWidth,steps:el.querySelectorAll('[data-ml-calculation-step]').length,status:el.querySelector('[role=status]').textContent,decorative:el.querySelector('svg').getAttribute('aria-hidden')==='true'}));overflow=overflow||r.overflow;if(r.overflow||r.steps!==3||!r.decorative||!r.status)errors.push(label+JSON.stringify(r));checks.push(label);}
async function numeric(kind,width,extra={}){
 await mount(kind,width,extra);const input=pg.getByRole('textbox',{name:'Your predicted effort force in newtons',exact:true});const correct=parseFloat((await pg.locator('[data-ml-comparison=force] [data-ml-side=effort] strong').textContent()).replaceAll(',',''));
 await input.fill('999999');await input.press('Enter');await pg.locator('[data-ml-proof-result=retry]').waitFor();await checkLayout('Incorrect answer calculation '+kind+'/'+width);
 await input.fill(String(correct));if(await pg.locator('.ml-proof-feedback').count())errors.push('Stale result after edit');checks.push('Edit clears feedback '+kind+'/'+width);
 await input.press('Enter');await pg.locator('[data-ml-proof-result=correct]').waitFor();await checkLayout('Correct answer calculation '+kind+'/'+width);
 const result=Number(await pg.locator('[data-ml-calculation-step="2"] > div').nth(1).textContent());if(Math.abs(result-correct)>0.11)errors.push('Calculation value mismatch '+kind);
 if(width===1150||kind==='windlass'){const name='proof-'+kind+'-'+width+(extra.bandOverride?'-'+extra.bandOverride:'');await pg.locator('.ml-proof-feedback').locator('..').screenshot({path:path.join(OUT,name+'.png')});shots.push(name);}
 await input.fill('');await input.press('Enter');await pg.getByRole('status').filter({hasText:'Enter a number first.'}).waitFor();if(await pg.locator('.ml-proof-calculation').count())errors.push('Blank answer reveals calculation');checks.push('Blank answer omits calculation '+kind+'/'+width);
}
try{
 for(const width of [1150,390,320])for(const kind of ['lever','pulley','windlass','ramp','wedge','screw'])await numeric(kind,width);
 for(const band of ['g35','g912'])await numeric('windlass',390,{bandOverride:band});
 await mount('lever',320,{bandOverride:'k2'});const prove=pg.getByRole('heading',{name:'Prove it',exact:true}).locator('..');await prove.locator('button').first().click();await pg.locator('.ml-proof-feedback').waitFor();if(await pg.locator('.ml-proof-calculation').count())errors.push('Choice answer has calculation');if(await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth))errors.push('Choice overflow');checks.push('Young learner choice feedback');await pg.locator('.ml-proof-feedback').locator('..').screenshot({path:path.join(OUT,'proof-choice-320.png')});shots.push('proof-choice-320');
 await pg.emulateMedia({forcedColors:'active'});await mount('lever',390);const input=pg.getByRole('textbox',{name:'Your predicted effort force in newtons',exact:true});await input.fill('200');await input.press('Enter');await pg.locator('[data-ml-proof-result=correct]').waitFor();await checkLayout('System high-contrast result');await pg.locator('.ml-proof-feedback').locator('..').screenshot({path:path.join(OUT,'proof-forced-colors.png')});shots.push('proof-forced-colors');
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({errors,overflow,checks,shots},null,2));if(errors.length||overflow)process.exitCode=1;
}finally{await b.close();}
})();`;vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
