const fs=require('fs'),path=require('path');
let s=fs.readFileSync(path.join(__dirname,'record-pass3.cjs'),'utf8');
s=s.replaceAll('pass3-final-tests.json','pass4-final-tests.json').replaceAll('pass3-browser-qa.json','pass4-browser-qa.json').replaceAll('PASS3-VALIDATION.json','PASS4-VALIDATION.json').replace('pass:3','pass:4').replace('if(r.numFailedTests','if(!r.success||r.numFailedTests');
fs.writeFileSync(path.join(__dirname,'record-pass4.cjs'),s);
