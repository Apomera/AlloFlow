import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { buildLiveAacModule } = require('../_build_live_aac_module.js');
const source = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const aac = fs.readFileSync('live_aac_source.jsx', 'utf8');
const win = { React: {} };
new Function('window', fs.readFileSync('firestore_sync_module.js', 'utf8'))(win);
new Function('window', buildLiveAacModule(aac))(win);
const api = win.AlloModules.LiveAac;
const slice = (a,b) => source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const chunks = new Function(slice('function _alloPruneResChunks(', '// Non-trickle ICE:') + ';return { collect:_alloCollectResChunk, finish:_alloFinishResChunk, prune:_alloPruneResChunks };')();
const png = count => 'data:image/png;base64,' + 'A'.repeat(count);
const resource = image => ({ id:'picture',type:'image',title:'Leaf',data:{imageUrl:image,altText:'A green leaf'} });
afterEach(() => vi.useRealTimers());

describe('mailbox image preparation', () => {
  it('resizes a large inline picture before serialization and preserves the teacher original', async () => {
    const original=resource(png(6*1024*1024)),before=JSON.stringify(original),resizeImage=vi.fn(async()=>png(10000));
    const result=await api.prepareMailboxResource(original,{...win,resizeImage});
    expect(resizeImage).toHaveBeenCalledOnce();expect(result.resource.data.imageUrl).toBe(png(10000));
    expect(result.resource.data.altText).toBe('A green leaf');expect(result.report).toMatchObject({total:1,resized:1,omitted:0});
    expect(JSON.stringify(original)).toBe(before);
  });
  it('reports an oversized picture even when resizing fails', async()=>{
    const result=await api.prepareMailboxResource(resource(png(6*1024*1024)),{...win,resizeImage:async()=>{throw Error('canvas unavailable');}});
    expect(result.resource.data.imageUrl).toBeNull();expect(result.report).toMatchObject({omitted:1,tooLarge:1,resized:0});
    expect(api.mailboxResourceImages(result.resource)).toMatchObject({sources:[],omitted:1});
  });
  it('includes unsupported Memory Aid pictures in the omission report',async()=>{
    const result=await api.prepareMailboxResource({id:'aid',type:'memory-aid',data:{cards:[{visualImage:'blob:local',visualAlt:'A missing picture'}]}},win);
    expect(result.report).toMatchObject({total:1,omitted:1,unsupported:1});expect(result.resource.mailboxImageReport.omitted).toBe(1);expect(result.resource.data.cards[0].visualAlt).toBe('');
  });
  it('does not fetch remote images or resize small pictures during preparation',async()=>{
    const resizeImage=vi.fn();for(const image of [png(1000),'https://school.example/image.png'])await api.prepareMailboxResource(resource(image),{...win,resizeImage});
    expect(resizeImage).not.toHaveBeenCalled();
  });
  it('deduplicates resizing, preserves animation, and reports unsupported sources',async()=>{
    const large=png(1000000),resizeImage=vi.fn(async()=>png(1000));
    const result=await api.prepareMailboxResource({id:'glossary',type:'glossary',data:[{image:large},{image:large},{image:'blob:teacher-only'}]},{...win,resizeImage});
    expect(resizeImage).toHaveBeenCalledOnce();expect(result.report).toMatchObject({total:3,resized:2,omitted:1,unsupported:1});
    const factory=vi.fn();expect(await api.resizeMailboxImage('data:image/gif;base64,'+'A'.repeat(1000000),10000,{Image:factory})).toBeNull();expect(factory).not.toHaveBeenCalled();
  });
  it('leaves private evidence and recording parents out of image checks',()=>{
    const manifest=api.mailboxResourceImages({...resource(png(200)),karaokeStudentAudio:{imageUrl:png(300)},data:{imageUrl:png(200),originalImage:{imageUrl:png(400)}}});
    expect(manifest.sources).toEqual([png(200)]);
  });
});

