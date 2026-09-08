const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const file=path.join(__dirname,'verify-workspace-pass.cjs');let source=fs.readFileSync(file,'utf8');
source=source.replaceAll('page.screenshot({path:','page.screenshot({timeout:45000,path:');
const before="await page.screenshot({timeout:45000,path:path.join(out,'workspace-pass-'+label+'-collapsed.png')});";
const after="frame.viewportControls=[];\n        for(const selector of ['.gw-viewport-control--fullscreen','.gw-viewport-control--touch']) {\n          const control=page.locator(selector);\n          if(await control.count()&&await control.isVisible()){const state=await probe(control);frame.viewportControls.push(state);check(state.hit&&state.inViewport,label+': '+state.name+' viewport control is not covered by touch look settings');}\n          else if(size.width<800||selector.includes('fullscreen'))check(false,label+': expected viewport control '+selector+' is visible');\n        }\n        "+before;
assert.equal(source.split(before).length-1,1);source=source.replace(before,after);
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,source,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}
const results=path.join(__dirname,'workspace-pass-results.json');
fs.copyFileSync(results,path.join(__dirname,'workspace-pass-second-run-results.json'));
