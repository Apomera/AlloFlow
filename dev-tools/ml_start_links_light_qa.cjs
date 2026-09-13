const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');
source=source.slice(0,source.indexOf('  const manifest = [];')).replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || '.');").replace('deviceScaleFactor: 2','deviceScaleFactor: 1');
source=source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source+=String.raw`
const shots=[];let overflow=false;
try{
for(const width of [1150,320])for(const bench of ['ramp','screw']){
 await pg.setViewportSize({width,height:1100});
 await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench,shopStartOutline:true,shopMotionProgress:0.5,shopFocusMechanism:true,shopRotY:bench==='screw'?24:0,shopRotX:bench==='screw'?32:8,shopZoom:1.18}),{dark:false,contrast:false,band:'g68'}]);
 await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();
 await pg.waitForFunction(()=>{const s=window.__qaShop;return s&&s.data.dark===false&&s.mlDemo.startLinks.every(r=>r.group.visible&&r.endHalo.material.color.getHex()===0xffffff&&r.endHalo.position.distanceTo(r.endMark.position)<1e-8);});
 const label=bench+'-'+width;await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,label+'.png')});shots.push(label);
 overflow=overflow||await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
}
fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({errors,overflow,shots},null,2));if(errors.length||overflow)process.exitCode=1;
}finally{await b.close();}
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
