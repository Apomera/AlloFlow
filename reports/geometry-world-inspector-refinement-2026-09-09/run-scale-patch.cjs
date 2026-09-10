const fs=require('node:fs'),path=require('node:path');
let script=fs.readFileSync(path.join(__dirname,'apply-print-scale.cjs'),'utf8');
script=script.replace("let text=fs.readFileSync(file,'utf8');","let text=fs.readFileSync(file,'utf8');const newline=text.includes('\\r\\n')?'\\r\\n':'\\n';text=text.replace(/\\r\\n/g,'\\n');");
script=script.replace('for(const dest of [file,',"text=text.replace(/\\n/g,newline);\nfor(const dest of [file,");
eval(script);
