const fs=require('fs'),path=require('path'),assert=require('assert');const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports/karaoke-tts-review');fs.mkdirSync(OUT,{recursive:true});
const host=fs.readFileSync(path.join(ROOT,'AlloFlowANTI.txt'),'utf8').replace(/\r\n/g,'\n');
const start=host.indexOf('  const _encodeReadAloudBridgeAudio ='),end=host.indexOf('  const _getReadAloudBridge',start);
const encoderSource=host.slice(start,end)+'\nreturn _encodeReadAloudBridgeAudio;';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<!doctype html><title>Karaoke audio verification</title>');
  for(const file of ['lame.min.js','audio_helpers_module.js','read_aloud_audio_service_module.js','karaoke_audio_store_module.js'])await page.addScriptTag({path:path.join(ROOT,file)});
  const results=await page.evaluate(async encoderSource=>{
   const toBase64=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
   const encode=new Function('_fetchKaraokeCaptureBuffer','_encodeKaraokeMp3','_blobToBase64','_normalizeRecordedAudioForStore',encoderSource)(
    async url=>(await fetch(url)).arrayBuffer(),
    (pcm,rate,kbps)=>AlloModules.AudioHelpers.pcmToMp3Async(pcm,rate,kbps),
    toBase64,
    async blob=>({b64:await toBase64(blob),mime:blob.type}),
   );
   const context=new AudioContext(),results=[];
   try{
    for(const sampleRate of [16000,22050,24000,44100]){
     const frames=sampleRate*2,offset=58,bytes=new Uint8Array(offset+frames*2),view=new DataView(bytes.buffer);
     const ascii=(index,s)=>{for(let i=0;i<s.length;i++)bytes[index+i]=s.charCodeAt(i);};
     ascii(0,'RIFF');view.setUint32(4,bytes.length-8,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);
     view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
     ascii(36,'JUNK');view.setUint32(40,5,true);ascii(44,'notes');ascii(50,'data');view.setUint32(54,frames*2,true);
     for(let i=0;i<frames;i++)view.setInt16(offset+i*2,Math.round(12000*Math.sin(i*2*Math.PI*440/sampleRate)),true);
     const original=new Blob([bytes],{type:'audio/wav'}),url=URL.createObjectURL(original);
     const encoded=await encode(url);URL.revokeObjectURL(url);
     const store=AlloModules.KaraokeAudioStore.createStore();
     store.put('A checked recording.',encoded.b64,encoded.mime,'ai-played',{voice:'Kore',speed:1,language:'English',voiceResolverVersion:2});
     const saved=JSON.parse(JSON.stringify(store.serialize()));
     const restored=AlloModules.KaraokeAudioStore.createStore();restored.hydrate(saved);
     const playable=restored.get('A checked recording.');
     if(!playable)throw Error('Saved MP3 did not hydrate');
     const decoded=await context.decodeAudioData(await (await fetch(playable)).arrayBuffer());
     const samples=decoded.getChannelData(0),begin=Math.round(.25*decoded.sampleRate),stop=Math.round(1.75*decoded.sampleRate);
     let crossings=0;for(let i=begin+1;i<stop;i++)if(samples[i-1]<=0&&samples[i]>0)crossings++;
     results.push({sourceRate:sampleRate,sourceDuration:2,savedMime:encoded.mime,decodedDuration:decoded.duration,frequencyHz:crossings/1.5,originalBytes:bytes.length,savedBytes:Math.floor(encoded.b64.length*3/4),reloaded:true});
    }
   }finally{await context.close();}
   return results;
  },encoderSource);
  for(const row of results){assert.equal(row.savedMime,'audio/mpeg');assert.ok(Math.abs(row.decodedDuration-2)<.16,JSON.stringify(row));assert.ok(Math.abs(row.frequencyHz-440)<5,JSON.stringify(row));assert.ok(row.savedBytes<row.originalBytes,JSON.stringify(row));}
  fs.writeFileSync(path.join(OUT,'browser-audio-results.json'),JSON.stringify({browser:await browser.version(),checks:results},null,2));
  console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

