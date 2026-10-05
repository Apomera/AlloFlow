from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import sys

ROOT = Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')
LOCAL = Path(__file__).parent / 'evidence-recovery-validation'
REPORT = ROOT / 'reports/maine-sld-case-lab-evidence-recovery-2026-10-04/browser-validation'
module_name, host_name = sys.argv[1:3]
INTEGRATION = REPORT.parent / (sys.argv[3] if len(sys.argv) > 3 else 'integration')
sha = lambda body: hashlib.sha256(body).hexdigest()
spec = (ROOT / 'tests/e2e/maine-sld-practice.spec.ts').read_bytes()
proof = json.loads((REPORT / 'final-append-proof.json').read_text())
baseline = (REPORT / 'baseline-35-spec.ts').read_bytes()
assert sha(spec) == proof['browserTestSha256'] and spec.startswith(baseline)
assert sha(baseline) == '7bb6f0cc88bba10e031afde06bc224c189b26003a584f6f8dd9b7104d25bd8f4'

def collect_tests(result):
    tests = []
    def walk(suites):
        for suite in suites:
            for definition in suite.get('specs', []):
                for test in definition.get('tests', []):
                    tests.append({'title': definition['title'], 'status': test['status'], 'results': [{'status': entry['status'], 'durationMs': entry['duration'], 'retry': entry['retry']} for entry in test['results']]})
            walk(suite.get('suites', []))
    walk(result['suites'])
    return tests

def archive_run(directory):
    for file in sorted(directory.rglob('*')):
        if not file.is_file(): continue
        destination = REPORT / directory.name / file.relative_to(directory)
        body = file.read_bytes()
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists(): assert destination.read_bytes() == body, destination
        else: destination.write_bytes(body)

def invocation(name, count):
    directory = LOCAL / name
    result = json.loads((directory / 'result.json').read_text())
    identity = json.loads((directory / 'run-identity.json').read_text())
    tests = collect_tests(result)
    assert identity['browserTestSha256'] == sha(spec) and not identity['preparedAssetValidation']
    assert identity['selectedScenarios'] == count and len(tests) == count
    assert result['stats']['expected'] == count and all(result['stats'][key] == 0 for key in ('unexpected', 'flaky', 'skipped'))
    assert not result.get('errors')
    assert all(test['status'] == 'expected' and len(test['results']) == 1 and test['results'][0]['status'] == 'passed' and test['results'][0]['retry'] == 0 for test in tests)
    assert result['config']['workers'] == 1 and result['config']['projects'][0]['timeout'] == 120000 and result['config']['projects'][0]['retries'] == 0
    assert sha((ROOT / 'maine_sld_practice_source.jsx').read_bytes()) == identity['sourceSha256']
    for rel in ['maine_sld_practice_module.js', 'desktop/web-app/public/maine_sld_practice_module.js', 'desktop/app-build/maine_sld_practice_module.js', 'desktop/web-app/build/maine_sld_practice_module.js']:
        assert sha((ROOT / rel).read_bytes()) == identity['expectedModuleSha256'], rel
    archive_run(directory)
    return {'name': name, 'stats': result['stats'], 'tests': tests, 'exitCode': 0, 'resultSha256': sha((directory / 'result.json').read_bytes()), 'resultFile': name + '/result.json', 'logFile': name + '/run.log', 'runCommand': name + '/run-command.ps1', 'preparedAssetValidation': False, 'validationMethod': identity['validationMethod'], 'sourceSha256': identity['sourceSha256'], 'moduleSha256': identity['expectedModuleSha256']}

module = invocation(module_name, 5)
host = invocation(host_name, 1)
assert module['sourceSha256'] == host['sourceSha256'] and module['moduleSha256'] == host['moduleSha256']
scans = []
for file in sorted((LOCAL / module_name / 'browser').glob('axe-*.json')):
    value = json.loads(file.read_text())
    assert value['violations'] == [], file
    scans.append({'file': module_name + '/browser/' + file.name, 'violations': 0, 'sha256': sha(file.read_bytes())})
assert len(scans) == 5
representatives = [
    {'file': module_name + '/browser/finding-removal-recovery-alex-320-dark.png', 'description': 'Collapsed most-recent removal recovery in narrow dark layout, showing Undo.'},
    {'file': module_name + '/browser/finding-removal-preview-alex-320-dark.png', 'description': 'Expanded 4000-character literal note preview remains within the narrow activity width.'},
    {'file': module_name + '/browser/finding-removal-recovery-alex-844x390-dark.png', 'description': 'Score finding recovery in short landscape layout.'},
    {'file': module_name + '/browser/finding-removal-restored-note-alex-844x390-dark.png', 'description': 'Keyboard Undo restores complete note and role, with the entire active note control visible in short landscape.'},
]
for capture in representatives:
    path = REPORT / capture['file']
    assert path.exists(), path
    capture['sha256'] = sha(path.read_bytes())
