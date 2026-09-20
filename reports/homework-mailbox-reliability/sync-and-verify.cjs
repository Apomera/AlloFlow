'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),parser=require('@babel/parser');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const normalize=value=>value.replace(/\r\n/g,'\n').trimEnd(),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const scopes=[
{name:'activity-wrapper',before:'shared-activity-wrapper-before.txt',start:'const SharedAssignmentActivityPanel = React.memo(',end:'const GlobalMuteButton'},
{name:'mailbox-entry',before:'before-mailbox-entry.txt',start:'function _alloReadMailboxEntryParam(',end:'function _buildAlloMailboxEntryUrl('},
{name:'assignment-controls',before:'before-assignment-controls.txt',start:'  const refreshAssignmentCenter = useCallback(',end:'  // ── Take-Home Pack v1'},
{name:'export-target',before:'before-export-target.txt',start:'    const _hostedSubmitShare =',end:'    const cfgBase ='},
{name:'homework-render',before:'before-homework-render.txt',start:'      {qrShareModal && (',end:'      {mbPanelOpen && ('},
{name:'hosted-intake',before:'hosted-intake-before.txt',start:'  // Mailbox-hosted homework entry (?allo_mbp=',end:"  useEffect(() => {\n      if (activeView === 'adventure'"}
];
function region(text,scope){const start=text.indexOf(scope.start),end=text.indexOf(scope.end,start+scope.start.length);if(start<0||end<0)throw Error('Missing '+scope.name);return{start,end,text:text.slice(start,end)};}
const canonical=read('AlloFlowANTI.txt'),memoStart=canonical.indexOf('  const qrShareMailbox = useMemo('),memoEnd=canonical.indexOf("  const [mbStatus, setMbStatus] = useState('');",memoStart);if(memoStart<0||memoEnd<0)throw Error('Missing target memo');const memo=canonical.slice(memoStart,memoEnd);
const getter='get _alloResolveHostedShareMailbox() { return _alloResolveHostedShareMailbox; },',anchor='get _alloCleanMailboxUrl() { return _alloCleanMailboxUrl; },';
const modules=['host_handlers_module.js','view_share_session_surfaces_module.js'];const versions=Object.fromEntries(modules.map(m=>[m,hash(read(m)).slice(0,8)]));
for(const m of modules)if(read(m)!==read('desktop/web-app/public/'+m))throw Error('Public module mismatch '+m);
const shells=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'];const outputs=shells.map(file=>{const original=read(file);let text=original;
if(file!==shells[0])for(const scope of scopes){const target=region(text,scope),latest=region(canonical,scope).text,before=read('reports/homework-mailbox-reliability/'+scope.before);if(normalize(target.text)!==normalize(before)&&normalize(target.text)!==normalize(latest))throw Error('Concurrent scope change '+file+' '+scope.name);text=text.slice(0,target.start)+latest+text.slice(target.end);}
if(!text.includes(getter)){if(!text.includes(anchor))throw Error('Missing getter anchor');text=text.replace(anchor,anchor+' '+getter);}
if(!text.includes('  const qrShareMailbox = useMemo('))text=text.replace("  const [mbStatus, setMbStatus] = useState('');",memo+"  const [mbStatus, setMbStatus] = useState('');");
for(const m of modules){const pattern=new RegExp('(/'+m.replaceAll('.','\\.')+'\\?v=)[a-f0-9]+','g');if(file===shells[0]&&!pattern.test(text))throw Error('Missing loader '+m);text=text.replace(pattern,(_,prefix)=>prefix+versions[m]);}
parser.parse(text,{sourceType:'module',plugins:['jsx']});return{file,original,text};});
for(const out of outputs)if(read(out.file)!==out.original)throw Error('Source changed during preparation '+out.file);
for(const out of outputs){const fd=fs.openSync(path.join(root,out.file),'r+');try{fs.writeFileSync(fd,out.text);fs.ftruncateSync(fd,Buffer.byteLength(out.text));}finally{fs.closeSync(fd);}}
const requiredDeps=['_alloResolveHostedShareMailbox','setMbUrlInput'];
const manifest=JSON.parse(read('dev-tools/host_handlers_wave3_manifest.json'));
for(const out of outputs)for(const name of requiredDeps){if(!out.text.includes('get '+name+'() { return '+name+'; }')||!manifest.deps.includes(name))throw Error('Missing required dependency '+name+' in '+out.file);}
for(const out of outputs){const start=out.text.indexOf('    window.__alloLazySharedActivity = function() {'),end=out.text.indexOf('    window.__alloLazySharedActivity();',start);if(start<0||end<0)throw Error('Missing reactive loader '+out.file);const loader=out.text.slice(start,end);if(out.file.startsWith('desktop/')&&!loader.includes("'./shared_activity_module.js'"))throw Error('Desktop loader URL changed');}
const result={scope:'Six changed shell regions, saved-mailbox target memo/getters, named SharedActivity loader, and module loader pins. Desktop local loader URLs and other work preserved.',files:outputs.map(({file,text})=>({file,syntax:'passed',getter:text.includes(getter),targetMemo:text.includes(memo),regions:scopes.map(scope=>({name:scope.name,matches:normalize(region(text,scope).text)===normalize(region(canonical,scope).text),sha256:hash(normalize(region(text,scope).text))}))})),modules:modules.map(module=>({module,version:versions[module],sha256:hash(read(module)),publicMatches:true}))};fs.writeFileSync(path.join(__dirname,'source-integrity.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
