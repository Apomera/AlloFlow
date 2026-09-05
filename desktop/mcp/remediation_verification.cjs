'use strict';
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
    summary.taggedPdfDelivery={ok:false,code:evidence.status==='failed'?'validator-failed':evidence.error?'validator-error':'validator-unavailable'};
  }
  summary.reviewRequired=needsReview||!summary.verdict||summary.verdict?.level==='review'||!['complete','complete-for-tested-scope'].includes(summary.verificationState);
  summary.deliveryStatus=summary.reviewRequired?'review-required':'complete-for-tested-scope';
  return summary;
}
// Self-contained so the browser uses exactly the same per-engine report contract.
function auditChecks(input) {
  const o=input||{}, count=v=>Number.isSafeInteger(v)&&v>=0?v:null;
  const state=(value,failures,review,partial)=>!value||!Number.isFinite(value.score)?'unavailable':failures>0?'failed':partial||failures===null||review===null?'partial':review>0?'review-required':'passed';
  const ai=o.ai,axe=o.axe,ea=o.equalAccess;
  const aiFailures=Array.isArray(ai?.issues)?ai.issues.length:count(ai?.issueCount);
  const aiReview=Array.isArray(ai?.issues)?ai.issues.filter(i=>i?.requiresManualReview).length:null;
  const axeFailures=count(axe?.totalViolations),axeReview=count(axe?.totalIncomplete);
  const eaFailures=count(ea?.failViolations),potential=count(ea?.potentialViolations),manual=count(ea?.manualViolations);
  const eaReview=count(ea?.reviewFindingCount)??(potential!==null&&manual!==null?potential+manual:null);
  return {ai:{status:o.includeAi===false?'not-run':state(ai,aiFailures,aiReview,ai?._partialAudit||ai?.partial||ai?._scoreDegraded||ai?.scoreDegraded||ai?.synthesized),findings:aiFailures,reviewFindings:aiReview},
    axe:{status:state(axe,axeFailures,axeReview),findings:axeFailures,reviewFindings:axeReview},
    equalAccess:{status:state(ea,eaFailures,eaReview),findings:eaFailures,reviewFindings:eaReview}};
}
module.exports={pdfUaEvidence,applyPdfDeliveryEvidence,auditChecks};
