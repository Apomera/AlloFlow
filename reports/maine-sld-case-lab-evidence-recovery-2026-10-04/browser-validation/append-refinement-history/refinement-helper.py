from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re

ROOT = Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')
BASE = Path(__file__).parent / 'evidence-recovery-validation'
REPORT = ROOT / 'reports/maine-sld-case-lab-evidence-recovery-2026-10-04/browser-validation'
SPEC = ROOT / 'tests/e2e/maine-sld-practice.spec.ts'
sha = lambda data: hashlib.sha256(data).hexdigest()
old = SPEC.read_bytes()
assert sha(old) == '286c499df4c04b5f7cd21f53010f95835c0987d3e6c83604b880f64089c5b1ab'
baseline = (BASE / 'baseline-35-spec.ts').read_bytes()
assert old.startswith(baseline) and sha(baseline).startswith('7bb6f0cc')
assert json.loads((REPORT / 'baseline-regression-proof.json').read_text())['status'] == 'EXPECTED_BASELINE_FAILURE'
addition = old[len(baseline):].decode()
changes = [
    ("await expect(detail).toContainText('Supports the concern');", "await expect(detail).toContainText('Supports the concern');await noActivityHorizontalOverflow(page);"),
    ("await findingRemovalAxe(page,'axe-finding-removal-recovery-320-dark.json',{width:320,height:844,theme:'dark',state:'Most recent removed finding recovery'});", "await findingRemovalAxe(page,'axe-finding-removal-recovery-320-dark.json',{width:320,height:844,theme:'dark',state:'Most recent removed finding recovery'});const narrowPreview=page.getByTestId('finding-removal-recovery').locator('details');await narrowPreview.locator('summary').click();expect(await narrowPreview.textContent()).toContain(findingRemovalNote('alex'));await expect(narrowPreview.locator('[data-finding-removal]')).toHaveCount(0);await noActivityHorizontalOverflow(page);await narrowPreview.locator('summary').scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'finding-removal-preview-alex-320-dark.png'),fullPage:false});"),
    ("await page.getByTestId('score-note-'+row.id).fill('Hidden score restoration retains its participant note.');", "const landscapeNote=findingRemovalNote('alex');await page.getByTestId('score-note-'+row.id).fill(landscapeNote);"),
    ("await expect(page.getByTestId('score-note-'+row.id)).toHaveValue('Hidden score restoration retains its participant note.');", "await expect(page.getByTestId('score-note-'+row.id)).toHaveValue(landscapeNote);"),
    ("await findingRemovalAxe(page,'axe-finding-removal-recovery-844x390-dark.json',{width:844,height:390,theme:'dark',state:'Score finding removal recovery in short landscape'});expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);", "await findingRemovalAxe(page,'axe-finding-removal-recovery-844x390-dark.json',{width:844,height:390,theme:'dark',state:'Score finding removal recovery in short landscape'});await page.getByTestId('undo-finding-removal').focus();await page.keyboard.press('Enter');await findingRemovalFocusVisible(page,'score-note-'+row.id);await expect(page.getByTestId('score-note-'+row.id)).toHaveValue(landscapeNote);await expect(page.getByTestId('score-purpose-'+row.id)).toHaveValue('supporting');await expect(page.getByTestId('finding-removal-recovery')).toHaveCount(0);await noActivityHorizontalOverflow(page);await page.screenshot({path:join(REPORT,'finding-removal-restored-note-alex-844x390-dark.png'),fullPage:false});await findingRemovalAxe(page,'axe-finding-removal-restored-note-844x390-dark.json',{width:844,height:390,theme:'dark',state:'Restored literal participant note fully focused in short landscape'});expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);")
]
for before, after in changes:
    assert addition.count(before) == 1, before
    addition = addition.replace(before, after)
combined = baseline + addition.encode()
assert combined.startswith(baseline)
assert len(re.findall(rb'(?m)^\s*test\(', combined)) == 31
assert len(re.findall(rb'(?m)^\s*test\(', addition.encode())) == 2
archive = REPORT / 'append-refinement-history'
archive.mkdir(exist_ok=False)
(archive / 'initial-canonical-37-spec.ts').write_bytes(old)
(archive / 'initial-additions.ts').write_bytes(old[len(baseline):])
(archive / 'refinement-helper.py').write_bytes(Path(__file__).read_bytes())
proof = {'refinedAt': datetime.now(timezone.utc).isoformat(), 'original35PrefixBytePreserved': True, 'original35Sha256': sha(baseline), 'original35Bytes': len(baseline), 'newScenarios': 2, 'availableScenariosAfterAddition': 37, 'initial37Sha256': sha(old), 'browserTestSha256': sha(combined), 'appendSha256': sha(addition.encode()), 'replacementCount': len(changes), 'method': 'Only the newly appended scenarios gain expanded literal preview overflow and final short-landscape restored-note focus/capture coverage; original 35 bytes and baseline tested spec are preserved.'}
assert SPEC.read_bytes() == old
SPEC.write_bytes(combined)
for parent in (BASE, REPORT):
    (parent / 'final-append-proof.json').write_text(json.dumps(proof, indent=2), encoding='utf-8')
    (parent / 'final-evidence-recovery-additions.ts').write_bytes(addition.encode())
(BASE / 'final-prepared-canonical-spec.ts').write_bytes(combined)
print(json.dumps(proof, indent=2))
