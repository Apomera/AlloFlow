// Renewables Tycoon: illustrative equipment view. All power comes from the campaign engine.
(function () {
  'use strict';
  var nextSceneId = 0;
  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  function n(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
  function formatPower(value) { return Math.abs(n(value)).toFixed(1) + ' kW'; }
  var FLOW_SLOTS = 7;
  function flowAppearance(magnitude) {
    var level = Math.sqrt(clamp(magnitude / 100, 0, 1));
    // A visual travel speed in map units, independent of the length of the cable.
    return { opacity: magnitude > 0 ? 0.08 + level * 0.92 : 0, radius: 1 + level * 2.6, speed: magnitude > 0 ? 9 + level * 81 : 0 };
  }
  function windsockShape(speed) {
    var strength = clamp(speed / 12, 0, 1), extension = 13 + strength * 35, droop = (1 - strength) * 24;
    function stripe(start, end) { return (extension * start) + ',' + (-5 + (droop + 3) * start) + ' ' + (extension * end) + ',' + (-5 + (droop + 3) * end) + ' ' + (extension * end) + ',' + (7 + (droop - 4) * end) + ' ' + (extension * start) + ',' + (7 + (droop - 4) * start); }
    return ['0,-5 ' + extension + ',' + (droop - 2) + ' ' + extension + ',' + (droop + 3) + ' 0,7', stripe(0.3, 0.49), stripe(0.68, 0.84)];
  }

  window.StemLab = window.StemLab || {};
  window.StemLab.RenewablesTycoonScene = function RenewablesTycoonScene(props) {
    var React = props.ctx.React, h = React.createElement;
    var t = function (key, fallback) { var value; try { value = typeof props.ctx.t === 'function' ? props.ctx.t(key, fallback) : fallback; } catch (error) { value = fallback; } return value == null ? fallback : value; };
    var uidRef = React.useRef(null);
    if (!uidRef.current) uidRef.current = 'renewables-tycoon-scene-' + (++nextSceneId);
    var uid = uidRef.current, frame = props.frame || {}, sites = props.sites || [], assets = frame.assets || [];
    var refs = React.useRef({ rotors: {}, paths: {}, particles: {}, flowGroups: {}, clouds: [], ribbons: null, windsock: null, windsockFabric: [], weatherResponse: null, serviceBeacons: {}, serviceTools: {} });
    var motion = React.useRef({ rotors: {}, flows: {}, breeze: 0, clouds: 0, flutter: 0, weatherWind: null, work: {} });
    var targets = React.useRef({});
    var cameraState = React.useState({ zoom: 1, x: 550, y: 345 }), camera = cameraState[0], setCamera = cameraState[1];
    var overlayState = React.useState('power'), overlay = overlayState[0], setOverlay = overlayState[1];
    var focusLabelState = React.useState(null), focusedSiteId = focusLabelState[0], setFocusedSiteId = focusLabelState[1];
    var mediaState = React.useState(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches), nativeReduced = mediaState[0], setNativeReduced = mediaState[1];
    var drag = React.useRef(null);
    var hour = frame.hourOfDay == null ? n(frame.hour) % 24 : n(frame.hourOfDay);
    // Work is scheduled in the first 48 simulated hours; animation never advances it.
    var serviceElapsed = clamp(frame.hour, 0, 48), serviceRemaining = 48 - serviceElapsed;
    // Stages illustrate the fixed work window; they add no simulation rules.
    var serviceStage = serviceElapsed < 8 ? 'isolate' : serviceElapsed < 36 ? 'service' : 'checks';
    var serviceStageLabel = serviceStage === 'isolate' ? t('renewables.tycoon.scene.stageIsolate', 'Isolate & inspect') : serviceStage === 'service' ? t('renewables.tycoon.scene.stageService', 'Service work') : t('renewables.tycoon.scene.stageChecks', 'Return checks');
    var campaign = props.state || {}, replayMonth = campaign.lastRun && campaign.lastRun.month;
    var buildMonth = campaign.phase === 'planning' ? campaign.month : replayMonth == null ? Math.max(0, n(campaign.month) - 1) : replayMonth;
    var monthHours = n(props.totalHours) > 0 ? n(props.totalHours) : ([31,28,31,30,31,30,31,31,30,31,30,31][clamp(buildMonth, 0, 11)] || 31) * 24;
    // Construction stages illustrate a month already scheduled by the engine.
    var buildProgress = clamp(n(frame.hour) / monthHours, 0, 1);
    var buildStage = buildProgress < 1 / 3 ? 'groundwork' : buildProgress < 2 / 3 ? 'assembly' : 'checks';
    var buildStageLabel = buildStage === 'groundwork' ? t('renewables.tycoon.scene.buildGroundwork', 'Site preparation') : buildStage === 'assembly' ? t('renewables.tycoon.scene.buildAssembly', 'Equipment assembly') : t('renewables.tycoon.scene.buildChecks', 'Connection checks');
    var daylight = frame.sunHeight == null ? clamp(Math.sin((hour - 6) / 12 * Math.PI), 0, 1) : clamp(frame.sunHeight, 0, 1);
    var night = daylight <= 0.001, dawn = daylight > 0 && daylight < 0.45;
    var servedFraction = n(frame.demand) > 0 ? clamp(n(frame.served) / n(frame.demand), 0, 1) : 0;
    var networkServed = Math.max(0, n(frame.served)), networkDemand = Math.max(0, n(frame.demand));
    var networkGap = Math.max(0, n(frame.unserved)), networkCurtailed = Math.max(0, n(frame.curtailed));
    var networkMode = networkGap > 0 ? 'gap' : networkCurtailed > 0 ? 'surplus' : 'balanced';
    var networkHeading = networkMode === 'gap' ? t('renewables.tycoon.scene.shortfall', 'Supply shortfall') : networkMode === 'surplus' ? t('renewables.tycoon.scene.surplus', 'Unused renewable surplus') : t('renewables.tycoon.scene.covered', 'Demand covered');
    var canInspectDispatch = typeof props.onInspectDispatch === 'function';
    var inspectDispatchLabel = t('renewables.tycoon.scene.inspectDispatch', 'Inspect network dispatch');
    function inspectDispatch() { if (canInspectDispatch) props.onInspectDispatch(); }
    function dispatchKey(event) { if (canInspectDispatch && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); inspectDispatch(); } }
    function networkAttributes(surface) { return { 'data-tycoon-network-board': surface, 'data-mode': networkMode, 'data-served': networkServed, 'data-demand': networkDemand, 'data-unserved': networkGap, 'data-curtailed': networkCurtailed }; }
    var windowColor = night ? 'rgb(' + Math.round(45 + servedFraction * 210) + ',' + Math.round(73 + servedFraction * 151) + ',' + Math.round(85 + servedFraction * 80) + ')' : '#6b9dab';
    var windSpeed = n(frame.windSpeed), irradiance = n(frame.irradiance);
    var weather = React.useRef({ wind: windSpeed });
    weather.current.wind = windSpeed;
    var overcast = daylight > 0.2 && irradiance < daylight * 0.42;
    var requestedMotion = props.animate !== false && !props.reducedMotion;
    var active = requestedMotion && !nativeReduced;
    if (motion.current.weatherWind == null || !active) motion.current.weatherWind = clamp(windSpeed, 0, 25);
    var theme = props.theme || {}, dark = !!(theme.dark || theme.isDark);
    var liveTargets = {}, assetBySite = {};
    assets.forEach(function (asset) { assetBySite[asset.siteId] = asset; });
    function sitePoint(site, index) { return { x: 130 + clamp(site.x == null ? 18 + (index % 3) * 31 : site.x, 0, 100) * 8.3, y: 220 + clamp(site.y == null ? 20 + Math.floor(index / 3) * 29 : site.y, 0, 100) * 3.6 }; }
    function fitCamera(next) {
      var zoom = clamp(next.zoom, 1, 2.5), halfWidth = 550 / zoom, halfHeight = 345 / zoom;
      return { zoom: zoom, x: clamp(next.x, halfWidth, 1100 - halfWidth), y: clamp(next.y, halfHeight, 690 - halfHeight) };
    }
    function zoomMap(change) { setCamera(function (old) { return fitCamera({ zoom: old.zoom + change, x: old.x, y: old.y }); }); }
    function panMap(dx, dy) { setCamera(function (old) { return fitCamera({ zoom: old.zoom, x: old.x + dx * 180 / old.zoom, y: old.y + dy * 130 / old.zoom }); }); }
    function focusSite(id) {
      var index = sites.findIndex(function (site) { return site.id === id; });
      if (index < 0) return;
      var point = sitePoint(sites[index], index);
      setCamera(fitCamera({ zoom: 2.5, x: point.x, y: point.y + (sites[index].type === 'wind' ? -45 : 10) }));
    }
    function mapKey(event) {
      if (event.target !== event.currentTarget) return;
      if (event.key === '+' || event.key === '=') zoomMap(0.5);
      else if (event.key === '-') zoomMap(-0.5);
      else if (event.key === 'Home' || event.key === 'Escape') setCamera({ zoom: 1, x: 550, y: 345 });
      else if (event.key === 'ArrowLeft') panMap(-1, 0);
      else if (event.key === 'ArrowRight') panMap(1, 0);
      else if (event.key === 'ArrowUp') panMap(0, -1);
      else if (event.key === 'ArrowDown') panMap(0, 1);
      else return;
      event.preventDefault();
    }
    function beginPan(event) {
      if (camera.zoom === 1 || event.button !== 0 || event.target.closest('[role="button"]')) return;
      var bounds = event.currentTarget.getBoundingClientRect();
      drag.current = { x: event.clientX, y: event.clientY, camera: camera, scale: 1100 / camera.zoom / Math.max(1, bounds.width) };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    function movePan(event) {
      if (!drag.current) return;
      var start = drag.current;
      setCamera(fitCamera({ zoom: start.camera.zoom, x: start.camera.x - (event.clientX - start.x) * start.scale, y: start.camera.y - (event.clientY - start.y) * start.scale }));
    }
    function endPan() { drag.current = null; }
    sites.forEach(function (site) {
      var asset = assetBySite[site.id], power = asset ? n(asset.power) : 0, localWind = windSpeed * (n(site.resource) || 1);
      var unavailable = !asset || asset.available === false || asset.status === 'service' || asset.status === 'fault' || asset.status === 'building';
      var rotating = asset && asset.type === 'wind' && !unavailable && power > 0 && localWind >= 3 && localWind < 25;
      liveTargets[site.id] = { power: power, rotor: rotating ? clamp(18 + (localWind - 3) * 7, 18, 80) : 0, stopMode: unavailable || localWind >= 25 ? 'braking' : 'coasting', service: !!asset && asset.status === 'service' };
    });
    liveTargets.town = { power: Math.max(0, n(frame.served)), rotor: 0 };
    targets.current = liveTargets;

    function paintFlow(id, flow, power, length) {
      var path = refs.current.paths[id], particles = refs.current.particles[id];
      if (!path || !particles) return;
      var appearance = flowAppearance(flow.magnitude), moving = power !== 0;
      if (length == null) length = path.getTotalLength();
      var group = refs.current.flowGroups[id];
      if (group) {
        group.setAttribute('data-flow-phase', flow.phase.toFixed(6));
        group.setAttribute('data-visual-magnitude', flow.magnitude.toFixed(6));
        group.setAttribute('data-flow-speed', appearance.speed.toFixed(6));
        group.setAttribute('data-flow-cycle-rate', (appearance.speed / Math.max(1, length)).toFixed(6));
        group.setAttribute('data-path-length', length.toFixed(3));
      }
      particles.forEach(function (particle, index) {
        if (!particle) return;
        particle.setAttribute('visibility', moving ? 'visible' : 'hidden');
        particle.setAttribute('opacity', moving ? appearance.opacity.toFixed(4) : '0');
        particle.setAttribute('r', appearance.radius.toFixed(4));
        var point = path.getPointAtLength(((flow.phase + index / FLOW_SLOTS) % 1) * length);
        particle.setAttribute('cx', point.x.toFixed(3)); particle.setAttribute('cy', point.y.toFixed(3));
      });
    }

    function paintWeather() {
      var breeze = motion.current.weatherWind, shape = windsockShape(breeze);
      refs.current.windsockFabric.forEach(function (node, index) { if (node) node.setAttribute('points', shape[index]); });
      if (refs.current.weatherResponse) {
        refs.current.weatherResponse.setAttribute('data-visual-wind', breeze.toFixed(6));
        refs.current.weatherResponse.setAttribute('data-target-wind', clamp(weather.current.wind, 0, 25).toFixed(6));
      }
      if (refs.current.ribbons) {
        refs.current.ribbons.setAttribute('stroke-dashoffset', -motion.current.breeze);
        refs.current.ribbons.setAttribute('opacity', clamp(breeze / 20, 0, 0.5).toFixed(4));
      }
      refs.current.clouds.forEach(function (node, index) { if (node) node.setAttribute('transform', 'translate(' + (((70 + index * 275 + motion.current.clouds + 130) % 1360) - 130).toFixed(2) + ' ' + (102 + index % 2 * 26) + ')'); });
      if (refs.current.windsock) refs.current.windsock.setAttribute('transform', 'rotate(' + (Math.sin(motion.current.flutter) * Math.min(breeze, 12) * 0.3).toFixed(2) + ')');
    }

    React.useEffect(function () {
      var alive = true, request = null, previous = null;
      var media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      function canMove() { return alive && requestedMotion && !(media && media.matches) && !document.hidden; }
      function tick(time) {
        request = null;
        if (!canMove()) { previous = null; return; }
        var dt = previous == null ? 0 : Math.min(0.08, Math.max(0, (time - previous) / 1000));
        previous = time;
        Object.keys(targets.current).forEach(function (id) {
          var target = targets.current[id], rotorNode = refs.current.rotors[id];
          if (rotorNode) {
            var rotor = motion.current.rotors[id] || (motion.current.rotors[id] = { speed: 0, phase: 18 });
            // Generator flow stops immediately; the rotor takes time to spin up or brake.
            var response = target.rotor ? rotor.speed < target.rotor ? 1.7 : 1.1 : target.stopMode === 'braking' ? 0.85 : 2.6;
            var decay = Math.exp(-dt / response), oldSpeed = rotor.speed;
            rotor.speed = target.rotor + (oldSpeed - target.rotor) * decay;
            rotor.phase = (rotor.phase + target.rotor * dt + (oldSpeed - target.rotor) * response * (1 - decay)) % 360;
            if (!target.rotor && rotor.speed < 0.02) rotor.speed = 0;
            rotorNode.setAttribute('transform', 'rotate(' + rotor.phase.toFixed(3) + ')');
            rotorNode.setAttribute('data-motion-rate', rotor.speed.toFixed(3));
            rotorNode.setAttribute('data-motion-mode', target.rotor ? rotor.speed < target.rotor * 0.9 ? 'starting' : 'generating' : rotor.speed > 0 ? target.stopMode : 'parked');
          }
          var beacon = refs.current.serviceBeacons[id], tool = refs.current.serviceTools[id];
          if (target.service && (beacon || tool)) {
            var work = motion.current.work[id] || (motion.current.work[id] = { phase: 0 });
            work.phase = (work.phase + dt * Math.PI * 2 / 3.2) % (Math.PI * 2);
            if (beacon) beacon.setAttribute('opacity', (0.32 + Math.sin(work.phase) * 0.1).toFixed(3));
            if (tool) tool.setAttribute('transform', 'rotate(' + (Math.sin(work.phase) * 8).toFixed(3) + ')');
          }
          var path = refs.current.paths[id], particles = refs.current.particles[id];
          if (path && particles) {
            var flow = motion.current.flows[id] || (motion.current.flows[id] = { phase: 0.12, magnitude: 0 });
            var magnitude = Math.abs(target.power), direction = target.power < 0 ? -1 : 1;
            flow.magnitude = magnitude ? flow.magnitude + (magnitude - flow.magnitude) * (1 - Math.exp(-dt / 0.24)) : 0;
            var length = path.getTotalLength();
            if (magnitude) flow.phase = (flow.phase + direction * flowAppearance(flow.magnitude).speed * dt / Math.max(1, length) + 1) % 1;
            paintFlow(id, flow, target.power, length);
          }
        });
        // One response drives the fabric and surrounding air; integrate its travel to avoid frame-rate-dependent drift.
        var breezeTarget = clamp(weather.current.wind, 0, 25), oldBreeze = motion.current.weatherWind, weatherDecay = Math.exp(-dt / 0.6);
        var windTravel = breezeTarget * dt + (oldBreeze - breezeTarget) * 0.6 * (1 - weatherDecay);
        motion.current.weatherWind = breezeTarget + (oldBreeze - breezeTarget) * weatherDecay;
        if (Math.abs(motion.current.weatherWind - breezeTarget) < 0.005) motion.current.weatherWind = breezeTarget;
        motion.current.breeze = (motion.current.breeze + windTravel * 1.8) % 70;
        motion.current.clouds = (motion.current.clouds + windTravel * 0.32) % 1360;
        motion.current.flutter = (motion.current.flutter + windTravel * 0.8) % (Math.PI * 2);
        paintWeather();
        request = window.requestAnimationFrame(tick);
      }
      function resume() {
        if (request != null) window.cancelAnimationFrame(request);
        request = null; previous = null;
        setNativeReduced(!!(media && media.matches));
        if (!requestedMotion || media && media.matches) {
          motion.current.weatherWind = clamp(weather.current.wind, 0, 25);
          paintWeather();
          Object.keys(targets.current).forEach(function (id) {
            var power = targets.current[id].power, flow = motion.current.flows[id];
            if (flow) { flow.magnitude = Math.abs(power); paintFlow(id, flow, power); }
          });
        }
        if (canMove()) request = window.requestAnimationFrame(tick);
      }
      document.addEventListener('visibilitychange', resume);
      if (media && media.addEventListener) media.addEventListener('change', resume);
      resume();
      return function () { alive = false; if (request != null) window.cancelAnimationFrame(request); document.removeEventListener('visibilitychange', resume); if (media && media.removeEventListener) media.removeEventListener('change', resume); };
    }, [requestedMotion]);

    // Reposition static packets after a manual hour change, including while motion is paused.
    React.useEffect(function () {
      Object.keys(targets.current).forEach(function (id) {
        var power = targets.current[id].power;
        var flow = motion.current.flows[id] || (motion.current.flows[id] = { phase: 0.12, magnitude: 0 });
        if (!active || !power) flow.magnitude = Math.abs(power);
        paintFlow(id, flow, power);
      });
      paintWeather();
    }, [frame, active]);

    function polygon(points, fill, extra) { return h('polygon', Object.assign({ points: points, fill: fill }, extra || {})); }
    function line(x1, y1, x2, y2, stroke, width, extra) { return h('line', Object.assign({ x1: x1, y1: y1, x2: x2, y2: y2, stroke: stroke, strokeWidth: width || 1 }, extra || {})); }
    function tree(x, y, scale, tint) { return h('g', { key: 'tree-' + x + '-' + y, transform: 'translate(' + x + ' ' + y + ') scale(' + (scale || 1) + ')' }, h('ellipse', { cx: 7, cy: 7, rx: 18, ry: 6, fill: '#254f4430' }), line(0, 4, 0, -17, '#6a5e47', 4), polygon('-19,-8 0,-43 19,-8', tint || '#3d785b'), polygon('-14,-24 0,-52 14,-24', '#56896a'), polygon('0,-52 14,-24 0,-28', '#366a55')); }
    function building(x, y, scale, roof, clinic) { return h('g', { key: 'house-' + x + '-' + y, transform: 'translate(' + x + ' ' + y + ') scale(' + (scale || 1) + ')' }, polygon('-30,-10 12,-27 39,-12 -3,6', roof || '#578697'), polygon('-30,-10 -3,6 -3,39 -30,23', '#d5d6bd'), polygon('-3,6 39,-12 39,20 -3,39', '#f1ebd1'), polygon('-3,-28 12,-37 39,-12 -3,6 -30,-10', roof || '#578697'), line(-3, 6, -3, 39, '#697e70', 1), h('rect', { x: -24, y: 6, width: 10, height: 11, fill: windowColor, transform: 'skewY(30)', 'data-tycoon-town-window': 'true' }), polygon('7,13 17,9 17,21 7,25', windowColor), polygon('24,6 33,2 33,14 24,18', windowColor), clinic ? h('g', { transform: 'translate(19 -2)' }, h('circle', { r: 10, fill: '#f5fbf1' }), h('path', { d: 'M -5 0 H 5 M 0 -5 V 5', stroke: '#1d7a6e', strokeWidth: 3 })) : null); }
    function panel(x, y) {
      var cells = [];
      function cellPoint(u, v) { return { x: -28 + 35 * u + 21 * v, y: -3 - 15 * u + 15 * v }; }
      for (var column = 1; column < 4; column++) {
        var top = cellPoint(column / 4, 0), bottom = cellPoint(column / 4, 1);
        cells.push(line(top.x, top.y, bottom.x, bottom.y, '#a3c9d4', 0.65, { key: 'column-' + column }));
      }
      for (var row = 1; row < 3; row++) {
        var left = cellPoint(0, row / 3), right = cellPoint(1, row / 3);
        cells.push(line(left.x, left.y, right.x, right.y, '#8eb6c9', 0.65, { key: 'row-' + row }));
      }
      return h('g', { key: 'panel-' + x + '-' + y, transform: 'translate(' + x + ' ' + y + ')', 'data-tycoon-panel-detail': true },
        polygon('-23,15 2,5 29,17 4,28', '#163f4930'),
        line(-14, 7, -14, 20, '#71868b', 2), line(18, -6, 18, 8, '#71868b', 2), line(-14, 19, 18, -5, '#84999b', 1.1),
        line(-19, 20, -9, 20, '#bac7bd', 2), line(14, 9, 22, 6, '#bac7bd', 2),
        polygon('-30,-3 7,-19 30,-3 30,0 -7,16 -30,0', '#6e8994'),
        polygon('-28,-3 7,-18 28,-3 -7,12', 'url(#' + uid + '-solar-glass)', { stroke: '#bdd5d9', strokeWidth: 1.25 }),
        h('g', { opacity: night ? 0.58 : 0.78, 'data-tycoon-cell-grid': true }, cells),
        polygon('-28,-3 7,-18 15,-12 -20,3', '#d2f0eb', { opacity: night ? 0.035 : clamp(irradiance * 0.17, 0.035, 0.2) }),
        line(-7, 13, 29, -2, '#d2e2dc', 1.2), line(-29, -2, -7, 13, '#8eabb3', 1));
    }
    function solar(site, asset) {
      var rooftop = /roof/.test(site.id), panels = [];
      for (var row = 0; row < 2; row++) for (var col = 0; col < 3; col++) if (asset.status !== 'building' || buildStage === 'checks' || buildStage === 'assembly' && row === 0) panels.push(panel(-42 + col * 35 + row * 25, -23 + row * 21 - col * 15));
      return h('g', { 'data-tycoon-material': 'solar' }, h('ellipse', { cx: 7, cy: 7, rx: 88, ry: 24, fill: '#1f4d4933' }), rooftop ? h('g', null, polygon('-83,-21 18,-64 91,-18 -10,26', '#abb8ad'), polygon('-83,-21 -10,26 -10,42 -83,-4', '#b6b8a5'), polygon('-10,26 91,-18 91,0 -10,42', '#e0dcc5'), polygon('16,20 27,15 27,25 16,30', '#527f8a'), polygon('49,6 60,1 60,11 49,16', '#527f8a'), line(-80, -18, -10, 28, '#d1d5bd', 1.4), line(-10, 28, 88, -15, '#eef0d4', 1.3), line(76, -7, 76, 7, '#718b84', 2)) : null, h('g', { transform: rooftop ? 'translate(0 -16)' : undefined }, panels));
    }
    function wind(site, asset) {
      var cached = motion.current.rotors[site.id], phase = cached ? cached.phase : 18;
      var target = liveTargets[site.id], mode = target.rotor ? cached && cached.speed >= target.rotor * 0.9 ? 'generating' : 'starting' : cached && cached.speed > 0 ? target.stopMode : 'parked';
      return h('g', { 'data-tycoon-material': 'wind' },
        h('ellipse', { cx: 32, cy: 3, rx: 64, ry: 11, fill: '#173d423b', transform: 'rotate(-12)' }),
        h('ellipse', { cy: 8, rx: 20, ry: 8, fill: '#617c73' }), h('ellipse', { cy: 4, rx: 20, ry: 8, fill: '#b5bfb0', stroke: '#7c9689', strokeWidth: 1.5 }),
        [[-13,2],[-7,8],[9,7],[14,0]].map(function (point, index) { return h('circle', { key: index, cx: point[0], cy: point[1], r: 1.4, fill: '#526d68', stroke: '#d3d8c4', strokeWidth: 0.5 }); }),
        polygon('-8,2 8,2 4,-103 -4,-103', 'url(#' + uid + '-tower)'),
        h('path', { d: 'M -6 -29 Q 0 -26 6 -29 M -5 -65 Q 0 -63 5 -65', fill: 'none', stroke: '#789994', strokeWidth: 0.7, opacity: 0.65 }),
        h('path', { d: 'M -3 -5 V -18 Q -3 -23 2 -22 L 3 -5 Z', fill: '#b3c8bf', stroke: '#698a86', strokeWidth: 0.75 }), line(1, -14, 1, -10, '#547573', 0.9),
        h('ellipse', { cy: -96, rx: 6, ry: 2.8, fill: '#88a6a0', stroke: '#cadbd0', strokeWidth: 0.8 }),
        polygon('-3,-108 20,-115 26,-110 3,-102', '#dfebe0', { stroke: '#b4c9c1', strokeWidth: 0.65 }), polygon('3,-102 26,-110 26,-100 3,-92', 'url(#' + uid + '-nacelle)'),
        [0,1,2,3].map(function (index) { return line(12 + index * 3, -103 - index, 12 + index * 3, -98 - index, '#73918a', 1, { key: index }); }),
        line(6, -102, 24, -108, '#e1eee0', 0.75),
        h('g', { transform: 'translate(0 -103)' }, h('g', { ref: function (node) { refs.current.rotors[site.id] = node; }, transform: 'rotate(' + phase + ')', 'data-tycoon-rotor': site.id, opacity: asset.status === 'building' && buildStage === 'assembly' ? 0.12 : 1, 'data-motion-rate': cached ? cached.speed : 0, 'data-motion-mode': active ? mode : 'paused', 'data-local-wind': (windSpeed * (n(site.resource) || 1)).toFixed(2) }, [0, 120, 240].map(function (angle) { return h('g', { key: angle, transform: 'rotate(' + angle + ')' }, h('path', { d: 'M -4 0 C -10 -22 -5 -53 2 -73 Q 5 -78 7 -73 L 6 -14 L 3 2 Z', fill: '#eff5e9', stroke: '#9aafb0', strokeWidth: 0.9 }), h('path', { d: 'M 2 -73 L 6 -14 L 3 2 L 0 -9 Z', fill: '#c7d9d5' })); })), h('circle', { r: 8, fill: 'url(#' + uid + '-nacelle)', stroke: '#6e8c8f', strokeWidth: 1.5 }), h('circle', { r: 5.5, fill: 'none', stroke: '#e1ece0', strokeWidth: 0.8 }), h('circle', { r: 2.5, fill: '#f2f5e9' })),
        line(-12, 7, 12, 7, '#d5dfce', 2));
    }
    function windsock() {
      var breeze = motion.current.weatherWind, shape = windsockShape(breeze);
      return h('g', { ref: function (node) { refs.current.weatherResponse = node; }, transform: 'translate(952 245)', 'data-tycoon-windsock': true, 'data-tycoon-weather-response': true, 'data-visual-wind': breeze, 'data-target-wind': clamp(windSpeed, 0, 25) },
        h('ellipse', { cy: 46, rx: 14, ry: 5, fill: '#234c4230' }), line(0, 46, 0, -7, '#e0e8d3', 3),
        h('g', { ref: function (node) { refs.current.windsock = node; }, transform: 'rotate(' + (Math.sin(motion.current.flutter) * Math.min(breeze, 12) * 0.3).toFixed(2) + ')' },
          shape.map(function (points, index) { return polygon(points, index ? '#fff1d4' : '#efb065', { key: index, ref: function (node) { refs.current.windsockFabric[index] = node; }, 'data-tycoon-windsock-fabric': index }); }),
          h('ellipse', { rx: 2.8, cy: 1, ry: 6, fill: '#ce9558', stroke: '#fff1d4', strokeWidth: 1 })));
    }
    function battery(site, asset) {
      var fill = clamp(n(asset.stored) / Math.max(1, n(asset.capacity)), 0, 1), strips = [];
      for (var i = 0; i < 6; i++) {
        var cellFill = clamp(fill * 6 - i, 0, 1), x = 3 + i * 8, y = 4 - i * 2.84;
        strips.push(h('g', { key: i, 'data-tycoon-battery-cell': site.id, 'data-cell': i, 'data-fill': cellFill },
          polygon(x + ',' + y + ' ' + (x + 6) + ',' + (y - 2.15) + ' ' + (x + 6) + ',' + (y + 16.85) + ' ' + x + ',' + (y + 19), '#345e65'),
          cellFill > 0 ? polygon(x + ',' + y + ' ' + (x + 6 * cellFill) + ',' + (y - 2.15 * cellFill) + ' ' + (x + 6 * cellFill) + ',' + (y + 19 - 2.15 * cellFill) + ' ' + x + ',' + (y + 19), '#7ce2b5') : null));
      }
      var indicatorState = asset.status === 'fault' ? 'fault' : asset.available === false || asset.status === 'service' || asset.status === 'building' ? 'isolated' : n(asset.power) < 0 ? 'charge' : n(asset.power) > 0 ? 'export' : 'idle';
      var indicatorColor = { charge: '#b8a8f9', export: '#ffe6a0', idle: '#9cb6b5', isolated: '#ffca72', fault: '#ff9a87' }[indicatorState];
      return h('g', { 'data-tycoon-material': 'battery' },
        h('ellipse', { cx: 15, cy: 26, rx: 66, ry: 17, fill: '#173c4145' }),
        polygon('-53,14 -6,41 67,15 67,20 -6,46 -53,19', '#758d81'), polygon('-53,14 16,-11 67,15 -6,41', '#adb9a7', { stroke: '#829c8b', strokeWidth: 0.8 }),
        polygon('-47,-27 20,-51 61,-27 -6,-3', '#c6ded8', { stroke: '#8eb7af', strokeWidth: 1 }), polygon('-47,-27 -6,-3 -6,36 -47,12', 'url(#' + uid + '-cabinet-side)'), polygon('-6,-3 61,-27 61,12 -6,36', '#427c80'),
        polygon('-43,-20 -10,-1 -10,29 -43,10', 'none', { stroke: '#365f65', strokeWidth: 0.8 }), line(-28, -11, -28, 19, '#446f72', 0.7),
        [0,1,2,3].map(function (index) { return line(-39, -11 + index * 3, -32, -7 + index * 3, '#b2c8bb', 1.2, { key: index }); }),
        line(-14, 10, -14, 16, '#d0ded0', 1.5), line(-40, 9, -33, 13, '#a4b9a9', 1),
        polygon('0,1 56,-19 56,10 0,30', '#163f4b', { stroke: '#8ab4aa', strokeWidth: 0.7 }), strips,
        polygon('-42,-24 21,-46 55,-27 -8,-6', 'url(#' + uid + '-cabinet-top)'), line(-42, -24, -8, -6, '#d6e8da', 1), line(-8, -6, 55, -27, '#cae0d3', 1.2),
        line(-28, -29, 26, -34, '#719b94', 1.1), line(-22, -30, -16, -32, '#e1eee0', 1.5), line(18, -36, 24, -38, '#e1eee0', 1.5),
        h('g', { 'data-tycoon-battery-indicator': site.id, 'data-state': indicatorState, 'aria-hidden': true },
          h('circle', { cx: -31, cy: 5, r: 5.5, fill: '#284d52', stroke: '#8aa8a2', strokeWidth: 0.7 }),
          h('circle', { cx: -31, cy: 5, r: 3.6, fill: indicatorColor }),
          h('path', { d: indicatorState === 'charge' ? 'M -35 16 H -27 M -30 13 L -27 16 L -30 19' : indicatorState === 'export' ? 'M -27 16 H -35 M -32 13 L -35 16 L -32 19' : indicatorState === 'fault' ? 'M -31 13 V 16 M -31 18 V 19' : indicatorState === 'isolated' ? 'M -34 13 L -28 19 M -28 13 L -34 19' : 'M -34 16 H -28', fill: 'none', stroke: indicatorColor, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' })));
    }
    function connectionInfo(asset) {
      if (!asset) return null;
      var status = asset.status || 'idle', power = n(asset.power);
      var isolated = asset.available === false || status === 'fault' || status === 'service' || status === 'building';
      var label = isolated ? t('renewables.tycoon.scene.connectionIsolated', 'Grid connection isolated') : t('renewables.tycoon.scene.connectionAvailable', 'Grid connection available');
      var detail = isolated ? status === 'fault' ? t('renewables.tycoon.scene.connectionRepair', 'Repair needed') : status === 'service' ? t('renewables.tycoon.scene.connectionService', 'Planned service isolation') : status === 'building' ? t('renewables.tycoon.scene.connectionBuilding', 'Construction in progress') : t('renewables.tycoon.scene.connectionUnavailable', 'Unavailable this hour')
        : power < 0 ? t('renewables.tycoon.scene.connectionCharging', 'Grid → battery') + ' · ' + formatPower(power)
          : power > 0 ? (asset.type === 'battery' ? t('renewables.tycoon.scene.connectionDischarging', 'Battery → grid') : t('renewables.tycoon.scene.connectionGenerating', 'Equipment → grid')) + ' · ' + formatPower(power)
            : t('renewables.tycoon.scene.connectionIdle', 'Connected · no power this hour');
      return { state: isolated ? 'isolated' : 'connected', reason: status, label: label, detail: detail, isolated: isolated };
    }
    function connectionCabinet(site, asset) {
      var connection = connectionInfo(asset), indicator = connection.isolated ? asset.status === 'fault' ? '#ffae91' : '#ffda87' : '#a9e7bd';
      // The contact follows the selected hour immediately; idle equipment stays connected.
      return h('g', { transform: 'translate(10 22)', 'data-tycoon-connection': site.id, 'data-state': connection.state, 'data-reason': connection.reason, 'aria-hidden': true, pointerEvents: 'none' },
        h('ellipse', { cx: 3, cy: 13, rx: 22, ry: 6, fill: '#244c5345' }),
        polygon('-14,-21 -5,-26 22,-26 13,-21', '#d3ded2', { stroke: '#547274', strokeWidth: 0.8 }),
        polygon('13,-21 22,-26 22,4 13,10', '#6d8d8c', { stroke: '#466a6b', strokeWidth: 0.8 }),
        h('rect', { x: -14, y: -21, width: 27, height: 31, rx: 1.5, fill: '#b0c6bf', stroke: '#547274', strokeWidth: 0.8 }),
        h('rect', { x: -11, y: -18, width: 22, height: 20, rx: 2, fill: '#214149', stroke: '#71948d', strokeWidth: 0.8 }),
        line(-11, -7, -7, -7, '#dce9db', 1.8), line(7, -7, 11, -7, '#dce9db', 1.8),
        h('circle', { cx: -7, cy: -7, r: 1.7, fill: '#e8efd7' }), h('circle', { cx: 7, cy: -7, r: 1.7, fill: '#e8efd7' }),
        h('g', { transform: 'translate(-7 -7)' }, line(0, 0, 14, 0, indicator, 2.2, { transform: connection.isolated ? 'rotate(-42)' : 'rotate(0)', 'data-tycoon-contact': site.id, 'data-state': connection.state, strokeLinecap: 'round' })),
        h('text', { x: -0.5, y: 7, textAnchor: 'middle', fontSize: 5.5, fontWeight: 800, fill: '#214149' }, connection.isolated ? t('renewables.tycoon.scene.contactOpen', 'OPEN') : t('renewables.tycoon.scene.contactClosed', 'CLOSED')),
        h('ellipse', { cx: 17, cy: -15, rx: 2.6, ry: 3.2, fill: indicator, stroke: asset.status === 'fault' ? '#8b4438' : '#365859', strokeWidth: 1.2 }),
        asset.status === 'fault' ? h('path', { d: 'M 17 -6 V -1 M 17 1 V 2', stroke: '#ffe1cf', strokeWidth: 1.5, strokeLinecap: 'round' }) : null);
    }
    function serviceVan(x, y, site) {
      var phase = motion.current.work[site.id] ? motion.current.work[site.id].phase : 0;
      return h('g', { transform: 'translate(' + x + ' ' + y + ')' }, polygon('-20,-8 4,-18 22,-8 -2,2', '#f5d37d'), polygon('-20,-8 -2,2 -2,17 -20,7', '#c99345'), polygon('-2,2 22,-8 22,7 -2,17', '#eab95e'), polygon('7,-3 17,-7 17,0 7,4', '#376d7a'), h('ellipse', { cx: 3, cy: 15, rx: 4, ry: 5, fill: '#2e4c53' }), h('ellipse', { cx: 17, cy: 9, rx: 4, ry: 5, fill: '#2e4c53' }), line(-12, 0, -6, 3, '#fff7dd', 3),
        h('circle', { ref: function (node) { refs.current.serviceBeacons[site.id] = node; }, cx: 3, cy: -18, r: 9, fill: '#ffd77a', opacity: (0.32 + Math.sin(phase) * 0.1).toFixed(3), 'data-tycoon-service-beacon': site.id }),
        h('rect', { x: -1, y: -21, width: 8, height: 4, rx: 2, fill: '#ffe4a0', stroke: '#72583d', strokeWidth: 1 }));
    }
    function serviceProp() {
      if (serviceStage === 'service') return h('path', { d: 'M 0 3 L 0 -6 M 0 -6 L -3 -10 M 0 -6 L 3 -10', fill: 'none', stroke: '#e5f0e6', strokeWidth: 2.2, strokeLinecap: 'round' });
      return h('g', null,
        h('rect', { x: -5, y: -12, width: 12, height: 17, rx: 1.5, fill: '#e8e9cd', stroke: '#536c67', strokeWidth: 1 }),
        h('rect', { x: -2, y: -14, width: 6, height: 4, rx: 1, fill: '#829a8d' }),
        serviceStage === 'checks' ? h('path', { d: 'M -2 -5 L 0 -2 L 5 -8 M -2 1 H 4', fill: 'none', stroke: '#246e53', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }) : h('g', null, line(-2, -6, 4, -6, '#648178', 1), line(-2, -2, 4, -2, '#648178', 1), h('circle', { cx: 3, cy: 2, r: 1.5, fill: 'none', stroke: '#648178', strokeWidth: 1 })));
    }
    function serviceWorksite(site) {
      var phase = motion.current.work[site.id] ? motion.current.work[site.id].phase : 0;
      function cone(x, y) { return h('g', { key: x, transform: 'translate(' + x + ' ' + y + ')' }, h('ellipse', { cy: 2, rx: 7, ry: 3, fill: '#744d30' }), polygon('-5,1 0,-12 5,1', '#e7a25b'), line(-2, -5, 2, -5, '#fff2cf', 2)); }
      return h('g', { 'data-tycoon-service-worksite': site.id, 'data-stage': serviceStage, 'data-elapsed': serviceElapsed, 'data-remaining': serviceRemaining, 'data-return-hour': 48, 'data-animation': active ? 'on' : 'off', 'aria-hidden': true, pointerEvents: 'none' },
        h('path', { d: 'M -77 14 L -10 43 L 80 17', fill: 'none', stroke: '#f3d48e', strokeWidth: 2, strokeDasharray: '5 5', opacity: 0.85 }),
        cone(-77, 14), cone(-10, 43), cone(80, 17), serviceVan(54, 17, site),
        h('g', { transform: 'translate(-45 23)' }, h('ellipse', { cx: 1, cy: 4, rx: 11, ry: 4, fill: '#244c5340' }), line(-3, -2, -5, 6, '#284c55', 4), line(3, -2, 6, 5, '#284c55', 4), h('path', { d: 'M -4 -13 Q 0 -16 5 -12 L 6 -2 H -5 Z', fill: '#efbc66', stroke: '#8d6b42', strokeWidth: 0.8 }), line(-3, -9, 4, -9, '#fff3ca', 2), h('circle', { cy: -19, r: 4, fill: '#cf9f76' }), h('path', { d: 'M -5 -20 Q -4 -27 2 -25 Q 6 -24 5 -20 Z', fill: '#fff0ba', stroke: '#9c874e', strokeWidth: 0.8 }), line(3, -12, 10, -8, '#efbc66', 3),
          h('g', { transform: 'translate(10 -8)' }, h('g', { ref: function (node) { refs.current.serviceTools[site.id] = node; }, transform: 'rotate(' + (Math.sin(phase) * 8).toFixed(3) + ')', 'data-tycoon-service-tool': site.id, 'data-stage': serviceStage, 'data-tool': serviceStage === 'service' ? 'wrench' : serviceStage === 'checks' ? 'checklist' : 'clipboard' }, serviceProp()))),
        h('g', { transform: 'translate(54 -28)' }, h('rect', { x: -25, y: -10, width: 50, height: 18, rx: 5, fill: '#294a4c', stroke: '#dfc38e', strokeWidth: 1 }), h('text', { y: 0, textAnchor: 'middle', fill: '#ffe5ad', fontSize: 9, fontWeight: 700 }, serviceElapsed + '/48h'), h('rect', { x: -19, y: 3, width: 38, height: 2, rx: 1, fill: '#78918a' }), h('rect', { x: -19, y: 3, width: 38 * serviceElapsed / 48, height: 2, rx: 1, fill: '#ffe1a0' })));
    }
    function buildOpening(siteId) {
      var planned = (campaign.assets || []).find(function (asset) { return asset.siteId === siteId; });
      var readyMonth = planned && planned.readyMonth, engine = window.StemLab.renewablesTycoonEngine;
      return { month: readyMonth, label: engine && engine.months && engine.months[readyMonth] || t('renewables.tycoon.scene.nextMonth', 'next month') };
    }
    function construction(site) {
      var groundwork = buildStage === 'groundwork', assembly = buildStage === 'assembly';
      function foundation() {
        if (site.type === 'wind') return h('g', null, h('ellipse', { cy: 4, rx: 29, ry: 13, fill: '#c3c6b6', stroke: '#72877e', strokeWidth: 2 }), [[-15,0],[0,-6],[15,0],[0,8]].map(function (bolt, index) { return line(bolt[0], bolt[1] - 10, bolt[0], bolt[1], '#7e908b', 2.5, { key: index }); }));
        if (site.type === 'battery') return h('g', null, polygon('-55,-5 17,-32 62,-6 -10,24', '#bfc5b3', { stroke: '#6c867d', strokeWidth: 1.5 }), line(-37, -3, -5, 15, '#6b887f', 2), line(6, -19, 37, -2, '#6b887f', 2), h('path', { d: 'M 35 8 L 48 15 L 49 25', fill: 'none', stroke: '#536e68', strokeWidth: 3 }));
        return h('g', null, polygon('-66,-4 18,-39 63,-11 -22,25', '#c1bc9b', { stroke: '#7d8872', strokeWidth: 1 }), [-29,0,29].map(function (offset) { return h('g', { key: offset, transform: 'translate(' + offset + ' ' + (-offset * 0.42) + ')' }, line(-14, 7, -14, -7, '#a8b8ac', 2), line(14, -5, 14, -19, '#a8b8ac', 2), line(-14, -7, 14, -19, '#d7dfcc', 3)); }));
      }
      function load() {
        if (site.type === 'wind') return h('path', { d: 'M 60 -36 Q 43 -35 24 -26 L 25 -22 L 60 -29 Z', fill: '#e6eee2', stroke: '#91aaa3', strokeWidth: 1 });
        if (site.type === 'battery') return h('g', null, polygon('45,-30 59,-35 70,-29 56,-24', '#c7d8ce'), polygon('45,-30 56,-24 56,-12 45,-18', '#799d93'), polygon('56,-24 70,-29 70,-17 56,-12', '#467d7a'), line(61,-23,61,-17,'#a1d8bc',1.5), line(66,-25,66,-19,'#a1d8bc',1.5));
        return h('g', null, polygon('42,-29 61,-37 75,-29 56,-21', '#25567b', { stroke: '#b8d7d8', strokeWidth: 1 }), line(52, -32, 65, -25, '#7daec1', 1), line(49, -25, 68, -33, '#7daec1', 1));
      }
      return h('g', { 'data-tycoon-build': site.id, 'data-stage': buildStage, 'data-progress': buildProgress, 'data-type': site.type, 'aria-hidden': true, pointerEvents: 'none' },
        groundwork ? foundation() : null,
        line(-63, 17, -11, 40, '#d5b277', 4), line(-56, 11, -56, 29, '#f6db9b', 3), line(-18, 28, -18, 46, '#f6db9b', 3),
        polygon('65,22 73,6 81,22', '#e99a51'), line(69, 15, 77, 15, '#fff3d1', 3),
        assembly ? h('g', null, h('g', { transform: 'translate(38 -4)' }, line(0, 0, 0, -72, '#dca954', 5), line(-24, -64, 42, -64, '#dca954', 4), line(0, -78, 42, -64, '#e8c783', 2), line(21, -64, 21, -31, '#667873', 2), h('path', { d: 'M 21 -31 v 5 q 6 4 6 -2', stroke: '#4b6361', fill: 'none', strokeWidth: 2 })), load()) : null,
        groundwork ? h('g', { transform: 'translate(54 9)' }, polygon('-15,0 2,-7 17,1 0,8', '#8d7953'), polygon('-15,0 0,8 0,18 -15,10', '#a38b5d'), polygon('0,8 17,1 17,11 0,18', '#bea56c'), line(-8, 3, 8, 11, '#e0c88e', 2)) : null,
        buildStage === 'checks' ? h('g', { transform: 'translate(59 -14)' }, h('rect', { x: -8, y: -15, width: 18, height: 24, rx: 2, fill: '#e8e8ce', stroke: '#5a786c', strokeWidth: 1.5 }), h('rect', { x: -3, y: -18, width: 8, height: 5, rx: 1, fill: '#809b8a' }), h('path', { d: 'M -4 -7 L -1 -3 L 6 -10 M -4 2 H 5', fill: 'none', stroke: '#4d7162', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })) : null);
    }
    function flow(id, path, power, installed, cable) {
      var moving = Math.abs(power) > 0, color = power < 0 ? '#c5a5ff' : '#ffe5a0';
      var selected = !!installed && props.selectedId === id, cached = motion.current.flows[id];
      var visualMagnitude = moving ? active ? cached ? cached.magnitude : 0 : Math.abs(power) : 0;
      var appearance = flowAppearance(visualMagnitude);
      var directionCues = selected && moving && cable ? [0.32, 0.67].map(function (position) {
        var remaining = 1 - position;
        var x = remaining * remaining * cable.x0 + 2 * remaining * position * cable.x1 + position * position * cable.x2;
        var y = remaining * remaining * cable.y0 + 2 * remaining * position * cable.y1 + position * position * cable.y2;
        var dx = 2 * remaining * (cable.x1 - cable.x0) + 2 * position * (cable.x2 - cable.x1);
        var dy = 2 * remaining * (cable.y1 - cable.y0) + 2 * position * (cable.y2 - cable.y1);
        var angle = Math.atan2(dy, dx) * 180 / Math.PI + (power < 0 ? 180 : 0);
        return h('g', { key: position, transform: 'translate(' + x.toFixed(3) + ' ' + y.toFixed(3) + ') rotate(' + angle.toFixed(3) + ')', 'data-tycoon-flow-cue': id, 'data-position': position, 'data-direction': power < 0 ? 'to-storage' : 'to-grid', pointerEvents: 'none' }, polygon('-5,-4 1,0 -5,4 -2,0', color, { stroke: '#20484e', strokeWidth: 0.9, strokeLinejoin: 'round' }));
      }) : null;
      return h('g', { key: 'flow-' + id, ref: function (node) { refs.current.flowGroups[id] = node; }, 'data-tycoon-flow': id, 'data-power': power, 'data-direction': !power ? 'idle' : power < 0 ? 'to-storage' : id === 'town' ? 'to-community' : 'to-grid', 'data-slot-count': FLOW_SLOTS, 'data-selected': selected, 'data-flow-phase': cached ? cached.phase : 0.12, 'data-visual-magnitude': visualMagnitude, 'data-flow-speed': appearance.speed, 'aria-hidden': true },
        selected ? h('path', { d: path, fill: 'none', stroke: '#c6f7e0', strokeWidth: 12, opacity: 0.32, 'data-tycoon-selected-cable': id }) : null,
        h('path', { d: path, fill: 'none', stroke: installed ? '#2b5a59' : '#73948a', strokeWidth: installed ? 7 : 2, strokeDasharray: installed ? undefined : '3 7', opacity: installed ? 0.65 : 0.45 }),
        h('path', { ref: function (node) { refs.current.paths[id] = node; }, d: path, fill: 'none', stroke: moving ? power < 0 ? '#8e6ad0' : '#cba954' : '#74948b', strokeWidth: moving ? selected ? 4.5 : 3.5 : selected ? 2.3 : 1.3, markerEnd: power > 0 ? 'url(#' + uid + '-arrow)' : undefined, markerStart: power < 0 ? 'url(#' + uid + '-charge-arrow)' : undefined, opacity: installed ? 1 : 0 }),
        directionCues,
        Array.from({ length: FLOW_SLOTS }, function (_, index) { return h('circle', { key: index, ref: function (node) { if (!refs.current.particles[id]) refs.current.particles[id] = []; refs.current.particles[id][index] = node; }, cx: 0, cy: 0, r: appearance.radius, opacity: appearance.opacity, fill: color, visibility: moving ? 'visible' : 'hidden', 'data-tycoon-packet': id, 'data-slot': index, style: { pointerEvents: 'none' } }); }));
    }
    var skyTop = night ? '#10283b' : overcast ? '#658997' : dawn ? '#b9adad' : '#8cc7d2';
    var skyBottom = night ? '#274858' : overcast ? '#afc9c7' : dawn ? '#f0d1ae' : '#deeee1';
    var statusText = { building: t('renewables.tycoon.scene.building', 'Under construction'), service: t('renewables.tycoon.scene.service', 'Crew on site'), fault: t('renewables.tycoon.scene.fault', 'Repair needed'), operating: t('renewables.tycoon.scene.operating', 'Operating'), idle: t('renewables.tycoon.scene.idle', 'Idle') };
    var title = t('renewables.tycoon.scene.title', 'Your coastal renewable network');
    var description = t('renewables.tycoon.scene.description', 'Select a site to inspect, acquire, or maintain equipment. Gold packets show electricity delivered toward the grid; violet packets show battery charging. Motion is illustrative; displayed power comes from the hourly simulation.');
    description += ' ' + t('renewables.tycoon.scene.dispatchDescription', 'The network board separates demand served, unmet demand, and curtailed generation that is not used. Generator flows show production before network dispatch.');
    var conditionHeading = t('renewables.tycoon.scene.conditionHour', 'Condition at selected hour');
    if (overlay === 'condition') description += ' ' + t('renewables.tycoon.scene.conditionDescription', 'Equipment labels show condition percentages and bars at the selected simulation hour. Repair, service, and construction labels show availability separately.');
    var selectedAsset = assetBySite[props.selectedId], selectedSite = sites.find(function (site) { return site.id === props.selectedId; });
    var canInspectEquipment = !!selectedAsset && !!selectedSite && typeof props.onInspectEquipment === 'function';
    var selectedConnection = connectionInfo(selectedAsset);
    var selectedOpening = selectedSite ? buildOpening(selectedSite.id) : null;
    var selectedBattery = selectedAsset && selectedAsset.type === 'battery' ? selectedAsset : null;
    var selectedCapacity = selectedBattery ? Math.max(0, n(selectedBattery.capacity)) : 0;
    var selectedStored = selectedBattery ? clamp(selectedBattery.stored, 0, selectedCapacity) : 0;
    var selectedFill = selectedCapacity ? selectedStored / selectedCapacity : 0;
    var displayedPolicy = campaign.phase === 'planning' ? campaign.policy : campaign.lastRun && campaign.lastRun.policy || campaign.policy;
    var reserveFraction = clamp(displayedPolicy && displayedPolicy.reserve, 0, 0.5);
    var serviceElapsedText = serviceElapsed + ' ' + t('renewables.tycoon.scene.serviceElapsed', 'of 48 hours elapsed');
    var serviceRemainingText = serviceRemaining + ' ' + (serviceRemaining === 1 ? t('renewables.tycoon.scene.serviceOneHourLeft', 'hour remaining') : t('renewables.tycoon.scene.serviceHoursLeft', 'hours remaining'));
    var serviceReturnText = t('renewables.tycoon.scene.serviceReturn', 'Returns day 3 at 00:00');
    var serviceContext = props.state && props.state.phase !== 'planning' ? t('renewables.tycoon.scene.serviceReplayHour', 'At replay hour') : t('renewables.tycoon.scene.serviceForecastHour', 'At forecast hour');
    var serviceStageContext = props.state && props.state.phase !== 'planning' ? t('renewables.tycoon.scene.stagesReplay', 'Illustrative work stages · replay hour') : t('renewables.tycoon.scene.stagesForecast', 'Illustrative work stages · forecast hour');
    // Labels occupy a fixed amount of screen space; equipment alone grows with the camera.
    // Close-ups prioritize the selected or keyboard-focused site and keep its equipment clear.
    var labelLayouts = {}, labelSubjectId = focusedSiteId || props.selectedId;
    var cameraLeft = camera.x - 550 / camera.zoom, cameraTop = camera.y - 345 / camera.zoom;
    var subjectIndex = sites.findIndex(function (site) { return site.id === labelSubjectId; });
    var subjectSite = subjectIndex >= 0 ? sites[subjectIndex] : null;
    var subjectPoint = subjectSite ? sitePoint(subjectSite, subjectIndex) : null;
    var subjectBox = subjectPoint ? { left: (subjectPoint.x - 97 - cameraLeft) * camera.zoom, right: (subjectPoint.x + 97 - cameraLeft) * camera.zoom, top: (subjectPoint.y - (subjectSite.type === 'wind' ? 183 : 100) - cameraTop) * camera.zoom, bottom: (subjectPoint.y + 46 - cameraTop) * camera.zoom } : null;
    var occupiedLabels = [];
    function boxesOverlap(a, b) { return a.left < b.right + 6 && a.right > b.left - 6 && a.top < b.bottom + 6 && a.bottom > b.top - 6; }
    sites.map(function (site, index) {
      var point = sitePoint(site, index);
      return { site: site, point: point, distance: Math.abs(point.x - camera.x) + Math.abs(point.y - camera.y) };
    }).sort(function (a, b) {
      if (a.site.id === labelSubjectId) return -1;
      if (b.site.id === labelSubjectId) return 1;
      return a.distance - b.distance;
    }).forEach(function (entry) {
      var site = entry.site, point = entry.point, subject = site.id === labelSubjectId;
      var x = (point.x - cameraLeft) * camera.zoom, y = (point.y + 49 - cameraTop) * camera.zoom;
      var box = { left: x - 80, right: x + 80, top: y - 2, bottom: y + 41 };
      var visible = camera.zoom === 1 || (box.left >= 8 && box.right <= 1092 && box.top >= 8 && box.bottom <= 682 && (subject || !!assetBySite[site.id] && (!subjectBox || !boxesOverlap(box, subjectBox)) && !occupiedLabels.some(function (other) { return boxesOverlap(box, other); })));
      labelLayouts[site.id] = { visible: visible, priority: site.id === focusedSiteId ? 'focused' : site.id === props.selectedId ? 'selected' : 'nearby' };
      if (visible) occupiedLabels.push(box);
    });
    var siteLabels = [];
    var siteGroups = sites.slice().sort(function (a, b) { return sitePoint(a, 0).y - sitePoint(b, 0).y; }).map(function (site, index) {
      var point = sitePoint(site, index), asset = assetBySite[site.id], selected = props.selectedId === site.id;
      var status = asset ? asset.status || 'idle' : 'available', power = asset ? n(asset.power) : 0;
      var statusLabel = asset ? statusText[status] || statusText.idle : t('renewables.tycoon.scene.available', 'Available site');
      var localWind = windSpeed * (n(site.resource) || 1);
      if (asset && asset.type === 'wind' && status === 'idle') statusLabel = localWind >= 25 ? t('renewables.tycoon.scene.cutOut', 'High-wind shutdown') : localWind < 3 ? t('renewables.tycoon.scene.cutIn', 'Below starting wind') : statusLabel;
      if (asset && asset.type === 'solar' && status === 'idle' && irradiance <= 0) statusLabel = t('renewables.tycoon.scene.noSun', 'Waiting for sunlight');
      var label = site.name + '. ' + statusLabel + (asset ? '. ' + (power < 0 ? t('renewables.tycoon.scene.charging', 'Charging') + ' ' : '') + formatPower(power) : '');
      if (asset) label += '. ' + connectionInfo(asset).label;
      if (status === 'service') label += '. ' + serviceContext + ': ' + serviceElapsedText + ', ' + serviceRemainingText + '. ' + serviceReturnText + '. ' + t('renewables.tycoon.scene.illustrativeStage', 'Illustrative work stage') + ': ' + serviceStageLabel;
      if (status === 'building') label += '. ' + t('renewables.tycoon.scene.illustrativeBuildStage', 'Illustrative construction stage') + ': ' + buildStageLabel + '. ' + t('renewables.tycoon.scene.opens', 'Opens') + ' ' + buildOpening(site.id).label;
      var condition = asset && Number.isFinite(Number(asset.condition)) ? clamp(asset.condition, 0, 100) : null;
      var showCondition = overlay === 'condition' && condition !== null;
      if (showCondition) label += '. ' + conditionHeading + ': ' + Math.round(condition) + '%';
      var color = status === 'fault' ? '#ffc3ac' : status === 'service' || status === 'building' ? '#ffe2a1' : selected ? '#dafff1' : '#d0e7da';
      var labelLine = status === 'operating' || status === 'idle' && power ? power < 0 ? t('renewables.tycoon.scene.charging', 'Charging') + ' ' + formatPower(power) : formatPower(power) : statusLabel;
      if (showCondition) labelLine = statusLabel;
      function select() { if (props.onSelect) props.onSelect(site.id); }
      function keySelect(event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } }
      var labelLayout = labelLayouts[site.id];
      siteLabels.push(h('g', { key: 'label-' + site.id, transform: 'translate(' + point.x + ' ' + (point.y + 49) + ') scale(' + (1 / camera.zoom) + ')', visibility: labelLayout.visible ? 'visible' : 'hidden', role: 'button', tabIndex: -1, 'aria-label': label, 'aria-pressed': selected, 'data-tycoon-site-label': site.id, 'data-visible': labelLayout.visible, 'data-priority': labelLayout.priority, 'data-label-scale': 1 / camera.zoom, onClick: select, onKeyDown: keySelect, style: { cursor: 'pointer' } },
        h('rect', { x: -80, y: -2, width: 160, height: 43, rx: 10, fill: selected ? '#173e48' : '#244c53', stroke: selected ? '#a5f3ce' : '#8eb4a3', strokeWidth: selected ? 2 : 0.8, opacity: 0.98 }),
        h('text', { x: showCondition ? -68 : 0, y: 15, textAnchor: showCondition ? 'start' : 'middle', fill: '#f0f8e9', fontSize: showCondition ? 12.5 : 14, fontWeight: 650, pointerEvents: 'none' }, site.name),
        h('text', { x: 0, y: showCondition ? 29 : 32, textAnchor: 'middle', fill: color, fontSize: 12, pointerEvents: 'none' }, labelLine),
        showCondition ? h('g', { 'data-tycoon-condition': site.id, 'data-value': condition, 'data-status': status, 'aria-hidden': true, pointerEvents: 'none' },
          h('text', { x: 68, y: 15, textAnchor: 'end', fill: color, fontSize: 11.5, fontWeight: 700 }, Math.round(condition) + '%'),
          h('rect', { x: -68, y: 35, width: 136, height: 3.5, rx: 1.75, fill: '#102f38', stroke: '#8eafa1', strokeWidth: 0.5 }),
          h('rect', { x: -68, y: 35, width: 136 * condition / 100, height: 3.5, rx: 1.75, fill: color })) : null));
      return h('g', { key: site.id, transform: 'translate(' + point.x + ' ' + point.y + ')', role: 'button', tabIndex: 0, 'aria-label': label, 'aria-pressed': selected, 'data-tycoon-site': site.id, 'data-status': status, 'data-condition': condition === null ? undefined : condition, 'data-condition-hour': condition === null ? undefined : n(frame.hour), onClick: select, onKeyDown: keySelect, onFocus: function () { setFocusedSiteId(site.id); if (camera.zoom > 1) focusSite(site.id); }, onBlur: function () { setFocusedSiteId(null); }, className: 'rn-tycoon-site' },
        h('title', null, label),
        h('ellipse', { cx: 0, cy: 2, rx: 94, ry: 44, fill: selected ? '#9fffe72b' : 'transparent', stroke: selected ? '#d2fff0' : 'transparent', strokeWidth: 3, className: 'rn-tycoon-focus' }),
        polygon('-92,-4 0,-44 92,-4 0,42', asset ? '#85a58d' : '#91b29a', { opacity: 0.75, stroke: selected ? '#ceffe8' : '#608d7b', strokeWidth: 1.5, strokeDasharray: asset ? undefined : '5 5' }),
        asset ? h('g', { opacity: status === 'building' ? buildStage === 'groundwork' ? 0.16 : buildStage === 'assembly' ? 0.7 : 0.96 : status === 'fault' ? 0.68 : 1 }, asset.type === 'wind' ? wind(site, asset) : asset.type === 'battery' ? battery(site, asset) : solar(site, asset)) : h('g', { transform: 'scale(' + (1 / camera.zoom) + ')', 'data-tycoon-vacant-marker': site.id },
          line(-9, -16, 9, -16, '#315c58', 3), line(0, -25, 0, -7, '#315c58', 3),
          h('text', { x: 0, y: 14, textAnchor: 'middle', fill: '#244f4d', fontSize: 17, fontWeight: 700 }, site.type === 'wind' ? t('renewables.tycoon.scene.wind', 'Wind') : site.type === 'battery' ? t('renewables.tycoon.scene.storage', 'Storage') : t('renewables.tycoon.scene.solar', 'Solar'))),
        status === 'building' ? construction(site) : null,
        asset ? connectionCabinet(site, asset) : null,
        status === 'service' ? serviceWorksite(site) : null,
        status === 'fault' ? h('g', { transform: 'translate(61 -47)' }, h('circle', { r: 15, fill: '#763b36', stroke: '#ffc4a3', strokeWidth: 2 }), h('text', { y: 6, textAnchor: 'middle', fontSize: 22, fontWeight: 800, fill: '#ffdfbd' }, '!')) : null);
    });
    return h('div', { className: 'rn-tycoon-scene ' + (props.className || ''), style: { borderRadius: 20, overflow: 'hidden', background: night ? '#173642' : '#b7d9d6', border: '1px solid ' + (dark ? '#426969' : '#9fbdb4'), position: 'relative' } },
      h('style', null, '.rn-tycoon-scene svg{display:block;width:100%;height:auto;aspect-ratio:1100/690}.rn-tycoon-site{cursor:pointer;outline:none}.rn-tycoon-site:focus .rn-tycoon-focus,.rn-tycoon-site:focus-visible .rn-tycoon-focus{stroke:#fff7bb;stroke-width:5;fill:#ffefb52a}.rn-tycoon-site:hover .rn-tycoon-focus{stroke:#c9ffe8;stroke-width:3}.rn-tycoon-map-controls{display:flex;flex-wrap:wrap;gap:7px;align-items:center;padding:10px 12px;background:#173e48;color:#e5f1e5;font:12px/1.4 system-ui,sans-serif}.rn-tycoon-scene .rn-tycoon-map-controls button{min-height:38px;min-width:38px;border:1px solid #7aa69c;border-radius:8px;padding:7px 10px;background:#244c53;color:#f0f8e9;font:600 12px/1.3 system-ui,sans-serif}.rn-tycoon-scene .rn-tycoon-map-controls button:hover:not(:disabled){background:#356367;border-color:#b4e7d3}.rn-tycoon-scene .rn-tycoon-map-controls button:disabled{opacity:.45}.rn-tycoon-map-zoom{min-width:37px;text-align:center;font-variant-numeric:tabular-nums}.rn-tycoon-map-pan{display:flex;gap:6px;align-items:center}.rn-tycoon-map-weather{display:flex;flex-wrap:wrap;gap:5px 14px;padding:8px 14px;background:#204750;color:#e5f1e5;font:11px/1.5 system-ui,sans-serif}.rn-tycoon-map-weather strong{color:#fff1ba}.rn-tycoon-map-hint{width:100%;font-size:11px;color:#c7e0d6}.rn-tycoon-map-key{display:flex;flex-wrap:wrap;gap:7px 16px;padding:11px 16px;background:#173e48;color:#e5f1e5;font:12px/1.5 system-ui,sans-serif}.rn-tycoon-map-key span{display:inline-flex;align-items:center;gap:7px}.rn-tycoon-map-key i{display:inline-block;width:22px;height:3px;border-radius:3px;flex-shrink:0}.rn-tycoon-map-note{margin-left:auto;opacity:.85}@media(max-width:420px){.rn-tycoon-map-key{padding:10px;gap:6px 12px;font-size:11px}.rn-tycoon-map-note{width:100%;margin-left:0}.rn-tycoon-map-controls{padding:8px;gap:5px}.rn-tycoon-scene .rn-tycoon-map-controls button{padding:7px 8px}.rn-tycoon-map-weather{padding:8px 10px}}'),
      h('style', null, '.rn-tycoon-map-overlays{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-right:5px}.rn-tycoon-scene .rn-tycoon-map-overlays button[aria-pressed="true"],.rn-tycoon-scene .rn-tycoon-map-overlays button[aria-pressed="true"]:hover:not(:disabled){background:#d6f5e6;color:#153e45;border-color:#d6f5e6;box-shadow:inset 0 -3px 0 #4d8c76}.rn-tycoon-scene .rn-tycoon-map-overlays button:focus-visible{outline:3px solid #fff1b0;outline-offset:2px}.rn-tycoon-scene svg{user-select:none;-webkit-user-select:none}.rn-tycoon-map-condition{display:flex;flex-wrap:wrap;gap:3px 16px;padding:8px 14px;background:#173e48;border-top:1px solid #426b69;color:#edf7e9;font:12px/1.5 system-ui,sans-serif}.rn-tycoon-map-condition strong{color:#d6f5e6}.rn-tycoon-map-condition span{font-variant-numeric:tabular-nums}@media(max-width:420px){.rn-tycoon-map-overlays{width:100%;margin-right:0}.rn-tycoon-map-overlays button{flex:1}.rn-tycoon-map-condition{padding:8px 10px}}'),
      h('style', null, '.rn-tycoon-map-service{display:flex;flex-wrap:wrap;gap:3px 13px;padding:8px 14px;background:#3b433b;border-top:1px solid #8f895f;color:#ffefcc;font:11px/1.5 system-ui,sans-serif}.rn-tycoon-map-service strong{font-weight:700;color:#fff0ca}.rn-tycoon-map-service span{font-variant-numeric:tabular-nums}.rn-tycoon-service-progress{width:100%;height:4px;margin-top:2px;background:#697267;border-radius:3px;overflow:hidden}.rn-tycoon-service-progress>span{display:block;height:100%;background:#ffe1a0;border-radius:3px}@media(max-width:420px){.rn-tycoon-map-service{padding:8px 10px;gap:3px 8px}}'),
      h('style', null, '.rn-tycoon-map-connection{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 12px;padding:8px 14px;border-top:1px solid #50766d;background:#1c4549;color:#e8f5e7;font:11px/1.5 system-ui,sans-serif}.rn-tycoon-map-connection strong{font-size:12px;color:#f0f9e8}.rn-tycoon-map-connection span{font-variant-numeric:tabular-nums}.rn-tycoon-map-connection[data-state=isolated]{background:#414738;border-color:#8f895f;color:#ffefcc}.rn-tycoon-map-connection[data-state=isolated] strong{color:#fff0ca}.rn-tycoon-map-connection[data-reason=fault]{background:#513e3b;border-color:#aa7b67;color:#ffe5d4}.rn-tycoon-map-connection[data-reason=fault] strong{color:#ffe8d6}@media(max-width:420px){.rn-tycoon-map-connection{padding:8px 10px}}'),
      h('style', null, '.rn-tycoon-service-stage{display:flex;flex-wrap:wrap;align-items:center;gap:3px 8px;width:100%;margin-top:2px}.rn-tycoon-service-stage strong{display:inline-block;border:1px solid #b3a274;border-radius:5px;padding:1px 6px;background:#54523d;font-size:10px;line-height:1.5}.rn-tycoon-service-stage span{font-size:10px}'),
      h('style', null, '.rn-tycoon-map-build{display:flex;flex-wrap:wrap;gap:3px 13px;padding:8px 14px;background:#354842;border-top:1px solid #8e9d7d;color:#f2efd6;font:11px/1.5 system-ui,sans-serif}.rn-tycoon-map-build strong{color:#fff0ca}.rn-tycoon-map-build span{font-variant-numeric:tabular-nums}@media(max-width:420px){.rn-tycoon-map-build{padding:8px 10px;gap:3px 8px}}'),
      h('style', null, '.rn-tycoon-battery-gauge{display:grid;gap:5px;padding:9px 14px;background:#204750;border-top:1px solid #52776c;color:#e6f5e9;font:11px/1.5 system-ui,sans-serif}.rn-tycoon-battery-reading{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 10px}.rn-tycoon-battery-reading strong{color:#eaffdf;font-size:12px;font-variant-numeric:tabular-nums}.rn-tycoon-battery-track{position:relative;height:9px;border:1px solid #70978b;border-radius:5px;background:#12333d;overflow:hidden}.rn-tycoon-battery-level{height:100%;background:#7ce2b5}.rn-tycoon-battery-reserve{position:absolute;top:0;bottom:0;width:0;border-left:2px dashed #ffe0a0;transform:translateX(-1px)}.rn-tycoon-battery-note{font-size:10px;color:#d2e9dd}@media(max-width:420px){.rn-tycoon-battery-gauge{padding:9px 10px}}'),
      h('style', null, '.rn-tycoon-network{display:grid;gap:6px;padding:8px 14px;background:#183e47;border-top:1px solid #50766d;color:#e9f4e8;font:11px/1.4 system-ui,sans-serif}.rn-tycoon-network-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px 10px}.rn-tycoon-network-heading strong{font-size:11px}.rn-tycoon-network-readings{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:6px}.rn-tycoon-network-readings span{display:block;color:#c9e0d5;font-size:10px}.rn-tycoon-network-readings strong{display:block;font-size:12px;font-variant-numeric:tabular-nums;color:#f2f8e7}.rn-tycoon-network-unused{border-left:4px solid #d5b577;padding-left:6px;background:repeating-linear-gradient(135deg,transparent,transparent 5px,#e4c58a0e 5px,#e4c58a0e 7px)}.rn-tycoon-scene .rn-tycoon-network button{min-height:32px;padding:5px 9px;border:1px solid #81b3a0;border-radius:7px;background:#28575a;color:#eff8e7;font:600 11px/1.4 system-ui,sans-serif;cursor:pointer}.rn-tycoon-network button:focus-visible{outline:3px solid #fff1b0;outline-offset:2px}.rn-tycoon-substation{outline:none;cursor:pointer}.rn-tycoon-substation:hover .rn-tycoon-substation-focus{stroke:#baf1da;fill:#baf1da12}.rn-tycoon-substation:focus .rn-tycoon-substation-focus,.rn-tycoon-substation:focus-visible .rn-tycoon-substation-focus{stroke:#fff1b0;fill:#fff1b01f;stroke-width:4}@media(max-width:420px){.rn-tycoon-network{padding:8px 10px}.rn-tycoon-network-readings{gap:5px}.rn-tycoon-network-readings strong{font-size:11px}.rn-tycoon-network-readings span{font-size:9px}}'),
      h('div', { className: 'rn-tycoon-map-controls', role: 'group', 'aria-label': t('renewables.tycoon.scene.mapControls', 'Map view controls') },
        h('div', { className: 'rn-tycoon-map-overlays', role: 'group', 'aria-label': t('renewables.tycoon.scene.overlayControls', 'Map information') },
          h('button', { type: 'button', 'data-tycoon-overlay': 'power', 'aria-pressed': overlay === 'power', onClick: function () { setOverlay('power'); } }, t('renewables.tycoon.scene.powerOverlay', 'Power flow')),
          h('button', { type: 'button', 'data-tycoon-overlay': 'condition', 'aria-pressed': overlay === 'condition', onClick: function () { setOverlay('condition'); } }, t('renewables.tycoon.scene.conditionOverlay', 'Equipment condition'))),
        h('button', { type: 'button', 'data-tycoon-zoom': 'out', 'aria-label': t('renewables.tycoon.scene.zoomOut', 'Zoom out'), disabled: camera.zoom <= 1, onClick: function () { zoomMap(-0.5); } }, '−'),
        h('span', { className: 'rn-tycoon-map-zoom', 'data-tycoon-zoom-level': camera.zoom, 'aria-live': 'polite', 'aria-atomic': true }, Math.round(camera.zoom * 100) + '%'),
        h('button', { type: 'button', 'data-tycoon-zoom': 'in', 'aria-label': t('renewables.tycoon.scene.zoomIn', 'Zoom in'), disabled: camera.zoom >= 2.5, onClick: function () { zoomMap(0.5); } }, '+'),
        h('button', { type: 'button', 'data-tycoon-focus-site': true, disabled: !sites.some(function (site) { return site.id === props.selectedId; }), onClick: function () { focusSite(props.selectedId); } }, t('renewables.tycoon.scene.focusSelected', 'Focus selected')),
        canInspectEquipment ? h('button', { type: 'button', 'data-tycoon-inspect-equipment': 'native', onClick: function () { props.onInspectEquipment(selectedSite.id); } }, t('renewables.tycoon.scene.inspectEquipment', 'Inspect equipment')) : null,
        h('button', { type: 'button', 'data-tycoon-zoom': 'reset', disabled: camera.zoom === 1, onClick: function () { setCamera({ zoom: 1, x: 550, y: 345 }); } }, t('renewables.tycoon.scene.fullMap', 'Full map')),
        camera.zoom > 1 ? h('div', { className: 'rn-tycoon-map-pan', role: 'group', 'aria-label': t('renewables.tycoon.scene.panControls', 'Pan map') }, [['left', -1, 0, '←', t('renewables.tycoon.scene.panLeft', 'Pan map left')], ['up', 0, -1, '↑', t('renewables.tycoon.scene.panUp', 'Pan map up')], ['down', 0, 1, '↓', t('renewables.tycoon.scene.panDown', 'Pan map down')], ['right', 1, 0, '→', t('renewables.tycoon.scene.panRight', 'Pan map right')]].map(function (button) { return h('button', { key: button[0], type: 'button', 'data-tycoon-pan': button[0], 'aria-label': button[4], onClick: function () { panMap(button[1], button[2]); } }, button[3]); })) : null,
        camera.zoom > 1 ? h('span', { className: 'rn-tycoon-map-hint', id: uid + '-pan-help' }, t('renewables.tycoon.scene.panHelp', 'Drag the map or use the arrow buttons to explore.')) : null),
      h('div', { className: 'rn-tycoon-map-weather' },
        h('span', null, t('renewables.tycoon.scene.windResource', 'Wind') + ' ', h('strong', { 'data-tycoon-weather-wind': true }, windSpeed.toFixed(1) + ' m/s')),
        h('span', null, t('renewables.tycoon.scene.sunResource', 'Sunlight') + ' ', h('strong', { 'data-tycoon-weather-sun': true }, Math.round(irradiance * 100) + '%')),
        h('span', { 'data-tycoon-weather': true }, night ? t('renewables.tycoon.scene.night', 'Night') : overcast ? t('renewables.tycoon.scene.cloudy', 'Cloud cover') : dawn ? t('renewables.tycoon.scene.lowSun', 'Low sun') : t('renewables.tycoon.scene.day', 'Daylight'))),
      h('div', Object.assign({ className: 'rn-tycoon-network', 'aria-label': t('renewables.tycoon.scene.networkAtHour', 'Network at selected hour') }, networkAttributes('native')),
        h('div', { className: 'rn-tycoon-network-heading' }, h('strong', null, t('renewables.tycoon.scene.networkAtHour', 'Network at selected hour') + ' · ' + networkHeading), canInspectDispatch ? h('button', { type: 'button', 'data-tycoon-inspect-dispatch': 'native', onClick: inspectDispatch }, inspectDispatchLabel) : null),
        h('div', { className: 'rn-tycoon-network-readings' },
          h('div', null, h('strong', null, networkServed.toFixed(1) + ' / ' + networkDemand.toFixed(1)), h('span', null, t('renewables.tycoon.scene.servedDemandUnits', 'kW served / demand'))),
          h('div', null, h('strong', null, formatPower(networkGap)), h('span', null, t('renewables.tycoon.scene.unmetDemand', 'Unmet demand'))),
          h('div', { className: 'rn-tycoon-network-unused' }, h('strong', null, formatPower(networkCurtailed)), h('span', null, t('renewables.tycoon.scene.curtailedUnused', 'Curtailed · not used'))))),
      selectedConnection && selectedSite ? h('div', { className: 'rn-tycoon-map-connection', 'data-tycoon-connection-summary': true, 'data-site': selectedSite.id, 'data-state': selectedConnection.state, 'data-reason': selectedConnection.reason },
        h('strong', null, selectedSite.name + ' · ' + selectedConnection.label), h('span', null, selectedConnection.detail + ' · ' + serviceContext)) : null,
      selectedBattery ? h('div', { className: 'rn-tycoon-battery-gauge', 'data-tycoon-battery-gauge': selectedSite.id, 'data-stored': selectedStored, 'data-capacity': selectedCapacity, 'data-fraction': selectedFill, 'data-reserve': reserveFraction },
        h('div', { className: 'rn-tycoon-battery-reading' }, h('span', { id: uid + '-battery-stored' }, t('renewables.tycoon.scene.storedEndHour', 'Stored at end of selected hour')), h('strong', null, selectedStored.toFixed(1) + ' / ' + selectedCapacity.toFixed(1) + ' kWh · ' + (selectedFill * 100).toFixed(1) + '%')),
        h('div', { className: 'rn-tycoon-battery-track', role: 'meter', 'aria-labelledby': uid + '-battery-stored', 'aria-valuemin': 0, 'aria-valuemax': selectedCapacity, 'aria-valuenow': selectedStored, 'aria-valuetext': selectedStored.toFixed(1) + ' ' + t('renewables.tycoon.scene.kwhStored', 'kWh stored') }, h('div', { className: 'rn-tycoon-battery-level', 'data-tycoon-battery-level': selectedSite.id, style: { width: selectedFill * 100 + '%' } }), h('span', { className: 'rn-tycoon-battery-reserve', 'data-tycoon-battery-reserve': selectedSite.id, 'data-reserve': reserveFraction, style: { left: reserveFraction * 100 + '%' }, 'aria-hidden': true })),
        h('span', { className: 'rn-tycoon-battery-note' }, t('renewables.tycoon.scene.reserveTarget', 'Reserve target') + ': ' + (selectedCapacity * reserveFraction).toFixed(1) + ' kWh · ' + t('renewables.tycoon.scene.reserveRelease', 'Essential needs may draw on the reserve.'))) : null,
      selectedAsset && selectedSite && selectedAsset.status === 'building' ? h('div', { className: 'rn-tycoon-map-build', 'data-tycoon-build-summary': true, 'data-site': selectedSite.id, 'data-stage': buildStage, 'data-progress': buildProgress, 'data-ready-month': selectedOpening.month },
        h('strong', null, t('renewables.tycoon.scene.construction', 'Construction') + ' · ' + buildStageLabel), h('span', null, t('renewables.tycoon.scene.opens', 'Opens') + ' ' + selectedOpening.label),
        h('span', null, (campaign.phase && campaign.phase !== 'planning' ? t('renewables.tycoon.scene.buildReplay', 'Illustrative stages · replay hour') : t('renewables.tycoon.scene.buildForecast', 'Illustrative stages · forecast hour')) + ' · ' + t('renewables.tycoon.scene.buildOffline', 'Offline for the entire construction month'))) : null,
      overlay === 'condition' ? h('div', { className: 'rn-tycoon-map-condition', 'data-tycoon-condition-summary': true, 'aria-live': 'polite', 'aria-atomic': true },
        h('strong', null, conditionHeading),
        h('span', null, selectedAsset && selectedSite ? selectedSite.name + ': ' + Math.round(clamp(selectedAsset.condition, 0, 100)) + '% · ' + (statusText[selectedAsset.status] || statusText.idle) : t('renewables.tycoon.scene.selectCondition', 'Select owned equipment to inspect its condition.'))) : null,
      selectedAsset && selectedSite && selectedAsset.status === 'service' ? h('div', { className: 'rn-tycoon-map-service', 'data-tycoon-service-summary': true, 'data-site': selectedSite.id, 'data-stage': serviceStage, 'data-elapsed': serviceElapsed, 'data-remaining': serviceRemaining },
        h('strong', null, selectedSite.name + ' · ' + serviceContext), h('span', null, serviceElapsedText + ' · ' + serviceRemainingText), h('span', null, t('renewables.tycoon.scene.serviceOffline', 'Offline for service') + ' · ' + serviceReturnText),
        h('div', { className: 'rn-tycoon-service-stage' }, h('strong', { 'data-tycoon-service-stage': serviceStage }, serviceStageLabel), h('span', null, serviceStageContext)),
        h('div', { className: 'rn-tycoon-service-progress', role: 'progressbar', 'aria-label': t('renewables.tycoon.scene.serviceProgress', 'Service time elapsed for') + ' ' + selectedSite.name, 'aria-valuemin': 0, 'aria-valuemax': 48, 'aria-valuenow': serviceElapsed, 'aria-valuetext': serviceElapsedText + ', ' + serviceRemainingText }, h('span', { style: { width: serviceElapsed / 48 * 100 + '%' } }))) : null,
      h('svg', { viewBox: (camera.x - 550 / camera.zoom) + ' ' + (camera.y - 345 / camera.zoom) + ' ' + 1100 / camera.zoom + ' ' + 690 / camera.zoom, xmlns: 'http://www.w3.org/2000/svg', role: 'group', tabIndex: 0, 'aria-labelledby': uid + '-title ' + uid + '-description', 'aria-describedby': camera.zoom > 1 ? uid + '-pan-help' : undefined, 'data-tycoon-map': 'true', 'data-tycoon-overlay': overlay, 'data-hour': hour, 'data-night': night ? 'true' : 'false', 'data-animation': active ? 'on' : 'off', 'data-zoom': camera.zoom, onKeyDown: mapKey, onPointerDown: beginPan, onPointerMove: movePan, onPointerUp: endPan, onPointerCancel: endPan, onLostPointerCapture: endPan, style: { cursor: camera.zoom > 1 ? 'grab' : undefined, touchAction: camera.zoom > 1 ? 'none' : 'pan-y' } },
        h('title', { id: uid + '-title' }, title), h('desc', { id: uid + '-description' }, description),
        h('defs', null,
          h('linearGradient', { id: uid + '-sky', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: skyTop }), h('stop', { offset: '100%', stopColor: skyBottom })),
          h('linearGradient', { id: uid + '-sea', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: night ? '#31596b' : '#73b9bb' }), h('stop', { offset: '100%', stopColor: night ? '#183d53' : '#397e93' })),
          h('linearGradient', { id: uid + '-grass', x1: '0', y1: '0', x2: '0.7', y2: '1' }, h('stop', { offset: '0%', stopColor: night ? '#376d62' : '#9bc299' }), h('stop', { offset: '100%', stopColor: night ? '#274d4a' : '#598c78' })),
          h('linearGradient', { id: uid + '-tower', x1: '0', y1: '0', x2: '1', y2: '0' }, h('stop', { offset: '0%', stopColor: '#99b2b1' }), h('stop', { offset: '45%', stopColor: '#ecf3e9' }), h('stop', { offset: '100%', stopColor: '#b3cbc6' })),
          h('linearGradient', { id: uid + '-solar-glass', x1: '0', y1: '0', x2: '0.8', y2: '1' }, h('stop', { offset: '0%', stopColor: night ? '#163549' : '#173f67' }), h('stop', { offset: '55%', stopColor: night ? '#25465c' : '#2f7093' }), h('stop', { offset: '100%', stopColor: night ? '#153344' : '#174b70' })),
          h('linearGradient', { id: uid + '-nacelle', x1: '0', y1: '0', x2: '1', y2: '1' }, h('stop', { offset: '0%', stopColor: '#d8e6db' }), h('stop', { offset: '100%', stopColor: '#8daea6' })),
          h('linearGradient', { id: uid + '-cabinet-side', x1: '0', y1: '0', x2: '1', y2: '1' }, h('stop', { offset: '0%', stopColor: '#8fbbb1' }), h('stop', { offset: '100%', stopColor: '#527c7b' })),
          h('linearGradient', { id: uid + '-cabinet-top', x1: '0', y1: '0', x2: '1', y2: '1' }, h('stop', { offset: '0%', stopColor: '#d2e4d6' }), h('stop', { offset: '100%', stopColor: '#95bbb2' })),
          h('radialGradient', { id: uid + '-sun' }, h('stop', { offset: '0%', stopColor: '#fff3b2', stopOpacity: 0.7 }), h('stop', { offset: '100%', stopColor: '#fff3b2', stopOpacity: 0 })),
          h('pattern', { id: uid + '-curtail-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, h('rect', { width: 6, height: 6, fill: '#654f3b' }), line(0, 0, 0, 6, '#d9bb7d', 2)),
          h('marker', { id: uid + '-arrow', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 3, markerHeight: 3, orient: 'auto' }, polygon('0,0 8,4 0,8', '#ffe5a0')),
          h('marker', { id: uid + '-charge-arrow', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 3, markerHeight: 3, orient: 'auto-start-reverse' }, polygon('0,0 8,4 0,8', '#c5a5ff'))),
        h('g', { 'aria-hidden': true },
          h('rect', { width: 1100, height: 690, fill: 'url(#' + uid + '-sky)' }),
          night ? h('g', { fill: '#cbe5e3' }, [[80,70],[190,45],[295,109],[442,40],[530,91],[724,50],[960,66],[1020,123]].map(function (point, index) { return h('circle', { key: index, cx: point[0], cy: point[1], r: index % 2 ? 1.7 : 2.5, opacity: 0.8 }); }), h('circle', { cx: 900, cy: 80, r: 24, fill: '#d8e8db' }), h('circle', { cx: 910, cy: 73, r: 23, fill: skyTop })) : h('g', null, h('circle', { cx: 130 + hour / 24 * 800, cy: 110 - daylight * 55, r: 100, fill: 'url(#' + uid + '-sun)' }), h('circle', { cx: 130 + hour / 24 * 800, cy: 110 - daylight * 55, r: 25, fill: overcast ? '#d9dfc9' : '#fff1b0', opacity: overcast ? 0.55 : 0.95 })),
          h('path', { d: 'M 0 194 L 65 174 L 100 185 L 180 149 L 242 178 L 321 136 L 420 187 L 478 160 L 561 193 L 663 145 L 721 171 L 780 151 L 881 189 L 981 157 L 1100 190 V 263 H 0 Z', fill: night ? '#355563' : '#7ea9a6', opacity: 0.45 }),
          h('path', { d: 'M 0 222 Q 145 204 298 222 T 610 219 T 945 221 T 1100 211 V 690 H 0 Z', fill: 'url(#' + uid + '-sea)' }),
          [0,1,2,3].map(function (index) { return h('g', { key: index, ref: function (node) { refs.current.clouds[index] = node; }, transform: 'translate(' + (((70 + index * 275 + motion.current.clouds + 130) % 1360) - 130).toFixed(2) + ' ' + (102 + index % 2 * 26) + ')', fill: night ? '#769298' : '#f1f2e5', opacity: overcast ? 0.65 : 0.43, 'data-tycoon-cloud': index }, h('ellipse', { rx: overcast ? 104 : 69, ry: 14 }), h('ellipse', { cx: -23, cy: -10, rx: 36, ry: 19 }), h('ellipse', { cx: 18, cy: -8, rx: 39, ry: 17 })); }),
          h('g', { stroke: night ? '#71a1ad' : '#c8ece1', strokeWidth: 2, fill: 'none', opacity: 0.35 }, h('path', { d: 'M 21 333 q 29 -8 51 0 M 19 369 q 23 -8 48 -2 M 1005 453 q 35 -8 73 -2 M 957 626 q 47 -8 94 1 M 19 566 q 37 -7 65 -2 M 230 651 q 42 -10 77 -3 M 1000 288 q 26 -5 60 1' })),
          h('path', { d: 'M 111 297 Q 163 267 258 239 L 460 184 Q 578 174 676 202 L 982 321 Q 1026 346 1006 421 L 936 555 Q 909 592 838 610 L 588 659 Q 518 675 459 648 L 165 511 Q 87 474 86 403 Z', fill: '#244f584d', transform: 'translate(9 11)' }),
          h('path', { d: 'M 111 285 Q 163 255 258 227 L 460 172 Q 578 162 676 190 L 982 309 Q 1026 334 1006 409 L 936 543 Q 909 580 838 598 L 588 647 Q 518 663 459 636 L 165 499 Q 87 462 86 391 Z', fill: night ? '#426c68' : '#879d83', transform: 'translate(0 8)', 'data-tycoon-shore-depth': true }),
          h('path', { d: 'M 111 285 Q 163 255 258 227 L 460 172 Q 578 162 676 190 L 982 309 Q 1026 334 1006 409 L 936 543 Q 909 580 838 598 L 588 647 Q 518 663 459 636 L 165 499 Q 87 462 86 391 Z', fill: '#c6c9a4' }),
          h('path', { d: 'M 99 424 Q 107 468 166 497 L 463 637 Q 520 663 587 649 L 838 601 Q 916 579 939 542', fill: 'none', stroke: night ? '#86b4aa' : '#e7e5c0', strokeWidth: 2.2, opacity: 0.45 }),
          h('path', { d: 'M 130 286 L 273 234 L 469 181 Q 569 169 667 198 L 965 315 Q 1002 338 987 402 L 921 529 Q 891 564 829 581 L 584 629 Q 519 642 465 619 L 177 486 Q 106 453 104 391 Z', fill: 'url(#' + uid + '-grass)' }),
          h('path', { d: 'M 145 322 Q 255 278 367 289 T 598 295 T 866 361 M 169 434 Q 282 388 420 409 M 671 473 Q 807 464 942 412', stroke: night ? '#7ea58b' : '#d0dbac', strokeWidth: 2, opacity: 0.28, fill: 'none' }),
          h('path', { d: 'M 244 363 Q 365 374 470 426 L 587 449 L 727 429 L 876 375 M 470 426 L 458 520 L 598 575 L 856 528 M 587 449 L 600 296 L 764 287', fill: 'none', stroke: '#9ea993', strokeWidth: 17, strokeLinejoin: 'round' }),
          h('path', { d: 'M 244 363 Q 365 374 470 426 L 587 449 L 727 429 L 876 375 M 470 426 L 458 520 L 598 575 L 856 528 M 587 449 L 600 296 L 764 287', fill: 'none', stroke: '#e2dbb6', strokeWidth: 12, strokeLinejoin: 'round' }),
          [[146,366,.9],[203,285,.75],[348,228,.75],[504,204,.8],[681,228,.85],[936,353,.8],[973,414,.7],[192,460,.9],[342,545,.85],[779,589,.6],[930,481,.6],[113,412,.7]].map(function (item) { return tree(item[0],item[1],item[2]); }),
          windsock(),
          h('g', { ref: function (node) { refs.current.ribbons = node; }, stroke: night ? '#8bb9c6' : '#e7fff0', strokeWidth: 2, fill: 'none', strokeDasharray: '16 54', opacity: clamp(motion.current.weatherWind / 20, 0, 0.5) }, h('path', { d: 'M 31 241 Q 96 215 182 227 T 329 215 M 754 162 Q 822 143 900 160 T 1079 159' }))),
        h('g', null, sites.map(function (site, index) { var point = sitePoint(site, index), asset = assetBySite[site.id], cable = { x0: point.x, y0: point.y + 12, x1: point.x * 0.55 + 575 * 0.45, y1: point.y + 49, x2: 575, y2: 428 }; return flow(site.id, 'M ' + cable.x0 + ' ' + cable.y0 + ' Q ' + cable.x1 + ' ' + cable.y1 + ' ' + cable.x2 + ' ' + cable.y2, asset ? n(asset.power) : 0, !!asset, cable); }), flow('town', 'M 575 428 Q 569 505 606 552', Math.max(0,n(frame.served)), true)),
        h('g', null,
          h('g', { className: canInspectDispatch ? 'rn-tycoon-substation' : undefined, role: canInspectDispatch ? 'button' : undefined, tabIndex: canInspectDispatch ? 0 : undefined, 'aria-label': canInspectDispatch ? inspectDispatchLabel : undefined, 'aria-hidden': canInspectDispatch ? undefined : true, 'data-tycoon-inspect-dispatch': canInspectDispatch ? 'substation' : undefined, onClick: canInspectDispatch ? inspectDispatch : undefined, onKeyDown: canInspectDispatch ? dispatchKey : undefined, onFocus: canInspectDispatch ? function () { setFocusedSiteId(null); if (camera.zoom > 1) setCamera(function (old) { return fitCamera({ zoom: old.zoom, x: 575, y: 425 }); }); } : undefined },
          h('path', { className: 'rn-tycoon-substation-focus', d: 'M 514 407 L 574 370 L 639 410 L 636 478 L 519 478 Z', fill: 'transparent', stroke: 'transparent', strokeWidth: 3 }),
          polygon('524,413 575,392 631,424 579,448', '#a4b9a4', { stroke: '#729c87', strokeWidth: 2 }),
          polygon('545,390 575,379 598,392 567,404', '#c2d4c4'), polygon('545,390 567,404 567,435 545,422', '#739a8b'), polygon('567,404 598,392 598,421 567,435', '#a5beaa'),
          [0,1,2].map(function (index) { return h('g', { key: index, transform: 'translate(' + (586 + index * 13) + ' ' + (422 - index * 4) + ')' }, line(0, 0, 0, -25, '#43656a', 4), line(-6, -18, 6, -18, '#9ac8bf', 3), line(-6, -23, 6, -23, '#9ac8bf', 3)); }),
          h('rect', { x: 530, y: 448, width: 90, height: 22, rx: 8, fill: '#244c53' }), h('text', { x: 575, y: 463, textAnchor: 'middle', fill: '#ecf6e6', fontSize: 12, fontWeight: 650 }, t('renewables.tycoon.scene.substation', 'Substation'))),
          h('g', { 'aria-hidden': true },
          building(555,566,.8,'#78958d'), building(606,539,.95,'#558f91',true), building(666,567,.75,'#9d9b7a'), building(610,592,.65,'#5f8f88'),
          h('g', { transform: 'translate(548 611)' }, h('rect', { width: 133, height: 25, rx: 9, fill: '#244c53' }), h('text', { x: 66.5, y: 17, textAnchor: 'middle', fill: '#e8f3dd', fontSize: 13 }, t('renewables.tycoon.scene.harbor', 'Harbor community'))),
          h('g', { transform: 'translate(163 508)' }, polygon('-4,0 18,-8 66,20 43,30', '#8a8e77'), line(5, 3, 50, 28, '#bdc0a0', 2), h('path', { d: 'M 27 37 Q 64 18 87 29 L 72 44 Q 46 53 27 37 Z', fill: '#d9e8d2' }), line(58, 30, 58, 13, '#435e65', 2), polygon('59,14 76,28 59,30', '#d3d99b')))),
        siteGroups, siteLabels,
        h('g', { 'aria-hidden': true, transform: 'translate(30 25)', visibility: camera.zoom > 1 ? 'hidden' : 'visible', 'data-tycoon-map-hud': 'weather', pointerEvents: 'none' }, h('rect', { width: 245, height: 59, rx: 13, fill: '#183f49', opacity: 0.94 }), h('text', { x: 16, y: 24, fill: '#eaf4e6', fontSize: 18, fontWeight: 700 }, t('renewables.tycoon.scene.region', 'North Harbor')), h('text', { x: 16, y: 44, fill: '#bdd8ce', fontSize: 13 }, String(hour).padStart(2,'0') + ':00 · ' + (night ? t('renewables.tycoon.scene.night', 'Night') : overcast ? t('renewables.tycoon.scene.cloudy', 'Cloud cover') : dawn ? t('renewables.tycoon.scene.lowSun', 'Low sun') : t('renewables.tycoon.scene.day', 'Daylight')) + ' · ' + windSpeed.toFixed(1) + ' m/s')),
        h('g', Object.assign({ 'aria-hidden': true, transform: 'translate(820 25)', visibility: camera.zoom > 1 ? 'hidden' : 'visible', 'data-tycoon-map-hud': 'network', pointerEvents: 'none' }, networkAttributes('map')),
          h('rect', { width: 250, height: 116, rx: 12, fill: networkMode === 'gap' ? '#513f3d' : '#244b50', stroke: networkMode === 'gap' ? '#e0b49a' : '#93b7a2' }),
          h('text', { x: 13, y: 22, fill: '#fff0cd', fontSize: 14, fontWeight: 700 }, networkHeading),
          h('text', { x: 13, y: 42, fill: '#e9f4df', fontSize: 12 }, networkServed.toFixed(1) + ' / ' + networkDemand.toFixed(1) + ' ' + t('renewables.tycoon.scene.servedDemandUnits', 'kW served / demand')),
          h('rect', { x: 13, y: 51, width: 224, height: 7, rx: 3.5, fill: networkGap > 0 ? '#b87e70' : '#52756b' }),
          h('rect', { x: 13, y: 51, width: 224 * servedFraction, height: 7, rx: 3.5, fill: '#a8e4b9', 'data-tycoon-demand-coverage': servedFraction }),
          h('text', { x: 13, y: 77, fill: networkGap > 0 ? '#ffdac0' : '#d5e8d8', fontSize: 12 }, t('renewables.tycoon.scene.unmetDemand', 'Unmet demand') + ': ' + formatPower(networkGap)),
          h('rect', { x: 13, y: 88, width: 15, height: 16, rx: 2, fill: 'url(#' + uid + '-curtail-hatch)' }),
          h('text', { x: 36, y: 101, fill: '#f4dfb1', fontSize: 11.5 }, formatPower(networkCurtailed) + ' ' + t('renewables.tycoon.scene.curtailedUnused', 'Curtailed · not used')))),
      h('div', { className: 'rn-tycoon-map-key' }, h('span', null, h('i', { style: { background: '#ffe5a0' } }), t('renewables.tycoon.scene.delivering', 'Delivering electricity')), h('span', null, h('i', { style: { background: '#c5a5ff' } }), t('renewables.tycoon.scene.charging', 'Charging')), h('span', null, h('i', { style: { background: '#8bb0a0', border: '1px dashed #d2e4cd', height: 8 } }), t('renewables.tycoon.scene.available', 'Available site')), h('span', { className: 'rn-tycoon-map-note' }, t('renewables.tycoon.scene.illustrative', 'Illustrative motion · simulated hourly power'))));
  };
})();
