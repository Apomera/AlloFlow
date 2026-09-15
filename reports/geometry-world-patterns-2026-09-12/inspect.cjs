const fs=require('fs');
const file='stem_lab/stem_tool_geometryworld.js',text=fs.readFileSync(file,'utf8');
const start=text.indexOf('  SAMPLE_LESSONS.geometryHarbor = '),end=text.indexOf('  // The authored lessons',start);
const lesson=new Function('const SAMPLE_LESSONS={};'+text.slice(start,end)+'return SAMPLE_LESSONS.geometryHarbor;')();
console.log(JSON.stringify({ground:lesson.ground,structures:lesson.structures.map(s=>({id:s.id,b:s.block,from:[s.x1,s.y1,s.z1],to:[s.x2,s.y2,s.z2],layer:s.measurementLayer})),activities:lesson.activities.map(a=>({id:a.id,pos:a.position})),npcs:lesson.npcs.map(n=>({name:n.name,pos:n.position}))},null,2));
for(const file of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js'])if(!fs.existsSync(__dirname+'/'+file+'.before'))fs.writeFileSync(__dirname+'/'+file+'.before',fs.readFileSync('stem_lab/'+file));
