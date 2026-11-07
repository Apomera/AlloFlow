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
  scan_corrections_require_review:['Some words the scan misread were corrected from a second reading, and at least one involves a number, so the tagged PDF was held back.','Check each correction listed below against the original, numbers first: a wrong number must be fixed, not released. Running again gives the same result; share once a person confirms nothing is lost.'],
  // (2026-11-02) "then run again" looped: the held findings are deterministic, so a re-run holds the PDF again (trust run).
  distribution_review_required:['The accessible HTML still has findings a person must check, so the tagged PDF was held back.','Check the findings listed in this report. If they are fine as they are, share the accessible HTML; running again gives the same result.'],
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
  // (2026-11-02) Not only other scripts: an all-English ballot was held for two "○" voting ovals.
  'ocr-text-layer-incomplete':['Part of this scan\'s hidden text layer could not be written, so a screen reader would read the PDF wrongly. This happens with characters the built-in font cannot hold: some symbols, or scripts the offline text recognition does not cover (for example Arabic, Urdu, Persian or Hebrew).','Share the accessible HTML, which has the full text. Running again will not change this.'],
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
// (2026-11-02) Places where the document's OWN text uses colour to carry meaning ("Wednesdays are shaded in blue",
// a printed colour key): the real WCAG 1.4.1 question, which IBM's once-per-stylesheet reminder never points at.
// Picture and AI chart descriptions (<figcaption>, <details>) put colours into words, which is the fix, so they are
// skipped. Corpus (~60 delivered outputs): only the newsletter's calendar text and key match. Returns [{match, quote}].
function colourMeaningCues(html,limit){
  const text=String(html||'').replace(/<(script|style|head|template|noscript|details|figcaption)\b[\s\S]*?<\/\1\s*>/gi,' ')
    .replace(/<br\s*\/?>/gi,' ').replace(/<\/(p|li|dt|dd|td|th|h[1-6]|div|caption|summary)>/gi,' \n ').replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/[ \t]+/g,' ');
  const C='(?:red|green|blue|yellow|orange|purple|pink|gr[ae]y|brown|black|white|gold|teal|maroon|navy|tan)';
  const NOUN='(?:items?|text|words?|dates?|days?|boxes?|cells?|rows?|columns?|squares?|circles?|dots?|lines?|areas?|sections?|entries|entry|highlights?|font|ink|print|type|marks?|tabs?|bars?|labels?|stars?|checks?|ticks?|names?|numbers?|questions?|answers?|events?|periods?|blocks?)';
  const pats=[new RegExp('\\b(?:in|marked(?: in)?|shown in|highlighted(?: in)?|printed in|written in|shaded(?: in)?|colou?red(?: in)?|circled in|underlined in|appears? in|are in|is in)\\s+(?:bold\\s+|light\\s+|dark\\s+)?'+C+'\\b','gi'),
    new RegExp('\\b'+C+'\\s+(?:highlighted\\s+)?'+NOUN+'\\b','gi'),new RegExp('\\(\\s*'+C+'\\s*\\)','gi'),
    new RegExp('(?:^|\\n)\\s*'+C+'\\s*(?:[:=\u2013\u2014-]|means\\b|indicates\\b|shows\\b|marks\\b)','gi'),/\bcolou?r[- ]?(?:coded|key|legend)\b/gi,
    new RegExp('\\b'+C+'(?:\\s*\\([a-z ]{1,20}\\))?\\s+(?:shaded|shading|highlight(?:ed|ing)?|background|fill(?:ed)?)\\b','gi')];
  // Names and fixed phrases where a colour word means no colour.
  const stop=/\b(?:red cross|blue cross|green bay|orange county|black history|white house|white paper|black and white|blue ribbon|red ribbon|blue ridge|green mountain|red sox|golden|whiteboard|blackboard|greenhouse|redwood|blueprint|brown v\.?|mr\.? |mrs\.? |ms\.? |dr\.? )/i;
  const out=[];
  for(const re of pats){let m;while((m=re.exec(text))&&out.length<40){
    // Whole words at both ends: a person searches for this quote ("r teachers and Ed Techs", newsletter 2026-11-05).
    let from=Math.max(0,m.index-70),to=Math.min(text.length,m.index+m[0].length+70);
    while(from>0&&from<m.index&&/\S/.test(text[from-1]))from++;
    while(to<text.length&&to>m.index+m[0].length&&/\S/.test(text[to]))to--;
    const around=text.slice(from,to).replace(/\s+/g,' ').trim();
    if(stop.test(text.slice(Math.max(0,m.index-12),m.index+m[0].length+14)))continue;
    if(!out.some(o=>o.quote===around))out.push({match:m[0].trim().slice(0,60),quote:around.slice(0,240)});}}
  return out.slice(0,Number(limit)||5);
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
        :/orphaned semantic leaves.*page text read timed out/i.test(String(inner[2]))
        // fda, childfind5: the same document passed on a rerun, so "running again gives the same result" was wrong here.
        ?['The computer could not read every page in time, so some parts of the accessible version were not matched to the text on the PDF\'s pages. The tagged PDF was held back.','Run the document again, when the computer is less busy if you can. Until then, share the accessible HTML, which has everything.']
        :/orphaned semantic leaves/i.test(String(inner[2]))
        // Spanish UDHR: "No orphaned semantic leaves" reached teachers verbatim, with "run again" for a deterministic result.
        ?['Some parts of the accessible version could not be matched to the text on the PDF\'s pages, so a screen reader would skip them in the tagged PDF. It was held back.','Share the accessible HTML, which has everything. Running again gives the same result; keep this report for support.']
        :['The tagged PDF was built but failed AlloFlow\'s own PDF check (named below), so it was held back.','Use the accessible HTML. Run again once; if it repeats, keep this report for support.'];
      // The rule name stays in `code`; the detail says it plainly (osep2: "No orphaned semantic leaves" read as jargon).
      if(/orphaned semantic leaves/i.test(String(inner[2])))detail='AlloFlow\'s own PDF check: some text in the accessible version is not linked to text on the PDF\'s pages.';}
    // validator-error has several causes; only a Java failure should send a teacher to install Java.
    // (2026-11-05) "Java did not respond in time" is a busy machine, not a missing Java (osep4).
    if(k==='validator-error'&&detail&&(!/java/i.test(String(detail))||/did not respond in time/i.test(String(detail))))e=/runtime_build_changed|restart/i.test(String(detail))&&!/did not respond in time/i.test(String(detail))
      ?['The independent veraPDF check was skipped because AlloFlow was updated while this document was running.','Restart the AlloFlow connector (or the app that hosts it) and run the document again.']
      :['The independent veraPDF check could not run.','Run the document again. If it repeats, check the file yourself with veraPDF or PAC.'];items.push({code:String(code).slice(0,200),meaning:e?e[0]:'The tagged PDF was not delivered.',nextStep:e?e[1]:'Use the accessible HTML, and keep this report for support.',...(detail?{detail:String(detail).length>600?String(detail).slice(0,600).replace(/\s+\S*$/,'')+'…':String(detail)}:{})});};
  // The unmatched words themselves (assessSourceCoverage missingWords), not token offsets nobody can map to a page.
  const missingWords=(s.contentCoverage&&Array.isArray(s.contentCoverage.missingWords))?s.contentCoverage.missingWords.filter(w=>w&&typeof w.word==='string').slice(0,25):[];
  // A long glued token is marked as cut ("…duckwood" was searched for and not found, worksheet 2026-11-02).
  const allMissing=(s.contentCoverage&&Array.isArray(s.contentCoverage.missingWords))?s.contentCoverage.missingWords.length:0;
  const wordList=missingWords.length?(allMissing>missingWords.length?allMissing+' different words not found in the accessible version; the first '+missingWords.length+': ':'Words not found in the accessible version: ')+missingWords.map(w=>'"'+(w.word.length>60?w.word.slice(0,60)+'…':w.word)+'"'+(w.count>1?' (x'+w.count+')':'')).join(', '):'';
  const corrNote=(Array.isArray(s.fidelityNotes)?s.fidelityNotes:[]).find(n=>n&&n.kind==='ocrVisionAlignment'&&n.caution!==true);
  const corrItems=corrNote&&Array.isArray(corrNote.corrections)?corrNote.corrections.slice().sort((a,b)=>(b.number===true)-(a.number===true)):[];
  const corrList=corrItems.length?'Corrections made, numbers first: '+corrItems.slice(0,25).map(c=>'"'+c.from+'" to "'+c.to+'" (page '+c.page+(c.number?', number':'')+')').join('; ')+(corrItems.length>25?'; and '+(corrItems.length-25)+' more in coverageRelease.correctionsToConfirm':''):'';
  if(s.taggedPdfError){add(s.taggedPdfError,s.taggedPdfError==='content_coverage_requires_review'&&wordList?wordList:s.taggedPdfError==='scan_corrections_require_review'&&corrList?corrList:undefined);
    // (2026-11-05) The confirmation has somewhere to go: release the waiting file, or say plainly why it cannot be released.
    const cr=isPersonReleasableHold(s.taggedPdfError)&&s.coverageRelease&&typeof s.coverageRelease==='object'?s.coverageRelease:null,last=items[items.length-1];
    if(cr&&last){const heldName=String((s.files&&s.files.heldTaggedPdf)||'').split(/[\\/]/).pop();
      last.nextStep=cr.eligible
        ?last.nextStep.replace('share once a person confirms nothing is lost.','the tagged PDF is already made and waiting as '+heldName+'. Once a person confirms nothing is lost, release that file with pdf_release_held_tagged_pdf (code '+cr.fingerprint+'). The report then records who confirmed it.')
        :last.nextStep+' '+String(cr.message||'');
      // (2026-11-07) nist-cyber: "held back", then "nothing could be kept aside", then "confirm the words anyway". When
      // another check stopped the PDF, no PDF exists to hold: say so and send the reader to that check first.
      if(!cr.eligible&&cr.code==='no-held-pdf'){
        last.meaning=s.taggedPdfError==='scan_corrections_require_review'?'Some words the scan misread were corrected, and another check (named above) also stopped the tagged PDF, so none was made.':'The accessible version may be missing words from the original, and another check (named above) also stopped the tagged PDF, so none was made.';
        last.nextStep='Deal with the items named above first, then run the document again. Confirming '+(s.taggedPdfError==='scan_corrections_require_review'?'the corrections':'these words')+' alone will not produce a tagged PDF.';}
      // nces: "Search the original for the words listed below" with no words listed (too many to list).
      else if(!cr.eligible&&cr.code==='words-not-all-listed'&&!wordList)
        last.nextStep='Too many different words were not matched to list them all. Compare the accessible version with the original page by page, charts, tables and page numbers first, before sharing it.';}}
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
  // (2026-11-05) An answer covers only the elements the AI was shown (_alloApplyReminderTriage). On civics it saw about 12 of
  // 101, the finding rightly stayed open, and this said "AI review found no problem" under "only quick checks are left".
  const aiSaw=d=>d&&d.action==='not-an-issue'&&typeof d.key==='string';
  const aiSaysFine=id=>dispositions.find(d=>aiSaw(d)&&d.stillFlagged!==true&&d.key.split('|').pop()===id);
  const aiSawSome=id=>dispositions.find(d=>aiSaw(d)&&d.stillFlagged===true&&d.key.split('|').pop()===id);
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
    list_markup_review:(q,n)=>'Check whether '+(n>1?'these items are':'this is')+' really a list; if '+(n>1?'they are':'it is')+', it should be marked as a list.',
    // (2026-11-02) trust run showed the checker's own "Verify that <blockquote> should have a 'cite' attribute…".
    blockquote_cite_exists:(q,n)=>'Check that '+(n>1?'these indented passages are':'this indented passage is')+' really quoted from somewhere; text that is only indented for layout should not be marked as a quotation.'};
  // Equal Access repeats nested text in its message ("Xavier Botana, Superintendent Xavier Botana, Superintendent",
  // 2026-11-02); the quote a person searches for is one copy.
  const undouble=q=>{const m=q&&/^(.+?)\s+\1$/.exec(q);return m?m[1]:q;};
  // One quoted example of several flagged places reads as the only one: say "and N more" (syllabus_sie "(3 places)").
  const QUOTE_ONE={text_block_heading:1,text_quoted_correctly:1};
  const describe=f=>{const q=undouble((f.description.match(/'([^']{1,80})'/)||f.description.match(/"([^"]{1,80})"/)||[])[1]);const n=Number(f.nodes);const base=PLAIN[f.id]?PLAIN[f.id](q,n):f.description.trim().slice(0,240);
    return base+(n>1?(q&&QUOTE_ONE[f.id]?' (and '+(n-1)+' more '+(n-1===1?'place':'places')+')':' ('+n+' places)'):'');};
  const withDesc=eaReview.filter(f=>f&&typeof f.description==='string'&&f.description.trim()).slice(0,8);
  const clip=(t,n)=>{t=String(t).trim();return t.length>n?t.slice(0,n).replace(/\s+\S*$/,'')+'…':t;};
  const quickChecks=withDesc.filter(f=>aiSaysFine(f.id)).map(f=>{const d=aiSaysFine(f.id);return describe(f)+(d.reason?' (AI review found no problem: '+clip(d.reason,600)+')':'');});
  // A reminder the AI review settled has left the checker's counts but is still a person's quick check.
  const acked=(s.verification&&s.verification.equalAccess&&Array.isArray(s.verification.equalAccess.acknowledgedByAiReview))?s.verification.equalAccess.acknowledgedByAiReview:[];
  for(const f of acked.slice(0,5))if(f&&typeof f.description==='string'&&f.description.trim())quickChecks.push(describe(f)+(f.reason?' (AI review found no problem: '+clip(f.reason,600)+')':''));
  // (2026-11-02) The real colour question, quoted from the document (colourMeaningCues); a glance, never a hold.
  const cues=Array.isArray(s.colourMeaningCues)?s.colourMeaningCues.filter(c=>c&&typeof c.quote==='string'&&c.quote.trim()):[];
  if(cues.length)quickChecks.unshift('The document uses colour to carry meaning: "'+clip(cues[0].quote,200)+'"'+(cues.length>1?' (and '+(cues.length-1)+' more '+(cues.length-1===1?'place':'places')+')':'')
    +'. Check that each colour-coded item is also marked another way (a word, symbol or pattern), so a reader who cannot see colour gets the same information.');
  const named=withDesc.filter(f=>!aiSaysFine(f.id)).slice(0,5).map(f=>{const some=aiSawSome(f.id),seen=some&&Number(some.nodesShown),total=Number(f.nodes);
    return (PLAIN[f.id]?'':'A checker asks a person to confirm: ')+describe(f)+(some?' AI review saw '+(seen>0&&total>seen?seen+' of these '+total:'only some of these')+' and found no problem in those, so the rest still need a person.':'');});
  // (2026-11-05) An axe "could not decide" item is a real open question, and may be the only one: ballot's report told a
  // teacher "only quick checks are left" while this alone kept the verdict at review, named nowhere.
  const axeOpen=dispositions.filter(d=>d&&typeof d.key==='string'&&d.key.indexOf('axe|incomplete|')===0&&d.stillFlagged!==false).map(d=>d.key.split('|').pop());
  for(const rule of axeOpen.slice(0,3))named.push(rule==='color-contrast'?'An automated contrast check could not decide whether some text is readable against its background. Check by eye that all the text is easy to read.':'An automated check ('+String(rule).slice(0,60)+') could not decide about part of the document. Look at that part yourself.');
  // (2026-11-07) The finding that kept the verdict at review can be the AI review's own (Persian, Urdu): the generic line
  // pointed at "the review findings", which were empty. Name the AI's findings, most severe first.
  const SEV={critical:0,serious:1,moderate:2,minor:3};
  const aiNamed=((s.verification&&s.verification.ai&&Array.isArray(s.verification.ai.issues))?s.verification.ai.issues:[])
    .filter(i=>i&&typeof i.issue==='string'&&i.issue.trim()).slice().sort((a,b)=>(SEV[a.severity]??4)-(SEV[b.severity]??4)).slice(0,3)
    .map(i=>'The AI review found'+(SEV[i.severity]!==undefined?' ('+i.severity+')':'')+': '+clip(i.issue,300)+(typeof i.location==='string'&&i.location.trim()?' Near: "'+clip(i.location,80)+'".':''));
  let needs=list(reasons.review);
  const generic=needs.findIndex(x=>/^The automated accessibility checkers left items/.test(x));
  if(generic>=0&&(named.length||quickChecks.length||aiNamed.length))needs=needs.slice(0,generic).concat(named,aiNamed,needs.slice(generic+1));
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
  // (2026-11-05) "possible loss or changed values" over corrected OCR words overstated it (trust: nothing missing, 22 words
  // corrected, one with a digit). Say what was found, once. Only when that is ALL the concern is about.
  const notes=Array.isArray(s.fidelityNotes)?s.fidelityNotes.filter(n=>n&&typeof n.msg==='string'):[];
  const onlyCorrections=!s.integrityWarning&&notes.length>0&&notes.every(n=>n.kind==='ocrVisionAlignment'||n.caution===true)&&notes.some(n=>n.kind==='ocrVisionAlignment'&&n.caution!==true);
  if(onlyCorrections)needs=needs.map(x=>/^content fidelity needs a human check/i.test(x)?clip(notes.find(n=>n.kind==='ocrVisionAlignment').msg,600)+' At least one correction involves a number, so check those closely.':x);
  // (2026-11-02) "Separately, 1 finding" counted the coverage hold twice: the needs line restating the
  // content_coverage_requires_review item below is the same finding (7 of 19 corpus runs).
  const covWithheld=isPersonReleasableHold(s.taggedPdfError);
  // The bare verdict line says nothing the tagged-PDF item does not; the merged coverage line (with guidance) stays.
  if(covWithheld)needs=needs.filter(x=>!/^Source content coverage requires review$/i.test(x));
  const separate=needs.filter(x=>!(covWithheld&&(isCov(x)||/^Some words or numbers from the original are not in the accessible version/.test(x)||/^The scan's text recognition misread/.test(x))));
  // A PDF that was made but did not pass every check ships as -tagged-review-required.pdf (Spanish UDHR said "No tagged PDF was made").
  const pdfShipped=!!(s.files&&typeof s.files.taggedPdf==='string'&&s.files.taggedPdf);
  // (2026-11-05) A check that could not run is not a check that failed (notifications: veraPDF timed out under load; the file passes).
  const pdfLead=covWithheld&&s.files&&s.files.heldTaggedPdf?'A tagged PDF was made but is held until a person checks the '+(s.taggedPdfError==='scan_corrections_require_review'?'corrections':'words')+' listed below. What to do is below.'
    :pdfShipped&&s.taggedPdfDelivery&&s.taggedPdfDelivery.code==='validator-error'?'A tagged PDF was made, but the independent check could not finish, so it is marked review-required. No check found a problem. The reason and what to do are below.'
    :pdfShipped?'A tagged PDF was made but did not pass every check, so it is marked review-required. The reason and what to do are below.'
    :'No tagged PDF was made for this file. The reason and what to do instead are below.';
  // (2026-10-28) decisions: how to decide each judgment call above (remediation_decision_guides.js via the run)
  // (2026-11-02) Checker reminders AlloFlow's own checks answered: shown so nothing is hidden, never asked of a person.
  const answeredByCheck=(s.verification&&s.verification.equalAccess&&Array.isArray(s.verification.equalAccess.answeredByCheck))?s.verification.equalAccess.answeredByCheck:[];
  const checkedAutomatically=answeredByCheck.filter(f=>f&&typeof f.answer==='string'&&f.answer.trim()).slice(0,5).map(f=>clip(f.answer,400));
  // (2026-11-04) What the saved PDF's tag tree reads like (validator readingNotes): veraPDF passed a tree that read on
  // past its last section (RSU 57 budget_v5). A glance for a person, never a hold; added last so it cannot stand in for
  // a named finding above. Only for a PDF that was actually delivered.
  const pdfNotes=pdfShipped&&Array.isArray(s.taggedPdfReadingNotes)?s.taggedPdfReadingNotes.filter(x=>typeof x==='string'&&x.trim()).slice(0,8):[];
  quickChecks.push(...pdfNotes);
  // "findings" read as checker findings when the reports listed none; the one thing still open is named above (trust).
  if(onlyCorrections)for(const it of items)if(it.code==='distribution_review_required'){it.meaning='Some words the scan misread were corrected, and AlloFlow cannot be sure of them, so the tagged PDF was held back.';it.nextStep='Check those words against the original. If they are right, share the accessible HTML; running again gives the same result.';}
  const explained={needsAPerson:needs.slice(0,12),quickChecks,...(checkedAutomatically.length?{checkedAutomatically}:{}),decisions:normalizeDecisionGuides(s.decisionGuides),worthAGlance:list(reasons.cautions).filter(x=>!(onlyCorrections&&/^some words the scan's text recognition misread/.test(x))),headline:ready
      // (2026-11-02) Hebrew UDHR: "ready" while the tagged PDF failed its read-back; the headline must say so.
      ?(items.length?'Automated checks passed for everything they can test, but no tagged PDF was made (reason below). A person should still read the accessible HTML once before sharing.'
        :'Automated checks passed for everything they can test. A person should still read it once before sharing.')
      // One instruction, not two: each item's own next step says what to do (Urdu UDHR: "check it" vs "share it").
      // (2026-10-28, NASA slice) the headline named the PDF reason only, while the review came from a finding below
      :items.length?pdfLead+(separate.length?' Separately, '+separate.length+(separate.length===1?' finding needs':' findings need')+' a person before sharing.':'')
      :(!needs.length&&quickChecks.length)?'Automated checks finished. Only quick checks are left: a person should glance at them before sharing.'
      :'Automated checks finished, but some findings need a person to look before sharing.',items};
  if(pdfNotes.length)explained.headline+=' The tagged PDF also has reading-order notes to check, listed with the quick checks.';
  const confirmed=s.contentCoverage&&s.contentCoverage.personConfirmation;
  if(confirmed&&confirmed.confirmedBy)explained.headline+=' The tagged PDF was released on the word of '+confirmed.confirmedBy+', who confirmed '+(confirmed.corrections&&confirmed.corrections.length?(confirmed.missingTokens>0?'the unmatched words and the scan corrections':'the scan corrections'):'the words the check could not match are not lost')+'.';
  return explained;
}
// (2026-11-05, Aaron) A coverage hold is deterministic: running again holds again, so "nothing is lost" needs a way out.
// The fingerprint ties a person's confirmation to the exact source, HTML and word list they checked.
const COVERAGE_LINE=/^Source content coverage requires review$/i;
// (2026-11-05, Aaron) A corrected number as the only open item (pipeline gate code scan_corrections_need_person) is the other hold
// a person can settle: same tool, same binding, and every correction is on the list.
const FIDELITY_LINE=/^content fidelity needs a human check/i;
function isPersonReleasableHold(code){return code==='content_coverage_requires_review'||code==='scan_corrections_require_review';}
const correctionNote=s=>(s&&Array.isArray(s.fidelityNotes)?s.fidelityNotes:[]).find(n=>n&&n.kind==='ocrVisionAlignment'&&n.caution!==true)||null;
function coverageReleaseFingerprint(cov,corrections){
  const c=cov||{},x=c.extraction||{};
  const words=(Array.isArray(c.missingWords)?c.missingWords:[]).map(w=>[String(w&&w.word),Number(w&&w.count)]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  const fixes=(Array.isArray(corrections)?corrections:[]).map(k=>[k&&k.page,String(k&&k.from),String(k&&k.to)]);
  return require('crypto').createHash('sha256').update(JSON.stringify([c.sourceSha256||'',c.htmlSha256||'',c.missingTokens||0,words,x.lowConfidencePages||[],fixes])).digest('hex').slice(0,16);
}
// Whether a person's confirmation could honestly settle this hold. Reasons a person cannot settle stay a hold.
function coverageReleaseStatus(s){
  const no=(code,message)=>({eligible:false,code,message});
  const c=s&&s.contentCoverage;
  if(!s||!isPersonReleasableHold(s.taggedPdfError)||!c)return no('not-held','This run has no tagged PDF held for a person to check.');
  const coverageOpen=s.taggedPdfError==='content_coverage_requires_review',corr=correctionNote(s);
  if(!coverageOpen&&!corr)return no('not-held','This run has no tagged PDF held for a person to check.');
  if(coverageOpen&&c.status!=='review_required')return no('no-source-text','No text could be read from the original, so there is no list a person could check.');
  if(c.extraction&&c.extraction.pageErrorCount>0)return no('unread-pages','Some pages of the original could not be read, so a list of missing words cannot be complete. Run the document again.');
  if(coverageOpen&&(typeof c.tokenRecall!=='number'||c.tokenRecall<0.9))return no('too-much-missing','More than a tenth of the original\'s words were not matched, so the accessible version should be fixed rather than confirmed.');
  const words=Array.isArray(c.missingWords)?c.missingWords.filter(w=>w&&typeof w.word==='string'):[];
  if(coverageOpen&&words.reduce((n,w)=>n+(Number(w.count)||0),0)!==c.missingTokens)return no('words-not-all-listed','Too many different words were not matched to list them all, so a person could not check every one.');
  const fixes=corr&&Array.isArray(corr.corrections)?corr.corrections.filter(k=>k&&typeof k.from==='string'&&typeof k.to==='string'):[];
  // An older record or a capped list has corrections nobody can see; confirming what is shown would not cover them.
  if(corr&&(!Number.isSafeInteger(corr.correctionCount)||corr.correctionCount<1||fixes.length!==corr.correctionCount))return no('corrections-not-all-listed','The corrections could not all be listed, so a person could not check every one. Run the document again.');
  const held=s.heldTaggedPdf;
  if(!held||!s.files||!s.files.heldTaggedPdf){const why=String(s.heldTaggedPdfUnavailable||'').replace(/\s+/g,' ').slice(0,300);
    return no('no-held-pdf','No tagged PDF could be kept aside for release'+(why?' ('+why+')':'')+', so confirming the '+(coverageOpen?'words':'corrections')+' alone will not produce one.');}
  if(!held.pdfUa||held.pdfUa.status!=='passed')return no('held-pdf-not-validated','The held PDF has not passed the independent PDF/UA check (status: '+String(held.pdfUa&&held.pdfUa.status)+'), so it cannot be released.');
  const numbersFirst=fixes.slice().sort((a,b)=>(b.number===true)-(a.number===true));
  return {eligible:true,code:'eligible',fingerprint:coverageReleaseFingerprint(c,fixes),missingTokens:c.missingTokens,wordsToConfirm:words.map(w=>({word:w.word,count:w.count})),
    ...(fixes.length?{correctionsToConfirm:numbersFirst,numberCorrections:fixes.filter(k=>k.number===true).length}:{}),
    lowConfidencePages:(c.extraction&&c.extraction.lowConfidencePages)||[],
    message:fixes.length&&!coverageOpen?'A person must check every listed correction against the original, numbers first, before this is released. A wrong number must be fixed, not released.'
      :'A person must check every listed word'+(fixes.length?' and correction':'')+' against the original (and any low-confidence pages) before this is released.'};
}
// The released report: the hold line leaves the verdict, a caution stays, and the words and the person's name stay on the record.
function applyCoverageRelease(report,o){
  const s=JSON.parse(JSON.stringify(report)),held=s.heldTaggedPdf,c=s.contentCoverage;
  const words=(c.missingWords||[]).map(w=>'"'+w.word+'"'+(w.count>1?' (x'+w.count+')':'')).join(', ');
  const corr=correctionNote(s),fixes=corr&&Array.isArray(corr.corrections)?corr.corrections.filter(k=>k&&typeof k.from==='string'&&typeof k.to==='string'):[];
  const n=c.missingTokens,fingerprint=coverageReleaseFingerprint(c,fixes);
  const when=new Date(o.at),day=when.getFullYear()+'-'+String(when.getMonth()+1).padStart(2,'0')+'-'+String(when.getDate()).padStart(2,'0'); // the person's own date, not UTC's
  const parts=[];
  if(n>0)parts.push((n===1?'the 1 word':'the '+n+' words')+' the coverage check could not match '+(n===1?'is':'are')+' not lost: '+(words.length>500?words.slice(0,500).replace(/,[^,]*$/,'')+', and more':words));
  if(fixes.length){const nums=fixes.filter(k=>k.number===true).length,shown=fixes.slice().sort((a,b)=>(b.number===true)-(a.number===true)).slice(0,8).map(k=>'"'+k.from+'" to "'+k.to+'"').join(', ');
    parts.push('the '+fixes.length+' scan correction'+(fixes.length===1?'':'s')+(nums?' ('+nums+' involving a number)':'')+' are right, such as '+shown);}
  const line='A person ('+o.confirmedBy+') confirmed on '+day+' that '+parts.join(', and that ')+'. AlloFlow records this statement and cannot verify it.';
  const reasons=s.verdictReasons&&typeof s.verdictReasons==='object'?s.verdictReasons:{};
  const review=(Array.isArray(reasons.review)?reasons.review:[]).filter(x=>!COVERAGE_LINE.test(String(x))&&!(fixes.length&&FIDELITY_LINE.test(String(x))));
  s.verdictReasons={...reasons,review,cautions:[...(Array.isArray(reasons.cautions)?reasons.cautions:[]),line]};
  const v=s.verdict||{},removed=(Array.isArray(reasons.review)?reasons.review.length:0)-review.length;
  const reviewCount=Math.max(0,(v.reviewCount||0)-removed);
  s.verdict={...v,level:reviewCount>0?'review':'caution',reviewCount,cautionCount:(v.cautionCount||0)+1};
  s.contentCoverage={...c,status:c.status==='review_required'?'person_confirmed':c.status,reviewRequired:false,personConfirmation:{confirmedBy:o.confirmedBy,confirmedAt:o.at,...(o.note?{note:o.note}:{}),fingerprint,missingTokens:n,missingWords:c.missingWords,...(fixes.length?{corrections:fixes}:{}),basis:'As stated to AlloFlow; not verified by it.'}};
  s.files={...s.files,taggedPdf:o.taggedPdfPath};delete s.files.heldTaggedPdf;
  s.taggedPdfDelivery=held.delivery&&held.delivery.ok===true?held.delivery:{ok:true,code:'verified'};
  s.taggedPdfExportMode=held.exportMode||'original_layout';
  s.taggedPdfReadingNotes=Array.isArray(held.readingNotes)?held.readingNotes:[];
  delete s.taggedPdfError;delete s.heldTaggedPdf;delete s.coverageRelease;delete s.heldTaggedPdfUnavailable;
  applyPdfDeliveryEvidence(s,held.pdfUa);
  s.deliveryExplanation=explainDelivery(s);
  return s;
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
    // (2026-11-02) Reminders a deterministic AlloFlow check answered (pipeline _alloApplyStylesheetReview): disclosed, not asked.
    const answered = list(ea.answeredByCheck, 20).map((f) => Object.assign(rule(f), { answeredBy: str(f.answeredBy, 60), answer: str(f.answer, 600) }));
    if (answered.length) out.equalAccess.answeredByCheck = answered;
  }
  if (!out.ai && !out.axe && !out.equalAccess) return null;
  return out;
}
// (2026-11-05) veraPDF took over 5 minutes on a busy machine (keyless notifications) and 5 s by hand on the same file, and the
// PDF was downgraded. Only a timeout gets one more try: a failed PDF or a broken report must never be re-rolled.
async function retryValidatorTimeoutOnce(run,onProgress,signal){
  try{return await run();}
  catch(error){
    if(!/^(?:veraPDF validation timed out$|Java did not respond in time)/.test(String(error&&error.message||''))||(signal&&signal.aborted))throw error;
    try{if(typeof onProgress==='function')onProgress('veraPDF timed out; trying once more');}catch(_){}
    return run();
  }
}
module.exports={isPersonReleasableHold,coverageReleaseFingerprint,coverageReleaseStatus,applyCoverageRelease,retryValidatorTimeoutOnce,compactVerificationEvidence,pdfUaEvidence,applyPdfDeliveryEvidence,explainDelivery,colourMeaningCues,normalizeDecisionGuides,auditChecks,parsePdfUaCliReport,normalizePdfUaValidation,pdfDeliveryState,normalizeCandidateRejectionEvidence,CANDIDATE_REJECTION_SCHEMA};
