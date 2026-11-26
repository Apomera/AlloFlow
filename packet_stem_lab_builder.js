// Mini-STEM Lab + Check Packets builder, 3 pure DOM/CSS interactive lab adapters, curated starter labs, and reopen reader:
//   - stem_circuit       : Simple Circuit Lab (series/parallel switches, bulbs, Ohm's-law readout + observation checks)
//   - stem_data_explorer : Data & Graph Explorer (CSV dataset, group filter, Bar vs Dot/Range chart, live stats + questions)
//   - stem_geometry_grid : Geometry Area, Perimeter & Angle Lab (unit tile grid, base/height builder, angle classifier)
//
// Plain UMD script for browser pages (window.AlloPacketStemLab) and Node (module.exports).
// Zero network, zero storage, zero markup strings, zero literal URLs, zero outer-closure refs in serialized render/score fns.
(function (root) {
  'use strict';

  var VERSION = 1;
  var ACTIVITY_IDS = ['stem_circuit', 'stem_data_explorer', 'stem_geometry_grid'];

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function str(v, max) {
    var s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    return max ? s.slice(0, max) : s;
  }

  function fnv1a(text) {
    var h = 2166136261 >>> 0;
    var s = String(text || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  function slug(text, max) {
    var out = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return (out || 'stem-lab').slice(0, max || 48).replace(/-+$/, '') || 'stem-lab';
  }

  function codeName(value) {
    var t = typeof value === 'string' ? value : '';
    try {
      return t.normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ._-]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim();
    } catch (_) {
      return t.replace(/[^A-Za-z0-9 ._-]+/g, '').trim().slice(0, 40);
    }
  }

  function withCodeName(html, name) {
    var clean = codeName(name);
    var openTag = '<script type="application/json" id="packet-manifest">';
    var at = typeof html === 'string' ? html.indexOf(openTag) : -1;
    if (at < 0) return html;
    var from = at + openTag.length;
    var to = html.indexOf('</script>', from);
    if (to < 0) return html;
    var manifest;
    try {
      manifest = JSON.parse(html.slice(from, to), function (k, v) {
        return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v;
      });
    } catch (_) { return html; }
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return html;
    if (clean) manifest.learner = clean;
    else if (Object.prototype.hasOwnProperty.call(manifest, 'learner')) delete manifest.learner;
    else return html;
    var json = JSON.stringify(manifest)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
    return html.slice(0, from) + json + html.slice(to);
  }

  function withSpeechManifest(html) {
    var openTag = '<script type="application/json" id="packet-manifest">';
    var at = typeof html === 'string' ? html.indexOf(openTag) : -1;
    if (at < 0) return html;
    var from = at + openTag.length;
    var to = html.indexOf('</script>', from);
    if (to < 0) return html;
    var manifest;
    try {
      manifest = JSON.parse(html.slice(from, to), function (k, v) {
        return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v;
      });
    } catch (_) { return html; }
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return html;
    manifest.speech = {
      engine: 'speechSynthesis',
      localOnly: true,
      when: 'only when the learner presses Read aloud',
    };
    var json = JSON.stringify(manifest)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
    return html.slice(0, from) + json + html.slice(to);
  }

  function fileName(title, mode, learner) {
    var base = slug(title || 'stem-lab', 48);
    var suffix = mode === 'probe' || mode === 'check' ? '-check' : '-lab';
    var who = codeName(learner);
    var whoPart = who ? '__' + slug(who, 28) : '';
    return base + suffix + whoPart + '.html';
  }

  // ---------------------------------------------------------------------------
  // Pure Host-Side Solvers & Parsers (exported for maker UI & unit tests)
  // ---------------------------------------------------------------------------
  function solveCircuit(spec, switchMap) {
    var s = spec || {};
    var topology = s.topology === 'parallel' ? 'parallel' : 'series';
    var voltage = Math.max(1, Math.min(24, Number(s.voltage) || 6));
    var switches = Array.isArray(s.switches) ? s.switches : [];
    var bulbs = Array.isArray(s.bulbs) ? s.bulbs : [];
    var isClosed = function (sw) {
      if (switchMap && Object.prototype.hasOwnProperty.call(switchMap, sw.id)) return !!switchMap[sw.id];
      return !!sw.closed;
    };
    var bulbStates = [];
    var totalCurrent = 0;
    var totalResistance = null;
    var closed = false;

    if (topology === 'series') {
      closed = switches.length === 0 || switches.every(isClosed);
      var sumR = bulbs.reduce(function (acc, b) { return acc + Math.max(1, Number(b.resistance) || 3); }, 0);
      totalResistance = closed && sumR > 0 ? sumR : null;
      totalCurrent = closed && sumR > 0 ? voltage / sumR : 0;
      bulbs.forEach(function (b) {
        var r = Math.max(1, Number(b.resistance) || 3);
        var power = totalCurrent * totalCurrent * r;
        var level = !closed || totalCurrent <= 0 ? 'off' : power >= 6 ? 'bright' : power >= 1.5 ? 'lit' : 'dim';
        bulbStates.push({ id: b.id, label: b.label, resistance: r, current: totalCurrent, power: power, level: level, lit: level !== 'off' });
      });
    } else {
      var mainClosed = switches.filter(function (sw) { return Number(sw.branch) < 0; }).every(isClosed);
      var invR = 0;
      bulbs.forEach(function (b, bi) {
        var br = b.branch != null ? Number(b.branch) : bi;
        var brSwitches = switches.filter(function (sw) { return Number(sw.branch) === br; });
        var on = mainClosed && brSwitches.every(isClosed);
        var r = Math.max(1, Number(b.resistance) || 6);
        var cur = on ? voltage / r : 0;
        var power = on ? voltage * cur : 0;
        if (on) {
          totalCurrent += cur;
          invR += 1 / r;
        }
        var level = !on ? 'off' : power >= 12 ? 'bright' : power >= 3 ? 'lit' : 'dim';
        bulbStates.push({ id: b.id, label: b.label, resistance: r, current: cur, power: power, level: level, lit: on });
      });
      closed = bulbStates.some(function (b) { return b.lit; });
      totalResistance = invR > 0 ? 1 / invR : null;
    }

    return {
      topology: topology,
      voltage: voltage,
      closed: closed,
      totalCurrent: Math.round(totalCurrent * 100) / 100,
      totalResistance: totalResistance != null ? Math.round(totalResistance * 100) / 100 : null,
      litCount: bulbStates.filter(function (b) { return b.lit; }).length,
      bulbs: bulbStates,
    };
  }

  function parseCsvDataset(csvText) {
    var lines = String(csvText || '').replace(/\r\n?/g, '\n').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length < 2) return { groupCol: 'Group', labelCol: 'Trial', valueCol: 'Value', rows: [] };
    var splitRow = function (line) {
      return line.split(',').map(function (c) { return c.trim().replace(/^"|"$/g, ''); });
    };
    var header = splitRow(lines[0]);
    var hasThree = header.length >= 3;
    var groupCol = str(header[0] || 'Group', 36);
    var labelCol = hasThree ? str(header[1] || 'Trial', 36) : 'Item';
    var valueCol = str(hasThree ? header[2] : (header[1] || 'Value'), 36);
    var rows = [];
    for (var i = 1; i < lines.length && rows.length < 60; i++) {
      var cols = splitRow(lines[i]);
      var grp = str(cols[0] || 'All', 36);
      var lbl = hasThree ? str(cols[1] || ('#' + i), 36) : ('#' + i);
      var valRaw = hasThree ? cols[2] : cols[1];
      var num = Number(valRaw);
      if (!grp || valRaw == null || valRaw === '' || !isFinite(num)) continue;
      rows.push({ group: grp, label: lbl, value: Math.round(num * 100) / 100 });
    }
    return { groupCol: groupCol, labelCol: labelCol, valueCol: valueCol, rows: rows };
  }

  function formatCsvDataset(spec) {
    var s = spec || {};
    var head = [s.groupCol || 'Group', s.labelCol || 'Trial', s.valueCol || 'Value'].join(', ');
    var body = (Array.isArray(s.rows) ? s.rows : []).map(function (r) {
      return [r.group, r.label || '', r.value].join(', ');
    });
    return [head].concat(body).join('\n');
  }

  function computeDatasetStats(rows, groupFilter) {
    var list = (Array.isArray(rows) ? rows : []).filter(function (r) {
      return !groupFilter || groupFilter === 'ALL' || String(r.group) === String(groupFilter);
    });
    var vals = list.map(function (r) { return Number(r.value); }).filter(isFinite).sort(function (a, b) { return a - b; });
    var n = vals.length;
    if (!n) return { count: 0, min: null, max: null, range: null, median: null, mean: null };
    var min = vals[0];
    var max = vals[n - 1];
    var range = Math.round((max - min) * 100) / 100;
    var mid = Math.floor(n / 2);
    var median = n % 2 ? vals[mid] : Math.round(((vals[mid - 1] + vals[mid]) / 2) * 100) / 100;
    var sum = vals.reduce(function (acc, v) { return acc + v; }, 0);
    var mean = Math.round((sum / n) * 100) / 100;
    return { count: n, min: min, max: max, range: range, median: median, mean: mean };
  }

  function evaluateTileGrid(rows, cols, shadedMap) {
    var area = 0;
    var perimeter = 0;
    var on = function (r, c) { return r >= 0 && c >= 0 && r < rows && c < cols && !!shadedMap[r + ',' + c]; };
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (!on(r, c)) continue;
        area++;
        if (!on(r - 1, c)) perimeter++;
        if (!on(r + 1, c)) perimeter++;
        if (!on(r, c - 1)) perimeter++;
        if (!on(r, c + 1)) perimeter++;
      }
    }
    return { area: area, perimeter: perimeter };
  }

  function classifyAngleDeg(deg) {
    var d = Math.round(Number(deg) || 0);
    if (d === 90) return 'right';
    if (d > 0 && d < 90) return 'acute';
    return 'obtuse';
  }

  // ---------------------------------------------------------------------------
  // 6 Curated K-12 Starter Labs (2 per lab type)
  // ---------------------------------------------------------------------------
  var STARTER_LABS = [
    {
      id: 'circuit_series_basics',
      activity: 'stem_circuit',
      gradeBand: 'Grades 4-6',
      subject: 'Physical Science',
      name: 'Series Circuit Explorer (6V)',
      title: 'Series Circuit Lab',
      summary: 'Toggle switches in a 6V series circuit with two 3-ohm bulbs, observe brightness, and calculate current.',
      items: [
        {
          id: 'cir-s1',
          word: 'Series Circuit Switch Test',
          prompt: 'Close Switch A while leaving Switch B open. Do the bulbs light up?',
          hint: 'A series circuit has only one loop for electric current.',
          topology: 'series',
          voltage: 6,
          switches: [
            { id: 'sw1', label: 'Switch A', closed: false, branch: 0 },
            { id: 'sw2', label: 'Switch B', closed: false, branch: 0 },
          ],
          bulbs: [
            { id: 'b1', label: 'Bulb 1', resistance: 3, branch: 0 },
            { id: 'b2', label: 'Bulb 2', resistance: 3, branch: 0 },
          ],
          questionKind: 'mc',
          choices: ['No, the circuit stays open and both bulbs stay off', 'Yes, Bulb 1 lights up while Bulb 2 stays off', 'Yes, both bulbs glow brightly'],
          answer: 'No, the circuit stays open and both bulbs stay off',
        },
        {
          id: 'cir-s2',
          word: 'Series Total Resistance',
          prompt: 'Close both Switch A and Switch B. What is the total resistance (in ohms) of the two bulbs in series?',
          hint: 'In a series circuit, add the resistances of the two bulbs together (3 + 3).',
          topology: 'series',
          voltage: 6,
          switches: [
            { id: 'sw1', label: 'Switch A', closed: false, branch: 0 },
            { id: 'sw2', label: 'Switch B', closed: false, branch: 0 },
          ],
          bulbs: [
            { id: 'b1', label: 'Bulb 1', resistance: 3, branch: 0 },
            { id: 'b2', label: 'Bulb 2', resistance: 3, branch: 0 },
          ],
          questionKind: 'numeric',
          unit: 'ohms',
          answer: '6',
          tolerance: 0.05,
        },
        {
          id: 'cir-s3',
          word: 'Series Circuit Current',
          prompt: 'With both switches closed on the 6V battery, what is the total current (in amps)?',
          hint: 'Use Ohm law: Current = Voltage divided by Total Resistance (6 / 6).',
          topology: 'series',
          voltage: 6,
          switches: [
            { id: 'sw1', label: 'Switch A', closed: false, branch: 0 },
            { id: 'sw2', label: 'Switch B', closed: false, branch: 0 },
          ],
          bulbs: [
            { id: 'b1', label: 'Bulb 1', resistance: 3, branch: 0 },
            { id: 'b2', label: 'Bulb 2', resistance: 3, branch: 0 },
          ],
          questionKind: 'numeric',
          unit: 'A',
          answer: '1',
          tolerance: 0.05,
        },
      ],
      stretchItems: [
        {
          id: 'cir-s-stretch',
          activity: 'stem_circuit',
          word: 'Stretch: 12V Series Current',
          prompt: 'Bonus challenge: Close both switches on this 12V battery with 3-ohm and 5-ohm bulbs. What is the current (in amps)?',
          hint: 'Total resistance is 3 + 5 = 8 ohms. Divide 12V by 8 ohms.',
          topology: 'series',
          voltage: 12,
          switches: [
            { id: 'sw1', label: 'Switch A', closed: false, branch: 0 },
            { id: 'sw2', label: 'Switch B', closed: false, branch: 0 },
          ],
          bulbs: [
            { id: 'b1', label: 'Bulb 1', resistance: 3, branch: 0 },
            { id: 'b2', label: 'Bulb 2', resistance: 5, branch: 0 },
          ],
          questionKind: 'numeric',
          unit: 'A',
          answer: '1.5',
          tolerance: 0.05,
        },
      ],
    },
    {
      id: 'circuit_parallel_lab',
      activity: 'stem_circuit',
      gradeBand: 'Grades 6-9',
      subject: 'Physical Science',
      name: 'Parallel Branches & Ohm Law (12V)',
      title: 'Parallel Circuit Lab',
      summary: 'Explore independent parallel branches with a main switch, 6-ohm bulbs, and equivalent resistance.',
      items: [
        {
          id: 'cir-p1',
          word: 'Parallel Branch Independence',
          prompt: 'Close the Main Switch and Branch 1 Switch, leaving Branch 2 open. How many bulbs light up?',
          hint: 'In a parallel circuit, each branch has its own path to the battery.',
          topology: 'parallel',
          voltage: 12,
          switches: [
            { id: 'swm', label: 'Main Switch', closed: false, branch: -1 },
            { id: 'sw1', label: 'Branch 1 Switch', closed: false, branch: 0 },
            { id: 'sw2', label: 'Branch 2 Switch', closed: false, branch: 1 },
          ],
          bulbs: [
            { id: 'b1', label: 'Branch 1 Bulb', resistance: 6, branch: 0 },
            { id: 'b2', label: 'Branch 2 Bulb', resistance: 6, branch: 1 },
          ],
          questionKind: 'numeric',
          unit: 'bulbs',
          answer: '1',
          tolerance: 0.01,
        },
        {
          id: 'cir-p2',
          word: 'Parallel Total Current',
          prompt: 'Close all three switches (Main, Branch 1, and Branch 2). What is the total current (in amps)?',
          hint: 'Each 6-ohm branch draws 12V / 6 ohms = 2 A, so two branches draw 4 A.',
          topology: 'parallel',
          voltage: 12,
          switches: [
            { id: 'swm', label: 'Main Switch', closed: false, branch: -1 },
            { id: 'sw1', label: 'Branch 1 Switch', closed: false, branch: 0 },
            { id: 'sw2', label: 'Branch 2 Switch', closed: false, branch: 1 },
          ],
          bulbs: [
            { id: 'b1', label: 'Branch 1 Bulb', resistance: 6, branch: 0 },
            { id: 'b2', label: 'Branch 2 Bulb', resistance: 6, branch: 1 },
          ],
          questionKind: 'numeric',
          unit: 'A',
          answer: '4',
          tolerance: 0.05,
        },
        {
          id: 'cir-p3',
          word: 'Parallel Equivalent Resistance',
          prompt: 'With both 6-ohm branches closed, what is the equivalent total resistance (in ohms)?',
          hint: 'Total resistance in parallel is smaller than either single branch (12V / 4A).',
          topology: 'parallel',
          voltage: 12,
          switches: [
            { id: 'swm', label: 'Main Switch', closed: false, branch: -1 },
            { id: 'sw1', label: 'Branch 1 Switch', closed: false, branch: 0 },
            { id: 'sw2', label: 'Branch 2 Switch', closed: false, branch: 1 },
          ],
          bulbs: [
            { id: 'b1', label: 'Branch 1 Bulb', resistance: 6, branch: 0 },
            { id: 'b2', label: 'Branch 2 Bulb', resistance: 6, branch: 1 },
          ],
          questionKind: 'numeric',
          unit: 'ohms',
          answer: '3',
          tolerance: 0.05,
        },
      ],
    },
    {
      id: 'data_plant_growth',
      activity: 'stem_data_explorer',
      gradeBand: 'Grades 4-6',
      subject: 'Life Science',
      name: 'Bean Sprout Sunlight Study (CSV)',
      title: 'Plant Growth Data Explorer',
      summary: 'Filter bean sprout trials by sunlight level, toggle Bar vs Dot/Range charts, and find median, range, and mean.',
      datasetCsv: [
        'Sunlight, Trial, Height_cm',
        'Full Sun, Trial 1, 14',
        'Full Sun, Trial 2, 16',
        'Full Sun, Trial 3, 18',
        'Full Sun, Trial 4, 16',
        'Partial Shade, Trial 1, 10',
        'Partial Shade, Trial 2, 12',
        'Partial Shade, Trial 3, 11',
        'Partial Shade, Trial 4, 15',
        'Low Light, Trial 1, 5',
        'Low Light, Trial 2, 7',
        'Low Light, Trial 3, 6',
        'Low Light, Trial 4, 6',
      ].join('\n'),
      unit: 'cm',
      items: [
        {
          id: 'dat-p1',
          word: 'Full Sun Mean Height',
          prompt: 'Filter the chart to Full Sun. What is the mean sprout height (in cm)?',
          hint: 'Select the Full Sun button and check the Mean box in the summary stats.',
          questionKind: 'numeric',
          unit: 'cm',
          answer: '16',
          tolerance: 0.1,
        },
        {
          id: 'dat-p2',
          word: 'Partial Shade Range',
          prompt: 'Filter to Partial Shade and inspect the Dot / Range plot. What is the range (max minus min) in cm?',
          hint: 'Range is the highest Partial Shade trial (15) minus the lowest (10).',
          questionKind: 'numeric',
          unit: 'cm',
          answer: '5',
          tolerance: 0.1,
        },
        {
          id: 'dat-p3',
          word: 'Sunlight Evidence Claim',
          prompt: 'Compare all three sunlight groups. Which claim is best supported by the data?',
          hint: 'Compare the mean and median heights across Full Sun, Partial Shade, and Low Light.',
          questionKind: 'mc',
          choices: [
            'Full Sun produced the tallest sprouts on average',
            'Low Light produced taller sprouts than Partial Shade',
            'Sunlight had no effect on sprout height',
          ],
          answer: 'Full Sun produced the tallest sprouts on average',
        },
      ],
    },
    {
      id: 'data_ramp_speed',
      activity: 'stem_data_explorer',
      gradeBand: 'Grades 6-8',
      subject: 'Motion & Forces',
      name: 'Ramp Angle & Cart Speed Trials (CSV)',
      title: 'Ramp Speed Data Explorer',
      summary: 'Analyze cart speed measurements across 10-deg, 20-deg, and 30-deg ramps with Bar and Dot/Range charts.',
      datasetCsv: [
        'Ramp_Angle, Trial, Speed_cm_s',
        '10 deg, Run 1, 22',
        '10 deg, Run 2, 24',
        '10 deg, Run 3, 26',
        '20 deg, Run 1, 38',
        '20 deg, Run 2, 42',
        '20 deg, Run 3, 40',
        '30 deg, Run 1, 56',
        '30 deg, Run 2, 60',
        '30 deg, Run 3, 58',
      ].join('\n'),
      unit: 'cm/s',
      items: [
        {
          id: 'dat-r1',
          word: '20-deg Ramp Median Speed',
          prompt: 'Filter the trials to 20 deg. What is the median cart speed (in cm/s)?',
          hint: 'Select 20 deg and check the Median readout.',
          questionKind: 'numeric',
          unit: 'cm/s',
          answer: '40',
          tolerance: 0.1,
        },
        {
          id: 'dat-r2',
          word: 'All Trials Maximum Speed',
          prompt: 'Select All groups. What is the highest speed recorded across every run (in cm/s)?',
          hint: 'Select All groups and inspect Max in the stats strip.',
          questionKind: 'numeric',
          unit: 'cm/s',
          answer: '60',
          tolerance: 0.1,
        },
        {
          id: 'dat-r3',
          word: 'Ramp Angle Pattern',
          prompt: 'How did increasing the ramp angle from 10 deg to 30 deg affect mean cart speed?',
          hint: 'Compare the Mean for 10 deg (24), 20 deg (40), and 30 deg (58).',
          questionKind: 'mc',
          choices: [
            'Mean speed increased steadily as the ramp got steeper',
            'Mean speed stayed constant across all angles',
            'Mean speed decreased on steeper ramps',
          ],
          answer: 'Mean speed increased steadily as the ramp got steeper',
        },
      ],
    },
    {
      id: 'geom_area_perimeter',
      activity: 'stem_geometry_grid',
      gradeBand: 'Grades 3-6',
      subject: 'Geometry',
      name: 'Area & Perimeter Tile Grid Lab',
      title: 'Area and Perimeter Grid Lab',
      summary: 'Shade unit tiles on an interactive grid or adjust dimensions to match target areas and perimeters.',
      items: [
        {
          id: 'geo-g1',
          word: 'Build Area 12 Grid',
          prompt: 'Shade tiles on the grid to build a shape with an area of exactly 12 square units.',
          hint: 'Click or press tiles until you have shaded 12 unit squares.',
          geoMode: 'tiles',
          rows: 5,
          cols: 6,
          targetType: 'area',
          targetArea: 12,
        },
        {
          id: 'geo-g2',
          word: 'Build Area 12 Perimeter 14',
          prompt: 'Build a shape with an area of 12 square units AND a perimeter of 14 units.',
          hint: 'A 3 by 4 rectangle has area 3 x 4 = 12 and perimeter 3 + 4 + 3 + 4 = 14.',
          geoMode: 'tiles',
          rows: 5,
          cols: 6,
          targetType: 'area_and_perimeter',
          targetArea: 12,
          targetPerimeter: 14,
        },
        {
          id: 'geo-g3',
          word: 'Right Triangle Area 15',
          prompt: 'Adjust the base and height of the right triangle until its area is exactly 15 square units.',
          hint: 'Triangle area = (Base x Height) / 2. Try Base 6 and Height 5 (or 5 and 6).',
          geoMode: 'dims',
          shape: 'triangle',
          startBase: 4,
          startHeight: 4,
          maxDim: 10,
          targetType: 'area',
          targetArea: 15,
        },
      ],
    },
    {
      id: 'geom_angles_triangles',
      activity: 'stem_geometry_grid',
      gradeBand: 'Grades 4-8',
      subject: 'Geometry',
      name: 'Angle Classifier & Builder Lab',
      title: 'Angles and Geometry Lab',
      summary: 'Classify acute, right, and obtuse angles and rotate an interactive ray to build exact degree measures.',
      items: [
        {
          id: 'geo-a1',
          word: 'Classify 120-Degree Angle',
          prompt: 'Inspect the angle shown below. Is it acute, right, or obtuse?',
          hint: 'Compare the angle opening to a 90-degree square corner.',
          geoMode: 'angle',
          targetType: 'classify_angle',
          angleDeg: 120,
          answer: 'obtuse',
        },
        {
          id: 'geo-a2',
          word: 'Classify 45-Degree Angle',
          prompt: 'Inspect the angle shown below. Is it acute, right, or obtuse?',
          hint: 'Compare the angle opening to a 90-degree square corner.',
          geoMode: 'angle',
          targetType: 'classify_angle',
          angleDeg: 45,
          answer: 'acute',
        },
        {
          id: 'geo-a3',
          word: 'Build a 90-Degree Right Angle',
          prompt: 'Use the angle controls to rotate the ray to exactly 90 degrees (a right angle), then check your angle.',
          hint: 'Tap +15 deg or -15 deg until the live readout shows 90 deg.',
          geoMode: 'angle',
          targetType: 'build_angle',
          startDeg: 30,
          targetDeg: 90,
        },
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // Labels
  // ---------------------------------------------------------------------------
  var CIRCUIT_LABELS = {
    stem_circuit_title: 'Circuit Lab',
    stem_circuit_directions: 'Toggle the switches to inspect circuit current and bulb glow, then answer each question.',
    cir_check: 'Check answer',
    cir_submit: 'Submit answer',
    cir_hint_show: 'Show hint',
    cir_hint_hide: 'Hide hint',
    cir_empty: 'Enter or select an answer first.',
    cir_right: 'Correct observation.',
    cir_retry: 'Check the switches and your calculation, then try again.',
    cir_missed: 'Expected answer: {answer}.',
  };

  var DATA_LABELS = {
    stem_data_explorer_title: 'Data & Graph Explorer',
    stem_data_explorer_directions: 'Filter the dataset by group, compare Bar and Dot/Range charts, read the summary stats, and answer each question.',
    dat_all: 'All groups',
    dat_bar: 'Bar chart',
    dat_dot: 'Dot / Range plot',
    dat_check: 'Check answer',
    dat_submit: 'Submit answer',
    dat_hint_show: 'Show hint',
    dat_hint_hide: 'Hide hint',
    dat_empty: 'Enter or select an answer first.',
    dat_right: 'Correct interpretation of the data.',
    dat_retry: 'Check the filtered stats and try again.',
    dat_missed: 'Expected answer: {answer}.',
  };

  var GEOMETRY_LABELS = {
    stem_geometry_grid_title: 'Geometry Lab',
    stem_geometry_grid_directions: 'Use the interactive tile grid, dimension controls, or angle ray to build or classify each shape.',
    geo_check: 'Check work',
    geo_submit: 'Submit work',
    geo_clear: 'Clear grid',
    geo_hint_show: 'Show hint',
    geo_hint_hide: 'Hide hint',
    geo_empty_grid: 'Shade at least 1 tile before checking.',
    geo_empty_angle: 'Choose acute, right, or obtuse first.',
    geo_right: 'That matches the geometric target.',
    geo_retry: 'Adjust your model and try again.',
    geo_missed: 'Target: {answer}.',
  };

  // ---------------------------------------------------------------------------
  // Self-Contained Adapter 1: stem_circuit (ZERO outer closures!)
  // ---------------------------------------------------------------------------
  function renderStemCircuit(item, ctx) {
    var L = ctx.L || {};
    var el = ctx.el;
    var fmt = ctx.fmt;
    var root = ctx.root;
    var isCheck = !!ctx.check;
    var topology = item.topology === 'parallel' ? 'parallel' : 'series';
    var voltage = Math.max(1, Math.min(24, Number(item.voltage) || 6));
    var switches = Array.isArray(item.switches) ? item.switches : [];
    var bulbs = Array.isArray(item.bulbs) ? item.bulbs : [];
    var swState = Object.create(null);
    switches.forEach(function (sw) { swState[sw.id] = !!sw.closed; });
    var locked = false;
    var hintVisible = false;
    var interacted = false;
    var qKind = item.questionKind === 'mc' ? 'mc' : 'numeric';

    var computeState = function () {
      var bulbOut = [];
      var totalI = 0;
      var totalR = null;
      var closed = false;
      if (topology === 'series') {
        closed = switches.length === 0 || switches.every(function (sw) { return !!swState[sw.id]; });
        var sumR = bulbs.reduce(function (a, b) { return a + Math.max(1, Number(b.resistance) || 3); }, 0);
        totalR = closed && sumR > 0 ? sumR : null;
        totalI = closed && sumR > 0 ? voltage / sumR : 0;
        bulbs.forEach(function (b) {
          var r = Math.max(1, Number(b.resistance) || 3);
          var p = totalI * totalI * r;
          var lvl = !closed || totalI <= 0 ? 'off' : p >= 6 ? 'bright' : p >= 1.5 ? 'lit' : 'dim';
          bulbOut.push({ id: b.id, label: b.label, r: r, i: totalI, lvl: lvl, lit: lvl !== 'off' });
        });
      } else {
        var mainOn = switches.filter(function (sw) { return Number(sw.branch) < 0; }).every(function (sw) { return !!swState[sw.id]; });
        var invR = 0;
        bulbs.forEach(function (b, bi) {
          var br = b.branch != null ? Number(b.branch) : bi;
          var on = mainOn && switches.filter(function (sw) { return Number(sw.branch) === br; }).every(function (sw) { return !!swState[sw.id]; });
          var r = Math.max(1, Number(b.resistance) || 6);
          var cur = on ? voltage / r : 0;
          var p = on ? voltage * cur : 0;
          if (on) { totalI += cur; invR += 1 / r; }
          var lvl = !on ? 'off' : p >= 12 ? 'bright' : p >= 3 ? 'lit' : 'dim';
          bulbOut.push({ id: b.id, label: b.label, r: r, i: cur, lvl: lvl, lit: on });
        });
        closed = bulbOut.some(function (b) { return b.lit; });
        totalR = invR > 0 ? 1 / invR : null;
      }
      return {
        closed: closed,
        totalI: Math.round(totalI * 100) / 100,
        totalR: totalR != null ? Math.round(totalR * 100) / 100 : null,
        litCount: bulbOut.filter(function (b) { return b.lit; }).length,
        bulbs: bulbOut,
      };
    };

    var board = el('section', { class: 'cir-board', 'aria-label': 'Interactive circuit workbench', 'data-cir-board': '' });
    var readout = el('p', { class: 'stem-readout', role: 'status', 'aria-live': 'polite', 'data-cir-readout': '' });
    var localNote = el('p', { class: 'status warn', hidden: true, 'data-cir-local-note': '' });
    var showMsg = function (msg) {
      if (typeof ctx.feedback === 'function') ctx.feedback(msg);
      else { localNote.hidden = !msg; localNote.textContent = msg; }
      if (msg) ctx.announce(msg);
    };

    var paintBoard = function (focusSwId) {
      var st = computeState();
      board.textContent = '';
      board.className = 'cir-board ' + (st.closed ? 'is-closed' : 'is-open');

      var topRow = el('div', { class: 'cir-rail' }, [
        el('span', { class: 'cir-battery', text: 'Battery: ' + voltage + ' V (' + (topology === 'parallel' ? 'Parallel' : 'Series') + ')' }),
        el('span', { class: 'cir-loop-badge ' + (st.closed ? 'is-on' : 'is-off'), text: st.closed ? 'Circuit Closed' : 'Circuit Open' }),
      ]);
      board.appendChild(topRow);

      var swRow = el('div', { class: 'cir-switches', role: 'group', 'aria-label': 'Circuit switches' }, switches.map(function (sw) {
        var on = !!swState[sw.id];
        return el('button', {
          type: 'button',
          class: 'cir-sw ' + (on ? 'is-closed' : 'is-open'),
          'data-cir-sw': sw.id,
          'aria-pressed': on ? 'true' : 'false',
          disabled: locked,
          on: {
            click: function () {
              if (locked) return;
              swState[sw.id] = !swState[sw.id];
              if (!interacted && ctx.support) { interacted = true; ctx.support('lab_circuit_toggle'); }
              paintBoard(sw.id);
            },
          },
          text: sw.label + ': ' + (on ? 'Closed (ON)' : 'Open (OFF)'),
        });
      }));
      board.appendChild(swRow);

      var hideComputed = (qKind === 'numeric' || isCheck) && (!locked || isCheck);
      var bulbsRow = el('div', { class: 'cir-bulbs' }, st.bulbs.map(function (b) {
        var lblTxt = b.lvl === 'off' ? 'OFF' : (hideComputed ? b.lvl.toUpperCase() : (b.lvl.toUpperCase() + ' (' + b.i.toFixed(2) + ' A)'));
        return el('div', { class: 'cir-bulb is-' + b.lvl, 'data-cir-bulb': b.id, 'data-cir-lit': b.lit ? '1' : '0' }, [
          el('span', { class: 'cir-lamp', 'aria-hidden': 'true', text: b.lit ? '*' : 'o' }),
          el('strong', { text: b.label + ' (' + b.r + ' ohm)' }),
          el('span', { class: 'cir-bulb-state', text: lblTxt }),
        ]);
      }));
      board.appendChild(bulbsRow);

      if (hideComputed) {
        readout.textContent = 'Status: ' + (st.closed ? 'Closed' : 'Open')
          + ' | Lit bulbs: ' + st.litCount + ' of ' + st.bulbs.length;
      } else {
        var rText = st.totalR != null ? (st.totalR + ' ohms') : 'Open';
        readout.textContent = 'Status: ' + (st.closed ? 'Closed' : 'Open')
          + ' | Lit bulbs: ' + st.litCount + ' of ' + st.bulbs.length
          + ' | Total R: ' + rText
          + ' | Total I: ' + st.totalI.toFixed(2) + ' A';
      }

      if (focusSwId) {
        var fBtn = board.querySelector('[data-cir-sw="' + focusSwId + '"]');
        if (fBtn && !fBtn.disabled && typeof fBtn.focus === 'function') fBtn.focus();
      }
    };

    var promptEl = el('p', { class: 'stem-prompt', text: item.prompt || '' });
    var hintBox = item.hint && !isCheck ? el('p', { class: 'stem-hint', hidden: true, 'data-cir-hint': '', text: item.hint }) : null;
    var hintBtn = hintBox ? el('button', {
      type: 'button',
      class: 'stem-btn-sm',
      'data-cir-hint-btn': '',
      'aria-expanded': 'false',
      on: {
        click: function () {
          hintVisible = !hintVisible;
          hintBox.hidden = !hintVisible;
          hintBtn.setAttribute('aria-expanded', hintVisible ? 'true' : 'false');
          hintBtn.textContent = hintVisible ? (L.cir_hint_hide || 'Hide hint') : (L.cir_hint_show || 'Show hint');
          if (hintVisible && ctx.support) ctx.support('hint_shown');
        },
      },
      text: L.cir_hint_show || 'Show hint',
    }) : null;

    var qWrap = el('div', { class: 'stem-question' });
    var numInput = null;
    var submitBtn = null;
    var mcButtons = [];

    var gradeNumeric = function (gotStr, wantStr) {
      var g = Number(String(gotStr || '').trim());
      var w = Number(String(wantStr || '').trim());
      if (!isFinite(g) || !isFinite(w)) return String(gotStr || '').trim().toLowerCase() === String(wantStr || '').trim().toLowerCase();
      var tol = Number(item.tolerance) >= 0 ? Number(item.tolerance) : 0.05;
      return Math.abs(g - w) <= tol;
    };

    if (qKind === 'mc') {
      var choices = Array.isArray(item.choices) ? item.choices : [];
      var triedMc = Object.create(null);
      var listEl = el('div', { class: 'stem-mc-list', role: 'group', 'aria-label': 'Answer choices' });
      choices.forEach(function (ch, ci) {
        var b = el('button', {
          type: 'button',
          class: 'stem-mc-btn',
          'data-cir-choice': String(ci),
          on: {
            click: function () {
              if (locked || (!isCheck && triedMc[ci])) return;
              showMsg('');
              if (isCheck) {
                var r = ctx.answer(ch);
                if (r === 'recorded' || r === 'correct' || r === 'missed') {
                  locked = true;
                  mcButtons.forEach(function (x) { x.disabled = true; });
                  paintBoard();
                }
                return;
              }
              var ok = String(ch).trim().toLowerCase() === String(item.answer || '').trim().toLowerCase();
              var out = ctx.answer(ch, ok, {
                correctText: L.cir_right || 'Correct observation.',
                retryText: L.cir_retry || 'Check the circuit readout and try again.',
                missedText: fmt(L.cir_missed || 'Expected answer: {answer}.', { answer: item.answer || '' }),
              });
              if (out === 'correct' || out === 'missed') {
                locked = true;
                mcButtons.forEach(function (x, xi) {
                  x.disabled = true;
                  if (String(choices[xi]).trim().toLowerCase() === String(item.answer || '').trim().toLowerCase()) x.className = 'stem-mc-btn is-right';
                });
                paintBoard();
              } else {
                triedMc[ci] = true;
                b.className = 'stem-mc-btn is-tried';
                b.setAttribute('aria-disabled', 'true');
              }
            },
          },
          text: (ci + 1) + '. ' + ch,
        });
        mcButtons.push(b);
        listEl.appendChild(b);
      });
      qWrap.appendChild(listEl);
      if (typeof ctx.keys === 'function') {
        ctx.keys(function (k) {
          var n = Number(k);
          if (n >= 1 && n <= mcButtons.length && !mcButtons[n - 1].disabled) { mcButtons[n - 1].click(); return true; }
          return false;
        });
      }
    } else {
      var inpId = 'cir-ans-' + String(item.id || 'q').replace(/[^a-z0-9_-]+/gi, '_');
      numInput = el('input', {
        id: inpId,
        type: 'text',
        inputmode: 'decimal',
        class: 'stem-num-input',
        autocomplete: 'off',
        'data-cir-input': '',
        on: {
          keydown: function (ev) { if (ev.key === 'Enter' && submitBtn && !submitBtn.disabled) { ev.preventDefault(); submitBtn.click(); } },
        },
      });
      submitBtn = el('button', {
        type: 'button',
        class: 'primary',
        'data-cir-submit': '',
        on: {
          click: function () {
            if (locked) return;
            var raw = String(numInput.value || '').trim();
            if (!raw) { showMsg(L.cir_empty || 'Enter an answer first.'); numInput.focus(); return; }
            showMsg('');
            if (isCheck) {
              var r = ctx.answer(raw);
              if (r === 'recorded' || r === 'correct' || r === 'missed') {
                locked = true; submitBtn.disabled = true; numInput.readOnly = true; paintBoard();
              }
              return;
            }
            var ok = gradeNumeric(raw, item.answer);
            var out = ctx.answer(raw, ok, {
              correctText: L.cir_right || 'Correct observation.',
              retryText: L.cir_retry || 'Check the live circuit readout and try again.',
              missedText: fmt(L.cir_missed || 'Expected answer: {answer}.', { answer: item.answer + (item.unit ? ' ' + item.unit : '') }),
            });
            if (out === 'correct' || out === 'missed') {
              locked = true; submitBtn.disabled = true; numInput.readOnly = true; paintBoard();
            }
          },
        },
        text: isCheck ? (L.cir_submit || 'Submit answer') : (L.cir_check || 'Check answer'),
      });
      qWrap.appendChild(el('div', { class: 'row stem-num-row' }, [
        el('label', { for: inpId, class: 'stem-num-label', text: 'Your answer' + (item.unit ? ' (' + item.unit + ')' : '') }),
        numInput,
        submitBtn,
      ]));
    }

    root.appendChild(promptEl);
    if (hintBtn) root.appendChild(el('div', { class: 'row stem-tools-row' }, [hintBtn]));
    if (hintBox) root.appendChild(hintBox);
    root.appendChild(board);
    root.appendChild(readout);
    root.appendChild(qWrap);
    root.appendChild(localNote);
    paintBoard();

    return {
      reveal: function () {
        locked = true;
        if (submitBtn) submitBtn.disabled = true;
        if (numInput) numInput.readOnly = true;
        mcButtons.forEach(function (b) { b.disabled = true; });
        paintBoard();
      },
    };
  }

  function scoreStemCircuit(item, answer, response) {
    var want = String(answer == null ? '' : answer).trim();
    var got = String(response == null ? '' : response).trim();
    if (!want || !got) return { correct: false, digitsCorrect: null, digitsPossible: null };
    if (item && item.questionKind !== 'mc') {
      var g = Number(got), w = Number(want);
      if (isFinite(g) && isFinite(w)) {
        var tol = Number(item.tolerance) >= 0 ? Number(item.tolerance) : 0.05;
        return { correct: Math.abs(g - w) <= tol, digitsCorrect: null, digitsPossible: null };
      }
    }
    return { correct: got.toLowerCase() === want.toLowerCase(), digitsCorrect: null, digitsPossible: null };
  }

  // ---------------------------------------------------------------------------
  // Self-Contained Adapter 2: stem_data_explorer (ZERO outer closures!)
  // ---------------------------------------------------------------------------
  function renderStemDataExplorer(item, ctx) {
    var L = ctx.L || {};
    var el = ctx.el;
    var fmt = ctx.fmt;
    var root = ctx.root;
    var isCheck = !!ctx.check;
    var rows = Array.isArray(item.rows) ? item.rows : [];
    var groups = [];
    rows.forEach(function (r) { if (r && r.group && groups.indexOf(r.group) < 0) groups.push(r.group); });
    var activeGroup = 'ALL';
    var chartKind = 'bar';
    var locked = false;
    var hintVisible = false;

    var filterBar = el('div', { class: 'row stem-bar', role: 'group', 'aria-label': 'Filter data by ' + (item.groupCol || 'group') }, [
      el('span', { class: 'stem-bar-lbl', 'aria-hidden': 'true', text: 'Filter:' }),
    ]);
    var chartBar = el('div', { class: 'row stem-bar', role: 'group', 'aria-label': 'Chart view' }, [
      el('span', { class: 'stem-bar-lbl', 'aria-hidden': 'true', text: 'View:' }),
    ]);
    var chartStage = el('section', { class: 'dat-stage', 'aria-label': item.datasetTitle || 'Dataset chart', 'data-dat-stage': '' });
    var statsBox = el('dl', { class: 'dat-stats', 'data-dat-stats': '' });
    var statsRegion = el('div', { class: 'dat-stats-region', role: 'status', 'aria-live': 'polite' }, [statsBox]);
    var localNote = el('p', { class: 'status warn', hidden: true, 'data-dat-local-note': '' });
    var showMsg = function (msg) {
      if (typeof ctx.feedback === 'function') ctx.feedback(msg);
      else { localNote.hidden = !msg; localNote.textContent = msg; }
      if (msg) ctx.announce(msg);
    };

    var statsOf = function (list) {
      var vals = list.map(function (r) { return Number(r.value); }).filter(isFinite).sort(function (a, b) { return a - b; });
      var n = vals.length;
      if (!n) return { count: 0, min: 0, max: 0, range: 0, median: 0, mean: 0 };
      var min = vals[0], max = vals[n - 1];
      var mid = Math.floor(n / 2);
      var med = n % 2 ? vals[mid] : Math.round(((vals[mid - 1] + vals[mid]) / 2) * 100) / 100;
      var sum = vals.reduce(function (a, v) { return a + v; }, 0);
      return { count: n, min: min, max: max, range: Math.round((max - min) * 100) / 100, median: med, mean: Math.round((sum / n) * 100) / 100 };
    };

    var paintExplorer = function () {
      var shown = rows.filter(function (r) { return activeGroup === 'ALL' || r.group === activeGroup; });
      var st = statsOf(shown);
      var allSt = statsOf(rows);
      var axisMin = Math.min(0, allSt.min);
      var axisMax = Math.max(1, allSt.max);
      var span = Math.max(1, axisMax - axisMin);
      var unitTxt = item.unit ? ' ' + item.unit : '';

      var fBtns = filterBar.querySelectorAll('button');
      for (var i = 0; i < fBtns.length; i++) {
        fBtns[i].setAttribute('aria-pressed', fBtns[i].getAttribute('data-dat-filter') === activeGroup ? 'true' : 'false');
      }
      var cBtns = chartBar.querySelectorAll('button');
      for (var j = 0; j < cBtns.length; j++) {
        cBtns[j].setAttribute('aria-pressed', cBtns[j].getAttribute('data-dat-chart') === chartKind ? 'true' : 'false');
      }

      chartStage.textContent = '';
      chartStage.appendChild(el('h3', { class: 'stem-h3', text: (item.datasetTitle || 'Dataset') + ' — ' + (activeGroup === 'ALL' ? (L.dat_all || 'All groups') : activeGroup) }));

      if (chartKind === 'bar') {
        var bars = el('div', { class: 'dat-bars', 'data-dat-bars': '' });
        shown.forEach(function (r) {
          var pct = Math.max(4, Math.min(100, Math.round(((Number(r.value) - axisMin) / span) * 100)));
          var fill = el('span', { class: 'dat-bar-fill' });
          fill.style.width = pct + '%';
          bars.appendChild(el('div', { class: 'dat-bar-row' }, [
            el('span', { class: 'dat-bar-lbl', text: (activeGroup === 'ALL' ? r.group + ' ' : '') + (r.label || '') }),
            el('span', { class: 'dat-bar-track', 'aria-hidden': 'true' }, [fill]),
            el('span', { class: 'dat-bar-val', text: String(r.value) + unitTxt }),
          ]));
        });
        chartStage.appendChild(bars);
      } else {
        var dotWrap = el('div', { class: 'dat-dot-plot', 'data-dat-dots': '' });
        var track = el('div', { class: 'dat-dot-track' });
        var toTrackPct = function (v) { return Math.round((3 + ((v - axisMin) / span) * 94) * 100) / 100; };
        var minPct = toTrackPct(st.min);
        var maxPct = toTrackPct(st.max);
        var medPct = toTrackPct(st.median);
        var rangeBand = el('span', { class: 'dat-range-band', 'aria-hidden': 'true' });
        rangeBand.style.left = minPct + '%';
        rangeBand.style.width = Math.max(2, maxPct - minPct) + '%';
        track.appendChild(rangeBand);
        var medMark = el('span', { class: 'dat-med-mark', 'aria-hidden': 'true' });
        medMark.style.left = medPct + '%';
        track.appendChild(medMark);
        shown.forEach(function (r, idx) {
          var pos = toTrackPct(Number(r.value));
          var dot = el('span', { class: 'dat-dot', title: (r.group + ' ' + (r.label || '') + ': ' + r.value + unitTxt).trim(), 'aria-hidden': 'true' });
          dot.style.left = pos + '%';
          dot.style.top = (12 + (idx % 3) * 14) + 'px';
          track.appendChild(dot);
        });
        dotWrap.appendChild(track);
        dotWrap.appendChild(el('div', { class: 'dat-axis' }, [
          el('span', { text: 'Scale: ' + axisMin + unitTxt }),
          el('span', { text: 'Median: ' + st.median + unitTxt }),
          el('span', { text: axisMax + unitTxt }),
        ]));
        chartStage.appendChild(dotWrap);
      }

      statsBox.textContent = '';
      [
        ['Count', String(st.count)],
        ['Min', String(st.min) + unitTxt],
        ['Max', String(st.max) + unitTxt],
        ['Range', String(st.range) + unitTxt],
        ['Median', String(st.median) + unitTxt],
        ['Mean', String(st.mean) + unitTxt],
      ].forEach(function (pair) {
        statsBox.appendChild(el('div', { class: 'dat-stat-cell' }, [
          el('dt', { text: pair[0] }),
          el('dd', { 'data-dat-stat': pair[0].toLowerCase(), text: pair[1] }),
        ]));
      });
    };

    ['ALL'].concat(groups).forEach(function (g) {
      filterBar.appendChild(el('button', {
        type: 'button',
        class: 'stem-btn-sm',
        'data-dat-filter': g,
        'aria-pressed': g === activeGroup ? 'true' : 'false',
        on: {
          click: function () {
            activeGroup = g;
            if (ctx.support) ctx.support('lab_data_filter');
            paintExplorer();
            ctx.announce('Filtered data to ' + (g === 'ALL' ? (L.dat_all || 'All groups') : g) + '.');
          },
        },
        text: g === 'ALL' ? (L.dat_all || 'All groups') : g,
      }));
    });

    [['bar', L.dat_bar || 'Bar chart'], ['dot', L.dat_dot || 'Dot / Range plot']].forEach(function (pair) {
      chartBar.appendChild(el('button', {
        type: 'button',
        class: 'stem-btn-sm',
        'data-dat-chart': pair[0],
        'aria-pressed': pair[0] === chartKind ? 'true' : 'false',
        on: {
          click: function () {
            chartKind = pair[0];
            if (ctx.support) ctx.support('lab_chart_switch');
            paintExplorer();
            ctx.announce('Switched chart to ' + pair[1] + '.');
          },
        },
        text: pair[1],
      }));
    });

    var promptEl = el('p', { class: 'stem-prompt', text: item.prompt || '' });
    var hintBox = item.hint && !isCheck ? el('p', { class: 'stem-hint', hidden: true, 'data-dat-hint': '', text: item.hint }) : null;
    var hintBtn = hintBox ? el('button', {
      type: 'button',
      class: 'stem-btn-sm',
      'data-dat-hint-btn': '',
      'aria-expanded': 'false',
      on: {
        click: function () {
          hintVisible = !hintVisible;
          hintBox.hidden = !hintVisible;
          hintBtn.setAttribute('aria-expanded', hintVisible ? 'true' : 'false');
          hintBtn.textContent = hintVisible ? (L.dat_hint_hide || 'Hide hint') : (L.dat_hint_show || 'Show hint');
          if (hintVisible && ctx.support) ctx.support('hint_shown');
        },
      },
      text: L.dat_hint_show || 'Show hint',
    }) : null;

    var qWrap = el('div', { class: 'stem-question' });
    var qKind = item.questionKind === 'mc' ? 'mc' : 'numeric';
    var numInput = null;
    var submitBtn = null;
    var mcButtons = [];

    if (qKind === 'mc') {
      var choices = Array.isArray(item.choices) ? item.choices : [];
      var triedMc = Object.create(null);
      var listEl = el('div', { class: 'stem-mc-list', role: 'group', 'aria-label': 'Answer choices' });
      choices.forEach(function (ch, ci) {
        var b = el('button', {
          type: 'button',
          class: 'stem-mc-btn',
          'data-dat-choice': String(ci),
          on: {
            click: function () {
              if (locked || (!isCheck && triedMc[ci])) return;
              showMsg('');
              if (isCheck) {
                var r = ctx.answer(ch);
                if (r === 'recorded' || r === 'correct' || r === 'missed') {
                  locked = true; mcButtons.forEach(function (x) { x.disabled = true; });
                }
                return;
              }
              var ok = String(ch).trim().toLowerCase() === String(item.answer || '').trim().toLowerCase();
              var out = ctx.answer(ch, ok, {
                correctText: L.dat_right || 'Correct interpretation.',
                retryText: L.dat_retry || 'Check the stats and try again.',
                missedText: fmt(L.dat_missed || 'Expected answer: {answer}.', { answer: item.answer || '' }),
              });
              if (out === 'correct' || out === 'missed') {
                locked = true;
                mcButtons.forEach(function (x, xi) {
                  x.disabled = true;
                  if (String(choices[xi]).trim().toLowerCase() === String(item.answer || '').trim().toLowerCase()) x.className = 'stem-mc-btn is-right';
                });
              } else {
                triedMc[ci] = true;
                b.className = 'stem-mc-btn is-tried';
                b.setAttribute('aria-disabled', 'true');
              }
            },
          },
          text: (ci + 1) + '. ' + ch,
        });
        mcButtons.push(b);
        listEl.appendChild(b);
      });
      qWrap.appendChild(listEl);
      if (typeof ctx.keys === 'function') {
        ctx.keys(function (k) {
          var n = Number(k);
          if (n >= 1 && n <= mcButtons.length && !mcButtons[n - 1].disabled) { mcButtons[n - 1].click(); return true; }
          return false;
        });
      }
    } else {
      var inpId = 'dat-ans-' + String(item.id || 'q').replace(/[^a-z0-9_-]+/gi, '_');
      numInput = el('input', {
        id: inpId,
        type: 'text',
        inputmode: 'decimal',
        class: 'stem-num-input',
        autocomplete: 'off',
        'data-dat-input': '',
        on: { keydown: function (ev) { if (ev.key === 'Enter' && submitBtn && !submitBtn.disabled) { ev.preventDefault(); submitBtn.click(); } } },
      });
      submitBtn = el('button', {
        type: 'button',
        class: 'primary',
        'data-dat-submit': '',
        on: {
          click: function () {
            if (locked) return;
            var raw = String(numInput.value || '').trim();
            if (!raw) { showMsg(L.dat_empty || 'Enter an answer first.'); numInput.focus(); return; }
            showMsg('');
            if (isCheck) {
              var r = ctx.answer(raw);
              if (r === 'recorded' || r === 'correct' || r === 'missed') {
                locked = true; submitBtn.disabled = true; numInput.readOnly = true;
              }
              return;
            }
            var g = Number(raw), w = Number(String(item.answer || '').trim());
            var tol = Number(item.tolerance) >= 0 ? Number(item.tolerance) : 0.1;
            var ok = isFinite(g) && isFinite(w) ? Math.abs(g - w) <= tol : raw.toLowerCase() === String(item.answer || '').trim().toLowerCase();
            var out = ctx.answer(raw, ok, {
              correctText: L.dat_right || 'Correct interpretation.',
              retryText: L.dat_retry || 'Check the stats and try again.',
              missedText: fmt(L.dat_missed || 'Expected answer: {answer}.', { answer: item.answer + (item.unit ? ' ' + item.unit : '') }),
            });
            if (out === 'correct' || out === 'missed') {
              locked = true; submitBtn.disabled = true; numInput.readOnly = true;
            }
          },
        },
        text: isCheck ? (L.dat_submit || 'Submit answer') : (L.dat_check || 'Check answer'),
      });
      qWrap.appendChild(el('div', { class: 'row stem-num-row' }, [
        el('label', { for: inpId, class: 'stem-num-label', text: 'Your answer' + (item.unit ? ' (' + item.unit + ')' : '') }),
        numInput,
        submitBtn,
      ]));
    }

    root.appendChild(promptEl);
    if (hintBtn) root.appendChild(el('div', { class: 'row stem-tools-row' }, [hintBtn]));
    if (hintBox) root.appendChild(hintBox);
    root.appendChild(filterBar);
    root.appendChild(chartBar);
    root.appendChild(chartStage);
    root.appendChild(statsRegion);
    root.appendChild(qWrap);
    root.appendChild(localNote);
    paintExplorer();

    return {
      reveal: function () {
        locked = true;
        if (submitBtn) submitBtn.disabled = true;
        if (numInput) numInput.readOnly = true;
        mcButtons.forEach(function (b) { b.disabled = true; });
      },
    };
  }

  function scoreStemData(item, answer, response) {
    var want = String(answer == null ? '' : answer).trim();
    var got = String(response == null ? '' : response).trim();
    if (!want || !got) return { correct: false, digitsCorrect: null, digitsPossible: null };
    if (item && item.questionKind !== 'mc') {
      var g = Number(got), w = Number(want);
      if (isFinite(g) && isFinite(w)) {
        var tol = Number(item.tolerance) >= 0 ? Number(item.tolerance) : 0.1;
        return { correct: Math.abs(g - w) <= tol, digitsCorrect: null, digitsPossible: null };
      }
    }
    return { correct: got.toLowerCase() === want.toLowerCase(), digitsCorrect: null, digitsPossible: null };
  }

  // ---------------------------------------------------------------------------
  // Self-Contained Adapter 3: stem_geometry_grid (ZERO outer closures!)
  // ---------------------------------------------------------------------------
  function renderStemGeometry(item, ctx) {
    var L = ctx.L || {};
    var el = ctx.el;
    var fmt = ctx.fmt;
    var root = ctx.root;
    var isCheck = !!ctx.check;
    var geoMode = item.geoMode === 'dims' ? 'dims' : item.geoMode === 'angle' ? 'angle' : 'tiles';
    var locked = false;
    var hintVisible = false;

    var stage = el('section', { class: 'geo-stage', 'aria-label': 'Interactive geometry workspace', 'data-geo-stage': '' });
    var readout = el('p', { class: 'stem-readout', role: 'status', 'aria-live': 'polite', 'data-geo-readout': '' });
    var localNote = el('p', { class: 'status warn', hidden: true, 'data-geo-local-note': '' });
    var showMsg = function (msg) {
      if (typeof ctx.feedback === 'function') ctx.feedback(msg);
      else { localNote.hidden = !msg; localNote.textContent = msg; }
      if (msg) ctx.announce(msg);
    };

    var promptEl = el('p', { class: 'stem-prompt', text: item.prompt || '' });
    var hintBox = item.hint && !isCheck ? el('p', { class: 'stem-hint', hidden: true, 'data-geo-hint': '', text: item.hint }) : null;
    var hintBtn = hintBox ? el('button', {
      type: 'button',
      class: 'stem-btn-sm',
      'data-geo-hint-btn': '',
      'aria-expanded': 'false',
      on: {
        click: function () {
          hintVisible = !hintVisible;
          hintBox.hidden = !hintVisible;
          hintBtn.setAttribute('aria-expanded', hintVisible ? 'true' : 'false');
          hintBtn.textContent = hintVisible ? (L.geo_hint_hide || 'Hide hint') : (L.geo_hint_show || 'Show hint');
          if (hintVisible && ctx.support) ctx.support('hint_shown');
        },
      },
      text: L.geo_hint_show || 'Show hint',
    }) : null;

    var controlsBar = el('div', { class: 'row stem-actions' });
    var submitBtn = null;
    var revealReadout = null;

    if (geoMode === 'tiles') {
      var rows = Math.max(3, Math.min(8, Number(item.rows) || 5));
      var cols = Math.max(3, Math.min(8, Number(item.cols) || 6));
      var shaded = Object.create(null);

      var measure = function () {
        var area = 0, perim = 0;
        var has = function (r, c) { return r >= 0 && c >= 0 && r < rows && c < cols && !!shaded[r + ',' + c]; };
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            if (!has(r, c)) continue;
            area++;
            if (!has(r - 1, c)) perim++;
            if (!has(r + 1, c)) perim++;
            if (!has(r, c - 1)) perim++;
            if (!has(r, c + 1)) perim++;
          }
        }
        return { area: area, perimeter: perim };
      };

      var gridEl = el('div', { class: 'geo-grid', role: 'group', 'aria-label': rows + ' by ' + cols + ' unit tile grid', 'data-geo-grid': '' });
      gridEl.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
      var tileBtns = Object.create(null);

      var syncReadout = function (showComputed) {
        var m = measure();
        if (showComputed && !isCheck) {
          readout.textContent = 'Shaded Area: ' + m.area + ' sq units | Perimeter: ' + m.perimeter + ' units';
        } else {
          readout.textContent = m.area > 0
            ? 'Grid updated. Count the shaded tiles and outer edges, then press ' + (isCheck ? (L.geo_submit || 'Submit work') : (L.geo_check || 'Check work')) + '.'
            : 'Grid empty. Select tiles on the ' + rows + ' by ' + cols + ' grid.';
        }
      };
      revealReadout = function () { syncReadout(true); };

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          (function (rr, cc) {
            var key = rr + ',' + cc;
            var btn = el('button', {
              type: 'button',
              class: 'geo-tile',
              'data-geo-tile': rr + '-' + cc,
              'aria-pressed': 'false',
              'aria-label': 'Row ' + (rr + 1) + ', Column ' + (cc + 1),
              on: {
                click: function () {
                  if (locked) return;
                  shaded[key] = !shaded[key];
                  btn.setAttribute('aria-pressed', shaded[key] ? 'true' : 'false');
                  btn.className = 'geo-tile' + (shaded[key] ? ' is-shaded' : '');
                  if (ctx.support) ctx.support('lab_tile_toggle');
                  syncReadout();
                },
                keydown: function (ev) {
                  var nr = rr, nc = cc;
                  if (ev.key === 'ArrowRight') nc = Math.min(cols - 1, cc + 1);
                  else if (ev.key === 'ArrowLeft') nc = Math.max(0, cc - 1);
                  else if (ev.key === 'ArrowDown') nr = Math.min(rows - 1, rr + 1);
                  else if (ev.key === 'ArrowUp') nr = Math.max(0, rr - 1);
                  else return;
                  ev.preventDefault();
                  var nextBtn = tileBtns[nr + ',' + nc];
                  if (nextBtn && typeof nextBtn.focus === 'function') nextBtn.focus();
                },
              },
              text: '',
            });
            tileBtns[key] = btn;
            gridEl.appendChild(btn);
          })(r, c);
        }
      }

      var clearBtn = el('button', {
        type: 'button',
        'data-geo-clear': '',
        on: {
          click: function () {
            if (locked) return;
            Object.keys(shaded).forEach(function (k) { shaded[k] = false; });
            Object.keys(tileBtns).forEach(function (k) {
              tileBtns[k].setAttribute('aria-pressed', 'false');
              tileBtns[k].className = 'geo-tile';
            });
            syncReadout();
            ctx.announce('Grid cleared.');
          },
        },
        text: L.geo_clear || 'Clear grid',
      });

      submitBtn = el('button', {
        type: 'button',
        class: 'primary',
        'data-geo-submit': '',
        on: {
          click: function () {
            if (locked) return;
            var m = measure();
            if (m.area <= 0) { showMsg(L.geo_empty_grid || 'Shade at least 1 tile first.'); return; }
            showMsg('');
            var resp = 'a=' + m.area + ';p=' + m.perimeter;
            if (isCheck) {
              var res = ctx.answer(resp);
              if (res === 'recorded' || res === 'correct' || res === 'missed') {
                locked = true; submitBtn.disabled = true; clearBtn.disabled = true;
                Object.keys(tileBtns).forEach(function (k) { tileBtns[k].disabled = true; });
              }
              return;
            }
            var ok = false;
            var wantTxt = '';
            if (item.targetType === 'area_and_perimeter') {
              ok = m.area === Number(item.targetArea) && m.perimeter === Number(item.targetPerimeter);
              wantTxt = 'Area ' + item.targetArea + ', Perimeter ' + item.targetPerimeter;
            } else if (item.targetType === 'perimeter') {
              ok = m.perimeter === Number(item.targetPerimeter);
              wantTxt = 'Perimeter ' + item.targetPerimeter;
            } else {
              ok = m.area === Number(item.targetArea);
              wantTxt = 'Area ' + item.targetArea;
            }
            var out = ctx.answer(resp, ok, {
              correctText: L.geo_right || 'That matches the target.',
              retryText: L.geo_retry || 'Count the tiles and outer edges, then adjust your grid.',
              missedText: fmt(L.geo_missed || 'Target: {answer}.', { answer: wantTxt }),
            });
            if (out === 'correct' || out === 'missed') {
              locked = true; submitBtn.disabled = true; clearBtn.disabled = true;
              Object.keys(tileBtns).forEach(function (k) { tileBtns[k].disabled = true; });
              syncReadout(true);
            }
          },
        },
        text: isCheck ? (L.geo_submit || 'Submit work') : (L.geo_check || 'Check work'),
      });

      stage.appendChild(gridEl);
      controlsBar.appendChild(submitBtn);
      controlsBar.appendChild(clearBtn);
      syncReadout();
    } else if (geoMode === 'dims') {
      var shape = item.shape === 'triangle' ? 'triangle' : 'rectangle';
      var maxDim = Math.max(4, Math.min(12, Number(item.maxDim) || 10));
      var base = Math.max(1, Math.min(maxDim, Number(item.startBase) || 4));
      var height = Math.max(1, Math.min(maxDim, Number(item.startHeight) || 4));
      var visualBox = el('div', { class: 'geo-dims-visual', 'data-geo-dims-visual': '' });
      var stepControls = el('div', { class: 'geo-steppers' });

      var currentArea = function () { return shape === 'triangle' ? (base * height) / 2 : base * height; };
      var currentPerim = function () { return shape === 'rectangle' ? 2 * (base + height) : Math.round((base + height + Math.sqrt(base * base + height * height)) * 10) / 10; };

      var paintDims = function (focusAttr, showComputed) {
        visualBox.textContent = '';
        var shapeEl = el('div', { class: 'geo-shape geo-shape-' + shape });
        shapeEl.style.width = (base * 22) + 'px';
        shapeEl.style.height = (height * 22) + 'px';
        visualBox.appendChild(shapeEl);
        visualBox.appendChild(el('p', { class: 'muted', text: (shape === 'triangle' ? 'Right Triangle' : 'Rectangle') + ': Base = ' + base + ', Height = ' + height }));

        stepControls.textContent = '';
        var addStepper = function (name, val, onMinus, onPlus, key) {
          var mBtn = el('button', { type: 'button', class: 'stem-btn-sm', 'data-geo-dec': key, disabled: locked || val <= 1, 'aria-label': 'Decrease ' + name, on: { click: onMinus }, text: '-' });
          var pBtn = el('button', { type: 'button', class: 'stem-btn-sm', 'data-geo-inc': key, disabled: locked || val >= maxDim, 'aria-label': 'Increase ' + name, on: { click: onPlus }, text: '+' });
          stepControls.appendChild(el('div', { class: 'geo-step-row' }, [
            el('span', { class: 'geo-step-name', text: name + ': ' + val }),
            mBtn,
            pBtn,
          ]));
        };
        addStepper('Base', base, function () { base = Math.max(1, base - 1); paintDims('dec:base'); }, function () { base = Math.min(maxDim, base + 1); paintDims('inc:base'); }, 'base');
        addStepper('Height', height, function () { height = Math.max(1, height - 1); paintDims('dec:height'); }, function () { height = Math.min(maxDim, height + 1); paintDims('inc:height'); }, 'height');

        if (showComputed && !isCheck) {
          var a = currentArea();
          readout.textContent = (shape === 'triangle' ? 'Right Triangle' : 'Rectangle')
            + ' | Base: ' + base + ' | Height: ' + height + ' | Area: ' + a + ' sq units'
            + (shape === 'rectangle' ? (' | Perimeter: ' + currentPerim() + ' units') : '');
        } else {
          readout.textContent = (shape === 'triangle' ? 'Right Triangle' : 'Rectangle')
            + ' | Base: ' + base + ' | Height: ' + height;
        }

        if (focusAttr) {
          var p = focusAttr.split(':');
          var primary = stepControls.querySelector('[data-geo-' + p[0] + '="' + p[1] + '"]');
          var alt = stepControls.querySelector('[data-geo-' + (p[0] === 'inc' ? 'dec' : 'inc') + '="' + p[1] + '"]');
          var tgt = primary && !primary.disabled ? primary : alt;
          if (tgt && !tgt.disabled && typeof tgt.focus === 'function') tgt.focus();
        }
      };
      revealReadout = function () { paintDims(null, true); };

      submitBtn = el('button', {
        type: 'button',
        class: 'primary',
        'data-geo-submit': '',
        on: {
          click: function () {
            if (locked) return;
            var a = currentArea(), p = currentPerim();
            var resp = 'a=' + a + ';p=' + p + ';b=' + base + ';h=' + height;
            if (isCheck) {
              var res = ctx.answer(resp);
              if (res === 'recorded' || res === 'correct' || res === 'missed') { locked = true; submitBtn.disabled = true; paintDims(); }
              return;
            }
            var ok = false;
            var wantTxt = '';
            if (item.targetType === 'area_and_perimeter') {
              ok = Math.abs(a - Number(item.targetArea)) <= 0.01 && Math.abs(p - Number(item.targetPerimeter)) <= 0.01;
              wantTxt = 'Area ' + item.targetArea + ', Perimeter ' + item.targetPerimeter;
            } else if (item.targetType === 'perimeter') {
              ok = Math.abs(p - Number(item.targetPerimeter)) <= 0.01;
              wantTxt = 'Perimeter ' + item.targetPerimeter;
            } else {
              ok = Math.abs(a - Number(item.targetArea)) <= 0.01;
              wantTxt = 'Area ' + item.targetArea;
            }
            var out = ctx.answer(resp, ok, {
              correctText: L.geo_right || 'That matches the target.',
              retryText: L.geo_retry || 'Adjust Base or Height and check again.',
              missedText: fmt(L.geo_missed || 'Target: {answer}.', { answer: wantTxt }),
            });
            if (out === 'correct' || out === 'missed') { locked = true; submitBtn.disabled = true; paintDims(null, true); }
          },
        },
        text: isCheck ? (L.geo_submit || 'Submit work') : (L.geo_check || 'Check work'),
      });

      stage.appendChild(visualBox);
      stage.appendChild(stepControls);
      controlsBar.appendChild(submitBtn);
      paintDims();
    } else {
      var isBuild = item.targetType === 'build_angle';
      var deg = Math.max(5, Math.min(175, Number(isBuild ? item.startDeg : item.angleDeg) || 45));
      var pickedClass = '';
      var stageBox = el('div', { class: 'geo-angle-stage', 'data-geo-angle-stage': '' });
      var ray = el('span', { class: 'geo-ray-top', 'aria-hidden': 'true' });
      var degLabel = el('span', { class: 'geo-deg-badge', 'data-geo-deg': '' });
      stageBox.appendChild(el('span', { class: 'geo-ray-base', 'aria-hidden': 'true' }));
      stageBox.appendChild(ray);
      stageBox.appendChild(el('span', { class: 'geo-vertex', 'aria-hidden': 'true' }));
      stageBox.appendChild(degLabel);

      var angleClassOf = function (d) { return d === 90 ? 'right' : d < 90 ? 'acute' : 'obtuse'; };
      var isEstimate = item.hideDeg === true || item.targetType === 'estimate_angle' || /\bestimat/i.test(String(item.prompt || ''));
      var decBtn = null, decFineBtn = null, incFineBtn = null, incBtn = null;
      var paintAngle = function (showRevealed) {
        ray.style.transform = 'rotate(-' + deg + 'deg)';
        if (isBuild) {
          var hideBuildDeg = isCheck && isEstimate;
          if (hideBuildDeg) {
            degLabel.hidden = true;
            degLabel.textContent = '';
            readout.textContent = 'Rotate the ray to match the target angle.';
          } else {
            degLabel.hidden = false;
            degLabel.textContent = deg + ' deg';
            readout.textContent = 'Current angle: ' + deg + ' degrees';
          }
        } else if (showRevealed && !isCheck) {
          degLabel.hidden = false;
          degLabel.textContent = deg + ' deg';
          readout.textContent = 'Shown angle: ' + deg + ' degrees (' + angleClassOf(deg) + ').';
        } else {
          degLabel.hidden = true;
          degLabel.textContent = '';
          readout.textContent = 'Observe the angle opening and choose acute, right, or obtuse.';
        }
        if (decBtn) decBtn.disabled = locked || deg <= 5;
        if (decFineBtn) decFineBtn.disabled = locked || deg <= 5;
        if (incFineBtn) incFineBtn.disabled = locked || deg >= 175;
        if (incBtn) incBtn.disabled = locked || deg >= 175;
      };
      revealReadout = function () { paintAngle(true); };

      stage.appendChild(stageBox);

      if (isBuild) {
        var stepAngle = function (delta, btn, fallbackBtn) {
          if (locked) return;
          deg = Math.max(5, Math.min(175, deg + delta));
          paintAngle();
          if (btn && btn.disabled && fallbackBtn && !fallbackBtn.disabled && typeof fallbackBtn.focus === 'function') fallbackBtn.focus();
        };
        decBtn = el('button', { type: 'button', class: 'stem-btn-sm', 'data-geo-angle-dec': '15', on: { click: function () { stepAngle(-15, decBtn, incFineBtn); } }, text: '-15 deg' });
        decFineBtn = el('button', { type: 'button', class: 'stem-btn-sm', 'data-geo-angle-dec-fine': '5', on: { click: function () { stepAngle(-5, decFineBtn, incFineBtn); } }, text: '-5 deg' });
        incFineBtn = el('button', { type: 'button', class: 'stem-btn-sm', 'data-geo-angle-inc-fine': '5', on: { click: function () { stepAngle(5, incFineBtn, decFineBtn); } }, text: '+5 deg' });
        incBtn = el('button', { type: 'button', class: 'stem-btn-sm', 'data-geo-angle-inc': '15', on: { click: function () { stepAngle(15, incBtn, decFineBtn); } }, text: '+15 deg' });
        stage.appendChild(el('div', { class: 'row stem-bar', role: 'group', 'aria-label': 'Angle steppers' }, [decBtn, decFineBtn, incFineBtn, incBtn]));
        submitBtn = el('button', {
          type: 'button',
          class: 'primary',
          'data-geo-submit': '',
          on: {
            click: function () {
              if (locked) return;
              var resp = 'deg=' + deg;
              if (isCheck) {
                var res = ctx.answer(resp);
                if (res === 'recorded' || res === 'correct' || res === 'missed') {
                  locked = true; submitBtn.disabled = true; paintAngle();
                }
                return;
              }
              var ok = deg === Number(item.targetDeg);
              var out = ctx.answer(resp, ok, {
                correctText: L.geo_right || 'Exact angle.',
                retryText: L.geo_retry || 'Rotate the ray and check again.',
                missedText: fmt(L.geo_missed || 'Target: {answer}.', { answer: item.targetDeg + ' degrees' }),
              });
              if (out === 'correct' || out === 'missed') {
                locked = true; submitBtn.disabled = true; paintAngle();
              }
            },
          },
          text: isCheck ? (L.geo_submit || 'Submit work') : (L.geo_check || 'Check work'),
        });
        controlsBar.appendChild(submitBtn);
      } else {
        var opts = [
          ['acute', 'Acute'],
          ['right', 'Right'],
          ['obtuse', 'Obtuse'],
        ];
        var clsBtns = [];
        var triedCls = Object.create(null);
        var pickWrap = el('div', { class: 'row stem-bar', role: 'group', 'aria-label': 'Angle classification' });
        opts.forEach(function (pair, pi) {
          var b = el('button', {
            type: 'button',
            class: 'stem-mc-btn',
            'data-geo-angle-pick': pair[0],
            on: {
              click: function () {
                if (locked || (!isCheck && triedCls[pair[0]])) return;
                pickedClass = pair[0];
                if (isCheck) {
                  var res = ctx.answer(pickedClass);
                  if (res === 'recorded' || res === 'correct' || res === 'missed') {
                    locked = true; clsBtns.forEach(function (x) { x.disabled = true; });
                  }
                  return;
                }
                var want = String(item.answer || angleClassOf(deg)).toLowerCase();
                var ok = pickedClass === want;
                var out = ctx.answer(pickedClass, ok, {
                  correctText: L.geo_right || 'Correct angle classification.',
                  retryText: L.geo_retry || 'Compare the angle to 90 degrees and try again.',
                  missedText: fmt(L.geo_missed || 'Target: {answer}.', { answer: want }),
                });
                if (out === 'correct' || out === 'missed') {
                  locked = true;
                  clsBtns.forEach(function (x) {
                    x.disabled = true;
                    if (x.getAttribute('data-geo-angle-pick') === want) x.className = 'stem-mc-btn is-right';
                  });
                  paintAngle(true);
                } else {
                  triedCls[pair[0]] = true;
                  b.className = 'stem-mc-btn is-tried';
                  b.setAttribute('aria-disabled', 'true');
                }
              },
            },
            text: (pi + 1) + '. ' + pair[1],
          });
          clsBtns.push(b);
          pickWrap.appendChild(b);
        });
        stage.appendChild(pickWrap);
        if (typeof ctx.keys === 'function') {
          ctx.keys(function (k) {
            var n = Number(k);
            if (n >= 1 && n <= clsBtns.length && !clsBtns[n - 1].disabled) { clsBtns[n - 1].click(); return true; }
            return false;
          });
        }
      }
      paintAngle();
    }

    root.appendChild(promptEl);
    if (hintBtn) root.appendChild(el('div', { class: 'row stem-tools-row' }, [hintBtn]));
    if (hintBox) root.appendChild(hintBox);
    root.appendChild(stage);
    root.appendChild(readout);
    if (controlsBar.childNodes.length) root.appendChild(controlsBar);
    root.appendChild(localNote);

    return {
      reveal: function () {
        locked = true;
        if (submitBtn) submitBtn.disabled = true;
        var allB = root.querySelectorAll('button');
        for (var i = 0; i < allB.length; i++) allB[i].disabled = true;
        if (typeof revealReadout === 'function') revealReadout();
      },
    };
  }

  function scoreStemGeometry(item, answer, response) {
    var want = String(answer == null ? '' : answer).trim().toLowerCase();
    var got = String(response == null ? '' : response).trim().toLowerCase();
    if (!want || !got) return { correct: false, digitsCorrect: null, digitsPossible: null };
    if (want.indexOf('area:') === 0) {
      var aM = /a=([0-9.]+)/.exec(got);
      var pM = /p=([0-9.]+)/.exec(got);
      var wA = /area:([0-9.]+)/.exec(want);
      var wP = /perim:([0-9.]+)/.exec(want);
      var okA = !wA || (aM && Math.abs(Number(aM[1]) - Number(wA[1])) <= 0.01);
      var okP = !wP || (pM && Math.abs(Number(pM[1]) - Number(wP[1])) <= 0.01);
      return { correct: !!(okA && okP), digitsCorrect: null, digitsPossible: null };
    }
    if (want.indexOf('perim:') === 0) {
      var pOnly = /p=([0-9.]+)/.exec(got);
      var wpOnly = /perim:([0-9.]+)/.exec(want);
      return { correct: !!(pOnly && wpOnly && Math.abs(Number(pOnly[1]) - Number(wpOnly[1])) <= 0.01), digitsCorrect: null, digitsPossible: null };
    }
    if (want.indexOf('deg=') === 0) {
      return { correct: got === want, digitsCorrect: null, digitsPossible: null };
    }
    return { correct: got === want, digitsCorrect: null, digitsPossible: null };
  }

  // ---------------------------------------------------------------------------
  // Check-Mode Prepare Hooks (zero plain-text answer leakage!)
  // ---------------------------------------------------------------------------
  function prepareStemCircuitCheck(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var ans = str(r.answer, 120);
    if (!ans) return { item: null, missing: ['answer'] };
    return {
      item: {
        id: str(r.id, 40) || 'cir-1',
        word: str(r.word || 'Circuit Item', 60),
        prompt: str(r.prompt, 240),
        topology: r.topology === 'parallel' ? 'parallel' : 'series',
        voltage: Math.max(1, Math.min(24, Number(r.voltage) || 6)),
        switches: clone(Array.isArray(r.switches) ? r.switches : []),
        bulbs: clone(Array.isArray(r.bulbs) ? r.bulbs : []),
        questionKind: r.questionKind === 'mc' ? 'mc' : 'numeric',
        unit: str(r.unit, 20),
        choices: Array.isArray(r.choices) ? r.choices.map(function (c) { return str(c, 120); }) : [],
        tolerance: Number(r.tolerance) >= 0 ? Number(r.tolerance) : 0.05,
        answer: ans,
      },
    };
  }

  function prepareStemDataCheck(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var ans = str(r.answer, 120);
    if (!ans) return { item: null, missing: ['answer'] };
    return {
      item: {
        id: str(r.id, 40) || 'dat-1',
        word: str(r.word || 'Data Item', 60),
        prompt: str(r.prompt, 240),
        datasetTitle: str(r.datasetTitle, 80),
        groupCol: str(r.groupCol, 36),
        valueCol: str(r.valueCol, 36),
        unit: str(r.unit, 20),
        rows: clone(Array.isArray(r.rows) ? r.rows : []),
        questionKind: r.questionKind === 'mc' ? 'mc' : 'numeric',
        choices: Array.isArray(r.choices) ? r.choices.map(function (c) { return str(c, 120); }) : [],
        tolerance: Number(r.tolerance) >= 0 ? Number(r.tolerance) : 0.1,
        answer: ans,
      },
    };
  }

  function prepareStemGeometryCheck(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var geoMode = r.geoMode === 'dims' ? 'dims' : r.geoMode === 'angle' ? 'angle' : 'tiles';
    var answer = '';
    if (geoMode === 'tiles' || geoMode === 'dims') {
      if (r.targetType === 'area_and_perimeter') answer = 'area:' + Number(r.targetArea) + ',perim:' + Number(r.targetPerimeter);
      else if (r.targetType === 'perimeter') answer = 'perim:' + Number(r.targetPerimeter);
      else answer = 'area:' + Number(r.targetArea);
    } else if (r.targetType === 'build_angle') {
      answer = 'deg=' + Number(r.targetDeg);
    } else {
      answer = str(r.answer || classifyAngleDeg(r.angleDeg), 20).toLowerCase();
    }
    if (!answer) return { item: null, missing: ['target'] };
    return {
      item: {
        id: str(r.id, 40) || 'geo-1',
        word: str(r.word || 'Geometry Item', 60),
        prompt: str(r.prompt, 240),
        geoMode: geoMode,
        rows: Number(r.rows) || 5,
        cols: Number(r.cols) || 6,
        shape: r.shape === 'triangle' ? 'triangle' : 'rectangle',
        startBase: Number(r.startBase) || 4,
        startHeight: Number(r.startHeight) || 4,
        maxDim: Number(r.maxDim) || 10,
        targetType: str(r.targetType, 30),
        angleDeg: Number(r.angleDeg) || 45,
        startDeg: Number(r.startDeg) || 30,
        answer: answer,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Student Extra CSS (inherits all student themes cleanly; zero external URLs)
  // ---------------------------------------------------------------------------
  var EXTRA_CSS = [
    '.stem-prompt{font-size:1.12rem;font-weight:700;margin:0 0 10px;line-height:1.35}',
    '.stem-h3{margin:0 0 8px;font-size:1rem;line-height:1.3}',
    '.stem-tools-row,.stem-bar{margin:8px 0;align-items:center}',
    '.stem-bar-lbl{font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin-inline-end:2px}',
    '.stem-actions{margin-top:14px}',
    '.stem-btn-sm{min-height:44px;min-width:44px;padding:6px 12px;font-size:.92rem;border-radius:10px}',
    '.stem-btn-sm[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700;outline:none}',
    '.stem-btn-sm:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.stem-hint{margin:6px 0 12px;padding:10px 14px;border-radius:12px;border:1px solid var(--accent);background:var(--soft)}',
    '.stem-readout{margin:10px 0;padding:10px 14px;border-radius:12px;border:1.5px solid var(--accent);background:var(--soft);font-weight:700;font-size:.95rem}',
    '.stem-question{margin-top:12px}',
    '.stem-num-row{align-items:center}',
    '.stem-num-label{font-weight:700}',
    '.stem-num-input{font:inherit;min-height:44px;width:9rem;padding:6px 10px;border-radius:10px;border:2px solid var(--line);background:var(--card);color:var(--ink)}',
    '.stem-num-input:focus-visible{border-color:var(--accent)}',
    '.stem-mc-list{display:flex;flex-direction:column;gap:8px}',
    '.stem-mc-btn{min-height:46px;padding:10px 14px;text-align:start;background:var(--card);border:2px solid var(--line);border-radius:12px;font-weight:600}',
    '.stem-mc-btn.is-right{border-color:var(--ok);background:var(--ok-bg);color:var(--ok)}',
    '.stem-mc-btn.is-tried{border-style:dashed;border-color:var(--warn);background:var(--warn-bg);color:var(--warn)}',
    // Circuit Lab
    '.cir-board{padding:14px;border-radius:14px;border:2px dashed var(--line);background:var(--bg);display:flex;flex-direction:column;gap:12px}',
    '.cir-board.is-closed{border-style:solid;border-color:var(--accent)}',
    '.cir-rail{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding-bottom:8px;border-bottom:2px solid var(--line)}',
    '.cir-battery{font-weight:700}',
    '.cir-loop-badge{padding:3px 10px;border-radius:999px;font-size:.84rem;font-weight:700;border:1px solid var(--line)}',
    '.cir-loop-badge.is-on{background:var(--ok-bg);color:var(--ok);border-color:var(--ok)}',
    '.cir-loop-badge.is-off{background:var(--warn-bg);color:var(--warn);border-color:var(--warn)}',
    '.cir-switches{display:flex;flex-wrap:wrap;gap:8px}',
    '.cir-sw{min-height:44px;padding:8px 14px;border-radius:10px;font-weight:700}',
    '.cir-sw.is-closed{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);outline:none}',
    '.cir-sw:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.cir-bulbs{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}',
    '.cir-bulb{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:12px;border:2px solid var(--line);background:var(--card)}',
    '.cir-bulb.is-lit,.cir-bulb.is-bright{border-color:var(--ok);background:var(--ok-bg)}',
    '.cir-bulb.is-dim{border-style:dashed;border-color:var(--accent);background:var(--soft)}',
    '.cir-lamp{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:2px solid currentColor;font-weight:700}',
    '.cir-bulb-state{font-size:.88rem;font-weight:700}',
    // Data Explorer
    '.dat-stage{padding:12px 14px;border-radius:14px;border:1.5px solid var(--line);background:var(--bg)}',
    '.dat-bars{display:flex;flex-direction:column;gap:8px}',
    '.dat-bar-row{display:grid;grid-template-columns:minmax(90px,140px) 1fr auto;gap:8px;align-items:center;font-size:.9rem}',
    '@media (max-width:520px){.dat-bar-row{grid-template-columns:1fr auto;gap:4px 8px}.dat-bar-val{grid-column:2;grid-row:1;justify-self:end}.dat-bar-track{grid-column:1 / -1;grid-row:2;height:18px}}',
    '.dat-bar-track{display:block;height:22px;border-radius:6px;background:var(--card);border:1px solid var(--line);overflow:hidden}',
    '.dat-bar-fill{display:block;height:100%;background:var(--accent)}',
    '.dat-bar-val{font-weight:700;font-variant-numeric:tabular-nums}',
    '.dat-dot-plot{padding:8px 0}',
    '.dat-dot-track{position:relative;height:66px;border-radius:10px;border:1px solid var(--line);background:var(--card);margin:6px 0}',
    '.dat-range-band{position:absolute;top:29px;height:8px;background:var(--soft);border:1px solid var(--accent);border-radius:999px}',
    '.dat-med-mark{position:absolute;top:6px;bottom:6px;width:3px;margin-left:-1.5px;background:var(--ok)}',
    '.dat-dot{position:absolute;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:var(--accent);border:2px solid var(--card)}',
    '.dat-axis{display:flex;justify-content:space-between;font-size:.85rem;color:var(--muted);font-weight:700}',
    '.dat-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(95px,1fr));gap:8px;margin:10px 0;padding:0}',
    '.dat-stat-cell{padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--card)}',
    '.dat-stat-cell dt{font-size:.78rem;color:var(--muted);font-weight:700;text-transform:uppercase}',
    '.dat-stat-cell dd{margin:2px 0 0;font-weight:700;font-size:1rem}',
    // Geometry Lab
    '.geo-stage{padding:16px;border-radius:14px;border:1.5px solid var(--line);background:var(--bg);display:flex;flex-direction:column;align-items:center}',
    '.geo-grid{display:grid;gap:5px;width:100%;max-width:360px;margin:0 auto}',
    '@media (max-width:420px){.geo-grid{gap:4px}}',
    '.geo-tile{aspect-ratio:1/1;min-height:40px;min-width:0;width:100%;padding:0;border-radius:6px;border:1.5px solid var(--line);background:var(--card)}',
    '.geo-tile.is-shaded{background:var(--accent);border-color:var(--accent);box-shadow:inset 0 0 0 3px var(--card)}',
    '.geo-dims-visual{margin:8px 0 12px;display:flex;flex-direction:column;align-items:center;gap:8px}',
    '.geo-shape{border:2px solid var(--accent);background-color:var(--soft);background-image:linear-gradient(to right,var(--line) 1px,transparent 1px),linear-gradient(to bottom,var(--line) 1px,transparent 1px);background-size:22px 22px;max-width:100%}',
    '.geo-shape-triangle{clip-path:polygon(0 100%,100% 100%,0 0);background-color:var(--accent);background-image:linear-gradient(to right,rgba(255,255,255,.28) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.28) 1px,transparent 1px);background-size:22px 22px}',
    '.geo-steppers{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}',
    '.geo-step-row{display:flex;align-items:center;gap:8px}',
    '.geo-step-name{font-weight:700;min-width:5.5rem}',
    '.geo-angle-stage{position:relative;width:100%;max-width:320px;height:176px;margin:8px 0 12px;border-radius:12px;border:1.5px solid var(--line);background:var(--card);overflow:hidden}',
    '.geo-angle-stage::before{content:"";position:absolute;left:50%;bottom:30px;width:168px;height:84px;margin-left:-84px;border:1.5px dashed var(--line);border-bottom:0;border-radius:168px 168px 0 0;pointer-events:none}',
    '.geo-ray-base{position:absolute;left:50%;bottom:30px;width:108px;height:4px;background:var(--ink);border-radius:2px}',
    '.geo-ray-top{position:absolute;left:50%;bottom:30px;width:108px;height:4px;background:var(--accent);border-radius:2px;transform-origin:0 50%}',
    '.geo-vertex{position:absolute;left:calc(50% - 7px);bottom:25px;width:14px;height:14px;border-radius:50%;background:var(--ink)}',
    '.geo-deg-badge{position:absolute;right:10px;top:10px;padding:3px 10px;border-radius:999px;background:var(--soft);border:1px solid var(--accent);font-weight:700;font-size:.9rem}',
    '@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}',
    '@media (forced-colors:active){.geo-tile.is-shaded,.dat-bar-fill,.cir-sw.is-closed,.stem-btn-sm[aria-pressed=true],[data-read-aloud-btn][aria-pressed=true]{forced-color-adjust:none;border:2px solid Highlight;background:Highlight;color:HighlightText}}',
    '@media print{.stem-tools-row,.stem-actions,[data-read-aloud-btn]{display:none!important}}',
  ].join('\n');

  function stemReadAloudWrapper(origRender, dirKey) {
    return function (item, ctx) {
      var handle = origRender(item, ctx) || {};
      var root = ctx && ctx.root;
      if (!root) return handle;
      var L = (ctx && ctx.L) || {};
      var doc = root.ownerDocument;
      var view = doc && doc.defaultView;
      var synth = view && view.speechSynthesis && typeof view.speechSynthesis.speak === 'function' ? view.speechSynthesis : null;
      var speaking = false;
      var gen = 0;
      var obs = null;
      var readBtn = null;

      var disconnectObs = function () {
        if (obs) { try { obs.disconnect(); } catch (_) {} obs = null; }
      };

      var setBtnState = function (active) {
        speaking = !!active;
        if (readBtn) {
          readBtn.setAttribute('aria-pressed', speaking ? 'true' : 'false');
          readBtn.textContent = speaking ? 'Stop reading' : 'Read aloud';
        }
        if (!speaking) disconnectObs();
      };

      var stopSpeech = function () {
        gen++;
        var was = speaking;
        setBtnState(false);
        if (synth && (was || synth.speaking || synth.pending)) {
          try { if (typeof synth.cancel === 'function') synth.cancel(); } catch (_) {}
        }
      };

      var readRate = function () {
        var attr = doc && doc.documentElement ? String(doc.documentElement.getAttribute('data-audio-speed') || '').trim().toLowerCase() : '';
        if (attr === 'slow') return 0.75;
        var n = Number(attr);
        if (attr && isFinite(n) && n >= 0.5 && n <= 2) return n;
        if (typeof ctx.speedRate === 'function') {
          var sr = Number(ctx.speedRate());
          if (isFinite(sr) && sr > 0 && sr !== 1) return sr;
        }
        if (typeof ctx.slow === 'function' && ctx.slow()) return 0.75;
        return 1.0;
      };

      var getVisiblePromptText = function () {
        var parts = [];
        var add = function (s) {
          var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
          if (t && parts.indexOf(t) < 0) parts.push(t);
        };
        add(item && item.prompt);
        add(dirKey && L[dirKey]);
        return parts.map(function (p) { return /[.!?]$/.test(p) ? p : p + '.'; }).join(' ');
      };

      var cleanup = function () {
        disconnectObs();
        if (doc) {
          doc.removeEventListener('keydown', onKeyDown);
          doc.removeEventListener('click', onDocClick, true);
        }
        if (view) {
          view.removeEventListener('pagehide', onUnload);
          view.removeEventListener('beforeunload', onUnload);
        }
      };

      var onKeyDown = function (ev) {
        if (!root.isConnected) { cleanup(); return; }
        var k = ev && ev.key;
        if ((k === 'Escape' || k === 'Esc') && speaking) stopSpeech();
      };

      var onDocClick = function (ev) {
        if (!root.isConnected) { cleanup(); return; }
        if (!speaking || !ev || !ev.target) return;
        var t = ev.target.closest ? ev.target.closest('button') : null;
        if (!t || t === readBtn) return;
        if (t.hasAttribute('data-stop-audio') || /stop audio/i.test(String(t.textContent || ''))) {
          stopSpeech();
        }
      };

      var onUnload = function () {
        stopSpeech();
        cleanup();
      };

      if (synth && doc) {
        doc.addEventListener('keydown', onKeyDown);
        doc.addEventListener('click', onDocClick, true);
      }
      if (synth && view) {
        view.addEventListener('pagehide', onUnload);
        view.addEventListener('beforeunload', onUnload);
      }

      var speakNow = function () {
        if (!synth) return;
        if (speaking) { stopSpeech(); return; }
        var text = getVisiblePromptText();
        if (!text) return;
        if (typeof ctx.support === 'function') ctx.support('readAloud');
        gen++;
        var mine = gen;
        try { if (typeof synth.cancel === 'function') synth.cancel(); } catch (_) {}
        var Utter = typeof view.SpeechSynthesisUtterance === 'function' ? view.SpeechSynthesisUtterance : null;
        var u = Utter ? new Utter(text) : { text: text, rate: 1.0, lang: 'en-US' };
        u.rate = readRate();
        var lang = (doc && doc.documentElement && doc.documentElement.lang) || 'en-US';
        u.lang = lang;
        try {
          if (typeof synth.getVoices === 'function') {
            var voices = synth.getVoices() || [];
            var want = String(lang).toLowerCase().split('-')[0];
            var local = voices.filter(function (v) {
              return v && v.localService === true && String(v.lang || '').toLowerCase().replace('_', '-').indexOf(want) === 0;
            })[0];
            if (local) { u.voice = local; u.lang = local.lang || lang; }
          }
        } catch (_) {}
        u.onend = function () { if (mine === gen) setBtnState(false); };
        u.onerror = function () { if (mine === gen) setBtnState(false); };
        setBtnState(true);
        if (view && typeof view.MutationObserver === 'function' && doc && doc.body) {
          disconnectObs();
          obs = new view.MutationObserver(function () {
            if (!root.isConnected) { stopSpeech(); cleanup(); }
          });
          try { obs.observe(doc.getElementById('app') || doc.body, { childList: true, subtree: true }); } catch (_) {}
        }
        try {
          synth.speak(u);
        } catch (_) {
          if (mine === gen) setBtnState(false);
        }
      };

      readBtn = ctx.el('button', {
        type: 'button',
        class: 'stem-btn-sm',
        'data-read-aloud-btn': '',
        'aria-pressed': 'false',
        hidden: !synth,
        on: { click: speakNow },
        text: 'Read aloud',
      });

      var toolsRow = root.querySelector('.stem-tools-row');
      if (toolsRow) {
        toolsRow.insertBefore(readBtn, toolsRow.firstChild);
      } else {
        var newRow = ctx.el('div', { class: 'row stem-tools-row' }, [readBtn]);
        var anchor = root.querySelector('.stem-prompt');
        if (anchor && anchor.parentNode === root) {
          root.insertBefore(newRow, anchor.nextSibling);
        } else {
          root.insertBefore(newRow, root.firstChild);
        }
      }

      var origReveal = handle && typeof handle.reveal === 'function' ? handle.reveal : null;
      return Object.assign({}, handle, {
        reveal: function () {
          stopSpeech();
          if (origReveal) return origReveal.apply(handle, arguments);
        },
      });
    };
  }

  function wrapStemRender(origRender, dirKey) {
    var wrapped = function (item, ctx) {
      return stemReadAloudWrapper(origRender, dirKey)(item, ctx);
    };
    var src = '(' + stemReadAloudWrapper.toString() + ')(' + origRender.toString() + ',' + JSON.stringify(dirKey) + ')';
    wrapped.toString = function () { return src; };
    return wrapped;
  }

  var ADAPTERS = {
    stem_circuit: {
      title: 'Circuit Lab',
      labels: CIRCUIT_LABELS,
      render: wrapStemRender(renderStemCircuit, 'stem_circuit_directions'),
      prepare: prepareStemCircuitCheck,
      score: scoreStemCircuit,
    },
    stem_data_explorer: {
      title: 'Data & Graph Explorer',
      labels: DATA_LABELS,
      render: wrapStemRender(renderStemDataExplorer, 'stem_data_explorer_directions'),
      prepare: prepareStemDataCheck,
      score: scoreStemData,
    },
    stem_geometry_grid: {
      title: 'Geometry Lab',
      labels: GEOMETRY_LABELS,
      render: wrapStemRender(renderStemGeometry, 'stem_geometry_grid_directions'),
      prepare: prepareStemGeometryCheck,
      score: scoreStemGeometry,
    },
  };

  // ---------------------------------------------------------------------------
  // Lesson / Packet Builder + Reopen Reader
  // ---------------------------------------------------------------------------
  function resolveLoader(explicit) {
    if (explicit && typeof explicit.buildHtml === 'function') return explicit;
    if (root.AlloWordSoundsTakeHome && typeof root.AlloWordSoundsTakeHome.buildHtml === 'function') {
      return root.AlloWordSoundsTakeHome;
    }
    throw new Error('AlloWordSoundsTakeHome loader is required.');
  }

  function starters() {
    return STARTER_LABS.map(clone);
  }

  function starterById(id) {
    for (var i = 0; i < STARTER_LABS.length; i++) {
      if (STARTER_LABS[i].id === id) return clone(STARTER_LABS[i]);
    }
    return null;
  }

  function hydrateDataItems(rawItems, datasetCsv, datasetTitle, unit) {
    var parsed = datasetCsv ? parseCsvDataset(datasetCsv) : null;
    return (Array.isArray(rawItems) ? rawItems : []).map(function (it, idx) {
      var copy = clone(it);
      copy.id = str(copy.id, 40) || ('dat-' + (idx + 1));
      if (parsed && parsed.rows.length) {
        copy.rows = clone(parsed.rows);
        copy.groupCol = parsed.groupCol;
        copy.valueCol = parsed.valueCol;
      }
      if (datasetTitle && !copy.datasetTitle) copy.datasetTitle = str(datasetTitle, 80);
      if (unit && !copy.unit) copy.unit = str(unit, 20);
      return copy;
    });
  }

  function lessonFromStemLab(input) {
    var cfg = input && typeof input === 'object' ? input : {};
    var activity = ACTIVITY_IDS.indexOf(cfg.activity) >= 0 ? cfg.activity : 'stem_circuit';
    var mode = cfg.mode === 'probe' || cfg.mode === 'check' ? 'probe' : 'practice';
    var items = Array.isArray(cfg.items) ? clone(cfg.items) : [];
    if (activity === 'stem_data_explorer') {
      items = hydrateDataItems(items, cfg.datasetCsv, cfg.datasetTitle || cfg.title, cfg.unit);
      if (items.some(function (it) { return !Array.isArray(it.rows) || !it.rows.length; })) {
        throw new Error('Data & Graph Explorer needs a valid CSV dataset with at least 1 numeric row.');
      }
    }
    if (!items.length) throw new Error('At least one STEM lab item is required.');

    var defaultTitles = {
      stem_circuit: 'Simple Circuit Lab',
      stem_data_explorer: 'Data & Graph Explorer',
      stem_geometry_grid: 'Geometry Lab',
    };
    var title = str(cfg.title || defaultTitles[activity], 80);
    var homeLanguages = Array.isArray(cfg.homeLanguages)
      ? cfg.homeLanguages.map(function (c) { return String(c || '').trim().toLowerCase(); }).filter(Boolean).slice(0, 6)
      : [];
    var bilingualGlossary = cfg.bilingualGlossary && typeof cfg.bilingualGlossary === 'object' && !Array.isArray(cfg.bilingualGlossary)
      ? clone(cfg.bilingualGlossary)
      : {};
    var hasGlossary = Object.keys(bilingualGlossary).length > 0;
    var adaptiveOn = mode === 'practice' && cfg.adaptiveScaffold === true;

    var basis = JSON.stringify({
      v: VERSION,
      activity: activity,
      mode: mode,
      title: title,
      items: items,
      homeLanguages: homeLanguages,
      bilingualGlossary: bilingualGlossary,
      stationMode: !!cfg.stationMode,
      adaptiveScaffold: adaptiveOn,
      form: mode === 'probe' ? str(cfg.form || 'Form A', 40) : '',
      timeLimitS: mode === 'probe' && Number(cfg.timeLimitS) > 0 ? Math.round(Number(cfg.timeLimitS)) : null,
    });
    var rev = 's' + fnv1a(basis);
    var lessonId = slug(title, 36) + '-' + activity.replace(/^stem_/, '') + '-' + rev.slice(0, 5);

    var lesson = {
      schema: 'alloflow-take-home-lesson/v2',
      player: 'alloflow-word-sounds-take-home/2',
      lessonId: lessonId,
      revision: rev,
      title: title,
      language: 'en',
      mode: mode,
      blocks: [{ activity: activity, items: items }],
      activityTitles: {},
      audio: {},
      images: {},
      feedback: { correct: [], retry: null },
    };
    lesson.activityTitles[activity] = ADAPTERS[activity].title;
    if (mode === 'probe') {
      lesson.form = str(cfg.form || 'Form A', 40);
      lesson.timeLimitS = Number(cfg.timeLimitS) > 0 ? Math.round(Number(cfg.timeLimitS)) : null;
      lesson.check = {
        measure: activity,
        scoreUnit: 'items_correct',
        allowSkip: true,
        scoringVersion: 1,
        formVersion: 1,
      };
    }
    if (adaptiveOn) {
      lesson.adaptiveScaffold = true;
      if (Array.isArray(cfg.stretchItems) && cfg.stretchItems.length) {
        lesson.stretchItems = clone(cfg.stretchItems);
      }
    }
    if (homeLanguages.length) lesson.homeLanguages = homeLanguages;
    if (hasGlossary) lesson.bilingualGlossary = bilingualGlossary;
    if (cfg.stationMode === true) lesson.stationMode = true;
    return lesson;
  }

  function buildStemLabPacket(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var loader = resolveLoader(opts.loader);
    var lesson = opts.lesson && Array.isArray(opts.lesson.blocks) ? clone(opts.lesson) : lessonFromStemLab(opts);
    var isProbe = lesson.mode === 'probe';

    var rawLangs = opts.homeLanguages != null ? opts.homeLanguages : lesson.homeLanguages;
    var hasLangs = Array.isArray(rawLangs) ? rawLangs.length > 0 : !!(typeof rawLangs === 'string' && rawLangs.trim());
    var rawGloss = opts.bilingualGlossary != null ? opts.bilingualGlossary : lesson.bilingualGlossary;
    var hasGloss = !!(rawGloss && typeof rawGloss === 'object' && Object.keys(rawGloss).length > 0);

    var buildOpts = {
      extraAdapters: isProbe ? undefined : ADAPTERS,
      adapters: isProbe ? ADAPTERS : undefined,
      core: isProbe ? { soundAnswerMatches: function () { return false; } } : undefined,
      extraCss: EXTRA_CSS,
      title: opts.title || lesson.title,
      labels: opts.labels,
      teacherCode: opts.teacherCode,
      qrPublicKey: opts.qrPublicKey,
      qrCrypto: opts.qrCrypto,
      stationMode: opts.stationMode === true || lesson.stationMode === true,
      adaptiveScaffold: !isProbe && (opts.adaptiveScaffold === true || lesson.adaptiveScaffold === true),
      homeLanguages: hasLangs ? rawLangs : undefined,
      bilingualGlossary: hasGloss ? rawGloss : undefined,
      stationBilingual: opts.stationBilingual || root.AlloPacketStationBilingual,
    };

    var baseHtml = withSpeechManifest(loader.buildHtml(lesson, buildOpts));
    var cleanLearner = codeName(opts.learner || '');
    var html = cleanLearner ? withCodeName(baseHtml, cleanLearner) : baseHtml;
    var plain = fileName(lesson.title, lesson.mode, '');
    var name = fileName(lesson.title, lesson.mode, cleanLearner);
    var bytes = typeof TextEncoder === 'function' ? new TextEncoder().encode(html).length : html.length;
    var activity = lesson.blocks[0] ? lesson.blocks[0].activity : 'stem_circuit';
    var itemCount = lesson.blocks.reduce(function (n, b) { return n + (Array.isArray(b.items) ? b.items.length : 0); }, 0);

    return {
      html: html,
      baseHtml: baseHtml,
      bytes: bytes,
      lesson: lesson,
      name: name,
      plain: plain,
      learner: cleanLearner,
      activity: activity,
      mode: isProbe ? 'probe' : 'practice',
      itemCount: itemCount,
      revision: lesson.revision,
    };
  }

  function readStemLabPacket(input, verifyCore) {
    var verify = verifyCore || root.AlloPacketVerify;
    var fail = function (kind, why, page) {
      return { ok: false, kind: kind, why: why, page: page || null, notes: [] };
    };
    if (!verify || typeof verify.readParts !== 'function') {
      return fail('other', 'This page could not load the file reader. Load the page again.');
    }
    var parts = verify.readParts(input);
    if (parts.refused === 'too_big') return fail('other', 'This file is larger than 60 MB.');
    if (parts.refused === 'empty') return fail('other', 'This file is empty.');
    if (parts.refused) return fail('other', 'This browser could not read the file.');
    if (parts.kind === 'results') {
      return fail('results', 'This is a results file, not a STEM lab file. Add up results reads it.', { href: 'packets-results.html', name: 'Add up results' });
    }
    if (!parts.ok || !parts.lesson) {
      return fail('other', 'This is not a STEM lab file made with this page. Choose the .html file you saved in step 3.');
    }
    var lesson = parts.lesson;
    var manifest = parts.manifest || {};
    var blocks = Array.isArray(lesson.blocks) ? lesson.blocks : [];
    if (!blocks.length || !blocks.every(function (b) { return b && ACTIVITY_IDS.indexOf(b.activity) >= 0; })) {
      return fail('other', 'This packet uses another activity type. Open it in the maker page that built it.', { href: 'packets.html', name: 'Packets home' });
    }
    var activity = blocks[0].activity;
    var mode = lesson.mode === 'probe' || (manifest.packet && manifest.packet.mode === 'check') ? 'probe' : 'practice';
    var notes = [];
    if (mode === 'probe') {
      notes.push('Check mode hides answers inside the file, so review each item answer before saving again.');
    }
    var teacherCode = !!(lesson.check && lesson.check.lock);
    if (teacherCode) {
      notes.push('A teacher code is not stored in plain text inside the file. Enter it again if needed.');
    }
    var homeLanguages = [];
    if (lesson.bilingual && Array.isArray(lesson.bilingual.codes)) {
      homeLanguages = lesson.bilingual.codes.map(function (c) { return String(c || '').toLowerCase(); }).filter(Boolean);
    } else if (Array.isArray(lesson.homeLanguages)) {
      homeLanguages = lesson.homeLanguages.slice();
    }
    var items = clone(blocks[0].items || []);
    var datasetCsv = '';
    if (activity === 'stem_data_explorer' && items[0] && Array.isArray(items[0].rows)) {
      datasetCsv = formatCsvDataset({
        groupCol: items[0].groupCol,
        labelCol: 'Trial',
        valueCol: items[0].valueCol,
        rows: items[0].rows,
      });
    }
    return {
      ok: true,
      kind: 'stem_lab',
      title: str(lesson.title || manifest.title, 80),
      activity: activity,
      mode: mode,
      form: str(lesson.form, 40) || 'Form A',
      timeLimitS: lesson.timeLimitS != null ? Number(lesson.timeLimitS) : null,
      items: items,
      datasetCsv: datasetCsv,
      adaptiveScaffold: !!lesson.adaptiveScaffold,
      homeLanguages: homeLanguages,
      bilingualGlossary: lesson.bilingual && lesson.bilingual.glossary && typeof lesson.bilingual.glossary === 'object' ? clone(lesson.bilingual.glossary) : {},
      stationMode: lesson.stationMode === true || manifest.stationMode === true,
      qrPublicKey: (lesson.qr && typeof lesson.qr.k === 'string') ? lesson.qr.k : '',
      learner: codeName(manifest.learner || ''),
      teacherCode: teacherCode,
      notes: notes,
    };
  }

  var api = {
    VERSION: VERSION,
    ACTIVITY_IDS: ACTIVITY_IDS,
    ADAPTERS: ADAPTERS,
    EXTRA_CSS: EXTRA_CSS,
    starters: starters,
    starterById: starterById,
    solveCircuit: solveCircuit,
    parseCsvDataset: parseCsvDataset,
    formatCsvDataset: formatCsvDataset,
    computeDatasetStats: computeDatasetStats,
    evaluateTileGrid: evaluateTileGrid,
    classifyAngleDeg: classifyAngleDeg,
    lessonFromStemLab: lessonFromStemLab,
    buildStemLabPacket: buildStemLabPacket,
    readStemLabPacket: readStemLabPacket,
    codeName: codeName,
    withCodeName: withCodeName,
    fileName: fileName,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AlloPacketStemLab = api;
})(typeof window !== 'undefined' ? window : globalThis);
