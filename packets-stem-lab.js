// Educator maker controller for packets-stem-lab.html (Simple Circuit Lab, Data & Graph Explorer, Geometry Lab).
// Everything runs in this browser tab. Zero network, zero cookies, zero markup strings.
(function () {
  'use strict';

  var STORE_KEY = 'alloflow-packets-stem-lab/1';
  var TRY_PAGE = 'packets-try.html';
  var MAX_STUDENTS = 40;
  var MAX_REOPEN_BYTES = 60 * 1024 * 1024;

  var $ = function (id) { return document.getElementById(id); };
  var stem = null;
  var loader = null;
  var bilingualMod = null;
  var verifyCore = null;
  var step = 1;
  var built = null;
  var builtLearner = '';
  var previewSession = null;
  var previewUrl = '';
  var activeFilter = 'all';
  var state = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function setText(id, text) {
    var node = $(id);
    if (node) node.textContent = text == null ? '' : String(text);
  }

  function announce(msg) {
    setText('live-status', '');
    setTimeout(function () { setText('live-status', msg); }, 25);
  }

  function fileSize(bytes) {
    if (!(bytes > 0)) return '0 KB';
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function splitLines(text) {
    return String(text || '').replace(/\r\n?/g, '\n').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function parseGlossaryText(text) {
    var out = {};
    splitLines(text).slice(0, 40).forEach(function (line) {
      var parts = line.split('|').map(function (p) { return p.trim(); });
      var en = parts[0] || '';
      if (!en) return;
      var translations = {};
      parts.slice(1).forEach(function (pair) {
        var idx = pair.indexOf(':');
        if (idx > 0) {
          var code = pair.slice(0, idx).trim().toLowerCase();
          var val = pair.slice(idx + 1).trim();
          if (code && val) translations[code] = val;
        }
      });
      if (Object.keys(translations).length) out[en] = translations;
    });
    return out;
  }

  function formatGlossaryText(map) {
    if (!map || typeof map !== 'object') return '';
    return Object.keys(map).map(function (word) {
      var t = map[word] && typeof map[word] === 'object' ? map[word] : {};
      var pairs = Object.keys(t).map(function (code) { return code + ':' + t[code]; });
      return [word].concat(pairs).join(' | ');
    }).join('\n');
  }

  function formatCircuitQuestions(items) {
    return (Array.isArray(items) ? items : []).map(function (it) {
      var cols = [it.prompt || '', it.questionKind === 'mc' ? 'mc' : 'numeric', it.answer || ''];
      if (it.questionKind === 'mc' && Array.isArray(it.choices) && it.choices.length) cols.push(it.choices.join('; '));
      else if (it.unit) { cols.push(''); cols.push(it.unit); }
      return cols.join(' | ');
    }).join('\n');
  }

  function parseCircuitQuestions(text, topo, volts, r1, r2) {
    var switches = topo === 'parallel'
      ? [
        { id: 'swm', label: 'Main Switch', closed: false, branch: -1 },
        { id: 'sw1', label: 'Branch 1 Switch', closed: false, branch: 0 },
        { id: 'sw2', label: 'Branch 2 Switch', closed: false, branch: 1 },
      ]
      : [
        { id: 'sw1', label: 'Switch A', closed: false, branch: 0 },
        { id: 'sw2', label: 'Switch B', closed: false, branch: 0 },
      ];
    var bulbs = [
      { id: 'b1', label: 'Bulb 1', resistance: Math.max(1, Number(r1) || 3), branch: 0 },
      { id: 'b2', label: 'Bulb 2', resistance: Math.max(1, Number(r2) || 3), branch: topo === 'parallel' ? 1 : 0 },
    ];
    return splitLines(text).slice(0, 12).map(function (line, i) {
      var p = line.split('|').map(function (s) { return s.trim(); });
      var prompt = p[0] || '';
      var kind = String(p[1] || 'numeric').toLowerCase() === 'mc' ? 'mc' : 'numeric';
      var ans = p[2] || '';
      var choices = p[3] ? p[3].split(';').map(function (c) { return c.trim(); }).filter(Boolean) : [];
      var unit = p[4] || '';
      if (!prompt || !ans || ans === '?') return null;
      if (kind === 'mc' && choices.length < 2) return null;
      return {
        id: 'cir-' + (i + 1),
        word: 'Circuit Item ' + (i + 1),
        prompt: prompt,
        topology: topo,
        voltage: Math.max(1, Math.min(24, Number(volts) || 6)),
        switches: switches,
        bulbs: bulbs,
        questionKind: kind,
        choices: choices,
        unit: unit,
        answer: ans,
        tolerance: 0.05,
      };
    }).filter(Boolean);
  }

  function formatDataQuestions(items) {
    return (Array.isArray(items) ? items : []).map(function (it) {
      var cols = [it.prompt || '', it.questionKind === 'mc' ? 'mc' : 'numeric', it.answer || ''];
      if (it.questionKind === 'mc' && Array.isArray(it.choices) && it.choices.length) cols.push(it.choices.join('; '));
      return cols.join(' | ');
    }).join('\n');
  }

  function parseDataQuestions(text, unit) {
    return splitLines(text).slice(0, 12).map(function (line, i) {
      var p = line.split('|').map(function (s) { return s.trim(); });
      var prompt = p[0] || '';
      var kind = String(p[1] || 'numeric').toLowerCase() === 'mc' ? 'mc' : 'numeric';
      var ans = p[2] || '';
      var choices = p[3] ? p[3].split(';').map(function (c) { return c.trim(); }).filter(Boolean) : [];
      if (!prompt || !ans || ans === '?') return null;
      if (kind === 'mc' && choices.length < 2) return null;
      return {
        id: 'dat-' + (i + 1),
        word: 'Data Item ' + (i + 1),
        prompt: prompt,
        questionKind: kind,
        choices: choices,
        unit: unit || '',
        answer: ans,
        tolerance: 0.1,
      };
    }).filter(Boolean);
  }

  function formatGeometryTasks(items) {
    return (Array.isArray(items) ? items : []).map(function (it) {
      var mode = it.geoMode || 'tiles';
      var spec = '';
      var areaVal = it.targetArea != null ? it.targetArea : '?';
      var perimVal = it.targetPerimeter != null ? it.targetPerimeter : '?';
      var degVal = it.targetDeg != null ? it.targetDeg : '?';
      if (mode === 'tiles') {
        if (it.targetType === 'area_and_perimeter') spec = 'area=' + areaVal + ',perim=' + perimVal;
        else if (it.targetType === 'perimeter') spec = 'perim=' + perimVal;
        else spec = 'area=' + areaVal;
      } else if (mode === 'dims') {
        if (it.targetType === 'area_and_perimeter') spec = (it.shape || 'rectangle') + ',area=' + areaVal + ',perim=' + perimVal;
        else if (it.targetType === 'perimeter') spec = (it.shape || 'rectangle') + ',perim=' + perimVal;
        else spec = (it.shape || 'rectangle') + ',area=' + areaVal;
      } else if (it.targetType === 'build_angle') {
        spec = 'build=' + degVal;
      } else {
        spec = 'classify=' + (it.angleDeg || 90);
      }
      return [mode, it.prompt || '', spec].join(' | ');
    }).join('\n');
  }

  function parseGeometryTasks(text) {
    return splitLines(text).slice(0, 12).map(function (line, i) {
      var p = line.split('|').map(function (s) { return s.trim(); });
      var mode = String(p[0] || '').toLowerCase();
      var prompt = p[1] || '';
      var spec = String(p[2] || '').toLowerCase();
      if (!prompt || !spec) return null;
      if (mode === 'tiles') {
        var aM = /area\s*=\s*(\d+)/.exec(spec);
        var pM = /perim\s*=\s*(\d+)/.exec(spec);
        if (!aM && !pM) return null;
        return {
          id: 'geo-' + (i + 1),
          word: 'Grid Task ' + (i + 1),
          prompt: prompt,
          geoMode: 'tiles',
          rows: 5,
          cols: 6,
          targetType: aM && pM ? 'area_and_perimeter' : pM ? 'perimeter' : 'area',
          targetArea: aM ? Number(aM[1]) : undefined,
          targetPerimeter: pM ? Number(pM[1]) : undefined,
        };
      }
      if (mode === 'dims') {
        var shape = spec.indexOf('triangle') >= 0 ? 'triangle' : 'rectangle';
        var daM = /area\s*=\s*([0-9.]+)/.exec(spec);
        var dpM = /perim\s*=\s*([0-9.]+)/.exec(spec);
        if (!daM && !dpM) return null;
        return {
          id: 'geo-' + (i + 1),
          word: 'Dimensions Task ' + (i + 1),
          prompt: prompt,
          geoMode: 'dims',
          shape: shape,
          startBase: 4,
          startHeight: 4,
          maxDim: 10,
          targetType: daM && dpM ? 'area_and_perimeter' : dpM ? 'perimeter' : 'area',
          targetArea: daM ? Number(daM[1]) : undefined,
          targetPerimeter: dpM ? Number(dpM[1]) : undefined,
        };
      }
      if (mode === 'angle') {
        var bM = /build\s*=\s*(\d+)/.exec(spec);
        var cM = /classify\s*=\s*(\d+)/.exec(spec);
        if (bM) {
          return {
            id: 'geo-' + (i + 1),
            word: 'Angle Builder ' + (i + 1),
            prompt: prompt,
            geoMode: 'angle',
            targetType: 'build_angle',
            startDeg: 30,
            targetDeg: Number(bM[1]),
          };
        }
        if (cM) {
          var deg = Number(cM[1]);
          return {
            id: 'geo-' + (i + 1),
            word: 'Angle Classifier ' + (i + 1),
            prompt: prompt,
            geoMode: 'angle',
            targetType: 'classify_angle',
            angleDeg: deg,
            answer: stem.classifyAngleDeg(deg),
          };
        }
      }
      return null;
    }).filter(Boolean);
  }

  function defaultStarterTitles() {
    var map = Object.create(null);
    stem.starters().forEach(function (s) { map[s.title] = true; });
    return map;
  }

  function defaultState() {
    var cir = stem.starterById('circuit_series_basics');
    var dat = stem.starterById('data_plant_growth');
    var geo = stem.starterById('geom_area_perimeter');
    return {
      starterId: cir.id,
      activity: cir.activity,
      mode: 'practice',
      adaptiveScaffold: false,
      form: 'Form A',
      timeMin: '',
      title: cir.title,
      homeLanguages: [],
      glossaryText: '',
      stationMode: false,
      qrPublicKey: '',
      circuit: {
        topology: cir.items[0].topology,
        voltage: cir.items[0].voltage,
        r1: cir.items[0].bulbs[0].resistance,
        r2: cir.items[0].bulbs[1].resistance,
        qsText: formatCircuitQuestions(cir.items),
        stretchItems: cir.stretchItems || [],
      },
      data: {
        datasetTitle: dat.title,
        unit: dat.unit || '',
        csvText: dat.datasetCsv || '',
        qsText: formatDataQuestions(dat.items),
      },
      geometry: {
        qsText: formatGeometryTasks(geo.items),
      },
    };
  }

  function applyStarter(starter) {
    if (!starter) return;
    state.starterId = starter.id;
    state.activity = starter.activity;
    state.title = starter.title;
    if (starter.activity === 'stem_circuit') {
      var f = starter.items[0];
      state.circuit = {
        topology: f.topology || 'series',
        voltage: f.voltage || 6,
        r1: (f.bulbs && f.bulbs[0] && f.bulbs[0].resistance) || 3,
        r2: (f.bulbs && f.bulbs[1] && f.bulbs[1].resistance) || 3,
        qsText: formatCircuitQuestions(starter.items),
        stretchItems: starter.stretchItems || [],
      };
    } else if (starter.activity === 'stem_data_explorer') {
      state.data = {
        datasetTitle: starter.title,
        unit: starter.unit || '',
        csvText: starter.datasetCsv || '',
        qsText: formatDataQuestions(starter.items),
      };
    } else if (starter.activity === 'stem_geometry_grid') {
      state.geometry = {
        qsText: formatGeometryTasks(starter.items),
      };
    }
    remember();
  }

  function remember() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function recall() {
    var base = defaultState();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      var parsed = JSON.parse(raw, function (k, v) { return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v; });
      if (!parsed || typeof parsed !== 'object') return base;
      return Object.assign(base, parsed, {
        circuit: Object.assign(base.circuit, parsed.circuit || {}),
        data: Object.assign(base.data, parsed.data || {}),
        geometry: Object.assign(base.geometry, parsed.geometry || {}),
        homeLanguages: Array.isArray(parsed.homeLanguages) ? parsed.homeLanguages : [],
      });
    } catch (_) {
      return base;
    }
  }

  function buildLabConfig() {
    var act = state.activity;
    var items = [];
    var extra = {};
    if (act === 'stem_circuit') {
      items = parseCircuitQuestions(state.circuit.qsText, state.circuit.topology, state.circuit.voltage, state.circuit.r1, state.circuit.r2);
      if (state.circuit.stretchItems && state.circuit.stretchItems.length) extra.stretchItems = state.circuit.stretchItems;
    } else if (act === 'stem_data_explorer') {
      items = parseDataQuestions(state.data.qsText, state.data.unit);
      extra.datasetCsv = state.data.csvText;
      extra.datasetTitle = state.data.datasetTitle || state.title;
      extra.unit = state.data.unit;
    } else {
      items = parseGeometryTasks(state.geometry.qsText);
    }
    var mins = Number(state.timeMin);
    var gloss = parseGlossaryText(state.glossaryText);
    var teacherCode = String(($('f-teacher-code') && $('f-teacher-code').value) || '').trim();
    return Object.assign({
      title: state.title || 'Mini-STEM Lab',
      activity: act,
      mode: state.mode === 'probe' ? 'probe' : 'practice',
      adaptiveScaffold: state.mode !== 'probe' && !!state.adaptiveScaffold,
      form: state.form || 'Form A',
      timeLimitS: state.mode === 'probe' && mins > 0 ? Math.round(mins * 60) : null,
      teacherCode: state.mode === 'probe' && teacherCode ? teacherCode : undefined,
      items: items,
      homeLanguages: state.homeLanguages.length ? state.homeLanguages.slice() : undefined,
      bilingualGlossary: Object.keys(gloss).length ? gloss : undefined,
      stationMode: !!state.stationMode,
      qrPublicKey: String(state.qrPublicKey || '').trim() || undefined,
    }, extra);
  }

  function validateStep1() {
    var tc = String(($('f-teacher-code') && $('f-teacher-code').value) || '').trim();
    if (state.mode === 'probe' && tc && (tc.length < 4 || tc.length > 64)) {
      return 'The teacher code must be 4 to 64 characters (or leave it empty).';
    }
    return '';
  }

  function validateStep2() {
    var p1 = validateStep1();
    if (p1) return p1;
    var cfg = buildLabConfig();
    if (state.activity === 'stem_data_explorer') {
      var parsed = stem.parseCsvDataset(state.data.csvText);
      if (!parsed.rows.length) return 'Enter a CSV header plus at least 1 numeric data row.';
    }
    if (!cfg.items.length) return 'Enter at least 1 valid lab question or task.';
    var qrKey = String(state.qrPublicKey || '').trim();
    if (qrKey && window.AlloPacketQrCrypto && !window.AlloPacketQrCrypto.parsePublicKey(qrKey)) {
      return 'The Sealed QR public key must start with AFPK1.';
    }
    return '';
  }

  function drawStarters() {
    var host = $('starter-list');
    if (!host) return;
    host.textContent = '';
    stem.starters().filter(function (s) { return activeFilter === 'all' || s.activity === activeFilter; }).forEach(function (st) {
      var btn = el('button', 'template-card');
      btn.type = 'button';
      btn.setAttribute('data-starter-id', st.id);
      btn.setAttribute('aria-pressed', state.starterId === st.id ? 'true' : 'false');
      var meta = el('span', 'template-meta');
      meta.appendChild(el('span', 'template-tag', st.subject));
      meta.appendChild(el('span', 'template-tag', st.gradeBand));
      btn.appendChild(meta);
      btn.appendChild(el('span', 'template-name', st.name));
      btn.appendChild(el('span', 'template-summary', st.summary));
      btn.addEventListener('click', function () {
        applyStarter(st);
        drawStep1();
        announce('Loaded starter lab ' + st.name + '.');
      });
      host.appendChild(btn);
    });
  }

  function drawStep1() {
    drawStarters();
    var actRadios = document.querySelectorAll('input[name="activity"]');
    for (var i = 0; i < actRadios.length; i++) actRadios[i].checked = actRadios[i].value === state.activity;
    var modeRadios = document.querySelectorAll('input[name="mode"]');
    for (var j = 0; j < modeRadios.length; j++) modeRadios[j].checked = modeRadios[j].value === state.mode;
    $('practice-opts').hidden = state.mode === 'probe';
    $('check-opts').hidden = state.mode !== 'probe';
    $('f-adaptive').checked = !!state.adaptiveScaffold;
    $('f-form').value = state.form || 'Form A';
    $('f-time-min').value = state.timeMin === '' ? '' : String(state.timeMin);
  }

  function updateLiveCalculations() {
    if (state.activity === 'stem_circuit') {
      var topo = state.circuit.topology === 'parallel' ? 'parallel' : 'series';
      var v = Math.max(1, Number(state.circuit.voltage) || 6);
      var r1 = Math.max(1, Number(state.circuit.r1) || 3);
      var r2 = Math.max(1, Number(state.circuit.r2) || 3);
      var solved = stem.solveCircuit({
        topology: topo,
        voltage: v,
        switches: [],
        bulbs: [{ id: 'b1', resistance: r1, branch: 0 }, { id: 'b2', resistance: r2, branch: topo === 'parallel' ? 1 : 0 }],
      });
      var qs = parseCircuitQuestions(state.circuit.qsText, topo, v, r1, r2);
      setText('cir-live-calc', 'All switches closed -> Total R: ' + solved.totalResistance + ' ohms, Total I: ' + solved.totalCurrent + ' A | ' + qs.length + ' questions ready.');
    } else if (state.activity === 'stem_data_explorer') {
      var parsed = stem.parseCsvDataset(state.data.csvText);
      var st = stem.computeDatasetStats(parsed.rows, 'ALL');
      var dqs = parseDataQuestions(state.data.qsText, state.data.unit);
      setText('dat-live-calc', parsed.rows.length + ' rows parsed (Mean: ' + (st.mean != null ? st.mean : '-') + ', Median: ' + (st.median != null ? st.median : '-') + ', Range: ' + (st.range != null ? st.range : '-') + ') | ' + dqs.length + ' questions ready.');
    } else {
      var gqs = parseGeometryTasks(state.geometry.qsText);
      setText('geo-live-calc', gqs.length + ' geometry tasks ready.');
    }
    var langs = Array.isArray(state.homeLanguages) ? state.homeLanguages : [];
    var parts = [langs.length ? (langs.length + ' home language' + (langs.length === 1 ? '' : 's')) : 'English only'];
    if (state.stationMode) parts.push('Station Mode on');
    if (String(state.qrPublicKey || '').trim()) parts.push('Sealed QR on');
    setText('supports-now', parts.join(' | '));
  }

  function drawBilingualPills() {
    var host = $('bilingual-langs');
    if (!host || !bilingualMod || !bilingualMod.LANGUAGES) return;
    var codes = Array.isArray(bilingualMod.SUPPORTED_LANGUAGES) ? bilingualMod.SUPPORTED_LANGUAGES : Object.keys(bilingualMod.LANGUAGES);
    host.textContent = '';
    codes.forEach(function (code) {
      var lang = bilingualMod.LANGUAGES[code];
      if (!lang) return;
      var on = state.homeLanguages.indexOf(lang.code) >= 0;
      var lbl = el('label', 'pill' + (on ? ' is-on' : ''));
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = lang.code;
      cb.checked = on;
      cb.setAttribute('data-lang-code', lang.code);
      cb.addEventListener('change', function () {
        var idx = state.homeLanguages.indexOf(lang.code);
        if (cb.checked && idx < 0) state.homeLanguages.push(lang.code);
        else if (!cb.checked && idx >= 0) state.homeLanguages.splice(idx, 1);
        lbl.className = 'pill' + (cb.checked ? ' is-on' : '');
        remember();
        updateLiveCalculations();
      });
      lbl.appendChild(cb);
      lbl.appendChild(el('span', 'pill-name', lang.nativeName));
      lbl.appendChild(el('span', 'pill-ex', lang.name + (lang.dir === 'rtl' ? ' (RTL)' : '')));
      host.appendChild(lbl);
    });
  }

  function drawStep2() {
    $('ed-circuit').hidden = state.activity !== 'stem_circuit';
    $('ed-data').hidden = state.activity !== 'stem_data_explorer';
    $('ed-geometry').hidden = state.activity !== 'stem_geometry_grid';

    $('f-cir-topo').value = state.circuit.topology || 'series';
    $('f-cir-volts').value = String(state.circuit.voltage || 6);
    $('f-cir-r1').value = String(state.circuit.r1 || 3);
    $('f-cir-r2').value = String(state.circuit.r2 || 3);
    $('f-cir-qs').value = state.circuit.qsText || '';

    $('f-dat-title').value = state.data.datasetTitle || '';
    $('f-dat-unit').value = state.data.unit || '';
    $('f-dat-csv').value = state.data.csvText || '';
    $('f-dat-qs').value = state.data.qsText || '';

    $('f-geo-qs').value = state.geometry.qsText || '';

    $('f-glossary').value = state.glossaryText || '';
    $('f-station-mode').checked = !!state.stationMode;
    $('f-qr-key').value = state.qrPublicKey || '';
    if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.mountQrKeyHelper === 'function') window.AlloPacketHandoff.mountQrKeyHelper($('f-qr-key'), { qrCrypto: window.AlloPacketQrCrypto });
    drawBilingualPills();
    updateLiveCalculations();
  }

  function resetPreview() {
    if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch (_) {} previewUrl = ''; }
    if (previewSession && typeof previewSession.stop === 'function') {
      try { previewSession.stop(); } catch (_) {}
    }
    previewSession = null;
  }

  function batchList() {
    var seen = Object.create(null);
    var out = { names: [], twice: [], over: 0 };
    var raw = String(($('f-batch-names') && $('f-batch-names').value) || '').replace(/^\uFEFF/, '');
    raw.split(/\r?\n/).forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) return;
      var name = stem.codeName(trimmed);
      if (!name) return;
      var key = name.toLowerCase();
      if (seen[key]) { if (out.twice.indexOf(name) < 0) out.twice.push(name); return; }
      seen[key] = true;
      if (out.names.length >= MAX_STUDENTS) { out.over++; return; }
      out.names.push(name);
    });
    return out;
  }

  function drawBatch() {
    var list = batchList();
    var n = list.names.length;
    var btn = $('batch-make');
    var parts = [];
    if (n === 0) {
      parts.push('Leave empty so each student types a code name at the start.');
      if (btn) btn.hidden = true;
    } else if (n === 1) {
      parts.push('Using ' + list.names[0] + ' in the file above. Add another line to save a .zip.');
      if (btn) btn.hidden = true;
    } else {
      parts.push(n + ' files ready' + (built ? ', about ' + fileSize(n * built.bytes) + ' total.' : '.'));
      if (btn) { btn.hidden = false; btn.textContent = 'Save .zip for ' + n + ' students'; }
    }
    if (list.over) parts.push('Not used: ' + list.over + ' extra names (max ' + MAX_STUDENTS + ').');
    if (list.twice.length) parts.push('Listed more than once, used once: ' + list.twice.join(', ') + '.');
    setText('batch-said', parts.join(' '));
  }

  var builtCfg = null;

  function appendPaperChoices(parent, choices) {
    var ul = el('ul', 'paper-stem-choices');
    (Array.isArray(choices) ? choices : []).forEach(function (ch) {
      var li = el('li');
      var bx = el('span', 'paper-stem-box');
      bx.setAttribute('aria-hidden', 'true');
      li.appendChild(bx);
      li.appendChild(el('span', '', ch));
      ul.appendChild(li);
    });
    parent.appendChild(ul);
  }

  function drawPaperSheet(cfg, res) {
    var sheet = $('paper-stem-sheet');
    var fold = $('paper-stem-fold');
    var keyBox = $('f-paper-stem-key');
    var docxBtn = $('download-docx');
    if (!sheet) return;
    sheet.textContent = '';
    if (!cfg || !res) {
      sheet.setAttribute('data-ready', '0');
      sheet.hidden = true;
      if (docxBtn) docxBtn.hidden = true;
      return;
    }

    var header = el('div', 'paper-stem-header');
    header.appendChild(el('h4', 'paper-stem-title', cfg.title || 'STEM Lab Recording Sheet'));
    header.appendChild(el('p', 'paper-stem-fields', 'Name: ________________________   Date: ______________'));
    sheet.appendChild(header);

    var items = Array.isArray(cfg.items) ? cfg.items : [];
    var keyEntries = [];

    if (cfg.activity === 'stem_circuit') {
      var first = items[0] || {};
      var topo = first.topology === 'parallel' ? 'Parallel' : 'Series';
      var volts = Number(first.voltage) || Number(state.circuit.voltage) || 6;
      var bulbs = Array.isArray(first.bulbs) ? first.bulbs : [];
      var r1 = bulbs[0] ? bulbs[0].resistance : (Number(state.circuit.r1) || 3);
      var r2 = bulbs[1] ? bulbs[1].resistance : (Number(state.circuit.r2) || 3);
      var solved = stem.solveCircuit({
        topology: topo.toLowerCase(),
        voltage: volts,
        switches: [],
        bulbs: [{ id: 'b1', resistance: r1, branch: 0 }, { id: 'b2', resistance: r2, branch: topo === 'Parallel' ? 1 : 0 }],
      });

      sheet.appendChild(el('div', 'paper-stem-spec',
        'Circuit Setup: ' + topo + ' circuit | Battery: ' + volts + ' V | Bulb 1: ' + r1 + ' ohms | Bulb 2: ' + r2 + ' ohms. '
        + 'Reference: I = V / R; Series R = R1 + R2; Parallel 1/R = 1/R1 + 1/R2.'));

      sheet.appendChild(el('p', 'paper-stem-sub', 'Circuit Trial Observation Log'));
      var cTbl = el('table', 'paper-stem-table');
      var cHead = el('thead');
      var chr = el('tr');
      ['Trial', 'Switches Closed', 'Bulbs Lit', 'Total R (ohms)', 'Current I (A)'].forEach(function (h) { chr.appendChild(el('th', '', h)); });
      cHead.appendChild(chr);
      cTbl.appendChild(cHead);
      var cBody = el('tbody');
      ['1. All open', '2. One closed', '3. All closed'].forEach(function (lbl) {
        var tr = el('tr');
        tr.appendChild(el('td', '', lbl));
        for (var k = 0; k < 4; k++) tr.appendChild(el('td', '', '\u00a0'));
        cBody.appendChild(tr);
      });
      cTbl.appendChild(cBody);
      sheet.appendChild(cTbl);
      keyEntries.push('All switches closed reference: Total R = ' + solved.totalResistance + ' ohms, Total I = ' + solved.totalCurrent + ' A.');

      var qList = el('ol', 'paper-stem-qs');
      items.forEach(function (it, idx) {
        var li = el('li', 'paper-stem-q');
        li.appendChild(el('span', '', it.prompt || ''));
        if (it.questionKind === 'mc' && Array.isArray(it.choices) && it.choices.length) {
          appendPaperChoices(li, it.choices);
        } else {
          li.appendChild(el('p', 'paper-stem-ans', 'Answer: ____________________' + (it.unit ? ' ' + it.unit : '')));
        }
        qList.appendChild(li);
        keyEntries.push('Item ' + (idx + 1) + ': ' + it.answer + (it.unit ? ' ' + it.unit : ''));
      });
      sheet.appendChild(qList);
    } else if (cfg.activity === 'stem_data_explorer') {
      var parsed = stem.parseCsvDataset(cfg.csvText || state.data.csvText || '');
      var stats = stem.computeDatasetStats(parsed.rows, 'ALL');
      var unit = cfg.unit || state.data.unit || '';

      sheet.appendChild(el('p', 'paper-stem-sub', 'Dataset: ' + (cfg.datasetTitle || cfg.title || 'Lab Data') + (unit ? ' (' + unit + ')' : '')));
      if (parsed.rows.length) {
        var dTbl = el('table', 'paper-stem-table');
        var dHead = el('thead');
        var dhr = el('tr');
        ['Label', 'Group', 'Value' + (unit ? ' (' + unit + ')' : '')].forEach(function (h) { dhr.appendChild(el('th', '', h)); });
        dHead.appendChild(dhr);
        dTbl.appendChild(dHead);
        var dBody = el('tbody');
        parsed.rows.slice(0, 24).forEach(function (r) {
          var tr = el('tr');
          tr.appendChild(el('td', '', String(r.label || '')));
          tr.appendChild(el('td', '', String(r.group || '')));
          tr.appendChild(el('td', '', String(r.value)));
          dBody.appendChild(tr);
        });
        dTbl.appendChild(dBody);
        sheet.appendChild(dTbl);
      }

      sheet.appendChild(el('p', 'paper-stem-sub', 'Summary Statistics Workspace'));
      var sGrid = el('div', 'paper-stem-stats');
      ['Count: ______', 'Min: ______', 'Max: ______', 'Range: ______', 'Median: ______', 'Mean: ______'].forEach(function (lbl) {
        sGrid.appendChild(el('div', 'paper-stem-stat', lbl));
      });
      sheet.appendChild(sGrid);
      keyEntries.push('Dataset stats (all rows): Count ' + stats.count + ', Min ' + stats.min + ', Max ' + stats.max + ', Range ' + stats.range + ', Median ' + stats.median + ', Mean ' + stats.mean + '.');

      var dqList = el('ol', 'paper-stem-qs');
      items.forEach(function (it, idx) {
        var li = el('li', 'paper-stem-q');
        li.appendChild(el('span', '', it.prompt || ''));
        if (it.questionKind === 'mc' && Array.isArray(it.choices) && it.choices.length) {
          appendPaperChoices(li, it.choices);
        } else {
          li.appendChild(el('p', 'paper-stem-ans', 'Answer: ____________________' + (it.unit ? ' ' + it.unit : '')));
        }
        dqList.appendChild(li);
        keyEntries.push('Item ' + (idx + 1) + ': ' + it.answer + (it.unit ? ' ' + it.unit : ''));
      });
      sheet.appendChild(dqList);
    } else {
      var hasTiles = items.some(function (it) { return it.geoMode === 'tiles'; });
      var hasAngle = items.some(function (it) { return it.geoMode === 'angle'; });

      if (hasAngle) {
        sheet.appendChild(el('div', 'paper-stem-spec',
          'Angle Reference: Acute (< 90 deg) | Right (= 90 deg) | Obtuse (91 to 179 deg) | Straight (= 180 deg).'));
      }
      if (hasTiles) {
        var gWrap = el('div', 'paper-stem-grid-wrap');
        gWrap.appendChild(el('p', 'paper-stem-sub', 'Unit-Square Workspace Grid (6 by 5; each square = 1 sq unit)'));
        var grid = el('div', 'paper-stem-grid');
        grid.setAttribute('aria-hidden', 'true');
        for (var ci = 0; ci < 30; ci++) grid.appendChild(el('div', 'paper-stem-cell'));
        gWrap.appendChild(grid);
        sheet.appendChild(gWrap);
      }

      var gqList = el('ol', 'paper-stem-qs');
      items.forEach(function (it, idx) {
        var li = el('li', 'paper-stem-q');
        li.appendChild(el('span', '', it.prompt || ''));
        if (it.geoMode === 'angle' && it.targetType === 'classify_angle') {
          appendPaperChoices(li, ['Acute (< 90 deg)', 'Right (90 deg)', 'Obtuse (91-179 deg)', 'Straight (180 deg)']);
          keyEntries.push('Task ' + (idx + 1) + ': ' + (it.answer || stem.classifyAngleDeg(it.angleDeg)) + ' (' + it.angleDeg + ' deg)');
        } else if (it.geoMode === 'angle') {
          li.appendChild(el('p', 'paper-stem-ans', 'Sketch angle & label measure: ________ degrees'));
          keyEntries.push('Task ' + (idx + 1) + ': Build ' + it.targetDeg + ' degrees (' + stem.classifyAngleDeg(it.targetDeg) + ')');
        } else {
          li.appendChild(el('p', 'paper-stem-ans', 'Dimensions / Sketch notes: ________________   Area: ______ sq units   Perimeter: ______ units'));
          var parts = [];
          if (it.targetArea != null) parts.push('Area = ' + it.targetArea + ' sq units');
          if (it.targetPerimeter != null) parts.push('Perimeter = ' + it.targetPerimeter + ' units');
          keyEntries.push('Task ' + (idx + 1) + ' (' + (it.shape || 'grid') + '): ' + parts.join(', '));
        }
        gqList.appendChild(li);
      });
      sheet.appendChild(gqList);
    }

    if (keyEntries.length && (!keyBox || keyBox.checked)) {
      var keySec = el('div', 'paper-stem-key');
      keySec.appendChild(el('h4', '', 'Teacher Answer Key \u2014 ' + (cfg.title || 'STEM Lab')));
      var kul = el('ul', 'paper-stem-key-list');
      keyEntries.forEach(function (line) { kul.appendChild(el('li', '', line)); });
      keySec.appendChild(kul);
      sheet.appendChild(keySec);
    }

    sheet.setAttribute('data-ready', '1');
    sheet.hidden = !(fold && fold.open);
    if (docxBtn) docxBtn.hidden = false;
  }

  var lazyScriptPromises = Object.create(null);
  function loadLocalScript(file, attr, isReady) {
    if (isReady()) return Promise.resolve(true);
    if (lazyScriptPromises[file]) return lazyScriptPromises[file];
    if (!document || typeof document.createElement !== 'function') return Promise.resolve(false);
    lazyScriptPromises[file] = new Promise(function (resolve) {
      var settled = false;
      var finish = function () {
        if (settled) return;
        settled = true;
        var ok = !!isReady();
        if (!ok) delete lazyScriptPromises[file];
        resolve(ok);
      };
      try {
        var existing = document.querySelector && document.querySelector('script[' + attr + '="1"]');
        if (existing) {
          existing.addEventListener('load', finish);
          existing.addEventListener('error', finish);
          if (typeof window.setTimeout === 'function') window.setTimeout(finish, 4000);
          return;
        }
        var sc = document.createElement('script');
        sc.setAttribute('src', file);
        sc.async = true;
        sc.setAttribute(attr, '1');
        sc.onload = finish;
        sc.onerror = finish;
        (document.head || document.documentElement || document.body).appendChild(sc);
      } catch (_) {
        delete lazyScriptPromises[file];
        resolve(false);
      }
    });
    return lazyScriptPromises[file];
  }

  function ensureDocxTools() {
    var hasZip = function () {
      return !!(window.AlloPacketZip && typeof window.AlloPacketZip.create === 'function');
    };
    var hasDocx = function () {
      return !!(window.AlloPacketDocx
        && typeof window.AlloPacketDocx.buildGeneralHandoutDocx === 'function'
        && typeof window.AlloPacketDocx.downloadDocx === 'function');
    };
    return loadLocalScript('packets_zip.js', 'data-allo-zip', hasZip).then(function (zipOk) {
      if (!zipOk) return null;
      return loadLocalScript('packets_docx.js', 'data-allo-docx', hasDocx).then(function (docxOk) {
        return docxOk ? window.AlloPacketDocx : null;
      });
    });
  }

  function buildStemDocxPayload(cfg) {
    if (!cfg) return null;
    var keyBox = $('f-paper-stem-key');
    var answerKeyOn = !keyBox || !!keyBox.checked;
    var items = Array.isArray(cfg.items) ? cfg.items : [];
    var sections = [];
    var keyEntries = [];

    if (cfg.activity === 'stem_circuit') {
      var first = items[0] || {};
      var topo = first.topology === 'parallel' ? 'Parallel' : 'Series';
      var volts = Number(first.voltage) || Number(state.circuit.voltage) || 6;
      var bulbs = Array.isArray(first.bulbs) ? first.bulbs : [];
      var r1 = bulbs[0] ? bulbs[0].resistance : (Number(state.circuit.r1) || 3);
      var r2 = bulbs[1] ? bulbs[1].resistance : (Number(state.circuit.r2) || 3);
      var solved = stem.solveCircuit({
        topology: topo.toLowerCase(),
        voltage: volts,
        switches: [],
        bulbs: [{ id: 'b1', resistance: r1, branch: 0 }, { id: 'b2', resistance: r2, branch: topo === 'Parallel' ? 1 : 0 }],
      });

      sections.push({
        heading: 'Circuit Setup & Formulas',
        type: 'boxes',
        columns: 1,
        items: [{
          title: topo + ' Circuit (' + volts + ' V Battery)',
          detail: 'Bulb 1: ' + r1 + ' ohms | Bulb 2: ' + r2 + ' ohms | Formulas: I = V / R; Series R = R1 + R2; Parallel 1/R = 1/R1 + 1/R2.',
        }],
      });
      sections.push({
        heading: 'Circuit Trial Observation Log',
        directions: 'Predict, test each switch configuration, and record your observations.',
        type: 'table',
        columns: ['Trial', 'Switches Closed', 'Bulbs Lit', 'Total R (ohms)', 'Current I (A)'],
        rows: [
          ['1. All open', '', '', '', ''],
          ['2. One closed', '', '', '', ''],
          ['3. All closed', '', '', '', ''],
        ],
      });
      keyEntries.push('All switches closed reference: Total R = ' + solved.totalResistance + ' ohms, Total I = ' + solved.totalCurrent + ' A.');

      if (items.length) {
        sections.push({
          heading: 'Observation Questions',
          type: 'questions',
          items: items.map(function (it, idx) {
            keyEntries.push('Item ' + (idx + 1) + ': ' + it.answer + (it.unit ? ' ' + it.unit : ''));
            return {
              prompt: (it.prompt || '') + (it.questionKind !== 'mc' && it.unit ? ' (unit: ' + it.unit + ')' : ''),
              choices: it.questionKind === 'mc' && Array.isArray(it.choices) && it.choices.length ? it.choices.slice() : undefined,
              writeLines: 2,
            };
          }),
        });
      }
    } else if (cfg.activity === 'stem_data_explorer') {
      var parsed = stem.parseCsvDataset(cfg.datasetCsv || state.data.csvText || '');
      var stats = stem.computeDatasetStats(parsed.rows, 'ALL');
      var unit = cfg.unit || state.data.unit || '';

      if (parsed.rows.length) {
        sections.push({
          heading: 'Dataset: ' + (cfg.datasetTitle || cfg.title || 'Lab Data') + (unit ? ' (' + unit + ')' : ''),
          type: 'table',
          columns: ['Label', 'Group', 'Value' + (unit ? ' (' + unit + ')' : '')],
          rows: parsed.rows.slice(0, 24).map(function (r) {
            return [String(r.label || ''), String(r.group || ''), String(r.value)];
          }),
        });
      }
      sections.push({
        heading: 'Summary Statistics Workspace',
        directions: 'Compute each statistic from the dataset above.',
        type: 'table',
        columns: ['Count', 'Min', 'Max', 'Range', 'Median', 'Mean'],
        rows: [['', '', '', '', '', '']],
      });
      keyEntries.push('Dataset stats (all rows): Count ' + stats.count + ', Min ' + stats.min + ', Max ' + stats.max + ', Range ' + stats.range + ', Median ' + stats.median + ', Mean ' + stats.mean + '.');

      if (items.length) {
        sections.push({
          heading: 'Evidence Questions',
          type: 'questions',
          items: items.map(function (it, idx) {
            keyEntries.push('Item ' + (idx + 1) + ': ' + it.answer + (it.unit ? ' ' + it.unit : ''));
            return {
              prompt: (it.prompt || '') + (it.questionKind !== 'mc' && it.unit ? ' (unit: ' + it.unit + ')' : ''),
              choices: it.questionKind === 'mc' && Array.isArray(it.choices) && it.choices.length ? it.choices.slice() : undefined,
              writeLines: 2,
            };
          }),
        });
      }
    } else {
      var hasTiles = items.some(function (it) { return it.geoMode === 'tiles'; });
      var hasAngle = items.some(function (it) { return it.geoMode === 'angle'; });

      if (hasAngle) {
        sections.push({
          heading: 'Angle Reference',
          type: 'boxes',
          columns: 1,
          items: [{ title: 'Angle Types', detail: 'Acute (< 90 deg) | Right (= 90 deg) | Obtuse (91 to 179 deg) | Straight (= 180 deg).' }],
        });
      }
      if (hasTiles) {
        sections.push({
          heading: 'Unit-Square Workspace Grid (6 by 5; each square = 1 sq unit)',
          type: 'table',
          columns: ['1', '2', '3', '4', '5', '6'],
          rows: [
            ['', '', '', '', '', ''],
            ['', '', '', '', '', ''],
            ['', '', '', '', '', ''],
            ['', '', '', '', '', ''],
            ['', '', '', '', '', ''],
          ],
        });
      }
      if (items.length) {
        sections.push({
          heading: 'Geometry Tasks',
          type: 'questions',
          items: items.map(function (it, idx) {
            if (it.geoMode === 'angle' && it.targetType === 'classify_angle') {
              keyEntries.push('Task ' + (idx + 1) + ': ' + (it.answer || stem.classifyAngleDeg(it.angleDeg)) + ' (' + it.angleDeg + ' deg)');
              return {
                prompt: it.prompt || '',
                choices: ['Acute (< 90 deg)', 'Right (90 deg)', 'Obtuse (91-179 deg)', 'Straight (180 deg)'],
              };
            }
            if (it.geoMode === 'angle') {
              keyEntries.push('Task ' + (idx + 1) + ': Build ' + it.targetDeg + ' degrees (' + stem.classifyAngleDeg(it.targetDeg) + ')');
              return { prompt: (it.prompt || '') + ' (Sketch angle & label measure in degrees)', writeLines: 2 };
            }
            var parts = [];
            if (it.targetArea != null) parts.push('Area = ' + it.targetArea + ' sq units');
            if (it.targetPerimeter != null) parts.push('Perimeter = ' + it.targetPerimeter + ' units');
            keyEntries.push('Task ' + (idx + 1) + ' (' + (it.shape || 'grid') + '): ' + parts.join(', '));
            return { prompt: (it.prompt || '') + ' (Record dimensions, Area, and Perimeter)', writeLines: 2 };
          }),
        });
      }
    }

    if (!sections.length) return null;
    return {
      title: cfg.title || 'STEM Lab Recording Sheet',
      subtitle: stem.ADAPTERS[cfg.activity] ? stem.ADAPTERS[cfg.activity].title : 'STEM Lab',
      kind: cfg.activity || 'stem-lab',
      sections: sections,
      answerKey: keyEntries.length ? [{ heading: 'Lab Answers', lines: keyEntries }] : [],
      answerKeyOn: answerKeyOn,
    };
  }

  function downloadStemDocx() {
    if (!built || !builtCfg) buildNow();
    var payload = buildStemDocxPayload(builtCfg);
    if (!payload) {
      announce('Build a STEM lab first to download a Word handout.');
      return Promise.resolve(false);
    }
    var btn = $('download-docx');
    if (btn) btn.disabled = true;
    announce('Preparing Word lab handout (.docx)...');
    return ensureDocxTools().then(function (docxLib) {
      if (!docxLib || !window.AlloPacketZip) {
        announce('Could not load the Word lab handout builder. Load the page again.');
        return false;
      }
      var res = docxLib.buildGeneralHandoutDocx(payload, { zip: window.AlloPacketZip });
      if (docxLib.downloadDocx(res, window, document)) {
        announce('Downloaded ' + res.filename + '.');
        return true;
      }
      announce('This browser could not save the Word file.');
      return false;
    }, function () {
      announce('Could not create the Word lab handout.');
      return false;
    }).then(function (ok) {
      if (btn) btn.disabled = false;
      return ok;
    });
  }

  function buildNow() {
    resetPreview();
    built = null;
    builtCfg = null;
    builtLearner = '';
    $('build-problem').hidden = true;
    $('summary').hidden = true;
    $('save').hidden = true;
    $('try').hidden = true;
    $('after-save').hidden = true;
    $('making').hidden = false;
    drawPaperSheet(null, null);
    setText('making-line', 'Building the STEM lab file in this browser tab...');

    try {
      var cfg = buildLabConfig();
      var list = batchList();
      var singleCode = list.names.length === 1 ? list.names[0] : '';
      var res = stem.buildStemLabPacket(Object.assign({}, cfg, {
        learner: singleCode,
        loader: loader,
        stationBilingual: bilingualMod,
        qrCrypto: window.AlloPacketQrCrypto,
      }));
      built = res;
      builtCfg = cfg;
      builtLearner = singleCode;
      $('making').hidden = true;
      $('summary').hidden = false;
      $('save').hidden = false;
      $('try').hidden = false;

      var actTitle = stem.ADAPTERS[res.activity] ? stem.ADAPTERS[res.activity].title : res.activity;
      var modeLabel = res.mode === 'probe' ? 'Check mode (one try)' : 'Practice mode (feedback and retry)';
      setText('summary-facts', res.name + ' (' + fileSize(res.bytes) + ') — ' + actTitle + ', ' + res.itemCount + ' items, ' + modeLabel + '.');
      setText('making-said', 'The file is ready: ' + res.name);

      var rows = $('summary-rows');
      rows.textContent = '';
      var addRow = function (k, v) {
        rows.appendChild(el('dt', '', k));
        rows.appendChild(el('dd', '', v));
      };
      addRow('Lab workbench', actTitle);
      addRow('Mode', modeLabel);
      addRow('Items', String(res.itemCount));
      addRow('File size', fileSize(res.bytes));
      addRow('Home languages', cfg.homeLanguages && cfg.homeLanguages.length ? cfg.homeLanguages.join(', ') : 'English only');
      addRow('Station Mode', cfg.stationMode ? 'On (shared-device kiosk reset)' : 'Off');
      addRow('Sealed QR', cfg.qrPublicKey ? 'Enabled' : 'Off');
      addRow('Network access', 'None (connect-src none)');

      if (typeof Blob === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        previewUrl = URL.createObjectURL(new Blob([res.html], { type: 'text/html;charset=utf-8' }));
        $('try').setAttribute('href', TRY_PAGE + '#' + previewUrl);
        if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.hostPreview === 'function') {
          previewSession = window.AlloPacketHandoff.hostPreview({ url: previewUrl, html: res.html });
        }
      } else {
        $('try').setAttribute('href', TRY_PAGE);
      }
      drawPaperSheet(cfg, res);
      drawBatch();
    } catch (err) {
      $('making').hidden = true;
      $('build-problem').hidden = false;
      setText('build-problem-text', (err && err.message) || 'Could not build the STEM lab file.');
    }
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 60000);
  }

  function saveFile() {
    if (!built) return;
    downloadBlob(new Blob([built.html], { type: 'text/html;charset=utf-8' }), built.name);
    $('after-save').hidden = false;
    $('after-save').focus();
    announce('Saved ' + built.name + '.');
  }

  function saveBatchZip() {
    setText('batch-problem', '');
    var list = batchList();
    if (list.names.length < 2) { setText('batch-problem', 'Enter at least 2 code names to save a .zip.'); return; }
    if (!built || !built.baseHtml) { setText('batch-problem', 'Build the file first.'); return; }
    if (!window.AlloPacketZip || typeof window.AlloPacketZip.create !== 'function') {
      setText('batch-problem', 'The zip helper did not load. Load the page again.');
      return;
    }
    try {
      var zip = window.AlloPacketZip.create();
      var enc = new TextEncoder();
      list.names.forEach(function (who) {
        var html = stem.withCodeName(built.baseHtml, who);
        var fname = stem.fileName(built.lesson.title, built.mode, who);
        zip.add(fname, enc.encode(html));
      });
      var parts = zip.finish();
      var zname = built.plain.replace(/\.html$/, '') + '__' + list.names.length + '-students.zip';
      downloadBlob(new Blob(parts, { type: 'application/zip' }), zname);
      setText('batch-said', 'Saved ' + zname + ' (' + fileSize(zip.bytes) + ').');
    } catch (err) {
      setText('batch-problem', (err && err.message) || 'Could not create the .zip file.');
    }
  }

  function gotoStep(next, focusHeading) {
    if (next >= 2) {
      var p1 = validateStep1();
      setText('step-1-problem', p1);
      if (p1) return;
    }
    if (next === 3) {
      var p2 = validateStep2();
      setText('step-2-problem', p2);
      if (p2) return;
    }
    step = next;
    [1, 2, 3].forEach(function (n) {
      var sec = $('step-' + n);
      if (sec) sec.hidden = n !== step;
      var tab = document.querySelector('.step-tab[data-go="' + n + '"]');
      if (tab) {
        if (n === step) tab.setAttribute('aria-current', 'step');
        else tab.removeAttribute('aria-current');
      }
    });
    if (step === 1) drawStep1();
    if (step === 2) drawStep2();
    if (step === 3) {
      $('f-title').value = state.title || '';
      buildNow();
    }
    if (focusHeading) {
      var h = $('step-' + step + '-title');
      if (h && typeof h.focus === 'function') h.focus();
    }
  }

  function showReopenNote(line, notes, page) {
    setText('reopen-line', line);
    var ul = $('reopen-list');
    ul.textContent = '';
    (notes || []).forEach(function (n) { ul.appendChild(el('li', '', n)); });
    var link = $('reopen-page');
    if (page && page.href) {
      link.href = page.href;
      link.textContent = 'Open ' + (page.name || 'that page');
      link.hidden = false;
    } else {
      link.hidden = true;
    }
    $('reopen-note').hidden = false;
    $('reopen-note').focus();
  }

  var reopenPending = null;

  function handleReopenBytes(bytes, fileName) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var res = stem.readStemLabPacket(u8, verifyCore);
    if (!res.ok) {
      var handoff = window.AlloPacketHandoff;
      var owner = handoff && typeof handoff.ownerPage === 'function' ? handoff.ownerPage(u8, verifyCore) : null;
      var targetPage = (owner && owner.href !== 'packets-stem-lab.html') ? owner : res.page;
      if (targetPage && targetPage.href && targetPage.href !== 'packets.html' && targetPage.href !== 'packets-stem-lab.html') {
        reopenPending = {
          file: { name: String(fileName || 'packet.html').slice(0, 120), bytes: u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) },
          href: targetPage.href,
          hash: targetPage.hash || (targetPage.href === 'packets-results.html' ? ((handoff && handoff.RESULTS_HASH) || '#import-results') : ((handoff && handoff.HASH) || '#open-file')),
        };
      } else {
        reopenPending = null;
      }
      showReopenNote(res.why || 'Could not read that file.', res.notes, targetPage);
      return;
    }
    reopenPending = null;
    state.starterId = '';
    state.activity = res.activity;
    state.mode = res.mode || 'practice';
    state.title = res.title || state.title;
    state.form = res.form || 'Form A';
    state.timeMin = res.timeLimitS ? Math.round(res.timeLimitS / 60) : '';
    state.adaptiveScaffold = !!res.adaptiveScaffold;
    state.homeLanguages = Array.isArray(res.homeLanguages) ? res.homeLanguages.slice() : [];
    state.glossaryText = formatGlossaryText(res.bilingualGlossary || {});
    state.stationMode = !!res.stationMode;
    state.qrPublicKey = typeof res.qrPublicKey === 'string' ? res.qrPublicKey : '';
    if (res.activity === 'stem_circuit' && res.items.length) {
      var f = res.items[0];
      state.circuit = {
        topology: f.topology || 'series',
        voltage: f.voltage || 6,
        r1: (f.bulbs && f.bulbs[0] && f.bulbs[0].resistance) || 3,
        r2: (f.bulbs && f.bulbs[1] && f.bulbs[1].resistance) || 3,
        qsText: formatCircuitQuestions(res.items),
        stretchItems: [],
      };
    } else if (res.activity === 'stem_data_explorer') {
      state.data = {
        datasetTitle: (res.items[0] && res.items[0].datasetTitle) || res.title,
        unit: (res.items[0] && res.items[0].unit) || '',
        csvText: res.datasetCsv || state.data.csvText,
        qsText: formatDataQuestions(res.items),
      };
    } else if (res.activity === 'stem_geometry_grid') {
      state.geometry = { qsText: formatGeometryTasks(res.items) };
    }
    if ($('f-batch-names')) $('f-batch-names').value = res.learner || '';
    if ($('f-teacher-code')) $('f-teacher-code').value = '';
    remember();
    gotoStep(2, false);
    showReopenNote('Loaded "' + res.title + '" into the STEM lab editor.', res.notes, null);
  }

  function handleReopenFile(file) {
    if (!file) return;
    if (file.size > MAX_REOPEN_BYTES) {
      reopenPending = null;
      showReopenNote('That file is larger than 60 MB.', [], null);
      return;
    }
    var reader = new FileReader();
    reader.onload = function () { handleReopenBytes(new Uint8Array(reader.result), file.name); };
    reader.onerror = function () { reopenPending = null; showReopenNote('This browser could not read that file.', [], null); };
    reader.readAsArrayBuffer(file);
  }

  function checkHandoff() {
    var handoff = window.AlloPacketHandoff;
    if (!handoff || typeof handoff.take !== 'function') return;
    var h = window.location ? window.location.hash : '';
    if (h !== (handoff.HASH || '#open-file')) return;
    try { window.history.replaceState(null, '', window.location.href.split('#')[0]); } catch (_) {}
    handoff.take().then(function (file) {
      if (file && file.bytes) handleReopenBytes(file.bytes, file.name);
    }, function () {});
  }

  function bindInput(id, onValue) {
    var node = $(id);
    if (!node) return;
    var fn = function () { onValue(node.value); remember(); updateLiveCalculations(); };
    node.addEventListener('input', fn);
    node.addEventListener('change', fn);
  }

  function wireEvents() {
    var filters = document.querySelectorAll('#lab-filters button[data-lab-filter]');
    for (var fi = 0; fi < filters.length; fi++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          activeFilter = btn.getAttribute('data-lab-filter') || 'all';
          for (var j = 0; j < filters.length; j++) filters[j].setAttribute('aria-pressed', filters[j] === btn ? 'true' : 'false');
          drawStarters();
        });
      })(filters[fi]);
    }

    var starterTitleMap = defaultStarterTitles();
    var actRadios = document.querySelectorAll('input[name="activity"]');
    for (var ai = 0; ai < actRadios.length; ai++) {
      actRadios[ai].addEventListener('change', function (e) {
        var nextAct = e.target.value;
        state.activity = nextAct;
        state.starterId = '';
        var defForAct = stem.starters().filter(function (s) { return s.activity === nextAct; })[0];
        if (defForAct && (!state.title || starterTitleMap[state.title])) {
          state.title = defForAct.title;
        }
        remember();
        drawStep1();
      });
    }

    var modeRadios = document.querySelectorAll('input[name="mode"]');
    for (var mi = 0; mi < modeRadios.length; mi++) {
      modeRadios[mi].addEventListener('change', function (e) {
        state.mode = e.target.value === 'probe' ? 'probe' : 'practice';
        remember();
        drawStep1();
      });
    }

    $('f-adaptive').addEventListener('change', function (e) { state.adaptiveScaffold = !!e.target.checked; remember(); });
    bindInput('f-form', function (v) { state.form = v; });
    bindInput('f-time-min', function (v) { state.timeMin = v; });

    bindInput('f-cir-topo', function (v) { state.circuit.topology = v; });
    bindInput('f-cir-volts', function (v) { state.circuit.voltage = Number(v) || 6; });
    bindInput('f-cir-r1', function (v) { state.circuit.r1 = Number(v) || 3; });
    bindInput('f-cir-r2', function (v) { state.circuit.r2 = Number(v) || 3; });
    bindInput('f-cir-qs', function (v) { state.circuit.qsText = v; });

    bindInput('f-dat-title', function (v) { state.data.datasetTitle = v; });
    bindInput('f-dat-unit', function (v) { state.data.unit = v; });
    bindInput('f-dat-csv', function (v) { state.data.csvText = v; });
    bindInput('f-dat-qs', function (v) { state.data.qsText = v; });

    bindInput('f-geo-qs', function (v) { state.geometry.qsText = v; });

    bindInput('f-glossary', function (v) { state.glossaryText = v; });
    bindInput('f-qr-key', function (v) { state.qrPublicKey = v; });
    $('f-station-mode').addEventListener('change', function (e) { state.stationMode = !!e.target.checked; remember(); updateLiveCalculations(); });

    var titleTimer = 0;
    $('f-title').addEventListener('input', function (e) {
      state.title = e.target.value;
      remember();
      clearTimeout(titleTimer);
      titleTimer = setTimeout(function () { if (step === 3) buildNow(); }, 180);
    });

    $('f-batch-names').addEventListener('input', function () {
      var list = batchList();
      var nextSingle = list.names.length === 1 ? list.names[0] : '';
      drawBatch();
      if (step === 3 && nextSingle !== builtLearner) buildNow();
    });
    if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.mountBatchListHelper === 'function') {
      window.AlloPacketHandoff.mountBatchListHelper($('f-batch-names'), { maxNames: MAX_STUDENTS, announce: announce });
    }

    var tabs = document.querySelectorAll('.step-tab[data-go]');
    for (var ti = 0; ti < tabs.length; ti++) {
      (function (tab) {
        tab.addEventListener('click', function () { gotoStep(Number(tab.getAttribute('data-go')) || 1, true); });
      })(tabs[ti]);
    }
    $('next-1').addEventListener('click', function () { gotoStep(2, true); });
    $('back-2').addEventListener('click', function () { gotoStep(1, true); });
    $('next-2').addEventListener('click', function () { gotoStep(3, true); });
    $('back-3').addEventListener('click', function () { gotoStep(2, true); });
    $('retry').addEventListener('click', buildNow);
    $('fix-choices').addEventListener('click', function () { gotoStep(2, true); });
    $('save').addEventListener('click', saveFile);
    $('batch-make').addEventListener('click', saveBatchZip);

    var paperFold = $('paper-stem-fold');
    if (paperFold) {
      paperFold.addEventListener('toggle', function () {
        var sheet = $('paper-stem-sheet');
        if (sheet) sheet.hidden = !(paperFold.open && sheet.getAttribute('data-ready') === '1');
      });
    }
    var paperKey = $('f-paper-stem-key');
    if (paperKey) {
      paperKey.addEventListener('change', function () {
        if (built && builtCfg) drawPaperSheet(builtCfg, built);
      });
    }
    var paperBtn = $('print-paper-stem');
    if (paperBtn) {
      paperBtn.addEventListener('click', function () {
        if (!built) buildNow();
        var sheet = $('paper-stem-sheet');
        if (!sheet || sheet.getAttribute('data-ready') !== '1') return;
        if (paperFold) paperFold.open = true;
        sheet.hidden = false;
        announce('Opening print dialog for the STEM lab recording sheet.');
        try { window.print(); } catch (_) {}
      });
    }
    var docxBtn = $('download-docx');
    if (docxBtn) {
      docxBtn.addEventListener('click', function () { downloadStemDocx(); });
    }

    $('reopen-choose').addEventListener('click', function () { $('reopen-file').click(); });
    $('reopen-file').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) handleReopenFile(e.target.files[0]);
      e.target.value = '';
    });
    $('reopen-close').addEventListener('click', function () { reopenPending = null; $('reopen-note').hidden = true; });
    if ($('reopen-page')) {
      $('reopen-page').addEventListener('click', function (event) {
        var handoff = window.AlloPacketHandoff;
        if (!reopenPending || !handoff || typeof handoff.redirect !== 'function') return;
        event.preventDefault();
        var target = reopenPending;
        reopenPending = null;
        handoff.redirect(target.file, target.href, target.hash).catch(function () { window.location.href = target.href; });
      });
    }
    var reopenBox = $('reopen');
    reopenBox.addEventListener('dragover', function (e) { e.preventDefault(); reopenBox.classList.add('is-dropping'); });
    reopenBox.addEventListener('dragleave', function () { reopenBox.classList.remove('is-dropping'); });
    reopenBox.addEventListener('drop', function (e) {
      e.preventDefault();
      reopenBox.classList.remove('is-dropping');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) handleReopenFile(e.dataTransfer.files[0]);
    });

    $('forget').addEventListener('click', function () {
      try { localStorage.removeItem(STORE_KEY); } catch (_) {}
      if (window.AlloPacketHandoff && typeof window.AlloPacketHandoff.clearSavedQrPublicKey === 'function') window.AlloPacketHandoff.clearSavedQrPublicKey();
      state = defaultState();
      if ($('f-teacher-code')) $('f-teacher-code').value = '';
      if ($('f-qr-key') && $('f-qr-key')._alloQrHelper) $('f-qr-key')._alloQrHelper.sync('');
      setText('forget-said', 'Choices removed on this device.');
      gotoStep(1, false);
    });
  }

  function start() {
    stem = window.AlloPacketStemLab || null;
    loader = window.AlloWordSoundsTakeHome || null;
    bilingualMod = window.AlloPacketStationBilingual || null;
    verifyCore = window.AlloPacketVerify || null;

    $('loading').hidden = true;
    if (!stem || !loader) {
      $('load-problem').hidden = false;
      return;
    }
    $('reopen').hidden = false;
    state = recall();
    wireEvents();
    gotoStep(1, false);
    checkHandoff();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
