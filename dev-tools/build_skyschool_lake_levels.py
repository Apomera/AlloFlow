#!/usr/bin/env python3
"""Build offline approximate lake surfaces from pinned geography and ETOPO.

Natural Earth supplies boundaries, not water levels. ETOPO contains bathymetry,
so this builder samples only DEM nodes classified as LAND around each lake and
uses their lower quintile. This is an explicit terrain-derived approximation,
not a survey, gauge, historical water level, or bathymetric lake-floor height.
Python standard library only; inputs are local and no network is used.
"""
import argparse
import array
import bisect
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('skyschool_geography_builder', ROOT / 'dev-tools' / 'build_skyschool_geography.py')
geo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(geo)
WIDTH, HEIGHT, STEP = 7200, 3600, .05
MASK_WIDTH, MASK_HEIGHT, MASK_STEP = 36000, 18000, .01
DEM_RAW_SHA256 = 'ce17f2d9965f85df04e74e36a5e70c4adbe050c6e844b9d36695b9b4d19427f4'
DEM_URL = ('https://www.ngdc.noaa.gov/thredds/dodsC/global/ETOPO2022/60s/'
           '60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc.dods'
           '?z.z[1:3:10798][1:3:21598]')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_dbf():
    with zipfile.ZipFile(geo.ASSETS / 'ne_10m_lakes.zip') as archive:
        data = archive.read('ne_10m_lakes.dbf')
    count, header_size, record_size = struct.unpack_from('<IHH', data, 4)
    fields, offset, position = [], 1, 32
    while data[position] != 13:
        name = data[position:position + 11].split(b'\0')[0].decode('ascii')
        length = data[position + 16]
        fields.append((name, offset, length))
        offset += length
        position += 32
    if offset != record_size:
        raise ValueError('Unexpected DBF record size')
    records = []
    for index in range(count):
        start = header_size + index * record_size
        if data[start] != 32:
            raise ValueError('Deleted DBF record is unsupported')
        records.append({name: data[start + at:start + at + length].decode('utf-8').strip()
                        for name, at, length in fields})
    if any('elev' in name.lower() or 'height' in name.lower() for name, _, _ in fields):
        raise ValueError('Source now has an elevation field; review the estimation method')
    return records


def read_dem(path):
    compressed = path.read_bytes()
    raw = gzip.decompress(compressed) if path.suffix == '.gz' else compressed
    if sha(raw) != DEM_RAW_SHA256:
        raise ValueError('Pinned raw ETOPO source response hash differs')
    marker = b'\nData:\n'
    at = raw.find(marker)
    if at < 0:
        raise ValueError('Missing OPeNDAP binary data marker')
    header = raw[:at].decode('ascii')
    if '[lat = 3600][lon = 7200]' not in header:
        raise ValueError('Expected globally registered 3-minute ETOPO dimensions')
    body = raw[at + len(marker):]
    count, repeated_count = struct.unpack_from('>II', body)
    if count != WIDTH * HEIGHT or repeated_count != count or len(body) != 8 + count * 4:
        raise ValueError('Unexpected OPeNDAP float array size')
    values = array.array('f')
    values.frombytes(body[8:])
    if sys.byteorder == 'little':
        values.byteswap()
    return values, {'path': str(path.relative_to(ROOT)).replace('\\', '/'), 'sha256': sha(compressed), 'url': DEM_URL,
                    'uncompressedSha256': sha(raw), 'registration': 'cell-center; south-to-north; west-to-east',
                    'width': WIDTH, 'height': HEIGHT, 'lat0': -89.975, 'lon0': -179.975, 'stepDegrees': STEP}


class LandMask:
    def __init__(self):
        path = geo.ASSETS / 'land-water-mask.json'
        raw = path.read_bytes()
        data = json.loads(raw)
        if (data['resolutionDegrees'], data['width'], data['height']) != (.01, 36000, 18000):
            raise ValueError('Unexpected land mask registration')
        if sha(data['rle'].encode()) != data['rleSha256']:
            raise ValueError('Land mask RLE hash differs')
        self.rows = data['rle'].split(';')
        self.cache = {}
        self.sha256 = sha(raw)

    def land(self, lat, lon):
        row = min(MASK_HEIGHT - 1, max(0, math.floor((90 - lat) / MASK_STEP)))
        col = min(MASK_WIDTH - 1, math.floor(((lon + 180) % 360) / MASK_STEP))
        if row not in self.cache:
            total, endpoints = 0, []
            for run in self.rows[row].split(','):
                total += int(run, 36)
                endpoints.append(total)
            if total != MASK_WIDTH:
                raise ValueError('Land mask row width differs')
            self.cache[row] = endpoints
        return bisect.bisect_right(self.cache[row], col) % 2 == 1


def quantile(values, proportion):
    ordered = sorted(values)
    at = (len(ordered) - 1) * proportion
    lo, hi = math.floor(at), math.ceil(at)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (at - lo)


