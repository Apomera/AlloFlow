/* Universe Flight: a local, dependency-free 3D point-cloud renderer.
 * Coordinates are light-years. Catalogs below are deterministic procedural models.
 * Special-relativistic directions use n = observer-to-source and velocity +Z:
 * mu' = (mu + beta) / (1 + beta * mu), D = gamma * (1 + beta * mu).
 * Apparent point sizes, RGB shifts, and exposure are illustrative; geometry is not
 * length-contracted. No observer frame at c is defined or offered.
 */
(function (global) {
  'use strict';
  if (global.UniverseFlight) return;

  var MAX_BETA = 0.9999;
  var TAU = Math.PI * 2;
  var REGIONS = {
    neighborhood: { position: [0, 0, 0], seed: 34917, exposure: 1, boundary: 100000 },
    galaxy: { position: [0, 0, -95000], seed: 48371, exposure: 0.94, boundary: 3000000 },
    cosmic: { position: [0, 0, -2200000], seed: 71849, exposure: 1.05, boundary: 120000000 }
  };
  var LANDMARKS = {
    neighborhood: [
      { id: 'amber-star', name: 'Amber star', kind: 'Generated star', description: 'A warm-colored model star close enough to show clear parallax as you move.', position: [-3.1, 1, 8.5], arrivalRadiusLy: 0.6 },
      { id: 'blue-star', name: 'Blue star', kind: 'Generated star', description: 'A blue-white model star. Compare its apparent direction and frequency shift at different traveler speeds.', position: [4.3, -2.2, 16], arrivalRadiusLy: 0.8 },
      { id: 'pale-star', name: 'Pale star', kind: 'Generated star', description: 'A more distant model star for comparing perspective and changing lines of sight.', position: [0.65, 2.4, 24], arrivalRadiusLy: 1 }
    ],
    galaxy: [
      { id: 'galactic-center', name: 'Galactic center', kind: 'Generated galactic region', description: 'The central bulge of this spiral model. The approach stops outside the bright central region.', position: [0, 0, 0], arrivalRadiusLy: 18000 },
      { id: 'inner-arm', name: 'Inner spiral arm', kind: 'Generated galactic region', description: 'A survey point within a spiral arm, where the disk has visible thickness and depth.', position: [-20170, 10020, -4410], arrivalRadiusLy: 3500 },
      { id: 'disk-edge', name: 'Outer disk', kind: 'Generated galactic region', description: 'A survey point near the outer edge of the tilted disk. Look back toward the central bulge.', position: [48795, -10911, 0], arrivalRadiusLy: 5500 }
    ],
    cosmic: [
      { id: 'near-galaxy', name: 'Nearby spiral', kind: 'Generated galaxy', description: 'The foreground spiral in this generated galaxy group. Its luminous points represent collective starlight.', position: [0, 0, 0], arrivalRadiusLy: 360000 },
      { id: 'companion-galaxy', name: 'Companion spiral', kind: 'Generated galaxy', description: 'A second spiral beyond the foreground galaxy. These positions form a teaching model, not a mapped catalog.', position: [-480000, 190000, 1300000], arrivalRadiusLy: 330000 },
      { id: 'distant-galaxy', name: 'Distant spiral', kind: 'Generated galaxy', description: 'A more distant spiral among the model filaments. Watch the nearer galaxies separate as you approach.', position: [2100000, -800000, 4200000], arrivalRadiusLy: 300000 },
      { id: 'golden-elliptical', name: 'Golden elliptical', kind: 'Generated galaxy', description: 'A smooth, warm-colored galaxy model with a broad stellar halo. Compare its shape with the neighboring spirals.', position: [800000, 550000, 850000], arrivalRadiusLy: 250000 }
    ]
  };

  function landmarks(region) {
    var list = Object.prototype.hasOwnProperty.call(LANDMARKS, region) ? LANDMARKS[region] : [];
    return list.map(function (item) {
      return { id: item.id, name: item.name, kind: item.kind, description: item.description, position: item.position.slice(), arrivalRadiusLy: item.arrivalRadiusLy };
    });
  }

  function finite(value, fallback) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
  function chartView(region, position, yaw, pitch, trail, plane, beta) {
    var vertical = plane === 'xy' ? 1 : 2;
    function safePosition(p) { return [0,1,2].map(function(i) { return finite(p && p[i], 0); }); }
    var camera = safePosition(position), catalog = landmarks(region);
    var history = (Array.isArray(trail) ? trail.slice(-128) : []).map(safePosition);
    var all = [camera].concat(catalog.map(function(item) { return item.position; }), history);
    var xs = all.map(function(p) { return p[0]; }), ys = all.map(function(p) { return p[vertical]; });
    var minX = Math.min.apply(Math,xs), maxX = Math.max.apply(Math,xs), minY = Math.min.apply(Math,ys), maxY = Math.max.apply(Math,ys);
    var span = Math.max(maxX-minX, (maxY-minY)*1.4, 1) * 1.25;
    var scale = 240/span, cx = (minX+maxX)/2, cy = (minY+maxY)/2;
    function project(p) { return [140+(p[0]-cx)*scale, 110-(p[vertical]-cy)*scale]; }
    var cp = Math.cos(finite(pitch,0)), mu = Math.cos(finite(yaw,0))*cp, b = safeBeta(beta);
    // The chart uses stationary coordinates, so map the displayed center ray
    // back through aberration before projecting its direction onto this plane.
    var denominator = 1-b*mu, dx = Math.sin(finite(yaw,0))*cp/(gamma(b)*denominator);
    var dy = vertical === 1 ? Math.sin(finite(pitch,0))/(gamma(b)*denominator) : (mu-b)/denominator;
    var cameraPoint = project(camera), bar = 60/scale;
    var unit = Math.pow(10,Math.floor(Math.log10(bar))), nice = Math.floor(bar/unit)*unit;
    return {
      plane: vertical === 1 ? 'xy' : 'xz',
      camera: { x:cameraPoint[0], y:cameraPoint[1], angle:Math.atan2(dx,dy)*180/Math.PI, headingVisible:Math.hypot(dx,dy)>0.01 },
      landmarks: catalog.map(function(item) { var p=project(item.position);return {id:item.id,name:item.name,x:p[0],y:p[1]}; }),
      trail: history.map(project), scaleLy:nice, scalePixels:nice*scale
    };
  }
  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function approachPlan(distance, baseRadius, multiplier, speed) {
    var radius = Math.max(1e-9,finite(baseRadius,1)) * clamp(finite(multiplier,1),1,4);
    var remaining = Math.max(0,finite(distance,0)-radius), pace = Math.max(0,finite(speed,0));
    if (remaining <= Math.max(1e-9,radius*1e-9)) remaining = 0;
    var seconds = 0, left = remaining, floor = radius*0.5, rate = 1.2;
    // Integrate dr/dt = -min(pace, max(radius/2, 1.2*r)). Actual
    // discrete frame steps make this a playback-time estimate.
    if (remaining && !pace) seconds = null;
    else if (remaining && pace <= floor) seconds = remaining/pace;
    else if (remaining) {
      var upper = pace/rate, lower = floor/rate;
      if (left > upper) { seconds += (left-upper)/pace; left = upper; }
      if (left > lower) { seconds += Math.log(left/lower)/rate; left = lower; }
      seconds += left/floor;
    }
    return { arrivalRadiusLy:radius, remainingLy:remaining, estimatedSeconds:seconds };
  }
  function safeBeta(beta) { return clamp(finite(beta, 0), 0, MAX_BETA); }
  function gamma(beta) { var b = safeBeta(beta); return 1 / Math.sqrt((1 - b) * (1 + b)); }
  function doppler(mu, beta) { var b = safeBeta(beta); return gamma(b) * (1 + b * clamp(finite(mu, 0), -1, 1)); }
  function aberrate(direction, beta) {
    var x = finite(direction[0], 0), y = finite(direction[1], 0), z = finite(direction[2], 0);
    var length = Math.sqrt(x * x + y * y + z * z);
    if (!length) return [0, 0, 1];
    x /= length; y /= length; z /= length;
    var b = safeBeta(beta), denominator = 1 + b * z;
    return [x / (gamma(b) * denominator), y / (gamma(b) * denominator), (z + b) / denominator];
  }

  // yaw/pitch describe the observer-frame sightline, not the photon direction.
  // Inverting aberration gives D = 1 / [gamma * (1 - beta * cos(thetaObserved))].
  function viewSpectrum(beta, yaw, pitch, wavelengthNm) {
    var b = safeBeta(beta);
    var mu = clamp(Math.cos(finite(yaw, 0)) * Math.cos(finite(pitch, 0)), -1, 1);
    var factor = 1 / (gamma(b) * (1 - b * mu));
    var emitted = finite(wavelengthNm, 550);
    if (emitted <= 0) emitted = 550;
    var observed = emitted / factor;
    // Conventional approximate band boundaries; real detector sensitivity is gradual.
    var band = observed < 0.01 ? 'gamma ray' : observed < 10 ? 'X-ray' :
      observed < 380 ? 'ultraviolet' : observed <= 780 ? 'visible' :
      observed < 1000000 ? 'infrared' : 'radio';
    return { angleDeg: Math.acos(mu) * 180 / Math.PI, doppler: factor, observedNm: observed, band: band };
  }

  // Mirror gap is a transverse proper distance in light-seconds. Both frames
  // describe the same emission/reflection/return events and measure light at c.
  function lightClock(beta, mirrorGap) {
    var b = safeBeta(beta), gap = Math.max(0, finite(mirrorGap, 1));
    var shipSeconds = 2 * gap, starSeconds = gamma(b) * shipSeconds;
    return {
      shipSeconds: shipSeconds,
      starSeconds: starSeconds,
      horizontalLightSeconds: b * starSeconds,
      photonPathLightSeconds: starSeconds
    };
  }

  function stepFlight(state, settings, dt) {
    var next = {
      position: state.position.slice(), yaw: state.yaw, pitch: state.pitch,
      distanceLy: state.distanceLy, universeYears: state.universeYears, travelerYears: state.travelerYears
    };
    if (!settings.running) return next;
    var seconds = clamp(finite(dt, 0), 0, 0.1);
    if (settings.mode === 'relativity') {
      var b = safeBeta(settings.beta);
      var years = Math.max(0, finite(settings.timeScale, 1)) * seconds;
      var travel = b * years;
      next.position[2] += travel;
      next.distanceLy += travel;
      next.universeYears += years;
      next.travelerYears += years / gamma(b);
    } else {
      var distance = Math.max(0, finite(settings.speed, 0)) * seconds;
      var cp = Math.cos(next.pitch);
      next.position[0] += Math.sin(next.yaw) * cp * distance;
      next.position[1] += Math.sin(next.pitch) * distance;
      next.position[2] += Math.cos(next.yaw) * cp * distance;
      next.distanceLy += distance;
    }
    return next;
  }

  function randomGenerator(seed) {
    return function () {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function makeRegion(name) {
    var random = randomGenerator(REGIONS[name].seed);
    var points = [], galaxies = [];
    function normal() { return Math.sqrt(-2 * Math.log(Math.max(1e-8, random()))) * Math.cos(TAU * random()); }
    function add(x, y, z, color, size, light, cloud) {
      points.push(x, y, z, color[0], color[1], color[2], size, light, cloud || 0);
    }
    function starColor() {
      var t = random();
      return t < 0.16 ? [0.58, 0.76, 1] : t < 0.7 ? [0.92, 0.95, 1] : t < 0.94 ? [1, 0.85, 0.64] : [1, 0.60, 0.40];
    }
    function sphere(radius) {
      var mu = random() * 2 - 1, a = TAU * random(), r = Math.sqrt(1 - mu * mu);
      return [radius * r * Math.cos(a), radius * mu, radius * r * Math.sin(a)];
    }
    function sky(radius, count, pointSize) {
      for (var i = 0; i < count; i++) {
        var p = sphere(radius * (0.75 + random() * 0.5));
        add(p[0], p[1], p[2], starColor(), pointSize, 0.2 + random() * 0.42, 0);
      }
    }
    function spiral(cx, cy, cz, radius, count, tilt, turn, cloudScale, elliptical) {
      galaxies.push({ center: [cx, cy, cz], radius: radius, tilt: tilt, turn: turn, elliptical: !!elliptical });
      var ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(turn), sr = Math.sin(turn);
      for (var j = 0; j < count; j++) {
        var bulge = random() < 0.23;
        var r = bulge ? Math.abs(normal()) * radius * 0.135 : radius * Math.pow(random(), 0.72);
        var arm = Math.floor(random() * 4) * Math.PI / 2;
        var angle = bulge || random() < 0.25 ? random() * TAU : arm + Math.log(1 + r / radius * 9) * 2.15 + normal() * 0.24;
        var x = Math.cos(angle) * r, z = Math.sin(angle) * r;
        var y = normal() * radius * (bulge ? 0.065 : 0.012);
        if (elliptical) {
          r = Math.min(1.1, Math.abs(normal()) * 0.32) * radius;
          angle = random() * TAU; x = Math.cos(angle) * r; z = Math.sin(angle) * r * 0.72;
          y = normal() * radius * 0.16;
        }
        var tiltedY = y * ct - z * st, tiltedZ = y * st + z * ct;
        var px = x * cr - tiltedY * sr, py = x * sr + tiltedY * cr;
        var color = bulge ? [1, 0.79, 0.53] : random() < 0.065 ? [0.90, 0.42, 0.59] : [0.53, 0.73, 1];
        if (elliptical) color = [1, 0.77, 0.49];
        var size = radius * (bulge ? 0.014 : 0.012) * (0.5 + random()) * cloudScale;
        // Sparse light in a disk with depth complements the continuous emission surface.
        add(cx + px, cy + py, cz + tiltedZ, color, size, bulge ? 0.012 : 0.018 + random() * 0.032, 1);
      }
    }

    if (name === 'neighborhood') {
      // A local star field with depth and a distant, inclined galactic band.
      for (var n = 0; n < 8500; n++) {
        var local = sphere(5 + 245 * Math.pow(random(), 1 / 3));
        add(local[0], local[1], local[2], starColor(), 0.018 + Math.pow(random(), 6) * 0.22, 0.38 + random() * 0.6, 0);
      }
      for (var b = 0; b < 9000; b++) {
        var bandAngle = random() * TAU, bandR = 18000 + 24000 * random();
        var bandX = Math.cos(bandAngle) * bandR;
        var bandZ = Math.sin(bandAngle) * bandR;
        var bandY = normal() * (950 + 550 * Math.sin(bandAngle * 3));
        var dust = 0.24 + 0.76 * Math.pow(Math.abs(Math.sin(bandAngle*3.7 + bandY/1400)),0.7);
        add(bandX, bandY * 0.91 - bandZ * 0.42, bandY * 0.42 + bandZ * 0.91,
          random() < 0.66 ? [0.43, 0.53, 0.72] : [0.82, 0.68, 0.54], 650 + random() * 900, 0.045 * dust, 1);
      }
      // Nearby illustrative stars provide clearly visible parallax at slow speed.
      add(-3.1, 1.0, 8.5, [1, 0.74, 0.49], 0.08, 0.95, 0);
      add(4.3, -2.2, 16, [0.64, 0.82, 1], 0.10, 0.9, 0);
      add(0.65, 2.4, 24, [1, 0.95, 0.81], 0.1, 0.9, 0);
      sky(80000, 1700, 20);
    } else if (name === 'galaxy') {
      spiral(0, 0, 0, 52000, 30000, 0.88, -0.22, 1);
      // Resolved stars occupy the same tilted three-dimensional disk.
      for (var g = 0; g < 5000; g++) {
        var a = random() * TAU, gr = Math.pow(random(), 0.8) * 55000;
        var gx = Math.cos(a) * gr, gz = Math.sin(a) * gr, gy = normal() * 700;
        var ty = gy * Math.cos(0.88) - gz * Math.sin(0.88);
        var tz = gy * Math.sin(0.88) + gz * Math.cos(0.88);
        add(gx * Math.cos(-0.22) - ty * Math.sin(-0.22), gx * Math.sin(-0.22) + ty * Math.cos(-0.22), tz,
          starColor(), 9 + random() * 18, 0.08 + random() * 0.19, 0);
      }
      sky(2200000, 1400, 800);
    } else {
      // Galaxy groups arranged along curved filaments, with real spatial depth.
      spiral(0, 0, 0, 110000, 2600, 0.80, -0.35, 1.2);
      spiral(-480000, 190000, 1300000, 100000, 1400, 1.05, 0.45, 1.2);
      spiral(2100000, -800000, 4200000, 90000, 1400, 0.7, -0.2, 1.2);
      spiral(800000, 550000, 850000, 135000, 2200, 1.05, -0.55, 1.5, true);
      for (var f = 0; f < 5; f++) {
        var fa = f * TAU / 5;
        for (var k = 0; k < 26; k++) {
          var along = (k / 25 - 0.35) * 16000000;
          var bend = Math.sin(k / 25 * Math.PI * 2 + f) * 1200000;
          var cx = Math.cos(fa) * along + normal() * 280000;
          var cy = Math.sin(fa * 1.7) * along * 0.3 + bend + normal() * 280000;
          var cz = Math.sin(fa) * along + 3200000 + normal() * 380000;
          spiral(cx, cy, cz, 45000 + random() * 90000, 180 + Math.floor(random() * 150), random() * 1.5, random() * TAU, 1.8, random() < 0.32);
        }
      }
      sky(90000000, 1200, 38000);
    }
    return { points: new Float32Array(points), galaxies: galaxies };
  }

  // An analytic emission/dust map, generated locally rather than telescope imagery.
  // The tilted surfaces share the same world-space geometry as the 3D spiral stars.
  function galaxyPixels(size) {
    // Two adjacent maps share one GPU texture: spiral emission and a smooth halo.
    var data=new Uint8Array(size*size*2*4);
    function hash(x,y) { var n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295; }
    function noise(x,y) {
      var ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
      fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
      return (hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx)*(1-fy)+(hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx)*fy;
    }
    for(var y=0;y<size;y++)for(var x=0;x<size;x++) {
      var px=(x/(size-1)*2-1)*1.22,pz=(y/(size-1)*2-1)*1.22,r=Math.hypot(px,pz);
      var a=Math.atan2(pz,px),phase=a-Math.log(1+r*9)*2.15;
      var grain=noise(px*17+41,pz*17+73)*0.55+noise(px*43+17,pz*43+9)*0.3+noise(px*103,pz*103)*0.15;
      phase += Math.sin(a*3+r*13)*0.075+(grain-0.5)*0.18;
      var width=0.32+0.3*r;
      var arms=Math.exp(-Math.pow(Math.sin(phase*2)/width,2));
      var edge=Math.pow(Math.max(0,1-Math.pow(r/1.12,4)),2);
      var disk=Math.exp(-r*2.5)*edge;
      var dust=Math.exp(-Math.pow(Math.sin((phase+0.105)*2)/0.14,2))*(1-Math.exp(-r*r*90));
      var attenuation=1-dust*(0.5+grain*0.32);
      var structure=(0.09+arms*(0.35+grain*0.85))*disk*attenuation;
      var bulge=Math.exp(-r*r*52)*0.76+Math.exp(-r*r*8)*0.085;
      var knots=Math.pow(Math.max(0,(grain-0.58)/0.42),2)*arms*disk*0.65;
      var rgb=[bulge+structure*0.53+knots,bulge*0.80+structure*0.74+knots*0.22,bulge*0.56+structure+knots*0.49];
      var i=(y*size*2+x)*4;
      for(var c=0;c<3;c++)data[i+c]=Math.round(255*(1-Math.exp(-rgb[c]*1.85)));
      data[i+3]=Math.round(255*Math.min(0.93,bulge+structure*0.7));
      var er=Math.hypot(px,pz/0.72), halo=(Math.exp(-er*er*24)*0.85+Math.exp(-er*4.2)*0.42)*Math.pow(Math.max(0,1-er/1.18),0.7);
      var ei=i+size*4;
      [1,0.77,0.49].forEach(function(tint,channel){data[ei+channel]=Math.round(255*(1-Math.exp(-halo*tint*1.6)));});
      data[ei+3]=Math.round(255*Math.min(1,halo));
    }
    return data;
  }
  function galaxyGeometry(models) {
    var values=[],segments=8;
    models.forEach(function(model){
      function vertex(u,v){
        var x=(u*2-1)*model.radius*1.22,z=(v*2-1)*model.radius*1.22;
        var ty=-z*Math.sin(model.tilt),tz=z*Math.cos(model.tilt);
        values.push(model.center[0]+x*Math.cos(model.turn)-ty*Math.sin(model.turn),model.center[1]+x*Math.sin(model.turn)+ty*Math.cos(model.turn),model.center[2]+tz,u*0.5+(model.elliptical?0.5:0),v);
      }
      for(var j=0;j<segments;j++)for(var k=0;k<segments;k++){
        var u=k/segments,v=j/segments,u1=(k+1)/segments,v1=(j+1)/segments;
        vertex(u,v);vertex(u1,v);vertex(u1,v1);vertex(u,v);vertex(u1,v1);vertex(u,v1);
      }
    });
    return new Float32Array(values);
  }
  var GALAXY_VERTEX = [
    'precision highp float; attribute vec3 a_position; attribute vec2 a_uv;',
    'uniform vec3 u_position,u_right,u_up,u_forward; uniform float u_lens,u_aspect,u_beta,u_gamma;',
    'varying vec2 v_uv; varying float v_shift;',
    'void main(){ vec3 delta=a_position-u_position; float dist=max(length(delta),0.00001); vec3 n=delta/dist;',
    'float D=u_gamma*(1.0+u_beta*n.z);vec3 p=vec3(n.xy/D,(n.z+u_beta)/(1.0+u_beta*n.z));',
    'vec3 c=vec3(dot(p,u_right),dot(p,u_up),dot(p,u_forward));',
    'gl_Position=vec4(c.x*u_lens/u_aspect,c.y*u_lens,c.z*0.5,c.z)*dist;v_uv=a_uv;v_shift=D;}'
  ].join('\n');
  var GALAXY_FRAGMENT = [
    'precision mediump float;uniform sampler2D u_texture;uniform float u_exposure;varying vec2 v_uv;varying float v_shift;',
    'void main(){vec4 t=texture2D(u_texture,v_uv);float s=clamp(log(max(v_shift,0.0001))*0.42,-0.85,0.85);',
    'vec3 tint=s>=0.0?vec3(0.51,0.73,1.0):vec3(1.0,0.35,0.15);vec3 color=mix(t.rgb,tint*max(max(t.r,t.g),t.b),abs(s));',
    'float gain=u_exposure*clamp(pow(v_shift,1.5),0.012,4.0);gl_FragColor=vec4(color*gain,t.a);}'
  ].join('\n');

  var VERTEX = [
    'precision highp float;',
    'attribute vec3 a_position; attribute vec3 a_color;',
    'attribute float a_size; attribute float a_light; attribute float a_cloud;',
    'uniform vec3 u_position; uniform vec3 u_right; uniform vec3 u_up; uniform vec3 u_forward;',
    'uniform float u_aspect; uniform float u_height; uniform float u_dpr; uniform float u_beta; uniform float u_gamma; uniform float u_exposure; uniform float u_lens;',
    'varying vec3 v_color; varying float v_light; varying float v_cloud;',
    'void main() {',
    '  vec3 delta = a_position - u_position;',
    '  float distance = max(length(delta), 0.00001);',
    '  vec3 n = delta / distance;',
    '  float D = u_gamma * (1.0 + u_beta * n.z);',
    // Aberrate in the velocity frame before rotating the camera. Looking around
    // must not turn the relativistic velocity vector toward the viewing direction.
    '  vec3 apparent = vec3(n.xy / D, (n.z + u_beta) / (1.0 + u_beta * n.z));',
    '  vec3 camera = vec3(dot(apparent, u_right), dot(apparent, u_up), dot(apparent, u_forward));',
    '  float lens = u_lens;',
    '  gl_Position = vec4(camera.x * lens / u_aspect, camera.y * lens, camera.z * 0.5, camera.z);',
    '  float angularSize = a_size / distance / D;',
    '  float minimumSize = mix(1.65, 1.6, a_cloud) * u_dpr;',
    '  float projectedSize = angularSize * u_height * lens / max(camera.z, 0.03);',
    '  gl_PointSize = clamp(projectedSize, minimumSize, 60.0 * u_dpr);',
    '  if (camera.z <= 0.001) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 1.0; }',
    '  float shift = clamp(log(max(D, 0.0001)) * 0.42, -0.85, 0.85);',
    '  vec3 tint = shift >= 0.0 ? vec3(0.51, 0.73, 1.0) : vec3(1.0, 0.35, 0.15);',
    '  v_color = mix(a_color, tint, abs(shift));',
    // RGB and tone mapping are deliberate visual approximations, not a spectral camera.
    '  float exposure = clamp(pow(D, 1.5), 0.012, 4.0);',
    // Subpixel clouds fade with projected area instead of becoming a bright
    // minimum-size dot. The diffuse surface carries their collective light.
    '  float coverage = min(1.0, pow(projectedSize / minimumSize, 2.0));',
    '  v_light = a_light * u_exposure * exposure * mix(1.0, coverage, a_cloud);',
    '  v_cloud = a_cloud;',
    '}'
  ].join('\n');
  var FRAGMENT = [
    'precision mediump float;',
    'varying vec3 v_color; varying float v_light; varying float v_cloud;',
    'void main() {',
    '  vec2 p = gl_PointCoord * 2.0 - 1.0;',
    '  float radius2 = dot(p,p);',
    '  if (radius2 > 1.0) discard;',
    '  float star = exp(-radius2 * 17.0) * 1.45 + exp(-radius2 * 3.5) * 0.18;',
    '  float cloud = exp(-radius2 * 3.5) * 0.55;',
    '  float light = mix(star, cloud, v_cloud) * v_light * (1.0 - smoothstep(0.72, 1.0, radius2));',
    '  gl_FragColor = vec4(v_color * light, light);',
    '}'
  ].join('\n');

  function create(canvas, options) {
    options = options || {};
    var settings = { mode: 'explore', region: 'neighborhood', speed: 2, beta: 0.9, timeScale: 1, running: false, compareRest: false, fov: 70, exposure: 1, quality: 'auto', orbitRate: 3, orbitDirection: 1 };
    var state, gl, program, buffer, pointCount = 0, uniforms = {}, disposed = false, lost = false;
    var galaxyProgram, galaxyBuffer, galaxyTexture, galaxyCount = 0, galaxyUniforms = {};
    var pointAttributes = [], galaxyAttributes = [];
    var raf = 0, lastFrame = 0, lastTelemetry = -Infinity, inView = true;
    var resizeObserver, intersectionObserver, shaders = [];
    var targetId = null, navigation = { active: false, targetId: null };
    var orbitId = null;
    var trail = [];
    var cameraMoves = [];
    function endOrbit(message) {
      if (!orbitId) return false;
      orbitId = null;
      pauseWithMessage(message || 'Orbit ended. Travel is paused.'); requestDraw();
      return true;
    }
    function status(value, message) { if (typeof options.onStatus === 'function') options.onStatus({ state: value, message: message }); }
    function getLandmark(id) {
      var list = LANDMARKS[settings.region];
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    }
    function toLandmark(item) {
      var delta = item.position.map(function (value, index) { return value - state.position[index]; });
      var distance = Math.hypot(delta[0], delta[1], delta[2]);
      return { distance: distance, direction: distance ? delta.map(function (value) { return value / distance; }) : [0, 0, 1] };
    }
    function displayBeta() { return settings.mode === 'relativity' && !settings.compareRest ? settings.beta : 0; }
    function targetTelemetry() {
      var item = getLandmark(targetId);
      if (!item) return null;
      var relative = toLandmark(item), direction = relative.direction;
      var physicalBeta = settings.mode === 'relativity' ? settings.beta : 0;
      var physicalDirection = aberrate(direction, physicalBeta);
      var apparent = aberrate(direction, displayBeta());
      var sy = Math.sin(state.yaw), cy = Math.cos(state.yaw), sp = Math.sin(state.pitch), cp = Math.cos(state.pitch);
      var x = apparent[0] * cy - apparent[2] * sy;
      var y = -apparent[0] * sy * sp + apparent[1] * cp - apparent[2] * cy * sp;
      var z = apparent[0] * sy * cp + apparent[1] * sp + apparent[2] * cy * cp;
      var lens = 1 / Math.tan(settings.fov * Math.PI / 360);
      var aspect = canvas.width / Math.max(1, canvas.height);
      var screen = z > 0.001 ? [0.5 + x * lens / z / aspect / 2, 0.5 - y * lens / z / 2] : [null, null];
      return {
        id: item.id, name: item.name, distanceLy: relative.distance, screen: screen,
        inView: z > 0.001 && screen[0] >= 0 && screen[0] <= 1 && screen[1] >= 0 && screen[1] <= 1,
        doppler: doppler(direction[2], physicalBeta),
        restAngleDeg: Math.acos(clamp(direction[2], -1, 1)) * 180 / Math.PI,
        apparentAngleDeg: Math.acos(clamp(physicalDirection[2], -1, 1)) * 180 / Math.PI
      };
    }
    function navigationTelemetry() {
      var item = getLandmark(navigation.targetId);
      var plan = item ? approachPlan(toLandmark(item).distance,navigation.arrivalRadiusLy||item.arrivalRadiusLy,1,settings.speed) : null;
      return { active:navigation.active, targetId:navigation.targetId, completed:!!navigation.completed, alreadyWithin:!!navigation.alreadyWithin,
        remainingLy:plan?plan.remainingLy:0, arrivalRadiusLy:plan?plan.arrivalRadiusLy:0,
        estimatedSeconds:plan?plan.estimatedSeconds:0,
        progress:navigation.completed?1:plan&&navigation.totalLy>0?clamp(1-plan.remainingLy/navigation.totalLy,0,1):0 };
    }
    function pauseWithMessage(message) {
      settings.running = false; lastFrame = 0;
      emitTelemetry(true); status('ready', message);
      if (typeof options.onPause === 'function') options.onPause(message);
    }
    function faceTarget(item) {
      var direction = aberrate(toLandmark(item).direction, displayBeta());
      state.yaw = Math.atan2(direction[0], direction[2]);
      state.pitch = clamp(Math.asin(clamp(direction[1], -1, 1)), -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    }
    function pixelRatio() {
      var cap = settings.quality === 'low' ? 0.85 : settings.quality === 'high' ? 2 : 1.5;
      return Math.min(cap, global.devicePixelRatio || 1);
    }
    function emitTelemetry(force) {
      var now = global.performance.now();
      if (!force && now - lastTelemetry < 250) return;
      lastTelemetry = now;
      var lastPoint = trail[trail.length-1];
      if (!lastPoint || state.position.some(function(value,index) { return value !== lastPoint[index]; })) {
        trail.push(state.position.slice());
        if (trail.length > 128) trail.shift();
      }
      if (typeof options.onTelemetry === 'function') options.onTelemetry({
        distanceLy: state.distanceLy, universeYears: state.universeYears, travelerYears: state.travelerYears,
        position: state.position.slice(), yaw: state.yaw, pitch: state.pitch, running: settings.running,
        target: targetTelemetry(), navigation: navigationTelemetry(), orbit: { active: !!orbitId, targetId: orbitId }, trail: trail.map(function(p) { return p.slice(); }), cameraMoves: cameraMoves.length
      });
    }
    function initialState() {
      return { position: REGIONS[settings.region].position.slice(), yaw: 0, pitch: 0, distanceLy: 0, universeYears: 0, travelerYears: 0 };
    }
    state = initialState();
    function isVisible() { return !global.document.hidden && inView; }
    function cancelFrame() { if (raf) global.cancelAnimationFrame(raf); raf = 0; lastFrame = 0; }
    function requestDraw() {
      if (disposed || lost || !gl || !program || !isVisible() || raf) return;
      raf = global.requestAnimationFrame(frame);
    }
    function uploadRegion() {
      if (!gl || !buffer || lost) return;
      var data = makeRegion(settings.region);
      pointCount = data.points.length / 9;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data.points, gl.STATIC_DRAW);
      var surfaces = galaxyGeometry(data.galaxies);
      galaxyCount = surfaces.length / 5;
      gl.bindBuffer(gl.ARRAY_BUFFER, galaxyBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, surfaces, gl.STATIC_DRAW);
    }
    function resize() {
      if (disposed) return;
      var box = canvas.getBoundingClientRect();
      var ratio = pixelRatio();
      var width = Math.max(1, Math.round(box.width * ratio));
      var height = Math.max(1, Math.round(box.height * ratio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      requestDraw();
      if (targetId) emitTelemetry(true);
    }
    function draw() {
      if (!gl || lost) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.005, 0.010, 0.025, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      var sy = Math.sin(state.yaw), cy = Math.cos(state.yaw), sp = Math.sin(state.pitch), cp = Math.cos(state.pitch);
      var b = displayBeta();
      function camera(u) {
        gl.uniform3fv(u.position, state.position);
        gl.uniform3f(u.right, cy, 0, -sy);
        gl.uniform3f(u.up, -sy * sp, cp, -cy * sp);
        gl.uniform3f(u.forward, sy * cp, sp, cy * cp);
        gl.uniform1f(u.aspect, canvas.width / Math.max(1, canvas.height));
        gl.uniform1f(u.beta, b); gl.uniform1f(u.gamma, gamma(b));
        gl.uniform1f(u.exposure, REGIONS[settings.region].exposure * settings.exposure);
        gl.uniform1f(u.lens, 1 / Math.tan(settings.fov * Math.PI / 360));
      }
      function attributes(list, source, stride) {
        gl.bindBuffer(gl.ARRAY_BUFFER, source);
        list.forEach(function(a) { gl.enableVertexAttribArray(a[0]); gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, stride, a[2]); });
      }
      // Diffuse emission sits beneath the resolved stars. Dark lanes are reduced
      // emission in this illustrative disk, not a volumetric extinction model.
      if (galaxyCount) {
        pointAttributes.forEach(function(a) { gl.disableVertexAttribArray(a[0]); });
        gl.useProgram(galaxyProgram); attributes(galaxyAttributes, galaxyBuffer, 20); camera(galaxyUniforms);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, galaxyTexture);
        gl.uniform1i(galaxyUniforms.texture, 0);
        gl.drawArrays(gl.TRIANGLES, 0, galaxyCount);
        galaxyAttributes.forEach(function(a) { gl.disableVertexAttribArray(a[0]); });
      }
      gl.useProgram(program); attributes(pointAttributes, buffer, 36);
      gl.uniform3fv(uniforms.position, state.position);
      gl.uniform3f(uniforms.right, cy, 0, -sy);
      gl.uniform3f(uniforms.up, -sy * sp, cp, -cy * sp);
      gl.uniform3f(uniforms.forward, sy * cp, sp, cy * cp);
      gl.uniform1f(uniforms.aspect, canvas.width / Math.max(1, canvas.height));
      gl.uniform1f(uniforms.height, canvas.height);
      gl.uniform1f(uniforms.dpr, pixelRatio());
      gl.uniform1f(uniforms.beta, b);
      gl.uniform1f(uniforms.gamma, gamma(b));
      gl.uniform1f(uniforms.exposure, REGIONS[settings.region].exposure * settings.exposure);
      gl.uniform1f(uniforms.lens, 1 / Math.tan(settings.fov * Math.PI / 360));
      gl.drawArrays(gl.POINTS, 0, pointCount);
    }
    function limitToRegion(previous) {
      var limit = REGIONS[settings.region].boundary;
      var p = state.position;
      if (p[0] * p[0] + p[1] * p[1] + p[2] * p[2] <= limit * limit) return;
      var start = previous.position;
      var delta = [p[0] - start[0], p[1] - start[1], p[2] - start[2]];
      var a = delta[0] * delta[0] + delta[1] * delta[1] + delta[2] * delta[2];
      var b = start[0] * delta[0] + start[1] * delta[1] + start[2] * delta[2];
      var c = start[0] * start[0] + start[1] * start[1] + start[2] * start[2] - limit * limit;
      var fraction = a ? clamp((-b + Math.sqrt(Math.max(0, b * b - a * c))) / a, 0, 1) : 0;
      state.position = start.map(function (value, index) { return value + delta[index] * fraction; });
      ['distanceLy', 'universeYears', 'travelerYears'].forEach(function (key) {
        state[key] = previous[key] + (state[key] - previous[key]) * fraction;
      });
      navigation.active = false;
      orbitId = null;
      var message = 'Reached the edge of this generated model. Reset position or look back to explore it.';
      pauseWithMessage(message);
    }
    function stepNavigation(dt) {
      var item = getLandmark(navigation.targetId);
      if (!item) { navigation.active = false; return; }
      var relative = toLandmark(item);
      var radius = navigation.arrivalRadiusLy || item.arrivalRadiusLy;
      var remaining = Math.max(0, relative.distance - radius);
      // Slow the approach and limit its last step so a fast traversal setting
      // cannot overshoot the destination's survey standoff.
      var approachSpeed = Math.min(settings.speed, Math.max(radius * 0.5, remaining * 1.2));
      var travel = Math.min(remaining, approachSpeed * clamp(finite(dt, 0), 0, 0.1));
      state = {
        position: state.position.map(function (value, index) { return value + relative.direction[index] * travel; }),
        yaw: state.yaw, pitch: state.pitch, distanceLy: state.distanceLy + travel,
        universeYears: state.universeYears, travelerYears: state.travelerYears
      };
      if (remaining - travel <= Math.max(1e-9, radius * 1e-9)) {
        navigation.active = false; navigation.completed = true;
        pauseWithMessage('Arrived at ' + item.name + '. Travel is paused; look around or choose another destination.');
      }
    }
    function stepOrbit(dt) {
      var item = getLandmark(orbitId);
      if (!item) { endOrbit(); return; }
      var angle = settings.orbitRate * Math.PI / 180 * settings.orbitDirection * clamp(finite(dt, 0), 0, 0.1);
      var x = state.position[0] - item.position[0], z = state.position[2] - item.position[2];
      // Camera-only survey around the world's vertical axis. Radius and altitude
      // stay fixed; this is not a gravitational orbit or a spacecraft trajectory.
      state = Object.assign({}, state, { position: [item.position[0] + x * Math.cos(angle) + z * Math.sin(angle), state.position[1], item.position[2] - x * Math.sin(angle) + z * Math.cos(angle)], distanceLy: state.distanceLy + Math.hypot(x, z) * Math.abs(angle) });
      faceTarget(item);
    }
    function frame(now) {
      raf = 0;
      if (disposed || lost || !isVisible()) { lastFrame = 0; return; }
      if (settings.running) {
        var previous = state;
        var dt = lastFrame ? (now - lastFrame) / 1000 : 0;
        if (orbitId && settings.mode === 'explore') stepOrbit(dt);
        else if (navigation.active && settings.mode === 'explore') stepNavigation(dt);
        else state = stepFlight(state, settings, dt);
        lastFrame = now;
        if (!settings.running) lastFrame = 0;
        limitToRegion(previous);
      } else lastFrame = 0;
      draw();
      // A paused interaction gets only one frame; always publish its final view.
      emitTelemetry(!settings.running);
      if (settings.running) requestDraw();
    }
    function visibilityChanged() { if (!isVisible()) cancelFrame(); else { lastFrame = 0; requestDraw(); } }
    function contextLost(event) {
      event.preventDefault(); lost = true; cancelFrame();
      status('error', 'The 3D graphics context was interrupted. Close and reopen the flight explorer to restore it.');
    }
    function dispose() {
      if (disposed) return;
      disposed = true; cancelFrame();
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
      global.removeEventListener('resize', resize);
      global.document.removeEventListener('visibilitychange', visibilityChanged);
      canvas.removeEventListener('webglcontextlost', contextLost);
      if (gl && !lost) {
        if (buffer) gl.deleteBuffer(buffer);
        if (galaxyBuffer) gl.deleteBuffer(galaxyBuffer);
        if (galaxyTexture) gl.deleteTexture(galaxyTexture);
        if (galaxyProgram) gl.deleteProgram(galaxyProgram);
        if (program) gl.deleteProgram(program);
        shaders.forEach(function (shader) { gl.deleteShader(shader); });
      }
      options = {};
    }
    function snapshot() {
      return {
        version: 1,
        settings: { mode: settings.mode, region: settings.region, beta: settings.beta, compareRest: settings.compareRest, fov: settings.fov, exposure: settings.exposure, quality: settings.quality },
        state: { position: state.position.slice(), yaw: state.yaw, pitch: state.pitch, distanceLy: state.distanceLy, universeYears: state.universeYears, travelerYears: state.travelerYears },
        targetId: targetId
      };
    }
    function restore(saved) {
      if (disposed || !saved || saved.version !== 1 || !saved.settings || !saved.state) return false;
      var input = saved.settings, savedState = saved.state;
      if (input.mode !== 'explore' && input.mode !== 'relativity') return false;
      if (!Object.prototype.hasOwnProperty.call(REGIONS, input.region)) return false;
      if (!Array.isArray(savedState.position) || savedState.position.length !== 3 || !savedState.position.every(Number.isFinite)) return false;
      if (Math.hypot.apply(Math, savedState.position) > REGIONS[input.region].boundary * (1 + 1e-10)) return false;
      if (!['yaw', 'pitch', 'distanceLy', 'universeYears', 'travelerYears'].every(function (key) { return Number.isFinite(savedState[key]); })) return false;
      if (![input.beta, input.fov, input.exposure].every(Number.isFinite)) return false;
      var oldRegion = settings.region;
      settings.mode = input.mode; settings.region = input.region;
      settings.beta = safeBeta(input.beta); settings.compareRest = !!input.compareRest;
      settings.fov = clamp(input.fov, 30, 100); settings.exposure = clamp(input.exposure, 0.3, 2);
      settings.quality = ['auto', 'low', 'high'].indexOf(input.quality) >= 0 ? input.quality : 'auto';
      settings.running = false;
      state = {
        position: savedState.position.slice(), yaw: ((savedState.yaw % TAU) + TAU) % TAU,
        pitch: clamp(savedState.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01),
        distanceLy: clamp(savedState.distanceLy, 0, 1e18), universeYears: clamp(savedState.universeYears, 0, 1e18), travelerYears: clamp(savedState.travelerYears, 0, 1e18)
      };
      targetId = getLandmark(saved.targetId) ? saved.targetId : null;
      cameraMoves = [];
      trail = [];
      orbitId = null;
      navigation = { active: false, targetId: null };
      lastFrame = 0;
      if (oldRegion !== settings.region) uploadRegion();
      resize(); requestDraw();
      pauseWithMessage('Saved view restored. Travel is paused.');
      return true;
    }
    var api = {
      set: function (next) {
        if (disposed) return;
        next = next || {};
        var previousRegion = settings.region;
        var previousMode = settings.mode;
        var previousQuality = settings.quality;
        var wasRunning = settings.running;
        if (next.mode === 'explore' || next.mode === 'relativity') settings.mode = next.mode;
        if (Object.prototype.hasOwnProperty.call(REGIONS, next.region)) settings.region = next.region;
        if (next.speed !== undefined) settings.speed = clamp(finite(next.speed, 0), 0, 1e10);
        if (next.orbitRate !== undefined) settings.orbitRate = clamp(finite(next.orbitRate, 3), 0.25, 12);
        if (next.orbitDirection === 1 || next.orbitDirection === -1) settings.orbitDirection = next.orbitDirection;
        if (next.beta !== undefined) settings.beta = safeBeta(next.beta);
        if (next.timeScale !== undefined) settings.timeScale = clamp(finite(next.timeScale, 1), 0, 1e10);
        if (next.compareRest !== undefined) settings.compareRest = !!next.compareRest;
        if (next.fov !== undefined) settings.fov = clamp(finite(next.fov, 70), 30, 100);
        if (next.exposure !== undefined) settings.exposure = clamp(finite(next.exposure, 1), 0.3, 2);
        if (['auto', 'low', 'high'].indexOf(next.quality) >= 0) settings.quality = next.quality;
        if (next.running !== undefined) settings.running = !!next.running;
        if (next.running) cameraMoves = [];
        if (next.running && navigation.completed) navigation = { active:false, targetId:null };
        if (previousRegion !== settings.region) { state = initialState(); targetId = null; uploadRegion(); }
        if (previousRegion !== settings.region || previousMode !== settings.mode) {
          navigation = { active: false, targetId: null }; orbitId = null; trail = []; cameraMoves = []; settings.running = false;
        }
        if (previousQuality !== settings.quality) resize();
        if (targetId || previousRegion !== settings.region || (wasRunning && !settings.running)) emitTelemetry(true);
        lastFrame = 0;
        requestDraw();
      },
      look: function (yawDelta, pitchDelta) {
        if (disposed) return;
        endOrbit('Manual look ended the orbit. Travel is paused.');
        state.yaw = ((state.yaw + finite(yawDelta, 0)) % TAU + TAU) % TAU;
        state.pitch = clamp(state.pitch + finite(pitchDelta, 0), -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
        requestDraw(); emitTelemetry(false);
      },
      view: function (direction) {
        if (disposed) return;
        var views = { forward: [0, 0], back: [Math.PI, 0], left: [-Math.PI / 2, 0], right: [Math.PI / 2, 0], up: [0, Math.PI / 2 - 0.01], down: [0, -Math.PI / 2 + 0.01] };
        if (!views[direction]) return;
        endOrbit('Manual look ended the orbit. Travel is paused.');
        state.yaw = views[direction][0]; state.pitch = views[direction][1];
        requestDraw(); emitTelemetry(true);
      },
      nudge: function (direction, distance) {
        if (disposed || lost || !gl || settings.mode!=='explore') return false;
        var amount=clamp(finite(distance,0),0,REGIONS[settings.region].boundary*0.1);
        var sy=Math.sin(state.yaw),cy=Math.cos(state.yaw),sp=Math.sin(state.pitch),cp=Math.cos(state.pitch);
        var forward=[sy*cp,sp,cy*cp],right=[cy,0,-sy],up=[-sy*sp,cp,-cy*sp];
        var axes={forward:forward,back:forward.map(function(v){return -v;}),right:right,left:right.map(function(v){return -v;}),up:up,down:up.map(function(v){return -v;})};
        if (!axes[direction] || !amount) return false;
        var previous=state;
        var undo={position:state.position.slice(),distanceLy:state.distanceLy,trail:trail.map(function(p){return p.slice();})};
        settings.running=false;orbitId=null;navigation={active:false,targetId:null};lastFrame=0;
        state=Object.assign({},state,{position:state.position.map(function(v,i){return v+axes[direction][i]*amount;}),distanceLy:state.distanceLy+amount});
        limitToRegion(previous);
        var traveled=state.distanceLy-previous.distanceLy;
        if (traveled>0) { cameraMoves.push(undo);if(cameraMoves.length>12)cameraMoves.shift(); }
        if (traveled>=amount*(1-1e-10)) pauseWithMessage('Camera moved. Travel is paused; undo is available for recent camera steps.');
        emitTelemetry(true);requestDraw();return traveled>0;
      },
      undoNudge: function () {
        if (disposed || lost || settings.mode!=='explore' || !cameraMoves.length) return false;
        var undo=cameraMoves.pop();
        state=Object.assign({},state,{position:undo.position.slice(),distanceLy:undo.distanceLy});
        trail=undo.trail.map(function(p){return p.slice();});
        navigation={active:false,targetId:null};orbitId=null;
        pauseWithMessage('Camera step undone. Position restored; your current look direction is unchanged.');
        requestDraw();return true;
      },
      selectTarget: function (id) {
        if (disposed || (id && !getLandmark(id))) return false;
        if (orbitId && orbitId !== id) endOrbit('Target changed. Orbit is paused and ended.');
        if (navigation.targetId && navigation.targetId !== id) {
          var guidedWasActive = navigation.active;
          navigation = { active: false, targetId: null };
          if (guidedWasActive) pauseWithMessage('Target changed. Guided travel is paused.');
        }
        targetId = id || null; emitTelemetry(true); requestDraw();
        return true;
      },
      focusTarget: function (id) {
        if (disposed) return false;
        var item = getLandmark(id || targetId);
        if (!item) return false;
        if (orbitId && orbitId !== item.id) endOrbit();
        targetId = item.id; faceTarget(item); emitTelemetry(true); requestDraw();
        return true;
      },
      planApproach: function (id, multiplier) {
        var item = !disposed && getLandmark(id);
        return item && settings.mode==='explore' ? approachPlan(toLandmark(item).distance,item.arrivalRadiusLy,multiplier,settings.speed) : null;
      },
      navigateTo: function (id, multiplier) {
        if (disposed || lost || !gl || settings.mode !== 'explore') return false;
        var item = getLandmark(id);
        if (!item) return false;
        cameraMoves = [];
        orbitId = null;
        targetId = item.id; faceTarget(item);
        var plan = approachPlan(toLandmark(item).distance,item.arrivalRadiusLy,multiplier,settings.speed);
        navigation = { active:false, targetId:item.id, arrivalRadiusLy:plan.arrivalRadiusLy, totalLy:plan.remainingLy, completed:false };
        if (plan.remainingLy <= plan.arrivalRadiusLy * 1e-9) {
          navigation.completed = true; navigation.alreadyWithin = true;
          pauseWithMessage('Already within the viewing distance of ' + item.name + '. Travel is paused so you can look around.');
          requestDraw(); return false;
        }
        navigation.active = true; settings.running = true; lastFrame = 0;
        emitTelemetry(true); requestDraw();
        return true;
      },
      cancelNavigation: function () {
        if (disposed || !navigation.active) return false;
        navigation = { active: false, targetId: null };
        pauseWithMessage('Guided travel canceled. Travel is paused.'); requestDraw();
        return true;
      },
      startOrbit: function (id) {
        if (disposed || lost || !gl || settings.mode !== 'explore') return false;
        var item = getLandmark(id || targetId);
        if (!item) return false;
        if (Math.hypot(state.position[0] - item.position[0], state.position[2] - item.position[2]) < item.arrivalRadiusLy * 0.01) {
          pauseWithMessage('Move away from the destination’s vertical axis before starting an orbit.'); return false;
        }
        targetId = item.id; orbitId = item.id; navigation = { active: false, targetId: null };
        cameraMoves = [];
        faceTarget(item); settings.running = true; lastFrame = 0;
        emitTelemetry(true); requestDraw(); return true;
      },
      endOrbit: function () { if (disposed) return false; return endOrbit(); },
      snapshot: snapshot,
      capture: function () {
        if (disposed || lost || !gl) return null;
        draw();
        return { dataUrl: canvas.toDataURL('image/png'), snapshot: snapshot() };
      },
      restore: restore,
      reset: function () {
        if (!disposed) {
          state = initialState(); targetId = null; navigation = { active: false, targetId: null };
          orbitId = null;
          trail = [];
          cameraMoves = [];
          settings.running = false; lastFrame = 0; requestDraw(); emitTelemetry(true);
        }
      },
      dispose: dispose
    };
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
      if (!gl) throw new Error('WebGL is unavailable');
      function compile(type, source) {
        var shader = gl.createShader(type); shaders.push(shader);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed');
        return shader;
      }
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Shader link failed');
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      [['position', 3, 0], ['color', 3, 3], ['size', 1, 6], ['light', 1, 7], ['cloud', 1, 8]].forEach(function (attribute) {
        var location = gl.getAttribLocation(program, 'a_' + attribute[0]);
        pointAttributes.push([location, attribute[1], attribute[2] * 4]);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, attribute[1], gl.FLOAT, false, 36, attribute[2] * 4);
      });
      ['position', 'right', 'up', 'forward', 'aspect', 'height', 'dpr', 'beta', 'gamma', 'exposure', 'lens'].forEach(function (name) {
        uniforms[name] = gl.getUniformLocation(program, 'u_' + name);
      });
      galaxyProgram = gl.createProgram();
      gl.attachShader(galaxyProgram, compile(gl.VERTEX_SHADER, GALAXY_VERTEX));
      gl.attachShader(galaxyProgram, compile(gl.FRAGMENT_SHADER, GALAXY_FRAGMENT));
      gl.linkProgram(galaxyProgram);
      if (!gl.getProgramParameter(galaxyProgram, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(galaxyProgram) || 'Galaxy shader link failed');
      galaxyBuffer = gl.createBuffer();
      galaxyAttributes = [[gl.getAttribLocation(galaxyProgram, 'a_position'), 3, 0], [gl.getAttribLocation(galaxyProgram, 'a_uv'), 2, 12]];
      ['position', 'right', 'up', 'forward', 'aspect', 'beta', 'gamma', 'exposure', 'lens', 'texture'].forEach(function(name) { galaxyUniforms[name] = gl.getUniformLocation(galaxyProgram, 'u_' + name); });
      galaxyTexture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, galaxyTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, galaxyPixels(512));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      uploadRegion();
      canvas.addEventListener('webglcontextlost', contextLost);
      global.document.addEventListener('visibilitychange', visibilityChanged);
      global.addEventListener('resize', resize);
      if (global.ResizeObserver) { resizeObserver = new global.ResizeObserver(resize); resizeObserver.observe(canvas); }
      if (global.IntersectionObserver) {
        intersectionObserver = new global.IntersectionObserver(function (entries) {
          inView = entries[0].isIntersecting; visibilityChanged();
        });
        intersectionObserver.observe(canvas);
      }
      resize(); emitTelemetry(true);
      status('ready', '3D flight explorer ready.');
    } catch (error) {
      if (gl) {
        if (buffer) gl.deleteBuffer(buffer);
        if (galaxyBuffer) gl.deleteBuffer(galaxyBuffer);
        if (galaxyTexture) gl.deleteTexture(galaxyTexture);
        if (galaxyProgram) gl.deleteProgram(galaxyProgram);
        if (program) gl.deleteProgram(program);
        shaders.forEach(function (shader) { gl.deleteShader(shader); });
      }
      gl = null; program = null; buffer = null; shaders = [];
      status('error', '3D exploration needs WebGL graphics support. Enable hardware acceleration or try another browser.');
    }
    return api;
  }

  global.UniverseFlight = { create: create, landmarks: landmarks, math: { gamma: gamma, aberrate: aberrate, doppler: doppler, stepFlight: stepFlight, viewSpectrum: viewSpectrum, lightClock: lightClock, chartView: chartView, approachPlan: approachPlan } };
})(window);
