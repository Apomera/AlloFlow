const fs=require('fs');
fs.appendFileSync('tests/geometry_world_patterns.test.js',`
describe('repeat preview composition',()=>{
 it('frames the original and every copy while counting only new blocks',()=>{const f=selected([block(0),block(2)]),plan=api.previewSelectionEdit(f.engine,'repeat',{axis:'x',direction:1,total:3,gap:1}),facts=api.previewChangeFacts(plan);expect(facts.count).toBe(4);expect(facts.net).toBe(4);expect(facts.min.x).toBe(0);expect(facts.max.x).toBe(11);expect(facts.width).toBe(11);});
});
`);
fs.appendFileSync('tests/geometry_world_inspection_lighting.test.js',`
describe('standard undo and redo shortcuts',()=>{
 const snippets=['KeyZ','KeyY'].map(code=>source.match(new RegExp("case '"+code+"':[\\\\s\\\\S]*?break;"))[0]).join('\\n');
 const handle=new Function('ev','engine','addToast','switch(ev.code){'+snippets+'}');
 it.each([['KeyZ',false,'undo'],['KeyZ',true,'redo'],['KeyY',false,'redo']])('%s with Shift = %s performs %s',(code,shiftKey,expected)=>{for(const modifier of ['ctrlKey','metaKey']){const e={undo:vi.fn(),redo:vi.fn()},event={code,shiftKey,[modifier]:true,preventDefault:vi.fn()};handle(event,e,vi.fn());expect(e[expected]).toHaveBeenCalledTimes(1);expect(e[expected==='undo'?'redo':'undo']).not.toHaveBeenCalled();expect(event.preventDefault).toHaveBeenCalledTimes(1);}});
 it('does not undo or redo from an unmodified letter',()=>{const e={undo:vi.fn(),redo:vi.fn()};handle({code:'KeyZ'},e,vi.fn());handle({code:'KeyY'},e,vi.fn());expect(e.undo).not.toHaveBeenCalled();expect(e.redo).not.toHaveBeenCalled();});
});
`);
console.log('Added framing and keyboard regression checks');
