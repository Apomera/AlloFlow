'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname,hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const baselineHash='6f1267255407b7de52bb685922281301fef58de9c91cc8a036577a7c317e56e8',baseline=fs.readFileSync(path.join(repo,'stem_lab/universe_flight_scene.js'),'utf8');
assert.equal(hash(baseline),baselineHash,'Frozen enhancement58 baseline');
const routeCode=`  // A camera passage through the same tilted procedural disk. The route
  // follows a teaching view, not a gravitational orbit or a spacecraft course.
  // Its finite source-frame height exposes actual foreground/background depth.
  var DISK_FLYBY = (function () {
    var tilt=0.88,turn=-0.22,ct=Math.cos(tilt),st=Math.sin(tilt),cr=Math.cos(turn),sr=Math.sin(turn);
    var arm=LANDMARKS.galaxy.filter(function(item){return item.id==='inner-arm';})[0].position;
    function world(point) {
      var y=point[1]*ct-point[2]*st,z=point[1]*st+point[2]*ct;
      return [point[0]*cr-y*sr,point[0]*sr+y*cr,z];
    }
    var nodes=[[56000,15000,-38000],[42000,6000,-23000],[34500,624,-9500],[27000,-624,4000],[23000,-5200,15000],[12000,-27000,45000],[-32000,-60000,88000]];
    var tangents=[[-16000,-11000,16000],[-13000,-10000,18000],[-11500,-1700,15000],[-8500,-1500,14000],[-6500,-11000,20000],[-18000,-28000,44000],[-53000,-26000,42000]];
    var times=[0,7,13,21,27,35,44],samples=[],joins=[0],length=0,previous;
    function curve(segment,u) {
      var u2=u*u,u3=u2*u;
      return world(nodes[segment].map(function(value,i){
        return (2*u3-3*u2+1)*value+(u3-2*u2+u)*tangents[segment][i]+(-2*u3+3*u2)*nodes[segment+1][i]+(u3-u2)*tangents[segment+1][i];
      }));
    }
    for(var segment=0;segment<nodes.length-1;segment++) {
      for(var step=segment?1:0;step<=256;step++) {
        var position=curve(segment,step/256);
        if(previous)length+=Math.hypot(position[0]-previous[0],position[1]-previous[1],position[2]-previous[2]);
        samples.push({distance:length,parameter:segment+step/256});previous=position;
      }
      joins.push(length);
    }
    // Monotone distance timing starts and finishes at rest. The crossing is
    // slower than the outer sweep and the longer final panorama departure.
    var slopes=[0],rates=[];
    for(var interval=0;interval<times.length-1;interval++)rates.push((joins[interval+1]-joins[interval])/(times[interval+1]-times[interval]));
    for(var j=1;j<times.length-1;j++) {
      var left=times[j]-times[j-1],right=times[j+1]-times[j],w1=2*right+left,w2=right+2*left;
      slopes.push((w1+w2)/(w1/rates[j-1]+w2/rates[j]));
    }
    slopes.push(0);
    function atTime(seconds) {
      var elapsed=clamp(finite(seconds,0),0,44),interval=0;
      while(interval<times.length-2&&elapsed>times[interval+1])interval++;
      var width=times[interval+1]-times[interval],u=(elapsed-times[interval])/width,u2=u*u,u3=u2*u;
      var distance=(2*u3-3*u2+1)*joins[interval]+(u3-2*u2+u)*width*slopes[interval]+(-2*u3+3*u2)*joins[interval+1]+(u3-u2)*width*slopes[interval+1];
      distance=clamp(distance,joins[interval],joins[interval+1]);
      var low=0,high=samples.length-1;
      while(high-low>1){var mid=Math.floor((low+high)/2);if(samples[mid].distance<distance)low=mid;else high=mid;}
      var a=samples[low],b=samples[high],fraction=b.distance>a.distance?(distance-a.distance)/(b.distance-a.distance):0;
      var parameter=a.parameter+(b.parameter-a.parameter)*fraction,part=Math.min(nodes.length-2,Math.floor(parameter));
      var position=curve(part,parameter-part),blend=clamp((elapsed-24)/10,0,1);blend=blend*blend*(3-2*blend);
      var aim=arm.map(function(value){return value*(1-blend);}),direction=aim.map(function(value,i){return value-position[i];});
      var yaw=Math.atan2(direction[0],direction[2]),pitch=Math.atan2(direction[1],Math.hypot(direction[0],direction[2]));
      var pace=((6*u2-6*u)*joins[interval]+(3*u2-4*u+1)*width*slopes[interval]+(-6*u2+6*u)*joins[interval+1]+(3*u2-2*u)*width*slopes[interval+1])/width;
      return {position:position,yaw:yaw,pitch:pitch,distance:distance,pace:Math.max(0,pace),phase:elapsed>=44?'complete':elapsed>=35?'reveal':elapsed>=27?'turn':elapsed>=21?'emerge':elapsed>=13?'crossing':elapsed>=7?'descent':'approach'};
    }
    return {id:'disk',name:'Spiral disk passage',region:'galaxy',durationSeconds:44,position:world(nodes[0]),aim:arm.slice(),fov:64,targetId:'inner-arm',atTime:atTime};
  })();
`;
const additions=`  DISK_FLYBY.completionTargetId = 'galactic-center';
  DISK_FLYBY.completionMessage = 'Spiral disk passage complete. Travel is paused beyond the tilted disk; look back across the galaxy or explore another destination.';
  DISK_FLYBY.highlights = [
    {id:'arms',name:'Above the spiral arms',seconds:10,targetId:'inner-arm',description:'Look toward the inner arm from above the generated disk.'},
    {id:'crossing',name:'Inside the stellar disk',seconds:17,targetId:'inner-arm',description:'Pause among the existing three-dimensional stars and emission records as the camera crosses the disk.'},
    {id:'panorama',name:'Beyond the disk',seconds:40,targetId:'galactic-center',description:'Look back at the spiral after emerging on the other side of the tilted disk.'}
  ];
`;
const replacements=[
  {before:'  var FLYBY_ROUTES = {halo:HALO_FLYBY,nebula:NEBULA_FLYBY,group:GROUP_FLYBY,stellar:STELLAR_FLYBY};',after:routeCode+'  var FLYBY_ROUTES = {halo:HALO_FLYBY,nebula:NEBULA_FLYBY,group:GROUP_FLYBY,stellar:STELLAR_FLYBY,disk:DISK_FLYBY};'},
  {before:'  // Integrate a smooth velocity ramp analytically in authored route seconds.',after:additions+'  // Integrate a smooth velocity ramp analytically in authored route seconds.'}
];
let candidate=baseline;
for(const replacement of replacements){assert.equal(candidate.split(replacement.before).length,2);candidate=candidate.replace(replacement.before,replacement.after);}
let inverse=candidate;for(const replacement of replacements.slice().reverse()){assert.equal(inverse.split(replacement.after).length,2);inverse=inverse.replace(replacement.after,replacement.before);}assert.equal(inverse,baseline);
fs.writeFileSync(path.join(stage,'baseline-renderer.js'),baseline);fs.writeFileSync(path.join(stage,'candidate-renderer.js'),candidate);
const manifest={completed:true,actualBuildDriver:__filename,actualBuildDriverHash:hash(fs.readFileSync(__filename)),baseline:baselineHash,candidate:hash(candidate),inverseExact:true,replacements,design:{sourceRadiusLy:52000,sourceTilt:.88,sourceTurn:-.22,nodes:[[56000,15000,-38000],[42000,6000,-23000],[34500,624,-9500],[27000,-624,4000],[23000,-5200,15000],[12000,-27000,45000],[-32000,-60000,88000]],times:[0,7,13,21,27,35,44],durationSeconds:44,highlights:[10,17,40],authoredCameraPath:true}};
fs.writeFileSync(path.join(stage,'route-patch-manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({prepared:true,baseline:baselineHash,candidate:manifest.candidate,buildDriverHash:manifest.actualBuildDriverHash,replacements:replacements.length,durationSeconds:44,highlights:[10,17,40]}));
