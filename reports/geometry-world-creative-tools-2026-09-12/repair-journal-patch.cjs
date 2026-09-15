const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'apply-activity-journal.cjs');let s=fs.readFileSync(file,'utf8');
const from=s.indexOf('  replace("      + \'The final activity'),to=s.indexOf('  const planned=',from);if(from<0||to<from)throw Error('Missing prompt replacement region');
s=s.slice(0,from)+`  replace("      + 'The final activity should reuse earlier ideas in a design the student can showcase or send to Print Lab.\\\\n';",payload('activity-goal-prompt.js').trimEnd());\n`+s.slice(to);
s=s.replace('fn(replace,()=>text);new Function(text);','fn(replace,()=>text);new Function(text);if(process.argv.includes(\'--check\'))return;');
const fd=fs.openSync(file,'r+');try{fs.writeSync(fd,s,0,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
new Function(s);console.log('Patch script repaired and syntax checked.');
