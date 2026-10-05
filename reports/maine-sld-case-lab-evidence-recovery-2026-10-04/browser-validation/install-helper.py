from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re

ROOT = Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')
LOCAL = Path(__file__).with_name('evidence-recovery-validation')
REPORT = ROOT / 'reports/maine-sld-case-lab-evidence-recovery-2026-10-04/browser-validation'
SPEC = ROOT / 'tests/e2e/maine-sld-practice.spec.ts'
sha = lambda data: hashlib.sha256(data).hexdigest()
original = SPEC.read_bytes()
assert sha(original) == '7bb6f0cc88bba10e031afde06bc224c189b26003a584f6f8dd9b7104d25bd8f4'
before = ROOT / 'reports/maine-sld-case-lab-evidence-recovery-2026-10-04/before/tests/e2e/maine-sld-practice.spec.ts'
assert before.read_bytes() == original
assert sha((ROOT / 'maine_sld_practice_source.jsx').read_bytes()) == '46d1ce09304d70d98b60a4a7a758969b3c5f3eef99a6c5b522113a06e9397437'
assert sha((ROOT / 'maine_sld_practice_module.js').read_bytes()) == '018f7f789eb751dabd354bb28079fe60ce92d9a94f052fe9ce679c2230c7c7fc'
addition = Path(__file__).with_name('evidence_recovery_additions.ts').read_bytes()
direct = lambda body: len(re.findall(rb'(?m)^\s*test\(', body))
assert direct(original) == 29 and direct(addition) == 2
parameterized = b"for(const width of [1440,390])for(const theme of ['light','dark','contrast'])test("
assert original.count(parameterized) == 1 and parameterized not in addition
combined = original + addition
assert combined[:len(original)] == original and combined[len(original):] == addition
assert direct(combined) == 31
LOCAL.mkdir(parents=True, exist_ok=False)
REPORT.mkdir(parents=True, exist_ok=True)
proof = {'installedAt': datetime.now(timezone.utc).isoformat(), 'original35PrefixBytePreserved': True, 'original35Sha256': sha(original), 'original35Bytes': len(original), 'newScenarios': 2, 'originalDirectDefinitions': 29, 'retainedParameterizedScenarios': 6, 'availableScenariosAfterAddition': 37, 'appendSha256': sha(addition), 'browserTestSha256': sha(combined), 'baselineSourceSha256': '46d1ce09304d70d98b60a4a7a758969b3c5f3eef99a6c5b522113a06e9397437', 'baselineModuleSha256': '018f7f789eb751dabd354bb28079fe60ce92d9a94f052fe9ce679c2230c7c7fc', 'method': 'Guarded append of exactly two direct definitions; prior 35 bytes and parameterized definitions unchanged'}
for parent in (LOCAL, REPORT):
    (parent / 'baseline-35-spec.ts').write_bytes(original)
    (parent / 'append-proof.json').write_bytes(json.dumps(proof, indent=2).encode())
    (parent / 'install-helper.py').write_bytes(Path(__file__).read_bytes())
    (parent / 'evidence_recovery_additions.ts').write_bytes(addition)
(LOCAL / 'prepared-canonical-spec.ts').write_bytes(combined)
assert SPEC.read_bytes() == original
SPEC.write_bytes(combined)
assert SPEC.read_bytes() == combined
print(json.dumps(proof, indent=2))
