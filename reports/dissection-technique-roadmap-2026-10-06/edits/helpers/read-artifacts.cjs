const fs=require('fs'),path=require('path');
for(const f of ['renderer-edits.json','unit-work/unit-edits.json']){const j=JSON.parse(fs.readFileSync(path.join(__dirname,f)));console.log(f,Object.keys(j));console.log('edit shape',Object.keys((j.edits||j)[0]));}
const report='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-technique-roadmap-2026-10-06';
const b=JSON.parse(fs.readFileSync(path.join(report,'workspace-before.json')));console.log('baseline',JSON.stringify(b,null,2));
