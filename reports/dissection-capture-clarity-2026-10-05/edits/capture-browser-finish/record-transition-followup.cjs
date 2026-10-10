const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const fixture = path.join(root, 'tests/e2e/dissection-capture-clarity.spec.ts');
const original = path.join(__dirname, 'dissection-capture-clarity.spec.ts');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const before = fs.readFileSync(original), after = fs.readFileSync(fixture);
const expectedBefore = 'a50d894e0c67f40a9a289a54cdc01eea785c0f4004ad0c55c56a3697bff7d22c';
if (sha(before) !== expectedBefore) throw new Error('Original fixture snapshot does not match released a50d894');
const normal = b => b.toString('utf8').replace(/\r\n/g, '\n');
const edits = [
  {
    before: 'async function observeNativeCapture(page: Page, failCopyOnce = false) {\n  await source(page).evaluate((node: any, shouldFail) => {',
    after: 'async function observeNativeCapture(page: Page, failCopyOnce = false, observeGradients = false) {\n  await source(page).evaluate((node: any, settings) => {',
  },
  { before: '    let failurePending = shouldFail;', after: '    let failurePending = settings.failCopyOnce;' },
  {
    before: '        const nativeCopy = destination.drawImage, nativeText = ctx.fillText; let copied = false;',
    after: `        const nativeCopy = destination.drawImage, nativeText = ctx.fillText, nativeColorStop = CanvasGradient.prototype.addColorStop; let copied = false;
        if (settings.observeGradients) {
          record.gradientStopsBeforeCopy = []; record.gradientStopsAfterCopy = [];
          CanvasGradient.prototype.addColorStop = function (offset: number, colour: string) {
            (copied ? record.gradientStopsAfterCopy : record.gradientStopsBeforeCopy).push({ offset, colour: String(colour) });
            return nativeColorStop.call(this, offset, colour);
          };
        }`,
  },
  {
    before: '          destination.drawImage = nativeCopy; ctx.fillText = nativeText;',
    after: `          destination.drawImage = nativeCopy; ctx.fillText = nativeText;
          if (settings.observeGradients) { CanvasGradient.prototype.addColorStop = nativeColorStop; record.gradientObserverRestored = CanvasGradient.prototype.addColorStop === nativeColorStop; }`,
  },
  { before: '  }, failCopyOnce);', after: '  }, { failCopyOnce, observeGradients });' },
];
const suffixMarker = "\ntest('native clean Capture excludes the previous layer sheet while full Capture retains its transition artwork'";
const current = normal(after), markerAt = current.indexOf(suffixMarker);
if (markerAt < 0 || current.indexOf(suffixMarker, markerAt + 1) >= 0) throw new Error('Expected exactly one appended transition scenario');
const suffix = current.slice(markerAt);
let replay = normal(before);
for (const edit of edits) {
  if (replay.split(edit.before).length !== 2) throw new Error('A before anchor is missing or duplicated');
  replay = replay.replace(edit.before, edit.after);
}
replay += suffix;
if (replay !== current) throw new Error('Current fixture has an unexplained change outside the six guarded edits');
let reversed = current.slice(0, -suffix.length);
for (const edit of [...edits].reverse()) {
  if (reversed.split(edit.after).length !== 2) throw new Error('An after anchor is missing or duplicated');
  reversed = reversed.replace(edit.after, edit.before);
}
if (reversed !== normal(before)) throw new Error('Guarded reversal did not recover original fixture');
const parser = createRequire(path.join(root, 'package.json'))('@babel/parser');
parser.parse(after.toString('utf8'), { sourceType: 'module', plugins: ['typescript'] });
fs.writeFileSync(path.join(__dirname, 'dissection-capture-clarity-transition.spec.ts'), after);
const rendererPath = path.join(root, 'stem_lab/stem_tool_dissection.js');
const endings = buffer => ({ crlf: (buffer.toString().match(/\r\n/g) || []).length, loneLf: (buffer.toString().match(/(?<!\r)\n/g) || []).length });
const receipt = { fixture, beforeSha256: sha(before), afterSha256: sha(after), beforeBytes: before.length, afterBytes: after.length,
  renderer: rendererPath, rendererSha256: sha(fs.readFileSync(rendererPath)), cases: '6 layouts + 5 focused native capture workflows',
  forwardAndReverseExactAfterLineEndingNormalization: true, beforeEndings: endings(before), afterEndings: endings(after),
  exactBeforeSnapshot: original, exactAfterSnapshot: path.join(__dirname, 'dissection-capture-clarity-transition.spec.ts'),
  edits: [...edits, { operation: 'append', after: suffix }], staticValidation: 'Babel TypeScript parse passed', execution: 'No test suites run by this agent', ownership: 'Released to root' };
fs.writeFileSync(path.join(__dirname, 'transition-followup-edit-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
process.stdout.write(JSON.stringify({ beforeSha256: receipt.beforeSha256, afterSha256: receipt.afterSha256, rendererSha256: receipt.rendererSha256, edits: receipt.edits.length, parsed: true }) + '\n');
