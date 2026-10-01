import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),V=require('../desktop/mcp/remediation_verification.cjs');
const options={hasPdf:true,requested:true,sha256:'a'.repeat(64),bytes:100};
const good=()=>({validator:'veraPDF CLI',validatorVersion:'1.30.2',profile:'ua1',inputSha256:options.sha256,inputBytes:100,compliant:true,failedChecks:0,failedRuleCount:0,validatedAt:'2026-09-04T00:00:00.000Z'});
const summary=()=>({files:{taggedPdf:'sample.pdf'},verdict:{level:'ready',reviewCount:0,cautionCount:0},verificationState:'complete',taggedPdfDelivery:{ok:true,code:'verified'}});
describe('final independent PDF delivery evidence',()=>{
 it('retains byte/profile provenance on a pass without claiming legal compliance',()=>{const e=V.pdfUaEvidence(good(),options),r=V.applyPdfDeliveryEvidence(summary(),e);expect(e).toMatchObject({status:'passed',inputSha256:options.sha256,inputBytes:100,profile:'ua1'});expect(r).toMatchObject({deliveryStatus:'complete-for-tested-scope',reviewRequired:false});});
 it.each([{compliant:false,failedChecks:2,failedRuleCount:1},{compliant:true,failedChecks:1,failedRuleCount:1}])('makes a failed or contradictory PDF result govern delivery: %j',change=>{const r=V.applyPdfDeliveryEvidence(summary(),V.pdfUaEvidence({...good(),...change},options));expect(r).toMatchObject({reviewRequired:true,deliveryStatus:'review-required',verdict:{level:'review',reviewCount:1},taggedPdfDelivery:{ok:false,code:'validator-failed'},htmlVerificationState:'complete'});});
 it.each([{inputSha256:'b'.repeat(64)},{inputBytes:101},{profile:'ua2'},{failedChecks:undefined}])('rejects missing or mismatched evidence: %j',change=>{const e=V.pdfUaEvidence({...good(),...change},options);expect(e.status).toBe('unavailable');expect(V.applyPdfDeliveryEvidence(summary(),e).reviewRequired).toBe(true);});
 it('reports errors and unrequested verification instead of implying a pass',()=>{expect(V.pdfUaEvidence({error:'Java missing'},options)).toMatchObject({status:'unavailable',error:'Java missing'});const e=V.pdfUaEvidence(null,{...options,requested:false});expect(e.status).toBe('not-run');expect(V.applyPdfDeliveryEvidence(summary(),e).verdict.level).toBe('review');});
 it('keeps upstream review findings when PDF passes and excludes nonexistent PDF outputs',()=>{const r=summary();r.verificationState='partial';r.verdict={level:'review',reviewCount:3,cautionCount:1};expect(V.applyPdfDeliveryEvidence(r,V.pdfUaEvidence(good(),options))).toMatchObject({reviewRequired:true,verdict:{level:'review',reviewCount:3}});expect(V.pdfUaEvidence(null,{hasPdf:false})).toMatchObject({status:'not-applicable'});});
});
describe('per-engine audit coverage',()=>{
 it('distinguishes unavailable, omitted and review-required checks',()=>{const c=V.auditChecks({includeAi:false,axe:{score:100,totalViolations:0,totalIncomplete:2},equalAccess:null});expect(c).toMatchObject({ai:{status:'not-run'},axe:{status:'review-required',reviewFindings:2},equalAccess:{status:'unavailable'}});});
 it('never turns unknown review counts into a pass and preserves confirmed failures',()=>{expect(V.auditChecks({equalAccess:{score:100,failViolations:0}}).equalAccess.status).toBe('partial');expect(V.auditChecks({axe:{score:70,totalViolations:2}}).axe).toMatchObject({status:'failed',findings:2});});
});
