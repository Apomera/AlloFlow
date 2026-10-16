#!/usr/bin/env python3
"""Build SkySchool's offline land/water RLE from pinned Natural Earth archives.

Python 3 standard library only. The input ZIPs remain unchanged. No network is
used by this builder. The scanline uses pixel centres and polygon even/odd fill,
including holes. Geometry is unioned per record, then lake areas are subtracted.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import struct
import tempfile
import time
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'vendor' / 'skyschool-geography'
SOURCES = {
    'land': {'version': '5.1.1', 'sha256': 'e547d749445eaa0964aba76738090ec88f5e63c4585122170f98c67a7ea922dc'},
    'lakes': {'version': '5.0.0', 'sha256': '0803a06f9c3cb4671d89b68c48b142aad9366ba40f665245e12a913fbc61722a'},
}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def read_shapes(kind):
    archive = ASSETS / ('ne_10m_' + kind + '.zip')
    raw = archive.read_bytes()
    if digest(raw) != SOURCES[kind]['sha256']:
        raise ValueError('Source hash differs: ' + str(archive))
    with zipfile.ZipFile(archive) as z:
        base = 'ne_10m_' + kind
        if z.read(base + '.VERSION.txt').decode().strip() != SOURCES[kind]['version']:
            raise ValueError('Source version differs: ' + kind)
        projection = z.read(base + '.prj').decode().strip()
        if 'GCS_WGS_1984' not in projection:
            raise ValueError('Expected WGS84 geographic coordinates')
        data = z.read(base + '.shp')
    if struct.unpack_from('>i', data)[0] != 9994 or struct.unpack_from('<i', data, 32)[0] != 5:
        raise ValueError('Expected Polygon shapefile')
    if struct.unpack_from('>i', data, 24)[0] * 2 != len(data):
        raise ValueError('Shapefile length mismatch')
    shapes = []
    offset = 100
    while offset < len(data):
        _, size = struct.unpack_from('>ii', data, offset)
        offset += 8
        end = offset + size * 2
        shape_type = struct.unpack_from('<i', data, offset)[0]
        if shape_type == 0:
            offset = end
            continue
        if shape_type != 5:
            raise ValueError('Non-polygon record')
        count, point_count = struct.unpack_from('<ii', data, offset + 36)
        starts = list(struct.unpack_from('<' + 'i' * count, data, offset + 44)) + [point_count]
        xy_offset = offset + 44 + count * 4
        points = list(struct.iter_unpack('<dd', data[xy_offset:xy_offset + point_count * 16]))
        rings = [points[a:b] for a, b in zip(starts, starts[1:])]
        for ring in rings:
            if len(ring) < 4 or ring[0] != ring[-1]:
                raise ValueError('Invalid polygon ring')
            for a, b in zip(ring, ring[1:]):
                if not (-180.00000001 <= a[0] <= 180.00000001 and -90.00000001 <= a[1] <= 90.00000001):
                    raise ValueError('Coordinate outside geographic bounds')
                if abs(b[0] - a[0]) > 180:
                    raise ValueError('Unsplit antimeridian edge')
        shapes.append(rings)
        offset = end
    if offset != len(data):
        raise ValueError('Unexpected trailing shape data')
    return shapes

def merge(spans):
    if not spans:
        return []
    ordered = sorted(spans)
    merged = [list(ordered[0])]
    for start, end in ordered[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(end, merged[-1][1])
        else:
            merged.append([start, end])
    return merged

def subtract(land, lakes):
    result = []
    water_index = 0
    for start, end in land:
        while water_index < len(lakes) and lakes[water_index][1] <= start:
            water_index += 1
        cursor = start
        index = water_index
        while index < len(lakes) and lakes[index][0] < end:
            wstart, wend = lakes[index]
            if cursor < wstart:
                result.append([cursor, min(wstart, end)])
            cursor = max(cursor, wend)
            if cursor >= end:
                break
            index += 1
        if cursor < end:
            result.append([cursor, end])
    return result

def raster_spans(shapes, resolution):
    width, height = round(360 / resolution), round(180 / resolution)
    rows = [[] for _ in range(height)]
    for rings in shapes:
        starts = {}
        minimum, maximum = height, 0
        for ring in rings:
            for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
                if y1 == y2:
                    continue
                lower, upper = min(y1, y2), max(y1, y2)
                first = max(0, math.floor((90 - upper) / resolution - .5) + 1)
                stop = min(height, math.floor((90 - lower) / resolution - .5) + 1)
                if first >= stop:
                    continue
                slope = (x2 - x1) / (y2 - y1)
                # x(row) is calculated directly rather than incremented, avoiding drift.
                at_zero = x1 + (90 - resolution * .5 - y1) * slope
                starts.setdefault(first, []).append((stop, at_zero, -resolution * slope))
                minimum, maximum = min(minimum, first), max(maximum, stop)
        active = []
        for row in range(minimum, maximum):
            active = [edge for edge in active if edge[0] > row]
            active.extend(starts.get(row, ()))
            crossings = sorted(edge[1] + row * edge[2] for edge in active)
            if len(crossings) % 2:
                raise ValueError('Odd scanline intersections')
            for left, right in zip(crossings[::2], crossings[1::2]):
                first = max(0, math.ceil((left + 180) / resolution - .5))
                stop = min(width, math.ceil((right + 180) / resolution - .5))
                if first < stop:
                    rows[row].append((first, stop))
    return [merge(row) for row in rows]

def base36(number):
    if number == 0:
        return '0'
    chars = '0123456789abcdefghijklmnopqrstuvwxyz'
    result = ''
    while number:
        number, digit = divmod(number, 36)
        result = chars[digit] + result
    return result

def encode_rows(rows, width):
    encoded = []
    for spans in rows:
        cursor = 0
        runs = []
        for start, end in spans:
            runs += [base36(start - cursor), base36(end - start)]
            cursor = end
        runs.append(base36(width - cursor))
        encoded.append(','.join(runs))
    return ';'.join(encoded)

def contains_ring(lon, lat, ring):
    # Independent ray casting, not scanline events or raster spans.
    inside = False
    previous = ring[-1]
    for current in ring:
        ax, ay = previous
        bx, by = current
        if (ay > lat) != (by > lat) and lon < ax + (lat - ay) * (bx - ax) / (by - ay):
            inside = not inside
        previous = current
    return inside

def indexed_shapes(shapes):
    def bounds(points):
        return (min(p[0] for p in points), min(p[1] for p in points),
                max(p[0] for p in points), max(p[1] for p in points))
    return [(bounds([p for ring in rings for p in ring]), [(bounds(ring), ring) for ring in rings]) for rings in shapes]

def contains_shapes(lon, lat, shapes):
    for shape_bounds, rings in shapes:
        if not (shape_bounds[0] <= lon <= shape_bounds[2] and shape_bounds[1] <= lat <= shape_bounds[3]):
            continue
        inside = False
        for ring_bounds, ring in rings:
            if ring_bounds[0] <= lon <= ring_bounds[2] and ring_bounds[1] <= lat <= ring_bounds[3] and contains_ring(lon, lat, ring):
                inside = not inside
        if inside:
            return True
    return False

FIXTURES = [
    ('Portland Maine city', 43.6615, -70.2553),
    ('Portland ocean east', 43.65, -70.10),
    ('Casco Bay generalized small-island cell', 43.659, -70.196),
    ('Casco Bay between islands', 43.685, -70.175),
    ('Boston city', 42.3601, -71.0589),
    ('Boston harbor', 42.338, -70.948),
    ('San Francisco city', 37.7749, -122.4194),
    ('San Francisco bay', 37.758, -122.315),
    ('San Francisco Pacific', 37.765, -122.535),
    ('Honolulu Oahu', 21.3069, -157.8583),
    ('Honolulu ocean', 21.20, -157.86),
    ('Lake Michigan', 43.5, -87.0),
    ('Lake Superior', 47.7, -87.5),
    ('Isle Royale', 48.0, -88.82),
    ('Lake Victoria', -1.1, 33.0),
    ('Bali', -8.4095, 115.1889),
    ('Bali Sea', -8.00, 115.20),
    ('Tokyo', 35.6762, 139.6503),
    ('Tokyo Bay', 35.40, 139.85),
    ('South Island New Zealand', -43.5, 171.5),
    ('Cook Strait', -41.35, 174.55),
    ('Dateline Pacific east', 0, 179.995),
    ('Dateline Pacific west', 0, -179.995),
    ('Antarctic inland', -89.99, 0),
    ('Arctic Ocean', 89.99, 0),
    ('Lake hole Manitoulin Island', 45.80, -82.2),
    ('Long Island land', 40.80, -73.20),
    ('Long Island Sound', 41.00, -73.20),
    ('Singapore land', 1.35, 103.82),
    ('Singapore strait', 1.20, 103.82),
    ('Hong Kong Island', 22.25, 114.20),
    ('Victoria Harbour', 22.30, 114.16),
    ('Great Salt Lake', 41.15, -112.50),
    ('Lake Titicaca', -15.85, -69.40),
    ('Caspian Sea', 42.00, 51.00),
    ('Samoa Savaii', -13.62, -172.45),
    ('Samoa ocean', -13.20, -172.45),
    ('Iceland inland', 64.80, -18.60),
    ('Iceland offshore', 64.80, -25.00),
    ('Mount Desert Island', 44.35, -68.30),
]

def fixture_report(land, lakes, rows, resolution):
    width, height = round(360 / resolution), round(180 / resolution)
    fixtures = []
    land, lakes = indexed_shapes(land), indexed_shapes(lakes)
    for label, lat, lon in FIXTURES:
        row = max(0, min(height - 1, math.floor((90 - lat) / resolution)))
        col = min(width - 1, math.floor(((lon + 180) % 360) / resolution))
        center_lat = 90 - (row + .5) * resolution
        center_lon = -180 + (col + .5) * resolution
        water = not contains_shapes(lon, lat, land) or contains_shapes(lon, lat, lakes)
        center_water = not contains_shapes(center_lon, center_lat, land) or contains_shapes(center_lon, center_lat, lakes)
        mask_water = not any(start <= col < stop for start, stop in rows[row])
        if mask_water != center_water:
            raise ValueError('Independent fixture centre classification differs: ' + label)
        fixtures.append(dict(name=label, lat=lat, lon=lon, polygonWater=water, maskWater=mask_water,
                             cellCenter=dict(lat=center_lat, lon=center_lon), cellCenterPolygonWater=center_water))
    for row in range(0, height, max(1, round(7.5 / resolution))):
        lat = 90 - (row + .5) * resolution
        for col in range(0, width, max(1, round(15 / resolution))):
            lon = -180 + (col + .5) * resolution
            water = not contains_shapes(lon, lat, land) or contains_shapes(lon, lat, lakes)
            mask_water = not any(start <= col < stop for start, stop in rows[row])
            if water != mask_water:
                raise ValueError('Independent global probe differs at ' + str((lat, lon)))
    return fixtures

def embedding_plan(data):
    """Preflight both production copies. This function never writes files."""
    if data['format'] != 'skyschool-land-water-rle-v1' or data['resolutionDegrees'] != .01 or data['width'] != 36000 or data['height'] != 18000:
        raise ValueError('--embed supports only the 0.01-degree v1 mask')
    rle = data['rle']
    if not isinstance(rle, str) or not re.fullmatch(r'[0-9a-z,;]+', rle) or digest(rle.encode()) != data['rleSha256']:
        raise ValueError('Generated RLE is invalid')
    encoded_rows = rle.split(';')
    if len(encoded_rows) != data['height']:
        raise ValueError('Generated RLE height mismatch')
    for encoded_row in encoded_rows:
        runs = encoded_row.split(',')
        if any(not run for run in runs) or sum(int(run, 36) for run in runs) != data['width']:
            raise ValueError('Generated RLE row width mismatch')
    sources = [ROOT / 'stem_lab' / 'stem_tool_flightsim.js',
               ROOT / 'desktop' / 'web-app' / 'public' / 'stem_lab' / 'stem_tool_flightsim.js']
    originals = []
    for source in sources:
        resolved = source.resolve(strict=True)
        if not resolved.is_relative_to(ROOT.resolve()) or resolved != source.absolute():
            raise ValueError('Production source must be a regular path inside the repository')
        if not resolved.is_file():
            raise ValueError('Missing production source: ' + str(source))
        originals.append(source.read_bytes())
    if originals[0] != originals[1]:
        raise ValueError('Canonical and mirrored simulator sources differ; refusing --embed')
    source = originals[0].decode('utf-8')
    if len(re.findall(r'\bvar\s+LAND_MASK_RLE\s*=', source)) != 1:
        raise ValueError('Expected exactly one LAND_MASK_RLE declaration')
    # The single runtime assignment that releases the RLE string is allowed.
    if len(re.findall(r'\bLAND_MASK_RLE\s*=', source)) != 2 or len(re.findall(r'\bLAND_MASK_RLE\s*=\s*null\s*;', source)) != 1:
        raise ValueError('Unexpected LAND_MASK_RLE assignment outside its declaration')
    for name in ('LAND_MASK_RESOLUTION', 'LAND_MASK_WIDTH', 'LAND_MASK_HEIGHT'):
        if len(re.findall(r'\b' + name + r'\s*=', source)) != 1:
            raise ValueError('Unexpected assignment count for ' + name)
    rle_pattern = r'\bvar LAND_MASK_RLE = "[0-9a-z,;]+";'
    resolution_pattern = r'\bvar LAND_MASK_RESOLUTION = ([0-9.]+);'
    dimensions_pattern = r'\bvar LAND_MASK_WIDTH = ([0-9]+), LAND_MASK_HEIGHT = ([0-9]+);'
    hash_pattern = r'(?m)^  // RLE SHA256: [0-9a-f]{64}$'
    for pattern in (rle_pattern, resolution_pattern, dimensions_pattern, hash_pattern):
        if len(re.findall(pattern, source)) != 1:
            raise ValueError('Expected exactly one embedded mask declaration or hash comment')
    old_resolution = float(re.search(resolution_pattern, source).group(1))
    old_dimensions = tuple(map(int, re.search(dimensions_pattern, source).groups()))
    if old_resolution != .01 or old_dimensions != (36000, 18000):
        raise ValueError('Production decoder bounds differ from the supported 0.01-degree format')
    candidate = re.sub(rle_pattern, 'var LAND_MASK_RLE = ' + json.dumps(rle) + ';', source)
    candidate = re.sub(resolution_pattern, 'var LAND_MASK_RESOLUTION = 0.01;', candidate)
    candidate = re.sub(dimensions_pattern, 'var LAND_MASK_WIDTH = 36000, LAND_MASK_HEIGHT = 18000;', candidate)
    candidate = re.sub(hash_pattern, '  // RLE SHA256: ' + data['rleSha256'], candidate).encode('utf-8')
    return dict(sources=sources, original=originals[0], candidate=candidate)

def staged_source(path, content):
    descriptor, temporary = tempfile.mkstemp(prefix='.' + path.name + '.geography-', suffix='.tmp', dir=path.parent)
    temporary = Path(temporary)
    try:
        with os.fdopen(descriptor, 'wb') as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, path.stat().st_mode)
        return temporary
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise

def write_embedding(plan):
    """Stage both copies first; roll back our first rename if the second fails.

    No cross-file atomic rename exists. A rollback only replaces bytes still
    equal to our candidate, so a concurrent editor's changes are preserved.
    """
    for source in plan['sources']:
        if source.read_bytes() != plan['original']:
            raise ValueError('Source changed after preflight; refusing --embed')
    if plan['candidate'] == plan['original']:
        return dict(changed=False, sourceSha256=digest(plan['original']))
    temporaries, replaced = [], []
    try:
        for source in plan['sources']:
            temporaries.append(staged_source(source, plan['candidate']))
        for source in plan['sources']:
            if source.read_bytes() != plan['original']:
                raise ValueError('Source changed during staging; refusing --embed')
        for source, temporary in zip(plan['sources'], temporaries):
            if source.read_bytes() != plan['original']:
                raise ValueError('Source changed before rename; refusing --embed')
            os.replace(temporary, source)
            replaced.append(source)
    except BaseException:
        for source in reversed(replaced):
            if source.read_bytes() != plan['candidate']:
                raise RuntimeError('Embedding interrupted; concurrent source edit preserved at ' + str(source))
            restore = staged_source(source, plan['original'])
            try:
                os.replace(restore, source)
            finally:
                restore.unlink(missing_ok=True)
        raise
    finally:
        for temporary in temporaries:
            temporary.unlink(missing_ok=True)
    return dict(changed=True, sourceSha256=digest(plan['candidate']))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--resolution', type=float, default=.01)
    parser.add_argument('--output', type=Path, default=ASSETS / 'land-water-mask.json')
    parser.add_argument('--embed', action='store_true', help='also update the embedded 0.01-degree mask in identical canonical and mirrored simulator sources')
    args = parser.parse_args()
    args.output = args.output.resolve()
    protected = [(ROOT / 'stem_lab' / 'stem_tool_flightsim.js').resolve(),
                 (ROOT / 'desktop' / 'web-app' / 'public' / 'stem_lab' / 'stem_tool_flightsim.js').resolve()]
    if args.output in protected:
        raise ValueError('--output cannot overwrite simulator source')
    resolution = args.resolution
    if resolution <= 0 or abs(360 / resolution - round(360 / resolution)) > 1e-7 or abs(180 / resolution - round(180 / resolution)) > 1e-7:
        raise ValueError('Resolution must divide both geographic axes')
    width, height = round(360 / resolution), round(180 / resolution)
    if args.embed and resolution != .01:
        raise ValueError('--embed supports only --resolution 0.01')
    if width > 65535:
        raise ValueError('Runtime row ends use Uint16; choose a coarser grid')
    started = time.monotonic()
    land, lakes = read_shapes('land'), read_shapes('lakes')
    land_rows = raster_spans(land, resolution)
    lake_rows = raster_spans(lakes, resolution)
    rows = [subtract(a, b) for a, b in zip(land_rows, lake_rows)]
    rle = encode_rows(rows, width)
    output = dict(format='skyschool-land-water-rle-v1', resolutionDegrees=resolution, width=width, height=height,
                  bounds=[-180, -90, 180, 90], sampling='cell centers; rows north to south; columns west to east',
                  encoding='Base36 run lengths, comma-separated per row; semicolon-separated rows. Runs alternate starting with water.',
                  sourceScale='1:10,000,000; 10m in the Natural Earth name denotes map scale, not metre resolution.',
                  sourceArchives=[dict(file='ne_10m_' + kind + '.zip', **value) for kind, value in SOURCES.items()],
                  rleSha256=digest(rle.encode()), rle=rle,
                  fixtures=fixture_report(land, lakes, rows, resolution))
    encoded = (json.dumps(output, separators=(',', ':'), ensure_ascii=True) + '\n').encode()
    plan = embedding_plan(output) if args.embed else None
    if resolution == .01:
        fixture_path = ROOT / 'tests' / 'fixtures' / 'skyschool_geography_points.json'
        fixture_path.parent.mkdir(parents=True, exist_ok=True)
        oracle = dict(description='Independent polygon ray casting at exact raster cell centres; no raster lookup used to obtain expectedWater.', resolutionDegrees=resolution, sourceArchives=output['sourceArchives'], points=[dict(name=f['name'], lat=round(f['cellCenter']['lat'], 6), lon=round(f['cellCenter']['lon'], 6), expectedWater=f['cellCenterPolygonWater']) for f in output['fixtures']])
        fixture_path.write_text(json.dumps(oracle, indent=2) + '\n', encoding='utf-8')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(encoded)
    embedded = write_embedding(plan) if plan is not None else None
    print(json.dumps(dict(output=str(args.output.relative_to(ROOT)), width=width, height=height,
                          rleBytes=len(rle), outputBytes=len(encoded), sha256=digest(encoded),
                          rleSha256=output['rleSha256'], embedded=embedded, seconds=round(time.monotonic() - started, 3),
                          rowEndCount=sum(len(row) * 2 + 1 for row in rows),
                          maxRowLandSpans=max(map(len, rows)), landCells=sum(end - start for row in rows for start, end in row))))

if __name__ == '__main__':
    main()
