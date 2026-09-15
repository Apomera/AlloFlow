const fs=require('fs'),assert=require('assert');
const path='stem_lab/stem_tool_geometryworld.js';
const original=fs.readFileSync(path,'utf8'),crlf=original.includes('\r\n');let source=original.replace(/\r\n/g,'\n');
function replace(old,next){assert.equal(source.split(old).length,2,'Unique anchor: '+old.slice(0,90));source=source.replace(old,next);}
const fragment=fs.readFileSync('reports/geometry-world-creative-tools-2026-09-12/build-tools-runtime.fragment.js','utf8').replace(/\r\n/g,'\n');
replace('        // Break particle system — small cubes scatter on block break',fragment+'\n\n        // Break particle system — small cubes scatter on block break');
replace("          var a = engine._undoStack[engine._undoStack.length - 1];\n          if (a.action === 'place') {","          var a = engine._undoStack[engine._undoStack.length - 1];\n          if (a.action === 'batch') {\n            if(!engine._replayBuildBatch || !engine._replayBuildBatch(a,true).ok)return false;\n          } else if (a.action === 'place') {");
replace("          var a = engine._redoStack[engine._redoStack.length - 1];\n          if (a.action === 'place') {","          var a = engine._redoStack[engine._redoStack.length - 1];\n          if (a.action === 'batch') {\n            if(!engine._replayBuildBatch || !engine._replayBuildBatch(a,false).ok)return false;\n          } else if (a.action === 'place') {");
replace('if (!had && engine.blocks[key] && !engine._placingLessonBlocks) {','if (!had && engine.blocks[key] && !engine._placingLessonBlocks && !engine._batchSuppressEvents) {');
const output=crlf?source.replace(/\n/g,'\r\n'):source;const fd=fs.openSync(path,'r+');try{fs.writeSync(fd,output);fs.ftruncateSync(fd,Buffer.byteLength(output));}finally{fs.closeSync(fd);}
console.log('Applied atomic Geometry World construction batch API.');
