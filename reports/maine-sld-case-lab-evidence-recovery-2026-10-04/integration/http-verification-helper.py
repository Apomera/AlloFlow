from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess
import sys

ROOT = Path(r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated')
REPORT = ROOT / 'reports/maine-sld-case-lab-evidence-recovery-2026-10-04/integration'
OUT = REPORT / 'source-preview'
NODE = 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
sha = lambda value: hashlib.sha256(value).hexdigest()
read_json = lambda file: json.loads(file.read_text(encoding='utf-8-sig'))

mode, session_text = sys.argv[1:]
assert mode in ('served', 'post-host'), 'Bounded HTTP verification mode'
session_id = int(session_text)
runtime = read_json(OUT / 'runtime.json')
meta = read_json(OUT / 'preview.json')
freeze = read_json(REPORT.parent / 'frozen-activity.json')
assert runtime['moduleSha256'] == meta['moduleSha256'] == freeze['moduleSha256']
assert runtime['bundleSha256'] == meta['bundleSha256']
assert runtime['sourceSha256'] == meta['sourceSha256']
assert runtime['pureHttpServe'] is True
assert sha(Path(runtime['ownedHelperPath']).read_bytes()) == runtime['ownedHelperSha256']
name = 'served-verification.json' if mode == 'served' else 'post-host-served-verification.json'
result_file = REPORT / name
assert not result_file.exists(), 'Preserve existing verification'
capture = Path(__file__).parent / 'evidence-recovery-http' / mode
assert not capture.exists(), 'Preserve prior HTTP capture'
capture.mkdir(parents=True)
checks = []
for route, asset in (
    ('/app/?tool=maine-sld-practice', 'index.html'),
    ('/__sld_preview/host.bundle.js', 'host.bundle.js'),
    ('/app/maine_sld_practice_module.js?v=' + meta['modulePin'], 'maine_sld_practice_module.js'),
):
    expected = sha((OUT / asset).read_bytes())
    dest = capture / asset
    arguments = ['--silent', '--show-error', '--fail', '--noproxy', '*', '--connect-timeout', '5',
                 '--max-time', '15', '--output', str(dest), '--write-out', '%{http_code} %{size_download} %{time_total}',
                 meta['baseUrl'] + route]
    result = subprocess.run(['curl.exe', *arguments], capture_output=True, text=True)
    values = result.stdout.strip().split()
    served = sha(dest.read_bytes()) if dest.exists() else None
    checks.append({
        'path': route, 'url': meta['baseUrl'] + route, 'curlArguments': arguments,
        'status': int(values[0]) if values else None,
        'downloadedBytes': int(values[1]) if len(values) > 1 else None,
        'seconds': float(values[2]) if len(values) > 2 else None,
        'responseFile': str(dest), 'servedSha256': served, 'expectedSha256': expected,
        'exitCode': result.returncode, 'failure': result.stderr.strip() or None,
    })
ok = all(row['exitCode'] == 0 and row['status'] == 200 and row['servedSha256'] == row['expectedSha256'] for row in checks)
recorded = datetime.now(timezone.utc).isoformat()
record = {
    'verifiedAt': recorded, 'baseUrl': meta['baseUrl'], 'runtimePid': runtime['pid'],
    'managedSessionId': session_id,
    'method': 'curl.exe --noproxy * --connect-timeout5 --max-time15 --fail; response SHA256 compared with immutable snapshot',
    'checks': checks, 'exactFrozenModuleServed': ok, 'reachableAfterLaunchToolReturned': ok,
    'runtimeMetadataSha256': sha((OUT / 'runtime.json').read_bytes()),
}
result_file.write_text(json.dumps(record, indent=2), encoding='utf-8')
if mode == 'served':
    managed_file = REPORT / 'managed-session.json'
    assert not managed_file.exists(), 'Preserve managed ownership evidence'
    managed = {
        'recordedAt': recorded, 'pid': runtime['pid'], 'managedSessionId': session_id,
        'plainPipes': True, 'visibleWindow': False,
        'pidEvidence': 'process.pid from owned server launch output and exact runtime.json',
        'processSignatureRecordedFromOwnedLaunch': {
            'executable': NODE,
            'arguments': [runtime['ownedHelperPath'], *runtime['launchArguments']],
            'helperSha256': runtime['ownedHelperSha256'],
        },
        'runtimeMetadataPath': str(OUT / 'runtime.json'), 'httpEvidencePath': str(result_file),
        'reachableAfterLaunchToolReturned': ok, 'rebuildPerformed': False,
    }
    managed_file.write_text(json.dumps(managed, indent=2), encoding='utf-8')
    helper_copy = REPORT / 'owned-helper.cjs'
    assert not helper_copy.exists(), 'Preserve owned-helper evidence'
    helper_copy.write_bytes(Path(runtime['ownedHelperPath']).read_bytes())
    assert sha(helper_copy.read_bytes()) == runtime['ownedHelperSha256']
print(json.dumps({'passed': ok, 'runtimePid': runtime['pid'], 'managedSessionId': session_id,
                  'moduleSha256': meta['moduleSha256'], 'sourceSha256': meta['sourceSha256'],
                  'bundleSha256': meta['bundleSha256'], 'record': str(result_file), 'checks': len(checks)}, indent=2))
assert ok, 'HTTP byte identity verification failed; failure records retained'
