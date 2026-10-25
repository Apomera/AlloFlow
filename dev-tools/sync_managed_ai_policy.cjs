const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const policy=fs.readFileSync(path.join(root,'managed_ai_policy.js'),'utf8').trim();
const marker='// BEGIN MANAGED AI POLICY',endMarker='// END MANAGED AI POLICY';
const allowed=['ai_backend_module.js','gemini_api_source.jsx'];
let check=false,only=null;
for(let i=2;i<process.argv.length;i++){
 if(process.argv[i]==='--check'&&!check)check=true;
 else if(process.argv[i]==='--only'&&!only&&allowed.includes(process.argv[i+1]))only=process.argv[++i];
 else throw Error('Usage: sync_managed_ai_policy.cjs [--check] [--only ai_backend_module.js|gemini_api_source.jsx]');
}
for(const file of only?[only]:allowed){
 const target=path.join(root,file),source=fs.readFileSync(target,'utf8'),start=source.indexOf(marker),end=source.indexOf(endMarker,start);
 if(start<0||end<0)throw Error('Missing managed policy block: '+file);
 const next=source.slice(0,start)+marker+'\n'+policy+'\n'+endMarker+source.slice(end+endMarker.length);
 if(check){if(next.replace(/\r\n/g,'\n')!==source.replace(/\r\n/g,'\n'))throw Error('Stale managed policy: '+file);}
 else fs.writeFileSync(target,next);
}
console.log('Managed AI policy copies match.');
