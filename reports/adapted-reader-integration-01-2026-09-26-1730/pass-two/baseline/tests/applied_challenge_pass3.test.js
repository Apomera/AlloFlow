import {beforeAll,describe,expect,it} from 'vitest';
import {loadAlloModule} from './setup.js';
let AC,H,shared;
beforeAll(()=>{window.React=window.React||{};loadAlloModule('applied_challenge_module.js');loadAlloModule('studio_response_module.js');AC=window.AlloModules.AppliedChallenge;H=AC._testing;shared=window.AlloModules.StudioResponse;});
const task=()=>AC.normalize({family:'decide',sourceExcerpt:'Water can infiltrate soil. Surface water can evaporate.',plan:{learningTarget:'Use infiltration to compare options.',availableTime:'20 minutes',materials:'Paper and supplied lesson; no experiment.'},brief:{context:'A fictional garden team compares options.',drivingQuestion:'Which watering plan should we compare?',lockedLessonFacts:['Water enters soil.','Surface water evaporates.'],criteria:['Explain infiltration.','Compare options.'],constraints:['Use only supplied evidence.'],deliverable:'A comparison with reasons.',factVerified:true},workspace:{workingQuestion:'Which approach should we compare?',questionAccepted:true,response:'Compare slow and fast watering using infiltration.'}});
const review=()=>({checks:Object.fromEntries(['lessonUse','alternatives','feasibility'].map(key=>[key,{status:'supported',reason:'The task wording supports this check.',nextStep:'Inspect the relevant criterion.'}]))});
describe('Applied challenge comprehensive review',()=>{
 it('includes the last evidence row, first and last saved check, full ordinary writing and explicit source identities',()=>{
  const value=task(),fact=value.brief.factSources[0];
  value.workspace.revision='Revision reasoning '.repeat(80)+'REVISION-END';
  value.evidenceLedger=Array.from({length:12},(_,i)=>({id:'r'+i,claim:'Option '+i,evidence:'Evidence '+i,status:'verified',factId:fact.id,factRevision:fact.revision}));
  value.validationCycles=Array.from({length:6},(_,i)=>({id:'c'+i,plan:{testQuestion:'Question '+i},observation:{evidence:'Observation '+i},decision:{reasoning:'Reason '+i}}));
  const result=H.appliedChallengeFeedbackContext(value);
  expect(result.context.studentWork.evidenceLedger).toHaveLength(12);
  expect(result.context.studentWork.evidenceLedger[11]).toMatchObject({id:'r11',evidence:'Evidence 11',sourceConnection:{factId:fact.id,current:true,teacherReviewedFact:true}});
  expect(result.context.studentWork.validationCycles.map(c=>c.id)).toEqual(['c0','c1','c2','c3','c4','c5']);
  expect(result.context.studentWork.workspace.revision).toContain('REVISION-END');
  expect(result.coverage).toMatchObject({evidenceRows:12,validationChecks:6,shortenedFields:0});
  expect(H.buildAppliedChallengeFeedbackPrompt(value)).toContain('Evidence 11');
 });
 it('bounds maximum escaped text while retaining every item and disclosing each shortening',()=>{
  const value=task(),long='\u0001😀'.repeat(8000);
  for(const field of AC.APPLIED_CHALLENGE_WORKSPACE_PHASES)value.workspace[field.id]=long;
  value.workspace.artifactDescription=long;
  value.evidenceLedger=Array.from({length:12},(_,i)=>({id:'r'+i,claim:long,evidence:long,tradeoff:long}));
  value.validationCycles=Array.from({length:6},(_,i)=>({id:'c'+i,plan:{testQuestion:long,criterion:long,expectedFinding:long,changeThreshold:long},observation:{evidence:long},decision:{reasoning:long,revisionSummary:long,nextStep:long}}));
  value.brief.criteria=Array.from({length:12},(_,i)=>i+long);value.brief.constraints=Array.from({length:12},(_,i)=>i+long);
  value.brief.lockedLessonFacts=Array.from({length:12},(_,i)=>i+long);
  const normalized=AC.normalize(value);
  H.appliedChallengeSelfCheckItems(normalized.brief).forEach(item=>{normalized.criteriaCheck[item.key]={rating:'partly',note:long,revision:item.revision};});
  const {context,coverage}=H.appliedChallengeFeedbackContext(normalized);
  expect(JSON.stringify(context).length).toBeLessThanOrEqual(90000);
  expect(context.studentWork.evidenceLedger).toHaveLength(12);expect(context.studentWork.validationCycles).toHaveLength(6);expect(context.studentWork.selfCheck).toHaveLength(24);
  expect(coverage.shortenedFields).toBe(context.coverage.shortened.length);expect(coverage.shortenedFields).toBeGreaterThan(0);
  expect(context.coverage.shortened.some(item=>item.field==='evidenceLedger.11.evidence')).toBe(true);
  expect(normalized.workspace.response.length).toBe(12000);
  expect(H.appliedChallengeCoverageText(coverage)).toContain('were shortened');
 });
 it('discloses missing coverage on old feedback and does not send linked artifact URLs',()=>{
  const value=task();value.workspace.artifactUrl='https://example.org/PRIVATE-ARTIFACT';value.workspace.artifactDescription='This explanation is available.';
  expect(H.appliedChallengeCoverageText(null)).toContain('was not recorded');
  expect(H.buildAppliedChallengeFeedbackPrompt(value)).not.toContain('PRIVATE-ARTIFACT');
 });
 it('marks changed source connections and includes all self-ratings without treating them as scores',()=>{
  const value=task(),fact=value.brief.factSources[0];value.evidenceLedger=[{id:'r',claim:'My claim',factId:fact.id,factRevision:'old',status:'verified'}];
  const item=H.appliedChallengeSelfCheckItems(value.brief)[0];value.criteriaCheck[item.key]={rating:'met',note:'My evidence',revision:item.revision};
  const {context}=H.appliedChallengeFeedbackContext(value);
  expect(context.studentWork.evidenceLedger[0]).toMatchObject({status:'needs-check',sourceConnection:{current:false,teacherReviewedFact:false}});
  expect(context.studentWork.selfCheck[0]).toMatchObject({id:item.key,studentRating:'met',studentNote:'My evidence'});
 });
 it('retains coverage through submission while excluding teacher task reviews and private source',()=>{
  const value=task();value.qualityReview=review();value.feedback={strength:'A strength',coverage:{version:1,workspaceFields:2,evidenceRows:12,validationChecks:6,selfChecks:1,shortenedFields:5}};
  const resource={id:'r',type:'applied-challenge',data:value};
  const submission=shared.toSubmission(resource,shared.responseFromData(resource.type,resource.data));
  const text=JSON.stringify(submission);
  expect(text).toContain('"evidenceRows":12');expect(text).toContain('"shortenedFields":5');expect(text).not.toContain('qualityReview');expect(text).not.toContain('Water can infiltrate soil.');
 });
 it('invalidates feedback when constraints in task settings or the tail of the source change',()=>{
  const value=task();value.sourceExcerpt='x'.repeat(4900)+'old';const before=H.appliedChallengeRequestFingerprint(value,'feedback');
  value.sourceExcerpt='x'.repeat(4900)+'new';expect(H.appliedChallengeRequestFingerprint(value,'feedback')).not.toBe(before);
  const sourceChanged=H.appliedChallengeRequestFingerprint(value,'feedback');value.plan.availableTime='5 minutes';expect(H.appliedChallengeRequestFingerprint(value,'feedback')).not.toBe(sourceChanged);
 });
});
describe('Applied challenge teacher source and quality review',()=>{
 it('distinguishes missing, found, unmatched and unavailable quotes without auto verification',()=>{
  const value=task();value.brief.factVerified=false;value.brief.factSources[0].sourceQuote='Water can\n infiltrate   soil.';
  expect(H.appliedChallengeSourceReview(value).map(r=>r.status)).toEqual(['found','missing']);
  value.brief.factSources[1].sourceQuote='Made-up quotation.';expect(H.appliedChallengeSourceReview(value)[1].status).toBe('not-found');
  value.sourceExcerpt='';expect(H.appliedChallengeSourceReview(value)[0].status).toBe('unavailable');
  expect(value.brief.factVerified).toBe(false);
 });
 it('limits quality review to task information and changes identity for teacher edits',()=>{
  const value=task();value.workspace.response='PRIVATE-STUDENT-DRAFT';value.evidenceLedger=[{claim:'PRIVATE-STUDENT-CLAIM'}];value.teacherComment={text:'PRIVATE-COMMENT'};
  const context=H.appliedChallengeQualityContext(value);expect(context).not.toMatch(/PRIVATE-STUDENT|PRIVATE-COMMENT/);
  value.workspace.response='Different draft';expect(H.appliedChallengeQualityContext(value)).toBe(context);
  value.plan.availableTime='5 minutes';expect(H.appliedChallengeQualityContext(value)).not.toBe(context);
  const prompt=H.buildAppliedChallengeQualityPrompt(value);expect(prompt).toContain('without applying that concept');expect(prompt).toContain('at least two defensible');expect(prompt).toContain('Missing time or material');
 });
 it('requires complete structured reviews and preserves uncertainty when setup is missing',()=>{
  const value=task();expect(H.parseAppliedChallengeQualityReview('not JSON',value)).toBeNull();
  expect(H.parseAppliedChallengeQualityReview({checks:{lessonUse:{status:'supported',reason:'Reason'}}},value)).toBeNull();
  value.sourceExcerpt='';value.plan.availableTime='';
  const result=H.parseAppliedChallengeQualityReview(JSON.stringify(review()),value);
  expect(result.checks.lessonUse.status).toBe('unknown');expect(result.checks.feasibility.status).toBe('unknown');
  expect(AC.normalize({...value,qualityReview:{...result,unknown:'ignored'}}).qualityReview).not.toHaveProperty('unknown');
 });
});

it('compares source quotations against the actual excerpt supplied for feedback',()=>{
 const value=task();value.brief.factSources[0].sourceQuote='A different supplied excerpt.';
 const result=H.appliedChallengeFeedbackContext(value,{sourceExcerpt:'A different supplied excerpt.'});
 expect(result.context.lessonBoundary.facts[0].quoteMatch).toBe('found');
 expect(result.context.lessonSourceExcerpt).toBe('A different supplied excerpt.');
});