def shoreline_nodes(rings, mask):
    # ETOPO is cell-centred .05 degrees, the same centres as this raster.
    rows = geo.raster_spans([rings], STEP)
    wet = set()
    for north_row, spans in enumerate(rows):
        south_row = HEIGHT - 1 - north_row
        for start, stop in spans:
            wet.update(south_row * WIDTH + col for col in range(start, stop))
    boundary = set()
    if wet:
        for key in wet:
            row, col = divmod(key, WIDTH)
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                yy, xx = row + dy, (col + dx) % WIDTH
                if 0 <= yy < HEIGHT and yy * WIDTH + xx not in wet:
                    boundary.add(yy * WIDTH + xx)
    else:
        # Sub-grid lakes may contain no native DEM node. Their nearest boundary
        # nodes still provide a local terrain estimate, explicitly flagged below.
        for ring in rings:
            for lon, lat in ring:
                yy = min(HEIGHT - 1, max(0, round((lat + 89.975) / STEP)))
                xx = round((lon + 179.975) / STEP) % WIDTH
                boundary.add(yy * WIDTH + xx)
    for radius in (0, 1, 2):
        candidates = set()
        for key in boundary:
            row, col = divmod(key, WIDTH)
            for dy in range(-radius, radius + 1):
                for dx in range(-radius, radius + 1):
                    yy, xx = row + dy, (col + dx) % WIDTH
                    if 0 <= yy < HEIGHT and yy * WIDTH + xx not in wet:
                        lat, lon = -89.975 + yy * STEP, -179.975 + xx * STEP
                        if mask.land(lat, lon):
                            candidates.add(yy * WIDTH + xx)
        if len(candidates) >= 4 or radius == 2:
            return sorted(candidates), len(wet), radius
    raise AssertionError('Unreachable shoreline expansion')


def resolve_spans(spans):
    # Deterministic source-record priority for occasional overlapping polygons.
    events = []
    for start, stop, lake in spans:
        events.extend(((start, 1, lake), (stop, -1, lake)))
    events.sort()
    active, result, overlap_cells, last = {}, [], 0, None
    for col, change, lake in events:
        if last is not None and col > last and active:
            winner = min(active)
            if len(active) > 1:
                overlap_cells += col - last
            if result and result[-1][1] == last and result[-1][2] == winner:
                result[-1][1] = col
            else:
                result.append([last, col, winner])
        active[lake] = active.get(lake, 0) + change
        if not active[lake]:
            del active[lake]
        last = col
    return result, overlap_cells


