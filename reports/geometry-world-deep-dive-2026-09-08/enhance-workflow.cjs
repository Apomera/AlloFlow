const fs = require('node:fs');
const path = require('node:path');
const files = ['stem_lab/stem_tool_geometryworld_builder.js','stem_lab/stem_tool_printlab.js','stem_lab/stem_tool_geometryworld.js'];
const code = files.map(f=>fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'));
function rep(i,a,b){if(!code[i].includes(a))throw Error('Missing insertion: '+a.slice(0,130));code[i]=code[i].replace(a,b);}
rep(0,'  function writeBinaryStl(triangles) {',`  // World and editable source stay Y-up; STL uses Z-up, with a proper rotation
  // (not a reflection) so triangle winding and physical volume are preserved.
  function worldToStl(v) { return [v[0], -v[2], v[1]]; }
  function writeBinaryStl(triangles) {`);
rep(0,'var values = triangle.n.concat(triangle.v[0], triangle.v[1], triangle.v[2]);','var values = worldToStl(triangle.n).concat(worldToStl(triangle.v[0]), worldToStl(triangle.v[1]), worldToStl(triangle.v[2]));');
rep(0,'  function printVolumeSentence(measurement) {','  function printVolumeSentence(measurement, unitMm) {\n    unitMm = printUnit(unitMm);');
rep(0,'Math.pow(HANDOFF_UNIT_MM, 3)','Math.pow(unitMm, 3)');
rep(0,"+ ' = ' + mm3.toLocaleString('en-US') + ' mm\\u00B3 at ' + HANDOFF_UNIT_MM", "+ ' = ' + mm3.toLocaleString('en-US') + ' mm\\u00B3 at ' + unitMm");
rep(0,'  function defaultPrintEnvelope(measurement, profile) {','  function defaultPrintEnvelope(measurement, profile, unitMm) {\n    unitMm = printUnit(unitMm);');
rep(0,'blocks * HANDOFF_UNIT_MM * 100','blocks * unitMm * 100');
rep(0,'  function compareBlocks(a, b) {',`  function printUnit(value) {
    var n = Number(value);
    return isFinite(n) && n > 0 ? Math.max(0.01, Math.min(1000, n)) : HANDOFF_UNIT_MM;
  }
  function printContext(ctx) {
    var data = ctx && ctx.toolData && ctx.toolData.geometryWorld;
    return data && data.builderPrintContext || {};
  }
  function compareBlocks(a, b) {`);
rep(0,'  function aimedStudentMeasurement(ctx, updateDisplay) {',`  function selectionMeasurement(engine) {
    var selected = engine && engine._builderSelection;
    if (!selected || !selected.blocks || !engine.measureStructure) return null;
    var seed = selected.blocks.find(function(p) { var mesh = engine.blocks[keyFor(p)]; return mesh && isStudentBlock(mesh.userData); });
    if (!seed) { engine._builderSelection = null; return null; }
    var measurement = engine.measureStructure(seed.x, seed.y, seed.z);
    return measurement && measurement.isComplete !== false ? { engine: engine, gp: seed, measurement: measurement } : null;
  }
  function copyLocal(value) { return JSON.parse(JSON.stringify(value)); }
  // The complete project stays in this browser only, outside exported model metadata.
  // A matching handoff ID prevents a stale or unrelated source from replacing it.
  function captureProject(ctx, engine, id) {
    var blocks = [];
    Object.keys(engine.blocks || {}).forEach(function(key) {
      var mesh = engine.blocks[key], p = gridPosition(mesh), u = mesh && mesh.userData;
      if (!p || !u || u._lessonBlock) return;
      blocks.push(Object.assign({}, p, { type:u.blockType, shape:u.shape || 'cube', rotation:u.rotation || 0 }));
    });
    return { id:id, blocks:blocks, lesson:copyLocal(engine._currentLesson || FREE_BUILD_LESSON),
      state:copyLocal(ctx.toolData && ctx.toolData.geometryWorld || {}),
      selection:engine._builderSelection && copyLocal(engine._builderSelection),
      undo:copyLocal(engine._undoStack || []), redo:copyLocal(engine._redoStack || []),
      blocksPlaced:engine.blocksPlaced || 0, sessionXP:engine._sessionXP || 0, milestones:copyLocal(engine._blockMilestones || {}),
      camera:engine.camera && engine.camera.position.toArray(), yaw:engine.yaw, pitch:engine.pitch, flyMode:!!engine.flyMode };
  }
  function restoreProject(ctx, engine, pending) {
    var saved = window.__alloGeometryWorldReturnProject;
    if (!saved || !pending.projectId || saved.id !== pending.projectId) return false;
    engine.loadLesson(saved.lesson);
    saved.blocks.forEach(function(block) { engine.placeBlock(block.x,block.y,block.z,block.type,block.shape,block.rotation); });
    engine._undoStack = copyLocal(saved.undo); engine._redoStack = copyLocal(saved.redo);
    engine.blocksPlaced = saved.blocksPlaced; engine._sessionXP = saved.sessionXP; engine._blockMilestones = saved.milestones;
    engine._entryAnim = null; engine._builderSelection = saved.selection;
    if (saved.camera && engine.camera) engine.camera.position.fromArray(saved.camera);
    if (isFinite(saved.yaw)) engine.yaw = saved.yaw;
    if (isFinite(saved.pitch)) engine.pitch = saved.pitch;
    engine.flyMode = saved.flyMode;
    if (engine.velocity) engine.velocity.set(0,0,0);
    var context = pending.printContext || {};
    var selected = selectionMeasurement(engine);
    patchGeometryState(ctx, Object.assign({}, saved.state, { worldActive:true, showLessonIntro:false,
      showGameSettings:false, builderPanel:'build', measureResult:selected ? selected.measurement : null,
      builderPrintContext:{unitMm:printUnit(context.unitMm), aiUse:context.aiUse || 'NONE', aiDisclosure:String(context.aiDisclosure || '').slice(0,500)} }));
    delete window.__alloGeometryWorldReturnProject;
    announce(ctx, 'Returned to your complete workspace with selection, undo history, and print scale preserved. Check the revised model before printing.', 'success');
    focusWorldSurface(50);
    return true;
  }
  function aimedStudentMeasurement(ctx, updateDisplay) {`);
rep(0,"    announce(ctx, 'Measured ' + selected.measurement.count", "    selected.engine._builderSelection = { blocks: selected.measurement.blocks.slice() };\n    patchGeometryState(ctx, { measureResult:selected.measurement, builderPanel:'build', hudPanel:'' });\n    announce(ctx, 'Measured ' + selected.measurement.count");
rep(0,'    var selected = aimedStudentMeasurement(ctx, false);','    var selected = selectionMeasurement(window[ENGINE_KEY]) || aimedStudentMeasurement(ctx, false);');
rep(0,'    window.__alloPrintLabPendingHandoff = {',"    eng._builderSelection = { blocks:measurement.blocks.slice() };\n    var projectId = 'gw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);\n    var context = printContext(ctx);\n    window.__alloGeometryWorldReturnProject = captureProject(ctx, eng, projectId);\n    window.__alloPrintLabPendingHandoff = {");
rep(0,"id: 'gw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),",'id: projectId, projectId: projectId, coordinateSystem: \'z-up\',');
rep(0,'      unitMm: HANDOFF_UNIT_MM,','      unitMm: printUnit(context.unitMm), aiUse:context.aiUse || \'NONE\', aiDisclosure:context.aiDisclosure || \'\',');
rep(0,"    var source = pending.sourceModel;\n    var blocks", "    if (restoreProject(ctx, engine, pending)) { delete window.__alloGeometryWorldPendingBuild; return true; }\n    var source = pending.sourceModel;\n    var blocks");
rep(0,"    patchGeometryState(ctx, {\n      activeLesson: 'builderSandbox',", "    engine._builderSelection = null;\n    patchGeometryState(ctx, {\n      builderPrintContext:null, builderPanel:'build',\n      activeLesson: 'builderSandbox',");
rep(0,"    restorePendingEditableBuild: restorePendingEditableBuild", "    restorePendingEditableBuild: restorePendingEditableBuild,\n    captureProject:captureProject, restoreProject:restoreProject, selectionMeasurement:selectionMeasurement,\n    openSelectedBuildInPrintLab:openSelectedBuildInPrintLab, worldToStl:worldToStl, printUnit:printUnit");
rep(0,"      var measured = data.measureResult", "      var currentPrintUnit = printUnit(printContext(ctx).unitMm);\n      var measured = data.measureResult");
rep(0,'defaultPrintEnvelope(measured, storedPrinterProfile(ctx))','defaultPrintEnvelope(measured, storedPrinterProfile(ctx), currentPrintUnit)');
// Only UI occurrences; defaults remain a stable explicit 5 mm.
code[0]=code[0].replaceAll("+ HANDOFF_UNIT_MM + ' mm per block. Advisory", "+ currentPrintUnit + ' mm per block. Advisory").replaceAll("+ HANDOFF_UNIT_MM + ' mm per block. Reduce", "+ currentPrintUnit + ' mm per block. Reduce").replaceAll('printVolumeSentence(measured)','printVolumeSentence(measured, currentPrintUnit)');
rep(0,"'Print Lab starts at ' + HANDOFF_UNIT_MM", "'Print Lab scale: ' + currentPrintUnit");
rep(0,"'Build freely, then aim the crosshair at one connected creation to measure it or continue in Print Lab.'", "'Aim at your creation and choose Measure to select it. The outlined build stays selected while you look around.'");
rep(0,"h('button', { type: 'button', onClick: function () { measureSelectedBuild(ctx); } },", "h('button', { type: 'button', 'aria-label':'Select and measure aimed build', onClick: function () { measureSelectedBuild(ctx); } },");
// The core measurement remains available through one coordinated panel state.
rep(0,"          h('div', { className: 'gwe-builder-actions' },", "          h('div', { className: 'gwe-builder-actions' },\n            measured && h('button', {type:'button', onClick:function(){patchGeometryState(ctx,{builderPanel:'measure',sandboxDockCollapsed:true,hudPanel:''});}}, 'Explore measurements'),\n            engine && engine._builderSelection && h('button', {type:'button', onClick:function(){engine._builderSelection=null;patchGeometryState(ctx,{measureResult:null,builderPanel:'build'});}}, 'Clear selection'),");
rep(0,"        'data-geometry-mode': isSandbox ? 'sandbox' : 'lesson'", "        'data-builder-panel': data.builderPanel === 'measure' && data.measureResult ? 'measure' : 'build',\n        'data-geometry-mode': isSandbox ? 'sandbox' : 'lesson'");
rep(0,"patchGeometryState(ctx, { sandboxDockCollapsed: !collapsed });", "patchGeometryState(ctx, { sandboxDockCollapsed: !collapsed, builderPanel:'build' });");
// Keep the original outside-school source behavior while accepting explicitly Z-up new exports.
rep(1,'function inspectGeometryWorldBinaryStl(bytes, triangleCount) {','function inspectGeometryWorldBinaryStl(bytes, triangleCount, zUp) {');
rep(1,'return { L: extent(0), W: extent(2), H: extent(1) };','return zUp ? { L:extent(0), W:extent(1), H:extent(2) } : { L:extent(0), W:extent(2), H:extent(1) };');
// Architecture remains on its existing convention; change the Geometry World call only.
const pendingAt=code[1].indexOf('  function readPendingLocalHandoff(');
code[1]=code[1].slice(0,pendingAt)+code[1].slice(pendingAt).replace('inspectGeometryWorldBinaryStl(bytes, triangleCount)','inspectGeometryWorldBinaryStl(bytes, triangleCount, true)');
rep(1,"      sourceModel: source,\n      summary:", "      sourceModel: source, projectId:safeText(pending.projectId,80),\n      aiUse:['ASSISTED','MOSTLY_AI'].indexOf(pending.aiUse)>=0 ? pending.aiUse : 'NONE',\n      aiDisclosure:safeText(pending.aiDisclosure,500),\n      summary:");
rep(1,'sourceTool: pendingHandoff.sourceTool, sourceModel: pendingHandoff.sourceModel, summary: pendingHandoff.summary','sourceTool: pendingHandoff.sourceTool, projectId:pendingHandoff.projectId, sourceModel: pendingHandoff.sourceModel, summary: pendingHandoff.summary');
rep(1,'sourceModel: JSON.parse(JSON.stringify(source))','sourceModel: JSON.parse(JSON.stringify(source)), projectId:sourceContext.projectId,\n          printContext:{unitMm:unitMm, aiUse:aiUse, aiDisclosure:safeText(aiDisclosure,500)}');
rep(1,"                h('button', { type: 'button', onClick: returnToGeometryWorld", "                h('button', { type:'button', onClick:function(){chooseTab('Preflight');}, className:'min-h-[44px] rounded-xl bg-emerald-700 px-4 text-sm font-black text-white' }, 'Check this model'),\n                h('button', { type: 'button', onClick: returnToGeometryWorld");
// Native disclosure retains forms while removing unrelated new-model actions from the main path.
rep(1,"            h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'print-lab-create-title' },", "            h(sourceContext && sourceContext.sourceTool === 'geometryWorld' ? 'details' : 'div', {className:'space-y-4', 'data-print-alternative-design':true},\n            sourceContext && sourceContext.sourceTool === 'geometryWorld' && h('summary', {className:'min-h-[44px] cursor-pointer rounded-xl border border-slate-600 p-3 text-sm font-bold text-slate-200'}, 'Start a different model'),\n            h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'print-lab-create-title' },");
rep(1,"          h('div', { className: 'space-y-4' },\n            h(PrintPreview,", "          h('div', { className: 'space-y-4' },\n            h(PrintPreview,");
const importEnd="          ),\n          h('div', { className: 'space-y-4' },\n            h(PrintPreview,";
rep(1,importEnd,"            )\n          ),\n          h('div', { className: 'space-y-4' },\n            h(PrintPreview,");
// Route the old shortcut through the same selected-student workflow when the builder is loaded.
rep(2,"          // 3D Print Export (STL)\n          engine && el('button', {\n            onClick: function() {", "          // 3D Print Export (STL)\n          engine && el('button', {\n            onClick: function() {\n              var printBuilder = window.StemLab && window.StemLab.geometryWorldBuilderPure;\n              if (printBuilder && printBuilder.openSelectedBuildInPrintLab) { printBuilder.openSelectedBuildInPrintLab(ctx); return; }");
// Independent fallback export also produces correctly oriented millimeter geometry.
rep(2,'              // Write binary STL\n              var numTriangles', "              // The standalone fallback uses the same default 5 mm block scale and Z-up STL.\n              faces = faces.map(function(t){return {n:[t.n[0],-t.n[2],t.n[1]],v:t.v.map(function(v){return [v[0]*5,-v[2]*5,v[1]*5];})};});\n              // Write binary STL\n              var numTriangles");
for(let i=0;i<files.length;i++)new Function(code[i]);
const backups=path.join(__dirname,'before-enhancement');fs.mkdirSync(backups,{recursive:true});
for(let i=0;i<files.length;i++){const backup=path.join(backups,path.basename(files[i]));if(!fs.existsSync(backup))fs.copyFileSync(files[i],backup);fs.writeFileSync(files[i],code[i]);fs.writeFileSync('desktop/web-app/public/'+files[i],code[i]);}
console.log('Updated workflow and synchronized three public mirrors.');
