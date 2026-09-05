import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const require=createRequire(import.meta.url),D=require('../desktop/mcp/remediation_headless_driver.cjs'),N=require('../desktop/mcp/remediation_narration.cjs');
it('preflights a folder locally and reports blocked documents without hiding ready ones',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'narration-preflight-')),good=join(dir,'good.html'),bad=join(dir,'bad.html');
 writeFileSync(good,'<html lang="en"><body><h1>Hello</h1><section lang="es"><p>Hola.</p></section></body></html>');
 writeFileSync(bad,'<html lang="en"><body><p>Hello <span lang="xx">amigos</span>.</p></body></html>');
 const result=await N.preflight({filePaths:[good,bad],assetsRoot:D.ASSETS_ROOT,resolveChromium:D.resolveChromium,mode:'accessible'});
 expect(result).toMatchObject({total:2,ready:1,blocked:1});expect(result.files[0].voices.map(v=>v.provider)).toEqual(['kokoro','piper']);
 expect(result.files[0]).toMatchObject({modelsTested:false,sections:2,languages:['en','es']});expect(result.files[0].sourceSha256).toMatch(/^[a-f0-9]{64}$/);
 expect(result.files[1].error).toMatch(/not localized/);expect(result.files[0].plan).toBeUndefined();
},120000);
function sineWav(rate){const b=Buffer.alloc(44+rate*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(rate*2,40);for(let i=0;i<rate;i++)b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/rate)*16000),44+2*i);return b;}
it('normalizes different provider rates while preserving duration and pitch before joining',async()=>{
 const browser=await D.resolveChromium().chromium.launch({headless:true}),dir=mkdtempSync(join(tmpdir(),'narration-rates-')),files=[];
 try{const page=await browser.newPage();await page.goto('about:blank');await page.addScriptTag({path:resolve('audio_helpers_module.js')});
 for(const rate of [22050,24000,44100]){const normalized=Buffer.from(await page.evaluate(N.normalizeClip,sineWav(rate).toString('base64')),'base64'),info=N.wavInfo(normalized);expect(info.fmt.readUInt32LE(4)).toBe(24000);expect(info.duration).toBeCloseTo(1,3);let crossings=0;for(let i=1;i<info.length/2;i++)if(normalized.readInt16LE(info.start+(i-1)*2)<=0&&normalized.readInt16LE(info.start+i*2)>0)crossings++;expect(crossings).toBeGreaterThanOrEqual(439);expect(crossings).toBeLessThanOrEqual(441);const file=join(dir,rate+'.wav');writeFileSync(file,normalized);files.push(file);}
 const out=join(dir,'whole.wav');expect(N.mergeWavs(files,out)).toBeCloseTo(3,3);expect(N.wavInfo(readFileSync(out)).duration).toBeCloseTo(3,3);
 }finally{await browser.close();}
},120000);

it('blocks incomplete narration coverage locally before any model work',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'narration-coverage-')),file=join(dir,'unreadable.html');writeFileSync(file,'<html lang="en"><body><p><img src="missing.png"></p><math><mfrac><mn>1</mn><mn>2</mn></mfrac></math></body></html>');
 const result=await N.preflight({filePaths:[file],assetsRoot:D.ASSETS_ROOT,resolveChromium:D.resolveChromium,mode:'accessible'});
 expect(result).toMatchObject({ready:0,blocked:1});expect(result.files[0]).toMatchObject({ready:false,modelsTested:false,contentCoverage:{status:'blocked',unresolvedVisuals:2}});expect(result.files[0].error).toMatch(/coverage is incomplete/);
},120000);
