const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');
source=source.slice(0,source.indexOf('  const manifest = [];')).replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || '.');").replace('deviceScaleFactor: 2','deviceScaleFactor: 1');
source=source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source+=String.raw`
const shots=[],checks=[];let overflow=false;const theme={dark:DARK||CONTRAST,contrast:CONTRAST,band:BAND};
async function selected(kind){
 await pg.waitForFunction(kind=>{const tab=document.getElementById('ml-bench-tab-'+kind);return tab===document.activeElement&&tab.getAttribute('aria-selected')==='true'&&tab.tabIndex===0&&document.getElementById('ml-shop-panel').getAttribute('aria-labelledby')===tab.id;},kind);
 await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();
 await pg.waitForFunction(kind=>window.__qaShop.data.kind===kind&&window.__qaShop.data.motionProgress===null,kind);
}
try{
for(const width of [1150,390,320]){
 await pg.setViewportSize({width,height:1000});
 await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:'lever',shopAnimating:true,shopDemoId:1,shopMotionProgress:0.5,shopClueBench:'lever',shopStartOutline:true,shopFocusMechanism:true,provenBenches:{lever:true,screw:true}}),theme]);
 await pg.locator('#ml-bench-tab-lever').focus();
 await pg.keyboard.press('Home');if(await pg.locator('.ml-shop-clue-reminder').count()!==1||!await pg.locator('#ml-shop-stroke').isDisabled())errors.push('Home reset the already-active station');
 for(const kind of ['pulley','windlass','ramp','wedge','screw','lever']){await pg.keyboard.press('ArrowRight');await selected(kind);}
 if(await pg.locator('.ml-shop-clue-reminder').count())errors.push('Clue survived station switch');
 const preferences=await pg.evaluate(()=>window.__qaShop.data.startOutline&&window.__qaShop.data.focusMechanism&&window.__qaShop.data.static);
 if(!preferences)errors.push('Station switch lost view preferences or kept playback active');
 await pg.keyboard.press('ArrowLeft');await selected('screw');
 await pg.keyboard.press('Home');await selected('lever');await pg.keyboard.press('End');await selected('screw');
 await pg.keyboard.press('Tab');const exited=await pg.evaluate(()=>!document.activeElement.closest('.ml-bench-tabs'));if(!exited)errors.push('Tab did not leave station chooser');
 await pg.keyboard.press('Shift+Tab');await selected('screw');
 await pg.locator('#ml-bench-tab-pulley').click();await selected('pulley');
 const tabs=pg.locator('.ml-bench-tabs');const counts=await tabs.evaluate(n=>({focusable:n.querySelectorAll('[tabindex="0"]').length,icons:n.querySelectorAll('svg[aria-hidden="true"]').length,proven:[...n.querySelectorAll('[role="tab"]')].filter(t=>t.textContent.includes('Proven')).length}));
 if(counts.focusable!==1||counts.icons!==6||counts.proven!==2)errors.push('Chooser accessibility state mismatch');
 await tabs.screenshot({path:path.join(OUT,'stations-'+width+'.png')});shots.push('stations-'+width);
 overflow=overflow||await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 checks.push('Arrow cycle, reverse wrap, Home/End, Tab exit/reentry, click, scene reset and progress at '+width);
}
fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({errors,overflow,shots,checks},null,2));if(errors.length||overflow)process.exitCode=1;
}finally{await b.close();}
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
