import {beforeAll,describe,expect,it} from 'vitest';
import {loadAlloModule} from './setup.js';
let AC,api;
beforeAll(()=>{window.React=window.React||{};loadAlloModule('applied_challenge_module.js');loadAlloModule('studio_response_module.js');AC=window.AlloModules.AppliedChallenge;api=window.AlloModules.StudioResponse;});
const resource=accepted=>({id:'backup-task',type:'applied-challenge',data:AC.normalize({brief:{drivingQuestion:'Which option should we try?',lockedLessonFacts:['Water infiltrates soil.'],criteria:['Use evidence.'],constraints:['No invented findings.']},workspace:{workingQuestion:'My question?',questionAccepted:accepted,response:'My saved response',artifactUrl:'https://example.org/model',artifactDescription:'My explanation'},evidenceLedger:[{id:'row',claim:'My option',evidence:'My reasoning'}],validationCycles:[{id:'check',observation:{evidence:'My observation'}}],feedback:{strength:'A strength',coverage:{version:1,workspaceFields:3,evidenceRows:1,validationChecks:1,selfChecks:0,shortenedFields:0}},sourceExcerpt:'PRIVATE TEACHER SOURCE',qualityReview:{checks:{}}})});
describe('Applied challenge text backup recovery',()=>{
 it.each([true,false])('round-trips a normalized workspace with questionAccepted=%s',accepted=>{
  const r=resource(accepted),response=api.responseFromData(r.type,r.data);const text=api.serializeBackup(r,response);const restored=api.readBackup(r,JSON.parse(text));
  expect(restored).toEqual(api.toSubmission(r,response).data);expect(restored.workspace.questionAccepted).toBe(accepted);expect(restored.workspace.response).toBe('My saved response');
  expect(restored.feedback.coverage.evidenceRows).toBe(1);expect(restored.validationCycles[0].observation.evidence).toBe('My observation');expect(text).not.toContain('PRIVATE TEACHER SOURCE');expect(text).not.toContain('qualityReview');
 });
 it('accepts older text-only workspaces without a question flag',()=>{const r=resource(true);const text=api.serializeBackup(r,{schemaVersion:1,workspace:{workingQuestion:'Older question',response:'Older draft'}});expect(api.readBackup(r,JSON.parse(text)).workspace.response).toBe('Older draft');});
 it.each([{questionAccepted:'true'},{questionAccepted:1},{response:false},{revision:[]},{workingQuestion:{text:'Wrong shape'}}])('rejects malformed workspace values %j',workspace=>{
  const r=resource(true),backup=api.backup(r,api.responseFromData(r.type,r.data));backup.studio.workspace={...backup.studio.workspace,...workspace};expect(()=>api.readBackup(r,backup)).toThrow('Invalid challenge workspace');
 });
 it('keeps resource identity checks in place for an otherwise valid backup',()=>{const r=resource(true),backup=JSON.parse(api.serializeBackup(r));expect(()=>api.readBackup({...r,id:'different'},backup)).toThrow();});
});
