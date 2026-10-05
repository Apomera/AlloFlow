'use strict';
// Current generated handler + current recovery helpers, without a Vitest worker.
// Builder/storage replies are controlled boundaries; encryption is not certified.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const host=read('AlloFlowANTI.txt');
function section(start,end){const a=host.indexOf(start),b=host.indexOf(end,a);assert(a>=0&&b>a&&host.split(start).length===2);return host.slice(a,b);}
const recovery=new Function('window',section('const ALLO_WORKSPACE_RECOVERY = (() => {','\n\nconst _alloGetCanvasDeviceStorage')+'\nreturn ALLO_WORKSPACE_RECOVERY;')({});
const states={wordSoundsHistory:[{word:'pond',activity:'blend'}],wordSoundsFamilies:[],wordSoundsAudioLibrary:{},wordSoundsBadges:[],phonemeMastery:{},wordSoundsConfusionPatterns:[],wordSoundsDailyProgress:{date:'2026-10-03',completed:0,goalMet:false},wordSoundsScore:{correct:0,total:0,streak:0}};
const predicate=new Function('states','with(states){'+section('  const hasMeaningfulWordSoundsWorkspace =','  const buildCanvasWorkspaceSnapshot =')+'\nreturn hasMeaningfulWordSoundsWorkspace;}')(states);
const before=JSON.stringify(states),events=[],errors=[];
const controller={async upsertSnapshot(){events.push('write');throw Error('Controlled storage failure');},lock(){events.push('lock');},async getStatus(){return {enabled:true,locked:true};}};
const deps={history:[],units:[],profiles:[],studentResponses:{},inputText:'',sourceTopic:'',guidedPlanBrief:null,
 canvasRecoveryVaultControllerRef:{current:controller},canvasRecoveryMutationInProgressRef:{current:false},canvasRecoverySaveTokenRef:{current:0},canvasRecoveryWriteQueueRef:{current:Promise.resolve()},canvasRecoveryCurrentIdRef:{current:'word-only'},canvasRecoveryPendingSaveCountRef:{current:0},canvasRecoveryDecisionMade:true,
 hasMeaningfulWordSoundsWorkspace:predicate,ALLO_WORKSPACE_RECOVERY:recovery,
 async buildCanvasWorkspaceSnapshot(id){events.push('build');return {version:recovery.VERSION,id,createdAt:new Date().toISOString(),savedAt:new Date().toISOString(),workspace:{history:[],inputText:'',sourceTopic:'',wordSoundsState:{history:states.wordSoundsHistory}}};},
 queueCanvasRecoveryStorage:operation=>operation(),setCanvasRecoveryBusyId:value=>events.push(['busy',value]),setCanvasRecoveryError:value=>errors.push(value),
 clearCanvasWorkspaceState(){events.push('clear');},publishCanvasRecoveryVaultLockedState(){events.push('publish-locked');},setLastSaved(){},setPendingSync(){},clearCanvasRecoveryVaultSecrets(){},setCanvasRecoveryDialogMode(){},};
const window={React:{},AlloModules:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'host_handlers_module.js'),'utf8'),{window,console,structuredClone,setTimeout,clearTimeout,Date});
(async()=>{
 await window.AlloModules.HostHandlers(deps).lockCanvasRecoveryVault();
 assert(events.includes('build'));assert(events.includes('write'));
 assert(!events.some(event=>['lock','clear','publish-locked'].includes(event)));
 assert.equal(JSON.stringify(states),before);assert.equal(deps.canvasRecoveryMutationInProgressRef.current,false);
 assert.deepEqual(events.at(-1),['busy',null]);assert(errors.some(value=>value.includes('Controlled storage failure')));
 const report={passed:true,completedAt:new Date().toISOString(),actualGeneratedHandler:true,actualWordPredicate:true,actualQuotaFallback:true,builderAndWriteAttempted:true,preservedWorkspace:true,lockAndClearBlocked:true,guardsReleased:true,controlledBoundaries:['builder snapshot','storage rejection']};
 fs.writeFileSync(path.join(__dirname,'vault-write-failure.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1;});
