const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const THREE=require(path.join(process.cwd(),'vendor/three-r128/three.min.js'));
const helper=fs.readFileSync(path.join(__dirname,'artisan-landscape-helper.txt'),'utf8');
const reports=[];
for(const hex of [0x496d46,0x446c58]) {
 const color=new THREE.Color(hex).convertSRGBToLinear();
 const engine={scene:new THREE.Scene(),_horizon:{material:{color}}};
 new Function('THREE','engine','geometryWorldSrgbColor',helper)(THREE,engine,(T,h)=>new T.Color(h).convertSRGBToLinear());
 engine.refreshLandscape({xMin:-4,xMax:24,zMin:-4,zMax:24,y:0});
 const mesh=engine._landscape.children.find(m=>m.name==='gw-rolling-hills');
 const p=mesh.geometry.attributes.position.array,c=mesh.geometry.attributes.color.array;
 let boundaryVertices=0,maxBoundaryDelta=0,maxCrestDelta=0;
 for(let i=0;i<p.length;i+=3) {
  const delta=Math.max(Math.abs(c[i]-color.r),Math.abs(c[i+1]-color.g),Math.abs(c[i+2]-color.b));
  if(p[i+1]<=0.0298){boundaryVertices++;maxBoundaryDelta=Math.max(maxBoundaryDelta,delta);}
  if(p[i+1]>4)maxCrestDelta=Math.max(maxCrestDelta,delta);
 }
 assert.ok(boundaryVertices>=192,'inner and outer low contours are present');
 assert.ok(maxBoundaryDelta<1e-7,'every low terrain vertex exactly matches the current horizon material');
 assert.ok(maxCrestDelta>0.04,'higher hills retain visible moss and crest color');
 reports.push({horizon:hex.toString(16),boundaryVertices,maxBoundaryDelta,maxCrestDelta});
 engine.disposeLandscape();
}
const report={pass:true,reports};
fs.writeFileSync(path.join(__dirname,'artisan-landscape-color-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
