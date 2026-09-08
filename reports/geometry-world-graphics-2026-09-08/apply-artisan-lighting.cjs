const fs=require('node:fs');
const paths=['stem_lab/stem_tool_geometryworld.js','desktop/web-app/public/stem_lab/stem_tool_geometryworld.js'];
let source=fs.readFileSync(paths[0],'utf8');
const changes=[
  ['sunIntensity: 1.05, ambientIntensity: 0.30, hemi: 0.42, sunEl: 58','sunIntensity: 1.0, ambientIntensity: 0.20, hemi: 0.32, sunEl: 48'],
  ['sunIntensity: 1.0, ambientIntensity: 0.4, hemi: 0.34, sunEl: 20','sunIntensity: 1.0, ambientIntensity: 0.22, hemi: 0.28, sunEl: 20'],
  ['new THREE.AmbientLight(0xffffff, 0.30)','new THREE.AmbientLight(0xffffff, 0.20)'],
  ['engine._sunAngles = { el: 58, az: 45 };','engine._sunAngles = { el: 48, az: 45 };'],
  ['var sun0 = geometryWorldSunVector(58, 45);','var sun0 = geometryWorldSunVector(48, 45);'],
  ['sun.shadow.bias = -0.0005;','sun.shadow.bias = -0.00012;'],
  ['sun.shadow.normalBias = 0.02;','sun.shadow.normalBias = 0.012;'],
  ['new THREE.HemisphereLight(0xb5d4ed, 0x485c48, 0.42)','new THREE.HemisphereLight(0xb5d4ed, 0x485c48, 0.32)'],
  ['var rim = new THREE.DirectionalLight(0xc0d8ff, 0.25);','var rim = new THREE.DirectionalLight(0xc0d8ff, 0.16);']
];
for(const [before,after] of changes){
  if(source.split(before).length!==2)throw new Error('Expected exactly one lighting anchor: '+before);
  source=source.replace(before,after);
}
new Function(source);
for(const file of paths){const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);}
console.log(JSON.stringify({updated:changes.length,sourceParses:true,mirrorMatches:fs.readFileSync(paths[0]).equals(fs.readFileSync(paths[1]))}));
