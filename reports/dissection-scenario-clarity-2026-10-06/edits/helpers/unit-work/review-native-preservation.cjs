const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const {execFileSync} = require('child_process');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const pass = path.dirname(__dirname), sourceDir = path.join(pass, 'source-work');
const report = path.join(repo, 'reports/dissection-scenario-clarity-2026-10-06');
const parser = require(path.join(repo, 'node_modules/@babel/parser'));
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const baseline = fs.readFileSync(path.join(sourceDir, 'renderer-baseline.js'), 'utf8');
const candidate = fs.readFileSync(path.join(sourceDir, 'renderer-next.js'), 'utf8');
const unit = fs.readFileSync(path.join(__dirname, 'unit-next.js'), 'utf8');
const checks = [], findings = [];
function check(name, passed, evidence) { checks.push({name, passed: !!passed, evidence}); }
const currentPins = Object.fromEntries([
  'stem_lab/stem_tool_dissection.js',
  'desktop/web-app/public/stem_lab/stem_tool_dissection.js',
  'tests/dissection_lab_improvements.test.js',
  'tests/dissection_canvas_loop.test.js',
  'tests/e2e/dissection-scenario-clarity.spec.ts',
].map((file) => [file, hash(fs.readFileSync(path.join(repo, file)))]));
check('Canonical source and mirror match the final reviewed source', currentPins['stem_lab/stem_tool_dissection.js'] === 'c9c4d0a4170a44cb7492f19c7e10823bded91490edcc7ad0998e59a814508a56' && currentPins['desktop/web-app/public/stem_lab/stem_tool_dissection.js'] === currentPins['stem_lab/stem_tool_dissection.js'] && currentPins['stem_lab/stem_tool_dissection.js'] === hash(candidate), currentPins);
check('Current browser fixture matches its reviewed final pin', currentPins['tests/e2e/dissection-scenario-clarity.spec.ts'] === 'd0b5a0ab9c9343963f9bb070ca48eb194d0e42ef51f3c2c331b0731191ba0246', {sha256: currentPins['tests/e2e/dissection-scenario-clarity.spec.ts']});
check('Canonical unit retains the final reviewed candidate', currentPins['tests/dissection_lab_improvements.test.js'] === 'e2468a2b7e90db503e29ca3ae5c4c4d29f663e2c61de2c875ea1a9116b3eaba1' && currentPins['tests/dissection_lab_improvements.test.js'] === hash(unit), {sha256: currentPins['tests/dissection_lab_improvements.test.js']});
function walk(n, callback) {
  if (!n || typeof n !== 'object') return;
  callback(n);
  for (const [key, value] of Object.entries(n)) {
    if (key === 'loc') continue;
    if (Array.isArray(value)) value.forEach((child) => walk(child, callback));
    else if (value && typeof value === 'object') walk(value, callback);
  }
}
function inventory(source) {
  const ast = parser.parse(source), functions = new Map(), saveCalls = [], reportHandlers = [], variables = new Map();
  walk(ast, (node) => {
    if (node.type === 'FunctionDeclaration') {
      const list = functions.get(node.id.name) || [];
      list.push({node, text: source.slice(node.start, node.end)}); functions.set(node.id.name, list);
    }
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
      const list = variables.get(node.id.name) || [];
      list.push({node, text: source.slice(node.start, node.end)}); variables.set(node.id.name, list);
    }
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'scheduleDissectionSave') saveCalls.push(source.slice(node.start, node.end));
    if (node.type === 'ObjectProperty' && node.key.name === 'onClick' && node.value.type === 'FunctionExpression') {
      const text = source.slice(node.value.start, node.value.end);
      if (text.includes("report += 'Scenario: ")) reportHandlers.push(text);
    }
  });
  return {ast, functions, saveCalls, reportHandlers, variables};
}
const old = inventory(baseline), next = inventory(candidate);
const fragment = fs.readFileSync(path.join(__dirname, 'scenario-unit-fragment.js'), 'utf8');
const fragmentAst = parser.parse(fragment);
const mountedCases = fragmentAst.program.body.filter((node) => node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression').map((statement) => {
  const call = statement.expression;
  if (call.callee.type === 'Identifier' && call.callee.name === 'it') return {name: call.arguments[0].value, cases: 1};
  if (call.callee.type === 'CallExpression' && call.callee.callee.type === 'MemberExpression' && call.callee.callee.object.name === 'it' && call.callee.callee.property.name === 'each') return {name: call.arguments[0].value, cases: call.callee.arguments[0].elements.length};
  return null;
}).filter(Boolean);
check('All eight meaningful mounted definitions retain eighteen cases', mountedCases.length === 8 && mountedCases.reduce((count, test) => count + test.cases, 0) === 18 && unit.includes(fragment.replace(/\r?\n/g, '\r\n')), mountedCases);
function fn(inv, name) {
  const entries = inv.functions.get(name);
  if (!entries || entries.length !== 1) throw Error('Function not uniquely identified: ' + name);
  return entries[0];
}
const protectedNames = [
  'procedureScenarioStatus', 'timedProcedureScenarioExpired', 'formatScenarioTime', 'formatAccessibleDuration',
  'performNextProcedureStep', 'procedureScenarioGuidance', 'procedureActionComplete', 'procedureStepIndex',
  'prepareDissectionSaveAccess', 'allowDissectionSave', 'blockDissectionSave', 'currentDissectionSaveAccess',
  'currentDissectionSaveStatus', 'publishDissectionSaveStatus', 'tryDissectionStorageWrite', 'writeDissectionSave',
  'scheduleDissectionSave', 'flushDissectionSave', 'cancelDissectionSave', 'flushAllDissectionSaves',
  'retryProtectedDissectionSave', 'confirmSpecimenReset', 'selectSpecimen',
];
for (const name of protectedNames) {
  const before = fn(old, name).text, after = fn(next, name).text;
  check(name + ' unchanged', before === after, {beforeSha256: hash(before), afterSha256: hash(after)});
}
const removePrivateCleanup = (text) => text.replace(/^[ \t]*delete _disScenarioRestartReviews\[dissectionSaveOwner\];\r?\n/m, () => '');
check('Native scenario activation algorithm unchanged except private review cleanup', removePrivateCleanup(fn(next, 'activateProcedureScenario').text) === fn(old, 'activateProcedureScenario').text, 'Exact function-byte comparison after removing the one private-map deletion line.');
const releaseAfter = fn(next, 'releaseDissectionSaveOwner').text.replace(/^[ \t]*delete _disScenarioRestartReviews\[saveOwner\];\r?\n/m, () => '');
check('Native save owner release unchanged except private review cleanup', releaseAfter === fn(old, 'releaseDissectionSaveOwner').text, 'Exact function-byte comparison after removing the one private-map deletion line.');
check('Save whitelist call unchanged', JSON.stringify(old.saveCalls) === JSON.stringify(next.saveCalls) && old.saveCalls.length > 0, {calls: old.saveCalls.length, sha256: hash(JSON.stringify(next.saveCalls))});
check('Lab report export handler unchanged', JSON.stringify(old.reportHandlers) === JSON.stringify(next.reportHandlers) && old.reportHandlers.length === 1, {handlers: old.reportHandlers.length, sha256: hash(JSON.stringify(next.reportHandlers))});
const evidenceFunctions = [];
for (const [name, entries] of old.functions) {
  if (/evidence|capture|download/i.test(name) && entries.length === 1) {
    const after = next.functions.get(name);
    const unchanged = !!after && after.length === 1 && entries[0].text === after[0].text;
    evidenceFunctions.push({name, unchanged});
  }
}
check('Evidence capture/export functions unchanged', evidenceFunctions.length > 0 && evidenceFunctions.every((entry) => entry.unchanged), evidenceFunctions);
const oldUpd = old.variables.get('updMany'), nextUpd = next.variables.get('updMany');
check('Latest-state shallow merge unchanged', oldUpd.length === 1 && nextUpd.length === 1 && oldUpd[0].text === nextUpd[0].text, 'Native Object.assign merges latest dissection state; supplied procedureByLayer/exploredOrgans maps replace their corresponding whole maps.');
const oldScenarioTimer = old.variables.get('dissScenarioTimer'), newScenarioTimer = next.variables.get('dissScenarioTimer');
const restoredTimer = newScenarioTimer[0].text
  .replace("'The 4-minute technique challenge expired. Review Restart scenario to try again.'", () => "'Timed practical expired. Restart the scenario to try again.'")
  .replace("'The 4-minute technique challenge expired; active specimen contact was canceled and no action was recorded.'", () => "'Timed practical expired; active specimen contact was canceled and no action was recorded.'");
