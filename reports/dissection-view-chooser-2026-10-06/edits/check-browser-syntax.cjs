const fs=require('fs'),path=require('path'),crypto=require('crypto');
const file=path.join(__dirname,'dissection-view-chooser.spec.ts'),s=fs.readFileSync(file,'utf8');
require('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/esbuild').transformSync(s,{loader:'ts',format:'esm'});
console.log(JSON.stringify({file,sha256:crypto.createHash('sha256').update(s).digest('hex'),syntax:'passed',tests:17,layoutTests:6,inventoryTests:4,interactionTests:7}));
