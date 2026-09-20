'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),parser=require('@babel/parser');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const normalize=value=>value.replace(/\r\n/g,'\n').trimEnd();
const canonical=read('AlloFlowANTI.txt');
const scopes=[
 {name:'hosting',before:'before-hosting-region.txt',start:'  const hostPackOnMailboxRef = useRef(null);',end:'  const reportMailboxImageProgress ='},
 {name:'mailbox_render',before:'before-mailbox-render.txt',start:'      {mbPanelOpen && (',end:'      {showLiveHostWarning'}
];
function region(text,scope){const start=text.indexOf(scope.start),end=text.indexOf(scope.end,start+scope.start.length);if(start<0||end<0)throw Error('Missing region '+scope.name);return{start,end,text:text.slice(start,end)};}
const oldFocus='useFocusTrap(mailboxPanelRef, mbPanelOpen, () => setMbPanelOpen(false));';
const newFocus='useFocusTrap(mailboxPanelRef, mbPanelOpen, () => closeMailboxSetup());';
const modules=['host_handlers_module.js','view_share_session_surfaces_module.js'];
const versions=Object.fromEntries(modules.map(module=>[module,hash(read(module)).slice(0,8)]));
const mirrors=modules.map(module=>{if(read(module)!==read('desktop/web-app/public/'+module))throw Error('Module public mismatch '+module);return{module,version:versions[module],sha256:hash(read(module)),publicMatches:true};});
const shells=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'];
const outputs=shells.map(file=>{
 const original=read(file);let text=original;
 if(file!==shells[0])for(const scope of scopes){const target=region(text,scope),latest=region(canonical,scope).text,before=read('reports/pending-mailbox-share/'+scope.before);if(normalize(target.text)!==normalize(before)&&normalize(target.text)!==normalize(latest)&&!(scope.name==='hosting'&&normalize(target.text)===normalize(read('reports/pending-mailbox-share/before-hosting-review-fix.txt'))))throw Error('Concurrent edit in '+file+' '+scope.name);text=text.slice(0,target.start)+latest+text.slice(target.end);}
 if(!text.includes(newFocus)){if(!text.includes(oldFocus))throw Error('Focus callback differs in '+file);text=text.replace(oldFocus,newFocus);}
 for(const module of modules){const pattern=new RegExp('(/'+module.replaceAll('.','\\.')+'\\?v=)[a-f0-9]+','g');if(file===shells[0]&&!pattern.test(text))throw Error('Missing canonical loader '+module);text=text.replace(pattern,(_,prefix)=>prefix+versions[module]);}
 parser.parse(text,{sourceType:'module',plugins:['jsx']});return{file,original,text};
});
for(const output of outputs)if(read(output.file)!==output.original)throw Error('Source changed while verifying '+output.file);
for(const output of outputs)fs.writeFileSync(path.join(root,output.file),output.text);
const result={scope:'Pending hosting lifecycle, mailbox render props/dismissals, focus-trap callback, and two changed loader pins only. Desktop local loaders preserved.',files:outputs.map(({file,text})=>({file,syntax:'passed',focusCloseMatches:text.includes(newFocus),regions:scopes.map(scope=>({name:scope.name,matches:normalize(region(text,scope).text)===normalize(region(canonical,scope).text),sha256:hash(normalize(region(text,scope).text))}))})),mirrors};
fs.writeFileSync(path.join(__dirname,'source-integrity.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
