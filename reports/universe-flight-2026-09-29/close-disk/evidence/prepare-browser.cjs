'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const baselinePath = path.join(__dirname, '../universe-disk-depth57/browser-check.cjs');
const baseline = fs.readFileSync(baselinePath, 'utf8');
const replacements = [
  ['UNIVERSE_DISK_VISTA_REPORT', 'UNIVERSE_CLOSE_DISK_REPORT'],
  ['UNIVERSE_DISK_VISTA_URL', 'UNIVERSE_CLOSE_DISK_URL'],
  ['reports/universe-flight-2026-09-29/disk-depth', 'reports/universe-flight-2026-09-29/close-disk'],
  ['preview.html?enhanced=57#universe-flight', 'preview.html?enhanced=58#universe-flight'],
  ["Desktop scenic views append the disk profile while keeping all five existing indices, and open the exact paused galaxy pose", "Desktop scenic views retain all six indices and open the exact paused galaxy pose"],
  ["    await page.setViewportSize({width:568,height:320});\n    await normal('landscape-reduced-motion'); await fullscreen('landscape-fullscreen-reduced-motion');\n    check('The short landscape menus preserve the paused profile and canvas focus');\n    await page.setViewportSize({width:1280,height:850});\n    await page.emulateMedia({forcedColors:'active'});\n    await normal('system-colors'); await fullscreen('system-colors-fullscreen');\n    check('System colors preserve reachable scenic controls and a paused viewport');\n    await page.emulateMedia({forcedColors:'none'});\n    await page.addStyleTag({content:'[data-universe-tool] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;} [data-universe-tool] p{margin-bottom:2em!important;}'});\n    await normal('text-spacing'); await fullscreen('text-spacing-fullscreen');\n    check('Increased text spacing keeps the profile control and fullscreen menu reachable');\n", '']
];
let candidate = baseline;
for (const [before, after] of replacements) {
  assert.equal(candidate.split(before).length, 2, 'Unique browser derivation replacement');
  candidate = candidate.replace(before, after);
}
const candidatePath = path.join(__dirname, 'browser-check.cjs');
fs.writeFileSync(candidatePath, candidate);
const derivation = { completed: true, actualDerivationDriver: __filename, actualDerivationDriverHash: hash(fs.readFileSync(__filename)), baselinePath, baselineHash: hash(baseline), candidatePath, candidateHash: hash(candidate), replacements: replacements.map(([before, after]) => ({ before, after })), scope: ['Desktop scenic view', 'Desktop fullscreen scenic view', '320 px phone scenic view with reduced motion', '320 px phone fullscreen scenic view with reduced motion'], expectedWorkflowGroups: 4, expectedScopedAccessibilityAudits: 6, expectedCaptures: 4 };
fs.writeFileSync(path.join(__dirname, 'browser-derivation.json'), JSON.stringify(derivation, null, 2));
console.log(JSON.stringify({ prepared: true, baselineHash: derivation.baselineHash, candidateHash: derivation.candidateHash, expectedWorkflowGroups: 4, expectedScopedAccessibilityAudits: 6, expectedCaptures: 4 }));
