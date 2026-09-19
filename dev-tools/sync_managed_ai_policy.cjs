const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const policy=fs.readFileSync(path.join(root,'managed_ai_policy.js'),'utf8').trim();
const marker='// BEGIN MANAGED AI POLICY',endMarker='// END MANAGED AI POLICY';
for(const file of ['ai_backend_module.js','gemini_api_source.jsx']){
 const target=path.join(root,file),source=fs.readFileSync(target,'utf8'),start=source.indexOf(marker),end=source.indexOf(endMarker,start);
 if(start<0||end<0)throw Error('Missing managed policy block: '+file);
 const next=source.slice(0,start)+marker+'\n'+policy+'\n'+endMarker+source.slice(end+endMarker.length);
 if(process.argv.includes('--check')){if(next.replace(/\r\n/g,'\n')!==source.replace(/\r\n/g,'\n'))throw Error('Stale managed policy: '+file);}
 else fs.writeFileSync(target,next);
}
console.log('Managed AI policy copies match.');
