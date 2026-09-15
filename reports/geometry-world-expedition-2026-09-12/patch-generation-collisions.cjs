'use strict';
const fs = require('node:fs');
const path = require('node:path');
function patchGenerationCollisions(input) {
  const newline = input.includes('\r\n') ? '\r\n' : '\n';
  let source = input.replace(/\r\n/g, '\n');
  function replace(from, to) { if (!source.includes(from)) throw new Error('Missing collision patch anchor: ' + from.slice(0, 120)); source = source.replace(from, to); }
  replace("        goodStructures.push(s);", "        var overlap = goodStructures.find(function(other) {\n          return s.x1 <= other.x2 && s.x2 >= other.x1 && s.y1 <= other.y2 && s.y2 >= other.y1 && s.z1 <= other.z2 && s.z2 >= other.z1;\n        });\n        if (overlap) issues.push('Structures ' + s.id + ' and ' + overlap.id + ' overlap. Separate them and update affected measurements; each authored voxel can belong to only one fill.');\n        goodStructures.push(s);");
  replace("function blocked(pos) { return point(pos) && goodStructures.some(function(s) { return pos[0] >= s.x1 - 0.4 && pos[0] <= s.x2 + 0.4 && pos[2] >= s.z1 - 0.4 && pos[2] <= s.z2 + 0.4 && pos[1] - 1.6 <= s.y2 + 0.5 && pos[1] >= s.y1 - 0.5; }); }",
    "function blocked(pos) { return point(pos) && goodStructures.some(function(s) {\n      // Grid cell x occupies [x,x+1], while the camera is a world-space eye\n      // position. Keep body height and a small horizontal clearance free.\n      return pos[0] > s.x1 - 0.3 && pos[0] < s.x2 + 1.3 && pos[2] > s.z1 - 0.3 && pos[2] < s.z2 + 1.3 && pos[1] - 1.6 < s.y2 + 1 && pos[1] > s.y1;\n    }); }");
  replace("Separate teaching structures so their measurements are unambiguous.", "Non-ground fills must never overlap, even when they use the same material; a voxel can belong to only one fill. Separate teaching structures so their measurements are unambiguous.");
  return source.replace(/\n/g, newline);
}
module.exports = { patchGenerationCollisions };
if (require.main === module) {
  if (!process.argv.includes('--apply')) throw new Error('Pass --apply to update canonical source.');
  const target = path.resolve(__dirname, '../../stem_lab/stem_tool_geometryworld.js');
  const next = patchGenerationCollisions(fs.readFileSync(target, 'utf8'));
  const fd = fs.openSync(target, 'r+');
  try { fs.writeFileSync(fd, next, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(next)); }
  finally { fs.closeSync(fd); }
  console.log('Generation now rejects overlapping fills and embedded world-space viewpoints.');
}
