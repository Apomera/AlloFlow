const fs=require('fs'),rootPath='ui_strings.js',publicPath='desktop/web-app/public/ui_strings.js';
const root=fs.readFileSync(rootPath,'utf8'),publicText=fs.readFileSync(publicPath,'utf8');
if(root!==publicText){
 const a=JSON.parse(root),b=JSON.parse(publicText);
 for(const key of Object.keys(b))if(!(key in a)||JSON.stringify(a[key])!==JSON.stringify(b[key]))throw Error('Concurrent public-only string change; refusing to replace '+key);
 if(fs.readFileSync(rootPath,'utf8')!==root||fs.readFileSync(publicPath,'utf8')!==publicText)throw Error('Strings changed during verification; retry with fresh input');
 fs.writeFileSync(publicPath,root);console.log('Synced additive root string namespaces; preserved every existing public string.');
}else console.log('String mirrors already match.');
