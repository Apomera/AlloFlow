import {describe,it,expect} from 'vitest';
import fs from 'node:fs';import {createRequire} from 'node:module';
const {validateEditionPair}=createRequire(import.meta.url)('../dev-tools/lib/allopack_edition_consistency.cjs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
describe('Illustrated editions retain source activities and resolvable references',()=>{
 for(const file of fs.readdirSync('allopacks/illustrated').filter(f=>f.endsWith('.allopack.json')))it(file,()=>{expect(validateEditionPair(read('allopacks/'+file),read('allopacks/illustrated/'+file))).toEqual([]);});
 const source={history:[{id:'r',type:'simplified',data:'Read'},{id:'m',type:'memory-aid',data:{lessonRef:{resourceId:'r'}}}]};
 it('rejects a missing activity even when the remaining pack looks valid',()=>{expect(validateEditionPair(source,{history:[source.history[0]]})).toContain('Missing source resource: m');});
 it('rejects a changed activity type',()=>{const p=structuredClone(source);p.history[1].type='quiz';expect(validateEditionPair(source,p).join(' ')).toContain('Changed source resource type: m');});
 it('rejects a dangling lesson reference',()=>{const p=structuredClone(source);p.history[1].data.lessonRef.resourceId='missing';expect(validateEditionPair(source,p).join(' ')).toContain('unresolved resource reference: missing');});
 it('allows additional image resources',()=>{expect(validateEditionPair(source,{history:[...source.history,{id:'picture',type:'image',data:{}}]})).toEqual([]);});
});
it.each([null, 42, [], {id:'',type:'quiz'}])('reports malformed rows rather than crashing: %j',row=>{expect(validateEditionPair({history:[row]},{history:[row]}).length).toBeGreaterThan(0);});
it('rejects duplicate source IDs as well as duplicate illustrated IDs',()=>{const p={history:[{id:'r',type:'simplified'},{id:'r',type:'simplified'}]};expect(validateEditionPair(p,p).join(' ')).toContain('Duplicate source resource: r');});
it.each([{objectives:{}},{objectives:[null]},{objectives:[{resourceRef:4}]},{lessonRef:'r'},{lessonRef:{}}])('reports malformed reference shapes: %j',data=>{const p={history:[{id:'r',type:'directions',data}]};expect(validateEditionPair(p,p).length).toBeGreaterThan(0);});
