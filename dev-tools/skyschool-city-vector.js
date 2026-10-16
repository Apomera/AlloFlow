// Bounded OpenMapTiles adapter. The pinned local decoder is embedded before this file.
// Rendering copies only whole buildings inside a tile core, so clipped courtyards
// and duplicate buffer copies never become false walls. Roads are clipped to cores.
function convertFlightCityVectorTiles(tiles, options) {
  var converter = createFlightCityConverter(options); // Validate the destination before decoding.
  if (!Array.isArray(tiles) || !tiles.length || tiles.length > 9) throw new Error('City vector tile count exceeds its budget.');
  var byteBudget = 12 * 1024 * 1024, bytes = 0, decodedPoints = 0, fieldsRead = 0, featuresRead = 0;
  var acceptedPoints = 0, elements = [], sourceIds = new Map(), nextId = 1;
  // Dense tile multipolygons can contain tens of thousands of valid houses.
  // Keep a bounded pool near the destination before invoking topology validation;
  // output caps should degrade detail, not turn a busy city into a load failure.
  var buildingPool = { items: [], coordinates: 0, countLimit: 6000, coordinateLimit: 150000, kind: 'building' };
  var roadPool = { items: [], coordinates: 0, countLimit: 3000, coordinateLimit: 50000, kind: 'road' };
  var omissions = {}, buildingKeys = new Set(), roadKeys = new Set(), seenTiles = new Set();
  var bbox = options.bbox, centerLon = options.lon;
  while (centerLon < bbox[1]) centerLon += 360;
  while (centerLon > bbox[3]) centerLon -= 360;
  function omit(reason) { omissions[reason] = (omissions[reason] || 0) + 1; }
  function uint(data, cursor, end, allow64) {
    var value = 0, factor = 1;
    for (var i = 0; i < (allow64 ? 10 : 5); i++) {
      if (cursor.pos >= end) throw new Error('Truncated city vector data.');
      var byte = data[cursor.pos++];
      if (!allow64 && i === 4 && byte > 15 || allow64 && i === 9 && byte > 1) throw new Error('Invalid city vector integer.');
      value += (byte & 127) * factor;
      if (!(byte & 128)) return value;
      factor *= 128;
    }
    throw new Error('Invalid city vector integer.');
  }
  function fields(data, start, end) {
    var cursor = { pos: start }, result = [];
    while (cursor.pos < end) {
      if (++fieldsRead > 2000000) throw new Error('City vector field budget exceeded.');
      var begin = cursor.pos, tag = uint(data, cursor, end), wire = tag & 7, number = Math.floor(tag / 8), value;
      if (!number) throw new Error('Invalid city vector field.');
      var payload = cursor.pos;
      if (wire === 0) value = uint(data, cursor, end, true);
      else if (wire === 1) cursor.pos += 8;
      else if (wire === 5) cursor.pos += 4;
      else if (wire === 2) { var length = uint(data, cursor, end); payload = cursor.pos; cursor.pos += length; }
      else throw new Error('Unsupported city vector field.');
      if (cursor.pos > end) throw new Error('Truncated city vector field.');
      result.push({ tag: number, wire: wire, begin: begin, start: payload, end: cursor.pos, value: value });
    }
    return result;
  }
  var decoder = new TextDecoder('utf-8', { fatal: true });
  function string(data, field, max) {
    if (field.wire !== 2 || field.end - field.start > max) throw new Error('Invalid city vector text.');
    return decoder.decode(data.subarray(field.start, field.end));
  }
  function geometry(data, field, type, extent) {
    if (field.wire !== 2) throw new Error('Invalid city vector geometry.');
    var cursor = { pos: field.start }, points = 0, open = false, closed = false, x = 0, y = 0;
    while (cursor.pos < field.end) {
      var command = uint(data, cursor, field.end), operation = command & 7, count = Math.floor(command / 8);
      if (!count || count > 1000000) throw new Error('Invalid city vector geometry command.');
      if (operation === 1 || operation === 2) {
        if (operation === 1) {
          if (type !== 1 && count !== 1 || type === 3 && open && !closed || type === 2 && open && points < 2) throw new Error('Invalid city vector geometry order.');
          points = 0; open = true; closed = false;
        } else if (!open || closed || type === 1) throw new Error('Invalid city vector geometry order.');
        decodedPoints += count; points += count;
        if (decodedPoints > 1000000) throw new Error('City vector coordinate budget exceeded.');
        for (var i = 0; i < count; i++) {
          var dx = uint(data, cursor, field.end), dy = uint(data, cursor, field.end);
          x += dx % 2 ? -(dx + 1) / 2 : dx / 2;
          y += dy % 2 ? -(dy + 1) / 2 : dy / 2;
          if (x < -extent || x > extent * 2 || y < -extent || y > extent * 2) throw new Error('City vector geometry exceeds its tile buffer.');
        }
      } else if (operation === 7) {
        if (type !== 3 || count !== 1 || !open || closed || points < 3) throw new Error('Invalid city vector polygon closure.');
        closed = true;
      } else throw new Error('Unsupported city vector geometry command.');
    }
    if (!open || type === 3 && !closed || type === 2 && points < 2) throw new Error('Incomplete city vector geometry.');
  }
  function safeLayers(data) {
    var top = fields(data, 0, data.length), selected = [], names = new Set();
    if (top.length > 64) throw new Error('City vector layer budget exceeded.');
    for (var field of top) {
      if (field.tag !== 3) continue;
      if (field.wire !== 2) throw new Error('Invalid city vector layer.');
      var layerFields = fields(data, field.start, field.end), nameFields = layerFields.filter(function(item) { return item.tag === 1; });
      if (nameFields.length !== 1) throw new Error('Invalid city vector layer name.');
      var name = string(data, nameFields[0], 100);
      if (name !== 'building' && name !== 'transportation') continue;
      if (names.has(name)) throw new Error('Duplicate city vector layer.');
      names.add(name);
      var keys = [], values = [], featureFields = [], extent = 4096;
      for (var item of layerFields) {
        if (item.tag === 3) {
          var key = string(data, item, 256);
          if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Invalid city vector property key.');
          keys.push(key);
        } else if (item.tag === 4) {
          if (item.wire !== 2) throw new Error('Invalid city vector value.');
          var valueFields = fields(data, item.start, item.end);
          if (valueFields.length !== 1) throw new Error('Invalid city vector value.');
          var value = valueFields[0], wire = value.tag === 1 ? 2 : value.tag === 2 ? 5 : value.tag === 3 ? 1 : value.tag >= 4 && value.tag <= 7 ? 0 : -1;
          if (value.wire !== wire || value.end - value.start > 4096) throw new Error('Unsupported city vector value.');
          values.push(value);
        } else if (item.tag === 2) {
          if (item.wire !== 2) throw new Error('Invalid city vector feature.');
          featureFields.push(item);
        } else if (item.tag === 5) {
          if (item.wire !== 0 || !Number.isInteger(item.value) || item.value < 256 || item.value > 65536) throw new Error('Invalid city vector extent.');
          extent = item.value;
        } else if (item.tag === 15 && (item.wire !== 0 || item.value !== 1 && item.value !== 2)) throw new Error('Unsupported city vector version.');
      }
      if (keys.length > 1024 || values.length > 50000 || featureFields.length > 30000) throw new Error('City vector property budget exceeded.');
      for (var featureField of featureFields) {
        if (++featuresRead > 100000) throw new Error('City vector feature budget exceeded.');
        var featureParts = fields(data, featureField.start, featureField.end), typeFields = featureParts.filter(function(part) { return part.tag === 3; });
        var geometryFields = featureParts.filter(function(part) { return part.tag === 4; });
        if (typeFields.length !== 1 || typeFields[0].wire !== 0 || ![1, 2, 3].includes(typeFields[0].value) || geometryFields.length !== 1) throw new Error('Invalid city vector feature type.');
        var tags = 0;
        for (var part of featureParts) {
          if (part.tag === 1 && part.wire !== 0) throw new Error('Invalid city vector feature identity.');
          if (part.tag !== 2) continue;
          if (part.wire !== 2) throw new Error('Invalid city vector properties.');
          var tagCursor = { pos: part.start };
          while (tagCursor.pos < part.end) {
            if (++tags > 128) throw new Error('City vector feature property budget exceeded.');
            if (uint(data, tagCursor, part.end) >= keys.length || uint(data, tagCursor, part.end) >= values.length) throw new Error('Invalid city vector property index.');
          }
        }
        geometry(data, geometryFields[0], typeFields[0].value, extent);
      }
      selected.push(data.subarray(field.begin, field.end));
    }
    var length = selected.reduce(function(sum, part) { return sum + part.length; }, 0), result = new Uint8Array(length), offset = 0;
    selected.forEach(function(part) { result.set(part, offset); offset += part.length; });
    return result;
  }
  function project(point, tile, extent) {
    var size = Math.pow(2, tile.z), longitude = (tile.x + point.x / extent) * 360 / size - 180;
    longitude = centerLon + ((longitude - centerLon) % 360 + 540) % 360 - 180;
    return [longitude, Math.atan(Math.sinh(Math.PI * (1 - 2 * (tile.y + point.y / extent) / size))) * 180 / Math.PI];
  }
  function inside(point) { return point[0] >= bbox[1] && point[0] <= bbox[3] && point[1] >= bbox[0] && point[1] <= bbox[2]; }
  function geo(points) { return points.map(function(point) { var lon = (point[0] % 360 + 540) % 360 - 180; return { lon: lon, lat: point[1] }; }); }
  function key(points, ring) {
    var parts = points.map(function(point) { return point[0].toFixed(6) + ',' + point[1].toFixed(6); });
    if (ring && parts[0] === parts[parts.length - 1]) parts.pop();
    if (!ring) { var forward = parts.join(';'), backward = parts.slice().reverse().join(';'); return forward < backward ? forward : backward; }
    var minimum = 0;
    for (var i = 1; i < parts.length; i++) if (parts[i] < parts[minimum]) minimum = i;
    var normal = parts.slice(minimum).concat(parts.slice(0, minimum)), reversed = [normal[0]].concat(normal.slice(1).reverse());
    return [normal.join(';'), reversed.join(';')].sort()[0];
  }
  function add(element, source, count) {
    element.id = nextId++;
    var pool = element.tags.building ? buildingPool : roadPool;
    var coordinates = element.geometry || element.members.flatMap(function(member) { return member.geometry; });
    var longitude = 0, latitude = 0;
    coordinates.forEach(function(point) { longitude += ((point.lon - centerLon) % 360 + 540) % 360 - 180; latitude += point.lat - options.lat; });
    longitude = longitude / coordinates.length * Math.cos(options.lat * Math.PI / 180); latitude /= coordinates.length;
    var candidate = { element: element, count: count, distance: longitude * longitude + latitude * latitude };
    sourceIds.set(element.type + '/' + element.id, source);
    function farther(a, b) { return a.distance > b.distance || a.distance === b.distance && a.element.id > b.element.id; }
    var index = pool.items.length;
    pool.items.push(candidate); pool.coordinates += count;
    while (index > 0) {
      var parent = Math.floor((index - 1) / 2);
      if (!farther(pool.items[index], pool.items[parent])) break;
      var previous = pool.items[parent]; pool.items[parent] = pool.items[index]; pool.items[index] = previous; index = parent;
    }
    while (pool.items.length > pool.countLimit || pool.coordinates > pool.coordinateLimit) {
      var removed = pool.items[0], last = pool.items.pop();
      pool.coordinates -= removed.count; sourceIds.delete(removed.element.type + '/' + removed.element.id);
      omit(pool.kind + '_candidate_budget');
      if (!pool.items.length) continue;
      pool.items[0] = last; index = 0;
      while (true) {
        var child = index * 2 + 1;
        if (child >= pool.items.length) break;
        if (child + 1 < pool.items.length && farther(pool.items[child + 1], pool.items[child])) child++;
        if (!farther(pool.items[child], pool.items[index])) break;
        var swap = pool.items[index]; pool.items[index] = pool.items[child]; pool.items[child] = swap; index = child;
      }
    }
  }
  function clipLine(points, rectangle) {
    var result = [], current = [];
    function flush() { if (current.length > 1) result.push(current); current = []; }
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i], dx = b[0] - a[0], dy = b[1] - a[1], low = 0, high = 1, valid = true;
      var p = [-dx, dx, -dy, dy], q = [a[0] - rectangle[0], rectangle[2] - a[0], a[1] - rectangle[1], rectangle[3] - a[1]];
      for (var j = 0; j < 4; j++) {
        if (Math.abs(p[j]) < 1e-15) { if (q[j] < 0) valid = false; }
        else { var t = q[j] / p[j]; if (p[j] < 0) low = Math.max(low, t); else high = Math.min(high, t); }
      }
      if (!valid || low >= high) { flush(); continue; }
      var first = [a[0] + low * dx, a[1] + low * dy], last = [a[0] + high * dx, a[1] + high * dy];
      if (current.length && (Math.abs(current[current.length - 1][0] - first[0]) > 1e-9 || Math.abs(current[current.length - 1][1] - first[1]) > 1e-9)) flush();
      if (!current.length) current.push(first);
      current.push(last);
      if (high < 1) flush();
    }
    flush(); return result;
  }
  var ordered = tiles.slice().sort(function(a, b) { return a.z - b.z || a.x - b.x || a.y - b.y; });
  for (var tile of ordered) {
    if (!tile || tile.z !== 14 || !Number.isInteger(tile.x) || !Number.isInteger(tile.y) || tile.x < 0 || tile.x >= 16384 || tile.y < 0 || tile.y >= 16384 || !(tile.data instanceof Uint8Array)) throw new Error('Invalid city vector tile.');
    var tileKey = tile.z + '/' + tile.x + '/' + tile.y;
    if (seenTiles.has(tileKey)) throw new Error('Duplicate city vector tile.');
    seenTiles.add(tileKey);
    bytes += tile.data.byteLength;
    if (!tile.data.byteLength || tile.data.byteLength > 4 * 1024 * 1024 || bytes > byteBudget) throw new Error('City vector byte budget exceeded.');
    // A zero-offset copy also avoids DataView byte-offset assumptions in the pinned PBF decoder.
    var data = safeLayers(tile.data), decoded = new FlightCityVectorCodec.VectorTile(new FlightCityVectorCodec.Pbf(data));
    var buildingLayer = decoded.layers.building;
    if (buildingLayer) for (var f = 0; f < buildingLayer.length; f++) {
      var feature = buildingLayer.feature(f), properties = feature.properties;
      if (feature.type !== 3) continue;
      if (properties.hide_3d === true || properties.hide_3d === 1 || properties.hide_3d === 'true' || properties.hide_3d === '1' || Number(properties.render_min_height || 0) !== 0) { omit('hidden_or_elevated_building_group'); continue; }
      var polygons = FlightCityVectorCodec.classifyRings(feature.loadGeometry());
      for (var polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
        var polygon = polygons[polygonIndex], extent = buildingLayer.extent;
        if (!polygon.length || polygon.length > 32 || polygon.some(function(ring) { return ring.length > 512; })) { omit('building_complexity'); continue; }
        if (polygon.some(function(ring) { return ring.some(function(point) { return point.x <= 0 || point.x >= extent || point.y <= 0 || point.y >= extent; }); })) { omit('building_crosses_tile_core'); continue; }
        var rings = polygon.map(function(ring) { return ring.map(function(point) { return project(point, tile, extent); }); });
        if (!rings.every(function(ring) { return ring.every(inside); })) { omit('building_outside_district'); continue; }
        var identity = key(rings[0], true);
        if (buildingKeys.has(identity)) { omit('duplicate_building'); continue; }
        buildingKeys.add(identity);
        var height = Number(properties.render_height), tags = { building: 'yes' };
        if (Number.isFinite(height) && height > 0) tags.height = String(Math.min(300, height));
        var source = 'mvt/' + tileKey + '/building/' + f + '/' + polygonIndex;
        if (rings.length === 1) add({ type: 'way', tags: tags, geometry: geo(rings[0]) }, source, rings[0].length);
        else {
          tags.type = 'multipolygon';
          var members = rings.map(function(ring, index) { return { type: 'way', ref: -nextId * 100 - index, role: index ? 'inner' : 'outer', geometry: geo(ring) }; });
          add({ type: 'relation', tags: tags, members: members }, source, rings.reduce(function(sum, ring) { return sum + ring.length + 1; }, 0));
        }
      }
    }
    var roads = decoded.layers.transportation;
    if (roads) for (var r = 0; r < roads.length; r++) {
      var road = roads.feature(r), props = road.properties;
      if (road.type !== 2) continue;
      var classes = { motorway: 'motorway', trunk: 'trunk', primary: 'primary', secondary: 'secondary', tertiary: 'tertiary', minor: 'residential', service: 'living_street', pedestrian: 'pedestrian' };
      var highway = Object.prototype.hasOwnProperty.call(classes, props.class) ? classes[props.class] : null;
      if (!highway || props.brunnel && props.brunnel !== 'none' || Number(props.layer || 0) !== 0 || props.access === 'no' || props.access === 'private' || props.indoor === true || props.indoor === 1) { omit('excluded_road'); continue; }
      if (props.ramp === 1 && ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'].includes(highway)) highway += '_link';
      var roadLines = road.loadGeometry(), roadPart = 0;
      for (var line of roadLines) {
        var corePieces = clipLine(line.map(function(point) { return [point.x, point.y]; }), [0, 0, roads.extent, roads.extent]);
        for (var core of corePieces) {
          if (core.every(function(point) { return point[0] === roads.extent; }) || core.every(function(point) { return point[1] === roads.extent; })) continue;
          var projected = core.map(function(point) { return project({ x: point[0], y: point[1] }, tile, roads.extent); });
          var pieces = clipLine(projected, [bbox[1], bbox[0], bbox[3], bbox[2]]);
          for (var piece of pieces) {
            if (piece.length > 256) { omit('road_complexity'); continue; }
            var roadKey = key(piece, false);
            if (roadKeys.has(roadKey)) { omit('duplicate_road'); continue; }
            roadKeys.add(roadKey);
            add({ type: 'way', tags: { highway: highway }, geometry: geo(piece) }, 'mvt/' + tileKey + '/road/' + r + '/' + roadPart++, piece.length);
          }
        }
      }
    }
  }
  elements = buildingPool.items.concat(roadPool.items).map(function(candidate) { return candidate.element; }).sort(function(a, b) { return a.id - b.id; });
  acceptedPoints = buildingPool.coordinates + roadPool.coordinates;
  var pack = converter.convert({ elements: elements }, null, options.source || 'OpenFreeMap / OpenMapTiles / OpenStreetMap');
  function mappedId(id) { var match = id.match(/^(way|relation)\/\d+/); return match && sourceIds.has(match[0]) ? sourceIds.get(match[0]) + id.slice(match[0].length) : id; }
  pack.buildings.forEach(function(building) { building.id = mappedId(building.id); building.heightSource = 'estimated'; });
  pack.roads.forEach(function(road) { road.id = mappedId(road.id); });
  pack.metadata.sourceBuildingIds = pack.buildings.map(function(building) { return building.id; });
  pack.metadata.sourceRoadIds = pack.roads.map(function(road) { return road.id; });
  pack.metadata.counts.heightSources = { height: 0, levels: 0, estimated: pack.buildings.length };
  pack.metadata.heightPolicy = 'OpenMapTiles render_height is an approximation from OSM height/levels; missing height uses 9 m; maximum 300 m. All heights are labeled estimated.';
  pack.metadata.roadPolicy = 'OpenMapTiles ground road classes with inferred widths; bridges, tunnels, fords, nonzero layers, and marked private roads omitted. Roads clipped to tile cores and district.';
  pack.metadata.attribution = typeof options.attribution === 'string' ? options.attribution.slice(0, 500) : '© OpenStreetMap contributors · OpenMapTiles · OpenFreeMap';
  pack.metadata.vector = { schema: 'OpenMapTiles', tileZoom: 14, tiles: ordered.map(function(tile) { return tile.z + '/' + tile.x + '/' + tile.y; }), bytes: bytes,
    decodedCoordinates: decodedPoints, acceptedCoordinates: acceptedPoints, candidateElements: elements.length, omissions: omissions,
    seamPolicy: 'Whole polygons strictly within a tile core; ambiguous boundary buildings omitted. Road pieces clipped to tile cores. Feature identifiers refer to tile features, not OSM IDs.' };
  return pack;
}