describe('resource replay acknowledgment',()=>{
  const part=(rid='one',n=1,of=1,data='encoded')=>({kind:'res',rid,part:n,of,data});
  it('keeps a completed transfer pending until decoding succeeds, and retries the same id after failure',()=>{
    const store={parts:{},applied:new Set()};expect(chunks.collect(store,part())).toBe('encoded');
    expect(store.applied.size).toBe(0);expect(chunks.collect(store,part())).toBeNull();
    chunks.finish(store,'one',false);expect(chunks.collect(store,part())).toBe('encoded');
    chunks.finish(store,'one',true);expect(store.applied.has('one')).toBe(true);expect(chunks.collect(store,part())).toBeNull();
  });
  it('bounds automatic decoding attempts and expires abandoned chunks',()=>{
    vi.useFakeTimers();const store={parts:{},applied:new Set()};
    for(let i=0;i<3;i++){expect(chunks.collect(store,part())).toBe('encoded');chunks.finish(store,'one',false);}
    expect(chunks.collect(store,part())).toBeNull();chunks.collect(store,part('abandoned',1,2));
    vi.advanceTimersByTime(300001);chunks.prune(store);expect(Object.keys(store.parts)).toHaveLength(0);expect(Object.keys(store.failures)).toHaveLength(0);
  });
  it('bounds pending chunk streams and rejects impossible packets',()=>{
    const store={};for(let i=0;i<20;i++)chunks.collect(store,part('stream'+i,1,2));expect(Object.keys(store.parts)).toHaveLength(16);
    expect(chunks.collect(store,part('oversize',1,300))).toBeNull();expect(chunks.collect(store,part('too-big',1,1,'X'.repeat(93000)))).toBeNull();
  });
  const receiver=decode=>{
    const refs={store:{current:{parts:{},applied:new Set()}},history:{current:[]},cursor:{current:5}};
    const deps={useCallback:fn=>fn,mbChunkStoreRef:refs.store,mbStudentCursorRef:refs.cursor,_alloCollectResChunk:chunks.collect,_alloFinishResChunk:chunks.finish,_alloDecodeAlloPack:decode,_alloStudentSafeResources:items=>items.filter(x=>x?.id),setHistory:vi.fn(fn=>{refs.history.current=fn(refs.history.current);}),hydratedHistoryRef:refs.history,setPendingQrAssignmentResource:vi.fn(),setMbResourceReceiveError:vi.fn(),addToast:vi.fn(),warnLog:vi.fn()};
    return {...deps,refs,apply:new Function(...Object.keys(deps),slice('const applyMbDownPayload = useCallback(', 'const createHomeworkAssignmentLink = useCallback(')+';return applyMbDownPayload;')(...Object.values(deps))};
  };
  it('runs failed decode then successful replay through the real student applier',async()=>{
    const decode=vi.fn().mockRejectedValueOnce(Error('decode interruption')).mockResolvedValue(JSON.stringify(resource(png(100))));
    const h=receiver(decode);await h.apply(part());expect(h.setHistory).not.toHaveBeenCalled();expect(h.refs.cursor.current).toBe(0);
    await h.apply(part());expect(h.setHistory).toHaveBeenCalledOnce();expect(h.refs.store.current.applied.has('one')).toBe(true);expect(h.refs.history.current[0].data.imageUrl).toBe(png(100));
  });
  it('discards a pending decode after leaving the session',async()=>{
    let finish;const h=receiver(()=>new Promise(resolve=>{finish=resolve;}));const pending=h.apply(part());h.refs.store.current=null;finish(JSON.stringify(resource(png(100))));await pending;expect(h.setHistory).not.toHaveBeenCalled();
  });
});

describe('student image checks and teacher receipts',()=>{
  it('reports load failures and omitted images, then completes after retry',async()=>{
    const manifest={sources:[png(20),'https://school.example/missing.png'],omitted:1},onProgress=vi.fn();
    expect(await api.checkMailboxImages(manifest,{onProgress,loadImage:async s=>s.startsWith('data:')})).toEqual({status:'failed',ready:1,total:3,omitted:1});
    expect(onProgress.mock.calls[0][0].status).toBe('loading');
    expect(await api.checkMailboxImages({...manifest,omitted:0},{loadImage:async()=>true})).toMatchObject({status:'ready',ready:2,total:2});
  });
  it('limits concurrent image loads and stops starting them after cancellation',async()=>{
    const controller=new AbortController();let active=0,max=0;const release=[];
    const pending=api.checkMailboxImages({sources:Array.from({length:10},(_,i)=>String(i)),omitted:0},{signal:controller.signal,loadImage:()=>new Promise(resolve=>{active++;max=Math.max(max,active);release.push(()=>{active--;resolve(true);});})});
    expect(max).toBe(3);controller.abort();release.forEach(fn=>fn());await pending;expect(release).toHaveLength(3);
  });
  it('requires a matching current receipt before claiming pictures loaded',()=>{
    const receipt={version:1,resourceId:'picture',status:'ready',loaded:2,total:2,omitted:0,assignmentAt:100,at:200};
    const read=(changes={},resourceAt=100)=>api.mailboxImageReceiptState({entry:{imageDelivery:{...receipt,...changes}},resourceId:'picture',resourceAt,now:300});
    expect(read().status).toBe('ready');expect(read({resourceId:'old'}).status).toBe('waiting');expect(read({},250).status).toBe('waiting');expect(read({kind:'quiz'}).status).toBe('waiting');
    expect(read({status:'failed',loaded:1})).toMatchObject({retry:true,label:'Images missing 1/2'});
    expect(api.mailboxImageReceiptState({entry:{imageDelivery:{...receipt,status:'loading'}},resourceId:'picture',resourceAt:100,now:40000})).toMatchObject({status:'waiting',retry:true});
  });
});


