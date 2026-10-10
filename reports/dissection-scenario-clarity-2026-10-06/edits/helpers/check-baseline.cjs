const fs=require('fs'),crypto=require('crypto'),path=require('path'),repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),files=['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js','tests/dissection_lab_improvements.test.js'];
console.log(JSON.stringify(Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(path.join(repo,f)))]))));
