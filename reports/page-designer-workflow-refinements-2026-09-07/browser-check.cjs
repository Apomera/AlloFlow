const fs=require('fs'),path=require('path'),assert=require('assert');const {chromium}=require('playwright');
const out=path.resolve('reports/page-designer-workflow-refinements-2026-09-07');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true});try{
const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
await page.route('http://designer.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><title>Page Designer verification</title><style>body{margin:0}*{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>'}));
await page.goto('http://designer.test/');for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','studio_module.js'])await page.addScriptTag({path:path.resolve(file)});
await page.evaluate(()=>{window.toasts=[];window.stRoot=ReactDOM.createRoot(document.getElementById('root'));window.stRoot.render(React.createElement(AlloModules.AlloStudio,{t:k=>k,addToast:(...a)=>toasts.push(a),onClose:()=>stRoot.unmount()}));});
await page.getByRole('button',{name:/^Use template:/}).first().click();await page.getByRole('textbox',{name:'Document title',exact:true}).waitFor();console.log('Designer mounted');
const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const results={errors,viewports:{}};
for(const [name,width,height] of [['desktop',1280,900],['short-laptop',1280,720],['tablet',1024,768],['mobile',390,844]]){
await page.setViewportSize({width,height});await frame();
if(width<1040)await page.getByRole('button',{name:'Canvas',exact:true}).click();
await page.getByRole('button',{name:'Fit page',exact:true}).click();await frame();
const dimensions=await page.locator('[data-st-canvas-viewport]').evaluate(el=>{const p=el.firstElementChild.getBoundingClientRect();return{width:el.clientWidth,height:el.clientHeight,pageWidth:p.width,pageHeight:p.height};});
assert(dimensions.pageWidth<=dimensions.width&&dimensions.pageHeight<=dimensions.height,'Fit page must fit '+name);if(width===390)assert(dimensions.height>350,'Mobile canvas should be substantially taller');results.viewports[name]=dimensions;
await page.screenshot({path:path.join(out,'editor-'+name+'.png')});
}
await page.getByRole('group',{name:/^text: Your Event Title/}).click();await frame();
assert(await page.getByRole('textbox',{name:'Text',exact:true}).isVisible(),'Mobile selection must expose text controls');
await page.screenshot({path:path.join(out,'mobile-properties.png')});
await page.getByRole('button',{name:'Canvas',exact:true}).click();
await page.setViewportSize({width:1280,height:900});await frame();
await page.getByRole('group',{name:/^(Selected )?text: Your Event Title/}).click();await frame();
const text=page.getByRole('textbox',{name:'Text',exact:true});const textBounds=await text.boundingBox();assert(textBounds.y+textBounds.height<900,'Text field must be visible without inspector scrolling');
await text.fill('Edited heading survives recovery');await text.press('Tab');
await page.screenshot({path:path.join(out,'desktop-properties.png')});
assert(await page.locator('[data-st-reading-number]').count()===0);await page.getByRole('button',{name:'Order numbers',exact:true}).click();assert(await page.locator('[data-st-reading-number]').count()>0);await page.getByRole('button',{name:'Order numbers',exact:true}).click();
const snap=await page.getByRole('button',{name:'Snap',exact:true}).evaluate(el=>({foreground:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));assert(snap.foreground==='rgb(15, 23, 42)');results.snap=snap;
await page.getByRole('button',{name:/Export$/}).click();await frame();
assert(await page.getByRole('group',{name:'Share an accessible document',exact:true}).isVisible());
assert(await page.getByRole('group',{name:'Edit elsewhere',exact:true}).isVisible());
await page.screenshot({path:path.join(out,'export-desktop.png')});
await page.getByRole('button',{name:/Export$/}).press('Escape');assert(await page.getByRole('textbox',{name:'Document title',exact:true}).isVisible());assert(await page.getByRole('region',{name:'Export choices'}).count()===0);
await page.locator('summary').filter({hasText:'More'}).click();await page.getByRole('button',{name:'Keyboard shortcuts',exact:true}).focus();await page.keyboard.press('Escape');assert(await page.locator('summary').filter({hasText:'More'}).evaluate(el=>document.activeElement===el&&!el.parentElement.open));
await page.getByRole('button',{name:'Objects',exact:true}).click();
const objectButton=page.locator('[data-st-object-browser]').getByRole('button',{name:/^Select text Edited heading/}).first();await objectButton.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Text');results.keyboardPropertiesFocus=true;

// Full-width pages must stay reachable at both horizontal scroll limits.
await page.getByRole('button',{name:'100%',exact:true}).click();await frame();
const edges=await page.locator('[data-st-canvas-viewport]').evaluate(el=>{el.scrollLeft=0;const left=el.firstElementChild.getBoundingClientRect().left-el.getBoundingClientRect().left;el.scrollLeft=el.scrollWidth;const right=el.firstElementChild.getBoundingClientRect().right-el.getBoundingClientRect().right;return{left,right};});
assert(Math.abs(edges.left)<2&&Math.abs(edges.right)<2,'Both page edges must be reachable at 100%');results.zoomEdges=edges;
await page.locator('[data-st-canvas-viewport]').evaluate(el=>{el.scrollLeft=35;el.scrollTop=170;});
const center=()=>page.locator('[data-st-canvas-viewport]').evaluate(el=>{const p=el.firstElementChild.getBoundingClientRect(),v=el.getBoundingClientRect(),scale=p.width/816;return{x:(v.left+el.clientWidth/2-p.left)/scale,y:(v.top+el.clientHeight/2-p.top)/scale};});
const beforeZoom=await center();await page.getByRole('button',{name:'Zoom in',exact:true}).click();await frame();const afterZoom=await center();
assert(Math.abs(beforeZoom.x-afterZoom.x)<2&&Math.abs(beforeZoom.y-afterZoom.y)<2,'Zoom should preserve the canvas center');results.zoomCenterPreserved=true;
await page.getByRole('button',{name:'Fit page',exact:true}).click();
// Find opens a visible Objects panel and leaves results available while stepping.
await page.getByRole('button',{name:'Fit page',exact:true}).press('Control+f');await frame();

console.log('Navigator inputs',await page.locator('[data-st-object-browser] input').evaluateAll(nodes=>nodes.map(n=>({label:n.getAttribute('aria-label'),placeholder:n.placeholder}))));
const focusedFind=page.locator('[data-st-object-browser] input:focus');assert(await focusedFind.count()===1);await focusedFind.fill('heading');await focusedFind.press('Enter');assert(await focusedFind.isVisible());results.findPanelVisible=true;
// Quick actions reveal their destination panel.
await page.getByRole('button',{name:'Fit page',exact:true}).press('Control+k');
const commands=page.getByRole('dialog',{name:'Quick actions',exact:true});await commands.getByRole('textbox').fill('layers');await commands.getByRole('option').filter({hasText:/layer/i}).first().click();
assert(await page.getByRole('button',{name:'Layers',exact:true}).getAttribute('aria-pressed')==='true');assert(await page.locator('[data-st-object-browser]').isVisible());results.layerCommandVisible=true;
// Navigation does not reorder pages; page actions remain undoable.
const actions=page.getByRole('combobox',{name:'Page actions',exact:true});await actions.selectOption('duplicate');assert(await page.getByRole('combobox',{name:'Select page',exact:true}).inputValue()==='1');
await page.getByRole('button',{name:'Previous page',exact:true}).click();assert(await page.getByRole('combobox',{name:'Select page',exact:true}).inputValue()==='0');
await page.getByRole('button',{name:'Next page',exact:true}).click();await actions.selectOption('remove');assert(await page.getByRole('combobox',{name:'Select page',exact:true}).locator('option').count()===1);
await page.getByRole('button',{name:'Undo',exact:true}).click();assert(await page.getByRole('combobox',{name:'Select page',exact:true}).locator('option').count()===2);results.pageNavigationUndo=true;
// Project download captures an unblurred title through Ctrl+S.
const pendingTitle=page.getByRole('textbox',{name:'Document title',exact:true});await pendingTitle.fill('Keyboard download includes pending text');
const downloadPromise=page.waitForEvent('download');await pendingTitle.press('Control+s');const download=await downloadPromise;const downloadPath=path.join(out,'keyboard-save.allostudio.json');await download.saveAs(downloadPath);assert(JSON.parse(fs.readFileSync(downloadPath,'utf8')).title==='Keyboard download includes pending text');results.keyboardDownloadCurrent=true;
// Mobile review stays bounded, and export replaces review rather than stacking.
await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Canvas',exact:true}).click();
await page.locator('summary').filter({hasText:'More'}).click();await page.getByRole('button',{name:/^A11y/}).click();await frame();
const review=page.getByRole('region',{name:'Accessibility review',exact:true});assert(await review.isVisible());const reviewBounds=await review.boundingBox();assert(reviewBounds.height<=844*.28+2);await page.getByRole('button',{name:'Properties',exact:true}).first().click();await frame();assert(await page.locator('[data-st-canvas-viewport]').evaluate(el=>el.clientHeight)>100,'Review and Properties must leave canvas space');await page.screenshot({path:path.join(out,'mobile-review.png')});
await page.getByRole('button',{name:/Export$/}).click();assert(await review.count()===0);assert(await page.getByRole('region',{name:'Export choices'}).isVisible());await page.getByRole('button',{name:/Export$/}).press('Escape');results.mobileReviewBounded=true;
await page.getByRole('button',{name:'Fit page',exact:true}).press('Control+f');await frame();assert(await page.locator('[data-st-object-browser] input:focus').isVisible());await page.screenshot({path:path.join(out,'mobile-find.png')});
await page.getByRole('button',{name:'Canvas',exact:true}).click();await page.setViewportSize({width:1280,height:900});await frame();
const title=page.getByRole('textbox',{name:'Document title',exact:true});await title.fill('Latest title saved immediately');
await page.getByRole('button',{name:'Close AlloStudio',exact:true}).click();
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('alloStudioAutosave_v1')));assert(saved.doc.title==='Latest title saved immediately');assert(saved.doc.objects.some(o=>o.runs?.some(r=>r.text==='Edited heading survives recovery')));results.recoveredLatestEdits=true;
assert.deepStrictEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
