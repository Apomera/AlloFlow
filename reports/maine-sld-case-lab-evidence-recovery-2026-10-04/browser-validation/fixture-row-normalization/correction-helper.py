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
assert sha(old) == 'e392450f32f1b50f9fdc9833a0d9c66008326043e210156766440c5d3239e9d0'
baseline = (BASE / 'baseline-35-spec.ts').read_bytes()
assert old.startswith(baseline)
append = old[len(baseline):].decode()
changes = [
    ("const rows=data.scoreRows.filter((row:any)=>(fixture.scoreRowIds||[]).includes(row.id)).concat(fixture.extraScoreRows||fixture.inlineScores||[]);if(!rows.length)continue;", "const rows=data.scoreRows.filter((row:any)=>(fixture.scoreRowIds||[]).includes(row.id)).concat(fixture.extraScoreRows||fixture.inlineScores||[]).map((row:any)=>({...row,test:row.test||'Unspecified assessment'}));if(!rows.length)continue;"),
    ("await narrowPreview.locator('summary').scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'finding-removal-preview-alex-320-dark.png'),fullPage:false});", "await page.getByTestId('removed-finding-note').scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'finding-removal-preview-alex-320-dark.png'),fullPage:false});")
]
for before, after in changes:
    assert append.count(before) == 1, before
    append = append.replace(before, after)
combined = baseline + append.encode()
archive = REPORT / 'fixture-row-normalization'
archive.mkdir(exist_ok=False)
(archive / 'prior-canonical-37-spec.ts').write_bytes(old)
(archive / 'prior-final-append-proof.json').write_bytes((REPORT / 'final-append-proof.json').read_bytes())
(archive / 'correction-helper.py').write_bytes(Path(__file__).read_bytes())
proof = {'refinedAt': datetime.now(timezone.utc).isoformat(), 'original35PrefixBytePreserved': True, 'original35Sha256': sha(baseline), 'original35Bytes': len(baseline), 'newScenarios': 2, 'availableScenariosAfterAddition': 37, 'initial37Sha256': '286c499df4c04b5f7cd21f53010f95835c0987d3e6c83604b880f64089c5b1ab', 'previous37Sha256': sha(old), 'browserTestSha256': sha(combined), 'appendSha256': sha(append.encode()), 'replacementCount': len(changes), 'method': 'Normalize the new fixture score-row assessment once to the existing Unspecified assessment fallback before exact accessible-name, assessment selection and value assertions. Scroll the expanded literal note into view for its capture. Original 35 bytes and all intermediate fixture versions are preserved.'}
assert SPEC.read_bytes() == old
SPEC.write_bytes(combined)
for parent in (BASE, REPORT):
    (parent / 'final-append-proof.json').write_text(json.dumps(proof, indent=2), encoding='utf-8')
    (parent / 'final-evidence-recovery-additions.ts').write_bytes(append.encode())
(BASE / 'final-prepared-canonical-spec.ts').write_bytes(combined)
print(json.dumps(proof, indent=2))
