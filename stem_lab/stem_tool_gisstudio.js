// GIS Studio - accessible, Maine-first geographic information systems lab.
(function () {
  'use strict';

  window.StemLab = window.StemLab || {
    _registry: {}, _order: [],
    registerTool: function (id, config) {
      config.id = id; config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) < 0) this._order.push(id);
    },
    getRegisteredTools: function () {
      var self = this;
      return this._order.map(function (id) { return self._registry[id]; }).filter(Boolean);
    },
    isRegistered: function (id) { return !!this._registry[id]; },
    renderTool: function (id, ctx) {
      var tool = this._registry[id];
      return tool && tool.render ? tool.render(ctx) : null;
    }
  };

  var MAINE = [
    { name: 'Androscoggin', lat: 44.10, lon: -70.23, density: 230, access: 88, coastal: false },
    { name: 'Aroostook', lat: 46.68, lon: -68.02, density: 11, access: 72, coastal: false },
    { name: 'Cumberland', lat: 43.66, lon: -70.26, density: 350, access: 93, coastal: true },
    { name: 'Franklin', lat: 44.67, lon: -70.15, density: 18, access: 76, coastal: false },
    { name: 'Hancock', lat: 44.54, lon: -68.42, density: 35, access: 84, coastal: true },
    { name: 'Kennebec', lat: 44.31, lon: -69.78, density: 59, access: 86, coastal: false },
    { name: 'Knox', lat: 44.10, lon: -69.11, density: 117, access: 88, coastal: true },
    { name: 'Lincoln', lat: 44.00, lon: -69.67, density: 80, access: 86, coastal: true },
    { name: 'Oxford', lat: 44.26, lon: -70.50, density: 28, access: 78, coastal: false },
    { name: 'Penobscot', lat: 44.80, lon: -68.77, density: 46, access: 82, coastal: false },
    { name: 'Piscataquis', lat: 45.18, lon: -69.23, density: 4, access: 68, coastal: false },
    { name: 'Sagadahoc', lat: 43.91, lon: -69.82, density: 139, access: 90, coastal: true },
    { name: 'Somerset', lat: 44.77, lon: -69.72, density: 13, access: 73, coastal: false },
    { name: 'Waldo', lat: 44.43, lon: -69.01, density: 50, access: 83, coastal: true },
    { name: 'Washington', lat: 44.72, lon: -67.46, density: 13, access: 70, coastal: true },
    { name: 'York', lat: 43.48, lon: -70.72, density: 208, access: 91, coastal: true }
  ];

  var EXAMPLE = [
    'name,latitude,longitude,value',
    'School garden,43.66,-70.26,82',
    'River monitor,44.31,-69.78,64',
    'Forest plot,45.18,-69.23,38',
    'Coastal station,44.54,-68.42,91'
  ].join('\n');

  var EXAMPLE_GEOJSON = JSON.stringify({
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { name: 'Northern forest', index: 28 }, geometry: { type: 'Polygon', coordinates: [[[-70.0, 45.2], [-67.7, 45.2], [-67.7, 47.0], [-70.0, 47.0], [-70.0, 45.2]]] } },
      { type: 'Feature', properties: { name: 'Western mountains', index: 46 }, geometry: { type: 'Polygon', coordinates: [[[-71.2, 44.0], [-69.8, 44.0], [-69.8, 45.4], [-71.2, 45.4], [-71.2, 44.0]]] } },
      { type: 'Feature', properties: { name: 'Central corridor', index: 67 }, geometry: { type: 'Polygon', coordinates: [[[-69.9, 43.9], [-68.5, 43.9], [-68.5, 45.3], [-69.9, 45.3], [-69.9, 43.9]]] } },
      { type: 'Feature', properties: { name: 'Coastal belt', index: 88 }, geometry: { type: 'Polygon', coordinates: [[[-70.9, 43.0], [-67.0, 43.0], [-67.0, 44.15], [-70.9, 44.15], [-70.9, 43.0]]] } }
    ]
  }, null, 2);

  function parseCSV(text) {
    var rows = [], row = [], field = '', quoted = false, i;
    text = String(text || '');
    for (i = 0; i < text.length; i += 1) {
      var ch = text[i];
      if (ch === '"') {
        if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        row.push(field.trim()); field = '';
      } else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && text[i + 1] === '\n') i += 1;
        row.push(field.trim()); field = '';
        if (row.some(function (cell) { return cell; })) rows.push(row);
        row = [];
      } else field += ch;
    }
    row.push(field.trim());
    if (row.some(function (cell) { return cell; })) rows.push(row);
    if (rows.length < 2) throw new Error('Add a header and at least one data row.');
    var heads = rows[0].map(function (v) { return v.toLowerCase().replace(/\s+/g, ''); });
    function col(names) {
      var result = -1;
      names.some(function (name) { result = heads.indexOf(name); return result >= 0; });
      return result;
    }
    var n = col(['name', 'label', 'place', 'location']);
    var y = col(['latitude', 'lat']);
    var x = col(['longitude', 'lon', 'lng', 'long']);
    var v = col(['value', 'amount', 'score', 'count']);
    if (y < 0 || x < 0 || v < 0) throw new Error('Headers must include latitude, longitude, and value.');
    var parsed = rows.slice(1).map(function (cells, index) {
      return {
        name: n >= 0 && cells[n] ? cells[n] : 'Location ' + (index + 1),
        lat: Number(cells[y]), lon: Number(cells[x]), value: Number(cells[v]), coastal: false
      };
    }).filter(function (record) {
      return Number.isFinite(record.lat) && record.lat >= -90 && record.lat <= 90 &&
        Number.isFinite(record.lon) && record.lon >= -180 && record.lon <= 180 &&
        Number.isFinite(record.value);
    });
    if (!parsed.length) throw new Error('No valid rows were found. Check coordinates and values.');
    return parsed.slice(0, 250);
  }

  function parseGeoJSON(text) {
    var data;
    try { data = JSON.parse(String(text || '')); }
    catch (error) { throw new Error('GeoJSON is not valid JSON. Check commas, quotes, and brackets.'); }
    if (data.type === 'Feature') data = { type: 'FeatureCollection', features: [data] };
    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error('Use a GeoJSON FeatureCollection or Feature.');
    }
    var allowed = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'];
    data.features = data.features.filter(function (feature) {
      return feature && feature.type === 'Feature' && feature.geometry && allowed.indexOf(feature.geometry.type) >= 0;
    }).slice(0, 500);
    if (!data.features.length) throw new Error('No supported GeoJSON features were found.');
    var numeric = {};
    data.features.forEach(function (feature) {
      Object.keys(feature.properties || {}).forEach(function (key) {
        var raw = feature.properties[key];
        if (raw !== null && raw !== '' && Number.isFinite(Number(raw))) numeric[key] = true;
      });
    });
    var numericKeys = Object.keys(numeric).sort(function (a, b) {
      var aSystem = /^(objectid|fid|shape__)/i.test(a) ? 1 : 0;
      var bSystem = /^(objectid|fid|shape__)/i.test(b) ? 1 : 0;
      return aSystem - bSystem;
    });
    if (!numericKeys.length) throw new Error('Add at least one numeric property to create a thematic layer.');
    var nameKeys = ['name', 'Name', 'label', 'title', 'MNRCP_name', 'MNAP_name'];
    var nameKey = nameKeys.filter(function (key) {
      return data.features.some(function (feature) { return feature.properties && feature.properties[key] != null; });
    })[0] || null;
    return { data: data, numericKeys: numericKeys, nameKey: nameKey };
  }


  var EXAMPLE_JOIN_CSV = [
    'name,students,priority_score',
    'Northern forest,140,34',
    'Western mountains,265,57',
    'Central corridor,510,76',
    'Coastal belt,680,91',
    'Unmatched example,25,48'
  ].join('\n');

  var GIS_MISSIONS = [
    {
      id: 'coast-connectivity',
      title: 'Coast and Connectivity',
      duration: '25-35 minutes',
      question: 'How do the sample population-density and broadband-access patterns compare across coastal and inland Maine counties?',
      workspace: 'compare',
      evidencePrompt: 'Make one comparison claim. Cite at least one county from each map and name one limitation of the illustrative access index.',
      teacherNote: 'Good for separating spatial correlation from causal explanation. Students should question the scale, county-centroid representation, and the illustrative access values.',
      practices: ['C3 geographic reasoning', 'AP Human Geography spatial patterns', 'Evidence-based argument'],
      steps: [
        { id: 'setup', label: 'Prepare the synchronized density and access maps.' },
        { id: 'pattern', label: 'Identify one similarity and one difference between the patterns.' },
        { id: 'evidence', label: 'Record evidence from at least two named counties.' },
        { id: 'limits', label: 'Explain why the maps cannot prove what caused the pattern.' }
      ]
    },
    {
      id: 'service-area',
      title: 'Community Service Area',
      duration: '20-30 minutes',
      question: 'Which mapped county centroids fall within a hypothetical 75 km straight-line service radius?',
      workspace: 'map',
      evidencePrompt: 'State which mapped points are inside the buffer, then explain why a circular straight-line buffer is not the same as travel time or equitable access.',
      teacherNote: 'This mission introduces buffers as a model with assumptions. The points are county reference locations, not people, schools, or service demand.',
      practices: ['GIS proximity analysis', 'NGSS model limitations', 'Quantitative spatial reasoning'],
      steps: [
        { id: 'setup', label: 'Prepare a 75 km radius-buffer analysis.' },
        { id: 'place', label: 'Place the center and inspect the selected point rows.' },
        { id: 'evidence', label: 'Summarize the selected count and selected attribute values.' },
        { id: 'limits', label: 'Contrast straight-line proximity with real transportation access.' }
      ]
    },
    {
      id: 'ecoregion-boundaries',
      title: 'Ecological Region Boundaries',
      duration: '30-40 minutes',
      question: 'How do point patterns and results change when Maine is divided into broad practice regions?',
      workspace: 'map',
      evidencePrompt: 'Choose a practice polygon, report its approximate area or perimeter and the points inside it, then describe how a different boundary could change the result.',
      teacherNote: 'The included polygons are intentionally simplified practice geometry. Follow with the official Maine ecoregions layer when internet access and instructional time allow.',
      practices: ['C3 scale and region concepts', 'NGSS systems and models', 'Boundary and classification literacy'],
      steps: [
        { id: 'setup', label: 'Load the simplified practice-region GeoJSON.' },
        { id: 'measure', label: 'Measure one polygon and select mapped points inside it.' },
        { id: 'evidence', label: 'Use the feature table and point table as evidence.' },
        { id: 'limits', label: 'Explain how boundaries and classification choices shape conclusions.' }
      ]
    }
  ];

  function missionCompletion(mission, progress) {
    var steps = mission && Array.isArray(mission.steps) ? mission.steps : [];
    var state = progress || {};
    var complete = steps.filter(function (step) { return !!state[step.id]; }).length;
    return { complete: complete, total: steps.length, percent: steps.length ? Math.round(complete / steps.length * 100) : 0 };
  }

  var CLASS_COLORS = ['#155e75', '#0891b2', '#65a30d', '#d97706', '#ea580c', '#be123c', '#881337'];

  function parseTableCSV(text) {
    var rows = [], row = [], field = '', quoted = false, i;
    text = String(text || '');
    for (i = 0; i < text.length; i += 1) {
      var character = text[i];
      if (character === '"') {
        if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = !quoted;
      } else if (character === ',' && !quoted) {
        row.push(field.trim()); field = '';
      } else if ((character === '\n' || character === '\r') && !quoted) {
        if (character === '\r' && text[i + 1] === '\n') i += 1;
        row.push(field.trim()); field = '';
        if (row.some(function (cell) { return cell !== ''; })) rows.push(row);
        row = [];
      } else field += character;
    }
    row.push(field.trim());
    if (row.some(function (cell) { return cell !== ''; })) rows.push(row);
    if (rows.length < 2) throw new Error('The join CSV needs a header and at least one data row.');
    var headers = rows[0].map(function (header) { return header.trim(); });
    if (headers.some(function (header) { return !header; })) throw new Error('Every join CSV column needs a header.');
    var objects = rows.slice(1, 5001).map(function (cells) {
      var object = {};
      headers.forEach(function (header, index) { object[header] = cells[index] == null ? '' : cells[index]; });
      return object;
    });
    var numericKeys = headers.filter(function (header) {
      return objects.some(function (object) { return object[header] !== '' && Number.isFinite(Number(object[header])); });
    });
    return { headers: headers, rows: objects, numericKeys: numericKeys };
  }

  var EXAMPLE_TIME_CSV = [
    'name,latitude,longitude,year,value,unit,source',
    'Cumberland,43.66,-70.26,2015,78,index points,Illustrative classroom series',
    'Cumberland,43.66,-70.26,2020,86,index points,Illustrative classroom series',
    'Cumberland,43.66,-70.26,2025,93,index points,Illustrative classroom series',
    'Aroostook,46.68,-68.02,2015,55,index points,Illustrative classroom series',
    'Aroostook,46.68,-68.02,2020,64,index points,Illustrative classroom series',
    'Aroostook,46.68,-68.02,2025,72,index points,Illustrative classroom series',
    'York,43.48,-70.72,2015,76,index points,Illustrative classroom series',
    'York,43.48,-70.72,2020,84,index points,Illustrative classroom series',
    'York,43.48,-70.72,2025,91,index points,Illustrative classroom series',
    'Washington,44.72,-67.46,2015,52,index points,Illustrative classroom series',
    'Washington,44.72,-67.46,2020,61,index points,Illustrative classroom series',
    'Washington,44.72,-67.46,2025,70,index points,Illustrative classroom series',
    'Kennebec,44.31,-69.78,2015,71,index points,Illustrative classroom series',
    'Kennebec,44.31,-69.78,2020,79,index points,Illustrative classroom series',
    'Kennebec,44.31,-69.78,2025,86,index points,Illustrative classroom series',
    'Piscataquis,45.18,-69.23,2015,50,index points,Illustrative classroom series',
    'Piscataquis,45.18,-69.23,2020,58,index points,Illustrative classroom series',
    'Piscataquis,45.18,-69.23,2025,68,index points,Illustrative classroom series'
  ].join('\n');

  function parseTimeCSV(text) {
    var table = parseTableCSV(text);
    var headerLookup = {};
    table.headers.forEach(function (header) { headerLookup[header.toLowerCase().replace(/\s+/g, '')] = header; });
    function field(names, required) {
      var match = names.map(function (name) { return headerLookup[name]; }).filter(Boolean)[0] || '';
      if (!match && required) throw new Error('Time-series CSV headers must include name, latitude, longitude, year, and value.');
      return match;
    }
    var nameKey = field(['name', 'label', 'place', 'location'], true);
    var latKey = field(['latitude', 'lat'], true);
    var lonKey = field(['longitude', 'lon', 'lng', 'long'], true);
    var yearKey = field(['year', 'date', 'time'], true);
    var valueKey = field(['value', 'amount', 'score', 'count'], true);
    var unitKey = field(['unit', 'units'], false);
    var sourceKey = field(['source', 'datasource'], false);
    var methodKey = field(['method', 'methodology'], false);
    var rows = table.rows.slice(0, 3000).map(function (row) {
      return {
        name: String(row[nameKey] || '').trim(),
        lat: Number(row[latKey]), lon: Number(row[lonKey]), year: Number(row[yearKey]), value: Number(row[valueKey]),
        unit: unitKey ? String(row[unitKey] || '').trim() : '',
        source: sourceKey ? String(row[sourceKey] || '').trim() : '',
        method: methodKey ? String(row[methodKey] || '').trim() : ''
      };
    }).filter(function (row) {
      return row.name && Number.isFinite(row.lat) && row.lat >= -90 && row.lat <= 90 &&
        Number.isFinite(row.lon) && row.lon >= -180 && row.lon <= 180 &&
        Number.isFinite(row.year) && Number.isFinite(row.value);
    });
    if (!rows.length) throw new Error('No valid time-series rows were found.');
    var keyCount = {}, duplicates = [];
    rows.forEach(function (row) {
      var key = row.name.toLowerCase() + '|' + row.year;
      keyCount[key] = (keyCount[key] || 0) + 1;
      if (keyCount[key] === 2) duplicates.push(row.name + ' (' + row.year + ')');
    });
    var years = rows.map(function (row) { return row.year; }).filter(function (year, index, all) { return all.indexOf(year) === index; })
      .sort(function (a, b) { return a - b; });
    if (years.length < 2) throw new Error('Add at least two distinct years to analyze change.');
    return {
      rows: rows, years: years, duplicates: duplicates,
      units: rows.map(function (row) { return row.unit; }).filter(function (value, index, all) { return value && all.indexOf(value) === index; }),
      sources: rows.map(function (row) { return row.source; }).filter(function (value, index, all) { return value && all.indexOf(value) === index; })
    };
  }

  function timelineSnapshot(rows, year) {
    return (rows || []).filter(function (row) { return Number(row.year) === Number(year); });
  }

  function calculateTemporalChange(rows, startYear, endYear) {
    var start = {}, end = {}, order = [], warnings = [];
    (rows || []).forEach(function (row) {
      var key = String(row.name || '').trim().toLowerCase();
      if (!key) return;
      if (order.indexOf(key) < 0) order.push(key);
      if (Number(row.year) === Number(startYear)) start[key] = row;
      if (Number(row.year) === Number(endYear)) end[key] = row;
    });
    var changes = order.filter(function (key) { return start[key] || end[key]; }).map(function (key) {
      var first = start[key], last = end[key], complete = !!first && !!last;
      var change = complete ? last.value - first.value : null;
      var percent = complete && first.value !== 0 ? change / Math.abs(first.value) * 100 : null;
      var location = last || first;
      return {
        name: location.name, lat: location.lat, lon: location.lon,
        startValue: first ? first.value : null, endValue: last ? last.value : null,
        change: change, percent: percent,
        trend: !complete ? 'Missing comparison' : change > 0 ? 'Increase' : change < 0 ? 'Decrease' : 'No change',
        unit: (last && last.unit) || (first && first.unit) || ''
      };
    });
    var missing = changes.filter(function (row) { return row.change === null; }).length;
    if (missing) warnings.push(missing + ' location' + (missing === 1 ? ' is' : 's are') + ' missing from one comparison year.');
    var units = (rows || []).filter(function (row) {
      return Number(row.year) === Number(startYear) || Number(row.year) === Number(endYear);
    }).map(function (row) { return row.unit; }).filter(function (value, index, all) { return value && all.indexOf(value) === index; });
    if (units.length > 1) warnings.push('The comparison years contain different units: ' + units.join(', ') + '.');
    return { rows: changes, warnings: warnings };
  }

  var EXAMPLE_TIME_DATA = parseTimeCSV(EXAMPLE_TIME_CSV);

  function normalizeJoinKey(value) {
    return String(value == null ? '' : value).trim().toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function joinTableToGeoJSON(geoData, rows, geoKey, csvKey, valueKey) {
    if (!geoData || !Array.isArray(geoData.features)) throw new Error('Load a GeoJSON layer before joining data.');
    if (!geoKey || !csvKey || !valueKey) throw new Error('Choose both match fields and a numeric value field.');
    var lookup = Object.create(null), duplicates = [];
    rows.forEach(function (row) {
      var key = normalizeJoinKey(row[csvKey]);
      if (!key) return;
      if (lookup[key]) duplicates.push(String(row[csvKey]));
      else lookup[key] = row;
    });
    var used = Object.create(null), unmatchedGeo = [], matched = 0;
    var metric = 'joined_' + String(valueKey).replace(/[^a-z0-9_]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
    if (!metric || metric === 'joined_') metric = 'joined_value';
    var features = geoData.features.map(function (feature, index) {
      var properties = Object.assign({}, feature.properties || {});
      var rawGeoKey = properties[geoKey];
      var key = normalizeJoinKey(rawGeoKey);
      var row = key && lookup[key];
      if (row && Number.isFinite(Number(row[valueKey]))) {
        properties[metric] = Number(row[valueKey]);
        used[key] = true;
        matched += 1;
      } else {
        properties[metric] = null;
        unmatchedGeo.push(String(rawGeoKey == null ? 'Feature ' + (index + 1) : rawGeoKey));
      }
      return Object.assign({}, feature, { properties: properties });
    });
    var unmatchedCSV = Object.keys(lookup).filter(function (key) { return !used[key]; })
      .map(function (key) { return String(lookup[key][csvKey]); });
    return {
      data: { type: 'FeatureCollection', features: features },
      metric: metric,
      matched: matched,
      unmatchedCSV: unmatchedCSV,
      unmatchedGeo: unmatchedGeo,
      duplicates: duplicates
    };
  }

  function jenksThresholds(values, classCount) {
    var data = values.slice().filter(Number.isFinite).sort(function (a, b) { return a - b; });
    if (data.length < 2) return [];
    var classes = Math.max(2, Math.min(classCount, data.length));
    var lower = [], variance = [], i, j;
    for (i = 0; i <= data.length; i += 1) {
      lower[i] = new Array(classes + 1).fill(0);
      variance[i] = new Array(classes + 1).fill(Infinity);
    }
    for (i = 1; i <= classes; i += 1) {
      lower[1][i] = 1;
      variance[1][i] = 0;
    }
    for (var length = 2; length <= data.length; length += 1) {
      var sum = 0, sumSquares = 0, weight = 0, currentVariance = 0;
      for (var offset = 1; offset <= length; offset += 1) {
        var lowerLimit = length - offset + 1;
        var value = data[lowerLimit - 1];
        weight += 1;
        sum += value;
        sumSquares += value * value;
        currentVariance = sumSquares - (sum * sum) / weight;
        var previous = lowerLimit - 1;
        if (previous !== 0) {
          for (j = 2; j <= classes; j += 1) {
            if (variance[length][j] >= currentVariance + variance[previous][j - 1]) {
              lower[length][j] = lowerLimit;
              variance[length][j] = currentVariance + variance[previous][j - 1];
            }
          }
        }
      }
      lower[length][1] = 1;
      variance[length][1] = currentVariance;
    }
    var boundaries = new Array(classes + 1);
    boundaries[0] = data[0];
    boundaries[classes] = data[data.length - 1];
    var k = data.length;
    for (var count = classes; count > 1; count -= 1) {
      var boundaryIndex = Math.max(0, Math.floor(lower[k][count]) - 2);
      boundaries[count - 1] = data[boundaryIndex];
      k = Math.max(1, Math.floor(lower[k][count]) - 1);
    }
    return boundaries.slice(1, -1).filter(function (value, index, all) {
      return Number.isFinite(value) && (index === 0 || value > all[index - 1]);
    });
  }

  function calculateBreaks(values, method, classCount, customText) {
    var sorted = values.slice().filter(Number.isFinite).sort(function (a, b) { return a - b; });
    if (sorted.length < 2) return [];
    var classes = Math.max(3, Math.min(7, Number(classCount) || 5));
    if (method === 'custom') {
      var custom = String(customText || '').split(',').map(Number).filter(Number.isFinite)
        .sort(function (a, b) { return a - b; })
        .filter(function (value, index, all) { return index === 0 || value > all[index - 1]; });
      if (custom.length) return custom.slice(0, 6);
    }
    if (method === 'jenks') return jenksThresholds(sorted, classes);
    var thresholds = [];
    if (method === 'quantile') {
      for (var q = 1; q < classes; q += 1) thresholds.push(sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length / classes) - 1)]);
    } else {
      var min = sorted[0], max = sorted[sorted.length - 1];
      for (var e = 1; e < classes; e += 1) thresholds.push(min + (max - min) * e / classes);
    }
    return thresholds.filter(function (value, index, all) { return index === 0 || value > all[index - 1]; });
  }

  function toFiniteNumber(value) {
    return value === null || value === '' || value === undefined ? NaN : Number(value);
  }

  function paletteForClasses(classTotal) {
    var total = Math.max(3, Math.min(7, Number(classTotal) || 5));
    var palette = [];
    for (var index = 0; index < total; index += 1) {
      palette.push(CLASS_COLORS[Math.round(index * (CLASS_COLORS.length - 1) / Math.max(1, total - 1))]);
    }
    return palette;
  }

  function classColor(value, thresholds) {
    var numeric = toFiniteNumber(value);
    if (!Number.isFinite(numeric)) return '#475569';
    var index = 0;
    while (index < thresholds.length && numeric > thresholds[index]) index += 1;
    var palette = paletteForClasses(thresholds.length + 1);
    return palette[Math.min(index, palette.length - 1)];
  }

  var EARTH_RADIUS_KM = 6371.0088;

  function mapPoint(point) {
    if (Array.isArray(point)) return { lat: Number(point[1]), lon: Number(point[0]) };
    return { lat: Number(point && point.lat), lon: Number(point && (point.lon != null ? point.lon : point.lng)) };
  }

  function haversineKm(first, second) {
    var a = mapPoint(first), b = mapPoint(second);
    if (![a.lat, a.lon, b.lat, b.lon].every(Number.isFinite)) return NaN;
    var radians = Math.PI / 180;
    var dLat = (b.lat - a.lat) * radians;
    var dLon = (b.lon - a.lon) * radians;
    var sinLat = Math.sin(dLat / 2), sinLon = Math.sin(dLon / 2);
    var value = sinLat * sinLat + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * sinLon * sinLon;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)));
  }

  function pathLengthKm(points) {
    return (points || []).slice(1).reduce(function (sum, point, index) {
      var distance = haversineKm(points[index], point);
      return sum + (Number.isFinite(distance) ? distance : 0);
    }, 0);
  }

  function ringAreaSquareKm(ring) {
    if (!Array.isArray(ring) || ring.length < 3) return 0;
    var total = 0, radians = Math.PI / 180;
    for (var index = 0; index < ring.length; index += 1) {
      var current = mapPoint(ring[index]);
      var next = mapPoint(ring[(index + 1) % ring.length]);
      var dLon = (next.lon - current.lon) * radians;
      if (dLon > Math.PI) dLon -= Math.PI * 2;
      if (dLon < -Math.PI) dLon += Math.PI * 2;
      total += dLon * (2 + Math.sin(current.lat * radians) + Math.sin(next.lat * radians));
    }
    return Math.abs(total * EARTH_RADIUS_KM * EARTH_RADIUS_KM / 2);
  }

  function polygonAreaSquareKm(coordinates) {
    if (!Array.isArray(coordinates) || !coordinates.length) return 0;
    return Math.max(0, ringAreaSquareKm(coordinates[0]) - coordinates.slice(1).reduce(function (sum, ring) {
      return sum + ringAreaSquareKm(ring);
    }, 0));
  }

  function pointInRing(point, ring) {
    var p = mapPoint(point), inside = false;
    if (!Array.isArray(ring) || ring.length < 3 || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      var a = mapPoint(ring[i]), b = mapPoint(ring[j]);
      var crosses = ((a.lat > p.lat) !== (b.lat > p.lat)) &&
        (p.lon < (b.lon - a.lon) * (p.lat - a.lat) / ((b.lat - a.lat) || Number.EPSILON) + a.lon);
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function pointInFeature(point, feature) {
    var geometry = feature && feature.geometry;
    if (!geometry) return false;
    function inPolygon(polygon) {
      return polygon.length > 0 && pointInRing(point, polygon[0]) &&
        !polygon.slice(1).some(function (hole) { return pointInRing(point, hole); });
    }
    if (geometry.type === 'Polygon') return inPolygon(geometry.coordinates || []);
    if (geometry.type === 'MultiPolygon') return (geometry.coordinates || []).some(inPolygon);
    return false;
  }

  function selectPointsInFeature(records, feature) {
    var selected = [];
    (records || []).forEach(function (record, index) {
      if (pointInFeature(record, feature)) selected.push(index);
    });
    return selected;
  }

  function selectWithinRadius(records, center, radiusKm) {
    var selected = [], radius = Math.max(0, Number(radiusKm) || 0);
    (records || []).forEach(function (record, index) {
      if (haversineKm(center, record) <= radius) selected.push(index);
    });
    return selected;
  }

  function nearestRecord(records, point) {
    var best = null;
    (records || []).forEach(function (record, index) {
      var distanceKm = haversineKm(point, record);
      if (Number.isFinite(distanceKm) && (!best || distanceKm < best.distanceKm)) {
        best = { index: index, record: record, distanceKm: distanceKm };
      }
    });
    return best;
  }

  function featureMeasurements(feature) {
    var geometry = feature && feature.geometry;
    var result = { areaSquareKm: 0, perimeterKm: 0, lengthKm: 0 };
    if (!geometry) return result;
    if (geometry.type === 'LineString') result.lengthKm = pathLengthKm(geometry.coordinates || []);
    if (geometry.type === 'MultiLineString') {
      result.lengthKm = (geometry.coordinates || []).reduce(function (sum, line) { return sum + pathLengthKm(line); }, 0);
    }
    if (geometry.type === 'Polygon') {
      result.areaSquareKm = polygonAreaSquareKm(geometry.coordinates || []);
      result.perimeterKm = (geometry.coordinates || []).reduce(function (sum, ring) { return sum + pathLengthKm(ring); }, 0);
    }
    if (geometry.type === 'MultiPolygon') {
      (geometry.coordinates || []).forEach(function (polygon) {
        result.areaSquareKm += polygonAreaSquareKm(polygon);
        result.perimeterKm += polygon.reduce(function (sum, ring) { return sum + pathLengthKm(ring); }, 0);
      });
    }
    return result;
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  var GIS_PROJECT_FORMAT = 'alloflow-gis-studio-project';
  var GIS_PROJECT_VERSION = 1;
  var GIS_DRAFT_KEY = 'alloflow_gis_studio_draft_v1';

  function normalizeProvenance(value) {
    value = value || {};
    return {
      datasetTitle: String(value.datasetTitle || '').slice(0, 200),
      source: String(value.source || '').slice(0, 500),
      collected: String(value.collected || '').slice(0, 100),
      units: String(value.units || '').slice(0, 100),
      method: String(value.method || '').slice(0, 1000),
      license: String(value.license || '').slice(0, 300),
      limitations: String(value.limitations || '').slice(0, 1500)
    };
  }

  function createGISProject(payload, savedAt) {
    payload = payload || {};
    return {
      format: GIS_PROJECT_FORMAT,
      version: GIS_PROJECT_VERSION,
      savedAt: String(savedAt || new Date().toISOString()),
      title: String(payload.title || 'Untitled GIS project').slice(0, 200),
      provenance: normalizeProvenance(payload.provenance),
      settings: payload.settings || {},
      data: payload.data || {},
      work: payload.work || {}
    };
  }

  function validateGISProject(project) {
    if (!project || typeof project !== 'object' || Array.isArray(project)) throw new Error('Project file must contain a JSON object.');
    if (project.format !== GIS_PROJECT_FORMAT) throw new Error('This is not a GIS Studio project file.');
    if (Number(project.version) !== GIS_PROJECT_VERSION) {
      throw new Error(Number(project.version) > GIS_PROJECT_VERSION ? 'This project was created by a newer GIS Studio version.' : 'This project version is not supported.');
    }
    var data = project.data && typeof project.data === 'object' ? project.data : {};
    var points = Array.isArray(data.importedRows) ? data.importedRows : [];
    if (points.length > 250) throw new Error('Project contains more than 250 coordinate records.');
    points.forEach(function (row) {
      if (!row || !Number.isFinite(Number(row.lat)) || Number(row.lat) < -90 || Number(row.lat) > 90 ||
        !Number.isFinite(Number(row.lon)) || Number(row.lon) < -180 || Number(row.lon) > 180 || !Number.isFinite(Number(row.value))) {
        throw new Error('Project contains an invalid coordinate record.');
      }
    });
    if (data.geoData) {
      var parsedGeo = parseGeoJSON(JSON.stringify(data.geoData));
      if (parsedGeo.data.features.length > 500) throw new Error('Project contains too many GeoJSON features.');
    }
    var timeRows = data.timeDataset && Array.isArray(data.timeDataset.rows) ? data.timeDataset.rows : [];
    if (timeRows.length > 3000) throw new Error('Project contains more than 3,000 time-series records.');
    timeRows.forEach(function (row) {
      if (!row || !String(row.name || '').trim() || ![row.lat, row.lon, row.year, row.value].every(function (value) { return Number.isFinite(Number(value)); }) ||
        Number(row.lat) < -90 || Number(row.lat) > 90 || Number(row.lon) < -180 || Number(row.lon) > 180) {
        throw new Error('Project contains an invalid time-series record.');
      }
    });
    if (timeRows.length) {
      var years = timeRows.map(function (row) { return Number(row.year); }).filter(function (year, index, all) { return all.indexOf(year) === index; });
      if (years.length < 2) throw new Error('Saved time-series data need at least two years.');
    }
    return project;
  }

  function coordinatePrecision(value) {
    if (!Number.isFinite(Number(value))) return 0;
    var text = String(Math.abs(Number(value))).toLowerCase();
    if (text.indexOf('e-') >= 0) {
      var parts = text.split('e-');
      var exponent = Number(parts[1]) || 0;
      var fraction = (parts[0].split('.')[1] || '').length;
      return exponent + fraction;
    }
    return (text.split('.')[1] || '').length;
  }

  function assessCoordinatePrivacy(pointRows, timeRows) {
    var combined = (pointRows || []).map(function (row) { return { name: row.name, lat: row.lat, lon: row.lon, dataset: 'coordinate' }; })
      .concat((timeRows || []).map(function (row) { return { name: row.name, lat: row.lat, lon: row.lon, dataset: 'timeline' }; }));
    var precise = combined.filter(function (row) { return Math.max(coordinatePrecision(row.lat), coordinatePrecision(row.lon)) >= 4; });
    var identifierPattern = /(^|\b)(student|home|house|address|resident|child)(\b|$)|@/i;
    var identifiers = combined.filter(function (row) { return identifierPattern.test(String(row.name || '')); });
    return {
      total: combined.length,
      highPrecision: precise.length,
      identifierWarnings: identifiers.length,
      highPrecisionNames: precise.slice(0, 12).map(function (row) { return String(row.name || 'Unnamed point'); }),
      identifierNames: identifiers.slice(0, 12).map(function (row) { return String(row.name || 'Unnamed point'); })
    };
  }

  function roundPointCoordinates(rows, digits) {
    var places = Math.max(0, Math.min(5, Number(digits) || 0));
    var factor = Math.pow(10, places);
    return (rows || []).map(function (row) {
      return Object.assign({}, row, {
        lat: Math.round(Number(row.lat) * factor) / factor,
        lon: Math.round(Number(row.lon) * factor) / factor
      });
    });
  }

  function buildEvidenceReport(model) {
    model = model || {};
    var left = model.left || { label: 'Left map', rows: [] };
    var right = model.right || { label: 'Right map', rows: [] };
    var selected = Array.isArray(model.selected) ? model.selected : [];
    function number(value, digits) {
      if (value === null || value === undefined || value === '') return '\u2014';
      return Number.isFinite(Number(value)) ? Number(value).toFixed(digits == null ? 2 : digits) : '\u2014';
    }
    function seriesSummary(series) {
      var values = (series.rows || []).map(function (row) { return Number(row.value); }).filter(Number.isFinite);
      if (!values.length) return 'No numeric values';
      var mean = values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
      return values.length + ' records; range ' + Math.min.apply(Math, values) + ' to ' + Math.max.apply(Math, values) + '; mean ' + mean.toFixed(1);
    }
    function table(series, side) {
      var rows = (series.rows || []).map(function (row) {
        return '<tr><th scope="row">' + escapeHTML(row.name) + '</th><td>' + escapeHTML(row.geometry || 'Point') +
          '</td><td>' + number(row.lat, 4) + '</td><td>' + number(row.lon, 4) + '</td><td>' +
          escapeHTML(row.value == null ? 'No data' : row.value) + '</td></tr>';
      }).join('');
      return '<section><h2>' + escapeHTML(series.label || side + ' map') + '</h2><p><strong>Basemap:</strong> ' +
        escapeHTML(series.basemap || 'Not specified') + '. <strong>Legend:</strong> low values use teal; high values use rose. ' +
        escapeHTML(seriesSummary(series)) + '.</p><div class="table-wrap"><table><caption>' + escapeHTML(side) +
        ' comparison data</caption><thead><tr><th scope="col">Location or feature</th><th scope="col">Geometry</th>' +
        '<th scope="col">Latitude</th><th scope="col">Longitude</th><th scope="col">Value</th></tr></thead><tbody>' +
        rows + '</tbody></table></div></section>';
    }
    var points = (left.rows || []).filter(function (row) {
      return Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lon));
    });
    var coordinatePlot = '';
    if (points.length) {
      var lats = points.map(function (row) { return Number(row.lat); });
      var lons = points.map(function (row) { return Number(row.lon); });
      var minLat = Math.min.apply(Math, lats), maxLat = Math.max.apply(Math, lats);
      var minLon = Math.min.apply(Math, lons), maxLon = Math.max.apply(Math, lons);
      var dots = points.map(function (row, index) {
        var x = maxLon === minLon ? 50 : 5 + (Number(row.lon) - minLon) / (maxLon - minLon) * 90;
        var y = maxLat === minLat ? 50 : 95 - (Number(row.lat) - minLat) / (maxLat - minLat) * 90;
        return '<span class="plot-point" style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) +
          '%" aria-hidden="true">' + (index + 1) + '</span>';
      }).join('');
      coordinatePlot = '<section><h2>Coordinate plot</h2><p>This schematic preserves relative latitude and longitude but is not a basemap or projected navigation map.</p>' +
        '<div class="plot" role="img" aria-label="' + escapeHTML(points.length + ' locations plotted by longitude and latitude. Exact coordinates are listed in the tables.') + '">' +
        dots + '<span class="north" aria-hidden="true">N ↑</span></div><ol class="plot-key">' +
        points.map(function (row, index) { return '<li>' + (index + 1) + '. ' + escapeHTML(row.name) + '</li>'; }).join('') +
        '</ol></section>';
    }
    var selectedTable = selected.length ? '<section><h2>Spatial-analysis selection</h2><table><caption>Selected mapped points</caption>' +
      '<thead><tr><th scope="col">Location</th><th scope="col">Latitude</th><th scope="col">Longitude</th><th scope="col">Value</th></tr></thead><tbody>' +
      selected.map(function (row) {
        return '<tr><th scope="row">' + escapeHTML(row.name) + '</th><td>' + number(row.lat, 4) + '</td><td>' +
          number(row.lon, 4) + '</td><td>' + escapeHTML(row.value == null ? 'No data' : row.value) + '</td></tr>';
      }).join('') + '</tbody></table></section>' : '';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + escapeHTML(model.title || 'GIS Studio Evidence Report') + '</title><style>' +
      'body{font:16px/1.5 system-ui,sans-serif;color:#172033;background:#fff;margin:0}main{max-width:980px;margin:auto;padding:32px}' +
      'header{border-bottom:5px solid #0f766e;padding-bottom:18px}h1{margin:.2rem 0}h2{color:#0f5f5a;margin-top:2rem}' +
      '.meta,.note{color:#405366}.callout{background:#ecfeff;border-left:5px solid #0891b2;padding:14px;margin:18px 0}' +
      'table{border-collapse:collapse;width:100%;font-size:.9rem}caption{text-align:left;font-weight:700;padding:.4rem 0}' +
      'th,td{border:1px solid #9aa8b5;padding:7px;text-align:left}.table-wrap{overflow-x:auto}' +
      '.plot{height:330px;position:relative;border:2px solid #334155;background:linear-gradient(#eef9f8 1px,transparent 1px),linear-gradient(90deg,#eef9f8 1px,transparent 1px);background-size:10% 10%}' +
      '.plot-point{position:absolute;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:50%;background:#be123c;color:white;text-align:center;line-height:28px;font-weight:800}' +
      '.north{position:absolute;right:12px;top:8px;font-weight:800}.plot-key{columns:2}.actions{margin:20px 0}.actions button{padding:10px 14px}' +
      '@media(max-width:650px){main{padding:18px}.plot-key{columns:1}}@media print{.actions{display:none}main{padding:0}.plot{break-inside:avoid}section{break-inside:avoid-page}}' +
      '</style></head><body><main><header><p>GIS STUDIO</p><h1>' + escapeHTML(model.title || 'Geographic Evidence Report') +
      '</h1><p class="meta">Generated ' + escapeHTML(model.generated || '') + '</p></header>' +
      '<div class="actions"><button type="button" onclick="window.print()">Print or save as PDF</button></div>' +
      '<section class="callout"><h2>Claim and observation</h2><p>' + escapeHTML(model.observation || 'Add an evidence-based observation in GIS Studio.') +
      '</p><p><strong>Analysis note:</strong> ' + escapeHTML(model.analysis || 'Spatial patterns describe relationships; they do not establish cause and effect.') + '</p></section>' +
      coordinatePlot + table(left, 'Left') + table(right, 'Right') + selectedTable +
      '<section><h2>Sources and limitations</h2><p>' + escapeHTML(model.sources || 'Verify learning data with authoritative sources before making decisions.') +
      '</p><p>Basemap appearance can influence interpretation. Classification, scale, missing values, coordinate quality, and boundary definitions can change the visible pattern.</p></section>' +
      '</main></body></html>';
  }

  function getLeaflet() {
    if (window.L && window.L.map) return Promise.resolve(window.L);
    if (window._geoLibsLoaded && typeof window._geoLibsLoaded.then === 'function') {
      return window._geoLibsLoaded.then(function () { return window.L && window.L.map ? window.L : null; });
    }
    if (window.__alloGISLeaflet) return window.__alloGISLeaflet;
    window.__alloGISLeaflet = new Promise(function (resolve) {
      if (!document.querySelector('link[data-gis-leaflet]')) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-gis-leaflet', 'true');
        document.head.appendChild(link);
      }
      var script = document.querySelector('script[data-gis-leaflet]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.setAttribute('data-gis-leaflet', 'true');
        document.head.appendChild(script);
      }
      function done() { resolve(window.L && window.L.map ? window.L : null); }
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', done, { once: true });
      window.setTimeout(done, 6500);
    });
    window._geoLibsLoaded = window.__alloGISLeaflet;
    return window.__alloGISLeaflet;
  }

  function valueOf(record, metric, imported) {
    return imported ? record.value : record[metric];
  }

  function color(value, min, max) {
    var p = max === min ? 0.5 : (value - min) / (max - min);
    return p < 0.2 ? '#0e7490' : p < 0.4 ? '#0891b2' : p < 0.6 ? '#65a30d' : p < 0.8 ? '#d97706' : '#be123c';
  }

  function describe(records, metric, imported) {
    if (!records.length) return 'No mapped records are available.';
    var sorted = records.slice().sort(function (a, b) { return valueOf(b, metric, imported) - valueOf(a, metric, imported); });
    var mean = records.reduce(function (sum, record) { return sum + valueOf(record, metric, imported); }, 0) / records.length;
    var result = sorted[0].name + ' is highest (' + valueOf(sorted[0], metric, imported) + '); ' +
      sorted[sorted.length - 1].name + ' is lowest (' + valueOf(sorted[sorted.length - 1], metric, imported) +
      '). The mean is ' + mean.toFixed(1) + '.';
    if (!imported) {
      var coast = records.filter(function (record) { return record.coastal; });
      var inland = records.filter(function (record) { return !record.coastal; });
      var ca = coast.reduce(function (sum, record) { return sum + valueOf(record, metric, false); }, 0) / coast.length;
      var ia = inland.reduce(function (sum, record) { return sum + valueOf(record, metric, false); }, 0) / inland.length;
      result += ' Coastal average: ' + ca.toFixed(1) + '; inland average: ' + ia.toFixed(1) +
        '. This pattern suggests a question; it does not establish causation.';
    }
    return result;
  }

  window.StemLab.registerTool('gisStudio', {
    icon: '\uD83D\uDDFA\uFE0F',
    label: 'GIS Studio',
    desc: 'Build, compare, animate, save, reopen, and privacy-review accessible GIS projects and evidence reports.',
    color: 'teal',
    category: 'geo',
    aliases: ['GIS', 'mapping', 'spatial data', 'GIS project file', 'autosave', 'data provenance', 'coordinate privacy', 'time series map', 'change over time', 'Maine inquiry', 'guided mission', 'spatial analysis', 'map comparison', 'evidence report', 'buffer', 'choropleth', 'coordinates', 'map projections'],
    testing: {
      parseCSV: parseCSV, parseGeoJSON: parseGeoJSON, parseTableCSV: parseTableCSV,
      joinTableToGeoJSON: joinTableToGeoJSON, calculateBreaks: calculateBreaks,
      haversineKm: haversineKm, pathLengthKm: pathLengthKm, polygonAreaSquareKm: polygonAreaSquareKm,
      pointInFeature: pointInFeature, selectPointsInFeature: selectPointsInFeature,
      selectWithinRadius: selectWithinRadius, nearestRecord: nearestRecord, featureMeasurements: featureMeasurements,
      buildEvidenceReport: buildEvidenceReport, missionCompletion: missionCompletion, missions: GIS_MISSIONS,
      parseTimeCSV: parseTimeCSV, timelineSnapshot: timelineSnapshot, calculateTemporalChange: calculateTemporalChange,
      createGISProject: createGISProject, validateGISProject: validateGISProject,
      assessCoordinatePrivacy: assessCoordinatePrivacy, roundPointCoordinates: roundPointCoordinates
    },
    questHooks: [
      { id: 'import_data', label: 'Map your own coordinate data', icon: '\uD83D\uDCE5', check: function (d) { return !!d.gisImported; }, progress: function (d) { return d.gisImported ? 'Mapped' : 'Not yet'; } },
      { id: 'polygon_layer', label: 'Build a GeoJSON choropleth', icon: '\uD83C\uDFA8', check: function (d) { return !!d.gisGeoJSONImported; }, progress: function (d) { return d.gisGeoJSONImported ? 'Mapped' : 'Not yet'; } },
      { id: 'join_layer', label: 'Join a CSV to map boundaries', icon: '\uD83D\uDD17', check: function (d) { return !!d.gisJoinApplied; }, progress: function (d) { return d.gisJoinApplied ? 'Joined' : 'Not yet'; } },
      { id: 'spatial_analysis', label: 'Run a spatial analysis', icon: '\uD83D\uDCCF', check: function (d) { return !!d.gisSpatialAnalysis; }, progress: function (d) { return d.gisSpatialAnalysis ? 'Analyzed' : 'Not yet'; } },
      { id: 'compare_export', label: 'Compare maps and export evidence', icon: '\uD83D\uDCCA', check: function (d) { return !!d.gisEvidenceExported; }, progress: function (d) { return d.gisEvidenceExported ? 'Exported' : d.gisCompared ? 'Compared' : 'Not yet'; } },
      { id: 'maine_mission', label: 'Complete a Maine GIS mission', icon: '\uD83E\uDDED', check: function (d) { return !!d.gisMissionCompleted; }, progress: function (d) { return d.gisMissionCompleted ? 'Completed' : d.gisMissionStarted ? 'In progress' : 'Not yet'; } },
      { id: 'time_change', label: 'Analyze change over time', icon: '\u23F3', check: function (d) { return !!d.gisTimelineAnalyzed; }, progress: function (d) { return d.gisTimelineExported ? 'Exported' : d.gisTimelineAnalyzed ? 'Analyzed' : 'Not yet'; } },
      { id: 'project_portability', label: 'Save a privacy-reviewed GIS project', icon: '\uD83D\uDCBE', check: function (d) { return !!d.gisProjectSaved; }, progress: function (d) { return d.gisProjectSaved ? 'Saved' : d.gisProjectLoaded ? 'Opened' : 'Not yet'; } },
      { id: 'projection_lab', label: 'Compare map projections', icon: '\uD83C\uDF10', check: function (d) { return !!d.gisProjectionCompared; }, progress: function (d) { return d.gisProjectionCompared ? 'Compared' : 'Not yet'; } }
    ],
    render: function (ctx) {
      var React = ctx.React, h = React.createElement;
      var setToolData = ctx.setToolData || function () {};
      var announce = ctx.announceToSR || function () {};
      var callGemini = ctx.callGemini;

      function Studio() {
        var initial = ctx.toolData || {};
        var s1 = React.useState(initial.gisTab || 'map'), tab = s1[0], setTab = s1[1];
        var s2 = React.useState(initial.gisMetric || 'density'), metric = s2[0], setMetric = s2[1];
        var s3 = React.useState('sample'), source = s3[0], setSource = s3[1];
        var s4 = React.useState([]), importedRows = s4[0], setImportedRows = s4[1];
        var s5 = React.useState(EXAMPLE), csv = s5[0], setCSV = s5[1];
        var s6 = React.useState(''), error = s6[0], setError = s6[1];
        var s7 = React.useState({ points: true, coast: true, grid: false, polygons: true }), layers = s7[0], setLayers = s7[1];
        var s8 = React.useState(''), aiText = s8[0], setAIText = s8[1];
        var s9 = React.useState(false), aiBusy = s9[0], setAIBusy = s9[1];
        var s10 = React.useState('mercator'), projection = s10[0], setProjection = s10[1];
        var s11 = React.useState(60), latitude = s11[0], setLatitude = s11[1];
        var s12 = React.useState('Loading the interactive map. The table is ready now.'), mapStatus = s12[0], setMapStatus = s12[1];
        var s13 = React.useState(initial.gisBasemap || 'street'), basemap = s13[0], setBasemap = s13[1];
        var s14 = React.useState(EXAMPLE_GEOJSON), geoText = s14[0], setGeoText = s14[1];
        var s15 = React.useState(null), geoData = s15[0], setGeoData = s15[1];
        var s16 = React.useState([]), geoKeys = s16[0], setGeoKeys = s16[1];
        var s17 = React.useState(''), geoMetric = s17[0], setGeoMetric = s17[1];
        var s18 = React.useState(null), geoNameKey = s18[0], setGeoNameKey = s18[1];
        var s19 = React.useState(''), geoError = s19[0], setGeoError = s19[1];
        var s20 = React.useState(''), imageryNote = s20[0], setImageryNote = s20[1];
        var s21 = React.useState(false), officialBusy = s21[0], setOfficialBusy = s21[1];
        var s22 = React.useState(EXAMPLE_JOIN_CSV), joinText = s22[0], setJoinText = s22[1];
        var s23 = React.useState(null), joinTable = s23[0], setJoinTable = s23[1];
        var s24 = React.useState(''), joinCSVKey = s24[0], setJoinCSVKey = s24[1];
        var s25 = React.useState(''), joinGeoKey = s25[0], setJoinGeoKey = s25[1];
        var s26 = React.useState(''), joinValueKey = s26[0], setJoinValueKey = s26[1];
        var s27 = React.useState(''), joinError = s27[0], setJoinError = s27[1];
        var s28 = React.useState(null), joinPreview = s28[0], setJoinPreview = s28[1];
        var s29 = React.useState(initial.gisClassification || 'quantile'), classification = s29[0], setClassification = s29[1];
        var s30 = React.useState(5), classCount = s30[0], setClassCount = s30[1];
        var s31 = React.useState('25, 50, 75'), customBreaks = s31[0], setCustomBreaks = s31[1];
        var s32 = React.useState('distance'), analysisMode = s32[0], setAnalysisMode = s32[1];
        var s33 = React.useState([]), analysisPoints = s33[0], setAnalysisPoints = s33[1];
        var s34 = React.useState(25), bufferRadiusKm = s34[0], setBufferRadiusKm = s34[1];
        var s35 = React.useState(initial.gisAnalysisUnit || 'metric'), analysisUnit = s35[0], setAnalysisUnit = s35[1];
        var s36 = React.useState(0), selectedFeatureIndex = s36[0], setSelectedFeatureIndex = s36[1];
        var s37 = React.useState([]), analysisSelection = s37[0], setAnalysisSelection = s37[1];
        var s38 = React.useState('none'), analysisSelectionSource = s38[0], setAnalysisSelectionSource = s38[1];
        var s39 = React.useState(initial.gisCompareLeft || 'point:density'), compareLeft = s39[0], setCompareLeft = s39[1];
        var s40 = React.useState(initial.gisCompareRight || 'point:access'), compareRight = s40[0], setCompareRight = s40[1];
        var s41 = React.useState(initial.gisCompareLeftBasemap || 'street'), compareLeftBasemap = s41[0], setCompareLeftBasemap = s41[1];
        var s42 = React.useState(initial.gisCompareRightBasemap || 'satellite'), compareRightBasemap = s42[0], setCompareRightBasemap = s42[1];
        var s43 = React.useState('Loading synchronized comparison maps. The comparison tables are ready now.'), compareStatus = s43[0], setCompareStatus = s43[1];
        var s44 = React.useState(''), comparisonObservation = s44[0], setComparisonObservation = s44[1];
        var s45 = React.useState(initial.gisActiveMission || GIS_MISSIONS[0].id), activeMissionId = s45[0], setActiveMissionId = s45[1];
        var s46 = React.useState(initial.gisMissionProgress || {}), missionProgress = s46[0], setMissionProgress = s46[1];
        var s47 = React.useState(initial.gisMissionResponses || {}), missionResponses = s47[0], setMissionResponses = s47[1];
        var s48 = React.useState(EXAMPLE_TIME_CSV), timeText = s48[0], setTimeText = s48[1];
        var s49 = React.useState(EXAMPLE_TIME_DATA), timeDataset = s49[0], setTimeDataset = s49[1];
        var s50 = React.useState(EXAMPLE_TIME_DATA.years[0]), timeBaseline = s50[0], setTimeBaseline = s50[1];
        var s51 = React.useState(EXAMPLE_TIME_DATA.years[EXAMPLE_TIME_DATA.years.length - 1]), timeFocusYear = s51[0], setTimeFocusYear = s51[1];
        var s52 = React.useState(false), timePlaying = s52[0], setTimePlaying = s52[1];
        var s53 = React.useState(''), timeError = s53[0], setTimeError = s53[1];
        var s54 = React.useState(''), timeObservation = s54[0], setTimeObservation = s54[1];
        var s55 = React.useState('Loading before-and-after maps. The change table is ready now.'), timeStatus = s55[0], setTimeStatus = s55[1];
        var s56 = React.useState('Untitled GIS project'), projectTitle = s56[0], setProjectTitle = s56[1];
        var s57 = React.useState(normalizeProvenance({ source: 'Classroom learning data', limitations: 'Verify illustrative data with authoritative sources before making decisions.' })), provenance = s57[0], setProvenance = s57[1];
        var s58 = React.useState(3), privacyDigits = s58[0], setPrivacyDigits = s58[1];
        var s59 = React.useState('Autosave is preparing.'), autosaveStatus = s59[0], setAutosaveStatus = s59[1];
        var s60 = React.useState(null), recoveryDraft = s60[0], setRecoveryDraft = s60[1];
        var s61 = React.useState(''), projectError = s61[0], setProjectError = s61[1];
        var s62 = React.useState(false), autosaveReady = s62[0], setAutosaveReady = s62[1];
        var mapNode = React.useRef(null);
        var mapViewState = React.useRef(null);
        var compareLeftNode = React.useRef(null);
        var compareRightNode = React.useRef(null);
        var compareViewState = React.useRef(null);
        var timeLeftNode = React.useRef(null);
        var timeRightNode = React.useRef(null);
        var timeViewState = React.useRef(null);

        var imported = source === 'import';
        var records = imported ? importedRows : MAINE;
        var values = records.map(function (record) { return valueOf(record, metric, imported); });
        var min = values.length ? Math.min.apply(Math, values) : 0;
        var max = values.length ? Math.max.apply(Math, values) : 1;
        var metricLabel = imported ? 'Imported value' : metric === 'density' ? 'Population density' : 'Broadband access index';
        var unit = imported ? '' : metric === 'density' ? ' people/mi\u00B2' : '/100';
        var geoFeatures = geoData && Array.isArray(geoData.features) ? geoData.features : [];
        var geoValues = geoFeatures.map(function (feature) { return toFiniteNumber((feature.properties || {})[geoMetric]); }).filter(Number.isFinite);
        var geoMin = geoValues.length ? Math.min.apply(Math, geoValues) : 0;
        var geoMax = geoValues.length ? Math.max.apply(Math, geoValues) : 1;
        var geoPropertyKeys = [];
        geoFeatures.forEach(function (feature) {
          Object.keys(feature.properties || {}).forEach(function (key) { if (geoPropertyKeys.indexOf(key) < 0) geoPropertyKeys.push(key); });
        });
        var geoBreaks = calculateBreaks(geoValues, classification, classCount, customBreaks);
        var legendBounds = geoValues.length ? [geoMin].concat(geoBreaks).concat([geoMax]) : [];
        var geoSummary = geoFeatures.length ? ' Polygon layer: ' + geoFeatures.length + ' features mapped by ' + geoMetric +
          ' using ' + classification + ' classes, ranging from ' + geoMin + ' to ' + geoMax + '.' : '';
        var summary = describe(records, metric, imported) + geoSummary;
        var selectedGeoFeature = geoFeatures[selectedFeatureIndex] || null;
        var selectedGeometryType = selectedGeoFeature && selectedGeoFeature.geometry ? selectedGeoFeature.geometry.type : '';
        var measuredFeature = featureMeasurements(selectedGeoFeature);
        var pathKm = pathLengthKm(analysisPoints);
        var selectedIndices = analysisSelectionSource === 'buffer' && analysisPoints.length
          ? selectWithinRadius(records, analysisPoints[0], bufferRadiusKm) : analysisSelection;
        var selectedLookup = {};
        selectedIndices.forEach(function (index) { selectedLookup[index] = true; });
        var selectedRecords = selectedIndices.map(function (index) { return records[index]; }).filter(Boolean);
        var selectedValues = selectedRecords.map(function (record) { return valueOf(record, metric, imported); }).filter(Number.isFinite);
        var selectedMean = selectedValues.length ? selectedValues.reduce(function (sum, value) { return sum + value; }, 0) / selectedValues.length : NaN;
        var comparisonChoices = imported
          ? [{ value: 'point:value', label: 'Imported point value' }]
          : [{ value: 'point:density', label: 'Population density' }, { value: 'point:access', label: 'Broadband access index' }];
        geoKeys.forEach(function (key) { comparisonChoices.push({ value: 'geo:' + key, label: 'GeoJSON: ' + key }); });
        function validChoice(choice, fallbackIndex) {
          return comparisonChoices.some(function (option) { return option.value === choice; })
            ? choice : comparisonChoices[Math.min(fallbackIndex, comparisonChoices.length - 1)].value;
        }
        var leftChoice = validChoice(compareLeft, 0);
        var rightChoice = validChoice(compareRight, 1);
        var leftSeries = comparisonSeries(leftChoice);
        var rightSeries = comparisonSeries(rightChoice);
        var activeMission = GIS_MISSIONS.filter(function (mission) { return mission.id === activeMissionId; })[0] || GIS_MISSIONS[0];
        var activeMissionProgress = missionProgress[activeMission.id] || {};
        var activeMissionCompletion = missionCompletion(activeMission, activeMissionProgress);
        var timeYears = timeDataset.years || [];
        var effectiveBaseline = timeYears.indexOf(Number(timeBaseline)) >= 0 ? Number(timeBaseline) : timeYears[0];
        var effectiveFocusYear = timeYears.indexOf(Number(timeFocusYear)) >= 0 ? Number(timeFocusYear) : timeYears[timeYears.length - 1];
        var baselineSnapshot = timelineSnapshot(timeDataset.rows, effectiveBaseline);
        var focusSnapshot = timelineSnapshot(timeDataset.rows, effectiveFocusYear);
        var temporalResult = calculateTemporalChange(timeDataset.rows, effectiveBaseline, effectiveFocusYear);
        var temporalComplete = temporalResult.rows.filter(function (row) { return Number.isFinite(row.change); });
        var temporalSorted = temporalComplete.slice().sort(function (a, b) { return b.change - a.change; });
        var temporalSummary = temporalSorted.length
          ? temporalSorted[0].name + ' has the largest increase (' + temporalSorted[0].change.toFixed(1) + '); ' +
            temporalSorted[temporalSorted.length - 1].name + ' has the smallest change (' + temporalSorted[temporalSorted.length - 1].change.toFixed(1) +
            '). These are descriptive changes and do not establish causes.'
          : 'No complete location pairs are available for the selected years.';
        var privacyAssessment = assessCoordinatePrivacy(importedRows, timeDataset.rows);
        var projectTransformations = [
          importedRows.length ? importedRows.length + ' imported coordinate records normalized' : 'Maine sample point layer active',
          geoFeatures.length ? geoFeatures.length + ' GeoJSON features classified by ' + geoMetric : 'No GeoJSON layer loaded',
          'Choropleth classification: ' + classification,
          selectedRecords.length ? selectedRecords.length + ' point records selected by ' + analysisSelectionSource : 'No active point selection',
          'Timeline comparison: ' + effectiveBaseline + ' to ' + effectiveFocusYear
        ];

        function formatDistance(km) {
          return analysisUnit === 'imperial' ? (km * 0.621371).toFixed(2) + ' mi' : km.toFixed(2) + ' km';
        }

        function formatArea(squareKm) {
          return analysisUnit === 'imperial' ? (squareKm * 0.386102).toFixed(2) + ' mi\u00B2' : squareKm.toFixed(2) + ' km\u00B2';
        }

        function comparisonLabel(choice) {
          var match = comparisonChoices.filter(function (option) { return option.value === choice; })[0];
          return match ? match.label : choice;
        }

        function comparisonSeries(choice) {
          var parts = String(choice || '').split(':'), kind = parts[0], key = parts.slice(1).join(':');
          if (kind === 'geo') {
            return {
              kind: 'geo', key: key, label: 'GeoJSON: ' + key,
              rows: geoFeatures.map(function (feature, index) {
                var props = feature.properties || {};
                return {
                  name: geoNameKey && props[geoNameKey] != null ? String(props[geoNameKey]) : 'Feature ' + (index + 1),
                  geometry: feature.geometry ? feature.geometry.type : 'Unknown',
                  lat: null, lon: null, value: props[key]
                };
              })
            };
          }
          return {
            kind: 'point', key: key, label: imported ? 'Imported point value' : key === 'density' ? 'Population density' : 'Broadband access index',
            rows: records.map(function (record) {
              return { name: record.name, geometry: 'Point', lat: record.lat, lon: record.lon, value: key === 'value' ? record.value : record[key] };
            })
          };
        }

        function seriesStats(series) {
          var numeric = series.rows.map(function (row) { return Number(row.value); }).filter(Number.isFinite);
          if (!numeric.length) return { count: series.rows.length, min: null, max: null, mean: null };
          return {
            count: series.rows.length, min: Math.min.apply(Math, numeric), max: Math.max.apply(Math, numeric),
            mean: numeric.reduce(function (sum, value) { return sum + value; }, 0) / numeric.length
          };
        }

        function persist(key, value) {
          setToolData(function (previous) {
            var next = Object.assign({}, previous || {});
            next[key] = value;
            return next;
          });
        }

        React.useEffect(function () {
          if (typeof ctx.canvasNarrate === 'function') {
            ctx.canvasNarrate('gis-studio', 'init', {
              first: 'GIS Studio loaded. Map layers and equivalent tables show Maine learning data. Import CSV or GeoJSON, compare satellite imagery, or explore projections.',
              repeat: 'GIS Studio active.', terse: 'GIS Studio.'
            }, { debounce: 800 });
          }
        }, []);

        React.useEffect(function () {
          try {
            var raw = window.localStorage && window.localStorage.getItem(GIS_DRAFT_KEY);
            if (raw) {
              var draft = validateGISProject(JSON.parse(raw));
              setRecoveryDraft(draft);
              setAutosaveStatus('A recoverable local draft is available from ' + (draft.savedAt || 'an earlier session') + '.');
              return;
            }
          } catch (draftError) {
            try { if (window.localStorage) window.localStorage.removeItem(GIS_DRAFT_KEY); } catch (ignoreDraftRemoval) {}
          }
          setAutosaveReady(true);
          setAutosaveStatus('Device-local autosave is ready.');
        }, []);

        React.useEffect(function () {
          if (!autosaveReady) return undefined;
          var timer = window.setTimeout(function () {
            try {
              var draft = projectSnapshot();
              window.localStorage.setItem(GIS_DRAFT_KEY, JSON.stringify(draft));
              setAutosaveStatus('Autosaved locally at ' + new Date().toLocaleTimeString() + '.');
            } catch (saveError) {
              setAutosaveStatus('Local autosave is unavailable or the project is too large. Download a project file instead.');
            }
          }, 900);
          return function () { window.clearTimeout(timer); };
        }, [autosaveReady, tab, source, importedRows, metric, layers, basemap, geoData, geoMetric, classification, classCount, customBreaks, analysisMode, analysisPoints, bufferRadiusKm, analysisSelection, analysisSelectionSource, compareLeft, compareRight, compareLeftBasemap, compareRightBasemap, comparisonObservation, missionProgress, missionResponses, activeMissionId, timeDataset, timeBaseline, timeFocusYear, timeObservation, projectTitle, provenance, projection, latitude]);

        React.useEffect(function () {
          if (tab !== 'map' || !mapNode.current) return undefined;
          var active = true, map = null;
          getLeaflet().then(function (L) {
            if (!active || !L || !mapNode.current) {
              if (active) setMapStatus('The online base map is unavailable. The synchronized data table remains available.');
              return;
            }
            mapNode.current.innerHTML = '';
            var center = imported && records.length ? [
              records.reduce(function (sum, record) { return sum + record.lat; }, 0) / records.length,
              records.reduce(function (sum, record) { return sum + record.lon; }, 0) / records.length
            ] : [45.15, -69.05];
            var storedView = mapViewState.current;
            map = L.map(mapNode.current, { keyboard: true, scrollWheelZoom: false }).setView(
              storedView ? storedView.center : center,
              storedView ? storedView.zoom : (imported ? 5 : 6)
            );
            map.on('moveend', function () {
              var currentCenter = map.getCenter();
              mapViewState.current = { center: [currentCenter.lat, currentCenter.lng], zoom: map.getZoom() };
            });
            var tileUrl = basemap === 'satellite'
              ? 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            L.tileLayer(tileUrl, {
              maxZoom: 18,
              attribution: basemap === 'satellite' ? 'Tiles \u00A9 Esri and contributors' : '\u00A9 OpenStreetMap contributors'
            }).addTo(map);
            if (layers.coast && !imported) {
              L.polyline([[43.08, -70.74], [43.54, -70.18], [43.91, -69.82], [44.05, -69.10], [44.39, -68.20], [44.68, -67.21], [45.19, -67.28]], {
                color: '#22d3ee', weight: 4, opacity: 0.75, dashArray: '8 7'
              }).bindTooltip('Coastal guide (schematic)').addTo(map);
            }
            if (layers.grid) {
              var lat, lon;
              for (lat = Math.floor((center[0] - 5) / 2) * 2; lat <= center[0] + 6; lat += 2) {
                L.polyline([[lat, center[1] - 10], [lat, center[1] + 10]], { color: '#64748b', weight: 1, opacity: 0.55, dashArray: '4 4' }).addTo(map);
              }
              for (lon = Math.floor((center[1] - 10) / 2) * 2; lon <= center[1] + 10; lon += 2) {
                L.polyline([[center[0] - 6, lon], [center[0] + 6, lon]], { color: '#64748b', weight: 1, opacity: 0.55, dashArray: '4 4' }).addTo(map);
              }
            }
            var polygonLayer = null;
            if (layers.polygons && geoData && geoMetric) {
              polygonLayer = L.geoJSON(geoData, {
                style: function (feature) {
                  var geoValue = toFiniteNumber((feature.properties || {})[geoMetric]);
                  return { color: '#e2e8f0', weight: 1.5, fillColor: classColor(geoValue, geoBreaks), fillOpacity: 0.68 };
                },
                pointToLayer: function (feature, latlng) {
                  var geoValue = toFiniteNumber((feature.properties || {})[geoMetric]);
                  return L.circleMarker(latlng, { radius: 9, color: '#fff', weight: 2, fillColor: classColor(geoValue, geoBreaks), fillOpacity: 0.82 });
                },
                onEachFeature: function (feature, layer) {
                  var props = feature.properties || {};
                  var featureName = geoNameKey && props[geoNameKey] != null ? props[geoNameKey] : 'Feature';
                  var geoValue = toFiniteNumber(props[geoMetric]);
                  var geoValueLabel = Number.isFinite(geoValue) ? geoValue : 'No data';
                  layer.bindTooltip(escapeHTML(featureName) + ': ' + escapeHTML(geoValueLabel));
                  layer.on('add', function () {
                    var element = layer.getElement && layer.getElement();
                    if (element) {
                      element.setAttribute('tabindex', '0');
                      element.setAttribute('role', 'img');
                      element.setAttribute('aria-label', featureName + ', ' + geoMetric + ' ' + geoValueLabel);
                    }
                  });
                }
              }).addTo(map);
              try {
                var bounds = polygonLayer.getBounds();
                if (!storedView && bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [18, 18], maxZoom: 10 });
              } catch (ignoreBounds) {}
            }
            if (layers.points) records.forEach(function (record, recordIndex) {
              var value = valueOf(record, metric, imported);
              var p = max === min ? 0.5 : (value - min) / (max - min);
              var isSelected = !!selectedLookup[recordIndex];
              L.circleMarker([record.lat, record.lon], {
                radius: 7 + p * 11 + (isSelected ? 3 : 0),
                color: isSelected ? '#facc15' : '#fff', weight: isSelected ? 4 : 2,
                fillColor: color(value, min, max), fillOpacity: isSelected ? 1 : 0.86
              }).bindTooltip(escapeHTML(record.name) + ': ' + escapeHTML(value + unit) + (isSelected ? ' (selected)' : '')).addTo(map);
            });
            if (analysisMode === 'distance' && analysisPoints.length) {
              if (analysisPoints.length > 1) L.polyline(analysisPoints.map(function (point) { return [point.lat, point.lon]; }), { color: '#facc15', weight: 4 }).addTo(map);
              analysisPoints.forEach(function (point, index) {
                L.circleMarker([point.lat, point.lon], { radius: 5, color: '#111827', weight: 2, fillColor: '#facc15', fillOpacity: 1 })
                  .bindTooltip('Measurement vertex ' + (index + 1)).addTo(map);
              });
            }
            if (analysisMode === 'buffer' && analysisPoints.length) {
              L.circle([analysisPoints[0].lat, analysisPoints[0].lon], {
                radius: Math.max(0, Number(bufferRadiusKm) || 0) * 1000,
                color: '#facc15', weight: 3, fillColor: '#facc15', fillOpacity: 0.13
              }).bindTooltip(formatDistance(Number(bufferRadiusKm) || 0) + ' radius').addTo(map);
            }
            if (analysisMode === 'nearest' && analysisPoints.length && selectedRecords[0]) {
              L.polyline([[analysisPoints[0].lat, analysisPoints[0].lon], [selectedRecords[0].lat, selectedRecords[0].lon]], {
                color: '#facc15', weight: 4, dashArray: '7 6'
              }).addTo(map);
            }
            map.on('click', function (event) {
              var point = { lat: event.latlng.lat, lon: event.latlng.lng };
              if (analysisMode === 'distance') {
                setAnalysisPoints(function (previous) { return previous.concat([point]).slice(-20); });
                setAnalysisSelection([]); setAnalysisSelectionSource('none');
                persist('gisSpatialAnalysis', true);
                announce('Measurement vertex added at ' + point.lat.toFixed(4) + ', ' + point.lon.toFixed(4) + '.');
              } else if (analysisMode === 'buffer') {
                var buffered = selectWithinRadius(records, point, bufferRadiusKm);
                setAnalysisPoints([point]); setAnalysisSelection([]); setAnalysisSelectionSource('buffer');
                persist('gisSpatialAnalysis', true);
                announce(formatDistance(Number(bufferRadiusKm) || 0) + ' buffer selected ' + buffered.length + ' of ' + records.length + ' points.');
              } else {
                var nearest = nearestRecord(records, point);
                setAnalysisPoints([point]);
                setAnalysisSelection(nearest ? [nearest.index] : []);
                setAnalysisSelectionSource('nearest');
                persist('gisSpatialAnalysis', true);
                announce(nearest ? nearest.record.name + ' is nearest at ' + formatDistance(nearest.distanceKm) + '.' : 'No mapped points are available.');
              }
            });
            var instruction = analysisMode === 'distance' ? 'Click map vertices to measure a path.' :
              analysisMode === 'buffer' ? 'Click the map to place the buffer center.' : 'Click the map to find the nearest point.';
            setMapStatus('Interactive base map ready. ' + records.length + ' records mapped. ' + instruction);
          });
          return function () {
            active = false;
            if (map) { try { map.remove(); } catch (ignore) {} }
          };
        }, [tab, source, importedRows, metric, layers.points, layers.coast, layers.grid, layers.polygons, basemap, geoData, geoMetric, classification, classCount, customBreaks, analysisMode, analysisPoints, bufferRadiusKm, analysisSelection, analysisSelectionSource, analysisUnit]);

        React.useEffect(function () {
          if (tab !== 'compare' || !compareLeftNode.current || !compareRightNode.current) return undefined;
          var active = true, leftMap = null, rightMap = null;
          getLeaflet().then(function (L) {
            if (!active || !L || !compareLeftNode.current || !compareRightNode.current) {
              if (active) setCompareStatus('Comparison basemaps are unavailable. Both accessible comparison tables remain ready.');
              return;
            }
            compareLeftNode.current.innerHTML = '';
            compareRightNode.current.innerHTML = '';
            var center = imported && records.length ? [
              records.reduce(function (sum, record) { return sum + record.lat; }, 0) / records.length,
              records.reduce(function (sum, record) { return sum + record.lon; }, 0) / records.length
            ] : [45.15, -69.05];
            var stored = compareViewState.current;
            var initialCenter = stored ? stored.center : center;
            var initialZoom = stored ? stored.zoom : (imported ? 5 : 6);
            leftMap = L.map(compareLeftNode.current, { keyboard: true, scrollWheelZoom: false }).setView(initialCenter, initialZoom);
            rightMap = L.map(compareRightNode.current, { keyboard: true, scrollWheelZoom: false }).setView(initialCenter, initialZoom);
            function addBasemap(map, name) {
              var tileUrl = name === 'satellite'
                ? 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
              L.tileLayer(tileUrl, {
                maxZoom: 18,
                attribution: name === 'satellite' ? 'Tiles © Esri and contributors' : '© OpenStreetMap contributors'
              }).addTo(map);
            }
            function addSeries(map, choice) {
              var series = comparisonSeries(choice);
              var numeric = series.rows.map(function (row) { return Number(row.value); }).filter(Number.isFinite);
              var low = numeric.length ? Math.min.apply(Math, numeric) : 0;
              var high = numeric.length ? Math.max.apply(Math, numeric) : 1;
              if (series.kind === 'point') {
                series.rows.forEach(function (row, index) {
                  var value = Number(row.value), p = high === low ? 0.5 : (value - low) / (high - low);
                  var selected = !!selectedLookup[index];
                  L.circleMarker([row.lat, row.lon], {
                    radius: 7 + p * 10 + (selected ? 2 : 0), color: selected ? '#facc15' : '#fff',
                    weight: selected ? 4 : 2, fillColor: color(value, low, high), fillOpacity: 0.9
                  }).bindTooltip(escapeHTML(row.name) + ': ' + escapeHTML(row.value) + (selected ? ' (selected)' : '')).addTo(map);
                });
              } else if (geoData) {
                var breaks = calculateBreaks(numeric, classification, classCount, customBreaks);
                L.geoJSON(geoData, {
                  style: function (feature) {
                    return { color: '#fff', weight: 1.4, fillColor: classColor((feature.properties || {})[series.key], breaks), fillOpacity: 0.72 };
                  },
                  pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, { radius: 9, color: '#fff', weight: 2, fillColor: classColor((feature.properties || {})[series.key], breaks), fillOpacity: 0.85 });
                  },
                  onEachFeature: function (feature, layer) {
                    var props = feature.properties || {};
                    var name = geoNameKey && props[geoNameKey] != null ? props[geoNameKey] : 'Feature';
                    layer.bindTooltip(escapeHTML(name) + ': ' + escapeHTML(props[series.key] == null ? 'No data' : props[series.key]));
                  }
                }).addTo(map);
              }
            }
            addBasemap(leftMap, compareLeftBasemap);
            addBasemap(rightMap, compareRightBasemap);
            addSeries(leftMap, leftChoice);
            addSeries(rightMap, rightChoice);
            var syncing = false;
            function synchronize(sourceMap, targetMap) {
              if (syncing) return;
              syncing = true;
              var currentCenter = sourceMap.getCenter(), zoom = sourceMap.getZoom();
              compareViewState.current = { center: [currentCenter.lat, currentCenter.lng], zoom: zoom };
              targetMap.setView(currentCenter, zoom, { animate: false });
              syncing = false;
            }
            leftMap.on('moveend', function () { synchronize(leftMap, rightMap); });
            rightMap.on('moveend', function () { synchronize(rightMap, leftMap); });
            setCompareStatus('Comparison maps ready and synchronized. Pan or zoom either map to move both.');
          });
          return function () {
            active = false;
            if (leftMap) { try { leftMap.remove(); } catch (ignoreLeft) {} }
            if (rightMap) { try { rightMap.remove(); } catch (ignoreRight) {} }
          };
        }, [tab, source, importedRows, geoData, geoNameKey, leftChoice, rightChoice, compareLeftBasemap, compareRightBasemap, classification, classCount, customBreaks, analysisSelection, analysisSelectionSource, bufferRadiusKm, analysisPoints]);

        React.useEffect(function () {
          if (!timePlaying || timeYears.length < 2) return undefined;
          var timer = window.setInterval(function () {
            setTimeFocusYear(function (current) {
              var index = timeYears.indexOf(Number(current));
              if (index < 0) return timeYears[0];
              if (index >= timeYears.length - 1) {
                setTimePlaying(false);
                return current;
              }
              return timeYears[index + 1];
            });
          }, 1100);
          return function () { window.clearInterval(timer); };
        }, [timePlaying, timeYears.join('|')]);

        React.useEffect(function () {
          if (tab !== 'timeline' || !timeLeftNode.current || !timeRightNode.current) return undefined;
          var active = true, leftMap = null, rightMap = null;
          getLeaflet().then(function (L) {
            if (!active || !L || !timeLeftNode.current || !timeRightNode.current) {
              if (active) setTimeStatus('Timeline basemaps are unavailable. The synchronized change table remains ready.');
              return;
            }
            timeLeftNode.current.innerHTML = '';
            timeRightNode.current.innerHTML = '';
            var all = baselineSnapshot.concat(focusSnapshot);
            var center = all.length ? [
              all.reduce(function (sum, row) { return sum + row.lat; }, 0) / all.length,
              all.reduce(function (sum, row) { return sum + row.lon; }, 0) / all.length
            ] : [45.15, -69.05];
            var stored = timeViewState.current;
            leftMap = L.map(timeLeftNode.current, { keyboard: true, scrollWheelZoom: false }).setView(stored ? stored.center : center, stored ? stored.zoom : 6);
            rightMap = L.map(timeRightNode.current, { keyboard: true, scrollWheelZoom: false }).setView(stored ? stored.center : center, stored ? stored.zoom : 6);
            function addBasemap(map) {
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(map);
            }
            var allValues = all.map(function (row) { return row.value; }).filter(Number.isFinite);
            var low = allValues.length ? Math.min.apply(Math, allValues) : 0;
            var high = allValues.length ? Math.max.apply(Math, allValues) : 1;
            var changeLookup = {};
            temporalResult.rows.forEach(function (row) { changeLookup[row.name.toLowerCase()] = row; });
            function addSnapshot(map, snapshot, isFocus) {
              snapshot.forEach(function (row) {
                var p = high === low ? 0.5 : (row.value - low) / (high - low);
                var changed = changeLookup[row.name.toLowerCase()];
                var detail = isFocus && changed && Number.isFinite(changed.change) ? ' (change ' + (changed.change >= 0 ? '+' : '') + changed.change.toFixed(1) + ')' : '';
                L.circleMarker([row.lat, row.lon], {
                  radius: 8 + p * 12, color: '#fff', weight: 2,
                  fillColor: color(row.value, low, high), fillOpacity: 0.9
                }).bindTooltip(escapeHTML(row.name) + ': ' + escapeHTML(row.value + (row.unit ? ' ' + row.unit : '') + detail)).addTo(map);
              });
            }
            addBasemap(leftMap); addBasemap(rightMap);
            addSnapshot(leftMap, baselineSnapshot, false);
            addSnapshot(rightMap, focusSnapshot, true);
            var syncing = false;
            function sync(sourceMap, targetMap) {
              if (syncing) return;
              syncing = true;
              var currentCenter = sourceMap.getCenter(), zoom = sourceMap.getZoom();
              timeViewState.current = { center: [currentCenter.lat, currentCenter.lng], zoom: zoom };
              targetMap.setView(currentCenter, zoom, { animate: false });
              syncing = false;
            }
            leftMap.on('moveend', function () { sync(leftMap, rightMap); });
            rightMap.on('moveend', function () { sync(rightMap, leftMap); });
            setTimeStatus('Before-and-after maps ready and synchronized. Baseline ' + effectiveBaseline + '; focus year ' + effectiveFocusYear + '.');
          });
          return function () {
            active = false;
            if (leftMap) { try { leftMap.remove(); } catch (ignoreLeft) {} }
            if (rightMap) { try { rightMap.remove(); } catch (ignoreRight) {} }
          };
        }, [tab, effectiveBaseline, effectiveFocusYear, timeDataset]);

        function go(next) {
          setTab(next); persist('gisTab', next);
          if (next === 'projection') persist('gisProjectionCompared', true);
          if (next === 'compare') persist('gisCompared', true);
          if (next === 'timeline') persist('gisTimelineAnalyzed', true);
          announce(next + ' workspace');
        }

        function doImport() {
          try {
            var rows = parseCSV(csv);
            setImportedRows(rows); setSource('import'); setError(''); setTab('map');
            persist('gisImported', true);
            announce(rows.length + ' CSV locations mapped.');
          } catch (problem) { setError(problem.message); announce('CSV error. ' + problem.message); }
        }

        function readFile(event) {
          var file = event.target.files && event.target.files[0];
          if (!file) return;
          if (file.size > 1024 * 1024) { setError('Choose a CSV smaller than 1 MB.'); return; }
          var reader = new FileReader();
          reader.onload = function () { setCSV(String(reader.result || '')); setError(''); };
          reader.onerror = function () { setError('That file could not be read. Try pasting the CSV.'); };
          reader.readAsText(file);
        }

        function applyGeoJSON(parsed, sourceLabel) {
          setGeoData(parsed.data);
          setGeoKeys(parsed.numericKeys);
          setGeoMetric(parsed.numericKeys[0]);
          setGeoNameKey(parsed.nameKey);
          var firstProperties = parsed.data.features[0] && parsed.data.features[0].properties ? Object.keys(parsed.data.features[0].properties) : [];
          setJoinGeoKey(parsed.nameKey || firstProperties[0] || '');
          setJoinPreview(null);
          setGeoError('');
          setLayers(function (previous) { return Object.assign({}, previous, { polygons: true }); });
          setTab('map');
          persist('gisGeoJSONImported', true);
          announce(parsed.data.features.length + ' GeoJSON features mapped from ' + sourceLabel + '.');
        }

        function doGeoImport() {
          try { applyGeoJSON(parseGeoJSON(geoText), 'pasted data'); }
          catch (problem) { setGeoError(problem.message); announce('GeoJSON error. ' + problem.message); }
        }

        function readGeoFile(event) {
          var file = event.target.files && event.target.files[0];
          if (!file) return;
          if (file.size > 3 * 1024 * 1024) { setGeoError('Choose a GeoJSON file smaller than 3 MB.'); return; }
          var reader = new FileReader();
          reader.onload = function () {
            var text = String(reader.result || '');
            setGeoText(text);
            try { applyGeoJSON(parseGeoJSON(text), file.name); }
            catch (problem) { setGeoError(problem.message); announce('GeoJSON error. ' + problem.message); }
          };
          reader.onerror = function () { setGeoError('That GeoJSON file could not be read.'); };
          reader.readAsText(file);
        }

        function loadOfficialEcoregions() {
          setOfficialBusy(true); setGeoError('');
          if (typeof window.fetch !== 'function') {
            setOfficialBusy(false);
            setGeoError('Live web layers are unavailable in this browser. Upload GeoJSON instead.');
            return;
          }
          var url = 'https://gis.maine.gov/mapservices/rest/services/mnap/Maine_Ecoregions/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson';
          Promise.resolve(window.fetch(url)).then(function (response) {
            if (!response.ok) throw new Error('The Maine GIS service returned ' + response.status + '.');
            return response.json();
          }).then(function (data) {
            var text = JSON.stringify(data, null, 2);
            setGeoText(text);
            applyGeoJSON(parseGeoJSON(text), 'Maine GeoLibrary');
            setOfficialBusy(false);
          }).catch(function () {
            setOfficialBusy(false);
            setGeoError('The live Maine layer is unavailable right now. Use the included practice layer or upload GeoJSON.');
          });
        }


        function readJoinFile(event) {
          var file = event.target.files && event.target.files[0];
          if (!file) return;
          if (file.size > 1024 * 1024) { setJoinError('Choose a join CSV smaller than 1 MB.'); return; }
          var reader = new FileReader();
          reader.onload = function () { setJoinText(String(reader.result || '')); setJoinTable(null); setJoinPreview(null); setJoinError(''); };
          reader.onerror = function () { setJoinError('That join CSV could not be read.'); };
          reader.readAsText(file);
        }

        function readJoinColumns() {
          try {
            var table = parseTableCSV(joinText);
            var geoLookup = {};
            geoPropertyKeys.forEach(function (key) { geoLookup[key.toLowerCase()] = key; });
            var matchingHeader = table.headers.filter(function (header) { return geoLookup[header.toLowerCase()]; })[0];
            var csvKey = matchingHeader || table.headers[0];
            var valueKey = table.numericKeys.filter(function (key) { return key !== csvKey; })[0] || table.numericKeys[0] || '';
            setJoinTable(table);
            setJoinCSVKey(csvKey);
            setJoinGeoKey(matchingHeader ? geoLookup[matchingHeader.toLowerCase()] : (joinGeoKey || geoNameKey || geoPropertyKeys[0] || ''));
            setJoinValueKey(valueKey);
            setJoinPreview(null);
            setJoinError(valueKey ? '' : 'The join CSV needs at least one numeric value column.');
            announce(table.rows.length + ' join rows and ' + table.headers.length + ' columns ready.');
          } catch (problem) { setJoinError(problem.message); setJoinTable(null); }
        }

        function previewJoinData() {
          try {
            var preview = joinTableToGeoJSON(geoData, joinTable ? joinTable.rows : [], joinGeoKey, joinCSVKey, joinValueKey);
            setJoinPreview(preview);
            setJoinError('');
            announce(preview.matched + ' boundaries matched. ' + preview.unmatchedCSV.length + ' CSV rows and ' + preview.unmatchedGeo.length + ' boundaries unmatched.');
          } catch (problem) { setJoinError(problem.message); setJoinPreview(null); }
        }

        function applyJoinData() {
          if (!joinPreview || !joinPreview.matched) return;
          setGeoData(joinPreview.data);
          setGeoKeys(function (previous) {
            return previous.indexOf(joinPreview.metric) >= 0 ? previous : previous.concat([joinPreview.metric]);
          });
          setGeoMetric(joinPreview.metric);
          setJoinPreview(null);
          setTab('map');
          persist('gisJoinApplied', true);
          announce('Join applied. Choropleth now maps ' + joinValueKey + '.');
        }

        function clearAnalysis() {
          setAnalysisPoints([]);
          setAnalysisSelection([]);
          setAnalysisSelectionSource('none');
          announce('Spatial analysis cleared.');
        }

        function analyzeBoundary() {
          if (!selectedGeoFeature || (selectedGeometryType !== 'Polygon' && selectedGeometryType !== 'MultiPolygon')) {
            announce('Choose a polygon or multipolygon boundary.');
            return;
          }
          var selected = selectPointsInFeature(records, selectedGeoFeature);
          setAnalysisSelection(selected);
          setAnalysisSelectionSource('boundary');
          setAnalysisPoints([]);
          persist('gisSpatialAnalysis', true);
          announce(selected.length + ' of ' + records.length + ' points selected inside the boundary.');
        }

        function sonifySelection() {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx || !selectedRecords.length) { announce('No selected records are available to sonify.'); return; }
          var ac;
          try { ac = new Ctx(); } catch (ignore) { return; }
          selectedRecords.forEach(function (record, index) {
            var p = max === min ? 0.5 : (valueOf(record, metric, imported) - min) / (max - min);
            var oscillator = ac.createOscillator(), gain = ac.createGain(), start = ac.currentTime + index * 0.16;
            oscillator.type = 'triangle';
            oscillator.frequency.value = 300 + p * 700;
            gain.gain.setValueAtTime(0.05, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
            oscillator.connect(gain); gain.connect(ac.destination);
            oscillator.start(start); oscillator.stop(start + 0.13);
          });
          announce('Playing ' + selectedRecords.length + ' selected values from low pitch to high pitch.');
        }

        function explain() {
          if (typeof callGemini !== 'function') {
            setAIText(summary + ' Ask what process, data limitation, or scale effect could explain this.');
            return;
          }
          setAIBusy(true);
          var data = records.slice(0, 40).map(function (record) {
            return [record.name, record.lat, record.lon, valueOf(record, metric, imported)].join(':');
          }).join('; ');
          var geoPayload = geoFeatures.slice(0, 30).map(function (feature, index) {
            var props = feature.properties || {};
            return (geoNameKey && props[geoNameKey] != null ? props[geoNameKey] : 'Feature ' + (index + 1)) + ':' + props[geoMetric];
          }).join('; ');
          var prompt = 'Act as an accessible secondary-school GIS coach. In 120 words or fewer, name one spatial pattern, one possible explanation to investigate, one limitation, and one useful follow-up layer. Do not claim causation. Metric: ' + metricLabel + '. Summary: ' + summary + ' Point data: ' + data + ' Polygon data: ' + geoPayload;
          Promise.resolve(callGemini(prompt, false, false, 0.4)).then(function (answer) {
            setAIText(String(answer || summary)); setAIBusy(false); announce('Pattern explanation ready.');
          }).catch(function () { setAIText(summary); setAIBusy(false); });
        }

        function sonify() {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx || !records.length) { announce('Audio is unavailable. Use the value column in the table.'); return; }
          var ac;
          try { ac = new Ctx(); } catch (ignore) { return; }
          records.slice().sort(function (a, b) { return valueOf(a, metric, imported) - valueOf(b, metric, imported); }).forEach(function (record, index) {
            var p = max === min ? 0.5 : (valueOf(record, metric, imported) - min) / (max - min);
            var oscillator = ac.createOscillator(), gain = ac.createGain(), start = ac.currentTime + index * 0.12;
            oscillator.frequency.value = 220 + p * 660;
            gain.gain.setValueAtTime(0.045, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
            oscillator.connect(gain); gain.connect(ac.destination);
            oscillator.start(start); oscillator.stop(start + 0.1);
          });
          announce('Playing values from low pitch to high pitch.');
        }

        var panel = { background: '#102536', border: '1px solid #28516a', borderRadius: 14, padding: 14 };
        var control = { padding: '8px 9px', borderRadius: 8, border: '1px solid #3f6b82', background: '#071827', color: '#f8fafc' };
        var primary = { padding: '9px 12px', border: 0, borderRadius: 9, background: '#0f766e', color: '#fff', fontWeight: 800, cursor: 'pointer' };

        function toggle(key, label) {
          return h('label', { key: key, style: { display: 'flex', gap: 7, color: '#dbeafe', fontSize: 12 } },
            h('input', { type: 'checkbox', checked: layers[key], onChange: function () {
              var next = Object.assign({}, layers); next[key] = !next[key]; setLayers(next);
            } }), label);
        }

        function tableTwin() {
          return h('section', { 'aria-labelledby': 'gis-table-heading', style: Object.assign({}, panel, { overflow: 'hidden' }) },
            h('h2', { id: 'gis-table-heading', style: { margin: '0 0 4px', fontSize: 15, color: '#f0fdfa' } }, 'Accessible data-table twin'),
            h('p', { style: { margin: '0 0 10px', color: '#a7c7d8', fontSize: 11 } }, records.length + ' records. The table carries the same values as the map without relying on color or position.'),
            h('div', { style: { overflowX: 'auto' } },
              h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
                h('caption', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' } }, metricLabel + ' by location'),
                h('thead', null, h('tr', null, ['Location', 'Latitude', 'Longitude', metricLabel, 'Class', 'Analysis selection'].map(function (heading) {
                  return h('th', { key: heading, scope: 'col', style: { textAlign: 'left', padding: 8, color: '#67e8f9', borderBottom: '1px solid #3f6b82' } }, heading);
                }))),
                h('tbody', null, records.slice().sort(function (a, b) { return valueOf(b, metric, imported) - valueOf(a, metric, imported); }).map(function (record) {
                  var value = valueOf(record, metric, imported);
                  var classification = value === max ? 'Highest' : value === min ? 'Lowest' : 'Middle range';
                  return h('tr', { key: record.name },
                    h('th', { scope: 'row', style: { textAlign: 'left', padding: 8, color: '#fff', borderBottom: '1px solid #1e4154' } }, record.name),
                    h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154' } }, record.lat.toFixed(3)),
                    h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154' } }, record.lon.toFixed(3)),
                    h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154', fontWeight: 800 } }, value + unit),
                    h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154' } }, classification),
                    h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154', color: selectedLookup[records.indexOf(record)] ? '#fde047' : '#a7c7d8', fontWeight: selectedLookup[records.indexOf(record)] ? 800 : 400 } }, selectedLookup[records.indexOf(record)] ? 'Selected' : 'Not selected'));
                })))));
        }

        function analysisControls() {
          return h('section', { 'aria-labelledby': 'gis-analysis-controls-heading', style: { marginTop: 15, paddingTop: 14, borderTop: '1px solid #28516a' } },
            h('h3', { id: 'gis-analysis-controls-heading', style: { margin: '0 0 8px', color: '#fde68a', fontSize: 13 } }, 'Spatial analysis workbench'),
            h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 9 } },
              h('span', { style: { fontWeight: 700 } }, 'Map-click tool'),
              h('select', { value: analysisMode, onChange: function (event) {
                setAnalysisMode(event.target.value); clearAnalysis();
              }, style: control },
                h('option', { value: 'distance' }, 'Measure path'),
                h('option', { value: 'buffer' }, 'Radius buffer'),
                h('option', { value: 'nearest' }, 'Find nearest point'))),
            h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 9 } },
              h('span', { style: { fontWeight: 700 } }, 'Units'),
              h('select', { value: analysisUnit, onChange: function (event) { setAnalysisUnit(event.target.value); persist('gisAnalysisUnit', event.target.value); }, style: control },
                h('option', { value: 'metric' }, 'Metric (km)'),
                h('option', { value: 'imperial' }, 'U.S. customary (mi)'))),
            analysisMode === 'buffer' && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 9 } },
              h('span', { style: { fontWeight: 700 } }, 'Buffer radius'),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('input', { type: 'number', min: 1, max: 500, step: 1, value: bufferRadiusKm, onChange: function (event) { setBufferRadiusKm(Math.max(1, Math.min(500, Number(event.target.value) || 1))); }, style: Object.assign({}, control, { width: 78 }) }),
                h('span', null, analysisUnit === 'imperial' ? 'km (' + formatDistance(bufferRadiusKm) + ')' : 'km'))),
            h('p', { style: { margin: '5px 0 9px', color: '#a7c7d8', fontSize: 10, lineHeight: 1.45 } },
              analysisMode === 'distance' ? 'Click two or more map locations. Each click adds a path segment.' :
                analysisMode === 'buffer' ? 'Click once to center a straight-line radius and select mapped points inside it.' :
                  'Click anywhere to identify the closest mapped point by straight-line distance.'),
            h('button', { type: 'button', onClick: clearAnalysis, style: Object.assign({}, control, { width: '100%', cursor: 'pointer' }) }, 'Clear map analysis'),
            geoFeatures.length > 0 && h('div', { style: { marginTop: 13, paddingTop: 12, borderTop: '1px solid #28516a' } },
              h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 8 } },
                h('span', { style: { fontWeight: 700 } }, 'GeoJSON feature to measure'),
                h('select', { value: selectedFeatureIndex, onChange: function (event) { setSelectedFeatureIndex(Number(event.target.value)); setAnalysisSelection([]); setAnalysisSelectionSource('none'); }, style: control },
                  geoFeatures.map(function (feature, index) {
                    var props = feature.properties || {};
                    var name = geoNameKey && props[geoNameKey] != null ? props[geoNameKey] : 'Feature ' + (index + 1);
                    return h('option', { key: index, value: index }, String(name) + ' (' + feature.geometry.type + ')');
                  }))),
              h('button', { type: 'button', onClick: analyzeBoundary, disabled: selectedGeometryType !== 'Polygon' && selectedGeometryType !== 'MultiPolygon', style: Object.assign({}, primary, { width: '100%', opacity: selectedGeometryType === 'Polygon' || selectedGeometryType === 'MultiPolygon' ? 1 : 0.55 }) }, 'Select points inside boundary')));
        }

        function analysisResults() {
          var narrative;
          if (analysisSelectionSource === 'buffer' && analysisPoints.length) {
            narrative = formatDistance(Number(bufferRadiusKm) || 0) + ' radius contains ' + selectedRecords.length + ' of ' + records.length + ' mapped points. Proximity is not the same as access or travel time.';
          } else if (analysisSelectionSource === 'nearest' && selectedRecords.length && analysisPoints.length) {
            narrative = selectedRecords[0].name + ' is the nearest mapped point at ' + formatDistance(haversineKm(analysisPoints[0], selectedRecords[0])) + '. Straight-line distance may differ from route distance.';
          } else if (analysisSelectionSource === 'boundary') {
            narrative = selectedRecords.length + ' of ' + records.length + ' mapped points fall inside the chosen boundary. Results depend on boundary scale and coordinate quality.';
          } else if (analysisMode === 'distance' && analysisPoints.length > 1) {
            narrative = 'Measured path: ' + formatDistance(pathKm) + ' across ' + (analysisPoints.length - 1) + ' segment' + (analysisPoints.length === 2 ? '' : 's') + '. This is geodesic point-to-point distance, not road distance.';
          } else {
            narrative = analysisMode === 'distance' ? 'Click at least two map locations to measure a path.' :
              analysisMode === 'buffer' ? 'Click the map to place a buffer and select points.' : 'Click the map to find the nearest mapped point.';
          }
          return h('section', { 'aria-labelledby': 'gis-analysis-results-heading', style: panel },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
              h('div', null,
                h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.08em' } }, 'MEASURE • BUFFER • SELECT'),
                h('h2', { id: 'gis-analysis-results-heading', style: { margin: '3px 0 0', color: '#f0fdfa', fontSize: 16 } }, 'Spatial analysis results')),
              h('button', { type: 'button', onClick: sonifySelection, disabled: !selectedRecords.length, style: Object.assign({}, primary, { background: '#083344', border: '1px solid #22d3ee', opacity: selectedRecords.length ? 1 : 0.55 }) }, '♫ Sonify selection')),
            h('p', { role: 'status', style: { margin: '10px 0', color: '#cfe8f3', fontSize: 12, lineHeight: 1.55 } }, narrative),
            selectedGeoFeature && h('div', { style: { display: 'flex', gap: 9, flexWrap: 'wrap', padding: 10, borderRadius: 9, background: '#071827', color: '#dbeafe', fontSize: 11 } },
              (selectedGeometryType === 'Polygon' || selectedGeometryType === 'MultiPolygon') && h('strong', { style: { color: '#86efac' } }, 'Area: ' + formatArea(measuredFeature.areaSquareKm)),
              (selectedGeometryType === 'Polygon' || selectedGeometryType === 'MultiPolygon') && h('span', null, 'Perimeter: ' + formatDistance(measuredFeature.perimeterKm)),
              (selectedGeometryType === 'LineString' || selectedGeometryType === 'MultiLineString') && h('strong', { style: { color: '#86efac' } }, 'Line length: ' + formatDistance(measuredFeature.lengthKm))),
            selectedRecords.length > 0 && h('div', { style: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 } },
              h('div', { style: { padding: 9, borderRadius: 8, background: '#123143' } }, h('strong', { style: { display: 'block', color: '#fde047', fontSize: 18 } }, selectedRecords.length), h('span', { style: { fontSize: 10 } }, 'selected points')),
              h('div', { style: { padding: 9, borderRadius: 8, background: '#123143' } }, h('strong', { style: { display: 'block', color: '#67e8f9', fontSize: 18 } }, Number.isFinite(selectedMean) ? selectedMean.toFixed(1) : '—'), h('span', { style: { fontSize: 10 } }, 'selected mean, ' + metricLabel)),
              h('div', { style: { padding: 9, borderRadius: 8, background: '#123143' } }, h('strong', { style: { display: 'block', color: '#f0fdfa', fontSize: 12 } }, selectedRecords.slice(0, 4).map(function (record) { return record.name; }).join(', ') + (selectedRecords.length > 4 ? ' +' + (selectedRecords.length - 4) : '')), h('span', { style: { fontSize: 10 } }, 'selected locations'))),
            h('p', { style: { margin: '10px 0 0', color: '#fcd34d', fontSize: 10, lineHeight: 1.45 } }, 'Analysis describes spatial relationships in the loaded data; it does not establish cause and effect. The table below marks every selected row.'));
        }

        function mapView() {
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-map-heading', style: { display: 'grid', gridTemplateColumns: 'minmax(190px,250px) minmax(0,1fr)', gap: 12 } },
              h('div', { style: panel },
                h('h2', { id: 'gis-map-heading', style: { margin: '0 0 5px', color: '#f0fdfa', fontSize: 16 } }, 'Layer workspace'),
                h('p', { style: { margin: '0 0 13px', color: '#a7c7d8', fontSize: 11, lineHeight: 1.5 } }, 'A GIS combines geometry, attributes, and layers.'),
                h('fieldset', { style: { border: 0, padding: 0, margin: '0 0 13px' } },
                  h('legend', { style: { color: '#67e8f9', fontWeight: 800, fontSize: 11, marginBottom: 7 } }, 'DATA SOURCE'),
                  h('label', { style: { display: 'block', fontSize: 12, marginBottom: 6 } }, h('input', { type: 'radio', name: 'gis-source', checked: !imported, onChange: function () { setSource('sample'); } }), ' Maine sample'),
                  h('label', { style: { display: 'block', fontSize: 12, color: importedRows.length ? '#dbeafe' : '#68849a' } }, h('input', { type: 'radio', name: 'gis-source', checked: imported, disabled: !importedRows.length, onChange: function () { setSource('import'); } }), ' My CSV')),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 13 } },
                  h('span', { style: { fontWeight: 700 } }, 'Basemap'),
                  h('select', { value: basemap, onChange: function (event) { setBasemap(event.target.value); persist('gisBasemap', event.target.value); }, style: control },
                    h('option', { value: 'street' }, 'Street map'),
                    h('option', { value: 'satellite' }, 'Satellite imagery'))),
                !imported && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 13 } },
                  h('span', { style: { fontWeight: 700 } }, 'Thematic attribute'),
                  h('select', { value: metric, onChange: function (event) { setMetric(event.target.value); persist('gisMetric', event.target.value); }, style: control },
                    h('option', { value: 'density' }, 'Population density'),
                    h('option', { value: 'access' }, 'Broadband access (demo)'))),
                geoKeys.length > 0 && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 10 } },
                  h('span', { style: { fontWeight: 700 } }, 'Choropleth attribute'),
                  h('select', { value: geoMetric, onChange: function (event) { setGeoMetric(event.target.value); }, style: control },
                    geoKeys.map(function (key) { return h('option', { key: key, value: key }, key); }))),
                geoFeatures.length > 0 && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 10 } },
                  h('span', { style: { fontWeight: 700 } }, 'Classification method'),
                  h('select', { value: classification, onChange: function (event) { setClassification(event.target.value); persist('gisClassification', event.target.value); }, style: control },
                    h('option', { value: 'quantile' }, 'Quantiles'),
                    h('option', { value: 'equal' }, 'Equal intervals'),
                    h('option', { value: 'jenks' }, 'Natural breaks (Jenks)'),
                    h('option', { value: 'custom' }, 'Custom thresholds'))),
                geoFeatures.length > 0 && classification !== 'custom' && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 10 } },
                  h('span', { style: { fontWeight: 700 } }, 'Classes: ' + classCount),
                  h('input', { type: 'range', min: 3, max: 7, value: classCount, onChange: function (event) { setClassCount(Number(event.target.value)); } })),
                geoFeatures.length > 0 && classification === 'custom' && h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 10 } },
                  h('span', { style: { fontWeight: 700 } }, 'Thresholds, comma separated'),
                  h('input', { type: 'text', value: customBreaks, onChange: function (event) { setCustomBreaks(event.target.value); }, style: control })),
                h('fieldset', { style: { border: 0, padding: 0, display: 'grid', gap: 8, margin: '0 0 13px' } },
                  h('legend', { style: { color: '#67e8f9', fontWeight: 800, fontSize: 11, marginBottom: 7 } }, 'Visible layers'),
                  toggle('points', 'Thematic points'), geoFeatures.length > 0 && toggle('polygons', 'GeoJSON choropleth'), !imported && toggle('coast', 'Coastal guide'), toggle('grid', 'Coordinate grid')),
                h('button', { type: 'button', onClick: sonify, style: Object.assign({}, primary, { width: '100%', background: '#083344', border: '1px solid #22d3ee' }) }, '\u266B Sonify values'),
                h('p', { style: { color: '#9fb6c5', fontSize: 10, lineHeight: 1.4 } }, 'Low values use lower pitches. The table is the equivalent non-audio view.'),
                analysisControls()),
              h('div', null,
                h('div', { ref: mapNode, tabIndex: 0, role: 'application', 'aria-label': 'Interactive GIS map. Use keyboard controls to pan and zoom. An equivalent table follows.', style: { height: 390, borderRadius: 14, overflow: 'hidden', border: '1px solid #28516a', background: '#071827' } }),
                h('p', { role: 'status', style: { margin: '7px 2px 0', color: '#a7c7d8', fontSize: 11 } }, mapStatus),
                geoValues.length > 0 ? h('div', { role: 'list', 'aria-label': classification + ' choropleth legend for ' + geoMetric, style: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', color: '#b7d2df', fontSize: 10 } },
                  legendBounds.slice(0, -1).map(function (lower, index) {
                    var upper = legendBounds[index + 1];
                    var label = Number(lower).toFixed(1) + ' to ' + Number(upper).toFixed(1);
                    return h('span', { key: index, role: 'listitem', style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
                      h('span', { 'aria-hidden': 'true', style: { width: 18, height: 10, display: 'inline-block', background: paletteForClasses(legendBounds.length - 1)[Math.min(index, legendBounds.length - 2)], borderRadius: 2, border: '1px solid rgba(255,255,255,.35)' } }),
                      label);
                  })) : h('div', { role: 'img', 'aria-label': 'Point values run from low teal to high rose', style: { color: '#b7d2df', fontSize: 10 } }, 'Point legend: low teal \u2192 high rose'))),
            analysisResults(),
            basemap === 'satellite' && h('section', { 'aria-labelledby': 'gis-imagery-heading', style: panel },
              h('h2', { id: 'gis-imagery-heading', style: { margin: '0 0 5px', color: '#f0fdfa', fontSize: 15 } }, 'Satellite imagery reading routine'),
              h('p', { style: { margin: '0 0 9px', color: '#b7d2df', fontSize: 12, lineHeight: 1.5 } }, 'Observe before interpreting. Look for color, texture, pattern, shape, shadow, and context; then switch to the street map to test your idea.'),
              h('label', { style: { display: 'grid', gap: 5, color: '#e6fffb', fontSize: 12, fontWeight: 700 } }, 'Evidence-based observation',
                h('textarea', { value: imageryNote, onChange: function (event) { setImageryNote(event.target.value); }, rows: 3, placeholder: 'I notice... I think it may be... because...', style: { width: '100%', boxSizing: 'border-box', padding: 9, borderRadius: 8, border: '1px solid #3f6b82', background: '#071827', color: '#fff' } }))),
            h('section', { 'aria-labelledby': 'gis-pattern-heading', style: panel },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
                h('h2', { id: 'gis-pattern-heading', style: { margin: 0, fontSize: 15, color: '#f0fdfa' } }, 'Spatial pattern coach'),
                h('button', { type: 'button', onClick: explain, disabled: aiBusy, style: primary }, aiBusy ? 'Analyzing\u2026' : '\u2728 Explain this pattern')),
              h('p', { style: { margin: '9px 0 0', color: '#cfe8f3', fontSize: 12, lineHeight: 1.55 } }, aiText || summary)),
            tableTwin(),
            geoFeatures.length > 0 && h('section', { 'aria-labelledby': 'gis-geo-table-heading', style: Object.assign({}, panel, { overflow: 'hidden' }) },
              h('h2', { id: 'gis-geo-table-heading', style: { margin: '0 0 4px', fontSize: 15, color: '#f0fdfa' } }, 'Choropleth feature-table twin'),
              h('p', { style: { margin: '0 0 10px', color: '#a7c7d8', fontSize: 11 } }, geoFeatures.length + ' GeoJSON features mapped by ' + geoMetric + '.'),
              h('div', { style: { overflowX: 'auto' } },
                h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
                  h('caption', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' } }, 'GeoJSON feature values for the choropleth'),
                  h('thead', null, h('tr', null, ['Feature', 'Geometry', geoMetric].map(function (heading) {
                    return h('th', { key: heading, scope: 'col', style: { textAlign: 'left', padding: 8, color: '#67e8f9', borderBottom: '1px solid #3f6b82' } }, heading);
                  }))),
                  h('tbody', null, geoFeatures.map(function (feature, index) {
                    var props = feature.properties || {};
                    var featureName = geoNameKey && props[geoNameKey] != null ? props[geoNameKey] : 'Feature ' + (index + 1);
                    return h('tr', { key: index },
                      h('th', { scope: 'row', style: { textAlign: 'left', padding: 8, color: '#fff', borderBottom: '1px solid #1e4154' } }, String(featureName)),
                      h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154' } }, feature.geometry.type),
                      h('td', { style: { padding: 8, borderBottom: '1px solid #1e4154', fontWeight: 800 } }, String(props[geoMetric])));
                  }))))));
        }

        function importView() {
          return h('div', { style: { maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-import-heading', style: Object.assign({}, panel, { padding: 18 }) },
              h('p', { style: { margin: 0, color: '#67e8f9', fontSize: 11, fontWeight: 800 } }, 'POINT DATA'),
              h('h2', { id: 'gis-import-heading', style: { color: '#f0fdfa', margin: '5px 0 8px' } }, 'Map a coordinate CSV'),
              h('p', { style: { color: '#b7d2df', lineHeight: 1.6, fontSize: 13 } }, 'Use name, latitude, longitude, and value headers. Up to 250 rows stay in your browser and are not uploaded.'),
              h('label', { style: { display: 'grid', gap: 6, margin: '14px 0', fontSize: 12, fontWeight: 700 } }, 'Choose a CSV file',
                h('input', { type: 'file', accept: '.csv,text/csv', onChange: readFile })),
              h('label', { style: { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 } }, 'Or paste CSV data',
                h('textarea', { value: csv, onChange: function (event) { setCSV(event.target.value); setError(''); }, rows: 7, spellCheck: false, style: { width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid #3f6b82', background: '#071827', color: '#e6fffb', fontFamily: 'monospace', lineHeight: 1.5 } })),
              error && h('p', { role: 'alert', style: { background: '#7f1d1d', color: '#fecaca', padding: 9, borderRadius: 8 } }, error),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: doImport, style: primary }, 'Map this CSV'),
                h('button', { type: 'button', onClick: function () { setCSV(EXAMPLE); setError(''); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Restore CSV example'))),
            h('section', { 'aria-labelledby': 'gis-geojson-heading', style: Object.assign({}, panel, { padding: 18 }) },
              h('p', { style: { margin: 0, color: '#67e8f9', fontSize: 11, fontWeight: 800 } }, 'POLYGONS + FEATURES'),
              h('h2', { id: 'gis-geojson-heading', style: { color: '#f0fdfa', margin: '5px 0 8px' } }, 'Import a GeoJSON choropleth'),
              h('p', { style: { color: '#b7d2df', lineHeight: 1.6, fontSize: 13 } }, 'Load up to 500 points, lines, or polygons. GIS Studio detects numeric properties and maps the first one; change the attribute from the map workspace.'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' } },
                h('label', { style: Object.assign({}, control, { cursor: 'pointer', fontWeight: 700 }) }, 'Choose GeoJSON',
                  h('input', { type: 'file', accept: '.geojson,.json,application/geo+json,application/json', onChange: readGeoFile, style: { display: 'block', marginTop: 7 } })),
                h('button', { type: 'button', onClick: loadOfficialEcoregions, disabled: officialBusy, style: Object.assign({}, primary, { background: '#155e75' }) }, officialBusy ? 'Loading Maine layer\u2026' : 'Load official Maine ecoregions')),
              h('label', { style: { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 } }, 'Or paste GeoJSON',
                h('textarea', { value: geoText, onChange: function (event) { setGeoText(event.target.value); setGeoError(''); }, rows: 10, spellCheck: false, style: { width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid #3f6b82', background: '#071827', color: '#e6fffb', fontFamily: 'monospace', lineHeight: 1.45 } })),
              geoError && h('p', { role: 'alert', style: { background: '#7f1d1d', color: '#fecaca', padding: 9, borderRadius: 8 } }, geoError),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: doGeoImport, style: primary }, 'Build choropleth'),
                h('button', { type: 'button', onClick: function () { setGeoText(EXAMPLE_GEOJSON); setGeoError(''); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Restore GeoJSON example')),
              geoKeys.length > 0 && h('label', { style: { display: 'grid', gap: 5, marginTop: 12, fontSize: 12, fontWeight: 700 } }, 'Choropleth attribute',
                h('select', { value: geoMetric, onChange: function (event) { setGeoMetric(event.target.value); }, style: control },
                  geoKeys.map(function (key) { return h('option', { key: key, value: key }, key); })))),

            h('section', { 'aria-labelledby': 'gis-join-heading', style: Object.assign({}, panel, { padding: 18 }) },
              h('p', { style: { margin: 0, color: '#67e8f9', fontSize: 11, fontWeight: 800 } }, 'ATTRIBUTE JOIN'),
              h('h2', { id: 'gis-join-heading', style: { color: '#f0fdfa', margin: '5px 0 8px' } }, 'Join a CSV to map boundaries'),
              h('p', { style: { color: '#b7d2df', lineHeight: 1.6, fontSize: 13 } }, 'Match a CSV row to each GeoJSON feature using a shared identifier such as county name or FIPS code. Keys are compared without case, punctuation, or extra spaces. Review every mismatch before applying.'),
              !geoData && h('p', { role: 'status', style: { padding: 10, borderRadius: 8, background: '#172d3c', color: '#bae6fd', fontSize: 12 } }, 'Build or load a GeoJSON layer above before preparing a join.'),
              h('label', { style: { display: 'grid', gap: 6, margin: '12px 0', fontSize: 12, fontWeight: 700 } }, 'Choose attribute CSV',
                h('input', { type: 'file', accept: '.csv,text/csv', onChange: readJoinFile, disabled: !geoData })),
              h('label', { style: { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 } }, 'Or paste attribute CSV',
                h('textarea', { value: joinText, disabled: !geoData, onChange: function (event) { setJoinText(event.target.value); setJoinTable(null); setJoinPreview(null); setJoinError(''); }, rows: 7, spellCheck: false, style: { width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid #3f6b82', background: '#071827', color: '#e6fffb', fontFamily: 'monospace', lineHeight: 1.45, opacity: geoData ? 1 : 0.55 } })),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: readJoinColumns, disabled: !geoData, style: Object.assign({}, primary, { opacity: geoData ? 1 : 0.55 }) }, '1. Read CSV columns'),
                h('button', { type: 'button', onClick: function () { setJoinText(EXAMPLE_JOIN_CSV); setJoinTable(null); setJoinPreview(null); setJoinError(''); }, disabled: !geoData, style: Object.assign({}, control, { cursor: geoData ? 'pointer' : 'not-allowed' }) }, 'Restore join example')),
              joinTable && h('div', { style: { marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 } },
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'GeoJSON match field',
                  h('select', { value: joinGeoKey, onChange: function (event) { setJoinGeoKey(event.target.value); setJoinPreview(null); }, style: control },
                    geoPropertyKeys.map(function (key) { return h('option', { key: key, value: key }, key); }))),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'CSV match field',
                  h('select', { value: joinCSVKey, onChange: function (event) { setJoinCSVKey(event.target.value); setJoinPreview(null); }, style: control },
                    joinTable.headers.map(function (key) { return h('option', { key: key, value: key }, key); }))),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'Numeric value to map',
                  h('select', { value: joinValueKey, onChange: function (event) { setJoinValueKey(event.target.value); setJoinPreview(null); }, style: control },
                    joinTable.numericKeys.map(function (key) { return h('option', { key: key, value: key }, key); })))),
              joinTable && h('button', { type: 'button', onClick: previewJoinData, disabled: !joinValueKey, style: Object.assign({}, primary, { marginTop: 12 }) }, '2. Preview matches'),
              joinError && h('p', { role: 'alert', style: { background: '#7f1d1d', color: '#fecaca', padding: 9, borderRadius: 8 } }, joinError),
              joinPreview && h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: '#071827', border: '1px solid #3f6b82' } },
                h('h3', { style: { margin: '0 0 8px', color: '#f0fdfa', fontSize: 14 } }, 'Join preview'),
                h('div', { role: 'status', style: { display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 } },
                  h('strong', { style: { color: '#86efac' } }, joinPreview.matched + ' matched'),
                  h('span', { style: { color: joinPreview.unmatchedCSV.length ? '#fde68a' : '#86efac' } }, joinPreview.unmatchedCSV.length + ' CSV rows unmatched'),
                  h('span', { style: { color: joinPreview.unmatchedGeo.length ? '#fde68a' : '#86efac' } }, joinPreview.unmatchedGeo.length + ' boundaries unmatched'),
                  h('span', { style: { color: joinPreview.duplicates.length ? '#fca5a5' : '#86efac' } }, joinPreview.duplicates.length + ' duplicate keys')),
                (joinPreview.unmatchedCSV.length > 0 || joinPreview.unmatchedGeo.length > 0 || joinPreview.duplicates.length > 0) && h('details', { style: { marginTop: 9, color: '#cfe8f3', fontSize: 12 } },
                  h('summary', { style: { cursor: 'pointer', fontWeight: 700 } }, 'Review unmatched and duplicate keys'),
                  joinPreview.unmatchedCSV.length > 0 && h('p', null, 'CSV only: ' + joinPreview.unmatchedCSV.join(', ')),
                  joinPreview.unmatchedGeo.length > 0 && h('p', null, 'GeoJSON only: ' + joinPreview.unmatchedGeo.join(', ')),
                  joinPreview.duplicates.length > 0 && h('p', null, 'Duplicate CSV keys: ' + joinPreview.duplicates.join(', '))),
                h('button', { type: 'button', onClick: applyJoinData, disabled: !joinPreview.matched, style: Object.assign({}, primary, { marginTop: 10 }) }, '3. Apply join + map ' + joinValueKey))),
            h('aside', { style: { padding: 12, borderLeft: '4px solid #f59e0b', background: '#2b2617', color: '#fde68a', borderRadius: 8, fontSize: 12 } },
              h('strong', null, 'Data ethics: '), 'Do not map student home addresses or sensitive locations. Aggregate, blur, or suppress identifiable points.'));
        }

        function projectSnapshot() {
          return createGISProject({
            title: projectTitle,
            provenance: provenance,
            settings: {
              tab: tab, source: source, metric: metric, layers: layers, basemap: basemap,
              geoMetric: geoMetric, classification: classification, classCount: classCount, customBreaks: customBreaks,
              analysisMode: analysisMode, analysisPoints: analysisPoints, bufferRadiusKm: bufferRadiusKm,
              analysisUnit: analysisUnit, selectedFeatureIndex: selectedFeatureIndex,
              analysisSelection: analysisSelection, analysisSelectionSource: analysisSelectionSource,
              compareLeft: compareLeft, compareRight: compareRight,
              compareLeftBasemap: compareLeftBasemap, compareRightBasemap: compareRightBasemap,
              projection: projection, latitude: latitude, timeBaseline: effectiveBaseline, timeFocusYear: effectiveFocusYear
            },
            data: {
              importedRows: importedRows,
              geoData: geoData,
              geoKeys: geoKeys,
              geoNameKey: geoNameKey,
              timeDataset: timeDataset
            },
            work: {
              comparisonObservation: comparisonObservation, imageryNote: imageryNote,
              activeMissionId: activeMissionId, missionProgress: missionProgress, missionResponses: missionResponses,
              timeObservation: timeObservation, transformations: projectTransformations
            }
          }, new Date().toISOString());
        }

        function applyProjectDocument(project, sourceLabel) {
          project = validateGISProject(project);
          var settings = project.settings || {}, data = project.data || {}, work = project.work || {};
          var restoredPoints = Array.isArray(data.importedRows) ? data.importedRows.slice(0, 250) : [];
          setProjectTitle(String(project.title || 'Untitled GIS project'));
          setProvenance(normalizeProvenance(project.provenance));
          setImportedRows(restoredPoints);
          setSource(settings.source === 'import' && restoredPoints.length ? 'import' : 'sample');
          setMetric(settings.metric === 'access' ? 'access' : 'density');
          setLayers(Object.assign({ points: true, coast: true, grid: false, polygons: true }, settings.layers || {}));
          setBasemap(settings.basemap === 'satellite' ? 'satellite' : 'street');
          setGeoData(data.geoData || null);
          var restoredGeoKeys = Array.isArray(data.geoKeys) ? data.geoKeys.map(String).slice(0, 100) : [];
          setGeoKeys(restoredGeoKeys);
          setGeoMetric(String(settings.geoMetric || restoredGeoKeys[0] || ''));
          setGeoNameKey(data.geoNameKey == null ? null : String(data.geoNameKey));
          setClassification(['quantile', 'equal', 'jenks', 'custom'].indexOf(settings.classification) >= 0 ? settings.classification : 'quantile');
          setClassCount(Math.max(3, Math.min(7, Number(settings.classCount) || 5)));
          setCustomBreaks(String(settings.customBreaks || '25, 50, 75'));
          setAnalysisMode(['distance', 'buffer', 'nearest'].indexOf(settings.analysisMode) >= 0 ? settings.analysisMode : 'distance');
          setAnalysisPoints(Array.isArray(settings.analysisPoints) ? settings.analysisPoints.slice(0, 20) : []);
          setBufferRadiusKm(Math.max(1, Math.min(500, Number(settings.bufferRadiusKm) || 25)));
          setAnalysisUnit(settings.analysisUnit === 'imperial' ? 'imperial' : 'metric');
          setSelectedFeatureIndex(Math.max(0, Number(settings.selectedFeatureIndex) || 0));
          setAnalysisSelection(Array.isArray(settings.analysisSelection) ? settings.analysisSelection : []);
          setAnalysisSelectionSource(String(settings.analysisSelectionSource || 'none'));
          setCompareLeft(String(settings.compareLeft || 'point:density'));
          setCompareRight(String(settings.compareRight || 'point:access'));
          setCompareLeftBasemap(settings.compareLeftBasemap === 'satellite' ? 'satellite' : 'street');
          setCompareRightBasemap(settings.compareRightBasemap === 'street' ? 'street' : 'satellite');
          setProjection(['mercator', 'equirectangular', 'equalarea'].indexOf(settings.projection) >= 0 ? settings.projection : 'mercator');
          setLatitude(Math.max(0, Math.min(80, Number(settings.latitude) || 60)));
          var savedTimeRows = data.timeDataset && Array.isArray(data.timeDataset.rows) ? data.timeDataset.rows.slice(0, 3000) : [];
          var restoredTime = EXAMPLE_TIME_DATA;
          if (savedTimeRows.length) {
            var restoredYears = savedTimeRows.map(function (row) { return Number(row.year); })
              .filter(function (year, index, all) { return all.indexOf(year) === index; }).sort(function (a, b) { return a - b; });
            restoredTime = {
              rows: savedTimeRows,
              years: restoredYears,
              duplicates: Array.isArray(data.timeDataset.duplicates) ? data.timeDataset.duplicates.slice(0, 100) : [],
              units: savedTimeRows.map(function (row) { return String(row.unit || ''); }).filter(function (value, index, all) { return value && all.indexOf(value) === index; }),
              sources: savedTimeRows.map(function (row) { return String(row.source || ''); }).filter(function (value, index, all) { return value && all.indexOf(value) === index; })
            };
          }
          setTimeDataset(restoredTime);
          setTimeBaseline(restoredTime.years.indexOf(Number(settings.timeBaseline)) >= 0 ? Number(settings.timeBaseline) : restoredTime.years[0]);
          setTimeFocusYear(restoredTime.years.indexOf(Number(settings.timeFocusYear)) >= 0 ? Number(settings.timeFocusYear) : restoredTime.years[restoredTime.years.length - 1]);
          setComparisonObservation(String(work.comparisonObservation || ''));
          setImageryNote(String(work.imageryNote || ''));
          setActiveMissionId(GIS_MISSIONS.some(function (mission) { return mission.id === work.activeMissionId; }) ? work.activeMissionId : GIS_MISSIONS[0].id);
          setMissionProgress(work.missionProgress && typeof work.missionProgress === 'object' ? work.missionProgress : {});
          setMissionResponses(work.missionResponses && typeof work.missionResponses === 'object' ? work.missionResponses : {});
          setTimeObservation(String(work.timeObservation || ''));
          var allowedTabs = ['project', 'missions', 'timeline', 'map', 'compare', 'import', 'projection'];
          setTab(allowedTabs.indexOf(settings.tab) >= 0 ? settings.tab : 'project');
          setTimePlaying(false);
          setProjectError('');
          persist('gisProjectLoaded', true);
          announce('GIS project opened from ' + sourceLabel + '.');
        }

        function downloadProjectFile() {
          try {
            var project = projectSnapshot();
            var blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var link = document.createElement('a');
            var safeName = String(projectTitle || 'gis-project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gis-project';
            link.href = url;
            link.download = safeName + '.gisstudio.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            persist('gisProjectSaved', true);
            announce('GIS Studio project downloaded.');
          } catch (saveError) {
            setProjectError('The project could not be saved. ' + saveError.message);
          }
        }

        function readProjectFile(event) {
          var file = event.target.files && event.target.files[0];
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) { setProjectError('Choose a GIS Studio project smaller than 10 MB.'); return; }
          var reader = new FileReader();
          reader.onload = function () {
            try {
              applyProjectDocument(JSON.parse(String(reader.result || '')), file.name);
              setRecoveryDraft(null);
              setAutosaveReady(true);
            } catch (openError) {
              setProjectError(openError.message);
              announce('Project file error. ' + openError.message);
            }
          };
          reader.onerror = function () { setProjectError('That project file could not be read.'); };
          reader.readAsText(file);
        }

        function restoreLocalDraft() {
          if (!recoveryDraft) return;
          try {
            applyProjectDocument(recoveryDraft, 'device-local autosave');
            setRecoveryDraft(null);
            setAutosaveReady(true);
            setAutosaveStatus('Recovered draft restored; autosave resumed.');
          } catch (restoreError) { setProjectError(restoreError.message); }
        }

        function discardLocalDraft() {
          try { window.localStorage.removeItem(GIS_DRAFT_KEY); } catch (ignoreRemoval) {}
          setRecoveryDraft(null);
          setAutosaveReady(true);
          setAutosaveStatus('Previous local draft discarded; autosave resumed.');
          announce('Previous local draft discarded.');
        }

        function updateProvenance(key, value) {
          var next = Object.assign({}, provenance);
          next[key] = value;
          setProvenance(normalizeProvenance(next));
        }

        function roundPrivateCoordinates() {
          setImportedRows(roundPointCoordinates(importedRows, privacyDigits));
          setTimeDataset(function (previous) {
            var rows = roundPointCoordinates(previous.rows || [], privacyDigits);
            return Object.assign({}, previous, { rows: rows });
          });
          setProjectError('');
          announce('Imported and timeline point coordinates rounded to ' + privacyDigits + ' decimal places. GeoJSON boundaries were not changed.');
        }

        function loadTimeSeries() {
          try {
            var parsed = parseTimeCSV(timeText);
            setTimeDataset(parsed);
            setTimeBaseline(parsed.years[0]);
            setTimeFocusYear(parsed.years[parsed.years.length - 1]);
            setTimePlaying(false);
            setTimeError(parsed.duplicates.length ? 'Duplicate location-year rows: ' + parsed.duplicates.join(', ') + '. The last duplicate is used for change calculations.' : '');
            persist('gisTimelineAnalyzed', true);
            announce(parsed.rows.length + ' time-series records across ' + parsed.years.length + ' years loaded.');
          } catch (problem) {
            setTimeError(problem.message);
            announce('Time-series CSV error. ' + problem.message);
          }
        }

        function readTimeFile(event) {
          var file = event.target.files && event.target.files[0];
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) { setTimeError('Choose a time-series CSV smaller than 2 MB.'); return; }
          var reader = new FileReader();
          reader.onload = function () { setTimeText(String(reader.result || '')); setTimeError(''); };
          reader.onerror = function () { setTimeError('That time-series file could not be read.'); };
          reader.readAsText(file);
        }

        function toggleTimelinePlayback() {
          if (!timePlaying && effectiveFocusYear === timeYears[timeYears.length - 1]) setTimeFocusYear(timeYears[0]);
          setTimePlaying(!timePlaying);
          persist('gisTimelineAnalyzed', true);
          announce(timePlaying ? 'Timeline paused.' : 'Timeline playback started.');
        }

        function sonifyTemporalChange() {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx || !temporalComplete.length) { announce('No complete changes are available to sonify.'); return; }
          var ac;
          try { ac = new Ctx(); } catch (ignore) { return; }
          var maxAbs = Math.max.apply(Math, temporalComplete.map(function (row) { return Math.abs(row.change); })) || 1;
          temporalComplete.slice().sort(function (a, b) { return a.change - b.change; }).forEach(function (row, index) {
            var oscillator = ac.createOscillator(), gain = ac.createGain(), start = ac.currentTime + index * 0.18;
            oscillator.type = row.change < 0 ? 'sawtooth' : 'sine';
            oscillator.frequency.value = 440 + row.change / maxAbs * 260;
            gain.gain.setValueAtTime(0.045, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
            oscillator.connect(gain); gain.connect(ac.destination);
            oscillator.start(start); oscillator.stop(start + 0.15);
          });
          announce('Playing changes from the largest decrease to the largest increase.');
        }

        function timeEvidenceModel() {
          return {
            title: 'GIS Studio Change-Over-Time Evidence Report',
            generated: new Date().toLocaleString(),
            observation: timeObservation || 'Add a claim comparing the baseline and focus years.',
            analysis: temporalSummary + (temporalResult.warnings.length ? ' Data warnings: ' + temporalResult.warnings.join(' ') : ''),
            sources: (timeDataset.sources.length ? timeDataset.sources.join('; ') : 'Learner-imported time-series data') +
              '. Compare collection methods, units, definitions, and missing records before interpreting change.',
            left: {
              label: 'Baseline year ' + effectiveBaseline, basemap: 'OpenStreetMap',
              rows: baselineSnapshot.map(function (row) { return { name: row.name, geometry: 'Point', lat: row.lat, lon: row.lon, value: row.value }; })
            },
            right: {
              label: 'Focus year ' + effectiveFocusYear, basemap: 'OpenStreetMap',
              rows: focusSnapshot.map(function (row) { return { name: row.name, geometry: 'Point', lat: row.lat, lon: row.lon, value: row.value }; })
            },
            selected: []
          };
        }

        function downloadTimeEvidence() {
          var html = buildEvidenceReport(timeEvidenceModel());
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url;
          link.download = 'gis-change-' + effectiveBaseline + '-to-' + effectiveFocusYear + '.html';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          persist('gisTimelineAnalyzed', true);
          persist('gisTimelineExported', true);
          announce('Accessible change-over-time evidence report downloaded.');
        }

        function saveMissionProgress(missionId, stepId, checked) {
          var next = Object.assign({}, missionProgress);
          next[missionId] = Object.assign({}, next[missionId] || {});
          next[missionId][stepId] = checked;
          setMissionProgress(next);
          persist('gisMissionProgress', next);
          persist('gisMissionStarted', true);
          var mission = GIS_MISSIONS.filter(function (item) { return item.id === missionId; })[0];
          if (missionCompletion(mission, next[missionId]).percent === 100) persist('gisMissionCompleted', true);
        }

        function saveMissionResponse(missionId, value) {
          var next = Object.assign({}, missionResponses);
          next[missionId] = value;
          setMissionResponses(next);
          persist('gisMissionResponses', next);
          persist('gisMissionStarted', true);
        }

        function prepareMission(mission) {
          setSource('sample');
          setAnalysisPoints([]);
          setAnalysisSelection([]);
          setAnalysisSelectionSource('none');
          if (mission.id === 'coast-connectivity') {
            setCompareLeft('point:density');
            setCompareRight('point:access');
            setCompareLeftBasemap('street');
            setCompareRightBasemap('satellite');
            setTab('compare');
            persist('gisTab', 'compare');
            persist('gisCompared', true);
          } else if (mission.id === 'service-area') {
            setMetric('access');
            setAnalysisMode('buffer');
            setBufferRadiusKm(75);
            setLayers(function (previous) { return Object.assign({}, previous, { points: true }); });
            setTab('map');
            persist('gisTab', 'map');
            persist('gisMetric', 'access');
          } else {
            var parsed = parseGeoJSON(EXAMPLE_GEOJSON);
            setGeoData(parsed.data);
            setGeoKeys(parsed.numericKeys);
            setGeoMetric(parsed.numericKeys.indexOf('index') >= 0 ? 'index' : parsed.numericKeys[0]);
            setGeoNameKey(parsed.nameKey);
            setSelectedFeatureIndex(0);
            setLayers(function (previous) { return Object.assign({}, previous, { points: true, polygons: true }); });
            setTab('map');
            persist('gisTab', 'map');
            persist('gisGeoJSONImported', true);
          }
          saveMissionProgress(mission.id, 'setup', true);
          persist('gisActiveMission', mission.id);
          announce(mission.title + ' prepared. ' + (mission.workspace === 'compare' ? 'Comparison workspace opened.' : 'Map workspace opened.'));
        }

        function missionEvidenceModel(mission) {
          var base = makeEvidenceModel();
          var completion = missionCompletion(mission, missionProgress[mission.id] || {});
          base.title = mission.title + ' - GIS Inquiry Evidence';
          base.observation = missionResponses[mission.id] || mission.evidencePrompt;
          base.analysis = mission.question + ' Progress: ' + completion.complete + ' of ' + completion.total + ' investigation steps complete. ' + base.analysis;
          base.sources += ' This mission uses classroom learning data; verify any real-world claim with current authoritative data.';
          return base;
        }

        function downloadMissionEvidence(mission) {
          var html = buildEvidenceReport(missionEvidenceModel(mission));
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url;
          link.download = 'gis-mission-' + mission.id + '.html';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          persist('gisMissionCompleted', true);
          persist('gisEvidenceExported', true);
          announce(mission.title + ' evidence report downloaded.');
        }

        function makeEvidenceModel() {
          return {
            title: 'GIS Studio Geographic Evidence Report',
            generated: new Date().toLocaleString(),
            observation: comparisonObservation || 'Compare the mapped patterns, then add a claim supported by at least two pieces of evidence.',
            analysis: summary + (selectedRecords.length ? ' Spatial analysis selected ' + selectedRecords.length + ' mapped points.' : ''),
            sources: imported ? 'Point data were imported locally by the learner. Basemaps: OpenStreetMap and Esri World Imagery.' :
              'Maine learning data include rounded population-density approximations and an illustrative broadband-access index. Basemaps: OpenStreetMap and Esri World Imagery.',
            left: Object.assign({}, leftSeries, { label: comparisonLabel(leftChoice), basemap: compareLeftBasemap === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap' }),
            right: Object.assign({}, rightSeries, { label: comparisonLabel(rightChoice), basemap: compareRightBasemap === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap' }),
            selected: selectedRecords.map(function (record) {
              return { name: record.name, lat: record.lat, lon: record.lon, value: valueOf(record, metric, imported) };
            })
          };
        }

        function downloadEvidenceReport() {
          var html = buildEvidenceReport(makeEvidenceModel());
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url;
          link.download = 'gis-studio-evidence-report.html';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          persist('gisEvidenceExported', true);
          announce('Accessible GIS evidence report downloaded.');
        }

        function printEvidenceReport() {
          var reportWindow = window.open('', '_blank');
          if (!reportWindow) {
            announce('The print window was blocked. Download the accessible report instead.');
            return;
          }
          reportWindow.opener = null;
          reportWindow.document.open();
          reportWindow.document.write(buildEvidenceReport(makeEvidenceModel()));
          reportWindow.document.close();
          reportWindow.focus();
          window.setTimeout(function () { reportWindow.print(); }, 250);
          persist('gisEvidenceExported', true);
          announce('Print-ready GIS evidence report opened.');
        }

        function comparisonTable(series, side) {
          var stats = seriesStats(series);
          return h('section', { 'aria-labelledby': 'gis-compare-' + side + '-table-heading', style: Object.assign({}, panel, { overflow: 'hidden' }) },
            h('h2', { id: 'gis-compare-' + side + '-table-heading', style: { margin: '0 0 4px', color: '#f0fdfa', fontSize: 15 } }, side === 'left' ? 'Left-map table twin' : 'Right-map table twin'),
            h('p', { style: { margin: '0 0 9px', color: '#a7c7d8', fontSize: 11 } },
              series.label + ': ' + stats.count + ' records' + (stats.mean == null ? '.' : ', range ' + stats.min + ' to ' + stats.max + ', mean ' + stats.mean.toFixed(1) + '.')),
            h('div', { style: { overflowX: 'auto', maxHeight: 320, overflowY: 'auto' } },
              h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } },
                h('caption', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' } }, side + ' map values for ' + series.label),
                h('thead', null, h('tr', null, ['Location or feature', 'Geometry', 'Latitude', 'Longitude', 'Value'].map(function (heading) {
                  return h('th', { key: heading, scope: 'col', style: { textAlign: 'left', padding: 7, color: '#67e8f9', borderBottom: '1px solid #3f6b82', position: 'sticky', top: 0, background: '#102536' } }, heading);
                }))),
                h('tbody', null, series.rows.map(function (row, index) {
                  return h('tr', { key: index },
                    h('th', { scope: 'row', style: { textAlign: 'left', padding: 7, color: '#fff', borderBottom: '1px solid #1e4154' } }, row.name),
                    h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, row.geometry),
                    h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, Number.isFinite(Number(row.lat)) ? Number(row.lat).toFixed(3) : '—'),
                    h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, Number.isFinite(Number(row.lon)) ? Number(row.lon).toFixed(3) : '—'),
                    h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154', fontWeight: 800 } }, row.value == null ? 'No data' : String(row.value)));
                })))));
        }

        function comparisonView() {
          var leftStats = seriesStats(leftSeries), rightStats = seriesStats(rightSeries);
          function sideControls(side, choice, setChoice, base, setBase) {
            return h('fieldset', { style: Object.assign({}, panel, { margin: 0 }) },
              h('legend', { style: { color: '#67e8f9', fontWeight: 900, padding: '0 5px' } }, side + ' map'),
              h('label', { style: { display: 'grid', gap: 5, fontSize: 12, marginBottom: 9 } }, 'Data layer',
                h('select', { value: choice, onChange: function (event) { setChoice(event.target.value); persist(side === 'Left' ? 'gisCompareLeft' : 'gisCompareRight', event.target.value); persist('gisCompared', true); }, style: control },
                  comparisonChoices.map(function (option) { return h('option', { key: option.value, value: option.value }, option.label); }))),
              h('label', { style: { display: 'grid', gap: 5, fontSize: 12 } }, 'Basemap',
                h('select', { value: base, onChange: function (event) { setBase(event.target.value); persist(side === 'Left' ? 'gisCompareLeftBasemap' : 'gisCompareRightBasemap', event.target.value); persist('gisCompared', true); }, style: control },
                  h('option', { value: 'street' }, 'Street map'),
                  h('option', { value: 'satellite' }, 'Satellite imagery'))));
          }
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-compare-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'SAME PLACE • DIFFERENT LENS'),
              h('h2', { id: 'gis-compare-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 19 } }, 'Synchronized map comparison'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.5 } }, 'Change either layer or basemap. Pan and zoom one map; the other follows so scale and extent stay comparable.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 10, marginTop: 12 } },
                sideControls('Left', leftChoice, setCompareLeft, compareLeftBasemap, setCompareLeftBasemap),
                sideControls('Right', rightChoice, setCompareRight, compareRightBasemap, setCompareRightBasemap))),
            h('section', { 'aria-label': 'Synchronized comparison maps', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 12 } },
              h('div', null,
                h('h3', { style: { margin: '0 0 6px', color: '#67e8f9', fontSize: 13 } }, 'Left: ' + comparisonLabel(leftChoice)),
                h('div', { ref: compareLeftNode, tabIndex: 0, role: 'application', 'aria-label': 'Left interactive comparison map showing ' + comparisonLabel(leftChoice), style: { height: 390, borderRadius: 14, overflow: 'hidden', border: '1px solid #28516a', background: '#071827' } }),
                h('p', { style: { color: '#a7c7d8', fontSize: 10 } }, 'Legend: low teal → high rose. ' + leftStats.count + ' records.')),
              h('div', null,
                h('h3', { style: { margin: '0 0 6px', color: '#67e8f9', fontSize: 13 } }, 'Right: ' + comparisonLabel(rightChoice)),
                h('div', { ref: compareRightNode, tabIndex: 0, role: 'application', 'aria-label': 'Right interactive comparison map showing ' + comparisonLabel(rightChoice), style: { height: 390, borderRadius: 14, overflow: 'hidden', border: '1px solid #28516a', background: '#071827' } }),
                h('p', { style: { color: '#a7c7d8', fontSize: 10 } }, 'Legend: low teal → high rose. ' + rightStats.count + ' records.'))),
            h('p', { role: 'status', style: { margin: 0, color: '#a7c7d8', fontSize: 11 } }, compareStatus),
            h('section', { 'aria-labelledby': 'gis-evidence-heading', style: panel },
              h('h2', { id: 'gis-evidence-heading', style: { margin: '0 0 6px', color: '#f0fdfa', fontSize: 16 } }, 'Evidence builder'),
              h('label', { style: { display: 'grid', gap: 6, color: '#e6fffb', fontSize: 12, fontWeight: 700 } }, 'Observation or claim',
                h('textarea', { value: comparisonObservation, onChange: function (event) { setComparisonObservation(event.target.value); }, rows: 3, placeholder: 'I observe... Evidence from the left map... Evidence from the right map... A limitation is...', style: { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid #3f6b82', background: '#071827', color: '#fff' } })),
              h('p', { style: { margin: '8px 0', color: '#fcd34d', fontSize: 10 } }, 'Describe what the maps show. Treat explanations as hypotheses unless other evidence supports causation.'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: downloadEvidenceReport, style: primary }, 'Download accessible report'),
                h('button', { type: 'button', onClick: printEvidenceReport, style: Object.assign({}, primary, { background: '#155e75' }) }, 'Print or save as PDF'))),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 12 } },
              comparisonTable(leftSeries, 'left'), comparisonTable(rightSeries, 'right')));
        }

        function projectView() {
          var inventory = [
            importedRows.length + ' imported point records',
            geoFeatures.length + ' GeoJSON features',
            timeDataset.rows.length + ' time-series records across ' + timeDataset.years.length + ' years',
            Object.keys(missionProgress).length + ' missions with saved progress'
          ];
          var provenanceFields = [
            ['datasetTitle', 'Dataset title', 'Example: Maine broadband access study'],
            ['source', 'Source or organization', 'Agency, class survey, or URL'],
            ['collected', 'Collection date or period', 'Example: 2020-2025'],
            ['units', 'Units', 'Example: percent, people per square mile'],
            ['method', 'Collection or processing method', 'How were values measured or transformed?'],
            ['license', 'License or reuse terms', 'Example: public domain or CC BY 4.0'],
            ['limitations', 'Known limitations', 'Missing data, scale, uncertainty, definitions...']
          ];
          return h('div', { style: { display: 'grid', gap: 14 } },
            recoveryDraft && h('section', { 'aria-labelledby': 'gis-recovery-heading', style: { padding: 14, borderRadius: 12, border: '2px solid #f59e0b', background: '#2b2617' } },
              h('h2', { id: 'gis-recovery-heading', style: { margin: '0 0 5px', color: '#fde68a', fontSize: 16 } }, 'Recover a local draft?'),
              h('p', { style: { margin: '0 0 10px', color: '#fef3c7', fontSize: 12 } }, 'A device-local draft named "' + recoveryDraft.title + '" was saved ' + recoveryDraft.savedAt + '. Autosave is paused until you choose.'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', { type: 'button', onClick: restoreLocalDraft, style: primary }, 'Restore draft'),
                h('button', { type: 'button', onClick: discardLocalDraft, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Discard draft'))),
            h('section', { 'aria-labelledby': 'gis-project-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'PORTABLE CLASSROOM WORK'),
              h('h2', { id: 'gis-project-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, 'Save, reopen, and recover projects'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } }, 'Project files preserve normalized datasets, layers, analysis settings, timelines, mission work, and provenance. Raw pasted CSV text is intentionally excluded.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 10, marginTop: 13 } },
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'Project name',
                  h('input', { type: 'text', value: projectTitle, maxLength: 200, onChange: function (event) { setProjectTitle(event.target.value); }, style: control })),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'Open GIS Studio project',
                  h('input', { type: 'file', accept: '.json,.gisstudio.json,application/json', onChange: readProjectFile }))),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 } },
                h('button', { type: 'button', onClick: downloadProjectFile, style: primary }, 'Download project file'),
                h('button', { type: 'button', onClick: function () { setTab('map'); persist('gisTab', 'map'); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Return to map')),
              h('p', { role: 'status', style: { margin: '10px 0 0', color: '#a7c7d8', fontSize: 11 } }, autosaveStatus),
              projectError && h('p', { role: 'alert', style: { margin: '10px 0 0', padding: 9, borderRadius: 8, background: '#7f1d1d', color: '#fecaca' } }, projectError)),
            h('section', { 'aria-labelledby': 'gis-provenance-heading', style: panel },
              h('h2', { id: 'gis-provenance-heading', style: { margin: '0 0 5px', color: '#f0fdfa', fontSize: 16 } }, 'Data provenance manifest'),
              h('p', { style: { margin: '0 0 11px', color: '#a7c7d8', fontSize: 11 } }, 'These fields travel with the project and help another reader judge whether the data and comparisons are appropriate.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 } },
                provenanceFields.map(function (field) {
                  var multiline = field[0] === 'method' || field[0] === 'limitations';
                  return h('label', { key: field[0], style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } },
                    field[1],
                    multiline
                      ? h('textarea', { value: provenance[field[0]], rows: 3, placeholder: field[2], onChange: function (event) { updateProvenance(field[0], event.target.value); }, style: Object.assign({}, control, { resize: 'vertical' }) })
                      : h('input', { type: 'text', value: provenance[field[0]], placeholder: field[2], onChange: function (event) { updateProvenance(field[0], event.target.value); }, style: control }));
                }))),
            h('section', { 'aria-labelledby': 'gis-project-inventory-heading', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 } },
              h('div', { style: panel },
                h('h2', { id: 'gis-project-inventory-heading', style: { margin: '0 0 8px', color: '#f0fdfa', fontSize: 16 } }, 'Project inventory'),
                h('ul', { style: { margin: 0, paddingLeft: 18, color: '#dbeafe', fontSize: 11, lineHeight: 1.7 } },
                  inventory.map(function (item) { return h('li', { key: item }, item); })),
                h('h3', { style: { margin: '13px 0 6px', color: '#67e8f9', fontSize: 12 } }, 'Recorded transformations'),
                h('ul', { style: { margin: 0, paddingLeft: 18, color: '#dbeafe', fontSize: 11, lineHeight: 1.7 } },
                  projectTransformations.map(function (item) { return h('li', { key: item }, item); }))),
              h('div', { style: panel },
                h('h2', { style: { margin: '0 0 8px', color: '#f0fdfa', fontSize: 16 } }, 'Coordinate privacy review'),
                h('p', { role: 'status', style: { margin: '0 0 8px', color: privacyAssessment.highPrecision || privacyAssessment.identifierWarnings ? '#fde68a' : '#86efac', fontSize: 12, lineHeight: 1.5 } },
                  privacyAssessment.total + ' imported or timeline point rows checked. ' +
                  privacyAssessment.highPrecision + ' use 4 or more decimal places; ' +
                  privacyAssessment.identifierWarnings + ' have identifier-like labels.'),
                (privacyAssessment.highPrecision > 0 || privacyAssessment.identifierWarnings > 0) && h('details', { style: { color: '#cfe8f3', fontSize: 11, marginBottom: 10 } },
                  h('summary', { style: { cursor: 'pointer', fontWeight: 800 } }, 'Review flagged point labels'),
                  privacyAssessment.highPrecisionNames.length > 0 && h('p', null, 'High precision: ' + privacyAssessment.highPrecisionNames.join(', ')),
                  privacyAssessment.identifierNames.length > 0 && h('p', null, 'Identifier-like labels: ' + privacyAssessment.identifierNames.join(', '))),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 } }, 'Round point coordinates to',
                  h('select', { value: privacyDigits, onChange: function (event) { setPrivacyDigits(Number(event.target.value)); }, style: control },
                    h('option', { value: 2 }, '2 decimal places (about 1 km)'),
                    h('option', { value: 3 }, '3 decimal places (about 100 m)'),
                    h('option', { value: 4 }, '4 decimal places (about 10 m)'))),
                h('button', { type: 'button', onClick: roundPrivateCoordinates, disabled: !importedRows.length && !timeDataset.rows.length, style: Object.assign({}, primary, { marginTop: 10, opacity: importedRows.length || timeDataset.rows.length ? 1 : 0.55 }) }, 'Round imported + timeline points'),
                h('p', { style: { margin: '10px 0 0', color: '#fcd34d', fontSize: 10, lineHeight: 1.45 } }, 'Rounding is applied to the current in-memory point datasets and will be reflected in future autosaves and downloads. GeoJSON boundaries are not changed. Review names and attributes separately.'))),
            h('aside', { style: { padding: 12, borderLeft: '4px solid #f59e0b', background: '#2b2617', color: '#fde68a', borderRadius: 8, fontSize: 11, lineHeight: 1.5 } },
              h('strong', null, 'Before sharing: '), 'Project files may contain precise locations, names, notes, and joined attributes. Confirm consent, remove identifiers, aggregate where possible, and open the saved file once to verify its contents.'));
        }

        function timelineView() {
          var baselineIndex = Math.max(0, timeYears.indexOf(effectiveBaseline));
          var focusIndex = Math.max(0, timeYears.indexOf(effectiveFocusYear));
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-timeline-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'CHANGE OVER TIME'),
              h('h2', { id: 'gis-timeline-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, 'Time-Series Change Lab'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } }, 'Compare the same locations across years. Keep the baseline fixed, move or play the focus year, and distinguish measured change from explanations that require more evidence.'),
              h('details', { style: { marginTop: 11, color: '#cfe8f3', fontSize: 11 } },
                h('summary', { style: { cursor: 'pointer', fontWeight: 800, color: '#67e8f9' } }, 'Import a time-series CSV'),
                h('p', null, 'Required headers: name, latitude, longitude, year, value. Optional: unit, source, method. Up to 3,000 valid rows stay in this browser session.'),
                h('label', { style: { display: 'grid', gap: 5, margin: '9px 0', fontWeight: 700 } }, 'Choose CSV file',
                  h('input', { type: 'file', accept: '.csv,text/csv', onChange: readTimeFile })),
                h('label', { style: { display: 'grid', gap: 5, fontWeight: 700 } }, 'Or paste time-series CSV',
                  h('textarea', { value: timeText, onChange: function (event) { setTimeText(event.target.value); setTimeError(''); }, rows: 8, spellCheck: false, style: { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid #3f6b82', background: '#071827', color: '#fff', fontFamily: 'monospace' } })),
                h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 9 } },
                  h('button', { type: 'button', onClick: loadTimeSeries, style: primary }, 'Load time series'),
                  h('button', { type: 'button', onClick: function () { setTimeText(EXAMPLE_TIME_CSV); setTimeError(''); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Restore example'))),
              timeError && h('p', { role: 'alert', style: { margin: '10px 0 0', padding: 9, borderRadius: 8, background: '#7f1d1d', color: '#fecaca' } }, timeError)),
            h('section', { 'aria-labelledby': 'gis-time-controls-heading', style: panel },
              h('h2', { id: 'gis-time-controls-heading', style: { margin: '0 0 9px', color: '#f0fdfa', fontSize: 16 } }, 'Timeline controls'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 } },
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12 } }, 'Baseline year',
                  h('select', { value: effectiveBaseline, onChange: function (event) { setTimeBaseline(Number(event.target.value)); setTimePlaying(false); persist('gisTimelineAnalyzed', true); }, style: control },
                    timeYears.map(function (year) { return h('option', { key: year, value: year }, year); }))),
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12 } }, 'Focus year: ' + effectiveFocusYear,
                  h('input', {
                    type: 'range', min: 0, max: Math.max(0, timeYears.length - 1), step: 1, value: focusIndex,
                    onChange: function (event) { setTimeFocusYear(timeYears[Number(event.target.value)]); setTimePlaying(false); persist('gisTimelineAnalyzed', true); },
                    'aria-valuetext': String(effectiveFocusYear)
                  }))),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 11 } },
                h('button', { type: 'button', onClick: function () { setTimeFocusYear(timeYears[Math.max(0, focusIndex - 1)]); setTimePlaying(false); }, disabled: focusIndex <= 0, style: Object.assign({}, control, { cursor: focusIndex <= 0 ? 'not-allowed' : 'pointer' }) }, 'Previous year'),
                h('button', { type: 'button', onClick: toggleTimelinePlayback, style: primary }, timePlaying ? 'Pause animation' : 'Play timeline'),
                h('button', { type: 'button', onClick: function () { setTimeFocusYear(timeYears[Math.min(timeYears.length - 1, focusIndex + 1)]); setTimePlaying(false); }, disabled: focusIndex >= timeYears.length - 1, style: Object.assign({}, control, { cursor: focusIndex >= timeYears.length - 1 ? 'not-allowed' : 'pointer' }) }, 'Next year'),
                h('button', { type: 'button', onClick: sonifyTemporalChange, disabled: !temporalComplete.length, style: Object.assign({}, primary, { background: '#083344', border: '1px solid #22d3ee', opacity: temporalComplete.length ? 1 : 0.55 }) }, '♫ Sonify changes')),
              h('p', { style: { margin: '9px 0 0', color: '#a7c7d8', fontSize: 10 } }, 'Sound orders locations from decrease to increase. Sawtooth tones mark decreases; sine tones mark increases.')),
            h('section', { 'aria-label': 'Synchronized before and after maps', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 12 } },
              h('div', null,
                h('h3', { style: { margin: '0 0 6px', color: '#67e8f9', fontSize: 13 } }, 'Baseline: ' + effectiveBaseline),
                h('div', { ref: timeLeftNode, tabIndex: 0, role: 'application', 'aria-label': 'Baseline interactive map for ' + effectiveBaseline, style: { height: 370, borderRadius: 14, overflow: 'hidden', border: '1px solid #28516a', background: '#071827' } })),
              h('div', null,
                h('h3', { style: { margin: '0 0 6px', color: '#67e8f9', fontSize: 13 } }, 'Focus year: ' + effectiveFocusYear),
                h('div', { ref: timeRightNode, tabIndex: 0, role: 'application', 'aria-label': 'Focus-year interactive map for ' + effectiveFocusYear, style: { height: 370, borderRadius: 14, overflow: 'hidden', border: '1px solid #28516a', background: '#071827' } }))),
            h('p', { role: 'status', style: { margin: 0, color: '#a7c7d8', fontSize: 11 } }, timeStatus),
            h('section', { 'aria-labelledby': 'gis-change-summary-heading', style: panel },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' } },
                h('div', null,
                  h('h2', { id: 'gis-change-summary-heading', style: { margin: '0 0 5px', color: '#f0fdfa', fontSize: 16 } }, 'Accessible change summary'),
                  h('p', { style: { margin: 0, color: '#cfe8f3', fontSize: 12, lineHeight: 1.5 } }, temporalSummary)),
                h('button', { type: 'button', onClick: downloadTimeEvidence, style: primary }, 'Download change evidence report')),
              temporalResult.warnings.length > 0 && h('div', { role: 'alert', style: { marginTop: 10, padding: 9, borderLeft: '4px solid #f59e0b', background: '#2b2617', color: '#fde68a', fontSize: 11 } },
                temporalResult.warnings.join(' ')),
              h('label', { style: { display: 'grid', gap: 6, marginTop: 12, color: '#e6fffb', fontSize: 12, fontWeight: 700 } }, 'Change claim or observation',
                h('textarea', { value: timeObservation, onChange: function (event) { setTimeObservation(event.target.value); }, rows: 3, placeholder: 'From the baseline to the focus year... Evidence... A limitation...', style: { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid #3f6b82', background: '#071827', color: '#fff' } })),
              h('div', { style: { overflowX: 'auto', marginTop: 12 } },
                h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } },
                  h('caption', { style: { textAlign: 'left', color: '#a7c7d8', paddingBottom: 7 } }, 'Change by location from ' + effectiveBaseline + ' to ' + effectiveFocusYear),
                  h('thead', null, h('tr', null, ['Location', 'Baseline', 'Focus year', 'Absolute change', 'Percent change', 'Trend'].map(function (heading) {
                    return h('th', { key: heading, scope: 'col', style: { textAlign: 'left', padding: 7, color: '#67e8f9', borderBottom: '1px solid #3f6b82' } }, heading);
                  }))),
                  h('tbody', null, temporalResult.rows.map(function (row) {
                    return h('tr', { key: row.name },
                      h('th', { scope: 'row', style: { textAlign: 'left', padding: 7, color: '#fff', borderBottom: '1px solid #1e4154' } }, row.name),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, row.startValue == null ? 'Missing' : row.startValue),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, row.endValue == null ? 'Missing' : row.endValue),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154', fontWeight: 800 } }, row.change == null ? 'Not calculated' : (row.change >= 0 ? '+' : '') + row.change.toFixed(1)),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, row.percent == null ? 'Not calculated' : (row.percent >= 0 ? '+' : '') + row.percent.toFixed(1) + '%'),
                      h('td', { style: { padding: 7, borderBottom: '1px solid #1e4154' } }, row.trend));
                  }))))),
            h('aside', { style: { padding: 12, borderLeft: '4px solid #f59e0b', background: '#2b2617', color: '#fde68a', borderRadius: 8, fontSize: 11, lineHeight: 1.5 } },
              h('strong', null, 'Compatibility check: '), 'A numeric difference is meaningful only when years use compatible definitions, units, geography, collection methods, and coverage. Missing records are excluded from ranked change.'));
        }

        function missionView() {
          return h('div', { style: { display: 'grid', gap: 14 } },
            h('section', { 'aria-labelledby': 'gis-missions-heading', style: panel },
              h('p', { style: { margin: 0, color: '#fde68a', fontSize: 10, fontWeight: 900, letterSpacing: '.09em' } }, 'MAINE INQUIRY SERIES'),
              h('h2', { id: 'gis-missions-heading', style: { margin: '4px 0 6px', color: '#f0fdfa', fontSize: 20 } }, 'Guided GIS missions'),
              h('p', { style: { margin: 0, color: '#b7d2df', fontSize: 12, lineHeight: 1.55 } }, 'Choose a question, prepare the right GIS workspace, gather evidence from the map or its table twin, and document what the data can and cannot support.'),
              h('div', { role: 'tablist', 'aria-label': 'Maine GIS missions', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 9, marginTop: 13 } },
                GIS_MISSIONS.map(function (mission) {
                  var active = mission.id === activeMission.id;
                  var completion = missionCompletion(mission, missionProgress[mission.id] || {});
                  return h('button', {
                    key: mission.id, type: 'button', role: 'tab', 'aria-selected': active,
                    onClick: function () { setActiveMissionId(mission.id); persist('gisActiveMission', mission.id); },
                    style: { textAlign: 'left', padding: 12, borderRadius: 10, border: '1px solid ' + (active ? '#5eead4' : '#36586b'), background: active ? '#0f766e' : '#071827', color: '#fff', cursor: 'pointer' }
                  },
                    h('strong', { style: { display: 'block', fontSize: 13 } }, mission.title),
                    h('span', { style: { display: 'block', marginTop: 4, color: active ? '#ecfeff' : '#a7c7d8', fontSize: 10 } }, mission.duration + ' - ' + completion.complete + '/' + completion.total + ' steps'));
                }))),
            h('section', { role: 'tabpanel', 'aria-labelledby': 'gis-active-mission-heading', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 } },
              h('div', { style: Object.assign({}, panel, { padding: 18 }) },
                h('p', { style: { margin: 0, color: '#67e8f9', fontSize: 10, fontWeight: 900 } }, activeMission.duration.toUpperCase()),
                h('h2', { id: 'gis-active-mission-heading', style: { margin: '5px 0 8px', color: '#f0fdfa', fontSize: 20 } }, activeMission.title),
                h('p', { style: { margin: '0 0 13px', color: '#dbeafe', fontSize: 14, lineHeight: 1.55 } }, activeMission.question),
                h('label', { style: { display: 'grid', gap: 5, color: '#a7c7d8', fontSize: 11, marginBottom: 14 } },
                  h('span', null, 'Mission progress: ' + activeMissionCompletion.complete + ' of ' + activeMissionCompletion.total + ' steps (' + activeMissionCompletion.percent + '%)'),
                  h('progress', { value: activeMissionCompletion.complete, max: activeMissionCompletion.total, style: { width: '100%', height: 16 } })),
                h('fieldset', { style: { margin: 0, padding: 12, border: '1px solid #3f6b82', borderRadius: 10 } },
                  h('legend', { style: { color: '#fde68a', fontWeight: 800, padding: '0 5px' } }, 'Investigation checklist'),
                  activeMission.steps.map(function (step) {
                    return h('label', { key: step.id, style: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', color: '#e2e8f0', fontSize: 12, lineHeight: 1.45 } },
                      h('input', { type: 'checkbox', checked: !!activeMissionProgress[step.id], onChange: function (event) { saveMissionProgress(activeMission.id, step.id, event.target.checked); } }),
                      step.label);
                  })),
                h('button', { type: 'button', onClick: function () { prepareMission(activeMission); }, style: Object.assign({}, primary, { marginTop: 13 }) },
                  activeMission.workspace === 'compare' ? 'Prepare and open comparison maps' : 'Prepare and open analysis map'),
                h('label', { style: { display: 'grid', gap: 6, marginTop: 15, color: '#e6fffb', fontSize: 12, fontWeight: 700 } }, 'Evidence response',
                  h('span', { style: { color: '#a7c7d8', fontSize: 10, fontWeight: 400, lineHeight: 1.45 } }, activeMission.evidencePrompt),
                  h('textarea', {
                    value: missionResponses[activeMission.id] || '',
                    onChange: function (event) { saveMissionResponse(activeMission.id, event.target.value); },
                    rows: 6, placeholder: 'Claim... Evidence... Reasoning... Limitation...',
                    style: { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid #3f6b82', background: '#071827', color: '#fff', lineHeight: 1.5 }
                  })),
                h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 11 } },
                  h('button', { type: 'button', onClick: function () { downloadMissionEvidence(activeMission); }, style: primary }, 'Download mission evidence report'),
                  h('button', { type: 'button', onClick: function () { setTab('missions'); persist('gisTab', 'missions'); }, style: Object.assign({}, control, { cursor: 'pointer' }) }, 'Stay with mission guide'))),
              h('aside', { 'aria-labelledby': 'gis-teacher-lens-heading', style: Object.assign({}, panel, { alignSelf: 'start' }) },
                h('h2', { id: 'gis-teacher-lens-heading', style: { margin: '0 0 7px', color: '#86efac', fontSize: 15 } }, 'Teacher lens'),
                h('p', { style: { color: '#cfe8f3', fontSize: 11, lineHeight: 1.55 } }, activeMission.teacherNote),
                h('h3', { style: { color: '#67e8f9', fontSize: 12, margin: '13px 0 6px' } }, 'Curricular practices'),
                h('ul', { style: { margin: 0, paddingLeft: 18, color: '#dbeafe', fontSize: 11, lineHeight: 1.6 } },
                  activeMission.practices.map(function (practice) { return h('li', { key: practice }, practice); })),
                h('h3', { style: { color: '#67e8f9', fontSize: 12, margin: '13px 0 6px' } }, 'Quick evidence rubric'),
                h('ol', { style: { margin: 0, paddingLeft: 18, color: '#dbeafe', fontSize: 11, lineHeight: 1.6 } },
                  h('li', null, 'Names a defensible spatial pattern.'),
                  h('li', null, 'Cites mapped or tabular evidence.'),
                  h('li', null, 'Explains a method or spatial relationship.'),
                  h('li', null, 'Names a meaningful limitation.')),
                h('p', { style: { margin: '13px 0 0', padding: 9, borderLeft: '4px solid #f59e0b', background: '#2b2617', color: '#fde68a', fontSize: 10, lineHeight: 1.45 } },
                  'The included values and simplified regions are for learning. Do not use them for public policy or resource-allocation decisions.'))));
        }

        function projectionView() {
          var scale = 1 / Math.max(0.05, Math.cos(latitude * Math.PI / 180));
          var factor = projection === 'mercator' ? scale * scale : projection === 'equirectangular' ? scale : 1;
          return h('section', { 'aria-labelledby': 'gis-projection-heading', style: Object.assign({}, panel, { maxWidth: 930, margin: '0 auto', padding: 18 }) },
            h('p', { style: { margin: 0, color: '#67e8f9', fontSize: 11, fontWeight: 800 } }, 'COORDINATES + DISTORTION'),
            h('h2', { id: 'gis-projection-heading', style: { color: '#f0fdfa', margin: '5px 0 8px' } }, 'Projection lab'),
            h('p', { style: { color: '#b7d2df', lineHeight: 1.6, fontSize: 13 } }, 'Earth is curved; screens are flat. Every projection preserves some relationships and distorts others.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(220px,300px) 1fr', gap: 18 } },
              h('div', null,
                h('label', { style: { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700, marginBottom: 15 } }, 'Projection',
                  h('select', { value: projection, onChange: function (event) { setProjection(event.target.value); persist('gisProjectionCompared', true); }, style: control },
                    h('option', { value: 'mercator' }, 'Mercator'),
                    h('option', { value: 'equirectangular' }, 'Equirectangular'),
                    h('option', { value: 'equalarea' }, 'Equal-area'))),
                h('label', { style: { display: 'grid', gap: 7, fontSize: 12, fontWeight: 700 } }, 'Latitude: ' + latitude + '\u00B0 N',
                  h('input', { type: 'range', min: 0, max: 80, step: 5, value: latitude, onChange: function (event) { setLatitude(Number(event.target.value)); }, 'aria-describedby': 'gis-factor' })),
                h('div', { id: 'gis-factor', role: 'status', style: { marginTop: 14, padding: 11, borderRadius: 9, background: '#071827', color: '#cffafe' } },
                  h('strong', { style: { display: 'block', color: '#67e8f9', fontSize: 18 } }, factor.toFixed(2) + '\u00D7 visual area'),
                  projection === 'mercator' ? 'Preserves local angles; enlarges high latitudes.' : projection === 'equirectangular' ? 'Maps coordinates directly; stretches east-west distance.' : 'Preserves relative area; changes shape and angle.')),
              h('svg', { viewBox: '0 0 560 300', role: 'img', 'aria-label': projection + ' distortion diagram at ' + latitude + ' degrees. Area factor ' + factor.toFixed(2), style: { width: '100%', minHeight: 280, background: '#071827', borderRadius: 12 } },
                [0, 1, 2, 3, 4, 5, 6].map(function (n) { return h('line', { key: 'v' + n, x1: 40 + n * 80, x2: 40 + n * 80, y1: 30, y2: 260, stroke: '#294457' }); }),
                [0, 1, 2, 3, 4].map(function (n) { return h('line', { key: 'h' + n, x1: 40, x2: 520, y1: 30 + n * 57.5, y2: 30 + n * 57.5, stroke: '#294457' }); }),
                h('ellipse', { cx: 280, cy: 145, rx: Math.min(86, 20 * (projection === 'equalarea' ? 1 / Math.sqrt(scale) : scale)), ry: Math.min(86, 20 * (projection === 'equalarea' ? Math.sqrt(scale) : scale)), fill: 'rgba(34,211,238,.25)', stroke: '#67e8f9', strokeWidth: 4 }),
                h('text', { x: 280, y: 286, textAnchor: 'middle', fill: '#a7c7d8', fontSize: 12 }, 'Tissot indicatrix: one equal patch of ground'))),
            h('p', { style: { color: '#b7d2df', fontSize: 12, lineHeight: 1.5 } },
              h('strong', { style: { color: '#86efac' } }, 'Choose intentionally: '),
              'Mercator for local direction, equirectangular for simple coordinate grids, and equal-area for choropleth comparisons.'));
        }

        var tabs = [['project', 'Project'], ['missions', 'Maine missions'], ['timeline', 'Change over time'], ['map', 'Map + layers'], ['compare', 'Compare + export'], ['import', 'Import data'], ['projection', 'Projection lab']];
        return h('div', { 'data-gis-studio': 'true', style: { minHeight: '100%', background: 'linear-gradient(155deg,#06131f,#0b2531 52%,#102332)', color: '#e2e8f0', padding: 16, boxSizing: 'border-box', fontFamily: 'Inter,system-ui,sans-serif' } },
          h('header', { style: { maxWidth: 1180, margin: '0 auto 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' } },
            h('div', null,
              h('p', { style: { margin: 0, color: '#5eead4', fontSize: 11, fontWeight: 900, letterSpacing: '.11em' } }, 'SPATIAL DATA LABORATORY'),
              h('h1', { style: { margin: '4px 0 3px', color: '#f0fdfa', fontSize: 26 } }, 'GIS Studio'),
              h('p', { style: { margin: 0, color: '#a7c7d8', fontSize: 12 } }, 'Layer it. Map it. Question the pattern.')),
            h('nav', { 'aria-label': 'GIS Studio sections', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              tabs.map(function (item) {
                var active = tab === item[0];
                return h('button', { key: item[0], type: 'button', onClick: function () { go(item[0]); }, 'aria-current': active ? 'page' : undefined, style: { padding: '9px 12px', borderRadius: 9, border: '1px solid ' + (active ? '#5eead4' : '#36586b'), background: active ? '#0f766e' : '#102536', color: '#fff', fontWeight: 800, cursor: 'pointer' } }, item[1]);
              }))),
          h('main', { style: { maxWidth: 1180, margin: '0 auto' } }, tab === 'project' ? projectView() : tab === 'missions' ? missionView() : tab === 'timeline' ? timelineView() : tab === 'map' ? mapView() : tab === 'compare' ? comparisonView() : tab === 'import' ? importView() : projectionView()),
          h('footer', { style: { maxWidth: 1180, margin: '14px auto 0', color: '#8ba7b7', fontSize: 10, lineHeight: 1.5 } },
            'Learning data: density values are rounded approximations; the access index, practice polygons, and coastal guide are illustrative. Basemaps \u00A9 OpenStreetMap, Esri, and contributors. Official ecoregions \u00A9 Maine Natural Areas Program. Verify claims with authoritative data before making decisions.'));
      }

      return h(Studio);
    }
  });
})();
