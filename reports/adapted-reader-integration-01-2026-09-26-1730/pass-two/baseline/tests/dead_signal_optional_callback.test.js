import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const source=fs.readFileSync('dev-tools/check_dead_signals.cjs','utf8');
function check(removeEmitter=false){
  const messages=[];let status=0;
  const fakeFs={...fs,readFileSync(file,...args){let value=fs.readFileSync(file,...args);if(removeEmitter && path.basename(file)==='games_source.jsx')value=value.replaceAll("onGameComplete?.('definitionDetective'","onGameComplete?.('unusedDetective'");return value;}};
  const stop={};try{vm.runInNewContext(source,{require:name=>name==='fs'?fakeFs:require(name),__dirname:path.resolve('dev-tools'),console:{log:(...args)=>messages.push(args.join(' '))},process:{argv:[],exit(code){status=code;throw stop;}}});}catch(e){if(e!==stop)throw e;}
  return {status,messages:messages.join('\n')};
}
describe('Completion signal gate: optional callbacks',()=>{
  it('recognizes the optional Definition Detective completion callback',()=>{expect(check().status).toBe(0);});
  it('still rejects the offered game when its completion emitter is removed',()=>{const r=check(true);expect(r.status).toBe(1);expect(r.messages).toContain('declares "definitionDetective" but nothing ever emits it');});
});
