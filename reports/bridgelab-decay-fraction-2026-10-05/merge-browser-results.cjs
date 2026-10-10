// Run from the repository root after both raw Playwright JSON reports finish.
// This preserves the failed full attempt and replaces only the three named
// guide-energy specifications with clean results from a fresh process.
// verify.cjs also calls this module to rebuild and check the complete aggregate.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const folder = 'reports/bridgelab-decay-fraction-2026-10-05/';
const baseName = 'browser-final-attempt.json';
const recoveryName = 'browser-guide-energy-recovery.json';
const freshFullName = 'browser-final-clean.json';
const outputName = 'browser-results.json';
const freshFullConfigFile = 'C:/Users/cabba/Documents/Codex/2026-09-29/great-work-how-can-we-holistically/decay-fraction-2026-10-05/validation/playwright-video-off.config.ts';
const freshFullConfigSha256 = 'e2411a1cefb02de924ed7f8f8bb51cb553d76451bb4e03400a9e366ed9cd7e89';
const metadataKey = 'bridgeLabAggregation';
const selectedPrefix = 'guide energy:';
// The browser harness supplies ctx.t(k, fallback) and never loads ui_strings.
// verify.cjs checks current English registries independently of run freshness.
const inputFiles = [
  'stem_lab/stem_tool_bridgelab.js',
  'desktop/web-app/public/stem_lab/stem_tool_bridgelab.js',
  'tests/e2e/26-bridgelab-gl.spec.ts'
];
const expectedTitles = [
  ...[1000, 320].flatMap(width => [
    `guided damping: predict, compare scenes, preserve evidence and print at ${width}px`,
    `guided damping: qualitative case-study steps and reduced motion at ${width}px`,
    `guide energy: inspect, record and print the free-vibration budget at ${width}px`,
    `claim interval: follow the question, choose signed evidence and print at ${width}px`,
    `energy questions: guided A/B investigations, conservation diagram and saved question at ${width}px`,
    `decay fraction: inspect, record and print each trial's fraction remaining at ${width}px`
  ]),
  'guide energy: prepared-pair provenance survives scene selection and graphics loss',
  'claim interval: manual quantity and notebook provenance survive scene graphics loss',
  'claim interval: recorded guide conditions and tiny values persist in the report',
  'energy questions: zero shaking and manual intervals in labelled 2D with reduced motion',
  'decay fraction: guide B and its denominator survive scene A and graphics fallback'
];
const expectedGroups = new Map([
  ['guide energy:', 3], ['guided damping:', 4], ['claim interval:', 4],
  ['energy questions:', 3], ['decay fraction:', 3]
]);
// Fixed identities for the unchanged final test file, in expectedTitles order.
// Each tuple is the Playwright id suffix, source line and source column.
const expectedIdentityDetails = [
  ['cd0cb2f9aa476c79c0cb', 1242, 9], // Desktop guided damping: prediction.
  ['0327c1c4fcf6bf039061', 1318, 9], // Desktop guided damping: case study.
  ['f686623083270e871772', 1513, 9], // Desktop guide energy.
  ['e2f37c3c91924cfb562d', 1684, 9], // Desktop claim interval.
  ['5ce76c3b4273b4a93bf7', 2021, 9], // Desktop energy questions.
  ['751cba161ef88e57a51f', 2995, 9], // Desktop decay fraction.
  ['a084ecf1e3d4fb078ad3', 1242, 9], // Phone guided damping: prediction.
  ['1bfc09249bd8d622e9b2', 1318, 9], // Phone guided damping: case study.
  ['d70c92c6816bc000d8a6', 1513, 9], // Phone guide energy.
  ['d28b0e66cd3c8aa80303', 1684, 9], // Phone claim interval.
  ['793e6c5234750a03e649', 2021, 9], // Phone energy questions.
  ['7983aa5f7e0f23695603', 2995, 9], // Phone decay fraction.
  ['5b6faae53c5361ca5f9a', 1621, 7], // Guide-energy graphics provenance.
  ['71933bddc3f84783687e', 1715, 7], // Claim-interval graphics provenance.
  ['3fdfad5e5aae7e57a71b', 1721, 7], // Claim-interval recorded conditions.
  ['a065b0201b8c5dbe4d7e', 2051, 7], // Zero shaking in labelled 2D.
  ['d7cf3c415b4b2481ee74', 3126, 7] // Decay-fraction graphics provenance.
];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));