describe('image progress capability on student devices', () => {
  it('uses the connected mailbox version without needing a teacher admin configuration', () => {
    const raw=slice('const canWriteLiveActivityProgress =', 'const summarizeLiveOrganizerProgress =');
    const window={location:{search:'?allo_mb=local'},__alloMailboxParticipantVersion:21};
    const allowed=new Function('window',raw+';return canWriteLiveActivityProgress;')(window);
    expect(allowed()).toBe(true);window.__alloMailboxParticipantVersion=18;expect(allowed()).toBe(false);
    delete window.__alloMailboxParticipantVersion;expect(allowed()).toBe(false);
    window.location.search='';expect(allowed()).toBe(true);
  });
  it('writes image counts to an independent participant-scoped receipt', async()=>{
    const writeToSession=vi.fn(async()=>{});
    const deps={useCallback:fn=>fn,mbStudent:{code:'ABC23'},isTeacherMode:false,activeSessionCode:'ABC23',user:{uid:'student'},activeSessionAppId:'test',appId:'test',canWriteMailboxImageDelivery:()=>true,normalizeMailboxImageDelivery:api.normalizeMailboxImageDelivery,doc:()=>({id:'session'}),db:{},writeToSession};
    const raw=slice('const reportMailboxImageProgress = useCallback(', 'const retryMailboxImagesForStudent = async');
    const report=new Function(...Object.keys(deps),raw+';return reportMailboxImageProgress;')(...Object.values(deps));
    await report({resourceId:'picture',status:'ready',ready:2,total:2,omitted:0,assignmentAt:123});
    expect(writeToSession).toHaveBeenCalledWith({id:'session'},{'roster.student.imageDelivery':expect.objectContaining({resourceId:'picture',status:'ready',loaded:2,total:2,omitted:0,assignmentAt:123})});
    expect(JSON.stringify(writeToSession.mock.calls)).not.toContain('data:image');
  });
});


describe('independent delivery receipts and failure actions', () => {
  const receipt = {version:1,resourceId:'picture',status:'ready',loaded:2,total:2,omitted:0,assignmentAt:100,at:200};
  it('keeps image status when activity progress changes, without using a legacy activity receipt', () => {
    const entry={imageDelivery:receipt,activityProgress:{kind:'quiz',status:'complete'}};
    expect(api.mailboxImageReceiptState({entry,resourceId:'picture',resourceAt:100}).status).toBe('ready');
    expect(api.mailboxImageReceiptState({entry:{activityProgress:{...receipt,kind:'resource_images'}},resourceId:'picture',resourceAt:100}).status).toBe('waiting');
  });
  it('matches the assignment nonce even when learner and teacher clocks differ', () => {
    const entry={imageDelivery:{...receipt,assignmentAt:100000,at:200}};
    expect(api.mailboxImageReceiptState({entry,resourceId:'picture',resourceAt:100000}).status).toBe('ready');
    expect(api.mailboxImageReceiptState({entry,resourceId:'picture',resourceAt:100001}).status).toBe('waiting');
  });
  it('requires mailbox v23 for the separate receipt and explains older deployments', () => {
    const raw=slice('const canWriteMailboxImageDelivery =', 'const canWriteLiveActivityProgress =');
    const window={__alloMailboxParticipantVersion:22};
    const allowed=new Function('window',raw+';return canWriteMailboxImageDelivery;')(window);
    expect(allowed()).toBe(false);window.__alloMailboxParticipantVersion=23;expect(allowed()).toBe(true);
    expect(api.mailboxImageReceiptState({mailboxVersion:22})).toMatchObject({status:'unavailable',retry:false,label:'Image status needs a mailbox update'});
  });
  it('only offers image retry when a failed load can recover', () => {
    expect(api.mailboxImageFailure({ready:2,total:3,omitted:1})).toMatchObject({retry:false,text:expect.stringContaining('replace or resize')});
    expect(api.mailboxImageFailure({ready:1,total:3,omitted:1})).toMatchObject({retry:true,text:expect.stringContaining('Check your connection')});
    expect(api.mailboxImageReceiptState({entry:{imageDelivery:{...receipt,status:'failed',loaded:1,omitted:1}},resourceId:'picture',resourceAt:100})).toMatchObject({retry:false,label:expect.stringContaining('replace or resize')});
  });
  it('rejects extra content, impossible counts and malformed timestamps', () => {
    for(const change of [{url:'https://private.test'},{total:100001},{loaded:3},{omitted:1},{at:NaN},{assignmentAt:-1},{resourceId:'bad.id'},{version:2},{status:'complete'},{at:Infinity}])expect(api.normalizeMailboxImageDelivery({...receipt,...change})).toBeNull();
  });
});

