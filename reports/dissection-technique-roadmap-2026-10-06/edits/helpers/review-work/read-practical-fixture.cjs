const fs=require('fs'),path=require('path');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const mode=process.argv[2]||'unit';
const files={unit:'tests/dissection_lab_improvements.test.js',source:'stem_lab/stem_tool_dissection.js',browser:'tests/e2e/dissection-technique-roadmap.spec.ts'};
const lines=fs.readFileSync(path.join(repo,files[mode]),'utf8').split('\n');
const ranges=mode==='unit'?[[6092,6212],[8388,8403]]:mode==='source'?[[19740,19760],[19820,19855]]:[[185,212]];
for(const [s,e]of ranges)console.log(lines.slice(s-1,e).map((line,i)=>`${s+i}: ${line}`).join('\n'));
