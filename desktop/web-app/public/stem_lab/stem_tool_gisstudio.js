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
    desc: 'Build thematic maps, measure paths and boundaries, run buffers and spatial selections, import data, and investigate geographic patterns accessibly.',
    color: 'teal',
    category: 'geo',
    aliases: ['GIS', 'mapping', 'spatial data', 'spatial analysis', 'buffer', 'choropleth', 'coordinates', 'map projections'],
    testing: {
      parseCSV: parseCSV, parseGeoJSON: parseGeoJSON, parseTableCSV: parseTableCSV,
      joinTableToGeoJSON: joinTableToGeoJSON, calculateBreaks: calculateBreaks,
      haversineKm: haversineKm, pathLengthKm: pathLengthKm, polygonAreaSquareKm: polygonAreaSquareKm,
      pointInFeature: pointInFeature, selectPointsInFeature: selectPointsInFeature,
      selectWithinRadius: selectWithinRadius, nearestRecord: nearestRecord, featureMeasurements: featureMeasurements
    },
    questHooks: [
      { id: 'import_data', label: 'Map your own coordinate data', icon: '\uD83D\uDCE5', check: function (d) { return !!d.gisImported; }, progress: function (d) { return d.gisImported ? 'Mapped' : 'Not yet'; } },
      { id: 'polygon_layer', label: 'Build a GeoJSON choropleth', icon: '\uD83C\uDFA8', check: function (d) { return !!d.gisGeoJSONImported; }, progress: function (d) { return d.gisGeoJSONImported ? 'Mapped' : 'Not yet'; } },
      { id: 'join_layer', label: 'Join a CSV to map boundaries', icon: '\uD83D\uDD17', check: function (d) { return !!d.gisJoinApplied; }, progress: function (d) { return d.gisJoinApplied ? 'Joined' : 'Not yet'; } },
      { id: 'spatial_analysis', label: 'Run a spatial analysis', icon: '\uD83D\uDCCF', check: function (d) { return !!d.gisSpatialAnalysis; }, progress: function (d) { return d.gisSpatialAnalysis ? 'Analyzed' : 'Not yet'; } },
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
        var mapNode = React.useRef(null);
        var mapViewState = React.useRef(null);

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

        function formatDistance(km) {
          return analysisUnit === 'imperial' ? (km * 0.621371).toFixed(2) + ' mi' : km.toFixed(2) + ' km';
        }

        function formatArea(squareKm) {
          return analysisUnit === 'imperial' ? (squareKm * 0.386102).toFixed(2) + ' mi\u00B2' : squareKm.toFixed(2) + ' km\u00B2';
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

        function go(next) {
          setTab(next); persist('gisTab', next);
          if (next === 'projection') persist('gisProjectionCompared', true);
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

        var tabs = [['map', 'Map + layers'], ['import', 'Import data'], ['projection', 'Projection lab']];
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
          h('main', { style: { maxWidth: 1180, margin: '0 auto' } }, tab === 'map' ? mapView() : tab === 'import' ? importView() : projectionView()),
          h('footer', { style: { maxWidth: 1180, margin: '14px auto 0', color: '#8ba7b7', fontSize: 10, lineHeight: 1.5 } },
            'Learning data: density values are rounded approximations; the access index, practice polygons, and coastal guide are illustrative. Basemaps \u00A9 OpenStreetMap, Esri, and contributors. Official ecoregions \u00A9 Maine Natural Areas Program. Verify claims with authoritative data before making decisions.'));
      }

      return h(Studio);
    }
  });
})();
