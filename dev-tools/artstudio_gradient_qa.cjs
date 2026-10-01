// Gradient editing, native CSS parity, transparent PNGs and responsive checks.
// Run: node dev-tools/artstudio_gradient_qa.cjs
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),read=file=>fs.readFileSync(file,'utf8'),out=path.resolve('reports/artstudio-workspace');
const shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1].replace('var ctx = { React: React','window.__edit=pair[1];window.__state=pair[0];var ctx = { React: React');
(async()=>{
  const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],measurements=[];
  page.on('pageerror',error=>errors.push(error.message));
  async function mount(extra={},fallback=false){
    await page.goto('about:blank');await page.setContent('<html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui;background:white}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
    if(fallback)await page.evaluate(()=>CanvasRenderingContext2D.prototype.createConicGradient=undefined);
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_artstudio.js'])await page.addScriptTag({content:read(file)});
    await page.addScriptTag({content:shell});await page.evaluate(extra=>__mount('artStudio',false,{tab:'gradient',studioHome:false,studioStarted:true,...extra}),extra);await page.locator('#gradientCanvas').waitFor();
  }
  const edit=values=>page.evaluate(values=>ReactDOM.flushSync(()=>__edit(previous=>({artStudio:{...previous.artStudio,...values}}))),values);
  const capture=()=>page.locator('#gradientCanvas').evaluate(canvas=>({model:canvas._gradientModel,png:canvas.toDataURL()}));
  try{
    const scenarios=[];
    for(const type of ['linear','radial','conic'])for(const blend of ['smooth','hard'])for(const transparent of [false,true])scenarios.push({type,blend,transparent,centerX:25,centerY:80,angle:135,rotation:73});
    scenarios.push({type:'conic',blend:'smooth',transparent:false,fallback:true,rotation:135,centerX:0,centerY:100},{type:'conic',blend:'hard',transparent:true,fallback:true,rotation:275,centerX:50,centerY:50},{type:'radial',blend:'smooth',transparent:true,centerX:100,centerY:0},{type:'linear',blend:'smooth',transparent:true,angle:275},{type:'conic',blend:'smooth',transparent:true,rotation:0,centerX:50,centerY:50});
    for(const scenario of scenarios){
      const stops=[{hue:0,sat:100,lit:50,pos:0,alpha:scenario.transparent?0:100},{hue:140,sat:70,lit:60,pos:37,alpha:scenario.transparent?35:100},{hue:240,sat:100,lit:50,pos:100,alpha:100}];
      await mount({gradType:scenario.type,gradBlend:scenario.blend,gradAngle:scenario.angle??90,gradRotation:scenario.rotation??0,gradCenterX:scenario.centerX??50,gradCenterY:scenario.centerY??50,gradStops:stops},scenario.fallback);
      const original=await page.locator('#gradientCanvas').evaluate(canvas=>{
        const css=document.querySelector('#artstudio-gradient-css').textContent,box=document.createElement('div');box.id='gradient-css-reference';Object.assign(box.style,{position:'fixed',left:'0',top:'0',width:'512px',height:'512px',zIndex:'99999',backgroundColor:'white',backgroundImage:css});document.body.appendChild(box);if(!box.style.backgroundImage)throw Error('Invalid CSS '+css);
        const scratch=document.createElement('canvas');scratch.width=scratch.height=512;const context=scratch.getContext('2d');context.fillStyle='white';context.fillRect(0,0,512,512);context.drawImage(canvas,0,0);
        const pixels=context.getImageData(0,0,512,512).data,samples=[];for(const y of [7,39,83,151,213,279,341,419,493])for(const x of [11,43,97,169,229,307,367,431,499]){const i=(y*512+x)*4;samples.push({x,y,rgb:[...pixels.slice(i,i+3)]});}
        return {samples,css,png:canvas.toDataURL()};
      });
      const png=await page.locator('#gradient-css-reference').screenshot();
      const comparison=await page.evaluate(async({encoded,samples})=>{
        const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,512,512).data;
        const differences=samples.map(p=>Math.max(...p.rgb.map((channel,k)=>Math.abs(channel-pixels[(p.y*512+p.x)*4+k]))));return {maximum:Math.max(...differences),mean:differences.reduce((a,b)=>a+b,0)/differences.length,samples:differences.length};
      },{encoded:png.toString('base64'),samples:original.samples});
      assert(comparison.maximum<=4,JSON.stringify({scenario,comparison,css:original.css}));measurements.push({scenario,comparison});
    }
    await mount({gradType:'radial',gradCenterX:25,gradCenterY:30,gradStops:[{hue:190,sat:95,lit:65,pos:0,alpha:100},{hue:275,sat:90,lit:50,pos:45,alpha:60},{hue:330,sat:90,lit:55,pos:100,alpha:0}]});
    await page.getByRole('button',{name:'Focus workspace',exact:true}).click();const desktop=await page.locator('#gradientCanvas').boundingBox();assert(desktop.width>=700);
    const before=await capture();await page.locator('#artstudio-grad-stop-1-alpha').scrollIntoViewIfNeeded();await page.evaluate(()=>window.__originalGradient=document.getElementById('gradientCanvas'));
    const slider=await page.locator('#artstudio-grad-stop-1-alpha').boundingBox();await page.mouse.move(slider.x+slider.width*.6,slider.y+slider.height/2);await page.mouse.down();await page.mouse.move(slider.x+slider.width*.2,slider.y+slider.height/2,{steps:12});await page.mouse.up();const changed=await capture();assert.notEqual(changed.png,before.png);
    await page.getByRole('button',{name:'Undo gradient edit',exact:true}).click();assert.deepEqual((await capture()).model,before.model);assert.equal((await capture()).png,before.png);assert(await page.locator('#artstudio-gradient-undo').isDisabled());
    await page.getByRole('button',{name:'Redo gradient edit',exact:true}).click();assert.deepEqual((await capture()).model,changed.model);assert(await page.evaluate(()=>__originalGradient===document.getElementById('gradientCanvas')));
    const center=page.getByRole('slider',{name:'Center horizontal position',exact:true});await center.scrollIntoViewIfNeeded();const centerBox=await center.boundingBox();
    await page.mouse.move(centerBox.x+centerBox.width*.25,centerBox.y+centerBox.height/2);await page.mouse.down();await page.mouse.move(centerBox.x+centerBox.width*.65,centerBox.y+centerBox.height/2,{steps:10});await page.mouse.up();
    assert.notEqual((await capture()).model.gradCenterX,changed.model.gradCenterX);await page.getByRole('button',{name:'Undo gradient edit',exact:true}).click();assert.deepEqual((await capture()).model,changed.model);
    await page.getByRole('button',{name:'Reverse stops',exact:true}).click();const reversed=await capture();await page.getByRole('button',{name:'Undo gradient edit',exact:true}).click();assert.deepEqual((await capture()).model,changed.model);assert.notEqual(reversed.png,changed.png);
    await page.getByRole('combobox',{name:'Studio tool',exact:true}).selectOption('pixel');await page.getByRole('combobox',{name:'Studio tool',exact:true}).selectOption('gradient');assert.deepEqual((await capture()).model,changed.model);assert.equal((await capture()).png,changed.png);
    for(const [label,name] of [['Export gradient as PNG','gradient-browser-export.png'],['Download gradient CSS','gradient-browser-export.css']]){const waiting=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();await (await waiting).saveAs(path.join(out,name));}
    assert.equal(fs.readFileSync(path.join(out,'gradient-browser-export.png')).toString('base64'),changed.png.split(',')[1]);assert(fs.readFileSync(path.join(out,'gradient-browser-export.css'),'utf8').includes(await page.locator('#artstudio-gradient-css').textContent()));
    await page.locator('[data-artstudio-gradient-controls]').evaluate(node=>node.scrollTop=0);await page.screenshot({path:path.join(out,'gradient-transparency-focus.png'),animations:'disabled'});
    await edit({gradType:'conic',gradRotation:45,gradCenterX:50,gradCenterY:50,gradBlend:'hard'});await page.screenshot({path:path.join(out,'gradient-conic-focus.png'),animations:'disabled'});
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));const preview=await page.locator('[data-artstudio-gradient-preview]').boundingBox(),controls=await page.locator('[data-artstudio-gradient-controls]').boundingBox();assert(preview.y<controls.y);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390));
    const buttons=await page.locator('[data-artstudio-gradient-layout] button').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).map(node=>({height:node.getBoundingClientRect().height,overflow:node.scrollWidth>node.clientWidth})));assert(buttons.every(node=>node.height>=44&&!node.overflow));await page.screenshot({path:path.join(out,'gradient-phone-focus.png'),animations:'disabled'});
    measurements.push({desktopCanvas:desktop.width,sliderGestureUndo:true,focusTransferGestureUndo:true,redo:true,reverseUndo:true,sameCanvas:true,tabRoundTrip:true,pngExact:true,cssFileMatches:true,phonePreviewFirst:true,phoneNoOverflow:true,phoneTouchTargets:true});
    assert.deepEqual(errors,[]);const result={passed:true,measurements,errors};fs.writeFileSync(path.join(out,'gradient-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
