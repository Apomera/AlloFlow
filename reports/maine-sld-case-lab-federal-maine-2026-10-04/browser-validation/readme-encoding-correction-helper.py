from pathlib import Path
import hashlib,json
ROOT=Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/maine-sld-case-lab-federal-maine-2026-10-04/browser-validation')
LOCAL=Path(__file__).with_name('jurisdiction-validation')
sha=lambda data:hashlib.sha256(data).hexdigest()
changes=[]
for parent in (ROOT,LOCAL):
    target=parent/'README.md';before=target.read_bytes()
    assert b'\x97' in before and b'\xd7' in before
    text=before.decode('cp1252');after=text.encode('utf-8')
    assert after.decode('utf-8')==text
    target.write_bytes(after)
    changes.append({'file':str(target),'beforeSha256':sha(before),'afterSha256':sha(after),'textPreserved':True,'fromEncoding':'Windows-1252','toEncoding':'UTF-8'})
receipt={'reason':'Read-back showed default Windows text encoding in new browser README; normalize to UTF-8 without changing text, raw test evidence or summary.','changes':changes}
(ROOT/'readme-encoding-correction.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
(ROOT/'readme-encoding-correction-helper.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps(receipt,indent=2))
