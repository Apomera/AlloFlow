from pathlib import Path
import hashlib
import json
import sys

ROOT=Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')
LOCAL=Path(__file__).with_name('planning-review-validation')
REPORT=ROOT/'reports/maine-sld-case-lab-planning-review-2026-10-03/browser-validation'
module_sha,spec_sha,phase,attempt=sys.argv[1:5]
assert phase in ('module-five','host-only')
assert attempt.isalnum() or all(c.isalnum() or c in '-_' for c in attempt)
host_url=sys.argv[5] if len(sys.argv)>5 else 'http://127.0.0.1:65064/app'
sha=lambda body:hashlib.sha256(body).hexdigest()
frozen=json.loads((REPORT.parent/'frozen-activity.json').read_text(encoding='utf-8'))
assert frozen['moduleSha256']==module_sha
for rel,expected in frozen['sourceHashes'].items():assert sha((ROOT/rel).read_bytes())==expected,rel
for rel,expected in frozen['fourCopyHashes'].items():assert sha((ROOT/rel).read_bytes())==expected,rel
assert sha((ROOT/'tests/e2e/maine-sld-practice.spec.ts').read_bytes())==spec_sha
run=LOCAL/(phase+'-'+attempt)
archive=REPORT/(phase+'-'+attempt)
run.mkdir(parents=True,exist_ok=False)
archive.mkdir(parents=True,exist_ok=False)
grep='|'.join([
 'participant planning review keeps all five case reflections',
 'planning reflection edits return by keyboard',
 'participant review edits return to each exact control',
 'selected evidence remains available while navigating form questions',
 'participant comparison edits return to the selected pair',
]) if phase=='module-five' else 'public deep link opens the case directly'
script=f'''$ErrorActionPreference = 'Stop'
$expectedModule = '{module_sha}'
$expectedBrowser = '{spec_sha}'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedModule) {{ throw 'Module freeze changed before validation' }}
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedBrowser) {{ throw 'Browser spec changed before validation' }}
$env:SLD_HOST_BASE_URL = '{host_url}'
$env:SLD_REPORT_DIR = '{run.as_posix()}/browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = '{run.as_posix()}/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='{grep}' --reporter=list,json --output='{run.as_posix()}/artifacts' 2>&1 | Tee-Object -FilePath '{run.as_posix()}/run.log'
exit $LASTEXITCODE
'''
(run/'run-command.ps1').write_text(script,encoding='utf-8')
(archive/'run-command.ps1').write_text(script,encoding='utf-8')
(archive/'tested-spec.ts').write_bytes((ROOT/'tests/e2e/maine-sld-practice.spec.ts').read_bytes())
identity={'phase':phase,'attempt':attempt,'expectedModuleSha256':module_sha,'specSha256':spec_sha,'sourceHashes':frozen['sourceHashes'],'fourCopyHashes':frozen['fourCopyHashes'],'hostUrl':host_url,'selectedScenarios':5 if phase=='module-five' else 1,'workers':1,'retries':0,'testTimeoutMs':120000,'normalTracePolicy':'retain-on-failure','configSha256':sha((ROOT/'playwright.config.ts').read_bytes()),'original29PrefixBytePreserved':(ROOT/'tests/e2e/maine-sld-practice.spec.ts').read_bytes().startswith((REPORT/'baseline-29-spec.ts').read_bytes())}
(run/'run-identity.json').write_text(json.dumps(identity,indent=2),encoding='utf-8')
(archive/'run-identity.json').write_text(json.dumps(identity,indent=2),encoding='utf-8')
print(json.dumps({'command':str(run/'run-command.ps1'),'archive':str(archive),'grep':grep}))