function readRawReport(name) {
  const file = folder + name;
  const bytes = fs.readFileSync(file);
  return { name, file, sha256: sha256(bytes), report: JSON.parse(bytes.toString('utf8')) };
}

function readRunSpan(report, name) {
  const startTime = report.stats?.startTime;
  const startTimeMs = typeof startTime === 'string' ? Date.parse(startTime) : NaN;
  assert(Number.isFinite(startTimeMs) && startTimeMs > 0
    && new Date(startTimeMs).toISOString() === startTime,
  name + ': missing or invalid ISO run start time');
  const durationMs = report.stats.duration;
  assert(typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs >= 0,
    name + ': missing or invalid run duration');
  const endTimeMs = startTimeMs + durationMs;
  assert(Number.isFinite(endTimeMs) && Number.isFinite(new Date(endTimeMs).getTime()),
    name + ': invalid run end time');
  return { startTime, startTimeMs, durationMs, endTimeMs };
}

function collectSpecifications(report, name) {
  assert(!Object.hasOwn(report, metadataKey), name + ': raw report is already an aggregate');
  assert(Array.isArray(report.errors) && report.errors.length === 0,
    name + ': top-level Playwright errors must be absent');
  assert(Array.isArray(report.suites) && report.suites.length > 0, name + ': missing suites');
  const rows = [];
  const ids = new Set();
  const identities = new Set();
  const titles = new Set();

  function visit(suite, parents) {
    assert(suite && typeof suite.title === 'string', name + ': invalid suite');
    const suitePath = [...parents, suite.title];
    if (suite.specs !== undefined) assert(Array.isArray(suite.specs), name + ': invalid specifications');
    for (const spec of suite.specs || []) {
      assert(typeof spec.id === 'string' && spec.id.length > 0, name + ': missing specification id');
      assert(typeof spec.title === 'string' && spec.title.length > 0, name + ': missing specification title');
      assert(spec.file === '26-bridgelab-gl.spec.ts', name + ': unexpected test file');
      assert(Number.isInteger(spec.line) && spec.line > 0 && Number.isInteger(spec.column) && spec.column > 0,
        name + ': missing source location for ' + spec.title);
      assert(Array.isArray(spec.tests) && spec.tests.length === 1,
        name + ': each specification must have exactly one Chromium test: ' + spec.title);
      const test = spec.tests[0];
      assert(test.projectId === 'chromium' && test.projectName === 'chromium'
        && test.expectedStatus === 'passed', name + ': unexpected project or expected status: ' + spec.title);
      assert(typeof test.timeout === 'number' && Number.isFinite(test.timeout) && test.timeout > 0,
        name + ': missing test timeout: ' + spec.title);
      assert(Array.isArray(test.results) && test.results.length === 1,
        name + ': retries or missing results are not accepted: ' + spec.title);
      const result = test.results[0];
      assert(result.retry === 0 && Array.isArray(result.errors), name + ': invalid result: ' + spec.title);
      assert(typeof result.startTime === 'string' && Number.isFinite(Date.parse(result.startTime))
        && typeof result.duration === 'number' && Number.isFinite(result.duration) && result.duration >= 0,
      name + ': invalid result timing: ' + spec.title);
      const identity = { suitePath, file: spec.file, line: spec.line, column: spec.column,
        id: spec.id, title: spec.title, projectId: test.projectId, projectName: test.projectName };
      const identityKey = JSON.stringify(identity);
      assert(!ids.has(spec.id) && !identities.has(identityKey) && !titles.has(spec.title),
        name + ': duplicate specification identity: ' + spec.title);
      ids.add(spec.id);
      identities.add(identityKey);
      titles.add(spec.title);
      rows.push({ spec, test, result, identity, identityKey });
    }
    if (suite.suites !== undefined) assert(Array.isArray(suite.suites), name + ': invalid nested suites');
    for (const child of suite.suites || []) visit(child, suitePath);
  }
  for (const suite of report.suites) visit(suite, []);
  return rows;
}

