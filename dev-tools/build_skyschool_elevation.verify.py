#!/usr/bin/env python3
"""Independently verify selected ETOPO samples through NOAA's ASCII endpoint.

Run with --download once to save compact authoritative responses. Subsequent
runs use the saved fixtures without any network request. This deliberately
uses ASCII decimal values rather than the build's binary DAP2 parser.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'vendor' / 'skyschool-elevation'

def sha(value):
    return hashlib.sha256(value).hexdigest()

def main(download):
    package_bytes = (OUT / 'elevation-grid.json').read_bytes()
    package = json.loads(package_bytes)
    provenance = json.loads((OUT / 'provenance.json').read_bytes())
    if sha(package_bytes) != provenance['packageSha256']:
        raise ValueError('Payload hash does not match provenance')
    source_fixtures = json.loads((OUT / 'source-samples.json').read_bytes())
    targets = {
        ('Denver','denver-1min'), ('Front Range','denver-1min'),
        ('San Francisco','san-francisco-1min'), ('Everest','everest-1min'),
        ('Fuji','tokyo-1min'), ('Death Valley','global-5min'),
        ('Dead Sea','global-5min'), ('Pacific Ocean','global-5min'),
        ('Dateline west','global-5min'), ('Dateline east','global-5min'),
        ('North Pole','global-5min'), ('South Pole','global-5min')}
    selected = [s for s in source_fixtures['samples'] if (s['label'],s['gridId']) in targets]
    if len(selected) != len(targets):
        raise ValueError('Missing expected independent source fixture')
    output_path = OUT / 'independent-source-checks.json'
    if download:
        checks = []
        for sample in selected:
            row, col = sample['sourceRow'], sample['sourceColumn']
            url = source_fixtures['source'] + f'.ascii?z.z[{row}:1:{row}][{col}:1:{col}]'
            with urllib.request.urlopen(url,timeout=60) as response:
                data = response.read()
            match = re.search(r'^\[0\],\s*([-+\d.eE]+)\s*$',data.decode(),re.MULTILINE)
            if not match:
                raise ValueError('Unexpected NOAA ASCII sample response')
            checks.append({'label':sample['label'],'gridId':sample['gridId'],
                'sourceRow':row,'sourceColumn':col,'url':url,'asciiMeters':float(match.group(1)),
                'responseSha256':sha(data),'responseText':data.decode()})
            print('Fetched independent sample',sample['label'],flush=True)
        output_path.write_text(json.dumps({'method':'Independent NOAA OPeNDAP ASCII endpoint; distinct from the binary array decoder',
          'checks':checks},separators=(',',':')) + '\n',encoding='utf-8')
        for extension, name in (('das','source-metadata.das'),('dds','source-schema.dds')):
            with urllib.request.urlopen(source_fixtures['source'] + '.' + extension,timeout=60) as response:
                (OUT / name).write_bytes(response.read())
    checks = json.loads(output_path.read_bytes())['checks']
    for sample in selected:
        matches = [c for c in checks if c['label'] == sample['label'] and c['gridId'] == sample['gridId']]
        if len(matches) != 1:
            raise ValueError('Independent check missing or ambiguous')
        check = matches[0]
        if check['sourceRow'] != sample['sourceRow'] or check['sourceColumn'] != sample['sourceColumn']:
            raise ValueError('Source sample registration changed')
        if abs(check['asciiMeters'] - sample['rawSourceMeters']) > .001:
            raise ValueError('Binary sample differs from independent NOAA ASCII value')
        if sha(check['responseText'].encode()) != check['responseSha256']:
            raise ValueError('Saved ASCII response differs from its hash')
    metadata = (OUT / 'source-metadata.das').read_text()
    schema = (OUT / 'source-schema.dds').read_text()
    if 'vert_crs_name "EGM2008"' not in metadata or 'units "meters"' not in metadata:
        raise ValueError('Unexpected ETOPO vertical datum or units')
    if 'lat = 10800' not in schema or 'lon = 21600' not in schema:
        raise ValueError('Unexpected source dimensions')
    print(json.dumps({'independentAsciiChecks':len(checks),'packageSha256':sha(package_bytes),
        'grids':len(package['grids']),'sourceMetadataSha256':sha((OUT/'source-metadata.das').read_bytes()),
        'sourceSchemaSha256':sha((OUT/'source-schema.dds').read_bytes())}),flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download',action='store_true')
    main(parser.parse_args().download)
