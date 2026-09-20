const fs=require('fs');
const test='tests/behavior_lens_app_shell_visualizations_a11y.test.js';let t=fs.readFileSync(test,'utf8');if(!t.includes('expect(svgContexts).toHaveLength(13);'))throw Error('SVG count anchor');fs.writeFileSync(test,t.replace('expect(svgContexts).toHaveLength(13);','expect(svgContexts).toHaveLength(14);'));
const browser=__dirname+'/verify-preview.cjs';let b=fs.readFileSync(browser,'utf8');fs.writeFileSync(browser,b.replace("getByRole('button',{name:'Leave practice',exact:true})","getByRole('button',{name:'Clear Practice Data',exact:true})"));
let s=fs.readFileSync('behavior_lens_module.js','utf8').replace(/\r\n/g,'\n');s=s.replace("' linked timed sessions in scope.'", "' timed sessions in scope.'");
for(const file of ['behavior_lens_module.js','desktop/web-app/public/behavior_lens_module.js'])for(let i=0;;i++){try{fs.writeFileSync(file,s);break;}catch(e){if(i===9)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1000);}}
