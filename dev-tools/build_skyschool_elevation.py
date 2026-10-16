#!/usr/bin/env python3
"""Build the offline SkySchool ETOPO 2022 elevation package (Python standard library).

Downloads only a strided DAP2 subset, never the full global source. Re-run without
--download to rebuild from cached, checksum-verified NOAA responses. No application
source is changed by this builder. See vendor/skyschool-elevation/README.md.
"""
import argparse
import array
import base64
import bisect
import datetime
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'vendor' / 'skyschool-elevation'
SOURCE = 'https://www.ngdc.noaa.gov/thredds/dodsC/global/ETOPO2022/60s/60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc'
MASK = ROOT / 'vendor' / 'skyschool-geography' / 'land-water-mask.json'
MASK_SHA = '104393a0970b3239dcafb4b0a4fb2f64c6816ca114e02e3af9ec991a53481a86'
AIRPORTS = [('portland',43.646,-70.309),('new-york',40.640,-73.779),
 ('chicago',41.974,-87.907),('denver',39.856,-104.674),
 ('san-francisco',37.621,-122.379),('london',51.470,-.454),
 ('tokyo',35.553,139.780),('johannesburg',-26.134,28.242),
 ('sydney',-33.946,151.177),('sao-paulo',-23.432,-46.470),
 ('everest',27.9881,86.925)]
CHECK_POINTS = [('Denver',39.739,-104.990),('Front Range',39.75,-105.6),
 ('San Francisco',37.775,-122.418),('Portland inland',43.7,-70.4),
 ('Death Valley',36.25,-116.825),('Tibetan Plateau',32,86),
 ('Andes',-16.5,-68.2),('Alps',46.5,9.5),('Greenland ice surface',72,-40),
 ('Antarctic ice surface',-80,20),('Pacific Ocean',0,-150),
 ('Atlantic Ocean',0,-30),('Johannesburg',-26.2,28.05),('Sydney',-33.9,151.1),
 ('Everest',27.9881,86.925),('Fuji',35.3606,138.7274),('Dead Sea',31.5,35.5),
 ('Dateline west',-16,-179.999),('Dateline east',-16,179.999),
 ('North Pole',90,0),('South Pole',-90,0)]

def sha(data):
    return hashlib.sha256(data).hexdigest()

def save_json(path, value):
    data = (json.dumps(value, separators=(',', ':'), ensure_ascii=False) + '\n').encode()
    staged = path.with_suffix(path.suffix + '.tmp')
    staged.write_bytes(data)
    staged.replace(path)
    return data

def varint(value):
    result = bytearray()
    while value >= 128:
        result.append((value & 127) | 128)
        value >>= 7
    result.append(value)
    return result

def pack_row(values):
    data, previous, i = bytearray(), 0, 0
    while i < len(values):
        value = values[i]
        if value == previous:
            end = i + 1
            while end < len(values) and values[end] == previous:
                end += 1
            if end - i >= 3:
                data.extend((0,))
                data.extend(varint(end - i))
                i = end
                continue
        delta = value - previous
        data.extend(varint((delta * 2 if delta >= 0 else -delta * 2 - 1) + 1))
        previous = value
        i += 1
    return base64.b64encode(data).decode('ascii')

