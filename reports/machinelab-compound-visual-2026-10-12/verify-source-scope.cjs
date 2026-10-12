const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert');
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source;
const baselineCommit='bd6ca5b84',current=fs.readFileSync(source,'utf8');
const baseline=cp.execFileSync('git',['show',baselineCommit+':'+source],{encoding:'utf8',maxBuffer:8*1024*1024});
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
function region(text,a,b){const start=text.indexOf(a),end=text.indexOf(b,start);assert(start>=0&&end>start);return{start,end,text:text.slice(start,end)};}
const a='      function stationCompoundLab()',b='      function stationDesignLimits()',now=region(current,a,b),old=region(baseline,a,b);
assert.equal(current.slice(0,now.start)+old.text+current.slice(now.end),baseline);
const handlers=region(now.text,'        function change(patch)','        function select(').text;
assert.equal(handlers,region(old.text,'        function change(patch)','        function select(').text);
assert.equal(current,fs.readFileSync(mirror,'utf8'));
const proof={baselineCommit,baselineSha256:sha(baseline),source,publicMirror:mirror,sourceSha256:sha(current),byteParity:true,
  changedRegion:'stationCompoundLab presentation only',outsideRegionByteIdentical:true,changeAndSaveCallbacksByteIdentical:true,callbackSha256:sha(handlers),
  unchanged:'All math helpers, compound models/questions/record validation/export, defaults and other view implementations are outside the changed region.'};
fs.writeFileSync('reports/machinelab-compound-visual-2026-10-12/source-scope.json',JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
