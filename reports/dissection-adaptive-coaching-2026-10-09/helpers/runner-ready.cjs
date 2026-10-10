const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const file=path.join(__dirname,'run.cjs'),before=fs.readFileSync(file,'utf8');
const needle='adaptive coaching|checkpoint coaching|monitor handoff';assert(before.includes(needle));
fs.writeFileSync(file,before.replace(needle,needle+'|persistent, accessible procedural instrument|renders guided instruments'));
console.log('Included both existing coaching regression cases.');