def unpack_row(encoded, width):
    data, result, i, previous = base64.b64decode(encoded, validate=True), [], 0, 0
    def read():
        nonlocal i
        value, shift = 0, 0
        while True:
            if i >= len(data) or shift > 28:
                raise ValueError('Invalid row varint')
            part = data[i]
            i += 1
            value |= (part & 127) << shift
            if part < 128:
                return value
            shift += 7
    while i < len(data):
        token = read()
        if token == 0:
            count = read()
            if count < 3 or len(result) + count > width:
                raise ValueError('Invalid repeat run')
            result.extend([previous] * count)
        else:
            zigzag = token - 1
            previous += -(zigzag // 2) - 1 if zigzag & 1 else zigzag // 2
            if not -32768 <= previous <= 32767:
                raise ValueError('Elevation outside Int16')
            result.append(previous)
        if len(result) > width:
            raise ValueError('Row overflow')
    if len(result) != width:
        raise ValueError('Row underflow')
    return result

class WaterMask:
    def __init__(self):
        data = MASK.read_bytes()
        if sha(data) != MASK_SHA:
            raise ValueError('Natural Earth mask changed; review before rebuilding')
        self.rows = json.loads(data)['rle'].split(';')
        self.cache = {}
    def row(self, lat):
        index = min(17999, max(0, int(math.floor((90 - lat) * 100))))
        if index not in self.cache:
            total, ends = 0, []
            for token in self.rows[index].split(','):
                total += int(token, 36)
                ends.append(total)
            if total != 36000:
                raise ValueError('Invalid land mask row')
            self.cache[index] = ends
        return self.cache[index]
    def is_water(self, lat, lon):
        index = min(35999, max(0, int(math.floor((((lon + 180) % 360)) * 100))))
        return bisect.bisect_right(self.row(lat), index) % 2 == 0

def read_dods(path, expected_count):
    with gzip.open(path, 'rb') as handle:
        data = handle.read()
    split = data.index(b'\nData:\n') + 7
    first, second = struct.unpack_from('>II', data, split)
    if first != expected_count or second != expected_count or len(data) != split + 8 + expected_count * 4:
        raise ValueError('Unexpected DAP2 array size')
    values = array.array('f')
    values.frombytes(data[split + 8:])
    if sys.byteorder == 'little':
        values.byteswap()
    if any(not math.isfinite(value) or value == -99999 or not -12000 <= value <= 10000 for value in values):
        raise ValueError('Invalid or missing ETOPO sample')
    return values, sha(data), data[:split].decode()

def fetch(grid, download):
    cache = OUT / 'source'
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / (grid['id'] + '.dods.gz')
    metadata_path = cache / (grid['id'] + '.json')
    rs, cs, stride = grid['sourceRowStart'], grid['sourceColStart'], grid['sourceStride']
    re_, ce = rs + stride * (grid['height'] - 1), cs + stride * (grid['width'] - 1)
    query = f'z.z[{rs}:{stride}:{re_}][{cs}:{stride}:{ce}]'
    url = SOURCE + '.dods?' + query
    if not path.exists():
        if not download:
            raise FileNotFoundError(str(path) + '; use --download')
        print('Fetching', grid['id'], query, flush=True)
        staged = path.with_suffix('.gz.tmp')
        try:
            with urllib.request.urlopen(url, timeout=240) as response, staged.open('wb') as raw:
                headers = dict(response.headers.items())
                with gzip.GzipFile(fileobj=raw, mode='wb', mtime=0, filename='') as target:
                    while True:
                        block = response.read(1024 * 1024)
                        if not block:
                            break
                        target.write(block)
            staged.replace(path)
            save_json(metadata_path, {'url': url, 'retrievedUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'responseHeaders': headers, 'archiveSha256': sha(path.read_bytes()), 'archiveBytes': path.stat().st_size})
        finally:
            if staged.exists():
                staged.unlink()
    metadata = json.loads(metadata_path.read_text())
    if metadata['url'] != url or metadata['archiveSha256'] != sha(path.read_bytes()):
        raise ValueError('Source archive differs from recorded response')
    values, raw_sha, header = read_dods(path, grid['width'] * grid['height'])
    metadata.update({'rawDodsSha256': raw_sha, 'dapHeader': header, 'sampleCount': len(values)})
    save_json(metadata_path, metadata)
    return values, metadata

def definitions(stride):
    start = stride // 2
    result = [{'id': 'global-' + str(stride) + 'min', 'sourceRowStart': start, 'sourceColStart': start,
      'sourceStride': stride, 'width': 21600 // stride, 'height': 10800 // stride}]
    for name, lat, lon in AIRPORTS:
        # A four-degree patch covers the airport and nearby sightseeing/mountain flights.
        result.append({'id': name + '-1min', 'sourceRowStart': int((lat + 90) * 60) - 120,
          'sourceColStart': int((lon + 180) * 60) - 120, 'sourceStride': 1, 'width': 241, 'height': 241})
    for grid in result:
        grid['lat0'] = -90 + (grid['sourceRowStart'] + .5) / 60
        grid['lon0'] = -180 + (grid['sourceColStart'] + .5) / 60
        grid['step'] = grid['sourceStride'] / 60
        grid['resolutionArcSeconds'] = grid['sourceStride'] * 60
    return result

def build(args):
    OUT.mkdir(parents=True, exist_ok=True)
    mask, grids, sources, fixtures, corners = WaterMask(), [], [], [], []
    for grid in definitions(args.global_stride):
        values, metadata = fetch(grid, args.download)
        rows, elevations_sha, wet_count, negative_land = [], hashlib.sha256(), 0, 0
        for row in range(grid['height']):
            lat = grid['lat0'] + row * grid['step']
            ends, heights = mask.row(lat), []
            for col in range(grid['width']):
                lon = grid['lon0'] + col * grid['step']
                pixel = min(35999, max(0, int(math.floor(((lon + 180) % 360) * 100))))
                wet = bisect.bisect_right(ends, pixel) % 2 == 0
                height = 0 if wet else int(math.floor(values[row * grid['width'] + col] + .5))
                wet_count += wet
                negative_land += height < 0
                heights.append(height)
            encoded = pack_row(heights)
            if unpack_row(encoded, grid['width']) != heights:
                raise ValueError('Row round-trip mismatch')
            rows.append(encoded)
            elevations_sha.update(struct.pack('<' + 'h' * len(heights), *heights))
        for label, lat, lon in CHECK_POINTS:
            ri, ci = round((lat - grid['lat0']) / grid['step']), round((lon - grid['lon0']) / grid['step'])
            if grid['id'].startswith('global-'):
                ri = min(grid['height'] - 1, max(0, ri))
                ci %= grid['width']
            if not 0 <= ri < grid['height'] or not 0 <= ci < grid['width']:
                continue
            sample_lat, sample_lon = grid['lat0'] + ri * grid['step'], grid['lon0'] + ci * grid['step']
            fixtures.append({'label':label, 'gridId':grid['id'], 'row':ri, 'column':ci,
              'sourceRow':grid['sourceRowStart'] + ri * grid['sourceStride'],
              'sourceColumn':grid['sourceColStart'] + ci * grid['sourceStride'],
              'lat':sample_lat, 'lon':sample_lon, 'rawSourceMeters':values[ri * grid['width'] + ci],
              'runtimeMeters':unpack_row(rows[ri],grid['width'])[ci], 'waterMask':mask.is_water(sample_lat,sample_lon)})
            # Four unmodified NOAA samples underlying the interpolation query.
            y = min(grid['height'] - 1, max(0, (lat - grid['lat0']) / grid['step']))
            x = (lon - grid['lon0']) / grid['step']
            if grid['id'].startswith('global-'):
                x %= grid['width']
            if not 0 <= x < grid['width'] - 1 and not grid['id'].startswith('global-'):
                continue
            r0, c0 = math.floor(y), math.floor(x)
            r1 = min(grid['height'] - 1, r0 + 1)
            c1 = (c0 + 1) % grid['width']
            corner_values = []
            for r, c in ((r0,c0),(r0,c1),(r1,c0),(r1,c1)):
                clat, clon = grid['lat0'] + r * grid['step'], grid['lon0'] + c * grid['step']
                corner_values.append({'row':r,'column':c,
                  'sourceRow':grid['sourceRowStart'] + r * grid['sourceStride'],
                  'sourceColumn':grid['sourceColStart'] + c * grid['sourceStride'],
                  'lat':clat,'lon':clon,'rawSourceMeters':values[r * grid['width'] + c],
                  'runtimeMeters':unpack_row(rows[r],grid['width'])[c],
                  'waterMask':mask.is_water(clat,clon)})
            corners.append({'label':label,'gridId':grid['id'],'queryLat':lat,'queryLon':lon,
              'fractionX':x-c0,'fractionY':y-r0,'cornerOrder':'southwest,southeast,northwest,northeast',
              'corners':corner_values})
        grid.update({'rows':rows, 'decodedInt16LeSha256':elevations_sha.hexdigest(),
            'waterSamplesZeroed':wet_count, 'negativeLandSamples':negative_land})
        grids.append(grid)
        sources.append({'gridId':grid['id'], **metadata})
        print('Packed', grid['id'], 'base64 bytes', sum(map(len,rows)), 'negative land',negative_land, flush=True)
    package = {'format':'skyschool-elevation-row-delta-v1','units':'meters','verticalDatum':'EGM2008',
      'sampling':'Source cell centres; rows south to north, columns west to east; nearest source sample at stated stride, no averaging',
      'waterPolicy':'Natural Earth land/water mask cells classified as water are zero in this terrain payload; inland water levels are a separate layer. Negative land elevations are retained.',
      'encoding':'Each row is base64 unsigned LEB128. Previous elevation begins at zero. Token n>0: add zigzagDecode(n-1), emit elevation. Token zero: next unsigned LEB128 count repeats previous elevation (count >=3). Signed Int16 metres after floor(raw+0.5) quantization.',
      'grids':grids}
    data = save_json(OUT / 'elevation-grid.json',package)
    save_json(OUT / 'source-samples.json', {'source':SOURCE,'samples':fixtures,'interpolationCases':corners})
    save_json(OUT / 'provenance.json',{'dataset':'NOAA NCEI ETOPO 2022 v1 Ice Surface Global Relief Model',
      'doi':'10.25921/fd45-gt74','sourceResolutionArcSeconds':60,'horizontalDatum':'WGS84 EPSG:4326',
      'verticalDatum':'EGM2008 EPSG:3855','sourceUnits':'meters, positive up','sourceFillValue':-99999,
      'license':'CC0 1.0 Universal','licenseMetadataUrl':'https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ngdc.mgg.dem%3Aetopo_2022',
      'source':SOURCE,'sources':sources,'waterMaskSha256':MASK_SHA,'packageSha256':sha(data),
      'packageBytes':len(data),'builderSha256':sha(Path(__file__).read_bytes()),
      'limitations':[f'{args.global_stride} arc-minute global samples are approximately {args.global_stride * 1.852:.2f} km apart north/south; 1 arc-minute training/scenic-region samples are approximately 1.85 km apart.',
        'Striding, metre quantization, bilinear interpolation and water masking reduce detail. Small peaks, cliffs, valleys and narrow channels cannot be represented faithfully.',
        'ETOPO is a merged Earth-surface model, not live terrain or a surveyed airport obstruction database. Training airport flattening and lake levels are simulator adjustments.']})
    print(json.dumps({'packageBytes':len(data),'packageSha256':sha(data),'grids':len(grids),'sourceSamples':len(fixtures)}),flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download',action='store_true',help='Fetch missing source subsets from NOAA')
    parser.add_argument('--global-stride',type=int,choices=(3,5),default=5,help='Source stride in 60-arc-second cells')
    build(parser.parse_args())
