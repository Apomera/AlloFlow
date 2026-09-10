const fs=require('node:fs'),path=require('node:path');
function edit(name,from,to){const file=path.join(__dirname,name);let text=fs.readFileSync(file,'utf8');if(!text.includes(from))throw Error('Missing anchor '+name);text=text.replace(from,to);const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));fs.closeSync(fd);}
edit('verify-import-recovery-browser.cjs',
"const recovery=page.getByRole('button',{name:'Download previous build',exact:true});await recovery.scrollIntoViewIfNeeded();result.recoveryScreenshot='after-import-recovery-1200x900.png';await page.screenshot({path:path.join(out,result.recoveryScreenshot)});",
`const recovery=page.getByRole('button',{name:'Download previous build',exact:true});result.recoveryLayouts=[];
    for(const size of [{width:1200,height:900},{width:320,height:700}]){await page.setViewportSize(size);await frames();await recovery.scrollIntoViewIfNeeded();const layout=await recovery.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {width:r.width,height:r.height,inViewport:r.left>=0&&r.right<=innerWidth+.5&&r.top>=0&&r.bottom<=innerHeight+.5,hit:hit===n||n.contains(hit)};});check(layout.width>=44&&layout.height>=44&&layout.inViewport&&layout.hit,'Recovery download is a reachable44px button at'+size.width);const screenshot='after-import-recovery-'+size.width+'x'+size.height+'.png';result.recoveryLayouts.push({size,layout,screenshot});await page.screenshot({path:path.join(out,screenshot)});}
    result.recoveryScreenshot='after-import-recovery-1200x900.png';await page.setViewportSize({width:1200,height:900});await frames();`
);
edit('finalize-building-tools.cjs',
"const tests=new Map(),evidence=[];",
"const tests=new Map(),latestSuites=new Map(),evidence=[];"
);
edit('finalize-building-tools.cjs',
"for(const suite of data.testResults)for(const test of suite.assertionResults){count++;tests.set(suite.name+'::'+test.fullName,{suite:path.basename(suite.name),name:test.fullName,status:test.status});}",
"for(const suite of data.testResults){latestSuites.set(suite.name,suite);count+=suite.assertionResults.length;}"
);
edit('finalize-building-tools.cjs',
"const failed=[...tests.values()].filter(test=>test.status!=='passed');",
"for(const [name,suite]of latestSuites) suite.assertionResults.forEach((test,index)=>tests.set(name+'::'+index,{suite:path.basename(name),name:test.fullName,status:test.status}));\nconst failed=[...tests.values()].filter(test=>test.status!=='passed');"
);
