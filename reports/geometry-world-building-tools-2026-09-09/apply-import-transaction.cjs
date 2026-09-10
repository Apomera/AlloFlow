const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const canonical = path.join(root, 'stem_lab/stem_tool_geometryworld_builder.js');
let source = fs.readFileSync(canonical, 'utf8');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
source = source.replace(/\r\n/g, '\n');
function replaceOnce(before, after) {
  if (source.split(before).length !== 2) throw new Error('Expected exactly one import patch anchor: ' + before.slice(0, 90));
  source = source.replace(before, after);
}
const start = source.indexOf('  function restoreEditableWorld(engine, candidate) {');
const end = source.indexOf('  function selectionMeasurement(engine) {', start);
if (start < 0 || end < start) throw new Error('Import helper boundaries changed.');
source = source.slice(0, start) + String.raw`  // Keep the entire workspace before the confirmed replacement. A lesson's
  // definitions do not describe every live block, so record the actual roles too.
  function captureEditableImportRecovery(ctx, engine) {
    var saved = captureProject(ctx || {}, engine, 'editable-import-recovery');
    saved.state = copyLocal(ctx && ctx.toolData && ctx.toolData.geometryWorld || {});
    saved.blocks = Object.keys(engine.blocks || {}).map(function(key) {
      var mesh=engine.blocks[key], p=gridPosition(mesh), u=mesh && mesh.userData;
      if (!p || !u) throw new Error('The current workspace could not be backed up.');
      return Object.assign({},p,{type:u.blockType,shape:u.shape || 'cube',rotation:u.rotation || 0,
        lessonBlock:!!u._lessonBlock,measurementLayer:u._measurementLayer});
    });
    saved.engineState = {};
    ['completionTriggered','completionProgress','_predictionState','_progressKey','_historyRevision',
      '_placingLessonBlocks','_measurementLayer','_replayingHistory','_entryAnim','_viewPreset',
      '_fillTruncated'].forEach(function(key) {
      saved.engineState[key] = {present:Object.prototype.hasOwnProperty.call(engine,key),
        value:engine[key] === undefined ? undefined : copyLocal(engine[key])};
    });
    saved.velocity = engine.velocity && engine.velocity.toArray ? engine.velocity.toArray() : null;
    saved.sessionLog = Array.isArray(engine.sessionLog) ? copyLocal(engine.sessionLog) : null;
    var editable = normalizeEditableWorld(editableWorld(engine));
    saved.editableWorld = editable.ok && editableWorldByteLength(JSON.stringify(editable.value)) <= MAX_EDITABLE_WORLD_BYTES ? editable.value : null;
    saved.schema = 'alloflow-geometry-world-recovery/1';
    return saved;
  }
  function restoredBlockMatches(engine, block, studentOnly) {
    var mesh=engine.blocks && engine.blocks[keyFor(block)], u=mesh && mesh.userData, p=gridPosition(mesh);
    return !!(p && u && p.x===block.x && p.y===block.y && p.z===block.z &&
      u.blockType===block.type && (u.shape || 'cube')===block.shape && (u.rotation || 0)===block.rotation &&
      (studentOnly ? isStudentBlock(u) : !!u._lessonBlock===block.lessonBlock && u._measurementLayer===block.measurementLayer));
  }
  function restoreEditableImportRecovery(ctx, engine, saved) {
    // Rebuild the actual saved cells instead of recreating lesson fills and then
    // colliding with them. loadLesson still owns NPC/environment lifecycle.
    engine.loadLesson(Object.assign({},saved.lesson,{ground:null,structures:[]}));
    if (Object.keys(engine.blocks || {}).length) throw new Error('The recovery workspace was not empty.');
    engine._currentLesson = saved.lesson;
    engine._replayingHistory = true;
    try { saved.blocks.forEach(function(block) {
      engine._placingLessonBlocks=block.lessonBlock;
      engine._measurementLayer=block.measurementLayer;
      var placed=engine.placeBlock(block.x,block.y,block.z,block.type,block.shape,block.rotation);
      var mesh=engine.blocks && engine.blocks[keyFor(block)];
      if (placed===null || !mesh || !mesh.userData) throw new Error('A previous block could not be recovered.');
      // Older workspace blocks may predate explicit measurement-layer tagging.
      if (block.measurementLayer===undefined) delete mesh.userData._measurementLayer;
      if (!restoredBlockMatches(engine,block,false)) throw new Error('A previous block was not recovered exactly.');
    }); } finally {
      ['_placingLessonBlocks','_measurementLayer','_replayingHistory'].forEach(function(key) {
        var field=saved.engineState[key];
        if (field.present) engine[key]=field.value; else delete engine[key];
      });
    }
    if (Object.keys(engine.blocks).length!==saved.blocks.length) throw new Error('The recovered block count did not match.');
    if (engine.refreshAllAO) engine.refreshAllAO();
    if (engine.refreshLandscape) engine.refreshLandscape(saved.lesson.ground);
    engine._undoStack=copyLocal(saved.undo); engine._redoStack=copyLocal(saved.redo);
    engine.blocksPlaced=saved.blocksPlaced; engine._sessionXP=saved.sessionXP; engine._blockMilestones=copyLocal(saved.milestones);
    engine._builderSelection=copyLocal(saved.selection || null);
    Object.keys(saved.engineState).forEach(function(key) {
      var field=saved.engineState[key];
      if (field.present) engine[key]=field.value===undefined ? undefined : copyLocal(field.value); else delete engine[key];
    });
    if (saved.camera && engine.camera) engine.camera.position.fromArray(saved.camera);
    if (saved.cameraQuaternion && engine.camera) {
      engine.camera.quaternion.fromArray(saved.cameraQuaternion);
      if(engine.euler) engine.euler.setFromQuaternion(engine.camera.quaternion);
    }
    if (isFinite(saved.yaw)) engine.yaw=saved.yaw;
    if (isFinite(saved.pitch)) engine.pitch=saved.pitch;
    engine.flyMode=saved.flyMode;
    if (saved.velocity && engine.velocity && engine.velocity.fromArray) engine.velocity.fromArray(saved.velocity);
    if (saved.sessionLog && Array.isArray(engine.sessionLog)) {
      engine.sessionLog.length=0;
      saved.sessionLog.forEach(function(event){engine.sessionLog.push(copyLocal(event));});
    }
    // Restore Geometry World state only, including print scale/check and lesson
    // progress. Keys added by loadLesson must not survive an unsuccessful import.
    var state={};
    ['totalQ','score','answeredNpcs','npcFollowUpStep','npcChatHistory','worldActive','blocksPlaced',
      'measureResult','measureHistory','volumePrediction','volumeEstimateCommitment','volumeEstimateObservedTargets',
      'volumeEstimateCommitError','predictionStrategy','predictionReason','predictionResult','predictionRevision',
      'predictionRevisionResult','predictionReflection','viewPreset','layerFocus','placementPreview'].forEach(function(key){state[key]=saved.state[key];});
    patchGeometryState(ctx,Object.assign(state,saved.state));
  }
  function restoreEditableWorld(engine, candidate, ctx) {
    if (!engine || typeof engine.loadLesson !== 'function' || typeof engine.placeBlock !== 'function') return { ok: false, error: 'The Geometry World engine is not ready.' };
    var checked=normalizeEditableWorld(candidate);
    if (!checked.ok) return checked;
    var saved;
    try { saved=captureEditableImportRecovery(ctx,engine); }
    catch (_) { return {ok:false,error:'The current workspace could not be backed up. No blocks were changed.'}; }
    try {
      engine.loadLesson(FREE_BUILD_LESSON);
      var available=Math.max(0,MAX_BLOCKS-Object.keys(engine.blocks || {}).length);
      if (checked.value.blocks.length>available) throw new Error('The sandbox does not have enough safe block capacity for this file.');
      checked.value.blocks.forEach(function(block) {
        var placed=engine.placeBlock(block.x,block.y,block.z,block.type,block.shape,block.rotation);
        if (placed===null || !restoredBlockMatches(engine,block,true)) throw new Error('Geometry World could not restore every validated block.');
      });
      engine.blocksPlaced=checked.value.blocks.length;
      engine._undoStack=[]; engine._redoStack=[];
      return {ok:true,value:checked.value,summary:checked.summary,placedCount:checked.value.blocks.length};
    } catch (error) {
      var message=error && error.message ? error.message : 'The editable world could not be opened.';
      try {
        restoreEditableImportRecovery(ctx,engine,saved);
        return {ok:false,restored:true,error:message+' Your previous workspace was restored.'};
      } catch (recoveryError) {
        ['_placingLessonBlocks','_measurementLayer','_replayingHistory'].forEach(function(key) {
          var field=saved.engineState[key];
          if (field.present) engine[key]=field.value; else delete engine[key];
        });
        // Keep the earliest complete backup even if another import is attempted.
        if (!engine._editableImportRecovery) engine._editableImportRecovery=saved;
        return {ok:false,restored:false,recovery:engine._editableImportRecovery,
          error:message+' The previous workspace could not be fully restored. Download its backup below before continuing.'};
      }
    }
  }
` + source.slice(end);
replaceOnce('var result = restoreEditableWorld(liveEngine, editablePreview.value);', 'var result = restoreEditableWorld(liveEngine, editablePreview.value, ctx);');
replaceOnce("if (!result.ok) { setEditableError(result.error); announce(ctx, result.error, 'error'); return; }", "if (!result.ok) { setEditablePreview(null); setEditableError(result.error); announce(ctx, result.error, 'error'); return; }");
replaceOnce('      function renderEditableRecovery() {\n        return h(React.Fragment, null,', String.raw`      function downloadEditableRecovery() {
        var eng=window[ENGINE_KEY], backup=eng && eng._editableImportRecovery;
        if (!backup) return;
        var editable=backup.editableWorld;
        downloadBlob(new Blob([JSON.stringify(editable || backup)],{type:'application/json'}),editable ? 'geometry-world-previous-build-editable.json' : 'geometry-world-workspace-recovery.json');
        announce(ctx,editable ? 'Saved the previous student build as an editable AlloFlow file.' : 'Saved the complete workspace recovery details. This recovery file is not an editable-world import.','success');
      }
      function renderEditableRecovery() {
        var backupEngine=window[ENGINE_KEY], backup=backupEngine && backupEngine._editableImportRecovery;
        return h(React.Fragment, null,
          backup && h('section', {className:'gwe-recovery','data-state':'backup','aria-label':'Previous workspace backup'},
            h('strong',null,'Previous workspace backup'),
            h('p',null,backup.editableWorld ? 'Your previous student build is still available as an editable AlloFlow file. Download it before leaving Geometry World.' : 'The previous workspace is outside the editable-file limits. Save its full recovery details before leaving Geometry World; this file cannot be opened by the editable-world importer.'),
            h('button',{type:'button',onClick:downloadEditableRecovery},backup.editableWorld ? 'Download previous build' : 'Download recovery details')
          ),`);
const compiled = source.replace(/\n/g, newline);
new Function(compiled);
for (const relative of ['stem_lab/stem_tool_geometryworld_builder.js','desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js']) {
  const file=path.join(root,relative), fd=fs.openSync(file,'r+');
  try {fs.writeFileSync(fd,compiled);fs.ftruncateSync(fd,Buffer.byteLength(compiled));} finally {fs.closeSync(fd);}
}
console.log('Applied verified import rollback, retained recovery download, and desktop mirror.');
