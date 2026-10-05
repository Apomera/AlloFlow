from pathlib import Path
from datetime import datetime,timezone
import hashlib,json

ROOT=Path('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated')
REPORT=ROOT/'reports/maine-sld-state-requirements-workspace-2026-10-04'
sha=lambda data:hashlib.sha256(data).hexdigest()
frozen=json.loads((REPORT/'frozen-activity.json').read_text(encoding='utf-8'))
source_hashes={file:sha((ROOT/file).read_bytes()) for file in frozen['sourceHashes']}
assert source_hashes==frozen['sourceHashes']
module_files=('maine_sld_practice_module.js','desktop/web-app/public/maine_sld_practice_module.js','desktop/app-build/maine_sld_practice_module.js','desktop/web-app/build/maine_sld_practice_module.js')
modules={file:sha((ROOT/file).read_bytes()) for file in module_files}
assert set(modules.values())=={frozen['moduleSha256']}
ui=(ROOT/'maine_sld_state_workspace_source.jsx').read_text(encoding='utf-8')
core=(ROOT/'maine_sld_state_reference_core.js').read_text(encoding='utf-8')
main=(ROOT/'maine_sld_practice_source.jsx').read_text(encoding='utf-8')
before=(REPORT/'before/maine_sld_practice_source.jsx').read_text(encoding='utf-8')
case_core=(ROOT/'maine_sld_practice_core.js').read_text(encoding='utf-8')
preserved_css=main.split('function MaineSldPracticePanel(props)',1)[0]==before.split('function MaineSldPracticePanel(props)',1)[0]
def print_region(text):return text[text.index('  const print = () => {'):text.index('  const reflection =')]
checks={
 'frozenSourcesExact':True,
 'fourRuntimeMirrorsExact':True,
 'caseCorePreserved':source_hashes['maine_sld_practice_core.js']=='ef7dbb4373d9783dea76a891fcaebe085dafce7ef7a5a8339d060ae0d260c926',
 'caseDataPreserved':source_hashes['maine_sld_case_data.json']=='706f0932f427886c2972ec7633ddbfea31e8535e40cbccccbf5bf35530a56b2e',
 'existingMainStylesPreserved':preserved_css,
 'participantPrintRegionPreserved':print_region(main)==print_region(before),
 'referenceStorageFormatSeparate':"alloflow-sld-state-references" in core and "alloflow-maine-sld-state-references-v1" in core and "alloflow_sld_case_lab_session_v1" in case_core,
 'workspaceAlwaysMountedOnceAndHiddenOutsideCase':main.count('<MaineSldStateRequirements ')==1 and "visible={step === 'case'}" in main and '.msld-state[hidden]{display:none!important}' in ui,
 'onlyFixedPublicQueryPassedToSearch':"const query = MState.searchQuery(state);" in ui and 'provider.search(query, 10, query)' in ui,
 'explicitManualSourceSelectionAndSave':'Use source as draft' in ui and 'Save reference' in ui and 'MState.fromSearchResult(result)' in ui,
 'fullDocumentTextAndFingerprintRetained':'MState.fromDocument(result)' in ui and 'draft.content' in ui and 'draft.fileContentHash' in ui and 'fileContentHash' in core,
 'manualReviewRequiresTitleExcerptCheckedDate':"Review requires a source title, an exact excerpt and a date checked." in core,
 'nativeConfirmationsProtectReplacementRestoreAndRemoval':ui.count('window.confirm(')>=3,
 'lateResultGuardIncludesAliveTokenVisibilityOpenAndState':'aliveRef.current && operationRef.current === token && contextRef.current.visible && contextRef.current.open && contextRef.current.state === selectedState' in ui,
 'waitingBudget20SecondsWithoutAbortClaim':', 20000)' in ui and 'underlying document or search work may still finish' in ui,
 'deferredFocusGuardIncludesContextAndUserFocus':'contextRef.current.state !== selectedState' in ui and 'document.activeElement !== origin' in ui,
 'savedScrollingExcerptAndNotesKeyboardNamed':"aria-label={'Saved excerpt from ' + source.title}" in ui and "aria-label={'Transfer notes for ' + source.title}" in ui and ui.count('tabIndex={0}')>=3,
 'literalRenderingWithoutHTMLInjection':'dangerouslySetInnerHTML' not in ui,
 'safeExternalLinksHaveNewTabProtection':'MState.safeUrl(url)' in ui and 'target="_blank" rel="noopener noreferrer"' in ui,
 'fingerprintAndMetadataWrap':'.msld-state-meta>span{min-width:0;max-width:100%;overflow-wrap:anywhere}' in ui,
 'forcedColorFocusUsesSystemColors':'outline:3px solid Highlight' in ui and 'background:Field;color:FieldText' in ui,
 'markdownMatchesDocumentAdapterAccept':'.md,.markdown' in ui,
 'actualAppHeaderLandmarkCorrectionPresent':'<header className="msld-head" role="presentation">' in main
}
assert all(checks.values()),[key for key,value in checks.items() if not value]
captures=[]
for name in ('workspace-320-dark.png','workspace-320-forced.png','workspace-800-dark.png','workspace-800-forced.png'):
    path=REPORT/'browser-01'/name
    captures.append({'file':str(path.relative_to(ROOT)).replace('\\','/'),'sha256':sha(path.read_bytes()),'bytes':path.stat().st_size,'directlyViewedOriginalResolution':True,'visualFinding':'No blocking visual issue in the captured expanded summary/introduction region. Lower editor and fingerprint are outside these captures.'})
