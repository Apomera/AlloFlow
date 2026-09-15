const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const dir = __dirname;
const source = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
const names = ['SYSTEMS', 'FUN_FACTS', 'CONNECTIONS', 'GUIDED_TOURS', 'CLINICAL_CASES', 'PATHWAYS', 'SYSTEMS_IN_MOTION_SCENARIOS'];
const ast = require('@babel/parser').parse(source);
const found = {};
require('@babel/traverse').default(ast, {VariableDeclarator(p) {
  if (names.includes(p.node.id.name) && p.node.init) {
    const n = p.node;
    try {found[n.id.name] = {line:n.loc.start.line,data:vm.runInNewContext('('+source.slice(n.init.start,n.init.end)+')',{t:(k,f)=>f,__alloT:(k,f)=>f})};}
    catch(e){found[n.id.name]={line:n.loc.start.line,error:e.message};}
  }
}});
fs.writeFileSync(path.join(dir,'content-inventory.json'),JSON.stringify(found,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(found).map(([k,v])=>[k,{line:v.line,count:v.data?Object.keys(v.data).length:null,error:v.error}]))));
if(found.SYSTEMS.data) console.log(JSON.stringify(Object.fromEntries(Object.entries(found.SYSTEMS.data).map(([k,v])=>[k,{name:v.name,count:v.structures.length,ids:v.structures.map(s=>s.id)}]))));
esbuild.buildSync({entryPoints:['tests/e2e/helpers/stem_gl_harness.ts'],outfile:path.join(dir,'harness.cjs'),bundle:true,platform:'node',format:'cjs',packages:'external'});
