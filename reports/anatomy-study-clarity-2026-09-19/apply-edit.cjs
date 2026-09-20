const fs=require('fs');
let script=fs.readFileSync(__dirname+'/edit.cjs','utf8');
script=script.replace("let s=fs.readFileSync(file,'utf8');", "let s=fs.readFileSync(file,'utf8').replace(/\\r\\n/g,'\\n');");
script=script.replace('function replace(a,b){',"function replace(a,b){a=a.replace(/\\r\\n/g,'\\n');");
new Function('require','__dirname',script)(require,__dirname);
