// Shared deterministic OpenStreetMap city conversion; no network, DOM, or Node dependencies.
// Keep this source identical in the offline builder and embedded browser copy.
// Runtime callers supply a bounded downtown bbox [south, west, north, east].
// Dateline boxes use a continuous longitude branch, for example 179.99 to 180.01.
function createFlightCityConverter(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('City conversion options are required.');
  function label(value, limit) {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= limit && !/[\u0000-\u001f\u007f]/.test(value);
  }
  if (!label(options.id, 160) || !label(options.name, 240) || !Number.isFinite(options.lat) ||
      !Number.isFinite(options.lon) || Math.abs(options.lat) > 90 || Math.abs(options.lon) > 180) throw new Error('Invalid city identity or center.');
  var BBOX = Array.isArray(options.bbox) ? options.bbox.slice() : null;
  if (!BBOX || BBOX.length !== 4 || !BBOX.every(Number.isFinite) || BBOX[0] < -90 || BBOX[2] > 90 ||
      BBOX[2] <= BBOX[0] || BBOX[2] - BBOX[0] > 4 || BBOX[3] <= BBOX[1] || BBOX[3] - BBOX[1] > 4 ||
      BBOX[1] < -540 || BBOX[3] > 540) throw new Error('Invalid bounded city bbox.');
  var centerLongitude = options.lon;
  var middle = (BBOX[1] + BBOX[3]) / 2;
  while (centerLongitude - middle > 180) centerLongitude -= 360;
  while (centerLongitude - middle < -180) centerLongitude += 360;
  if (options.lat < BBOX[0] || options.lat > BBOX[2] || centerLongitude < BBOX[1] || centerLongitude > BBOX[3]) throw new Error('City center is outside its bbox.');
  if (options.source !== undefined && !label(options.source, 500) ||
      options.sourceSha256 != null && !label(options.sourceSha256, 128)) throw new Error('Invalid city source metadata.');
  options = { id: options.id.trim(), name: options.name.trim(), lat: options.lat, lon: options.lon,
    source: options.source, sourceSha256: options.sourceSha256 };
  var CENTER = { lat: options.lat, lon: centerLongitude };
var LIMITS = Object.freeze({ buildings: 2500, roads: 1200, ringCoordinates: 96, roadCoordinates: 256, heightM: 300 });
var WIDTHS = Object.freeze({ motorway: 19, motorway_link: 9, trunk: 15, trunk_link: 8,
  primary: 12, primary_link: 7, secondary: 10, secondary_link: 7,
  tertiary: 9, tertiary_link: 6, unclassified: 7, residential: 7, living_street: 5, pedestrian: 6 });
var ESTIMATES = Object.freeze({ house: 7, detached: 7, semidetached_house: 7, terrace: 8,
  residential: 9, apartments: 12, commercial: 12, office: 15, retail: 6,
  warehouse: 8, industrial: 9, garage: 6, garages: 6, shed: 6, school: 12,
  university: 12, hospital: 15, church: 18, cathedral: 18, civic: 12, public: 12 });

function sourceId(item) { return item.type + '/' + item.id; }
function coordinate(point, allowUnwrapped) {
  if (!point || !Number.isFinite(point.lon) || !Number.isFinite(point.lat) ||
      Math.abs(point.lon) > (allowUnwrapped ? 540 : 180) || Math.abs(point.lat) > 90) return null;
  var longitude = point.lon;
  while (longitude - CENTER.lon > 180) longitude -= 360;
  while (longitude - CENTER.lon < -180) longitude += 360;
  return [Math.round(longitude * 1e6) / 1e6, Math.round(point.lat * 1e6) / 1e6];
}
function outputCoordinate(point) {
  var longitude = point[0];
  if (longitude > 180) longitude -= 360;
  else if (longitude < -180) longitude += 360;
  return [Math.round(longitude * 1e6) / 1e6, point[1]];
}
var topologyWorkRemaining = 4000000;
function spendTopologyWork() {
  if (--topologyWorkRemaining < 0) throw new Error('City topology work budget exceeded.');
}
function same(a, b) { return a && b && a[0] === b[0] && a[1] === b[1]; }
function inside(point) { return point[1] >= BBOX[0] && point[1] <= BBOX[2] && point[0] >= BBOX[1] && point[0] <= BBOX[3]; }
function cross(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function onSegment(point, a, b) {
  spendTopologyWork();
  return Math.abs(cross(a, b, point)) < 1e-14 && point[0] >= Math.min(a[0], b[0]) - 1e-12 &&
    point[0] <= Math.max(a[0], b[0]) + 1e-12 && point[1] >= Math.min(a[1], b[1]) - 1e-12 && point[1] <= Math.max(a[1], b[1]) + 1e-12;
}
function intersects(a, b, c, d) {
  var abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  return ((abC > 1e-14 && abD < -1e-14 || abC < -1e-14 && abD > 1e-14) &&
      (cdA > 1e-14 && cdB < -1e-14 || cdA < -1e-14 && cdB > 1e-14)) ||
    onSegment(c, a, b) || onSegment(d, a, b) || onSegment(a, c, d) || onSegment(b, c, d);
}
function signedArea(ring) {
  // Translate before multiplying to avoid cancellation on small geographic rings.
  var area = 0;
  var origin = ring[0];
  for (var i = 0; i < ring.length - 1; i++) {
    area += (ring[i][0] - origin[0]) * (ring[i + 1][1] - origin[1]) - (ring[i + 1][0] - origin[0]) * (ring[i][1] - origin[1]);
  }
  return area / 2;
}
function cleanLine(points) {
  if (!Array.isArray(points)) return null;
  var result = [];
  for (var raw of points) {
    var point = Array.isArray(raw) ? coordinate({ lon: raw[0], lat: raw[1] }, true) : coordinate(raw);
    if (!point) return null;
    if (!same(point, result[result.length - 1])) result.push(point);
  }
  return result;
}
function validateRing(points) {
  if (Array.isArray(points) && points.length > 512) return { reason: 'ring_coordinate_budget' };
  var ring = cleanLine(points);
  if (!ring || ring.length < 4 || !same(ring[0], ring[ring.length - 1])) return { reason: 'open_or_invalid_ring' };
  if (!ring.every(inside)) return { reason: 'outside_bbox' };
  // Only redundant collinear vertices are removed; no shape simplification or
  // rectangular stand-in is used. Keep the final repeated coordinate.
  var changed = true;
  while (changed && ring.length > 4) {
    changed = false;
    for (var i = 0; i < ring.length - 1; i++) {
      var previous = ring[(i + ring.length - 2) % (ring.length - 1)];
      var next = ring[(i + 1) % (ring.length - 1)];
      if (onSegment(ring[i], previous, next)) {
        ring = ring.slice(0, -1).filter((_, j) => j !== i);
        ring.push(ring[0]); changed = true; break;
      }
    }
  }
  if (ring.length > LIMITS.ringCoordinates) return { reason: 'ring_coordinate_budget' };
  if (ring.length < 4 || Math.abs(signedArea(ring)) < 1e-12) return { reason: 'degenerate_ring' };
  var n = ring.length - 1;
  for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
    if (j === i + 1 || i === 0 && j === n - 1) continue;
    if (intersects(ring[i], ring[i + 1], ring[j], ring[j + 1])) return { reason: 'self_intersection' };
  }
  return { ring };
}
function pointInRing(point, ring) {
  var yes = false;
  for (var i = 0, j = ring.length - 2; i < ring.length - 1; j = i++) {
    var a = ring[i], b = ring[j];
    if (onSegment(point, a, b)) return false; // touching courtyards are unsupported
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes;
  }
  return yes;
}
function ringsIntersect(a, b) {
  for (var i = 0; i < a.length - 1; i++) for (var j = 0; j < b.length - 1; j++) {
    if (intersects(a[i], a[i + 1], b[j], b[j + 1])) return true;
  }
  return false;
}
function canonicalRing(ring, positive) {
  var points = ring.slice(0, -1);
  if ((signedArea(ring) > 0) !== positive) points.reverse();
  var first = 0;
  for (var i = 1; i < points.length; i++) {
    if (points[i][0] < points[first][0] || points[i][0] === points[first][0] && points[i][1] < points[first][1]) first = i;
  }
  points = points.slice(first).concat(points.slice(0, first));
  points.push(points[0]);
  return points;
}
function stitchRings(parts) {
  if (!Array.isArray(parts) || parts.length > 64 || parts.reduce((sum, part) => sum + (Array.isArray(part) ? part.length : 0), 0) > 1024) return { reason: 'relation_complexity' };
  var remaining = parts.map(cleanLine);
  if (remaining.some(part => !part || part.length < 2)) return { reason: 'missing_member_geometry' };
  var rings = [];
  while (remaining.length) {
    var ring = remaining.shift().slice();
    var guard = 0;
    while (!same(ring[0], ring[ring.length - 1])) {
      var end = ring[ring.length - 1];
      var matches = [];
      for (var i = 0; i < remaining.length; i++) {
        if (same(end, remaining[i][0])) matches.push([i, false]);
        else if (same(end, remaining[i][remaining[i].length - 1])) matches.push([i, true]);
      }
      if (matches.length !== 1) return { reason: matches.length ? 'ambiguous_member_junction' : 'open_relation_ring' };
      var [index, reverse] = matches[0];
      var next = remaining.splice(index, 1)[0];
      if (reverse) next.reverse();
      ring.push(...next.slice(1));
      if (++guard > parts.length || ring.length > 512) return { reason: 'relation_complexity' };
    }
    rings.push(ring);
  }
  return { rings };
}
function parseMeters(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  var text = String(value).trim().toLowerCase().replace(/^(\d+),(\d+)$/, '$1.$2');
  var imperial = text.match(/^(\d+(?:\.\d+)?)\s*'\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in)?)?$/);
  if (imperial) return Number(imperial[1]) * 0.3048 + Number(imperial[2] || 0) * 0.0254;
  var simple = text.match(/^(\d+(?:\.\d+)?)\s*(m|meters?|metres?|ft|feet|foot)?$/);
  if (!simple) return null;
  return Number(simple[1]) * (/^(ft|feet|foot)$/.test(simple[2] || '') ? 0.3048 : 1);
}
function buildingHeight(tags) {
  var meters = parseMeters(tags.height);
  if (meters !== null && meters >= 0.1) return { heightM: Math.round(Math.min(LIMITS.heightM, meters) * 10) / 10, heightSource: 'height' };
  var levels = typeof tags['building:levels'] === 'string' || typeof tags['building:levels'] === 'number'
    ? String(tags['building:levels']).trim() : '';
  if (/^\d+(?:\.\d+)?$/.test(levels) && Number(levels) > 0) {
    return { heightM: Math.round(Math.max(3, Math.min(LIMITS.heightM, Number(levels) * 3)) * 10) / 10, heightSource: 'levels' };
  }
  return { heightM: Object.prototype.hasOwnProperty.call(ESTIMATES, tags.building) ? ESTIMATES[tags.building] : 9, heightSource: 'estimated' };
}
function buildingStyle(tags) {
  if (/^(warehouse|industrial|garage|garages|shed)$/.test(tags.building)) return 3;
  if (/^(commercial|office|retail)$/.test(tags.building)) return 1;
  if (/^(school|university|hospital|church|cathedral|civic|public)$/.test(tags.building)) return 2;
  return 0;
}
function buildingExclusion(tags) {
  if (!tags.building || /^(no|false|0|roof|ruin|ruins|construction|demolished|destroyed|proposed)$/.test(tags.building)) return 'excluded_building_type';
  if (/^(yes|true|1)$/.test(tags.ruins || '') || /^(yes|true|1)$/.test(tags.demolished || '')) return 'excluded_building_type';
  if (tags['building:part'] && !/^(no|false|0)$/.test(tags['building:part'])) return 'building_part';
  return null;
}
function distanceOrder(feature) {
  var points = feature.rings ? feature.rings[0] : feature.points;
  var lon = 0, lat = 0;
  for (var p of points) { lon += p[0]; lat += p[1]; }
  lon = lon / points.length - CENTER.lon; lat = lat / points.length - CENTER.lat;
  return lon * lon * Math.cos(CENTER.lat * Math.PI / 180) ** 2 + lat * lat;
}
function idCompare(a, b) { return a.id.localeCompare(b.id, 'en', { numeric: true }); }

function convert(raw, sourceSha256, sourceLabel) {
  if (!raw || !Array.isArray(raw.elements)) throw new Error('Expected an Overpass JSON object with elements.');
  if (raw.remark) throw new Error('Source has an Overpass remark, possibly an incomplete query.');
  if (raw.truncated === true || raw.complete === false || raw.error || raw.errors) throw new Error('Incomplete city response.');
  if (raw.elements.length > 12000) throw new Error('City element budget exceeded.');
  topologyWorkRemaining = 4000000;
  var inspectedCoordinates = 0;
  raw.elements.forEach(function(item) {
    if (!item || typeof item !== 'object') throw new Error('Invalid city element.');
    inspectedCoordinates += (Array.isArray(item.geometry) ? item.geometry.length : 0) +
      (Array.isArray(item.nodes) ? item.nodes.length : 0);
    if (item.members !== undefined && !Array.isArray(item.members)) throw new Error('Invalid city relation members.');
    if (item.members) {
      inspectedCoordinates += item.members.length;
      if (inspectedCoordinates > 200000) throw new Error('City input coordinate budget exceeded.');
      item.members.forEach(function(member) {
        if (!member || typeof member !== 'object') throw new Error('Invalid city relation member.');
        inspectedCoordinates += Array.isArray(member.geometry) ? member.geometry.length : 0;
        if (inspectedCoordinates > 200000) throw new Error('City input coordinate budget exceeded.');
      });
    }
    if (inspectedCoordinates > 200000) throw new Error('City input coordinate budget exceeded.');
  });
  var elements = raw.elements.filter(item => item && ['node', 'way', 'relation'].includes(item.type) && Number.isSafeInteger(item.id));
  var ways = new Map(elements.filter(item => item.type === 'way').map(item => [item.id, item]));
  var nodes = new Map(elements.filter(item => item.type === 'node').map(item => [item.id, item]));
  var omissions = {};
  var omit = (reason, id) => { (omissions[reason] ||= new Set()).add(id); };
  var geometry = item => item.geometry || (Array.isArray(item.nodes) ? item.nodes.map(id => nodes.get(id)) : null);
  var buildings = [], roads = [], consumed = new Set();
  var addBuilding = (id, source, tags, rings) => {
    // Runtime triangulation uses open rings; validation above uses closure.
    buildings.push({ id, ...buildingHeight(tags), rings: rings.map(ring => ring.slice(0, -1)), style: buildingStyle(tags) });
  };
  var relations = elements.filter(item => item.type === 'relation' && item.tags?.building).sort((a, b) => a.id - b.id);
  // Suppress member outlines even when the relation is unsupported. Rendering
  // an isolated outer member could incorrectly fill its omitted courtyard.
  var relationMembers = new Set(relations.flatMap(item => (item.members || []).filter(member => member.type === 'way').map(member => member.ref)));
  for (var relation of relations) {
    var id = sourceId(relation), tags = relation.tags;
    var excluded = buildingExclusion(tags);
    if (excluded) { omit(excluded, id); continue; }
    if (tags.type !== 'multipolygon') { omit('unsupported_relation_type', id); continue; }
    var members = relation.members || [];
    if (members.length > 64) { omit('relation_complexity', id); continue; }
    if (!members.length || members.some(member => member.type !== 'way' || !['', 'outer', 'inner'].includes(member.role || ''))) {
      omit('unsupported_relation_member', id); continue;
    }
    var memberGeometry = member => member.geometry || geometry(ways.get(member.ref) || {});
    var outerResult = stitchRings(members.filter(member => member.role !== 'inner').map(memberGeometry));
    var innerResult = stitchRings(members.filter(member => member.role === 'inner').map(memberGeometry));
    if (outerResult.reason || innerResult.reason || !outerResult.rings?.length) {
      omit(outerResult.reason || innerResult.reason || 'missing_outer_ring', id); continue;
    }
    var outerChecks = outerResult.rings.map(validateRing), innerChecks = innerResult.rings.map(validateRing);
    var failure = [...outerChecks, ...innerChecks].find(item => item.reason);
    if (failure) { omit(failure.reason, id); continue; }
    var outers = outerChecks.map(item => canonicalRing(item.ring, true));
    var inners = innerChecks.map(item => canonicalRing(item.ring, false));
    var polygons = outers.map(outer => [outer]);
    var invalid = false;
    for (var i = 0; i < outers.length; i++) for (var j = i + 1; j < outers.length; j++) {
      if (ringsIntersect(outers[i], outers[j]) || pointInRing(outers[i][0], outers[j]) || pointInRing(outers[j][0], outers[i])) invalid = true;
    }
    for (var inner of inners) {
      var containers = outers.map((outer, i) => pointInRing(inner[0], outer) && !ringsIntersect(inner, outer) ? i : -1).filter(i => i >= 0);
      if (containers.length !== 1) { invalid = true; break; }
      var polygon = polygons[containers[0]];
      for (var previous of polygon.slice(1)) {
        if (ringsIntersect(previous, inner) || pointInRing(previous[0], inner) || pointInRing(inner[0], previous)) invalid = true;
      }
      polygon.push(inner);
    }
    if (invalid) { omit('invalid_courtyard_topology', id); continue; }
    polygons.sort((a, b) => a[0][0][0] - b[0][0][0] || a[0][0][1] - b[0][0][1]);
    polygons.forEach((rings, index) => {
      rings.splice(1, rings.length - 1, ...rings.slice(1).sort((a, b) => a[0][0] - b[0][0] || a[0][1] - b[0][1]));
      addBuilding(polygons.length === 1 ? id : id + '/part/' + (index + 1), id, tags, rings);
    });
    for (var member of members) consumed.add(member.ref);
  }
  for (var way of [...ways.values()].sort((a, b) => a.id - b.id)) {
    var id = sourceId(way), tags = way.tags || {};
    if (tags.building) {
      if (relationMembers.has(way.id)) { omit(consumed.has(way.id) ? 'relation_member_deduplicated' : 'unrendered_relation_member', id); continue; }
      var excluded = buildingExclusion(tags);
      if (excluded) { omit(excluded, id); continue; }
      var result = validateRing(geometry(way));
      if (result.reason) { omit(result.reason, id); continue; }
      addBuilding(id, id, tags, [canonicalRing(result.ring, true)]);
    }
    if (!tags.highway) continue;
    if (!Object.prototype.hasOwnProperty.call(WIDTHS, tags.highway)) { omit('excluded_road_class', id); continue; }
    var truthyTag = value => value !== undefined && value !== '' && !/^(no|false|0)$/.test(String(value));
    if (truthyTag(tags.bridge) || truthyTag(tags.tunnel) || tags.layer !== undefined && Number(tags.layer) !== 0) {
      omit('elevated_or_underground_road', id); continue;
    }
    if (/^(no|private)$/.test(tags.access || '') || /^(no|private)$/.test(tags['motor_vehicle'] || '') && tags.highway !== 'pedestrian') {
      omit('restricted_road', id); continue;
    }
    var points = cleanLine(geometry(way));
    if (!points || points.length < 2) { omit('invalid_road_geometry', id); continue; }
    if (!points.every(inside)) { omit('outside_bbox', id); continue; }
    if (points.length > LIMITS.roadCoordinates) { omit('road_coordinate_budget', id); continue; }
    roads.push({ id, widthM: WIDTHS[tags.highway], points });
  }
  var outputCoordinates = 0;
  function cap(features, limit, reason) {
    features.sort((a, b) => distanceOrder(a) - distanceOrder(b) || idCompare(a, b));
    var selected = [];
    for (var feature of features) {
      if (selected.length >= limit) { omit(reason, feature.id); continue; }
      var coordinates = feature.rings ? feature.rings.reduce((sum, ring) => sum + ring.length, 0) : feature.points.length;
      if (outputCoordinates + coordinates > 30000) { omit('total_coordinate_budget', feature.id); continue; }
      outputCoordinates += coordinates;
      selected.push(feature);
    }
    return selected.sort(idCompare);
  }
  var selectedBuildings = cap(buildings, LIMITS.buildings, 'building_count_budget');
  var selectedRoads = cap(roads, LIMITS.roads, 'road_count_budget');
  var heightSources = { height: 0, levels: 0, estimated: 0 };
  for (var building of selectedBuildings) heightSources[building.heightSource]++;
  var omissionDetails = Object.fromEntries(Object.keys(omissions).sort().map(reason => {
    var ids = [...omissions[reason]].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    return [reason, { count: ids.length, ids }];
  }));
  selectedBuildings.forEach(function(building) { building.rings = building.rings.map(function(ring) { return ring.map(outputCoordinate); }); });
  selectedRoads.forEach(function(road) { road.points = road.points.map(outputCoordinate); });
  return { id: options.id, name: options.name, lat: options.lat, lon: options.lon, bbox: BBOX,
    buildings: selectedBuildings, roads: selectedRoads,
    metadata: { format: 'skyschool-city-footprints-v1', source: sourceLabel, sourceSha256,
      osmBaseTimestamp: raw.osm3s?.timestamp_osm_base || null,
      attribution: '© OpenStreetMap contributors', license: 'ODbL-1.0',
      coordinateSystem: 'WGS84 longitude, latitude; six decimal places',
      ringOrder: 'Open rings with no repeated closing coordinate: counterclockwise outer, clockwise holes in longitude/latitude coordinates',
      heightPolicy: 'OSM height first (metres or feet); otherwise building:levels × 3 m; otherwise 6–18 m type estimate; maximum 300 m',
      roadPolicy: 'Class-inferred widths; no bridges, tunnels, nonzero layers, private/inaccessible roads, or crossing bbox boundaries',
      limits: LIMITS,
      counts: { sourceElements: elements.length, sourceBuildingWays: [...ways.values()].filter(item => item.tags?.building).length,
        sourceBuildingRelations: relations.length, sourceHighwayWays: [...ways.values()].filter(item => item.tags?.highway).length,
        eligibleBuildings: buildings.length, eligibleRoads: roads.length, buildings: selectedBuildings.length, roads: selectedRoads.length,
        courtyardBuildings: selectedBuildings.filter(item => item.rings.length > 1).length,
        buildingCoordinates: selectedBuildings.reduce((sum, item) => sum + item.rings.reduce((n, ring) => n + ring.length, 0), 0),
        roadCoordinates: selectedRoads.reduce((sum, item) => sum + item.points.length, 0), heightSources },
      sourceBuildingIds: [...new Set(selectedBuildings.map(item => item.id.replace(/\/part\/\d+$/, '')))].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
      sourceRoadIds: selectedRoads.map(item => item.id), omissions: omissionDetails } };
}

  return { convert: convert, validateRing: validateRing, stitchRings: stitchRings, parseMeters: parseMeters,
    buildingHeight: buildingHeight, signedArea: signedArea, pointInRing: pointInRing, LIMITS: LIMITS };
}
function convertFlightCityData(raw, options) {
  var converter = createFlightCityConverter(options);
  return converter.convert(raw, options.sourceSha256 || null, options.source || 'OpenStreetMap via Overpass');
}
