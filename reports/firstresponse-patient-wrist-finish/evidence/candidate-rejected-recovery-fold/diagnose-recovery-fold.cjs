const fs=require('node:fs'),path=require('node:path');
const checker=fs.readFileSync(path.join(__dirname,'verify-patient-wrist-palm.cjs'),'utf8');
const prefix=checker.slice(0,checker.indexOf('const results=[],negative=[];'));
if(!prefix||prefix===checker)throw Error('Checker extraction failed');
const diagnostic=String.raw`
const findings=[];
for(const age of ['adult','child','infant']){
  const prior=build(priorConfig,age,8,false),current=build(currentConfig,age,8,false);
  try{for(const side of ['left','right']){
    const wrist=current.scene.getObjectByName('fr-patient-'+side+'-wrist'),old=prior.scene.getObjectByName(wrist.name);
    const p=wrist.geometry.attributes.position,n=wrist.geometry.attributes.normal,bn=old.geometry.attributes.normal,idx=wrist.geometry.index.array,normalMatrix=new THREE.Matrix3().getNormalMatrix(wrist.matrix);
    const faces=[];
    for(let i=0;i<idx.length;i+=3){
      const ids=Array.from(idx.slice(i,i+3)),[a,b,c]=ids.map(id=>new THREE.Vector3().fromBufferAttribute(p,id).applyMatrix4(wrist.matrix));
      const face=b.sub(a).cross(c.sub(a)).normalize(),sum=new THREE.Vector3(),oldSum=new THREE.Vector3();
      for(const id of ids){sum.add(new THREE.Vector3().fromBufferAttribute(n,id).applyMatrix3(normalMatrix).normalize());oldSum.add(new THREE.Vector3().fromBufferAttribute(bn,id).applyMatrix3(normalMatrix).normalize());}
      const beforeDot=face.dot(oldSum.normalize()),afterDot=face.dot(sum.normalize());
      if((beforeDot<0&&afterDot<beforeDot-1e-7)||(beforeDot>=0&&afterDot<=0))faces.push({index:i/3,ids,rows:ids.map(id=>Math.floor(id/wrist.geometry.parameters.radialSegments)),lanes:ids.map(id=>id%wrist.geometry.parameters.radialSegments),beforeDot,afterDot,vertices:ids.map(id=>({id,position:Array.from(p.array.slice(id*3,id*3+3)),before:Array.from(bn.array.slice(id*3,id*3+3)),after:Array.from(n.array.slice(id*3,id*3+3))}))});
    }
    findings.push({age,side,faces});
  }}finally{dispose(prior);dispose(current);}
}
const report={beforeSHA256:hash(before),candidateSHA256:hash(candidate),findings};
fs.writeFileSync(path.join(out,'recovery-fold-diagnosis.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
`;
new Function('require','__dirname','__filename',prefix+diagnostic)(require,__dirname,__filename);
