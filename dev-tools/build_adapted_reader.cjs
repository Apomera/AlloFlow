#!/usr/bin/env node
// Build only adapted-reading dependencies and update their content-hash pins.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');process.chdir(root);
for(const f of ['_build_view_simplified_module.js','_build_pure_helpers_module.js','_build_content_engine_module.js'])require(path.join(root,f));
const modules=['view_simplified_module.js','pure_helpers_module.js','content_engine_module.js'];
const pins=Object.fromEntries(modules.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex').slice(0,8)]));
for(const f of ['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx']){
 const target=path.resolve(root,f);if(!target.startsWith(root+path.sep))throw Error('Outside workspace');
 const before=fs.readFileSync(target,'utf8');
 const after=before.replace(/https:\/\/alloflow-cdn\.pages\.dev\/(view_simplified_module\.js|pure_helpers_module\.js|content_engine_module\.js)(?:\?v=[^'"\s)]+)?/g,(_,name)=>'https://alloflow-cdn.pages.dev/'+name+'?v='+pins[name]);
 if(before===after)continue;
 const temp=target+'.reader-pin-'+process.pid+'.tmp';
 try{fs.writeFileSync(temp,after);if(fs.readFileSync(target,'utf8')!==before)throw Error('Concurrent host edit; rerun build');fs.renameSync(temp,target);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
for(const name of modules)if(fs.readFileSync(name,'utf8')!==fs.readFileSync(path.join('desktop/web-app/public',name),'utf8'))throw Error('Public mirror mismatch: '+name);
console.log('Adapted reader dependencies and host pins synchronized.');
