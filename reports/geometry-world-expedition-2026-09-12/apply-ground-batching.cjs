const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const target = path.join(root, 'stem_lab/stem_tool_geometryworld.js');
const source = fs.readFileSync(target, 'utf8');
const crlf = source.includes('\r\n');
let text = source.replace(/\r\n/g, '\n');
const edits = [];
function change(before, after, all = false) {
  const matches = text.split(before).length - 1;
  if (!matches || (!all && matches !== 1 && !before.startsWith("          var lesson = engine._currentLesson"))) throw Error('Unexpected anchor count ' + matches + ': ' + before.slice(0, 100));
  text = all ? text.split(before).join(after) : text.replace(before, after);
  edits.push({anchor:before.slice(0,100), matches});
}
if (text.includes('function installGeometryGround(')) throw Error('Ground batching already installed');
const helper = fs.readFileSync(path.join(__dirname, 'ground-batching.js'), 'utf8').replace(/\r\n/g, '\n');
change('        // Block operations\n', helper.split('\n').map(line => '        ' + line).join('\n') + '\n        installGeometryGround(engine, THREE, getBlockMaterial, geometryWorldGroundTint);\n\n        // Block operations\n');
change('        engine._disposeBlockMesh = function(mesh) {\n          if (!mesh) return;', '        engine._disposeBlockMesh = function(mesh) {\n          if (!mesh || (mesh.userData && mesh.userData.gwGroundProxy)) return;');
change('        engine.refreshBlockAO = function(mesh) {\n          if (!mesh || !mesh.geometry || !mesh.userData || !mesh.userData.gridPos) return;', '        engine.refreshBlockAO = function(mesh) {\n          if (!mesh || !mesh.geometry || !mesh.userData || !mesh.userData.gridPos || mesh.userData.gwGroundProxy) return;');
change("          var lesson = engine._currentLesson || {}, ground = lesson.ground || {};", "          var lesson = engine._currentLesson || {}, ground = lesson.ground || {};\n          var groundPlacement = !!(engine._placingLessonBlocks && engine._measurementLayer === 'ground' && engine.placeGroundBlock);");
change("          } else if (engine.blocks[x + ',' + y + ',' + z]) {", "          } else if (engine.blocks[x + ',' + y + ',' + z] && !(groundPlacement && engine.blocks[x + ',' + y + ',' + z].userData.gwGroundProxy)) {");
change("          } else if ((engine.getBlocksArr ? engine.getBlocksArr().length : Object.keys(engine.blocks).length) >= MAX_BLOCKS) {\n            code = 'block_limit'; reason = 'Block limit reached (' + MAX_BLOCKS + '). Remove a block first';", "          } else if (groundPlacement && !engine.blocks[x + ',' + y + ',' + z] && engine.getGroundBlockCount() >= engine._groundBlockLimit) {\n            code = 'block_limit'; reason = 'Landscape cell limit reached (' + engine._groundBlockLimit + ')';\n          } else if (!groundPlacement && (engine.getConstructionBlockCount ? engine.getConstructionBlockCount() : (engine.getBlocksArr ? engine.getBlocksArr().length : Object.keys(engine.blocks).length)) >= MAX_BLOCKS) {\n            code = 'block_limit'; reason = 'Build block limit reached (' + MAX_BLOCKS + '). Remove a block first';");
change("          var key = x + ',' + y + ',' + z;\n          var shapeId = shape || 'cube';", "          var key = x + ',' + y + ',' + z;\n          var shapeId = shape || 'cube';\n          if (engine._placingLessonBlocks && engine._measurementLayer === 'ground' && shapeId === 'cube' && engine.placeGroundBlock) return engine.placeGroundBlock(x, y, z, type);");
change("        engine.removeBlock = function(x, y, z, forceRemove) {\n          var key = x + ',' + y + ',' + z;\n          var mesh = engine.blocks[key];", "        engine.removeBlock = function(x, y, z, forceRemove) {\n          var key = x + ',' + y + ',' + z;\n          var mesh = engine.blocks[key];\n          if (mesh && mesh.userData && mesh.userData.gwGroundProxy) {\n            if (forceRemove && engine.removeGroundBlock) { engine.removeGroundBlock(mesh); engine.refreshAONeighbourhood(x, y, z); }\n            else if (window._alloHaptic) window._alloHaptic('bump');\n            return;\n          }");
change("          var count = Object.keys(engine.blocks).length;\n          for (var x = Math.min(x1,x2); x <= Math.max(x1,x2); x++) {", "          var groundFill = !!(engine._placingLessonBlocks && engine._measurementLayer === 'ground' && engine.placeGroundBlock);\n          var count = groundFill ? engine.getGroundBlockCount() : engine.getConstructionBlockCount ? engine.getConstructionBlockCount() : Object.keys(engine.blocks).length;\n          var limit = groundFill ? engine._groundBlockLimit : MAX_BLOCKS;\n          for (var x = Math.min(x1,x2); x <= Math.max(x1,x2); x++) {");
change("                if (count >= MAX_BLOCKS) { engine._fillTruncated = true; return; }\n                var k = x + ',' + y + ',' + z;\n                if (engine.blocks[k]) continue;", "                var k = x + ',' + y + ',' + z;\n                if (engine.blocks[k]) {\n                  if (groundFill && engine.blocks[k].userData.gwGroundProxy) engine.placeGroundBlock(x, y, z, type);\n                  continue;\n                }\n                if (count >= limit) { engine._fillTruncated = true; return; }");
change('          if (engine.disposeLandscape) engine.disposeLandscape();\n          Object.keys(engine.blocks).forEach(function(k) {', '          if (engine.disposeLandscape) engine.disposeLandscape();\n          if (engine.disposeGround) engine.disposeGround();\n          Object.keys(engine.blocks).forEach(function(k) {');
change("          if (lesson.structures) lesson.structures.forEach(function(s) {\n            if (s.type === 'fill') engine.fillBlocks(s.x1, s.y1, s.z1, s.x2, s.y2, s.z2, s.block);\n          });", "          if (lesson.structures) lesson.structures.forEach(function(s) {\n            engine._measurementLayer = lesson.ground && s.y1 === lesson.ground.y && s.y1 === s.y2 ? 'ground' : 'lesson';\n            if (s.type === 'fill') engine.fillBlocks(s.x1, s.y1, s.z1, s.x2, s.y2, s.z2, s.block);\n          });");
change('engine.raycaster.intersectObjects(engine.getBlocksArr())', 'engine.raycaster.intersectObjects(engine.getRaycastTargets ? engine.getRaycastTargets() : engine.getBlocksArr())', true);
change('var targets=engine.getBlocksArr().concat', 'var targets=(engine.getRaycastTargets ? engine.getRaycastTargets() : engine.getBlocksArr()).concat');
change('var allMeshes = engine.getBlocksArr().concat', 'var allMeshes = (engine.getRaycastTargets ? engine.getRaycastTargets() : engine.getBlocksArr()).concat');
change("var m = eng.blocks[k]; return m && m.userData.gridPos && m.userData.blockType !== 'grass';", "var m = eng.blocks[k]; return m && m.userData.gridPos && m.userData._measurementLayer !== 'ground' && m.userData.blockType !== 'grass';");
const warningStart = text.indexOf('        engine && Object.keys(engine.blocks).length > MAX_BLOCKS * 0.8');
if (warningStart < 0) throw Error('Missing budget warning');
const warningEnd = text.indexOf("' blocks \\u2014 approaching limit'),", warningStart);
if (warningEnd < 0) throw Error('Missing warning end');
const oldWarning = text.slice(warningStart, warningEnd);
change(oldWarning, oldWarning.replaceAll('Object.keys(engine.blocks).length', '(engine.getConstructionBlockCount ? engine.getConstructionBlockCount() : Object.keys(engine.blocks).length)'));
const output = crlf ? text.replace(/\n/g, '\r\n') : text;
// Default is review-only: build a candidate beside this script. --apply writes
// only the canonical Geometry World core; the parent owns mirror synchronization.
const destination = process.argv.includes('--apply') ? target : path.join(__dirname, 'ground-core-candidate.js');
if (fs.existsSync(destination)) {
  const fd = fs.openSync(destination, 'r+');
  try { fs.writeSync(fd, output, 0, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(output)); } finally { fs.closeSync(fd); }
} else fs.writeFileSync(destination, output);
console.log(JSON.stringify({destination, edits}, null, 2));
