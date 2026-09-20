const fs=require('node:fs'),crypto=require('node:crypto'),parser=require('@babel/parser');
const file='view_persona_chat_module.js',data=fs.readFileSync(file);
parser.parse(fs.readFileSync('view_persona_chat_source.jsx','utf8'),{sourceType:'script',plugins:['jsx']});
parser.parse(data.toString(),{sourceType:'script'});
if(!data.equals(fs.readFileSync('desktop/web-app/public/'+file)))throw Error('Chat module mirrors differ');
const hash=crypto.createHash('sha256').update(data).digest('hex').slice(0,10);
for(const path of ['AlloFlowANTI.txt','desktop/web-app/src/App.jsx','desktop/web-app/src/AlloFlowANTI.txt']){
 let source=fs.readFileSync(path,'utf8');
 if(process.argv.includes('--refresh')){
  const updated=source.replace(/https:\/\/alloflow-cdn\.pages\.dev\/view_persona_chat_module\.js\?v=[a-zA-Z0-9.-]+/g,'https://alloflow-cdn.pages.dev/'+file+'?v='+hash);
  if(updated!==source)fs.writeFileSync(path,updated);
  source=updated;
 }
 if(!source.includes("'./"+file+"'")&&!source.includes('https://alloflow-cdn.pages.dev/'+file+'?v='+hash))throw Error('Stale chat loader: '+path);
}
console.log('Verified Persona JSX and bundle syntax, matching distribution copies, and current chat loaders ('+hash+').');
