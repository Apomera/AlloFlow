const fs=require('node:fs');
function write(p,s){const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
let p='stem_lab/stem_tool_geometryworld_builder.js',s=fs.readFileSync(p,'utf8');
s=s.replace('engine.measureStructure(seed.x, seed.y, seed.z);','engine.measureStructure(seed.x, seed.y, seed.z, selected.blocks);\n    if (measurement && measurement.isComplete !== false) engine._builderSelection = {blocks:measurement.blocks.slice()};');
s=s.replace('var measurement = eng.measureStructure(selected.gp.x, selected.gp.y, selected.gp.z);','var measurement = selected.measurement;');
s=s.replace('Created from one connected Geometry World student build.','Created from the selected Geometry World student blocks.');
s=s.replace("    patchGeometryState(ctx, { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: 'inventory', measureResult: null, measureHistory: [] });", "    var returningContext = pending.printContext || {};\n    engine._builderSelection = {blocks:clean.map(function(b){return {x:b.x+offsetX,y:b.y+offsetY,z:b.z+offsetZ};})};\n    patchGeometryState(ctx, { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: '', builderPanel:'build', builderPrintContext:{unitMm:printUnit(returningContext.unitMm),aiUse:returningContext.aiUse || 'NONE',aiDisclosure:String(returningContext.aiDisclosure || '').slice(0,500)}, measureResult: null, measureHistory: [] });");
write(p,s);write('desktop/web-app/public/'+p,s);
p='stem_lab/stem_tool_geometryworld.js';s=fs.readFileSync(p,'utf8');
s=s.replace('engine.measureStructure = function(startX, startY, startZ) {','engine.measureStructure = function(startX, startY, startZ, retainedBlocks) {');
s=s.replace('var queue = [{ x: startX, y: startY, z: startZ }]; var queueIndex = 0;', 'var queue = Array.isArray(retainedBlocks) && retainedBlocks.length ? retainedBlocks.slice() : [{ x: startX, y: startY, z: startZ }]; var queueIndex = 0;');
s=s.replace("          if (engine._currentLesson && engine._currentLesson.sandbox && inputMode !== 'builder_studio')", "          var builderHelpers = window.StemLab && window.StemLab.geometryWorldBuilderPure;\n          if (builderHelpers && builderHelpers.measurementIsStudentBuild(engine,m)) engine._builderSelection = {blocks:m.blocks.slice()};\n          if (engine._currentLesson && engine._currentLesson.sandbox && inputMode !== 'builder_studio')");
write(p,s);write('desktop/web-app/public/'+p,s);
p='tests/print_lab_tool.test.js';s=fs.readFileSync(p,'utf8').replace("toContain('Model bytes embedded')","toContain('Review JSON embeds model')");write(p,s);
console.log('Selection continuity and updated copy checks applied.');
