'use strict';
const PDF_UA_UNAVAILABLE_REASONS = ['validator_not_available', 'validator_timeout', 'validator_error', 'attempt_finalization_reserve', 'validator_evidence_unbound'];
const PDF_UA_NOT_RUN_REASONS = ['disabled_for_institution_pilot', 'independent_validator_not_packaged'];
// The reason travels on the error (detail) so the driver can report it instead of swallowing it.
function invalidPdfEvidence(detail) {
  const error = new Error('Incomplete or contradictory PDF/UA validation evidence' + (detail ? ': ' + detail : '') + '.');
  error.detail = detail || null;
  throw error;
}
// veraPDF counts every check it runs, and long documents legitimately pass a million (the IRS 1040
// instructions: 2,164,395 passed checks). A former 1,000,000 ceiling here threw those complete
// reports away. Any non-negative safe integer is a real count.
function pdfCount(value, key) {
  if (!Number.isSafeInteger(value) || value < 0) invalidPdfEvidence((key || 'a count') + ' is missing or is not a whole number');
  return value;
}
// veraPDF ends a job early on a timeout or a cancel (for example a failure limit). Its counts then
// cover only part of the PDF: say so, with the count, and never let it read as a pass.
function partialPdfEvidence(validation) {
  const details = validation.details || {};
  const n = key => (Number.isSafeInteger(details[key]) && details[key] >= 0 ? details[key] : null);
  const passed = n('passedChecks'), failed = n('failedChecks');
  const status = String(validation.jobEndStatus).slice(0, 40);
  const counted = passed !== null && failed !== null;
  const fmt = v => v.toLocaleString('en-US');
  const error = new Error('veraPDF stopped before it finished checking this PDF (job end status: ' + status + '). '
    + (counted
      ? 'The PDF was only partly checked: ' + fmt(passed + failed) + ' checks ran (' + fmt(passed) + ' passed, ' + fmt(failed) + ' failed) before veraPDF stopped'
      : 'The PDF was only partly checked, and veraPDF did not report how many checks ran')
    + ', so no PDF/UA-1 result is given for it.');
  error.code = 'ALLOFLOW_VERAPDF_PARTIAL';
  error.jobEndStatus = status;
  error.checkedChecks = counted ? passed + failed : null;
  error.passedChecks = passed;
  error.failedChecks = failed;
  throw error;
}
function pdfCounts(value, compliant) {
  const counts = Object.fromEntries(['failedRules', 'failedChecks', 'passedRules', 'passedChecks'].map(key => [key, pdfCount(value[key], key)]));
  if (counts.failedRules + counts.passedRules === 0 || counts.failedChecks + counts.passedChecks === 0
    || (counts.failedRules === 0) !== (counts.failedChecks === 0)
    || compliant !== (counts.failedRules === 0 && counts.failedChecks === 0)) invalidPdfEvidence('the rule and check counts contradict each other or the compliance flag');
  return counts;
}
// The CLI is invoked on exactly one immutable PDF with --flavour ua1. Missing
// counts, extra jobs, and unsuccessful exits cannot constitute passing evidence.
// veraPDF 1.30.2 exits 1 for a completed noncompliant report; retain that failure.
function parsePdfUaCliReport(parsed, exitCode) {
  const report = parsed && parsed.report;
  const jobs = report && report.jobs;
  const validations = Array.isArray(jobs) && jobs.length === 1 && jobs[0].validationResult;
  const validation = Array.isArray(validations) && validations.length === 1 && validations[0];
  if (validation && typeof validation === 'object' && validation.jobEndStatus !== undefined && validation.jobEndStatus !== 'normal') partialPdfEvidence(validation);
  if (!validation || typeof validation.compliant !== 'boolean' || !validation.details)
    invalidPdfEvidence('the report does not hold exactly one validation result with a compliance flag and details');
  if (exitCode !== 0 && !(exitCode === 1 && validation.compliant === false))
    invalidPdfEvidence('veraPDF exited with code ' + exitCode + ', which does not match its report');
  if (validation.profileName !== undefined && validation.profileName !== 'PDF/UA-1 validation profile')
    invalidPdfEvidence('the report used a profile other than PDF/UA-1');
  const counts = pdfCounts(validation.details, validation.compliant);
  const summaries = validation.details.ruleSummaries;
  if (summaries !== undefined && !Array.isArray(summaries)) invalidPdfEvidence('the rule summaries are malformed');
  if (validation.compliant && (summaries || []).some(rule => rule && rule.ruleStatus === 'FAILED')) invalidPdfEvidence('a passing report lists a failed rule');
  return { report, validation, counts };
}
// Shared by the remote producer and public sanitizer. Every executed result is
// bound to emitted bytes; unavailable/not-run outcomes remain explicit.
function normalizePdfUaValidation(value, artifact, options) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidPdfEvidence();
  if (value.status === 'not_run' && PDF_UA_NOT_RUN_REASONS.includes(value.reason)) return { status: value.status, reason: value.reason };
  if (value.status === 'unavailable' && PDF_UA_UNAVAILABLE_REASONS.includes(value.reason)) return { status: value.status, reason: value.reason };
  if (!['compliant', 'noncompliant'].includes(value.status) || value.validator !== 'veraPDF' || value.profile !== 'ua1') invalidPdfEvidence();
  const counts = pdfCounts(value, value.status === 'compliant');
  // Old public reports omitted all validator identity/time fields. Keep those
  // reports readable, but never reconstruct a passing binding from the artifact.
  if (options?.allowLegacyUnbound === true
    && ['inputSha256', 'inputBytes', 'validatedAt', 'validationDurationMs'].every(key => value[key] === undefined)) {
    return { status: 'unavailable', reason: 'validator_evidence_unbound' };
  }
  if (!artifact || !/^[a-f0-9]{64}$/i.test(value.inputSha256 || '')
    || String(value.inputSha256).toLowerCase() !== String(artifact.sha256).toLowerCase()
    || !Number.isSafeInteger(value.inputBytes) || value.inputBytes < 5 || value.inputBytes !== artifact.size
    || (value.validatorVersion !== null && (typeof value.validatorVersion !== 'string' || value.validatorVersion.length > 32))
    || typeof value.validatedAt !== 'string' || !Number.isFinite(Date.parse(value.validatedAt))
    || !Number.isSafeInteger(value.validationDurationMs) || value.validationDurationMs < 0) invalidPdfEvidence();
  return { status: value.status, validator: 'veraPDF', profile: 'ua1', validatorVersion: value.validatorVersion,
    ...counts, inputSha256: value.inputSha256.toLowerCase(), inputBytes: value.inputBytes,
    validatedAt: new Date(value.validatedAt).toISOString(), validationDurationMs: value.validationDurationMs };
}
function pdfDeliveryState(input) {
  const pdfReview = input.hasPdf && input.pdfStatus !== 'passed';
  const verificationState = pdfReview ? 'review-required' : input.verificationState;
  const reviewRequired = !!pdfReview || !input.level || input.level === 'review'
    || !['complete', 'complete-for-tested-scope'].includes(verificationState)
    || (input.hasPdf && input.taggedPdfVerified !== true);
  return { verificationState, reviewRequired, distributionLevel: reviewRequired ? 'review' : input.level,
    taggedPdfDelivery: input.hasPdf && !pdfReview && input.taggedPdfVerified === true ? 'verified' : 'review-required',
    deliveryStatus: reviewRequired ? 'review-required' : 'complete-for-tested-scope' };
}
// Independent PDF evidence must govern the final artifact status, never upgrade HTML evidence.
function pdfUaEvidence(raw, options) {
  const o=options||{}, base={standard:'PDF/UA-1 (ISO 14289-1)',profile:'ua1',scope:'machine-verifiable PDF/UA checks'};
  if(!o.hasPdf)return {...base,status:'not-applicable',reason:'No tagged PDF was produced.'};
  if(!o.requested)return {...base,status:'not-run',reason:'Independent PDF validation was not requested.'};
  if(!raw||raw.error)return {...base,status:'unavailable',error:String(raw?.error||'Validator returned no evidence.').slice(0,1000)};
  const bound=raw.inputSha256===o.sha256&&raw.inputBytes===o.bytes&&raw.profile==='ua1'&&/^veraPDF(?: CLI)?$/.test(raw.validator||'');
  const counts=['failedChecks','failedRuleCount'];
  if(!bound||typeof raw.compliant!=='boolean'||counts.some(k=>!Number.isSafeInteger(raw[k])||raw[k]<0))
    return {...base,status:'unavailable',reason:bound?'Incomplete validator result.':'Validator evidence does not match the emitted PDF bytes and profile.'};
  const passed=raw.compliant===true&&raw.failedChecks===0&&raw.failedRuleCount===0;
  return {...base,status:passed?'passed':'failed',compliant:passed,validator:raw.validator,validatorVersion:raw.validatorVersion||null,
    inputSha256:raw.inputSha256,inputBytes:raw.inputBytes,validatedAt:raw.validatedAt||null,validationDurationMs:raw.validationDurationMs??null,
    failedChecks:raw.failedChecks,failedRuleCount:raw.failedRuleCount,failedRules:Array.isArray(raw.failedRules)?raw.failedRules.slice(0,100):[]};
}
function applyPdfDeliveryEvidence(summary,evidence) {
  summary.pdfUa=evidence;
  summary.htmlVerificationState=summary.verificationState;
  summary.verificationChecks={...(summary.verificationChecks||{}),pdfUa:evidence};
  const needsReview=Boolean(summary.files?.taggedPdf)&&evidence.status!=='passed';
  summary.deliveryReviewReasons=needsReview?['pdf-ua-'+evidence.status]:[];
  if(needsReview){
    summary.verdict={level:'review',reviewCount:(summary.verdict?.reviewCount||0)+1,cautionCount:summary.verdict?.cautionCount||0};
    summary.verificationState='review-required';
    summary.taggedPdfDelivery={ok:false,code:evidence.status==='failed'?'validator-failed':evidence.status==='not-run'?'validator-not-requested':evidence.error?'validator-error':'validator-unavailable'};
  }
  const delivery=pdfDeliveryState({hasPdf:Boolean(summary.files?.taggedPdf),pdfStatus:evidence.status,
    verificationState:summary.verificationState,level:summary.verdict?.level,taggedPdfVerified:summary.taggedPdfDelivery?.ok===true});
  summary.reviewRequired=delivery.reviewRequired;
  summary.deliveryStatus=delivery.deliveryStatus;
  return summary;
}
// Plain-language meaning + next step for every withhold/review code, so staff never have to
// decode `taggedPdfError` or `taggedPdfDelivery.code` themselves. Wording only: never changes a verdict.
const WITHHOLD_EXPLANATIONS={
  page_range_tagged_pdf_unsupported:['This run made an accessible version of some pages only. A tagged PDF has to cover the whole document, so none was made.','Share the accessible HTML for these pages, or run the whole document to get a tagged PDF.'],
  active_content_scan_unavailable:['The original PDF has parts AlloFlow cannot safely inspect (for example an XFA fillable form, embedded files or an unusually deep structure), so no tagged PDF was made.','Share the accessible HTML, or have a person rebuild the PDF from it in Word or Acrobat.'],
  active_content_requires_review:['The original PDF contains scripts, launch actions or embedded files, so no tagged PDF was made. In a fillable form these are often just date or phone-number formatting.','Share the accessible HTML. If a fillable PDF is needed, ask whoever made the form for a version without scripts, or have someone review them first.'],
  content_coverage_requires_review:['The accessible version may be missing words from the original, so the tagged PDF was held back.','Search the original for the words listed below and check that each one is in the accessible version. Often they are page numbers, chart axis labels, a title printed twice, a raised "nd" or "th", or a word the PDF split in two. Running again gives the same result; share once a person confirms nothing is lost.'],
  distribution_review_required:['The accessible HTML still has findings a person must check, so the tagged PDF was held back.','Work through the review findings in this report, then run again.'],
  distribution_verdict_unavailable:['AlloFlow could not reach a final verdict for this document, so the tagged PDF was held back.','Run the document again. If it repeats, keep this report for support.'],
  tagged_pdf_delivery_unverified:['A tagged PDF was built but failed AlloFlow\'s own structure check after saving.','Use the accessible HTML. Run again once; if it repeats, keep this report for support.'],
  'createTaggedPdf returned no bytes':['The tagged PDF could not be built.','Use the accessible HTML, or run the document again.'],
  'validator-failed':['The independent veraPDF check found PDF/UA problems in the tagged PDF (see pdfUa.failedRules).','Use the accessible HTML, or fix the listed problems in Acrobat before sharing the PDF.'],
  'validator-error':['The independent veraPDF check could not run.','Install Java 11 or newer (Eclipse Temurin 21 is free) and run again, or check the file yourself with veraPDF or PAC.'],
  'validator-not-requested':['The independent veraPDF check was turned off for this run (validate_ua: false).','Run again without validate_ua: false, or check the file yourself with veraPDF or PAC.'],
  'validator-unavailable':['The independent veraPDF check gave no usable result for this file.','Run again. If it repeats, check the file yourself with veraPDF or PAC.'],
  'roundtrip-failed':['Reading the saved tagged PDF back did not match the accessible version.','Use the accessible HTML. Run again once; if it repeats, keep this report for support.'],
  'roundtrip-unavailable':['The saved tagged PDF could not be read back to confirm it.','Use the accessible HTML, or run the document again.'],
  'typeset-content-dropped':['Some content did not make it into the tagged PDF.','Use the accessible HTML, which keeps all of the content.'],
  'ocr-text-layer-incomplete':['Part of this scan\'s hidden text layer could not be written, so a screen reader would read the PDF wrongly. This happens with scripts the offline text recognition or font does not cover, such as Arabic, Urdu, Persian or Hebrew.','Share the accessible HTML, which has the full text. Running again will not change this.'],
  'delivery-verdict-unavailable':['AlloFlow could not reach a final verdict for the tagged PDF.','Run the document again. If it repeats, keep this report for support.'],
};
// (2026-10-28) Decision guides arrive from the page (untrusted): keep only the known shape, bounded.
function normalizeDecisionGuides(value){
  const str=(v,n)=>typeof v==='string'?v.slice(0,n):'';
  if(!Array.isArray(value))return [];
  return value.slice(0,20).filter(g=>g&&typeof g==='object'&&/^[a-z][a-z-]{1,40}$/.test(g.id)).map(g=>({
    id:g.id,title:str(g.title,120),question:str(g.question,300),checkerCannot:str(g.checkerCannot,600),
    wcag:(Array.isArray(g.wcag)?g.wcag:[]).filter(w=>typeof w==='string'&&/^\d\.\d{1,2}\.\d{1,2}$/.test(w)).slice(0,4),
    // W3C Understanding page per criterion; any other URL is dropped. wcagNote: why a check is not a WCAG rule.
    wcagRefs:(Array.isArray(g.wcagRefs)?g.wcagRefs:[]).slice(0,4).filter(r=>r&&/^\d\.\d{1,2}\.\d{1,2}$/.test(r.sc)&&/^https:\/\/www\.w3\.org\/WAI\/WCAG2[12]\/Understanding\/[a-z-]{3,60}\.html$/.test(r.url)&&/^(A|AA|AAA)$/.test(r.level)).map(r=>({sc:r.sc,name:str(r.name,80),level:r.level,url:r.url})),
    wcagNote:str(g.wcagNote,300),
    options:(Array.isArray(g.options)?g.options:[]).slice(0,5).filter(o=>o&&/^[a-z][a-z-]{0,20}$/.test(o.id)).map(o=>({id:o.id,settles:o.settles===true,label:str(o.label,80),choose:str(o.choose,400),then:str(o.then,400)})),
    lesson:{steps:(g.lesson&&Array.isArray(g.lesson.steps)?g.lesson.steps:[]).slice(0,6).map(s=>str(s,300)).filter(Boolean),fine:str(g.lesson&&g.lesson.fine,300),fix:str(g.lesson&&g.lesson.fix,300)},
    findings:(Array.isArray(g.findings)?g.findings:[]).filter(f=>typeof f==='string'&&/^[a-zA-Z]+:[\w-]{1,60}$/.test(f)).slice(0,12),
    // (2026-10-28, phase 3) where each flagged value, word or phrase sits in the original: page + words around it
    evidence:(Array.isArray(g.evidence)?g.evidence:[]).slice(0,8).filter(e=>e&&typeof e.label==='string'&&e.label.trim()).map(e=>({label:str(e.label,80),
      where:(Array.isArray(e.where)?e.where:[]).slice(0,2).filter(w=>w&&Number.isSafeInteger(w.page)&&w.page>0).map(w=>({page:w.page,before:str(w.before,200),match:str(w.match,100),after:str(w.after,200)}))}))}));
}
function explainDelivery(summary){
  const s=summary||{},items=[];
  // "tagged_pdf_delivery_unverified (ocr-text-layer-incomplete: …)" names its real cause in parentheses;
  // explain that cause, not the generic wrapper (Hebrew UDHR: "run again" for a deterministic gap).
  const add=(code,detail)=>{const inner=/^tagged_pdf_delivery_unverified \(([a-z-]+)(?::\s*([^)]*))?/.exec(String(code));
    const k=(inner&&WITHHOLD_EXPLANATIONS[inner[1]]?inner[1]:null)||Object.keys(WITHHOLD_EXPLANATIONS).find(c=>code===c||String(code).startsWith(c+' '));
    let e=WITHHOLD_EXPLANATIONS[k];
    // Inside the wrapper, validator-failed is AlloFlow's own byte check, not veraPDF; it names the
    // failed rule (English UDHR: "All page fonts embedded" was explained as veraPDF + pdfUa.failedRules).
    if(inner&&inner[1]==='validator-failed'){if(!detail&&inner[2])detail=inner[2].trim();
      e=/fonts? embedded/i.test(String(inner[2]))
        ?['The original PDF uses fonts that are not stored inside the file, so AlloFlow could not make a tagged PDF that displays correctly everywhere.','Share the accessible HTML. If you need a PDF, save the original again with its fonts embedded (for example from Word with the PDF/A option on) and run it again.']
        :/orphaned semantic leaves/i.test(String(inner[2]))
        // Spanish UDHR: "No orphaned semantic leaves" reached teachers verbatim, with "run again" for a deterministic result.
        ?['Some parts of the accessible version could not be matched to the text on the PDF\'s pages, so a screen reader would skip them in the tagged PDF. It was held back.','Share the accessible HTML, which has everything. Running again gives the same result; keep this report for support.']
        :['The tagged PDF was built but failed AlloFlow\'s own PDF check (named below), so it was held back.','Use the accessible HTML. Run again once; if it repeats, keep this report for support.'];
      // The rule name stays in `code`; the detail says it plainly (osep2: "No orphaned semantic leaves" read as jargon).
      if(/orphaned semantic leaves/i.test(String(inner[2])))detail='AlloFlow\'s own PDF check: some text in the accessible version is not linked to text on the PDF\'s pages.';}
    // validator-error has several causes; only a Java failure should send a teacher to install Java.
    if(k==='validator-error'&&detail&&!/java/i.test(String(detail)))e=/runtime_build_changed|restart/i.test(String(detail))
      ?['The independent veraPDF check was skipped because AlloFlow was updated while this document was running.','Restart the AlloFlow connector (or the app that hosts it) and run the document again.']
      :['The independent veraPDF check could not run.','Run the document again. If it repeats, check the file yourself with veraPDF or PAC.'];items.push({code:String(code).slice(0,200),meaning:e?e[0]:'The tagged PDF was not delivered.',nextStep:e?e[1]:'Use the accessible HTML, and keep this report for support.',...(detail?{detail:String(detail).length>600?String(detail).slice(0,600).replace(/\s+\S*$/,'')+'…':String(detail)}:{})});};
  // The unmatched words themselves (assessSourceCoverage missingWords), not token offsets nobody can map to a page.
  const missingWords=(s.contentCoverage&&Array.isArray(s.contentCoverage.missingWords))?s.contentCoverage.missingWords.filter(w=>w&&typeof w.word==='string').slice(0,25):[];
  const wordList=missingWords.length?'Words not found in the accessible version: '+missingWords.map(w=>'"'+w.word.slice(0,60)+'"'+(w.count>1?' (x'+w.count+')':'')).join(', '):'';
  if(s.taggedPdfError)add(s.taggedPdfError,s.taggedPdfError==='content_coverage_requires_review'&&wordList?wordList:undefined);
  else if(s.taggedPdfDelivery&&s.taggedPdfDelivery.ok===false)add(s.taggedPdfDelivery.code,s.pdfUa&&s.pdfUa.error);
  const ready=s.deliveryStatus==='complete-for-tested-scope';
  // The verdict's own sentences say WHICH things to check; a count alone sent teachers hunting.
  const reasons=s.verdictReasons&&typeof s.verdictReasons==='object'?s.verdictReasons:{};
  // The verdict's engine-status sentence is pinned by the tagged-PDF release gate, so it is translated
  // here, where teachers read it, rather than reworded at the source.
  const plain=x=>/^WCAG verification is [a-z-]+; review the engine coverage/.test(x)
    ?'The automated accessibility checkers left items that a person needs to look at (see the review findings in this report).':x;
  const list=v=>Array.isArray(v)?v.filter(x=>typeof x==='string'&&x.trim()).slice(0,10).map(plain):[];
  // Name the checker items themselves (the report already carries them) instead of pointing at "the
  // review findings": a teacher was sent looking with nothing named (board policy run, 2026-10-25).
  const eaReview=(s.verification&&s.verification.equalAccess&&Array.isArray(s.verification.equalAccess.reviewFindings))?s.verification.equalAccess.reviewFindings:[];
  // (2026-10-25, Aaron) A checker "potential" item the AI review judged not-an-issue is a QUICK CHECK:
  // still a person's call, shown with the AI's reasoning, not listed as a problem.
  const dispositions=(s.reviewTriage&&Array.isArray(s.reviewTriage.dispositions))?s.reviewTriage.dispositions:[];
  const aiSaysFine=id=>dispositions.find(d=>d&&d.action==='not-an-issue'&&typeof d.key==='string'&&d.key.split('|').pop()===id);
  // (2026-10-26) The common reminders in plain words, keeping the text the checker quoted; others keep the
  // checker's own sentence. A finding on several elements says so.
  const PLAIN={
    style_color_misuse:()=>'Check that colour is not the only way information is shown.',
    text_block_heading:q=>'Check whether '+(q?'"'+q+'"':'this text')+' is a heading; if it is, it should be marked as one.',
    // (2026-10-27) "should point to a place in reading order" misled when the word was "right" as in a legal right (osep2).
    // n>1: the checker flagged different words in different places (osep3: "right", "small", "below", "above").
    text_sensory_misuse:(q,n)=>'Check that '+(q?(n>1?'words such as "'+q+'"':'"'+q+'"'):'the wording')+(q&&n>1?' do':' does')+' not point at something only by where it sits on the page or how it looks.',
    text_quoted_correctly:q=>'Check whether '+(q?'"'+q.trim()+'"':'this text')+' is a quotation; if it is, it should be marked as one.',
    media_alt_brief:()=>'Check the image descriptions longer than 150 characters: each should still read well, with long detail in the visible text if needed.',
    download_keyboard_controllable:()=>'Check that the download links can be reached and used with the keyboard alone.',
    // (2026-10-27) complaint2 showed the checker's "Verify this is a list and if so, modify to use proper HTML elements".
    list_markup_review:(q,n)=>'Check whether '+(n>1?'these items are':'this is')+' really a list; if '+(n>1?'they are':'it is')+', it should be marked as a list.'};
  const describe=f=>{const q=(f.description.match(/'([^']{1,80})'/)||[])[1];const base=PLAIN[f.id]?PLAIN[f.id](q,Number(f.nodes)):f.description.trim().slice(0,240);return base+(Number(f.nodes)>1?' ('+Number(f.nodes)+' places)':'');};
  const withDesc=eaReview.filter(f=>f&&typeof f.description==='string'&&f.description.trim()).slice(0,8);
  const clip=(t,n)=>{t=String(t).trim();return t.length>n?t.slice(0,n).replace(/\s+\S*$/,'')+'…':t;};
  const quickChecks=withDesc.filter(f=>aiSaysFine(f.id)).map(f=>{const d=aiSaysFine(f.id);return describe(f)+(d.reason?' (AI review found no problem: '+clip(d.reason,600)+')':'');});
  // A reminder the AI review settled has left the checker's counts but is still a person's quick check.
  const acked=(s.verification&&s.verification.equalAccess&&Array.isArray(s.verification.equalAccess.acknowledgedByAiReview))?s.verification.equalAccess.acknowledgedByAiReview:[];
  for(const f of acked.slice(0,5))if(f&&typeof f.description==='string'&&f.description.trim())quickChecks.push(describe(f)+(f.reason?' (AI review found no problem: '+clip(f.reason,600)+')':''));
  const named=withDesc.filter(f=>!aiSaysFine(f.id)).slice(0,5).map(f=>(PLAIN[f.id]?'':'A checker asks a person to confirm: ')+describe(f));
  let needs=list(reasons.review);
  const generic=needs.findIndex(x=>/^The automated accessibility checkers left items/.test(x));
  if(generic>=0&&(named.length||quickChecks.length))needs=needs.slice(0,generic).concat(named,needs.slice(generic+1));
  else if(named.length)needs=needs.concat(named);
  // (2026-10-27) One cause, one line: budget2 listed "content fidelity needs a human check", "numbers may have
  // changed..." and "Source content coverage requires review" for the same missing chart axis labels.
  const covRe=[/^content fidelity needs a human check/i,/^numbers may have changed between source and output/i,/^Source content coverage requires review$/i];
  const isCov=x=>covRe.some(r=>r.test(x));
  if(needs.filter(isCov).length>=2){const at=needs.findIndex(isCov);needs=needs.filter(x=>!isCov(x));
    // (2026-10-28, SP 800-63 slice) "listed below" only when the coverage item below carries the list; another
    // withhold reason (a page range) has none, so the words go here.
    const listedBelow=!!wordList&&s.taggedPdfError==='content_coverage_requires_review';
    needs.splice(at,0,'Some words or numbers from the original are not in the accessible version'+(listedBelow?' (listed with the tagged-PDF item below)':'')+'. Check them against the original before sharing: they are often chart axis labels, page numbers or a title printed twice, but a changed score, date or percentage must be fixed.'+(wordList&&!listedBelow?' '+wordList+'.':''));}
  // (2026-10-28) decisions: how to decide each judgment call above (remediation_decision_guides.js via the run)
  return {needsAPerson:needs.slice(0,12),quickChecks,decisions:normalizeDecisionGuides(s.decisionGuides),worthAGlance:list(reasons.cautions),headline:ready?'Automated checks passed for everything they can test. A person should still read it once before sharing.'
      // One instruction, not two: each item's own next step says what to do (Urdu UDHR: "check it" vs "share it").
      // (2026-10-28, NASA slice) the headline named the PDF reason only, while the review came from a finding below
      :items.length?'No tagged PDF was made for this file. The reason and what to do instead are below.'+(needs.length?' Separately, '+needs.length+(needs.length===1?' finding needs':' findings need')+' a person before sharing.':'')
      :(!needs.length&&quickChecks.length)?'Automated checks finished. Only quick checks are left: a person should glance at them before sharing.'
      :'Automated checks finished, but some findings need a person to look before sharing.',items};
}
// Self-contained so the browser uses exactly the same per-engine report contract.
function auditChecks(input) {
  const o=input||{}, count=v=>Number.isSafeInteger(v)&&v>=0?v:null;
  const state=(value,failures,review,partial)=>!value||!Number.isFinite(value.score)?'unavailable':failures>0?'failed':partial||failures===null||review===null?'partial':review>0?'review-required':'passed';
  const ai=o.ai,axe=o.axe,ea=o.equalAccess;
  // Compact evidence (compactVerificationEvidence) carries the full counts beside a capped issue
  // list; prefer the counts so a long list is not undercounted. Raw audits have no counts.
  const aiFailures=count(ai?.issueCount)??(Array.isArray(ai?.issues)?ai.issues.length:null);
  const aiReview=count(ai?.reviewIssueCount)??(Array.isArray(ai?.issues)?ai.issues.filter(i=>i?.requiresManualReview).length:null);
  const axeFailures=count(axe?.totalViolations),axeReview=count(axe?.totalIncomplete);
  const eaFailures=count(ea?.failViolations),potential=count(ea?.potentialViolations),manual=count(ea?.manualViolations);
  const eaReview=count(ea?.reviewFindingCount)??(potential!==null&&manual!==null?potential+manual:null);
  return {ai:{status:o.includeAi===false?'not-run':state(ai,aiFailures,aiReview,ai?._partialAudit||ai?.partial||ai?._scoreDegraded||ai?.scoreDegraded||ai?.synthesized),findings:aiFailures,reviewFindings:aiReview},
    axe:{status:state(axe,axeFailures,axeReview),findings:axeFailures,reviewFindings:axeReview},
    equalAccess:{status:state(ea,eaFailures,eaReview),findings:eaFailures,reviewFindings:eaReview}};
}
// Rejection telemetry never carries candidate/source text. The same contract is
// used for checkpoint storage, browser publication, and public tool output.
const CANDIDATE_REJECTION_SCHEMA = {
  candidateRejectionCount: { type: 'integer', minimum: 0, maximum: 1000000 },
  candidateRejections: { type: 'array', maxItems: 100, items: {
    type: 'object', additionalProperties: false, required: ['chunkId', 'phase', 'reason'],
    properties: {
      sourceLocation: { type: 'string', maxLength: 100, pattern: "^(?:document|(?:table|row|cell|link|figure|control|math):[1-9][0-9]{0,7}(?:/(?:row|cell):[1-9][0-9]{0,7}){0,2})$" },
      pass: { type: 'integer', minimum: 1, maximum: 1000000 },
      chunkId: { type: 'string', maxLength: 32, pattern: '^(?:all|[0-9]{1,8}(?:\\.[0-9]{1,8})?)$' },
      phase: { type: 'string', enum: ['single', 'chunk', 'image-retry', 'half', 'half-assembly', 'assembly'] },
      reason: { type: 'string', enum: ['empty-output', 'no-original', 'size-shrink', 'size-growth-unexpected',
        'text-shrink', 'text-growth-unexpected', 'no-doc-markers', 'image-reference-changed',
        'image-reference-uncheckable', 'table-cell-transposition', 'invalid-json-wrapper', "table-content-changed", "source-value-changed", "link-destination-changed", "image-association-changed", "source-reading-order-changed", "source-content-added", "source-contract-uncheckable", "source-visibility-changed", "table-semantics-changed", "form-state-changed", "math-content-changed", 'content-not-preserved'] },
    },
  } },
};
// Serializable for browser execution when the same schema is passed explicitly.
function normalizeCandidateRejectionEvidence(value, schema = CANDIDATE_REJECTION_SCHEMA) {
  const input = value && typeof value === 'object' ? value : {};
  const fields = schema.candidateRejections.items.properties;
  const chunkIdPattern = new RegExp(fields.chunkId.pattern);
  const records = [];
  if (Array.isArray(input.candidateRejections)) {
    for (const entry of input.candidateRejections.slice(0, schema.candidateRejections.maxItems)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)
        || typeof entry.chunkId !== 'string' || entry.chunkId.length > fields.chunkId.maxLength
        || !chunkIdPattern.test(entry.chunkId) || !fields.phase.enum.includes(entry.phase)
        || !fields.reason.enum.includes(entry.reason)) continue;
      const record = { chunkId: entry.chunkId, phase: entry.phase, reason: entry.reason };
      if (Number.isSafeInteger(entry.pass) && entry.pass >= fields.pass.minimum && entry.pass <= fields.pass.maximum) record.pass = entry.pass;
      if (typeof entry.sourceLocation === 'string' && fields.sourceLocation && entry.sourceLocation.length <= fields.sourceLocation.maxLength && new RegExp(fields.sourceLocation.pattern).test(entry.sourceLocation)) record.sourceLocation = entry.sourceLocation;
      records.push(record);
    }
  }
  const count = Number.isSafeInteger(input.candidateRejectionCount) && input.candidateRejectionCount >= 0
    ? Math.min(schema.candidateRejectionCount.maximum, input.candidateRejectionCount) : 0;
  return { candidateRejectionCount: Math.max(count, records.length), candidateRejections: records };
}
// Compact, bounded per-engine verification evidence for reports and calibration (2026-09-13).
// Accepts a pipeline result (verificationAudit / axeAudit / secondEngineAudit) or an already
// compact object (ai / axe / equalAccess) and is idempotent, so the driver can build it inside the
// page and the server can re-normalise what the page returned. Field names match auditChecks()
// and tests/fixtures/pdf_calibration/README.md. Self-contained on purpose: the driver stringifies
// it into Chromium, where nothing from this module's scope exists.
function compactVerificationEvidence(source) {
  const o = source && typeof source === 'object' ? source : null;
  if (!o) return null;
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const count = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : null);
  const str = (v, n) => (v == null ? null : String(v).slice(0, n));
  const list = (v, n) => (Array.isArray(v) ? v.slice(0, n).filter((x) => x && typeof x === 'object') : []);
  const ai = o.ai !== undefined ? o.ai : o.verificationAudit;
  const axe = o.axe !== undefined ? o.axe : o.axeAudit;
  const ea = o.equalAccess !== undefined ? o.equalAccess : o.secondEngineAudit;
  const out = { ai: null, axe: null, equalAccess: null };
  if (ai && typeof ai === 'object' && !Array.isArray(ai)) {
    const issues = Array.isArray(ai.issues) ? ai.issues : null;
    out.ai = {
      score: num(ai.score),
      issueCount: issues ? issues.length : count(ai.issueCount),
      reviewIssueCount: issues ? issues.filter((i) => i && i.requiresManualReview === true).length : count(ai.reviewIssueCount),
      passCount: Array.isArray(ai.passes) ? ai.passes.length : count(ai.passCount),
      chunksAudited: count(ai.chunksAudited),
      chunksRequested: count(ai.chunksRequested),
      partial: ai._partialAudit === true || ai.partial === true,
      scoreDegraded: ai._scoreDegraded === true || ai.scoreDegraded === true,
      issues: list(issues, 50).map((i) => ({
        ruleId: str(i.ruleId, 60), severity: str(i.severity, 20), wcag: str(i.wcag, 24),
        issue: str(i.issue != null ? i.issue : i.description, 300), location: str(i.location, 120),
        requiresManualReview: i.requiresManualReview === true,
      })),
    };
  }
  if (axe && typeof axe === 'object' && !Array.isArray(axe)) {
    let violations = [];
    if (Array.isArray(axe.violations)) violations = list(axe.violations, 50);
    else for (const sev of ['critical', 'serious', 'moderate', 'minor']) for (const v of list(axe[sev], 50)) violations.push(Object.assign({ impact: sev }, v));
    out.axe = {
      score: num(axe.score),
      totalViolations: count(axe.totalViolations),
      totalIncomplete: count(axe.totalIncomplete),
      violations: violations.slice(0, 50).map((v) => ({
        id: str(v.id, 80), impact: str(v.impact, 20),
        nodes: count(typeof v.nodes === 'number' ? v.nodes : (Array.isArray(v.nodes) ? v.nodes.length : null)),
        description: str(v.description != null ? v.description : v.help, 300), wcag: str(v.wcag, 80),
      })),
    };
  }
  if (ea && typeof ea === 'object' && !Array.isArray(ea)) {
    const rule = (f) => ({ id: str(f.id != null ? f.id : f.ruleId, 80), nodes: count(f.nodes), description: str(f.description != null ? f.description : f.message, 300) });
    const review = Array.isArray(ea.reviewFindings) ? ea.reviewFindings : [].concat(list(ea.potentialFindings, 50), list(ea.manualFindings, 50));
    out.equalAccess = {
      score: num(ea.score),
      failViolations: count(ea.failViolations),
      potentialViolations: count(ea.potentialViolations),
      manualViolations: count(ea.manualViolations),
      reviewFindingCount: count(ea.reviewFindingCount),
      fails: list(ea.fails, 50).map(rule),
      reviewFindings: list(review, 50).map(rule),
    };
    // Reminders this run's AI review settled (pipeline _alloApplyReminderTriage): out of the counts, still
    // reported; present only when there are some, so the evidence shape is unchanged otherwise.
    const acked = list(ea.acknowledgedByAiReview, 20).map((f) => Object.assign(rule(f), { reason: str(f.reason, 600) }));
    if (acked.length) out.equalAccess.acknowledgedByAiReview = acked;
  }
  if (!out.ai && !out.axe && !out.equalAccess) return null;
  return out;
}
module.exports={compactVerificationEvidence,pdfUaEvidence,applyPdfDeliveryEvidence,explainDelivery,normalizeDecisionGuides,auditChecks,parsePdfUaCliReport,normalizePdfUaValidation,pdfDeliveryState,normalizeCandidateRejectionEvidence,CANDIDATE_REJECTION_SCHEMA};
