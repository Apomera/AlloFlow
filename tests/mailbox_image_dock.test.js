import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react');
const {createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {buildLiveAacModule}=require('../_build_live_aac_module.js'),{buildFirstWaveModule}=require('../_build_first_wave_view_modules.js');
const source=readFileSync('view_live_session_dock_source.jsx','utf8');
let api,Dock,root,host;
const image=n=>'data:image/png;base64,'+'A'.repeat(n);
const resource=value=>({id:'picture',type:'image',title:'A leaf',data:{imageUrl:value}});
beforeAll(()=>{
 window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 new Function(readFileSync('firestore_sync_module.js','utf8'))();
 new Function(buildLiveAacModule(readFileSync('live_aac_source.jsx','utf8')))();
 new Function(buildFirstWaveModule('LiveSessionDockView',source))();
 api=window.AlloModules.LiveAac;Dock=window.AlloModules.LiveSessionDockView;
});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;host?.remove();host=null;});
function props(extra){
 const base={t:()=>null,history:[],sessionData:{roster:{}},rosterEntries:{student:{name:'Learner',viewingResourceId:'picture'}},activeSignals:[],activeSessionCode:'ABCDE',activeSessionAppId:'fixture',_alloMbBridgeActive:()=>true,_alloStudentSafeResources:h=>h||[],liveDockPanelRef:React.createRef(),getFilteredHistory:()=>[],dockCardStyle:{},dockGroupLabel:{},dockNow:300,recentHavenRecognition:[],liveOrganizerSummary:null,retryableLiveOrganizerUids:[],CLASS_GOAL_TEMPLATES:[],ALLOHAVEN_CLASSROOM_REWARD_REASONS:[],ALLOHAVEN_RECOGNITION_CAPS:[],TEACHER_ONLY_TYPES:[],liveActivitySnapshots:{},livePresenterCuesByResourceId:{},checklistMarks:{},havenRecognitionConfig:{},havenRewardDraftsRef:{current:{}},mailboxImageVersion:23,resolveLiveStudentResourceTarget:()=>({resourceId:'picture',resourceAt:100}),...extra};
 for(const name of /const \{([^}]*)\} = props;/.exec(source)[1].split(',').map(s=>s.trim()))if(!(name in base))base[name]=/^(normalize|get|handle|set|resolve|classify|evaluate|format|retry|launch|open|broadcast|summarize|update|toggle|clear|signal|build|record|_allo)/.test(name)?()=>[]:undefined;
 return base;
}
function render(value){if(!root){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);}act(()=>root.render(React.createElement(Dock,value)));}
function receipt(prepared,status='ready'){
 const manifest=api.mailboxResourceImages(prepared),total=manifest.sources.length+manifest.omitted;
 return{version:1,resourceId:api.mailboxImageReceiptId('picture',manifest.revision),status,loaded:status==='ready'?total:0,total,omitted:manifest.omitted,assignmentAt:100,at:200};
}
describe('teacher image status follows prepared resources',()=>{
 it('shows omissions after preparation completes without changing History or the getter',async()=>{
  const original={id:'picture',type:'memory-aid',data:{cards:[{visualImage:'blob:teacher-only'}]}},history=[original];let prepared=null;
  const value=props({history,getPreparedMailboxResource:()=>prepared});render(value);
  expect(host.textContent).not.toContain('omitted: replace or resize');
  prepared=(await api.prepareMailboxResource(original,window)).resource;
  value.rosterEntries={student:{name:'Learner',imageDelivery:receipt(prepared,'failed')}};render({...value});
  expect(host.textContent).toContain('1 omitted: replace or resize in the pack');
 });
 it('does not show a waiting image receipt for a prepared payload containing no pictures or omissions',()=>{
  const original=resource(image(100)),prepared=resource(null);
  render(props({history:[original],getPreparedMailboxResource:()=>prepared}));
  expect(host.textContent).not.toContain('Images: awaiting device');
  expect(host.querySelector('button[aria-label="Retry images for Learner"]')).toBeNull();
 });
 it('requires the current prepared revision and does not trust the original while preparation is missing',()=>{
  const original=resource(image(100)),history=[original];let prepared=original;
  const value=props({history,getPreparedMailboxResource:()=>prepared,rosterEntries:{student:{name:'Learner',imageDelivery:receipt(original)}}});render(value);
  expect(host.textContent).toContain('Images loaded 1/1');
  prepared=resource(image(200));render({...value});expect(host.textContent).toContain('Images: awaiting device');
  prepared=null;render({...value});expect(host.textContent).not.toContain('Images loaded 1/1');
 });
});


describe('teacher dock retry session boundaries',()=>{
 for(const changed of [{activeSessionCode:'FGHIJ'},{activeSessionAppId:'other-school'}])it('resets a pending retry when '+Object.keys(changed)[0]+' changes',async()=>{
  const original=resource(image(100));let reject;
  const pending=new Promise((_,no)=>{reject=no;});
  const value=props({history:[original],getPreparedMailboxResource:()=>original,retryMailboxImagesForStudent:vi.fn(()=>pending)});
  render(value);const retry=()=>host.querySelector('button[aria-label="Retry images for Learner"]');
  act(()=>retry().click());expect(retry().disabled).toBe(true);
  expect(value.retryMailboxImagesForStudent).toHaveBeenCalledWith('student','picture');
  render({...value,...changed});expect(retry().disabled).toBe(false);
  await act(async()=>{reject(Error('Old session failed'));await Promise.resolve();});
  expect(host.textContent).not.toContain('Could not resend');expect(retry().disabled).toBe(false);
 });
});