function assertCleanPass(row, name) {
  assert(row.spec.ok === true && row.test.status === 'expected' && row.result.status === 'passed'
    && row.result.errors.length === 0 && row.result.error == null,
  name + ': specification did not pass cleanly: ' + row.spec.title);
}

function assertRawStats(report, rows, name) {
  const counts = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 };
  for (const row of rows) {
    if (row.result.status === 'passed') {
      assertCleanPass(row, name);
      counts.expected += 1;
    } else {
      assert(row.spec.title.startsWith(selectedPrefix) && row.spec.ok === false
        && row.test.status === 'unexpected' && ['failed', 'timedOut'].includes(row.result.status)
        && row.result.errors.length > 0,
      name + ': unselected failure, skip or flaky result: ' + row.spec.title);
      counts.unexpected += 1;
    }
  }
  for (const [key, count] of Object.entries(counts)) {
    assert.equal(report.stats[key], count, name + ': incorrect statistics for ' + key);
  }
}

function snapshotInputs(spans) {
  const inputSha256 = {};
  const inputMtimeMs = {};
  for (const file of inputFiles) {
    const bytes = fs.readFileSync(file);
    const mtimeMs = fs.statSync(file).mtimeMs;
    assert(Number.isFinite(mtimeMs), 'Invalid input modification time: ' + file);
    for (const [name, span] of spans) {
      assert(mtimeMs <= span.startTimeMs, name + ': input changed after the run started: ' + file);
    }
    inputSha256[file] = sha256(bytes);
    inputMtimeMs[file] = mtimeMs;
  }
  assert.equal(inputSha256[inputFiles[0]], inputSha256[inputFiles[1]], 'Bridge source mirrors differ');
  return { inputSha256, inputMtimeMs };
}

function readRunConfig(file, raw, span) {
  if (file === null) return null;
  assert(typeof file === 'string' && file.length > 0, 'Invalid browser config path');
  const reportedFile = raw.report.config?.configFile;
  assert(typeof reportedFile === 'string' && reportedFile.length > 0,
    raw.name + ': report does not identify its config file');
  assert.equal(path.resolve(file).toLowerCase(), path.resolve(reportedFile).toLowerCase(),
    raw.name + ': supplied config does not match the config used by Playwright');
  const bytes = fs.readFileSync(file);
  const mtimeMs = fs.statSync(file).mtimeMs;
  assert(Number.isFinite(mtimeMs) && mtimeMs <= span.startTimeMs,
    raw.name + ': config changed after its run started: ' + file);
  return { file, sha256: sha256(bytes), mtimeMs, appliesTo: raw.file };
}

function assertSnapshotUnchanged(inputs, rawReports, runConfig) {
  for (const file of inputFiles) {
    assert.equal(sha256(fs.readFileSync(file)), inputs.inputSha256[file], 'Input changed while reading: ' + file);
    assert.equal(fs.statSync(file).mtimeMs, inputs.inputMtimeMs[file], 'Input modification time changed: ' + file);
  }
  for (const raw of rawReports) {
    assert.equal(sha256(fs.readFileSync(raw.file)), raw.sha256, 'Raw browser report changed while reading: ' + raw.file);
  }
  if (runConfig) {
    assert.equal(sha256(fs.readFileSync(runConfig.file)), runConfig.sha256,
      'Browser config changed while reading: ' + runConfig.file);
    assert.equal(fs.statSync(runConfig.file).mtimeMs, runConfig.mtimeMs,
      'Browser config modification time changed: ' + runConfig.file);
  }
}

