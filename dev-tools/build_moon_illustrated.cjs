const fs=require('fs'),{execFileSync}=require('child_process'),{refine}=require('./moon_content_refinements.cjs');
execFileSync(process.execPath,['dev-tools/build_math_illustrated.cjs','moon_phases_grade6'],{stdio:'inherit'});
const dir='allopacks/media/moon_phases_grade6/',f='allopacks/illustrated/moon_phases_grade6.allopack.json',p=JSON.parse(fs.readFileSync(f)),changes=refine(p);
p.allopack.contentRefinements={review:'Scientific wording refined; educator review pending',audit:dir+'content-refinements.json',count:changes.length};
for(const r of p.history.filter(r=>r.type==='image'))r.timestamp='2026-09-10T00:00:00.000Z';
const json=JSON.stringify(p,null,2)+'\n';if(json.length>=2000000)throw Error('Pack too large');fs.writeFileSync(f,json);fs.writeFileSync(dir+'content-refinements.json',JSON.stringify(changes,null,2));console.log(JSON.stringify({refinements:changes.length,characters:json.length}));


