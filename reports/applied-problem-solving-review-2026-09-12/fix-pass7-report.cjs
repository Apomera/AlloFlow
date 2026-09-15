const fs=require('fs');const file=__dirname+'/finalize-pass7.cjs';
let source=fs.readFileSync(file,'utf8');
source=source.split('\n').map(line=>line.startsWith('- Mobile final-review layout')?line.replaceAll(String.fromCharCode(96),''):line).join('\n');
fs.writeFileSync(file,source);
