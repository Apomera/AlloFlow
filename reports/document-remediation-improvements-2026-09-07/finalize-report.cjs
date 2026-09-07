const fs = require('node:fs');
const path = require('node:path');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const integration = read('integration-summary.json');
const mcp = read('mcp-selftest-final.json');
const portable = read('portable-core-final.json');
if (integration.failedFiles.length || integration.nonPassingAssertions.length || !mcp.ok
  || Object.values(mcp.checks).some(value => value !== true)
  || portable.numFailedTests || portable.numPassedTests !== 11) throw new Error('Final validation incomplete');
const file = path.join(__dirname, 'README.md');
const before = fs.readFileSync(file, 'utf8');
const placeholder = 'Final validation counts and evidence links are recorded below once the last build and report-contract checks complete.';
if (!before.includes(placeholder)) throw new Error('Report already finalized or changed');
let after = before.replace(placeholder, `| Validation | Result | Evidence |
| --- | --- | --- |
| Remediation integration | ${integration.passedAssertions.toLocaleString('en-US')} assertions passed across ${integration.files} files, using the latest result from broad and isolated runs | [Consolidated results](integration-summary.json) |
| Final rebuilt preservation/OCR gates | 38 passed; included in the consolidated total above | [Build tests](final-build-tests.json) |
| Follow-up rejection persistence | 10 passed | [Behavioral tests](core/followup-evidence-tests.json) |
| Actual local MCP self-test | ${Object.keys(mcp.checks).length} checks passed; real browser, scripted model | [Final self-test](mcp-selftest-final.json) |
| Chromium fixture and rendering tests | 7 passed | [Browser log](browser-tests.log) |
| Portable remediation, Chromium, and veraPDF | 11 passed, none skipped | [Portable results](portable-core-final.json) |
| Desktop durability, checkpoint/report contracts, validator adapters, remote runner | Passed focused suites and real CLI validation | [MCP details](mcp/implementation.md), [verification details](verification/implementation.md) |
| Module mirrors and syntax, host JSX, service TypeScript, runner stage/check | Passed | [Workspace checks](workspace-verification.json), [verification details](verification/implementation.md) |

The broad integration run had one annotation-test timeout and omitted one OCR file from its worker report. Both complete files passed in isolation. The consolidated result identifies the source report for every file; it is not presented as one uninterrupted test invocation. The original portable failures were test timeout artifacts and are resolved by the bounded asynchronous harness.`);
after = after.replace('Project autosave/import preserves these fields.', 'Project autosave/import preserves these fields. MCP driver output, desktop and remote reports, and terminal checkpoint resume retain the same bounded evidence; older version-2 capsules default missing fields to zero and an empty list.');
after = after.replace('including its documented-in-practice exit 1 behavior observed in the packaged CLI', 'including the exit 1 behavior observed in packaged veraPDF 1.30.2');
after = after.replace('[core preservation](core/implementation.md),', '[core preservation](core/implementation.md), [follow-up evidence](core/followup-evidence.md),');
after = after.replace(/\]\((?!https?:|[A-Za-z]:|\/)([^)]+)\)/g, (_, target) => '](' + path.resolve(__dirname, target).replace(/\\/g, '/') + ')');
if (fs.readFileSync(file, 'utf8') !== before) throw new Error('Concurrent report change');
fs.writeFileSync(file, after);
console.log('Final implementation report written.');
