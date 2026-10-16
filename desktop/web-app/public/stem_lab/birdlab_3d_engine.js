/* BirdLab 3D observation runtime. Three.js r128; all dependencies are bundled.
 * Camera damping, ground clearance, quality scaling and visibility-safe timing
 * adapt the corresponding Raptor Lab systems in stem_tool_raptorhunt.js.
 * The autonomous course is an illustrative behavior sequence, not a validated
 * aerodynamics model. No hunting mission state or Raptor Lab globals are used.
 */
(function(global) {
  'use strict';
  var TAU = Math.PI * 2, DURATION = 44;
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function smooth(a, b, t) { var x = clamp((t-a)/(b-a), 0, 1); return x*x*(3-2*x); }
  function damping(rate, dt) { return 1-Math.exp(-rate*dt); }
  function quietGaze(t) {
    // Hold a sightline, make a brief head turn, then hold again.
    var stops=[[0,-.08],[.45,-.08],[.68,.19],[1.32,.19],[1.58,-.14],[2,-.14],[2.4,0],[39.3,0],[39.58,.12],[39.9,.12],[40.16,-.18],[41.5,-.18],[41.76,.14],[43,.14],[43.5,-.08],[44,-.08]];
    for(var i=1;i<stops.length;i++) if(t<=stops[i][0]) {
      var previous=stops[i-1],next=stops[i];
      return previous[1]+(next[1]-previous[1])*smooth(previous[0],next[0],t);
    }
    return -.08;
  }
  // A few short glances separated by stable sightlines read as observation,
  // while a small heading lead lets the head look into the approaching turn.
  var AIR_GAZE=[[0,0,.035],[8.2,0,.035],[8.55,-.12,.14],[10.2,-.12,.14],
    [10.48,.05,.07],[12.9,.05,.07],[13.18,.16,.18],[15.4,.16,.18],
    [15.7,-.09,.12],[18.3,-.09,.12],[18.58,.02,.06],[22.5,.02,.06],
    [22.85,0,.035],[44,0,.035]];
  function airborneGaze(t) {
    var yaw=0,pitch=.035;
    for(var i=1;i<AIR_GAZE.length;i++) if(t<=AIR_GAZE[i][0]) {
      var previous=AIR_GAZE[i-1],next=AIR_GAZE[i],blend=smooth(previous[0],next[0],t);
      yaw=previous[1]+(next[1]-previous[1])*blend;
      pitch=previous[2]+(next[2]-previous[2])*blend;break;
    }
    yaw+=sampleGazeLead(t)*softGate(5.5,8,t)[0]*(1-softGate(32,34,t)[0]);
    return {yaw:yaw,pitch:pitch};
  }
  function softGate(a,b,t) {
    var x=clamp((t-a)/(b-a),0,1),span=b-a;
    return [x*x*x*(10+x*(-15+6*x)),30*x*x*(x-1)*(x-1)/span,60*x*(2*x*x-3*x+1)/(span*span)];
  }
  function landingCompression(t) {
    var x=(t-38)/.72;
    if(x<=0||x>=1)return 0;
    // One quick compression followed by a slower release, with no held
    // crouch at the bottom. This compact pulse has zero velocity and
    // acceleration at contact and rest; seeking needs no spring history.
    return clamp(Math.pow(x/.2,3)*Math.pow((1-x)/.8,12),0,1);
  }
  function addAirMovement(flight,t) {
    var entry=softGate(4,8,t),exit=softGate(31,36,t);
    var g=entry[0]*(1-exit[0]),dg=entry[1]*(1-exit[0])-entry[0]*exit[1];
    var ddg=entry[2]*(1-exit[0])-2*entry[1]*exit[1]-entry[0]*exit[2];
    [[.10,1.1,0],[.05,.82,.4],[.07,.63,1.2]].forEach(function(wave,axis){
      var amplitude=wave[0],frequency=wave[1],angle=t*frequency+wave[2],s=Math.sin(angle),c=Math.cos(angle);
      flight.position[axis]+=amplitude*g*s;
      flight.velocity[axis]+=amplitude*(dg*s+g*frequency*c);
      flight.acceleration[axis]+=amplitude*(ddg*s+2*dg*frequency*c-g*frequency*frequency*s);
    });
  }
  // Position, velocity and acceleration are shared at every course seam.
  // Continuous curvature keeps the bank from jumping between flight arcs.
  // The short leg push carries the wings clear of the limb before downstroke.
  var COURSE = [
    [3, [0,0,0], [0,0,0]],
    [3.22, [0,.12,-.24], [0,1,-2], [0,.2,-1.8]],
    [4.6, [0,1.52,-4.3], [0,1.8,-4.6]],
    [7.5, [-4.7,5.12,-16], [-3,.8,-3.3]],
    [12, [-17,5.92,-20], [-.7,0,4]],
    [17, [-12,5.42,1], [3.5,-.15,3.1]],
    [22, [10,4.32,7], [3.6,-.25,-2.5]],
    [27, [23,3.12,1], [0,-.25,2.5]],
    [31, [10,2.12,6], [-4.5,-.2,1.8]],
    [34, [1,1.02,8], [-1.8,-.4,-1]],
    [36, [0,.42,3], [0,-.3,-2.8]],
    [38, [0,0,0], [0,0,0]]
  ];
  function cubicAcceleration(a,b,end) {
    var span=b[0]-a[0],u=end?1:0;
    return a[1].map(function(p,k){return ((12*u-6)*p+(6*u-4)*span*a[2][k]+(-12*u+6)*b[1][k]+(6*u-2)*span*b[2][k])/(span*span);});
  }
  COURSE.forEach(function(node,index){
    if(node[3])return;
    if(!index||index===COURSE.length-1){node.push([0,0,0]);return;}
    var previous=COURSE[index-1],next=COURSE[index+1],left=node[0]-previous[0],right=next[0]-node[0];
    var incoming=cubicAcceleration(previous,node,true),outgoing=cubicAcceleration(node,next,false);
    node.push(incoming.map(function(value,axis){return (value*right+outgoing[axis]*left)/(left+right);}));
  });
  function hermite(a,b,t) {
    var span=b[0]-a[0], u=clamp((t-a[0])/span,0,1), u2=u*u, u3=u2*u;
    var position=[], velocity=[], acceleration=[];
    for(var k=0;k<3;k++) {
      var p=a[1][k],v=a[2][k]*span,acc=a[3][k]*span*span;
      var delta=b[1][k]-p-v-.5*acc,dv=b[2][k]*span-v-acc,da=b[3][k]*span*span-acc;
      var c3=10*delta-4*dv+.5*da,c4=-15*delta+7*dv-da,c5=6*delta-3*dv+.5*da;
      position.push(p+v*u+.5*acc*u2+u3*(c3+u*(c4+u*c5)));
      velocity.push((v+acc*u+u2*(3*c3+u*(4*c4+u*5*c5)))/span);
      acceleration.push((acc+u*(6*c3+u*(12*c4+u*20*c5)))/(span*span));
    }
    return {position:position,velocity:velocity,acceleration:acceleration};
  }
  function sampleCourse(t) {
    var flight={position:[0,0,0],velocity:[0,0,0],acceleration:[0,0,0]};
    if(t>3&&t<38) {
      for(var i=1;i<COURSE.length;i++) if(t<=COURSE[i][0]) { flight=hermite(COURSE[i-1],COURSE[i],t); break; }
      addAirMovement(flight,t);
    }
    return flight;
  }
  // Curvature is continuous at course joins, but its derivative can change
  // abruptly. Smooth the small attitude table before deriving roll control,
  // so the body and wing corrections share a C2 bank with no spring history.
  var BANK_STEP=.05, bankTable=[], gazeTable=[];
  for(var bankIndex=0;bankIndex<DURATION/BANK_STEP;bankIndex++) {
    var bankTime=bankIndex*BANK_STEP,bankFlight=sampleCourse(bankTime);
    var bv=bankFlight.velocity,ba=bankFlight.acceleration,bh=Math.hypot(bv[0],bv[2]);
    var bankTurn=bh>.1?(bv[2]*ba[0]-bv[0]*ba[2])/(bh*bh):0;
    bankTable.push(clamp(Math.atan2(bh*bankTurn,9.81),-.72,.72)*smooth(3,4,bankTime)*(1-smooth(35.5,38,bankTime)));
    // Look slightly ahead along the course before the body enters its next
    // turn. A smooth angular bound avoids hitting a hard gaze stop, while
    // precomputation keeps the look-ahead out of the frame's pose writer.
    var nextVelocity=sampleCourse(bankTime+.45).velocity;
    var gazeTurn=bh>.1&&Math.hypot(nextVelocity[0],nextVelocity[2])>.1?
      Math.atan2(bv[2]*nextVelocity[0]-bv[0]*nextVelocity[2],bv[0]*nextVelocity[0]+bv[2]*nextVelocity[2]):0;
    gazeTable.push(.24*Math.tanh(gazeTurn*.85/.24));
  }
  function bankPoint(index) { return bankTable[(index%bankTable.length+bankTable.length)%bankTable.length]; }
  function gazePoint(index) { return gazeTable[(index%gazeTable.length+gazeTable.length)%gazeTable.length]; }
  function sampleGazeLead(t) {
    var index=t/BANK_STEP,low=Math.floor(index),u=index-low,u2=u*u,u3=u2*u;
    // C2 interpolation removes the course joins from the head's angular
    // acceleration as well as its position, without a frame-dependent lag.
    return ((1-3*u+3*u2-u3)*gazePoint(low-1)+(4-6*u2+3*u3)*gazePoint(low)+
      (1+3*u+3*u2-3*u3)*gazePoint(low+1)+u3*gazePoint(low+2))/6;
  }
  function sampleBank(t) {
    var index=t/BANK_STEP,low=Math.floor(index),u=index-low,u2=u*u,u3=u2*u;
    var p=bankPoint(low-1),c=bankPoint(low),n=bankPoint(low+1),f=bankPoint(low+2);
    // Positive B-spline weights preserve the authored bank bounds. Periodic
    // neighbors close both the angle and its derivatives at the loop seam.
    return [((1-3*u+3*u2-u3)*p+(4-6*u2+3*u3)*c+(1+3*u+3*u2-3*u3)*n+u3*f)/6,
      ((-3+6*u-3*u2)*p+(-12*u+9*u2)*c+(3+6*u-9*u2)*n+3*u2*f)/(6*BANK_STEP)];
  }
  function sampleFlight(elapsed) {
    var t=((Number.isFinite(elapsed)?elapsed:0)%DURATION+DURATION)%DURATION;
    var flight=sampleCourse(t);
    var v=flight.velocity, horizontal=Math.hypot(v[0],v[2]), speed=Math.hypot(v[0],v[1],v[2]);
    var phase=t<2.4?'perched':t<3?'preparing':t<5?'takeoff':t<10?'climbing':t<22?'gliding':t<30?'banking':t<36?'approaching':t<38?'landing':t<40?'settling':'perched';
    var labels={perched:'Perched · scanning the clearing',preparing:'Preparing to leave the perch',takeoff:'Taking off · strong downstrokes',climbing:'Climbing · powered flight',gliding:'Gliding · wings supporting the body',banking:'Banking · tail and primaries adjusting',approaching:'Returning · lining up the perch',landing:'Landing · tail spread, feet extended',settling:'Settling · folding the wings'};
    var power=smooth(2.92,3.10,t)*(1-smooth(8.5,10,t));
    power=Math.max(power,.52*smooth(23,23.5,t)*(1-smooth(24.8,25.6,t)),.54*smooth(34.5,35.6,t)*(1-smooth(37.5,38.5,t)));
    // As the steep climb levels out, shorten each stroke before settling into
    // the glide. Keep the cadence clock independent of this change in depth.
    var cruiseEase=smooth(5.5,8.3,t)*(1-smooth(9.6,10,t));
    var strokeAmplitude=power*(1-.16*cruiseEase);
    var fold=clamp(1-smooth(2.4,3.2,t)+smooth(38,39.4,t),0,1);
    var feet=clamp(1-smooth(3.5,5,t)+smooth(34.8,36.7,t),0,1);
    var crouch=smooth(2.45,2.86,t)*(1-smooth(2.94,3.18,t));
    var touchdown=landingCompression(t);
    var brake=smooth(34.8,37,t)*(1-smooth(38.08,39.2,t));
    var grip=clamp(1-smooth(2.97,3.12,t)+softGate(38,38.26,t)[0],0,1);
    var flightEnvelope=smooth(3,4,t)*(1-smooth(35.5,38,t));
    var yaw=(horizontal>1e-8?Math.atan2(-v[0],-v[2]):0)*(1-smooth(37.4,38,t));
    // Forward is -Z: positive Z roll tilts lift toward a positive-yaw turn.
    var bankFrame=sampleBank(t),bank=bankFrame[0];
    var pitch=(horizontal>.02?Math.atan2(v[1],horizontal):0)*flightEnvelope+.24*smooth(35.4,36.7,t)*(1-smooth(37.4,38,t));
    var gaze=airborneGaze(t);
    // Shared slow gusts move the woodland and load the gliding wing. Integer
    // harmonics close the breeze loop; the perch approach stays undisturbed.
    var airPhase=t*TAU/DURATION;
    var gust=.65*Math.sin(3*airPhase+.35)+.35*Math.sin(5*airPhase-1.1);
    var cross=.6*Math.sin(2*airPhase-.7)+.4*Math.sin(4*airPhase+.2);
    var windX=.035*gust,windZ=.020*cross;
    var airGate=smooth(7,9,t)*(1-smooth(31,33,t));
    var airRoll=airGate*clamp((windX*Math.cos(yaw)-windZ*Math.sin(yaw))/.041,-1,1);
    var trimGate=softGate(7,9,t)[0]*(1-softGate(33,35,t)[0]);
    // Speed changes the broad/swept wing carriage, while increasing turn
    // load opens the supporting feathers. Roll corrections change sign when
    // leaving a bank instead of holding an asymmetric pose throughout it.
    var wingSweep=trimGate*softGate(2.5,5.5,speed)[0];
    var wingSupport=trimGate*Math.tanh((1/Math.cos(bank)-1)/.07);
    var rollControl=trimGate?trimGate*Math.tanh(bankFrame[1]/.25):0;
    // Round the fan's neutral position so crossing from a left bank to a
    // right bank does not abruptly reverse its opening velocity.
    var tailBank=bank*Math.tanh(bank/.035);
    return {time:t,phase:phase,label:labels[phase],position:flight.position,velocity:v,yaw:yaw,pitch:pitch,bank:bank,
      wind:[.143+windX,0,.05525+windZ],
      airspeed:speed,wingbeat:power>.05?2.1+power*.65:0,
      pose:{flapAmplitude:strokeAmplitude,fold:fold,bank:bank,pitch:pitch,tailFan:clamp(.14+.28*tailBank+.66*smooth(34.8,37,t)*(1-smooth(38,39.6,t)),0,1),feet:feet,
        headYaw:quietGaze(t)*fold+gaze.yaw*(1-fold),
        gazePitch:(1-fold)*gaze.pitch,
        alula:(1-fold)*Math.max(.75*(1-smooth(4.5,7,t)),.85*smooth(34,36,t)*(1-smooth(38,39.4,t))),
        crouch:crouch,touchdown:touchdown,brake:brake,grip:grip,
        airLift:airGate*gust,airRoll:airRoll,wingSweep:wingSweep,wingSupport:wingSupport,rollControl:rollControl,
        breath:.5+.5*Math.sin(t*TAU*22/DURATION)}};
  }

  // Integrating a shared phase table makes playback and scrubbing agree.
  // Close the phase loop while the wings are folded, so each leg-powered
  // push leads the first downstroke, clearing the limb without changing cadence.
  var PHASE_STEP=.025, wingPhaseTable=[0], restPhaseTable=[0];
  for(var phaseIndex=1;phaseIndex<=DURATION/PHASE_STEP;phaseIndex++) {
    var f0=sampleFlight((phaseIndex-1)*PHASE_STEP).wingbeat||2.15;
    var f1=sampleFlight(phaseIndex*PHASE_STEP).wingbeat||2.15;
    wingPhaseTable.push(wingPhaseTable[phaseIndex-1]+(f0+f1)*.5*PHASE_STEP*TAU);
    var restTime=(phaseIndex-.5)*PHASE_STEP;
    var resting=(1-smooth(2.1,2.4,restTime))+smooth(39.4,40,restTime);
    restPhaseTable.push(restPhaseTable[phaseIndex-1]+resting*PHASE_STEP);
  }
  var phaseEnd=wingPhaseTable.length-1, phaseCorrection=Math.round(wingPhaseTable[phaseEnd]/TAU)*TAU-wingPhaseTable[phaseEnd];
  wingPhaseTable=wingPhaseTable.map(function(value,index){return value+phaseCorrection*restPhaseTable[index]/restPhaseTable[phaseEnd];});
  function wingPhasePoint(index) {
    var circuits=Math.floor(index/phaseEnd);
    return wingPhaseTable[index-circuits*phaseEnd]+circuits*wingPhaseTable[phaseEnd];
  }
  function unshiftedWingPhase(elapsed) {
    var circuits=Math.floor(elapsed/DURATION),index=(elapsed-circuits*DURATION)/PHASE_STEP;
    var low=Math.floor(index),blend=index-low,blend2=blend*blend,blend3=blend2*blend;
    var center=wingPhasePoint(low),previous=wingPhasePoint(low-1)-center;
    var next=wingPhasePoint(low+1)-center,following=wingPhasePoint(low+2)-center;
    // A periodic cubic B-spline carries velocity and acceleration through
    // table cells without the tiny cadence steps of linear interpolation.
    // Unwrapped neighbors keep the same smooth motion across each circuit;
    // increasing control points also keep the clock moving only forwards.
    var phase=center+(Math.pow(1-blend,3)*previous+(-3*blend3+3*blend2+3*blend+1)*next+blend3*following)/6;
    return circuits*wingPhaseTable[phaseEnd]+phase;
  }
  var launchPhaseOffset=TAU*.79-unshiftedWingPhase(3.12);
  function sampleWingPhase(elapsed) {
    if(!Number.isFinite(elapsed)||elapsed<0)return 0;
    return ((unshiftedWingPhase(elapsed)+launchPhaseOffset)%TAU+TAU)%TAU;
  }

  // Follow framing uses the horizontal heading, so a climbing bird does not
  // pull the camera below its tail. Reuse the output in the render loop.
  function sampleFollowFrame(flight,out) {
    out=out||{positionOffset:[0,0,0],targetOffset:[0,0,0]};
    var yaw=Number.isFinite(flight.yaw)?flight.yaw:0;
    var pace=smooth(0,6,Number.isFinite(flight.airspeed)?flight.airspeed:0);
    var sy=Math.sin(yaw),cy=Math.cos(yaw),behind=2.55+.40*pace,side=.92+.10*pace,ahead=.10+.20*pace;
    out.positionOffset[0]=sy*behind+cy*side;
    out.positionOffset[1]=.76+.10*pace;
    out.positionOffset[2]=cy*behind-sy*side;
    out.targetOffset[0]=-sy*ahead;
    out.targetOffset[1]=0;
    out.targetOffset[2]=-cy*ahead;
    return out;
  }

  // Repeat observations preserve the actual course. Only quiet holds run
  // faster; walking, turns, pecks and both flights keep the chosen speed.
  var residentRepeatWindows=(function(){
    var glances=[[1.1,1.34],[3.9,4.12],[5.5,5.78],[8.2,8.40],[10.3,10.61],[12.1,12.32],
      [17.2,17.49],[19.7,19.92],[21,21.24],[23.7,23.94],[26,26.26],[28,28.21],
      [30.1,30.37],[35.1,35.4],[38,38.26],[40.7,40.99],[38.2,39.1],[40.2,41]];
    var courses={mourningDove:[[3.38,6.62],[11.58,13.82],[20.58,23.92],[29.08,31.52],[8.1,8.96],[9.5,10.22]],
      grouse:[[4.58,8.62],[17.58,19.52],[24.58,28.42],[33.58,35.62],[10.1,10.96],[12.2,12.92]]};
    Object.keys(courses).forEach(function(id){
      var windows=courses[id].concat(glances).sort(function(a,b){return a[0]-b[0];}),merged=[];
      windows.forEach(function(range){var last=merged[merged.length-1];if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push(range.slice());});
      courses[id]=merged;
    });
    return courses;
  })();
  function advanceResidentObservation(time,elapsed,id) {
    var windows=residentRepeatWindows[id];
    if(!windows||!(elapsed>0))return time+elapsed;
    var remaining=elapsed,phase=((time%DURATION)+DURATION)%DURATION;
    while(remaining>1e-12){
      var rate=6,next=DURATION;
      for(var i=0;i<windows.length;i++){
        if(phase<windows[i][0]-1e-10){next=windows[i][0];break;}
        if(phase<windows[i][1]-1e-10){rate=1;next=windows[i][1];break;}
      }
      var distance=next-phase,available=distance/rate;
      if(remaining<=available){time+=remaining*rate;break;}
      time+=distance;remaining-=available;phase=next===DURATION?0:next;
    }
    return time;
  }
  function applyHeightFog(scene) {
    // A shallow haze gathers near the woodland floor, while a smaller clear-
    // air component still softens distant crowns. Integrate density along
    // each sightline so an elevated camera does not erase the ground haze.
    // Wrap only this scene's materials; shared Three shader chunks stay local
    // to their other labs and all existing feather/wood/wind hooks still run.
    var seen=new Set();
    scene.traverse(function(object) {
      var list=Array.isArray(object.material)?object.material:object.material?[object.material]:[];
      list.forEach(function(material) {
        if(seen.has(material)||!material.fog||material.isShaderMaterial)return;
        seen.add(material);
        var previous=material.onBeforeCompile;
        var previousKey=material.customProgramCacheKey.call(material);
        material.onBeforeCompile=function(shader,renderer) {
          previous.call(this,shader,renderer);
          shader.vertexShader='#ifdef USE_FOG\nvarying float blWoodlandFogHeight;\n#endif\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',[
            '#include <worldpos_vertex>',
            '#ifdef USE_FOG',
            'vec4 blWoodlandFogWorld=vec4(transformed,1.);',
            '#ifdef USE_INSTANCING',
            'blWoodlandFogWorld=instanceMatrix*blWoodlandFogWorld;',
            '#endif',
            'blWoodlandFogHeight=(modelMatrix*blWoodlandFogWorld).y;',
            '#endif'
          ].join('\n'));
          shader.fragmentShader=[
            '#ifdef USE_FOG',
            'varying float blWoodlandFogHeight;',
            'float blWoodlandFogDensity(float fromHeight,float toHeight){',
            'float start=clamp(fromHeight,-20.,80.),end=clamp(toHeight,-20.,80.);',
            'float delta=(end-start)*.075;',
            // The series avoids cancellation for a nearly horizontal ray.
            'float integral=abs(delta)<.01 ? 1.-delta*.5+delta*delta/6.-delta*delta*delta/24. : (1.-exp(-delta))/delta;',
            'return .38+.62*exp(-start*.075)*integral;',
            '}',
            '#endif',
            shader.fragmentShader
          ].join('\n');
          shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',[
            '#ifdef USE_FOG',
            '#ifdef FOG_EXP2',
            'float blDensity=fogDensity*blWoodlandFogDensity(cameraPosition.y,blWoodlandFogHeight);',
            'float fogFactor=1.-exp(-blDensity*blDensity*fogDepth*fogDepth);',
            '#else',
            'float fogFactor=smoothstep(fogNear,fogFar,fogDepth);',
            '#endif',
            'gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,fogFactor);',
            '#endif'
          ].join('\n'));
        };
        material.customProgramCacheKey=function(){return previousKey+'|birdlab-height-fog-v1';};
        material.needsUpdate=true;
      });
    });
  }

  function selectQuality(requested) {
    if(requested==='low'||requested==='high') return requested;
    if(!(global.innerWidth<640)) return 'high';
    // A narrow desktop panel still has room for the full woodland. Reserve
    // the lighter scene for narrow touch devices or unknown input capability.
    var finePointer=false;
    try { finePointer=typeof global.matchMedia==='function'&&global.matchMedia('(pointer: fine)').matches; } catch(ignore) {}
    return finePointer?'high':'low';
  }

  // Free observation uses decisions and destinations, not the study timeline.
  // A retained state keeps each departure, glide and arrival continuous.
  function createFreeHawk(perches,footOffset) {
    var seed=724193,age=0,elapsed=0,current=0,next=0,duration=1,wait=9,stage='perched',gaze=0,gazeAge=0,heading=0,curve=0;
    var vigilance=0,cooldown=0,escapeFlight=false,observerX=0,observerZ=0,hasObserver=false,watchYaw=0,watchPitch=0;
    var state={time:0,phase:'perched',label:'Perched · watching the woodland',position:[0,0,0],velocity:[0,0,0],yaw:0,pitch:0,bank:0,
      wind:[.14,0,.055],airspeed:0,wingbeat:0,wingPhase:0,alertness:0,recovering:false,
      pose:{flapAmplitude:0,fold:1,bank:0,pitch:0,tailFan:.14,feet:1,headYaw:0,gazePitch:0,alula:0,crouch:0,touchdown:0,brake:0,grip:1,airLift:0,airRoll:0,wingSweep:0,wingSupport:0,rollControl:0,breath:.5}};
    function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    function reset(){seed=724193;age=0;elapsed=0;current=0;next=0;stage='perched';wait=8+random()*7;heading=0;curve=0;gaze=(random()-.5)*.65;gazeAge=1.7+random()*3.3;
      vigilance=0;cooldown=0;escapeFlight=false;observerX=observerZ=watchYaw=watchPitch=0;hasObserver=false;
      state.yaw=0;state.wingPhase=0;state.pose.headYaw=0;state.pose.gazePitch=0;return update(0,null,true);}
    function outwardRoute(start,finish,bend,observer) {
      var dx=finish.x-start.x,dz=finish.z-start.z,length=Math.max(.001,Math.hypot(dx,dz));
      var awayX=start.x-observer.x,awayZ=start.z-observer.z,range=Math.hypot(awayX,awayZ);
      if(dx*awayX+dz*awayZ<0||Math.hypot(finish.x-observer.x,finish.z-observer.z)<range+.75)return false;
      // A safe endpoint is not enough: the decorative arc must not sweep back
      // over the observer. A rejected bend can use the same direct departure.
      for(var sample=1;sample<=48;sample++) {
        var u=sample/48,q=u*u*u*(10+u*(-15+6*u)),arch=64*u*u*u*Math.pow(1-u,3);
        var x=start.x+dx*q-dz/length*bend*arch,z=start.z+dz*q+dx/length*bend*arch;
        var nextRange=Math.hypot(x-observer.x,z-observer.z);
        if(nextRange+1e-8<range)return false;
        range=nextRange;
      }
      return true;
    }
    function chooseLookout(start,observer,escape) {
      var choice=-1,bestRange=-1;
      if(escape) {
        for(var index=0;index<perches.length;index++)if(index!==current&&outwardRoute(start,perches[index],0,observer)) {
          var range=Math.hypot(perches[index].x-observer.x,perches[index].z-observer.z);
          if(range>bestRange){bestRange=range;choice=index;}
        }
      } else choice=(current+1+Math.floor(random()*Math.max(1,perches.length-1)))%perches.length;
      if(choice<0)return false;
      next=choice;curve=(random()-.5)*3;
      if(escape&&!outwardRoute(start,perches[next],curve,observer))curve=0;
      escapeFlight=escape;return true;
    }
    function flightBank(u,length) {
      // Use the actual route's lateral acceleration. A yaw-following error
      // depends on frame cadence and can leave the wings nearly level in a
      // sustained curve, even though the trajectory is still turning.
      if(u<=0||u>=1)return 0;
      var dq=30*u*u*(1-u)*(1-u)/duration;
      var ddq=60*u*(1-u)*(1-2*u)/(duration*duration);
      var da=192*u*u*(1-u)*(1-u)*(1-2*u)/duration;
      var dda=384*u*(1-u)*(1-5*u+5*u*u)/(duration*duration);
      var horizontal=Math.hypot(length*dq,curve*da);
      var lateral=horizontal>1e-8?length*curve*(da*ddq-dq*dda)/horizontal:0;
      return clamp(Math.atan2(lateral,9.81),-.38,.38);
    }
    function update(dt,observer,initializing) {
      dt=clamp(Number.isFinite(dt)?dt:0,0,.1);age+=dt;elapsed+=dt;gazeAge-=dt;
      var start=perches[current],finish=perches[next],p=state.pose,position=observer&&observer.position,targetVigilance=0,noticed=false;
      var validObserver=position&&Number.isFinite(position.x)&&Number.isFinite(position.y)&&Number.isFinite(position.z);
      if(validObserver) {
        var hawkX=stage==='flight'?state.position[0]:start.x,hawkZ=stage==='flight'?state.position[2]:start.z;
        var awayX=hawkX-position.x,awayZ=hawkZ-position.z,range=Math.hypot(awayX,awayZ),approach=0;
        if(dt>0&&hasObserver&&range>.001)approach=clamp(((position.x-observerX)*awayX+(position.z-observerZ)*awayZ)/(range*dt),0,2);
        var comfort=observer.crouching?2.3:3.2,proximity=1-smooth(comfort*.45,comfort*1.9,range);
        var intrusion=1-smooth(comfort*.25,comfort*.70,range);
        targetVigilance=clamp(proximity*(.70+.30*clamp(approach/1.2,0,1))+.30*intrusion,0,1);
        noticed=targetVigilance>.50;
        if(dt>0){observerX=position.x;observerZ=position.z;hasObserver=true;}
      } else if(dt>0)hasObserver=false;
      if(dt===0&&!initializing) {
        // The initial descriptive cue can acknowledge the nearby observer,
        // but paused sampling must not recompute a bank from an updated yaw.
        if(elapsed===0&&stage==='perched'&&noticed)state.label='Alert · watching the nearby observer';
        return state;
      }
      if(dt>0) {
        vigilance+=(targetVigilance-vigilance)*damping(targetVigilance>vigilance?1/.65:1/4.5,dt);
        cooldown=Math.max(0,cooldown-dt);
      }
      if(dt>0&&gazeAge<=0){gaze=(random()-.5)*.65;gazeAge=1.7+random()*3.3;}
      var alarmed=validObserver&&vigilance>.58;
      if(dt>0&&perches.length>1&&stage==='perched'&&age>(alarmed&&cooldown===0?Math.min(wait,3.8):wait)) {
        if(!alarmed&&random()<.27){age=0;wait=5+random()*9;}
        else if(chooseLookout(start,position,alarmed)) {finish=perches[next];stage='preparing';age=0;heading=Math.atan2(-(finish.x-start.x),-(finish.z-start.z));duration=clamp(start.distanceTo(finish)/3.2,3.8,7.2);}
        else {age=0;wait=2.0;}
      }
      if(stage==='preparing'&&age>=.95){stage='flight';age=0;}
      if(stage==='flight'&&age>=duration){current=next;start=perches[current];stage='settling';age=0;if(escapeFlight)cooldown=6;}
      if(stage==='settling'&&age>=1.1){stage='perched';age=0;wait=8+random()*12;}
      state.time=elapsed;state.velocity[0]=state.velocity[1]=state.velocity[2]=0;
      state.position[0]=start.x;state.position[1]=start.y-footOffset;state.position[2]=start.z;
      p.fold=1;p.flapAmplitude=0;p.feet=1;p.grip=1;p.crouch=0;p.brake=0;p.alula=0;p.tailFan=.14;p.wingSweep=0;p.wingSupport=0;p.airLift=0;p.airRoll=0;p.rollControl=0;
      state.pitch=0;state.bank=0;state.airspeed=0;state.wingbeat=0;
      if(stage==='preparing') {
        var ready=smooth(0,.95,age);p.fold=1-ready*.18;p.crouch=Math.sin(Math.PI*ready)*.4;p.grip=1-ready*.25;
        p.flapAmplitude=ready*.12;p.alula=ready*.35;p.tailFan=.14+ready*.04;state.wingbeat=2.15+p.flapAmplitude*.6;
        state.yaw+=Math.atan2(Math.sin(heading-state.yaw),Math.cos(heading-state.yaw))*damping(5,dt);
      } else if(stage==='flight') {
        var u=clamp(age/duration,0,1),q=u*u*u*(10+u*(-15+6*u)),dq=30*u*u*(1-u)*(1-u)/duration;
        var arch=64*u*u*u*Math.pow(1-u,3),darch=192*u*u*(1-u)*(1-u)*(1-2*u)/duration;
        var dx=finish.x-start.x,dz=finish.z-start.z,length=Math.max(.001,Math.hypot(dx,dz)),height=2.8+length*.10;
        state.position[0]=start.x+dx*q-dz/length*curve*arch;
        state.position[1]=start.y-footOffset+(finish.y-start.y)*q+height*arch;
        state.position[2]=start.z+dz*q+dx/length*curve*arch;
        state.velocity[0]=dx*dq-dz/length*curve*darch;state.velocity[1]=(finish.y-start.y)*dq+height*darch;state.velocity[2]=dz*dq+dx/length*curve*darch;
        var horizontal=Math.hypot(state.velocity[0],state.velocity[2]);
        var desiredYaw=horizontal>.02?Math.atan2(-state.velocity[0],-state.velocity[2]):state.yaw;
        var turn=Math.atan2(Math.sin(desiredYaw-state.yaw),Math.cos(desiredYaw-state.yaw));
        state.yaw+=turn*damping(7,dt);state.bank=flightBank(u,length);
        state.pitch=horizontal>.02?clamp(Math.atan2(state.velocity[1],horizontal),-.28,.42)*Math.sin(Math.PI*u):0;
        var launch=smooth(0,.16,u),power=.28+.58*(1-smooth(.15,.38,u))+.25*smooth(.70,.9,u);
        var glide=smooth(.22,.37,u)*(1-smooth(.60,.76,u));
        p.fold=.82*(1-smooth(0,.13,u));p.flapAmplitude=(.12+(power-.12)*launch)*(1-glide);
        // Hold the outstretched wing between powered strokes. Retain the
        // oscillator phase so flapping resumes without snapping a wrist.
        p.wingSupport=glide*.13;p.airLift=glide*(.024+.012*Math.sin(elapsed*1.8));
        p.airRoll=glide*.014*Math.sin(elapsed*1.3);
        // Differential wing trim enters and leaves the bank, then relaxes
        // during the steady portion instead of holding a steering twitch.
        var bankRate=(flightBank(Math.min(1,u+.001),length)-flightBank(Math.max(0,u-.001),length))/(.002*duration);
        p.rollControl=glide*.10*Math.tanh(bankRate/.5);
        p.feet=clamp(1-smooth(.05,.22,u)+smooth(.75,.94,u),0,1);p.grip=.75*(1-smooth(0,.08,u))+.35*smooth(.90,1,u);
        p.brake=smooth(.72,.95,u);p.tailFan=.18+p.brake*.65;p.alula=.35+(Math.max(1-smooth(.1,.3,u),p.brake*.8)-.35)*launch;
        p.wingSweep=smooth(.2,.4,u)*(1-smooth(.65,.8,u));state.airspeed=Math.hypot.apply(Math,state.velocity);state.wingbeat=(2.15+p.flapAmplitude*.6)*(1-glide);
      } else if(stage==='settling') {
        var settled=smooth(0,1.1,age);p.fold=settled;p.feet=1;p.grip=.35+.65*smooth(0,.35,age);p.brake=1-settled;p.tailFan=.14+.69*(1-settled);
        p.flapAmplitude=.53*(1-settled);p.alula=.8*(1-settled);state.wingbeat=2.15+p.flapAmplitude*.6;
      }
      state.wingPhase=(state.wingPhase+dt*(stage==='flight'?2.15+p.flapAmplitude*.6:state.wingbeat||2.15)*TAU)%TAU;
      if(validObserver&&dt>0) {
        var lookX=position.x-state.position[0],lookZ=position.z-state.position[2];
        var bearing=Math.atan2(-lookX,-lookZ)-state.yaw;
        watchYaw=clamp(Math.atan2(Math.sin(bearing),Math.cos(bearing)),-.75,.75);
        // The folded neck carries a slight upward sightline in the shared
        // anatomy. Counter that carriage before aiming down at the observer.
        var neckCarriage=(p.fold*.53-p.crouch*p.feet*.15)*.42;
        watchPitch=clamp(Math.atan2(state.position[1]+.14-position.y,Math.max(.01,Math.hypot(lookX,lookZ)))+neckCarriage,-.25,.50);
      }
      var attention=smooth(.08,.68,vigilance),gazeTarget=gaze+(watchYaw-gaze)*attention;
      var pitchTarget=watchPitch*attention;
      if(stage==='preparing'){var forward=smooth(0,.95,age);gazeTarget*=1-forward;pitchTarget+=(.06-pitchTarget)*forward;}
      if(stage==='flight'){gazeTarget=0;pitchTarget=.06;}
      p.headYaw+=clamp((gazeTarget-p.headYaw)*damping(4,dt),-2*dt,2*dt);
      p.gazePitch+=clamp((pitchTarget-p.gazePitch)*damping(4,dt),-1.4*dt,1.4*dt);
      p.bank=state.bank;p.pitch=state.pitch;p.breath=.5+.5*Math.sin(elapsed*2.7);
      state.alertness=vigilance;state.recovering=cooldown>0;
      state.phase=stage==='flight'?(age/duration<.22?'takeoff':age/duration>.75?'landing':'gliding'):stage;
      state.label=stage==='flight'?(state.phase==='takeoff'?'Leaving a lookout · powered climb':state.phase==='landing'?'Approaching a new lookout':p.flapAmplitude<.01?'Gliding between lookouts · small wing and tail corrections':'Crossing the clearing · adjusting the wings'):
        stage==='preparing'?'Preparing to move to another lookout':stage==='settling'?'Settling onto the lookout':vigilance>.35||noticed?'Alert · watching the nearby observer':cooldown>0?'Perched · settling after disturbance':'Perched · scanning for movement';
      return state;
    }
    reset();return {update:update,reset:reset,state:state};
  }

  // Binocular identification is a view-dependent observation, not a world radar.
  // Static solid occluders use a broad phase so the large woodland instance
  // batches do not need to be raycast in full on every rendered frame.
  function createFieldObserver(THREE,habitatRoot,subjects) {
    var solids=[],raycaster=new THREE.Raycaster(),hits=[],point=new THREE.Vector3(),projected=new THREE.Vector3();
    var origin=new THREE.Vector3(),direction=new THREE.Vector3(),previousDirection=new THREE.Vector3(),targetDirection=new THREE.Vector3();
    var matrix=new THREE.Matrix4(),world=new THREE.Matrix4(),candidate=null,observation=null,held=0,scanAge=1,hasDirection=false;
    var solidNames=['continuous-woodland-ground','distant-connected-woodland-ridge','weathered-landing-limb','branching-woodland-trunks','weathered-wood-broken-end-grain','weathered-clearing-stones'];
    if(habitatRoot) {
      habitatRoot.updateMatrixWorld(true);
      habitatRoot.traverse(function(object){
        if(!object.isMesh||solidNames.indexOf(object.name)<0)return;
        if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
        var count=object.isInstancedMesh?object.count:1;
        for(var i=0;i<count;i++) {
          if(object.isInstancedMesh){object.getMatrixAt(i,matrix);world.multiplyMatrices(object.matrixWorld,matrix);}else world.copy(object.matrixWorld);
          var box=object.geometry.boundingBox.clone().applyMatrix4(world);
          if(box.max.x< -23||box.min.x>23||box.max.z< -23||box.min.z>23)continue;
          var proxy=new THREE.Mesh(object.geometry,object.material);proxy.matrixAutoUpdate=false;proxy.matrixWorld.copy(world);
          solids.push({mesh:proxy,box:box});
        }
      });
    }
    function visible(position,distance) {
      targetDirection.subVectors(position,origin).normalize();raycaster.set(origin,targetDirection);raycaster.near=.02;raycaster.far=Math.max(.02,distance-.025);
      for(var i=0;i<solids.length;i++) {
        if(!raycaster.ray.intersectsBox(solids[i].box))continue;
        hits.length=0;raycaster.intersectObject(solids[i].mesh,false,hits);if(hits.length)return false;
      }
      return true;
    }
    function reset(){candidate=null;observation=null;held=0;scanAge=1;hasDirection=false;}
    function update(dt,camera,enabled,moving,force) {
      if(!enabled){reset();return null;}
      dt=clamp(Number.isFinite(dt)?dt:0,0,.1);scanAge+=dt;
      camera.updateMatrixWorld(true);camera.getWorldPosition(origin);camera.getWorldDirection(direction);
      var turn=hasDirection?Math.acos(clamp(previousDirection.dot(direction),-1,1)):0;
      var steady=!(moving>.12)&&turn<=Math.max(.0015,dt*.24);
      previousDirection.copy(direction);hasDirection=true;
      if(scanAge>=.10||force) {
        scanAge=0;var best=null,bestScore=Infinity,bestDistance=0;
        for(var i=0;i<subjects.length;i++) {
          var subject=subjects[i];if(!subject.getPosition(point))continue;
          targetDirection.subVectors(point,origin);var distance=targetDirection.length();
          if(distance<.18||distance>32||targetDirection.dot(direction)<=0)continue;
          projected.copy(point).project(camera);var score=Math.hypot(projected.x*camera.aspect,projected.y);
          if(projected.z< -1||projected.z>1||score>.24||score>=bestScore||!visible(point,distance))continue;
          best=subject;bestScore=score;bestDistance=distance;
        }
        if(!best||!candidate||best.id!==candidate.id){held=0;observation=null;}
        candidate=best;
        if(best) {
          if(!observation)observation={id:best.id,name:best.name,scientificName:best.scientificName,category:best.category||'bird',behavior:'',distance:bestDistance,progress:0,identified:false};
          observation.distance=bestDistance;observation.behavior=best.getBehavior?best.getBehavior():best.behavior||'Observing';
        }
      }
      if(!steady)held=0;else if(candidate)held=Math.min(1.25,held+dt);
      if(observation){observation.progress=held/1.25;observation.identified=held>=1.25;}
      return observation;
    }
    return {update:update,reset:reset,getObservation:function(){return observation?Object.assign({},observation):null;},needsFrame:function(){return !!observation&&!observation.identified;}};
  }

  function mount(canvas,options) {
    options=options||{};
    var THREE=global.THREE;
    if(!THREE||!global.BirdLab3DBird||!global.BirdLab3DHabitat||!global.BirdLab3DWildlife||!global.AvianWoodlandBirds||typeof global.AvianWoodlandBirds.create!=='function'||typeof global.AvianWoodlandBirds.supports!=='function'||!global.AvianWoodlandBirds.supports('mourningDove')||!global.AvianWoodlandBirds.supports('grouse')) throw new Error('The 3D scene did not finish loading. Please retry.');
    if(canvas._birdlab3d) canvas._birdlab3d.dispose();
    var scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(40,1,.03,240), renderer;
    var disposed=false, contextLost=false, raf=0, lastStamp=null, time=0, wingPhase=0, frames=0;
    var paused=!!options.reducedMotion, speed=1, cameraMode='orbit', lighting='daylight', stateStamp=-1, dirty=true, repeatFlights=false;
    var mode='guided',savedGuided=null,binoculars=false,freeHawk=null,fieldObserver=null,sightings=[],observationKey='',fieldVisitTime=0;
    var observer={position:new THREE.Vector3(1.8,1.65,4.8),speed:0,crouching:false},walk={yaw:.36,pitch:-.20,eyeHeight:1.65},moveKeys=Object.create(null);
    var quality=selectQuality(options.quality);
    var listeners=[], resizeObserver=null, habitat=null, bird=null, wildlife=null, mammals=null;
    var orbit={yaw:2.4,pitch:.21,distance:2.65}, pointerMap=new Map(), pinchDistance=0;
    var poseState=sampleFlight(0), followTarget=new THREE.Vector3(), cameraGoal=new THREE.Vector3(), targetGoal=new THREE.Vector3();
    var birdTarget=new THREE.Vector3(), ground=0, attitude=new THREE.Quaternion(), habitatWind=new THREE.Vector3();
    var followFrame={positionOffset:[0,0,0],targetOffset:[0,0,0]};
    function listen(target,name,fn,opts) { target.addEventListener(name,fn,opts); listeners.push(function(){target.removeEventListener(name,fn,opts);}); }
    function releaseResources(root) {
      var geometries=new Set(), materials=new Set(), textures=new Set();
      root.traverse(function(obj){
        if(obj.geometry) geometries.add(obj.geometry);
        var list=Array.isArray(obj.material)?obj.material:obj.material?[obj.material]:[];
        list.forEach(function(mat){materials.add(mat);Object.keys(mat).forEach(function(key){if(mat[key]&&mat[key].isTexture)textures.add(mat[key]);});});
      });
      geometries.forEach(function(g){g.dispose();}); textures.forEach(function(t){t.dispose();}); materials.forEach(function(m){m.dispose();});
    }
    function dispose() {
      if(disposed) return; disposed=true;
      global.cancelAnimationFrame(raf); listeners.forEach(function(fn){fn();});
      if(resizeObserver) resizeObserver.disconnect();
      clearMovement();exitPointerLock();
      if(habitat&&habitat.dispose) habitat.dispose();
      if(bird&&bird.dispose) bird.dispose();
      if(wildlife&&wildlife.dispose) wildlife.dispose();
      if(mammals&&mammals.dispose) mammals.dispose();
      releaseResources(scene);
      if(renderer) { renderer.dispose(); if(!contextLost) renderer.forceContextLoss(); }
      scene.clear();
      if(canvas._birdlab3d===controller) delete canvas._birdlab3d;
      canvas.removeAttribute('data-birdlab-3d-ready');
    }
    try {
      renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(global.devicePixelRatio||1,quality==='low'?1.25:1.65));
      renderer.outputEncoding=THREE.sRGBEncoding;
      renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.08;
      renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      scene.background=new THREE.Color('#b9ccd0'); scene.fog=new THREE.FogExp2('#b4c8cc',.009);
      var hemi=new THREE.HemisphereLight('#d7e9f5','#615e35',.8); scene.add(hemi);
      var sun=new THREE.DirectionalLight('#fff0d7',2.1); sun.position.set(-18,31,14); sun.castShadow=true;
      sun.shadow.mapSize.set(quality==='low'?1024:2048,quality==='low'?1024:2048);
      Object.assign(sun.shadow.camera,{left:-44,right:44,top:44,bottom:-44,near:1,far:135});
      sun.shadow.bias=-.00035; sun.shadow.normalBias=.025; sun.shadow.radius=2;
      scene.add(sun); scene.add(sun.target);
      var rim=new THREE.DirectionalLight('#d3e6f2',.75); rim.position.set(12,15,-24); scene.add(rim);
      var sky=new THREE.Mesh(new THREE.SphereGeometry(190,24,12),new THREE.ShaderMaterial({
        uniforms:{top:{value:new THREE.Color('#739bb4')},bottom:{value:new THREE.Color('#e3e7df')}},
        vertexShader:'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        // r128 applies fog in output space. Keep this sky in the same space,
        // with a broad horizon gradient that merges into the distant haze.
        fragmentShader:'uniform vec3 top; uniform vec3 bottom; varying vec3 vPosition; void main(){float h=smoothstep(0.05,0.8,max(0.0,normalize(vPosition).y));gl_FragColor=vec4(mix(bottom,top,h),1.0);}',
        side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false
      })); sky.name='birdlab-sky'; scene.add(sky);
      habitat=global.BirdLab3DHabitat.create(THREE,scene,{quality:quality});
      if(habitat.root&&!habitat.root.parent) scene.add(habitat.root);
      bird=global.BirdLab3DBird.create(THREE); bird.root.name='birdlab-red-tailed-hawk'; scene.add(bird.root);
      wildlife=global.BirdLab3DWildlife.create(THREE,scene,{quality:quality,groundHeight:habitat.groundSurfaceHeight||habitat.groundHeight,isBlocked:habitat.isBlocked});
      if(global.BirdLab3DMammals&&global.BirdLab3DMammals.create)mammals=global.BirdLab3DMammals.create(THREE,scene,{quality:quality,groundHeight:habitat.groundSurfaceHeight||habitat.groundHeight,isBlocked:habitat.isBlocked});
      if(!habitat.perch) habitat.perch=new THREE.Vector3(0,3.2,0);
      ground=habitat.perch.y-(Number.isFinite(bird.footOffsetY)?bird.footOffsetY:-.185);
      freeHawk=createFreeHawk(habitat.perches||[habitat.perch],Number.isFinite(bird.footOffsetY)?bird.footOffsetY:-.185);
      var subjects=wildlife.snapshot().map(function(resident){return {id:resident.id,name:resident.name,scientificName:resident.scientificName,
        getPosition:function(out){return wildlife.getFocus(resident.id,out);},getBehavior:function(){var current=wildlife.snapshot().filter(function(value){return value.id===resident.id;})[0];return current?current.behavior:'';}};});
      if(mammals)mammals.snapshot().forEach(function(resident){subjects.push({id:resident.id,name:resident.name,scientificName:resident.scientificName,category:'mammal',
        getPosition:function(out){return mammals.getFocus(resident.id,out);},getBehavior:function(){var current=mammals.snapshot().filter(function(value){return value.id===resident.id;})[0];return current?current.behavior:'';}});});
      subjects.push({id:'redTailedHawk',name:'Red-tailed hawk',scientificName:'Buteo jamaicensis',getPosition:function(out){out.copy(bird.root.position);out.y+=.055;return out;},getBehavior:function(){return poseState.label;}});
      fieldObserver=createFieldObserver(THREE,habitat.root,subjects);
      applyHeightFog(scene);
    } catch(error) { dispose(); throw new Error('This device could not start the 3D habitat. '+(error.message||'Please use the 2D lab.')); }

    function snapshot() {
      var phase=poseState;
      return {ready:!disposed&&!contextLost,phase:phase.phase,label:phase.label,paused:paused,speed:speed,camera:cameraMode,time:time,lighting:lighting,repeatFlights:repeatFlights,
        mode:mode,binoculars:binoculars,crouching:observer.crouching,fieldVisitTime:fieldVisitTime,observation:fieldObserver?fieldObserver.getObservation():null,sightings:sightings.map(function(entry){return Object.assign({},entry);}),observerPosition:observer.position.toArray(),observerSpeed:observer.speed,fieldOfView:camera.fov,pointerLocked:document.pointerLockElement===canvas,
        altitude:bird.root.position.y-(habitat.groundHeight?habitat.groundHeight(bird.root.position.x,bird.root.position.z):0),
        airspeed:phase.airspeed,wingbeat:phase.wingbeat,position:bird.root.position.toArray(),orientation:bird.root.quaternion.toArray(),wind:phase.wind.slice(),
        cameraPosition:camera.position.toArray(),cameraTarget:followTarget.toArray(),pose:Object.assign({},phase.pose,{flapPhase:wingPhase}),
        wildlife:wildlife.snapshot(),animals:mammals&&mode==='free'?mammals.snapshot():[],
        frames:frames,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality:quality,hidden:!!document.hidden};
    }
    function notify(force) { if(!options.onState||disposed) return; if(force||time-stateStamp>=.2||stateStamp<0){stateStamp=time;options.onState(snapshot());} }
    function requestFrame() { if(!disposed&&!contextLost&&!document.hidden&&!raf) raf=global.requestAnimationFrame(tick); }
    function refresh() { dirty=true; requestFrame(); }
    function setPaused(value) { paused=!!value;if(paused)clearMovement();lastStamp=null;notify(true);refresh(); }
    function setSpeed(value) {if(mode==='free')return;var next=Number(value); if([.25,.5,1].indexOf(next)>=0) speed=next; notify(true); }
    function isResidentCamera(mode) { return ['robin','chickadee','mourningDove','grouse','blueJay','northernCardinal'].indexOf(mode)>=0; }
    function clearMovement(){Object.keys(moveKeys).forEach(function(key){delete moveKeys[key];});observer.speed=0;pointerMap.clear();}
    function exitPointerLock(){if(document.pointerLockElement===canvas&&document.exitPointerLock)document.exitPointerLock();}
    function terrain(x,z){var sampler=habitat.groundSurfaceHeight||habitat.groundHeight;return sampler?sampler(x,z):0;}
    function blocked(x,z){return Math.hypot(x,z)>17.5||!!(habitat.isBlocked&&habitat.isBlocked(x,z,.28));}
    function resetObserver(){
      var x=1.8,z=4.8;
      for(var attempt=0;blocked(x,z)&&attempt<32;attempt++){var angle=.36+attempt*.31;x=Math.sin(angle)*5.1;z=Math.cos(angle)*5.1;}
      observer.crouching=false;walk.eyeHeight=1.65;observer.position.set(x,terrain(x,z)+walk.eyeHeight,z);walk.yaw=Math.atan2(x,z);walk.pitch=-.20;observer.speed=0;
    }
    function setMode(value){
      if(disposed||['guided','free'].indexOf(value)<0||value===mode)return;
      clearMovement();exitPointerLock();binoculars=false;observer.crouching=false;fieldObserver.reset();observationKey='';
      if(value==='free'){
        savedGuided={time:time,paused:paused,speed:speed,camera:cameraMode,repeat:repeatFlights,yaw:orbit.yaw,pitch:orbit.pitch,distance:orbit.distance};
        mode='free';time=0;speed=1;repeatFlights=false;cameraMode='walk';resetObserver();freeHawk.reset();
      }else{
        mode='guided';time=savedGuided.time;paused=savedGuided.paused;speed=savedGuided.speed;cameraMode=savedGuided.camera;repeatFlights=savedGuided.repeat;
        orbit.yaw=savedGuided.yaw;orbit.pitch=savedGuided.pitch;orbit.distance=savedGuided.distance;
      }
      if(wildlife.setMode)wildlife.setMode(mode);if(mammals)mammals.setMode(mode);stateStamp=-1;lastStamp=null;updateBird(0,true);updateCamera(1,true);notify(true);refresh();
    }
    function setBinoculars(value){if(mode!=='free'||disposed)return;binoculars=!!value;if(!binoculars){fieldObserver.reset();observationKey='';}notify(true);refresh();}
    function setCrouching(value){if(mode!=='free'||disposed)return;observer.crouching=!!value;notify(true);refresh();}
    function recordSighting(){
      if(disposed||contextLost||mode!=='free'||!binoculars)return false;
      updateCamera(0,false);var observed=fieldObserver.update(0,camera,true,observer.speed,true);
      if(!observed||!observed.identified||sightings.some(function(entry){return entry.id===observed.id;})){notify(true);return false;}
      sightings.push({id:observed.id,name:observed.name,scientificName:observed.scientificName,category:observed.category||'bird',behavior:observed.behavior,distance:observed.distance,time:fieldVisitTime});notify(true);return true;
    }
    function setMove(direction,pressed){if(mode!=='free'||disposed||['forward','back','left','right'].indexOf(direction)<0)return;moveKeys[direction]=!!pressed;refresh();}
    function moveObserver(forward,side,dt){
      var length=Math.hypot(forward,side);if(!length||dt<=0){observer.speed=0;return;}
      var distance=(observer.crouching?(binoculars?.32:.65):(binoculars?.48:1.65))*dt/Math.max(1,length),dx=(-Math.sin(walk.yaw)*forward+Math.cos(walk.yaw)*side)*distance,dz=(-Math.cos(walk.yaw)*forward-Math.sin(walk.yaw)*side)*distance;
      var beforeX=observer.position.x,beforeZ=observer.position.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07));
      for(var step=0;step<steps;step++){
        var x=observer.position.x,z=observer.position.z,nx=x+dx/steps,nz=z+dz/steps,height=terrain(x,z);
        if(!blocked(nx,nz)&&Math.abs(terrain(nx,nz)-height)<.12){observer.position.x=nx;observer.position.z=nz;}
        else if(!blocked(nx,z)&&Math.abs(terrain(nx,z)-height)<.12)observer.position.x=nx;
        else if(!blocked(x,nz)&&Math.abs(terrain(x,nz)-height)<.12)observer.position.z=nz;
      }
      observer.position.y=terrain(observer.position.x,observer.position.z)+walk.eyeHeight;
      observer.speed=Math.hypot(observer.position.x-beforeX,observer.position.z-beforeZ)/dt;
    }
    function stepMove(direction){if(mode!=='free'||paused)return;moveObserver(direction==='forward'?1:direction==='back'?-1:0,direction==='right'?1:direction==='left'?-1:0,.18);refresh();notify(true);}
    function lockPointer(){if(mode!=='free'||!canvas.requestPointerLock)return;try{var result=canvas.requestPointerLock();if(result&&result.catch)result.catch(function(){});}catch(ignore){}}
    function setRepeatFlights(value) {
      if(disposed||mode==='free')return;
      var next=!!value&&!!residentRepeatWindows[cameraMode];
      if(next&&!repeatFlights){
        time=cameraMode==='grouse'?17.58:11.58;stateStamp=-1;lastStamp=null;
        updateBird(0,true);updateCamera(1,true);
      }
      repeatFlights=next;notify(true);refresh();
    }
    function setCamera(mode) {
      if(cameraMode==='walk'||['orbit','follow','wide','robin','chickadee','mourningDove','grouse','blueJay','northernCardinal'].indexOf(mode)===-1)return;
      if(mode!==cameraMode)repeatFlights=false;
      if(mode!==cameraMode && (mode==='mourningDove'||mode==='grouse'||mode==='blueJay'||mode==='northernCardinal')) {
        var resident=wildlife.snapshot().filter(function(value){return value.id===mode;})[0];
        orbit.yaw=(resident?resident.heading:0)+.85;orbit.pitch=.10;orbit.distance=2.65;
      }
      cameraMode=mode;pointerMap.clear();notify(true);refresh();
    }
    function resetView() {if(mode==='free'){clearMovement();resetObserver();binoculars=false;fieldObserver.reset();observationKey='';}else{orbit.yaw=2.4;orbit.pitch=.21;orbit.distance=2.65;cameraMode='orbit';repeatFlights=false;}notify(true);refresh(); }
    function seek(value) {
      if(disposed||mode==='free'||!Number.isFinite(Number(value)))return;
      paused=true;repeatFlights=false;time=clamp(Number(value),0,DURATION);stateStamp=-1;lastStamp=null;
      updateBird(0,true);updateCamera(1,true);notify(true);refresh();
    }
    function setLighting(value) {
      if(disposed||['daylight','golden'].indexOf(value)===-1)return;
      lighting=value;var warm=value==='golden';
      // Keep enough sky fill to read the shaded underside, while letting the
      // sun reveal overlapping feathers, bark ridges and the canopy shadows.
      hemi.color.set(warm?'#c1d1e1':'#d5e8f4');hemi.groundColor.set(warm?'#6d5138':'#4c5938');hemi.intensity=warm?.64:.60;
      sun.color.set(warm?'#ffd19a':'#fff0d7');sun.intensity=warm?2.3:2.05;
      sun.position.set(warm?-30:-18,warm?16:31,warm?25:14);
      rim.color.set(warm?'#d3dae7':'#c5ddec');rim.intensity=warm?.38:.34;
      // Match the horizon to the haze so distant terrain fades into the sky.
      scene.fog.color.set(warm?'#d7cbb3':'#bac9c6');scene.fog.density=warm?.022:.0165;
      scene.background.copy(scene.fog.color);
      sky.material.uniforms.top.value.set(warm?'#7594ad':'#749bb4');
      sky.material.uniforms.bottom.value.copy(scene.fog.color);
      renderer.toneMappingExposure=warm?1.03:1.0;notify(true);refresh();
    }
    function restart() {if(mode==='free')return;time=repeatFlights?(cameraMode==='grouse'?17.58:11.58):0;wingPhase=0;stateStamp=-1;lastStamp=null;updateBird(0,true);updateCamera(1,true);notify(true);refresh(); }
    var controller={setMode:setMode,setBinoculars:setBinoculars,setCrouching:setCrouching,recordSighting:recordSighting,setMove:setMove,stepMove:stepMove,lockPointer:lockPointer,setPaused:setPaused,setSpeed:setSpeed,setCamera:setCamera,setLighting:setLighting,setRepeatFlights:setRepeatFlights,seek:seek,resetView:resetView,restart:restart,dispose:dispose,getState:snapshot};
    canvas._birdlab3d=controller;
    canvas.setAttribute('data-birdlab-3d-ready','true');
    canvas.style.touchAction='none';

    function updateBird(dt,snap) {
      poseState=mode==='free'?freeHawk.update(dt,observer):sampleFlight(time);
      var p=poseState.position;
      if(mode==='free')bird.root.position.fromArray(p);else bird.root.position.set(habitat.perch.x+p[0],ground+p[1],habitat.perch.z+p[2]);
      // The C2 course already supplies smooth attitude. Sampling it directly
      // keeps head stabilization and study poses identical at every frame rate.
      attitude.setFromEuler(new THREE.Euler(poseState.pitch,poseState.yaw,poseState.bank,'YXZ'));
      bird.root.quaternion.copy(attitude);
      wingPhase=mode==='free'?poseState.wingPhase:sampleWingPhase(time);
      bird.update(Object.assign({},poseState.pose,{flapPhase:wingPhase,elapsedTime:time}),dt);
      habitatWind.fromArray(poseState.wind);
      habitat.update(time,options.reducedMotion?0:habitatWind);
      wildlife.update(time,dt,mode==='free'?observer:null);
      if(mammals)mammals.update(time,dt,mode==='free'?observer:null);
    }
    function updateCamera(dt,snap) {
      var fov=mode==='free'?(binoculars?22:60):40;
      if(camera.fov!==fov){camera.fov=snap?fov:camera.fov+(fov-camera.fov)*damping(12,dt);if(Math.abs(camera.fov-fov)<.01)camera.fov=fov;camera.updateProjectionMatrix();}
      if(mode==='free'){
        var eyeHeight=observer.crouching?1.03:1.65;
        walk.eyeHeight=snap?eyeHeight:walk.eyeHeight+(eyeHeight-walk.eyeHeight)*damping(9,dt);if(Math.abs(walk.eyeHeight-eyeHeight)<.001)walk.eyeHeight=eyeHeight;
        observer.position.y=terrain(observer.position.x,observer.position.z)+walk.eyeHeight;
        camera.position.copy(observer.position);targetGoal.set(-Math.sin(walk.yaw)*Math.cos(walk.pitch),Math.sin(walk.pitch),-Math.cos(walk.yaw)*Math.cos(walk.pitch)).add(observer.position);
        followTarget.copy(targetGoal);camera.up.set(0,1,0);camera.lookAt(followTarget);return camera.fov!==fov||walk.eyeHeight!==eyeHeight;
      }
      birdTarget.copy(bird.root.position); birdTarget.y+=.055;
      if(isResidentCamera(cameraMode)) {
        wildlife.getFocus(cameraMode,targetGoal);
        var viewingDistance=({robin:1.05,chickadee:.70,mourningDove:.85,grouse:1.10,blueJay:1.02,northernCardinal:.75}[cameraMode])*orbit.distance/2.65;
        var viewingPitch=clamp(orbit.pitch+.17,-.35,1.35);
        cameraGoal.set(Math.sin(orbit.yaw)*Math.cos(viewingPitch)*viewingDistance,Math.sin(viewingPitch)*viewingDistance,Math.cos(orbit.yaw)*Math.cos(viewingPitch)*viewingDistance).add(targetGoal);
      } else if(cameraMode==='wide') {
        targetGoal.set(-1,ground+2,-5);cameraGoal.set(22,17,31);
      } else if(cameraMode==='follow') {
        sampleFollowFrame(poseState,followFrame);
        targetGoal.fromArray(followFrame.targetOffset).add(birdTarget);
        cameraGoal.fromArray(followFrame.positionOffset).add(birdTarget);
      } else {
        targetGoal.copy(birdTarget);
        cameraGoal.set(Math.sin(orbit.yaw)*Math.cos(orbit.pitch)*orbit.distance,Math.sin(orbit.pitch)*orbit.distance,Math.cos(orbit.yaw)*Math.cos(orbit.pitch)*orbit.distance).add(targetGoal);
      }
      var floor=(habitat.groundHeight?habitat.groundHeight(cameraGoal.x,cameraGoal.z):0)+.24;
      cameraGoal.y=Math.max(cameraGoal.y,floor);
      // Let the camera travel on a softer arc while the aim keeps up with the
      // bird. The faster sightline prevents it drifting out of frame in turns.
      var alpha=snap?1:damping(cameraMode==='follow'?5.5:12,dt);
      var aimAlpha=snap?1:damping(cameraMode==='follow'?11:12,dt);
      if(snap) {camera.position.copy(cameraGoal);followTarget.copy(targetGoal);}
      else {camera.position.lerp(cameraGoal,alpha);followTarget.lerp(targetGoal,aimAlpha);}
      if(cameraMode==='follow'&&habitat.groundHeight)camera.position.y=Math.max(camera.position.y,habitat.groundHeight(camera.position.x,camera.position.z)+.24);
      camera.up.set(0,1,0);camera.lookAt(followTarget);
      return camera.position.distanceToSquared(cameraGoal)+followTarget.distanceToSquared(targetGoal)>.000003;
    }
    var canvasWidth=0,canvasHeight=0;
    function resize() {
      var rect=canvas.getBoundingClientRect(), w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
      // Setting an unchanged backing size still clears WebGL's drawing buffer.
      // ResizeObserver's initial notification can arrive after a paused render.
      if(w===canvasWidth&&h===canvasHeight)return;
      canvasWidth=w;canvasHeight=h;
      renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();refresh();
    }
    function tick(stamp) {
      raf=0;if(disposed||contextLost||document.hidden)return;
      var dt=lastStamp==null?0:clamp((stamp-lastStamp)/1000,0,.1);lastStamp=stamp;
      if(!paused) {
        if(mode==='free'){fieldVisitTime+=dt;moveObserver((moveKeys.forward?1:0)-(moveKeys.back?1:0),(moveKeys.right?1:0)-(moveKeys.left?1:0),dt);}
        time=repeatFlights?advanceResidentObservation(time,dt*speed,cameraMode):time+dt*speed;updateBird(dt*speed,false);
      }
      if(!paused||dirty) {
        // Follow damping uses real frame time on high-refresh displays too.
        // A small bootstrap step is only needed before the first timestamp.
        dirty=updateCamera(cameraMode==='follow'&&dt>0?dt:Math.max(dt,.016),false);
        var observed=fieldObserver.update(dt,camera,mode==='free'&&binoculars,observer.speed,paused);
        var nextKey=observed?[observed.id,Math.floor(observed.progress*10),observed.identified,Math.round(observed.distance*10),observed.behavior].join('|'):'';
        var observationChanged=nextKey!==observationKey;observationKey=nextKey;
        dirty=dirty||fieldObserver.needsFrame();renderer.render(scene,camera);frames++;notify(observationChanged);
      }
      if(!paused||dirty)requestFrame();
    }
    function orbitBy(dx,dy) {if(mode==='free'){var sensitivity=binoculars?.0014:.0035;walk.yaw-=dx*sensitivity;walk.pitch=clamp(walk.pitch-dy*sensitivity,-1.25,1.25);}else{if(!isResidentCamera(cameraMode))cameraMode='orbit';orbit.yaw-=dx*.006;orbit.pitch=clamp(orbit.pitch+dy*.005,-.55,1.25);}refresh();}
    function zoomBy(amount) {if(mode==='free')return;orbit.distance=clamp(orbit.distance*Math.exp(amount),1.1,12);if(!isResidentCamera(cameraMode))cameraMode='orbit';refresh();}
    function pointerDown(event) {
      if(event.button&&event.pointerType!=='touch')return;
      pointerMap.set(event.pointerId,{x:event.clientX,y:event.clientY});
      try{canvas.setPointerCapture(event.pointerId);}catch(e){}
      if(canvas.focus)canvas.focus({preventScroll:true});
      if(pointerMap.size===2){var pts=Array.from(pointerMap.values());pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);}
    }
    function pointerMove(event) {
      if(mode==='free'&&document.pointerLockElement===canvas){orbitBy(event.movementX||0,event.movementY||0);return;}
      var old=pointerMap.get(event.pointerId);if(!old)return;
      var dx=event.clientX-old.x,dy=event.clientY-old.y;pointerMap.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(pointerMap.size>1){var pts=Array.from(pointerMap.values()),distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDistance>0&&distance>0)zoomBy(Math.log(pinchDistance/distance));pinchDistance=distance;}
      else orbitBy(dx,dy);
      notify(true);
    }
    function pointerUp(event) {pointerMap.delete(event.pointerId);pinchDistance=0;}
    listen(canvas,'pointerdown',pointerDown);listen(canvas,'pointermove',pointerMove);listen(canvas,'pointerup',pointerUp);listen(canvas,'pointercancel',pointerUp);listen(canvas,'lostpointercapture',pointerUp);
    listen(canvas,'wheel',function(event){event.preventDefault();zoomBy(clamp(event.deltaY,-180,180)*.0016);notify(true);},{passive:false});
    listen(canvas,'keydown',function(event){
      if(mode==='free'){
        var direction={KeyW:'forward',KeyS:'back',KeyA:'left',KeyD:'right'}[event.code];
        if(direction){setMove(direction,true);event.preventDefault();return;}
        if(event.code==='KeyB'&&!event.repeat){setBinoculars(!binoculars);event.preventDefault();return;}
        if(event.code==='KeyC'&&!event.repeat){setCrouching(!observer.crouching);event.preventDefault();return;}
        if(event.code==='Escape'){clearMovement();exitPointerLock();return;}
      }
      if(event.key==='ArrowLeft')orbitBy(-18,0);else if(event.key==='ArrowRight')orbitBy(18,0);else if(event.key==='ArrowUp')orbitBy(0,-15);else if(event.key==='ArrowDown')orbitBy(0,15);else if(event.key==='+'||event.key==='=')zoomBy(-.13);else if(event.key==='-'||event.key==='_')zoomBy(.13);else return;
      event.preventDefault();notify(true);
    });
    listen(global,'keyup',function(event){var direction={KeyW:'forward',KeyS:'back',KeyA:'left',KeyD:'right'}[event.code];if(direction)moveKeys[direction]=false;});
    listen(canvas,'blur',clearMovement);
    listen(document,'pointerlockchange',function(){if(document.pointerLockElement!==canvas)clearMovement();notify(true);});
    listen(document,'visibilitychange',function(){lastStamp=null;if(document.hidden){global.cancelAnimationFrame(raf);raf=0;clearMovement();exitPointerLock();}else refresh();});
    listen(global,'blur',function(){clearMovement();lastStamp=null;exitPointerLock();});
    listen(canvas,'webglcontextlost',function(event){event.preventDefault();contextLost=true;paused=true;clearMovement();exitPointerLock();global.cancelAnimationFrame(raf);raf=0;if(options.onError)options.onError('The graphics connection was interrupted. Retry the 3D view or return to the 2D lab.');});
    if(global.matchMedia) {
      var reduce=global.matchMedia('(prefers-reduced-motion: reduce)');
      if(reduce.addEventListener)listen(reduce,'change',function(event){if(event.matches)setPaused(true);});
    }
    if(global.ResizeObserver){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);}else listen(global,'resize',resize);
    updateBird(0,true);updateCamera(1,true);setLighting('daylight');resize();renderer.render(scene,camera);frames++;notify(true);requestFrame();
    return controller;
  }
  global.BirdLab3D={mount:mount,sampleFlight:sampleFlight,sampleWingPhase:sampleWingPhase,sampleFollowFrame:sampleFollowFrame,createFreeHawk:createFreeHawk,createFieldObserver:createFieldObserver,courseDuration:DURATION};
})(window);
