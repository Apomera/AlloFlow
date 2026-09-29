/* Water Worlds v1: deterministic finite-volume teaching watershed.
 * Storage is mm over equal 400 m² cells; elevation is m; time is minutes.
 * Local routing is a bounded head-gradient approximation, not a flood forecast.
 */
(function (root) {
  'use strict';
  var VERSION = 1, COLS = 12, ROWS = 8, AREA = 400, STEP = 0.25, OBSERVATION_LIMIT = 6;
  var COVERS = {
    grass: { label: 'Meadow', infiltration: 18, depression: 1.5, color: '#80ad68' },
    forest: { label: 'Woodland', infiltration: 35, depression: 3, color: '#397f60' },
    paved: { label: 'Paving', infiltration: 0.4, depression: 0.3, color: '#8593a1' },
    basin: { label: 'Retention garden', infiltration: 25, depression: 28, color: '#66a99c' },
    stream: { label: 'Stream bed', infiltration: 1, depression: 0, color: '#b2c2b8' }
  };
  function number(n, low, high, fallback) { return typeof n === 'number' && isFinite(n) ? Math.max(low, Math.min(high, n)) : fallback; }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function sum(cells, key) { return cells.reduce(function (v, c) { return v + c[key]; }, 0); }
  function total(w) { return (sum(w.cells, 'surface') + sum(w.cells, 'soil') + sum(w.cells, 'ground')) * AREA / 1000; }
  function create(wetness) {
    var wet = number(wetness, 0, 100, 35), cells = [];
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      var channel = x === 5 || x === 6;
      cells.push({ x: x, y: y, elevation: (ROWS - 1 - y) * 0.16 + Math.pow(Math.abs(x - 5.5), 1.35) * 0.18,
        cover: channel ? 'stream' : (x < 3 && y < 5 ? 'forest' : x > 8 && y > 2 && y < 6 ? 'paved' : 'grass'),
        surface: 0, soil: 120 * wet / 100, ground: 0 });
    }
    var w = { version: VERSION, minutes: 0, cells: cells, rainM3: 0, outM3: 0, evapM3: 0, initialM3: 0, discharge: 0, peak: 0 };
    w.initialM3 = total(w); return w;
  }
  function validWorld(w) {
    return !!(w && w.version === VERSION && Array.isArray(w.cells) && w.cells.length === COLS * ROWS &&
      ['minutes', 'rainM3', 'outM3', 'evapM3', 'initialM3', 'discharge', 'peak'].every(function (k) { return typeof w[k] === 'number' && isFinite(w[k]) && w[k] >= 0; }) &&
      w.cells.every(function (c, i) { return c && c.x === i % COLS && c.y === Math.floor(i / COLS) && COVERS[c.cover] && ((c.x === 5 || c.x === 6) === (c.cover === 'stream')) &&
        ['surface', 'soil', 'ground', 'elevation'].every(function (k) { return typeof c[k] === 'number' && isFinite(c[k]) && c[k] >= 0 && c[k] <= 100000; }) && c.soil <= 120 + 1e-8; }));
  }
  var PATTERNS={steady:'Steady rain',early:'Heavier first half',late:'Heavier second half'};
  function pattern(s){return s&&Object.prototype.hasOwnProperty.call(PATTERNS,s.pattern)?s.pattern:'steady';}
  function settings(s) { s = s || {}; return { rain: number(s.rain, 5, 100, 45), duration: number(s.duration, 10, 120, 40), wetness: number(s.wetness, 0, 100, 35), pattern: pattern(s) }; }
  function rainAt(forcing,minute){
    if(minute<0||minute>=forcing.duration)return 0;
    var p=pattern(forcing),first=minute<forcing.duration/2;
    return forcing.rain*(p==='steady'?1:((p==='early')===first?1.5:.5));
  }
  function rainDuring(forcing,minute,dt){
    if(dt<=0)return 0;
    if(pattern(forcing)==='steady')return forcing.rain*Math.max(0,Math.min(dt,forcing.duration-minute))/dt;
    var half=forcing.duration/2,end=forcing.duration;
    function overlap(a,b){return Math.max(0,Math.min(minute+dt,b)-Math.max(minute,a));}
    return (rainAt(forcing,0)*overlap(0,half)+rainAt(forcing,half)*overlap(half,end))/dt;
  }
  function measure(w) {
    var stored = total(w);
    return { minutes: w.minutes, rainM3: w.rainM3, outM3: w.outM3, evapM3: w.evapM3,
      surfaceM3: sum(w.cells, 'surface') * AREA / 1000, soilM3: sum(w.cells, 'soil') * AREA / 1000,
      groundM3: sum(w.cells, 'ground') * AREA / 1000, storedM3: stored,
      errorM3: w.initialM3 + w.rainM3 - w.outM3 - w.evapM3 - stored, discharge: w.discharge, peak: w.peak };
  }
  function step(w, rain, dt, options) {
    dt = number(dt, 0, STEP, STEP); rain = number(rain, 0, 150, 0); options = options || {};
    var n = Object.assign({}, w, { cells: w.cells.map(function (c) { return Object.assign({}, c); }) });
    var released = 0, out = 0, vapor = 0, rainDepth = rain * dt / 60;
    var trace = options.trace; if (trace) { trace.routes = []; trace.cells = []; trace.minutes = dt; }
    n.cells.forEach(function (c) {
      var cover = COVERS[c.cover]; c.surface += rainDepth;
      var infiltration = Math.min(c.surface, 120 - c.soil, cover.infiltration * (1 - 0.85 * c.soil / 120) * dt / 60);
      c.surface -= infiltration; c.soil += infiltration;
      // Drain only water above field capacity. Ground is delayed subsurface storage,
      // not a resolved aquifer or a predicted water table.
      var drain = Math.min(Math.max(0, c.soil - 72), 8 * Math.max(0, c.soil - 72) / 48 * dt / 60);
      c.soil -= drain; c.ground += drain;
      var release = c.ground * (1 - Math.exp(-dt / 720)); c.ground -= release; released += release;
      // Constant mild evaporative demand; intentionally no atmospheric feedback.
      var evap = Math.min(c.surface, 0.10 * dt / 60); c.surface -= evap;
      var transpire = Math.min(c.soil, (c.cover === 'forest' ? 0.18 : c.cover === 'paved' ? 0.01 : 0.08) * dt / 60);
      c.soil -= transpire; vapor += evap + transpire;
      if (trace) trace.cells.push({ infiltrationMm: infiltration, drainageMm: drain, releaseMm: release, surfaceEvaporationMm: evap, soilEvapotranspirationMm: transpire, evaporationMm: evap + transpire });
    });
    // Equal-cell transfers: delayed drainage feeds stream cells, conserving mass.
    n.cells.forEach(function (c) { if (c.cover === 'stream') c.surface += released / (ROWS * 2); });
    var delta = n.cells.map(function () { return 0; });
    n.cells.forEach(function (c, i) {
      var head = c.elevation + c.surface / 1000, neighbors = [], weight = 0;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (v) {
        var x = c.x + v[0], y = c.y + v[1]; if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
        var j = y * COLS + x, other = n.cells[j], slope = (head - other.elevation - other.surface / 1000) / 20;
        if (slope > 0) { neighbors.push({ i: j, weight: slope }); weight += slope; }
      });
      if (!options.closed && c.y === ROWS - 1 && c.cover === 'stream') { neighbors.push({ i: -1, weight: 0.03 }); weight += 0.03; }
      if (!weight) return;
      var available = Math.max(0, c.surface - COVERS[c.cover].depression);
      var moving = available * (1 - Math.exp(-dt * 0.35 * Math.min(2, weight * 25)));
      delta[i] -= moving;
      neighbors.forEach(function (v) { var transfer = moving * v.weight / weight; if (trace && transfer > 0) trace.routes.push({ from: i, to: v.i, depthMm: transfer, flowM3s: dt ? transfer * AREA / 1000 / (dt * 60) : 0 }); if (v.i < 0) out += transfer; else delta[v.i] += transfer; });
    });
    n.cells.forEach(function (c, i) { c.surface += delta[i]; });
    n.minutes += dt; n.rainM3 += rainDepth * n.cells.length * AREA / 1000;
    n.outM3 += out * AREA / 1000; n.evapM3 += vapor * AREA / 1000;
    n.discharge = dt ? out * AREA / 1000 / (dt * 60) : 0; n.peak = Math.max(n.peak, n.discharge);
    return n;
  }
  // Probe the next fixed step using the same equations, without changing the world.
  function diagnose(w, rain) { var trace = {}; step(w, rain, STEP, { trace: trace }); return trace; }
  // Account for one cell over the next fixed step. Every transfer is a depth
  // over the same 400 m² cell, so surface routes can be added directly.
  function cellBudget(w, rain, selected) {
    if (!validWorld(w) || typeof selected !== 'number' || !isFinite(selected) || Math.floor(selected) !== selected || selected < 0 || selected >= w.cells.length) return null;
    rain = number(rain, 0, 150, 0);
    var trace = {}, next = step(w, rain, STEP, { trace: trace }), local = trace.cells[selected];
    var incoming = trace.routes.filter(function (route) { return route.to === selected; });
    var outgoing = trace.routes.filter(function (route) { return route.from === selected; });
    function stores(c) { return { surface: c.surface, soil: c.soil, ground: c.ground }; }
    function depth(routes) { return routes.reduce(function (value, route) { return value + route.depthMm; }, 0); }
    function stored(c) { return c.surface + c.soil + c.ground; }
    // The model pools delayed subsurface releases across the whole valley and
    // shares them evenly among stream cells; it does not resolve aquifer paths.
    var receipt = w.cells[selected].cover === 'stream' ? trace.cells.reduce(function (value, cell) { return value + cell.releaseMm; }, 0) / (ROWS * 2) : 0;
    var transfers = { rainMm: rain * STEP / 60, infiltrationMm: local.infiltrationMm, drainageMm: local.drainageMm,
      releaseMm: local.releaseMm, surfaceEvaporationMm: local.surfaceEvaporationMm, soilEvapotranspirationMm: local.soilEvapotranspirationMm,
      incomingSurfaceMm: depth(incoming), outgoingSurfaceMm: depth(outgoing), streamReceiptMm: receipt };
    var before = stores(w.cells[selected]), after = stores(next.cells[selected]);
    var inputs = transfers.rainMm + transfers.incomingSurfaceMm + transfers.streamReceiptMm;
    var outputs = transfers.outgoingSurfaceMm + transfers.releaseMm + transfers.surfaceEvaporationMm + transfers.soilEvapotranspirationMm;
    return { selected: selected, minutes: STEP, before: before, after: after, transfers: transfers, incoming: incoming, outgoing: outgoing,
      balance: { beforeMm: stored(before), inputsMm: inputs, outputsMm: outputs, afterMm: stored(after), errorMm: stored(before) + inputs - outputs - stored(after) } };
  }
  function initial() { return { version: VERSION, world: create(35), settings: settings(), level: 'investigate', selected: 44, lens: 'water', running: false, run: null, baseline: null, prediction: '', reflection: '', question: 'free', differenceStore: 'surface', editHistory: [], observations: [], observationSequence: 0 }; }
  function validRun(run, world) { return !!(run && validWorld(run.start) && Array.isArray(run.samples) && run.samples.length > 0 && run.samples.length <= 241 && run.samples[0] && run.samples[0].t === 0 &&
    typeof run.complete === 'boolean' && typeof run.paired === 'boolean' &&
    run.samples.every(function (sample, i) { return sample && (!i || sample.t > run.samples[i - 1].t); }) &&
    run.samples.every(function (s) { return s && ['t', 'q', 'surface', 'soil'].every(function (k) { return typeof s[k] === 'number' && isFinite(s[k]) && s[k] >= 0; }); }) &&
    run.forcing && (run.forcing.pattern == null || Object.prototype.hasOwnProperty.call(PATTERNS,run.forcing.pattern)) && run.forcing.rain === settings(run.forcing).rain && run.forcing.duration === settings(run.forcing).duration && world &&
    world.minutes >= run.start.minutes && world.minutes <= run.start.minutes + run.forcing.duration + 60 + 1e-8 &&
    run.complete === (world.minutes >= run.start.minutes + run.forcing.duration + 60 - 1e-8) &&
    run.samples[run.samples.length - 1].t <= world.minutes - run.start.minutes + 1e-8); }
  function restore(saved) {
    if (!saved || saved.version !== VERSION || !validWorld(saved.world)) return initial();
    var s = Object.assign(initial(), copy(saved)); s.settings = settings(s.settings); s.running = false;
    s.selected = Math.floor(number(s.selected, 0, COLS * ROWS - 1, 44));
    if (!['notice', 'investigate', 'model'].includes(s.level)) s.level = 'investigate';
    if (!['water', 'soil', 'flow', 'difference'].includes(s.lens)) s.lens = 'water';
    if (!['surface','soil','ground'].includes(s.differenceStore)) s.differenceStore = 'surface';
    s.prediction = typeof s.prediction === 'string' ? s.prediction.slice(0, 1000) : '';
    s.reflection = typeof s.reflection === 'string' ? s.reflection.slice(0, 2000) : '';
    if (!['free','cover','retention','memory','timing'].includes(s.question)) s.question = 'free';
    var seenObservations = {};
    s.observations = (Array.isArray(s.observations) ? s.observations.slice(0, OBSERVATION_LIMIT) : []).map(restoreObservation).filter(function (entry) {
      if (!entry || seenObservations[entry.id]) return false; seenObservations[entry.id] = true; return true;
    });
    s.observationSequence = Math.max(Math.floor(number(s.observationSequence, 0, 1e12, 0)), s.observations.reduce(function (highest, entry) { return Math.max(highest, Number(entry.id.slice(12))); }, 0));
    s.editHistory = []; // Undo is scoped to edits since opening this view or starting a storm.
    if (!validRun(s.run, s.world)) s.run = null;
    if (!s.baseline || !validWorld(s.baseline.world) || !validRun(s.baseline.run, s.baseline.world) || !s.baseline.run.complete) s.baseline = null;
    return s;
  }
  function begin(s, replay) {
    var base = replay && s.baseline ? s.baseline.run : null;
    var w = copy(base ? base.start : s.world), forcing = settings(base ? base.forcing : s.settings);
    var timing=replay==='timing'&&!!base;
    if(timing)forcing.pattern=pattern(s.settings);
    if (base&&!timing) w.cells.forEach(function (c, i) { c.cover = s.world.cells[i].cover; });
    w.peak = 0; w.discharge = 0;
    return Object.assign({}, s, { world: w, settings: settings(forcing), running: true, editHistory: [],
      run: { start: copy(w), forcing: forcing, paired: !!base&&!timing, timingTest: timing, complete: false,
        samples: [{ t: 0, q: 0, surface: measure(w).surfaceM3, soil: measure(w).soilM3 }] } });
  }
  function advance(s, minutes) {
    if (!s.run || s.run.complete) return s;
    var run = Object.assign({}, s.run, { samples: s.run.samples.slice() }), w = s.world;
    var end = run.start.minutes + run.forcing.duration + 60;
    var target = Math.min(end, w.minutes + number(minutes, 0, 240, 1));
    while (w.minutes < target - 1e-9) {
      var elapsed = w.minutes - run.start.minutes;
      var dt = Math.min(STEP, target - w.minutes);
      // Integrate rainfall depth exactly across the midpoint and storm-end boundaries.
      w = step(w, rainDuring(run.forcing, elapsed, dt), dt);
      var t = w.minutes - run.start.minutes, last = run.samples[run.samples.length - 1];
      if (t - last.t >= 1 - 1e-8 || w.minutes >= end - 1e-8) {
        var m = measure(w); run.samples.push({ t: t, q: m.discharge, surface: m.surfaceM3, soil: m.soilM3 });
      }
    }
    run.complete = w.minutes >= end - 1e-8;
    return Object.assign({}, s, { world: w, run: run, running: run.complete ? false : s.running });
  }
  // Use one plan for the design preview and the actual edit so clipped patches,
  // protected stream cells, and already-matching cover have identical meanings.
  function editPlan(s, requested, cover) {
    var targets = [], changes = [], streams = 0;
    var validCover = Object.prototype.hasOwnProperty.call(COVERS, cover) && cover !== 'stream';
    s.world.cells.forEach(function (c, i) {
      if (!Array.isArray(requested) || requested.indexOf(i) < 0) return;
      targets.push(i);
      if (c.cover === 'stream') streams++;
      else if (validCover && c.cover !== cover) changes.push(i);
    });
    var reason = !validCover ? 'invalid-cover' : !targets.length ? 'invalid-selection' :
      s.run && !s.run.complete ? 'active-run' : !changes.length ? (streams === targets.length ? 'stream-only' : 'unchanged') : null;
    return { targetIndices: targets, indices: changes, changeCount: changes.length, excludedStreams: streams,
      areaM2: changes.length * AREA, canApply: reason === null, reason: reason };
  }
  function landPlan(s, selected, cover, patch) {
    var indices = [];
    if (typeof selected === 'number' && isFinite(selected) && Math.floor(selected) === selected && selected >= 0 && selected < COLS * ROWS) {
      var cx = selected % COLS, cy = Math.floor(selected / COLS), radius = patch ? 1 : 0;
      for (var y = Math.max(0, cy - radius); y <= Math.min(ROWS - 1, cy + radius); y++)
        for (var x = Math.max(0, cx - radius); x <= Math.min(COLS - 1, cx + radius); x++) indices.push(y * COLS + x);
    }
    return editPlan(s, indices, cover);
  }
  function edit(s, indices, cover) {
    var plan = editPlan(s, indices, cover);
    if (!plan.canApply) return s;
    var history = (s.editHistory || []).slice(-7); history.push({ covers: s.world.cells.map(function (c) { return c.cover; }), run: s.run });
    var w = Object.assign({}, s.world, { cells: s.world.cells.map(function (c, i) {
      return plan.indices.indexOf(i) >= 0 ? Object.assign({}, c, { cover: cover }) : c;
    }) });
    return Object.assign({}, s, { world: w, run: null, running: false, editHistory: history });
  }
  function undo(s) {
    if ((s.run && !s.run.complete) || !s.editHistory || !s.editHistory.length) return s;
    var history = s.editHistory.slice(), last = history.pop();
    var w = Object.assign({}, s.world, { cells: s.world.cells.map(function (c, i) { return Object.assign({}, c, { cover: last.covers[i] }); }) });
    return Object.assign({}, s, { world: w, run: last.run, running: false, editHistory: history });
  }
  function record(s) { if (!s.run || !s.run.complete) return s; return Object.assign({}, s, { baseline: { run: copy(s.run), world: copy(s.world) } }); }
  function result(w, run) {
    var now = measure(w), start = measure(run.start);
    return { rainfallM3: now.rainM3 - start.rainM3, outflowM3: now.outM3 - start.outM3,
      evaporationM3: now.evapM3 - start.evapM3, storageChangeM3: now.storedM3 - start.storedM3,
      peakM3s: now.peak, errorM3: now.errorM3, elapsedMinutes: w.minutes - run.start.minutes };
  }
  // Reconstruct recorded time from initial conditions; never rewind the live world.
  function atTime(run, minutes) {
    var session = initial(); session.world = copy(run.start);
    session.run = Object.assign({}, run, { complete: false, samples: [copy(run.samples[0])] });
    return advance(session, number(minutes, 0, run.forcing.duration + 60, 0)).world;
  }
  // Saved readings are detached from the evolving world and carry the full initial
  // conditions. Equal model times alone cannot identify the same experiment.
  function observationNote(note) { return typeof note === 'string' ? note.slice(0, 600) : ''; }
  function observationSnapshot(run, selected, minute, note, id) {
    var world = atTime(run, minute);
    return { id: id, minute: minute, modelMinute: world.minutes, selected: selected,
      cell: copy(world.cells[selected]), totals: measure(world), result: result(world, run), note: observationNote(note),
      provenance: { start: copy(run.start), forcing: copy(settings(run.forcing)) } };
  }
  function observe(s, minute, note) {
    var entries = s.observations || [];
    if (!s.run || entries.length >= OBSERVATION_LIMIT) return s;
    var elapsed = Math.max(0, s.world.minutes - s.run.start.minutes), time = number(minute, 0, elapsed, elapsed);
    var selected = Math.floor(number(s.selected, 0, COLS * ROWS - 1, 44));
    var sequence = Math.floor(number(s.observationSequence, 0, 1e12, 0)) + 1;
    while (entries.some(function (entry) { return entry.id === 'observation-' + sequence; })) sequence++;
    var entry = observationSnapshot(s.run, selected, time, note, 'observation-' + sequence);
    return Object.assign({}, s, { observations: entries.concat([entry]), observationSequence: sequence });
  }
  function removeObservation(s, id) {
    var entries = s.observations || [], kept = entries.filter(function (entry) { return entry.id !== id; });
    return kept.length === entries.length ? s : Object.assign({}, s, { observations: kept });
  }
  function updateObservationNote(s, id, note) {
    var clean = observationNote(note), changed = false;
    var entries = (s.observations || []).map(function (entry) {
      if (entry.id !== id || entry.note === clean) return entry;
      changed = true; return Object.assign({}, entry, { note: clean });
    });
    return changed ? Object.assign({}, s, { observations: entries }) : s;
  }
  function observationContext(s, entry) {
    var same = !!(s.run && entry && entry.provenance &&
      JSON.stringify(s.run.start) === JSON.stringify(entry.provenance.start) &&
      JSON.stringify(settings(s.run.forcing)) === JSON.stringify(entry.provenance.forcing));
    var reached = !!(same && entry.minute <= s.world.minutes - s.run.start.minutes + 1e-8);
    return { canRevisit: reached, reason: !s.run ? 'no-run' : !same ? 'different-run' : !reached ? 'not-yet-reached' : null,
      minute: entry ? entry.minute : null, selected: entry ? entry.selected : null };
  }
  // Reconstruct process totals at each saved moment using the existing solver.
  // Subtract the two cumulative traces so fractional saved times reproduce
  // atTime's fixed-step cadence and its final partial step exactly.
  function observationBudget(first, second) {
    function valid(entry) {
      var p=entry&&entry.provenance,f=p&&p.forcing,clean=settings(f);
      return !!(p&&validWorld(p.start)&&f&&['rain','duration','wetness','pattern'].every(function(k){return f[k]===clean[k];})&&
        typeof entry.minute==='number'&&isFinite(entry.minute)&&entry.minute>=0&&entry.minute<=f.duration+60&&
        typeof entry.selected==='number'&&entry.selected===Math.floor(entry.selected)&&entry.selected>=0&&entry.selected<COLS*ROWS);
    }
    if(!valid(first)||!valid(second))return {eligible:false,reason:'invalid-observation'};
    if(JSON.stringify(first.provenance.start)!==JSON.stringify(second.provenance.start)||JSON.stringify(settings(first.provenance.forcing))!==JSON.stringify(settings(second.provenance.forcing)))return {eligible:false,reason:'different-setup'};
    if(first.selected!==second.selected)return {eligible:false,reason:'different-cell'};
    if(first.minute===second.minute)return {eligible:false,reason:'same-minute'};
    var earlier=first.minute<second.minute?first:second,later=first.minute<second.minute?second:first,selected=earlier.selected;
    var keys=['rainMm','infiltrationMm','drainageMm','releaseMm','surfaceEvaporationMm','soilEvapotranspirationMm','incomingSurfaceMm','outgoingSurfaceMm','streamReceiptMm'];
    function cumulative(entry) {
      var w=copy(entry.provenance.start),target=w.minutes+entry.minute,forcing=entry.provenance.forcing,totals={};keys.forEach(function(k){totals[k]=0;});
      while(w.minutes<target-1e-9){
        var dt=Math.min(STEP,target-w.minutes),rain=rainDuring(forcing,w.minutes-entry.provenance.start.minutes,dt),trace={};
        w=step(w,rain,dt,{trace:trace});var local=trace.cells[selected];
        totals.rainMm+=rain*dt/60;
        ['infiltrationMm','drainageMm','releaseMm','surfaceEvaporationMm','soilEvapotranspirationMm'].forEach(function(k){totals[k]+=local[k];});
        trace.routes.forEach(function(route){if(route.to===selected)totals.incomingSurfaceMm+=route.depthMm;if(route.from===selected)totals.outgoingSurfaceMm+=route.depthMm;});
        if(w.cells[selected].cover==='stream')totals.streamReceiptMm+=trace.cells.reduce(function(value,c){return value+c.releaseMm;},0)/(ROWS*2);
      }
      return {cell:w.cells[selected],transfers:totals};
    }
    var a=cumulative(earlier),b=cumulative(later),t={};keys.forEach(function(k){t[k]=b.transfers[k]-a.transfers[k];});
    function store(key,inputs,outputs){var before=a.cell[key],after=b.cell[key];return {beforeMm:before,afterMm:after,inputsMm:inputs,outputsMm:outputs,changeMm:after-before,errorMm:before+inputs-outputs-after};}
    var stores={surface:store('surface',t.rainMm+t.incomingSurfaceMm+t.streamReceiptMm,t.infiltrationMm+t.outgoingSurfaceMm+t.surfaceEvaporationMm),
      soil:store('soil',t.infiltrationMm,t.drainageMm+t.soilEvapotranspirationMm),ground:store('ground',t.drainageMm,t.releaseMm)};
    var before=stores.surface.beforeMm+stores.soil.beforeMm+stores.ground.beforeMm,after=stores.surface.afterMm+stores.soil.afterMm+stores.ground.afterMm,
      inputs=t.rainMm+t.incomingSurfaceMm+t.streamReceiptMm,outputs=t.outgoingSurfaceMm+t.releaseMm+t.surfaceEvaporationMm+t.soilEvapotranspirationMm;
    return {eligible:true,reason:null,selected:selected,cover:a.cell.cover,fromMinute:earlier.minute,toMinute:later.minute,fromId:earlier.id,toId:later.id,reverseSelection:first.minute>second.minute,
      transfers:t,stores:stores,balance:{beforeMm:before,afterMm:after,inputsMm:inputs,outputsMm:outputs,changeMm:after-before,errorMm:before+inputs-outputs-after}};
  }
  function restoreObservation(entry) {
    if (!entry || typeof entry.id !== 'string' || !/^observation-[1-9]\d{0,12}$/.test(entry.id) || !entry.provenance || !validWorld(entry.provenance.start)) return null;
    var forcing = entry.provenance.forcing, clean = settings(forcing);
    if (!forcing || forcing.rain !== clean.rain || forcing.duration !== clean.duration || forcing.wetness !== clean.wetness || forcing.pattern !== clean.pattern ||
      typeof entry.minute !== 'number' || !isFinite(entry.minute) || entry.minute < 0 || entry.minute > clean.duration + 60 ||
      typeof entry.selected !== 'number' || entry.selected !== Math.floor(entry.selected) || entry.selected < 0 || entry.selected >= COLS * ROWS) return null;
    // Rebuild measurements from saved initial conditions; imported cached readings
    // are never trusted as experimental evidence.
    var start = entry.provenance.start, first = measure(start);
    var run = { start: start, forcing: clean, samples: [{ t: 0, q: 0, surface: first.surfaceM3, soil: first.soilM3 }] };
    return observationSnapshot(run, entry.selected, entry.minute, entry.note, entry.id);
  }
  function comparison(s) {
    var a=s.run&&s.run.start,b=s.baseline&&s.baseline.run.start;
    var fair=!!(a&&b&&s.run.paired&&s.run.forcing.rain===s.baseline.run.forcing.rain&&s.run.forcing.duration===s.baseline.run.forcing.duration&&pattern(s.run.forcing)===pattern(s.baseline.run.forcing)&&
      a.cells.every(function(c,i){var d=b.cells[i];return ['surface','soil','ground','elevation'].every(function(k){return c[k]===d[k];});}));
    return { fair: fair, changedCells: s.baseline ? s.world.cells.reduce(function(n,c,i){return n+(c.cover!==s.baseline.run.start.cells[i].cover?1:0);},0) : 0 };
  }
  function timingComparison(s){
    if(!s.run||!s.run.timingTest||!s.baseline)return false;
    var a=s.run,b=s.baseline.run;
    return a.forcing.rain===b.forcing.rain&&a.forcing.duration===b.forcing.duration&&a.start.cells.every(function(c,i){return ['cover','surface','soil','ground','elevation'].every(function(k){return c[k]===b.start.cells[i][k];});});
  }
  function spatialDifference(s, minute) {
    if (!s.run || !s.run.complete || !s.baseline || !s.baseline.run.complete || !comparison(s).fair) return null;
    var end=s.run.forcing.duration+60,t=number(minute,0,end,end);
    var current=t===end?s.world:atTime(s.run,t),baseline=t===end?s.baseline.world:atTime(s.baseline.run,t);
    var totals={surface:0,soil:0,ground:0};
    var cells=current.cells.map(function(c,i){var b=baseline.cells[i],d={index:i,column:c.x+1,row:c.y+1};
      ['surface','soil','ground'].forEach(function(k){d[k]={currentMm:c[k],baselineMm:b[k],differenceMm:c[k]-b[k]};totals[k]+=(c[k]-b[k])*AREA/1000;});return d;});
    return { minute:t, definition:'Current minus pinned baseline at the same elapsed model minute; differences are water depth over each equal-area cell.', totalsM3:totals, cells:cells };
  }
  function report(s) {
    var e=evidence(s),lines=[e.title,'Learning lens: '+s.level,'Investigation focus: '+({free:'My own question',cover:'Changing ground cover',retention:'Retention gardens',memory:'Consecutive storms',timing:'Rainfall timing'}[s.question]||'My own question'),'','Prediction: '+(s.prediction||'(not recorded)'),'Explanation: '+(s.reflection||'(not recorded)'),''];
    function runLines(label,run,result){if(!run)return;lines.push(label+(run.complete?' — completed':' — in progress'),'Mean rainfall: '+run.forcing.rain+' mm/h for '+run.forcing.duration+' min','Pattern: '+PATTERNS[pattern(run.forcing)],'First / second half: '+rainAt(run.forcing,0)+' / '+rainAt(run.forcing,run.forcing.duration/2)+' mm/h','Observation: '+result.elapsedMinutes.toFixed(1)+' min','Rain in: '+result.rainfallM3.toFixed(2)+' m³','Outflow: '+result.outflowM3.toFixed(2)+' m³','Peak flow: '+result.peakM3s.toFixed(4)+' m³/s','Storage change: '+result.storageChangeM3.toFixed(2)+' m³','Evaporation: '+result.evaporationM3.toFixed(2)+' m³','');}
    runLines('Current run',s.run,e.result);if(s.baseline)runLines('Pinned baseline',s.baseline.run,e.baselineResult);
    if (e.observations.length) {
      lines.push('Saved observations (cell depths in mm; valley volumes in m³)');
      e.observations.forEach(function (entry) {
        var c = entry.cell, m = entry.totals, r = entry.result, context = observationContext(s, entry);
        lines.push('Observation ' + entry.id.slice(12) + ' — elapsed minute ' + entry.minute + '; model minute ' + entry.modelMinute,
          'Experiment: ' + (context.reason === 'different-run' || context.reason === 'no-run' ? 'saved from another run' : 'same starting world and rainfall as current run'),
          'Recorded rainfall: ' + entry.provenance.forcing.rain + ' mm/h mean for ' + entry.provenance.forcing.duration + ' min; ' + PATTERNS[pattern(entry.provenance.forcing)],
          'Cell: column ' + (c.x + 1) + ', row ' + (c.y + 1) + '; ' + COVERS[c.cover].label,
          'Cell water: surface ' + c.surface.toFixed(3) + ' mm; soil ' + c.soil.toFixed(3) + ' mm; delayed storage ' + c.ground.toFixed(3) + ' mm',
          'Valley water: surface ' + m.surfaceM3.toFixed(3) + ' m³; soil ' + m.soilM3.toFixed(3) + ' m³; delayed storage ' + m.groundM3.toFixed(3) + ' m³',
          'Since run start: rain ' + r.rainfallM3.toFixed(3) + ' m³; outflow ' + r.outflowM3.toFixed(3) + ' m³; flow now ' + m.discharge.toFixed(4) + ' m³/s',
          'Learner note: ' + (entry.note || '(not recorded)'), '');
      });
    }
    lines.push(e.comparison,'Changed land-cover cells: '+e.designChanges,'','Model: Water Worlds v'+VERSION+'; 12 × 8 cells, 400 m² per cell.',e.boundary,'','Minute samples for current run (minute, flow m³/s, surface m³, soil m³)');
    if(s.run)s.run.samples.forEach(function(v){lines.push([v.t,v.q,v.surface,v.soil].map(function(n){return n.toFixed(4);}).join(', '));});
    if(e.spatialDifference){lines.push('','Spatial water differences at '+e.spatialDifference.minute+' min (current minus baseline)','Column, row, surface difference mm, soil difference mm, delayed difference mm');e.spatialDifference.cells.forEach(function(c){lines.push([c.column,c.row,c.surface.differenceMm.toFixed(4),c.soil.differenceMm.toFixed(4),c.ground.differenceMm.toFixed(4)].join(', '));});}
    return lines.join('\n');
  }
  function evidence(s) {
    return { title: 'Water Worlds investigation', modelVersion: VERSION, terrain: 'valley-12x8-v1', cellAreaM2: AREA,
      boundary: 'Process-based teaching model; prescribed rain, mild constant evaporative demand, head-gradient surface routing, and delayed subsurface storage. Not a flood or aquifer forecast. Weather and exported water cross the domain boundary.',
      question: s.question, learningLevel: s.level, designChanges: comparison(s).changedCells,
      observations: copy(s.observations || []),
      prediction: s.prediction, explanation: s.reflection, run: s.run ? copy(s.run) : null,
      finalWorld: copy(s.world), result: s.run ? result(s.world, s.run) : null,
      baseline: s.baseline ? copy(s.baseline) : null,
      baselineResult: s.baseline ? result(s.baseline.world, s.baseline.run) : null,
      spatialDifference: spatialDifference(s),
      comparison: timingComparison(s) ? 'Timing test: same initial water, ground cover, mean rainfall, and duration; rainfall pattern may differ.' : comparison(s).fair ? 'Same initial water stores and recorded rainfall; only land cover can differ.' : 'Exploratory run. Starting conditions may differ.' };
  }
  root.WaterWorldsKernel = { version: VERSION, cols: COLS, rows: ROWS, area: AREA, covers: COVERS, patterns: PATTERNS, rainAt: rainAt, rainDuring: rainDuring, timingComparison: timingComparison,
    create: create, validWorld: validWorld, total: total, measure: measure, step: step, diagnose: diagnose, cellBudget: cellBudget, settings: settings,
    observationLimit: OBSERVATION_LIMIT, observe: observe, removeObservation: removeObservation, updateObservationNote: updateObservationNote, observationContext: observationContext, observationBudget: observationBudget,
    initial: initial, restore: restore, begin: begin, advance: advance, landPlan: landPlan, edit: edit, undo: undo, record: record, result: result, atTime: atTime, comparison: comparison, spatialDifference: spatialDifference, report: report, evidence: evidence };
})(typeof window !== 'undefined' ? window : globalThis);
