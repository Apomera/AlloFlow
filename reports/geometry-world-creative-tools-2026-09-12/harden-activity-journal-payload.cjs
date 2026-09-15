const fs=require('node:fs'),path=require('node:path');const file=path.join(__dirname,'activity-journal-helpers.js');let text=fs.readFileSync(file,'utf8');
function replace(a,b){if(text.indexOf(a)<0||text.indexOf(a)!==text.lastIndexOf(a))throw Error('Missing unique helper anchor '+a.slice(0,100));text=text.replace(a,b);}
replace("    if(selected.blocks.length>ACTIVITY_SNAPSHOT_LIMIT)","    var refreshed=selectionMeasurement(engine);\n    if(!refreshed)return {ok:false,error:'The selected build is missing or cannot be measured completely. Select your activity build again.'};\n    selected=engine._builderSelection;\n    if(selected.blocks.length>ACTIVITY_SNAPSHOT_LIMIT)");
replace("var keys=Object.keys(next);while(keys.length>30){var key=keys.shift();if(key!==lessonKey)delete next[key];}","var keys=Object.keys(next).filter(function(key){return key!==lessonKey;});while(Object.keys(next).length>30)delete next[keys.shift()];");
replace("color:palette[b.type] || palette.stone","color:Object.prototype.hasOwnProperty.call(palette,b.type)?palette[b.type]:palette.stone");
const anchor='  function activityJournalExport(guide,journal) {';
replace(anchor,`  function cleanActivitySnapshot(snapshot) {
    if(!snapshot || !activityBuildFacts(snapshot.blocks))return null;
    var blocks=snapshot.blocks.map(function(b){return {x:b.x,y:b.y,z:b.z,type:validBlockType(b.type,false),shape:b.shape,rotation:normalizedRotation(b.rotation)};});
    return {capturedAt:String(snapshot.capturedAt || '').slice(0,80),blocks:blocks,facts:activityBuildFacts(blocks)};
  }
  function cleanActivityCheck(check) {
    if(!check || ['met','revise'].indexOf(check.status)<0 || typeof check.actual!=='number' || !isFinite(check.actual))return null;
    return {status:check.status,actual:check.actual,goal:normalizeActivityBuildGoal(check.goal),checkedAt:String(check.checkedAt || '').slice(0,80),message:String(check.message || '').slice(0,2000)};
  }
`+anchor);
replace("before:evidence.before || null,after:evidence.after || null,check:evidence.check || null","before:cleanActivitySnapshot(evidence.before),after:cleanActivitySnapshot(evidence.after),check:cleanActivityCheck(evidence.check)");
new Function(text);const fd=fs.openSync(file,'r+');try{fs.writeSync(fd,text,0,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(text));}finally{fs.closeSync(fd);}console.log('Activity journal payload hardened.');
