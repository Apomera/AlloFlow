import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url);
const shell=readFileSync('AlloFlowANTI.txt','utf8').replace(/\r\n/g,'\n');
const from=shell.indexOf('  // Mailbox-hosted homework entry (?allo_mbp=');
const to=shell.indexOf("  useEffect(() => {\n      if (activeView === 'adventure'",from);
if(from<0||to<0)throw Error('Missing actual hosted assignment intake effect');
const effect=shell.slice(from,to);
const expirySource=shell.slice(shell.indexOf('function _alloExpiryMs('),shell.indexOf('function _alloBase64UrlEncode('));
const expired=new Function(expirySource+'\nreturn _alloAssignmentIsExpired;')();
const flush=async()=>{for(let i=0;i<18;i++)await Promise.resolve();};
let shared,transport;
beforeAll(()=>{
  window.React=require('../desktop/web-app/node_modules/react');
  loadAlloModule('shared_activity_module.js');loadAlloModule('session_transport_module.js');
  shared=window.AlloModules.SharedActivity;transport=window.AlloModules.SessionTransport;
});
async function packet(type='word_cloud',resources=[]){
  const built=await shared.buildAssignmentPackEncoded({includeSharedActivity:true,resourceIds:resources.map(item=>item.id)},{
    resolveAssignmentResources:()=>resources,
    sharedAssignmentActivity:{enabled:true,type,prompt:'Choose your next step',identityMode:'named',optionsText:'Tuesday\nWednesday',surveyItems:[{type:'freetext',text:'What would help?',required:true}]},
    serializeResourceForStudentPack:item=>structuredClone(item),stripUndefined:value=>value,
    generateUUID:()=> '00000000-0000-4000-8000-000000000000',encodeAlloPack:async text=>text,
  });
  if(!built)throw Error('Production activity builder rejected fixture');
  return JSON.parse(built.encoded);
}
function intake(value,{decode}={}){
  const changes={activity:null,history:['previous-resource'],pending:{id:'previous-pending'},show:false};let cleanup;
  const env={
    useEffect:fn=>{cleanup=fn();},_alloReadMailboxEntryParam:()=>({u:'https://mailbox.example.invalid',id:'PK-local-fixture',k:'fixture-secret'}),
    setMbHostedAssignment:vi.fn(),setSharedHostedActivity:vi.fn(next=>changes.activity=next),
    _alloSetQrStudentAiPolicy:vi.fn(),_alloApplyAuthoritativeStudentAiPolicy:vi.fn(),
    setHasSelectedMode:vi.fn(),setHasSelectedRole:vi.fn(),setShowWizard:vi.fn(),setShowStudentWelcome:vi.fn(),
    setIsTeacherMode:vi.fn(),setIsParentMode:vi.fn(),setIsIndependentMode:vi.fn(),setIsStudentLinkMode:vi.fn(),setShowStudentEntry:vi.fn(),
    _alloFetchMailboxPackParts:vi.fn(async()=>({assembled:JSON.stringify(value)})),_alloMailboxCallWithRetry:vi.fn(),
    _alloDecodeAlloPack:vi.fn(decode|| (async text=>text)),_alloAssignmentIsExpired:expired,
    _alloStudentSafeResources:items=>transport.studentSafeResources(items,['analysis','lesson-plan']),
    _alloNormalizeSharedRatingActivity:shared.normalizeRatingActivity,
    setHistory:vi.fn(next=>changes.history=next),setPendingQrAssignmentResource:vi.fn(next=>changes.pending=next),
    setShowSharedHostedActivity:vi.fn(next=>changes.show=next),addToast:vi.fn(),warnLog:vi.fn(),
  };
  new Function('env','with(env){'+effect+'}')(env);
  return {env,changes,cleanup:()=>cleanup?.()};
}
describe('actual mailbox activity-only student intake',()=>{
  it.each(['word_cloud','rating','availability','signup','survey'])('opens a valid standalone %s produced by the real builder',async type=>{
    const built=await packet(type);expect(built.resources).toEqual([]);
    const h=intake(built);await flush();
    expect(h.changes.activity?.activity.type).toBe(type);
    expect(h.changes.activity?.mailbox).toEqual({url:'https://mailbox.example.invalid',id:'PK-local-fixture',secret:'fixture-secret'});
    expect(h.changes.history).toEqual([]);expect(h.changes.pending).toBeNull();expect(h.changes.show).toBe(true);
    expect(h.env.addToast).toHaveBeenLastCalledWith(expect.stringContaining('Homework loaded:'),'success');
    expect(h.env._alloApplyAuthoritativeStudentAiPolicy).toHaveBeenCalledTimes(1);
  });
  it('still opens the selected reading when a shared activity accompanies resources',async()=>{
    const resource={id:'reading',type:'simplified',title:'Reading',data:'Original prepared text'};
    const h=intake(await packet('word_cloud',[resource]));await flush();
    expect(h.changes.pending).toEqual(resource);expect(h.changes.history).toEqual([resource]);
    expect(h.changes.activity.activity.type).toBe('word_cloud');expect(h.changes.show).toBe(false);
  });
  it.each(['absent','wrong-type','wrong-delivery','wrong-id','empty-prompt'])('rejects empty packs with %s activity instead of reporting successful homework',async variant=>{
    const built=await packet();
    if(variant==='absent')built.sharedActivities=[];
    else {const activity=built.sharedActivities[0];if(variant==='wrong-type')activity.type='unsupported';if(variant==='wrong-delivery')activity.delivery='live';if(variant==='wrong-id')activity.activityId='invalid';if(variant==='empty-prompt')activity.prompt='  ';}
    const h=intake(built);await flush();
    expect(h.changes.activity).toBeNull();expect(h.env.setHistory).not.toHaveBeenCalled();expect(h.env.setPendingQrAssignmentResource).not.toHaveBeenCalled();
    expect(h.env.addToast).toHaveBeenLastCalledWith(expect.any(String),'error');
    expect(h.env._alloApplyAuthoritativeStudentAiPolicy).not.toHaveBeenCalled();
  });
  it('rejects an expired standalone activity before activating its student AI policy',async()=>{
    const built=await packet();built.expiresAt='2000-01-01T00:00:00Z';built.aiPolicy.studentAi='student-byok';
    const h=intake(built);await flush();
    expect(h.changes.activity).toBeNull();expect(h.env.setHistory).not.toHaveBeenCalled();expect(h.env.setPendingQrAssignmentResource).not.toHaveBeenCalled();
    expect(h.env._alloApplyAuthoritativeStudentAiPolicy).not.toHaveBeenCalled();expect(h.env.addToast).toHaveBeenLastCalledWith(expect.any(String),'error');
  });
  it('does not restore an old assignment or its policy if cleanup occurs during decompression',async()=>{
    const built=await packet('word_cloud',[{id:'old-reading',type:'simplified',data:'Old text'}]);
    let finishDecode;const h=intake(built,{decode:()=>new Promise(resolve=>finishDecode=resolve)});await flush();
    expect(h.env._alloDecodeAlloPack).toHaveBeenCalledTimes(1);h.cleanup();finishDecode(JSON.stringify(built));await flush();
    expect(h.env._alloApplyAuthoritativeStudentAiPolicy).not.toHaveBeenCalled();expect(h.env.setHistory).not.toHaveBeenCalled();
    expect(h.env.setPendingQrAssignmentResource).not.toHaveBeenCalled();expect(h.env.setSharedHostedActivity).toHaveBeenCalledTimes(1);
    expect(h.env.addToast).not.toHaveBeenCalled();
  });
});
