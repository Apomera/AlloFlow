from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json

ROOT = Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')
BASE = Path(__file__).parent / 'evidence-recovery-validation'
REPORT = ROOT / 'reports/maine-sld-case-lab-evidence-recovery-2026-10-04/browser-validation'
SPEC = ROOT / 'tests/e2e/maine-sld-practice.spec.ts'
sha = lambda body: hashlib.sha256(body).hexdigest()
old = SPEC.read_bytes()
assert sha(old) == 'ab21f099c4723a58230e306ad8270dc198627a2b829e1a9ab33a29679483c37a'
baseline = (BASE / 'baseline-35-spec.ts').read_bytes()
assert old.startswith(baseline)
run = json.loads((REPORT / 'module-focused-01/result.json').read_text())
assert run['stats']['expected'] == 4 and run['stats']['unexpected'] == 1
before = "'Undo removal of '+row.label+' · '+row.test+' · '+fixture.title"
after = "'Undo removal of '+row.label+' · '+(row.test||'Unspecified assessment')+' · '+fixture.title"
append = old[len(baseline):].decode()
assert append.count(before) == 1
updated = append.replace(before, after).encode()
combined = baseline + updated
archive = REPORT / 'assessment-expectation-correction'
archive.mkdir(exist_ok=False)
(archive / 'prior-canonical-37-spec.ts').write_bytes(old)
(archive / 'prior-final-append-proof.json').write_bytes((REPORT / 'final-append-proof.json').read_bytes())
(archive / 'correction-helper.py').write_bytes(Path(__file__).read_bytes())
proof = {'refinedAt': datetime.now(timezone.utc).isoformat(), 'original35PrefixBytePreserved': True, 'original35Sha256': sha(baseline), 'original35Bytes': len(baseline), 'newScenarios': 2, 'availableScenariosAfterAddition': 37, 'initial37Sha256': '286c499df4c04b5f7cd21f53010f95835c0987d3e6c83604b880f64089c5b1ab', 'previous37Sha256': sha(old), 'browserTestSha256': sha(combined), 'appendSha256': sha(updated), 'replacementCount': 1, 'method': 'Correct only the new exact accessible-name assertion for existing null assessment data. Unspecified assessment is the existing source-record fallback; assertion remains exact and case/label-specific. Original 35 bytes, initial expected baseline failure and first final-candidate raw run are preserved.'}
assert SPEC.read_bytes() == old
SPEC.write_bytes(combined)
for parent in (BASE, REPORT):
    (parent / 'final-append-proof.json').write_text(json.dumps(proof, indent=2), encoding='utf-8')
    (parent / 'final-evidence-recovery-additions.ts').write_bytes(updated)
(BASE / 'final-prepared-canonical-spec.ts').write_bytes(combined)
print(json.dumps(proof, indent=2))
