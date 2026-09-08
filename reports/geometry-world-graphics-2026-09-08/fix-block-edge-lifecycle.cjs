const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sourcePath = path.join(process.cwd(), 'stem_lab/stem_tool_geometryworld.js');
const mirrorPath = path.join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js');
let source = fs.readFileSync(sourcePath, 'utf8');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
const lines = value => value.replace(/\r?\n/g, newline);
function replaceOnce(before, after) {
  before = lines(before); after = lines(after);
  assert.equal(source.split(before).length - 1, 1, 'expected one edge lifecycle anchor: ' + before);
  source = source.replace(before, after);
}
replaceOnce('        var _edgeMatCache = {};', '        var _edgeMatCache = engine._edgeMatCache = {};');
replaceOnce('          var edges = new THREE.EdgesGeometry(mesh.geometry, 30);', '          _edgeMatCache[shapeId].userData.gwSharedBlockEdge = true;\n          var edges = new THREE.EdgesGeometry(mesh.geometry, 30);');
replaceOnce('        // ── Undo / Redo system ──', `        // Block geometry belongs to that block, including its edge child. Edge
        // materials belong to the engine cache and stay live while any block uses
        // them; releasing one block must not dispose a neighbour's material.
        engine._disposeBlockMesh = function(mesh) {
          if (!mesh) return;
          mesh.traverse(function(part) {
            if (part.geometry && part.geometry.dispose) part.geometry.dispose();
            var materials = Array.isArray(part.material) ? part.material : [part.material];
            materials.forEach(function(material) {
              if (material && material.dispose && !(material.userData && material.userData.gwSharedBlockEdge)) material.dispose();
            });
          });
        };

        // ── Undo / Redo system ──`);
replaceOnce(`            // Dispose children (edge wireframes)
            if (mesh.children) mesh.children.forEach(function(c) { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
            mesh.geometry.dispose(); mesh.material.dispose();`, `            engine._disposeBlockMesh(mesh);`);
replaceOnce(`        engine.clearWorld = function() {
          if (engine.disposeLandscape) engine.disposeLandscape();
          if (engine.clearLayerGhosts) engine.clearLayerGhosts();`, `        engine.clearWorld = function() {
          if (engine.clearLayerGhosts) engine.clearLayerGhosts();
          if (engine.disposeLandscape) engine.disposeLandscape();`);
replaceOnce('            var m = engine.blocks[k]; engine.scene.remove(m); m.geometry.dispose(); m.material.dispose();', '            var m = engine.blocks[k]; engine.scene.remove(m); engine._disposeBlockMesh(m);');
replaceOnce('          // Dispose material cache', `          // Shared block-edge materials live until the engine itself is destroyed.
          if (engine._edgeMatCache) {
            Object.values(engine._edgeMatCache).forEach(function(material) { if (material && material.dispose) material.dispose(); });
            engine._edgeMatCache = null;
          }
          // Dispose material cache`);
for (const file of [sourcePath, mirrorPath]) {
  const fd = fs.openSync(file, 'r+');
  try { fs.writeFileSync(fd, source, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(source)); }
  finally { fs.closeSync(fd); }
}
assert.deepEqual(fs.readFileSync(sourcePath), fs.readFileSync(mirrorPath));
console.log('Child block geometry now disposes on clear and removal; shared edge materials dispose only at engine teardown. Mirrors match.');
