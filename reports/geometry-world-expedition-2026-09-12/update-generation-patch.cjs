'use strict';
// Mechanical coordination update to the not-yet-applied generation patch.
const fs = require('node:fs');
const target = require('node:path').join(__dirname, 'patch-generation.cjs');
let source = fs.readFileSync(target, 'utf8');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
source = source.replace(/\r\n/g, '\n');
function replace(from, to) {
  if (!source.includes(from)) throw new Error('Missing update anchor: ' + from.slice(0, 120));
  source = source.replace(from, to);
}
replace("+ ' blocks total (inclusive fill volumes; ground does not count). '", "+ ' non-ground blocks total (inclusive fill volumes; ground does not count). '");
replace("      cost += (s.x2 - s.x1 + 1) * (s.y2 - s.y1 + 1) * (s.z2 - s.z1 + 1);\n      goodStructures.push(s);", "      var groundOverlay = s.measurementLayer === 'ground' && s.y1 === 0 && s.y2 === 0;\n      if (s.measurementLayer === 'ground' && !groundOverlay) issues.push('Ground overlays must be flat at y=0; fix ' + s.id + '.');\n      if (!groundOverlay) {\n        cost += (s.x2 - s.x1 + 1) * (s.y2 - s.y1 + 1) * (s.z2 - s.z1 + 1);\n        goodStructures.push(s);\n      }");
replace("        if (s) {\n          var x = s.x2", "        if (s && s.measurementLayer !== 'ground') {\n          var x = s.x2");
replace("a.structureIds.some(function(id) { return !byId[id]; })) issues.push('Activity ' + a.id + ' must reference its existing teaching structures by ID.');", "a.structureIds.some(function(id) { return !byId[id] || byId[id].measurementLayer === 'ground'; })) issues.push('Activity ' + a.id + ' must reference its existing non-ground teaching structures by ID.');");
replace("Ground supplies the floor; do not repeat a full floor in structures. Paths may be narrow fills at y=0. Ground and decorations are not part of measured teaching shapes.", "Ground supplies the floor; do not repeat a full floor in structures. Paths and plot markings may be narrow fills at y=0 with measurementLayer:\"ground\"; only flat y=0 fills can use this tag, and these do not count against the authored-block budget. All teaching structures start at y=1 or higher. Ground and decorations are not part of measured teaching shapes.");
replace("        function current() { return state.mounted && state.id === requestId; }", "        function current() { return state.mounted && state.id === requestId; }\n        function sameWorld() { return window[engineKey] === originalEngine && (!originalEngine || originalEngine._currentLesson === originalLesson); }");
replace("callGemini: callGemini, isCurrent: current,", "callGemini: callGemini, isCurrent: function() { return current() && sameWorld(); },");
replace("          if (!current() || error.code === 'GW_GENERATION_CANCELLED') return null;", "          if (!current()) return null;\n          if (error.code === 'GW_GENERATION_CANCELLED') {\n            upd({ aiGenerating: false, aiCurrentPass: 0, aiGenerationStatus: 'Generation stopped because you changed worlds. Generate again in this world.' });\n            return null;\n          }");
replace("        var authoredCost = lesson.structures.reduce(function(total, s) {\n          return total", "        var authoredCost = lesson.structures.reduce(function(total, s) {\n          if (s.measurementLayer === 'ground') {\n            if (s.y1 !== 0 || s.y2 !== 0) throw new Error('Ground overlays must be flat at y=0.');\n            return total;\n          }\n          return total");
const next = source.replace(/\n/g, newline);
const fd = fs.openSync(target, 'r+');
try { fs.writeFileSync(fd, next, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(next)); }
finally { fs.closeSync(fd); }
console.log('Updated the generation patch for shared terrain overlays and early cancellation.');
