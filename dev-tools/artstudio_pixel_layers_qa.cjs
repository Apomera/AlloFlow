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
  const colors={r:'#e04f75',R:'rgb(224,79,117)',W:'#ffedcf',w:'#edc38a',g:'#287052',G:'#50ae63'},petals={},background={};
  rows.forEach((row,y)=>[...row].forEach((c,x)=>{background[x+','+y]=y>=13?'#4f8862':'#d3e8f7';if(colors[c])petals[x+','+y]=colors[c];}));
  petals['1,14']='#ff000080';petals['4,4']='#e04f75';
  const layers=[{id:'background',name:'Background',visible:true,locked:true,pixels:background},{id:'flower',name:'Flower',visible:true,locked:false,pixels:petals},{id:'sketch',name:'Sketch',visible:false,locked:false,pixels:{'13,2':'#ffcc0066'}}];
  await page.evaluate(layers=>__mount('artStudio',false,{tab:'pixel',studioStarted:true,studioHome:false,pixelGrid:16,pixelLayers:layers,pixelActiveLayer:'flower'}),layers);
  const canvas=page.locator('#pixelCanvas'),workspace=page.locator('#pixelFullscreenWorkspace'),panel=page.locator('#artstudio-pixel-layers');
  const snapshot=()=>canvas.evaluate(node=>node._captureArtStudioState());
  const png=()=>canvas.evaluate(node=>node._pixelExportNative());
  const select=id=>panel.locator('[data-pixel-layer-id="'+id+'"]').click();
  const undo=()=>workspace.getByRole('button',{name:'Undo',exact:true}).click();
  await canvas.waitFor();await workspace.getByRole('button',{name:'Expand pixel canvas',exact:true}).click();
  await panel.evaluate(node=>{node.closest('[data-studio-compact-palette]').open=true;node.open=true;});
  await page.waitForFunction(()=>document.getElementById('pixelCanvas').getBoundingClientRect().width>750);
  const bounds=await canvas.boundingBox();checks.push({expandedGrid:bounds});
  const original=await snapshot(),originalPng=await png();
  assert.deepEqual(original.pixelLayers,layers);
  await page.evaluate(async url=>{const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas');c.width=c.height=16;c.getContext('2d').drawImage(image,0,0);window.__spriteSamples={solid:[...c.getContext('2d').getImageData(4,4,1,1).data],partial:[...c.getContext('2d').getImageData(1,14,1,1).data]};},originalPng);
  const samples=await page.evaluate(()=>__spriteSamples);assert.deepEqual(samples.solid,[224,79,117,255]);assert.deepEqual(samples.partial,[167,68,49,255]);checks.push({alphaComposite:samples});
  await page.locator('#artstudio-pixel-layer-visible').uncheck();assert.equal((await snapshot()).pixelData['4,4'],'#d3e8f7');await canvas.press('Enter');assert.deepEqual((await snapshot()).pixelLayers[1].pixels,petals);await undo();assert.equal(await png(),originalPng);
  await page.locator('#artstudio-pixel-layer-lock').check();const locked=await snapshot();await canvas.press('Enter');assert.deepEqual(await snapshot(),locked);assert(await page.locator('#artstudio-pixel-layer-delete').isDisabled());await undo();
  checks.push('Hidden and locked paint is protected; toggles and pixels restore with Undo');
  await page.locator('#artstudio-pixel-layer-name').fill('Petals');await page.locator('#artstudio-pixel-layer-name').press('Enter');assert.equal((await snapshot()).pixelLayers[1].name,'Petals');
  const beforeDuplicate=await snapshot();await page.locator('#artstudio-pixel-layer-duplicate').click();let duplicate=await snapshot();assert.equal(duplicate.pixelLayers.length,4);assert.equal(duplicate.pixelLayers[2].name,'Petals copy');
  await workspace.getByRole('button',{name:'Clear active layer',exact:true}).click();assert.equal(await png(),originalPng);assert.deepEqual((await snapshot()).pixelLayers[1].pixels,petals);
  await page.locator('#artstudio-pixel-layer-delete').click();assert.equal((await snapshot()).pixelLayers.length,3);await undo();await undo();await undo();assert.deepEqual(await snapshot(),beforeDuplicate);
  await page.locator('#artstudio-pixel-layer-down').click();assert.equal((await snapshot()).pixelData['4,4'],'#d3e8f7');await undo();assert.equal(await png(),originalPng);
  checks.push('Rename, independent duplication, active-layer clearing, deletion and stacking Undo pass');
  await select('background');await page.locator('#artstudio-pixel-layer-lock').uncheck();await select('flower');const beforeMerge=await snapshot();
  await page.locator('#artstudio-pixel-layer-merge').click();assert.equal((await snapshot()).pixelLayers.length,2);assert.equal(await png(),originalPng);await undo();assert.deepEqual(await snapshot(),beforeMerge);
  checks.push('Merge keeps the visible sprite byte-identical and Undo restores both layers');
  await select('background');await page.locator('#artstudio-pixel-layer-lock').check();await select('flower');
  await panel.evaluate(node=>node.parentElement.scrollTop=0);await page.screenshot({path:path.join(out,'pixel-layers-desktop.png')});
  fs.writeFileSync(path.join(out,'pixel-layers-sprite.png'),Buffer.from((await png()).split(',')[1],'base64'));
  // Layer changes cancel unfinished guides and keep them out of exports.
  await workspace.getByRole('combobox',{name:'Shape tool',exact:true}).selectOption('line');await canvas.press('Enter');await canvas.press('ArrowRight');await select('sketch');assert.equal(await canvas.evaluate(node=>node._pixelLineStart),null);assert.equal(await png(),originalPng);await select('flower');
  checks.push('Changing layers cancels an unfinished shape without changing exported pixels');
  await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>!document.querySelector('[data-studio-compact-palette="pixel"]').open);await page.locator('[data-studio-compact-palette="pixel"] > summary').click();await panel.scrollIntoViewIfNeeded();
  assert(await page.locator('#artstudio-pixel-layer-name').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const targets=await panel.evaluate(node=>[...node.querySelectorAll('button,input[type=text],label')].map(control=>({tag:control.tagName,height:control.getBoundingClientRect().height})).filter(control=>control.tag!=='LABEL'||control.height>=40));
  assert(targets.every(target=>target.height>=44));checks.push({phoneControls:targets.length,minHeight:Math.min(...targets.map(t=>t.height)),noHorizontalOverflow:true});
  await page.screenshot({path:path.join(out,'pixel-layers-phone.png')});assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'pixel-layers-browser-results.json'),JSON.stringify({passed:true,checks,errors},null,2));console.log(JSON.stringify({passed:true,checks}));
 }catch(error){fs.writeFileSync(path.join(out,'pixel-layers-browser-results.json'),JSON.stringify({passed:false,checks,errors,failure:String(error)},null,2));await page.screenshot({path:path.join(out,'pixel-layers-failure.png')});throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
