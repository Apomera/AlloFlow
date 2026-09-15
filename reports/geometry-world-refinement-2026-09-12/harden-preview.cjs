const fs=require('node:fs'),assert=require('node:assert/strict');
for(const file of ['stem_lab/stem_tool_geometryworld_builder.js','reports/geometry-world-refinement-2026-09-12/lesson-overview.js']){
  let s=fs.readFileSync(file,'utf8');const from="depth:({quick:'Quick',guided:'Guided',expedition:'Expedition'})[lesson.depth]||''";assert(s.includes(from));
  s=s.replace(from,"depth:lesson.depth==='quick'?'Quick':lesson.depth==='guided'?'Guided':lesson.depth==='expedition'?'Expedition':''");
  s=s.replace("fill:colors[f.block]||'#a0aca2'","fill:Object.prototype.hasOwnProperty.call(colors,f.block)?colors[f.block]:'#a0aca2'");
  s=s.replace("'The top of this map is north.'","'The top of this map is north.'");
  s=s.replace("numbered stops follow the activity guide.","numbered stops follow the activity guide; dotted lines show their order.");
  s=s.replace("'Your route · '+map.stops.length+' stops'","'Activity locations · '+map.stops.length+' stops'");
  const b=Buffer.from(s),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);}finally{fs.closeSync(fd);}
}
console.log('Preview handles unfamiliar metadata safely and labels activity order clearly.');
