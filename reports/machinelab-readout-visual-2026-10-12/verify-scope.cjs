// Verify that the visual pass changes only readout(), never machine state or math.
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),path=require('path');
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,baselineCommit='1e708cb5c';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const current=fs.readFileSync(source),other=fs.readFileSync(mirror);
const before=cp.execFileSync('git',['show',baselineCommit+':'+source],{maxBuffer:8*1024*1024});
function withoutReadout(bytes){const s=bytes.toString('utf8'),start=s.indexOf('      function readout() {'),end=s.indexOf('      // The one idea,',start);
  if(start<0||end<start||s.indexOf('      function readout() {',start+1)>=0)throw Error('Readout boundary not unique');
  return s.slice(0,start)+s.slice(end);}
if(!current.equals(other))throw Error('Source mirror differs');
if(withoutReadout(current)!==withoutReadout(before))throw Error('Changed outside readout');
for(const file of [source,mirror])cp.execFileSync(process.execPath,['--check',file],{stdio:'pipe',windowsHide:true});
const result={baselineCommit,baselineSha256:sha(before),sourceSha256:sha(current),mirrorSha256:sha(other),byteParity:true,
  onlyReadoutChanged:true,syntax:true,unchanged:'Physical helpers, station controls, state and grading callbacks, practice labs, saved records, exports, all other views'};
fs.writeFileSync(path.join(__dirname,'source-scope.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
