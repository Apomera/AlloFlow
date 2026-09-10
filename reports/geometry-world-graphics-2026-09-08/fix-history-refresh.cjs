const fs = require('fs');
const file = 'stem_lab/stem_tool_geometryworld.js';
let source = fs.readFileSync(file, 'utf8');
const start = source.indexOf('        engine.undo = function() {');
const end = source.indexOf('        // ── Ambient occlusion', start);
if (start < 0 || end < start) throw Error('History function boundaries were not found');
const replacement = `        function publishHistoryChange() {
          engine._historyRevision = (engine._historyRevision || 0) + 1;
          upd('historyRevision', engine._historyRevision);
        }
        engine.undo = function() {
          if (engine._undoStack.length === 0) return false;
          var a = engine._undoStack[engine._undoStack.length - 1];
          if (a.action === 'place') {
            // Undo a placement = remove the block (no particles).
            var key = a.x + ',' + a.y + ',' + a.z;
            var mesh = engine.blocks[key];
            if (!mesh) return false;
            engine.scene.remove(mesh);
            engine._disposeBlockMesh(mesh);
            delete engine.blocks[key];
            engine._blocksDirty = true;
          } else if (a.action === 'remove') {
            var restored;
            engine._replayingHistory = true;
            try { restored = engine.placeBlock(a.x, a.y, a.z, a.type, a.shape, a.rotation); }
            finally { engine._replayingHistory = false; }
            if (!restored) return false;
          } else return false;
          engine._undoStack.pop();
          engine._redoStack.push(a);
          publishHistoryChange();
          return true;
        };
        engine.redo = function() {
          if (engine._redoStack.length === 0) return false;
          var a = engine._redoStack[engine._redoStack.length - 1];
          if (a.action === 'place') {
            var replayed;
            engine._replayingHistory = true;
            try { replayed = engine.placeBlock(a.x, a.y, a.z, a.type, a.shape, a.rotation); }
            finally { engine._replayingHistory = false; }
            if (!replayed) return false;
          } else if (a.action === 'remove') {
            var key = a.x + ',' + a.y + ',' + a.z;
            var mesh = engine.blocks[key];
            if (!mesh) return false;
            engine.scene.remove(mesh);
            engine._disposeBlockMesh(mesh);
            delete engine.blocks[key];
            engine._blocksDirty = true;
          } else return false;
          engine._redoStack.pop();
          engine._undoStack.push(a);
          publishHistoryChange();
          return true;
        };

`;
source = source.slice(0, start) + replacement + source.slice(end);
new Function(source);
for (const target of [file, 'desktop/web-app/public/' + file]) {
  const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);
}
console.log('Successful undo/redo now publish historyRevision; rejected/no-op actions retain stacks; source/mirror syntax passed.');
