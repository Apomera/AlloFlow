from pathlib import Path
from datetime import datetime,timezone
import hashlib,json

ROOT=Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')
LOCAL=Path(__file__).with_name('jurisdiction-validation')
REPORT=ROOT/'reports/maine-sld-case-lab-federal-maine-2026-10-04/browser-validation'
sha=lambda b:hashlib.sha256(b).hexdigest()
proof=json.loads((REPORT/'append-proof.json').read_text())
spec=(ROOT/'tests/e2e/maine-sld-practice.spec.ts').read_bytes()
baseline=(REPORT/'baseline-37-spec.ts').read_bytes()
assert spec.startswith(baseline) and sha(spec)==proof['browserTestSha256']
assert sha(baseline)==proof['original37Sha256']
frozen=json.loads((REPORT.parent/'frozen-activity.json').read_text())
for file,expected in frozen['sourceHashes'].items():assert sha((ROOT/file).read_bytes())==expected,file
for file,expected in frozen['fourCopyHashes'].items():assert sha((ROOT/file).read_bytes())==expected,file
def invocation(name,count,passed=True):
    run=REPORT/name;archive=json.loads((run/'archive-proof.json').read_text());identity=json.loads((run/'run-identity.json').read_text());result=json.loads((run/'result.json').read_text())
    assert archive['exitCode']==(0 if passed else 1) and sha((run/'result.json').read_bytes())==archive['resultSha256']
    assert identity['workers']==1 and identity['automaticRetries']==0 and identity['timeoutMs']==120000
    assert identity['configSha256']==sha((ROOT/'playwright.config.ts').read_bytes())
    assert identity['browserTestSha256']==proof['browserTestSha256'] and identity['expectedModuleSha256']==frozen['moduleSha256']
    assert result['stats']['expected']==(count if passed else 0) and result['stats']['unexpected']==(0 if passed else count) and result['stats']['flaky']==0 and result['stats']['skipped']==0
    tests=[]
    def walk(suite):
        for item in suite.get('specs',[]):
            for t in item['tests']:
                assert t['status']==('expected' if passed else 'unexpected') and len(t['results'])==1 and t['results'][0]['status']==('passed' if passed else 'timedOut') and t['results'][0]['retry']==0
                tests.append({'title':item['title'],'status':t['status'],'results':[{'status':r['status'],'durationMs':r['duration'],'retry':r['retry']} for r in t['results']]})
        for s in suite.get('suites',[]):walk(s)
    for suite in result['suites']:walk(suite)
    assert len(tests)==count
    candidate=json.loads((run/'browser/browser-candidate.json').read_text())
    assert candidate['moduleSha256']==frozen['moduleSha256']
    return {'name':name,'stats':result['stats'],'tests':tests,'exitCode':archive['exitCode'],'resultFile':archive['resultFile'],'resultSha256':archive['resultSha256'],'rawFileCount':archive['fileCount'],'archiveProofFile':str((run/'archive-proof.json').relative_to(ROOT)).replace('\\','/'),'archiveProofSha256':sha((run/'archive-proof.json').read_bytes())}
module=invocation('module-focused-01',2);first_host=invocation('host-only-01',1,False);host=invocation('host-only-02',1)
browser=REPORT/'module-focused-01/browser'
scans=[]
for name in ('axe-jurisdiction-case-320-dark.json','axe-jurisdiction-reasoning-1366-light.json'):
    path=browser/name;record=json.loads(path.read_text());assert record['violations']==[]
    scans.append({'file':str(path.relative_to(ROOT)).replace('\\','/'),'sha256':sha(path.read_bytes()),'violations':0,'state':record})
captures=[]
for name in ('jurisdiction-case-1366-light.png','jurisdiction-case-320x740-dark.png','jurisdiction-case-844x390-dark.png','jurisdiction-reasoning-1366-light.png'):
    path=browser/name;captures.append({'file':str(path.relative_to(ROOT)).replace('\\','/'),'sha256':sha(path.read_bytes()),'bytes':path.stat().st_size})
