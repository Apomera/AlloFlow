from pathlib import Path
import hashlib
import json
import sys

ROOT=Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')
LOCAL=Path(__file__).with_name('jurisdiction-validation')
REPORT=ROOT/'reports/maine-sld-case-lab-federal-maine-2026-10-04/browser-validation'
SOURCE='0ace7842ded217dfc67d240f357acdfbca59a493ae0e7aef709e0dd006b846df'
MODULE='fec6407e57d7227198cd13620d3c9c52a9df40eba32c2de52e11fb2e66dcb0d9'
sha=lambda b:hashlib.sha256(b).hexdigest()
specpath=ROOT/'tests/e2e/maine-sld-practice.spec.ts'
baseline=(REPORT.parent/'before/tests/e2e/maine-sld-practice.spec.ts').read_bytes()
assert sha(baseline)=='25f75f6b96dfdba61036c1267e932cd94d0e4691a9969e80867ebe865afd0771'
assert sha((ROOT/'maine_sld_practice_source.jsx').read_bytes())==SOURCE
for file in ('maine_sld_practice_module.js','desktop/web-app/public/maine_sld_practice_module.js','desktop/app-build/maine_sld_practice_module.js','desktop/web-app/build/maine_sld_practice_module.js'):
    assert sha((ROOT/file).read_bytes())==MODULE,file
if sys.argv[1]=='append':
    assert specpath.read_bytes()==baseline
    REPORT.mkdir(exist_ok=False,parents=True)
    LOCAL.mkdir(exist_ok=False,parents=True)
    addition=Path(__file__).with_name('jurisdiction_additions.ts').read_bytes()
    candidate=baseline+addition
    proof={'original37PrefixBytePreserved':True,'retainedOriginalScenarios':37,'availableScenariosAfterAddition':38,'newScenarios':1,'original37Sha256':sha(baseline),'original37Bytes':len(baseline),'additionsSha256':sha(addition),'browserTestSha256':sha(candidate),'browserTestBytes':len(candidate),'sourceSha256':SOURCE,'moduleSha256':MODULE}
    for parent in (LOCAL,REPORT):
        (parent/'baseline-37-spec.ts').write_bytes(baseline)
        (parent/'jurisdiction-additions.ts').write_bytes(addition)
        (parent/'append-proof.json').write_text(json.dumps(proof,indent=2))
    specpath.write_bytes(candidate)
    print(json.dumps(proof,indent=2))
elif sys.argv[1]=='prepare':
    phase,attempt=sys.argv[2:4]
    assert phase in ('module-focused','host-only') and attempt.isdigit()
    proof=json.loads((REPORT/'append-proof.json').read_text())
    spec=specpath.read_bytes()
    assert spec.startswith(baseline) and sha(spec)==proof['browserTestSha256']
    grep='federal and Maine jurisdiction disclosures|all52 scores, evidence and Q8/Q9 work survive' if phase=='module-focused' else 'public deep link opens the case directly'
    count=2 if phase=='module-focused' else 1
    run=LOCAL/(phase+'-'+attempt);archive=REPORT/run.name
    run.mkdir(exist_ok=False);archive.mkdir(exist_ok=False)
    command=f'''$ErrorActionPreference = 'Stop'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '{MODULE}') {{ throw 'Module freeze changed' }}
if ((Get-FileHash -LiteralPath 'maine_sld_practice_source.jsx' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '{SOURCE}') {{ throw 'Source freeze changed' }}
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '{proof['browserTestSha256']}') {{ throw 'Canonical spec changed' }}
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65063/app'
$env:SLD_REPORT_DIR = '{run.as_posix()}/browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = '{run.as_posix()}/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='{grep}' --reporter=list,json --output='{run.as_posix()}/artifacts' 2>&1 | Tee-Object -FilePath '{run.as_posix()}/run.log'
exit $LASTEXITCODE
'''
    identity={'phase':phase,'attempt':attempt,'expectedModuleSha256':MODULE,'sourceSha256':SOURCE,'browserTestSha256':proof['browserTestSha256'],'workers':1,'automaticRetries':0,'timeoutMs':120000,'normalTracePolicy':'retain-on-failure','validationMethod':'original canonical specification and unchanged synchronous stylesheet setup','preparedAssetValidation':False,'selectedScenarios':count,'availableScenarios':38,'original37PrefixBytePreserved':True,'original37Sha256':sha(baseline),'original37Bytes':len(baseline),'configSha256':sha((ROOT/'playwright.config.ts').read_bytes())}
    for parent in (run,archive):
        (parent/'run-command.ps1').write_bytes(command.encode())
        (parent/'run-identity.json').write_text(json.dumps(identity,indent=2))
        (parent/'runner-helper.py').write_bytes(Path(__file__).read_bytes())
    (archive/'tested-spec.ts').write_bytes(spec)
    print(json.dumps({'runCommand':str(run/'run-command.ps1'),'identity':identity},indent=2))
else: raise AssertionError('Unknown mode')
