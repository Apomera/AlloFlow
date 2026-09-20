import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { loadAlloModule } from './setup.js';
const source = readFileSync('AlloFlowANTI.txt','utf8');
const from = source.indexOf('  const hostPackOnMailboxRef = useRef(null);');
const to = source.indexOf('  const reportMailboxImageProgress =',from);
if (from < 0 || to < 0) throw Error('Missing actual host callback boundaries');
const region = source.slice(from,to);
let shared;
beforeAll(() => { window.React = require('../desktop/web-app/node_modules/react'); loadAlloModule('shared_activity_module.js'); shared = window.AlloModules.SharedActivity; });
function harness({ connected = true, oversize = false, currentPolicy = 'student-byok', activity = true, deferConnections = false } = {}) {
  const effects = [], sent = [], opened = [], toasts = [], states = [], connections = [];
  const connectedConfig = () => ({url:'https://mailbox.example.invalid',admin:'fixture-admin',v:13});
  const flush = async () => { for(let i=0;i<12;i++) await Promise.resolve(); };
  const resource = { id: 'selected', type: 'quiz', title: 'Saved reading check', data: [{question:'Original prepared question'}] };
  const deps = {
    resolveAssignmentResources: () => [resource], sharedAssignmentActivity: {enabled:activity,type:'word_cloud',prompt:'Unrelated new activity'},
    sourceTopic: '', generatedContent: null, homeworkExpiryDays:7, serializeResourceForStudentPack:item=>structuredClone(item),
    stripUndefined:value=>value, generateUUID:()=> 'fixed', studentAiPolicyForShare:currentPolicy, workStoryEnabled:false, encodeAlloPack:async text=>text,
    addToast: (...args) => toasts.push(args)
  };
  const build = vi.fn(options => shared.buildAssignmentPackEncoded(options,deps));
  const env = {
    useRef:current=>({current}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn),
    useState:initial=>{const cell={current:typeof initial==='function'?initial():initial};states.push(cell);return[cell.current,value=>{cell.current=typeof value==='function'?value(cell.current):value;}];},
    connectMailbox:vi.fn(()=>new Promise(resolve=>{
      const connection={resolve(config=connectedConfig()){if(config)env.mbConfig=config;effects.forEach(fn=>fn());resolve(config);}};
      connections.push(connection);if(!deferConnections)connection.resolve();
    })),
    mbConfig:connected?{url:'https://mailbox.example.invalid',admin:'fixture-admin',v:13}:{},
    sharedAssignmentActivity:deps.sharedAssignmentActivity, buildAssignmentPackEncoded:build,
    addToast:deps.addToast,warnLog:vi.fn(), setMbPanelOpen:vi.fn(),setMbBusy:vi.fn(),setMbUrlInput:vi.fn(),
    generateUUID:()=> 'pack',_alloRandomToken:()=> 'fixture-secret',_alloSplitPackChunks:text=>[text],
    _alloMailboxCall:vi.fn(async (url,payload)=>{sent.push(payload);return{ok:true};}),
    _buildAlloMailboxEntryUrl:()=> 'https://student.example.invalid/?allo_mbp=fixture',
    _buildAlloPackShareUrl:encoded=>'https://student.example.invalid/#allo_pack='+encoded,
    ALLO_QR_PACK_MAX_URL_CHARS:oversize?24:1000000,ALLO_QR_PACK_QR_MAX_CHARS:5000,
    copyToClipboard:vi.fn(),openQrShareModal:payload=>opened.push(payload)
  };
  const callbacks = new Function('env','with(env){'+region+';return {self:createSelfContainedHomeworkLink,host:hostPackOnMailbox,cancel:cancelPendingMailboxShare,close:closeMailboxSetup,connect:connectMailboxForSetup};}')(env);
  const cleanups=effects.map(fn=>fn()).filter(value=>typeof value==='function');
  return {callbacks,env,deps,resource,build,sent,opened,toasts,connections,flush,
    get pending(){return states[0]?.current;},
    unmount:()=>cleanups.forEach(fn=>fn()),
    connect:()=>callbacks.connect(),
    async rawConnect(){const result=await env.connectMailbox();await flush();return result;},
  };
}
describe('actual homework format conversion',()=>{
  it.each(['cancel','close'])('does not publish after %s and a later ordinary mailbox connection',async control=>{
    const h=harness({connected:false});await h.callbacks.host(['selected'],{includeSharedActivity:false});
    expect(h.pending).not.toBeNull();
    h.callbacks[control]();
    expect(h.pending).toBeNull();
    await h.rawConnect();
    await h.connect();
    expect(h.sent).toHaveLength(0);
    expect(h.opened).toHaveLength(0);
    if(control==='close')expect(h.env.setMbPanelOpen).toHaveBeenLastCalledWith(false);
  });
  it('does not auto-publish a pending share when ordinary connection state changes',async()=>{
    const h=harness({connected:false});await h.callbacks.host(['selected'],{includeSharedActivity:false});
    await h.rawConnect();
    expect(h.sent).toHaveLength(0);
    expect(h.pending).not.toBeNull();
    await h.connect();
    expect(h.sent).toHaveLength(1);
    expect(h.pending).toBeNull();
  });
  it('cancels a share while the explicit mailbox connection is still in flight',async()=>{
    const h=harness({connected:false,deferConnections:true});
    await h.callbacks.host(['selected'],{includeSharedActivity:false});
    const connecting=h.connect();await h.flush();
    expect(h.env.connectMailbox).toHaveBeenCalledTimes(1);
    h.callbacks.cancel();h.connections[0].resolve();await connecting;await h.flush();
    expect(h.pending).toBeNull();expect(h.sent).toHaveLength(0);expect(h.opened).toHaveLength(0);
  });
  it('cannot publish a newer queued assignment from a cancelled earlier connection',async()=>{
    const h=harness({connected:false,deferConnections:true});
    await h.callbacks.host(['selected'],{includeSharedActivity:false,aiPolicy:'off'});
    const first=h.connect();await h.flush();h.callbacks.cancel();
    h.resource.title='Assignment B';h.resource.data[0].question='Prepared B question';
    await h.callbacks.host(['selected'],{includeSharedActivity:false,aiPolicy:'student-byok'});
    expect(h.pending.title).toBe('Assignment B');
    h.connections[0].resolve();await first;await h.flush();
    expect(h.sent).toHaveLength(0);expect(h.pending.title).toBe('Assignment B');
    const second=h.connect();await h.flush();expect(h.env.connectMailbox).toHaveBeenCalledTimes(2);
    h.connections[1].resolve();await second;await h.flush();
    expect(h.sent).toHaveLength(1);expect(h.pending).toBeNull();
    const packet=JSON.parse(h.sent[0].data);
    expect(packet.title).toBe('Assignment B');expect(packet.aiPolicy.studentAi).toBe('student-byok');
    expect(packet.resources[0].data[0].question).toBe('Prepared B question');
  });
  it('coalesces duplicate setup-connect clicks and hosts the prepared packet once',async()=>{
    const h=harness({connected:false,deferConnections:true});
    await h.callbacks.host(['selected'],{includeSharedActivity:false});
    const first=h.connect(),second=h.connect();await h.flush();
    expect(h.env.connectMailbox).toHaveBeenCalledTimes(1);
    h.connections[0].resolve();await Promise.all([first,second]);
    expect(h.sent).toHaveLength(1);expect(h.build).toHaveBeenCalledTimes(1);expect(h.pending).toBeNull();
  });
  it('shows safe prepared title, count, policy and activity while setup waits',async()=>{
    const h=harness({connected:false,currentPolicy:'student-byok'});
    await h.callbacks.host(['selected'],{aiPolicy:'off'});
    expect(h.pending).toEqual({title:'Saved reading check',resourceCount:1,aiPolicy:'off',sharedActivityTitle:'Unrelated new activity',requiredMailboxVersion:11});
    expect(h.build).toHaveBeenCalledTimes(1);
    h.resource.title='Changed title';h.resource.data[0].question='Changed question';
    h.deps.sharedAssignmentActivity.prompt='Changed activity';h.deps.studentAiPolicyForShare='student-byok';
    await h.connect();
    expect(h.build).toHaveBeenCalledTimes(1);expect(h.pending).toBeNull();
    const packet=JSON.parse(h.sent[0].data);
    expect(packet.title).toBe('Saved reading check');expect(packet.resources[0].data[0].question).toBe('Original prepared question');
    expect(packet.aiPolicy.studentAi).toBe('off');expect(packet.sharedActivities[0].prompt).toBe('Unrelated new activity');
  });
  it.each([false,true])('cancels a delayed host build before a queue or external write (connected=%s)',async connected=>{
    const h=harness({connected});
    const build=h.build.getMockImplementation();let finishBuild;
    const gate=new Promise(resolve=>{finishBuild=resolve;});
    h.build.mockImplementationOnce(async options=>{await gate;return build(options);});
    const preparing=h.callbacks.host(['selected'],{includeSharedActivity:false});await h.flush();
    h.callbacks.cancel();finishBuild();await preparing;
    expect(h.pending).toBeNull();expect(h.sent).toHaveLength(0);expect(h.opened).toHaveLength(0);
    expect(h.env.setMbPanelOpen).not.toHaveBeenCalled();
  });
  it.each([
    {oversize:false,control:'close'}, {oversize:true,control:'close'},
    {oversize:false,control:'unmount'}, {oversize:true,control:'unmount'},
  ])('does not resurrect a delayed self-contained build after $control (oversize=$oversize)',async({oversize,control})=>{
    const h=harness({connected:false,oversize});
    const build=h.build.getMockImplementation();let finishBuild;
    const gate=new Promise(resolve=>{finishBuild=resolve;});
    h.build.mockImplementationOnce(async options=>{const prepared=build(options);await gate;return prepared;});
    const preparing=h.callbacks.self(['selected'],{aiPolicy:'off'});await h.flush();
    if(control==='close')h.callbacks.close();else h.unmount();
    finishBuild();expect(await preparing).toBeNull();
    expect(h.pending).toBeNull();expect(h.sent).toHaveLength(0);expect(h.opened).toHaveLength(0);
    expect(h.env.setMbPanelOpen).not.toHaveBeenCalledWith(true);
    expect(h.env.copyToClipboard).not.toHaveBeenCalled();
  });
  it('does not let an older self-contained preparation supersede a newer hosted assignment',async()=>{
    const h=harness({oversize:true});
    const build=h.build.getMockImplementation();let finishBuild;
    const gate=new Promise(resolve=>{finishBuild=resolve;});
    h.build.mockImplementationOnce(async options=>{const prepared=build(options);await gate;return prepared;});
    const older=h.callbacks.self(['selected'],{aiPolicy:'off'});await h.flush();
    h.resource.title='Newer assignment';h.resource.data[0].question='Newer prepared question';
    await h.callbacks.host(['selected'],{includeSharedActivity:false,aiPolicy:'student-byok'});
    finishBuild();expect(await older).toBeNull();
    expect(h.build).toHaveBeenCalledTimes(2);expect(h.sent).toHaveLength(1);expect(h.opened).toHaveLength(1);
    expect(h.opened[0].title).toBe('Newer assignment');expect(h.opened[0].aiPolicy).toBe('student-byok');
    expect(JSON.parse(h.sent[0].data).resources[0].data[0].question).toBe('Newer prepared question');
    expect(h.pending).toBeNull();
  });
  it('clears busy state when cancellation supersedes an upload that subsequently fails',async()=>{
    const h=harness();let rejectUpload;
    h.env._alloMailboxCall.mockImplementationOnce(()=>new Promise((_resolve,reject)=>{rejectUpload=reject;}));
    const hosting=h.callbacks.host(['selected'],{includeSharedActivity:false});await h.flush();
    expect(h.env._alloMailboxCall).toHaveBeenCalledTimes(1);
    expect(h.env.setMbBusy).toHaveBeenLastCalledWith(true);
    h.callbacks.cancel();rejectUpload(new Error('Connection lost during upload'));
    expect(await hosting).toBeNull();
    expect(h.env.setMbBusy).toHaveBeenLastCalledWith(false);
    expect(h.opened).toHaveLength(0);
    expect(h.toasts.at(-1)).toEqual(['Could not host on the mailbox: Connection lost during upload','error']);
  });
  it('invalidates a pending connection when its host component unmounts',async()=>{
    const h=harness({connected:false,deferConnections:true});
    await h.callbacks.host(['selected'],{includeSharedActivity:false});
    const connecting=h.connect();await h.flush();h.unmount();
    h.connections[0].resolve();await connecting;await h.flush();
    expect(h.sent).toHaveLength(0);expect(h.opened).toHaveLength(0);
  });
  it('retains pending recovery when mailbox verification fails and publishes only after a later success',async()=>{
    const h=harness({connected:false,deferConnections:true});
    await h.callbacks.host(['selected'],{includeSharedActivity:false});
    const failed=h.connect();await h.flush();h.connections[0].resolve(null);await failed;
    expect(h.sent).toHaveLength(0);expect(h.pending).not.toBeNull();
    const retry=h.connect();await h.flush();h.connections[1].resolve();await retry;
    expect(h.sent).toHaveLength(1);expect(h.pending).toBeNull();expect(h.build).toHaveBeenCalledTimes(1);
  });
  it.each(['off','student-byok'])('retains saved %s policy for self-contained conversion',async saved=>{
    const h=harness({currentPolicy:saved==='off'?'student-byok':'off'});
    await h.callbacks.self(['selected'],{aiPolicy:saved});
    expect(h.opened[0].aiPolicy).toBe(saved);
    expect(h.build).toHaveBeenCalledWith(expect.objectContaining({aiPolicy:saved}));
  });
  it('does not attach the currently authored activity or require its newer mailbox version during conversion',async()=>{
    const h=harness();h.env.mbConfig.v=9;h.deps.sharedAssignmentActivity.type='survey';
    await h.callbacks.host(['selected'],{includeSharedActivity:false,aiPolicy:'off'});
    expect(h.sent).toHaveLength(1);
    const packet=JSON.parse(h.sent[0].data);
    expect(packet.sharedActivities).toBeUndefined();expect(packet.aiPolicy.studentAi).toBe('off');
    expect(h.opened[0].sharedActivity).toBeNull();expect(h.opened[0].researchMeta).toBeNull();
  });
  it('keeps the current AI default for a new link and fails closed for an invalid saved policy',async()=>{
    const h=harness({currentPolicy:'student-byok'});await h.callbacks.self(['selected']);expect(h.opened[0].aiPolicy).toBe('student-byok');
    await h.callbacks.self(['selected'],{aiPolicy:'invalid'});expect(h.opened[1].aiPolicy).toBe('off');
  });
  it('refuses an expired prepared packet before setup or upload',async()=>{
    const h=harness({connected:false});await h.callbacks.host(['selected'],{preparedPack:{encoded:'expired',sharedActivities:[],expiresAt:'2000-01-01T00:00:00Z'}});
    expect(h.sent).toHaveLength(0);expect(h.build).not.toHaveBeenCalled();expect(h.env.setMbPanelOpen).not.toHaveBeenCalled();
    expect(h.toasts.at(-1)[0]).toContain('fresh link');
  });
  it('still includes the requested current activity for ordinary new hosting',async()=>{
    const h=harness();await h.callbacks.host(['selected']);
    expect(JSON.parse(h.sent[0].data).sharedActivities[0].prompt).toBe('Unrelated new activity');
  });
  it('hosts the already encoded oversized packet once without adding the current activity',async()=>{
    const h=harness({oversize:true});await h.callbacks.self(['selected'],{aiPolicy:'off'});
    expect(h.build).toHaveBeenCalledTimes(1);expect(h.sent).toHaveLength(1);
    const packet=JSON.parse(h.sent[0].data);expect(packet.aiPolicy.studentAi).toBe('off');expect(packet.sharedActivities).toBeUndefined();
    expect(packet.resources[0].data[0].question).toBe('Original prepared question');
  });
  it('keeps prepared content and policy while mailbox setup completes',async()=>{
    const h=harness({connected:false,oversize:true});await h.callbacks.self(['selected'],{aiPolicy:'off'});
    expect(h.sent).toHaveLength(0);h.resource.data[0].question='Changed after preparing';h.deps.studentAiPolicyForShare='student-byok';
    await h.connect();expect(h.sent).toHaveLength(1);expect(h.build).toHaveBeenCalledTimes(1);
    const packet=JSON.parse(h.sent[0].data);expect(packet.resources[0].data[0].question).toBe('Original prepared question');expect(packet.aiPolicy.studentAi).toBe('off');
    await h.connect();expect(h.sent).toHaveLength(1);
  });
  it('keeps explicit conversion options while mailbox setup completes',async()=>{
    const h=harness({connected:false});await h.callbacks.host(['selected'],{includeSharedActivity:false,aiPolicy:'off'});
    await h.connect();expect(h.sent).toHaveLength(1);expect(JSON.parse(h.sent[0].data).sharedActivities).toBeUndefined();expect(h.opened[0].aiPolicy).toBe('off');
  });
});