before=json.loads((browser/'jurisdiction-before-worksheet.json').read_text());after=json.loads((browser/'jurisdiction-after-worksheet.json').read_text())
assert before['caseWork']==after['caseWork'] and before['reviewed']==after['reviewed']
assert before['schemaVersion']==after['schemaVersion'] and before['moduleVersion']==after['moduleVersion']
guard=json.loads((REPORT/'host-only-02/prelaunch-guard.json').read_text())
assert guard['status']=='READY' and guard['borrowedRouteReaderBytePreserved'] and not guard['rebuildPerformed']
summary={'status':'PASS','completedAt':datetime.now(timezone.utc).isoformat(),'scenarioCount':3,'distinctTargetedScenarios':3,'passed':3,'moduleScenariosPassed':2,'hostScenarioPassed':1,'newScenarios':1,'retainedScenarios':2,'retainedOriginalScenarios':37,'availableScenariosAfterAddition':38,'original37PrefixBytePreserved':True,'original37Sha256':proof['original37Sha256'],'original37Bytes':len(baseline),'workers':1,'automaticRetries':0,'timeoutMs':120000,'normalTracePolicy':'retain-on-failure','preparedAssetValidation':False,'validationMethod':'Original canonical spec and unchanged synchronous Tailwind setup; actual app preview uses immutable unmodified current-host snapshot.','sourceSha256':frozen['sourceHashes']['maine_sld_practice_source.jsx'],'moduleSha256':frozen['moduleSha256'],'browserTestSha256':proof['browserTestSha256'],'testedHostSourceSha256':guard['testedHostSourceSha256'],'testedHostBundleSha256':guard['testedHostBundleSha256'],'observedCurrentHostHashesBeforeLaunch':guard['observedCurrentHosts'],'currentHostMatchesTestedSnapshotBeforeLaunch':False,'borrowedRouteReaderBytePreserved':True,'borrowedRouteReaderSha256':guard['borrowedRouteReaderSha256'],'immutableSnapshotRetained':True,'rebuildPerformedAfterDrift':False,'prelaunchStoppedGuardWasBrowserAttempt':False,'finalModuleInvocation':module,'finalHostInvocation':host,'axeScans':2,'accessibilityScans':scans,'representativeScreenshots':captures,'participantCaseWorkByteEquivalentAfterGuideUse':True,'worksheetSchemaPreserved':True,'full38ScenarioMatrixRun':False,'freshPrintAudit':False,'uncommitted':True}
readme='''# Federal/Maine guide browser validation — October 4, 2026

**PASS: three distinct targeted scenarios** on the frozen activity: one new keyboard/link/participant-work workflow, the retained 52-score/state-survival scenario, and the unchanged actual-app public-entry/educator-gate scenario. Each invocation used the original synchronous stylesheet setup, a 120-second per-test limit, one worker, and zero automatic retries. The existing 37-scenario specification is a byte-exact prefix; one scenario was appended. The full 38-scenario matrix was not rerun.

The new scenario opens and closes the Case and Reasoning disclosures with native keyboard controls, checks all three informational headings and all six official link targets/new-tab protections, verifies horizontal containment at 320×740 and 844×390 dark and 1366×900 light, and confirms exact literal finding/Q8/Q9/summary work survives reading the guide, reloading between layout captures, a case switch, and export. The guide has no participant fields. Before/after exports preserve the complete caseWork and reviewed records and worksheet schema. Two actual active-panel axe scans recorded **zero violations**; these are scoped automated checks.

The actual-host runs used the immutable tested snapshot **5cff82b2** and bundle **69c86008**, serving frozen activity **fec6407e**. A prelaunch whole-current-host guard stopped before any browser invocation after unrelated shared-host drift to **90a8fd75**. That stopped guard is retained in the first host directory and is not counted as a test attempt. The replacement guards checked exact immutable served bytes and the specific borrowed route-reader region against the tested snapshot. Current whole-host hashes, including **d6e6bcf5** before recovery, remain separate observations; no rebuild followed the drift.

The first actual-host invocation **timed out** at the unchanged 120-second cumulative limit during the final ungated page close. Its trace records all 17 expectations completed without error. That invocation remains a failure with raw JSON, screenshots, videos, trace and [diagnosis](host-timeout-analysis.json) retained. Exactly one justified recovery reran the original test body and setup with the same limit, one worker and zero automatic retries. The final passing host invocation is `host-only-02`; the three distinct targeted scenarios are final coverage, not a claim that all passed on their first attempt.

See [validation summary](validation-summary.json), [module result](module-focused-01/result.json), [module raw archive proof](module-focused-01/archive-proof.json), [final actual-host result](host-only-02/result.json), [final host raw archive proof](host-only-02/archive-proof.json), [initial host timeout](host-only-01/result.json), [initial host raw archive proof](host-only-01/archive-proof.json), and [bounded recovery prelaunch guard](host-only-02/prelaunch-guard.json).

Actual expanded screenshots:

- [Case, 320×740 dark](module-focused-01/browser/jurisdiction-case-320x740-dark.png)
- [Case, 844×390 dark](module-focused-01/browser/jurisdiction-case-844x390-dark.png)
- [Case, 1366×900 light](module-focused-01/browser/jurisdiction-case-1366-light.png)
- [Reasoning, 1366×900 light](module-focused-01/browser/jurisdiction-reasoning-1366-light.png)

Actual accessibility records: [Case, 320 dark](module-focused-01/browser/axe-jurisdiction-case-320-dark.json) and [Reasoning, 1366 light](module-focused-01/browser/axe-jurisdiction-reasoning-1366-light.json). The separate source/legal review establishes the content jurisdiction distinction; this browser evidence verifies behavior and links. Print was not re-audited in this interface pass. No Git mutation, commit, push, deployment, or full app build was performed by validation.
'''
summary.pop('participantCaseWorkByteEquivalentAfterGuideUse')
summary.update({'participantCaseWorkExactlyPreservedAfterGuideUse':True,'actualHostInvocations':2,'explicitHostRecoveryInvocations':1,'firstAttemptAllTargetsPassed':False,'hostInvocationHistory':[first_host,host],'initialHostTimeoutAnalysisFile':str((REPORT/'host-timeout-analysis.json').relative_to(ROOT)).replace('\\','/'),'initialHostTimeoutAnalysisSha256':sha((REPORT/'host-timeout-analysis.json').read_bytes())})
for parent in (LOCAL,REPORT):
    assert not (parent/'validation-summary.json').exists()
    (parent/'validation-summary.json').write_text(json.dumps(summary,indent=2))
    (parent/'README.md').write_text(readme)
    (parent/'summary-helper.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps({'status':summary['status'],'passed':3,'moduleScenariosPassed':2,'hostScenarioPassed':1,'axeScans':2,'moduleResultSha256':module['resultSha256'],'hostResultSha256':host['resultSha256'],'browserTestSha256':summary['browserTestSha256'],'summarySha256':sha((REPORT/'validation-summary.json').read_bytes()),'representativeScreenshots':captures},indent=2))
