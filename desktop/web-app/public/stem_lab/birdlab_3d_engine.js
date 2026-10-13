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
    var stops=[[0,-.08],[.45,-.08],[.68,.19],[1.32,.19],[1.58,-.14],[2,-.14],[2.4,0],[38,0],[38.8,.12],[39.9,.12],[40.16,-.18],[41.5,-.18],[41.76,.14],[43,.14],[43.5,-.08],[44,-.08]];
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
  function airborneGaze(t,turn) {
    var yaw=0,pitch=.035;
    for(var i=1;i<AIR_GAZE.length;i++) if(t<=AIR_GAZE[i][0]) {
      var previous=AIR_GAZE[i-1],next=AIR_GAZE[i],blend=smooth(previous[0],next[0],t);
      yaw=previous[1]+(next[1]-previous[1])*blend;
      pitch=previous[2]+(next[2]-previous[2])*blend;break;
    }
    yaw+=clamp(turn*.38,-.24,.24)*smooth(5.5,8,t)*(1-smooth(32,34,t));
    return {yaw:yaw,pitch:pitch};
  }
  function softGate(a,b,t) {
    var x=clamp((t-a)/(b-a),0,1),span=b-a;
    return [x*x*x*(10+x*(-15+6*x)),30*x*x*(x-1)*(x-1)/span,60*x*(2*x*x-3*x+1)/(span*span)];
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
  function sampleFlight(elapsed) {
    var t=((Number.isFinite(elapsed)?elapsed:0)%DURATION+DURATION)%DURATION;
    var flight={position:[0,0,0],velocity:[0,0,0],acceleration:[0,0,0]};
    if(t>3&&t<38) {
      for(var i=1;i<COURSE.length;i++) if(t<=COURSE[i][0]) { flight=hermite(COURSE[i-1],COURSE[i],t); break; }
      addAirMovement(flight,t);
    }
    var v=flight.velocity, a=flight.acceleration, horizontal=Math.hypot(v[0],v[2]), speed=Math.hypot(v[0],v[1],v[2]);
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
    var touchdown=smooth(38,38.12,t)*(1-smooth(38.16,38.68,t));
    var brake=smooth(34.8,37,t)*(1-smooth(38.08,39.2,t));
    var grip=clamp(1-smooth(2.97,3.12,t)+smooth(37.98,38.28,t),0,1);
    var flightEnvelope=smooth(3,4,t)*(1-smooth(35.5,38,t));
    var yaw=(horizontal>1e-8?Math.atan2(-v[0],-v[2]):0)*(1-smooth(37.4,38,t));
    var turn=horizontal>.1?(v[2]*a[0]-v[0]*a[2])/(horizontal*horizontal):0;
    // Forward is -Z: positive Z roll tilts lift toward a positive-yaw turn.
    var bank=clamp(Math.atan2(horizontal*turn,9.81),-.72,.72)*flightEnvelope;
    var pitch=(horizontal>.02?Math.atan2(v[1],horizontal):0)*flightEnvelope+.24*smooth(35.4,36.7,t)*(1-smooth(37.4,38,t));
    var gaze=airborneGaze(t,turn);
    // Shared slow gusts move the woodland and load the gliding wing. Integer
    // harmonics close the breeze loop; the perch approach stays undisturbed.
    var airPhase=t*TAU/DURATION;
    var gust=.65*Math.sin(3*airPhase+.35)+.35*Math.sin(5*airPhase-1.1);
    var cross=.6*Math.sin(2*airPhase-.7)+.4*Math.sin(4*airPhase+.2);
    var windX=.035*gust,windZ=.020*cross;
    var airGate=smooth(7,9,t)*(1-smooth(31,33,t));
    var airRoll=airGate*clamp((windX*Math.cos(yaw)-windZ*Math.sin(yaw))/.041,-1,1);
    return {time:t,phase:phase,label:labels[phase],position:flight.position,velocity:v,yaw:yaw,pitch:pitch,bank:bank,
      wind:[.143+windX,0,.05525+windZ],
      airspeed:speed,wingbeat:power>.05?2.1+power*.65:0,
      pose:{flapAmplitude:strokeAmplitude,fold:fold,bank:bank,pitch:pitch,tailFan:clamp(.14+.28*Math.abs(bank)+.66*smooth(34.8,37,t)*(1-smooth(38,39.6,t)),0,1),feet:feet,
        headYaw:quietGaze(t)*fold+gaze.yaw*(1-fold),
        gazePitch:(1-fold)*gaze.pitch,
        alula:(1-fold)*Math.max(.75*(1-smooth(4.5,7,t)),.85*smooth(34,36,t)*(1-smooth(38,39.4,t))),
        crouch:crouch,touchdown:touchdown,brake:brake,grip:grip,
        airLift:airGate*gust,airRoll:airRoll,
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
  function unshiftedWingPhase(elapsed) {
    var circuits=Math.floor(elapsed/DURATION),index=(elapsed-circuits*DURATION)/PHASE_STEP;
    var low=Math.min(wingPhaseTable.length-2,Math.floor(index)),blend=index-low;
    return circuits*wingPhaseTable[phaseEnd]+wingPhaseTable[low]*(1-blend)+wingPhaseTable[low+1]*blend;
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

  function mount(canvas,options) {
    options=options||{};
    var THREE=global.THREE;
    if(!THREE||!global.BirdLab3DBird||!global.BirdLab3DHabitat) throw new Error('The 3D scene did not finish loading. Please retry.');
    if(canvas._birdlab3d) canvas._birdlab3d.dispose();
    var scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(40,1,.03,240), renderer;
    var disposed=false, contextLost=false, raf=0, lastStamp=null, time=0, wingPhase=0, frames=0;
    var paused=!!options.reducedMotion, speed=1, cameraMode='orbit', lighting='daylight', stateStamp=-1, dirty=true;
    var quality=options.quality==='low'||global.innerWidth<640?'low':'high';
    var listeners=[], resizeObserver=null, habitat=null, bird=null;
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
      pointerMap.clear();
      if(habitat&&habitat.dispose) habitat.dispose();
      if(bird&&bird.dispose) bird.dispose();
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
      if(!habitat.perch) habitat.perch=new THREE.Vector3(0,3.2,0);
      ground=habitat.perch.y-(Number.isFinite(bird.footOffsetY)?bird.footOffsetY:-.185);
    } catch(error) { dispose(); throw new Error('This device could not start the 3D habitat. '+(error.message||'Please use the 2D lab.')); }

    function snapshot() {
      var phase=poseState;
      return {ready:!disposed&&!contextLost,phase:phase.phase,label:phase.label,paused:paused,speed:speed,camera:cameraMode,time:time,lighting:lighting,
        altitude:bird.root.position.y-(habitat.groundHeight?habitat.groundHeight(bird.root.position.x,bird.root.position.z):0),
        airspeed:phase.airspeed,wingbeat:phase.wingbeat,position:bird.root.position.toArray(),orientation:bird.root.quaternion.toArray(),wind:phase.wind.slice(),
        cameraPosition:camera.position.toArray(),cameraTarget:followTarget.toArray(),pose:Object.assign({},phase.pose,{flapPhase:wingPhase}),
        frames:frames,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality:quality,hidden:!!document.hidden};
    }
    function notify(force) { if(!options.onState||disposed) return; if(force||time-stateStamp>=.2||stateStamp<0){stateStamp=time;options.onState(snapshot());} }
    function requestFrame() { if(!disposed&&!contextLost&&!document.hidden&&!raf) raf=global.requestAnimationFrame(tick); }
    function refresh() { dirty=true; requestFrame(); }
    function setPaused(value) { paused=!!value; lastStamp=null; notify(true); refresh(); }
    function setSpeed(value) { var next=Number(value); if([.25,.5,1].indexOf(next)>=0) speed=next; notify(true); }
    function setCamera(mode) { if(['orbit','follow','wide'].indexOf(mode)===-1)return;cameraMode=mode;pointerMap.clear();notify(true);refresh(); }
    function resetView() { orbit.yaw=2.4;orbit.pitch=.21;orbit.distance=2.65;cameraMode='orbit';notify(true);refresh(); }
    function seek(value) {
      if(disposed||!Number.isFinite(Number(value)))return;
      paused=true;time=clamp(Number(value),0,DURATION);stateStamp=-1;lastStamp=null;
      updateBird(0,true);updateCamera(1,true);notify(true);refresh();
    }
    function setLighting(value) {
      if(disposed||['daylight','golden'].indexOf(value)===-1)return;
      lighting=value;var warm=value==='golden';
      hemi.color.set(warm?'#c1d1e1':'#d5e8f4');hemi.groundColor.set(warm?'#6d5138':'#4c5938');hemi.intensity=warm?.64:.80;
      sun.color.set(warm?'#ffd19a':'#fff0d7');sun.intensity=warm?2.3:2.05;
      sun.position.set(warm?-30:-18,warm?16:31,warm?25:14);
      rim.color.set(warm?'#d3dae7':'#c5ddec');rim.intensity=warm?.38:.50;
      // Match the horizon to the haze so distant terrain fades into the sky.
      scene.fog.color.set(warm?'#d7cbb3':'#c7d0c8');scene.fog.density=warm?.022:.0195;
      scene.background.copy(scene.fog.color);
      sky.material.uniforms.top.value.set(warm?'#7594ad':'#749bb4');
      sky.material.uniforms.bottom.value.copy(scene.fog.color);
      renderer.toneMappingExposure=warm?1.03:1.0;notify(true);refresh();
    }
    function restart() { time=0;wingPhase=0;stateStamp=-1;lastStamp=null;updateBird(0,true);updateCamera(1,true);notify(true);refresh(); }
    var controller={setPaused:setPaused,setSpeed:setSpeed,setCamera:setCamera,setLighting:setLighting,seek:seek,resetView:resetView,restart:restart,dispose:dispose,getState:snapshot};
    canvas._birdlab3d=controller;
    canvas.setAttribute('data-birdlab-3d-ready','true');
    canvas.style.touchAction='none';

    function updateBird(dt,snap) {
      poseState=sampleFlight(time);
      var p=poseState.position;
      bird.root.position.set(habitat.perch.x+p[0],ground+p[1],habitat.perch.z+p[2]);
      // The C2 course already supplies smooth attitude. Sampling it directly
      // keeps head stabilization and study poses identical at every frame rate.
      attitude.setFromEuler(new THREE.Euler(poseState.pitch,poseState.yaw,poseState.bank,'YXZ'));
      bird.root.quaternion.copy(attitude);
      wingPhase=sampleWingPhase(time);
      bird.update(Object.assign({},poseState.pose,{flapPhase:wingPhase,elapsedTime:time}),dt);
      habitatWind.fromArray(poseState.wind);
      habitat.update(time,options.reducedMotion?0:habitatWind);
    }
    function updateCamera(dt,snap) {
      birdTarget.copy(bird.root.position); birdTarget.y+=.055;
      if(cameraMode==='wide') {
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
      camera.position.lerp(cameraGoal,alpha);followTarget.lerp(targetGoal,aimAlpha);
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
      if(!paused) { time+=dt*speed;updateBird(dt*speed,false); }
      if(!paused||dirty) {
        // Follow damping uses real frame time on high-refresh displays too.
        // A small bootstrap step is only needed before the first timestamp.
        dirty=updateCamera(cameraMode==='follow'&&dt>0?dt:Math.max(dt,.016),false);
        renderer.render(scene,camera);frames++;notify(false);
      }
      if(!paused||dirty)requestFrame();
    }
    function orbitBy(dx,dy) {cameraMode='orbit';orbit.yaw-=dx*.006;orbit.pitch=clamp(orbit.pitch+dy*.005,-.55,1.25);refresh();}
    function zoomBy(amount) {orbit.distance=clamp(orbit.distance*Math.exp(amount),1.1,12);cameraMode='orbit';refresh();}
    function pointerDown(event) {
      if(event.button&&event.pointerType!=='touch')return;
      pointerMap.set(event.pointerId,{x:event.clientX,y:event.clientY});
      try{canvas.setPointerCapture(event.pointerId);}catch(e){}
      if(canvas.focus)canvas.focus({preventScroll:true});
      if(pointerMap.size===2){var pts=Array.from(pointerMap.values());pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);}
    }
    function pointerMove(event) {
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
      if(event.key==='ArrowLeft')orbitBy(-18,0);else if(event.key==='ArrowRight')orbitBy(18,0);else if(event.key==='ArrowUp')orbitBy(0,-15);else if(event.key==='ArrowDown')orbitBy(0,15);else if(event.key==='+'||event.key==='=')zoomBy(-.13);else if(event.key==='-'||event.key==='_')zoomBy(.13);else return;
      event.preventDefault();notify(true);
    });
    listen(document,'visibilitychange',function(){lastStamp=null;if(document.hidden){global.cancelAnimationFrame(raf);raf=0;pointerMap.clear();}else refresh();});
    listen(global,'blur',function(){pointerMap.clear();});
    listen(canvas,'webglcontextlost',function(event){event.preventDefault();contextLost=true;paused=true;global.cancelAnimationFrame(raf);raf=0;if(options.onError)options.onError('The graphics connection was interrupted. Retry the 3D view or return to the 2D lab.');});
    if(global.matchMedia) {
      var reduce=global.matchMedia('(prefers-reduced-motion: reduce)');
      if(reduce.addEventListener)listen(reduce,'change',function(event){if(event.matches)setPaused(true);});
    }
    if(global.ResizeObserver){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);}else listen(global,'resize',resize);
    updateBird(0,true);updateCamera(1,true);setLighting('daylight');resize();renderer.render(scene,camera);frames++;notify(true);requestFrame();
    return controller;
  }
  global.BirdLab3D={mount:mount,sampleFlight:sampleFlight,sampleWingPhase:sampleWingPhase,sampleFollowFrame:sampleFollowFrame,courseDuration:DURATION};
})(window);
