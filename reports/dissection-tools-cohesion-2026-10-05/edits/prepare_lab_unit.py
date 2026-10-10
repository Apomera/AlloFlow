from hashlib import sha256
from pathlib import Path
import json

scratch = Path(__file__).resolve().parent
candidate = scratch / 'lab-unit-next.js'
expected = 'a8154bdfe3220be90876c32e93e870cba750979234fe262fbbc274ce5c8706b2'
before = candidate.read_bytes()
before_sha = sha256(before).hexdigest()
if before_sha != expected:
    raise RuntimeError(f'Candidate before SHA changed: {before_sha}')

anchor = b"  it('captures the full canvas only after an explicit contents choice and preserves learner work', async () => {"
if before.count(anchor) != 1:
    raise RuntimeError('Expected exactly one guarded insertion anchor')
fragment = (scratch / 'lab-unit-additions.jsfrag').read_bytes().replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
after = before.replace(anchor, fragment + b'\r\n' + anchor, 1)
if after.replace(fragment + b'\r\n', b'', 1) != before:
    raise RuntimeError('Existing unit file preservation check failed')
candidate.write_bytes(after)
receipt = {
    'source': 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/dissection_lab_improvements.test.js',
    'candidate': str(candidate).replace('\\', '/'),
    'beforeSha256': before_sha,
    'afterSha256': sha256(after).hexdigest(),
    'originalUnitBytesPreserved': True,
    'operation': 'Insert scoped lab grouping/native controls/full PNG unit cases before existing full-canvas notebook capture test',
    'newCases': 16,
    'existingCasesExpected': 225,
    'totalCasesExpected': 241,
    'sourceWrites': False,
    'suitesRun': False,
    'syntaxCheck': 'Pending node --check only; no suite execution',
}
(scratch / 'lab-unit-edit-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print(json.dumps(receipt, indent=2))
