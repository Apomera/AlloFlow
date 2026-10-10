'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const out = path.join(__dirname, 'watercycle-cloud-pore-review');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const baseline = fs.readFileSync(path.join(out, 'baseline-runtime.js'));
const expected = 'f2360e271a96e40308aeb0b45a4ded56aaecec4366eafa92781278713a6f2a36';
if (sha(baseline) !== expected) throw Error('Frozen baseline mismatch.');
let source = baseline.toString('utf8');
const changes = [];
const newline = source.includes('\r\n') ? '\r\n' : '\n';
function normalized(value) { return value.replace(/\r?\n/g, newline).replace(new RegExp(newline + '$'), ''); }
function replace(id, original, replacement) {
  if (!original || source.indexOf(original) < 0 || source.indexOf(original) !== source.lastIndexOf(original)) throw Error('Nonunique source slice: ' + id);
  source = source.replace(original, replacement);
  changes.push({ id, original, replacement });
}
function region(begin, end) {
  const start = source.indexOf(begin), stop = source.indexOf(end, start);
  if (start < 0 || stop < 0) throw Error('Missing source region.');
  return source.slice(start, stop);
}
const oldHelpers = region('              function drawCloudPuff(ctx2, x, y, radius, depth, moistureValue) {', '              function drawTerrain(ctx2, w, h, groundY) {');
const helpers = normalized(fs.readFileSync(path.join(__dirname, 'storm-cloud-volume-fragment.js'), 'utf8')) + newline + newline;
replace('cloud-volume-helpers', oldHelpers, helpers);

const cloudStart = '                if (convectiveBuild > 0.56) {';
const originalAssembly = region(cloudStart, '                drawStormChargeSeparation(context, w, h, cloudCenter, cloudY, cloudBase, groundY);');
let assembly = originalAssembly;
assembly = '                var stormCloudLobes2d = [];' + newline +
  '                function collectStormCloudLobe2d(ctx2, x, y, radius, depth, moistureValue) {' + newline +
  '                  stormCloudLobes2d.push({ x: x, y: y, radius: radius, depth: depth, moisture: moistureValue });' + newline +
  '                }' + newline + assembly;
assembly = assembly.replace(/drawCloudPuff\(/g, 'collectStormCloudLobe2d(');
const baseStart = assembly.indexOf("                // Transparent top stop dissolves the slab's hard seam into the puffs");
if (baseStart < 0) throw Error('Cloud-base paint boundary missing.');
assembly = assembly.slice(0, baseStart) +
  '                wcDrawStormCloudVolume2d(context, stormCloudLobes2d,' + newline +
  '                  { width: w, center: cloudCenter, y: cloudY, base: cloudBase });' + newline;
replace('cloud-volume-assembly', originalAssembly, assembly);

const oldCharge = region('              function drawStormChargeSeparation(', '              function ' + 'strokeStormLightningPath(');
let charge = oldCharge;
for (const original of [
  "ctx2.fillText('+', positiveChargeX, positiveChargeY);",
  "ctx2.fillText('\\u2212', negativeChargeX, negativeChargeY);",
  "ctx2.fillText('+', groundChargeX, terrainSurfaceYAt(groundChargeX, w, h, groundY) - 10);"
]) {
  if (!charge.includes(original)) throw Error('Original scientific charge anchor changed: ' + original);
  charge = charge.replace(original, original.replace('ctx2.fillText(', 'wcStormScientificInk2d(ctx2, '));
}
replace('charge-glyph-contrast', oldCharge, charge);

const leaderTextAt = source.indexOf('                  context.fillText(lightningStudyAvailable');
const leaderStart = source.lastIndexOf("                  context.font = '800 8px system-ui, sans-serif';", leaderTextAt);
const oldLeaderCaption = source.slice(leaderStart, source.indexOf('                  context.restore();', leaderTextAt));
const lightningNewline = oldLeaderCaption.includes('\r\n') ? '\r\n' : '\n';
const leaderTitle = region('                  context.fillText(lightningStudyAvailable', '                  context.restore();').replace('                  context.fillText(', '').replace(/,\r?\n\s*Math\.max\(8, boltX - 68\), Math\.max\(18, boltTop - 7\)\);\r?\n$/, '');
replace('lightning-leader-caption', oldLeaderCaption,
  '                  stormCaptionRequests2d.push({ id: \'lightning-path\', title: ' + leaderTitle.trim() + ',' + newline +
  "                    x: w - 8, y: Math.max(8, boltTop - 13), align: 'right', titleSize: 11, width: Math.min(210, w - 16)," + newline +
  "                    anchorX: boltX, anchorY: boltTop, accent: '#fde68a', priority: 0.5 });" + newline);
