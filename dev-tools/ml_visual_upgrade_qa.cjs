// Focused real-WebGL visual review using the existing Machine Lab host harness.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let source = fs.readFileSync(path.join(__dirname, 'ml_scene_shots.cjs'), 'utf8');
source = source.replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || '.');");
source = source.replace('deviceScaleFactor: 2', 'deviceScaleFactor: 1');
// Expose the field only in this generated review page, for a reproducible transient frame.
source = source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');", "const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildFieldScene', 'build: function(THREE,S,m){buildFieldScene(THREE,S,m);window.__qaField=S;}').replace('build: buildSimpleMachineScene', 'build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source = source.replace('await pg.waitForTimeout(wait);', `await pg.waitForTimeout(wait);
    if((label.startsWith('workshop11-') || label.startsWith('workshop12-')) && label.includes('lift')) {
      await pg.evaluate(()=>{const s=window.__qaShop;s.mlDemoId=null;s.data.demoId=11;s.tick(0);s.tick(1100);s.tick=function(){};});
      await pg.waitForTimeout(100);
    }
    if(label.includes('damage-impact')) {
      await pg.evaluate(()=>{const s=window.__qaField;s.flightId=null;s.camCur=null;s.data.static=true;s.tick(1000);s.tick(1800);for(let t=1850;t<=2250;t+=50)s.tick(t);s.tick=function(){};});
      await pg.waitForTimeout(100);
    }`);

source = source.replace('let st = state;', `const only=(process.argv.find(a=>a.startsWith('--only='))||'').slice(7);
    if(only && !label.includes(only)) continue;
    let st = state;
    if(label.startsWith('ruler-') && label!=='ruler-neutral') st=await pg.evaluate(base=>({...base,shotId:1,lastShot:window.__mlMath().shot({...base,kind:base.machine})}),st);
    if(label.startsWith('damage-')) st=await pg.evaluate(([base,label])=>{
      const M=window.__mlMath();
      if(label.includes('impact')){
        const shot=M.shot({...base,kind:'trebuchet'}),at=shot.range*0.97,impact=M.impactAt(shot,at),before=M.buildWall('curtain');
        const result=M.applyDamage(before,impact,{projMass:base.projMass,projDiameter:base.projDiameter});
        const debris=M.debrisStart(before,result.blocks,result,{gravity:9.81}),rest=debris ? M.debrisSettle(debris).rest : {};
        return {...base,standoff:at,wallBlocks:result.blocks,rubbleRest:rest,lastImpact:{outcome:'hit',ke:0.5*base.projMass*impact.v*impact.v},
          siegeFlight:{id:901,before,path:shot.path.filter(p=>p.x<=at+1),seconds:0.6,windup:0,outcome:result.outcome,debris}};
      }
      let blocks=M.buildWall('curtain'),rest={};const breached=label.includes('breach');
      const count=breached ? 3 : 36;
      for(let i=0;i<count;i++){
        const before=blocks,impact={status:'hit',y:breached ? 1.5 : 1.5+Math.floor(i/9),z:breached ? i-1 : (i%9)-4,v:breached ? 90 : 35,t:1};
        const result=M.applyDamage(before,impact,{projMass:25,projDiameter:0.26});blocks=result.blocks;
        const debris=M.debrisStart(before,blocks,result,{gravity:9.81});
        if(debris){const settled=M.debrisSettle(debris);Object.assign(rest,settled.rest);}
      }
      return {...base,wallBlocks:blocks,rubbleRest:rest,shotsFired:count};
    },[st,label]);`);
source = source.replace('manifest.push(label);', `if (await pg.locator('canvas').count()) await pg.locator('canvas').first().screenshot({path:path.join(OUT,label+'-detail.png')});
    if(label.startsWith('workshop12-') && await pg.locator('.ml-trade-comparison').count()) await pg.locator('.ml-trade-comparison').locator('xpath=..').screenshot({path:path.join(OUT,label+'-comparison.png')});
    manifest.push(label);`);
source = source.replace('for (const [label, state, opts, wait] of SHOTS)', `for (const [label, state, opts, wait] of [
  ...SHOTS.filter(s => /^(01-|02-|02b-|03-|03b-|04-|05-build|06-|07-|08[a-z]?-range|09-|10-|11b-|11c-)/.test(s[0])),
  ...['lever','pulley','windlass','ramp','wedge','screw'].map(bench=>['workshop12-'+bench, S({view:'machines',bench}), {}, 650]),
  ['workshop12-lift-lever', S({view:'machines',bench:'lever',shopAnimating:true,shopDemoId:1}), {}, 800],
  ['workshop12-lever-reverse', S({view:'machines',bench:'lever',leverEffortArm:0.2,leverLoadArm:4}), {}, 650],
  ['workshop12-lever-equal', S({view:'machines',bench:'lever',leverEffortArm:2,leverLoadArm:2}), {}, 650],
  ['workshop12-screw-fine', S({view:'machines',bench:'screw',screwHandleR:0.5,screwPitch:0.001}), {}, 650],
  ...[1,2,3,4,5,6].map(n=>['workshop11-pulley-'+n, S({view:'machines',bench:'pulley',pulleySegments:n}), {}, 650]),
  ['workshop11-pulley-lift-two', S({view:'machines',bench:'pulley',pulleySegments:2,shopAnimating:true,shopDemoId:1}), {}, 800],
  ['workshop11-pulley-lift-six', S({view:'machines',bench:'pulley',pulleySegments:6,shopAnimating:true,shopDemoId:1}), {}, 800],
  ['workshop11-pulley-rear', S({view:'machines',bench:'pulley',pulleySegments:6,shopRotY:196}), {}, 650],
  ['workshop10-wedge-ready', S({view:'machines',bench:'wedge'}), {}, 650],
  ['workshop10-wedge-split', S({view:'machines',bench:'wedge',shopAnimating:true,shopDemoId:1}), {}, 1000],
  ['workshop10-wedge-thin', S({view:'machines',bench:'wedge',wedgeLength:0.6,wedgeThickness:0.01,shopAnimating:true,shopDemoId:1}), {}, 1000],
  ['workshop10-wedge-thick', S({view:'machines',bench:'wedge',wedgeLength:0.05,wedgeThickness:0.2,shopAnimating:true,shopDemoId:1}), {}, 1000],
  ['workshop10-wedge-square', S({view:'machines',bench:'wedge',wedgeLength:0.2,wedgeThickness:0.2}), {}, 650],
  ['workshop10-wedge-rear', S({view:'machines',bench:'wedge',shopRotY:196}), {}, 650],
  ['workshop9-lever-ready', S({view:'machines',bench:'lever'}), {}, 650],
  ['workshop9-lever-lift', S({view:'machines',bench:'lever',shopAnimating:true,shopDemoId:1}), {}, 1000],
  ['workshop9-lever-long-effort', S({view:'machines',bench:'lever',leverEffortArm:4,leverLoadArm:0.2,shopAnimating:true,shopDemoId:1}), {}, 1000],
  ['workshop9-lever-equal', S({view:'machines',bench:'lever',leverEffortArm:2,leverLoadArm:2}), {}, 650],
  ['workshop9-lever-long-load', S({view:'machines',bench:'lever',leverEffortArm:0.2,leverLoadArm:4,shopAnimating:true,shopDemoId:1}), {}, 1000],
  ['workshop9-ramp-ready', S({view:'machines',bench:'ramp'}), {}, 650],
  ['workshop9-ramp-lift', S({view:'machines',bench:'ramp',shopAnimating:true,shopDemoId:1}), {}, 1000],
  ['workshop9-ramp-low', S({view:'machines',bench:'ramp',rampLength:8,rampHeight:0.2}), {}, 650],
  ['workshop9-ramp-steep', S({view:'machines',bench:'ramp',rampHeight:3.9}), {}, 650],
  ['workshop9-ramp-vertical', S({view:'machines',bench:'ramp',rampHeight:4}), {}, 650],
  ['workshop-windlass-ready', S({view:'machines',bench:'windlass'}), {}, 650],
  ['workshop-windlass-lift', S({view:'machines',bench:'windlass',shopAnimating:true,shopDemoId:1}), {}, 1000],
  ['workshop-windlass-large', S({view:'machines',bench:'windlass',windlassHandleR:1,windlassDrumR:0.3}), {}, 650],
  ['workshop-screw-ready', S({view:'machines',bench:'screw'}), {}, 650],
  ['workshop-screw-press', S({view:'machines',bench:'screw',shopAnimating:true,shopDemoId:1}), {}, 1000],
  ['workshop-screw-coarse', S({view:'machines',bench:'screw',screwPitch:0.015}), {}, 650],
  ['ruler-neutral', S({view:'range'}), {}, 650],
  ['ruler-landed', S({view:'range'}), {}, 650],
  ['ruler-drift', S({view:'range',windZ:12}), {}, 650],
  ['ruler-negative', S({view:'range',windZ:-12}), {}, 650],
  ['ruler-short', S({view:'range',cwMass:120,cwDrop:1}), {}, 650],
  ['ruler-flight', S({view:'range',animating:true,shotId:1}), {}, 450],
  ['damage-impact-field', S({view:'scene',sceneTime:'noon',sceneCam:'castle',sceneAmbient:false,sceneIntroDismissed:true}), {}, 850],
  ['damage-cracked-wall', S({view:'siege',siegeFraming:'castle',wallRotY:196}), {}, 700],
  ['damage-cracked-rear', S({view:'siege',siegeFraming:'castle',wallRotY:14}), {}, 700],
  ['damage-breach-wall', S({view:'siege',siegeFraming:'castle',wallRotY:196}), {}, 700],
  ['damage-cracked-field', S({view:'scene',sceneTime:'noon',sceneCam:'castle',sceneAmbient:false,sceneIntroDismissed:true}), {}, 1000],
  ['damage-breach-field', S({view:'scene',sceneTime:'noon',sceneCam:'castle',sceneAmbient:false,sceneIntroDismissed:true}), {}, 1000],
  ['trebuchet-ready', S({view:'build',machine:'trebuchet'}), {}, 650],
  ['trebuchet-release', S({view:'build',machine:'trebuchet',animating:true,shotId:1}), {}, 450],
  ['trebuchet-long', S({view:'build',machine:'trebuchet',beamLong:8,cwDrop:0.3,beamShort:0.3}), {}, 650],
  ['trebuchet-field', S({view:'scene',machine:'trebuchet',sceneTime:'noon',sceneCam:'machine',sceneAmbient:false,sceneIntroDismissed:true}), {}, 1000],
  ['torsion-ballista', S({view:'build',machine:'ballista'}), {}, 650],
  ['torsion-onager', S({view:'build',machine:'onager'}), {}, 650],
  ['torsion-onager-zero', S({view:'build',machine:'onager',onagerSling:0}), {}, 650],
  ['torsion-ballista-release', S({view:'build',machine:'ballista',animating:true,shotId:1}), {}, 200],
  ['torsion-onager-release', S({view:'build',machine:'onager',animating:true,shotId:1}), {}, 420],
  ['torsion-ballista-field', S({view:'scene',machine:'ballista',sceneCam:'machine',sceneAmbient:false,sceneIntroDismissed:true}), {}, 1000],
  ['torsion-onager-field', S({view:'scene',machine:'onager',sceneCam:'machine',sceneAmbient:false,sceneIntroDismissed:true}), {}, 1000],
  ['motion-ramp', S({view:'machines',bench:'ramp',shopAnimating:true,shopDemoId:1}), {}, 750],
  ['motion-wedge', S({view:'machines',bench:'wedge',shopAnimating:true,shopDemoId:1}), {}, 750],
  ['field-castle', S({view:'scene',sceneCam:'castle',sceneTime:'noon',sceneAmbient:false,sceneIntroDismissed:true,wallPreset:'gatehouse'}), {}, 1600],
  ['field-night', S({view:'scene',sceneCam:'castle',sceneTime:'night',sceneAmbient:false,sceneIntroDismissed:true}), {}, 1600],
  ['field-camp', S({view:'scene',sceneCam:'free',sceneRotY:196,sceneRotX:20,sceneZoom:1.7,sceneTime:'dawn',sceneAmbient:false,sceneIntroDismissed:true}), {}, 1600],
  ['field-engine', S({view:'scene',sceneCam:'machine',sceneTime:'noon',sceneAmbient:false,sceneIntroDismissed:true}), {}, 1500]
])`);
source = source.slice(0, source.indexOf('  // The simple-machine workshop is a simulation now')) + `
  const rangeReview=process.argv.includes('--only=ruler');
  await pg.setViewportSize({width:390,height:844});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[rangeReview ? S({view:'range',animating:true,shotId:1,motionPref:'off',windZ:12}) : S({view:'machines',bench:'screw'}),{dark:DARK,contrast:CONTRAST}]);
  await pg.waitForTimeout(500);
  await pg.screenshot({path:path.join(OUT,'mobile.png'),fullPage:true});
  let overflow=await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(rangeReview){
    await pg.locator('canvas').first().screenshot({path:path.join(OUT,'mobile-390-detail.png')});
    await pg.setViewportSize({width:320,height:844});await pg.waitForTimeout(350);
    overflow=overflow || await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    await pg.screenshot({path:path.join(OUT,'mobile-320.png'),fullPage:true});
    await pg.locator('canvas').first().screenshot({path:path.join(OUT,'mobile-320-detail.png')});
  }
  if(process.argv.includes('--only=workshop') || process.argv.includes('--only=workshop9') || process.argv.includes('--only=workshop10') || process.argv.includes('--only=workshop11') || process.argv.includes('--only=workshop12')){
    for(const bench of (process.argv.includes('--only=workshop12') ? ['lever','screw'] : process.argv.includes('--only=workshop11') ? ['pulley'] : process.argv.includes('--only=workshop10') ? ['wedge'] : process.argv.includes('--only=workshop9') ? ['lever','ramp'] : ['windlass','screw']))for(const width of [390,320]){
      await pg.setViewportSize({width,height:844});
      await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench,pulleySegments:process.argv.includes('--only=workshop11') ? 6 : 2,...(process.argv.includes('--only=workshop12') ? {leverEffortArm:0.2,leverLoadArm:4,screwHandleR:0.5,screwPitch:0.001} : {})}),{dark:DARK,contrast:CONTRAST}]);await pg.waitForTimeout(350);
      overflow=overflow || await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      const unobstructed=await pg.evaluate(()=>{const bay=document.querySelector('.ml-shop-bay').getBoundingClientRect(),hud=document.querySelector('.ml-shop-hud').getBoundingClientRect(),legend=document.querySelector('.ml-shop-legend').getBoundingClientRect();return hud.bottom<=bay.top+1 && legend.top>=bay.bottom-1;});
      if(!unobstructed)errors.push('Workshop overlays obstruct '+bench+' at '+width+'px');
      await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'mobile-'+bench+'-'+width+'-stage.png')});
      await pg.screenshot({path:path.join(OUT,'mobile-'+bench+'-'+width+'.png'),fullPage:true});
      await pg.locator('canvas').first().screenshot({path:path.join(OUT,'mobile-'+bench+'-'+width+'-detail.png')});
      if(process.argv.includes('--only=workshop12')) {
        await pg.locator('.ml-trade-comparison').locator('xpath=..').screenshot({path:path.join(OUT,'mobile-'+bench+'-'+width+'-comparison.png')});
        if(bench==='lever' && width===320) {
          await pg.getByRole('slider',{name:/^Effort arm/}).press('End');await pg.waitForTimeout(350);
          await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();
          const synced=await pg.waitForFunction(()=>{const d=window.__qaShop.mlDemo,bars=[...document.querySelectorAll('[data-ml-comparison=distance] [data-ml-bar]')];return Math.abs(d.effortTrack.geometry.parameters.width/d.loadTrack.geometry.parameters.width-1)<1e-9 && bars.every(b=>Math.abs(parseFloat(b.style.width)-100)<1e-9);},null,{timeout:15000}).then(()=>true,()=>false);
          if(!synced)errors.push('Keyboard slider did not update both comparison views');
          await pg.locator('.ml-trade-comparison').locator('xpath=..').screenshot({path:path.join(OUT,'keyboard-lever-equal-comparison.png')});
        }
      }
    }
    await pg.emulateMedia({reducedMotion:'reduce'});
    await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:process.argv.includes('--only=workshop11') ? 'pulley' : process.argv.includes('--only=workshop10') ? 'wedge' : 'screw',pulleySegments:6,shopAnimating:true,shopDemoId:2}),{dark:DARK,contrast:CONTRAST}]);await pg.waitForTimeout(350);
    await pg.locator('canvas').first().screenshot({path:path.join(OUT,process.argv.includes('--only=workshop11') ? 'pulley-reduced-motion-detail.png' : process.argv.includes('--only=workshop10') ? 'wedge-reduced-motion-detail.png' : 'screw-reduced-motion-detail.png')});
  }
  if(process.argv.includes('--only=workshop12') && manifest.length!==10)errors.push('Expected ten shared comparison scenarios');
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({ready,errors,overflow,shots:manifest},null,2));
  await b.close();
  if(errors.length || overflow) process.exitCode=1;
})();`;
vm.runInThisContext('(function(require){'+source+'\n})', {filename:__filename})(require);
