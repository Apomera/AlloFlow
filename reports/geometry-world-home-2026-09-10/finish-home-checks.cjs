const fs=require('node:fs');function edit(file,from,to){let s=fs.readFileSync(file,'utf8');if(s.split(from).length!==2)throw Error('Missing anchor: '+file);s=s.replace(from,to);const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
for(const base of ['stem_lab','desktop/web-app/public/stem_lab'])edit(base+'/stem_tool_geometryworld_builder.js','var homeOpen = !!data.showGeometryHome && !hasPendingReturn;','var homeOpen = !!data.showGeometryHome && !hasPendingReturn && !window[ENGINE_KEY + \'_failed\'];');
edit(__dirname+'/verify-home.cjs','page.setDefaultTimeout(15000)','page.setDefaultTimeout(30000)');
edit(__dirname+'/verify-home.cjs',"page.screenshot({path:path.join(out,name+'.png')})","page.screenshot({path:path.join(out,name+'.png'),timeout:60000})");
console.log('WebGL recovery remains accessible; screenshot timeout accommodates software rendering.');
