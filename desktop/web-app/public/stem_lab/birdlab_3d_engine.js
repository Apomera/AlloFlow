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

  // The articulated bird starts its downstroke at phase + .21. Invert the
  // existing smooth phase clock, rather than advancing a separate wing timer.
  function wingbeatClock(elapsed){return (unshiftedWingPhase(elapsed)+launchPhaseOffset)/TAU+.21;}
  function wingbeatTime(clock,low,high){
    for(var i=0;i<42;i++){var middle=(low+high)/2;if(wingbeatClock(middle)<clock)low=middle;else high=middle;}
    return (low+high)/2;
  }
  function sampleWingbeatWindow(elapsed){
    if(!Number.isFinite(elapsed)||elapsed<0)return null;
    var lap=Math.floor(elapsed/DURATION),low=lap*DURATION,high=low+DURATION;
    var cycle=Math.floor(wingbeatClock(elapsed)),start=wingbeatTime(cycle,low,high),end=wingbeatTime(cycle+1,low,high);
    // A complete powered cycle is required. A glide or a partially folded
    // transition must not be labeled as a full downstroke / recovery pair.
    if(end-start<.15||end-start>.65||wingbeatClock(start)>cycle+1e-7||wingbeatClock(end)<cycle+1-1e-7)return null;
    for(var i=0;i<=8;i++){
      var pose=sampleFlight(start+(end-start)*i/8).pose;
      if(pose.flapAmplitude<.18||pose.fold>.12)return null;
    }
    return {start:start,end:end,cycle:cycle};
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
          solids.push({mesh:proxy,box:box,source:object});
        }
      });
    }
    function visible(position,distance) {
      targetDirection.subVectors(position,origin).normalize();raycaster.set(origin,targetDirection);raycaster.near=.02;raycaster.far=Math.max(.02,distance-.025);
      for(var i=0;i<solids.length;i++) {
        var shown=true;for(var node=solids[i].source;node;node=node.parent)if(node.visible===false){shown=false;break;}if(!shown)continue;
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
    return {update:update,reset:reset,getObservation:function(){return observation?Object.assign({},observation):null;},needsFrame:function(){return !!observation&&!observation.identified;},hasClearLine:function(from,to){origin.copy(from);return visible(to,from.distanceTo(to));}};
  }

  function createWoodlandSky(THREE,quality) {
    // A single packed, repeating weather field gives the existing sky dome
    // slow cloud movement without particles, extra draw calls or ray marching.
    // The lattice wraps before interpolation, so drifting across its boundary
    // cannot reveal a seam. Its seed is independent of habitat placement.
    var size=quality==='low'?128:256, pixels=new Uint8Array(size*size*4), weatherCells={};
    function weatherHash(x,y) {var n=Math.sin(x*127.1+y*311.7+17.43)*43758.5453;return n-Math.floor(n);}
    [4,8,16,32].forEach(function(period){
      var cells=new Float32Array(period*period);
      for(var y=0;y<period;y++)for(var x=0;x<period;x++)cells[y*period+x]=weatherHash(x,y);
      weatherCells[period]=cells;
    });
    function weatherNoise(u,v,period) {
      var x=u*period,y=v*period,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
      fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
      var cells=weatherCells[period];
      function cell(dx,dy){return cells[(((iy+dy)%period+period)%period)*period+((ix+dx)%period+period)%period];}
      return (cell(0,0)*(1-fx)+cell(1,0)*fx)*(1-fy)+(cell(0,1)*(1-fx)+cell(1,1)*fx)*fy;
    }
    for(var y=0;y<size;y++)for(var x=0;x<size;x++) {
      var u=(x+.5)/size,v=(y+.5)/size,offset=(y*size+x)*4;
      pixels[offset]=Math.round(255*(weatherNoise(u,v,4)*.61+weatherNoise(u,v,8)*.25+weatherNoise(u,v,16)*.10+weatherNoise(u,v,32)*.04));
      pixels[offset+1]=Math.round(255*(weatherNoise(u+.37,v+.19,8)*.70+weatherNoise(u+.37,v+.19,16)*.30));
      pixels[offset+2]=0;pixels[offset+3]=255;
    }
    var weather=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);
    weather.name='birdlab-seamless-cloud-field';weather.wrapS=weather.wrapT=THREE.RepeatWrapping;
    weather.magFilter=THREE.LinearFilter;weather.minFilter=THREE.LinearMipmapLinearFilter;
    weather.generateMipmaps=true;weather.needsUpdate=true;
    var sky=new THREE.Mesh(new THREE.SphereGeometry(190,24,12),new THREE.ShaderMaterial({
      uniforms:{top:{value:new THREE.Color('#739bb4')},bottom:{value:new THREE.Color('#e3e7df')},
        cloudField:{value:weather},cloudOffset:{value:new THREE.Vector2()},
        cloudLight:{value:new THREE.Color('#fff8e9')},cloudShade:{value:new THREE.Color('#bbcbd3')},
        sunDirection:{value:new THREE.Vector3(-18,31,14).normalize()},sunTint:{value:new THREE.Color('#fff1d6')}},
      // Camera-relative sightlines keep the distant sun and clouds from
      // sliding against the horizon when the observer walks around the wood.
      vertexShader:'varying vec3 vPosition; void main(){vPosition=(modelMatrix*vec4(position,1.0)).xyz-cameraPosition;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      // r128 applies fog in output space. These sky colours intentionally stay
      // in that same space and all weather fades into the matched horizon.
      fragmentShader:[
        'uniform vec3 top; uniform vec3 bottom; uniform sampler2D cloudField; uniform vec2 cloudOffset;',
        'uniform vec3 cloudLight; uniform vec3 cloudShade; uniform vec3 sunDirection; uniform vec3 sunTint;',
        'varying vec3 vPosition;',
        'void main(){',
        'vec3 ray=normalize(vPosition); float altitude=max(0.0,ray.y);',
        'float horizon=smoothstep(.025,.20,altitude);',
        'vec3 sky=mix(bottom,top,smoothstep(.05,.8,altitude));',
        'float sunward=max(0.0,dot(ray,sunDirection));',
        'float glow=pow(sunward,14.0)*.19+pow(sunward,160.0)*.26;',
        'sky=mix(sky,sunTint,glow*horizon);',
        'vec2 uv=ray.xz/max(.09,altitude)*.085+vec2(.38,.22)-cloudOffset;',
        'float density=texture2D(cloudField,uv).r;',
        'float cover=smoothstep(.46,.67,density);',
        'float sunSide=texture2D(cloudField,uv+sunDirection.xz*.024).r;',
        'float relief=clamp(.88+(density-sunSide)*3.6-cover*.30,0.0,1.0);',
        'vec3 cloud=mix(cloudShade,cloudLight,relief);',
        'float silver=pow(sunward,24.0)*(1.0-cover)*.42;',
        'cloud=mix(cloud,sunTint,silver);',
        'float wisps=texture2D(cloudField,uv*vec2(.48,1.8)+vec2(.26,.47)-cloudOffset*.16).g;',
        'sky=mix(sky,cloudLight,smoothstep(.61,.81,wisps)*.16*horizon);',
        'sky=mix(sky,cloud,cover*.92*horizon);',
        'float disc=smoothstep(.99972,.99993,sunward)*(1.0-cover*.94)*horizon;',
        'gl_FragColor=vec4(mix(sky,sunTint,disc),1.0);',
        '}'
      ].join('\n'),
      side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false
    }));
    sky.name='birdlab-sky';return sky;
  }

  function mount(canvas,options) {
    options=options||{};
    var THREE=global.THREE;
    if(!THREE||!global.BirdLab3DBird||!global.BirdLab3DHabitat||!global.BirdLab3DWildlife||!global.AvianWoodlandBirds||typeof global.AvianWoodlandBirds.create!=='function'||typeof global.AvianWoodlandBirds.supports!=='function'||!global.AvianWoodlandBirds.supports('mourningDove')||!global.AvianWoodlandBirds.supports('grouse')) throw new Error('The 3D scene did not finish loading. Please retry.');
    if(canvas._birdlab3d) canvas._birdlab3d.dispose();
    var scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(40,1,.03,240), renderer;
    var disposed=false, contextLost=false, raf=0, lastStamp=null, time=0, wingPhase=0, frames=0;
    var paused=!!options.reducedMotion, speed=1, cameraMode='orbit', lighting='daylight', stateStamp=-1, dirty=true, repeatFlights=false;
    var studyOverlay=false, flightStudy=null, wingbeatStudy=null;
    var wingtipPaths=false,wingtipTrace=null;
    var wingtipPinned=null,wingbeatView='free';
    var courseLens=false,coursePin=null,courseSamples=null,courseReview=null;
    var attitudeLens=false,attitudeView='oblique',attitudeGuide=null;
    var lightStudy=false,lightPin=null,lightingDirectionCustom=false;
    var perspectiveStudy=false,perspectiveDistance=3.2,perspectiveFov=40,perspectiveLinked=false,perspectiveScale=null,perspectivePin=null;
    var anatomyStudy=false,anatomyPart='leftWing',anatomyIsolate=false,anatomyView='oblique',anatomyZoom=1,anatomyCache=null,anatomySavedOrbit=null,anatomyVisibility=[],anatomyPin=null;
    var anatomyFrozenData=null,anatomyFrozenGuide=null,anatomyFrozenEnabled=false,anatomyFrozenUsed=false,anatomyFrozenOpacity=.35;
    var mode='guided',savedGuided=null,binoculars=false,freeHawk=null,fieldObserver=null,sightings=[],observationKey='',fieldVisitTime=0;
    var observer={position:new THREE.Vector3(1.8,1.65,4.8),speed:0,crouching:false},walk={yaw:.36,pitch:-.20,eyeHeight:1.65},moveKeys=Object.create(null);
    var quality=selectQuality(options.quality);
    var listeners=[], resizeObserver=null, habitat=null, bird=null, wildlife=null, mammals=null;
    var orbit={yaw:2.4,pitch:.21,distance:2.65}, pointerMap=new Map(), pinchDistance=0;
    var scenePickRay=new THREE.Raycaster(),scenePickPoint=new THREE.Vector2(),scenePickMeshes=[],scenePickOwners=new Map();
    var surfaceRuler=false,surfacePoints=[],surfaceTime=null,surfaceGuide=null,surfaceMeasureMode='distance';
    var poseState=sampleFlight(0), followTarget=new THREE.Vector3(), cameraGoal=new THREE.Vector3(), targetGoal=new THREE.Vector3();
    var birdTarget=new THREE.Vector3(), ground=0, attitude=new THREE.Quaternion(), habitatWind=new THREE.Vector3();
    var wingCameraDirection=new THREE.Vector3(),wingCameraUp=new THREE.Vector3();
    var followFrame={positionOffset:[0,0,0],targetOffset:[0,0,0]};
    function listen(target,name,fn,opts) { target.addEventListener(name,fn,opts); listeners.push(function(){target.removeEventListener(name,fn,opts);}); }
    function releaseResources(root) {
      var geometries=new Set(), materials=new Set(), textures=new Set();
      root.traverse(function(obj){
        if(obj.geometry) geometries.add(obj.geometry);
        var list=Array.isArray(obj.material)?obj.material:obj.material?[obj.material]:[];
        list.forEach(function(mat){
          materials.add(mat);Object.keys(mat).forEach(function(key){if(mat[key]&&mat[key].isTexture)textures.add(mat[key]);});
          if(mat.uniforms)Object.keys(mat.uniforms).forEach(function(key){var value=mat.uniforms[key].value;if(value&&value.isTexture)textures.add(value);});
        });
      });
      geometries.forEach(function(g){g.dispose();}); textures.forEach(function(t){t.dispose();}); materials.forEach(function(m){m.dispose();});
    }
    function dispose() {
      if(disposed) return; disposed=true;
      leaveSurfaceRuler();
      anatomyPin=null;anatomyFrozenData=null;restoreAnatomyVisibility();
      global.cancelAnimationFrame(raf); listeners.forEach(function(fn){fn();});
      if(resizeObserver) resizeObserver.disconnect();
      clearMovement();exitPointerLock();
      scenePickMeshes.length=0;scenePickOwners.clear();
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
      var sun=new THREE.DirectionalLight('#fff0d7',2.1); sun.name='birdlab-key-sun';sun.position.set(-18,31,14); sun.castShadow=true;
      sun.shadow.mapSize.set(quality==='low'?1024:2048,quality==='low'?1024:2048);
      Object.assign(sun.shadow.camera,{left:-44,right:44,top:44,bottom:-44,near:1,far:135});
      sun.shadow.bias=-.00035; sun.shadow.normalBias=.025; sun.shadow.radius=2;
      scene.add(sun); scene.add(sun.target);
      var rim=new THREE.DirectionalLight('#d3e6f2',.75); rim.position.set(12,15,-24); scene.add(rim);
      var sky=createWoodlandSky(THREE,quality);scene.add(sky);
      habitat=global.BirdLab3DHabitat.create(THREE,scene,{quality:quality});
      if(habitat.root&&!habitat.root.parent) scene.add(habitat.root);
      bird=global.BirdLab3DBird.create(THREE); bird.root.name='birdlab-red-tailed-hawk'; scene.add(bird.root);
      wildlife=global.BirdLab3DWildlife.create(THREE,scene,{quality:quality,groundHeight:habitat.groundSurfaceHeight||habitat.groundHeight,isBlocked:habitat.isBlocked});
      if(global.BirdLab3DMammals&&global.BirdLab3DMammals.create)mammals=global.BirdLab3DMammals.create(THREE,scene,{quality:quality,groundHeight:habitat.groundSurfaceHeight||habitat.groundHeight,isBlocked:habitat.isBlocked});
      if(!habitat.perch) habitat.perch=new THREE.Vector3(0,3.2,0);
      ground=habitat.perch.y-(Number.isFinite(bird.footOffsetY)?bird.footOffsetY:-.185);
      // Study geometry samples the existing course; it never drives the bird.
      // Allocate once and dispose with the scene, including when never enabled.
      var studyRoot=new THREE.Group();studyRoot.name='birdlab-flight-study-overlay';studyRoot.visible=false;scene.add(studyRoot);
      var studyCurve=new THREE.Curve();
      studyCurve.getPoint=studyCurve.getPointAt=function(u,out){
        var point=sampleCourse(3+35*clamp(u,0,1)).position;
        return (out||new THREE.Vector3()).set(habitat.perch.x+point[0],ground+point[1],habitat.perch.z+point[2]);
      };
      studyCurve.getTangentAt=function(u,out){return studyCurve.getPoint(clamp(u+.0001,0,1),out).sub(studyCurve.getPoint(clamp(u-.0001,0,1))).normalize();};
      function studyTube(name,radius,color,opacity){
        var mesh=new THREE.Mesh(new THREE.TubeGeometry(studyCurve,280,radius,4,false),new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:opacity,depthWrite:false,toneMapped:false,fog:false}));
        mesh.name=name;studyRoot.add(mesh);return mesh;
      }
      studyTube('birdlab-study-course-backing',.105,'#142c29',.72).renderOrder=1;
      var studyCourse=studyTube('birdlab-study-course',.065,'#37ded4',.92);studyCourse.renderOrder=2;
      studyCourse.geometry.computeBoundingSphere();
      var studyFlown=studyTube('birdlab-study-flown',.075,'#ffc145',1);studyFlown.renderOrder=3;
      var studyHeight=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineDashedMaterial({color:'#fff4b8',dashSize:.14,gapSize:.1,transparent:true,opacity:1,depthWrite:false,toneMapped:false,fog:false}));
      studyHeight.name='birdlab-study-height';studyRoot.add(studyHeight);
      var studyGround=new THREE.Mesh(new THREE.RingGeometry(.23,.31,32),new THREE.MeshBasicMaterial({color:'#ffc145',side:THREE.DoubleSide,transparent:true,opacity:1,depthWrite:false,toneMapped:false,fog:false}));
      studyGround.name='birdlab-study-ground';studyGround.rotation.x=-Math.PI/2;studyRoot.add(studyGround);
      var studyHeading=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(),1.5,0xbcece5,.32,.17);
      studyHeading.name='birdlab-study-heading';studyRoot.add(studyHeading);
      studyHeading.line.material.toneMapped=false;studyHeading.line.material.fog=false;studyHeading.cone.material.toneMapped=false;studyHeading.cone.material.fog=false;
      var studyMarker=new THREE.Mesh(new THREE.TorusGeometry(.6,.035,6,40),new THREE.MeshBasicMaterial({color:'#fff2b0',toneMapped:false,fog:false}));
      studyMarker.name='birdlab-study-marker';studyRoot.add(studyMarker);
      flightStudy={root:studyRoot,flown:studyFlown,height:studyHeight,ground:studyGround,heading:studyHeading,marker:studyMarker,courseBounds:studyCourse.geometry.boundingSphere.clone(),direction:new THREE.Vector3(),flownBase:studyFlown.geometry.attributes.position.array.slice(),terminalRing:-1,curve:studyCurve,terminalPoint:new THREE.Vector3()};
      freeHawk=createFreeHawk(habitat.perches||[habitat.perch],Number.isFinite(bird.footOffsetY)?bird.footOffsetY:-.185);
      var subjects=wildlife.snapshot().map(function(resident){return {id:resident.id,name:resident.name,scientificName:resident.scientificName,
        getPosition:function(out){return wildlife.getFocus(resident.id,out);},getBehavior:function(){var current=wildlife.snapshot().filter(function(value){return value.id===resident.id;})[0];return current?current.behavior:'';}};});
      if(mammals)mammals.snapshot().forEach(function(resident){subjects.push({id:resident.id,name:resident.name,scientificName:resident.scientificName,category:'mammal',
        getPosition:function(out){return mammals.getFocus(resident.id,out);},getBehavior:function(){var current=mammals.snapshot().filter(function(value){return value.id===resident.id;})[0];return current?current.behavior:'';}});});
      subjects.push({id:'redTailedHawk',name:'Red-tailed hawk',scientificName:'Buteo jamaicensis',getPosition:function(out){out.copy(bird.root.position);out.y+=.055;return out;},getBehavior:function(){return poseState.label;}});
      fieldObserver=createFieldObserver(THREE,habitat.root,subjects);
      // Resolve actual drawable meshes once. Ownership follows existing stable
      // resident roots; no proxy bird geometry or additional visual resources.
      function addPickRoot(root,id){if(root)root.traverse(function(mesh){if(mesh.isMesh){scenePickMeshes.push(mesh);scenePickOwners.set(mesh,id);}});}
      addPickRoot(bird.root,'orbit');wildlife.snapshot().forEach(function(resident){addPickRoot(wildlife.root.getObjectByName('woodland-'+resident.id),resident.id);});
      applyHeightFog(scene);
    } catch(error) { dispose(); throw new Error('This device could not start the 3D habitat. '+(error.message||'Please use the 2D lab.')); }

    function snapshot() {
      var phase=poseState;
      var beat=null;
      if(wingbeatStudy){
        var progress=clamp(wingbeatClock(time)-wingbeatStudy.cycle,0,1);
        beat={start:wingbeatStudy.start,end:wingbeatStudy.end,cycle:wingbeatStudy.cycle,progress:progress,
          stroke:progress<.00001||progress>.99999?'top':Math.abs(progress-.42)<.00001?'bottom':progress<.42?'downstroke':'upstroke'};
      }
      return {ready:!disposed&&!contextLost,canSelectBird:canSelectSceneBird(),canMeasureSurfaces:canUseSurfaceRuler(),surfaceRuler:surfaceRuler,surfaceMeasurement:surfaceSnapshot(),phase:phase.phase,label:phase.label,paused:paused,speed:speed,camera:cameraMode,time:time,lighting:lighting,lightingDirectionCustom:lightingDirectionCustom,lightStudy:lightStudy,lightInvestigation:lightSnapshot(),perspectiveStudy:perspectiveStudy,perspectiveInvestigation:perspectiveSnapshot(),anatomyStudy:anatomyStudy,anatomyInvestigation:anatomySnapshot(),repeatFlights:repeatFlights,studyOverlay:studyOverlay,studyOverlayVisible:!!(flightStudy&&flightStudy.root.visible),courseLens:courseLens,courseStudy:courseSnapshot(),attitudeLens:attitudeLens,attitudeStudy:attitudeSnapshot(),
        wingbeatStudy:beat,wingtipPaths:wingtipPaths,wingtipPathsVisible:!!(wingtipTrace&&wingtipTrace.root.visible),wingtipStudy:beat&&wingtipTrace?{paths:wingtipTrace.sides.map(function(side){return Array.from(side.line.geometry.attributes.position.array);}),current:wingtipTrace.sides.map(function(side){return side.marker.position.toArray();}),pinned:wingtipPinned?{progress:wingtipPinned.progress,points:wingtipPinned.points.map(function(point){return point.slice();})}:null,radius:wingtipTrace.radius}:null,wingbeatView:beat?wingbeatView:'free',canInspectWingbeat:mode==='guided'&&!isResidentCamera(cameraMode)&&!!sampleWingbeatWindow(time),
        mode:mode,binoculars:binoculars,crouching:observer.crouching,fieldVisitTime:fieldVisitTime,observation:fieldObserver?fieldObserver.getObservation():null,sightings:sightings.map(function(entry){return Object.assign({},entry);}),observerPosition:observer.position.toArray(),observerSpeed:observer.speed,fieldOfView:camera.fov,pointerLocked:document.pointerLockElement===canvas,
        altitude:bird.root.position.y-terrain(bird.root.position.x,bird.root.position.z),
        airspeed:phase.airspeed,wingbeat:phase.wingbeat,position:bird.root.position.toArray(),orientation:bird.root.quaternion.toArray(),wind:phase.wind.slice(),
        cameraPosition:camera.position.toArray(),cameraTarget:followTarget.toArray(),pose:Object.assign({},phase.pose,{flapPhase:wingPhase}),
        wildlife:wildlife.snapshot(),animals:mammals&&mode==='free'?mammals.snapshot():[],
        frames:frames,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality:quality,hidden:!!document.hidden};
    }
    function notify(force) { if(disposed)return;updateWingtipPaths();updateSurfaceRuler();updateAnatomyFrozenSurface();if(force){updateCourseLens();updateAttitudeGuide();}if(!options.onState) return; if(force||time-stateStamp>=.2||stateStamp<0){stateStamp=time;options.onState(snapshot());} }
    function setWingtipPaths(value){wingtipPaths=!!value;notify(true);refresh();}
    function createWingtipPaths(){
      var root=new THREE.Group();root.name='birdlab-wingtip-paths';root.visible=false;scene.add(root);
      var cylinder=new THREE.CylinderGeometry(1,1,1,6,1,true),sphere=new THREE.SphereGeometry(.014,10,8);
      var sides=['left','right'].map(function(name,index){
        var color=index===0?0xffca65:0x58e5dd;
        var geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(65*3),3));
        var line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:color,fog:false,toneMapped:false}));line.name='birdlab-wingtip-'+name;line.frustumCulled=false;root.add(line);
        var outline=new THREE.InstancedMesh(cylinder,new THREE.MeshBasicMaterial({color:0x153331,depthWrite:false,fog:false,toneMapped:false}),64);
        var stroke=new THREE.InstancedMesh(cylinder,new THREE.MeshBasicMaterial({color:color,depthWrite:false,fog:false,toneMapped:false}),64);
        outline.name='birdlab-wingtip-outline-'+name;stroke.name='birdlab-wingtip-stroke-'+name;
        outline.renderOrder=20;stroke.renderOrder=21;line.renderOrder=22;
        outline.frustumCulled=stroke.frustumCulled=false;root.add(outline);root.add(stroke);
        var marker=new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color:color,fog:false,toneMapped:false}));marker.name='birdlab-wingtip-current-'+name;root.add(marker);
        return {line:line,outline:outline,stroke:stroke,marker:marker,vane:bird.joints.wings[index].primaries[0].userData.vane};
      });
      wingtipTrace={root:root,sides:sides,key:null,inverse:new THREE.Matrix4(),base:new THREE.Vector3(),morph:new THREE.Vector3(),point:new THREE.Vector3(),from:new THREE.Vector3(),to:new THREE.Vector3(),mid:new THREE.Vector3(),direction:new THREE.Vector3(),axis:new THREE.Vector3(0,1,0),scale:new THREE.Vector3(),rotation:new THREE.Quaternion(),matrix:new THREE.Matrix4()};
    }
    function readWingtip(vane,out){
      var trace=wingtipTrace,position=vane.geometry.attributes.position,index=position.count-3;
      trace.base.fromBufferAttribute(position,index);out.copy(trace.base);
      (vane.geometry.morphAttributes.position||[]).forEach(function(target,i){
        var weight=vane.morphTargetInfluences[i]||0;if(!weight)return;
        trace.morph.fromBufferAttribute(target,index);if(!vane.geometry.morphTargetsRelative)trace.morph.sub(trace.base);out.addScaledVector(trace.morph,weight);
      });
      return out.applyMatrix4(vane.matrixWorld).applyMatrix4(trace.inverse);
    }
    function updateWingtipPaths(){
      var active=!!wingbeatStudy&&mode==='guided'&&!isResidentCamera(cameraMode);
      if(!wingtipTrace){if(!active)return;createWingtipPaths();}
      var trace=wingtipTrace;trace.root.visible=active&&wingtipPaths;if(!active)return;
      trace.root.position.copy(bird.root.position);trace.root.quaternion.copy(bird.root.quaternion);trace.root.scale.copy(bird.root.scale);
      bird.root.updateMatrixWorld(true);trace.inverse.copy(bird.root.matrixWorld).invert();
      var key=[wingbeatStudy.cycle,wingbeatStudy.start,wingbeatStudy.end].join(':');
      if(trace.key!==key){
        // Sample only the articulated bird, never the woodland, flight clock or
        // wildlife. Remove whole-body travel and restore the exact current pose.
        try{
          for(var sample=0;sample<=64;sample++){
            var sampleTime=wingbeatTime(wingbeatStudy.cycle+sample/64,wingbeatStudy.start,wingbeatStudy.end),pose=sampleFlight(sampleTime);
            bird.update(Object.assign({},pose.pose,{flapPhase:sampleWingPhase(sampleTime),elapsedTime:sampleTime}),0);bird.root.updateMatrixWorld(true);
            trace.sides.forEach(function(side){readWingtip(side.vane,trace.point);side.line.geometry.attributes.position.setXYZ(sample,trace.point.x,trace.point.y,trace.point.z);});
          }
        }finally{bird.update(Object.assign({},poseState.pose,{flapPhase:wingPhase,elapsedTime:time}),0);bird.root.updateMatrixWorld(true);}
        trace.sides.forEach(function(side){
          var points=side.line.geometry.attributes.position;points.needsUpdate=true;
          for(var segment=0;segment<64;segment++){
            trace.from.fromBufferAttribute(points,segment);trace.to.fromBufferAttribute(points,segment+1);trace.direction.subVectors(trace.to,trace.from);
            var length=trace.direction.length();trace.rotation.setFromUnitVectors(trace.axis,length>1e-9?trace.direction.multiplyScalar(1/length):trace.axis);trace.mid.addVectors(trace.from,trace.to).multiplyScalar(.5);
            trace.scale.set(.0065,length,.0065);trace.matrix.compose(trace.mid,trace.rotation,trace.scale);side.outline.setMatrixAt(segment,trace.matrix);
            trace.scale.x=trace.scale.z=.0036;trace.matrix.compose(trace.mid,trace.rotation,trace.scale);side.stroke.setMatrixAt(segment,trace.matrix);
          }
          side.outline.instanceMatrix.needsUpdate=true;side.stroke.instanceMatrix.needsUpdate=true;
        });trace.radius=.5;
        trace.sides.forEach(function(side){var points=side.line.geometry.attributes.position;for(var i=0;i<points.count;i++)trace.radius=Math.max(trace.radius,Math.hypot(points.getX(i),points.getY(i),points.getZ(i)));});
        trace.radius+=.12;trace.key=key;
      }
      trace.sides.forEach(function(side){readWingtip(side.vane,side.marker.position);});
    }
    function requestFrame() { if(!disposed&&!contextLost&&!document.hidden&&!raf) raf=global.requestAnimationFrame(tick); }
    function refresh() { dirty=true; requestFrame(); }
    function setPaused(value) { paused=!!value;if(!paused){wingbeatStudy=null;if(mode==='guided'&&anatomyStudy){leaveAnatomy();updateCamera(1,true);}}if(paused)clearMovement();lastStamp=null;notify(true);refresh(); }
    function pinWingtipPose(){
      if(disposed||!wingbeatStudy)return;
      updateWingtipPaths();wingtipPinned={progress:clamp(wingbeatClock(time)-wingbeatStudy.cycle,0,1),points:wingtipTrace.sides.map(function(side){return side.marker.position.toArray();})};notify(true);refresh();
    }
    function clearWingtipPose(){wingtipPinned=null;notify(true);refresh();}
    function setWingbeatView(value){
      if(disposed||!wingbeatStudy||['front','side','above','free'].indexOf(value)<0)return;
      wingbeatView=value;cameraMode='orbit';updateCamera(1,true);notify(true);refresh();
    }
    function inspectWingbeat(){
      if(disposed||mode!=='guided'||isResidentCamera(cameraMode))return false;
      var window=sampleWingbeatWindow(time);if(!window)return false;
      leaveAnatomy();
      leavePerspective();
      wingbeatStudy=window;wingtipPinned=null;wingbeatView='free';attitudeLens=false;lightStudy=false;paused=true;repeatFlights=false;lastStamp=null;
      // A close orbit reveals the articulation; retain the observer's orbit
      // direction and leave all other camera choices available afterward.
      if(cameraMode==='wide')cameraMode='orbit';
      if(cameraMode==='orbit')orbit.distance=Math.min(orbit.distance,2.65);
      updateBird(0,true);updateWingtipPaths();updateCamera(1,true);notify(true);refresh();return true;
    }
    function seekWingbeat(value){
      if(disposed||!wingbeatStudy||!Number.isFinite(Number(value)))return;
      var progress=clamp(Number(value),0,1);
      time=wingbeatTime(wingbeatStudy.cycle+progress,wingbeatStudy.start,wingbeatStudy.end);
      paused=true;lastStamp=null;stateStamp=-1;updateBird(0,true);updateCamera(1,true);notify(true);refresh();
    }
    function closeWingbeat(){wingbeatStudy=null;wingtipPinned=null;wingbeatView='free';updateCamera(1,true);notify(true);refresh();}
    function setStudyOverlay(value){var wasAnatomy=anatomyVisible();if(value)leaveAnatomy();studyOverlay=!!value;if(wasAnatomy)updateCamera(1,true);updateStudyOverlay();notify(true);refresh();}
    function updateStudyOverlay(){
      if(!flightStudy)return;
      flightStudy.root.visible=studyOverlay&&mode==='guided'&&!isResidentCamera(cameraMode);
      if(!flightStudy.root.visible)return;
      var courseTime=((time%DURATION)+DURATION)%DURATION;
      if(paused&&time>0&&courseTime<.000001)courseTime=DURATION;
      var position=bird.root.position, floor=terrain(position.x,position.z);
      // Preserve the sampled tube, moving only its final ring to this exact
      // frame. Restore the previous ring first so seeks and loop restarts
      // cannot leave a kink behind. Five vertices replace extra tessellation.
      var progress=clamp((courseTime-3)/35,0,1),terminalRing=Math.ceil(progress*280-1e-9);
      var flownPositions=flightStudy.flown.geometry.attributes.position,base=flightStudy.flownBase;
      if(flightStudy.terminalRing>=0){
        var previousOffset=flightStudy.terminalRing*5*3;
        for(var restoreIndex=0;restoreIndex<15;restoreIndex++)flownPositions.array[previousOffset+restoreIndex]=base[previousOffset+restoreIndex];
      }
      if(terminalRing>0){
        flightStudy.curve.getPoint(terminalRing/280,flightStudy.terminalPoint);
        var offset=terminalRing*5*3,dx=position.x-flightStudy.terminalPoint.x,dy=position.y-flightStudy.terminalPoint.y,dz=position.z-flightStudy.terminalPoint.z;
        for(var ringVertex=0;ringVertex<5;ringVertex++){
          var vertexOffset=offset+ringVertex*3;
          flownPositions.array[vertexOffset]=base[vertexOffset]+dx;flownPositions.array[vertexOffset+1]=base[vertexOffset+1]+dy;flownPositions.array[vertexOffset+2]=base[vertexOffset+2]+dz;
        }
      }
      flownPositions.needsUpdate=true;flightStudy.terminalRing=terminalRing>0?terminalRing:-1;
      flightStudy.flown.geometry.setDrawRange(0,terminalRing*4*6);
      var positions=flightStudy.height.geometry.attributes.position;
      positions.setXYZ(0,position.x,floor,position.z);positions.setXYZ(1,position.x,position.y,position.z);positions.needsUpdate=true;
      flightStudy.height.geometry.computeBoundingSphere();flightStudy.height.computeLineDistances();
      flightStudy.ground.position.set(position.x,floor+.025,position.z);
      flightStudy.marker.position.copy(position);
      flightStudy.direction.fromArray(sampleCourse(courseTime).velocity);
      flightStudy.heading.visible=flightStudy.direction.lengthSq()>.04;
      if(flightStudy.heading.visible){flightStudy.heading.position.copy(position);flightStudy.heading.setDirection(flightStudy.direction.normalize());}
    }
    function setSpeed(value) {if(mode==='free')return;var next=Number(value); if([.25,.5,1].indexOf(next)>=0) speed=next; notify(true); }
    var SHARED_RESIDENT_CAMERAS=['mourningDove','grouse','blueJay','northernCardinal','darkEyedJunco','tuftedTitmouse','easternTowhee','americanGoldfinch','easternBluebird','whiteThroatedSparrow'];
    function isResidentCamera(mode) { return mode==='robin'||mode==='chickadee'||SHARED_RESIDENT_CAMERAS.indexOf(mode)>=0; }
    function clearMovement(){Object.keys(moveKeys).forEach(function(key){delete moveKeys[key];});observer.speed=0;pointerMap.clear();}
    function exitPointerLock(){if(document.pointerLockElement===canvas&&document.exitPointerLock)document.exitPointerLock();}
    function terrain(x,z){var sampler=habitat.groundSurfaceHeight||habitat.groundHeight;return sampler?sampler(x,z):0;}
    function courseVisible(){return courseLens&&mode==='guided'&&!isResidentCamera(cameraMode)&&!wingbeatStudy;}
    function courseTime(){var value=((time%DURATION)+DURATION)%DURATION;return paused&&time>0&&value<.000001?DURATION:value;}
    function courseStation(value){
      var t=clamp(value,0,DURATION),p=sampleCourse(t).position;
      var position=[habitat.perch.x+p[0],ground+p[1],habitat.perch.z+p[2]];
      return {t:t,position:position,ground:terrain(position[0],position[2])};
    }
    function ensureCourseSamples(){if(!courseSamples){courseSamples=[];for(var i=0;i<=176;i++)courseSamples.push(courseStation(i*.25));}return courseSamples;}
    function copyCourseStation(value){return {t:value.t,position:value.position.slice(),ground:value.ground};}
    function courseInterval(a,b){
      var lo=Math.min(a,b),hi=Math.max(a,b),points=[courseStation(lo)];
      ensureCourseSamples().forEach(function(point){if(point.t>lo&&point.t<hi)points.push(point);});
      if(hi>lo)points.push(courseStation(hi));return points;
    }
    function courseSnapshot(){
      if(!courseVisible())return null;
      var selected=courseStation(courseTime()),pinned=coursePin===null?null:courseStation(coursePin);
      var interval=pinned?courseInterval(pinned.t,selected.t):[],comparison=null;
      if(pinned){
        var length=0;for(var i=1;i<interval.length;i++){var a=interval[i-1].position,b=interval[i].position;length+=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);}
        comparison={elapsed:Math.abs(selected.t-pinned.t),routeLength:length,separation:Math.hypot(selected.position[0]-pinned.position[0],selected.position[1]-pinned.position[1],selected.position[2]-pinned.position[2]),heightChange:selected.position[1]-pinned.position[1],clearanceChange:(selected.position[1]-selected.ground)-(pinned.position[1]-pinned.ground)};
      }
      return {duration:DURATION,samples:ensureCourseSamples().map(copyCourseStation),selected:selected,pinned:pinned,interval:interval.map(copyCourseStation),comparison:comparison};
    }
    function createCourseReview(){
      if(courseReview)return;
      var root=new THREE.Group();root.name='birdlab-course-comparison';root.visible=false;scene.add(root);
      var cylinder=new THREE.CylinderGeometry(1,1,1,6,1,true);
      var outline=new THREE.InstancedMesh(cylinder,new THREE.MeshBasicMaterial({color:0x17352e,depthWrite:false,fog:false,toneMapped:false}),178);
      var interval=new THREE.InstancedMesh(cylinder,new THREE.MeshBasicMaterial({color:0xffce79,fog:false,toneMapped:false}),178);
      outline.name='birdlab-course-interval-outline';interval.name='birdlab-course-interval';outline.frustumCulled=interval.frustumCulled=false;
      outline.renderOrder=24;interval.renderOrder=25;outline.count=interval.count=0;root.add(outline);root.add(interval);
      var anchor=new THREE.Mesh(new THREE.TorusGeometry(1,.14,6,40),new THREE.MeshBasicMaterial({color:0xffce79,fog:false,toneMapped:false}));anchor.name='birdlab-course-anchor';root.add(anchor);
      var tether=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineDashedMaterial({color:0xffce79,dashSize:.18,gapSize:.13,fog:false,toneMapped:false}));tether.name='birdlab-course-anchor-height';root.add(tether);
      courseReview={root:root,outline:outline,interval:interval,anchor:anchor,tether:tether,from:new THREE.Vector3(),to:new THREE.Vector3(),mid:new THREE.Vector3(),direction:new THREE.Vector3(),axis:new THREE.Vector3(0,1,0),scale:new THREE.Vector3(),rotation:new THREE.Quaternion(),matrix:new THREE.Matrix4()};
    }
    function updateCourseLens(){
      if(!courseReview)return;var review=courseReview;review.root.visible=courseVisible();
      // Gold has one meaning in the comparison: A and its selected interval.
      // Restore the older start-to-current trace outside this lens.
      flightStudy.flown.visible=!review.root.visible;
      flightStudy.marker.scale.setScalar(review.root.visible?Math.max(1,camera.position.distanceTo(bird.root.position)*2*Math.tan(camera.fov*Math.PI/360)/Math.max(1,canvas.clientHeight)*6/.6):1);
      if(!review.root.visible)return;
      var pinned=coursePin===null?null:courseStation(coursePin),points=pinned?courseInterval(pinned.t,courseTime()):[];
      review.anchor.visible=review.tether.visible=!!pinned;
      var pixel=2*Math.tan(camera.fov*Math.PI/360)/Math.max(1,canvas.clientHeight);
      if(pinned){
        review.anchor.position.fromArray(pinned.position);review.anchor.quaternion.copy(camera.quaternion);
        review.anchor.scale.setScalar(Math.max(.24,camera.position.distanceTo(review.anchor.position)*pixel*6));
        var positions=review.tether.geometry.attributes.position;
        positions.setXYZ(0,pinned.position[0],pinned.ground,pinned.position[2]);positions.setXYZ(1,pinned.position[0],pinned.position[1],pinned.position[2]);positions.needsUpdate=true;
        review.tether.geometry.computeBoundingSphere();review.tether.computeLineDistances();
      }
      review.interval.count=review.outline.count=Math.max(0,points.length-1);
      for(var i=1;i<points.length;i++){
        review.from.fromArray(points[i-1].position);review.to.fromArray(points[i].position);review.mid.addVectors(review.from,review.to).multiplyScalar(.5);review.direction.subVectors(review.to,review.from);
        var length=review.direction.length();review.rotation.setFromUnitVectors(review.axis,length>1e-10?review.direction.multiplyScalar(1/length):review.axis);
        // Stay outside the existing .105m course backing in close views too.
        var radius=Math.max(.16,camera.position.distanceTo(review.mid)*pixel*1.6);
        review.scale.set(radius*1.8,length,radius*1.8);review.matrix.compose(review.mid,review.rotation,review.scale);review.outline.setMatrixAt(i-1,review.matrix);
        review.scale.x=review.scale.z=radius;review.matrix.compose(review.mid,review.rotation,review.scale);review.interval.setMatrixAt(i-1,review.matrix);
      }
      review.interval.instanceMatrix.needsUpdate=true;review.outline.instanceMatrix.needsUpdate=true;
    }
    function setCourseLens(value){
      if(disposed||mode!=='guided'||isResidentCamera(cameraMode))return;
      courseLens=!!value;
      if(courseLens){leaveAnatomy();leavePerspective();createCourseReview();ensureCourseSamples();wingbeatStudy=null;attitudeLens=false;lightStudy=false;paused=true;repeatFlights=false;lastStamp=null;studyOverlay=true;cameraMode='wide';updateBird(0,true);updateCamera(1,true);}
      updateCourseLens();notify(true);refresh();
    }
    function pinCourseStation(){if(!courseVisible())return;coursePin=courseTime();updateCourseLens();notify(true);refresh();}
    function clearCourseStation(){coursePin=null;updateCourseLens();notify(true);refresh();}
    function attitudeVisible(){return attitudeLens&&mode==='guided'&&!isResidentCamera(cameraMode)&&!wingbeatStudy&&!courseLens;}
    function attitudeSnapshot(){
      if(!attitudeVisible())return null;
      // Read the displayed body frame, never write a second pose or clock.
      var forward=new THREE.Vector3(0,0,-1).applyQuaternion(bird.root.quaternion),right=new THREE.Vector3(1,0,0).applyQuaternion(bird.root.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(bird.root.quaternion);
      return {position:bird.root.position.toArray(),forward:forward.toArray(),right:right.toArray(),up:up.toArray(),worldUp:[0,1,0],heading:Math.atan2(-forward.x,-forward.z)*180/Math.PI,pitch:Math.asin(clamp(forward.y,-1,1))*180/Math.PI,bank:Math.atan2(right.y,up.y)*180/Math.PI,view:attitudeView};
    }
    function createAttitudeGuide(){
      if(attitudeGuide)return;
      var root=new THREE.Group();root.name='birdlab-attitude-guide';root.visible=false;scene.add(root);
      var body=new THREE.Group();body.name='birdlab-attitude-body-frame';root.add(body);
      var stemGeometry=new THREE.CylinderGeometry(1,1,1,8,1,true),tipGeometry=new THREE.ConeGeometry(1,1,10);
      [['forward',[0,0,-1],0xffcf76],['right',[1,0,0],0x5be5da],['up',[0,1,0],0xffa8bd]].forEach(function(spec){
        var axis=new THREE.Group();axis.name='birdlab-attitude-'+spec[0];axis.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3().fromArray(spec[1]));body.add(axis);
        var material=new THREE.MeshBasicMaterial({color:spec[2],fog:false,toneMapped:false});
        var stem=new THREE.Mesh(stemGeometry,material);stem.name=axis.name+'-stem';stem.scale.set(.012,1.27,.012);stem.position.y=.635;axis.add(stem);
        var tip=new THREE.Mesh(tipGeometry,material);tip.name=axis.name+'-tip';tip.scale.set(.075,.18,.075);tip.position.y=1.36;axis.add(tip);
      });
      var white=new THREE.MeshBasicMaterial({color:0xf6f3dc,transparent:true,opacity:.88,depthWrite:false,fog:false,toneMapped:false});
      var horizon=new THREE.Mesh(new THREE.TorusGeometry(1.2,.012,6,96),white);horizon.name='birdlab-attitude-horizon';horizon.rotation.x=Math.PI/2;root.add(horizon);
      var worldUp=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,1.45,0)]),new THREE.LineDashedMaterial({color:0xf6f3dc,dashSize:.08,gapSize:.06,transparent:true,opacity:.9,depthWrite:false,fog:false,toneMapped:false}));worldUp.name='birdlab-attitude-world-up';worldUp.computeLineDistances();root.add(worldUp);
      var worldTip=new THREE.Mesh(tipGeometry,white);worldTip.name='birdlab-attitude-world-tip';worldTip.scale.set(.065,.18,.065);worldTip.position.y=1.36;root.add(worldTip);
      attitudeGuide={root:root,body:body};
    }
    function updateAttitudeGuide(){if(!attitudeGuide)return;attitudeGuide.root.visible=attitudeVisible();if(!attitudeGuide.root.visible)return;attitudeGuide.root.position.copy(bird.root.position);attitudeGuide.body.quaternion.copy(bird.root.quaternion);}
    function releaseAttitudeCamera(){
      if(!attitudeVisible()||attitudeView==='free')return;
      var offset=camera.position.clone().sub(bird.root.position);offset.y-=.055;
      orbit.distance=clamp(offset.length(),1.1,12);orbit.yaw=Math.atan2(offset.x,offset.z);orbit.pitch=clamp(Math.asin(clamp(offset.y/Math.max(.001,offset.length()),-1,1)),-.55,1.25);attitudeView='free';
    }
    function setAttitudeLens(value){
      if(disposed||mode!=='guided'||isResidentCamera(cameraMode))return;
      if(!value)releaseAttitudeCamera();
      attitudeLens=!!value;
      if(attitudeLens){leaveAnatomy();leavePerspective();createAttitudeGuide();courseLens=false;wingbeatStudy=null;lightStudy=false;studyOverlay=false;attitudeView='oblique';cameraMode='orbit';paused=true;repeatFlights=false;lastStamp=null;updateBird(0,true);updateCamera(1,true);}
      updateAttitudeGuide();notify(true);refresh();
    }
    function setAttitudeView(value){if(!attitudeVisible()||['oblique','x','z','above','free'].indexOf(value)<0)return;if(value==='free')releaseAttitudeCamera();attitudeView=value;cameraMode='orbit';updateCamera(1,true);notify(true);refresh();}
    function lightVisible(){return lightStudy&&mode==='guided'&&!isResidentCamera(cameraMode)&&!wingbeatStudy&&!courseLens&&!attitudeLens;}
    function lightDirection(){
      var direction=sun.position.clone().sub(sun.target.position).normalize();
      return {azimuth:Math.atan2(direction.x,direction.z)*180/Math.PI,elevation:Math.asin(clamp(direction.y,-1,1))*180/Math.PI,direction:direction.toArray()};
    }
    function lightSnapshot(){
      if(!lightVisible())return null;
      var current=lightDirection();current.palette=lighting;
      current.pinned=lightPin?{azimuth:lightPin.azimuth,elevation:lightPin.elevation,direction:lightPin.direction.slice()}:null;return current;
    }
    function setLightStudy(value){
      if(disposed||mode!=='guided'||isResidentCamera(cameraMode))return;
      if(value){
        leaveAnatomy();
        leavePerspective();
        if(attitudeLens)releaseAttitudeCamera();
        lightStudy=true;attitudeLens=false;courseLens=false;wingbeatStudy=null;studyOverlay=false;paused=true;repeatFlights=false;lastStamp=null;cameraMode='orbit';
        updateBird(0,true);updateCamera(1,true);
      }else lightStudy=false;
      notify(true);refresh();
    }
    function setLightDirection(value){
      if(disposed||!lightVisible()||!value||typeof value!=='object'||Array.isArray(value))return;
      if((value.azimuth!==undefined&&(typeof value.azimuth!=='number'||!Number.isFinite(value.azimuth)))||(value.elevation!==undefined&&(typeof value.elevation!=='number'||!Number.isFinite(value.elevation))))return;
      if(value.azimuth===undefined&&value.elevation===undefined)return;
      var current=lightDirection(),azimuth=clamp(value.azimuth===undefined?current.azimuth:value.azimuth,-180,180)*Math.PI/180;
      var elevation=clamp(value.elevation===undefined?current.elevation:value.elevation,5,85)*Math.PI/180;
      var distance=Math.max(1,sun.position.distanceTo(sun.target.position));
      sun.position.set(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation)).multiplyScalar(distance).add(sun.target.position);
      sky.material.uniforms.sunDirection.value.copy(sun.position).sub(sun.target.position).normalize();lightingDirectionCustom=true;notify(true);refresh();
    }
    function pinLightDirection(){if(!lightVisible())return;lightPin=lightDirection();notify(true);}
    function clearLightDirection(){lightPin=null;notify(true);}
    function restoreLightDirection(){if(lightPin)setLightDirection({azimuth:lightPin.azimuth,elevation:lightPin.elevation});}
    function perspectiveVisible(){return perspectiveStudy&&mode==='guided'&&cameraMode==='orbit'&&!wingbeatStudy&&!courseLens&&!attitudeLens&&!lightStudy;}
    function perspectiveBounds(){
      if(!perspectiveLinked)return {distance:[1.8,10],fov:[25,70]};
      return {distance:[Math.max(1.8,perspectiveScale/Math.tan(35*Math.PI/180)),Math.min(10,perspectiveScale/Math.tan(12.5*Math.PI/180))],fov:[Math.max(25,2*Math.atan(perspectiveScale/10)*180/Math.PI),Math.min(70,2*Math.atan(perspectiveScale/1.8)*180/Math.PI)]};
    }
    function perspectiveSnapshot(){
      if(!perspectiveVisible())return null;
      camera.updateMatrixWorld(true);
      var distance=camera.position.distanceTo(followTarget),fieldHeight=2*distance*Math.tan(camera.fov*Math.PI/360),bounds=perspectiveBounds();
      var right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
      var center=followTarget.clone().addScaledVector(right,-.84*fieldHeight*camera.aspect/2),top=center.clone().addScaledVector(up,.25),bottom=center.clone().addScaledVector(up,-.25);
      var pinned=perspectivePin?{distance:perspectivePin.distance,fov:perspectivePin.fov,fieldHeight:2*perspectivePin.distance*Math.tan(perspectivePin.fov*Math.PI/360)}:null;
      if(pinned)pinned.fraction=.5/pinned.fieldHeight;
      return {distance:distance,fov:camera.fov,linked:perspectiveLinked,lockedScale:perspectiveLinked?perspectiveScale:null,fieldHeight:fieldHeight,distanceBounds:bounds.distance,fovBounds:bounds.fov,viewport:{width:canvasWidth,height:canvasHeight},ruler:{length:.5,world:[top.toArray(),bottom.toArray()],ndc:[top.clone().project(camera).toArray(),bottom.clone().project(camera).toArray()],fraction:.5/fieldHeight},pinned:pinned};
    }
    function leavePerspective(){if(perspectiveStudy)orbit.distance=perspectiveDistance;perspectiveStudy=false;}
    function setPerspectiveStudy(value){
      if(disposed||value&&(mode!=='guided'||isResidentCamera(cameraMode)))return;
      if(value){
        if(attitudeLens)releaseAttitudeCamera();
        leaveAnatomy();perspectiveStudy=true;lightStudy=false;attitudeLens=false;courseLens=false;wingbeatStudy=null;studyOverlay=false;paused=true;repeatFlights=false;lastStamp=null;cameraMode='orbit';updateBird(0,true);
      }else leavePerspective();
      updateCamera(1,true);notify(true);refresh();
    }
    function setPerspectiveDistance(value){
      if(disposed||!perspectiveVisible()||typeof value!=='number'||!Number.isFinite(value))return;
      var bounds=perspectiveBounds();perspectiveDistance=clamp(value,bounds.distance[0],bounds.distance[1]);
      if(perspectiveLinked)perspectiveFov=2*Math.atan(perspectiveScale/perspectiveDistance)*180/Math.PI;
      updateCamera(1,true);notify(true);refresh();
    }
    function setPerspectiveFov(value){
      if(disposed||!perspectiveVisible()||typeof value!=='number'||!Number.isFinite(value))return;
      var bounds=perspectiveBounds();perspectiveFov=clamp(value,bounds.fov[0],bounds.fov[1]);
      if(perspectiveLinked)perspectiveDistance=perspectiveScale/Math.tan(perspectiveFov*Math.PI/360);
      updateCamera(1,true);notify(true);refresh();
    }
    function setPerspectiveLinked(value){if(disposed||!perspectiveVisible())return;perspectiveLinked=!!value;perspectiveScale=perspectiveLinked?perspectiveDistance*Math.tan(perspectiveFov*Math.PI/360):null;notify(true);}
    function pinPerspectiveSettings(){if(disposed||!perspectiveVisible())return;perspectivePin={distance:camera.position.distanceTo(followTarget),fov:camera.fov};notify(true);}
    function clearPerspectiveSettings(){if(disposed)return;perspectivePin=null;notify(true);}
    function restorePerspectiveSettings(){if(disposed||!perspectiveVisible()||!perspectivePin)return;perspectiveDistance=perspectivePin.distance;perspectiveFov=perspectivePin.fov;if(perspectiveLinked)perspectiveScale=perspectiveDistance*Math.tan(perspectiveFov*Math.PI/360);updateCamera(1,true);notify(true);refresh();}
    function anatomyVisible(){return !disposed&&anatomyStudy&&mode==='guided'&&cameraMode==='orbit'&&!wingbeatStudy&&!courseLens&&!attitudeLens&&!lightStudy&&!perspectiveStudy;}
    function anatomyContains(mesh){
      if(anatomyPart==='whole')return true;
      var roots=anatomyPart==='head'?[bird.joints.head]:anatomyPart==='tail'?[bird.joints.tail]:anatomyPart==='feet'?bird.joints.feet:[bird.joints.wings[anatomyPart==='leftWing'?0:1].shoulder];
      for(var node=mesh;node&&node!==bird.root;node=node.parent)if(roots.indexOf(node)>=0)return true;return false;
    }
    function restoreAnatomyVisibility(){anatomyVisibility.forEach(function(entry){entry.mesh.visible=entry.visible;});anatomyVisibility=[];}
    function applyAnatomyVisibility(){
      restoreAnatomyVisibility();if(!anatomyVisible()||!anatomyIsolate)return;
      bird.root.traverse(function(mesh){if(mesh.isMesh&&!anatomyContains(mesh)){anatomyVisibility.push({mesh:mesh,visible:mesh.visible});mesh.visible=false;}});
    }
    function anatomyGeometry(){
      if(anatomyCache)return anatomyCache;
      bird.root.updateMatrixWorld(true);
      var inverse=bird.root.matrixWorld.clone().invert(),whole=new THREE.Box3(),selected=new THREE.Box3(),base=new THREE.Vector3(),point=new THREE.Vector3(),delta=new THREE.Vector3(),ids=[];
      bird.root.traverse(function(mesh){
        // This eyelid replaces its vertex positions in a custom shader. Keep
        // its rendering, but do not present its CPU buffer as a measurement.
        if(!mesh.isMesh||!mesh.geometry||!mesh.geometry.attributes.position||mesh.name==='curved-lower-eyelid')return;
        var positions=mesh.geometry.attributes.position,morphs=mesh.geometry.morphAttributes.position||[],chosen=anatomyContains(mesh);
        if(chosen)ids.push(mesh.uuid);
        for(var i=0;i<positions.count;i++){
          base.fromBufferAttribute(positions,i);point.copy(base);
          for(var m=0;m<morphs.length;m++){var weight=mesh.morphTargetInfluences&&mesh.morphTargetInfluences[m]||0;if(!weight)continue;delta.fromBufferAttribute(morphs[m],i);if(!mesh.geometry.morphTargetsRelative)delta.sub(base);point.addScaledVector(delta,weight);}
          point.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);whole.expandByPoint(point);if(chosen)selected.expandByPoint(point);
        }
      });
      function values(box){return {min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new THREE.Vector3()).toArray()};}
      var corners=[];for(var c=0;c<8;c++)corners.push(new THREE.Vector3(c&1?selected.max.x:selected.min.x,c&2?selected.max.y:selected.min.y,c&4?selected.max.z:selected.min.z).applyMatrix4(bird.root.matrixWorld));
      var center=selected.getCenter(new THREE.Vector3()).applyMatrix4(bird.root.matrixWorld),radius=0;corners.forEach(function(corner){radius=Math.max(radius,corner.distanceTo(center));});
      anatomyCache={meshes:ids,bounds:values(selected),whole:values(whole),corners:corners,center:center,radius:Math.max(.005,radius)};return anatomyCache;
    }
    function copyAnatomyBounds(bounds){return {min:bounds.min.slice(),max:bounds.max.slice(),size:bounds.size.slice()};}
    function anatomyCorners(bounds){var points=[];for(var c=0;c<8;c++)points.push(new THREE.Vector3(bounds[c&1?'max':'min'][0],bounds[c&2?'max':'min'][1],bounds[c&4?'max':'min'][2]).applyMatrix4(bird.root.matrixWorld));return points;}
    function anatomyFrameGeometry(){
      var bounds=copyAnatomyBounds(anatomyGeometry().bounds);
      if(anatomyPin&&anatomyPin.part===anatomyPart)for(var axis=0;axis<3;axis++){bounds.min[axis]=Math.min(bounds.min[axis],anatomyPin.bounds.min[axis]);bounds.max[axis]=Math.max(bounds.max[axis],anatomyPin.bounds.max[axis]);bounds.size[axis]=bounds.max[axis]-bounds.min[axis];}
      var corners=anatomyCorners(bounds),center=new THREE.Vector3((bounds.min[0]+bounds.max[0])/2,(bounds.min[1]+bounds.max[1])/2,(bounds.min[2]+bounds.max[2])/2).applyMatrix4(bird.root.matrixWorld),radius=0;
      corners.forEach(function(point){radius=Math.max(radius,point.distanceTo(center));});return {bounds:bounds,center:center,corners:corners,radius:Math.max(.005,radius)};
    }
    function anatomyFit(){var data=anatomyFrameGeometry(),half=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));return {center:data.center.toArray(),radius:data.radius,minimumDistance:Math.max(camera.near+data.radius+.01,data.radius*1.08/Math.sin(half))};}
    function anatomySnapshot(){
      if(!anatomyVisible())return null;
      var data=anatomyGeometry(),frame=anatomyFrameGeometry(),fit=anatomyFit(),pin=null,change=null;camera.updateMatrixWorld(true);fit.distance=camera.position.distanceTo(frame.center);
      if(anatomyPin){
        var matching=anatomyPin.part===anatomyPart,points=matching?anatomyCorners(anatomyPin.bounds):[];
        pin={part:anatomyPin.part,time:anatomyPin.time,bounds:copyAnatomyBounds(anatomyPin.bounds),matching:matching,corners:points.map(function(point){return point.toArray();}),ndc:points.map(function(point){return point.clone().project(camera).toArray();})};
        if(matching)change=data.bounds.size.map(function(value,index){return value-anatomyPin.bounds.size[index];});
      }
      var result={part:anatomyPart,isolate:anatomyIsolate,view:anatomyView,zoom:anatomyZoom,meshes:data.meshes.slice(),bounds:copyAnatomyBounds(data.bounds),whole:copyAnatomyBounds(data.whole),framing:copyAnatomyBounds(frame.bounds),pinned:pin,delta:change,corners:data.corners.map(function(point){return point.toArray();}),ndc:data.corners.map(function(point){return point.clone().project(camera).toArray();}),viewport:{width:canvasWidth,height:canvasHeight},cameraFit:fit};
      // Preserve the legacy snapshot until this optional display is used.
      if(anatomyFrozenUsed)result.frozenSurface={enabled:anatomyFrozenEnabled,opacity:anatomyFrozenOpacity,visible:!!(anatomyFrozenGuide&&anatomyFrozenGuide.root.visible),triangles:anatomyFrozenData?anatomyFrozenData.positions.length/9:0,sourceMeshes:anatomyFrozenData?anatomyFrozenData.sources.map(function(source){return {id:source.id,name:source.name,triangles:source.count/3};}):[],edgeSegments:anatomyFrozenGuide&&anatomyFrozenGuide.edges.geometry?anatomyFrozenGuide.edges.geometry.attributes.position.count/2:0};
      return result;
    }
    function captureAnatomyFrozenSurface(){
      // Capture only native, drawable surface triangles, with joint matrices
      // and CPU morphs baked into the bird's body frame. No THREE resources
      // are allocated by a legacy pin. The shader-shaped eyelid is excluded.
      bird.root.updateMatrixWorld(true);
      var inverse=bird.root.matrixWorld.clone().invert(),positions=[],sources=[],base=new THREE.Vector3(),point=new THREE.Vector3(),delta=new THREE.Vector3();
      bird.root.traverse(function(mesh){
        if(!mesh.isMesh||!anatomyContains(mesh)||!mesh.geometry||!mesh.geometry.attributes.position||mesh.name==='curved-lower-eyelid')return;
        for(var ancestor=mesh;ancestor;ancestor=ancestor.parent)if(ancestor.visible===false)return;
        var geometry=mesh.geometry,attribute=geometry.attributes.position,index=geometry.index,morphs=geometry.morphAttributes.position||[],limit=index?index.count:attribute.count,draw=geometry.drawRange||{start:0,count:Infinity},ranges=[];
        if(Array.isArray(mesh.material)){geometry.groups.forEach(function(group){var material=mesh.material[group.materialIndex];if(material&&material.visible!==false)ranges.push(group);});}
        else if(mesh.material&&mesh.material.visible!==false)ranges.push({start:0,count:limit});
        var start=positions.length/3;
        ranges.forEach(function(range){
          var first=Math.max(0,draw.start,range.start),end=Math.min(limit,draw.start+draw.count,range.start+range.count);
          for(var triangle=first;triangle+2<end;triangle+=3)for(var corner=0;corner<3;corner++){
            var vertex=index?index.getX(triangle+corner):triangle+corner;
            base.fromBufferAttribute(attribute,vertex);point.copy(base);
            for(var m=0;m<morphs.length;m++){var weight=mesh.morphTargetInfluences&&mesh.morphTargetInfluences[m]||0;if(!weight)continue;delta.fromBufferAttribute(morphs[m],vertex);if(!geometry.morphTargetsRelative)delta.sub(base);point.addScaledVector(delta,weight);}
            point.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);positions.push(point.x,point.y,point.z);
          }
        });
        if(positions.length/3>start)sources.push({id:mesh.uuid,name:mesh.name,start:start,count:positions.length/3-start});
      });
      return {part:anatomyPart,positions:new Float32Array(positions),sources:sources};
    }
    function releaseAnatomyFrozenGeometry(){
      if(!anatomyFrozenGuide)return;
      [anatomyFrozenGuide.surface,anatomyFrozenGuide.edges].forEach(function(object){if(object.geometry){object.geometry.dispose();object.geometry=null;}});
      anatomyFrozenGuide.root.visible=false;anatomyFrozenGuide.data=null;
    }
    function createAnatomyFrozenSurface(){
      if(!anatomyFrozenData)return;
      if(anatomyFrozenGuide&&anatomyFrozenGuide.data===anatomyFrozenData)return;
      releaseAnatomyFrozenGeometry();
      var geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(anatomyFrozenData.positions,3));geometry.computeBoundingSphere();
      var edgePositions=[];
      // Resolve creases within each original mesh. Coincident vertices from
      // different feather layers must not cancel each other's boundaries.
      anatomyFrozenData.sources.forEach(function(source){
        var temporary=new THREE.BufferGeometry();temporary.setAttribute('position',new THREE.BufferAttribute(anatomyFrozenData.positions.subarray(source.start*3,(source.start+source.count)*3),3));
        var crease=new THREE.EdgesGeometry(temporary,28),values=crease.attributes.position.array;for(var i=0;i<values.length;i++)edgePositions.push(values[i]);crease.dispose();temporary.dispose();
      });
      var outline=new THREE.BufferGeometry();outline.setAttribute('position',new THREE.Float32BufferAttribute(edgePositions,3));outline.computeBoundingSphere();
      if(!anatomyFrozenGuide){
        var root=new THREE.Group();root.name='birdlab-anatomy-frozen-surface';root.matrixAutoUpdate=false;root.visible=false;scene.add(root);
        var surface=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#91e9f3',side:THREE.DoubleSide,transparent:true,opacity:anatomyFrozenOpacity,depthTest:true,depthWrite:false,toneMapped:false,fog:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
        surface.name='birdlab-anatomy-frozen-triangles';surface.renderOrder=4;root.add(surface);
        var edges=new THREE.LineSegments(outline,new THREE.LineBasicMaterial({color:'#b9f8ff',transparent:true,opacity:Math.min(1,anatomyFrozenOpacity*2.2),depthTest:true,depthWrite:false,toneMapped:false,fog:false}));
        edges.name='birdlab-anatomy-frozen-creases';edges.renderOrder=5;root.add(edges);
        anatomyFrozenGuide={root:root,surface:surface,edges:edges,data:null};
      }
      anatomyFrozenGuide.surface.geometry=geometry;anatomyFrozenGuide.edges.geometry=outline;anatomyFrozenGuide.data=anatomyFrozenData;
    }
    function updateAnatomyFrozenSurface(){
      var visible=anatomyFrozenEnabled&&anatomyVisible()&&anatomyPin&&anatomyPin.part===anatomyPart&&anatomyFrozenData&&anatomyFrozenData.positions.length>0;
      if(visible)createAnatomyFrozenSurface();
      if(!anatomyFrozenGuide)return;
      anatomyFrozenGuide.root.visible=!!visible&&anatomyFrozenOpacity>0;
      if(visible){bird.root.updateMatrixWorld(true);anatomyFrozenGuide.root.matrix.copy(bird.root.matrixWorld);anatomyFrozenGuide.root.matrixWorldNeedsUpdate=true;}
      anatomyFrozenGuide.surface.material.opacity=anatomyFrozenOpacity;anatomyFrozenGuide.edges.material.opacity=Math.min(1,anatomyFrozenOpacity*2.2);
    }
    function setAnatomyFrozenSurface(value){if(disposed||!anatomyVisible()||!anatomyPin||anatomyPin.part!==anatomyPart)return false;anatomyFrozenEnabled=!!value;anatomyFrozenUsed=true;notify(true);refresh();return true;}
    function setAnatomyFrozenOpacity(value){if(disposed||!anatomyVisible()||!anatomyFrozenUsed||typeof value!=='number'||!Number.isFinite(value))return;anatomyFrozenOpacity=clamp(value,0,.7);notify(true);refresh();}
    function pinAnatomyShape(){if(!anatomyVisible())return;anatomyPin={part:anatomyPart,time:time,bounds:copyAnatomyBounds(anatomyGeometry().bounds)};anatomyFrozenData=captureAnatomyFrozenSurface();releaseAnatomyFrozenGeometry();updateCamera(1,true);notify(true);refresh();}
    function clearAnatomyShape(){if(disposed)return;anatomyPin=null;anatomyFrozenData=null;releaseAnatomyFrozenGeometry();if(anatomyVisible())updateCamera(1,true);notify(true);refresh();}
    function leaveAnatomy(){
      if(!anatomyStudy)return;anatomyStudy=false;restoreAnatomyVisibility();anatomyCache=null;
      if(anatomySavedOrbit){orbit.yaw=anatomySavedOrbit.yaw;orbit.pitch=anatomySavedOrbit.pitch;orbit.distance=anatomySavedOrbit.distance;anatomySavedOrbit=null;}
    }
    function setAnatomyStudy(value){
      if(disposed||value&&(mode!=='guided'||isResidentCamera(cameraMode)))return;
      if(value){
        if(attitudeLens)releaseAttitudeCamera();leavePerspective();
        if(!anatomyStudy)anatomySavedOrbit={yaw:orbit.yaw,pitch:orbit.pitch,distance:orbit.distance};
        anatomyStudy=true;anatomyCache=null;lightStudy=false;attitudeLens=false;courseLens=false;wingbeatStudy=null;studyOverlay=false;cameraMode='orbit';paused=true;repeatFlights=false;lastStamp=null;
        updateBird(0,true);applyAnatomyVisibility();
      }else leaveAnatomy();
      updateCamera(1,true);notify(true);refresh();
    }
    function setAnatomyPart(value){if(!anatomyVisible()||['whole','head','leftWing','rightWing','tail','feet'].indexOf(value)<0)return;anatomyPart=value;anatomyCache=null;anatomyZoom=1;applyAnatomyVisibility();updateCamera(1,true);notify(true);refresh();}
    function setAnatomyIsolate(value){if(!anatomyVisible())return;anatomyIsolate=!!value;applyAnatomyVisibility();notify(true);refresh();}
    function frameAnatomyPart(){if(!anatomyVisible())return;anatomyZoom=1;updateCamera(1,true);notify(true);refresh();}
    function releaseAnatomyCamera(){if(!anatomyVisible()||anatomyView==='free')return;var offset=camera.position.clone().sub(anatomyFrameGeometry().center).applyQuaternion(bird.root.quaternion.clone().invert()).normalize();orbit.yaw=Math.atan2(offset.x,offset.z);orbit.pitch=Math.asin(clamp(offset.y,-1,1));anatomyView='free';}
    function setAnatomyView(value){if(!anatomyVisible()||['oblique','front','side','above','free'].indexOf(value)<0)return;if(value==='free')releaseAnatomyCamera();anatomyView=value;updateCamera(1,true);notify(true);refresh();}
    function blocked(x,z){return Math.hypot(x,z)>17.5||!!(habitat.isBlocked&&habitat.isBlocked(x,z,.28));}
    function resetObserver(){
      var x=1.8,z=4.8;
      for(var attempt=0;blocked(x,z)&&attempt<32;attempt++){var angle=.36+attempt*.31;x=Math.sin(angle)*5.1;z=Math.cos(angle)*5.1;}
      observer.crouching=false;walk.eyeHeight=1.65;observer.position.set(x,terrain(x,z)+walk.eyeHeight,z);walk.yaw=Math.atan2(x,z);walk.pitch=-.20;observer.speed=0;
    }
    function setMode(value){
      if(disposed||['guided','free'].indexOf(value)<0||value===mode)return;
      wingbeatStudy=null;
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
      if(cameraMode==='walk'||(['orbit','follow','wide'].indexOf(mode)===-1&&!isResidentCamera(mode)))return;
      var wasPerspective=perspectiveVisible(),wasAnatomy=anatomyVisible();if(mode==='follow'||mode==='wide'){leavePerspective();leaveAnatomy();}
      wingbeatView='free';
      if(attitudeLens&&!isResidentCamera(mode)){if(mode==='orbit')releaseAttitudeCamera();attitudeView='free';}
      if(mode!==cameraMode)repeatFlights=false;
      if(mode!==cameraMode && isResidentCamera(mode) && (SHARED_RESIDENT_CAMERAS.indexOf(mode)>=0 || (wildlife.isShared&&wildlife.isShared(mode)))) {
        var resident=wildlife.snapshot().filter(function(value){return value.id===mode;})[0];
        orbit.yaw=(resident?resident.heading:0)+.85;orbit.pitch=.10;orbit.distance=2.65;
      }
      if(isResidentCamera(mode))wingbeatStudy=null;
      cameraMode=mode;pointerMap.clear();applyAnatomyVisibility();if(wasPerspective||perspectiveVisible()||wasAnatomy||anatomyVisible())updateCamera(1,true);updateStudyOverlay();notify(true);refresh();
    }
    function resetView() {if(anatomyVisible()){anatomyZoom=1;setAnatomyView('oblique');return;}wingbeatView='free';if(attitudeLens)attitudeView='oblique';if(mode==='free'){clearMovement();resetObserver();binoculars=false;fieldObserver.reset();observationKey='';}else{orbit.yaw=2.4;orbit.pitch=.21;orbit.distance=2.65;cameraMode='orbit';repeatFlights=false;}updateStudyOverlay();notify(true);refresh(); }
    function seek(value) {
      if(disposed||mode==='free'||!Number.isFinite(Number(value)))return;
      leaveSurfaceRuler();
      wingbeatStudy=null;
      paused=true;repeatFlights=false;time=clamp(Number(value),0,DURATION);stateStamp=-1;lastStamp=null;
      updateBird(0,true);updateCamera(1,true);notify(true);refresh();
    }
    function setLighting(value) {
      if(disposed||['daylight','golden'].indexOf(value)===-1)return;
      lighting=value;lightingDirectionCustom=false;var warm=value==='golden';
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
      sky.material.uniforms.sunDirection.value.copy(sun.position).sub(sun.target.position).normalize();
      sky.material.uniforms.sunTint.value.set(warm?'#ffe0ad':'#fff1d6');
      sky.material.uniforms.cloudLight.value.set(warm?'#f6dec1':'#f5f5ec');
      sky.material.uniforms.cloudShade.value.set(warm?'#aeb4bd':'#b4c6d0');
      renderer.toneMappingExposure=warm?1.03:1.0;notify(true);refresh();
    }
    function restart() {if(mode==='free')return;leaveSurfaceRuler();wingbeatStudy=null;coursePin=null;time=repeatFlights?(cameraMode==='grouse'?17.58:11.58):0;wingPhase=0;stateStamp=-1;lastStamp=null;updateBird(0,true);updateCamera(1,true);notify(true);refresh(); }
    var controller={inspectWingbeat:inspectWingbeat,seekWingbeat:seekWingbeat,closeWingbeat:closeWingbeat,pinWingtipPose:pinWingtipPose,clearWingtipPose:clearWingtipPose,setWingbeatView:setWingbeatView,setStudyOverlay:setStudyOverlay,setMode:setMode,setBinoculars:setBinoculars,setCrouching:setCrouching,recordSighting:recordSighting,setMove:setMove,stepMove:stepMove,lockPointer:lockPointer,setPaused:setPaused,setSpeed:setSpeed,setCamera:setCamera,setLighting:setLighting,setRepeatFlights:setRepeatFlights,seek:seek,resetView:resetView,restart:restart,dispose:dispose,getState:snapshot};
    controller.setWingtipPaths=setWingtipPaths;
    controller.setSurfaceRuler=setSurfaceRuler;controller.setSurfaceMeasureMode=setSurfaceMeasureMode;controller.clearSurfaceRuler=clearSurfaceRuler;controller.undoSurfacePoint=undoSurfacePoint;controller.placeSurfaceCenter=placeSurfaceCenter;
    controller.setAnatomyFrozenSurface=setAnatomyFrozenSurface;controller.setAnatomyFrozenOpacity=setAnatomyFrozenOpacity;
    controller.setCourseLens=setCourseLens;controller.pinCourseStation=pinCourseStation;controller.clearCourseStation=clearCourseStation;
    controller.setAttitudeLens=setAttitudeLens;controller.setAttitudeView=setAttitudeView;
    controller.setLightStudy=setLightStudy;controller.setLightDirection=setLightDirection;controller.pinLightDirection=pinLightDirection;controller.clearLightDirection=clearLightDirection;controller.restoreLightDirection=restoreLightDirection;
    controller.setPerspectiveStudy=setPerspectiveStudy;controller.setPerspectiveDistance=setPerspectiveDistance;controller.setPerspectiveFov=setPerspectiveFov;controller.setPerspectiveLinked=setPerspectiveLinked;controller.pinPerspectiveSettings=pinPerspectiveSettings;controller.clearPerspectiveSettings=clearPerspectiveSettings;controller.restorePerspectiveSettings=restorePerspectiveSettings;
    controller.setAnatomyStudy=setAnatomyStudy;controller.setAnatomyPart=setAnatomyPart;controller.setAnatomyIsolate=setAnatomyIsolate;controller.frameAnatomyPart=frameAnatomyPart;controller.setAnatomyView=setAnatomyView;controller.pinAnatomyShape=pinAnatomyShape;controller.clearAnatomyShape=clearAnatomyShape;
    canvas._birdlab3d=controller;
    canvas.setAttribute('data-birdlab-3d-ready','true');
    canvas.style.touchAction='none';

    function updateBird(dt,snap) {
      restoreAnatomyVisibility();
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
      // Use the simulation clock: pause, seek, restart and hidden-tab handling
      // all work without an independent timer. Reduced motion stays still.
      var weatherTime=options.reducedMotion?0:time;
      sky.material.uniforms.cloudOffset.value.set((weatherTime*.00045)%1,(weatherTime*.00019)%1);
      wildlife.update(time,dt,mode==='free'?observer:null);
      if(mammals)mammals.update(time,dt,mode==='free'?observer:null);
      updateStudyOverlay();anatomyCache=null;applyAnatomyVisibility();
    }
    function updateCamera(dt,snap) {
      var fov=mode==='free'?(binoculars?22:60):perspectiveVisible()?perspectiveFov:40;
      if(camera.fov!==fov){camera.fov=snap||perspectiveVisible()||anatomyVisible()?fov:camera.fov+(fov-camera.fov)*damping(12,dt);if(Math.abs(camera.fov-fov)<.01)camera.fov=fov;camera.updateProjectionMatrix();}
      if(mode==='free'){
        var eyeHeight=observer.crouching?1.03:1.65;
        if(camera.far!==240){camera.far=240;camera.updateProjectionMatrix();}
        walk.eyeHeight=snap?eyeHeight:walk.eyeHeight+(eyeHeight-walk.eyeHeight)*damping(9,dt);if(Math.abs(walk.eyeHeight-eyeHeight)<.001)walk.eyeHeight=eyeHeight;
        observer.position.y=terrain(observer.position.x,observer.position.z)+walk.eyeHeight;
        camera.position.copy(observer.position);targetGoal.set(-Math.sin(walk.yaw)*Math.cos(walk.pitch),Math.sin(walk.pitch),-Math.cos(walk.yaw)*Math.cos(walk.pitch)).add(observer.position);
        followTarget.copy(targetGoal);camera.up.set(0,1,0);camera.lookAt(followTarget);return camera.fov!==fov||walk.eyeHeight!==eyeHeight;
      }
      if(anatomyVisible()){
        var fit=anatomyFit(),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
        if(anatomyView==='above'){direction.set(0,1,0);up.set(0,0,-1);}else if(anatomyView==='front')direction.set(0,0,-1);else if(anatomyView==='side')direction.set(1,0,0);else if(anatomyView==='oblique')direction.set(1,.65,1.5).normalize();else direction.set(Math.sin(orbit.yaw)*Math.cos(orbit.pitch),Math.sin(orbit.pitch),Math.cos(orbit.yaw)*Math.cos(orbit.pitch));
        direction.applyQuaternion(bird.root.quaternion);up.applyQuaternion(bird.root.quaternion);followTarget.fromArray(fit.center);camera.position.copy(followTarget).addScaledVector(direction,fit.minimumDistance*anatomyZoom);camera.up.copy(up);camera.far=240;camera.updateProjectionMatrix();camera.lookAt(followTarget);camera.updateMatrixWorld(true);return false;
      }
      if(perspectiveVisible()){
        // An ideal study camera uses the exact requested distance. It may pass
        // through scenery; the ordinary walking/orbit camera keeps its floor.
        targetGoal.copy(bird.root.position);targetGoal.y+=.055;followTarget.copy(targetGoal);
        cameraGoal.set(Math.sin(orbit.yaw)*Math.cos(orbit.pitch),Math.sin(orbit.pitch),Math.cos(orbit.yaw)*Math.cos(orbit.pitch)).multiplyScalar(perspectiveDistance).add(targetGoal);
        camera.position.copy(cameraGoal);camera.up.set(0,1,0);camera.far=240;camera.updateProjectionMatrix();camera.lookAt(followTarget);camera.updateMatrixWorld(true);return false;
      }
      if(attitudeVisible()&&attitudeView!=='free'){
        // Fixed world viewpoints make the changing body frame comparable.
        var attitudeHalfVertical=camera.fov*Math.PI/360,attitudeHalfHorizontal=Math.atan(Math.tan(attitudeHalfVertical)*camera.aspect);
        var attitudeDistance=1.7*1.12/Math.sin(Math.min(attitudeHalfVertical,attitudeHalfHorizontal));
        targetGoal.copy(bird.root.position);followTarget.copy(targetGoal);
        var attitudeDirection=new THREE.Vector3();
        if(attitudeView==='x')attitudeDirection.set(1,0,0);else if(attitudeView==='z')attitudeDirection.set(0,0,1);else if(attitudeView==='above')attitudeDirection.set(0,1,0);else attitudeDirection.set(1,.65,1.5).normalize();
        camera.position.copy(targetGoal).addScaledVector(attitudeDirection,attitudeDistance);cameraGoal.copy(camera.position);
        camera.up.set(0,attitudeView==='above'?0:1,attitudeView==='above'?-1:0);camera.far=Math.max(240,attitudeDistance+3.4);camera.updateProjectionMatrix();camera.lookAt(followTarget);camera.updateMatrixWorld(true);return false;
      }
      if(wingbeatStudy&&wingbeatView!=='free'){
        // Keep the whole captured sweep in frame at every phase and panel size.
        // These viewpoints follow the bird's body axes, including its bank.
        var wingRadius=(wingtipTrace?wingtipTrace.radius:.9)*Math.max(bird.root.scale.x,bird.root.scale.y,bird.root.scale.z);
        var wingHalfVertical=camera.fov*Math.PI/360,wingHalfHorizontal=Math.atan(Math.tan(wingHalfVertical)*camera.aspect);
        var wingDistance=wingRadius*1.08/Math.sin(Math.min(wingHalfVertical,wingHalfHorizontal));
        targetGoal.copy(bird.root.position);followTarget.copy(targetGoal);
        wingCameraDirection.set(wingbeatView==='side'?1:0,wingbeatView==='above'?1:0,wingbeatView==='front'?-1:0).applyQuaternion(bird.root.quaternion);
        wingCameraUp.set(0,wingbeatView==='above'?0:1,wingbeatView==='above'?-1:0).applyQuaternion(bird.root.quaternion);
        camera.position.copy(targetGoal).addScaledVector(wingCameraDirection,wingDistance);cameraGoal.copy(camera.position);camera.up.copy(wingCameraUp);
        camera.far=Math.max(240,wingDistance+wingRadius*2);camera.updateProjectionMatrix();camera.lookAt(followTarget);camera.updateMatrixWorld(true);
        if(flightStudy&&flightStudy.root.visible)flightStudy.marker.quaternion.copy(camera.quaternion);
        return false;
      }
      birdTarget.copy(bird.root.position); birdTarget.y+=.055;
      var desiredFar=240;
      if(isResidentCamera(cameraMode)) {
        wildlife.getFocus(cameraMode,targetGoal);
        var viewingDistance=({robin:1.05,chickadee:.70,mourningDove:.85,grouse:1.10,blueJay:1.02,northernCardinal:.75,darkEyedJunco:.66,tuftedTitmouse:.66,easternTowhee:.80,americanGoldfinch:.62,easternBluebird:.76,whiteThroatedSparrow:.72}[cameraMode])*orbit.distance/2.65;
        var viewingPitch=clamp(orbit.pitch+.17,-.35,1.35);
        cameraGoal.set(Math.sin(orbit.yaw)*Math.cos(viewingPitch)*viewingDistance,Math.sin(viewingPitch)*viewingDistance,Math.cos(orbit.yaw)*Math.cos(viewingPitch)*viewingDistance).add(targetGoal);
      } else if(cameraMode==='wide') {
        if(studyOverlay&&flightStudy){
          // Fit the complete course to the tighter screen dimension. The
          // existing habitat camera remains unchanged when guides are off.
          var halfVertical=camera.fov*Math.PI/360,halfHorizontal=Math.atan(Math.tan(halfVertical)*camera.aspect);
          var radius=(flightStudy.courseBounds.radius+1.5)*1.12;
          var distance=radius/Math.sin(Math.min(halfVertical,halfHorizontal));
          targetGoal.copy(flightStudy.courseBounds.center);
          cameraGoal.set(23,24,36).normalize().multiplyScalar(distance).add(targetGoal);
          desiredFar=Math.max(240,distance+radius*2);
        }else{targetGoal.set(-1,ground+2,-5);cameraGoal.set(22,17,31);}
      } else if(cameraMode==='follow') {
        sampleFollowFrame(poseState,followFrame);
        targetGoal.fromArray(followFrame.targetOffset).add(birdTarget);
        cameraGoal.fromArray(followFrame.positionOffset).add(birdTarget);
      } else {
        targetGoal.copy(birdTarget);
        cameraGoal.set(Math.sin(orbit.yaw)*Math.cos(orbit.pitch)*orbit.distance,Math.sin(orbit.pitch)*orbit.distance,Math.cos(orbit.yaw)*Math.cos(orbit.pitch)*orbit.distance).add(targetGoal);
      }
      if(camera.far!==desiredFar){camera.far=desiredFar;camera.updateProjectionMatrix();}
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
      if(flightStudy&&flightStudy.root.visible)flightStudy.marker.quaternion.copy(camera.quaternion);
      return camera.position.distanceToSquared(cameraGoal)+followTarget.distanceToSquared(targetGoal)>.000003;
    }
    var canvasWidth=0,canvasHeight=0;
    function resize() {
      var rect=canvas.getBoundingClientRect(), w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
      // Setting an unchanged backing size still clears WebGL's drawing buffer.
      // ResizeObserver's initial notification can arrive after a paused render.
      if(w===canvasWidth&&h===canvasHeight)return;
      canvasWidth=w;canvasHeight=h;
      renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(perspectiveVisible()||anatomyVisible()){updateCamera(1,true);notify(true);}refresh();
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
        dirty=dirty||fieldObserver.needsFrame();updateCourseLens();updateAttitudeGuide();updateSurfaceRuler();updateAnatomyFrozenSurface();renderer.render(scene,camera);frames++;notify(observationChanged);
      }
      if(!paused||dirty)requestFrame();
    }
    function orbitBy(dx,dy) {wingbeatView='free';if(anatomyVisible())releaseAnatomyCamera();if(attitudeLens)releaseAttitudeCamera();if(mode==='free'){var sensitivity=binoculars?.0014:.0035;walk.yaw-=dx*sensitivity;walk.pitch=clamp(walk.pitch-dy*sensitivity,-1.25,1.25);}else{if(!isResidentCamera(cameraMode))cameraMode='orbit';orbit.yaw-=dx*.006;orbit.pitch=clamp(orbit.pitch+dy*.005,anatomyVisible()?-Math.PI/2+.001:-.55,anatomyVisible()?Math.PI/2-.001:1.25);}if(anatomyVisible())updateCamera(1,true);refresh();}
    function zoomBy(amount) {if(mode==='free')return;if(anatomyVisible()){anatomyZoom=clamp(anatomyZoom*Math.exp(amount),1,3);updateCamera(1,true);notify(true);refresh();return;}if(perspectiveVisible()){setPerspectiveDistance(perspectiveDistance*Math.exp(amount));return;}wingbeatView='free';if(attitudeLens)releaseAttitudeCamera();orbit.distance=clamp(orbit.distance*Math.exp(amount),1.1,12);if(!isResidentCamera(cameraMode))cameraMode='orbit';refresh();}
    function canUseSurfaceRuler(){return !disposed&&!contextLost&&mode==='guided'&&!studyOverlay&&!courseLens&&!attitudeLens&&!lightStudy&&!perspectiveStudy&&!anatomyStudy&&!wingbeatStudy;}
    function canSelectSceneBird(){return canUseSurfaceRuler()&&!surfaceRuler;}
    function surfaceSnapshot(){
      if(!surfaceRuler)return null;
      var a=surfacePoints[0],b=surfacePoints[1],delta=a&&b?b.position.map(function(value,index){return value-a.position[index];}):null;
      var result={time:surfaceTime,next:surfacePoints.length===0?'a':surfacePoints.length===1?'b':surfaceMeasureMode==='angle'&&surfacePoints.length===2?'c':'done',points:surfacePoints.map(function(point){return {bird:point.bird,mesh:point.mesh,meshName:point.meshName,position:point.position.slice()};}),delta:delta,distance:delta?Math.hypot(delta[0],delta[1],delta[2]):null};
      // The default two-point snapshot retains its original shape. Angle mode
      // extends it with the included angle between BA and BC, in world space.
      if(surfaceMeasureMode==='angle'){
        var c=surfacePoints[2],bc=b&&c?c.position.map(function(value,index){return value-b.position[index];}):null,bcLength=bc?Math.hypot(bc[0],bc[1],bc[2]):null,angle=null,plane=false;
        if(delta&&bc&&result.distance>1e-9&&bcLength>1e-9){
          var u=delta.map(function(value){return -value/result.distance;}),v=bc.map(function(value){return value/bcLength;}),dot=clamp(u[0]*v[0]+u[1]*v[1]+u[2]*v[2],-1,1),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
          angle=Math.atan2(Math.hypot(cross[0],cross[1],cross[2]),dot)*180/Math.PI;plane=Math.hypot(cross[0],cross[1],cross[2])>1e-7;
        }
        result.mode='angle';result.angle=angle;result.bcDistance=bcLength;result.arcVisible=plane;result.arcRadius=plane?Math.min(result.distance,bcLength)*.28:null;
      }
      return result;
    }
    function leaveSurfaceRuler(){surfaceRuler=false;surfacePoints.length=0;surfaceTime=null;surfaceMeasureMode='distance';if(surfaceGuide)surfaceGuide.root.visible=false;}
    function setSurfaceRuler(value){
      if(disposed)return false;
      if(!value){leaveSurfaceRuler();notify(true);refresh();return true;}
      if(!canUseSurfaceRuler())return false;
      paused=true;repeatFlights=false;clearMovement();lastStamp=null;surfaceRuler=true;surfaceMeasureMode='distance';surfaceTime=time;surfacePoints.length=0;updateSurfaceRuler();notify(true);refresh();return true;
    }
    function clearSurfaceRuler(){if(!surfaceRuler)return;surfacePoints.length=0;notify(true);refresh();}
    function undoSurfacePoint(){if(!surfaceRuler)return;surfacePoints.pop();notify(true);refresh();}
    function setSurfaceMeasureMode(value){
      if(!surfaceRuler||!canUseSurfaceRuler()||(value!=='distance'&&value!=='angle'))return false;
      if(value!==surfaceMeasureMode){surfaceMeasureMode=value;surfacePoints.length=0;notify(true);refresh();}return true;
    }
    function createSurfaceGuide(){
      var root=new THREE.Group();root.name='birdlab-surface-ruler';root.visible=false;scene.add(root);
      // A single allocation belongs to this scene. Clearing and placing points
      // only changes transforms; releaseResources disposes it on unmount.
      var sphere=new THREE.SphereGeometry(1,12,8),cylinder=new THREE.CylinderGeometry(1,1,1,8,1,true);
      var colors=[0xffca65,0x58e5dd],ends=colors.map(function(color,index){var mesh=new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color:color,toneMapped:false,fog:false}));mesh.name='birdlab-surface-point-'+(index?'b':'a');mesh.renderOrder=32;root.add(mesh);return mesh;});
      var segment=new THREE.Mesh(cylinder,new THREE.MeshBasicMaterial({color:0xfff0b7,toneMapped:false,fog:false}));segment.name='birdlab-surface-segment';segment.renderOrder=31;root.add(segment);
      surfaceGuide={root:root,ends:ends,segment:segment,a:new THREE.Vector3(),b:new THREE.Vector3(),mid:new THREE.Vector3(),direction:new THREE.Vector3(),axis:new THREE.Vector3(0,1,0)};
    }
    function createSurfaceAngleGuide(){
      var guide=surfaceGuide,point=new THREE.Mesh(guide.ends[0].geometry,new THREE.MeshBasicMaterial({color:0xd6b3ff,toneMapped:false,fog:false}));point.name='birdlab-surface-point-c';point.renderOrder=32;guide.root.add(point);
      var segment=new THREE.Mesh(guide.segment.geometry,new THREE.MeshBasicMaterial({color:0xd6b3ff,toneMapped:false,fog:false}));segment.name='birdlab-surface-segment-bc';segment.renderOrder=31;guide.root.add(segment);
      var geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(65*3),3));
      var arc=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xffffff,toneMapped:false,fog:false}));arc.name='birdlab-surface-angle-arc';arc.renderOrder=33;arc.frustumCulled=false;guide.root.add(arc);
      guide.angle={point:point,segment:segment,arc:arc,c:new THREE.Vector3(),u:new THREE.Vector3(),v:new THREE.Vector3(),sample:new THREE.Vector3()};
    }
    function placeSurfaceSegment(mesh,a,b,pixel){
      var guide=surfaceGuide;guide.direction.subVectors(b,a);var length=guide.direction.length();guide.mid.addVectors(a,b).multiplyScalar(.5);mesh.position.copy(guide.mid);mesh.quaternion.setFromUnitVectors(guide.axis,length>1e-9?guide.direction.multiplyScalar(1/length):guide.axis);
      var radius=Math.max(.0003,camera.position.distanceTo(guide.mid)*pixel*1.7);mesh.scale.set(radius,length,radius);
    }
    function updateSurfaceRuler(){
      if(surfaceRuler&&(!canUseSurfaceRuler()||!paused||repeatFlights||surfaceTime!==time))leaveSurfaceRuler();
      if(!surfaceRuler){if(surfaceGuide)surfaceGuide.root.visible=false;return;}
      if(!surfaceGuide)createSurfaceGuide();
      var guide=surfaceGuide,pixel=2*Math.tan(camera.fov*Math.PI/360)/Math.max(1,canvas.clientHeight);
      guide.root.visible=surfacePoints.length>0;
      guide.ends.forEach(function(mesh,index){var point=surfacePoints[index];mesh.visible=!!point;if(point){mesh.position.fromArray(point.position);mesh.scale.setScalar(Math.max(.0005,camera.position.distanceTo(mesh.position)*pixel*5.5));}});
      guide.segment.visible=surfacePoints.length>=2;
      if(guide.segment.visible){
        guide.a.fromArray(surfacePoints[0].position);guide.b.fromArray(surfacePoints[1].position);placeSurfaceSegment(guide.segment,guide.a,guide.b,pixel);
      }
      if(surfaceMeasureMode==='angle'&&!guide.angle)createSurfaceAngleGuide();
      if(guide.angle){
        var angleGuide=guide.angle,complete=surfaceMeasureMode==='angle'&&surfacePoints.length===3;angleGuide.point.visible=complete;angleGuide.segment.visible=complete;angleGuide.arc.visible=false;
        if(complete){
          angleGuide.c.fromArray(surfacePoints[2].position);angleGuide.point.position.copy(angleGuide.c);angleGuide.point.scale.setScalar(Math.max(.0005,camera.position.distanceTo(angleGuide.c)*pixel*5.5));placeSurfaceSegment(angleGuide.segment,guide.b,angleGuide.c,pixel);
          var measured=surfaceSnapshot();angleGuide.arc.visible=measured.arcVisible;
          if(measured.arcVisible){
            angleGuide.u.subVectors(guide.a,guide.b).normalize();angleGuide.v.subVectors(angleGuide.c,guide.b).normalize();angleGuide.v.addScaledVector(angleGuide.u,-angleGuide.v.dot(angleGuide.u)).normalize();
            var positions=angleGuide.arc.geometry.attributes.position;
            for(var i=0;i<positions.count;i++){var phase=measured.angle*Math.PI/180*i/(positions.count-1);angleGuide.sample.copy(guide.b).addScaledVector(angleGuide.u,Math.cos(phase)*measured.arcRadius).addScaledVector(angleGuide.v,Math.sin(phase)*measured.arcRadius);positions.setXYZ(i,angleGuide.sample.x,angleGuide.sample.y,angleGuide.sample.z);}positions.needsUpdate=true;
          }
        }
      }
    }
    function visibleBirdHit(clientX,clientY){
      var rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return null;
      scenePickPoint.set((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2);
      if(Math.abs(scenePickPoint.x)>1||Math.abs(scenePickPoint.y)>1)return null;
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);scenePickRay.setFromCamera(scenePickPoint,camera);
      var hits=scenePickRay.intersectObjects(scenePickMeshes,false);
      for(var i=0;i<hits.length;i++){
        var mesh=hits[i].object,shown=true;for(var node=mesh;node;node=node.parent)if(node.visible===false){shown=false;break;}if(!shown)continue;
        // Reuse the field observer's native ground/trunk/rock blockers. Foliage
        // is deliberately not treated as a solid wall or an opaque billboard.
        if(!fieldObserver.hasClearLine(scenePickRay.ray.origin,hits[i].point))return null;
        return hits[i];
      }
      return null;
    }
    function selectSceneBird(clientX,clientY){
      if(!canSelectSceneBird())return false;
      var hit=visibleBirdHit(clientX,clientY);if(hit){setCamera(scenePickOwners.get(hit.object));return true;}
      return false;
    }
    function placeSurfacePoint(clientX,clientY){
      if(!surfaceRuler||!canUseSurfaceRuler()||!paused||surfaceTime!==time||surfacePoints.length>=(surfaceMeasureMode==='angle'?3:2))return false;
      var hit=visibleBirdHit(clientX,clientY);if(!hit)return false;
      surfacePoints.push({bird:scenePickOwners.get(hit.object),mesh:hit.object.uuid,meshName:hit.object.name||'Bird surface',position:hit.point.toArray()});notify(true);refresh();return true;
    }
    function placeSurfaceCenter(){var rect=canvas.getBoundingClientRect();return placeSurfacePoint(rect.left+rect.width/2,rect.top+rect.height/2);}
    function pointerDown(event) {
      if(event.button&&event.pointerType!=='touch')return;
      pointerMap.set(event.pointerId,{x:event.clientX,y:event.clientY,moved:0,solo:true});
      try{canvas.setPointerCapture(event.pointerId);}catch(e){}
      if(canvas.focus)canvas.focus({preventScroll:true});
      if(pointerMap.size>1)pointerMap.forEach(function(point){point.solo=false;});
      if(pointerMap.size===2){var pts=Array.from(pointerMap.values());pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);}
    }
    function pointerMove(event) {
      if(mode==='free'&&document.pointerLockElement===canvas){orbitBy(event.movementX||0,event.movementY||0);return;}
      var old=pointerMap.get(event.pointerId);if(!old)return;
      var dx=event.clientX-old.x,dy=event.clientY-old.y;old.x=event.clientX;old.y=event.clientY;old.moved+=Math.hypot(dx,dy);
      if(pointerMap.size>1){var pts=Array.from(pointerMap.values()),distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDistance>0&&distance>0)zoomBy(Math.log(pinchDistance/distance));pinchDistance=distance;}
      else orbitBy(dx,dy);
      notify(true);
    }
    function pointerUp(event) {var point=pointerMap.get(event.pointerId),tap=event.type==='pointerup'&&point&&point.solo&&point.moved<=6&&pointerMap.size===1;pointerMap.delete(event.pointerId);pinchDistance=0;try{canvas.releasePointerCapture(event.pointerId);}catch(ignore){}if(tap){if(surfaceRuler)placeSurfacePoint(event.clientX,event.clientY);else selectSceneBird(event.clientX,event.clientY);}}
    listen(canvas,'pointerdown',pointerDown);listen(canvas,'pointermove',pointerMove);listen(canvas,'pointerup',pointerUp);listen(canvas,'pointercancel',pointerUp);listen(canvas,'lostpointercapture',pointerUp);
    listen(canvas,'wheel',function(event){event.preventDefault();zoomBy(clamp(event.deltaY,-180,180)*.0016);notify(true);},{passive:false});
    listen(canvas,'keydown',function(event){
      if(surfaceRuler&&(event.key==='Enter'||event.key==='Escape'||event.key==='Backspace')){if(event.key==='Enter')placeSurfaceCenter();else if(event.key==='Backspace')undoSurfacePoint();else setSurfaceRuler(false);event.preventDefault();return;}
      if(event.key==='Enter'&&canSelectSceneBird()){var rect=canvas.getBoundingClientRect();selectSceneBird(rect.left+rect.width/2,rect.top+rect.height/2);event.preventDefault();return;}
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
  global.BirdLab3D={mount:mount,sampleFlight:sampleFlight,sampleWingPhase:sampleWingPhase,sampleWingbeatWindow:sampleWingbeatWindow,sampleFollowFrame:sampleFollowFrame,createFreeHawk:createFreeHawk,createFieldObserver:createFieldObserver,courseDuration:DURATION};
})(window);
