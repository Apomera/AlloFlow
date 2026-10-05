from pathlib import Path
import hashlib
import json
import sys

ROOT = Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')
LOCAL = Path(__file__).with_name('evidence-recovery-validation')
REPORT = ROOT / 'reports/maine-sld-case-lab-evidence-recovery-2026-10-04/browser-validation'
SPEC = '286c499df4c04b5f7cd21f53010f95835c0987d3e6c83604b880f64089c5b1ab'
phase, attempt, MODULE, SOURCE = sys.argv[1:5]
assert phase in ('baseline-regression', 'module-focused', 'host-only') and attempt.isdigit()
sha = lambda data: hashlib.sha256(data).hexdigest()
assert sha((ROOT / 'maine_sld_practice_source.jsx').read_bytes()) == SOURCE
copies = ['maine_sld_practice_module.js', 'desktop/web-app/public/maine_sld_practice_module.js', 'desktop/app-build/maine_sld_practice_module.js', 'desktop/web-app/build/maine_sld_practice_module.js']
for file in copies: assert sha((ROOT / file).read_bytes()) == MODULE, file
spec = (ROOT / 'tests/e2e/maine-sld-practice.spec.ts').read_bytes()
assert sha(spec) == SPEC
baseline = (REPORT / 'baseline-35-spec.ts').read_bytes()
assert sha(baseline) == '7bb6f0cc88bba10e031afde06bc224c189b26003a584f6f8dd9b7104d25bd8f4' and spec.startswith(baseline)
if phase == 'baseline-regression':
    assert MODULE == '018f7f789eb751dabd354bb28079fe60ce92d9a94f052fe9ce679c2230c7c7fc' and SOURCE == '46d1ce09304d70d98b60a4a7a758969b3c5f3eef99a6c5b522113a06e9397437'
    grep = 'most recent finding removal can restore exact roles'
    count = 1
elif phase == 'module-focused':
    grep = '|'.join(['most recent finding removal can restore exact roles', 'finding removal recovery keeps neighboring board focus'])
    count = 2
else:
    grep = 'public deep link opens the case directly'
    count = 1
run = LOCAL / (phase + '-' + attempt)
archive = REPORT / run.name
run.mkdir(parents=True, exist_ok=False)
archive.mkdir(parents=True, exist_ok=False)
command = f'''$ErrorActionPreference = 'Stop'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '{MODULE}') {{ throw 'Module freeze changed' }}
if ((Get-FileHash -LiteralPath 'maine_sld_practice_source.jsx' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '{SOURCE}') {{ throw 'Source freeze changed' }}
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '{SPEC}') {{ throw 'Canonical spec changed' }}
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65063/app'
$env:SLD_REPORT_DIR = '{run.as_posix()}/browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = '{run.as_posix()}/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='{grep}' --reporter=list,json --output='{run.as_posix()}/artifacts' 2>&1 | Tee-Object -FilePath '{run.as_posix()}/run.log'
exit $LASTEXITCODE
'''
identity = {'phase': phase, 'attempt': attempt, 'expectedModuleSha256': MODULE, 'sourceSha256': SOURCE, 'browserTestSha256': SPEC, 'workers': 1, 'automaticRetries': 0, 'timeoutMs': 120000, 'normalTracePolicy': 'retain-on-failure', 'validationMethod': 'original canonical specification and unchanged synchronous stylesheet setup', 'preparedAssetValidation': False, 'selectedScenarios': count, 'availableScenarios': 37, 'original35PrefixBytePreserved': True, 'original35Sha256': sha(baseline), 'original35Bytes': len(baseline), 'configSha256': sha((ROOT / 'playwright.config.ts').read_bytes()), 'expectedBaselineFailure': phase == 'baseline-regression'}
for parent in (run, archive):
    (parent / 'run-command.ps1').write_bytes(command.encode())
    (parent / 'run-identity.json').write_bytes(json.dumps(identity, indent=2).encode())
    (parent / 'runner-helper.py').write_bytes(Path(__file__).read_bytes())
(archive / 'tested-spec.ts').write_bytes(spec)
print(json.dumps({'runCommand': str(run / 'run-command.ps1'), 'identity': identity}, indent=2))
