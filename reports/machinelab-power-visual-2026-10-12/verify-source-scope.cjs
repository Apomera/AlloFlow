const fs=require('fs'),cp=require('child_process'),assert=require('assert'),crypto=require('crypto');
const out='reports/machinelab-power-visual-2026-10-12',source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,baselineCommit='697803f50';
const current=fs.readFileSync(source,'utf8'),baseline=cp.execFileSync('git',['show',baselineCommit+':'+source],{encoding:'utf8',maxBuffer:8*1024*1024});
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
function region(text,a,b){const start=text.indexOf(a),end=text.indexOf(b,start);assert(start>=0&&end>start);return{start,end,text:text.slice(start,end)};}
const a='      function stationPowerLab()',b='      function compoundPowerKinds()',now=region(current,a,b),old=region(baseline,a,b);
assert.equal(current.slice(0,now.start)+old.text+current.slice(now.end),baseline);
assert.equal(region(now.text,'        function change(patch)','        function input(').text,region(old.text,'        function change(patch)','        function input(').text);
assert.equal(region(now.text,"            h('div', { key: 'pace-wrap'",'        function practice()').text,region(old.text,"            h('div', { key: 'pace-wrap'",'        function practice()').text);
assert.equal(current,fs.readFileSync(mirror,'utf8'));
const proof={baselineCommit,baselineSha256:hash(baseline),source,mirror,sourceSha256:hash(current),byteParity:true,outsidePowerLabByteIdentical:true,changeAndSaveCallbacksByteIdentical:true,originalPaceTableByteIdentical:true,
  scope:'Presentation only inside stationPowerLab. All math helpers, question/record functions, defaults, compound lab and other views are outside this region.'};
fs.writeFileSync(out+'/source-scope.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