attempts = []
for directory in sorted(LOCAL.iterdir()):
    if not directory.is_dir() or not (directory / 'result.json').exists(): continue
    archive_run(directory)
    result = json.loads((directory / 'result.json').read_text())
    identity = json.loads((directory / 'run-identity.json').read_text())
    attempts.append({'name': directory.name, 'stats': result['stats'], 'tests': collect_tests(result), 'sourceSha256': identity['sourceSha256'], 'moduleSha256': identity['expectedModuleSha256'], 'browserTestSha256': identity['browserTestSha256'], 'expectedBaselineFailure': bool(identity.get('expectedBaselineFailure')), 'errors': result.get('errors', [])})
tested_host = sha((INTEGRATION / 'source-preview/tested-host.jsx').read_bytes())
tested_bundle = sha((INTEGRATION / 'source-preview/host.bundle.js').read_bytes())
independent_review = REPORT.parent / 'source-and-layout-review.md'
assert independent_review.exists(), 'Finish after independent final pixel review is ready'
summary = {'status': 'PASS', 'completedAt': datetime.now(timezone.utc).isoformat(), 'scenarioCount': 6, 'distinctTargetedScenarios': 6, 'passed': 6, 'passed6': True, 'moduleScenariosPassed': 5, 'hostScenarioPassed': 1, 'newScenarios': 2, 'retainedScenarios': 4, 'retainedOriginalScenarios': 35, 'availableScenariosAfterAddition': 37, 'original35PrefixBytePreserved': True, 'original35Sha256': sha(baseline), 'original35Bytes': len(baseline), 'workers': 1, 'automaticRetries': 0, 'timeoutMs': 120000, 'normalTracePolicy': 'retain-on-failure', 'finalModuleInvocation': module, 'finalHostInvocation': host, 'moduleSha256': module['moduleSha256'], 'sourceSha256': module['sourceSha256'], 'browserTestSha256': sha(spec), 'testedHostSourceSha256': tested_host, 'testedHostBundleSha256': tested_bundle, 'sourceHostBaseUrl': 'http://127.0.0.1:65063/app', 'axeScans': len(scans), 'axeViolations': 0, 'accessibilityScanCount': len(scans), 'accessibilityScans': scans, 'representativeScreenshots': representatives, 'attempts': attempts, 'preparedAssetValidation': False, 'validationMethod': 'original canonical specification and unchanged synchronous stylesheet setup', 'originalBodiesBytePreserved': True, 'appendProof': 'final-append-proof.json', 'baselineRegressionProof': 'baseline-regression-proof.json', 'initialExpectedBaselineFailure': 'baseline-regression-01', 'initialBaselineInterpretation': 'The original activity removed the selected finding and its role/note but exposed no recovery action. The unchanged original setup succeeded; the new recovery-visible assertion failed because its group was absent. The exact initial 37-test spec and raw failure artifacts are retained.', 'firstProvisionalModuleInvocation': 'module-focused-01', 'firstProvisionalModuleInterpretation': 'The first enhanced candidate passed four focused targets and failed the first new scenario solely because the new exact expected accessible-name assertion rendered an existing null assessment as null rather than the source-record fallback Unspecified assessment. Only this new expectation was corrected; the original 35 test bodies were unchanged. Independent direct pixels also identified a vertically stretched Undo button, prompting a scoped source layout correction. All five final module targets were rerun on the final candidate, and earlier four passes are historical rather than accepted final coverage.', 'fullSuiteCoreAndPrintRerun': False, 'visualReviewPending': False, 'independentVisualReviewReport': '../source-and-layout-review.md', 'independentVisualReviewSha256': sha(independent_review.read_bytes())}
root_review_path = REPORT.parent / 'root-layout-review.json'
summary['firstProvisionalModuleInterpretation'] = summary['firstProvisionalModuleInterpretation'].replace('Only this new expectation was corrected;', "Only the new fixture's expected-name and assembled score-row assessment fallback were corrected;")
summary['fixtureCorrectionHistory'] = {'accessibleNameAndAssessmentSelection': 'assessment-expectation-correction and fixture-row-normalization preserve prior exact specs/proofs; only new fixture data follows the existing Unspecified assessment fallback.', 'expandedPreviewCapture': 'The final new capture scrolls the removed literal note itself into view rather than only its summary.', 'original35PrefixBytePreserved': True}
root_review = json.loads(root_review_path.read_text())
assert root_review['status'] == 'accepted-without-findings'
assert root_review['sourceSha256'] == module['sourceSha256'] and root_review['moduleSha256'] == module['moduleSha256']
assert len(root_review['captures']) == 4
for capture in root_review['captures']:
    assert capture['directlyViewed'] and capture['status'] == 'accepted'
    assert sha((REPORT.parent / capture['path']).read_bytes()) == capture['sha256']
