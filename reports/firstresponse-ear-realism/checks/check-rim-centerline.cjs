const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',source=fs.readFileSync(path.join(__dirname,'candidate.js'),'utf8'),THREE={};
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
assert.equal(sha(source),'24dbe22375df2c8c3e7739d00d4621f4cc2c1e4db68d2bb05dfd15cca56c8a8a');
new Function('exports','module',fs.readFileSync(path.join(repo,'vendor/three-r128/three.min.js'),'utf8'))(THREE,{exports:THREE});
let config;global.window={StemLab:{isRegistered:()=>false,registerTool(){},makeBayViewer(c){config=c;return{attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}}};new Function(source)();
const metrics=[];let assertions=0;
for(const age of ['adult','child','infant'])for(const phase of [0,8]){
 const scene=new THREE.Scene(),content=config.buildScene(THREE,{scene,phase,dark:true,contrast:false,wantShadow:false,trim:color=>new THREE.MeshPhongMaterial({color}),sceneProps:{age,tab:'recovery'}});content.frame(0,{},true);scene.updateMatrixWorld(true);
 for(const side of ['left','right']){
  const ear=scene.getObjectByName('fr-manikin-ear-'+side),base=scene.getObjectByName(ear.name+'-base'),rim=scene.getObjectByName(ear.name+'-helix');
  const scale=ear.getWorldScale(new THREE.Vector3()).x,outward=new THREE.Vector3(side==='left'?-1:1,0,0).transformDirection(ear.matrixWorld),gaps=[];
  // Preserve the depth-explorer's original40 between-section samples and limits.
  for(const point of Array.from({length:40},(_,i)=>rim.geometry.parameters.path.getPoint((i+.5)/40))){
   const world=point.clone().applyMatrix4(rim.matrixWorld),hit=new THREE.Raycaster(world.clone().addScaledVector(outward,.1*scale),outward.clone().negate()).intersectObject(base,false)[0];
   assertions++;assert.ok(hit,'ear rim lost the ear surface');const gap=hit.distance-.1*scale;
   assertions++;assert.ok(gap>-.001*scale,`${age}/${phase}/${side}: centreline gap ${gap/scale} > -.001`);
   assertions++;assert.ok(gap<.008*scale,`${age}/${phase}/${side}: centreline gap ${gap/scale} < .008`);gaps.push(gap/scale);
  }
  metrics.push({age,phase,side,samples:40,minimumEarLocalGap:Math.min(...gaps),maximumEarLocalGap:Math.max(...gaps)});
 }
 const geos=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)mats.add(m);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
}
const output={passed:true,checkerSHA256:sha(fs.readFileSync(__filename)),candidateSHA256:sha(source),originalFixture:'tests/firstresponse_depth_explorer.test.js:86',originalFixtureSHA256:sha(fs.readFileSync(path.join(repo,'tests/firstresponse_depth_explorer.test.js'))),cases:6,sampledRays:480,assertions,minimumEarLocalGap:Math.min(...metrics.map(m=>m.minimumEarLocalGap)),maximumEarLocalGap:Math.max(...metrics.map(m=>m.maximumEarLocalGap)),metrics};
fs.writeFileSync(path.join(__dirname,'rim-centerline-verification.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));
