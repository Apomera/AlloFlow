const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {expect}=require('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/@playwright/test');
const work=__dirname,fixture=fs.readFileSync(path.join(work,'firstresponse-arm-preview.spec.ts'),'utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const start=fixture.indexOf('function validArmRanges('),end=fixture.indexOf('\nfor(const view of views)test(',start);
if(start<0||end<start)throw Error('Matcher extraction anchors missing');
const context={expect};vm.createContext(context);
vm.runInContext(fixture.slice(start,end).replace(/:any\b|:string\b/g,''),context);
const clone=value=>JSON.parse(JSON.stringify(value));
function arm(id,segment){
  const side=24*16*6,cap=24*3;
  return {name:'fr-rescuer-'+id+'-'+segment,visible:true,material:{type:'MeshPhongMaterial'},geometry:{
    parameters:{radialSegments:24,heightSegments:16},indexCount:side+cap*2,
    groups:[{start:0,count:side,materialIndex:0},{start:side,count:cap,materialIndex:1},{start:side+cap,count:cap,materialIndex:2}],
    drawRange:{start:0,count:'Infinity'},attributes:{position:{buffer:{hash:'position',bytes:12}},normal:{buffer:{hash:'normal',bytes:12}}}
  }};
}
const before={arms:['lower','upper'].flatMap(id=>['forearm','upper-arm'].map(segment=>arm(id,segment))),joints:[{id:'lower',geometry:{normal:'exact lower wrist normals'},material:'skin',visible:true},{id:'upper',geometry:{normal:'exact upper wrist normals'},material:'skin',visible:true}],draw:{triangles:10000,calls:144,geometries:120,programs:4}};
for(const key of ['wristProjection','elbowProjection','camera','state','preserved','handParts','handProjection','heelProjection','contact','marker','lowerContactGap'])before[key]={unchanged:key};
before.lowerContactGap=0;
const after=clone(before);for(const a of after.arms)a.geometry.drawRange.count=a.geometry.groups[0].count+(a.name.endsWith('-upper-arm')?a.geometry.groups[1].count:0);after.draw.triangles-=144;
function submission(arm){const g=arm.geometry,count=g.drawRange.count==='Infinity'?g.indexCount:Math.min(g.indexCount,g.drawRange.count);return {name:arm.name,group:null,indexCount:g.indexCount,drawRange:clone(g.drawRange),submittedStart:0,submittedCount:count,triangles:count/3};}
before.draw.armSubmissions=before.arms.map(submission);after.draw.armSubmissions=after.arms.map(submission);
context.validArmRanges(before,'baseline');context.validArmRanges(after,'candidate');context.matching(after,before);
const culledBefore=clone(before),culledAfter=clone(after);culledBefore.draw.armSubmissions=culledBefore.draw.armSubmissions.filter(draw=>draw.name.endsWith('-forearm'));culledAfter.draw.armSubmissions=culledAfter.draw.armSubmissions.filter(draw=>draw.name.endsWith('-forearm'));culledAfter.draw.triangles=culledBefore.draw.triangles-96;context.matching(culledAfter,culledBefore);
const negative=[];
function rejected(name,mutate,validate=context.matching){const changed=clone(after);mutate(changed);let message='';try{validate(changed,before);}catch(error){message=error.message;}if(!message)throw Error('Mutation was accepted: '+name);negative.push({name,rejected:true});}
rejected('wrist normals changed',x=>{x.joints[0].geometry.normal='changed';});
rejected('arm vertex buffer changed',x=>{x.arms[0].geometry.attributes.position.buffer.hash='changed';});
rejected('arm normal buffer changed',x=>{x.arms[0].geometry.attributes.normal.buffer.hash='changed';});
rejected('actual rendered triangle reduction missing',x=>{x.draw.triangles++;});
rejected('arm range excludes extra side triangle',x=>{x.arms[0].geometry.drawRange.count-=3;},x=>context.validArmRanges(x,'candidate'));
rejected('camera changed',x=>{x.camera.unchanged='changed';});
rejected('submitted identity changed',x=>{x.draw.armSubmissions[0].name='fr-rescuer-upper-upper-arm';});
rejected('submitted range misreported',x=>{x.draw.armSubmissions[0].submittedCount-=3;});
context.validArmRanges(after,'candidate');context.matching(after,before);
const delta=JSON.parse(fs.readFileSync(path.join(work,'delta.json'),'utf8')),candidateSHA256=sha(fs.readFileSync(path.join(work,'candidate.js'))),runner=fs.readFileSync(path.join(work,'run-arm-browser.cjs'),'utf8');
if(delta.afterSHA256!==candidateSHA256||!runner.includes('delta.afterSHA256!==finalSHA')||runner.includes('delta.afterHash'))throw Error('Candidate pin field is incorrect');
const result={passed:true,browserLaunched:false,fixtureSHA256:sha(fixture),candidateSHA256,baselineInfinityValidated:true,constructedTriangleReduction:144,submittedCases:[{arms:4,exactTriangleReduction:144},{arms:2,exactTriangleReduction:96}],negative,restoredMatcherPassed:true};
fs.writeFileSync(path.join(work,'fixture-contract-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
