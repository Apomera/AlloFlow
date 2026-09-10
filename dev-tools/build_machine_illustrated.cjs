const fs=require('fs'),{execFileSync}=require('child_process'),{refine}=require('./machine_content_refinements.cjs');
execFileSync(process.execPath,['dev-tools/build_math_illustrated.cjs','simple_machines_grade5'],{stdio:'inherit'});
const dir='allopacks/media/simple_machines_grade5/',f='allopacks/illustrated/simple_machines_grade5.allopack.json',p=JSON.parse(fs.readFileSync(f)),changes=refine(p);
p.allopack.contentRefinements={review:'Scientific wording refined; educator review pending',audit:dir+'content-refinements.json',count:changes.length};
const json=JSON.stringify(p,null,2)+'\n';if(json.length>=2000000)throw Error('Pack too large');fs.writeFileSync(f,json);fs.writeFileSync(dir+'content-refinements.json',JSON.stringify(changes,null,2));
console.log(JSON.stringify({refinements:changes.length,characters:json.length}));

