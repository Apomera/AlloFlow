import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const require=createRequire(import.meta.url),N=require('../desktop/mcp/remediation_narration.cjs');
const hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'narration-complete-')),outputDir=join(dir,'out'),stateDir=join(dir,'state'),filePath=join(dir,'source.html');mkdirSync(outputDir);
 writeFileSync(filePath,'<html lang="en"><body><p>Resume this.</p></body></html>');
 const options={filePath,outputDir,stateDir,assetsRoot:resolve('.'),mode:'natural',epub:false};
 const runtimeHash=hash(N.ASSETS.map(f=>hash(readFileSync(join(options.assetsRoot,f)))).join(':')),sourceHash=hash(readFileSync(filePath));
 const fingerprint=N.completionFingerprint(options,sourceHash,runtimeHash),record=join(stateDir,'narration-completions',fingerprint+'.json'),files={};
 for(const [role,name] of Object.entries({audioWav:'audio.wav',audioMp3:'audio.mp3',narratedHtml:'reader.html',narrationReport:'report.json'})){files[role]=join(outputDir,name);writeFileSync(files[role],'fixture bytes for '+role);}
 const result={status:'completed',sourceSha256:sourceHash,totalSections:1,completedSections:1,files};N.saveCompletion(record,fingerprint,result);
 return {dir,options,runtimeHash,sourceHash,fingerprint,record,result};
}
it('reuses every verified final artifact without launching a browser or claiming duplicate outputs',async()=>{
 const f=fixture();const reused=await N.narrate({...f.options,resolveChromium:()=>{throw Error('browser must not launch');},claimPath:()=>{throw Error('must not create duplicate');}});
 expect(reused).toMatchObject({...f.result,reused:true});
 writeFileSync(f.result.files.audioMp3,'tampered');expect(N.loadCompletion(f.record,f.fingerprint,f.options.outputDir,false)).toBeNull();
 await expect(N.narrate({...f.options,resolveChromium:()=>{throw Error('must synthesize again');}})).rejects.toThrow('must synthesize again');
});
it('binds reuse to source, options, runtime and output location and rejects missing artifacts',()=>{
 const f=fixture();for(const patch of [{mode:'accessible'},{language:'es'},{provider:'piper'},{voice:'am_adam'},{epub:true},{outputDir:join(f.dir,'elsewhere')},{filePath:join(f.dir,'other.html')}])expect(N.completionFingerprint({...f.options,...patch},f.sourceHash,f.runtimeHash)).not.toBe(f.fingerprint);
 expect(N.completionFingerprint(f.options,'changed source',f.runtimeHash)).not.toBe(f.fingerprint);expect(N.completionFingerprint(f.options,f.sourceHash,'changed runtime')).not.toBe(f.fingerprint);
 expect(N.loadCompletion(f.record,'different fingerprint',f.options.outputDir,false)).toBeNull();expect(N.loadCompletion(f.record,f.fingerprint,f.options.outputDir,true)).toBeNull();
 unlinkSync(f.result.files.narrationReport);expect(N.loadCompletion(f.record,f.fingerprint,f.options.outputDir,false)).toBeNull();
});
it('rejects completion records with outside paths or duplicate artifact roles',()=>{
 const f=fixture(),outside=join(f.dir,'outside.mp3');writeFileSync(outside,'outside');f.result.files.audioMp3=outside;N.saveCompletion(f.record,f.fingerprint,f.result);expect(N.loadCompletion(f.record,f.fingerprint,f.options.outputDir,false)).toBeNull();
 const g=fixture(),record=JSON.parse(readFileSync(g.record,'utf8'));record.artifacts[1]=record.artifacts[0];writeFileSync(g.record,JSON.stringify(record));expect(N.loadCompletion(g.record,g.fingerprint,g.options.outputDir,false)).toBeNull();
});

it('reuses unchanged clips across edits and ordering changes but isolates voice, language, mode and runtime',()=>{
 const dir=mkdtempSync(join(tmpdir(),'narration-incremental-')),route={provider:'kokoro',language:'en',voice:'af_heart'},segment={text:'Unchanged paragraph.',id:'old',segmentId:'segment-1'};
 const key=N.clipCachePath(dir,'runtime','natural',segment,route);
 expect(N.clipCachePath(dir,'runtime','natural',{...segment,id:'new',segmentId:'segment-9'},route)).toBe(key);
 for(const [runtime,mode,text,r] of [['other','natural',segment.text,route],['runtime','accessible',segment.text,route],['runtime','natural','Edited paragraph.',route],['runtime','natural',segment.text,{...route,voice:'am_adam'}],['runtime','natural',segment.text,{...route,language:'es'}],['runtime','natural',segment.text,{...route,provider:'piper'}]])expect(N.clipCachePath(dir,runtime,mode,{text},r)).not.toBe(key);
 expect(N.readClipCache(key)).toBeNull();
});
