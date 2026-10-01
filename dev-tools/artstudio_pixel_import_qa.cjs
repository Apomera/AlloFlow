const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),read=file=>fs.readFileSync(file,'utf8'),out=path.resolve('reports/artstudio-workspace');
const shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
 .replace('var ctx = { React: React','var saved=React.useState([]);window.__saved=saved[0];window.__edit=pair[1];window.__state=pair[0];var ctx = { React: React')
 .replace('setToolSnapshots: function(){},','setToolSnapshots: saved[1],')
 .replace('toolSnapshots: [],','toolSnapshots: saved[0],');
(async()=>{
 const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.setContent('<html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_artstudio.js'])await page.addScriptTag({content:read(file)});
  await page.addScriptTag({content:shell});
  await page.evaluate(()=>__mount('artStudio',false,{tab:'pixel',studioStarted:true,studioHome:false,pixelGrid:16,pixelLayers:[{id:'background',name:'Protected background',visible:true,locked:true,pixels:{'15,15':'#102040'}}],pixelActiveLayer:'background'}));
  const editor=page.locator('#pixelCanvas'),workspace=page.locator('#pixelFullscreenWorkspace'),panel=page.locator('#artstudio-pixel-import');
  const snapshot=()=>editor.evaluate(canvas=>canvas._captureArtStudioState()),png=()=>editor.evaluate(canvas=>canvas._pixelExportNative());
  const history=name=>workspace.getByRole('button',{name,exact:true}).click();
  await editor.waitFor();await workspace.getByRole('button',{name:'Expand pixel canvas',exact:true}).click();
  await panel.evaluate(node=>{node.closest('[data-studio-compact-palette]').open=true;node.open=true;});
  await page.waitForFunction(()=>document.getElementById('pixelCanvas').getBoundingClientRect().width>750);
  const bounds=await editor.boundingBox();assert.equal(bounds.width,854);assert.equal(bounds.height,854);checks.push({expandedGrid:bounds});
  const encoded=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=16;canvas.height=8;const ctx=canvas.getContext('2d');
   for(let y=0;y<8;y++)for(let x=0;x<16;x++){if(y===0 && x<4)continue;ctx.fillStyle=x===0 && y===1?'#ff000080':'rgb('+x*16+','+y*32+','+(160-x*4)+')';ctx.fillRect(x,y,1,1);}
   return {png:canvas.toDataURL('image/png'),jpeg:canvas.toDataURL('image/jpeg'),webp:canvas.toDataURL('image/webp')};
  });
  const file=page.locator('#artstudio-pixel-import-file');
  const upload=async(type='png',name='Landscape.'+type)=>{await file.setInputFiles({name,mimeType:type==='jpeg'?'image/jpeg':'image/'+type,buffer:Buffer.from(encoded[type].split(',')[1],'base64')});await page.locator('#pixelImportPreview').waitFor();};
  const original=await snapshot();await upload();assert.deepEqual(await snapshot(),original);assert(await page.locator('#artstudio-pixel-import-count').textContent().then(text=>text.includes('124 painted cells')));
  assert.equal(await page.locator('#pixelImportPreview').getAttribute('width'),'16');assert.equal(await page.locator('#artstudio-pixel-import-name').inputValue(),'Landscape');
  checks.push('A real transparent PNG previews at the current grid without painting or changing history');
  await page.locator('#artstudio-pixel-import-fit').selectOption('cover');assert((await page.locator('#artstudio-pixel-import-count').textContent()).includes('256 painted cells'));
  await page.locator('#artstudio-pixel-import-fit').selectOption('stretch');assert((await page.locator('#artstudio-pixel-import-count').textContent()).includes('248 painted cells'));
  await page.locator('#artstudio-pixel-import-colors').selectOption('8');assert((await page.locator('#pixelImportPreview').getAttribute('aria-label')).includes('8 RGB colors'));assert.deepEqual(await snapshot(),original);
  await page.locator('#artstudio-pixel-import-fit').selectOption('contain');await page.locator('#artstudio-pixel-import-colors').selectOption('0');await page.locator('#artstudio-pixel-import-name').fill('Imported landscape');
  await page.screenshot({path:path.join(out,'pixel-import-desktop.png')});
  await page.locator('#artstudio-pixel-import-apply').click();const imported=await snapshot();assert.equal(imported.pixelLayers.length,2);assert.deepEqual(imported.pixelLayers[0],original.pixelLayers[0]);assert.equal(imported.pixelLayers[1].name,'Imported landscape');assert.equal(imported.pixelLayers[1].pixels['0,5'],'#ff000080');assert.equal(imported.pixelLayers[1].pixels['0,4'],undefined);assert.equal(imported.pixelLayers[1].pixels['0,0'],undefined);assert.equal(imported.pixelActiveLayer,imported.pixelLayers[1].id);
  const output=await png();const samples=await page.evaluate(async url=>{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return {half:[...ctx.getImageData(0,5,1,1).data],hole:[...ctx.getImageData(0,4,1,1).data],base:[...ctx.getImageData(15,15,1,1).data]};},output);
  assert.deepEqual(samples,{half:[255,0,0,128],hole:[0,0,0,0],base:[16,32,64,255]});fs.writeFileSync(path.join(out,'pixel-import-sprite.png'),Buffer.from(output.split(',')[1],'base64'));checks.push({transparentExport:samples});
  await history('Undo');assert.deepEqual(await snapshot(),original);await history('Redo');assert.deepEqual(await snapshot(),imported);checks.push('One Undo/Redo restores the entire stack, imported name and exact pixel colors');
  await upload('jpeg');await page.locator('#artstudio-pixel-import-cancel').click();assert.deepEqual(await snapshot(),imported);
  await upload('webp');await page.locator('#artstudio-pixel-import-cancel').click();assert.deepEqual(await snapshot(),imported);checks.push('Real JPEG and WebP files decode; cancel leaves the drawing unchanged');
  await file.setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await panel.getByRole('alert').waitFor();assert.deepEqual(await snapshot(),imported);assert.equal(await page.locator('#pixelImportPreview').count(),0);checks.push('An unreadable PNG shows a useful error without changing artwork');
  await upload();await page.locator('#artstudio-pixel-import-colors').selectOption('8');await page.locator('#artstudio-pixel-import-apply').click();const limited=await snapshot();assert(new Set(Object.values(limited.pixelLayers.at(-1).pixels).map(color=>color.slice(0,7))).size<=8);assert.equal(limited.pixelLayers.at(-1).pixels['0,5'].slice(7),'80');await history('Undo');assert.deepEqual(await snapshot(),imported);checks.push('The eight-color import preserves partial opacity and is recoverable');
  await upload();await workspace.getByRole('combobox',{name:'Grid size',exact:true}).selectOption('32');assert.equal(await page.locator('#pixelImportPreview').getAttribute('width'),'32');await history('Undo');assert.equal(await page.locator('#pixelImportPreview').getAttribute('width'),'16');assert.deepEqual(await snapshot(),imported);checks.push('Grid resizing updates the staged preview and Undo restores the resolution');
  await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});
  await page.locator('summary[aria-label="Studio actions"]').click();await page.getByRole('button',{name:'Save current study',exact:true}).click();await page.waitForFunction(()=>__saved.length===1);
  const study=await page.evaluate(()=>__saved[0]);assert.deepEqual(study.data.pixelLayers,imported.pixelLayers);assert(!Object.keys(study.data).some(key=>/^pixelImport/.test(key)));
  await workspace.getByRole('button',{name:'Clear active layer',exact:true}).click();assert.notDeepEqual(await snapshot(),imported);
  if(await page.locator('#artstudio-process-button').getAttribute('aria-expanded')!=='true')await page.locator('#artstudio-process-button').click();
  const fork=page.getByRole('button',{name:/^Fork Pixel Art/});await fork.click();assert.deepEqual(await snapshot(),imported);assert.deepEqual(await page.evaluate(()=>__saved[0]),study);assert.equal(await page.locator('#pixelImportPreview').count(),0);checks.push('Saved studies keep committed imported layers immutable, exclude staged images, and fork the exact stack');
  await panel.evaluate(node=>{node.closest('[data-studio-compact-palette]').open=true;node.open=true;});await upload();
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>!document.querySelector('[data-studio-compact-palette="pixel"]').open);await page.locator('[data-studio-compact-palette="pixel"] > summary').click();await panel.scrollIntoViewIfNeeded();
  const targets=await panel.evaluate(node=>[...node.querySelectorAll('button,input,select')].map(control=>({tag:control.tagName,height:control.getBoundingClientRect().height})));assert(targets.every(target=>target.height>=44));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push({phoneControls:targets.length,minHeight:Math.min(...targets.map(target=>target.height)),noHorizontalOverflow:true});
  await page.screenshot({path:path.join(out,'pixel-import-phone.png')});assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'pixel-import-browser-results.json'),JSON.stringify({passed:true,checks,errors},null,2));console.log(JSON.stringify({passed:true,checks}));
 }catch(error){fs.writeFileSync(path.join(out,'pixel-import-browser-results.json'),JSON.stringify({passed:false,checks,errors,failure:String(error)},null,2));await page.screenshot({path:path.join(out,'pixel-import-failure.png')});throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
