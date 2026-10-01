const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),read=p=>fs.readFileSync(p,'utf8'),out=path.resolve('reports/artstudio-workspace');
const shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1].replace('var ctx = { React: React','window.__edit=pair[1];window.__state=pair[0];var ctx = { React: React');
(async()=>{
 const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.setContent('<html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_artstudio.js'])await page.addScriptTag({content:read(file)});
  await page.addScriptTag({content:shell});
  const rows=['................','.......gg.......','.....ggGgg......','....rrrrrrrr....','...rrRRRRRRrr...','..rrRRWWWWRRrr..','..rRRWWWWWwRRr..','..rRRWWWWwwRRr..','..rRRWWwwwwRRr..','..rrRRRwwRRRrr..','...rrRRRRRRrr...','....rrrrrrrr....','......gggg......','......gGGg......','.....ggGGgg.....','................'];
  const colors={r:'#f00',R:'hsl(0,100%,50%)',W:'#ffedcf',w:'#edc38a',g:'#287052',G:'#50ae63'},data={};
  rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(colors[c])data[x+','+y]=colors[c];}));
  data['4,4']='red';data['11,4']='rgb(255,0,0)';data['1,14']='#ff000080';
  await page.evaluate(data=>__mount('artStudio',false,{tab:'pixel',studioStarted:true,studioHome:false,pixelGrid:16,pixelData:data}),data);
  const canvas=page.locator('#pixelCanvas'),workspace=page.locator('#pixelFullscreenWorkspace'),review=page.locator('#artstudio-pixel-review');
  await canvas.waitFor();await workspace.getByRole('button',{name:'Expand pixel canvas',exact:true}).click();
  await review.evaluate(node=>{node.closest('[data-studio-compact-palette]').open=true;node.open=true;});
  await page.waitForFunction(()=>document.getElementById('pixelCanvas').getBoundingClientRect().width>800);
  const bounds=await canvas.boundingBox();assert(bounds.width>800);checks.push({expandedGrid:bounds});
  assert.equal(await review.locator('[data-pixel-artwork-color]').count(),6);
  await review.locator('[data-pixel-artwork-color="#ff0000"]').click();
  await page.locator('#artstudio-pixel-replacement-hex').fill('#e04f75');await page.locator('#artstudio-pixel-replace-color').click();
  const recolored=await page.evaluate(()=>__state.artStudio.pixelData),changed=Object.keys(data).filter(key=>data[key]!==recolored[key]);
  assert(changed.length>40);assert.equal(recolored['4,4'],'#e04f75');assert.equal(recolored['1,14'],'#ff000080');
  await workspace.getByRole('button',{name:'Undo',exact:true}).click();assert.deepEqual(await canvas.evaluate(node=>node._captureArtStudioState().pixelData),data);
  await workspace.getByRole('button',{name:'Redo',exact:true}).click();assert.deepEqual(await canvas.evaluate(node=>node._captureArtStudioState().pixelData),recolored);
  checks.push({recoloredCells:changed.length,undoRedo:true,legacyNamedColors:true});
  const sprite=await canvas.evaluate(node=>node._pixelExportNative());
  await page.locator('#artstudio-pixel-preview-mode').selectOption('tile');await page.locator('#artstudio-pixel-preview-paper').selectOption('light');
  const repeated=await page.locator('#pixelArtworkPreview').evaluate(node=>{const ctx=node.getContext('2d'),sample=(x,y)=>[...ctx.getImageData(x,y,1,1).data];return{width:node.width,height:node.height,clear:sample(0,0),a:sample(4,4),b:sample(20,20),c:sample(36,36),partial:sample(1,14)};});
  assert.equal(repeated.width,48);assert.deepEqual(repeated.a,repeated.b);assert.deepEqual(repeated.b,repeated.c);assert.equal(repeated.clear[3],0);assert.equal(repeated.partial[3],128);
  assert.equal(await canvas.evaluate(node=>node._pixelExportNative()),sprite);checks.push({tile:repeated,transparentExportUnchanged:true});
  fs.writeFileSync(path.join(out,'pixel-colors-sprite.png'),Buffer.from(sprite.split(',')[1],'base64'));
  await review.evaluate(node=>{node.parentElement.scrollTop=0;});await page.screenshot({path:path.join(out,'pixel-colors-desktop.png')});
  await page.locator('#artstudio-pixel-preview-mode').selectOption('native');
  const actualSize=await page.locator('#pixelArtworkPreview').boundingBox();assert.equal(actualSize.width,16);assert.equal(actualSize.height,16);checks.push({actualSize});
  await page.locator('#artstudio-pixel-preview-mode').selectOption('sprite');await page.locator('#artstudio-pixel-preview-paper').selectOption('dark');
  await page.locator('#artstudio-pixel-replacement-hex').fill('#234567');await page.locator('#artstudio-pixel-use-color').click();
  const brush=await page.evaluate(()=>{const d=__state.artStudio,ctx=document.createElement('canvas').getContext('2d');ctx.fillStyle='hsl('+d.pixelHue+','+d.pixelSat+'%,'+d.pixelLit+'%)';return ctx.fillStyle;});
  assert.equal(brush,'#234567');assert.deepEqual(await canvas.evaluate(node=>node._captureArtStudioState().pixelData),recolored);checks.push('Exact brush color reuse leaves artwork untouched');
  // Uncommitted guides cannot enter the palette, preview, or sprite export.
  await workspace.getByRole('combobox',{name:'Shape tool',exact:true}).selectOption('line');
  const beforePreview=await page.locator('#pixelArtworkPreview').evaluate(node=>node.toDataURL());
  await canvas.evaluate(node=>{const r=node.getBoundingClientRect();node.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,pointerType:'mouse',button:0,clientX:r.left+20,clientY:r.top+20,bubbles:true}));node.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,pointerType:'mouse',clientX:r.left+300,clientY:r.top+300,bubbles:true}));});
  assert.equal(await page.locator('#pixelArtworkPreview').evaluate(node=>node.toDataURL()),beforePreview);assert.equal(await canvas.evaluate(node=>node._pixelExportNative()),sprite);
  await canvas.evaluate(node=>node.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true})));checks.push('Shape previews stay out of clean previews and exports');
  await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});
  await page.setViewportSize({width:390,height:844});
  // The phone layout initially collapses palettes to leave room for the grid.
  await page.waitForFunction(()=>!document.querySelector('[data-studio-compact-palette="pixel"]').open);
  await page.locator('[data-studio-compact-palette="pixel"] > summary').click();
  await review.scrollIntoViewIfNeeded();await page.locator('#artstudio-pixel-replacement-hex').scrollIntoViewIfNeeded();
  assert(await page.locator('#artstudio-pixel-replacement-hex').isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const targets=await review.evaluate(node=>[...node.querySelectorAll('button,input,select')].map(control=>({id:control.id,height:control.getBoundingClientRect().height})));
  assert(targets.every(target=>target.height>=44));checks.push({phoneTargets:targets.length,minHeight:Math.min(...targets.map(t=>t.height)),noHorizontalOverflow:true});
  await page.screenshot({path:path.join(out,'pixel-colors-phone.png')});
  // Dense palettes stay bounded to 24 swatches, with every color reachable.
  await page.evaluate(()=>{const pixels={};for(let i=0;i<65;i++)pixels[(i%16)+','+Math.floor(i/16)]='#'+(0x100000+i*251).toString(16);__edit(prev=>({...prev,artStudio:{...prev.artStudio,pixelData:pixels,pixelRestoreToken:'qa-new-artwork'}}));});
  await page.waitForFunction(()=>document.querySelectorAll('[data-pixel-artwork-color]').length===24);
  assert.notEqual(await page.locator('#artstudio-pixel-replacement-hex').inputValue(),'#234567');
  await review.getByRole('button',{name:'Next artwork colors'}).click();assert.equal(await review.locator('[data-pixel-artwork-color]').count(),24);
  await review.getByRole('button',{name:'Next artwork colors'}).click();assert.equal(await review.locator('[data-pixel-artwork-color]').count(),17);
  checks.push('All 65 colors reachable through 24-swatch pages; stale draft reset on new artwork');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'pixel-colors-browser-results.json'),JSON.stringify({passed:true,checks,errors},null,2));console.log(JSON.stringify({passed:true,checks}));
 }catch(error){fs.writeFileSync(path.join(out,'pixel-colors-browser-results.json'),JSON.stringify({passed:false,checks,errors,failure:String(error)},null,2));await page.screenshot({path:path.join(out,'pixel-colors-failure.png')});throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
