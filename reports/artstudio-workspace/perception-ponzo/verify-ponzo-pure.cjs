const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const sourcePath = path.join(__dirname,'stem_tool_perception.js'), output = path.join(__dirname,'engine-checks.json');
const source = fs.readFileSync(sourcePath,'utf8'), hash = value => crypto.createHash('sha256').update(value).digest('hex'), sourceSHA256 = hash(source);
const registry = {}; global.window = { StemLab: { registerTool(id, config) { registry[id] = config; } } };
new Function(source)(); const engine = window.StemLab.PerceptionEngine;
const flatten = nodes => (Array.isArray(nodes) ? nodes : [nodes]).flatMap(node => node && typeof node === 'object' ? [node,...flatten(node.children || [])] : []);
const scene = values => flatten(engine.scene('ponzo',values)), targets = values => scene(values).filter(node => node.props?.['data-perception-target']), rails = values => scene(values).filter(node => node.props?.['data-perception-context']);
const baseline = () => engine.normalizeModel('ponzo',{ convergence:82,upperY:164,context:true,prediction:'Upper',note:'Starting perspective impression' });
const keys = ['convergence','upperY','context'], edits = { convergence:17,upperY:253,context:false }, checks = [];
function check(name, fn) { try { fn(); checks.push({name,passed:true}); } catch(error) { checks.push({name,passed:false,error:error.message}); } }
check('Seventh observation-only experiment defaults and controls',()=> {
  assert.equal(engine.experiments.length,7); assert.equal(engine.experiments.at(-1).id,'ponzo'); assert.equal(Object.keys(engine.normalize().models).length,7);
  assert.deepEqual(engine.normalize().models.ponzo,{context:true,reveal:false,prediction:'',note:'',convergence:90,upperY:175});
  assert.deepEqual(engine.experiments.at(-1).controls.map(({key,min,max,value})=>({key,min,max,value})),[{key:'convergence',min:0,max:100,value:90},{key:'upperY',min:150,max:260,value:175}]);
  assert.deepEqual(engine.experiments.at(-1).choices,['Upper','Lower','Same','Unsure']); assert.match(engine.experiments.at(-1).source,/^https:\/\//);
});
for(const [index,value] of [null,undefined,true,false,{},[],'','  ','bad',NaN,Infinity,-Infinity].entries())check('Malformed control fallback '+index,()=> {
  const model=engine.normalizeModel('ponzo',{convergence:value,upperY:value}); assert.equal(model.convergence,90); assert.equal(model.upperY,175);
  for(const node of scene({convergence:value,upperY:value,reveal:true}))for(const prop of Object.values(node.props || {}))if(typeof prop==='number')assert(Number.isFinite(prop));
  assert.doesNotMatch(JSON.stringify(scene({convergence:value,upperY:value,reveal:true})),/NaN|Infinity/);
});
for(const [raw,convergence,upperY] of [[-999,0,150],[999,100,260],['18.6',19,150],['252.6',100,253]])check('Bounded and rounded controls '+raw,()=> {
  const model=engine.normalizeModel('ponzo',{convergence:raw,upperY:raw}); assert.equal(model.convergence,convergence); assert.equal(model.upperY,upperY);
  for(const node of scene({...model,reveal:true}))for(const [name,prop] of Object.entries(node.props || {}))if(/^(?:x1|x2|x|y1|y2|y)$/.test(name))assert(prop>=0&&prop<=(name[0]==='x'?800:480));
});
check('Matching and repeated-study fields never enter Ponzo',()=> {
  const state=engine.normalize({experiment:'ponzo',models:{ponzo:{matching:true,matchValue:999,swap:true,prediction:'Left',note:'a'.repeat(600),extra:true}},studies:[{id:'p',experiment:'ponzo',date:'',model:baseline(),repeat:{id:'fake',trial:1,startValue:30}}]});
  for(const key of ['matching','swap','matchValue','extra'])assert.equal(Object.hasOwn(state.models.ponzo,key),false);
  assert.equal(state.models.ponzo.prediction,''); assert.equal(state.models.ponzo.note.length,500); assert.equal(Object.hasOwn(state.studies[0],'repeat'),false);
  assert.equal(Object.hasOwn(engine.matching,'ponzo'),false); assert.equal(engine.measurements('ponzo',baseline()),null); assert.equal(engine.createStudy('ponzo',baseline(),'fake'),null);
});
for(const convergence of [0,25,50,90,100])check('Equal targets and exact perspective gap at '+convergence,()=> {
  const visible=targets({convergence,upperY:175,context:true}),removed=targets({convergence,upperY:175,context:false}); assert.deepEqual(removed,visible); assert.equal(visible.length,2);
  assert.deepEqual(visible.map(node=>node.props['data-perception-target']),['upper','lower']);
  for(const node of visible){assert.equal(node.tag,'rect'); assert.equal(node.props.x,280);assert.equal(node.props.width,240);assert.equal(node.props.height,12);}
  assert.equal(visible[0].props.y,169);assert.equal(visible[1].props.y,344);assert.equal(visible[0].props.fill,visible[1].props.fill);
  const context=rails({convergence}),gap=600-4.6*convergence;assert.equal(context.length,2);assert.equal(rails({convergence,context:false}).length,0);
  for(const [index,expected] of [{x1:400-gap/2,y1:40,x2:100,y2:440},{x1:400+gap/2,y1:40,x2:700,y2:440}].entries())for(const [key,value]of Object.entries(expected))assert.equal(context[index].props[key],value);
});
check('Painted rails never overlap target rectangles at20 boundary combinations',()=> {
  for(const convergence of [0,25,50,90,100])for(const upperY of [150,175,220,260])for(const target of targets({convergence,upperY}))for(const x of [target.props.x,target.props.x+target.props.width])for(const y of [target.props.y,target.props.y+target.props.height])for(const [index,node]of rails({convergence,upperY}).entries()){
    const rail=node.props,dx=rail.x2-rail.x1,dy=rail.y2-rail.y1,railX=rail.x1+(y-rail.y1)*dx/dy;
    assert(index===0?railX<target.props.x:railX>target.props.x+target.props.width);
    const distance=Math.abs(dy*x-dx*y+rail.x2*rail.y1-rail.y2*rail.x1)/Math.hypot(dx,dy);assert(distance>rail.strokeWidth/2,'Target corner intersects painted rail');
  }
});
for(const upperY of [150,175,220,260])check('Upper target position only changes its height at '+upperY,()=> {
  const current=targets({upperY}),initial=targets({upperY:175});assert.equal(current[0].props.y,upperY-6);assert.deepEqual(current[0],{...initial[0],props:{...initial[0].props,y:upperY-6}});assert.deepEqual(current[1],initial[1]);assert.deepEqual(rails({upperY}),rails({upperY:175}));
});
for(const [convergence,upperY]of [[0,150],[0,260],[100,150],[100,260]])check('Measurement guides preserve exact target rectangles '+convergence+'/'+upperY,()=> {
  assert.deepEqual(targets({convergence,upperY,reveal:true}),targets({convergence,upperY,reveal:false}));assert.equal(scene({convergence,upperY,reveal:false}).filter(node=>node.props?.['data-perception-guide']).length,0);
  const vertical=scene({convergence,upperY,reveal:true}).filter(node=>node.props?.['data-perception-guide']&&node.tag==='line'&&node.props.x1===node.props.x2).map(node=>node.props.x1);assert(vertical.includes(280));assert(vertical.includes(520));
});
check('JSON state roundtrip preserves Ponzo snapshot and other experiments',()=> {
  const state=engine.normalize({experiment:'ponzo',models:{ponzo:baseline(),brightness:{target:117}},comparison:{experiment:'ponzo',model:{...baseline(),convergence:5}},studies:[{id:'saved',experiment:'ponzo',date:'2026-10-06T12:00:00.000Z',model:baseline()}]});assert.deepEqual(engine.normalize(JSON.parse(JSON.stringify(state))),state);
});
for(const selected of keys)for(const scope of ['selected','others'])check('Pure scoped restore '+selected+'/'+scope,()=> {
  const first=baseline(),current={...first,...edits,reveal:true,prediction:'Unsure',note:'Keep this current note'},snapshot=structuredClone(current),restored=keys.filter(key=>scope==='selected'?key===selected:key!==selected),plan=engine.planInquiryRestore('ponzo',first,current,selected,scope);
  assert.deepEqual(plan,{selected,changes:restored.map(key=>({key,before:first[key],after:current[key]})),model:{...current,...Object.fromEntries(restored.map(key=>[key,first[key]]))}});assert.deepEqual(current,snapshot);assert.deepEqual(first,baseline());
});
for(const selected of keys)check('Report snapshot and chosen status '+selected,()=> {
  const first=baseline(),current={...first,...edits,reveal:true,prediction:'Unsure',note:'Literal <script> & full note\nline two'},snapshot=structuredClone(current),plan=engine.planInquiryReport('ponzo',first,current,selected);
  assert.deepEqual(plan,{status:'ready',experiment:'ponzo',selected,baseline:first,current,changes:keys.map(key=>({key,before:first[key],after:current[key]})),otherChanges:keys.filter(key=>key!==selected).map(key=>({key,before:first[key],after:current[key]})),selectedChanged:true,inquiryStatus:'multiple'});
  assert.notEqual(plan.baseline,first);assert.notEqual(plan.current,current);assert.deepEqual(current,snapshot);plan.current.note='report mutation';assert.deepEqual(current,snapshot);assert.deepEqual(first,baseline());
});
check('Notebook JSON import, exact preservation, deduplication and invalid repeat rejection',()=> {
  const record={id:'imported',experiment:'ponzo',date:'2026-10-06T12:00:00.000Z',model:baseline()},payload=studies=>JSON.stringify({schema:'alloflow.perception.notebook',version:1,studies});
  const parsed=engine.parseNotebook(payload([record]));assert.deepEqual(parsed,{status:'ready',records:[record]});const before=engine.normalize({experiment:'ponzo',models:{ponzo:baseline()},comparison:{experiment:'brightness',model:{target:163}},studies:[{id:'existing',experiment:'necker',date:'',model:{note:'Existing notebook'}}]}),snapshot=structuredClone(before),plan=engine.planNotebookImport(before,parsed.records);
  assert.equal(plan.status,'ready');assert.equal(plan.added,1);assert.deepEqual(plan.state.studies.at(-1),record);assert.deepEqual(plan.state.models,before.models);assert.deepEqual(plan.state.comparison,before.comparison);assert.deepEqual(before,snapshot);
  const duplicate=engine.planNotebookImport(plan.state,parsed.records);assert.equal(duplicate.status,'unchanged');assert.equal(duplicate.added,0);assert.equal(duplicate.skipped,1);assert.equal(engine.parseNotebook(payload([{...record,repeat:{id:'fake',trial:1,startValue:30}}])).status,'records');
});
const finalSourceSHA256=hash(fs.readFileSync(sourcePath)),failed=checks.filter(item=>!item.passed),result={sourceSHA256,finalSourceSHA256,sourceStable:sourceSHA256===finalSourceSHA256,kind:'Standalone built-in assertions of pure engine behavior; no UI framework or Vitest workers',passed:checks.length-failed.length,failed:failed.length,checks};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');process.stdout.write(JSON.stringify({passed:result.passed,failed:result.failed,sourceStable:result.sourceStable,sourceSHA256})+'\n');if(failed.length)process.stdout.write(JSON.stringify(failed,null,2)+'\n');process.exitCode=failed.length||!result.sourceStable?1:0;