browser=json.loads((REPORT/'browser-01-results.json').read_text(encoding='utf-8'))
assert browser['stats']['expected']==6 and browser['stats']['unexpected']==0 and browser['stats']['flaky']==0
scans=[]
for name in ('layout-320.axe.json','layout-800.axe.json','lifecycle.axe.json'):
    path=REPORT/'browser-01'/name;value=json.loads(path.read_text(encoding='utf-8'));assert value==[]
    scans.append({'file':str(path.relative_to(ROOT)).replace('\\','/'),'sha256':sha(path.read_bytes()),'violations':0})
stage2=REPORT/'staged-build-02'
stage2_ui=stage2/'maine_sld_state_workspace_source.jsx'
stage2_core=stage2/'maine_sld_state_reference_core.js'
stage2_association={'stage':'staged-build-02','sameUiAsFinal':stage2_ui.is_file() and sha(stage2_ui.read_bytes())==source_hashes['maine_sld_state_workspace_source.jsx'],'sameReferenceCoreAsFinal':stage2_core.is_file() and sha(stage2_core.read_bytes())==source_hashes['maine_sld_state_reference_core.js'],'pixelEvidencePrecedesMainHeaderLandmarkCorrection':True,'associationBasis':'Archived component hashes and parent-provided run sequence; browser-01 is not claimed to render the complete final main/module.'}
result={'reviewedAt':datetime.now(timezone.utc).isoformat(),'status':'ACCEPTED_IN_REVIEWED_SCOPE','blockingFindings':[],'sourceHashes':source_hashes,'moduleFourCopyHashes':modules,'sourceChecks':checks,'sourceCheckCount':len(checks),'captures':captures,'captureAssociation':stage2_association,'observedPriorBrowserInvocation':{'file':'reports/maine-sld-state-requirements-workspace-2026-10-04/browser-01-results.json','sha256':sha((REPORT/'browser-01-results.json').read_bytes()),'stats':browser['stats'],'scope':'Six focused module scenarios before the later main-header landmark correction.'},'priorScopedAccessibilityScans':scans,'limits':['Four pixels show expanded summary/introduction and the first state control, not the lower editor/fingerprint.','The actual-app-01 invocation failed and is not treated as acceptance; root corrected the main-header landmark and is running final acceptance separately.','No test jobs, builds, live search, live AI, legal-rule determinations or product mutations were performed by this independent review.','This review confirms source isolation and observed layouts; it does not establish that any participant source is current law.']}
md='''# Independent final state-workspace review — October 4, 2026

**Accepted in the reviewed scope; no blocking findings.** Read-only inspection confirmed the final workspace component `8fe6a868`, reference Core `447983ea`, main source `243623bb` and all four runtime mirrors `664c72da`. The frozen hashes match. Existing case Core/data, main styles and the participant print region remain exact.

State references use a separate format/key and download/restore path. The mounted workspace is hidden outside the Case step. Search receives only the fixed selected-state public query; returned source links seed an unreviewed draft. Document text, provenance and manual excerpts remain distinct. Manual reviewed status requires title, excerpt and date checked, and metadata/excerpt/note edits clear it. Native confirmations protect replacement, removal and restore. Token/visibility/state/unmount guards reject late operation results; the 20-second wait message correctly avoids claiming that the underlying parser/network was aborted. Deferred focus additionally respects the user’s newer focus.

Directly viewed the four actual `browser-01` PNGs at original resolution: 320×900 dark and forced colors, and 800×400 dark and forced colors. The expanded summary, purpose text and captured state selector fit the viewport; focus borders and system-color presentation remain clear. The short landscape view retains a readable introduction above the fixed footer. **These screenshots do not show the lower editor or file fingerprint**, so no pixel acceptance of those areas is claimed. Source inspection confirms metadata wrapping and named keyboard-scrollable saved excerpt/note regions.

Read the prior six-scenario module result and three scoped axe JSON records: six passed, zero unexpected/flaky results, and zero violations in each scan. This is supporting component evidence before the later main-header landmark correction. The failed `actual-app-01` invocation is preserved and is not acceptance. The final source contains the header presentation-role correction; root’s final actual-app/module/retained runs are separate evidence.

See [review JSON with exact hashes and check list](independent-final-review.json). This review launched no tests, builds, search or AI and made no product or Git changes. It establishes source separation and the observed layouts, not the legal currency of a participant’s imported reference.
'''
for path in (REPORT/'independent-final-review.json',REPORT/'independent-final-review.md'):
    assert not path.exists(),str(path)+' already exists'
(REPORT/'independent-final-review.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
(REPORT/'independent-final-review.md').write_text(md,encoding='utf-8')
(REPORT/'independent-final-review-helper.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps({'status':result['status'],'blockingFindings':[],'sourceChecks':len(checks),'directlyViewedCaptures':4,'reviewJsonSha256':sha((REPORT/'independent-final-review.json').read_bytes()),'reviewMdSha256':sha((REPORT/'independent-final-review.md').read_bytes()),'stage2Association':stage2_association},indent=2))
