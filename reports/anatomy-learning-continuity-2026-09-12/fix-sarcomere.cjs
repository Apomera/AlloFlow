const fs=require('node:fs');const file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8');const a=s.indexOf('        function renderNeuromuscularAtlas()'),b=s.indexOf('        function renderLiver',a);if(a<0||b<0)throw Error('Missing atlas bounds');let part=s.slice(a,b);
function rep(a,b,n=1){if(part.split(a).length-1!==n)throw Error(a);part=part.split(a).join(b);}
rep("markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse'","markerUnits: 'userSpaceOnUse', markerWidth: 9, markerHeight: 9, orient: 'auto-start-reverse'");
rep("markerEnd: 'url(#' + markerId + ')',","markerEnd: 'url(#' + markerId + ')',\n              style: stepIndex === 3 ? {strokeWidth:3} : undefined,");
rep("x2: regionalAtlasStep === 3 ? 541 : 527, y2: 258, stroke:","x2: regionalAtlasStep === 3 ? 547 : 527, y2: 258, 'data-anatomy-filament': 'actin-left', stroke:");
rep("x2: regionalAtlasStep === 3 ? 522 : 536, y2: 291, stroke:","x2: regionalAtlasStep === 3 ? 516 : 536, y2: 291, 'data-anatomy-filament': 'actin-right', stroke:");
s=s.slice(0,a)+part+s.slice(b);require('@babel/parser').parse(s,{sourceType:'script'});fs.writeFileSync(file,s);fs.copyFileSync(file,'desktop/web-app/public/'+file);console.log('Filaments keep their lengths while sliding; sarcomere arrows no longer scale with stroke width.');
const testFile='tests/anatomy_learning_continuity.test.js';let test=fs.readFileSync(testFile,'utf8');test+=`
for(const file of paths)for(const id of ['biceps','quads'])it('preserves actin filament length as the Z discs move closer: '+id+' in '+file,()=>{
 const s=session(file,{system:'muscular',selectedStructure:id,_regionalAtlasOpen:id,_regionalAtlasStep:0});
 const geometry=()=>[...s.html().querySelectorAll('[data-anatomy-filament]')].map(el=>({id:el.dataset.anatomyFilament,x1:Number(el.getAttribute('x1')),length:Math.abs(Number(el.getAttribute('x2'))-Number(el.getAttribute('x1')))}));
 const relaxed=geometry();s.patch({_regionalAtlasStep:3});const shortened=geometry();expect(relaxed).toHaveLength(2);expect(shortened.map(row=>row.length)).toEqual(relaxed.map(row=>row.length));expect(shortened[0].x1).toBeGreaterThan(relaxed[0].x1);expect(shortened[1].x1).toBeLessThan(relaxed[1].x1);expect(s.html().querySelector('#anatomy-arrow-contraction').getAttribute('markerUnits')).toBe('userSpaceOnUse');
});
`;fs.writeFileSync(testFile,test);