check('Canvas scenario timer algorithm unchanged', oldScenarioTimer.length === 1 && newScenarioTimer.length === 1 && oldScenarioTimer[0].text === restoredTimer, 'Only two expiry message labels changed; interval cadence, guards, remaining-time calculation and completion freeze unchanged.');
const scope = fn(next, 'procedureScenarioRestartScope').text;
check('Restart scope guards whole copied maps', scope.includes('procedure: data.procedureByLayer || {}') && scope.includes('inspected: data.exploredOrgans || {}'), 'Both maps copied by native activation participate in review revalidation, including other layers/specimens.');
check('Restart scope guards contextual activation inputs', ['specimen:', 'layer:', 'scenario:', 'startedAt:', 'workspace:', 'quiz:', 'practical:', 'guided:', 'instrument:', 'view:', 'condition:', 'variation:', 'techniqueMode:', 'revealed:'].every((field) => scope.includes(field)), 'Review matches owner, specimen, layer, scenario, start, workspace/activity mode, complete-layer state and material/instrument/view inputs.');
const confirm = fn(next, 'confirmProcedureScenarioRestart');
const identityGuard = confirm.node.body.body[1];
check('Obsolete review identity returns without mutation or focus', identityGuard.type === 'IfStatement' && identityGuard.consequent.type === 'ReturnStatement' && candidate.slice(identityGuard.test.start, identityGuard.test.end) === '!review || pending !== review', 'The first guard preserves a replacement review even when its data scope is identical.');
check('Rendered confirmation captures its exact private review', candidate.includes('onClick: function () { confirmProcedureScenarioRestart(scenarioRestartReview); }'), 'The mounted handler closes over that rendered review object.');
check('Confirm revalidates captured and latest connected canvas state', confirm.text.includes('pending.scope !== procedureScenarioRestartScope(d)') && confirm.text.includes('pending.scope !== procedureScenarioRestartScope(latest)'), 'Identity, captured render, current connected canvas state and activity mode are checked before native activation.');
check('Cancel and Escape preserve data', !fn(next, 'cancelProcedureScenarioRestart').text.includes('activateProcedureScenario') && fn(next, 'handleProcedureScenarioRestartKey').text.includes('cancelProcedureScenarioRestart'), 'Both delete only private review state and return focus; no lab data reset.');
const cancel = fn(next, 'cancelProcedureScenarioRestart');
const cancelIdentityGuard = cancel.node.body.body[0];
check('Obsolete Cancel returns before private mutation or focus', cancelIdentityGuard.type === 'IfStatement' && cancelIdentityGuard.consequent.type === 'ReturnStatement' && candidate.slice(cancelIdentityGuard.test.start, cancelIdentityGuard.test.end) === '!review || _disScenarioRestartReviews[dissectionSaveOwner] !== review', 'The first statement guards the exact review identity.');
const escape = fn(next, 'handleProcedureScenarioRestartKey');
const escapeIdentityGuard = escape.node.body.body[0];
check('Obsolete Escape returns before consuming the event', escapeIdentityGuard.type === 'IfStatement' && escapeIdentityGuard.consequent.type === 'ReturnStatement' && candidate.slice(escapeIdentityGuard.test.start, escapeIdentityGuard.test.end).includes('_disScenarioRestartReviews[dissectionSaveOwner] !== review') && escape.text.indexOf('return;') < escape.text.indexOf('event.preventDefault()'), 'Identity is checked before preventDefault, stopPropagation, cancellation or focus.');
check('Rendered Cancel and Escape capture their exact private review', candidate.includes('onClick: function () { cancelProcedureScenarioRestart(scenarioRestartReview); }') && candidate.includes('onKeyDown: function (event) { handleProcedureScenarioRestartKey(event, scenarioRestartReview); }'), 'All three review callbacks close over the same rendered review object.');
check('Activity priorities precede expired-scenario recovery', candidate.indexOf("action: 'quiz'") < candidate.indexOf("action: 'scenario-recovery'") && candidate.indexOf("action: 'flashcards'") < candidate.indexOf("action: 'scenario-recovery'") && candidate.indexOf("action: 'comparison'") < candidate.indexOf("action: 'scenario-recovery'") && candidate.indexOf("phase: 'Guided investigation'") < candidate.indexOf("action: 'scenario-recovery'"), 'Existing Study, assessment and Guided branches retain priority; recovery additionally requires !guidedMode.');
check('Recovery opens controls without automatic reset', fn(next, 'performPrimaryNextAction').text.includes("nextActionModel.action === 'scenario-recovery'") && fn(next, 'performPrimaryNextAction').text.includes("upd('techniquePanelOpen', true)") && !fn(next, 'performPrimaryNextAction').text.includes('activateProcedureScenario'), 'Recovery only opens the technique panel and focuses Restart scenario.');
check('Restart disclosure matches reset scope', candidate.includes("clears inspected-structure progress across the current ' + spec.name + ' specimen") && candidate.includes('Notes, confidence ratings, captured frames, and archived attempts remain.'), 'Current-layer technique is reset; specimen inspection flags are cleared; named work remains outside the reset patch.');
function reverse(source, receiptFile, expectedBeforeHash) {
  const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
  let inverse = source;
  for (const edit of receipt.edits.slice().reverse()) {
    if (inverse.split(edit.after).length !== 2) return {exact: false, reason: 'Inverse edit not unique'};
    inverse = inverse.replace(edit.after, () => edit.before);
  }
  return {exact: hash(source) === receipt.afterSha256 && hash(inverse) === receipt.beforeSha256 && hash(inverse) === expectedBeforeHash, beforeSha256: hash(inverse), afterSha256: hash(source)};
}
check('Source receipts reverse exactly to the prior View runtime', reverse(candidate, path.join(sourceDir, 'renderer-edits.json'), hash(baseline)).exact, {sourceSha256: hash(candidate), baselineSha256: hash(baseline)});
const unitReverse = reverse(unit, path.join(__dirname, 'unit-edits.json'), 'fa0e8392e9984aefa62658bbf9a7a68eb55bac19dced5ae294e13897c9ec35fb');
check('Unit receipts reverse exactly to the original pass baseline', unitReverse.exact, unitReverse);
const incrementalBaseline = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'unit-incremental-baseline.js.gz')));
const incrementalReverse = reverse(unit, path.join(__dirname, 'unit-incremental-edits.json'), hash(incrementalBaseline));
check('Incremental unit receipt reverses exactly to the previous candidate', incrementalReverse.exact, incrementalReverse);
function exactArchivedBaseline(file, name) {
  const current = fs.readFileSync(path.join(repo, file));
  const receipt = JSON.parse(fs.readFileSync(path.join(report, 'edits/' + name + '-edits.json'), 'utf8'));
  let inverse = current.toString();
  for (const edit of receipt.edits.slice().reverse()) {
    if (inverse.split(edit.after).length !== 2) return {exact: false, reason: 'Inverse edit not unique'};
    inverse = inverse.replace(edit.after, () => edit.before);
  }
  const archived = zlib.gunzipSync(fs.readFileSync(path.join(report, 'edits/' + name + '-baseline.js.gz')));
  return {exact: Buffer.from(inverse).equals(archived) && hash(current) === receipt.afterSha256 && hash(archived) === receipt.beforeSha256, currentSha256: hash(current), archivedBaselineSha256: hash(archived), archivedBytes: archived.length};
}
for (const [file, name] of [['stem_lab/stem_tool_dissection.js', 'renderer'], ['tests/dissection_lab_improvements.test.js', 'unit']]) {
  const recovery = exactArchivedBaseline(file, name);
  check('Canonical ' + name + ' receipt recovers the archived baseline byte for byte', recovery.exact, recovery);
}
const workspace = JSON.parse(fs.readFileSync(path.join(report, 'workspace-before.json'), 'utf8'));
function reviewPreservedFiles(entries) {
  return Object.entries(entries).map(([file, expected]) => {
    const actual = hash(fs.readFileSync(path.join(repo, file)));
    return {file, expectedSha256: expected, actualSha256: actual, unchanged: actual === expected};
  });
}
const intentionalCanvasFile = 'tests/dissection_canvas_loop.test.js';
const protectedInputs = reviewPreservedFiles(Object.fromEntries(Object.entries(workspace.unchanged).filter(([file]) => file !== intentionalCanvasFile))), previousReportFiles = reviewPreservedFiles(workspace.previousReport);
check('Eight protected input files remain unchanged', Object.keys(workspace.unchanged).length === 9 && protectedInputs.length === 8 && protectedInputs.every((entry) => entry.unchanged), protectedInputs);
const canvasReceipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'canvas-loop-edits.json'), 'utf8'));
const canvasCandidate = fs.readFileSync(path.join(__dirname, 'canvas-loop-next.js'));
const canvasBaseline = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'canvas-loop-baseline.js.gz')));
let canvasInverse = canvasCandidate.toString();
for (const edit of canvasReceipt.edits.slice().reverse()) {
  if (canvasInverse.split(edit.after).length !== 2) throw Error('Canvas assertion inverse is not unique');
  canvasInverse = canvasInverse.replace(edit.after, () => edit.before);
}
const canvasBeforeLine = canvasBaseline.toString().split(/\r?\n/).find((line) => line.includes('if \\(remaining === 0\\)'));
const canvasAfterLine = canvasCandidate.toString().split(/\r?\n/).find((line) => line.includes('if \\(remaining === 0\\)'));
const canvasIntentionalUpdate = {
  file: intentionalCanvasFile,
  beforeSha256: hash(canvasBaseline), candidateSha256: hash(canvasCandidate), actualSha256: currentPins[intentionalCanvasFile],
  exactReversal: Buffer.from(canvasInverse).equals(canvasBaseline),
  applied: currentPins[intentionalCanvasFile] === canvasReceipt.afterSha256,
  assertionOnly: canvasReceipt.edits.length === 2 && canvasBeforeLine && canvasAfterLine && canvasBeforeLine.includes("'caution'") && canvasAfterLine.includes("'caution'") && canvasBeforeLine.includes('cancelActiveCanvasGesture') && canvasAfterLine.includes('cancelActiveCanvasGesture'),
};
check('One intentional canvas assertion update changes only the two expiry wording prefixes', canvasIntentionalUpdate.applied && canvasIntentionalUpdate.assertionOnly && canvasIntentionalUpdate.exactReversal && canvasReceipt.beforeSha256 === workspace.unchanged[intentionalCanvasFile] && hash(canvasBaseline) === canvasReceipt.beforeSha256 && hash(canvasCandidate) === canvasReceipt.afterSha256, canvasIntentionalUpdate);
check('All 303 previous report files remain unchanged', previousReportFiles.length === 303 && previousReportFiles.every((entry) => entry.unchanged), {files: previousReportFiles.length, failedFiles: previousReportFiles.filter((entry) => !entry.unchanged), manifestSha256: hash(JSON.stringify(previousReportFiles))});
const git = (args) => execFileSync('git', args, {cwd: repo, encoding: 'utf8', windowsHide: true, env: {...process.env, GIT_OPTIONAL_LOCKS: '0'}});
const gitState = {head: git(['rev-parse', 'HEAD']).trim(), stagedPaths: git(['diff', '--cached', '--name-only'])};
check('HEAD and staging remain at the recorded baseline', gitState.head === workspace.head && gitState.stagedPaths === workspace.stagedPaths, {expected: {head: workspace.head, stagedPaths: workspace.stagedPaths}, actual: gitState});
const result = {
  scope: 'Independent static native/persistence preservation audit; no suites or repository writes',
  candidateSourceSha256: hash(candidate), candidateUnitSha256: hash(unit), baselineSourceSha256: hash(baseline),
  currentPins, protectedInputCount: protectedInputs.length, intentionalProtectedInputUpdates: [canvasIntentionalUpdate], previousReportFileCount: previousReportFiles.length, gitState,
  checks, passed: checks.every((entry) => entry.passed),
  resolvedFindings: [
    'Per-review identity prevents a canceled confirmation callback from confirming a replacement review.',
    'Whole-map revision guards prevent stale activation from overwriting newer other-layer or other-specimen records.',
    'Captured Cancel and Escape identities preserve a replacement review and its focus; stale Escape is not consumed.',
  ], findings,
};
fs.writeFileSync(path.join(__dirname, 'native-preservation-review.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({passed: result.passed, checks: checks.length, candidateSourceSha256: result.candidateSourceSha256, candidateUnitSha256: result.candidateUnitSha256, failedChecks: checks.filter((entry) => !entry.passed).map((entry) => entry.name), findings}));
process.exitCode = result.passed ? 0 : 1;
