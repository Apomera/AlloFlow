'use strict';
const fs=require('node:fs'),path=require('node:path');
if(!process.argv.includes('--apply'))throw Error('Pass --apply to update the canonical generation prompts and checker.');
const target=path.resolve(__dirname,'../../stem_lab/stem_tool_geometryworld.js');
const input=fs.readFileSync(target,'utf8'),newline=input.includes('\r\n')?'\r\n':'\n';let source=input.replace(/\r\n/g,'\n');
function replace(from,to){if(!source.includes(from))throw Error('Missing theme patch anchor: '+from.slice(0,120));source=source.replace(from,to);}
replace("      + 'Use a coherent setting, a recognizable arrival landmark, distinct activity landmarks, a walkable route, and an ending that uses earlier learning. '",
  "      + 'Use a coherent setting, a recognizable arrival landmark, distinct activity landmarks, a walkable route, and an ending that uses earlier learning. '\n      + 'Optional landscapeTheme selects background scenery: use meadow by default; choose coastal only when the teacher topic or approved setting explicitly calls for a seaside, harbor, ocean, or coastal world. Only meadow and coastal are supported. This choice must not change the teaching geometry, activity goals, or authored block budget. '");
replace("    if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson)) return ['Return one complete lesson object.'];",
  "    if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson)) return ['Return one complete lesson object.'];\n    if (Object.prototype.hasOwnProperty.call(lesson, 'landscapeTheme') && lesson.landscapeTheme !== 'meadow' && lesson.landscapeTheme !== 'coastal') issues.push('landscapeTheme must be meadow or coastal when provided. Use meadow unless a coastal setting is intended.');");
replace("    lesson.depth = profile.id;", "    if (!Object.prototype.hasOwnProperty.call(lesson, 'landscapeTheme')) lesson.landscapeTheme = 'meadow';\n    lesson.depth = profile.id;");
replace("    + '{\"title\":\"...\",\"description\":\"What students will do\", \"spawnPoint\":[0,3,0], \"objectives\":[\"One measurable goal per activity\"], '",
  "    + '{\"title\":\"...\",\"description\":\"What students will do\", \"landscapeTheme\":\"meadow\", \"spawnPoint\":[0,3,0], \"objectives\":[\"One measurable goal per activity\"], '");
const next=source.replace(/\n/g,newline),fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,next,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(next));}finally{fs.closeSync(fd);}
console.log('Generated lessons support explicit meadow/coastal scenery, with meadow as the conservative default.');
