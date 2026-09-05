import { readFileSync } from 'node:fs';
import { vi } from 'vitest';
const source=readFileSync('AlloFlowANTI.txt','utf8');
function between(start,end,from=0){const a=source.indexOf(start,from),b=source.indexOf(end,a);if(a<0||b<=a)throw Error(start);return source.slice(a,b);}
export const createCoordinator=new Function(between('function createLiveSessionHydrationCoordinator(', 'function createLiveSessionRetryController(')+';return createLiveSessionHydrationCoordinator;')();
export const createConnectionRecovery=new Function(between('function createLiveSessionConnectionRecovery(', 'function createLiveSessionHydrationCoordinator(')+';return createLiveSessionConnectionRecovery;')();
export function makeHydrationHarness(options={}) {
 const refs={liveResourceHydrationAttemptsRef:{current:{signature:'',count:0}},liveResourceHydrationRetryTimerRef:{current:null},lastResourcesStringRef:{current:null},lastPackRefRef:{current:null},hydratedHistoryRef:{current:[{id:'old',type:'quiz'}]}};
 let status={status:'idle',attempt:0};
 const clearHydrationRetry=()=>{if(refs.liveResourceHydrationRetryTimerRef.current)clearTimeout(refs.liveResourceHydrationRetryTimerRef.current);refs.liveResourceHydrationRetryTimerRef.current=null;};
 const coordinator=createCoordinator({attemptsRef:refs.liveResourceHydrationAttemptsRef,onSourceChange:clearHydrationRetry});
 const connectionState={current:{sessionKey:'fixture',attempt:0,blocked:false,status:'connected'}};
 const connectionStates=[];
 const epoch=vi.fn(),history=vi.fn(),mailbox=options.mailbox||vi.fn(async()=>({of:1,data:JSON.stringify({kind:'assignment',resources:[]})}));
 const connectionRecovery=createConnectionRecovery({stateRef:connectionState,sessionKey:'fixture',onState:s=>connectionStates.push(s),reconnect:epoch});
 connectionRecovery.connected();
 const values={connectionRecovery,liveSessionConnectionAttemptsRef:connectionState,liveSessionConnectionRecoveryRef:{current:connectionRecovery},...refs,hydrationCoordinator:coordinator,clearHydrationRetry,setLiveResourceRetryEpoch:epoch,setLiveResourceLoadState:vi.fn(s=>{status=s;}),setHistory:history,activeSessionAppId:'app',activeSessionCode:'session',hydrateSessionAssets:options.hydrate||vi.fn(async(_app,resources)=>resources),_alloMbBridgeActive:()=>true,_alloMbBridgeState:{url:'local-fixture'},_alloMailboxCall:mailbox,_alloDecodeAlloPack:async s=>s,_alloStudentSafeResources:items=>items.filter(r=>r&&r.id&&r.type!=='lesson-plan'),_alloSessionSyncTrace:vi.fn(),warnLog:vi.fn(),isTeacherMode:false};
 const retrySource=between('      const scheduleHydrationRetry = attempt => {','      window.addEventListener(\'online\', retryHydrationOnNetworkReturn);');
 const retryApi=new Function(...Object.keys(values),retrySource+';return {scheduleHydrationRetry,retryHydrationOnNetworkReturn};')(...Object.values(values));
 Object.assign(values,retryApi);
 const snapshot=source.indexOf('      const unsubscribe = onSnapshot(sessionRef, async (docSnap) => {');
 const body=between('                  let resourcesToRender = [];','                  if (!isCurrentSnapshot()) return;\n                  if (data.bridgePayload',snapshot);
 const receive=new Function(...Object.keys(values),'return async data=>{const isCurrentSnapshot=hydrationCoordinator.beginSnapshot();'+body+';return resourcesToRender;};')(...Object.values(values));
 // Execute the host's real cleanup body, including its retry and listener cleanup.
 const cleanupStart=source.lastIndexOf('      return () => {',source.indexOf('          debugLog("Session Sync: Cleaning up listener.");',snapshot));
 const cleanupEnd=source.indexOf('  }, [activeSessionCode, isTeacherMode, user, activeSessionAppId, liveResourceRetryEpoch]);',cleanupStart);
 const cleanupValues={...values,window:{removeEventListener:vi.fn()},debugLog:vi.fn(),unsubscribe:vi.fn(),sessionUnsubscribeRef:{current:()=>{}}};
 const cleanup=new Function(...Object.keys(cleanupValues),source.slice(cleanupStart,cleanupEnd))(...Object.values(cleanupValues));
 const lifecycleValues={...cleanupValues,hasConnectedRef:{current:true},setActiveSessionCode:vi.fn(),setSessionData:vi.fn(),_alloDisconnectStudentAi:vi.fn(),addToast:vi.fn(),t:key=>key};
 const terminal=between("              if (data && (data.isActive === false || data.status === 'ended')) {",'              if (!hasConnectedRef.current)',snapshot);
 const endSession=new Function(...Object.keys(lifecycleValues),'return data=>{'+terminal+'};')(...Object.values(lifecycleValues));
 const errorStart=source.indexOf('      }, (err) => {',snapshot)+'      }, (err) => {'.length;
 const errorEnd=source.indexOf('      });\n      sessionUnsubscribeRef.current = unsubscribe;',errorStart);
 const onError=new Function(...Object.keys(lifecycleValues),'return err=>{'+source.slice(errorStart,errorEnd)+'};')(...Object.values(lifecycleValues));
 return {connectionRecovery,connectionState,connectionStates,receive,cleanup,endSession,onError,lifecycleValues,coordinator,refs,history,mailbox,epoch,status:()=>status,hydrate:values.hydrateSessionAssets,wake:retryApi.retryHydrationOnNetworkReturn,loadState:values.setLiveResourceLoadState};
}
