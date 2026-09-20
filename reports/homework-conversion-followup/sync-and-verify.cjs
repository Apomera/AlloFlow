'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),parser=require('@babel/parser');
const root=path.resolve(__dirname,'../..'), read=file=>fs.readFileSync(path.join(root,file),'utf8');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const normalize=value=>value.replace(/\r\n/g,'\n').trimEnd();
const canonical=read('AlloFlowANTI.txt');
const scopes=[
 {name:'hosting',before:'before-hosting-region.txt',start:'  const hostPackOnMailboxRef = useRef(null);',end:'  const reportMailboxImageProgress ='},
 {name:'resolver',before:'resolver-before.txt',start:'  const resolveAssignmentResources = useCallback(',end:'  // Shared packet builder'},
 {name:'cloud_creator',before:'homework-creator-before.txt',start:'  const createHomeworkAssignmentLink = useCallback(',end:'  const savePortableAacResourceToHistory'},
 {name:'restore',before:'restore-before.txt',start:'  const pendingQrAssignmentOpenGenerationRef = useRef(0);',end:'  }, [pendingQrAssignmentResource, isTeacherMode]);',includeEnd:true}
];
function region(text,scope){const start=text.indexOf(scope.start);let end=text.indexOf(scope.end,start+scope.start.length);if(start<0||end<0)throw Error('Missing region '+scope.name);if(scope.includeEnd)end+=scope.end.length;return {start,end,text:text.slice(start,end)};}
const modules=['shared_activity_module.js','view_share_session_surfaces_module.js','misc_handlers_module.js'];
const versions=Object.fromEntries(modules.map(module=>[module,hash(read(module)).slice(0,8)]));
const shells=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'];
const outputs=shells.map(file=>{
 const original=read(file);let text=original;
 if(file!==shells[0])for(const scope of scopes){const target=region(text,scope),latest=region(canonical,scope).text,before=read('reports/homework-conversion-followup/'+scope.before);if(normalize(target.text)!==normalize(before)&&normalize(target.text)!==normalize(latest))throw Error('Concurrent edit in '+file+' '+scope.name);text=text.slice(0,target.start)+latest+text.slice(target.end);}
 for(const module of modules){const pattern=new RegExp('(/'+module.replaceAll('.','\\.')+'\\?v=)[a-f0-9]+','g');if(file===shells[0]&&!pattern.test(text))throw Error('Missing canonical loader '+module);text=text.replace(pattern,'$1'+versions[module]);}
 parser.parse(text,{sourceType:'module',plugins:['jsx']});return{file,original,text};
});
for(const output of outputs)if(read(output.file)!==output.original)throw Error('Source changed while verifying '+output.file);
for(const output of outputs)fs.writeFileSync(path.join(root,output.file),output.text);
const mirrors=modules.map(module=>{const matches=read(module)===read('desktop/web-app/public/'+module);if(!matches)throw Error('Module public mismatch '+module);return{module,version:versions[module],publicMatches:matches};});
const result={scope:'Four changed canonical regions only; desktop-specific loaders retained. Changed module query versions updated without touching similarly named modules.',files:outputs.map(({file,text})=>({file,syntax:'passed',regions:scopes.map(scope=>({name:scope.name,matches:normalize(region(text,scope).text)===normalize(region(canonical,scope).text),sha256:hash(normalize(region(text,scope).text))}))})),mirrors};
fs.writeFileSync(path.join(__dirname,'source-integrity.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
