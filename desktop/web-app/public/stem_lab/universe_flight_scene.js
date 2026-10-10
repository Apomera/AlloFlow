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
  // Fixed teaching-model dust near the two generated emission regions. These
  // are not surveyed clouds. Density is an optical-depth coefficient per ly;
  // the RGB law is qualitative, not a calibrated extinction curve.
  var STELLAR_DUST = [
    { id: 'blue-shell', position: [7, -2, 30], radii: [7.5, 2.4, 4.3], densityPerLy: 0.24 },
    { id: 'blue-ridge', position: [13, 1, 38], radii: [4.8, 2.1, 5.8], densityPerLy: 0.14 },
    { id: 'violet-ridge', position: [-20, 11, 80], radii: [10, 3.8, 7], densityPerLy: 0.14 }
  ];
  var DUST_RGB = [0.72, 1, 1.45];
  function dustClouds() {
    return STELLAR_DUST.map(function (cloud) {
      return { id: cloud.id, position: cloud.position.slice(), radii: cloud.radii.slice(), densityPerLy: cloud.densityPerLy };
    });
  }
  function dustOpticalDepth(observer, source, clouds) {
    function vector(value) { return Array.isArray(value) && value.length === 3 && Number.isFinite(value[0]) && Number.isFinite(value[1]) && Number.isFinite(value[2]); }
    if (!vector(observer) || !vector(source)) return null;
    if (clouds === undefined) clouds = STELLAR_DUST;
    if (!Array.isArray(clouds)) return null;
    for (var entry = 0; entry < clouds.length; entry++) {
      var specification = clouds[entry];
      if (!specification || !vector(specification.position) || !vector(specification.radii) || !specification.radii.every(function (radius) { return radius > 0; }) ||
        !Number.isFinite(specification.densityPerLy) || specification.densityPerLy < 0) return null;
    }
    var delta = source.map(function (value, i) { return value - observer[i]; });
    var distance = Math.hypot.apply(Math, delta);
    if (!Number.isFinite(distance)) return null;
    if (!distance || !clouds.length) return 0;
    var direction = delta.map(function (value) { return value / distance; }), total = 0;
    function primitive(x) { return x * (1 - x * x * (2 / 3 - x * x / 5)); }
    for (var i = 0; i < clouds.length; i++) {
      var cloud = clouds[i];
      if (!cloud.densityPerLy) continue;
      var origin = observer.map(function (value, axis) { return (value - cloud.position[axis]) / cloud.radii[axis]; });
      var ray = direction.map(function (value, axis) { return value / cloud.radii[axis]; });
      var aa = ray[0] * ray[0] + ray[1] * ray[1] + ray[2] * ray[2];
      var closest = -(origin[0] * ray[0] + origin[1] * ray[1] + origin[2] * ray[2]) / aa;
      // Explicit closest approach avoids subtracting two large quadratic terms.
      var offset = origin.map(function (value, axis) { return value + ray[axis] * closest; });
      var height = 1 - offset[0] * offset[0] - offset[1] * offset[1] - offset[2] * offset[2];
      if (height <= 0) continue;
      var halfChord = Math.sqrt(height / aa);
      var start = Math.max(-1, Math.min(1, -closest / halfChord));
      var end = Math.max(-1, Math.min(1, (distance - closest) / halfChord));
      if (end <= start) continue;
      // Integrate (1-q)^2 only along the camera-to-source segment inside q<1.
      // Both primitive arguments stay in [-1,1], including far-away observers.
      total += Math.max(0, cloud.densityPerLy * height * height * halfChord * (primitive(end) - primitive(start)));
    }
    return Number.isFinite(total) ? total : null;
  }
  function dustTransmission(observer, source, clouds) {
    var depth = dustOpticalDepth(observer, source, clouds);
    return depth === null ? null : DUST_RGB.map(function (coefficient) { return Math.exp(-depth * coefficient); });
  }
  var LANDMARKS = {
    neighborhood: [
      { id: 'amber-star', name: 'Amber star', kind: 'Generated star', description: 'A warm-colored model star close enough to show clear parallax as you move.', position: [-3.1, 1, 8.5], arrivalRadiusLy: 0.6 },
      { id: 'blue-star', name: 'Blue star', kind: 'Generated star', description: 'A blue-white model star. Compare its apparent direction and frequency shift at different traveler speeds.', position: [4.3, -2.2, 16], arrivalRadiusLy: 0.8 },
      { id: 'pale-star', name: 'Pale star', kind: 'Generated star', description: 'A more distant model star for comparing perspective and changing lines of sight.', position: [0.65, 2.4, 24], arrivalRadiusLy: 1 },
      { id: 'blue-nebula', name: 'Blue emission region', kind: 'Generated emission region', description: 'A nearby model of layered glowing filaments. Its colors and brightness are illustrative; the gaps represent reduced emission, not measured dust extinction.', position: [9, -2, 34], arrivalRadiusLy: 20 },
      { id: 'violet-nebula', name: 'Violet emission region', kind: 'Generated emission region', description: 'A larger generated cloud beyond the blue region. Move sideways to compare foreground filaments with the distant stellar background.', position: [-22, 11, 83], arrivalRadiusLy: 32 }
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

  // These centers identify the three existing neighborhood star populations.
  // They add destinations only; source positions and the RNG stream stay fixed.
  [
    {name:'Near stellar group',position:[-8.5,4,27],radius:5},
    {name:'Blue-side stellar group',position:[18,-10,61],radius:8},
    {name:'Distant stellar group',position:[-30,15,106],radius:12}
  ].forEach(function(group,index) {
    LANDMARKS.neighborhood.push({id:'local-cluster-'+(index+1),name:group.name,kind:'Generated stellar group',
      description:'A loose generated group of stars with a denser central region. Move sideways to compare nearby members with the more distant sky. The group is teaching scenery, not a surveyed cluster.',
      position:group.position.slice(),arrivalRadiusLy:group.radius});
  });

  // Metadata uses the same transform as the existing halo star generation.
  // Keep the renderer's RNG stream and generated point bytes independent.
  var HALO_CENTERS = [
    [-18000, 9000, 8000], [23000, -13000, -18000], [-32000, -7000, -16000],
    [12000, 19000, 16000], [27000, 10000, 24000], [-11000, -21000, 10000]
  ].map(function (anchor) {
    var tiltedY = anchor[1] * Math.cos(0.88) - anchor[2] * Math.sin(0.88);
    var tiltedZ = anchor[1] * Math.sin(0.88) + anchor[2] * Math.cos(0.88);
    return [anchor[0] * Math.cos(-0.22) - tiltedY * Math.sin(-0.22), anchor[0] * Math.sin(-0.22) + tiltedY * Math.cos(-0.22), tiltedZ];
  });
  HALO_CENTERS.forEach(function (position, index) {
    LANDMARKS.galaxy.push({ id: 'halo-cluster-' + (index + 1), name: 'Halo cluster ' + (index + 1), kind: 'Generated stellar group',
      description: 'A compact generated group of warm stars in the spiral model’s halo. Its position and members are illustrative teaching scenery.',
      position: position.slice(), arrivalRadiusLy: 600 });
  });

  // An authored camera tour, sampled by arc length. This is a viewing path,
  // not a gravitational trajectory or a relativistic spacecraft course.
  var HALO_FLYBY = (function () {
    var center = HALO_CENTERS[1], radius = Math.hypot(center[0], center[2]);
    var radial = [center[0] / radius, 0, center[2] / radius], tangent = [-radial[2], 0, radial[0]];
    function world(point) { return center.map(function (value, i) { return value + point[0] * radial[i] + point[1] * (i === 1 ? 1 : 0) + point[2] * tangent[i]; }); }
    var nodes = [[-13000,27000,-15000],[-2200,3500,-5800],[900,180,-1600],[900,180,1600],[9000,4500,8500],[-17000,50000,95000]];
    var tangents = [[10000,-21000,7000],[8500,-8000,9000],[0,0,3200],[0,0,3200],[15000,10000,12000],[-8000,35000,55000]];
    var samples = [], joins = [0], length = 0, previous;
    function curve(segment, u) {
      var u2 = u * u, u3 = u2 * u;
      return world(nodes[segment].map(function (value, i) {
        return (2*u3-3*u2+1)*value + (u3-2*u2+u)*tangents[segment][i] +
          (-2*u3+3*u2)*nodes[segment+1][i] + (u3-u2)*tangents[segment+1][i];
      }));
    }
    for (var segment = 0; segment < nodes.length - 1; segment++) {
      for (var step = segment ? 1 : 0; step <= 256; step++) {
        var position = curve(segment, step / 256);
        if (previous) length += Math.hypot(position[0]-previous[0],position[1]-previous[1],position[2]-previous[2]);
        samples.push({ distance: length, parameter: segment + step / 256 }); previous = position;
      }
      joins.push(length);
    }
    // Monotone cubic distance timing keeps speed continuous through each
    // curve join, slows beside the group, and starts and finishes at rest.
    var times = [0,8,13,23,28,36], slopes = [0], rates = [];
    for (var interval = 0; interval < times.length - 1; interval++) rates.push((joins[interval+1]-joins[interval])/(times[interval+1]-times[interval]));
    for (var j = 1; j < times.length - 1; j++) {
      var left = times[j]-times[j-1], right = times[j+1]-times[j];
      var w1 = 2*right+left, w2 = right+2*left;
      slopes.push((w1+w2)/(w1/rates[j-1]+w2/rates[j]));
    }
    slopes.push(0);
    function atTime(seconds) {
      var elapsed = clamp(finite(seconds, 0), 0, 36), interval = 0;
      while (interval < times.length-2 && elapsed > times[interval+1]) interval++;
      var width = times[interval+1]-times[interval], u = (elapsed-times[interval])/width, u2=u*u, u3=u2*u;
      var distance = (2*u3-3*u2+1)*joins[interval] + (u3-2*u2+u)*width*slopes[interval] +
        (-2*u3+3*u2)*joins[interval+1] + (u3-u2)*width*slopes[interval+1];
      distance = clamp(distance, joins[interval], joins[interval+1]);
      var low = 0, high = samples.length-1;
      while (high-low>1) { var mid = Math.floor((low+high)/2); if (samples[mid].distance<distance) low=mid; else high=mid; }
      var a=samples[low], b=samples[high], fraction=b.distance>a.distance?(distance-a.distance)/(b.distance-a.distance):0;
      var parameter=a.parameter+(b.parameter-a.parameter)*fraction, part=Math.min(nodes.length-2,Math.floor(parameter));
      var position = curve(part, parameter-part);
      var blend = clamp((elapsed-22)/8,0,1); blend=blend*blend*(3-2*blend);
      var aim = center.map(function(value) { return value*(1-blend); });
      var direction = aim.map(function(value,i) { return value-position[i]; });
      var yaw = Math.atan2(direction[0],direction[2]), pitch = Math.atan2(direction[1],Math.hypot(direction[0],direction[2]));
      var pace = ((6*u2-6*u)*joins[interval] + (3*u2-4*u+1)*width*slopes[interval] +
        (-6*u2+6*u)*joins[interval+1] + (3*u2-2*u)*width*slopes[interval+1])/width;
      return { position:position, yaw:yaw, pitch:pitch, distance:distance, pace:Math.max(0,pace),
        phase:elapsed>=36?'complete':elapsed>=28?'reveal':elapsed>=23?'turn':elapsed>=13?'cluster':elapsed>=8?'approach':'arm' };
    }
    return { id:'halo', name:'Halo flyby', region:'galaxy', durationSeconds:36, position:world(nodes[0]), aim:center.slice(), fov:60, targetId:'halo-cluster-2', atTime:atTime };
  })();
  // A second authored camera tour uses the existing emission regions without
  // adding points, opacity layers, or physical fog. Their fixed 3D filaments
  // give a sideways passage foreground and background parallax.
  var NEBULA_FLYBY = (function () {
    var blue = [9,-2,34], violet = [-22,11,83];
    var nodes = [[-14,6,3],[0,3,22],[12,3,29],[17,6,38],[-8,15,61],[-25,29,56]];
    var tangents = [[12,-2,20],[15,0,12],[10,2,12],[-3,5,18],[-24,14,9],[-10,15,-12]];
    var times = [0,8,16,24,30,40], samples = [], joins = [0], length = 0, previous;
    function curve(segment, u) {
      var u2 = u*u, u3 = u2*u;
      return nodes[segment].map(function (value, i) {
        return (2*u3-3*u2+1)*value + (u3-2*u2+u)*tangents[segment][i] +
          (-2*u3+3*u2)*nodes[segment+1][i] + (u3-u2)*tangents[segment+1][i];
      });
    }
    for (var segment = 0; segment < nodes.length-1; segment++) {
      for (var step = segment ? 1 : 0; step <= 256; step++) {
        var position = curve(segment,step/256);
        if (previous) length += Math.hypot(position[0]-previous[0],position[1]-previous[1],position[2]-previous[2]);
        samples.push({distance:length,parameter:segment+step/256}); previous=position;
      }
      joins.push(length);
    }
    // Monotone distance timing starts and finishes at rest and keeps the
    // passage slower beside nearby filaments than during the broad turn.
    var slopes=[0], rates=[];
    for (var interval=0;interval<times.length-1;interval++) rates.push((joins[interval+1]-joins[interval])/(times[interval+1]-times[interval]));
    for (var j=1;j<times.length-1;j++) {
      var left=times[j]-times[j-1],right=times[j+1]-times[j],w1=2*right+left,w2=right+2*left;
      slopes.push((w1+w2)/(w1/rates[j-1]+w2/rates[j]));
    }
    slopes.push(0);
    function atTime(seconds) {
      var elapsed=clamp(finite(seconds,0),0,40),interval=0;
      while (interval<times.length-2 && elapsed>times[interval+1]) interval++;
      var width=times[interval+1]-times[interval],u=(elapsed-times[interval])/width,u2=u*u,u3=u2*u;
      var distance=(2*u3-3*u2+1)*joins[interval]+(u3-2*u2+u)*width*slopes[interval]+
        (-2*u3+3*u2)*joins[interval+1]+(u3-u2)*width*slopes[interval+1];
      distance=clamp(distance,joins[interval],joins[interval+1]);
      var low=0,high=samples.length-1;
      while(high-low>1) {var mid=Math.floor((low+high)/2);if(samples[mid].distance<distance)low=mid;else high=mid;}
      var a=samples[low],b=samples[high],fraction=b.distance>a.distance?(distance-a.distance)/(b.distance-a.distance):0;
      var parameter=a.parameter+(b.parameter-a.parameter)*fraction,part=Math.min(nodes.length-2,Math.floor(parameter));
      var position=curve(part,parameter-part);
      var blend=clamp((elapsed-21)/12,0,1);blend=blend*blend*(3-2*blend);
      var aim=blue.map(function(value,i){return value+(violet[i]-value)*blend;});
      var direction=aim.map(function(value,i){return value-position[i];});
      var yaw=Math.atan2(direction[0],direction[2]),pitch=Math.atan2(direction[1],Math.hypot(direction[0],direction[2]));
      var pace=((6*u2-6*u)*joins[interval]+(3*u2-4*u+1)*width*slopes[interval]+
        (-6*u2+6*u)*joins[interval+1]+(3*u2-2*u)*width*slopes[interval+1])/width;
      return {position:position,yaw:yaw,pitch:pitch,distance:distance,pace:Math.max(0,pace),
        phase:elapsed>=40?'complete':elapsed>=30?'reveal':elapsed>=24?'turn':elapsed>=16?'passage':elapsed>=8?'filaments':'depart'};
    }
    return {id:'nebula',name:'Nebula passage',region:'neighborhood',durationSeconds:40,position:nodes[0].slice(),aim:blue.slice(),fov:64,targetId:'blue-nebula',atTime:atTime};
  })();
  // This authored viewing path passes existing galaxy models without changing
  // their geometry. Arc-length timing slows beside each galaxy and finishes
  // at rest in a broad group view; it is not a physical spacecraft trajectory.
  var GROUP_FLYBY = (function () {
    var spiral=[0,0,0], elliptical=[800000,550000,850000], group=[300000,200000,450000];
    var nodes=[[-450000,400000,-1050000],[-200000,230000,-160000],[200000,250000,100000],
      [610000,410000,490000],[720000,410000,565000],[1020000,540000,570000],[1250000,1200000,-800000]];
    var tangents=[[210000,-90000,470000],[340000,0,320000],[480000,270000,350000],
      [200000,-20000,180000],[170000,60000,70000],[230000,130000,-200000],[80000,180000,-1200000]];
    var times=[0,8,16,24,30,36,48], samples=[], joins=[0], length=0, previous;
    function curve(segment,u) {
      var u2=u*u,u3=u2*u;
      return nodes[segment].map(function(value,i) {
        return (2*u3-3*u2+1)*value+(u3-2*u2+u)*tangents[segment][i]+
          (-2*u3+3*u2)*nodes[segment+1][i]+(u3-u2)*tangents[segment+1][i];
      });
    }
    for(var segment=0;segment<nodes.length-1;segment++) {
      for(var step=segment?1:0;step<=256;step++) {
        var position=curve(segment,step/256);
        if(previous) length+=Math.hypot(position[0]-previous[0],position[1]-previous[1],position[2]-previous[2]);
        samples.push({distance:length,parameter:segment+step/256});previous=position;
      }
      joins.push(length);
    }
    // The same monotone cubic distance controller as the other authored routes
    // keeps progress increasing and speed continuous at every curve join.
    var slopes=[0],rates=[];
    for(var interval=0;interval<times.length-1;interval++) rates.push((joins[interval+1]-joins[interval])/(times[interval+1]-times[interval]));
    for(var j=1;j<times.length-1;j++) {
      var left=times[j]-times[j-1],right=times[j+1]-times[j],w1=2*right+left,w2=right+2*left;
      slopes.push((w1+w2)/(w1/rates[j-1]+w2/rates[j]));
    }
    slopes.push(0);
    // Keep the original spiral skim's distance timing as the later pass changes.
    // This positive join speed remains within both adjacent monotone intervals.
    slopes[2]=75014.6702177346;
    function atTime(seconds) {
      var elapsed=clamp(finite(seconds,0),0,48),interval=0;
      while(interval<times.length-2 && elapsed>times[interval+1]) interval++;
      var width=times[interval+1]-times[interval],u=(elapsed-times[interval])/width,u2=u*u,u3=u2*u;
      var distance=(2*u3-3*u2+1)*joins[interval]+(u3-2*u2+u)*width*slopes[interval]+
        (-2*u3+3*u2)*joins[interval+1]+(u3-u2)*width*slopes[interval+1];
      distance=clamp(distance,joins[interval],joins[interval+1]);
      var low=0,high=samples.length-1;
      while(high-low>1) {var mid=Math.floor((low+high)/2);if(samples[mid].distance<distance)low=mid;else high=mid;}
      var a=samples[low],b=samples[high],fraction=b.distance>a.distance?(distance-a.distance)/(b.distance-a.distance):0;
      var parameter=a.parameter+(b.parameter-a.parameter)*fraction,part=Math.min(nodes.length-2,Math.floor(parameter));
      var position=curve(part,parameter-part);
      var blend=clamp((elapsed-16)/10,0,1);blend=blend*blend*(3-2*blend);
      var aim=spiral.map(function(value,i){return value+(elliptical[i]-value)*blend;});
      var reveal=clamp((elapsed-36)/8,0,1);reveal=reveal*reveal*(3-2*reveal);
      aim=aim.map(function(value,i){return value+(group[i]-value)*reveal;});
      var direction=aim.map(function(value,i){return value-position[i];});
      var yaw=Math.atan2(direction[0],direction[2]),pitch=Math.atan2(direction[1],Math.hypot(direction[0],direction[2]));
      var pace=((6*u2-6*u)*joins[interval]+(3*u2-4*u+1)*width*slopes[interval]+
        (-6*u2+6*u)*joins[interval+1]+(3*u2-2*u)*width*slopes[interval+1])/width;
      return {position:position,yaw:yaw,pitch:pitch,distance:distance,pace:Math.max(0,pace),
        phase:elapsed>=48?'complete':elapsed>=36?'reveal':elapsed>=24?'elliptical':elapsed>=16?'crossing':elapsed>=8?'spiral':'depart'};
    }
    return {id:'group',name:'Galaxy group flyby',region:'cosmic',durationSeconds:48,position:nodes[0].slice(),aim:spiral.slice(),fov:60,targetId:'near-galaxy',atTime:atTime};
  })();
  // This viewing path passes the three existing model stars, slowing beside
  // their illustrative surfaces before looking back toward the emission region.
  // The camera stays outside their viewing radii; this is not a stellar-size
  // scale model or a physical spacecraft trajectory.
  var STELLAR_FLYBY = (function () {
    var amber=[-3.1,1,8.5], blue=[4.3,-2.2,16], pale=[0.65,2.4,24], panorama=[3,0,27];
    var nodes=[[-7,4,-2],[-4,1.2,7.9],[-3.78,1.2,8.65],[-3.55,1.4,9.6],
      [5,-1.4,13.7],[5.16,-1.96,15.86],[5.9,-1.9,17.5],[-1,3.8,21.4],
      [-0.007,2.747,23.214],[1.9,4.15,25.5],[7,7,48]];
    var tangents=[[2,-1,7],[0.5,-0.1,1.4],[0.4,0,1.8133333333333332],[3,-1,2.5],
      [0.7,-0.4,3],[0.35,-0.2,1.807142857142857],[0.2,1.5,3],[-0.8,-0.6,2.2],
      [0.8,3,0.6557251908396946],[1.4,1.1,4.2],[2,2,14]];
    var times=[0,6,10,14,20,24,28,34,38,41,46], samples=[], joins=[0], length=0, previous;
    function curve(segment,u) {
      var u2=u*u,u3=u2*u;
      return nodes[segment].map(function(value,i) {
        return (2*u3-3*u2+1)*value+(u3-2*u2+u)*tangents[segment][i]+
          (-2*u3+3*u2)*nodes[segment+1][i]+(u3-u2)*tangents[segment+1][i];
      });
    }
    for(var segment=0;segment<nodes.length-1;segment++) {
      for(var step=segment?1:0;step<=256;step++) {
        var position=curve(segment,step/256);
        if(previous) length+=Math.hypot(position[0]-previous[0],position[1]-previous[1],position[2]-previous[2]);
        samples.push({distance:length,parameter:segment+step/256});previous=position;
      }
      joins.push(length);
    }
    // Arc-length timing slows at the surfaces and preserves continuous speed
    // through the curve joins, with both departure and arrival at rest.
    var slopes=[0],rates=[];
    for(var interval=0;interval<times.length-1;interval++) rates.push((joins[interval+1]-joins[interval])/(times[interval+1]-times[interval]));
    for(var j=1;j<times.length-1;j++) {
      var left=times[j]-times[j-1],right=times[j+1]-times[j],w1=2*right+left,w2=right+2*left;
      slopes.push((w1+w2)/(w1/rates[j-1]+w2/rates[j]));
    }
    slopes.push(0);
    function atTime(seconds) {
      var elapsed=clamp(finite(seconds,0),0,46),interval=0;
      while(interval<times.length-2 && elapsed>times[interval+1]) interval++;
      var width=times[interval+1]-times[interval],u=(elapsed-times[interval])/width,u2=u*u,u3=u2*u;
      var distance=(2*u3-3*u2+1)*joins[interval]+(u3-2*u2+u)*width*slopes[interval]+
        (-2*u3+3*u2)*joins[interval+1]+(u3-u2)*width*slopes[interval+1];
      distance=clamp(distance,joins[interval],joins[interval+1]);
      var low=0,high=samples.length-1;
      while(high-low>1) {var mid=Math.floor((low+high)/2);if(samples[mid].distance<distance)low=mid;else high=mid;}
      var a=samples[low],b=samples[high],fraction=b.distance>a.distance?(distance-a.distance)/(b.distance-a.distance):0;
      var parameter=a.parameter+(b.parameter-a.parameter)*fraction,part=Math.min(nodes.length-2,Math.floor(parameter));
      var position=curve(part,parameter-part);
      var blend=clamp((elapsed-14)/6,0,1);blend=blend*blend*(3-2*blend);
      var aim=amber.map(function(value,i){return value+(blue[i]-value)*blend;});
      var next=clamp((elapsed-28)/6,0,1);next=next*next*(3-2*next);
      aim=aim.map(function(value,i){return value+(pale[i]-value)*next;});
      var reveal=clamp((elapsed-41)/4,0,1);reveal=reveal*reveal*(3-2*reveal);
      aim=aim.map(function(value,i){return value+(panorama[i]-value)*reveal;});
      var direction=aim.map(function(value,i){return value-position[i];});
      var yaw=Math.atan2(direction[0],direction[2]),pitch=Math.atan2(direction[1],Math.hypot(direction[0],direction[2]));
      var pace=((6*u2-6*u)*joins[interval]+(3*u2-4*u+1)*width*slopes[interval]+
        (-6*u2+6*u)*joins[interval+1]+(3*u2-2*u)*width*slopes[interval+1])/width;
      return {position:position,yaw:yaw,pitch:pitch,distance:distance,pace:Math.max(0,pace),
        phase:elapsed>=46?'complete':elapsed>=41?'reveal':elapsed>=34?'pale':elapsed>=28?'to-pale':elapsed>=20?'blue':elapsed>=14?'to-blue':elapsed>=6?'amber':'depart'};
    }
    return {id:'stellar',name:'Stellar close pass',region:'neighborhood',durationSeconds:46,position:nodes[0].slice(),aim:amber.slice(),fov:62,targetId:'amber-star',atTime:atTime};
  })();
  // A camera passage through the same tilted procedural disk. The route
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
      for(var step=segment?1:0;step<=1024;step++) {
        var position=curve(segment,step/1024);
        if(previous)length+=Math.hypot(position[0]-previous[0],position[1]-previous[1],position[2]-previous[2]);
        samples.push({distance:length,parameter:segment+step/1024});previous=position;
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
  // A slow camera passage through the existing first stellar group. The offset
  // from its center keeps the viewing direction continuous throughout the pass.
  var CLUSTER_FLYBY = (function () {
    var group = [-8.5,4,27], panorama = [1,0,33];
    var nodes = [[-21,11,4],[-14,6,19],[-12.5,5.3,25],[-12.1,5,31],[-6,10,42],[16,17,53]];
    var tangents = [[8,-4,14],[4,-1,8],[0,-0.2,6],[2,1,8],[10,8,15],[14,3,6]];
    var times = [0,6,12,22,28,36], samples = [], joins = [0], length = 0, previous;
    function curve(segment, u) {
      var u2 = u*u, u3 = u2*u;
      return nodes[segment].map(function (value, i) {
        return (2*u3-3*u2+1)*value + (u3-2*u2+u)*tangents[segment][i] +
          (-2*u3+3*u2)*nodes[segment+1][i] + (u3-u2)*tangents[segment+1][i];
      });
    }
    for (var segment = 0; segment < nodes.length-1; segment++) {
      for (var step = segment ? 1 : 0; step <= 256; step++) {
        var position = curve(segment,step/256);
        if (previous) length += Math.hypot(position[0]-previous[0],position[1]-previous[1],position[2]-previous[2]);
        samples.push({distance:length,parameter:segment+step/256}); previous=position;
      }
      joins.push(length);
    }
    // Monotone distance timing starts and finishes at rest and keeps the
    // passage slower among nearby stars than during the wider reveal.
    var slopes=[0], rates=[];
    for (var interval=0;interval<times.length-1;interval++) rates.push((joins[interval+1]-joins[interval])/(times[interval+1]-times[interval]));
    for (var j=1;j<times.length-1;j++) {
      var left=times[j]-times[j-1],right=times[j+1]-times[j],w1=2*right+left,w2=right+2*left;
      slopes.push((w1+w2)/(w1/rates[j-1]+w2/rates[j]));
    }
    slopes.push(0);
    function atTime(seconds) {
      var elapsed=clamp(finite(seconds,0),0,36),interval=0;
      while (interval<times.length-2 && elapsed>times[interval+1]) interval++;
      var width=times[interval+1]-times[interval],u=(elapsed-times[interval])/width,u2=u*u,u3=u2*u;
      var distance=(2*u3-3*u2+1)*joins[interval]+(u3-2*u2+u)*width*slopes[interval]+
        (-2*u3+3*u2)*joins[interval+1]+(u3-u2)*width*slopes[interval+1];
      distance=clamp(distance,joins[interval],joins[interval+1]);
      var low=0,high=samples.length-1;
      while(high-low>1) {var mid=Math.floor((low+high)/2);if(samples[mid].distance<distance)low=mid;else high=mid;}
      var a=samples[low],b=samples[high],fraction=b.distance>a.distance?(distance-a.distance)/(b.distance-a.distance):0;
      var parameter=a.parameter+(b.parameter-a.parameter)*fraction,part=Math.min(nodes.length-2,Math.floor(parameter));
      var position=curve(part,parameter-part);
      var blend=clamp((elapsed-22)/10,0,1);blend=blend*blend*(3-2*blend);
      var aim=group.map(function(value,i){return value+(panorama[i]-value)*blend;});
      var direction=aim.map(function(value,i){return value-position[i];});
      var yaw=Math.atan2(direction[0],direction[2]),pitch=Math.atan2(direction[1],Math.hypot(direction[0],direction[2]));
      var pace=((6*u2-6*u)*joins[interval]+(3*u2-4*u+1)*width*slopes[interval]+
        (-6*u2+6*u)*joins[interval+1]+(3*u2-2*u)*width*slopes[interval+1])/width;
      return {position:position,yaw:yaw,pitch:pitch,distance:distance,pace:Math.max(0,pace),
        phase:elapsed>=36?'complete':elapsed>=28?'reveal':elapsed>=22?'emerge':elapsed>=12?'heart':elapsed>=6?'approach':'depart'};
    }
    return {id:'cluster',name:'Star cluster passage',region:'neighborhood',durationSeconds:36,position:nodes[0].slice(),aim:group.slice(),fov:64,targetId:'local-cluster-1',atTime:atTime};
  })();
  var FLYBY_ROUTES = {halo:HALO_FLYBY,nebula:NEBULA_FLYBY,group:GROUP_FLYBY,stellar:STELLAR_FLYBY,disk:DISK_FLYBY,cluster:CLUSTER_FLYBY};
  HALO_FLYBY.completionTargetId = 'galactic-center';
  HALO_FLYBY.completionMessage = 'Halo flyby complete. Travel is paused beside the spiral; look around or explore another destination.';
  NEBULA_FLYBY.completionTargetId = 'violet-nebula';
  NEBULA_FLYBY.completionMessage = 'Nebula passage complete. Travel is paused outside the violet emission region; look around or explore another destination.';
  HALO_FLYBY.highlights = [
    {id:'arm',name:'Spiral arm',seconds:12,targetId:'galactic-center',description:'Look across the tilted disk as the cluster comes into view.'},
    {id:'cluster',name:'Cluster pass',seconds:18,targetId:'halo-cluster-2',description:'Compare the nearby warm stars with the distant spiral.'},
    {id:'panorama',name:'Galaxy panorama',seconds:32,targetId:'galactic-center',description:'Look back across the spiral from the halo.'}
  ];
  NEBULA_FLYBY.highlights = [
    {id:'approach',name:'Blue cloud approach',seconds:8,targetId:'blue-nebula',description:'See the blue glow against the distant stellar field.'},
    {id:'filaments',name:'Among the filaments',seconds:12,targetId:'blue-nebula',description:'Look around the layered blue emission region.'},
    {id:'violet',name:'Violet cloud reveal',seconds:36,targetId:'violet-nebula',description:'Look toward the violet cloud after the curved passage.'}
  ];
  GROUP_FLYBY.completionTargetId = 'golden-elliptical';
  GROUP_FLYBY.completionMessage = 'Galaxy group flyby complete. Travel is paused with the spiral and golden elliptical in view; look around or explore another destination.';
  GROUP_FLYBY.highlights = [
    {id:'spiral',name:'Spiral skim',seconds:12,targetId:'near-galaxy',description:'Look across the tilted arms of the nearby spiral.'},
    {id:'elliptical',name:'Golden elliptical pass',seconds:30,targetId:'golden-elliptical',description:'Compare the smooth warm halo with the nearby spiral.'},
    {id:'panorama',name:'Galaxy group panorama',seconds:44,targetId:'golden-elliptical',description:'Look back across the spiral and elliptical together.'}
  ];
  STELLAR_FLYBY.completionTargetId = 'pale-star';
  STELLAR_FLYBY.completionMessage = 'Stellar close pass complete. Travel is paused beyond the three model stars; look back, orbit a star, or explore another destination.';
  STELLAR_FLYBY.highlights = [
    {id:'amber',name:'Amber photosphere',seconds:10,targetId:'amber-star',description:'Pause beside the warm star to inspect its illustrative surface.'},
    {id:'blue',name:'Blue star pass',seconds:24,targetId:'blue-star',description:'Compare the blue-white surface and the moving stellar background.'},
    {id:'pale',name:'Pale star reveal',seconds:38,targetId:'pale-star',description:'Look across the pale star with the blue emission region beyond.'}
  ];
  DISK_FLYBY.completionTargetId = 'galactic-center';
  DISK_FLYBY.completionMessage = 'Spiral disk passage complete. Travel is paused beyond the tilted disk; look back across the galaxy or explore another destination.';
  DISK_FLYBY.highlights = [
    {id:'arms',name:'Above the spiral arms',seconds:10,targetId:'inner-arm',description:'Look toward the inner arm from above the generated disk.'},
    {id:'crossing',name:'Inside the stellar disk',seconds:17,targetId:'inner-arm',description:'Pause among the existing three-dimensional stars and emission records as the camera crosses the disk.'},
    {id:'panorama',name:'Beyond the disk',seconds:40,targetId:'galactic-center',description:'Look back at the spiral after emerging on the other side of the tilted disk.'}
  ];
  CLUSTER_FLYBY.completionTargetId = 'local-cluster-1';
  CLUSTER_FLYBY.completionMessage = 'Star cluster passage complete. Travel is paused with the stellar group and emission regions ahead; inspect a group, orbit it, or explore another destination.';
  CLUSTER_FLYBY.highlights = [
    {id:'approach',name:'Group approach',seconds:8,targetId:'local-cluster-1',description:'See the loose outer stars gather around a denser central region.'},
    {id:'heart',name:'Among the stars',seconds:18,targetId:'local-cluster-1',description:'Look around the three-dimensional group. Nearby members shift more strongly than distant stars as the camera moves.'},
    {id:'reveal',name:'Group and nebulae',seconds:32,targetId:'local-cluster-1',description:'Look back across the stellar group with the glowing emission regions beyond.'}
  ];
  // Integrate a smooth velocity ramp analytically in authored route seconds.
  // Its finite endpoint avoids an asymptotic crawl and frame-rate dependence.
  function flybyLeg(start, end, depart) {
    var distance=Math.max(0,end-start), ramp=Math.min(1.2,distance*0.45);
    var entry=depart?ramp:0, exit=ramp;
    return {start:start,end:end,entry:entry,exit:exit,duration:distance+(entry+exit)/2,clock:0};
  }
  function flybyLegPosition(leg, clock) {
    var t=clamp(clock,0,leg.duration);
    function rampDistance(time,span) { var u=time/span;return span*(u*u*u-0.5*u*u*u*u); }
    if(t>=leg.duration)return leg.end;
    if(leg.entry&&t<leg.entry)return leg.start+rampDistance(t,leg.entry);
    if(leg.exit&&t>leg.duration-leg.exit)return leg.end-rampDistance(leg.duration-t,leg.exit);
    return leg.start+t-leg.entry/2;
  }

  function flybyRoute(id) { return Object.prototype.hasOwnProperty.call(FLYBY_ROUTES,id) ? FLYBY_ROUTES[id] : null; }
  function flybys(region) {
    return Object.keys(FLYBY_ROUTES).map(function(id){return FLYBY_ROUTES[id];}).filter(function(item){return region===undefined || region===item.region;}).map(function(item){
      return {id:item.id,name:item.name,region:item.region,durationSeconds:item.durationSeconds,position:item.position.slice(),aim:item.aim.slice(),fov:item.fov,targetId:item.targetId,
        highlights:item.highlights.map(function(highlight){return {id:highlight.id,name:highlight.name,seconds:highlight.seconds,description:highlight.description,targetId:highlight.targetId};})};
    });
  }

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

  function targetView(direction, yaw, pitch, beta, fov, aspect) {
    // Follow the renderer: aberrate in the travel frame, then rotate into
    // the camera view. Rear targets keep their transverse turn direction.
    var apparent = aberrate(direction || [], beta);
    var sy = Math.sin(finite(yaw, 0)), cy = Math.cos(finite(yaw, 0));
    var sp = Math.sin(finite(pitch, 0)), cp = Math.cos(finite(pitch, 0));
    var x = apparent[0] * cy - apparent[2] * sy;
    var y = -apparent[0] * sy * sp + apparent[1] * cp - apparent[2] * cy * sp;
    var z = apparent[0] * sy * cp + apparent[1] * sp + apparent[2] * cy * cp;
    var viewportAspect = finite(aspect, 1);
    if (viewportAspect <= 0) viewportAspect = 1;
    var lens = 1 / Math.tan(clamp(finite(fov, 65), 10, 100) * Math.PI / 360);
    var screen = z > 0.001 ? [0.5 + x * lens / z / viewportAspect / 2, 0.5 - y * lens / z / 2] : [null, null];
    var antipode = z < 0 && Math.hypot(x, y) < 1e-8;
    var arrow = antipode ? 0 : Math.atan2(-y, x);
    var sectors = ['right', 'lower-right', 'down', 'lower-left', 'left', 'upper-left', 'up', 'upper-right'];
    var sector = antipode ? 'behind' : sectors[(Math.round(arrow / (Math.PI / 4)) + 8) % 8];
    var dx = antipode ? 1 : x / viewportAspect, dy = antipode ? 0 : -y;
    var edgeScale = Math.min(dx ? 0.4 / Math.abs(dx) : Infinity, dy ? 0.4 / Math.abs(dy) : Infinity);
    var edge = Number.isFinite(edgeScale) ? [0.5 + dx * edgeScale, 0.5 + dy * edgeScale] : [0.5, 0.5];
    return {
      screen: screen,
      inView: z > 0.001 && screen[0] >= 0 && screen[0] <= 1 && screen[1] >= 0 && screen[1] <= 1,
      angleDeg: Math.atan2(Math.hypot(x, y), z) * 180 / Math.PI,
      behind: z < 0, sector: sector, arrowDeg: arrow * 180 / Math.PI, edge: edge
    };
  }

  // A paused camera step on a sphere about a landmark. Angles use world +Y
  // as up. Check the entire requested arc against the generated scene limit.
  function orbitView(position, center, direction, degrees, boundary) {
    if (!Array.isArray(position)||!Array.isArray(center)||position.length!==3||center.length!==3||
        !position.every(Number.isFinite)||!center.every(Number.isFinite)||
        !['left','right','up','down'].includes(direction)||!Number.isFinite(degrees)||degrees<=0||degrees>45||!Number.isFinite(boundary)||boundary<=0) return null;
    var dx=position[0]-center[0],dy=position[1]-center[1],dz=position[2]-center[2];
    var horizontal=Math.hypot(dx,dz),radius=Math.hypot(horizontal,dy);
    if (!(radius>1e-9)||!Number.isFinite(radius)||Math.hypot.apply(Math,position)>boundary*(1+1e-12)) return null;
    var azimuth=Math.atan2(dx,dz),elevation=Math.atan2(dy,horizontal),step=degrees*Math.PI/180,limit=85*Math.PI/180;
    var vertical=direction==='up'||direction==='down',nextElevation=elevation,nextAzimuth=azimuth;
    var start,end,a,b,constant=0,distance;
    if(vertical){
      if((direction==='up'&&elevation>=limit-1e-12)||(direction==='down'&&elevation<=-limit+1e-12))return null;
      nextElevation=clamp(elevation+(direction==='up'?step:-step),-limit,limit);
      start=elevation;end=nextElevation;a=radius*(center[0]*Math.sin(azimuth)+center[2]*Math.cos(azimuth));b=radius*center[1];
      distance=radius*Math.abs(end-start);
    }else{
      if(horizontal<=radius*1e-9)return null;
      nextAzimuth=azimuth+(direction==='left'?step:-step);
      start=azimuth;end=nextAzimuth;a=horizontal*center[2];b=horizontal*center[0];constant=center[1]*dy;
      distance=horizontal*step;
    }
    var low=Math.min(start,end),high=Math.max(start,end),peak=Math.atan2(b,a);
    peak+=Math.ceil((low-peak)/TAU)*TAU;
    var maxDot=Math.max(a*Math.cos(start)+b*Math.sin(start),a*Math.cos(end)+b*Math.sin(end));
    if(peak<=high+1e-12)maxDot=Math.max(maxDot,Math.hypot(a,b));
    var furthest=center.reduce(function(sum,v){return sum+v*v;},0)+radius*radius+2*(constant+maxDot);
    if(furthest>boundary*boundary*(1+1e-12))return null;
    var nextHorizontal=vertical?radius*Math.cos(nextElevation):horizontal;
    var next=[center[0]+nextHorizontal*Math.sin(nextAzimuth),vertical?center[1]+radius*Math.sin(nextElevation):position[1],center[2]+nextHorizontal*Math.cos(nextAzimuth)];
    if(!next.every(Number.isFinite)||!(distance>0))return null;
    return {position:next,distanceLy:distance,radiusLy:radius,elevationDeg:nextElevation*180/Math.PI};
  }

  // A camera distance step along the current landmark-to-camera ray. The
  // world sphere is convex, so endpoints inside it keep the entire move inside.
  function rangeView(position, center, factor, minimum, boundary) {
    if(!Array.isArray(position)||!Array.isArray(center)||position.length!==3||center.length!==3||
       !position.every(Number.isFinite)||!center.every(Number.isFinite)||!Number.isFinite(factor)||factor<.5||factor>2||factor===1||
       !Number.isFinite(minimum)||minimum<=0||!Number.isFinite(boundary)||boundary<=0)return null;
    if(Math.hypot.apply(Math,position)>boundary*(1+1e-12)||Math.hypot.apply(Math,center)>boundary*(1+1e-12))return null;
    var ray=position.map(function(value,i){return value-center[i];}),range=Math.hypot.apply(Math,ray);
    if(!(range>1e-9)||!Number.isFinite(range)||Math.abs(ray[1])/range>Math.cos(.01))return null;
    var direction=ray.map(function(value){return value/range;}),scaled=center.map(function(value){return value/boundary;});
    var projection=scaled.reduce(function(sum,value,i){return sum+value*direction[i];},0);
    var perpendicular=Math.hypot.apply(Math,scaled.map(function(value,i){return value-direction[i]*projection;}));
    var maximum=boundary*(Math.sqrt(Math.max(0,1-perpendicular*perpendicular))-projection);
    var requested=range*factor,nextRange=factor<1?Math.max(minimum,requested):Math.min(maximum,requested);
    if(!Number.isFinite(nextRange)||!(nextRange>0)||(factor<1?nextRange>=range*(1-1e-12):nextRange<=range*(1+1e-12)))return null;
    var next=center.map(function(value,i){return value+direction[i]*nextRange;});
    if(!next.every(Number.isFinite)||Math.hypot.apply(Math,next)>boundary*(1+1e-12))return null;
    return {position:next,distanceLy:Math.abs(nextRange-range),rangeLy:nextRange,minimumLy:minimum,maximumLy:maximum,
      limited:Math.abs(nextRange-requested)>Math.max(1,nextRange)*1e-12};
  }

  // Rotate the level orbit's axis about the current landmark-to-camera ray.
  // This preserves the starting point, range and circle radius at any tilt.
  function orbitPlane(position, center, tilt) {
    if(!Array.isArray(position)||!Array.isArray(center)||position.length!==3||center.length!==3||
       !position.every(Number.isFinite)||!center.every(Number.isFinite)||!Number.isFinite(tilt)||tilt<0||tilt>45)return null;
    var ray=position.map(function(value,i){return value-center[i];}),range=Math.hypot.apply(Math,ray),horizontal=Math.hypot(ray[0],ray[2]);
    if(!(range>1e-9)||!Number.isFinite(range)||horizontal<=range*1e-9)return null;
    var u=ray.map(function(value){return value/range;}),angle=tilt*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),k=1-c;
    var axis=[-u[2]*s+u[0]*u[1]*k,c+u[1]*u[1]*k,u[0]*s+u[2]*u[1]*k];
    var along=ray[1],offset=axis.map(function(value){return value*along;});
    var radial=ray.map(function(value,i){return value-offset[i];});
    var tangent=[axis[1]*radial[2]-axis[2]*radial[1],axis[2]*radial[0]-axis[0]*radial[2],axis[0]*radial[1]-axis[1]*radial[0]];
    // The look camera has no roll and stops short of a vertical sightline.
    // Decline a path that would cross that limit rather than lose centering.
    var verticalExtent=Math.abs(offset[1])+Math.hypot(radial[1],tangent[1]);
    if(verticalExtent>range*Math.cos(.011))return null;
    return {center:center.map(function(value,i){return value+offset[i];}),axis:axis,radial:radial,tangent:tangent,radiusLy:horizontal,rangeLy:range,tilt:tilt};
  }

  function targetFrame(direction, beta, fov, aspect, u) {
    if (!direction || ![0, 1, 2].every(function (i) { return Number.isFinite(direction[i]); })) return null;
    var length = Math.hypot(direction[0], direction[1], direction[2]);
    if (!length || !Number.isFinite(length)) return null;
    var anchor = u === undefined ? 0.5 : u;
    if (!Number.isFinite(anchor) || anchor < 0 || anchor > 1) return null;
    var viewportAspect = finite(aspect, 1);
    if (viewportAspect <= 0) viewportAspect = 1;
    var lensFov = clamp(finite(fov, 65), 10, 100);
    var source = [direction[0] / length, direction[1] / length, direction[2] / length];
    var apparent = aberrate(source, beta);
    var a = (2 * anchor - 1) * viewportAspect * Math.tan(lensFov * Math.PI / 360);
    var c = 1 / Math.hypot(1, a), pitchMax = Math.PI / 2 - 0.01;
    // The camera has no roll. A target too close to its vertical axis cannot
    // reach this horizontal anchor without exceeding the allowed pitch.
    if (!Number.isFinite(a) || c <= 0.001 || Math.abs(apparent[1]) > c * Math.sin(pitchMax) + 1e-12) return null;
    var pitch = clamp(Math.asin(clamp(apparent[1] / c, -1, 1)), -pitchMax, pitchMax);
    var yaw = Math.atan2(apparent[0], apparent[2]) - Math.atan2(a, Math.cos(pitch));
    yaw = ((yaw % TAU) + TAU) % TAU;
    var projection = targetView(source, yaw, pitch, beta, lensFov, viewportAspect);
    if (!projection.screen.every(Number.isFinite) || Math.abs(projection.screen[0] - anchor) > 1e-9 || Math.abs(projection.screen[1] - 0.5) > 1e-9) return null;
    return { yaw: yaw, pitch: pitch, screen: [anchor, 0.5] };
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

  function easePace(current, target, dt, response) {
    var start = clamp(finite(current, 0), 0, 1e10);
    var wanted = clamp(finite(target, 0), 0, 1e10);
    var seconds = clamp(finite(dt, 0), 0, 0.1);
    var settling = clamp(finite(response, 0.6), 0.05, 10);
    // Zero pace is a stop, not a coast. Integrate the exponential exactly so
    // the camera covers the same distance across different frame intervals.
    if (!wanted) return { speed: 0, distance: 0 };
    var change = Math.expm1(-seconds / settling);
    var speed = start + (wanted - start) * -change;
    var distance = start * settling * -change + wanted * Math.max(0, seconds + settling * change);
    return { speed: clamp(speed, 0, 1e10), distance: Math.max(0, distance) };
  }

  function randomGenerator(seed) {
    return function () {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  // Small procedural atlases are shared as CPU bytes; every renderer owns its
  // GPU textures. Atlas generation is static; navigation and clocks are unchanged.
  var galaxyAtlasBytes = null, cloudAtlasBytes = null;
  var galaxyDiskLight = new Float32Array(9), galaxyDiskAxisRatio = 0.05;
  var GALAXY_TILE_SIZE = 512, GALAXY_GUTTER = 8;
  var CLOUD_TILE_SIZE = 128, CLOUD_GUTTER = 8;
  var GALAXY_STYLES = ['spiral', 'two-arm', 'barred', 'elliptical'];
  function emissionNoise(x, y, seed) {
    function hash(ix, iy) {
      var n = Math.imul(ix + seed, 374761393) ^ Math.imul(iy + seed, 668265263);
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
    }
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    return (hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx) * (1 - fy) +
      (hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx) * fy;
  }
  // Adapted from Galaxy's shared morphology layout: the point population and
  // the baked arms use exactly the same centerline, including bar branches.
  function spiralAngle(style, arm, radius) {
    if (style === 'two-arm') return arm * Math.PI + radius * 3.5;
    if (style === 'barred') {
      var branch = clamp((radius - 0.46) / (0.88 - 0.46), 0, 1);
      branch = branch * branch * (3 - 2 * branch);
      return 0.85 + (arm % 2) * Math.PI + (radius - 0.34) * 2.5 + (arm >= 2 ? branch * 0.55 : 0);
    }
    return arm * Math.PI / 2 + Math.log(1 + radius * 9) * 2.15;
  }
  // Reuse the blue cloud's existing points for a fixed, open emission shell.
  // Its own RNG runs after the original clouds, so every color, sprite profile,
  // size, light value and the rest of the scene keep their original samples.
  // Curved lips and flanks surround a viewing aperture; no gas motion or
  // extinction is modeled. The wall is illustrative generated scenery.
  function shapeEmissionShell(points, start, nebula) {
    var random = randomGenerator(nebula.shellSeed);
    // The aperture faces the entrance of the existing nebula camera passage.
    var axisLength = Math.hypot(-9, 5, -12);
    var axis = [-9 / axisLength, 5 / axisLength, -12 / axisLength];
    var right = [-0.8, 0, 0.6];
    var up = [axis[1] * right[2], axis[2] * right[0] - axis[0] * right[2], -axis[1] * right[0]];
    var ct = Math.cos(nebula.turn), st = Math.sin(nebula.turn);
    for (var point = 0; point < nebula.count; point++) {
      var offset = (start + point) * 9;
      var warmKnot = points[offset + 3] > 0.8;
      // A missing side arc breaks the shell outline. Preserved warm knots
      // sit along two rim arcs instead of filling the low-emission opening.
      var angle = warmKnot ? (point % 2 ? 0.34 : 3.4) + random() * 0.65 : 1.64 + random() * (TAU - 0.52);
      var axial = warmKnot ? 0.50 + 0.055 * Math.sin(angle * 2) + (random() - 0.5) * 0.06 :
        point % 5 < 2 ? 0.53 + 0.065 * Math.sin(angle * 2) + (random() - 0.5) * 0.08 :
        point % 5 === 2 ? -0.43 + 0.07 * Math.cos(angle * 3) + (random() - 0.5) * 0.06 : -0.43 + random() * 0.93;
      angle += axial * 0.19 + 0.06 * Math.sin(angle * 3);
      var wall = 0.92 + 0.08 * Math.sin(angle * 3 + 0.3) + 0.055 * Math.cos(angle * 5 - 0.7) + (random() - 0.5) * 0.05;
      var transverse = Math.sqrt(1 - axial * axial) * wall;
      var x = Math.cos(angle) * transverse * nebula.extent;
      var y = Math.sin(angle) * transverse * nebula.extent * 0.8;
      var z = axial * wall * nebula.extent * 0.72;
      var rotatedX = x * ct - y * st, rotatedY = x * st + y * ct;
      for (var component = 0; component < 3; component++) {
        points[offset + component] = nebula.center[component] + rotatedX * right[component] + rotatedY * up[component] + z * axis[component];
      }
    }
  }
  // Three bent ridges reuse the violet cloud's existing samples. A separate
  // seed preserves their six non-position attributes and the scene RNG stream.
  // Tapered forks, separated tips and depth give this region a distinct shape;
  // these fixed emission ridges do not simulate gas flow or dust extinction.
  function shapeEmissionRidges(points, start, nebula) {
    var random = randomGenerator(nebula.ridgeSeed), warmIndex = 0;
    // This viewing plane faces the violet reveal on the existing camera tour.
    var axisLength = Math.hypot(0.515, -0.857);
    var front = [0, 0.515 / axisLength, -0.857 / axisLength];
    var up = [0, -front[2], front[1]];
    var controls = [[-16, -1], [-2, 8], [12, -3]];
    var tips = [[-13, 14], [3, 18], [16, 9]];
    for (var point = 0; point < nebula.count; point++) {
      var offset = (start + point) * 9, warmKnot = points[offset + 3] > 0.8;
      var knot = warmIndex, branch = warmKnot ? warmIndex++ % 3 : point % 3;
      // The preserved warm knots alternate between fork arcs and tip arcs.
      var u = warmKnot ? (Math.floor(knot / 3) % 2 ? 0.34 : 0.80) + random() * 0.14 : random();
      var x, y, depth;
      if (u < 0.38) {
        var stem = u / 0.38;
        x = -9 + 6 * stem + 2 * Math.sin(Math.PI * stem);
        y = -16 + 13 * stem;
        depth = (branch - 1) * 1.4 + 2 * Math.sin(stem * 3);
      } else {
        var t = (u - 0.38) / 0.62, remaining = 1 - t;
        x = -3 * remaining * remaining + 2 * remaining * t * controls[branch][0] + t * t * tips[branch][0];
        y = -3 * remaining * remaining + 2 * remaining * t * controls[branch][1] + t * t * tips[branch][1];
        var spread = t * t * (3 - 2 * t);
        depth = (branch - 1) * (1.4 + 5.2 * spread) + 2 * Math.sin(3 + t * 4 + branch);
        x += 0.8 * Math.sin(t * 7 + branch) * Math.sin(Math.PI * t);
      }
      // Restrained, bounded variations keep the ridges irregular and thin at
      // their ends. Empty intervals between their upper branches stay visible.
      var width = warmKnot ? 0.55 : 0.65 + 1.65 * Math.sin(Math.PI * u);
      var angle = random() * TAU, radius = Math.sqrt(random()) * width;
      x += Math.cos(angle) * radius;
      y += Math.sin(angle) * radius * 0.72 + 0.35 * Math.sin(u * 17 + branch);
      depth += (random() - 0.5) * width * 2.6;
      points[offset] = nebula.center[0] + x;
      points[offset + 1] = nebula.center[1] + y * up[1] + depth * front[1];
      points[offset + 2] = nebula.center[2] + y * up[2] + depth * front[2];
    }
  }
  function makeRegion(name) {
    var random = randomGenerator(REGIONS[name].seed);
    var points = [], galaxies = [];
    function normal() { return Math.sqrt(-2 * Math.log(Math.max(1e-8, random()))) * Math.cos(TAU * random()); }
    function add(x, y, z, color, size, light, cloud, localDetail) {
      // Pack a stable tile and rotation into the existing cloud float. This
      // consumes no scene RNG samples and keeps the nine-float point layout.
      var index = points.length / 9;
      var profile = cloud ? 1 + index % 4 + ((index * 0.61803398875) % 1) * 0.98 : 0;
      // The next four tile indices opt nearby emission into resolved detail.
      // Positions, light, and the RNG stream keep the same point budget.
      if (localDetail) profile += 4;
      points.push(x, y, z, color[0], color[1], color[2], size, light, profile);
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
    function spiral(cx, cy, cz, radius, count, tilt, turn, cloudScale, elliptical, morphology) {
      var style = elliptical ? 'elliptical' : morphology || 'spiral';
      galaxies.push({ center: [cx, cy, cz], radius: radius, tilt: tilt, turn: turn, elliptical: !!elliptical, style: style });
      var ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(turn), sr = Math.sin(turn);
      for (var j = 0; j < count; j++) {
        var bulge = random() < 0.23;
        var r = bulge ? Math.abs(normal()) * radius * 0.135 : radius * Math.pow(random(), 0.72);
        var arm = Math.floor(random() * 4);
        if (style === 'two-arm') arm %= 2;
        var centerline = spiralAngle(style, arm, r / radius);
        var angle = bulge || random() < 0.25 ? random() * TAU : centerline + normal() * 0.24;
        var x = Math.cos(angle) * r, z = Math.sin(angle) * r;
        var y = normal() * radius * (bulge ? 0.065 : 0.012);
        if (style === 'barred' && !bulge && r / radius < 0.34) {
          var alongBar = (arm % 2 ? -1 : 1) * r;
          var acrossBar = Math.sin(angle - centerline) * radius * 0.055;
          x = alongBar * Math.cos(0.85) - acrossBar * Math.sin(0.85);
          z = alongBar * Math.sin(0.85) + acrossBar * Math.cos(0.85);
        }
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
      // Spend the same point budget across nearby depth, loose clusters, and the
      // distant band. The nearby population gives a moving camera parallax;
      // these are illustrative distributions, not surveyed stellar densities.
      for (var n = 0; n < 7200; n++) {
        var nearby = n < 1500;
        var local = sphere(nearby ? 4 + 61 * Math.sqrt(random()) : 5 + 245 * Math.pow(random(), 1 / 3));
        add(local[0], local[1], local[2], starColor(), (nearby ? 0.015 : 0.018) + Math.pow(random(), 6) * (nearby ? 0.1 : 0.22), 0.4 + random() * 0.6, 0);
      }
      [
        { center: [-8.5, 4, 27], spread: 5, count: 480 },
        { center: [18, -10, 61], spread: 8, count: 460 },
        { center: [-30, 15, 106], spread: 12, count: 360 }
      ].forEach(function (cluster) {
        for (var c = 0; c < cluster.count; c++) {
          // A loose halo surrounds a tighter core. Both have genuine depth,
          // so their stars separate as you pass rather than forming a sky decal.
          var spread = cluster.spread * (random() < 0.28 ? 0.4 : 1);
          var x = normal() * spread, y = normal() * spread * 0.75, z = normal() * spread * 1.4;
          add(cluster.center[0] + x, cluster.center[1] + y, cluster.center[2] + z,
            starColor(), 0.02 + Math.pow(random(), 4) * 0.1, 0.48 + random() * 0.52, 0);
        }
      });
      var emissionShapes = [];
      [
        { center: [9, -2, 34], extent: 11.5, turn: -0.35, count: 570, color: [0.30, 0.64, 0.90], morphology: 'shell', shellSeed: 0x4b1d6e29 },
        { center: [-22, 11, 83], extent: 21, turn: 0.48, count: 430, color: [0.65, 0.36, 0.72], morphology: 'ridges', ridgeSeed: 0x73a9d142 }
      ].forEach(function (nebula) {
        var start = points.length / 9;
        var ct = Math.cos(nebula.turn), st = Math.sin(nebula.turn);
        for (var e = 0; e < nebula.count; e++) {
          var branch = e % 3, phase = branch * TAU / 3;
          var knot = random() < 0.38;
          var along = knot ? [-0.62, -0.05, 0.51][Math.floor(random() * 3)] + normal() * 0.1 : random() * 2 - 1;
          var thickness = knot ? 0.075 : 0.13;
          var x = along * nebula.extent;
          var y = (Math.sin(along * 3.8 + phase) * 0.32 + normal() * thickness) * nebula.extent;
          var z = (Math.cos(along * 2.7 + phase) * 0.34 + normal() * thickness * 1.6) * nebula.extent;
          // Layered emission knots and gaps remain fixed in world space. The
          // gaps are reduced emission, not a gas extinction or scattering model.
          var color = knot && branch === 1 ? [0.95, 0.35, 0.48] : nebula.color;
          var size = nebula.extent * (knot ? 0.095 : 0.16) * (0.65 + random() * 0.7);
          // Compensate the opacity grain in these nearby emission regions;
          // distant band and galaxy light keep their restrained profiles.
          var light = 2.4 * (knot ? 0.095 : 0.062) * (0.65 + random() * 0.7);
          add(nebula.center[0] + x * ct - y * st, nebula.center[1] + x * st + y * ct, nebula.center[2] + z, color, size, light, 1, true);
        }
        if (nebula.morphology) emissionShapes.push({ start: start, nebula: nebula });
      });
      emissionShapes.forEach(function (shape) {
        if (shape.nebula.morphology === 'shell') shapeEmissionShell(points, shape.start, shape.nebula);
        else shapeEmissionRidges(points, shape.start, shape.nebula);
      });
      for (var b = 0; b < 8000; b++) {
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
      var resolvedStarStart = points.length / 9;
      // Resolved stars occupy the same tilted three-dimensional disk.
      for (var g = 0; g < 5000; g++) {
        var a = random() * TAU, gr = Math.pow(random(), 0.8) * 55000;
        var gx = Math.cos(a) * gr, gz = Math.sin(a) * gr, gy = normal() * 700;
        var ty = gy * Math.cos(0.88) - gz * Math.sin(0.88);
        var tz = gy * Math.sin(0.88) + gz * Math.cos(0.88);
        add(gx * Math.cos(-0.22) - ty * Math.sin(-0.22), gx * Math.sin(-0.22) + ty * Math.cos(-0.22), tz,
          starColor(), 9 + random() * 18, 0.08 + random() * 0.19, 0);
      }
      // Reuse 960 resolved stars for compact, fixed concentrations in the halo.
      // The original population is generated first, so this separate seed does
      // not disturb the disk clouds, remaining stars, or distant-sky RNG stream.
      // These are generated stellar groups, not a surveyed globular catalog.
      var clusterRandom = randomGenerator(REGIONS[name].seed ^ 0x6f29a3c1);
      function clusterNormal() { return Math.sqrt(-2 * Math.log(Math.max(1e-8, clusterRandom()))) * Math.cos(TAU * clusterRandom()); }
      var clusterAnchors = [
        [-18000, 9000, 8000], [23000, -13000, -18000], [-32000, -7000, -16000],
        [12000, 19000, 16000], [27000, 10000, 24000], [-11000, -21000, 10000]
      ];
      var clusterSpreads = [48, 60, 55, 72, 64, 80];
      var clusterTilt = 0.88, clusterTurn = -0.22;
      var clusterCT = Math.cos(clusterTilt), clusterST = Math.sin(clusterTilt);
      var clusterCR = Math.cos(clusterTurn), clusterSR = Math.sin(clusterTurn);
      clusterAnchors.forEach(function(anchor, clusterIndex) {
        var outerRadius = 200 + clusterIndex % 3 * 10;
        for (var star = 0; star < 160; star++) {
          var spread = clusterSpreads[clusterIndex] * (clusterRandom() < 0.35 ? 0.38 : 1);
          var dx = clusterNormal() * spread, dy = clusterNormal() * spread, dz = clusterNormal() * spread;
          var length = Math.hypot(dx, dy, dz);
          if (length > outerRadius) {
            var bounded = outerRadius * (0.88 + clusterRandom() * 0.10) / length;
            dx *= bounded; dy *= bounded; dz *= bounded;
          }
          var localX = anchor[0] + dx, localY = anchor[1] + dy, localZ = anchor[2] + dz;
          var tiltedY = localY * clusterCT - localZ * clusterST;
          var tiltedZ = localY * clusterST + localZ * clusterCT;
          var offset = (resolvedStarStart + 4040 + clusterIndex * 160 + star) * 9;
          var warmth = clusterRandom(), brightness = clusterRandom();
          points[offset] = localX * clusterCR - tiltedY * clusterSR;
          points[offset + 1] = localX * clusterSR + tiltedY * clusterCR;
          points[offset + 2] = tiltedZ;
          points[offset + 3] = 1;
          points[offset + 4] = 0.86 + warmth * 0.12;
          points[offset + 5] = 0.68 + warmth * 0.24;
          points[offset + 6] = 5 + clusterRandom() * 9;
          // Readable individual members retain their warm color at normal
          // exposure. A few brighter stars give the compact group definition.
          points[offset + 7] = star % 40 === 0 ? 0.48 + clusterRandom() * 0.09 : 0.16 + 0.28 * Math.pow(brightness, 3);
        }
      });
      sky(2200000, 1400, 800);
    } else {
      // Galaxy groups arranged along curved filaments, with real spatial depth.
      spiral(0, 0, 0, 110000, 2600, 0.80, -0.35, 1.2);
      spiral(-480000, 190000, 1300000, 100000, 1400, 1.05, 0.45, 1.2, false, 'two-arm');
      spiral(2100000, -800000, 4200000, 90000, 1400, 0.7, -0.2, 1.2, false, 'barred');
      spiral(800000, 550000, 850000, 135000, 2200, 1.05, -0.55, 1.5, true);
      for (var f = 0; f < 5; f++) {
        var fa = f * TAU / 5;
        for (var k = 0; k < 26; k++) {
          var along = (k / 25 - 0.35) * 16000000;
          var bend = Math.sin(k / 25 * Math.PI * 2 + f) * 1200000;
          var cx = Math.cos(fa) * along + normal() * 280000;
          var cy = Math.sin(fa * 1.7) * along * 0.3 + bend + normal() * 280000;
          var cz = Math.sin(fa) * along + 3200000 + normal() * 380000;
          spiral(cx, cy, cz, 45000 + random() * 90000, 180 + Math.floor(random() * 150), random() * 1.5, random() * TAU, 1.8, random() < 0.32,
            GALAXY_STYLES[(f * 26 + k) % 3]);
        }
      }
      sky(90000000, 1200, 38000);
    }
    return { points: new Float32Array(points), galaxies: galaxies };
  }

  // An analytic emission/dust map, generated locally rather than telescope imagery.
  // The tilted surfaces share the same world-space geometry as the 3D spiral stars.
  // A decreasing radial profile has a nonnegative Abel deprojection. Its
  // oblate projection provides smooth collective light with finite thickness;
  // the authored arm map stays on its existing world-space plane.
  function diskLightProfile(radius) {
    var edge = Math.max(0, 1 - Math.pow(radius / 1.12, 4));
    return Math.exp(-radius * 2.5) * edge * edge;
  }
  function extractDiskLight(data, size, gutter, span) {
    var profiles = new Float64Array(size * size), total = 0, moment = 0;
    for (var y = gutter; y < size - gutter; y++) for (var x = gutter; x < size - gutter; x++) {
      var px = ((x - gutter) / (span - 1) * 2 - 1) * 1.22;
      var pz = ((y - gutter) / (span - 1) * 2 - 1) * 1.22;
      var radius = Math.hypot(px, pz), light = diskLightProfile(radius);
      profiles[y * size + x] = light; total += light; moment += light * radius * radius;
    }
    // The existing non-bulge points have vertical sigma 0.012 R. Match that
    // second moment in this rounded source instead of choosing a display width.
    galaxyDiskAxisRatio = 0.012 / Math.sqrt(moment / (2 * total));
    var tint = [0.53, 0.74, 1];
    for (var tile = 0; tile < 3; tile++) {
      var safe = Infinity, removed = [0, 0, 0];
      for (var row = gutter; row < size - gutter; row++) for (var col = gutter; col < size - gutter; col++) {
        var profile = profiles[row * size + col];
        if (!(profile > 0)) continue;
        var offset = (row * size * 4 + tile * size + col) * 4;
        // The extra byte allows floor quantization while guaranteeing that
        // every actual subtraction remains within the existing RGB byte.
        for (var channel = 0; channel < 3; channel++) safe = Math.min(safe, (data[offset + channel] + 1) / (255 * profile * tint[channel]));
      }
      var amplitude = Math.min(0.012, safe * 0.72);
      for (var r = gutter; r < size - gutter; r++) for (var c = gutter; c < size - gutter; c++) {
        var p = profiles[r * size + c], at = (r * size * 4 + tile * size + c) * 4;
        for (var ch = 0; ch < 3; ch++) {
          var moved = Math.min(data[at + ch], Math.floor(255 * amplitude * p * tint[ch]));
          data[at + ch] -= moved; removed[ch] += moved;
        }
      }
      // Normalize each channel to the light actually removed after byte
      // quantization. This conserves face-on integrated display light.
      for (var component = 0; component < 3; component++) galaxyDiskLight[tile * 3 + component] = removed[component] / (255 * total);
    }
  }
  function galaxyPixels(size) {
    if (size === GALAXY_TILE_SIZE && galaxyAtlasBytes) return galaxyAtlasBytes;
    // Four power-of-two tiles, with black/transparent gutters around each map.
    // UVs address the inner texel centers so linear filtering cannot leak colors
    // between neighboring morphologies. Distant mip levels stay soft and dim.
    var data = new Uint8Array(size * size * 4 * 4);
    var gutter = Math.max(2, Math.round(size / 64)), span = size - gutter * 2;
    var radialBulges=new Float32Array(size*size*4),bulgeScales=[Infinity,Infinity,Infinity,Infinity];
    function write(tile, x, y, rgb, alpha, gain, baseBulge) {
      // Solar's highlight-rolloff principle, adapted to a baked emission map:
      // one common scale preserves hue instead of whitening channels separately.
      // This is display styling, not calibrated photometry or a spectral model.
      var peak = Math.max(rgb[0], rgb[1], rgb[2]);
      var scale = peak > 0 ? (1 - Math.exp(-peak * gain)) / peak : 0;
      var offset = (y * size * 4 + tile * size + x) * 4;
      for (var channel = 0; channel < 3; channel++) data[offset + channel] = Math.round(255 * rgb[channel] * scale);
      data[offset + 3] = Math.round(255 * clamp(baseBulge === undefined ? alpha : 0, 0, 1));
      if (baseBulge !== undefined) {
        radialBulges[offset/4]=baseBulge;
        bulgeScales[tile]=Math.min(bulgeScales[tile],scale);
      }
    }
    GALAXY_STYLES.forEach(function(style, tile) {
      for (var y = gutter; y < size - gutter; y++) for (var x = gutter; x < size - gutter; x++) {
        var px = ((x - gutter) / (span - 1) * 2 - 1) * 1.22;
        var pz = ((y - gutter) / (span - 1) * 2 - 1) * 1.22;
        var r = Math.hypot(px, pz), a = Math.atan2(pz, px);
        if (style === 'elliptical') {
          var er = Math.hypot(px, pz / 0.72);
          var halo = (Math.exp(-er * er * 24) * 0.85 + Math.exp(-er * 4.2) * 0.42) * Math.pow(Math.max(0, 1 - er / 1.18), 0.7);
          write(tile, x, y, [halo, halo * 0.77, halo * 0.49], halo, 1.6);
          continue;
        }
        var grain = emissionNoise(px * 17 + 41, pz * 17 + 73, 0) * 0.55 +
          emissionNoise(px * 43 + 17, pz * 43 + 9, 0) * 0.3 + emissionNoise(px * 103, pz * 103, 0) * 0.15;
        var perturb = Math.sin(a * 3 + r * 13) * 0.075 + (grain - 0.5) * 0.18;
        var phase = a - spiralAngle(style, 0, r) + perturb;
        var width = 0.32 + 0.3 * r, arms, dust;
        if (style === 'barred') {
          var armDistance = 2, dustDistance = 2;
          for (var arm = 0; arm < 4; arm++) {
            var difference = a - spiralAngle(style, arm, r) + perturb;
            armDistance = Math.min(armDistance, Math.abs(Math.sin(difference * 0.5)) * 2);
            dustDistance = Math.min(dustDistance, Math.abs(Math.sin((difference + 0.105) * 0.5)) * 2);
          }
          var openArms = clamp((r - 0.28) / 0.12, 0, 1);
          arms = Math.exp(-Math.pow(armDistance / (0.19 + r * 0.2), 2)) * openArms;
          var bx = px * Math.cos(0.85) + pz * Math.sin(0.85);
          var bz = -px * Math.sin(0.85) + pz * Math.cos(0.85);
          arms += Math.exp(-Math.pow(bz / 0.065, 2) - Math.pow(bx / 0.36, 6)) * 0.88;
          dust = Math.exp(-Math.pow(dustDistance / 0.09, 2)) * openArms;
        } else {
          var frequency = style === 'two-arm' ? 1 : 2;
          arms = Math.exp(-Math.pow(Math.sin(phase * frequency) / width, 2));
          dust = Math.exp(-Math.pow(Math.sin((phase + 0.105) * frequency) / 0.14, 2));
        }
        var edge = Math.pow(Math.max(0, 1 - Math.pow(r / 1.12, 4)), 2);
        var disk = Math.exp(-r * 2.5) * edge;
        dust *= 1 - Math.exp(-r * r * 90);
        var attenuation = 1 - dust * (0.5 + grain * 0.32);
        var structure = (0.09 + arms * (0.35 + grain * 0.85)) * disk * attenuation;
        var bulge = Math.exp(-r * r * 52) * 0.76 + Math.exp(-r * r * 8) * 0.085;
        var baseBulge = bulge;
        var knots = Math.pow(Math.max(0, (grain - 0.58) / 0.42), 2) * arms * disk * 0.65;
        if (style === 'spiral' && r >= 0.18) {
          // Galaxy's nested luminosity ridges and short spurs, baked into the
          // existing four-arm tile. The shared centerline still aligns with
          // the 3D stars. Dim lanes style this map; they do not obscure stars.
          var detailFade = clamp((r - 0.18) / 0.10, 0, 1);
          detailFade = detailFade * detailFade * (3 - 2 * detailFade);
          var rawPhase = a - spiralAngle(style, 0, r);
          var nearestArm = ((Math.round(rawPhase / (Math.PI / 2)) % 4) + 4) % 4;
          var armOffset = Math.atan2(Math.sin(rawPhase * 4), Math.cos(rawPhase * 4)) / 4 + perturb;
          var ridges = 0, spurs = 0, pinkKnots = 0;
          for (var strand = 0; strand < 3; strand++) {
            var ridgeBend = Math.sin(r * (23 + strand * 3) + nearestArm * 1.7 + strand) * 0.018;
            var ridgeOffset = (strand - 1) * (0.077 + r * 0.024) + ridgeBend;
            var ridgeWidth = 0.037 + r * 0.022;
            var breaks = clamp(0.58 + Math.sin(r * (22 + strand * 4) + nearestArm * 1.63 + strand) * 0.28 + (grain - 0.5) * 0.4, 0, 1);
            ridges += Math.exp(-Math.pow((armOffset - ridgeOffset) / ridgeWidth, 2)) * breaks;
          }
          for (var branch = 0; branch < 2; branch++) {
            var spurBase = 0.31 + branch * 0.30 + nearestArm * 0.035;
            var spurLength = 0.075 + ((nearestArm + branch) % 3) * 0.016;
            var spurT = (r - spurBase) / spurLength;
            if (spurT > 0 && spurT < 1) {
              var spurOffset = -0.018 + spurT * (0.15 + branch * 0.025) + Math.sin(spurT * Math.PI) * 0.016;
              spurs += Math.exp(-Math.pow((armOffset - spurOffset) / (0.033 + r * 0.012), 2)) * Math.sin(spurT * Math.PI);
            }
            var knotRadius = 0.29 + branch * 0.31 + nearestArm * 0.045;
            var knotOffset = (branch ? 0.08 : -0.055) + Math.sin(nearestArm * 1.8) * 0.025;
            pinkKnots += Math.exp(-Math.pow((r - knotRadius) / 0.032, 2) - Math.pow((armOffset - knotOffset) / 0.072, 2));
          }
          var outerKnotRadius = 0.82 + nearestArm * 0.022;
          var outerKnotOffset = 0.045 + Math.sin(nearestArm * 1.6) * 0.035;
          pinkKnots += Math.exp(-Math.pow((r - outerKnotRadius) / 0.033, 2) - Math.pow((armOffset - outerKnotOffset) / 0.074, 2)) * 0.80;
          var laneOffset = -0.115 + Math.sin(r * 17 + nearestArm * 1.3) * 0.02;
          var lane = Math.exp(-Math.pow((armOffset - laneOffset) / (0.037 + r * 0.026), 2));
          lane *= 0.62 + 0.38 * Math.sin(r * 14 + nearestArm) * Math.sin(r * 14 + nearestArm);
          var detailedStructure = (0.09 + arms * (0.30 + grain * 0.65) + ridges * 0.38 + spurs * 0.20) * disk * attenuation * (1 - lane * 0.45);
          structure += (detailedStructure - structure) * detailFade;
          // Sparse warm emission is illustrative, rather than a simulation
          // of star formation. Existing common RGB rolloff retains its hue.
          knots += pinkKnots * disk * 0.75 * detailFade;
        }
        if (style === 'two-arm' && r >= 0.18) {
          // Broad, nested ribbons give this slower-winding two-arm map its
          // own shape. Short spurs and warm knots are fixed emission styling;
          // dim lanes do not obscure stars or simulate dust extinction.
          var ribbonFade = clamp((r - 0.18) / 0.12, 0, 1);
          ribbonFade = ribbonFade * ribbonFade * (3 - 2 * ribbonFade);
          var ribbonPhase = a - spiralAngle(style, 0, r);
          var ribbonArm = ((Math.round(ribbonPhase / Math.PI) % 2) + 2) % 2;
          var ribbonOffset = Math.atan2(Math.sin(ribbonPhase * 2), Math.cos(ribbonPhase * 2)) / 2 + perturb;
          var ribbons = 0, feathers = 0, warmKnots = 0;
          for (var ribbon = 0; ribbon < 3; ribbon++) {
            var ribbonBend = Math.sin(r * (14 + ribbon * 2) + ribbonArm * 2.1 + ribbon) * 0.026;
            var ribbonCenter = (ribbon - 1) * (0.13 + r * 0.035) + ribbonBend;
            var ribbonTaper = 1 - clamp((r - 0.55) / 0.5, 0, 1) * 0.28;
            var ribbonWidth = (0.055 + r * 0.025) * ribbonTaper;
            var ribbonBreaks = clamp(0.74 + Math.sin(r * (17 + ribbon * 3) + ribbonArm * 1.9 + ribbon) * 0.18 + (grain - 0.5) * 0.30, 0, 1);
            ribbons += Math.exp(-Math.pow((ribbonOffset - ribbonCenter) / ribbonWidth, 2)) * ribbonBreaks;
          }
          for (var feather = 0; feather < 2; feather++) {
            var featherBase = 0.34 + feather * 0.31 + ribbonArm * 0.05;
            var featherLength = 0.105 + ((ribbonArm + feather) % 2) * 0.024;
            var featherT = (r - featherBase) / featherLength;
            if (featherT > 0 && featherT < 1) {
              var featherOffset = 0.045 + featherT * (0.21 + feather * 0.035) + Math.sin(featherT * Math.PI) * 0.028;
              var featherWidth = (0.047 + r * 0.012) * (1 - featherT * 0.36);
              feathers += Math.exp(-Math.pow((ribbonOffset - featherOffset) / featherWidth, 2)) * Math.sin(featherT * Math.PI);
            }
            var warmRadius = 0.35 + feather * 0.34 + ribbonArm * 0.045;
            var warmOffset = (feather ? 0.11 : -0.075) + Math.sin(ribbonArm * 2.3) * 0.028;
            warmKnots += Math.exp(-Math.pow((r - warmRadius) / 0.040, 2) - Math.pow((ribbonOffset - warmOffset) / 0.095, 2));
          }
          var ribbonLaneOffset = -0.17 + Math.sin(r * 12 + ribbonArm * 1.8) * 0.035;
          var ribbonLane = Math.exp(-Math.pow((ribbonOffset - ribbonLaneOffset) / (0.055 + r * 0.025), 2));
          ribbonLane *= 0.70 + 0.30 * Math.sin(r * 11 + ribbonArm) * Math.sin(r * 11 + ribbonArm);
          var ribbonStructure = (0.09 + arms * (0.31 + grain * 0.63) + ribbons * 0.50 + feathers * 0.24) * disk * attenuation * (1 - ribbonLane * 0.40);
          structure += (ribbonStructure - structure) * ribbonFade;
          // The existing shared RGB rolloff keeps these sparse knots warm.
          knots += warmKnots * disk * 0.85 * ribbonFade;
        }
        if (style === 'barred' && r >= 0.18) {
          // A warm elongated bar feeds the existing split arm centerlines.
          // Paired ridges and curved dim lanes are fixed emission styling;
          // this texture does not model stellar dynamics or dust extinction.
          var barFade = clamp((r - 0.18) / 0.095, 0, 1);
          barFade = barFade * barFade * (3 - 2 * barFade);
          var oldBarBody = Math.exp(-Math.pow(bz / 0.065, 2) - Math.pow(bx / 0.36, 6));
          var warmBarBody = Math.exp(-Math.pow(bz / 0.055, 2) - Math.pow(bx / 0.39, 6));
          var blueBarArms = Math.max(0, arms - oldBarBody * 0.88);
          var barRidges = 0, barLanes = 0, attachmentKnots = 0;
          var splitFade = clamp((r - 0.46) / 0.20, 0, 1);
          splitFade = splitFade * splitFade * (3 - 2 * splitFade);
          for (var barArm = 0; barArm < 4; barArm++) {
            var barDifference = a - spiralAngle(style, barArm, r);
            var barOffset = Math.atan2(Math.sin(barDifference), Math.cos(barDifference)) + perturb;
            var barWeight = barArm < 2 ? 1 : splitFade;
            var pairedRidges = 0;
            for (var barStrand = 0; barStrand < 2; barStrand++) {
              var strandBend = Math.sin(r * (17 + barStrand * 3) + barArm * 1.7 + barStrand) * 0.019;
              var strandCenter = (barStrand ? 0.072 : -0.045) + strandBend;
              var strandWidth = 0.038 + r * 0.029;
              var strandBreaks = clamp(0.68 + Math.sin(r * (20 + barStrand * 3) + barArm * 1.3) * 0.22 + (grain - 0.5) * 0.25, 0, 1);
              pairedRidges += Math.exp(-Math.pow((barOffset - strandCenter) / strandWidth, 2)) * strandBreaks;
            }
            // Maxima keep the emerging fork from doubling its parent's glow.
            barRidges = Math.max(barRidges, pairedRidges * barWeight);
            var curvedLane = -0.12 + Math.sin(r * 13 + barArm * 1.4) * 0.024;
            var laneFeather = 0.68 + 0.32 * Math.sin(r * 10 + barArm) * Math.sin(r * 10 + barArm);
            barLanes = Math.max(barLanes, Math.exp(-Math.pow((barOffset - curvedLane) / (0.037 + r * 0.023), 2)) * laneFeather * barWeight);
            var attachmentRadius = (barArm < 2 ? 0.355 : 0.67) + (barArm % 2) * 0.025;
            var attachmentOffset = barArm < 2 ? 0.025 : 0.065;
            attachmentKnots += Math.exp(-Math.pow((r - attachmentRadius) / 0.031, 2) - Math.pow((barOffset - attachmentOffset) / 0.074, 2)) * barWeight;
          }
          var connectedArms = clamp((r - 0.28) / 0.12, 0, 1);
          connectedArms = connectedArms * connectedArms * (3 - 2 * connectedArms);
          var barStructure = (0.09 + blueBarArms * (0.30 + grain * 0.64) + barRidges * connectedArms * 0.50 + oldBarBody * 0.14) * disk * attenuation * (1 - barLanes * connectedArms * 0.38);
          structure += (barStructure - structure) * barFade;
          // Rebalance the bar toward the existing warm bulge color, with the
          // shared RGB rolloff retaining hue rather than whitening channels.
          bulge += warmBarBody * disk * (0.46 * (0.82 + grain * 0.18)) * barFade;
          knots += attachmentKnots * disk * 0.68 * connectedArms * barFade;
        }
        write(tile, x, y, [bulge + structure * 0.53 + knots, bulge * 0.80 + structure * 0.74 + knots * 0.22, bulge * 0.56 + structure + knots * 0.49],
          Math.min(0.93, bulge + structure * 0.7), 1.85, baseBulge);
      }
    });
    // Use each style's smallest common rolloff for a smooth radial component.
    // This moves only light already present in every disk pixel, leaving its
    // angular brightness correction and elongated bar in the original plane.
    // A disk-dependent scale would imprint rotated spiral curls on the bulge.
    for (var tile=0;tile<4;tile++) {
      if (!isFinite(bulgeScales[tile])) continue;
      for (var y=gutter;y<size-gutter;y++) for (var x=gutter;x<size-gutter;x++) {
        var offset=(y*size*4+tile*size+x)*4;
        var light=radialBulges[offset/4]*bulgeScales[tile],tint=[1,0.80,0.56];
        for (var channel=0;channel<3;channel++) data[offset+channel]=Math.max(0,Math.round(data[offset+channel]-255*light*tint[channel]));
        data[offset+3]=Math.round(255*light);
      }
    }
    extractDiskLight(data, size, gutter, span);
    if (size === GALAXY_TILE_SIZE) galaxyAtlasBytes = data;
    return data;
  }
  function cloudPixels() {
    if (cloudAtlasBytes) return cloudAtlasBytes;
    // Alpha retains the diffuse profile. Red stores broad, bending filaments
    // for resolved nearby emission, sharing the same atlas and texture sample.
    // The shapes are illustrative emission, without extinction or gas motion.
    var size = CLOUD_TILE_SIZE, span = size - CLOUD_GUTTER * 2;
    var data = new Uint8Array(size * size * 4 * 4);
    for (var tile = 0; tile < 4; tile++) {
      var phase = tile * 1.37, seed = 389 + tile * 97;
      for (var y = CLOUD_GUTTER; y < size - CLOUD_GUTTER; y++) for (var x = CLOUD_GUTTER; x < size - CLOUD_GUTTER; x++) {
        var px = (x - CLOUD_GUTTER) / (span - 1) * 2 - 1;
        var py = (y - CLOUD_GUTTER) / (span - 1) * 2 - 1;
        var radius = Math.hypot(px, py);
        var feather = clamp((0.97 - radius) / (0.97 - 0.64), 0, 1);
        feather = feather * feather * (3 - 2 * feather);
        var grain = emissionNoise(px * 4.5 + 13, py * 4.5 + 7, seed) * 0.55 +
          emissionNoise(px * 11 + 3, py * 11 + 19, seed) * 0.3 + emissionNoise(px * 30, py * 30, seed) * 0.15;
        var density = clamp((grain - 0.18) / 0.64, 0, 1);
        var lobes = 0;
        for (var lobe = 0; lobe < 3; lobe++) {
          var angle = phase + lobe * 2.1, reach = 0.22 + lobe * 0.07;
          var lx = px - Math.cos(angle) * reach, ly = py - Math.sin(angle) * reach * 0.72;
          lobes += Math.exp(-(lx * lx * 7 + ly * ly * 11));
        }
        var envelope = Math.exp(-radius * radius * 3.5);
        var light = envelope * (0.58 + 0.42 * density) * (0.68 + 0.32 * Math.min(1, lobes)) * feather;
        var offset = (y * size * 4 + tile * size + x) * 4;
        data[offset] = data[offset + 1] = data[offset + 2] = 255;
        data[offset + 3] = Math.round(255 * light);
      }
      // Inspired by Galaxy's filament strips: bending threads, compact knots,
      // and diffuse light between them. Bake once; broad features survive the
      // 60 CSS-pixel sprite cap and mip filtering as the camera travels.
      var profiles = [], oldTotal = 0, detailTotal = 0;
      for (var dy = CLOUD_GUTTER; dy < size - CLOUD_GUTTER; dy++) for (var dx = CLOUD_GUTTER; dx < size - CLOUD_GUTTER; dx++) {
        var u = (dx - CLOUD_GUTTER) / (span - 1) * 2 - 1;
        var v = (dy - CLOUD_GUTTER) / (span - 1) * 2 - 1;
        var r2 = u * u + v * v;
        var edge = clamp((0.97 - Math.sqrt(r2)) / 0.33, 0, 1);
        edge = edge * edge * (3 - 2 * edge);
        var warp = (emissionNoise(u * 3 + 23, v * 3 + 31, seed) - 0.5) * 0.27;
        var threads = 0, knots = 0;
        for (var thread = 0; thread < 3; thread++) {
          var bend = Math.sin(u * (2.4 + tile * 0.25) + phase + thread * 1.9) * 0.22;
          var center = (thread - 1) * 0.27 + bend + warp;
          var separation = v - center;
          var width = 0.13 + thread * 0.025;
          threads += Math.exp(-Math.pow(separation / width, 2)) * (0.65 + 0.35 * Math.cos(u * 2.8 + thread + phase));
          var along = u - [-0.48, 0.12, 0.56][thread];
          knots += Math.exp(-Math.pow(along / 0.20, 2) - Math.pow(separation / 0.17, 2));
        }
        var coarse = emissionNoise(u * 7 + 3, v * 7 + 19, seed);
        var grain = 0.72 + coarse * 0.22 + emissionNoise(u * 15 + 11, v * 15 + 7, seed) * 0.06;
        var detail = Math.exp(-r2 * 2.8) * edge * (0.26 + threads * 0.72 + knots * 0.38) * grain;
        var index = (dy * size * 4 + tile * size + dx) * 4;
        // Account for the point fragment's outer feather when matching total
        // emission. Soft saturation prevents hard clipped texture peaks.
        var weight = clamp((1 - r2) / (1 - 0.72), 0, 1);
        weight = weight * weight * (3 - 2 * weight);
        var diffuse = data[index + 3] / 255;
        oldTotal += diffuse * weight;
        detailTotal += detail * weight;
        profiles.push({ index: index, weight: weight, detail: detail, diffuse: diffuse });
      }
      function emissionTotal(gain) {
        var total = 0;
        profiles.forEach(function (profile) {
          total += 0.96 * (1 - Math.exp(-profile.detail * gain / 0.96)) * profile.weight;
        });
        return total;
      }
      var low = 0, high = oldTotal / Math.max(0.00001, detailTotal);
      while (emissionTotal(high) < oldTotal) high *= 2;
      for (var iteration = 0; iteration < 24; iteration++) {
        var middle = (low + high) * 0.5;
        if (emissionTotal(middle) < oldTotal) low = middle;
        else high = middle;
      }
      var gain = (low + high) * 0.5;
      profiles.forEach(function (profile) {
        var filament = 0.96 * (1 - Math.exp(-profile.detail * gain / 0.96));
        data[profile.index] = Math.round(255 * (profile.diffuse * 0.35 + filament * 0.65));
      });
    }
    // Green refines the fixed broad red map on enlarged nearby surfaces.
    // These nested threads and knots are static emission styling, without
    // gas dynamics or additional extinction. Red/alpha/blue stay byte-exact.
    for (var fineTile = 0; fineTile < 4; fineTile++) {
      var finePhase = fineTile * 1.37, fineSeed = 389 + fineTile * 97;
      var fineProfiles = [], broadTotal = 0;
      for (var fy = CLOUD_GUTTER; fy < size - CLOUD_GUTTER; fy++) for (var fx = CLOUD_GUTTER; fx < size - CLOUD_GUTTER; fx++) {
        var fu = (fx - CLOUD_GUTTER) / (span - 1) * 2 - 1;
        var fv = (fy - CLOUD_GUTTER) / (span - 1) * 2 - 1;
        var fr2 = fu * fu + fv * fv, fineIndex = (fy * size * 4 + fineTile * size + fx) * 4;
        var broad = data[fineIndex] / 255;
        var fineWarp = (emissionNoise(fu * 3 + 23, fv * 3 + 31, fineSeed) - 0.5) * 0.27;
        var ribbons = 0, smallKnots = 0;
        for (var ft = 0; ft < 3; ft++) {
          var fineCenter = (ft - 1) * 0.27 + Math.sin(fu * (2.4 + fineTile * 0.25) + finePhase + ft * 1.9) * 0.22 + fineWarp;
          for (var branch = 0; branch < 2; branch++) {
            var offset = (branch ? 0.052 : -0.048) + Math.sin(fu * 7 + ft * 1.3 + finePhase + branch) * 0.025;
            var width = 0.048 + ft * 0.006;
            var breaks = 0.68 + 0.32 * Math.sin(fu * 6 + ft + finePhase + branch) * Math.sin(fu * 6 + ft + finePhase + branch);
            ribbons += Math.exp(-Math.pow((fv - fineCenter - offset) / width, 2)) * breaks;
          }
          smallKnots += Math.exp(-Math.pow((fu - [-0.48, 0.12, 0.56][ft]) / 0.095, 2) - Math.pow((fv - fineCenter) / 0.08, 2));
        }
        var fineGrain = 0.85 + 0.15 * emissionNoise(fu * 21 + 11, fv * 21 + 7, fineSeed);
        var profile = broad * (0.54 + 0.9 * ribbons + 0.42 * smallKnots) * fineGrain;
        var weight = clamp((1 - fr2) / (1 - 0.72), 0, 1);weight = weight * weight * (3 - 2 * weight);
        broadTotal += broad * weight;fineProfiles.push({index:fineIndex,profile:profile,weight:weight});
      }
      function fineTotal(gain) {var total=0;fineProfiles.forEach(function(p){total+=0.94*(1-Math.exp(-p.profile*gain/0.94))*p.weight;});return total;}
      var fineLow=0,fineHigh=1;while(fineTotal(fineHigh)<broadTotal)fineHigh*=2;
      for(var fi=0;fi<24;fi++){var fineMiddle=(fineLow+fineHigh)*0.5;if(fineTotal(fineMiddle)<broadTotal)fineLow=fineMiddle;else fineHigh=fineMiddle;}
      var fineGain=(fineLow+fineHigh)*0.5;
      fineProfiles.forEach(function(p){data[p.index+1]=Math.round(255*0.94*(1-Math.exp(-p.profile*fineGain/0.94)));});
    }
    cloudAtlasBytes = data;
    return data;
  }
  // Project a fixed, rounded stellar distribution onto a plane facing the
  // observer. This diffuse-light proxy is an orthographic shape approximation;
  // the individual points retain their world-space depth and perspective.
  function projectedGalaxyView(model, observer, weights, profileMinor) {
    var delta=model.center.map(function(value,i){return value-observer[i];});
    var distance=Math.hypot(delta[0],delta[1],delta[2]);
    if (distance<model.radius*1e-8) return {major:[0,0,0],minor:[0,0,0],gain:0};
    var n=delta.map(function(value){return value/distance;});
    var horizontal=Math.hypot(n[0],n[2]);
    var right=horizontal>1e-8?[n[2]/horizontal,0,-n[0]/horizontal]:[1,0,0];
    var up=[n[1]*right[2]-n[2]*right[1],n[2]*right[0]-n[0]*right[2],n[0]*right[1]-n[1]*right[0]];
    var ct=Math.cos(model.tilt),st=Math.sin(model.tilt),cr=Math.cos(model.turn),sr=Math.sin(model.turn);
    var axes=[[cr,sr,0],[-ct*sr,ct*cr,st],[st*sr,-st*cr,ct]];
    var rr=0,uu=0,ru=0;
    axes.forEach(function(axis,i){
      var r=axis[0]*right[0]+axis[1]*right[1]+axis[2]*right[2];
      var u=axis[0]*up[0]+axis[1]*up[1]+axis[2]*up[2];
      rr+=weights[i]*r*r;uu+=weights[i]*u*u;ru+=weights[i]*r*u;
    });
    var spread=Math.hypot(rr-uu,2*ru),angle=0.5*Math.atan2(2*ru,rr-uu);
    var ca=Math.cos(angle),sa=Math.sin(angle);
    var major=model.radius*Math.sqrt(Math.max(0,(rr+uu+spread)*0.5));
    var minor=model.radius*Math.sqrt(Math.max(0,(rr+uu-spread)*0.5))/profileMinor;
    return {major:right.map(function(value,i){return major*(value*ca+up[i]*sa);}),
      minor:right.map(function(value,i){return minor*(-value*sa+up[i]*ca);}),
      gain:major>0&&minor>0?model.radius*model.radius/(major*minor):0};
  }
  function ellipticalView(model, observer) {
    // Preserve the elliptical atlas's existing 0.72 minor-axis profile and
    // the point population's relative spreads near (1, 0.70, 0.72).
    var shape=projectedGalaxyView(model,observer,[1,0.49,0.5184],0.72);
    return {major:shape.major,minor:shape.minor};
  }
  function spiralBulgeView(model, observer) {
    // The existing point bulge has x/z variance 0.135^2 / 2 and y variance
    // 0.065^2. Its projected area gain is naturally bounded near 1..1.47.
    var shape=projectedGalaxyView(model,observer,[1,2*Math.pow(0.065/0.135,2),1],1);
    // Fade this exterior-view proxy inside the core; resolved stars retain
    // their actual depth. A full volume integration would be needed here.
    var range=Math.hypot.apply(Math,model.center.map(function(value,i){return value-observer[i];}))/model.radius;
    var fade=clamp((range-0.05)/0.30,0,1);
    shape.gain*=fade*fade*(3-2*fade);
    return shape;
  }
  function spiralDiskView(model, observer) {
    var q = galaxyDiskAxisRatio;
    var shape = projectedGalaxyView(model, observer, [1, q * q, 1], 1);
    // Area compensation is bounded by the source's finite axial ratio.
    shape.gain = clamp(shape.gain, 0, 1 / q);
    // This is an exterior orthographic emission proxy. Fade before entering
    // the disk; the existing points retain their actual depth and perspective.
    var range = Math.hypot.apply(Math, model.center.map(function(value, i) { return value - observer[i]; })) / model.radius;
    var fade = clamp((range - 0.6) / 1.4, 0, 1);
    shape.gain *= fade * fade * (3 - 2 * fade);
    return shape;
  }
  function writeProjectedSurface(values, range, observer) {
    var shape=range.disk?spiralDiskView(range.model,observer):range.bulge?spiralBulgeView(range.model,observer):ellipticalView(range.model,observer);
    var offset=range.offset,segments=8;
    function vertex(u,v) {
      var x=(u*2-1)*1.22,z=(v*2-1)*1.22;
      for(var axis=0;axis<3;axis++) values[offset+axis]=range.model.center[axis]+x*shape.major[axis]+z*shape.minor[axis];
      values[offset+5]=range.disk?-1-shape.gain:range.bulge?1+shape.gain:0;
      offset+=6;
    }
    for(var j=0;j<segments;j++)for(var k=0;k<segments;k++) {
      var u=k/segments,v=j/segments,u1=(k+1)/segments,v1=(j+1)/segments;
      vertex(u,v);vertex(u1,v);vertex(u1,v1);vertex(u,v);vertex(u1,v1);vertex(u,v1);
    }
  }
  function writeEllipticalSurface(values, range, observer) {
    writeProjectedSurface(values,range,observer);
  }
  // The authored flat spiral map is an exterior illustration. Inside its
  // luminous footprint, hand it off to the actual 3D records within 1–4
  // generated diffuse-disk height sigmas. This is not dust transfer or a
  // conserved-light model. Outside that small envelope, the marker stays zero.
  function spiralPlaneMarker(model, observer) {
    var dx=(observer[0]-model.center[0])/model.radius;
    var dy=(observer[1]-model.center[1])/model.radius;
    var dz=(observer[2]-model.center[2])/model.radius;
    var x=dx*Math.cos(model.turn)+dy*Math.sin(model.turn);
    var y=-dx*Math.sin(model.turn)+dy*Math.cos(model.turn);
    var height=Math.abs(y*Math.cos(model.tilt)+dz*Math.sin(model.tilt));
    var z=-y*Math.sin(model.tilt)+dz*Math.cos(model.tilt);
    var radial=clamp((Math.hypot(x,z)-1.12)/0.10,0,1);
    var vertical=clamp((height-0.012)/0.036,0,1);
    var interior=1-radial*radial*(3-2*radial);
    var within=1-vertical*vertical*(3-2*vertical);
    return Math.fround(0.5*interior*within);
  }
  function writeSpiralPlane(values, range, observer) {
    var marker=spiralPlaneMarker(range.model,observer);
    if (marker===range.marker) return false;
    for (var offset=range.offset+5;offset<range.offset+range.count;offset+=6) values[offset]=marker;
    range.marker=marker;
    return true;
  }
  function galaxyGeometry(models) {
    if (!galaxyAtlasBytes) galaxyPixels(GALAXY_TILE_SIZE);
    var values=[],segments=8,ellipticals=[],bulges=[],disks=[],planes=[];
    models.forEach(function(model){
      if(model.elliptical) ellipticals.push({model:model,offset:values.length,count:segments*segments*6*6});
      else planes.push({model:model,offset:values.length,count:segments*segments*6*6,marker:0});
      var tile = Math.max(0, GALAXY_STYLES.indexOf(model.style || (model.elliptical ? 'elliptical' : 'spiral')));
      var first = GALAXY_GUTTER + 0.5, span = GALAXY_TILE_SIZE - GALAXY_GUTTER * 2 - 1;
      function vertex(u,v){
        var x=(u*2-1)*model.radius*1.22,z=(v*2-1)*model.radius*1.22;
        var ty=-z*Math.sin(model.tilt),tz=z*Math.cos(model.tilt);
        values.push(model.center[0]+x*Math.cos(model.turn)-ty*Math.sin(model.turn),model.center[1]+x*Math.sin(model.turn)+ty*Math.cos(model.turn),model.center[2]+tz,
          (tile * GALAXY_TILE_SIZE + first + u * span) / (GALAXY_TILE_SIZE * 4), (first + v * span) / GALAXY_TILE_SIZE, 0);
      }
      for(var j=0;j<segments;j++)for(var k=0;k<segments;k++){
        var u=k/segments,v=j/segments,u1=(k+1)/segments,v1=(j+1)/segments;
        vertex(u,v);vertex(u1,v);vertex(u1,v1);vertex(u,v);vertex(u1,v1);vertex(u,v1);
      }
    });
    models.forEach(function(model){
      if(model.elliptical) return;
      var tile=Math.max(0,GALAXY_STYLES.indexOf(model.style||'spiral'));
      var first=GALAXY_GUTTER+0.5,span=GALAXY_TILE_SIZE-GALAXY_GUTTER*2-1;
      bulges.push({model:model,offset:values.length,count:segments*segments*6*6,bulge:true});
      function bulgeVertex(u,v) {
        values.push(model.center[0],model.center[1],model.center[2],
          (tile*GALAXY_TILE_SIZE+first+u*span)/(GALAXY_TILE_SIZE*4),(first+v*span)/GALAXY_TILE_SIZE,1);
      }
      // Match the disk grid so nonlinear aberration and Doppler shift sample
      // the luminous center as well as the distant, dark texture corners.
      for(var j=0;j<segments;j++)for(var k=0;k<segments;k++) {
        var u=k/segments,v=j/segments,u1=(k+1)/segments,v1=(j+1)/segments;
        bulgeVertex(u,v);bulgeVertex(u1,v);bulgeVertex(u1,v1);bulgeVertex(u,v);bulgeVertex(u1,v1);bulgeVertex(u,v1);
      }
    });
    models.forEach(function(model) {
      if (model.elliptical) return;
      var tile=Math.max(0,GALAXY_STYLES.indexOf(model.style||'spiral'));
      var first=GALAXY_GUTTER+0.5,span=GALAXY_TILE_SIZE-GALAXY_GUTTER*2-1;
      disks.push({model:model,offset:values.length,count:segments*segments*6*6,disk:true});
      function diskVertex(u,v) {
        values.push(model.center[0],model.center[1],model.center[2],
          (tile*GALAXY_TILE_SIZE+first+u*span)/(GALAXY_TILE_SIZE*4),(first+v*span)/GALAXY_TILE_SIZE,-1);
      }
      for(var j=0;j<segments;j++)for(var k=0;k<segments;k++) {
        var u=k/segments,v=j/segments,u1=(k+1)/segments,v1=(j+1)/segments;
        diskVertex(u,v);diskVertex(u1,v);diskVertex(u1,v1);diskVertex(u,v);diskVertex(u1,v1);diskVertex(u,v1);
      }
    });
    return {points:new Float32Array(values),ellipticals:ellipticals,bulges:bulges,disks:disks,planes:planes};
  }
  var GALAXY_VERTEX = [
    'precision highp float; attribute vec3 a_position; attribute vec2 a_uv;attribute float a_bulge;',
    'uniform vec3 u_position,u_right,u_up,u_forward; uniform float u_lens,u_aspect,u_beta,u_gamma;',
    'varying vec2 v_uv; varying float v_shift,v_bulge;',
    'void main(){ vec3 delta=a_position-u_position; float dist=max(length(delta),0.00001); vec3 n=delta/dist;',
    'float D=u_gamma*(1.0+u_beta*n.z);vec3 p=vec3(n.xy/D,(n.z+u_beta)/(1.0+u_beta*n.z));',
    'vec3 c=vec3(dot(p,u_right),dot(p,u_up),dot(p,u_forward));',
    'gl_Position=vec4(c.x*u_lens/u_aspect,c.y*u_lens,c.z*0.5,c.z)*dist;v_uv=a_uv;v_shift=D;v_bulge=a_bulge;}'
  ].join('\n');
  var GALAXY_FRAGMENT = [
    'precision mediump float;uniform sampler2D u_texture;uniform float u_exposure;uniform vec3 u_diskLight[3];varying vec2 v_uv;varying float v_shift,v_bulge;',
    'void main(){vec4 t=texture2D(u_texture,v_uv);vec3 source;',
    'if(v_bulge<0.0){float tile=floor(v_uv.x*4.0);vec3 light=tile<0.5?u_diskLight[0]:(tile<1.5?u_diskLight[1]:u_diskLight[2]);',
    'vec2 local=(vec2(fract(v_uv.x*4.0),v_uv.y)*512.0-vec2(8.5))/495.0*2.0-1.0;float r=length(local*1.22);float edge=max(0.0,1.0-pow(r/1.12,4.0));',
    'source=light*exp(-r*2.5)*edge*edge*(-v_bulge-1.0);}else{source=v_bulge>=1.0?t.a*vec3(1.0,0.80,0.56)*(v_bulge-1.0):(v_bulge>0.0?t.rgb*(1.0-2.0*v_bulge):t.rgb);}',
    'float s=clamp(log(max(v_shift,0.0001))*0.42,-0.85,0.85);',
    'vec3 tint=s>=0.0?vec3(0.51,0.73,1.0):vec3(1.0,0.35,0.15);vec3 color=mix(source,tint*max(max(source.r,source.g),source.b),abs(s));',
    'float gain=u_exposure*clamp(pow(v_shift,1.5),0.012,4.0);gl_FragColor=vec4(color*gain,v_bulge<0.0?0.0:t.a);}'
  ].join('\n');

  // The vertex path evaluates one finite ray per source center. Point cores,
  // halos and their matching stellar quads therefore share the same column.
  // No ray marching, camera-facing dust layers or animated noise is involved.
  var STELLAR_DUST_SHADER = [
    'float dustPrimitive(float x) { return x*(1.0-x*x*(0.6666666666666667-x*x*0.2)); }',
    'float dustColumn(vec3 ray, float distance, vec3 center, vec3 radii, float density) {',
    '  vec3 origin=(u_position-center)/radii, axis=ray/radii;',
    '  float aa=dot(axis,axis), closest=-dot(origin,axis)/aa;',
    '  vec3 offset=origin+axis*closest;',
    '  float height=1.0-dot(offset,offset);',
    '  if (height<=0.0) return 0.0;',
    '  float halfChord=sqrt(height/aa);',
    '  float start=clamp(-closest/halfChord,-1.0,1.0), end=clamp((distance-closest)/halfChord,-1.0,1.0);',
    '  if (end<=start) return 0.0;',
    '  return max(0.0,density*height*height*halfChord*(dustPrimitive(end)-dustPrimitive(start)));',
    '}',
    'vec3 stellarDust(vec3 ray, float distance) { float depth=0.0;',
    STELLAR_DUST.map(function (cloud) {
      function vector(values) { return 'vec3(' + values.map(function (value) { return value.toFixed(8); }).join(',') + ')'; }
      return 'depth+=dustColumn(ray,distance,' + vector(cloud.position) + ',' + vector(cloud.radii) + ',' + cloud.densityPerLy.toFixed(8) + ');';
    }).join('\n'),
    'return exp(-depth*vec3(' + DUST_RGB.map(function (value) { return value.toFixed(8); }).join(',') + ')); }'
  ].join('\n');
  var VERTEX = [
    'precision highp float;',
    'attribute vec3 a_position; attribute vec3 a_color;',
    'attribute float a_size; attribute float a_light; attribute float a_cloud; attribute vec2 a_corner;',
    'uniform vec3 u_position; uniform vec3 u_right; uniform vec3 u_up; uniform vec3 u_forward;',
    'uniform float u_aspect; uniform float u_height; uniform float u_dpr; uniform float u_beta; uniform float u_gamma; uniform float u_exposure; uniform float u_lens; uniform float u_pointMax;',
    'uniform vec3 u_stellarCenters[3]; uniform float u_stellarCount,u_quadMax; uniform mediump float u_stellarQuad;',
    'uniform mediump float u_cloudQuad; uniform float u_cloudQuadMax;',
    'uniform float u_galacticBand,u_dust;',
    'varying vec3 v_color; varying float v_light; varying float v_cloud; varying vec3 v_cloudProfile;',
    'varying vec4 v_stellarDetail; varying vec2 v_quadCoord; varying vec2 v_cloudRelief;',
    'varying vec3 v_dustTransmission;',
    STELLAR_DUST_SHADER,
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
    '  float isCloud = step(0.5, a_cloud);',
    '  v_dustTransmission = vec3(1.0);',
    '  if (u_dust > 0.5 && isCloud < 0.5 && distance > 0.00001) v_dustTransmission = stellarDust(n,distance);',
    '  float minimumSize = mix(1.65, 1.6, isCloud) * u_dpr;',
    '  float projectedSize = angularSize * u_height * lens / max(camera.z, 0.03);',
    '  float maximumSize = min(mix(120.0, 60.0, isCloud) * u_dpr, u_pointMax);',
    '  gl_PointSize = clamp(projectedSize, min(minimumSize, maximumSize), maximumSize);',
    // Only the three authored nearby stars enter the stellar quad path.
    // Exact Float32 centers keep all other stellar sprites unchanged.
    '  float quadBlend = 0.0;',
    '  if (isCloud < 0.5 && distance > 0.00001 && projectedSize > maximumSize * 0.8) {',
    '    for (int i = 0; i < 3; i++) {',
    '      if (float(i) < u_stellarCount && all(equal(a_position, u_stellarCenters[i]))) quadBlend = smoothstep(maximumSize * 0.8, maximumSize, projectedSize);',
    '    }',
    '  }',
    // The existing 1,000 nearby emission records gain projected surfaces only
    // when their point sprites approach the hardware/display cap. Distant
    // clouds and the unresolved point path keep their existing output.
    '  if (isCloud > 0.5 && a_cloud >= 5.0 && distance > 0.00001 && projectedSize > maximumSize * 0.8) {',
    '    quadBlend = smoothstep(maximumSize * 0.8, maximumSize, projectedSize);',
    '  }',
    // A point whose center leaves the clip volume vanishes as a whole. Its
    // projected quad then carries all the light so a visible rim cannot dim.
    '  if (quadBlend > 0.0 && (abs(gl_Position.x) > gl_Position.w || abs(gl_Position.y) > gl_Position.w)) quadBlend = 1.0;',
    '  float spriteSize = gl_PointSize;',
    '  if (u_stellarQuad > 0.5) {',
    '    spriteSize = clamp(projectedSize, min(minimumSize, maximumSize), max(maximumSize, u_quadMax));',
    '    gl_Position.xy += a_corner * spriteSize / vec2(u_height * u_aspect, u_height) * gl_Position.w;',
    '  }',
    '  if (u_cloudQuad > 0.5) {',
    '    spriteSize = clamp(projectedSize, min(minimumSize, maximumSize), max(maximumSize, u_cloudQuadMax));',
    '    gl_Position.xy += a_corner * spriteSize / vec2(u_height * u_aspect, u_height) * gl_Position.w;',
    '  }',
    // gl_PointCoord runs top to bottom in GLES; match that orientation exactly
    // when the same static surface is drawn through interpolated quad corners.
    '  v_quadCoord = vec2(a_corner.x, -a_corner.y);',
    '  if (camera.z <= 0.001) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 1.0; quadBlend = 0.0; }',
    // Zero-weight cloud quads collapse outside the clip volume, so a distant
    // batch adds vertex work without rasterizing transparent cloud surfaces.
    '  if (u_cloudQuad > 0.5 && quadBlend <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }',
    // Only resolved stars get a surface. The displayed envelope's CSS size
    // keeps the threshold consistent across quality levels and device scales.
    '  float resolved = (1.0 - isCloud) * smoothstep(12.0, 26.0, spriteSize / u_dpr);',
    '  float seed = 0.0;',
    '  if (resolved > 0.0) seed = fract(sin(dot(a_position, vec3(0.173, 0.317, 0.619))) * 137.631);',
    // Cloud sprites never enter the stellar surface branch, so their seed
    // component carries a size-based detail blend without another varying.
    '  float cloudDetail = step(5.0, a_cloud) * smoothstep(12.0, 30.0, (u_cloudQuad > 0.5 ? spriteSize : gl_PointSize) / u_dpr);',
    // Both point and quad contributions use the same projected pixel budget
    // through their handoff. The fade finishes within the local quad's cap.
    '  float detailPixelStep = (isCloud > 0.5 && a_cloud >= 5.0) ? 2.0 / max(1.0, min(projectedSize, 384.0 * u_dpr)) : 2.0 / spriteSize;',
    '  v_stellarDetail = vec4(resolved, mix(seed, cloudDetail, isCloud), detailPixelStep, quadBlend);',
    // A fixed field on the generated distant band: solar-neighborhood views
    // reveal a broad warm concentration, cooler lobes and branching lanes.
    // Lanes reduce emitted light; they do not model dust extinction.
    '  vec3 sourceColor = a_color; float bandGain = 1.0;',
    '  if (u_galacticBand > 0.5 && isCloud > 0.5 && a_size > 600.0 && a_size < 1600.0) {',
    '    float sourceRadius = length(a_position);',
    '    if (sourceRadius > 16000.0 && sourceRadius < 50000.0) {',
    '      vec3 bandSource = vec3(a_position.x,(0.91*a_position.y+0.42*a_position.z)/1.0045,(-0.42*a_position.y+0.91*a_position.z)/1.0045);',
    '      float longitude = atan(bandSource.z,bandSource.x);',
    '      float latitude = atan(bandSource.y,max(length(bandSource.xz),0.00001));',
    '      float warm = smoothstep(0.55,0.985,cos(longitude-1.57079632679))*(1.0-smoothstep(0.05,0.16,abs(latitude-0.01*sin(longitude*2.0))));',
    '      float cool = max(smoothstep(0.78,0.99,cos(longitude-0.68)),smoothstep(0.78,0.99,cos(longitude-2.46)));',
    '      float laneA = 1.0-smoothstep(0.011,0.034,abs(latitude-(0.014*sin(longitude*2.0-0.7)+0.009*sin(longitude*4.0+0.4))));',
    '      float laneB = 1.0-smoothstep(0.012,0.031,abs(latitude-(0.058+0.018*sin(longitude*3.0+0.9))));',
    '      float laneC = 1.0-smoothstep(0.013,0.035,abs(latitude-(-0.056+0.021*sin(longitude*2.0-1.3))));',
    '      float lanes = clamp(1.0-0.57*laneA-0.30*laneB-0.24*laneC,0.30,1.0);',
    '      float broad = 0.5+0.5*cos(longitude*4.0+latitude*17.0+0.5)*sin(longitude*2.0-0.4);',
    '      bandGain = clamp(1.420536728*(0.82+0.78*warm+0.18*cool+0.15*broad)*lanes,0.30,2.30);',
    '      sourceColor = mix(sourceColor,vec3(0.84,0.58,0.36),0.50*warm);',
    '      sourceColor = mix(sourceColor,vec3(0.37,0.52,0.77),0.35*cool*(1.0-0.7*warm));',
    '    }',
    '  }',
    '  float shift = clamp(log(max(D, 0.0001)) * 0.42, -0.85, 0.85);',
    '  vec3 tint = shift >= 0.0 ? vec3(0.51, 0.73, 1.0) : vec3(1.0, 0.35, 0.15);',
    '  v_color = mix(sourceColor, tint, abs(shift));',
    // Extinguish scene-frame stellar RGB before illustrative Doppler recoloring.
    // Its synthetic tint must dim too; it is not newly emitted foreground light.
    '  if (any(lessThan(v_dustTransmission,vec3(1.0)))) {',
    '    float transmittedPeak = max(max(v_dustTransmission.r,v_dustTransmission.g),v_dustTransmission.b);',
    '    v_color = mix(sourceColor*v_dustTransmission,tint*transmittedPeak,abs(shift));',
    '  }',
    // RGB and tone mapping are deliberate visual approximations, not a spectral camera.
    '  float exposure = clamp(pow(D, 1.5), 0.012, 4.0);',
    // Subpixel clouds fade with projected area instead of becoming a bright
    // minimum-size dot. The diffuse surface carries their collective light.
    '  float coverage = min(1.0, pow(projectedSize / minimumSize, 2.0));',
    '  v_light = a_light * bandGain * u_exposure * exposure * mix(1.0, coverage, isCloud) * mix(1.0 - quadBlend, quadBlend, max(u_stellarQuad, u_cloudQuad));',
    // Nearby generated wisps fade through the observer instead of filling the
    // view with a capped billboard. This is an emission approximation.
    '  if (a_cloud >= 5.0) v_light *= smoothstep(0.35, 2.8, distance / max(a_size, 0.00001));',
    '  v_cloudRelief = vec2(dot(n,normalize(vec3(0.83,0.21,0.51))),dot(n,normalize(vec3(-0.31,0.93,0.20)))) * 0.16;',
    '  v_cloud = isCloud;',
    '  float rotation = fract(a_cloud) * 6.28318530718;',
    '  v_cloudProfile = vec3(mod(max(0.0, floor(a_cloud) - 1.0), 4.0), cos(rotation), sin(rotation));',
    '}'
  ].join('\n');
  var FRAGMENT = [
    'precision mediump float;',
    'uniform sampler2D u_cloudTexture; uniform mediump float u_stellarQuad,u_cloudQuad;',
    // Fragment-only frames avoid sharing camera uniforms at a different precision.
    'uniform vec3 u_stellarRight,u_stellarUp,u_stellarToward; uniform float u_stellarStructure,u_stellarLoops;',
    'varying vec3 v_color; varying float v_light; varying float v_cloud; varying vec3 v_cloudProfile;',
    'varying vec4 v_stellarDetail; varying vec2 v_quadCoord; varying vec2 v_cloudRelief;',
    'varying vec3 v_dustTransmission;',
    'float stellarHash(vec2 cell, float seed) { return fract(sin(dot(cell, vec2(12.9898, 78.233)) + seed * 6.28318530718) * 127.1); }',
    'float stellarNoise(vec2 point, float seed) {',
    '  vec2 cell = floor(point), f = fract(point); f = f * f * (3.0 - 2.0 * f);',
    '  float a = stellarHash(cell, seed), b = stellarHash(cell + vec2(1.0, 0.0), seed);',
    '  float c = stellarHash(cell + vec2(0.0, 1.0), seed), d = stellarHash(cell + vec2(1.0, 1.0), seed);',
    '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
    '}',
    // A seamless, fixed field on the source sphere: a camera orbit reveals
    // another side instead of rotating a screen-space decal.
    'float stellarHash3(vec3 cell, float seed) { return fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719)) + seed * 6.28318530718) * 127.1); }',
    'float stellarNoise3(vec3 point, float seed) {',
    '  vec3 cell = floor(point), f = fract(point); f = f * f * (3.0 - 2.0 * f);',
    '  float a = mix(stellarHash3(cell,seed),stellarHash3(cell+vec3(1.0,0.0,0.0),seed),f.x);',
    '  float b = mix(stellarHash3(cell+vec3(0.0,1.0,0.0),seed),stellarHash3(cell+vec3(1.0,1.0,0.0),seed),f.x);',
    '  float c = mix(stellarHash3(cell+vec3(0.0,0.0,1.0),seed),stellarHash3(cell+vec3(1.0,0.0,1.0),seed),f.x);',
    '  float d = mix(stellarHash3(cell+vec3(0.0,1.0,1.0),seed),stellarHash3(cell+vec3(1.0,1.0,1.0),seed),f.x);',
    '  return mix(mix(a,b,f.y),mix(c,d,f.y),f.z);',
    '}',
    // Two short, source-fixed curves approximate a prominence shape. These
    // are static appearance studies, not magnetic-field or gas simulations.
    'float stellarArch(vec2 p,vec3 anchor,vec3 tangent,float width,float height,float cover) {',
    '  float base = sqrt(1.0-width*width), glow = 0.0;',
    '  vec3 previous = anchor*base+tangent*width;',
    '  vec2 a = vec2(dot(previous,u_stellarRight),-dot(previous,u_stellarUp))*0.35;',
    '  float tube = max(0.0035,v_stellarDetail.z*0.85);',
    '  float impact2 = dot(p,p)/0.1225;',
    '  float front = sqrt(max(0.0,1.0-impact2));',
    '  for (int i=1;i<=16;i++) {',
    '    float angle = float(i)*0.19634954085;',
    '    vec3 current = anchor*(base+height*sin(angle))+tangent*(width*cos(angle));',
    '    vec2 b = vec2(dot(current,u_stellarRight),-dot(current,u_stellarUp))*0.35;',
    '    vec2 segment = b-a;',
    '    float t = clamp(dot(p-a,segment)/max(dot(segment,segment),0.000001),0.0,1.0);',
    '    float separation = length(p-mix(a,b,t));',
    '    if (separation < tube*5.0) {',
    '      float depth = dot(mix(previous,current,t),u_stellarToward);',
    // Match the photosphere's pixel coverage: its uncovered fraction can
    // reveal a far-side arch, while foreground arches retain their emission.
    '      float visible = mix(1.0,smoothstep(front-0.012,front+0.012,depth),cover);',
    '      float emission = 0.10*(1.0-smoothstep(tube*0.5,tube*2.0,separation))+0.025*exp(-separation*separation/(tube*tube*12.0));',
    '      glow = max(glow,emission*visible);',
    '    }',
    '    previous = current; a = b;',
    '  }',
    '  return glow;',
    '}',
    'void main() {',
    '  vec2 p = max(u_stellarQuad, u_cloudQuad) > 0.5 ? v_quadCoord : gl_PointCoord * 2.0 - 1.0;',
    '  float radius2 = dot(p,p);',
    '  if (radius2 > 1.0) discard;',
    '  float star = exp(-radius2 * 17.0) * 1.45 + exp(-radius2 * 3.5) * 0.18;',
    '  float cloud = 0.0;',
    '  if (v_cloud > 0.5) {',
    '    vec2 q = vec2(p.x * v_cloudProfile.y - p.y * v_cloudProfile.z, p.x * v_cloudProfile.z + p.y * v_cloudProfile.y);',
    '    vec2 uv = (q * 0.5 + 0.5) * 111.0 + 8.5;',
    '    uv.x += v_cloudProfile.x * 128.0;',
    '    vec4 emission = texture2D(u_cloudTexture, uv / vec2(512.0, 128.0));',
    '    float detail = emission.r, fineEmission = emission.g;',
    // Two bounded emission layers separate with observer direction. They use
    // the same fixed atlas; looking around or pausing adds no texture motion.
    '    if (v_stellarDetail.y > 0.0) {',
    '      vec2 offset = v_cloudRelief * 55.5;',
    '      vec2 cell = vec2(v_cloudProfile.x * 128.0, 0.0);',
    '      vec2 front = clamp(uv-cell+offset,vec2(0.5),vec2(127.5))+cell;',
    '      vec2 back = clamp(uv-cell-offset*0.7,vec2(0.5),vec2(127.5))+cell;',
    '      vec4 frontEmission = texture2D(u_cloudTexture,front/vec2(512.0,128.0));',
    '      vec4 backEmission = texture2D(u_cloudTexture,back/vec2(512.0,128.0));',
    '      detail = mix(detail,frontEmission.r*0.6+backEmission.r*0.4,0.75);',
    '      fineEmission = mix(fineEmission,frontEmission.g*0.6+backEmission.g*0.4,0.75);',
    '    }',
    // Keep unresolved output exact. Fine threads need enough physical pixels
    // to sample; the static atlas uses the existing direction-layer offsets.
    '    float fineBlend = 0.55 * smoothstep(96.0,192.0,2.0/v_stellarDetail.z) * v_stellarDetail.y;',
    '    detail = mix(detail,fineEmission,fineBlend);',
    '    cloud = mix(emission.a, detail, v_stellarDetail.y) * 0.55;',
    '  }',
    '  float light = mix(star, cloud, v_cloud) * v_light * (1.0 - smoothstep(0.72, 1.0, radius2));',
    // Clouds share the emission path; unresolved stars keep their original light.
    '  if (v_stellarDetail.x <= 0.0) { gl_FragColor = vec4(v_color * light, u_stellarQuad > 0.5 ? 0.0 : light); return; }',
    // Solar's granular photosphere and gentle limb darkening, adapted to an
    // illustrative stellar sprite. Source-position seeds remain still on pause;
    // neither gas motion nor a changing photosphere is simulated here.
    '  float radius = sqrt(radius2);',
    '  float edge = v_stellarDetail.z;',
    '  float disk = 1.0 - smoothstep(0.35 - edge, 0.35 + edge, radius);',
    '  float mu = sqrt(max(0.0, 1.0 - radius2 / 0.1225));',
    '  vec2 surface = p / 0.35;',
    '  float phase = v_stellarDetail.y * 6.28318530718;',
    // Fade small cells until the sprite has enough physical pixels to sample
    // them, so zooming and traveling do not turn surface detail into sparkle.
    '  float surfacePixels = 2.0 / edge;',
    '  float diskPixels = surfacePixels * 0.35;',
    '  float fineDetail = smoothstep(28.0, 48.0, diskPixels);',
    '  float broadDetail = smoothstep(14.0, 30.0, diskPixels);',
    '  float cells = 1.0;',
    '  if (broadDetail > 0.0) cells += 0.018 * broadDetail * (stellarNoise(surface * 4.5, v_stellarDetail.y) * 2.0 - 1.0);',
    '  if (fineDetail > 0.0) cells += 0.009 * fineDetail * (stellarNoise(surface * 9.0, v_stellarDetail.y + 0.37) * 2.0 - 1.0);',
    // Large named surfaces gain fixed 3D granules and localized dark regions.
    // Fade after the point/quad handoff; small unresolved output stays exact.
    '  if (u_stellarStructure > 0.0 && disk > 0.0) {',
    '    vec3 body = u_stellarRight*surface.x-u_stellarUp*surface.y+u_stellarToward*mu;',
    '    body = normalize(body);',
    '    vec3 spotA = normalize(vec3(cos(phase+1.1),sin(phase*0.7+0.4)*0.65,sin(phase+1.1)));',
    '    vec3 spotB = normalize(vec3(cos(phase+3.0),-0.35,sin(phase+3.0)));',
    '    float patchA = dot(body,spotA), patchB = dot(body,spotB);',
    '    float coarse = stellarNoise3(body*3.2,v_stellarDetail.y);',
    // The sphere compresses source detail toward the limb. Resolve fine cells
    // from the least sampled direction's physical pixel budget, without a
    // derivative extension or a division at the antialiased edge.
    '    float granuleDetail = smoothstep(48.0,96.0,diskPixels*mu);',
    '    float granules = 0.5;',
    '    if (granuleDetail > 0.0) granules = stellarNoise3(body*16.0,v_stellarDetail.y+0.37);',
    '    float structure = 1.0+0.085*granuleDetail*(granules*2.0-1.0)+0.028*(coarse*2.0-1.0);',
    '    structure -= 0.21*smoothstep(0.88,0.988,patchA)+0.13*smoothstep(0.90,0.992,patchB);',
    '    structure += 0.045*(smoothstep(0.79,0.90,patchA)-smoothstep(0.90,0.98,patchA));',
    '    cells = mix(cells,structure,u_stellarStructure);',
    '  }',
    // A lower surface peak spreads roughly the old Gaussian's integrated light
    // over the disk, retaining color instead of producing a white glare patch.
    '  float photosphere = disk * 1.08 * (0.6 + 0.4 * mu) * cells;',
    '  float corona = 0.0;',
    '  if (disk < 1.0) {',
    '    float angle = atan(p.y, p.x);',
    '    corona = (1.0 - disk) * 0.16 * exp(-max(0.0, radius - 0.35) * 6.0) * (0.88 + 0.12 * cos(angle * 6.0 + phase));',
    '  }',
    '  float arches = 0.0;',
    // Detail stays near the limb; the closest curve depth is compared with
    // the front photosphere, so far-side segments cannot shine through it.
    '  if (u_stellarLoops > 0.0 && radius > 0.25 && radius < 0.52) {',
    '    vec3 anchorA = normalize(vec3(cos(phase+1.1),sin(phase*0.7+0.4)*0.65,sin(phase+1.1)));',
    '    vec3 anchorB = normalize(vec3(cos(phase+3.0),-0.35,sin(phase+3.0)));',
    '    vec3 tangentA = normalize(cross(anchorA,vec3(0.0,1.0,0.0)));',
    '    vec3 tangentB = normalize(cross(anchorB,vec3(0.0,1.0,0.0)));',
    '    arches = u_stellarLoops*smoothstep(0.25,0.28,radius)*(stellarArch(p,anchorA,tangentA,0.22,0.24,disk)+stellarArch(p,anchorB,tangentB,0.19,0.29,disk));',
    '  }',
    '  float feather = 1.0 - smoothstep(0.72, 1.0, radius2);',
    // The corona's pale accent and warm arches traverse the same dust as the
    // stellar core. The quad's opaque surface mask is geometry, not starlight.
    '  vec3 resolvedColor = (v_color * photosphere + mix(v_color, v_dustTransmission, 0.08) * corona + mix(v_color,vec3(1.0,0.64,0.43)*v_dustTransmission,0.16)*arches) * v_light * feather;',
    '  float resolvedLight = (photosphere + corona + arches) * v_light * feather;',
    '  vec3 color = mix(v_color * light, resolvedColor, v_stellarDetail.x);',
    '  float alpha = mix(light, resolvedLight, v_stellarDetail.x);',
    // Only enlarged stellar disks obscure background light. Compensate their
    // complementary point contribution during the handoff; the corona keeps
    // additive emission outside the disk. Distant point output stays intact.
    '  if (u_stellarQuad > 0.5) {',
    '    float mask = disk * v_stellarDetail.x;',
    '    color *= 1.0 + mask * (1.0 - v_stellarDetail.w);',
    '    alpha = mask * v_stellarDetail.w;',
    '  }',
    '  gl_FragColor = vec4(color, alpha);',
    '}'
  ].join('\n');

  function create(canvas, options) {
    options = options || {};
    var settings = { mode: 'explore', region: 'neighborhood', speed: 2, beta: 0.9, timeScale: 1, running: false, compareRest: false, dust: true, fov: 70, exposure: 1, quality: 'auto', orbitRate: 3, orbitDirection: 1, orbitTilt: 0, smoothTravel: false, flybyRate: 1, pauseAtHighlights: false };
    var state, gl, program, buffer, pointCount = 0, uniforms = {}, disposed = false, lost = false;
    var galaxyProgram, galaxyBuffer, galaxyTexture, cloudTexture, galaxyCount = 0, galaxyUniforms = {};
    var galaxyFilterQueried = false, galaxyFilterExtension = null, galaxyFilterMaximum = 1, galaxyFilterApplied = 1;
    var galaxySurfaces = null, galaxyObserver = null;
    var stellarRecords = [], stellarCenters = new Float32Array(9), cornerAttribute, stellarQuadFirst = 0;
    var cloudQuadByteOffset = 0, cloudQuadCount = 0;
    var pointAttributes = [], galaxyAttributes = [];
    var pointMax = 512;
    var raf = 0, lastFrame = 0, lastTelemetry = -Infinity, inView = true;
    var resizeObserver, intersectionObserver, shaders = [];
    var targetId = null, navigation = { active: false, targetId: null };
    var orbitId = null, orbitPath = null;
    var flyby = { active:false, completed:false, id:null, elapsedSeconds:0, autoLook:false };
    var flybyPace = 0, easedLeg = null;
    var flybyDetour = null;
    var distanceGlide = { active:false, completed:false, targetId:null, direction:null, elapsedSeconds:0, durationSeconds:3 };
    function clearDistanceGlide() { distanceGlide = { active:false, completed:false, targetId:null, direction:null, elapsedSeconds:0, durationSeconds:3 }; }
    function endDistanceGlide(message) {
      if (!distanceGlide.active) { clearDistanceGlide(); return false; }
      clearDistanceGlide();
      pauseWithMessage(message || 'Camera glide ended at this view. Travel is paused.'); requestDraw();
      return true;
    }
    function distanceGlideTelemetry() {
      return { active:distanceGlide.active, completed:distanceGlide.completed, targetId:distanceGlide.targetId, direction:distanceGlide.direction,
        progress:distanceGlide.elapsedSeconds/distanceGlide.durationSeconds, elapsedSeconds:distanceGlide.elapsedSeconds, durationSeconds:distanceGlide.durationSeconds,
        startRangeLy:distanceGlide.startRangeLy || 0, endRangeLy:distanceGlide.endRangeLy || 0 };
    }
    var viewpointGlide = { active:false, completed:false, targetId:null, direction:null, elapsedSeconds:0, durationSeconds:3 };
    function clearViewpointGlide() { viewpointGlide = { active:false, completed:false, targetId:null, direction:null, elapsedSeconds:0, durationSeconds:3 }; }
    function clearInspectionGlides() { clearDistanceGlide(); clearViewpointGlide(); }
    function endViewpointGlide(message) {
      if (!viewpointGlide.active) { clearViewpointGlide(); return false; }
      clearViewpointGlide();
      pauseWithMessage(message || 'Viewpoint glide ended at this view. Travel is paused.'); requestDraw();
      return true;
    }
    function endInspectionGlides(message) {
      var active = distanceGlide.active || viewpointGlide.active;
      clearInspectionGlides();
      if (!active) return false;
      pauseWithMessage(message || 'Camera glide ended at this view. Travel is paused.'); requestDraw();
      return true;
    }
    function viewpointGlideTelemetry() {
      return { active:viewpointGlide.active, completed:viewpointGlide.completed, targetId:viewpointGlide.targetId, direction:viewpointGlide.direction,
        progress:viewpointGlide.elapsedSeconds/viewpointGlide.durationSeconds, elapsedSeconds:viewpointGlide.elapsedSeconds, durationSeconds:viewpointGlide.durationSeconds,
        rangeLy:viewpointGlide.rangeLy || 0, distanceLy:viewpointGlide.distanceLy || 0 };
    }
    function clearFlyby() { flyby = { active:false, completed:false, id:null, elapsedSeconds:0, autoLook:false }; flybyPace = 0; easedLeg = null; clearInspectionGlides(); }
    function endFlyby(message) {
      if (!flyby.active) return false;
      clearFlyby();
      pauseWithMessage(message || 'Flyby canceled. Travel is paused.'); requestDraw();
      return true;
    }
    function manualFlybyLook() { if (flyby.active) flyby.autoLook = false; }
    function seekFlybyMoment(seconds, highlight) {
      var route=flybyRoute(flyby.id);
      if (disposed || lost || !gl || !program || settings.mode!=='explore' || !route || settings.region!==route.region || (!flyby.active&&!flyby.completed)) return false;
      if (!Number.isFinite(seconds) || seconds<0 || seconds>route.durationSeconds) return false;
      var completed=seconds===route.durationSeconds;
      var nearest=route.highlights.reduce(function(best,item){return Math.abs(item.seconds-seconds)<Math.abs(best.seconds-seconds)?item:best;},route.highlights[0]);
      var destination=getLandmark(highlight?highlight.targetId:completed?route.completionTargetId:seconds===0?route.targetId:nearest.targetId);
      if (!destination) return false;
      var sample=route.atTime(seconds);
      if (!sample.position.every(Number.isFinite) || !Number.isFinite(sample.yaw) || !Number.isFinite(sample.pitch) || !Number.isFinite(sample.distance)) return false;
      // Seeking is a paused camera jump along the authored route. Its route
      // distance replaces the old progress; physical clocks do not advance.
      cancelFrame(); clearInspectionGlides();
      state={position:sample.position.slice(),yaw:sample.yaw,pitch:sample.pitch,distanceLy:sample.distance,universeYears:0,travelerYears:0};
      flyby={active:!completed,completed:completed,id:route.id,elapsedSeconds:seconds,autoLook:true}; flybyPace=0; easedLeg=null;
      targetId=destination.id; navigation={active:false,targetId:null}; orbitId=null;orbitPath=null;
      trail=[]; cameraMoves=[]; clearFraming();
      var detail={kind:highlight?'flyby-highlight':'flyby-moment',routeId:route.id,routeName:route.name,seconds:seconds,position:state.position.slice(),targetId:targetId,targetName:destination.name};
      if (highlight) { detail.highlightId=highlight.id; detail.highlightName=highlight.name; }
      pauseWithMessage((highlight?highlight.name:route.name+' · '+seconds.toFixed(1)+' seconds')+'. Travel is paused; '+(completed?'revisit a route moment or replay the flyby.':'start travel to continue from this route moment.'),detail);
      requestDraw(); return true;
    }
    function nextFlybyLeg(depart) {
      var route=flybyRoute(flyby.id);
      if(!route||!flyby.active)return null;
      var next=route.highlights.filter(function(item){return item.seconds>flyby.elapsedSeconds;})[0];
      return flybyLeg(flyby.elapsedSeconds,next?next.seconds:route.durationSeconds,depart);
    }
    function flybyTelemetry() {
      var route = flybyRoute(flyby.id);
      var sample = route ? route.atTime(flyby.elapsedSeconds) : null;
      return { active:flyby.active, completed:flyby.completed, id:flyby.id, name:route?route.name:null,
        progress:route?flyby.elapsedSeconds/route.durationSeconds:0, elapsedSeconds:flyby.elapsedSeconds,
        durationSeconds:route?route.durationSeconds:0, autoLook:flyby.autoLook, phase:sample?sample.phase:null, rate:settings.flybyRate, pauseAtHighlights:settings.pauseAtHighlights,
        remainingPlaybackSeconds:settings.pauseAtHighlights&&flyby.active?((easedLeg||nextFlybyLeg(!settings.running)).duration-(easedLeg?easedLeg.clock:0))/settings.flybyRate:null };
    }
    // A detour is a private return point, separate from version-1 saved views.
    // Inspection moves may clear the live route without touching this record.
    function flybyDetourTelemetry() {
      if (!flybyDetour) return { active:false };
      var route=flybyRoute(flybyDetour.flyby.id);
      return { active:true, id:route.id, name:route.name, elapsedSeconds:flybyDetour.flyby.elapsedSeconds,
        durationSeconds:route.durationSeconds, targetId:flybyDetour.targetId };
    }
    function copyCameraMoves(moves) {
      return moves.map(function(move){return {position:move.position.slice(),distanceLy:move.distanceLy,trail:move.trail.map(function(point){return point.slice();})};});
    }
    function beginFlybyDetour() {
      var route=flybyRoute(flyby.id);
      if (disposed || lost || !gl || !program || settings.mode!=='explore' || settings.running || !flyby.active || !route || settings.region!==route.region || flybyDetour) return false;
      flybyDetour={settings:Object.assign({},settings),state:Object.assign({},state,{position:state.position.slice()}),targetId:targetId,
        flyby:Object.assign({},flyby),flybyPace:flybyPace,easedLeg:easedLeg&&Object.assign({},easedLeg),
        trail:trail.map(function(point){return point.slice();}),cameraMoves:copyCameraMoves(cameraMoves),
        frameUndo:frameUndo&&Object.assign({},frameUndo),framePlacement:framePlacement};
      cancelFrame(); clearFlyby(); navigation={active:false,targetId:null}; orbitId=null; orbitPath=null;
      pauseWithMessage('Flyby return point saved. Explore this view, then return to continue the flyby.',
        {kind:'flyby-detour',routeId:route.id,routeName:route.name,seconds:flybyDetour.flyby.elapsedSeconds,targetId:targetId});
      requestDraw(); return true;
    }
    function returnToFlyby() {
      if (disposed || lost || !gl || !program || !flybyDetour || settings.mode!==flybyDetour.settings.mode || settings.region!==flybyDetour.settings.region) return false;
      var saved=flybyDetour, route=flybyRoute(saved.flyby.id);
      flybyDetour=null; cancelFrame(); clearFlyby();
      settings=Object.assign({},saved.settings,{running:false});
      state=Object.assign({},saved.state,{position:saved.state.position.slice()}); targetId=saved.targetId;
      flyby=Object.assign({},saved.flyby); flybyPace=saved.flybyPace; easedLeg=saved.easedLeg&&Object.assign({},saved.easedLeg);
      navigation={active:false,targetId:null}; orbitId=null; orbitPath=null;
      trail=saved.trail.map(function(point){return point.slice();}); cameraMoves=copyCameraMoves(saved.cameraMoves);
      lastFrame=0; freePace=0; resize();
      frameUndo=saved.frameUndo&&Object.assign({},saved.frameUndo); framePlacement=saved.framePlacement;
      // Do not normalize the saved gaze or advance the route during return.
      // Pausing through the generic helper would discard its saved leg state.
      var message='Returned to '+route.name+'. Travel is paused; continue whenever you are ready.';
      emitTelemetry(true); status('ready',message);
      if (typeof options.onPause==='function') options.onPause(message,
        {kind:'flyby-return',routeId:route.id,routeName:route.name,seconds:flyby.elapsedSeconds,targetId:targetId});
      requestDraw(); return true;
    }
    function cancelFlybyDetour() {
      if (disposed || !flybyDetour) return false;
      flybyDetour=null; emitTelemetry(true);
      status('ready','Flyby return point cleared. Continue exploring from this view.');
      return true;
    }
    var freePace = 0;
    var trail = [];
    var cameraMoves = [];
    var frameUndo = null, framePlacement = null;
    function clearFraming() { frameUndo = null; framePlacement = null; }
    function endOrbit(message) {
      if (!orbitId) return false;
      orbitId = null; orbitPath = null;
      pauseWithMessage(message || 'Orbit ended. Travel is paused.'); requestDraw();
      return true;
    }
    function status(value, message) { if (typeof options.onStatus === 'function') options.onStatus({ state: value, message: message }); }
    function getLandmark(id) {
      var list = LANDMARKS[settings.region];
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    }
    function planOrbitView(id, direction, degrees) {
      if(disposed||lost||!gl||!program||settings.mode!=='explore')return null;
      var item=getLandmark(id||targetId);
      return item?orbitView(state.position,item.position,direction,degrees,REGIONS[settings.region].boundary):null;
    }
    function planViewpointGlide(id, direction, degrees) {
      var plan = planOrbitView(id,direction,degrees===undefined?25:degrees);
      if (!plan) return null;
      var item = getLandmark(id||targetId);
      // An instant step can leave the pole immediately. A glide must center
      // its target throughout, including the no-roll camera's launch view.
      return Math.abs(state.position[1]-item.position[1])/plan.radiusLy > Math.cos(0.01) ? null : plan;
    }
    function planDistanceView(id, direction) {
      if(disposed||lost||!gl||!program||settings.mode!=='explore'||!['closer','farther'].includes(direction))return null;
      var item=getLandmark(id||targetId);
      // This floor is an inspection limit in the teaching scene, not a surface.
      return item?rangeView(state.position,item.position,direction==='closer'?.8:1.25,item.arrivalRadiusLy*.1,REGIONS[settings.region].boundary):null;
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
      var coincident = relative.distance === 0;
      var physicalBeta = settings.mode === 'relativity' ? settings.beta : 0;
      var physicalDirection = aberrate(direction, physicalBeta);
      var aspect = canvas.width / Math.max(1, canvas.height);
      var guide = coincident ? null : targetView(direction, state.yaw, state.pitch, displayBeta(), settings.fov, aspect);
      return {
        id: item.id, name: item.name, distanceLy: relative.distance, coincident: coincident,
        guide: guide, screen: guide ? guide.screen : [null, null], inView: !!guide && guide.inView,
        doppler: coincident ? null : doppler(direction[2], physicalBeta),
        restAngleDeg: coincident ? null : Math.acos(clamp(direction[2], -1, 1)) * 180 / Math.PI,
        apparentAngleDeg: coincident ? null : Math.acos(clamp(physicalDirection[2], -1, 1)) * 180 / Math.PI
      };
    }
    function targetFraming(item, u) {
      if (disposed || lost || !gl || !program || !item) return null;
      var relative = toLandmark(item);
      if (!relative.distance) return null;
      return targetFrame(relative.direction, displayBeta(), settings.fov, canvas.width / Math.max(1, canvas.height), u);
    }
    function framingTelemetry() {
      var item = getLandmark(targetId);
      return { canLeft: !!targetFraming(item, 1 / 3), canCenter: !!targetFraming(item, 0.5), canRight: !!targetFraming(item, 2 / 3),
        canUndo: !!frameUndo && !disposed && !lost && !!gl && !!program, placement: framePlacement };
    }
    function navigationTelemetry() {
      var item = getLandmark(navigation.targetId);
      var plan = item ? approachPlan(toLandmark(item).distance,navigation.arrivalRadiusLy||item.arrivalRadiusLy,1,settings.speed) : null;
      return { active:navigation.active, targetId:navigation.targetId, completed:!!navigation.completed, alreadyWithin:!!navigation.alreadyWithin,
        remainingLy:plan?plan.remainingLy:0, arrivalRadiusLy:plan?plan.arrivalRadiusLy:0,
        estimatedSeconds:plan?plan.estimatedSeconds:0,
        progress:navigation.completed?1:plan&&navigation.totalLy>0?clamp(1-plan.remainingLy/navigation.totalLy,0,1):0 };
    }
    function motionTelemetry() {
      var glide = distanceGlide.active ? distanceGlide : viewpointGlide;
      var kind = settings.mode === 'relativity' ? 'relativity' : distanceGlide.active || viewpointGlide.active ? 'glide' : flyby.active ? 'flyby' : orbitId ? 'orbit' : navigation.active ? 'approach' : 'free';
      var target = settings.mode === 'relativity' ? 0 : settings.speed;
      var item = getLandmark(orbitId || navigation.targetId);
      if (kind === 'glide') {
        target = glide.distanceLy * 1.5 / glide.durationSeconds;
      } else if (kind === 'flyby') {
        target = flybyRoute(flyby.id).atTime(flyby.elapsedSeconds).pace * settings.flybyRate;
      } else if (kind === 'orbit' && item) {
        target = (orbitPath?orbitPath.radiusLy:Math.hypot(state.position[0] - item.position[0], state.position[2] - item.position[2])) * settings.orbitRate * Math.PI / 180;
      } else if (kind === 'approach' && item) {
        var radius = navigation.arrivalRadiusLy || item.arrivalRadiusLy;
        var remaining = Math.max(0, toLandmark(item).distance - radius);
        target = Math.min(settings.speed, Math.max(radius * 0.5, remaining * 1.2));
      }
      var moving = settings.running && isVisible() && !lost && !disposed && kind !== 'relativity';
      return { smoothTravel: settings.smoothTravel, paceLyPerSecond: moving ? kind === 'glide' ? glide.distanceLy * 6 * (glide.elapsedSeconds / glide.durationSeconds) * (1 - glide.elapsedSeconds / glide.durationSeconds) / glide.durationSeconds : kind === 'flyby' ? flybyPace : kind === 'free' && settings.smoothTravel ? freePace : target : 0, targetLyPerSecond: target, kind: kind };
    }
    function pauseWithMessage(message, detail) {
      settings.running = false; lastFrame = 0; freePace = 0; easedLeg = null;
      emitTelemetry(true); status('ready', message);
      if (typeof options.onPause === 'function') {
        if (detail) options.onPause(message, detail);
        else options.onPause(message);
      }
    }
    function faceTarget(item) {
      var relative = toLandmark(item);
      if (!relative.distance) return;
      var direction = aberrate(relative.direction, displayBeta());
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
        position: state.position.slice(), yaw: state.yaw, pitch: state.pitch, running: settings.running, dust: settings.dust,
        target: targetTelemetry(), navigation: navigationTelemetry(), flyby: flybyTelemetry(), flybyDetour: flybyDetourTelemetry(), distanceGlide: distanceGlideTelemetry(), viewpointGlide: viewpointGlideTelemetry(), orbit: { active: !!orbitId, targetId: orbitId }, motion: motionTelemetry(), framing: framingTelemetry(), trail: trail.map(function(p) { return p.slice(); }), cameraMoves: cameraMoves.length
      });
    }
    function initialState() {
      return { position: REGIONS[settings.region].position.slice(), yaw: 0, pitch: 0, distanceLy: 0, universeYears: 0, travelerYears: 0 };
    }
    state = initialState();
    function isVisible() { return !global.document.hidden && inView; }
    function cancelFrame() { if (raf) global.cancelAnimationFrame(raf); raf = 0; lastFrame = 0; freePace = 0; }
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
      galaxySurfaces = galaxyGeometry(data.galaxies); galaxyObserver = null;
      galaxyCount = galaxySurfaces.points.length / 6; stellarQuadFirst = galaxyCount;
      // Keep the galaxy prefix and the stellar corner quad exact. Append one
      // static six-vertex surface for each authored nearby emission source;
      // its nine source fields stay identical to the canonical point buffer.
      var cloudOffsets = [];
      if (settings.region === 'neighborhood') {
        for (var cloudOffset = 0; cloudOffset < data.points.length; cloudOffset += 9) {
          if (data.points[cloudOffset + 8] >= 5) cloudOffsets.push(cloudOffset);
        }
      }
      cloudQuadCount = cloudOffsets.length * 6;
      cloudQuadByteOffset = (galaxySurfaces.points.length + 36) * 4;
      var surfaces = new Float32Array(galaxySurfaces.points.length + 36 + cloudQuadCount * 11);
      surfaces.set(galaxySurfaces.points);
      surfaces.set([0,0,0,-1,-1,0, 0,0,0,1,-1,0, 0,0,0,1,1,0, 0,0,0,-1,-1,0, 0,0,0,1,1,0, 0,0,0,-1,1,0], galaxySurfaces.points.length);
      var cloudWrite = cloudQuadByteOffset / 4;
      var cloudCorners = [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];
      cloudOffsets.forEach(function(offset) {
        cloudCorners.forEach(function(corner) {
          surfaces.set(data.points.subarray(offset, offset + 9), cloudWrite);
          surfaces[cloudWrite + 9] = corner[0]; surfaces[cloudWrite + 10] = corner[1];
          cloudWrite += 11;
        });
      });
      galaxySurfaces.points = surfaces;
      stellarRecords = []; stellarCenters.fill(0);
      if (settings.region === 'neighborhood') {
        LANDMARKS.neighborhood.filter(function(item){return item.id==='amber-star'||item.id==='blue-star'||item.id==='pale-star';}).forEach(function(item){
          var center = item.position.map(Math.fround);
          for (var offset=0; offset<data.points.length; offset+=9) {
            if (data.points[offset+8]===0 && center.every(function(value,i){return value===data.points[offset+i];})) {
              var record = new Float32Array(data.points.subarray(offset,offset+9));
              stellarCenters.set(record.subarray(0,3),stellarRecords.length*3);
              stellarRecords.push(record); break;
            }
          }
        });
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, galaxyBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, galaxySurfaces.points, gl.STATIC_DRAW);
    }
    function updateEllipticals() {
      if (!galaxySurfaces || !galaxySurfaces.ellipticals.length&&!galaxySurfaces.bulges.length&&!galaxySurfaces.disks.length) return;
      if (galaxyObserver && state.position.every(function(value,i){return value===galaxyObserver[i];})) return;
      gl.bindBuffer(gl.ARRAY_BUFFER,galaxyBuffer);
      galaxySurfaces.ellipticals.concat(galaxySurfaces.bulges,galaxySurfaces.disks).forEach(function(range){
        writeProjectedSurface(galaxySurfaces.points,range,state.position);
        gl.bufferSubData(gl.ARRAY_BUFFER,range.offset*4,galaxySurfaces.points.subarray(range.offset,range.offset+range.count));
      });
      galaxySurfaces.planes.forEach(function(range){
        if (writeSpiralPlane(galaxySurfaces.points,range,state.position)) {
          gl.bufferSubData(gl.ARRAY_BUFFER,range.offset*4,galaxySurfaces.points.subarray(range.offset,range.offset+range.count));
        }
      });
      galaxyObserver=state.position.slice();
    }
    function tuneGalaxySampling() {
      if (disposed || lost || !gl || !galaxyTexture) return;
      // Like Galaxy and Solar, bound extra filtering for angled texture views.
      // This optional sampler setting changes neither emission nor geometry.
      try {
        if (!galaxyFilterQueried) {
          galaxyFilterQueried = true;
          var extension = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('MOZ_EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
          if (extension && Number.isFinite(extension.TEXTURE_MAX_ANISOTROPY_EXT) && Number.isFinite(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) {
            var maximum = gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            if (typeof maximum === 'number' && Number.isFinite(maximum) && maximum > 1) { galaxyFilterExtension = extension; galaxyFilterMaximum = Math.min(4, maximum); }
          }
        }
        if (!galaxyFilterExtension) return;
        var level = settings.quality === 'low' ? 1 : galaxyFilterMaximum;
        if (level === galaxyFilterApplied) return;
        // A previous draw can leave the cloud texture bound. Configure only
        // this atlas; every draw restores its own texture-unit bindings.
        gl.bindTexture(gl.TEXTURE_2D, galaxyTexture);
        gl.texParameterf(gl.TEXTURE_2D, galaxyFilterExtension.TEXTURE_MAX_ANISOTROPY_EXT, level);
        galaxyFilterApplied = level;
      } catch (error) { galaxyFilterQueried = true; galaxyFilterExtension = null; }
    }
    function resize() {
      if (disposed) return;
      tuneGalaxySampling();
      var box = canvas.getBoundingClientRect();
      var ratio = pixelRatio();
      var width = Math.max(1, Math.round(box.width * ratio));
      var height = Math.max(1, Math.round(box.height * ratio));
      if (canvas.width / Math.max(1, canvas.height) !== width / height && framePlacement !== 'center') framePlacement = null;
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
      // Attribute indices belong to the current program, but enabled arrays
      // belong to the context. Never leave the small corner array active for
      // the full point population or a galaxy surface draw.
      gl.disableVertexAttribArray(cornerAttribute);
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
        updateEllipticals();
        pointAttributes.forEach(function(a) { gl.disableVertexAttribArray(a[0]); });
        gl.useProgram(galaxyProgram); attributes(galaxyAttributes, galaxyBuffer, 24); camera(galaxyUniforms);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, galaxyTexture);
        gl.uniform1i(galaxyUniforms.texture, 0);
        gl.uniform3fv(galaxyUniforms.diskLight, galaxyDiskLight);
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
      gl.uniform1f(uniforms.pointMax, pointMax);
      gl.uniform1f(uniforms.galacticBand, settings.region === 'neighborhood' ? 1 : 0);
      gl.uniform1f(uniforms.dust, settings.region === 'neighborhood' && settings.dust ? 1 : 0);
      gl.uniform3fv(uniforms.stellarCenters, stellarCenters);
      gl.uniform1f(uniforms.stellarCount, stellarRecords.length);
      gl.uniform1f(uniforms.stellarQuad, 0);
      gl.uniform1f(uniforms.cloudQuad, 0);
      var cloudMaximum = Math.min(60 * pixelRatio(), pointMax);
      var cloudQuadMaximum = Math.max(cloudMaximum, Math.min(384 * pixelRatio(), 2 * Math.max(canvas.width, canvas.height)));
      gl.uniform1f(uniforms.cloudQuadMax, cloudQuadMaximum);
      gl.uniform1f(uniforms.stellarStructure,0); gl.uniform1f(uniforms.stellarLoops,0);
      gl.uniform3f(uniforms.stellarRight,1,0,0); gl.uniform3f(uniforms.stellarUp,0,1,0); gl.uniform3f(uniforms.stellarToward,0,0,-1);
      var quadMaximum = Math.min(768 * pixelRatio(), 2 * Math.max(canvas.width, canvas.height));
      gl.uniform1f(uniforms.quadMax, quadMaximum);
      gl.uniform1f(uniforms.beta, b);
      gl.uniform1f(uniforms.gamma, gamma(b));
      gl.uniform1f(uniforms.exposure, REGIONS[settings.region].exposure * settings.exposure);
      gl.uniform1f(uniforms.lens, 1 / Math.tan(settings.fov * Math.PI / 360));
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cloudTexture);
      gl.uniform1i(uniforms.cloudTexture, 0);
      gl.drawArrays(gl.POINTS, 0, pointCount);
      if (cloudQuadCount) {
        // One additive batch reuses the existing program, atlas and buffer.
        // The shader clips unresolved and behind-camera surfaces; there are
        // no per-source draw calls or camera-time vertex/texture uploads.
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.bindBuffer(gl.ARRAY_BUFFER, galaxyBuffer);
        pointAttributes.forEach(function(a) {
          gl.enableVertexAttribArray(a[0]);
          gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, 44, cloudQuadByteOffset + a[2]);
        });
        gl.enableVertexAttribArray(cornerAttribute);
        gl.vertexAttribPointer(cornerAttribute, 2, gl.FLOAT, false, 44, cloudQuadByteOffset + 36);
        gl.uniform1f(uniforms.cloudQuad, 1);
        gl.drawArrays(gl.TRIANGLES, 0, cloudQuadCount);
        gl.uniform1f(uniforms.cloudQuad, 0);
        gl.disableVertexAttribArray(cornerAttribute);
        attributes(pointAttributes, buffer, 36);
      }
      if (stellarRecords.length) {
        var maximum = Math.min(120 * pixelRatio(), pointMax), g = gamma(b);
        var lens = 1 / Math.tan(settings.fov * Math.PI / 360);
        var selected = stellarRecords.filter(function(record){
          var x=record[0]-state.position[0], y=record[1]-state.position[1], z=record[2]-state.position[2];
          var sourceDistance=Math.hypot(x,y,z), distance=Math.max(sourceDistance,0.00001), nz=z/distance;
          var D=g*(1+b*nz), ax=x/distance/D, ay=y/distance/D, az=(nz+b)/(1+b*nz);
          var depth=ax*sy*cp+ay*sp+az*cy*cp;
          var projected=record[6]/distance/D*canvas.height*lens/Math.max(depth,0.03);
          // The shader makes the exact handoff. This slightly wider coarse
          // eligibility band avoids dropping a quad at a floating-point edge.
          return sourceDistance>0.00001 && depth>0.0005 && isFinite(projected) && projected>maximum*0.75;
        });
        if (selected.length) {
          // At most three authored surfaces can overlap. Composite the farthest
          // first using world distance so foreground photospheres obscure them.
          selected.sort(function(a,b){
            return Math.hypot(b[0]-state.position[0],b[1]-state.position[1],b[2]-state.position[2])-Math.hypot(a[0]-state.position[0],a[1]-state.position[1],a[2]-state.position[2]);
          });
          gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
          pointAttributes.forEach(function(a){gl.disableVertexAttribArray(a[0]);});
          gl.bindBuffer(gl.ARRAY_BUFFER,galaxyBuffer);
          gl.enableVertexAttribArray(cornerAttribute);
          gl.vertexAttribPointer(cornerAttribute,2,gl.FLOAT,false,24,12);
          gl.uniform1f(uniforms.stellarQuad,1);
          selected.forEach(function(record){
            var frame=stellarSurfaceFrame(record,[cy,0,-sy],[-sy*sp,cp,-cy*sp]);
            gl.uniform3fv(uniforms.stellarRight,frame.right); gl.uniform3fv(uniforms.stellarUp,frame.up); gl.uniform3fv(uniforms.stellarToward,frame.toward);
            var dx=record[0]-state.position[0],dy=record[1]-state.position[1],dz=record[2]-state.position[2];
            var distance=Math.max(Math.hypot(dx,dy,dz),0.00001),nz=dz/distance,D=g*(1+b*nz);
            var ax=dx/distance/D,ay=dy/distance/D,az=(nz+b)/(1+b*nz);
            var depth=ax*sy*cp+ay*sp+az*cy*cp;
            var cssSize=record[6]/distance/D*canvas.height*lens/Math.max(depth,0.03)/pixelRatio();
            cssSize=Math.min(cssSize,Math.max(maximum,quadMaximum)/pixelRatio());
            function detail(low,high) { var t=clamp((cssSize-low)/(high-low),0,1); return t*t*(3-2*t); }
            gl.uniform1f(uniforms.stellarStructure,detail(132,240)); gl.uniform1f(uniforms.stellarLoops,detail(240,360));
            gl.vertexAttrib3f(pointAttributes[0][0],record[0],record[1],record[2]);
            gl.vertexAttrib3f(pointAttributes[1][0],record[3],record[4],record[5]);
            gl.vertexAttrib1f(pointAttributes[2][0],record[6]);
            gl.vertexAttrib1f(pointAttributes[3][0],record[7]);
            gl.vertexAttrib1f(pointAttributes[4][0],record[8]);
            gl.drawArrays(gl.TRIANGLES,stellarQuadFirst,6);
          });
          gl.blendFunc(gl.ONE,gl.ONE);
          gl.disableVertexAttribArray(cornerAttribute);
          gl.uniform1f(uniforms.stellarQuad,0);
          gl.uniform1f(uniforms.stellarStructure,0); gl.uniform1f(uniforms.stellarLoops,0);
          attributes(pointAttributes,buffer,36);
        }
      }
    }
    // The sphere remains in source/world coordinates. Camera axes only choose
    // its current screen tangent frame; apparent relativistic size is separate.
    function stellarSurfaceFrame(record, cameraRight, cameraUp) {
      var toward = [state.position[0]-record[0],state.position[1]-record[1],state.position[2]-record[2]];
      var distance = Math.hypot(toward[0],toward[1],toward[2]);
      if (!(distance>0.00001) || !isFinite(distance)) return {right:[1,0,0],up:[0,1,0],toward:[0,0,-1]};
      toward = toward.map(function(value){return value/distance;});
      function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
      function cross(a,b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
      function tangent(axis) { var along=dot(axis,toward); return axis.map(function(value,i){return value-toward[i]*along;}); }
      function unit(vector) { var length=Math.hypot(vector[0],vector[1],vector[2]); return vector.map(function(value){return value/length;}); }
      var right = tangent(cameraRight), length = Math.hypot(right[0],right[1],right[2]);
      if (length>0.000001) right=unit(right);
      else {
        var up=tangent(cameraUp);
        if (Math.hypot(up[0],up[1],up[2])<=0.000001) up=tangent(Math.abs(toward[1])<0.9?[0,1,0]:[1,0,0]);
        right=unit(cross(toward,unit(up)));
      }
      return {right:right,up:unit(cross(right,toward)),toward:toward};
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
      orbitId = null; orbitPath = null;
      clearFlyby();
      var message = 'Reached the edge of this generated model. Reset position or look back to explore it.';
      pauseWithMessage(message, { kind: 'boundary', region: settings.region, mode: settings.mode, position: state.position.slice() });
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
        pauseWithMessage('Arrived at ' + item.name + '. Travel is paused; look around or choose another destination.',
          { kind: 'arrival', region: settings.region, mode: settings.mode, position: state.position.slice(), targetId: item.id, targetName: item.name, arrivalRadiusLy: radius });
      }
    }
    function stepOrbit(dt) {
      var item = getLandmark(orbitId);
      if (!item) { endOrbit(); return; }
      var angle = settings.orbitRate * Math.PI / 180 * settings.orbitDirection * clamp(finite(dt, 0), 0, 0.1);
      if(orbitPath){
        orbitPath.angle=((orbitPath.angle+angle)%TAU+TAU)%TAU;
        var c=Math.cos(orbitPath.angle),s=Math.sin(orbitPath.angle);
        state=Object.assign({},state,{position:orbitPath.center.map(function(value,i){return value+orbitPath.radial[i]*c+orbitPath.tangent[i]*s;}),distanceLy:state.distanceLy+orbitPath.radiusLy*Math.abs(angle)});
        faceTarget(item);return;
      }
      var x = state.position[0] - item.position[0], z = state.position[2] - item.position[2];
      // Camera-only survey around the world's vertical axis. Radius and altitude
      // stay fixed; this is not a gravitational orbit or a spacecraft trajectory.
      state = Object.assign({}, state, { position: [item.position[0] + x * Math.cos(angle) + z * Math.sin(angle), state.position[1], item.position[2] - x * Math.sin(angle) + z * Math.cos(angle)], distanceLy: state.distanceLy + Math.hypot(x, z) * Math.abs(angle) });
      faceTarget(item);
    }
    function stepDistanceGlide(dt) {
      var item = getLandmark(distanceGlide.targetId);
      if (!item) { endDistanceGlide(); return; }
      var elapsed = Math.min(distanceGlide.durationSeconds, distanceGlide.elapsedSeconds + clamp(finite(dt,0),0,0.5));
      var t = elapsed / distanceGlide.durationSeconds, eased = t * t * (3 - 2 * t);
      distanceGlide.elapsedSeconds = elapsed;
      // Resolve each frame from the original radial plan, so the endpoint and
      // camera path length stay independent of frame cadence. Clocks stay put.
      state = Object.assign({},state,{position:t===1?distanceGlide.endPosition.slice():distanceGlide.startPosition.map(function(value,i){return value+(distanceGlide.endPosition[i]-value)*eased;}),
        distanceLy:distanceGlide.startDistanceLy+distanceGlide.distanceLy*eased});
      faceTarget(item);
      if (elapsed === distanceGlide.durationSeconds) {
        distanceGlide.active = false; distanceGlide.completed = true;
        pauseWithMessage('Camera glide to '+item.name+' completed. Travel is paused.');
      }
    }
    function stepViewpointGlide(dt) {
      var item = getLandmark(viewpointGlide.targetId);
      if (!item) { endViewpointGlide(); return; }
      var elapsed = Math.min(viewpointGlide.durationSeconds, viewpointGlide.elapsedSeconds + clamp(finite(dt,0),0,0.5));
      var t = elapsed / viewpointGlide.durationSeconds, eased = t * t * (3 - 2 * t);
      viewpointGlide.elapsedSeconds = elapsed;
      // Sample the validated angular arc from its origin. Linear position
      // interpolation would cut across the orbit and reduce the viewing range.
      var azimuth = viewpointGlide.azimuth + viewpointGlide.azimuthDelta * eased;
      var elevation = viewpointGlide.elevation + viewpointGlide.elevationDelta * eased;
      var horizontal = viewpointGlide.vertical ? viewpointGlide.rangeLy * Math.cos(elevation) : viewpointGlide.horizontalLy;
      var position = t===1 ? viewpointGlide.endPosition.slice() : [
        item.position[0] + horizontal * Math.sin(azimuth),
        viewpointGlide.vertical ? item.position[1] + viewpointGlide.rangeLy * Math.sin(elevation) : viewpointGlide.startPosition[1],
        item.position[2] + horizontal * Math.cos(azimuth)
      ];
      // Preserve the exact launch position until playback actually advances.
      if (!elapsed) position = viewpointGlide.startPosition.slice();
      state = Object.assign({},state,{position:position,distanceLy:viewpointGlide.startDistanceLy + viewpointGlide.distanceLy * eased});
      faceTarget(item);
      if (elapsed === viewpointGlide.durationSeconds) {
        viewpointGlide.active = false; viewpointGlide.completed = true;
        pauseWithMessage('Viewpoint glide around '+item.name+' completed. Travel is paused.');
      }
    }
    function stepFlyby(dt) {
      var seconds = clamp(finite(dt,0),0,0.5), route = flybyRoute(flyby.id);
      var oldElapsed = flyby.elapsedSeconds, elapsed = Math.min(route.durationSeconds,oldElapsed+seconds*settings.flybyRate);
      if(settings.pauseAtHighlights) {
        if(!easedLeg)easedLeg=nextFlybyLeg(oldElapsed===0);
        easedLeg.clock=Math.min(easedLeg.duration,easedLeg.clock+seconds*settings.flybyRate);
        elapsed=flybyLegPosition(easedLeg,easedLeg.clock);
      }
      // Clamp to the first crossed highlight; Continue selects the next leg.
      var stop = settings.pauseAtHighlights ? route.highlights.filter(function(item){return item.seconds > oldElapsed && item.seconds <= elapsed;})[0] : null;
      if (stop) elapsed = stop.seconds;
      var oldSample = route.atTime(oldElapsed), sample = route.atTime(elapsed);
      flyby.elapsedSeconds = elapsed;
      // Camera displacement follows the sampled curve regardless of gaze.
      // Keep path distance independent of RAF sampling and physical clocks.
      flybyPace = seconds ? (sample.distance-oldSample.distance)/seconds : 0;
      state = Object.assign({},state,{position:sample.position.slice(),distanceLy:sample.distance});
      if (flyby.autoLook) {
        var follow = 1-Math.exp(-seconds/0.35);
        if(easedLeg) {
          var settle=clamp((easedLeg.duration-easedLeg.clock)/0.8,0,1);
          follow=1-(1-follow)*settle*settle*(3-2*settle);
        }
        var yawDelta = ((sample.yaw-state.yaw+Math.PI)%TAU+TAU)%TAU-Math.PI;
        state.yaw = ((state.yaw+yawDelta*follow)%TAU+TAU)%TAU;
        state.pitch = clamp(state.pitch+(sample.pitch-state.pitch)*follow,-Math.PI/2+0.01,Math.PI/2-0.01);
      }
      if (stop) {
        flybyPace = 0; targetId = stop.targetId; clearFraming();
        // Resolve the authored view when following, while respecting free look.
        if (flyby.autoLook) { state.yaw = sample.yaw; state.pitch = sample.pitch; }
        var stopTarget = getLandmark(targetId);
        pauseWithMessage(stop.name + '. Travel is paused; look around or continue the flyby.',
          {kind:'flyby-stop',region:settings.region,mode:settings.mode,position:state.position.slice(),targetId:targetId,targetName:stopTarget?stopTarget.name:null,routeId:route.id,routeName:route.name,highlightId:stop.id,highlightName:stop.name,description:stop.description,seconds:stop.seconds,stopIndex:route.highlights.indexOf(stop)+1,stopCount:route.highlights.length});
      } else if (elapsed >= route.durationSeconds) {
        flyby.active = false; flyby.completed = true; flybyPace = 0;
        targetId = route.completionTargetId; clearFraming();
        var destination = getLandmark(targetId);
        pauseWithMessage(route.completionMessage,
          {kind:'flyby',region:settings.region,mode:settings.mode,position:state.position.slice(),targetId:targetId,targetName:destination?destination.name:null,routeId:route.id,routeName:route.name});
      }
    }
    function frame(now) {
      raf = 0;
      if (disposed || lost || !isVisible()) { lastFrame = 0; freePace = 0; return; }
      if (settings.running) {
        var previous = state;
        var wallSeconds = Math.max(0,finite(lastFrame ? (now-lastFrame)/1000 : 0,0));
        var dt = clamp(wallSeconds,0,0.1);
        var glideFrame = (distanceGlide.active || viewpointGlide.active) && settings.mode === 'explore';
        if (glideFrame) { freePace = 0; if (viewpointGlide.active) stepViewpointGlide(wallSeconds); else stepDistanceGlide(wallSeconds); }
        else if (flyby.active && settings.mode === 'explore') { freePace = 0; stepFlyby(wallSeconds); }
        else if (orbitId && settings.mode === 'explore') { freePace = 0; stepOrbit(dt); }
        else if (navigation.active && settings.mode === 'explore') { freePace = 0; stepNavigation(dt); }
        else if (settings.mode === 'explore' && settings.smoothTravel) {
          var eased = easePace(freePace, settings.speed, dt);
          freePace = eased.speed;
          state = stepFlight(state, Object.assign({}, settings, { speed: dt ? eased.distance / dt : 0 }), dt);
        } else {
          freePace = settings.mode === 'explore' ? settings.speed : 0;
          state = stepFlight(state, settings, dt);
        }
        lastFrame = now;
        if (!settings.running) { lastFrame = 0; freePace = 0; }
        // Both inspection plans validate their entire path against the sphere.
        // Avoid replacing arrival with a rounding-only edge event.
        if (!glideFrame) limitToRegion(previous);
      } else { lastFrame = 0; freePace = 0; }
      draw();
      // A paused interaction gets only one frame; always publish its final view.
      emitTelemetry(!settings.running);
      if (settings.running) requestDraw();
    }
    function visibilityChanged() {
      if (!isVisible()) { cancelFrame(); emitTelemetry(true); }
      else { lastFrame = 0; requestDraw(); }
    }
    function contextLost(event) {
      event.preventDefault(); lost = true; cancelFrame();
      status('error', 'The 3D graphics context was interrupted. Close and reopen the flight explorer to restore it.');
    }
    function dispose() {
      if (disposed) return;
      disposed = true; flybyDetour=null; clearFlyby(); cancelFrame();
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
      global.removeEventListener('resize', resize);
      global.document.removeEventListener('visibilitychange', visibilityChanged);
      canvas.removeEventListener('webglcontextlost', contextLost);
      if (gl && !lost) {
        if (buffer) gl.deleteBuffer(buffer);
        if (galaxyBuffer) gl.deleteBuffer(galaxyBuffer);
        if (galaxyTexture) gl.deleteTexture(galaxyTexture);
        if (cloudTexture) gl.deleteTexture(cloudTexture);
        if (galaxyProgram) gl.deleteProgram(galaxyProgram);
        if (program) gl.deleteProgram(program);
        shaders.forEach(function (shader) { gl.deleteShader(shader); });
      }
      galaxySurfaces = null; galaxyObserver = null; galaxyCount = 0;
      stellarRecords = []; stellarCenters = null; stellarQuadFirst = 0;
      cloudQuadCount = 0; cloudQuadByteOffset = 0;
      options = {};
    }
    function snapshot() {
      return {
        version: 1,
        settings: { mode: settings.mode, region: settings.region, beta: settings.beta, compareRest: settings.compareRest, dust: settings.dust, fov: settings.fov, exposure: settings.exposure, quality: settings.quality },
        state: { position: state.position.slice(), yaw: state.yaw, pitch: state.pitch, distanceLy: state.distanceLy, universeYears: state.universeYears, travelerYears: state.travelerYears },
        targetId: targetId
      };
    }
    function restoreView(saved, preserveDetour) {
      if (disposed || !saved || saved.version !== 1 || !saved.settings || !saved.state) return false;
      var input = saved.settings, savedState = saved.state;
      if (input.mode !== 'explore' && input.mode !== 'relativity') return false;
      if (!Object.prototype.hasOwnProperty.call(REGIONS, input.region)) return false;
      if (!Array.isArray(savedState.position) || savedState.position.length !== 3 || !savedState.position.every(Number.isFinite)) return false;
      if (Math.hypot.apply(Math, savedState.position) > REGIONS[input.region].boundary * (1 + 1e-10)) return false;
      if (!['yaw', 'pitch', 'distanceLy', 'universeYears', 'travelerYears'].every(function (key) { return Number.isFinite(savedState[key]); })) return false;
      if (![input.beta, input.fov, input.exposure].every(Number.isFinite)) return false;
      if (!preserveDetour) flybyDetour=null;
      clearFlyby();
      var oldRegion = settings.region;
      settings.mode = input.mode; settings.region = input.region;
      settings.beta = safeBeta(input.beta); settings.compareRest = !!input.compareRest;
      settings.dust = input.dust === undefined ? true : !!input.dust;
      settings.fov = clamp(input.fov, 10, 100); settings.exposure = clamp(input.exposure, 0.3, 2);
      settings.quality = ['auto', 'low', 'high'].indexOf(input.quality) >= 0 ? input.quality : 'auto';
      settings.running = false;
      state = {
        position: savedState.position.slice(), yaw: ((savedState.yaw % TAU) + TAU) % TAU,
        pitch: clamp(savedState.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01),
        distanceLy: clamp(savedState.distanceLy, 0, 1e18), universeYears: clamp(savedState.universeYears, 0, 1e18), travelerYears: clamp(savedState.travelerYears, 0, 1e18)
      };
      targetId = getLandmark(saved.targetId) ? saved.targetId : null;
      cameraMoves = [];
      clearFraming();
      trail = [];
      orbitId = null; orbitPath = null;
      navigation = { active: false, targetId: null };
      lastFrame = 0; freePace = 0;
      if (oldRegion !== settings.region) uploadRegion();
      resize(); requestDraw();
      pauseWithMessage(preserveDetour?'Inspection view restored. Travel is paused.':'Saved view restored. Travel is paused.');
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
        var previousSmooth = settings.smoothTravel;
        var previousStops = settings.pauseAtHighlights;
        var previousSpeed = settings.speed;
        var previousFov = settings.fov, previousBeta = displayBeta(), previousTilt = settings.orbitTilt;
        if (next.mode === 'explore' || next.mode === 'relativity') settings.mode = next.mode;
        if (Object.prototype.hasOwnProperty.call(REGIONS, next.region)) settings.region = next.region;
        if (next.speed !== undefined) settings.speed = clamp(finite(next.speed, 0), 0, 1e10);
        if (next.smoothTravel !== undefined) settings.smoothTravel = !!next.smoothTravel;
        if (next.flybyRate !== undefined) settings.flybyRate = clamp(finite(next.flybyRate,1),0.25,4);
        if (next.pauseAtHighlights !== undefined) settings.pauseAtHighlights = !!next.pauseAtHighlights;
        if (next.orbitRate !== undefined) settings.orbitRate = clamp(finite(next.orbitRate, 3), 0.25, 12);
        if (next.orbitDirection === 1 || next.orbitDirection === -1) settings.orbitDirection = next.orbitDirection;
        if (next.orbitTilt !== undefined) settings.orbitTilt=clamp(finite(next.orbitTilt,0),0,45);
        if (next.beta !== undefined) settings.beta = safeBeta(next.beta);
        if (next.timeScale !== undefined) settings.timeScale = clamp(finite(next.timeScale, 1), 0, 1e10);
        if (next.compareRest !== undefined) settings.compareRest = !!next.compareRest;
        if (next.dust !== undefined) settings.dust = !!next.dust;
        if (next.fov !== undefined) settings.fov = clamp(finite(next.fov, 70), 10, 100);
        if (next.exposure !== undefined) settings.exposure = clamp(finite(next.exposure, 1), 0.3, 2);
        if (['auto', 'low', 'high'].indexOf(next.quality) >= 0) settings.quality = next.quality;
        if (next.running !== undefined) settings.running = !!next.running;
        if (wasRunning && !settings.running) easedLeg = null;
        if (flyby.active && ((!wasRunning&&settings.running)||previousStops!==settings.pauseAtHighlights)) easedLeg=settings.pauseAtHighlights?nextFlybyLeg(!wasRunning):null;
        if (next.running) cameraMoves = [];
        if (next.running && flyby.completed) clearFlyby();
        if (next.running && distanceGlide.completed) clearDistanceGlide();
        if (next.running && viewpointGlide.completed) clearViewpointGlide();
        if (next.running && navigation.completed) navigation = { active:false, targetId:null };
        if (previousRegion !== settings.region) { state = initialState(); targetId = null; uploadRegion(); }
        if (previousRegion !== settings.region || previousMode !== settings.mode) {
          flybyDetour=null; navigation = { active: false, targetId: null }; orbitId = null; orbitPath = null; clearFlyby(); trail = []; cameraMoves = []; settings.running = false;
        }
        if(orbitId&&previousTilt!==settings.orbitTilt){
          var orbitTarget=getLandmark(orbitId);
          orbitPath=settings.orbitTilt?orbitPlane(state.position,orbitTarget.position,settings.orbitTilt):null;
          if(settings.orbitTilt&&!orbitPath)endOrbit('Move to a lower viewpoint before using a tilted orbit. Travel is paused.');
          else {if(orbitPath)orbitPath.angle=0;lastFrame=0;}
        }
        if (previousRegion !== settings.region || previousMode !== settings.mode || previousFov !== settings.fov || previousBeta !== displayBeta() || settings.running) clearFraming();
        var resetTravel = !settings.running || !wasRunning || !isVisible() || lost || previousRegion !== settings.region || previousMode !== settings.mode;
        if (resetTravel) { freePace = 0; lastFrame = 0; }
        else if (settings.mode === 'explore' && !distanceGlide.active && !viewpointGlide.active && !flyby.active && !orbitId && !navigation.active) {
          if (!settings.speed) freePace = 0;
          else if (!settings.smoothTravel) freePace = settings.speed;
          else if (!previousSmooth) freePace = previousSpeed;
        }
        if (previousQuality !== settings.quality) resize();
        if (targetId || previousRegion !== settings.region || (wasRunning && !settings.running) || next.speed !== undefined || next.smoothTravel !== undefined || next.flybyRate !== undefined || next.pauseAtHighlights !== undefined || next.running !== undefined || next.dust !== undefined) emitTelemetry(true);
        requestDraw();
      },
      look: function (yawDelta, pitchDelta) {
        if (disposed) return;
        clearFraming(); manualFlybyLook();
        endInspectionGlides('Manual look ended the camera glide. Travel is paused.');
        endOrbit('Manual look ended the orbit. Travel is paused.');
        state.yaw = ((state.yaw + finite(yawDelta, 0)) % TAU + TAU) % TAU;
        state.pitch = clamp(state.pitch + finite(pitchDelta, 0), -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
        requestDraw(); emitTelemetry(false);
      },
      view: function (direction) {
        if (disposed) return;
        var views = { forward: [0, 0], back: [Math.PI, 0], left: [-Math.PI / 2, 0], right: [Math.PI / 2, 0], up: [0, Math.PI / 2 - 0.01], down: [0, -Math.PI / 2 + 0.01] };
        if (!views[direction]) return;
        clearFraming(); manualFlybyLook();
        endInspectionGlides('Manual look ended the camera glide. Travel is paused.');
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
        clearFraming();
        clearFlyby();
        var previous=state;
        var undo={position:state.position.slice(),distanceLy:state.distanceLy,trail:trail.map(function(p){return p.slice();})};
        settings.running=false;orbitId=null;orbitPath=null;navigation={active:false,targetId:null};lastFrame=0;freePace=0;
        state=Object.assign({},state,{position:state.position.map(function(v,i){return v+axes[direction][i]*amount;}),distanceLy:state.distanceLy+amount});
        limitToRegion(previous);
        var traveled=state.distanceLy-previous.distanceLy;
        if (traveled>0) { cameraMoves.push(undo);if(cameraMoves.length>12)cameraMoves.shift(); }
        if (traveled>=amount*(1-1e-10)) pauseWithMessage('Camera moved. Travel is paused; undo is available for recent camera steps.');
        emitTelemetry(true);requestDraw();return traveled>0;
      },
      planDistanceView: planDistanceView,
      startDistanceGlide: function (id, direction) {
        if (distanceGlide.active || viewpointGlide.active) return false;
        var plan=planDistanceView(id,direction);
        if (!plan) return false;
        var item=getLandmark(id||targetId);
        clearFraming(); clearFlyby(); cameraMoves=[]; navigation={active:false,targetId:null}; orbitId=null; orbitPath=null; targetId=item.id;
        distanceGlide={active:true,completed:false,targetId:item.id,direction:direction,elapsedSeconds:0,durationSeconds:3,
          startPosition:state.position.slice(),endPosition:plan.position.slice(),startDistanceLy:state.distanceLy,distanceLy:plan.distanceLy,
          startRangeLy:toLandmark(item).distance,endRangeLy:plan.rangeLy};
        faceTarget(item); settings.running=true; lastFrame=0; freePace=0;
        emitTelemetry(true); requestDraw(); return true;
      },
      cancelDistanceGlide: function () { if (disposed || lost || !gl || !program || !distanceGlide.active) return false; return endDistanceGlide(); },
      stepDistanceView: function (id, direction) {
        var plan=planDistanceView(id,direction);
        if(!plan)return false;
        var item=getLandmark(id||targetId);
        clearFraming();clearFlyby();cameraMoves=[];navigation={active:false,targetId:null};orbitId=null;orbitPath=null;targetId=item.id;
        state=Object.assign({},state,{position:plan.position,distanceLy:state.distanceLy+plan.distanceLy});
        faceTarget(item);
        pauseWithMessage('Camera distance from '+item.name+' changed. Travel is paused.');
        requestDraw();return true;
      },
      planOrbitView: planOrbitView,
      planViewpointGlide: planViewpointGlide,
      startViewpointGlide: function (id, direction, degrees) {
        if (distanceGlide.active || viewpointGlide.active) return false;
        var step = degrees===undefined ? 25 : degrees;
        var plan = planViewpointGlide(id,direction,step);
        if (!plan) return false;
        var item = getLandmark(id||targetId);
        var relative = state.position.map(function(value,i){return value-item.position[i];});
        var horizontal = Math.hypot(relative[0],relative[2]), elevation = Math.atan2(relative[1],horizontal);
        var vertical = direction==='up' || direction==='down';
        clearFraming(); clearFlyby(); cameraMoves=[]; navigation={active:false,targetId:null}; orbitId=null; orbitPath=null; targetId=item.id;
        viewpointGlide={active:true,completed:false,targetId:item.id,direction:direction,elapsedSeconds:0,durationSeconds:3,
          startPosition:state.position.slice(),endPosition:plan.position.slice(),startDistanceLy:state.distanceLy,distanceLy:plan.distanceLy,
          rangeLy:plan.radiusLy,horizontalLy:horizontal,vertical:vertical,azimuth:Math.atan2(relative[0],relative[2]),elevation:elevation,
          azimuthDelta:vertical?0:(direction==='left'?1:-1)*step*Math.PI/180,
          elevationDelta:vertical?plan.elevationDeg*Math.PI/180-elevation:0};
        faceTarget(item); settings.running=true; lastFrame=0; freePace=0;
        emitTelemetry(true); requestDraw(); return true;
      },
      cancelViewpointGlide: function () { if (disposed || lost || !gl || !program || !viewpointGlide.active) return false; return endViewpointGlide(); },
      stepOrbitView: function (id, direction, degrees) {
        var plan=planOrbitView(id,direction,degrees);
        if(!plan)return false;
        var item=getLandmark(id||targetId);
        clearFraming();clearFlyby();cameraMoves=[];navigation={active:false,targetId:null};orbitId=null;orbitPath=null;targetId=item.id;
        state=Object.assign({},state,{position:plan.position,distanceLy:state.distanceLy+plan.distanceLy});
        faceTarget(item);
        pauseWithMessage('Viewpoint moved around '+item.name+'. Travel is paused.');
        requestDraw();return true;
      },
      undoNudge: function () {
        if (disposed || lost || settings.mode!=='explore' || !cameraMoves.length) return false;
        clearFraming();
        clearFlyby();
        var undo=cameraMoves.pop();
        state=Object.assign({},state,{position:undo.position.slice(),distanceLy:undo.distanceLy});
        trail=undo.trail.map(function(p){return p.slice();});
        navigation={active:false,targetId:null};orbitId=null;orbitPath=null;
        pauseWithMessage('Camera step undone. Position restored; your current look direction is unchanged.');
        requestDraw();return true;
      },
      selectTarget: function (id) {
        if (disposed || (id && !getLandmark(id))) return false;
        if (targetId !== (id || null)) { clearFraming(); endInspectionGlides('Target changed. Camera glide ended; travel is paused.'); endFlyby('Target changed. Flyby canceled; travel is paused.'); }
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
        if (!item || !toLandmark(item).distance) return false;
        clearFraming();
        if (targetId !== item.id) { endInspectionGlides('Target changed. Camera glide ended; travel is paused.'); endFlyby('Target changed. Flyby canceled; travel is paused.'); }
        manualFlybyLook();
        if (orbitId && orbitId !== item.id) endOrbit();
        targetId = item.id; faceTarget(item); emitTelemetry(true); requestDraw();
        return true;
      },
      faceSceneCenter: function () {
        if (disposed || lost || !gl || !program || !state.position.every(Number.isFinite)) return false;
        var distance = Math.hypot.apply(Math, state.position);
        if (!distance || !Number.isFinite(distance)) return false;
        var direction = aberrate(state.position.map(function (value) { return -value / distance; }), displayBeta());
        var yaw = Math.atan2(direction[0], direction[2]);
        var pitch = clamp(Math.atan2(direction[1], Math.hypot(direction[0], direction[2])), -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
        if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return false;
        clearFraming(); manualFlybyLook(); endInspectionGlides(); navigation = { active: false, targetId: null }; orbitId = null; orbitPath = null;
        state.yaw = yaw; state.pitch = pitch;
        pauseWithMessage('Looking toward the center of this generated scene. Travel is paused.');
        requestDraw(); return true;
      },
      frameTarget: function (id, u) {
        var item = getLandmark(id || targetId);
        var pose = targetFraming(item, u);
        if (!pose) return false;
        endInspectionGlides();
        if (targetId !== item.id) endFlyby('Target changed. Flyby canceled; travel is paused.');
        manualFlybyLook();
        frameUndo = { yaw: state.yaw, pitch: state.pitch };
        framePlacement = pose.screen[0] === 1 / 3 ? 'left' : pose.screen[0] === 0.5 ? 'center' : pose.screen[0] === 2 / 3 ? 'right' : null;
        if (navigation.targetId && navigation.targetId !== item.id) navigation = { active: false, targetId: null };
        targetId = item.id; state.yaw = pose.yaw; state.pitch = pose.pitch;
        orbitId = null; orbitPath = null;
        pauseWithMessage(item.name + ' framed in the paused view.');
        requestDraw(); return true;
      },
      undoFrame: function () {
        if (disposed || lost || !gl || !program || !frameUndo) return false;
        var pose = frameUndo;
        endInspectionGlides(); manualFlybyLook();
        clearFraming(); state.yaw = pose.yaw; state.pitch = pose.pitch; orbitId = null; orbitPath = null;
        pauseWithMessage('Previous look direction restored. Travel is paused.');
        requestDraw(); return true;
      },
      planApproach: function (id, multiplier) {
        var item = !disposed && getLandmark(id);
        return item && settings.mode==='explore' ? approachPlan(toLandmark(item).distance,item.arrivalRadiusLy,multiplier,settings.speed) : null;
      },
      navigateTo: function (id, multiplier) {
        if (disposed || lost || !gl || settings.mode !== 'explore') return false;
        var item = getLandmark(id);
        if (!item) return false;
        clearFraming();
        clearFlyby();
        cameraMoves = [];
        orbitId = null; orbitPath = null;
        freePace = 0;
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
          if (!flyby.active && !distanceGlide.active && !viewpointGlide.active) pauseWithMessage('Move away from the destination’s vertical axis before starting an orbit.'); return false;
        }
        var plannedPath=settings.orbitTilt?orbitPlane(state.position,item.position,settings.orbitTilt):null;
        if(settings.orbitTilt&&!plannedPath){if(!distanceGlide.active&&!viewpointGlide.active)pauseWithMessage('Move to a lower viewpoint before using a tilted orbit. Travel is paused.');return false;}
        clearFraming();
        clearFlyby();
        orbitPath=plannedPath;if(orbitPath)orbitPath.angle=0;
        targetId = item.id; orbitId = item.id; navigation = { active: false, targetId: null };
        cameraMoves = []; freePace = 0;
        faceTarget(item); settings.running = true; lastFrame = 0;
        emitTelemetry(true); requestDraw(); return true;
      },
      endOrbit: function () { if (disposed) return false; return endOrbit(); },
      startFlyby: function (id) {
        var route=flybyRoute(id);
        if (disposed || lost || !gl || !program || settings.mode !== 'explore' || !route || settings.region !== route.region) return false;
        var sample=route.atTime(0);
        flybyDetour=null; clearInspectionGlides();
        state={position:sample.position.slice(),yaw:sample.yaw,pitch:sample.pitch,distanceLy:0,universeYears:0,travelerYears:0};
        targetId=route.targetId; navigation={active:false,targetId:null}; orbitId=null;orbitPath=null;
        flyby={active:true,completed:false,id:route.id,elapsedSeconds:0,autoLook:true}; flybyPace=0; easedLeg=null;
        trail=[]; cameraMoves=[]; clearFraming(); settings.running=true; lastFrame=0; freePace=0;
        emitTelemetry(true); requestDraw(); return true;
      },
      seekFlyby: function (seconds) { return seekFlybyMoment(seconds); },
      seekFlybyHighlight: function (id) {
        var route=flybyRoute(flyby.id);
        var highlight=route&&route.highlights.filter(function(item){return item.id===id;})[0];
        return !!highlight&&seekFlybyMoment(highlight.seconds,highlight);
      },
      cancelFlyby: function () { if (disposed || lost || !gl || !program) return false; return endFlyby(); },
      followFlybyView: function () {
        if (disposed || lost || !gl || !program || !flyby.active) return false;
        flyby.autoLook=true; clearFraming();
        if (!settings.running) { var sample=flybyRoute(flyby.id).atTime(flyby.elapsedSeconds); state.yaw=sample.yaw; state.pitch=sample.pitch; }
        emitTelemetry(true); requestDraw(); return true;
      },
      beginFlybyDetour: beginFlybyDetour,
      returnToFlyby: returnToFlyby,
      cancelFlybyDetour: cancelFlybyDetour,
      snapshot: snapshot,
      capture: function () {
        if (disposed || lost || !gl) return null;
        draw();
        return { dataUrl: canvas.toDataURL('image/png'), snapshot: snapshot() };
      },
      restore: function (saved) { return restoreView(saved,false); },
      inspectFlybyHighlight: function (routeId, highlightId) {
        var route=flybyRoute(routeId), highlight=route&&route.highlights.filter(function(item){return item.id===highlightId;})[0];
        if (disposed || lost || !gl || !program || settings.mode!=='explore' || !route || settings.region!==route.region || !highlight) return false;
        var sample=route.atTime(highlight.seconds), saved=snapshot();
        saved.settings.fov=route.fov; saved.settings.exposure=route.id==='stellar'?0.86:1;
        saved.state={position:sample.position.slice(),yaw:sample.yaw,pitch:sample.pitch,distanceLy:sample.distance,universeYears:0,travelerYears:0};
        saved.targetId=highlight.targetId;
        return restoreView(saved,true);
      },
      restoreInspectionView: function (saved) {
        if (disposed || lost || !gl || !program || settings.mode!=='explore' || !saved || !saved.settings || saved.settings.mode!==settings.mode || saved.settings.region!==settings.region) return false;
        return restoreView(saved,true);
      },
      reset: function () {
        if (!disposed) {
          flybyDetour=null; clearFlyby();
          state = initialState(); targetId = null; navigation = { active: false, targetId: null };
          orbitId = null; orbitPath = null;
          trail = [];
          cameraMoves = [];
          clearFraming();
          settings.running = false; lastFrame = 0; freePace = 0; requestDraw(); emitTelemetry(true);
        }
      },
      dispose: dispose
    };
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
      if (!gl) throw new Error('WebGL is unavailable');
      var pointRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
      if (pointRange && typeof pointRange[1] === 'number' && isFinite(pointRange[1]) && pointRange[1] > 0) pointMax = pointRange[1];
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
      cornerAttribute = gl.getAttribLocation(program, 'a_corner');
      gl.disableVertexAttribArray(cornerAttribute);
      gl.vertexAttrib2f(cornerAttribute,0,0);
      uniforms.stellarCenters = gl.getUniformLocation(program, 'u_stellarCenters[0]');
      ['position', 'right', 'up', 'forward', 'aspect', 'height', 'dpr', 'beta', 'gamma', 'exposure', 'lens', 'pointMax', 'cloudTexture', 'stellarCount', 'stellarQuad', 'quadMax', 'stellarRight', 'stellarUp', 'stellarToward', 'stellarStructure', 'stellarLoops', 'galacticBand', 'dust', 'cloudQuad', 'cloudQuadMax'].forEach(function (name) {
        uniforms[name] = gl.getUniformLocation(program, 'u_' + name);
      });
      galaxyProgram = gl.createProgram();
      gl.attachShader(galaxyProgram, compile(gl.VERTEX_SHADER, GALAXY_VERTEX));
      gl.attachShader(galaxyProgram, compile(gl.FRAGMENT_SHADER, GALAXY_FRAGMENT));
      gl.linkProgram(galaxyProgram);
      if (!gl.getProgramParameter(galaxyProgram, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(galaxyProgram) || 'Galaxy shader link failed');
      galaxyBuffer = gl.createBuffer();
      galaxyAttributes = [[gl.getAttribLocation(galaxyProgram, 'a_position'), 3, 0], [gl.getAttribLocation(galaxyProgram, 'a_uv'), 2, 12], [gl.getAttribLocation(galaxyProgram, 'a_bulge'), 1, 20]];
      ['position', 'right', 'up', 'forward', 'aspect', 'beta', 'gamma', 'exposure', 'lens', 'texture'].forEach(function(name) { galaxyUniforms[name] = gl.getUniformLocation(galaxyProgram, 'u_' + name); });
      galaxyUniforms.diskLight = gl.getUniformLocation(galaxyProgram, 'u_diskLight[0]');
      galaxyTexture = gl.createTexture();
      if (!galaxyTexture) throw new Error('Galaxy texture allocation failed');
      gl.bindTexture(gl.TEXTURE_2D, galaxyTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2048, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, galaxyPixels(GALAXY_TILE_SIZE));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      cloudTexture = gl.createTexture();
      if (!cloudTexture) throw new Error('Cloud texture allocation failed');
      gl.bindTexture(gl.TEXTURE_2D, cloudTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, CLOUD_TILE_SIZE * 4, CLOUD_TILE_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, cloudPixels());
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
        if (cloudTexture) gl.deleteTexture(cloudTexture);
        if (galaxyProgram) gl.deleteProgram(galaxyProgram);
        if (program) gl.deleteProgram(program);
        shaders.forEach(function (shader) { gl.deleteShader(shader); });
      }
      gl = null; program = null; buffer = null; shaders = [];
      status('error', '3D exploration needs WebGL graphics support. Enable hardware acceleration or try another browser.');
    }
    return api;
  }

  global.UniverseFlight = { create: create, landmarks: landmarks, flybys: flybys, dustClouds: dustClouds, math: { gamma: gamma, aberrate: aberrate, doppler: doppler, stepFlight: stepFlight, viewSpectrum: viewSpectrum, lightClock: lightClock, chartView: chartView, approachPlan: approachPlan, targetView: targetView, targetFrame: targetFrame, orbitView: orbitView, rangeView: rangeView, orbitPlane: orbitPlane, easePace: easePace, dustOpticalDepth: dustOpticalDepth, dustTransmission: dustTransmission } };
})(window);