observed_path = INTEGRATION / 'final-observed-identity.json'
observed = json.loads(observed_path.read_text())
assert observed['testedHostSha256'] == tested_host and observed['moduleHash'] == module['moduleSha256']
assert observed['boundedSnapshotRetained'] and not observed['rebuildPerformed']
http_path = INTEGRATION / 'post-host-served-verification.json'
http = json.loads(http_path.read_text())
assert http['exactFrozenModuleServed'] and len(http['checks']) == 3
for check in http['checks']:
    assert check['status'] == 200 and check['exitCode'] == 0 and check['failure'] is None
    assert check['servedSha256'] == check['expectedSha256']
    assert sha(Path(check['responseFile']).read_bytes()) == check['servedSha256']
summary.update({'moduleScenariosPassed5': True, 'hostScenarioPassed1': True, 'rootVisualReviewReport': '../root-layout-review.json', 'rootVisualReviewSha256': sha(root_review_path.read_bytes()), 'sharedHostObservation': observed, 'postHostObservedIdentity': '../' + str(observed_path.relative_to(REPORT.parent)).replace('\\', '/'), 'postHostObservedIdentitySha256': sha(observed_path.read_bytes()), 'postHostHttpVerification': '../' + str(http_path.relative_to(REPORT.parent)).replace('\\', '/'), 'postHostHttpVerificationSha256': sha(http_path.read_bytes()), 'exactServedSnapshotVerified': True})
encoded = json.dumps(summary, indent=2).encode()
for parent in (LOCAL, REPORT):
    out = parent / 'validation-summary.json'
    assert not out.exists(), 'Preserve prior summary before replacing it'
    out.write_bytes(encoded)
(REPORT / 'tested-spec.ts').write_bytes(spec)
(REPORT / 'README.md').write_text('''# Maine SLD finding-recovery browser validation

Six distinct focused Chromium scenarios passed: five module scenarios and one actual source-host deep-link and configured educator-access scenario. The original canonical specification and synchronous stylesheet setup were used with the unchanged 120-second timeout, one worker, zero automatic retries and normal retain-on-failure trace policy. The prior 35-test prefix remains byte-identical, with two appended scenarios and 37 available. This is focused coverage, not a claim that all 37 scenarios were executed.

The new scenarios exercise exact role and literal 4000-character note recovery across all five case records; separate per-case transient snapshots; newest-removal replacement; deliberate new-entry protection; neighboring keyboard focus; filtered score restoration and stable same-step heading focus when the score remains hidden; canceled versus confirmed reset and restore; schema-preserving worksheet export; healthy tab reload without serialized recovery state; expanded narrow literal-preview width; and full restored-note focus in a short landscape viewport. Retained all52 score/evidence/Q8Q9 persistence, participant-review evidence detour, and save-warning scenarios also passed.

Five actual scoped axe scans found zero violations. Four new screen captures are listed for independent pixel review, with retained workflow captures also available in the raw module output. Axe covers the captured activity states and does not substitute for complete accessibility review.

The original baseline failed as expected at the first missing recovery-group assertion after removing a selected Alex case finding. Setup completed normally. The first enhanced-candidate module run then passed four targets and failed only an incorrect new expected accessible-name assertion for an existing null assessment; the UI correctly used the source-record fallback Unspecified assessment. The new assertion was corrected while retaining its exact case-specific name check. Direct pixel review also found a vertically stretched Undo button, which received a scoped source layout correction before all five module targets were rerun on the final candidate. Earlier four passes are retained history rather than accepted final coverage. Raw outputs, tested specs, trace, video, failure screenshots, worksheet fixtures and hash manifests are preserved.

No prepared stylesheet fallback, timeout extension, automatic retry, product scoring change, legal-content audit, full-app build, core-suite rerun or print rerun is claimed for this pass.
''', encoding='utf-8')
(REPORT / 'finalization-helper.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps({'status': 'PASS', 'scenarios': 6, 'module': module_name, 'host': host_name, 'scopedAxeScans': len(scans), 'summary': str(REPORT / 'validation-summary.json')}, indent=2))
