const fs=require('fs'),path=require('path'),assert=require('assert/strict'),dir='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/pass-forty-two';
const load=p=>JSON.parse(fs.readFileSync(path.join(dir,p),'utf8')),ansi=/\u001b\[[0-9;]*m/g;
const failures=r=>r.testResults.flatMap(f=>f.assertionResults.filter(a=>a.status==='failed').map(a=>({name:a.fullName,message:a.failureMessages.join('\n').replace(ansi,'')}))).sort((a,b)=>a.name.localeCompare(b.name));
const before=failures(load('baseline-existing-model.json')),after=failures(load('final-existing-cpu.json'));
const comparison=before.map((a,i)=>{const b=after[i];assert.equal(b.name,a.name);const x=a.message.split('\n    at ')[0],y=b.message.split('\n    at ')[0];assert.deepEqual(y,x);return{name:a.name,identicalAssertionMessage:true,assertion:x};});
const pairs=[];for(const [base,current]of [['baseline-model-verified','final-model'],['baseline-detail','final-detail']]){
 const b=load(base+'/capture-manifest.json'),c=load(current+'/capture-manifest.json');assert.equal(b.frames.length,c.frames.length);assert.deepEqual(b.errors,[]);assert.deepEqual(c.errors,[]);assert.deepEqual(b.leaks,[]);assert.deepEqual(c.leaks,[]);
 for(let i=0;i<b.frames.length;i++){const a=b.frames[i],z=c.frames[i];assert.deepEqual(a.view,z.view);for(const key of ['position','quaternion','scale','siphonPosition','siphonQuaternion','camera','cameraTarget'])assert.deepEqual(a.state[key],z.state[key],a.view.name+' '+key);assert.ok(z.state.resourcesRetained&&a.state.resourcesRetained);pairs.push({view:a.view.name,before:base+'/'+a.image,after:current+'/'+z.image,poseAndCameraExactlyMatched:true});}
}
const report={sourceBefore:load('baseline-model-verified/capture-manifest.json').sourceSHA,sourceAfter:load('final-model/capture-manifest.json').sourceSHA,preExistingFailures:comparison,pairedCaptures:pairs};
fs.writeFileSync(path.join(dir,'comparison-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