function buildAggregate({ recoveryConfigFile = null } = {}) {
  const base = readRawReport(baseName);
  const recovery = readRawReport(recoveryName);
  const baseSpan = readRunSpan(base.report, baseName);
  const recoverySpan = readRunSpan(recovery.report, recoveryName);
  assert(recoverySpan.startTimeMs >= baseSpan.endTimeMs,
    'The fresh-process recovery must start after the original full attempt ended');
  const baseRows = collectSpecifications(base.report, baseName);
  const recoveryRows = collectSpecifications(recovery.report, recoveryName);
  assert.equal(baseRows.length, 17, 'The original report must contain exactly 17 specifications');
  assert.deepEqual(baseRows.map(row => row.spec.title).sort(), [...expectedTitles].sort(),
    'The original report does not contain the exact expected workflows');
  for (const [prefix, count] of expectedGroups) {
    assert.equal(baseRows.filter(row => row.spec.title.startsWith(prefix)).length, count,
      'Incorrect original workflow group: ' + prefix);
  }
  assert.equal(recoveryRows.length, 3, 'Recovery must contain exactly three specifications');
  assert(recoveryRows.every(row => row.spec.title.startsWith(selectedPrefix)),
    'Recovery may contain only guide-energy specifications');
  assertRawStats(base.report, baseRows, baseName);
  assertRawStats(recovery.report, recoveryRows, recoveryName);

  const baseGuides = new Map(baseRows.filter(row => row.spec.title.startsWith(selectedPrefix))
    .map(row => [row.identityKey, row]));
  const recoveryById = new Map();
  for (const row of recoveryRows) {
    assertCleanPass(row, recoveryName);
    const original = baseGuides.get(row.identityKey);
    assert(original, 'Recovery identity does not exactly match the original: ' + row.spec.title);
    assert.equal(row.test.timeout, original.test.timeout, 'Recovery changed the test timeout: ' + row.spec.title);
    assert.deepEqual(row.test.annotations, original.test.annotations, 'Recovery changed test annotations: ' + row.spec.title);
    recoveryById.set(row.spec.id, row);
  }
  assert.equal(recoveryById.size, 3, 'Recovery contains duplicate or missing guide-energy identities');
  for (const row of baseRows.filter(row => !row.spec.title.startsWith(selectedPrefix))) {
    assertCleanPass(row, baseName);
  }

  const inputs = snapshotInputs([[baseName, baseSpan], [recoveryName, recoverySpan]]);
  const recoveryConfig = readRunConfig(recoveryConfigFile, recovery, recoverySpan);
  const aggregate = clone(base.report);
  function replaceGuides(suite) {
    if (suite.specs) suite.specs = suite.specs.map(spec =>
      recoveryById.has(spec.id) ? clone(recoveryById.get(spec.id).spec) : spec);
    for (const child of suite.suites || []) replaceGuides(child);
  }
  for (const suite of aggregate.suites) replaceGuides(suite);
  const startTimeMs = Math.min(baseSpan.startTimeMs, recoverySpan.startTimeMs);
  const endTimeMs = Math.max(baseSpan.endTimeMs, recoverySpan.endTimeMs);
  aggregate.stats = { ...aggregate.stats, startTime: new Date(startTimeMs).toISOString(),
    duration: endTimeMs - startTimeMs, expected: 17, unexpected: 0, flaky: 0, skipped: 0 };

  function provenance(raw, span) {
    return { file: raw.file, sha256: raw.sha256, startTime: span.startTime,
      durationMs: span.durationMs, stats: clone(raw.report.stats) };
  }
  aggregate[metadataKey] = {
    kind: 'bridge-lab-guide-energy-recovery-v1',
    method: '14 clean original specifications plus 3 clean fresh-process recovery specifications',
    selectedGroup: selectedPrefix,
    counts: { originalSelected: 14, recoverySelected: 3, uniqueSpecifications: 17 },
    reports: { original: provenance(base, baseSpan), recovery: provenance(recovery, recoverySpan) },
    recoveryConfig,
    runSpan: { startTime: aggregate.stats.startTime, endTime: new Date(endTimeMs).toISOString(),
      durationMs: aggregate.stats.duration },
    selections: baseRows.map(row => {
      const selected = recoveryById.get(row.spec.id);
      return { ...row.identity, timeoutMs: row.test.timeout,
        selectedReport: selected ? recovery.file : base.file,
        originalResultStatus: row.result.status,
        selectedResultStatus: (selected || row).result.status };
    }),
    ...inputs
  };
  assertSnapshotUnchanged(inputs, [base, recovery], recoveryConfig);
  return { aggregate, reportSha256: { [base.file]: base.sha256, [recovery.file]: recovery.sha256 },
    additionalInputSha256: recoveryConfig ? { [recoveryConfig.file]: recoveryConfig.sha256 } : {},
    additionalInputMtimeMs: recoveryConfig ? { [recoveryConfig.file]: recoveryConfig.mtimeMs } : {} };
}

