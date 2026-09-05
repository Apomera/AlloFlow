import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const require=createRequire(import.meta.url);
const {wavInfo,mergeWavs}=require(resolve('desktop/mcp/remediation_narration.cjs'));
function wav(rate,values) {
 const b=Buffer.alloc(44+values.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(values.length*2,40);values.forEach((n,i)=>b.writeInt16LE(n,44+i*2));return b;
}
it('merges every PCM sample in order, preserving sample rate and duration',()=>{
 const dir=mkdtempSync(join(tmpdir(),'narration-pcm-'));const a=join(dir,'a.wav'),b=join(dir,'b.wav'),out=join(dir,'whole.wav');writeFileSync(a,wav(22050,[1,-2,3]));writeFileSync(b,wav(22050,[4,-5]));const seconds=mergeWavs([a,b],out);const bytes=readFileSync(out);const info=wavInfo(bytes);expect(info.fmt.readUInt32LE(4)).toBe(22050);expect(info.length).toBe(10);expect(seconds).toBeCloseTo(5/22050);expect(Array.from({length:5},(_,i)=>bytes.readInt16LE(info.start+i*2))).toEqual([1,-2,3,4,-5]);
 expect(()=>mergeWavs([a,b],out)).toThrow(); // never overwrite an existing artifact
});
it('rejects truncated, empty and mixed-format narration instead of producing partial/corrupt audio',()=>{
 expect(()=>wavInfo(wav(24000,[1,2]).subarray(0,46))).toThrow(/Truncated/);
 expect(()=>wavInfo(wav(24000,[]))).toThrow(/empty/);
 const dir=mkdtempSync(join(tmpdir(),'narration-invalid-'));const a=join(dir,'a.wav'),b=join(dir,'b.wav');writeFileSync(a,wav(24000,[1]));writeFileSync(b,wav(22050,[2]));expect(()=>mergeWavs([a,b],join(dir,'out.wav'))).toThrow(/formats differ/);
});
