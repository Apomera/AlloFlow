/* Perception Lab: accessible controls and observations for the 3D gallery. */
(function () {
  'use strict';
  var Lab = window.StemLab;
  if (!Lab) return;
  var STATIONS = [
    { id: 'room', title: 'The distorted room', principle: 'Perspective & size', question: 'Which object is physically taller?',
      hints: ['Separate what looks taller from what you could measure with a ruler.', 'Compare the objects from the inspection view, where their different distances are easier to see.'],
      description: 'Two equal objects stand at different depths in a room built to look rectangular from one viewpoint.',
      explanation: 'Both objects have exactly the same dimensions. The nearer object makes a larger image. The slanted room masks their difference in distance. Looking from above exposes its true shape.',
      source: 'https://annex.exploratorium.edu/xref/exhibits/ames_room.html' },
    { id: 'triangle', title: 'The impossible sculpture', principle: 'Viewpoint & depth cues', question: 'Can you make the three beams appear to join?',
      hints: ['Watch one corner as the viewpoint changes. Two ends can appear to meet without touching in space.', 'Make smaller adjustments near an apparent join, then compare the other two corners.'],
      description: 'Three separated beams can project onto one continuous triangular outline.',
      explanation: 'The apparent joins depend on the viewing angle. The beams end at different depths, so their ends can line up on the screen without touching in space. A side view exposes the gaps.',
      source: 'https://annex.exploratorium.edu/exhibits/temple/' },
    { id: 'shape', title: 'The hidden star', principle: 'Alignment & visual grouping', question: 'Can you assemble one star without flattening the pieces?',
      hints: ['Look for one continuous outside edge before judging the whole shape.', 'Follow the five tips and five inner corners. All of them should meet from the same viewpoint.'],
      description: 'Fragments at different depths can form one recognizable shape from a particular viewpoint.',
      explanation: 'Aligned edges let us group the fragments into a star. Their projections meet, but the pieces remain at different depths. The inspection view separates those two facts.',
      source: 'https://annex.exploratorium.edu/xref/exhibits/ames_chairs.html' }
  ];
  function obj(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function num(value, fallback, min, max) { var n = typeof value === 'number' || typeof value === 'string' && value.trim() ? Number(value) : NaN; return Number.isFinite(n) ? Math.round(Math.max(min, Math.min(max, n))) : fallback; }
  function str(value, max) { return typeof value === 'string' ? value.slice(0, max) : ''; }
  function station(id) { return STATIONS.find(function (item) { return item.id === id; }) || STATIONS[0]; }
  function model(raw) {
    var d = obj(raw);
    return { angle: num(d.angle, -24, -60, 60), shift: num(d.shift, 58, -100, 100), prediction: ['left', 'same', 'right'].indexOf(d.prediction) >= 0 ? d.prediction : '',
      note: str(d.note, 600), hints: num(d.hints, 0, 0, 2), reveal: d.reveal === true, solved: d.solved === true, assisted: d.assisted === true || d.reveal === true };
  }
  function normalize(raw) {
    var d = obj(raw), values = obj(d.models), result = { station: station(d.station).id, view: ['gallery', 'illusion', 'inspect'].indexOf(d.view) >= 0 ? d.view : 'gallery', models: {}, observations: [] };
    STATIONS.forEach(function (item) { result.models[item.id] = model(values[item.id]); });
    var seen = Object.create(null);
    if (Array.isArray(d.observations)) d.observations.slice(0, 24).forEach(function (record) {
      record = obj(record); var id = str(record.id, 80);
      if (!id || seen[id] || !STATIONS.some(function (item) { return item.id === record.station; })) return;
      seen[id] = true;
      result.observations.push({ id: id, station: record.station, model: model(record.model), date: str(record.date, 40), view: record.view === 'inspect' ? 'inspect' : 'illusion', camera: { y: num(obj(record.camera).y, 0, -160, 160), x: num(obj(record.camera).x, 0, -45, 60) } });
    });
    return result;
  }
  function checkAnswer(id, raw) {
    var m = model(raw);
    if (id === 'room') return !m.prediction ? 'choose' : m.prediction === 'same' ? 'correct' : 'again';
    if (id === 'triangle') return Math.abs(m.angle) <= 2 ? 'correct' : 'again';
    if (id === 'shape') return Math.abs(m.shift) <= 3 ? 'correct' : 'again';
    return 'again';
  }
  function compareObservation(raw, id, camera) {
    var state = normalize(raw), saved = state.observations.find(function (record) { return record.id === id; });
    if (!saved) return null;
    var sameStation = state.station === saved.station, pose = obj(camera);
    return { recordId: saved.id, fingerprint: JSON.stringify(saved), saved: saved, current: {
      station: saved.station, model: model(state.models[saved.station]), view: sameStation && state.view === 'inspect' ? 'inspect' : 'illusion',
      camera: { y: sameStation ? num(pose.y, 0, -160, 160) : 0, x: sameStation ? num(pose.x, 0, -45, 60) : 0 }
    }, view: 'saved' };
  }
  var CSS = `
    [data-perception-gallery]{--pg-ink:#203032;--pg-muted:#526466;--pg-bg:#fff;--pg-line:#c9d6d5;--pg-soft:#edf3f2;--pg-accent:#096a65;color:var(--pg-ink);background:var(--pg-bg);font-family:inherit;line-height:1.5;letter-spacing:0;min-width:0;padding:20px}
    [data-perception-gallery][data-theme=dark]{--pg-ink:#edf6f4;--pg-muted:#b9cdca;--pg-bg:#172323;--pg-line:#506966;--pg-soft:#263936;--pg-accent:#98e3d3}
    [data-perception-gallery][data-theme=contrast]{--pg-ink:#fff;--pg-muted:#fff;--pg-bg:#000;--pg-line:#fff;--pg-soft:#161616;--pg-accent:#ffed7a}
    [data-perception-gallery] *{box-sizing:border-box;letter-spacing:0}
    [data-perception-gallery] h2,[data-perception-gallery] h3,[data-perception-gallery] p,[data-perception-gallery] figure{margin:0}
    [data-perception-gallery] h2{font-size:26px;line-height:1.25;font-weight:750}
    [data-perception-gallery] h3{font-size:19px;line-height:1.35;font-weight:700}
    [data-perception-gallery] button,[data-perception-gallery] select,[data-perception-gallery] textarea{font:inherit;color:inherit}
    [data-perception-gallery] button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:8px 13px;border:1px solid var(--pg-line);border-radius:5px;background:var(--pg-bg);cursor:pointer;line-height:1.3;white-space:normal}
    [data-perception-gallery] button:hover{background:var(--pg-soft)}
    [data-perception-gallery] button:disabled{opacity:.55;cursor:default}
    [data-perception-gallery] button[aria-pressed=true]{border-color:var(--pg-accent);background:var(--pg-soft);box-shadow:inset 0 -3px var(--pg-accent)}
    [data-perception-gallery] :focus-visible{outline:3px solid var(--pg-accent);outline-offset:3px}
    [data-perception-gallery] a{color:var(--pg-accent);text-decoration:underline;text-underline-offset:3px}
    .pg-heading,.pg-toolbar,.pg-actions,.pg-notebook-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .pg-heading{padding-bottom:18px}.pg-eyebrow{font-size:12px;font-weight:700;text-transform:uppercase;color:var(--pg-muted);margin-bottom:5px}
    .pg-progress{font-size:14px;color:var(--pg-muted)}
    .pg-stations{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-block:1px solid var(--pg-line);margin-bottom:16px}
    [data-perception-gallery] .pg-station{display:flex;align-items:center;gap:12px;text-align:left;border:0;border-radius:0;padding:14px 12px;min-width:0}
    .pg-station+.pg-station{border-left:1px solid var(--pg-line)!important}.pg-station strong,.pg-station small{display:block}.pg-station strong{font-size:15px}.pg-station small{font-size:12px;color:var(--pg-muted)}
    .pg-station-number{font-size:22px;font-weight:750;color:var(--pg-accent);flex:none;width:29px}
    .pg-workspace{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:start}
    .pg-scene-column{min-width:0}.pg-toolbar{margin-bottom:10px}.pg-modes{display:flex;gap:4px;flex-wrap:wrap}.pg-view-options{display:flex;align-items:center;gap:6px;font-size:13px}
    .pg-view-options input{width:20px;height:20px;accent-color:var(--pg-accent)}
    .pg-stage{position:relative;width:100%;height:clamp(360px,57vh,680px);min-width:0;overflow:hidden;background:#e8eeed;isolation:isolate}
    .pg-render,.pg-diagram{position:absolute;inset:0;width:100%;height:100%}.pg-render{touch-action:pan-y}.pg-render[hidden]{display:none}.pg-diagram{display:block}
    .pg-render[data-picking=true]{cursor:pointer}.pg-hotspots{position:absolute;inset:0;pointer-events:none}
    [data-perception-gallery] .pg-hotspot{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;min-width:44px;max-width:150px;background:#fff;color:#203032;border:2px solid #096a65;box-shadow:0 2px 5px #20303226;padding:7px 10px;font-weight:650;font-size:13px}
    .pg-hotspot span:first-child{color:#096a65;font-weight:750}.pg-hotspot:hover{background:#edf3f2!important}
    .pg-stage figcaption{position:absolute;bottom:0;left:0;max-width:100%;background:#fff;color:#203032;padding:7px 12px;font-size:12px;border-top:1px solid #c9d6d5;pointer-events:none}
    .pg-render-state{position:absolute;top:12px;left:12px;right:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;color:#203032;border:1px solid #c9d6d5;padding:10px;font-size:14px}
    .pg-camera-controls{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding-top:10px;min-height:54px}.pg-camera-controls label{flex:1;min-width:125px;font-size:12px;color:var(--pg-muted)}
    .pg-camera-controls input{width:100%;display:block;accent-color:var(--pg-accent)}
    [data-perception-gallery] .pg-icon{font-size:23px;line-height:1;padding:7px;width:44px;min-width:44px}
    .pg-task{border-left:1px solid var(--pg-line);padding-left:24px;min-width:0}.pg-task>*+*{margin-top:16px!important}
    .pg-principle{color:var(--pg-accent);font-size:12px;text-transform:uppercase;font-weight:750}.pg-question{font-size:17px;font-weight:650}
    .pg-choices{display:flex;gap:6px;flex-wrap:wrap}.pg-choices button{flex:1;min-width:64px}
    .pg-adjust{display:block;font-size:14px;font-weight:600}.pg-adjust input{display:block;width:100%;min-height:36px;accent-color:var(--pg-accent);margin:5px 0}.pg-adjust output{float:right;font-variant-numeric:tabular-nums}
    .pg-puzzle-adjust{padding:14px 0 0;max-width:620px}
    .pg-primary{background:var(--pg-accent)!important;color:var(--pg-bg)!important;border-color:var(--pg-accent)!important;font-weight:700}
    .pg-result{font-size:14px;border-left:3px solid var(--pg-accent);padding-left:12px}.pg-result:empty{display:none}
    .pg-hints{font-size:14px}.pg-hints ol{margin:10px 0 0;padding-left:20px}.pg-hints li+li{margin-top:8px}
    .pg-measurements{font-size:13px;margin:14px 0}.pg-measurements div{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid var(--pg-line);padding:6px 0}.pg-measurements dd{margin:0;font-weight:650;text-align:right;font-variant-numeric:tabular-nums}.pg-measurement-unit{font-size:12px;color:var(--pg-muted)}
    .pg-comparison{border-block:1px solid var(--pg-line);padding:12px 0;margin-bottom:12px}.pg-comparison h3{font-size:17px}.pg-comparison .pg-actions{margin-top:10px;justify-content:flex-start}.pg-compare-table{width:100%;font-size:13px;border-collapse:collapse;table-layout:fixed;margin-top:12px}.pg-compare-table th,.pg-compare-table td{border-bottom:1px solid var(--pg-line);padding:7px 5px;text-align:left;overflow-wrap:anywhere;vertical-align:top}.pg-compare-table th{font-weight:650}.pg-compare-notes{font-size:14px}.pg-compare-notes p{white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0 14px}
    .pg-explanation{border-top:1px solid var(--pg-line);padding-top:16px;font-size:14px}.pg-explanation p{margin:8px 0 12px}
    .pg-note{font-size:14px;display:block}.pg-note textarea{display:block;background:var(--pg-bg);border:1px solid var(--pg-line);border-radius:4px;width:100%;min-height:80px;padding:10px;margin-top:7px;resize:vertical}
    .pg-status{min-height:24px;color:var(--pg-muted);font-size:14px;margin-top:12px!important}
    .pg-notebook{margin-top:24px;border-top:1px solid var(--pg-line);padding-top:16px}.pg-records{list-style:none;padding:0;margin:12px 0 0}.pg-record{padding:13px 0;border-top:1px solid var(--pg-line);display:flex;justify-content:space-between;gap:16px;align-items:start}.pg-record p{font-size:14px;overflow-wrap:anywhere;white-space:pre-wrap}.pg-record small{display:block;color:var(--pg-muted);margin:3px 0 7px}.pg-record .pg-actions{flex:none;justify-content:end}
    @media(max-width:1000px){.pg-workspace{grid-template-columns:minmax(0,1fr) 260px;gap:16px}.pg-task{padding-left:16px}}
    @media(max-width:760px){[data-perception-gallery]{padding:12px}.pg-workspace{grid-template-columns:1fr}.pg-task{border-left:0;border-top:1px solid var(--pg-line);padding:20px 0 0}.pg-stage{height:340px}.pg-station{align-items:flex-start!important;gap:5px!important;padding:10px 6px!important}.pg-station-number{font-size:16px;width:19px}.pg-station strong{font-size:13px}.pg-station small{display:none}.pg-record{flex-wrap:wrap}.pg-record .pg-actions{width:100%;justify-content:start}.pg-heading h2{font-size:23px}.pg-modes button{font-size:13px;padding:8px}.pg-heading{gap:10px}.pg-toolbar{align-items:start}.pg-hotspot .pg-hotspot-name{display:none}}
    @media(max-width:380px){.pg-stage{height:300px}.pg-station-number{display:none}.pg-station strong{font-size:12px}.pg-modes{gap:3px}.pg-modes button{padding:7px;font-size:12px}}
    @media(forced-colors:active){.pg-stage{forced-color-adjust:none}.pg-primary{border:2px solid ButtonText!important}.pg-stations button[aria-pressed=true]{outline:2px solid Highlight}}
  `;
  // The diagram is a permanent, non-WebGL route to the same spatial evidence.
  function Diagram(props) {
    var h = props.h, t = props.t, id = props.station, m = props.model, inspect = props.view === 'inspect', children;
    if (props.view === 'gallery') return h('svg', { className: 'pg-diagram', viewBox: '0 0 800 480', role: 'img', 'aria-label': t('overview_label', 'Gallery overview: room, sculpture, and star'), 'data-gallery-diagram': true },
      h('rect', { width: 800, height: 480, fill: '#e8eeed' }),
      STATIONS.map(function (item, index) { return h(Diagram, { key: item.id, h: h, t: t, station: item.id, model: model((props.models || {})[item.id]), view: 'illusion', mini: true, x: 10 + 260 * index, y: 60, width: 260, height: 260, description: item.title }); }));
    var line = function (x1, y1, x2, y2, color, key) { return h('line', { key: key, x1: x1, y1: y1, x2: x2, y2: y2, stroke: color || '#536e70', strokeWidth: 4, strokeLinecap: 'round' }); };
    if (id === 'room') children = inspect ? [h('polygon', { key: 'room', points: '175,365 615,365 520,215 260,90', fill: '#fff', stroke: '#607577', strokeWidth: 3 }),h('rect', { key: 'a', x: 265, y: 143, width: 44, height: 44, fill: '#bd4935' }),h('rect', { key: 'b', x: 470, y: 272, width: 44, height: 44, fill: '#077e79' }),h('text', { key: 'label', x: 400, y: 415, textAnchor: 'middle', fill: '#203032', fontSize: 19 }, 'Top view: equal objects, unequal distances')] : [h('polygon', { key: 'walls', points: '130,340 130,100 670,100 670,340', fill: '#fff', stroke: '#71878a', strokeWidth: 3 }),h('polygon', { key: 'floor', points: '130,340 670,340 755,440 45,440', fill: '#cddedb' }),line(130,340,45,440),line(670,340,755,440),h('rect', { key: 'a', x: 210, y: 227, width: 42, height: 112, fill: '#bd4935' }),h('rect', { key: 'b', x: 514, y: 164, width: 65, height: 175, fill: '#077e79' })];
    else if (id === 'triangle') { var offset = inspect ? 80 : m.angle * 1.3; children = [line(270,338,400,113,'#087f78','a'),line(400+offset,113,530+offset,338,'#c05740','b'),line(530-offset,338+offset*.4,270-offset,338+offset*.4,'#aa7d16','c')]; }
    else { var pieces=[]; for(var i=0;i<10;i++){var a=(i*36-90)*Math.PI/180,b=((i+1)*36-90)*Math.PI/180,r=i%2?64:151,s=(i+1)%2?64:151,dx=(inspect?(i%3-1)*90:m.shift*(i%2?1:-1)*.8);pieces.push(h('polygon',{key:i,points:(400+dx)+',250 '+(400+Math.cos(a)*r+dx)+','+(250+Math.sin(a)*r)+' '+(400+Math.cos(b)*s+dx)+','+(250+Math.sin(b)*s),fill:['#087f78','#c05740','#aa7d16'][i%3],stroke:'#e8eeed',strokeWidth:1}));}children=pieces; }
    return h('svg', { className: props.mini ? undefined : 'pg-diagram', x: props.x, y: props.y, width: props.width, height: props.height, viewBox: '0 0 800 480', role: 'img', 'aria-label': props.description, 'data-gallery-diagram': props.mini ? undefined : true }, h('rect', { width: 800, height: 480, fill: '#e8eeed' }), children);
  }
  function Gallery(props) {
    var ctx = props.ctx, React = ctx.React, h = React.createElement, state = normalize((ctx.toolData || {}).perceptionGallery), meta = station(state.station), m = state.models[meta.id];
    var uid = React.useId(), feedbackPair = React.useState(''), feedback = feedbackPair[0], setFeedback = feedbackPair[1], statusPair = React.useState(''), status = statusPair[0], setStatus = statusPair[1];
    var diagramPair = React.useState(false), diagram = diagramPair[0], setDiagram = diagramPair[1];
    var renderPair = React.useState('idle'), renderStatus = renderPair[0], setRenderStatus = renderPair[1];
    var orbitPair = React.useState({ y: 0, x: 0 }), orbit = orbitPair[0], setOrbit = orbitPair[1];
    var hostRef = React.useRef(null), viewerRef = React.useRef(null), drag = React.useRef(null), latest = React.useRef(null), stationFocus = React.useRef('');
    var retryPair = React.useState(0), retry = retryPair[0], setRetry = retryPair[1];
    var layoutPair = React.useState([]), layout = layoutPair[0], setLayout = layoutPair[1];
    var comparePair = React.useState(null), compareSession = comparePair[0], setCompareSession = comparePair[1], compareHeading = React.useRef(null), compareFocus = React.useRef(false), compareReturn = React.useRef(''), galleryRef = React.useRef(null);
    var comparisonRecord = compareSession && state.observations.find(function (record) { return record.id === compareSession.recordId; });
    var comparing = !!(compareSession && comparisonRecord && JSON.stringify(comparisonRecord) === compareSession.fingerprint);
    var shown = comparing ? compareSession[compareSession.view] : { station: state.station, model: m, view: state.view, camera: orbit };
    meta = station(shown.station); m = shown.model;
    var view = shown.view, cameraPose = shown.camera;
    function t(key, fallback) { var value; try { value = ctx.t && ctx.t('stem.perception.gallery_' + key, fallback); } catch (_) {} return typeof value === 'string' && value !== 'stem.perception.gallery_' + key ? value : fallback; }
    function update(fn) { var setter = ctx.setToolData || ctx.setLabToolData; if (setter) setter(function (prev) { return Object.assign({}, prev, { perceptionGallery: normalize(fn(normalize((prev || {}).perceptionGallery))) }); }); }
    function change(values) { if (comparing) return; setFeedback(''); setStatus(''); update(function (next) { next.models[meta.id] = model(Object.assign({}, next.models[meta.id], values)); return next; }); }
    function choose(id, focusStation) { drag.current = null; if (focusStation) stationFocus.current = id; setCompareSession(null); setOrbit({ y: 0, x: 0 }); setFeedback(''); setStatus(''); update(function (next) { next.station = id; next.view = 'illusion'; return next; }); }
    function setView(nextView) { if (comparing) return; drag.current = null; setOrbit({ y: 0, x: 0 }); update(function (next) { next.view = nextView; return next; }); }
    function button(label, handler, attrs) { return h('button', Object.assign({ type: 'button', onClick: handler }, attrs || {}), label); }
    function icon(name, fallback) { var component = (ctx.icons || {})[name] || (window.LucideReact || {})[name]; return component ? h(component, { size: 20, 'aria-hidden': true, focusable: false }) : h('span', { 'aria-hidden': true }, fallback); }
    var sceneData = { station: meta.id, view: view, angle: m.angle, shift: m.shift, galleryShift: state.models.shape.shift, reveal: m.reveal, rotY: cameraPose.y, rotX: cameraPose.x, zoom: 1, static: true, sig: [meta.id, view, m.shift, m.reveal, state.models.shape.shift].join(':') };
    latest.current = sceneData;
    React.useEffect(function () {
      if (diagram) { setRenderStatus('diagram'); return; }
      var active = true, factory = Lab.PerceptionGalleryScene;
      if (!factory || !Lab.makeOrbitViewer) { setRenderStatus('failed'); return; }
      var viewer = factory.createViewer(); viewerRef.current = viewer;
      if (viewer.onLayout) viewer.onLayout(function (markers) { if (active) setLayout(markers); });
      viewer.onStatusChange(function (value) { if (active) { setRenderStatus(value); if (value === 'ready') viewer.push(latest.current); } });
      viewer.attach(hostRef.current); viewer.push(latest.current); setRenderStatus(viewer.status());
      return function () { active = false; drag.current = null; viewer.dispose(); if (viewerRef.current === viewer) viewerRef.current = null; };
    }, [diagram, retry]);
    React.useEffect(function () { if (viewerRef.current) viewerRef.current.push(sceneData); }, [meta.id, view, m.angle, m.shift, m.reveal, state.models.shape.shift, cameraPose.y, cameraPose.x, diagram, retry]);
    React.useEffect(function () { setFeedback(''); setStatus(''); }, [meta.id]);
    React.useEffect(function () { if (stationFocus.current && galleryRef.current) { var node = galleryRef.current.querySelector('[data-gallery-station="' + stationFocus.current + '"]'); stationFocus.current = ''; if (node) node.focus(); } }, [state.station, state.view]);
    React.useEffect(function () {
      if (compareSession && !comparing) { compareReturn.current = compareSession.recordId; setCompareSession(null); setStatus(t('comparison_unavailable', 'The saved observation changed. Your current view is restored.')); }
      if (comparing && compareFocus.current && compareHeading.current) { compareFocus.current = false; compareHeading.current.focus(); if (compareHeading.current.scrollIntoView) compareHeading.current.scrollIntoView({ block: 'nearest' }); }
      if (!compareSession && compareReturn.current && galleryRef.current) {
        var wanted = compareReturn.current; compareReturn.current = '';
        var target = Array.from(galleryRef.current.querySelectorAll('[data-gallery-compare]')).find(function (node) { return node.getAttribute('data-gallery-compare') === wanted; }) || galleryRef.current.querySelector('[data-gallery-notebook-heading]');
        if (target) target.focus();
      }
    }, [compareSession, comparing]);
    function compare(id) { var session = compareObservation(state, id, orbit); if (!session) return; drag.current = null; compareFocus.current = true; setCompareSession(session); setFeedback(''); setStatus(''); }
    function closeComparison() { if (compareSession) compareReturn.current = compareSession.recordId; setCompareSession(null); }
    function check() {
      var result = checkAnswer(meta.id, m);
      if (result === 'choose') { setFeedback(t('choose_first', 'Choose an object comparison first.')); return; }
      if (result === 'correct') {
        setFeedback(m.assisted ? t('correct_explored', 'That matches the solution. Now compare the two viewpoints.') : t('correct', 'Solved. Inspect the geometry to see why it works.'));
        update(function (next) { var current = next.models[meta.id]; if (checkAnswer(meta.id, current) === 'correct' && !current.assisted) current.solved = true; return next; });
      } else setFeedback(meta.id === 'room' ? t('room_again', 'Look again: apparent height and physical height can differ. You can reveal the geometry to compare.') : t('align_again', 'The projected edges are still separated. Adjust the alignment and check again.'));
    }
    function reveal() {
      setFeedback(''); setOrbit({ y: 0, x: 0 });
      update(function (next) { var current = next.models[meta.id]; current.reveal = !current.reveal; if (current.reveal) { current.assisted = true; next.view = 'inspect'; } return next; });
    }
    function save() {
      if (state.observations.length >= 24) { setStatus(t('full', 'The gallery notebook is full. Delete an observation to make space.')); return; }
      var stamp = new Date().toISOString(), id = 'gallery-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      update(function (next) { if (next.observations.length < 24) next.observations.push({ id: id, station: next.station, model: model(next.models[next.station]), view: next.view === 'inspect' ? 'inspect' : 'illusion', camera: orbit, date: stamp }); return next; });
      setStatus(t('saved', 'Observation saved to the gallery notebook.'));
    }
    function restore(record) { setCompareSession(null); setOrbit(record.camera); setFeedback(''); update(function (next) { var completed = next.models[record.station].solved; next.station = record.station; next.view = record.view; next.models[record.station] = model(record.model); next.models[record.station].solved = completed || next.models[record.station].solved; return next; }); setStatus(t('restored', 'Saved viewpoint and observation restored.')); }
    function exportNotebook() {
      var blob = new Blob([JSON.stringify({ schema: 'alloflow.perception.gallery', version: 1, observations: state.observations }, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'perception-gallery-observations.json'; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    function reset() { setFeedback(''); setStatus(''); setOrbit({ y: 0, x: 0 }); update(function (next) { var note = next.models[meta.id].note; next.models[meta.id] = model({ note: note }); next.view = 'illusion'; return next; }); }
    function pointerDown(event) { if (comparing || ['inspect', 'gallery'].indexOf(view) < 0 || event.button !== 0 || diagram || renderStatus !== 'ready') return; drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: orbit.y, pitch: orbit.x, view: view, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }
    function pointerMove(event) { var d = drag.current; if (!d || d.id !== event.pointerId) return; var dx = event.clientX - d.x, dy = event.clientY - d.y; if (Math.hypot(dx, dy) > 6) d.moved = true; if (d.view !== 'inspect') return; setOrbit({ y: Math.max(-160, Math.min(160, d.yaw + dx * .35)), x: event.pointerType === 'touch' ? d.pitch : Math.max(-45, Math.min(60, d.pitch + dy * .25)) }); }
    function pointerEnd(event, cancelled) { var d = drag.current; if (!d || d.id !== event.pointerId) return; drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); if (!cancelled && d.view === 'gallery' && !d.moved && Math.hypot(event.clientX - d.x, event.clientY - d.y) <= 6 && viewerRef.current && viewerRef.current.pickStation) { var picked = viewerRef.current.pickStation(event.clientX, event.clientY); if (picked) choose(picked, true); } }
    function slider(key, label, min, max, value, handler) { return h('label', { className: 'pg-adjust', htmlFor: uid + '-' + key }, label, h('output', { htmlFor: uid + '-' + key }, value), h('input', { id: uid + '-' + key, type: 'range', min: min, max: max, step: 1, value: value, ['data-gallery-' + key]: true, onChange: function (event) { handler(Number(event.target.value)); } })); }
    var title = t(meta.id + '_title', meta.title), description = t(meta.id + '_scene', { room: 'A coral object on the left and a teal object on the right appear different heights inside a room.', triangle: 'Three colored beams surround a triangular opening. Their ends appear separated as the viewing angle changes.', shape: 'Ten colored fragments suggest a star. Their edges separate as their alignment changes.' }[meta.id]), actualDiagram = diagram || renderStatus !== 'ready';
    var progress = STATIONS.filter(function (item) { return state.models[item.id].solved; }).length;
    var markers = actualDiagram ? STATIONS.map(function (item, index) { return { id: item.id, x: .175 + index * .325, y: .73, visible: true }; }) : layout;
    function measurementView() {
      var measure = Lab.PerceptionGalleryScene && Lab.PerceptionGalleryScene.measurements;
      var values = measure && measure(meta.id, m), rows = [];
      if (!values) return null;
      if (meta.id === 'room') rows = [
        [t('left_height', 'Left object height'), values.objectHeight.toFixed(2)], [t('right_height', 'Right object height'), values.objectHeight.toFixed(2)],
        [t('left_distance', 'Left depth from illusion viewpoint'), values.leftDepthDistance.toFixed(2)], [t('right_distance', 'Right depth from illusion viewpoint'), values.rightDepthDistance.toFixed(2)],
        [t('image_ratio', 'Perspective scale: right / left'), values.apparentHeightRatio.toFixed(2) + ' : 1']
      ];
      if (meta.id === 'triangle') rows = [[t('beam_count', 'Separate beams'), String(values.beamCount)]].concat(values.joinGaps.map(function (gap, index) { return [t('corner_gap', 'Corner gap') + ' ' + (index + 1), gap.toFixed(2)]; }));
      if (meta.id === 'shape') rows = [[t('fragment_count', 'Fragments'), String(values.fragmentCount)], [t('depth_count', 'Distinct depths'), String(values.distinctDepths)], [t('depth_span', 'Front-face depth span'), values.depthSpan.toFixed(2)]];
      return h('div', { 'data-gallery-measurements': meta.id }, h('dl', { className: 'pg-measurements' }, rows.map(function (row, index) { return h('div', { key: index }, h('dt', null, row[0]), h('dd', null, row[1])); })), h('p', { className: 'pg-measurement-unit' }, t('model_units', 'Lengths are in model units. Depths and perspective scale use the illusion viewpoint.')));
    }
    function comparisonDetails() {
      var snapshots = [compareSession.current, compareSession.saved];
      var rows = [[t('view', 'Viewpoint'), function (entry) { return t('view_' + entry.view, entry.view === 'inspect' ? 'Inspect geometry' : 'Illusion view'); }],
        [meta.id === 'room' ? t('prediction', 'Your prediction') : meta.id === 'triangle' ? t('angle', 'Viewing angle') : t('shift', 'Fragment alignment'), function (entry) { return meta.id === 'room' ? t('choice_' + entry.model.prediction, { left: 'Left', same: 'Same', right: 'Right', '': 'Not recorded' }[entry.model.prediction]) : String(meta.id === 'triangle' ? entry.model.angle : entry.model.shift); }],
        [t('orbit', 'Orbit'), function (entry) { return entry.view === 'inspect' ? String(entry.camera.y) : t('fixed', 'Fixed'); }],
        [t('elevation', 'Elevation'), function (entry) { return entry.view === 'inspect' ? String(entry.camera.x) : t('fixed', 'Fixed'); }]];
      return h('aside', { className: 'pg-task', 'aria-label': t('comparison_details', 'Observation comparison') },
        h('div', { className: 'pg-principle' }, t(meta.id + '_principle', meta.principle)), h('h3', null, title),
        h('table', { className: 'pg-compare-table' }, h('thead', null, h('tr', null, h('th', { scope: 'col' }, t('setting', 'Setting')), h('th', { scope: 'col' }, t('current', 'Current')), h('th', { scope: 'col' }, t('saved_view', 'Saved')))),
          h('tbody', null, rows.map(function (row, index) { return h('tr', { key: index }, h('th', { scope: 'row' }, row[0]), snapshots.map(function (entry, slot) { return h('td', { key: slot }, row[1](entry)); })); }))),
        h('div', { className: 'pg-compare-notes' }, snapshots.map(function (entry, index) { return h('div', { key: index }, h('strong', null, index ? t('saved_note', 'Saved observation') : t('current_note', 'Current observation')), h('p', null, entry.model.note || t('no_note', 'No note recorded.'))); })));
    }
    return h('section', { ref: galleryRef, 'data-perception-gallery': true, 'data-theme': ctx.isContrast || ctx.theme === 'contrast' ? 'contrast' : ctx.isDark || ctx.theme === 'dark' ? 'dark' : 'light', 'aria-label': t('title', '3D perception gallery') },
      h('style', null, CSS),
      h('header', { className: 'pg-heading' }, h('div', null, h('div', { className: 'pg-eyebrow' }, t('lab', 'Perception Lab')), h('h2', null, t('title', '3D perception gallery'))),
        h('div', { className: 'pg-actions' }, h('span', { className: 'pg-progress' }, progress + ' / 3 ' + t('solved', 'solved')), props.onOpenWalk && button(h(React.Fragment, null, icon('Footprints', '+'), t('walk', 'Walk-through challenges')), props.onOpenWalk, { 'data-gallery-open-walk': true }), button(h(React.Fragment, null, icon('ArrowLeft', '\u2190'), ' ', t('back', 'Back to experiments')), props.onClose, { 'data-gallery-close': true }))),
      h('nav', { className: 'pg-stations', 'aria-label': t('stations', 'Gallery stations') }, STATIONS.map(function (item, index) { return button(h(React.Fragment, null, h('span', { className: 'pg-station-number', 'aria-hidden': true }, '0' + (index + 1)), h('span', null, h('strong', null, t(item.id + '_title', item.title)), h('small', null, state.models[item.id].solved ? t('solved_station', 'Solved') : t(item.id + '_principle', item.principle)))), function () { choose(item.id); }, { key: item.id, className: 'pg-station', 'data-gallery-station': item.id, 'aria-pressed': meta.id === item.id && view !== 'gallery' }); })),
      h('div', { className: 'pg-workspace' }, h('div', { className: 'pg-scene-column' },
        comparing && h('section', { className: 'pg-comparison', 'data-gallery-comparison': true, 'aria-label': t('comparison_details', 'Observation comparison') },
          h('h3', { ref: compareHeading, tabIndex: -1 }, t('compare_heading', 'Compare observations') + ': ' + title),
          h('div', { className: 'pg-actions' }, h('div', { className: 'pg-modes', role: 'group', 'aria-label': t('comparison_view', 'Displayed observation') }, ['current', 'saved'].map(function (slot) { return button(t(slot === 'current' ? 'current_view' : 'saved_view', slot === 'current' ? 'Current view' : 'Saved view'), function () { setCompareSession(function (previous) { return previous ? Object.assign({}, previous, { view: slot }) : null; }); }, { key: slot, 'data-gallery-compare-view': slot, 'aria-pressed': compareSession.view === slot }); })), button(t('close_comparison', 'Close comparison'), closeComparison, { 'data-gallery-compare-close': true }))),
        h('div', { className: 'pg-toolbar' }, h('div', { className: 'pg-modes', role: 'group', 'aria-label': t('view', 'Viewpoint') }, ['gallery', 'illusion', 'inspect'].map(function (nextView) { return button(t('view_' + nextView, { gallery: 'Whole gallery', illusion: 'Illusion view', inspect: 'Inspect geometry' }[nextView]), function () { setView(nextView); }, { key: nextView, 'aria-pressed': view === nextView, 'data-gallery-view': nextView, disabled: comparing }); })),
          h('label', { className: 'pg-view-options' }, h('input', { type: 'checkbox', checked: diagram, 'data-gallery-diagram-toggle': true, onChange: function (event) { setDiagram(event.target.checked); } }), t('diagram', 'Diagram view'))),
        h('figure', { className: 'pg-stage', 'aria-label': view === 'gallery' ? t('overview_scene', 'A gallery containing a distorted room, an impossible sculpture, and a fragmented star.') : title + '. ' + (view === 'inspect' || m.reveal ? t(meta.id + '_explanation', meta.explanation) : description) },
          actualDiagram && h(Diagram, { h: h, t: t, station: meta.id, model: m, models: state.models, view: view, description: description }),
          h('div', { className: 'pg-render', ref: hostRef, hidden: actualDiagram, 'data-gallery-render': true, 'data-picking': view === 'gallery' && !comparing, onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerEnd, onPointerCancel: function (event) { pointerEnd(event, true); }, onLostPointerCapture: function () { drag.current = null; } }),
          view === 'gallery' && !comparing && h('div', { className: 'pg-hotspots', role: 'group', 'aria-label': t('stations', 'Gallery stations') }, markers.filter(function (marker) { return marker.visible; }).map(function (marker) { var item = station(marker.id), index = STATIONS.indexOf(item); return button(h(React.Fragment, null, h('span', null, '0' + (index + 1)), h('span', { className: 'pg-hotspot-name' }, t(item.id + '_short', { room: 'Room', triangle: 'Sculpture', shape: 'Star' }[item.id]))), function () { choose(item.id, true); }, { key: item.id, className: 'pg-hotspot', 'data-gallery-hotspot': item.id, 'aria-label': t('enter', 'Enter this station') + ': ' + t(item.id + '_title', item.title), title: t(item.id + '_title', item.title), style: { left: (marker.x * 100) + '%', top: (marker.y * 100) + '%' } }); })),
          !diagram && renderStatus !== 'ready' && h('div', { className: 'pg-render-state', role: 'status' }, renderStatus === 'failed' ? t('failed', '3D unavailable. The diagram remains available.') : t('loading', 'Opening the gallery...'), renderStatus === 'failed' && button(t('retry', 'Retry 3D'), function () { setRetry(retry + 1); }, { 'data-gallery-retry': true })),
          h('figcaption', null, (comparing ? t(compareSession.view === 'saved' ? 'saved_view' : 'current_view', compareSession.view === 'saved' ? 'Saved view' : 'Current view') + ' / ' : '') + (view === 'gallery' ? t('gallery_caption', 'Three stations / one space') : (actualDiagram ? t('diagram_caption', 'Diagram') + ' / ' : '') + title + ' / ' + t('view_' + view, view === 'inspect' ? 'Inspect geometry' : 'Illusion view')))),
        !comparing && meta.id !== 'room' && view !== 'gallery' && h('div', { className: 'pg-puzzle-adjust' }, meta.id === 'triangle' ? slider('angle', t('angle', 'Viewing angle'), -60, 60, m.angle, function (value) { change({ angle: value }); }) : slider('shift', t('shift', 'Fragment alignment'), -100, 100, m.shift, function (value) { change({ shift: value }); })),
        !comparing && view === 'inspect' && h('div', { className: 'pg-camera-controls', role: 'group', 'aria-label': t('camera', 'Inspection camera') },
          slider('yaw', t('orbit', 'Orbit'), -160, 160, orbit.y, function (value) { setOrbit({ y: value, x: orbit.x }); }),
          slider('pitch', t('elevation', 'Elevation'), -45, 60, orbit.x, function (value) { setOrbit({ y: orbit.y, x: value }); }),
          button(icon('RotateCcw', '\u21ba'), function () { setOrbit({ y: 0, x: 0 }); }, { className: 'pg-icon', title: t('reset_view', 'Reset inspection camera'), 'aria-label': t('reset_view', 'Reset inspection camera') })),
        h('p', { className: 'pg-status', role: 'status', 'aria-live': 'polite', 'data-gallery-status': true }, status)),
        comparing ? comparisonDetails() : h('aside', { className: 'pg-task', 'aria-label': t('puzzle', 'Station puzzle') },
          h('div', { className: 'pg-principle' }, t(meta.id + '_principle', meta.principle)), h('h3', null, title), h('p', { className: 'pg-question' }, t(meta.id + '_question', meta.question)),
          state.view === 'gallery' && button(t('enter', 'Enter this station'), function () { setView('illusion'); }, { className: 'pg-primary' }),
          meta.id === 'room' && h('div', { className: 'pg-choices', role: 'group', 'aria-label': t('prediction', 'Your prediction') }, ['left', 'same', 'right'].map(function (choice) { return button(t('choice_' + choice, { left: 'Left', same: 'Same', right: 'Right' }[choice]), function () { change({ prediction: choice }); }, { key: choice, 'data-gallery-choice': choice, 'aria-pressed': m.prediction === choice }); })),
          h('div', { className: 'pg-actions' }, button(t('check', 'Check answer'), check, { 'data-gallery-check': true, className: 'pg-primary' }), button(icon('RotateCcw', '\u21ba'), reset, { className: 'pg-icon', title: t('reset', 'Reset this puzzle'), 'aria-label': t('reset', 'Reset this puzzle'), 'data-gallery-reset': true })),
          h('p', { className: 'pg-result', role: 'status', 'data-gallery-feedback': true }, feedback),
          h('div', { className: 'pg-hints' }, button(h(React.Fragment, null, icon('Lightbulb', '?'), t(m.hints ? 'another_hint' : 'hint', m.hints ? 'Another hint' : 'Hint')), function () { change({ hints: Math.min(2, m.hints + 1) }); }, { 'data-gallery-hint': true, disabled: m.hints >= 2, 'aria-controls': uid + '-hints' }),
            h('div', { id: uid + '-hints', 'aria-live': 'polite', 'data-gallery-hints': true }, m.hints > 0 && h('ol', null, meta.hints.slice(0, m.hints).map(function (hint, index) { return h('li', { key: index }, t(meta.id + '_hint_' + (index + 1), hint)); })))),
          button(t('reveal', 'Reveal geometry'), reveal, { 'data-gallery-reveal': true, 'aria-pressed': m.reveal }),
          m.reveal && h('div', { className: 'pg-explanation', 'data-gallery-explanation': true }, h('strong', null, t('why', 'Why it works')), h('p', null, t(meta.id + '_explanation', meta.explanation)),
            measurementView(),
            meta.id !== 'room' && button(t('solution', 'Show aligned view'), function () { change(meta.id === 'triangle' ? { angle: 0 } : { shift: 0 }); setView('illusion'); }, { 'data-gallery-solution': true }),
            h('p', null, h('a', { href: meta.source, target: '_blank', rel: 'noopener noreferrer' }, t('reference', 'Explore the principle: Exploratorium')))),
          h('label', { className: 'pg-note', htmlFor: uid + '-note' }, t('note', 'What changed when you changed your view?'), h('textarea', { id: uid + '-note', value: m.note, maxLength: 600, 'data-gallery-note': true, onChange: function (event) { change({ note: event.target.value }); } })),
          button(t('save', 'Save observation'), save, { 'data-gallery-save': true, disabled: state.observations.length >= 24 }))),
      h('section', { className: 'pg-notebook', 'aria-label': t('notebook', 'Gallery notebook') },
        h('div', { className: 'pg-notebook-heading' }, h('h3', { tabIndex: -1, 'data-gallery-notebook-heading': true }, t('notebook', 'Gallery notebook')), h('div', { className: 'pg-actions' }, h('span', { className: 'pg-progress' }, state.observations.length + ' / 24'), button(t('export', 'Export observations'), exportNotebook, { disabled: !state.observations.length, 'data-gallery-export': true }))),
        !state.observations.length && h('p', { className: 'pg-status' }, t('empty', 'No observations saved yet.')),
        h('ol', { className: 'pg-records' }, state.observations.slice().reverse().map(function (record) { var item = station(record.station); return h('li', { key: record.id, className: 'pg-record', 'data-gallery-record': record.id },
          h('div', null, h('strong', null, t(item.id + '_title', item.title)), h('small', null, t('view_' + record.view, record.view === 'inspect' ? 'Inspect geometry' : 'Illusion view') + ' / ' + (record.model.solved ? record.model.hints ? t('solved_hint', 'Solved with hints') : t('solved_station', 'Solved') : record.model.assisted ? t('explored', 'Explored') : t('observed', 'Observed'))),
            Number.isFinite(Date.parse(record.date)) && h('small', null, h('time', { dateTime: record.date }, new Date(record.date).toLocaleString())), h('p', null, record.model.note)),
          h('div', { className: 'pg-actions' }, button(t('revisit', 'Revisit'), function () { restore(record); }, { 'aria-label': t('revisit', 'Revisit') + ': ' + t(item.id + '_title', item.title) }),
            button(t('compare', 'Compare'), function () { compare(record.id); }, { 'data-gallery-compare': record.id, 'aria-label': t('compare', 'Compare') + ': ' + t(item.id + '_title', item.title), 'aria-pressed': comparing && compareSession.recordId === record.id }),
            button(icon('X', '\u00d7'), function () { update(function (next) { next.observations = next.observations.filter(function (entry) { return entry.id !== record.id; }); return next; }); setStatus(t('deleted', 'Observation deleted.')); }, { className: 'pg-icon', title: t('delete', 'Delete observation'), 'aria-label': t('delete', 'Delete observation') + ': ' + t(item.id + '_title', item.title) }))); }))));
  }
  Lab.PerceptionGallery = { Component: Gallery, normalize: normalize, normalizeModel: model, checkAnswer: checkAnswer, compareObservation: compareObservation, stations: STATIONS };
})();
