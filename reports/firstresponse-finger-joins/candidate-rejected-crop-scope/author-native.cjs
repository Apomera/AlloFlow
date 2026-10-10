const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const work=__dirname,old=path.resolve(work,'../firstresponse-palm-symmetry-work');
const baselineSHA='dfe3e01f38a419187e468c749cc37827f486a47401b9916afaa9ec6f98a3f86a';
function replaceOnce(s,a,b){assert.equal(s.split(a).length,2,a);return s.replace(a,b);}
function write(name,value){const target=path.join(work,name);assert.ok(!fs.existsSync(target),'private output already exists '+name);fs.writeFileSync(target,value);}
for(const name of ['face-capture-png.cjs','face-mount-window.cjs','playwright-face.config.cjs'])write(name,fs.readFileSync(path.join(old,name)));
let s=fs.readFileSync(path.join(old,'firstresponse-face-preview.spec.ts'),'utf8').replaceAll('147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891',baselineSHA);
const start=s.indexOf('      var exactScene=[],palmBuffers='),end=s.indexOf('      function visitExact',start);assert.ok(start>0&&end>start);
s=s.slice(0,start)+`      var exactScene=[],fingerBuffers=[],noseMaterial=null,headMaterial=model.getObjectByName('fr-manikin-head').material;
      var fingerNames=['fr-patient-left-finger-0-surface','fr-patient-left-finger-1-surface','fr-patient-left-finger-2-surface','fr-patient-left-finger-3-surface','fr-patient-right-finger-0-surface','fr-patient-right-finger-1-surface','fr-patient-right-finger-2-surface','fr-patient-right-finger-3-surface'];
      function fingerGeometry(o){
        var descriptor=exactGeometry(o.geometry),name=o.name;
        if(fingerNames.indexOf(name)<0)return descriptor;
        var a=o.geometry.attributes.normal,p=o.geometry.attributes.position,index=o.geometry.index,minLength=Infinity,maxLength=0;
        if(!a||a.itemSize!==3||a.count!==p.count)throw Error('Missing scoped normal '+name);
        for(var i=0;i<a.count;i++){var x=a.getX(i),y=a.getY(i),z=a.getZ(i),length=Math.sqrt(x*x+y*y+z*z);if(!isFinite(length)||Math.abs(length-1)>1e-5)throw Error('Invalid scoped unit normal '+name);minLength=Math.min(minLength,length);maxLength=Math.max(maxLength,length);}
        if(!index||index.count%3!==0)throw Error('Missing complete finger triangles '+name);
        for(var i=0;i<index.count;i++)if(!Number.isInteger(index.getX(i))||index.getX(i)<0||index.getX(i)>=a.count)throw Error('Invalid finger index '+name);
        var backwards=[],degenerate=[],minFaceDot=Infinity,v0=new T.Vector3(),v1=new T.Vector3(),v2=new T.Vector3(),face=new T.Vector3(),average=new T.Vector3(),normal=new T.Vector3();
        for(var i=0;i<index.count;i+=3){var ia=index.getX(i),ib=index.getX(i+1),ic=index.getX(i+2);v0.fromBufferAttribute(p,ia);v1.fromBufferAttribute(p,ib);v2.fromBufferAttribute(p,ic);face.subVectors(v1,v0).cross(v2.sub(v0));
          if(face.lengthSq()<1e-24){degenerate.push(i/3);continue;}face.normalize();average.fromBufferAttribute(a,ia).add(normal.fromBufferAttribute(a,ib)).add(normal.fromBufferAttribute(a,ic));
          if(average.lengthSq()<1e-24)throw Error('Cancelling finger triangle normals '+name);var dot=average.normalize().dot(face);if(!isFinite(dot))throw Error('Invalid finger triangle normal '+name);minFaceDot=Math.min(minFaceDot,dot);if(dot<-1e-5)backwards.push(i/3);
        }
        fingerBuffers.push({name:name,normal:JSON.parse(JSON.stringify(descriptor.attributes.normal)),minLength:minLength,maxLength:maxLength,finiteUnitNormals:true,validIndices:true,triangleCount:index.count/3,minFaceDot:minFaceDot,backwardsTriangles:backwards,degenerateTriangles:degenerate});
        descriptor.attributes.normal.buffer={hash:'[allowed patient finger join normal]',bytes:a.array.byteLength};return descriptor;
      }
`+s.slice(end);
s=replaceOnce(s,'geometry:o.geometry?palmGeometry(o):null','geometry:o.geometry?fingerGeometry(o):null');
s=s.replaceAll('palmBuffers','fingerBuffers');
s=replaceOnce(s,"palmProjection:projected(hand.getObjectByName('fr-patient-right-palm'))","fingerProjection:projected(hand,function(o){return o.name==='fr-patient-right-palm'||['fr-patient-right-finger-0-surface','fr-patient-right-finger-1-surface','fr-patient-right-finger-2-surface','fr-patient-right-finger-3-surface'].indexOf(o.name)>=0;})");
s=s.replaceAll('palmProjection','fingerProjection').replaceAll("'-palm.png'","'-fingers.png'").replaceAll('patient palm symmetry','patient finger joins');
write('firstresponse-face-preview.spec.ts',s);
let runner=fs.readFileSync(path.join(old,'run-face-browser.cjs'),'utf8').replaceAll('147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891',baselineSHA);
runner=runner.replaceAll('-palm.png','-fingers.png').replaceAll('palmA','fingerA').replaceAll('palmB','fingerB').replaceAll('palmChangedPixels','fingerChangedPixels').replaceAll('palmTotalPixels','fingerTotalPixels').replaceAll('Palm','Finger').replaceAll('palm crops','finger crops');
runner=runner.replaceAll('if(!pair[0].contrast&&changedPixels===0)','if(changedPixels===0)').replaceAll('if(!pair[0].contrast&&fingerChangedPixels===0)','if(fingerChangedPixels===0)');
runner=replaceOnce(runner,'    pixelComparisons.push({id,contrast:pair[0].contrast,changedPixels,totalPixels:a.width*a.height,fingerChangedPixels,fingerTotalPixels:fingerA.width*fingerA.height});}',`    const clip=pair[0].detail.clip,stageClip=pair[0].captureInfo.stageClip,crop={x:clip.x-stageClip.x,y:clip.y-stageClip.y,width:clip.width,height:clip.height};
    if(!Number.isInteger(crop.x)||!Number.isInteger(crop.y)||crop.x<0||crop.y<0||crop.x+crop.width>a.width||crop.y+crop.height>a.height)throw Error('Invalid stage-relative finger crop '+id);
    let outsideCropChangedPixels=0;for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){if(x>=crop.x&&x<crop.x+crop.width&&y>=crop.y&&y<crop.y+crop.height)continue;const i=(y*a.width+x)*4;if(!a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4)))outsideCropChangedPixels++;}
    if(outsideCropChangedPixels!==0)throw Error('Changed pixels outside finger crop '+id+': '+outsideCropChangedPixels);
    pixelComparisons.push({id,contrast:pair[0].contrast,changedPixels,totalPixels:a.width*a.height,fingerChangedPixels,fingerTotalPixels:fingerA.width*fingerA.height,outsideCropChangedPixels,crop});}`);
write('run-face-browser.cjs',runner);
console.log('Authored private native patient finger fixture; no browser launched');
