const fs = require('fs');

// Read the file
let content = fs.readFileSync('stem_lab_module.js', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
const eol = content.includes('\r\n') ? '\r\n' : '\n';
let lines = content.split(eol);
console.log('Read ' + lines.length + ' lines');

function findLine(str, from) {
  from = from || 0;
  for (let i = from; i < lines.length; i++) {
    if (lines[i].includes(str)) return i;
  }
  return -1;
}

let totalDelta = 0;

// ═══════════════════════════════════════════════════════════════════
// FIX 1: DISSECTION LAB — Remove onWheel handler
// ═══════════════════════════════════════════════════════════════════
const wheelLine = findLine('onWheel: function (e) {');
if (wheelLine < 0) { console.log('ERROR: onWheel not found'); process.exit(1); }
console.log('Fix 1: onWheel at line ' + (wheelLine + 1));

// Find the closing of the onWheel handler — it ends with `},`
// Count braces to find the end
let braceDepth = 0;
let wheelEnd = wheelLine;
for (let i = wheelLine; i < wheelLine + 20; i++) {
  for (const ch of lines[i]) {
    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;
  }
  if (braceDepth === 0) { wheelEnd = i; break; }
}
// The line after the handler close has the trailing comma
// Check if wheelEnd line ends with },
if (lines[wheelEnd].trim().endsWith('},')) {
  // Remove lines wheelLine through wheelEnd (inclusive)
  const removeCount = wheelEnd - wheelLine + 1;
  lines.splice(wheelLine, removeCount);
  totalDelta -= removeCount;
  console.log('  Removed ' + removeCount + ' lines (L' + (wheelLine+1) + '-' + (wheelEnd+1) + ')');
} else {
  console.log('  WARNING: unexpected end pattern: ' + lines[wheelEnd].trim());
  // Still remove but be cautious
  const removeCount = wheelEnd - wheelLine + 1;
  lines.splice(wheelLine, removeCount);
  totalDelta -= removeCount;
  console.log('  Removed ' + removeCount + ' lines');
}

// ═══════════════════════════════════════════════════════════════════
// FIX 2: ECONOMICS LAB — Add missing variable declarations
// ═══════════════════════════════════════════════════════════════════
// Find `var pfHappiness` and insert after it
const pfHappLine = findLine('var pfHappiness');
if (pfHappLine < 0) { console.log('ERROR: pfHappiness not found'); process.exit(1); }
console.log('Fix 2: pfHappiness at line ' + (pfHappLine + 1));

const econVarLines = [
  '',
  '          // ── Personal Finance Budget Breakdown ──',
  "          var pfIncome = Math.round((d.pfSalary || 35000) / 12);",
  "          var pfRent = d.pfRent || Math.round(pfIncome * 0.30);",
  "          var pfFood = d.pfFood || Math.round(pfIncome * 0.15);",
  "          var pfTransport = d.pfTransport || Math.round(pfIncome * 0.10);",
  "          var pfEntertain = d.pfEntertain || Math.round(pfIncome * 0.05);",
  "          var pfSavings = d.pfSavings || Math.round(pfIncome * 0.20);"
];
lines.splice(pfHappLine + 1, 0, ...econVarLines);
totalDelta += econVarLines.length;
console.log('  Inserted ' + econVarLines.length + ' lines after pfHappiness');

// Fix the smCompanies null -> [] default
const smCompLine = findLine("var smCompanies = d.smCompanies || null;");
if (smCompLine >= 0) {
  lines[smCompLine] = lines[smCompLine].replace("d.smCompanies || null", "d.smCompanies || []");
  console.log('  Fixed smCompanies null -> [] at line ' + (smCompLine + 1));
} else {
  console.log('  WARNING: smCompanies null line not found');
}

// Also fix the reduce call that uses (d.smCompanies || [])
// At L47290: var smTotalVal = ... (d.smCompanies || []).reduce(...)
// This already has || [] in some instances but let's check
const smReduceLine = findLine('.reduce(function (s, c) { return s + ((d.smPortfolio');
if (smReduceLine >= 0) {
  console.log('  smCompanies reduce at line ' + (smReduceLine + 1) + ' — OK');
}

// ═══════════════════════════════════════════════════════════════════
// FIX 3: BEHAVIOR LAB — Move render-phase upd() calls into setTimeout
// ═══════════════════════════════════════════════════════════════════
// Find the mouse interpolation block
const lerpLine = findLine('// ── Smooth mouse interpolation ──');
if (lerpLine < 0) { console.log('ERROR: Mouse interpolation not found'); process.exit(1); }
console.log('Fix 3: Mouse interpolation at line ' + (lerpLine + 1));

// Find the end of the auto-advance section (ends with closing `}`)
const autoAdvLine = findLine('// ── Auto-advance timer', lerpLine);
if (autoAdvLine < 0) { console.log('ERROR: Auto-advance not found'); process.exit(1); }
console.log('  Auto-advance at line ' + (autoAdvLine + 1));

// Find the closing `}` of the auto-advance if block (3 lines after autoAdvLine)
const autoAdvEnd = findLine("setTimeout(function () { advanceTick(); }", autoAdvLine);
if (autoAdvEnd < 0) { console.log('ERROR: advanceTick setTimeout not found'); process.exit(1); }
// The closing `}` is on the next line after the setTimeout
const autoAdvCloseIdx = autoAdvEnd + 1; // should be `}`
console.log('  Auto-advance setTimeout at line ' + (autoAdvEnd + 1));

// Remove the mouse interpolation + auto-advance block (from lerpLine to autoAdvCloseIdx)
const blRemoveCount = autoAdvCloseIdx - lerpLine + 1;
const removedLines = lines.splice(lerpLine, blRemoveCount);
totalDelta -= blRemoveCount;
console.log('  Removed ' + blRemoveCount + ' render-phase lines');

// Now find the setTimeout render block and insert the logic there
const stRenderLine = findLine('// ── Render canvases via setTimeout');
if (stRenderLine < 0) { console.log('ERROR: setTimeout render block not found'); process.exit(1); }
console.log('  setTimeout render block at line ' + (stRenderLine + 1));

// Find the closing of the setTimeout block: `}, 0);`
const stCloseLine = findLine('}, 0);', stRenderLine);
if (stCloseLine < 0) { console.log('ERROR: setTimeout close not found'); process.exit(1); }

// Insert the mouse interpolation + auto-advance BEFORE the `}, 0);` close
const insertLines = [
  '            // ── Smooth mouse interpolation (async to avoid render-phase setState) ──',
  '            var _lerpRate = 0.025;',
  '            var _dxLerp = (d.blTargetX || 200) - (d.blMouseX || 200);',
  '            var _dyLerp = (d.blTargetY || 150) - (d.blMouseY || 150);',
  '            if (Math.abs(_dxLerp) > 0.5 || Math.abs(_dyLerp) > 0.5) {',
  "              upd('blMouseX', (d.blMouseX || 200) + _dxLerp * _lerpRate);",
  "              upd('blMouseY', (d.blMouseY || 150) + _dyLerp * _lerpRate);",
  '            }',
  '            // ── Auto-advance timer (speed-adjusted, async) ──',
  "            var _tickDelay = (d.blSpeed || 1) === 3 ? 1000 : (d.blSpeed || 1) === 2 ? 1800 : 2800;",
  "            if ((d.blPhase || 'intro') === 'running' && !d.blPaused) {",
  '              setTimeout(function () { advanceTick(); }, _tickDelay);',
  '            }'
];
lines.splice(stCloseLine, 0, ...insertLines);
totalDelta += insertLines.length;
console.log('  Inserted ' + insertLines.length + ' lines into setTimeout block');

// ═══════════════════════════════════════════════════════════════════
// WRITE OUTPUT
// ═══════════════════════════════════════════════════════════════════
const output = lines.join(eol);
fs.writeFileSync('stem_lab_module.js', output, 'utf8');
console.log('Written ' + lines.length + ' lines (delta: ' + totalDelta + ')');
console.log('DONE — Bug fixes applied');