def build(source, output):
    values, dem_source = read_dem(source)
    mask = LandMask()
    records, shapes = read_dbf(), geo.read_shapes('lakes')
    if len(records) != len(shapes) or len(records) != 1355:
        raise ValueError('Lake geometry and DBF records differ')
    land = geo.read_shapes('land')
    caspian = land[0][15]
    signed_area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(caspian, caspian[1:]))
    if len(caspian) != 2388 or signed_area <= 0 or not geo.contains_ring(51, 42, caspian):
        raise ValueError('Pinned Caspian land-hole geometry differs')
    if geo.contains_shapes(51, 42, geo.indexed_shapes(shapes)):
        raise ValueError('Caspian is now in the lakes layer; review duplicate geometry')
    records.append({'name': 'Caspian Sea', 'ne_id': '', 'featurecla': 'Land polygon hole'})
    shapes.append([caspian])
    reference_path = ROOT / 'vendor' / 'skyschool-elevation' / 'lake-levels-references.json'
    reference_raw = reference_path.read_bytes()
    reference_data = json.loads(reference_raw)
    if reference_data['format'] != 'skyschool-lake-level-references-v1':
        raise ValueError('Unknown lake-level reference format')
    references = {r['neId']: r for r in reference_data['references']}
    if len(references) != len(reference_data['references']):
        raise ValueError('Duplicate lake-level reference')
    used_references = set()
    output_rows, lakes, levels, missing = {}, [], [], []
    for lake_id, (record, rings) in enumerate(zip(records, shapes)):
        nodes, interior_count, expansion = shoreline_nodes(rings, mask)
        samples = [float(values[key]) for key in nodes]
        if not samples or any(not math.isfinite(v) or not -1000 <= v <= 9000 for v in samples):
            missing.append({'id': lake_id, 'name': record['name'], 'reason': 'No valid land-classified shore DEM samples'})
            levels.append(None)
            continue
        level = round(quantile(samples, .2))
        estimated_level = level
        reference = references.get(record['ne_id'])
        if reference:
            point = reference['interiorPoint']
            if (reference['expectedName'] != record['name']
                    or not geo.contains_shapes(point['lon'], point['lat'], geo.indexed_shapes([rings]))
                    or not isinstance(reference['levelMeters'], int)
                    or not -1000 <= reference['levelMeters'] <= 9000):
                raise ValueError('Lake observation reference does not match the pinned geometry')
            level = reference['levelMeters']
            used_references.add(record['ne_id'])
        levels.append(level)
        lakes.append({'id': lake_id, 'name': record['name'], 'neId': record['ne_id'],
                      'classification': record['featurecla'], 'levelMeters': level,
                      'method': 'Dated water-level observation' if reference else '20th percentile of adjacent land-classified ETOPO nodes',
                      'shoreEstimateMeters': estimated_level,
                      **({'reference': reference} if reference else {}),
                      'sampleCount': len(samples), 'nativeInteriorNodes': interior_count,
                      'expandedShoreCells': expansion,
                      'p10Meters': round(quantile(samples, .1), 2),
                      'p50Meters': round(quantile(samples, .5), 2),
                      'p90Meters': round(quantile(samples, .9), 2)})
        for row, spans in enumerate(geo.raster_spans([rings], MASK_STEP)):
            if spans:
                output_rows.setdefault(row, []).extend([start, stop, lake_id] for start, stop in spans)
        if lake_id % 200 == 0:
            print('Processed lake', lake_id, flush=True)
    if used_references != set(references):
        raise ValueError('A lake observation reference was not matched')
    overlap_cells, excluded_land_cells = 0, 0
    for row, spans in output_rows.items():
        output_rows[row], overlap = resolve_spans(spans)
        overlap_cells += overlap
        # A lake level may only replace cells already classified as water by
        # the shipped map. Check entire intervals, not just representative dots.
        mask.land(90 - (row + .5) * MASK_STEP, -179.995)
        endpoints = mask.cache[row]
        water_runs = []
        for start, stop, lake_id in output_rows[row]:
            interval = bisect.bisect_right(endpoints, start)
            cursor = start
            while cursor < stop:
                end = min(stop, endpoints[interval])
                if interval % 2 == 0 and end > cursor:
                    water_runs.append([cursor, end, lake_id])
                else:
                    # Separate land polygons include islands inside the Caspian
                    # outer hole. Preserve them by intersecting the existing mask.
                    excluded_land_cells += end - cursor
                cursor = end
                interval += 1
        output_rows[row] = water_runs
        previous_end = 0
        for start, stop, lake_id in output_rows[row]:
            interval = bisect.bisect_right(endpoints, start)
            if not (previous_end <= start < stop <= MASK_WIDTH and interval % 2 == 0
                    and stop <= endpoints[interval] and isinstance(levels[lake_id], int)):
                raise ValueError('Lake run differs from the shipped land/water mask')
            previous_end = stop
    result = {'format': 'skyschool-lake-levels-v1', 'resolutionDegrees': MASK_STEP,
              'width': MASK_WIDTH, 'height': MASK_HEIGHT, 'units': 'meters',
              'verticalDatum': 'EGM2008 for DEM estimates; dated observations retain their stated source datum',
              'levelsMeters': levels, 'rows': {str(row): output_rows[row] for row in sorted(output_rows)},
              'lakes': lakes, 'missing': missing, 'overlapCellsResolvedBySourceRecordOrder': overlap_cells,
              'landCellsExcludedFromOuterWaterPolygons': excluded_land_cells,
              'source': {'dem': dem_source, 'landMaskSha256': mask.sha256,
                         'lakesArchiveSha256': geo.SOURCES['lakes']['sha256'],
                         'landArchiveSha256': geo.SOURCES['land']['sha256'],
                         'referenceObservationsSha256': sha(reference_raw),
                         'caspianGeometry': 'ne_10m_land.shp record 0 ring 15 (zero-based), validated CCW hole'},
              'limitations': ['Approximate terrain-derived lake surfaces, not surveyed or current water levels.',
                              'Natural Earth lake boundaries are generalized 1:10-million-scale geometry.',
                              'Shore estimates use 3-arc-minute DEM samples and can be inaccurate on steep or generalized shores.',
                              'Seasonal, tidal, connected, and reservoir water-level changes are not simulated.',
                              'The northern Dead Sea uses a fixed July 2026 observation in the source datum, not a live level or an EGM2008 transformation.',
                              'Lake interiors are never used as water levels because ETOPO includes bathymetry.']}
    encoded = json.dumps(result, ensure_ascii=False, separators=(',', ':')).encode('utf-8') + b'\n'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(encoded)
    print(json.dumps({'output': str(output), 'bytes': len(encoded), 'sha256': sha(encoded),
                      'lakes': len(lakes), 'missing': missing, 'rows': len(output_rows),
                      'runs': sum(len(v) for v in output_rows.values())}, ensure_ascii=True), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dem-source', type=Path, required=True,
                        help='Cached global z.z[1:3:10798][1:3:21598] OPeNDAP response (.dods or .dods.gz)')
    parser.add_argument('--output', type=Path, default=ROOT / 'vendor' / 'skyschool-elevation' / 'lake-levels.json')
    arguments = parser.parse_args()
    build(arguments.dem_source.resolve(), arguments.output.resolve())
