const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const work=__dirname,old=path.resolve(work,'../firstresponse-patient-wrist-finish-work');
function replaceOnce(s,a,b){assert.equal(s.split(a).length,2,a);return s.replace(a,b);}
for(const name of ['face-capture-png.cjs','face-mount-window.cjs','playwright-face.config.cjs']){const target=path.join(work,name);assert.ok(!fs.existsSync(target));fs.copyFileSync(path.join(old,name),target);}
let s=fs.readFileSync(path.join(old,'firstresponse-face-preview.spec.ts'),'utf8');
s=s.replaceAll('69d2407c26ddf3e3c5d7ee112622d0dab8613926e34b7d61af9f2e17f1317242','147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891');
s=replaceOnce(s,"height:1080,pose:5,contrast:false","height:1080,pose:8,contrast:false");
const start=s.indexOf('      var exactScene=[],wristBuffers='),end=s.indexOf('      function visitExact',start);assert.ok(start>0&&end>start);
s=s.slice(0,start)+`      var exactScene=[],palmBuffers=[],noseMaterial=null,headMaterial=model.getObjectByName('fr-manikin-head').material;
      function palmGeometry(o){
        var descriptor=exactGeometry(o.geometry),name=o.name;
        var isPalm=name==='fr-patient-right-palm'||name==='fr-rescuer-upper-palm';
        var isWrist=name==='fr-patient-right-wrist';
        var isCrease=name==='fr-patient-right-palm-crease'||name==='fr-patient-right-thumb-crease';
        if(!isPalm&&!isWrist&&!isCrease)return descriptor;
        var record={name:name,normal:null,index:null,position:null,path:null},a=o.geometry.attributes.normal,minLength=Infinity,maxLength=0;
        if(!a||a.itemSize!==3||a.count!==o.geometry.attributes.position.count)throw Error('Missing scoped normal '+name);
        for(var i=0;i<a.count;i++){var x=a.getX(i),y=a.getY(i),z=a.getZ(i),length=Math.sqrt(x*x+y*y+z*z);if(!isFinite(length)||Math.abs(length-1)>1e-5)throw Error('Invalid scoped unit normal '+name);minLength=Math.min(minLength,length);maxLength=Math.max(maxLength,length);}
        record.normal=JSON.parse(JSON.stringify(descriptor.attributes.normal));record.minLength=minLength;record.maxLength=maxLength;record.finiteUnitNormals=true;
        descriptor.attributes.normal.buffer={hash:'[allowed palm symmetry normal]',bytes:a.array.byteLength};
        if(isPalm){
          var index=o.geometry.index;if(!index)throw Error('Missing palm index '+name);
          for(var i=0;i<index.count;i++)if(!Number.isInteger(index.getX(i))||index.getX(i)<0||index.getX(i)>=a.count)throw Error('Invalid palm index '+name);
          record.index=JSON.parse(JSON.stringify(descriptor.index));record.indexCount=descriptor.indexCount;record.validIndices=true;
          descriptor.index={hash:'[allowed mirrored palm index]',bytes:index.array.byteLength};
        }
        if(isCrease){
          var p=o.geometry.attributes.position;for(var i=0;i<p.count;i++)if(!isFinite(p.getX(i)+p.getY(i)+p.getZ(i)))throw Error('Non-finite crease position '+name);
          record.position=JSON.parse(JSON.stringify(descriptor.attributes.position));record.finitePositions=true;
          descriptor.attributes.position.buffer={hash:'[allowed fitted crease position]',bytes:p.array.byteLength};
          var points=descriptor.parameters.path.points;
          if(!Array.isArray(points)||points.length!==49||points.some(function(p){return !isFinite(p.x+p.y+p.z);}))throw Error('Invalid crease path '+name);
          record.path=JSON.parse(JSON.stringify(points));
          descriptor.parameters.path.points=points.map(function(p){return {x:p.x,y:'[allowed fitted crease height]',z:p.z};});
        }
        palmBuffers.push(record);return descriptor;
      }
`+s.slice(end);
s=replaceOnce(s,'geometry:o.geometry?wristGeometry(o):null','geometry:o.geometry?palmGeometry(o):null');
s=s.replaceAll('wristBuffers','palmBuffers');
s=replaceOnce(s,"wristProjection:projected(hand.getObjectByName('fr-patient-right-wrist'))","palmProjection:projected(hand,function(o){return o.name==='fr-patient-right-palm'||o.name==='fr-patient-right-palm-crease'||o.name==='fr-patient-right-thumb-crease';})");
s=s.replaceAll('wristProjection','palmProjection').replaceAll("'-wrist.png'","'-palm.png'").replaceAll('patient wrist finish','patient palm symmetry');
assert.ok(!fs.existsSync(path.join(work,'firstresponse-face-preview.spec.ts')));fs.writeFileSync(path.join(work,'firstresponse-face-preview.spec.ts'),s);
let runner=fs.readFileSync(path.join(old,'run-face-browser.cjs'),'utf8').replaceAll('69d2407c26ddf3e3c5d7ee112622d0dab8613926e34b7d61af9f2e17f1317242','147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891');
runner=runner.replaceAll('-wrist.png','-palm.png').replaceAll('wristA','palmA').replaceAll('wristB','palmB').replaceAll('wristChangedPixels','palmChangedPixels').replaceAll('wristTotalPixels','palmTotalPixels').replaceAll('Wrist','Palm').replaceAll('wrist crops','palm crops');
assert.ok(!fs.existsSync(path.join(work,'run-face-browser.cjs')));fs.writeFileSync(path.join(work,'run-face-browser.cjs'),runner);
console.log('Authored private native palm fixture; no browser launched');
