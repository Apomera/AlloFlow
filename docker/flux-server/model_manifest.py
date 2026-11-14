"""Explicit provisioning and integrity check. Importing never downloads anything."""
from pathlib import Path
import hashlib
import json
import os
import shutil


def model_record(model_id):
    catalog = json.loads(Path(__file__).with_name('model-manifest.json').read_text(encoding='utf-8'))
    try:
        record = catalog['models'][model_id]
        if record.get('managed_download') is False:
            raise ValueError('This model requires separate operator provisioning; public integrity metadata is unavailable')
        return record
    except KeyError:
        raise ValueError('Managed installation supports only models in model-manifest.json') from None


def verify_snapshot(snapshot, record):
    root = Path(snapshot)
    resolved_root = root.resolve()
    allowed_roots = [resolved_root]
    if resolved_root.parent.name == 'snapshots':
        allowed_roots.append((resolved_root.parent.parent / 'blobs').resolve())
    for item in record['files']:
        relative = Path(item['path'])
        if relative.anchor or relative.is_absolute() or '..' in relative.parts or '\\' in item['path']:
            raise ValueError('Unsafe model manifest path')
        target = root / relative
        resolved_target = target.resolve()
        if not any(resolved_target.is_relative_to(base) for base in allowed_roots):
            raise ValueError('Unsafe model manifest path')
        if not target.is_file() or target.stat().st_size != item['bytes']:
            raise ValueError('Model file missing or wrong size: ' + item['path'])
        digest = hashlib.sha256() if item.get('sha256') else hashlib.sha1()
        if not item.get('sha256'):
            digest.update(('blob ' + str(item['bytes']) + '\0').encode('ascii'))
        with target.open('rb') as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                digest.update(chunk)
        expected = item.get('sha256') or item.get('git_blob')
        if not expected or digest.hexdigest() != expected:
            raise ValueError('Model integrity verification failed: ' + item['path'])
    return True


def provision(model_id, revision=None, *, download=False, snapshot_download=None):
    record = model_record(model_id)
    if revision and revision != record['revision']:
        raise ValueError('Managed installation requires the reviewed manifest revision')
    cache = Path(os.environ.get('HF_HOME', '/models'))
    existing = cache / 'hub' / ('models--' + model_id.replace('/', '--')) / 'snapshots' / record['revision']
    pending = record['files']
    if existing.is_dir():
        pending = []
        for item in record['files']:
            try:
                verify_snapshot(existing, {'files': [item]})
            except ValueError:
                pending.append(item)
        if not pending:
            return {'model': model_id, 'revision': record['revision'], 'verified': True}
    if not download:
        raise ValueError('The verified model is not installed. Use Install before starting offline.')
    ancestor = cache
    while not ancestor.exists(): ancestor = ancestor.parent
    required = sum(item['bytes'] for item in pending) + 2 * 1024**3
    if shutil.disk_usage(ancestor).free < required:
        raise ValueError('Not enough model-cache space: allow model bytes plus 2 GiB working space')
    if snapshot_download is None:
        from huggingface_hub import snapshot_download
    location = snapshot_download(repo_id=model_id, revision=record['revision'],
                                 cache_dir=str(cache / 'hub'), allow_patterns=[f['path'] for f in pending],
                                 force_download=existing.is_dir())
    verify_snapshot(location, record)
    return {'model': model_id, 'revision': record['revision'], 'verified': True}


if __name__ == '__main__':
    import argparse
    from image_backends import ImageBackend
    parser = argparse.ArgumentParser(description='Install or verify the pinned local image model without GPU inference')
    parser.add_argument('--download', action='store_true', help='Explicitly permit downloading the reviewed model files')
    args = parser.parse_args()
    backend = ImageBackend.from_env()
    print(json.dumps(provision(backend.model_id, backend.revision, download=args.download)))
