// Native React/THREE verification for the geometry and metric readout.
const fs=require('fs'),path=require('path'),vm=require('vm');
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_efficiency_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-efficiency-lab-2026-10-10/browser','reports/machinelab-readout-visual-2026-10-12/browser/run-01');
bootstrap+=String.raw`
  const panel=()=>pg.locator('[data-ml-readout]');
  const settle=()=>pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  async function verify(kind,ma,load,movement=.5,band='g68',geometryValues=null){
    await settle();const target=panel(),valid=Number.isFinite(ma)&&ma>0,young=band==='k2',advanced=['g68','g912'].includes(band);
    check(await target.count()===1&&await target.getAttribute('data-ml-readout')===kind,kind+': one readout for current station');
    check(await target.evaluate(el=>el.tagName==='SECTION'&&!!document.getElementById(el.getAttribute('aria-labelledby'))?.textContent.trim()),kind+': readout has visible accessible heading');
    check(await target.locator('[aria-live],[role=status]').count()===0,kind+': numeric readout does not flood live announcements');
    const rows=await target.locator('[data-ml-readout-metric]').evaluateAll(els=>els.map(el=>({id:el.getAttribute('data-ml-readout-metric'),raw:el.getAttribute('data-value'),text:el.querySelector('dd')?.textContent,
      semantic:!!el.closest('dl')&&!!el.querySelector('dt')?.textContent.trim()&&!!el.querySelector('dd')})));
    check(rows.length===(young?2:advanced?5:3)&&rows.every(row=>row.semantic),kind+': '+band+' semantic metrics retain grade policy');
    const expected={ma:valid?ma:null,effort:valid?load/ma:null,load,effortDistance:valid?movement*ma:null,loadDistance:movement};
    for(const row of rows){if(row.id==='feel'){check(young&&row.text.length>0,kind+': younger learners keep plain-language feeling');continue;}
      const value=expected[row.id];check(value===null?row.raw===null:row.raw!==null&&near(Number(row.raw),value),kind+': '+row.id+' agrees with independent math');
      check(value===null?row.text==='—':Math.abs(parseFloat(row.text)-value)<=Math.max(.00051,Math.abs(value)*.00051),kind+': '+row.id+' display has suitable precision');
    }
    if(!young)check(await target.locator('[data-ml-readout-trade]').getAttribute('data-ml-readout-trade')===(!valid?'invalid':ma>1?'advantage':ma<1?'disadvantage':'equal'),kind+': trade caption matches actual MA');
    const figure=target.locator('[data-ml-geometry-chart]');check(await figure.count()===(young||!valid?0:1),kind+': geometry appears only for eligible valid setups');
    if(!young&&valid){
      check(await figure.evaluate(el=>el.tagName==='FIGURE'&&el.querySelector('figcaption')?.id===el.getAttribute('aria-labelledby')),kind+': geometry has semantic visible caption');
      if(kind==='pulley'){
        check(await figure.locator('[data-ml-geometry-segment]').count()===(ma<=6?ma:0),kind+': supporting-strand count diagram is honest');
        check(Number(await figure.locator('[data-ml-geometry-count]').getAttribute('data-ml-geometry-count'))===ma,kind+': pulley MA equals supporting-strand count');
        check((await figure.textContent()).includes('not the wheels'),kind+': rope count is distinguished from wheel count');
      }else{
        const parts=await figure.locator('[data-ml-geometry-part]').evaluateAll(els=>els.map(el=>({id:el.getAttribute('data-ml-geometry-part'),value:Number(el.dataset.value),
          width:parseFloat(el.querySelector('[data-ml-geometry-bar]').style.width),min:getComputedStyle(el.querySelector('[data-ml-geometry-bar]')).minWidth,
          semantic:el.children[0]?.tagName==='DT'&&el.children[1]?.tagName==='DD'})));
        check(parts.length===2&&parts.every(p=>p.semantic),kind+': numerator and denominator use direct term/definition pairs');
        if(geometryValues)parts.forEach((part,i)=>check(near(part.value,geometryValues[i]),kind+': '+part.id+' uses current physical dimension'));
        check(near(parts[0].value/parts[1].value,ma),kind+': geometry ratio matches independent MA');
        const scale=Math.max(...parts.map(p=>p.value));
        parts.forEach(part=>check(Math.abs(part.width-part.value/scale*100)<.00001&&['0px','auto'].includes(part.min),kind+': '+part.id+' bar uses common scale without minimum inflation'));
        check((await figure.locator('[data-ml-geometry-equation]').textContent()).includes('÷'),kind+': substituted calculation is available as text');
        if(kind==='screw')check((await figure.textContent()).includes('Handle path in one full turn')&&(await figure.textContent()).includes('Thread pitch'),kind+': screw distinguishes handle circumference from pitch');
      }
    }
    check(await recordsPreserved(),kind+': rendering leaves saved comparison/design/investigation records unchanged');
  }
  async function layout(label){
    check(await panel().evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1&&
      [...el.querySelectorAll('dt,dd,p,h3,figcaption,[data-ml-readout-metric]')].every(n=>n.scrollWidth<=n.clientWidth+1)),label+': no clipped text or horizontal overflow');
    check(await panel().evaluate(el=>[...el.querySelectorAll('dd')].every(n=>parseFloat(getComputedStyle(n).fontSize)>=17)),label+': main values remain legible');
  }
  async function shot(name){await layout(name);await panel().scrollIntoViewIfNeeded();await settle();await panel().screenshot({path:path.join(OUT,name+'.png')});shots.push(name);}
  try{
    const dimensions={lever:[2,1],windlass:[.45,.1],ramp:[4,1],wedge:[.3,.06],screw:[2*Math.PI*.15,.005]};
    for(const f of fixtures){
      await mount(f.kind);await verify(f.kind,f.ma,f.load,.5,'g68',dimensions[f.kind]);await layout(f.kind+' desktop');
      if(f.kind==='lever'){
        await shot('desktop-lever-readout');
        await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowRight');await verify('lever',2.1,400,.5,'g68',[2.1,1]);
        check(await pg.locator('#ml-leverEffortArm').evaluate(el=>el===document.activeElement&&el.matches(':focus-visible')), 'Live readout updates preserve visible keyboard focus on the slider');
      }
      if(f.kind==='pulley'){
        await pg.locator('#ml-pulleySegments').focus();await pg.keyboard.press('End');await verify('pulley',6,400);await shot('desktop-pulley-readout');
      }
    }
    await mount('screw',320,{dark:true,band:'g912'},{screwHandleR:.5,screwPitch:.001,screwLoad:50});
    await verify('screw',2*Math.PI*.5/.001,50,.5,'g912',[2*Math.PI*.5,.001]);
    check(parseFloat(await panel().locator('[data-ml-readout-metric=effort] dd').textContent())>0,'Minimum legal screw effort is visible and nonzero');
    check(await panel().locator('.ml-readout-metrics').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length===1),'Phone metric cards stack in one column');
    await shot('dark-phone-screw-readout');
    await mount('lever',320,{contrast:true},{leverEffortArm:.2,leverLoadArm:1});await verify('lever',.2,400,.5,'g68',[.2,1]);
    const patterns=await panel().locator('[data-ml-geometry-bar]').evaluateAll(els=>els.map(el=>({image:getComputedStyle(el).backgroundImage,fill:getComputedStyle(el).backgroundColor,adjust:getComputedStyle(el).forcedColorAdjust})));
    check(patterns.length===2&&patterns[0].image==='none'&&patterns[1].image.includes('gradient')&&patterns.every(p=>p.adjust==='none'&&p.fill!=='rgba(0, 0, 0, 0)'),'Forced colors preserves solid and striped dimension bars');
    await shot('forced-colors-readout');
    await pg.locator('#ml-leverLoadArm').focus();await pg.keyboard.press('Home');await verify('lever',1,400,.5,'g68',[.2,.2]);
    for(const value of [.9999,1.0001]){
      await mount('lever',320,{}, {leverEffortArm:value,leverLoadArm:1});await verify('lever',value,400,.5,'g68',[value,1]);
      check(await panel().locator('[data-ml-readout-metric=ma] dd').textContent()===String(value)+'×','Near-unity MA '+value+' is not rounded to an equal ratio');
      check((await panel().locator('[data-ml-geometry-equation]').textContent()).includes(String(value)+'×'),'Near-unity substituted result retains '+value);
    }
    await mount('ramp',320,{}, {rampLength:1,rampHeight:2});await verify('ramp',null,400);await layout('Invalid ramp');
    await mount('lever',320,{band:'k2'});await verify('lever',2,400,.5,'k2');await shot('phone-younger-readout');
    await mount('ramp',768,{band:'g35'});await verify('ramp',4,400,.5,'g35',[4,1]);await shot('tablet-grade35-readout');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,errors},null,2)+'\n');
    console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1000))},null,2));
    if(errors.length)process.exitCode=1;await b.close();
  }
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