const oldReturnCaption = "                    context.shadowBlur = 0;" + lightningNewline +
  "                    context.font = '800 8px system-ui, sans-serif';" + lightningNewline +
  "                    context.fillStyle = '#fef9c3';" + lightningNewline +
  "                    context.fillText('RETURN STROKE \\u00B7 STUDY', Math.max(8, boltX - 62), Math.max(18, boltTop - 7));";
replace('lightning-return-caption', oldReturnCaption,
  "                    stormCaptionRequests2d.push({ id: 'lightning-path', title: 'RETURN STROKE \\u00B7 STUDY'," + newline +
  "                      x: w - 8, y: Math.max(8, boltTop - 13), align: 'right', titleSize: 11, width: Math.min(210, w - 16)," + newline +
  "                      anchorX: boltX, anchorY: boltTop, accent: '#fde68a', priority: 0.5 });");
const oldLightningReservation = region('                if (lightningLeaderVisible || (lightningReturnVisible && lightningStudyAvailable)) {', "                if (canvasEl.dataset.thunderWave === 'expanding'");
replace('charge-caption-clearance', oldLightningReservation,
  '                // Lightning captions reserve their measured card bounds during layout.' + newline);

const oldSoil = region("            } else if (kind === 'soil') {", "            } else if (kind === 'cloud') {");
const soilFragment = normalized(fs.readFileSync(path.join(__dirname, 'soil-pore-glyph-fragment.js'), 'utf8'));
replace('compact-soil-pores', oldSoil, "            } else if (kind === 'soil') {" + newline + soilFragment + newline);

const oldCaveat = region('          function wcProcessCaveat(id) {', '          function renderWcComparedProcess(id, slot) {');
const originalInfiltration = "              infiltration: __alloT('stem.watercycle.process_compare_infiltration_note', 'Water can remain in shallow soil or move onward. Infiltration does not guarantee groundwater recharge.')";
if (!oldCaveat.includes(originalInfiltration)) throw Error('Original infiltration scope copy changed.');
const sharedScope = "          function wcSoilPoreScope() {" + newline +
  "            return __alloT('stem.watercycle.soil_pore_diagram_scope', 'This pore view is illustrative; soil saturation varies.');" + newline +
  "          }" + newline;
replace('pore-shared-scope', oldCaveat, sharedScope + oldCaveat.replace(originalInfiltration, originalInfiltration + " + ' ' + wcSoilPoreScope()"));
const oldChapterNote = "                React.createElement('p', { className: 'wc-chapter-note', 'data-chapter-note': 'true' }, chapter.note),";
replace('pore-chapter-scope', oldChapterNote,
  "                React.createElement('p', { className: 'wc-chapter-note', 'data-chapter-note': 'true' }, chapter.note + (chapter.state === 'infiltrating' ? ' ' + wcSoilPoreScope() : '')),");

new Function(source);
let restored = source;
for (const change of changes) {
  if (restored.indexOf(change.replacement) < 0 || restored.indexOf(change.replacement) !== restored.lastIndexOf(change.replacement)) throw Error('Nonunique restoration: ' + change.id);
  restored = restored.replace(change.replacement, change.original);
}
if (!Buffer.from(restored).equals(baseline)) throw Error('Source changes escaped the reviewed presentation slices.');
const candidate = Buffer.from(source);
fs.writeFileSync(path.join(out, 'candidate-runtime.js'), candidate);
fs.writeFileSync(path.join(out, 'presentation-changes.json'), JSON.stringify({ baselineSha256: expected, sourceSha256: sha(candidate), sourceBytes: candidate.length, changes }, null, 2));
console.log(JSON.stringify({ successful: true, sourceSha256: sha(candidate), sourceBytes: candidate.length, slices: changes.map(change => change.id) }));
