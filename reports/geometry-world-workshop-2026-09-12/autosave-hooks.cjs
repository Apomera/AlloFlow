const fs=require('fs'),vm=require('vm');
function edit(file,fn){let s=fs.readFileSync(file,'utf8'),crlf=s.includes('\r\n');s=s.replace(/\r\n/g,'\n');const r=(a,b)=>{if(s.split(a).length!==2)throw Error('Anchor '+a.slice(0,90));s=s.replace(a,b);};fn(r,()=>s,n=>s=n);new vm.Script(s);const b=Buffer.from(crlf?s.replace(/\n/g,'\r\n'):s),fd=fs.openSync(file,'r+');fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);fs.closeSync(fd);}
edit('stem_lab/stem_tool_geometryworld_builder.js',(r,get,set)=>{
 const start=get().indexOf('  function installWorldAutosave('),end=get().indexOf('\n  function updateWorkshopSelection',start);
 set(get().slice(0,start)+`  function installWorldAutosave(engine,onSave,storage) {
    var lastPoll=0;
    function save(){if(engine._workshopRestoreInProgress)return {ok:true,skipped:true};if(engine._currentLesson && engine._currentLesson.sandbox){var result=saveWorldDraft(engine,null,storage);if(onSave)onSave(result);return result;}return {ok:true};}
    function poll(){var now=Date.now();if(now-lastPoll>=2500){lastPoll=now;save();}}
    engine.flushWorkshopDraft=save;engine.pollWorkshopDraft=poll;
    function hidden(){if(document.visibilityState==='hidden')save();}
    window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',hidden);
    return function(){if(!engine._destroyed)save();if(engine.flushWorkshopDraft===save)delete engine.flushWorkshopDraft;if(engine.pollWorkshopDraft===poll)delete engine.pollWorkshopDraft;window.removeEventListener('pagehide',save);document.removeEventListener('visibilitychange',hidden);};
  }
`+get().slice(end));
 r("          // Reuse this refresh and the engine's cached array.","          if(eng && eng.pollWorkshopDraft)eng.pollWorkshopDraft();\n          // Reuse this refresh and the engine's cached array.");
 r('  function captureProject(ctx, engine, id) {','  function captureProject(ctx, engine, id) {\n    if(engine.flushWorkshopDraft)engine.flushWorkshopDraft();');
 r('return { id:id, blocks:blocks, lesson:copyLocal(engine._currentLesson || FREE_BUILD_LESSON),',"return { id:id, blocks:blocks, lesson:copyLocal(engine._currentLesson || FREE_BUILD_LESSON),\n      workshopDraft:{id:engine._workshopProjectId||null,version:engine._workshopProjectVersion||null,signature:engine._workshopSavedSignature||null},");
 r('    engine._entryAnim = null; engine._builderSelection = saved.selection;',"    engine._entryAnim = null; engine._builderSelection = saved.selection;\n    restoreWorkshopDraftIdentity(engine,saved.workshopDraft);");
 r('    engine._builderSelection=copyLocal(saved.selection || null);','    engine._builderSelection=copyLocal(saved.selection || null);\n    restoreWorkshopDraftIdentity(engine,saved.workshopDraft);');
 r('  function restoreProject(ctx, engine, pending) {',`  function restoreWorkshopDraftIdentity(engine,saved){engine._workshopProjectId=saved && saved.id || null;engine._workshopProjectVersion=saved && saved.version || null;engine._workshopSavedSignature=saved && saved.signature || null;}
  function restoreProject(ctx, engine, pending) {`);
 const a=get().indexOf('  function restoreEditableWorld('),b=get().indexOf('  // Curated recipes',a);let section=get().slice(a,b);
 section=section.replace('    try {\n      engine.loadLesson(FREE_BUILD_LESSON);','    var restoringDraft=engine._workshopRestoreInProgress;engine._workshopRestoreInProgress=true;\n    try {\n      engine.loadLesson(FREE_BUILD_LESSON);');
 section=section.replace(/\n    }\n  }\n\s*$/, '\n    } finally {if(restoringDraft===undefined)delete engine._workshopRestoreInProgress;else engine._workshopRestoreInProgress=restoringDraft;}\n  }\n');
 set(get().slice(0,a)+section+get().slice(b));
});
edit('stem_lab/stem_tool_geometryworld.js',r=>{
 r('        engine.loadLesson = function(lesson) {',`        engine.loadLesson = function(lesson) {
          if(engine.flushWorkshopDraft)engine.flushWorkshopDraft();
          engine._workshopProjectId=null;engine._workshopProjectVersion=null;engine._workshopSavedSignature=null;`);
});
const file='tests/geometry_world_workshop.test.js';let s=fs.readFileSync(file,'utf8');s=s.replace("original=vi.fn(function(lesson){this.blocks={};this._currentLesson=lesson;})", "original=vi.fn(function(lesson){var a=core.indexOf('        engine.loadLesson = function(lesson) {')+'        engine.loadLesson = function(lesson) {'.length,b=core.indexOf('          if(engine.endShowcase)',a);new Function('engine',core.slice(a,b))(this);this.blocks={};this._currentLesson=lesson;})");fs.writeFileSync(file,s);
console.log('Autosave shares the existing refresh and explicit engine lifecycle; import and Print Lab keep draft identity.');
