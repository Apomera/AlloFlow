const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const fixture = path.join(root, 'tests/e2e/dissection-capture-clarity.spec.ts');
const beforePath = path.join(__dirname, 'dissection-capture-clarity-transition.spec.ts');
const before = fs.readFileSync(beforePath), after = fs.readFileSync(fixture);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const expectedBefore = 'eefb144f147084ca516e96fb1033752ae38fdb66dac908c4d73c527385a52b33';
if (sha(before) !== expectedBefore) throw new Error('Before snapshot does not match released eefb144');
const normalize = bytes => bytes.toString('utf8').replace(/\r\n/g, '\n');
const current = normalize(after), previous = normalize(before);
const section = (text, start, end) => { const first = text.indexOf(start); if (first < 0) throw new Error('Missing start marker'); const last = text.indexOf(end, first); if (last < 0) throw new Error('Missing end marker'); return text.slice(first, last); };
const line = (text, start) => { const first = text.indexOf(start); if (first < 0) throw new Error('Missing line marker'); const last = text.indexOf('\n', first); return text.slice(first, last < 0 ? text.length : last); };
const offscreenStart = "test('Capture refreshes offscreen anatomy";
const motionStart = "test('failed native thumbnail copy";
const reloadStart = "test('capture preference and exact frame context";
const oldOffscreen = section(previous, offscreenStart, motionStart), newOffscreen = section(current, offscreenStart, motionStart);
const oldMotion = section(previous, motionStart, reloadStart), newMotion = section(current, motionStart, reloadStart);
const edits = [
  { before: "  expect(records[0].textAfterCopy.some((s: string) => s === 'ANATOMICAL AXIS')).toBe(true);", after: "  expect(records[0].textAfterCopy.some((s: string) => s === 'ANATOMICAL AXIS')).toBe(false);" },
  { before: line(oldOffscreen, '  await capture(page).scrollIntoViewIfNeeded();'), after: section(newOffscreen, '  await page.setViewportSize', '  const oldBitmap') .replace(/\n$/, '') },
  { before: line(oldOffscreen, "  await preference(page).selectOption('canvas');"), after: section(newOffscreen, "  await preference(page).selectOption('canvas');", '  expect(full.view)') .replace(/\n$/, '') },
  { before: line(oldOffscreen, '  await writeFile'), after: line(newOffscreen, '  await writeFile') },
  { before: section(oldMotion, '  test.skip(baseline);', '  await expect.poll(async () => source(page).evaluate((c: any) => c._livingFunctionElapsedMs)') .replace(/\n$/, ''), after: section(newMotion, '  test.skip(baseline);', '  await expect.poll(async () => source(page).evaluate((c: any) => c._livingFunctionElapsedMs)') .replace(/\n$/, '') },
  { before: line(oldMotion, '  await writeFile'), after: section(newMotion, '  await painted(page);\n', '\n});') },
];
let replay = previous;
for (const edit of edits) {
  if (replay.split(edit.before).length !== 2) throw new Error('Before edit missing or duplicated');
  replay = replay.replace(edit.before, edit.after);
}
if (replay !== current) throw new Error('Fixture contains changes outside the six setup corrections');
let reversed = current;
for (const edit of [...edits].reverse()) {
  if (reversed.split(edit.after).length !== 2) throw new Error('After edit missing or duplicated');
  reversed = reversed.replace(edit.after, edit.before);
}
if (reversed !== previous) throw new Error('Reversal did not recover eefb144 fixture');
const layoutStart = 'const layouts = [', layoutEnd = "test('keyboard Capture copies clean anatomy";
if (section(previous, layoutStart, layoutEnd) !== section(current, layoutStart, layoutEnd)) throw new Error('Baseline layout definitions or bodies changed');
createRequire(path.join(root, 'package.json'))('@babel/parser').parse(after.toString('utf8'), { sourceType: 'module', plugins: ['typescript'] });
const afterPath = path.join(__dirname, 'dissection-capture-clarity-browser-setup.spec.ts');
fs.writeFileSync(afterPath, after);
const rendererPath = path.join(root, 'stem_lab/stem_tool_dissection.js');
const receipt = { fixture, beforeSha256: sha(before), afterSha256: sha(after), beforeBytes: before.length, afterBytes: after.length,
  renderer: rendererPath, rendererSha256: sha(fs.readFileSync(rendererPath)), exactBeforeSnapshot: beforePath, exactAfterSnapshot: afterPath,
  edits, guardedForwardAndReverse: true, baselineLayoutDefinitionsAndBodiesUnchanged: true, staticValidation: 'Babel TypeScript parse passed',
  execution: 'No browser or unit suites run by this agent', ownership: 'Released to root' };
fs.writeFileSync(path.join(__dirname, 'browser-setup-corrections-edit-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
process.stdout.write(JSON.stringify({ beforeSha256: receipt.beforeSha256, afterSha256: receipt.afterSha256, rendererSha256: receipt.rendererSha256, edits: edits.length, parsed: true, baselineLayoutsUnchanged: true }) + '\n');
