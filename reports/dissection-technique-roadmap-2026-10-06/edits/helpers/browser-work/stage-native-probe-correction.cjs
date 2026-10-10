const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const scratch = __dirname;
const input = path.join(scratch, 'tests/e2e/dissection-technique-roadmap.spec.ts');
const output = path.join(scratch, 'corrected/tests/e2e/dissection-technique-roadmap.spec.ts');
const receiptPath = path.join(scratch, 'native-probe-fixture-correction-receipt.json');
const expectedSha256 = '1dc64d0ae57c32ff5792a721b2ae9d2bff86ed0822f80225a2cb68d15e5b240d';
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const original = fs.readFileSync(input);
if (hash(original) !== expectedSha256) throw new Error('Original staged fixture hash changed; refusing correction.');
let candidate = original.toString('utf8');
const unchangedBefore = "  for (const key of ['notes', 'confidence', 'explored', 'verified', 'attempts', 'annotations', 'frames', 'scores', 'firstAttempt', 'supported', 'assessment', 'routes'] as const) expect(completed[key], key).toEqual(before[key]);";
const unchangedAfter = "  for (const key of ['notes', 'confidence', 'verified', 'attempts', 'annotations', 'frames', 'scores', 'firstAttempt', 'supported', 'assessment', 'routes'] as const) expect(completed[key], key).toEqual(before[key]);\n" +
  "  const probedOrganId = completed.procedures.skin.probedOrganId; expect(probedOrganId).toEqual(expect.any(String)); expect(probedOrganId).not.toBe('');\n" +
  "  const probedKey = `${before.specimen}|${probedOrganId}`; expect(before.explored[probedKey]).not.toBe(true);\n" +
  "  expect(completed.selected).toBe(probedOrganId); expect(completed.explored).toEqual({ ...before.explored, [probedKey]: true });";
const undoBefore = "  await summary(page).click(); await roadmap(page).screenshot({ path: `${out}/native-undo-probe.png`, style: screenshotStyle }); await audit(page, 'native-undo-probe');";
const undoAfter = "  expect(undone.explored).toEqual(completed.explored); expect(undone.selected).toBe(completed.selected);\n" + undoBefore;
for (const [name, before, after] of [['native positive inspection assertions', unchangedBefore, unchangedAfter], ['Undo preserves inspection and selection', undoBefore, undoAfter]]) {
  if (candidate.split(before).length - 1 !== 1) throw new Error(`Expected exactly one anchor for ${name}; refusing correction.`);
  candidate = candidate.replace(before, after);
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, candidate);
const receipt = {
  status: 'staged in scratch only; no live fixture mutation, test runs or commits',
  createdAt: new Date().toISOString(),
  input, inputSha256: expectedSha256, inputUnchanged: hash(fs.readFileSync(input)) === expectedSha256,
  output, outputSha256: hash(fs.readFileSync(output)),
  intendedRepositoryPath: 'tests/e2e/dissection-technique-roadmap.spec.ts',
  testCases: 13,
  changes: [
    { purpose: 'Assert the exact structure selection and exploration gain performed by native Probe', before: unchangedBefore, after: unchangedAfter },
    { purpose: 'Assert native Undo retains the inspected structure and current selection', before: undoBefore, after: undoAfter }
  ],
  handlerEvidence: [
    'performProcedureAction probe branch chooses a visible target, calls chooseOrganFromDirectory(target), and records probedOrganId.',
    'chooseOrganFromDirectory selects the target and calls structureInspectionPatch for newly explored structures.',
    'structureInspectionPatch copies exploredOrgans and sets specimen + | + org.id to true.',
    'Undo restores technique fields without changing exploredOrgans or selectedOrgan.'
  ],
  reviewReceipt: path.join(scratch, 'pre-correction-visual-axe-receipt.json')
};
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ output, sha256: receipt.outputSha256, receiptPath, originalUnchanged: receipt.inputUnchanged, testCases: 13 }, null, 2));
