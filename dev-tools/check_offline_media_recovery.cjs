// Disposable real-browser verification. No deployed app, keys, or user profile.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const script = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/<\/script/gi, '<\\/script');
function wave() {
  const frames = 800, bytes = Buffer.alloc(44 + frames * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(frames * 2, 40);
  for (let n = 0; n < frames; n++) bytes.writeInt16LE(Math.round(2000 * Math.sin(n * 2 * Math.PI * 440 / 8000)), 44 + n * 2);
  return bytes.toString('base64');
}
const modules = ['karaoke_audio_store_module.js', 'read_aloud_audio_service_module.js'];
const html = '<!doctype html><meta charset="utf-8"><title>Offline media fixture</title>' + modules.map(name => '<script>' + script(name) + '</script>').join('');
const fixture = {
  id: 'disposable-reading', type: 'simplified', parts: [{ id: 'one', text: 'First sentence.' }, { id: 'two', text: 'Second sentence.' }],
  image: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="green"/></svg>').toString('base64')
};
const runtime = `
window.fixtureIdentity = part => ({identityVersion:4,adapterId:'offline-fixture',adapterVersion:1,scopeId:'main',segmentId:part.id,spokenText:part.text});
window.makeService = resource => {
  const store = AlloModules.KaraokeAudioStore.createStore();
  if (resource.karaokeAudio) store.hydrate(resource.karaokeAudio);
  const service = AlloModules.createReadAloudAudioService({ getStoreModule: () => store, getResource: () => resource,
    getSynthesisProfile: () => ({voice:'Kore', language:'English', synthesisRate:1, voiceResolverVersion:2}),
    synthesize: async () => { window.synthesisCalls=(window.synthesisCalls||0)+1; throw new Error('Network synthesis forbidden in recipient'); }
  }).forResource({resourceId:resource.id, resourceType:resource.type, adapter:{enumerate:r=>r.parts,spokenText:p=>p.text,fields:p=>({segmentId:p.id,storageKey:fixtureIdentity(p)})}});
  return {store,service};
};
window.checkMedia = async resource => {
  const {store,service}=makeService(resource), context=new AudioContext();
  const durations=[];
  for(const part of resource.parts) {
    const url=await service.resolve(part.id);
    const response=await fetch(url);
    durations.push((await context.decodeAudioData(await response.arrayBuffer())).duration);
  }
  await context.close();
  const picture=new Image(); picture.src=resource.image; await picture.decode();
  window.fixtureStore=store; window.fixtureService=service;
  return {ready:service.summary().ready,durations,pictureWidth:picture.naturalWidth,synthesisCalls:window.synthesisCalls||0};
};`;

(async () => {
  let browser, server;
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-offline-media-'));
  try {
    server = http.createServer((_request, response) => { response.setHeader('Content-Type', 'text/html'); response.end(html + '<script>' + runtime + '</script>'); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/`;
    browser = await chromium.launch({ headless: true });
    const authorContext = await browser.newContext(), author = await authorContext.newPage();
    await author.goto(url);
    const prepared = await author.evaluate(async ({fixture, wave}) => {
      const {store}=makeService(fixture);
      for(const part of fixture.parts) store.put(fixtureIdentity(part),wave,'audio/wav','ai-generated',{voice:'Kore',language:'English',synthesisRate:1,voiceResolverVersion:2});
      fixture.karaokeAudio=store.serialize();
      const database=await new Promise((resolve,reject)=>{const request=indexedDB.open('disposable-media',1);request.onupgradeneeded=()=>request.result.createObjectStore('items');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
      await new Promise((resolve,reject)=>{const tx=database.transaction('items','readwrite');tx.objectStore('items').put(fixture,'reading');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
      database.close(); return fixture;
    }, { fixture, wave: wave() });
    // Reload destroys the first store and every old object URL.
    await author.reload();
    const reloadResult = await author.evaluate(async () => {
      const database=await new Promise((resolve,reject)=>{const request=indexedDB.open('disposable-media',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
      const resource=await new Promise((resolve,reject)=>{const request=database.transaction('items').objectStore('items').get('reading');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
      database.close(); return checkMedia(resource);
    });
    await authorContext.close();
    const portable = path.join(temporary, 'reading.html');
    fs.writeFileSync(portable, html + '<script>' + runtime + '\nwindow.resource=' + JSON.stringify(prepared).replace(/</g,'\\u003c') + ';</script><button id="play">Play prepared sentence</button><script>document.querySelector("#play").onclick=async()=>{const audio=new Audio(await fixtureService.resolve("one"));window.fixtureAudio=audio;audio.onended=()=>window.played=true;await audio.play();};</script>');
    const recipientContext = await browser.newContext({ offline: true }), recipient = await recipientContext.newPage();
    const networkRequests=[];
    recipient.on('request',request=>{if(/^https?:/.test(request.url())) networkRequests.push(request.url());});
    await recipient.goto(pathToFileURL(portable).href);
    const recipientResult = await recipient.evaluate(() => checkMedia(resource));
    await recipient.click('#play'); await recipient.waitForFunction(() => window.played === true);
    await recipient.reload();
    const recipientReload = await recipient.evaluate(() => checkMedia(resource));
    if ([reloadResult,recipientResult,recipientReload].some(result=>result.ready!==2 || result.synthesisCalls!==0 || result.pictureWidth!==16 || result.durations.some(duration=>duration<=0)) || networkRequests.length) throw new Error('Offline recipient verification failed');
    const report = { status:'passed', reloadResult, recipientResult, recipientReload, actualPlayback:true, networkRequests,
      scope:'Disposable IndexedDB reload and self-contained fixture in a fresh offline recipient context; not deployed-app or all-route certification.' };
    const output = path.join(root,'reports','offline-media-recovery'); fs.mkdirSync(output,{recursive:true});
    fs.writeFileSync(path.join(output,'browser-verification.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
    await recipientContext.close();
  } finally {
    if(browser) await browser.close();
    if(server) await new Promise(resolve=>server.close(resolve));
    // Delete only this process's mkdtemp fixture directory after browser shutdown.
    if(path.dirname(temporary)===os.tmpdir() && path.basename(temporary).startsWith('alloflow-offline-media-')) fs.rmSync(temporary,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