function validateAggregate(browser) {
  assert(browser && Object.hasOwn(browser, metadataKey), 'Browser recovery provenance is missing');
  const rebuilt = buildAggregate({ recoveryConfigFile: browser[metadataKey]?.recoveryConfig?.file ?? null });
  assert.deepEqual(browser, rebuilt.aggregate,
    'Browser aggregate differs from its validated raw reports, selections or current inputs');
  return { provenance: rebuilt.aggregate[metadataKey], reportSha256: rebuilt.reportSha256,
    additionalInputSha256: rebuilt.additionalInputSha256, additionalInputMtimeMs: rebuilt.additionalInputMtimeMs };
}

function validateFreshFullRun(browser) {
  const raw = readRawReport(freshFullName);
  const span = readRunSpan(raw.report, freshFullName);
  const rows = collectSpecifications(raw.report, freshFullName);
  assert.equal(rows.length, 17, 'The fresh full run must contain exactly 17 specifications');
  assert.deepEqual(rows.map(row => row.spec.title).sort(), [...expectedTitles].sort(),
    'The fresh full run does not contain the exact expected workflows');
  for (const row of rows) {
    assertCleanPass(row, freshFullName);
    assert.equal(row.test.timeout, 180000, 'The fresh full run changed a test timeout: ' + row.spec.title);
    const [suffix, line, column] = expectedIdentityDetails[expectedTitles.indexOf(row.spec.title)];
    assert.equal(row.spec.id, '0f4949b97cc65d74f1aa-' + suffix, 'Unexpected full-run test id: ' + row.spec.title);
    assert.equal(row.spec.line, line, 'Unexpected full-run test line: ' + row.spec.title);
    assert.equal(row.spec.column, column, 'Unexpected full-run test column: ' + row.spec.title);
    assert.deepEqual(row.identity.suitePath, ['26-bridgelab-gl.spec.ts', 'Bridge Lab — real WebGL'],
      'Unexpected full-run suite identity: ' + row.spec.title);
  }
  assertRawStats(raw.report, rows, freshFullName);
  assert.deepEqual(browser, raw.report, 'browser-results.json differs from the fresh full-run report');
  assert.equal(sha256(fs.readFileSync(folder + outputName)), raw.sha256,
    'browser-results.json must be a byte-identical copy of the fresh full-run report');
  const inputs = snapshotInputs([[freshFullName, span]]);
  const config = readRunConfig(freshFullConfigFile, raw, span);
  assert.equal(config.sha256, freshFullConfigSha256, 'The approved video-off validation config changed');
  assertSnapshotUnchanged(inputs, [raw], config);
  return {
    provenance: { kind: 'bridge-lab-fresh-full-run-v1',
      method: '17 clean specifications from one fresh full run',
      report: { file: raw.file, sha256: raw.sha256, startTime: span.startTime,
        durationMs: span.durationMs, stats: clone(raw.report.stats) },
      config, identities: rows.map(row => ({ ...row.identity, timeoutMs: row.test.timeout })), ...inputs },
    reportSha256: { [raw.file]: raw.sha256 },
    additionalInputSha256: { [config.file]: config.sha256 },
    additionalInputMtimeMs: { [config.file]: config.mtimeMs }
  };
}

module.exports = { buildAggregate, validateAggregate, validateFreshFullRun };

if (require.main === module) {
  const args = process.argv.slice(2);
  assert(args.length === 0 || (args.length === 2 && args[0] === '--recovery-config'),
    'Usage: node merge-browser-results.cjs [--recovery-config path/to/config]');
  const { aggregate } = buildAggregate({ recoveryConfigFile: args[1] ?? null });
  fs.writeFileSync(folder + outputName, JSON.stringify(aggregate, null, 2) + '\n');
  console.log(JSON.stringify({ output: folder + outputName, stats: aggregate.stats,
    provenance: aggregate[metadataKey] }, null, 2));
}
