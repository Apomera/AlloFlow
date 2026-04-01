// Quick count: modules with tablist vs without
const fs = require('fs'), p = require('path'), r = __dirname;
const f=[];
function w(d){fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{const fp=p.join(d,e.name);if(e.isDirectory()&&!['node_modules','prismflow-deploy','.git','.gemini','.agent','_archive','src','a11y-audit'].includes(e.name))w(fp);else if(e.name.endsWith('.js')&&!e.name.startsWith('_')&&!e.name.startsWith('build'))f.push(fp)})}
w(r);
let has=0,miss=0;
f.forEach(fp=>{
  const c=fs.readFileSync(fp,'utf-8'),rl=p.relative(r,fp);
  if(rl==='help_strings.js'||rl==='ui_strings.js')return;
  const ht=c.includes("role: 'tablist'") || c.includes('role: "tablist"');
  const st=c.includes('setTab(')||c.includes('setActiveTab(');
  if(st&&ht) has++;
  else if(st&&!ht){miss++;console.log('MISSING: '+rl)}
});
console.log('\nHas tablist:',has,', Missing:',miss);
