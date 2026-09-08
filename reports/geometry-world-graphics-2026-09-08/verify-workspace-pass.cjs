// Final workspace UI QA: run only after the coordinated core/dock source is ready.
const fs = require('node:fs');
let harness = fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness = harness.replace('__mount({_introShownOnce:true})','__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false})');
harness += '(' + (async function verifyWorkspacePass() {
  const results={scope:'Actual local React/Three WebGL workspace, populated 150-block pavilion, touch-capable Chromium at DPR 1; local high-contrast theme',errors:[],failures:[],frames:[]};
  const check=(condition,message)=>{if(!condition)results.failures.push(message);};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,hasTouch:true,acceptDownloads:true});
  page.setDefaultTimeout(15000);page.on('pageerror',error=>results.errors.push(error.message));
  async function probe(locator) {
    return locator.evaluate(node=>{
      const r=node.getBoundingClientRect(),s=getComputedStyle(node),x=r.left+r.width/2,y=r.top+r.height/2;
      const top=document.elementFromPoint(x,y);
      return {name:node.getAttribute('aria-label')||node.textContent.trim(),width:r.width,height:r.height,x:r.x,y:r.y,
        inViewport:r.left>=-0.5&&r.top>=-0.5&&r.right<=innerWidth+0.5&&r.bottom<=innerHeight+0.5,
        visible:s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0,
        hit:!!top&&(node===top||node.contains(top)),coveredBy:top?(top.getAttribute('aria-label')||top.className||top.tagName):null};
    });
  }
  async function fingerprint() {return page.evaluate(()=>window.__workspaceFingerprint());}
  async function expanded(value) {
    const current=await page.locator('.gwe-builder-dock').getAttribute('data-collapsed');
    if((current==='true')===value) await page.getByRole('button',{name:value?'Expand Free Build Studio':'Collapse Free Build Studio',exact:true}).click();
    await page.waitForFunction(value=>document.querySelector('.gwe-builder-dock')?.dataset.collapsed===(value?'false':'true'),value);
  }
  async function critical(prefix) {
    const entries=[];
    for(const name of ['Select and measure aimed build','Send selected build to Print Lab','Collapse Free Build Studio']) {
      const state=await probe(page.getByRole('button',{name,exact:true}));entries.push(state);
      check(state.visible&&state.inViewport&&state.hit,prefix+': '+name+' is visible and clickable');
      check(state.width>=43.5&&state.height>=43.5,prefix+': '+name+' has a 44px target');
    }
    return entries;
  }
  async function highContrastProbe(locator) {
    await page.keyboard.press('Tab');await locator.focus();
    return locator.evaluate(node=>{
      const parse=value=>{const parts=value.match(/[\d.]+/g);return parts?parts.map(Number):[0,0,0,0];};
      function background(target) {
        const chain=[];for(let n=target;n;n=n.parentElement)chain.unshift(n);
        let rgb=[0,0,0],unknown=false;
        chain.forEach(n=>{const s=getComputedStyle(n),v=parse(s.backgroundColor),a=v.length>3?v[3]:1;
          if(a>=0.999)unknown=false;
          rgb=rgb.map((under,i)=>v[i]*a+under*(1-a));if(s.backgroundImage!=='none')unknown=true;
        });return {rgb,unknown};
      }
      const luminance=rgb=>rgb.map(v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
      const contrast=(a,b)=>{const aa=luminance(a),bb=luminance(b);return(Math.max(aa,bb)+0.05)/(Math.min(aa,bb)+0.05);};
      const labels=[],walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let text;
      while(text=walker.nextNode())if(text.textContent.trim()) {
        const target=text.parentElement,style=getComputedStyle(target),rect=target.getBoundingClientRect();
        if(style.display==='none'||style.visibility==='hidden'||rect.width===0||rect.height===0)continue;
        const bg=background(target),fg=parse(style.color);
        labels.push({text:text.textContent.trim(),color:style.color,background:bg.rgb,hasUnmeasuredGradient:bg.unknown,ratio:contrast(fg,bg.rgb)});
      }
      const style=getComputedStyle(node),bg=background(node);
      return {name:node.getAttribute('aria-label')||node.textContent.trim(),labels,
        focusVisible:node.matches(':focus-visible'),outlineWidth:parseFloat(style.outlineWidth),outlineStyle:style.outlineStyle,
        outlineColor:style.outlineColor,outlineContrast:contrast(parse(style.outlineColor),bg.rgb)};
    });
  }
  try {
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.__geoWorldEngine,{}, {timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();
    await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    await page.waitForFunction(()=>!!window.__geoWorldEngine?._currentLesson?.sandbox);
    results.fixture=await page.evaluate(()=>{
      const en=__geoWorldEngine;en._entryAnim=null;en.flyMode=true;en.velocity.set(0,0,0);en._ambientMotionEnabled=false;en.applyRenderQuality('saver');
      const put=(x,y,z,type,shape='cube',rotation=0)=>en.placeBlock(x,y,z,type,shape,rotation);
      for(let x=-3;x<=2;x++)for(let z=-2;z<=2;z++)put(x,1,z,(x===-3||x===2||z===-2||z===2)?'stone':'wood');
      for(const x of [-3,2])for(const z of [-2,2]){put(x,2,z,'brick');for(let y=3;y<=4;y++)put(x,y,z,'wood');put(x,5,z,'gold');}
      for(let x=-3;x<=2;x++)for(const z of [-2,2])if(x!==-3&&x!==2)put(x,5,z,'wood');
      for(let z=-1;z<=1;z++)for(const x of [-3,2])put(x,5,z,'wood');
      for(let x=-4;x<=3;x++)for(let z=-3;z<=3;z++){const y=5+Math.min(x+4,3-x);put(x,y,z,'brick','halfA',x<0?0:2);if(y>5)put(x,y-1,z,'wood');}
      for(let x=-1;x<=0;x++)put(x,1,3,'stone','halfB');en.refreshAllAO();
      en.blocksPlaced=Object.values(en.blocks).filter(mesh=>!mesh.userData._lessonBlock).length;
      __ctx.updateMulti('geometryWorld',{blocksPlaced:en.blocksPlaced,renderQuality:'saver',autoCycle:false,showGameSettings:false,sandboxDockCollapsed:false,touchMode:true});
      window.__workspaceEngine=en;
      window.__workspaceFingerprint=async()=>{
        const e=__geoWorldEngine,selection=e._builderSelection.blocks;
        const bundle=StemLab.geometryWorldBuilderPure.buildGeometryWorldStl(e,selection);
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bundle.buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
        return {hash,bytes:bundle.buffer.byteLength,selected:selection.length,studentBlocks:Object.values(e.blocks).filter(m=>!m.userData._lessonBlock).length,
          undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack)};
      };
      return {studentBlocks:Object.values(en.blocks).filter(m=>!m.userData._lessonBlock).length};
    });
    await page.evaluate(()=>{__aimAt(-2,1,2);__geoWorldEngine.camera.updateMatrixWorld(true);});
    await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();
    await page.waitForFunction(()=>__geoWorldEngine._builderSelection?.blocks?.length===150);
    const baseline=results.baseline=await fingerprint();check(baseline.selected===150,'The connected pavilion contains 150 selected blocks');
    for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:700}]) {
      const label=size.width+'x'+size.height,frame={viewport:size};results.frames.push(frame);
      try {
        await page.setViewportSize(size);
        await page.evaluate(()=>{const en=__geoWorldEngine;en._entryAnim=null;en.flyMode=true;en.velocity.set(0,0,0);en.camera.position.set(14,11,19);en.camera.lookAt(0,2.5,0);en.euler.setFromQuaternion(en.camera.quaternion);en.camera.updateMatrixWorld(true);__ctx.updateMulti('geometryWorld',{showGameSettings:false,showPredictionPanel:false,objectivesOpen:false,touchMode:true});});
        await page.waitForFunction(()=>{const en=__geoWorldEngine,r=en.renderer.domElement.getBoundingClientRect();return Math.abs(en.camera.aspect-r.width/r.height)<0.02;});
        frame.resizeContinuity=await page.evaluate(()=>({sameEngine:window.__geoWorldEngine===window.__workspaceEngine,studentBlocks:Object.values(__geoWorldEngine.blocks).filter(mesh=>!mesh.userData._lessonBlock).length,mobileGateVisible:!!document.querySelector('#gw-mobile-title')}));
        check(frame.resizeContinuity.sameEngine&&frame.resizeContinuity.studentBlocks===150&&!frame.resizeContinuity.mobileGateVisible,label+': responsive resize preserves the mounted engine and all student blocks');
        await expanded(false);
        frame.overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);check(!frame.overflow,label+': no horizontal page overflow');
        frame.materials=[];
        for(const name of [/^Select Wood block/,/^Select Torch block/,/^Select Stone block/]) {
          const button=page.getByRole('button',{name});await button.scrollIntoViewIfNeeded();
          if(size.width<800)await button.tap();else await button.click();
          await page.waitForFunction(()=>document.querySelector('.gw-hotbar-item[aria-pressed="true"]')?.getAttribute('aria-label')?.includes('currently selected'));
          const state=await probe(button);state.pressed=await button.getAttribute('aria-pressed');frame.materials.push(state);
          check(state.pressed==='true'&&state.hit&&state.inViewport,label+': material '+state.name+' selects and remains visible');
          check(state.width>=43.5&&state.height>=43.5,label+': material '+state.name+' has a 44px target');
        }
        frame.shortcuts=[];
        for(const [key,index,name] of [['Digit0',9,'Ice'],['Minus',10,'Lava'],['Equal',11,'Torch']]) {
          await page.locator('#geoworld-fs-wrap').focus();await page.keyboard.press(key);
          await page.waitForFunction(index=>__ctx.toolData.geometryWorld.selectedBlock===index,index);
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          const button=page.getByRole('button',{name:new RegExp('^Select '+name+' block')});
          const state=await probe(button);state.key=key;state.index=await page.evaluate(()=>__ctx.toolData.geometryWorld.selectedBlock);state.fullyInPalette=await button.evaluate(node=>{const r=node.getBoundingClientRect(),p=node.closest('.gw-hotbar').getBoundingClientRect();return r.left>=p.left-0.5&&r.right<=p.right+0.5;});frame.shortcuts.push(state);
          check(state.fullyInPalette,label+': '+key+' reveals the entire selected material tile');
          check(state.name.replace(/[−–]/g,'-').includes('key '+({Digit0:'0',Minus:'-',Equal:'='}[key])),label+': '+name+' announces its actual keyboard shortcut');
          check(state.index===index&&state.hit&&state.inViewport,label+': '+key+' selects '+name+' and reveals it in the scrolling palette');
        }
        await page.locator('#geoworld-fs-wrap').focus();await page.keyboard.press('Digit1');
        const shapes=page.locator('.gw-shape-tray [role="button"][aria-label^="Select "]');
        await shapes.nth(1).click();check(await shapes.nth(1).getAttribute('aria-pressed')==='true',label+': diagonal-half shape selects');
        const rotate=page.getByRole('button',{name:/^Rotate selected shape/});await rotate.focus();await page.keyboard.press('Enter');
        frame.rotation=await page.evaluate(()=>__ctx.toolData.geometryWorld.blockRotation);check(frame.rotation>0,label+': keyboard rotation works');
        await shapes.first().click();frame.shape=await probe(shapes.first());check(frame.shape.hit&&frame.shape.inViewport&&frame.shape.width>=43.5&&frame.shape.height>=43.5,label+': shape target is visible and at least 44px');
        frame.touchPalette=await page.evaluate(()=>{
          const visible=node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width&&r.height;};
          const palette=document.querySelector('.gw-hotbar').getBoundingClientRect(),overlaps=[];
          document.querySelectorAll('.gw-touch-controls button,.gw-touch-controls > [role="img"]').forEach(node=>{
            if(!visible(node))return;const r=node.getBoundingClientRect(),w=Math.min(r.right,palette.right)-Math.max(r.left,palette.left),h=Math.min(r.bottom,palette.bottom)-Math.max(r.top,palette.top);
            if(w>1&&h>1)overlaps.push({name:node.getAttribute('aria-label')||node.textContent.trim(),area:w*h});
          });return {touchActive:document.querySelector('#geoworld-fs-workspace').dataset.touchActive,overlaps};
        });check(frame.touchPalette.overlaps.length===0,label+': touch controls do not overlap the material palette');
        frame.viewportControls=[];
        for(const selector of ['.gw-viewport-control--fullscreen','.gw-viewport-control--touch']) {
          const control=page.locator(selector);
          if(await control.count()&&await control.isVisible()){const state=await probe(control);frame.viewportControls.push(state);check(state.hit&&state.inViewport,label+': '+state.name+' viewport control is not covered by touch look settings');}
          else if(size.width<800||selector.includes('fullscreen'))check(false,label+': expected viewport control '+selector+' is visible');
        }
        await page.screenshot({timeout:45000,path:path.join(out,'workspace-pass-'+label+'-collapsed.png')});
        const settings=page.locator('.gw-toolbar [data-geometry-settings-trigger="true"]');await settings.click();
        frame.menu=await probe(page.getByRole('button',{name:'Close game settings and tools',exact:true}));check(frame.menu.hit&&frame.menu.inViewport,label+': game menu close remains reachable');
        await page.getByRole('button',{name:'Close game settings and tools',exact:true}).click();
        await page.getByRole('button',{name:'Hide the Geometry World game bar',exact:true}).click();
        const showBar=page.getByRole('button',{name:'Show the Geometry World game bar',exact:true});frame.toolbarReveal=await probe(showBar);check(frame.toolbarReveal.hit&&frame.toolbarReveal.inViewport,label+': hidden toolbar can be restored');await showBar.click();
        await expanded(true);frame.pinnedAtTop=await critical(label+' dock top');
        await page.screenshot({timeout:45000,path:path.join(out,'workspace-pass-'+label+'-expanded.png')});
        for(const summary of ['Printer profile & scale','Workspace options']) {
          const disclosure=page.locator('.gwe-builder-body summary').filter({hasText:summary});
          if(await disclosure.count()){await disclosure.scrollIntoViewIfNeeded();await disclosure.click();}
        }
        const fresh=page.getByRole('button',{name:/Start a fresh sandbox/});await fresh.scrollIntoViewIfNeeded();frame.fresh=await probe(fresh);
        frame.scroll=await page.locator('.gwe-builder-body').evaluate(node=>({top:node.scrollTop,height:node.clientHeight,scrollHeight:node.scrollHeight}));
        check(frame.fresh.hit&&frame.fresh.inViewport,label+': final workspace option is reachable by scrolling');
        check(frame.scroll.height>0,label+': dock body has usable scroll height');frame.pinnedAtBottom=await critical(label+' dock scrolled');
        await page.screenshot({timeout:45000,path:path.join(out,'workspace-pass-'+label+'-scrolled.png')});
        await page.evaluate(()=>{document.body.classList.add('theme-contrast');document.body.setAttribute('data-stem-theme','contrast');});
        await page.locator('.gwe-builder-body').evaluate(node=>node.scrollTop=0);
        frame.highContrast=[];
        for(const name of ['Select and measure aimed build','Send selected build to Print Lab','Collapse Free Build Studio']) {
          const state=await highContrastProbe(page.getByRole('button',{name,exact:true}));frame.highContrast.push(state);
          check(state.focusVisible&&state.outlineWidth>=2&&state.outlineStyle!=='none'&&state.outlineContrast>=3,label+': high-contrast focus ring on '+name);
          check(state.labels.every(text=>!text.hasUnmeasuredGradient&&text.ratio>=4.5),label+': high-contrast text on '+name+' reaches 4.5:1');
        }
        await page.screenshot({timeout:45000,path:path.join(out,'workspace-pass-'+label+'-contrast.png')});
        await page.evaluate(()=>{document.body.classList.remove('theme-contrast');document.body.removeAttribute('data-stem-theme');});
        const after=frame.fingerprint=await fingerprint();
        check(after.hash===baseline.hash&&after.bytes===baseline.bytes&&after.selected===baseline.selected&&after.studentBlocks===baseline.studentBlocks&&after.undo===baseline.undo&&after.redo===baseline.redo,label+': controls preserve selected geometry, STL and history');
      } catch(error) {frame.failure=error.stack;results.failures.push(label+': '+error.message);await page.screenshot({timeout:45000,path:path.join(out,'workspace-pass-'+label+'-failure.png')}).catch(()=>{});await page.evaluate(()=>{document.body.classList.remove('theme-contrast');document.body.removeAttribute('data-stem-theme');}).catch(()=>{});}
    }
    results.final=await fingerprint();results.shaderErrors=await page.evaluate(()=>__geoWorldEngine.renderer.info.programs.filter(program=>program.diagnostics?.runnable===false).map(program=>program.diagnostics));
    check(results.shaderErrors.length===0,'No shader compile failures');check(results.errors.length===0,'No page errors');
    results.pass=results.failures.length===0;
  } catch(error) {results.failure=error.stack;results.pass=false;}
  finally {
    fs.writeFileSync(path.join(out,'workspace-pass-results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify({pass:results.pass,failure:results.failure,failures:results.failures,errors:results.errors,viewports:results.frames.map(frame=>({viewport:frame.viewport,failure:frame.failure,scroll:frame.scroll}))},null,2));
    await browser.close();await new Promise(resolve=>server.close(resolve));if(!results.pass)process.exitCode=1;
  }
}).toString()+')();';
eval(harness);