describe('interrupted and concurrent chunk streams', () => {
  const packet=(rid,part,data)=>({kind:'res',rid,part,of:3,data});
  it('assembles out-of-order and duplicated chunks exactly once after reconnect', () => {
    const store={parts:{},applied:new Set()};
    expect(chunks.collect(store,packet('one',2,'B'))).toBeNull();
    expect(chunks.collect(store,packet('one',2,'B'))).toBeNull();
    expect(chunks.collect(store,packet('one',3,'C'))).toBeNull();
    expect(chunks.collect(store,packet('one',1,'A'))).toBe('ABC');chunks.finish(store,'one',true);
    for(const [i,c]of ['A','B','C'].entries())expect(chunks.collect(store,packet('one',i+1,c))).toBeNull();
  });
  it('keeps overlapping transfers and three learner buffers independent', () => {
    const stores=Array.from({length:3},()=>({parts:{},applied:new Set()}));
    for(const store of stores){chunks.collect(store,packet('a',3,'C'));chunks.collect(store,packet('b',2,'Y'));}
    for(const store of stores){chunks.collect(store,packet('a',1,'A'));expect(chunks.collect(store,packet('a',2,'B'))).toBe('ABC');chunks.finish(store,'a',true);chunks.collect(store,packet('b',3,'Z'));expect(chunks.collect(store,packet('b',1,'X'))).toBe('XYZ');chunks.finish(store,'b',true);expect(store.applied.size).toBe(2);}
  });
});

describe('real mailbox receipt authorization', () => {
  const testSource=fs.readFileSync('tests/class_mailbox.test.js','utf8');
  const factory=testSource.slice(testSource.indexOf('function makeGsSandbox()'),testSource.indexOf("describe('Code.gs protocol"));
  const fresh=()=>new Function('gsSource',factory+';return makeGsSandbox();')(fs.readFileSync('apps_script/session_mailbox/Code.gs','utf8'));
  const receipt={version:1,resourceId:'picture',status:'ready',loaded:2,total:2,omitted:0,assignmentAt:100,at:200};
  const setup=()=>{const {call}=fresh(),admin=call({a:'claim'}).admin,c='ABC23',k='local_test_secret_123456';expect(call({a:'open',admin,c,k}).ok).toBe(true);const student=call({a:'join',c,k}),other=call({a:'join',c,k});expect(call({a:'dset',admin,c,p:'s',d:{roster:{[student.uid]:{uid:student.uid},[other.uid]:{uid:other.uid}}}}).ok).toBe(true);return{call,admin,c,student,other};};
  it('preserves image and activity receipts through independent student writes', () => {
    const {call,admin,c,student}=setup(),imagePath='roster.'+student.uid+'.imageDelivery',activityPath='roster.'+student.uid+'.activityProgress';
    const patch=u=>call({a:'dpatch',c,uid:student.uid,pt:student.pt,p:'s',u});
    expect(patch({[imagePath]:receipt}).ok).toBe(true);
    const activity={version:1,activityId:'quiz',kind:'quiz',status:'complete',completed:1,total:1,at:300};
    expect(patch({[activityPath]:activity}).ok).toBe(true);
    let entry=call({a:'dget',admin,c,ps:[{p:'s'}]}).docs[0].d.roster[student.uid];expect(entry.imageDelivery).toEqual(receipt);expect(entry.activityProgress).toEqual(activity);
    expect(patch({[imagePath]:{...receipt,at:400}}).ok).toBe(true);entry=call({a:'dget',admin,c,ps:[{p:'s'}]}).docs[0].d.roster[student.uid];expect(entry.activityProgress).toEqual(activity);
  });
  it('rejects forged peers, nested leaves and malformed delivery summaries', () => {
    const {call,c,student,other}=setup(),imagePath='roster.'+student.uid+'.imageDelivery';const patch=u=>call({a:'dpatch',c,uid:student.uid,pt:student.pt,p:'s',u});
    expect(patch({['roster.'+other.uid+'.imageDelivery']:receipt}).ok).toBe(false);
    expect(patch({[imagePath+'.loaded']:2}).ok).toBe(false);
    for(const change of [{url:'https://private.test'},{total:100001},{loaded:3},{omitted:1},{assignmentAt:-1},{at:0},{resourceId:'bad.id'},{status:'complete'}])expect(patch({[imagePath]:{...receipt,...change}}).ok).toBe(false);
  });
});
