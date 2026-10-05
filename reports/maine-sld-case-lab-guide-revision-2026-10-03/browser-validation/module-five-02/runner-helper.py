from pathlib import Path
import hashlib
import json
import sys

ROOT = Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')
LOCAL = Path(__file__).with_name('guide-revision-validation')
REPORT = ROOT / 'reports/maine-sld-case-lab-guide-revision-2026-10-03/browser-validation'
SPEC = '7bb6f0cc88bba10e031afde06bc224c189b26003a584f6f8dd9b7104d25bd8f4'
phase, attempt, MODULE, SOURCE = sys.argv[1:5]
assert phase in ('module-five', 'host-only') and attempt.isdigit()
assert len(MODULE) == len(SOURCE) == 64
frozen = json.loads((REPORT.parent / 'frozen-activity.json').read_text(encoding='utf-8'))
sha = lambda body: hashlib.sha256(body).hexdigest()
assert frozen['moduleSha256'] == MODULE
assert sha((ROOT / 'maine_sld_practice_source.jsx').read_bytes()) == SOURCE
for rel, expected in {**frozen['sourceHashes'], **frozen['fourCopyHashes']}.items():
    assert sha((ROOT / rel).read_bytes()) == expected, rel
spec = (ROOT / 'tests/e2e/maine-sld-practice.spec.ts').read_bytes()
assert sha(spec) == SPEC
baseline = (REPORT / 'baseline-33-spec.ts').read_bytes()
assert sha(baseline) == '32341725cd74244a0f50c9fb149b500bea68fcc179f5de41ba4d862e499014b8' and spec.startswith(baseline)
run = LOCAL / (phase + '-' + attempt)
archive = REPORT / run.name
run.mkdir(parents=True, exist_ok=False)
archive.mkdir(parents=True, exist_ok=False)
grep = '|'.join(['reviewed guide revision buttons focus each existing question', 'participant review edits return to each exact control', 'session save warning preserves open work and focus', 'reviewed guide revisions return by keyboard', 'reviewed guide narrative status treats whitespace']) if phase == 'module-five' else 'public deep link opens the case directly'
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
identity = {'phase': phase, 'attempt': attempt, 'expectedModuleSha256': MODULE, 'sourceSha256': SOURCE, 'browserTestSha256': SPEC, 'sourceHashes': frozen['sourceHashes'], 'fourCopyHashes': frozen['fourCopyHashes'], 'workers': 1, 'automaticRetries': 0, 'testTimeoutMs': 120000, 'normalTracePolicy': 'retain-on-failure', 'selectedScenarios': 5 if phase == 'module-five' else 1, 'availableScenarios': 35, 'original33PrefixBytePreserved': True, 'original33Sha256': sha(baseline), 'original33Bytes': len(baseline), 'validationMethod': 'original canonical specification and unchanged synchronous stylesheet setup', 'preparedAssetValidation': False, 'configSha256': sha((ROOT / 'playwright.config.ts').read_bytes()), 'provisionalEarlierCandidate': {'moduleSha256': '0ceb5207851a88db30562486dd838e6efbf126cc0e8a7dee7ddc14340864af7c', 'sourceSha256': 'd96b8d5a34e9b689b691792ff6e47f63e3be16c856f38f383303988bee78c5e7'}}
for target in (run, archive):
    (target / 'run-command.ps1').write_bytes(command.encode())
    (target / 'run-identity.json').write_bytes(json.dumps(identity, indent=2).encode())
    (target / 'runner-helper.py').write_bytes(Path(__file__).read_bytes())
(archive / 'tested-spec.ts').write_bytes(spec)
print(json.dumps({'runCommand': str(run / 'run-command.ps1'), 'identity': identity, 'selectedGrep': grep}, indent=2))
