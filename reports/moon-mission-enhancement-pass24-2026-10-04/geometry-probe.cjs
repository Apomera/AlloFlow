const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const repo=path.resolve(__dirname,'../..');
const {JSDOM}=createRequire(path.join(repo,'package.json'))('jsdom');
const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>');dom.window.StemLab={registerTool(){}};
const source=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_moonmission.js'));
vm.runInNewContext(source.toString('utf8'),{window:dom.window,document:dom.window.document,console});
const P=dom.window.MoonMissionPure;
let count=0,maxPlaneError=0,maxRayCrossError=0,maxScaleError=0;
for(const slopeX of [-.2,-.1,0,.1,.2])for(const slopeZ of [-.15,0,.15])for(const height of [.02,1,5,15,50])
for(const position of [-30,0,40])for(const scale of [.1,1,8]){
  const point={x:position,y:35+slopeX*position+height,z:0},plane={x:-slopeX,y:1,z:-slopeZ,constant:-35};
  const sun={x:P.descentSun.x*scale,y:P.descentSun.y*scale,z:P.descentSun.z*scale};
  const q=P.projectDescentShadow(point,plane,sun);assert(q);
  const planeError=Math.abs(plane.x*q.x+plane.y*q.y+plane.z*q.z+plane.constant);maxPlaneError=Math.max(maxPlaneError,planeError);
  const dx=q.x-point.x,dy=q.y-point.y,dz=q.z-point.z;
  const cx=dy*sun.z-dz*sun.y,cy=dz*sun.x-dx*sun.z,cz=dx*sun.y-dy*sun.x;
  maxRayCrossError=Math.max(maxRayCrossError,Math.hypot(cx,cy,cz)/Math.hypot(sun.x,sun.y,sun.z));
  const reference=P.projectDescentShadow(point,plane);
  maxScaleError=Math.max(maxScaleError,Math.hypot(q.x-reference.x,q.y-reference.y,q.z-reference.z));count++;
}
let supportCount=0,maxSupportError=0;
for(let b=0;b<=140;b++)for(let h=0;h<=40;h++){
  const bank=-.35+b*.7/140,clearance=h*3.5,surface=332,pose=P.descentSidePose(surface,clearance,bank);
  const gaps=pose.pads.map(p=>surface-p.y-p.radius);
  const error=Math.abs(Math.min(...gaps)-clearance);maxSupportError=Math.max(maxSupportError,error);
  assert(gaps.every(g=>g>=clearance-1e-9));supportCount++;
}
assert(maxPlaneError<1e-10);assert(maxRayCrossError<1e-10);assert(maxScaleError<1e-10);assert(maxSupportError<1e-10);
const report={sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),rayProjectionCases:count,
  maxPlaneResidualSceneUnits:maxPlaneError,maxIncidentRayCrossErrorSceneUnits:maxRayCrossError,maxSunScaleDifferenceSceneUnits:maxScaleError,
  supportCases:supportCount,maxMinimumPadClearanceErrorPixels:maxSupportError,
  receivingSurface:'Actual terrain and rocks in both WebGL tiers; low-power/reduced-motion uses one merged caster and a 256-pixel depth map.',
  sunDirection:P.descentSun,physicalAltitudeCompressedInScene:true,flightIntegratorChanged:false,
  sources:['https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.summary.html','https://svs.gsfc.nasa.gov/3620/']};
fs.writeFileSync(path.join(repo,'reports/moon-mission-enhancement-pass24-2026-10-04/geometry-probe.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));dom.window.close();
