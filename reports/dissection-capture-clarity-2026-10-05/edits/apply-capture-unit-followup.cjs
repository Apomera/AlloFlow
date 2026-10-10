const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const file = 'tests/dissection_lab_improvements.test.js';
const target = path.join('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated', file);
const baselineSha256 = '141968d2511da16918d0183ab720f46032be06a6f81d374aeabf9be6a977e94c';
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const baseline = fs.readFileSync(target, 'utf8');
if (hash(baseline) !== baselineSha256) throw new Error('Unit followup baseline drift');
const newline = baseline.includes('\r\n') ? '\r\n' : '\n';
const normalized = (value) => value.replace(/\r?\n/g, newline);
const edits = [];
let source = baseline;
function replace(label, oldText, newText) {
  const old = normalized(oldText), replacement = normalized(newText);
  if (source.split(old).length !== 2) throw new Error('Non-unique unit followup edit: ' + label);
  const beforeSha256 = hash(source);
  source = source.replace(old, replacement);
  edits.push({ label, old, new: replacement, beforeSha256, afterSha256: hash(source) });
}
replace('singular observation mark text', "expect(cardContext.textContent).toContain('1 mark');", "expect(cardContext.textContent).toContain('1 observation mark');");
replace('plural observation marks text', "expect(frozenCard.textContent).toContain('3 marks');", "expect(frozenCard.textContent).toContain('3 observation marks');");
replace('fresh full API mock', `      const specimenCapture = vi.fn(() => { throw new Error('Specimen API must not be used for full canvas'); });
      sourceCanvas._captureDissectionEvidence = specimenCapture;
      await chooseEvidenceCaptureContents(fixture, 'canvas');`, `      const specimenCapture = vi.fn(() => { throw new Error('Specimen API must not be used for full canvas'); });
      const fullCapture = vi.fn((context, width, height) => { context.drawImage(sourceCanvas, 0, 0, width, height); return true; });
      sourceCanvas._captureDissectionEvidence = specimenCapture;
      sourceCanvas._captureFullDissectionEvidence = fullCapture;
      await chooseEvidenceCaptureContents(fixture, 'canvas');`);
replace('full API called exactly once', `      expect(specimenCapture).not.toHaveBeenCalled();
      expect(thumbnailContext.drawImage).toHaveBeenCalledExactlyOnceWith`, `      expect(specimenCapture).not.toHaveBeenCalled();
      expect(fullCapture).toHaveBeenCalledExactlyOnceWith(thumbnailContext, 220, 264);
      expect(thumbnailContext.drawImage).toHaveBeenCalledExactlyOnceWith`);
replace('failure matrix for both modes including encoding', `  it.each(['missing', 'false', 'throw'])('keeps specimen capture failure %s from saving a mislabeled canvas or changing focus and work', async (failure) => {`, `  it.each(['specimen', 'canvas'].flatMap((contents) => ['missing', 'false', 'throw', 'encoding'].map((failure) => ({ contents, failure }))))('keeps $contents capture failure $failure from saving a mislabeled canvas or changing focus and work', async ({ contents, failure }) => {`);
replace('failed encoder setup', `    const imageSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,dW51c2Vk');`, `    const imageSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      if (failure === 'encoding') throw new Error('Image encoding failed');
      return 'data:image/jpeg;base64,dW51c2Vk';
    });`);
replace('specific API selection and failure result', `      if (failure === 'missing') delete sourceCanvas._captureDissectionEvidence;
      else {
        specimenCapture = vi.fn(() => {
          if (failure === 'throw') throw new Error('Specimen capture unavailable');
          return false;
        });
        sourceCanvas._captureDissectionEvidence = specimenCapture;
      }`, `      if (contents === 'canvas') await chooseEvidenceCaptureContents(fixture, 'canvas');
      const captureApi = contents === 'canvas' ? '_captureFullDissectionEvidence' : '_captureDissectionEvidence';
      const otherApi = contents === 'canvas' ? '_captureDissectionEvidence' : '_captureFullDissectionEvidence';
      const wrongCapture = vi.fn(() => { throw new Error('Wrong frame contents API must not be used'); });
      sourceCanvas[otherApi] = wrongCapture;
      if (failure === 'missing') delete sourceCanvas[captureApi];
      else {
        specimenCapture = vi.fn(() => {
          if (failure === 'throw') throw new Error('Frame capture unavailable');
          return failure === 'encoding';
        });
        sourceCanvas[captureApi] = specimenCapture;
      }`);
replace('encoder called only after successful fresh render', `      if (specimenCapture) expect(specimenCapture).toHaveBeenCalledExactlyOnceWith(thumbnailContext, 220, 264);
      expect(thumbnailContext.drawImage).not.toHaveBeenCalled();
      expect(imageSpy).not.toHaveBeenCalled();`, `      if (specimenCapture) expect(specimenCapture).toHaveBeenCalledExactlyOnceWith(thumbnailContext, 220, 264);
      expect(wrongCapture).not.toHaveBeenCalled();
      expect(thumbnailContext.drawImage).not.toHaveBeenCalled();
      if (failure === 'encoding') expect(imageSpy).toHaveBeenCalledExactlyOnceWith('image/jpeg', 0.72);
      else expect(imageSpy).not.toHaveBeenCalled();`);
fs.writeFileSync(path.join(__dirname, 'unit-capture-followup-baseline.js'), baseline);
fs.writeFileSync(target, source);
const finalSha256 = hash(fs.readFileSync(target));
if (finalSha256 !== hash(source)) throw new Error('Unit followup write mismatch');
fs.writeFileSync(path.join(__dirname, 'unit-capture-followup-edits.json'), JSON.stringify({ file, baselineSha256, finalSha256, edits }, null, 2) + '\n');
let restored = source;
for (const edit of edits.slice().reverse()) {
  if (restored.split(edit.new).length !== 2) throw new Error('Unit followup reversal is non-unique');
  restored = restored.replace(edit.new, edit.old);
}
if (restored !== baseline || hash(restored) !== baselineSha256) throw new Error('Unit followup reversal failed');
const first = JSON.parse(fs.readFileSync(path.join(__dirname, 'unit-capture-edits.json')));
for (const edit of first.edits.slice().reverse()) restored = restored.replace(edit.new, edit.old);
if (hash(restored) !== first.baselineSha256) throw new Error('Original unit baseline preservation failed');
process.stdout.write(JSON.stringify({ file, baselineSha256, finalSha256, exactEdits: edits.length, totalNewCases: 11, reversalToOriginalVerified: first.baselineSha256 }) + '\n');
