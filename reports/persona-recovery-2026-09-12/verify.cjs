const fs=require('node:fs'),crypto=require('node:crypto'),parser=require('@babel/parser');
const hosts=['AlloFlowANTI.txt','desktop/web-app/src/App.jsx','desktop/web-app/src/AlloFlowANTI.txt'];
for(const name of ['personas','view_persona_chat','view_persona_workspace']){
 parser.parse(fs.readFileSync(name+'_source.jsx','utf8'),{sourceType:'script',plugins:['jsx']});
 const file=name+'_module.js',data=fs.readFileSync(file);
 if(!data.equals(fs.readFileSync('desktop/web-app/public/'+file)))throw Error('Mirror mismatch '+name);
 const hash=crypto.createHash('sha256').update(data).digest('hex').slice(0,10);
 for(const host of hosts){const text=fs.readFileSync(host,'utf8');if(!text.includes("'./"+file+"'")&&!text.includes('https://alloflow-cdn.pages.dev/'+file+'?v='+hash))throw Error('Stale loader '+host+' '+file);}
 console.log('Verified source, mirrors, and loaders: '+name);
}
for(const host of hosts){const text=fs.readFileSync(host,'utf8');if(!text.includes('!personaState.turnError && personaInput.trim()'))throw Error('Recovery guard missing '+host);}
if(!fs.readFileSync('ui_strings.js').equals(fs.readFileSync('desktop/web-app/public/ui_strings.js')))throw Error('String mirrors differ');
console.log('Verified voice recovery guards and English strings.');
