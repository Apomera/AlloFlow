'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const shells = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const canonical = read(shells[0]), before = read('reports/novak-delivery-preview/before-AlloFlowANTI.txt');
function restoreRange(text) {
  const marker = text.indexOf('      if (!pendingQrAssignmentResource || isTeacherMode) return;');
  const start = text.lastIndexOf('  useEffect(() => {', marker);
  const endMarker = '  }, [pendingQrAssignmentResource, isTeacherMode]);';
  const end = text.indexOf(endMarker, marker) + endMarker.length;
  if (marker < 0 || start < 0 || end < endMarker.length) throw Error('Missing restore boundary');
  return { start, end, text: text.slice(start, end) };
}
const restore = restoreRange(canonical).text;
const oldCloud = before.split(/\r?\n/).find(line => line.includes("openQrShareModal({ type: 'assignment', title, url: shareUrl"));
const newCloud = canonical.split(/\r?\n/).find(line => line.includes("openQrShareModal({ type: 'assignment', title, url: shareUrl"));
if (!oldCloud || !newCloud) throw Error('Missing cloud metadata');
const prior = JSON.parse(fs.readFileSync(path.join(__dirname,'source-integrity.json'),'utf8'));
function wrapperRange(text) {
 const ref='  const pendingQrAssignmentOpenGenerationRef = useRef(0);';
 const start=text.includes(ref)?text.indexOf(ref):text.indexOf('  const handleRestoreView = (item, options = {}) => {');
 const end=text.indexOf('  // BEGIN LEARNING_WEB_RESOURCE_OPEN_BRIDGE',start);
 if(start<0||end<0)throw Error('Missing wrapper boundary');
 return {start,end,text:text.slice(start,end)};
}
const wrapper=wrapperRange(canonical).text;
const outputs = shells.map(file => {
  let text = read(file);
  if (file !== shells[0]) {
    const range = restoreRange(text);
    if (range.text.replace(/\r\n/g,'\n') !== restoreRange(before).text.replace(/\r\n/g,'\n') && range.text.replace(/\r\n/g,'\n') !== restore.replace(/\r\n/g,'\n') && sha(range.text) !== prior.shells.find(item => item.file === file)?.restoreSha256) throw Error('Concurrent restore edit: '+file);
    text = text.slice(0,range.start) + restore + text.slice(range.end);
    const wrapperOld=wrapperRange(text);
    if(wrapperOld.text!==wrapperRange(before).text && wrapperOld.text!==wrapper)throw Error('Concurrent wrapper edit: '+file);
    text=text.slice(0,wrapperOld.start)+wrapper+text.slice(wrapperOld.end);
    const metadata = /resourceTitles: built\.resourceTitles,(\r?\n)([ \t]*)(?!deliverySummary:)/g;
    if ((text.match(/deliverySummary: built\.deliverySummary/g)||[]).length === 0) {
      let count=0;
      text = text.replace(metadata,(match,newline,indent)=>{ count++; return 'resourceTitles: built.resourceTitles,'+newline+indent+'deliverySummary: built.deliverySummary,'+newline+indent; });
      if(count!==2)throw Error('Unexpected pack metadata count: '+file+' '+count);
    }
    if (text.includes(oldCloud)) text=text.replace(oldCloud,newCloud);
    else if(!text.includes(newCloud))throw Error('Concurrent cloud metadata edit: '+file);
  }
  for (const module of ['shared_activity_module.js','view_share_session_surfaces_module.js']) {
    const version=sha(read(module)).slice(0,8);
    const regex=new RegExp(module.replaceAll('.','\\.')+'\\?v=[a-f0-9]+','g');
    if(!regex.test(text) && !text.includes(module))throw Error('Missing module loader: '+module+' '+file);
    text=text.replace(regex,module+'?v='+version);
  }
  require('@babel/parser').parse(text,{sourceType:'module',plugins:['jsx']});
  return {file,text};
});
for(const output of outputs)fs.writeFileSync(path.join(root,output.file),output.text);
const mirrors=[];
for(const module of ['shared_activity_module.js','view_share_session_surfaces_module.js']) {
  for(const dir of ['desktop/web-app/public','desktop/web-app/app-build']) {
    const target=path.join(root,dir,module);
    if(fs.existsSync(target))fs.copyFileSync(path.join(root,module),target);
    mirrors.push({path:dir+'/'+module,exists:fs.existsSync(target),matches:fs.existsSync(target)&&fs.readFileSync(target).equals(fs.readFileSync(path.join(root,module)))});
  }
}
const report={scope:'Only assignment metadata, student restore effect, and two loader pins synchronized; unrelated source retained.',shells:outputs.map(({file,text})=>({file,syntax:'passed',wrapperMatches:wrapperRange(text).text===wrapper,wrapperSha256:sha(wrapperRange(text).text),restoreMatches:restoreRange(text).text===restore,restoreSha256:sha(restoreRange(text).text),packSummaryCount:(text.match(/deliverySummary: built\.deliverySummary/g)||[]).length,cloudSummary:text.includes(newCloud)})),mirrors};
fs.writeFileSync(path.join(__dirname,'source-integrity.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
