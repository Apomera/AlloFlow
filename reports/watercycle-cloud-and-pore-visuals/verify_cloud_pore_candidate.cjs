const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const parse=require(path.join(repo,'node_modules/acorn')).parse;
const baselineSha='f2360e271a96e40308aeb0b45a4ded56aaecec4366eafa92781278713a6f2a36';
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const plain=v=>JSON.parse(JSON.stringify(v));
function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function walk(n,fn,parent=null,key=''){if(!n||typeof n!=='object')return;fn(n,parent,key);for(const[k,v]of Object.entries(n)){if(Array.isArray(v))v.forEach(c=>walk(c,fn,n,k));else if(v&&typeof v==='object')walk(v,fn,n,k);}}
function uniqueRange(text,startMarker,endMarker){const a=text.indexOf(startMarker),b=text.indexOf(endMarker,a);assert(a>=0&&b>a,'Missing range '+startMarker);assert(text.indexOf(startMarker,a+startMarker.length)<0,'Duplicate range '+startMarker);return{start:a,end:b,text:text.slice(a,b)};}
function regions(text){return{
  cloudHelpers:uniqueRange(text,'              function drawCloudPuff(','              function drawTerrain('),
  cloudAssembly:uniqueRange(text,text.includes('                var stormCloudLobes2d = [];')?'                var stormCloudLobes2d = [];':'                if (convectiveBuild > 0.56) {','                drawStormChargeSeparation(context, w, h, cloudCenter, cloudY, cloudBase, groundY);'),
  soil:uniqueRange(text,"            } else if (kind === 'soil') {","            } else if (kind === 'cloud') {"),
};}
function paintContract(text){
  const tree=parse(text,{ecmaVersion:'latest'}),locals=new Set();
  walk(tree,n=>{if(n.type==='VariableDeclarator'&&n.id.type==='Identifier')locals.add(n.id.name);if(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(n.type)){if(n.id)locals.add(n.id.name);n.params.forEach(p=>{assert(p.type==='Identifier','Cloud paint has a nonlocal binding');locals.add(p.name);});}});
  const reads=new Set(['Math','model','context','w','h','cloudCenter','cloudY','cloudBase','cloudScale','convectiveBuild','windSign']);
  const paints=new Set(['save','restore','beginPath','closePath','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','arc','ellipse','clip','fill','stroke','fillRect','strokeText','fillText','createLinearGradient','createRadialGradient']);
  const styles=new Set(['fillStyle','strokeStyle','globalAlpha','lineWidth','lineCap','lineJoin','globalCompositeOperation','shadowColor','shadowBlur']);
  const math=new Set(['max','min','sin','cos','round','floor','ceil','abs','sqrt','pow','PI']);
  walk(tree,(n,p,k)=>{
    if(n.type==='Identifier'){
      const prop=p&&(p.type==='MemberExpression'&&k==='property'&&!p.computed||p.type==='Property'&&k==='key'&&!p.computed);
      assert(prop||locals.has(n.name)||reads.has(n.name),'Cloud paint reads nonpresentation state: '+n.name);
    }
    assert(!['NewExpression','AwaitExpression','YieldExpression','ThrowStatement','WithStatement','ImportExpression','ThisExpression','Super'].includes(n.type),'Cloud paint has a nonpaint operation');
    assert(!(n.type==='UnaryExpression'&&n.operator==='delete'),'Cloud paint deletes state');
    if(n.type==='MemberExpression'&&n.object.type==='Identifier'&&n.object.name==='Math')assert(!n.computed&&math.has(n.property.name),'Cloud paint calls nondeterministic math');
    if(n.type==='MemberExpression'){
      let head=n,chain=[];while(head.type==='MemberExpression'&&!head.computed){chain.unshift(head.property.name);head=head.object;}
      if(head.type==='Identifier'&&head.name==='model')assert(['isDark','config','config.moisture'].includes(chain.join('.')),'Cloud paint reads unrelated model state');
    }
    if(n.type==='CallExpression'){
      const c=n.callee;
      if(c.type==='Identifier')assert(locals.has(c.name),'Cloud paint calls external function '+c.name);
      else{
        if(c.type==='MemberExpression'&&!c.computed&&c.property.name==='apply'&&c.object.type==='MemberExpression'&&!c.object.computed&&c.object.object.name==='Math'&&['min','max'].includes(c.object.property.name)){
          assert(n.arguments.length===2&&n.arguments[0].type==='Literal'&&n.arguments[0].value===null,'Cloud bound apply has an unexpected receiver');return;
        }
        assert(c.type==='MemberExpression'&&!c.computed&&c.object.type==='Identifier','Cloud paint has an indirect call');
        const name=c.object.name,method=c.property.name;
        assert(name==='Math'?math.has(method):['context','ctx2'].includes(name)?paints.has(method):locals.has(name)&&['addColorStop','push','forEach','map'].includes(method),'Cloud paint calls nonpaint resource '+name+'.'+method);
      }
    }
    if(n.type==='AssignmentExpression'||n.type==='UpdateExpression'){
      const t=n.left||n.argument;
      assert(t.type==='Identifier'&&locals.has(t.name)||t.type==='MemberExpression'&&!t.computed&&t.object.type==='Identifier'&&['context','ctx2'].includes(t.object.name)&&styles.has(t.property.name),'Cloud paint writes nonpresentation state');
    }
  });
  return{localBindings:locals.size};
}
function astShape(value){if(Array.isArray(value))return value.map(astShape);if(!value||typeof value!=='object')return value;return Object.fromEntries(Object.entries(value).filter(([key])=>!['start','end','raw'].includes(key)).map(([key,v])=>[key,astShape(v)]));}
function callArguments(text,name){const result=[];walk(parse(text,{ecmaVersion:'latest'}),n=>{if(n.type==='CallExpression'&&n.callee.type==='Identifier'&&n.callee.name===name)result.push(astShape(n.arguments));});return result;}
function canvasArguments(text,methods){const result=[];walk(parse(text,{ecmaVersion:'latest'}),n=>{if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&!n.callee.computed&&['context','ctx2'].includes(n.callee.object.name)&&methods.includes(n.callee.property.name))result.push([n.callee.property.name,astShape(n.arguments)]);});return result;}
function declaration(text,name){let found;walk(parse(text,{ecmaVersion:'latest'}),n=>{if(n.type==='FunctionDeclaration'&&n.id.name===name){assert(!found,'Duplicate '+name);found=text.slice(n.start,n.end);}});assert(found,'Missing '+name);return found;}
function diagram(text){const React={createElement(type,props,...children){return{type,props:props||{},children:children.flat(Infinity)};}};return vm.runInNewContext(declaration(text,'wcProcessDiagram')+'\nwcProcessDiagram;',{React},{timeout:1000});}
function elements(tree){const out=[];function visit(n){if(!n||typeof n!=='object')return;out.push(n);(n.children||[]).forEach(visit);}visit(tree);return out;}
function checkSoilBounds(tree){
  let count=0;
  for(const n of elements(tree)){
    const p=n.props;
    if(n.type==='ellipse'||n.type==='circle'){
      const rx=p.rx??p.r,ry=p.ry??p.r,sw=(p.strokeWidth||0)/2;
      assert([p.cx,p.cy,rx,ry].every(Number.isFinite),'Nonfinite pore ellipse');
      assert(p.cx-rx-sw>=0&&p.cx+rx+sw<=48&&p.cy-ry-sw>=0&&p.cy+ry+sw<=48,'Pore ellipse leaves viewBox');count++;
    }
    if(n.type==='path'){
      const tokens=p.d.match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g)||[];let i=0,x=0,y=0,sx=0,sy=0,cmd='';
      const sizes={M:2,L:2,H:1,V:1,Q:4,C:6};
      while(i<tokens.length){if(/^[A-Za-z]$/.test(tokens[i]))cmd=tokens[i++];const upper=cmd.toUpperCase(),relative=cmd!==upper;
        if(upper==='Z'){x=sx;y=sy;cmd='';continue;}assert(sizes[upper],'Unsupported reviewed pore path command '+cmd);const values=tokens.slice(i,i+sizes[upper]).map(Number);assert(values.length===sizes[upper]&&values.every(Number.isFinite),'Malformed pore path');i+=sizes[upper];
        const points=upper==='H'?[[relative?x+values[0]:values[0],y]]:upper==='V'?[[x,relative?y+values[0]:values[0]]]:Array.from({length:values.length/2},(_,j)=>[values[j*2]+(relative?x:0),values[j*2+1]+(relative?y:0)]);
        const sw=(p.strokeWidth||0)/2;points.forEach(([px,py])=>assert(px-sw>=0&&px+sw<=48&&py-sw>=0&&py+sw<=48,'Pore path/control point leaves viewBox'));
        [x,y]=points[points.length-1];if(upper==='M'){sx=x;sy=y;cmd=relative?'l':'L';}
      }count++;
    }
  }return count;
}
function kernel(text){const node=()=>({style:{},appendChild(){},setAttribute(){},remove(){}});const document={body:node(),head:node(),createElement:node,getElementById(){return null;}};const window={StemLab:{registerTool(){}}};vm.runInNewContext(text,{window,document,console,Math,Date,Object,Array,Number,String,Boolean,JSON,isFinite,setTimeout,clearTimeout,setInterval,clearInterval},{timeout:10000});assert(window.WaterCyclePrecipitationKernel,'Kernel unavailable');return window.WaterCyclePrecipitationKernel;}
function recordingCanvas(){
  const records=[];let depth=0,clips=0,clipped=false;const clipStack=[];
  const ctx={records};
  for(const method of ['save','restore','beginPath','closePath','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','arc','ellipse','clip','fill','stroke','fillRect'])ctx[method]=(...args)=>{
    assert(args.every(v=>typeof v==='number'?Number.isFinite(v):typeof v==='boolean'),'Nonfinite cloud geometry in '+method);
    if(method==='save'){depth++;clipStack.push(clipped);}if(method==='restore'){assert(depth>0,'Cloud restore underflow');depth--;clipped=clipStack.pop();}
    if(method==='clip'){clips++;clipped=true;}if(method==='fillRect')assert(clipped,'Cloud lobe light escaped the shared silhouette clip');
    if(method==='arc')assert(args[2]>0,'Nonpositive cloud radius');if(method==='ellipse')assert(args[2]>0&&args[3]>0,'Nonpositive cloud ellipse');
    records.push([method,...args]);
  };
  for(const method of ['createLinearGradient','createRadialGradient'])ctx[method]=(...args)=>{
    assert(args.every(Number.isFinite),'Nonfinite cloud gradient');records.push([method,...args]);
    return{addColorStop(offset,color){assert(Number.isFinite(offset)&&offset>=0&&offset<=1,'Invalid cloud color stop');assert(typeof color==='string'&&!/NaN|undefined|Infinity/.test(color),'Invalid cloud color');const m=/rgba\([^,]+,[^,]+,[^,]+,\s*([.\d+-]+)\)/.exec(color);if(m)assert(Number(m[1])>=0&&Number(m[1])<=1,'Cloud opacity leaves0–1');records.push(['colorStop',offset,color]);}};
  };
  ctx.verify=()=>{assert(depth===0,'Unbalanced cloud save/restore');assert(clips>0,'Cloud body has no shared clip');return{commands:records.length,clips};};return ctx;
}
function renderClouds(region,fixture){const model=freeze({isDark:fixture.dark,config:{moisture:fixture.moisture}});const context=recordingCanvas();const code=region.cloudHelpers.text+'\n'+region.cloudAssembly.text;vm.runInNewContext(code,{model,context,Math,w:fixture.width,h:fixture.height,cloudCenter:fixture.width*.5,cloudY:fixture.height*.18,cloudBase:fixture.height*.3,cloudScale:fixture.scale,convectiveBuild:fixture.convection,windSign:fixture.wind},{timeout:1000});return{...context.verify(),records:context.records};}
function glyphContract(baseline,candidate){
  const expected="function wcStormScientificInk2d(ctx2, text, x, y) { ctx2.save(); ctx2.strokeStyle = '#16364b'; ctx2.lineWidth = 2.5; ctx2.lineJoin = 'round'; ctx2.strokeText(text, x, y); ctx2.fillText(text, x, y); ctx2.restore(); }";
  const wrapper=declaration(candidate,'wcStormScientificInk2d');assert(JSON.stringify(astShape(parse(wrapper,{ecmaVersion:'latest'})))===JSON.stringify(astShape(parse(expected,{ecmaVersion:'latest'}))),'Scientific ink helper contains nonreviewed operations');
  const original=declaration(baseline,'drawStormChargeSeparation'),current=declaration(candidate,'drawStormChargeSeparation');let reconstructed=current;const calls=[];
  walk(parse(current,{ecmaVersion:'latest'}),n=>{if(n.type==='CallExpression'&&n.callee.type==='Identifier'&&n.callee.name==='wcStormScientificInk2d'){assert(n.arguments.length===4&&n.arguments[0].name==='ctx2','Glyph wrapper receiver/args changed');calls.push({start:n.start,end:n.end,text:'ctx2.fillText('+n.arguments.slice(1).map(a=>current.slice(a.start,a.end)).join(', ')+')'});}});
  assert(calls.length===3,'Expected exactly three glyph-call replacements');for(const c of calls.sort((a,b)=>b.start-a.start))reconstructed=reconstructed.slice(0,c.start)+c.text+reconstructed.slice(c.end);
  assert(JSON.stringify(astShape(parse(reconstructed,{ecmaVersion:'latest'})))===JSON.stringify(astShape(parse(original,{ecmaVersion:'latest'}))),'Charge count, colors, positions, or model gates changed');
  let cases=0;
  for(const index of [0,7,8,34,35,100])for(const show of [false,true]){
    const model=freeze({config:{showStormAnatomy:show},stormAnatomy:{chargeSeparation:{index}}});
    function render(code){const fill=[],stroke=[],stack=[];const ctx={};const styles=['fillStyle','strokeStyle','lineWidth','lineJoin','font','textAlign','textBaseline'];
      ctx.save=()=>stack.push(Object.fromEntries(styles.map(s=>[s,ctx[s]])));ctx.restore=()=>{assert(stack.length,'Glyph restore underflow');Object.assign(ctx,stack.pop());};
      ctx.fillRect=()=>{};ctx.fillText=(text,x,y)=>fill.push({text,x,y,color:ctx.fillStyle,font:ctx.font,align:ctx.textAlign,baseline:ctx.textBaseline});
      ctx.strokeText=(text,x,y)=>{assert(ctx.strokeStyle==='#16364b'&&ctx.lineWidth===2.5&&ctx.lineJoin==='round','Glyph outline style changed');stroke.push({text,x,y});};
      const fn=vm.runInNewContext(code+'\ndrawStormChargeSeparation;',{model,Math,terrainSurfaceYAt:(x,w,h,groundY)=>groundY},{timeout:1000});fn(ctx,390,260,195,70,100,220);assert(stack.length===0,'Unbalanced glyph paint');return{fill,stroke};}
    const old=render(original),now=render(wrapper+'\n'+current);assert(JSON.stringify(old.fill)===JSON.stringify(now.fill),'Actual glyph text/colors/positions changed');
    assert(now.stroke.length===(old.fill.length?old.fill.length-2:0),'Glyph outlines changed charge count');cases++;
  }
  return{replacementCallSites:calls.length,fixtures:cases};
}
function lightningContract(manifest,candidate){
  let fixtures=0;
  for(const id of ['lightning-leader-caption','lightning-return-caption']){
    const change=manifest.changes.find(c=>c.id===id),oldTree=parse(change.original,{ecmaVersion:'latest'}),newTree=parse(change.replacement,{ecmaVersion:'latest'});let oldTitle;
    walk(oldTree,n=>{if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&n.callee.property.name==='fillText'){assert(!oldTitle,'Duplicate old lightning title');oldTitle=n.arguments[0];}});
    assert(newTree.body.length===1&&newTree.body[0].type==='ExpressionStatement','Lightning caption has nonrequest statements');const push=newTree.body[0].expression;
    assert(push.type==='CallExpression'&&push.callee.type==='MemberExpression'&&push.callee.object.name==='stormCaptionRequests2d'&&push.callee.property.name==='push'&&push.arguments.length===1&&push.arguments[0].type==='ObjectExpression','Lightning caption writes nonpresentation state');
    const object=push.arguments[0];assert(object.properties.every(p=>p.type==='Property'&&!p.computed&&!p.method&&p.kind==='init'),'Lightning card has dynamic properties');
    const fields=Object.fromEntries(object.properties.map(p=>[p.key.name,p.value]));assert(Object.keys(fields).sort().join(',')==='accent,align,anchorX,anchorY,id,priority,title,titleSize,width,x,y','Lightning card fields changed');
    assert(fields.id.value==='lightning-path'&&fields.anchorX.name==='boltX'&&fields.anchorY.name==='boltTop'&&fields.align.value==='right'&&fields.accent.value==='#fde68a'&&fields.priority.value===.5&&fields.titleSize.value===11,'Lightning anchor/type changed');
    assert(JSON.stringify(astShape(oldTitle))===JSON.stringify(astShape(fields.title)),'Original lightning title expression changed');
    const expression='('+change.replacement.slice(object.start,object.end)+')';
    for(const width of [280,390,900])for(const study of [false,true])for(const reduced of [false,true]){
      const card=vm.runInNewContext(expression,{Math,w:width,boltX:width*.6,boltTop:70,lightningStudyAvailable:study,lightningStudyStep:'leader',motionReduced:reduced,lightningLeaderProgress:.8,getWcLightningStudyStep:()=>({label:'Stepped leader'})},{timeout:1000});
      assert(card.anchorX===width*.6&&card.anchorY===70&&card.x===width-8&&card.width===Math.min(210,width-16)&&card.y===57&&card.titleSize===11,'Lightning card geometry/anchor unbounded');fixtures++;
    }
    if(id==='lightning-return-caption'){
      const tail=candidate.slice(candidate.indexOf(change.replacement)+change.replacement.length);
      assert(/^\s*}\s*context\.restore\(\);/.test(tail),'Return-stroke glow cleanup is not restored before subsequent paint');
    }
  }
  const reservation=manifest.changes.find(c=>c.id==='charge-caption-clearance');
  assert(parse(reservation.replacement,{ecmaVersion:'latest'}).body.length===0,'Removed raw caption reservation contains unexpected statements');
  return{titleAnchorFixtures:fixtures,titleSize:11,obsoleteRawReservationRemoved:true,returnGlowCleanupRestored:true};
}
const baselinePath=process.argv[2],candidatePath=process.argv[3],mirrorPath=process.argv[4],outputPath=process.argv[5];
assert(baselinePath&&candidatePath,'Usage: baseline candidate [mirror] [report]');
const baselineBytes=fs.readFileSync(baselinePath),candidateBytes=fs.readFileSync(candidatePath);
assert(hash(baselineBytes)===baselineSha,'Wrong baseline');if(mirrorPath)assert(candidateBytes.equals(fs.readFileSync(mirrorPath)),'Source/mirror differ');
const baseline=baselineBytes.toString('utf8'),candidate=candidateBytes.toString('utf8');
const manifestPath=process.argv[6]||path.join(path.dirname(candidatePath),'presentation-changes.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
assert(manifest.baselineSha256===baselineSha&&manifest.sourceSha256===hash(candidateBytes),'Manifest identity differs');
assert(JSON.stringify(manifest.changes.map(c=>c.id).sort())===JSON.stringify(['cloud-volume-helpers','cloud-volume-assembly','compact-soil-pores','pore-shared-scope','pore-chapter-scope','charge-glyph-contrast','lightning-leader-caption','lightning-return-caption','charge-caption-clearance'].sort()),'Unexpected reviewed scope');
for(const change of manifest.changes){assert(baseline.split(change.original).length===2,'Original slice is not unique: '+change.id);assert(candidate.split(change.replacement).length===2,'Replacement slice is not unique: '+change.id);}
const original=regions(baseline),current=regions(candidate);let restored=candidate;
for(const change of manifest.changes){assert(restored.split(change.replacement).length===2,'Reviewed slice is not unique');restored=restored.replace(change.replacement,change.original);}
assert(Buffer.from(restored).equals(baselineBytes),'Source differs outside the nine reviewed presentation slices');
const glyphs=glyphContract(baseline,candidate),lightning=lightningContract(manifest,candidate);
const scopeText=declaration(candidate,'wcSoilPoreScope');
const scopeTree=parse(scopeText,{ecmaVersion:'latest'}).body[0];
assert(!scopeTree.params.length&&!scopeTree.async&&!scopeTree.generator&&scopeTree.body.body.length===1&&scopeTree.body.body[0].type==='ReturnStatement','Pore scope helper contains operations beyond translation');
const scopeCall=scopeTree.body.body[0].argument;
assert(scopeCall.type==='CallExpression'&&scopeCall.callee.name==='__alloT'&&scopeCall.arguments.length===2&&scopeCall.arguments[0].value==='stem.watercycle.soil_pore_diagram_scope'&&scopeCall.arguments[1].value==='This pore view is illustrative; soil saturation varies.','Pore scope translation differs');
const translated={};const __alloT=(key,fallback)=>{translated[key]=fallback;return fallback;};
const oldCaveat=vm.runInNewContext(declaration(baseline,'wcProcessCaveat')+'\nwcProcessCaveat;',{__alloT});
const newCaveat=vm.runInNewContext(scopeText+'\n'+declaration(candidate,'wcProcessCaveat')+'\nwcProcessCaveat;',{__alloT});
for(const id of ['evaporation','condensation','precipitation','collection','transpiration','unknown'])assert(oldCaveat(id)===newCaveat(id),'Unrelated process caveat changed');
assert(newCaveat('infiltration')===oldCaveat('infiltration')+' This pore view is illustrative; soil saturation varies.','Original recharge caveat not preserved');
const purity=paintContract(current.cloudHelpers.text+current.cloudAssembly.text);
const originalLobes=callArguments(original.cloudAssembly.text,'drawCloudPuff'),currentLobes=callArguments(current.cloudAssembly.text,'collectStormCloudLobe2d');
assert(originalLobes.length===5&&JSON.stringify(originalLobes)===JSON.stringify(currentLobes),'Original lobe argument expressions changed');
assert(JSON.stringify(canvasArguments(original.cloudAssembly.text,['ellipse']))===JSON.stringify(canvasArguments(current.cloudAssembly.text,['ellipse'])),'Original anvil arguments changed');
const silhouette=declaration(candidate,'wcStormCloudSilhouette2d'),bodyAt=silhouette.indexOf('var w = body.width');assert(bodyAt>=0,'Cloud envelope variables missing');
assert(JSON.stringify(canvasArguments(original.cloudAssembly.text,['moveTo','bezierCurveTo','quadraticCurveTo']))===JSON.stringify(canvasArguments(silhouette.slice(bodyAt,silhouette.lastIndexOf('}')),['moveTo','bezierCurveTo','quadraticCurveTo'])),'Original cloud-base envelope changed');
const oldPuff=parse(declaration(baseline,'drawCloudPuff'),{ecmaVersion:'latest'}).body[0],newPuff=parse(declaration(candidate,'drawCloudPuff'),{ecmaVersion:'latest'}).body[0];
assert(JSON.stringify(astShape(oldPuff.params))===JSON.stringify(astShape(newPuff.params))&&JSON.stringify(astShape(oldPuff.body.body[0]))===JSON.stringify(astShape(newPuff.body.body[0])),'Original cloud lobe signature or crown clamp changed');
const cloudDrawCases=[];
for(const width of [280,390,900])for(const moisture of [0,55,100])for(const convection of [0,.56,.9])for(const dark of [false,true]){
  const fixture={width,height:Math.max(240,width*.5),moisture,convection,dark,scale:.7+moisture/220,wind:convection>.56?-1:1};
  const one=renderClouds(current,fixture),two=renderClouds(current,fixture);assert(JSON.stringify(one.records)===JSON.stringify(two.records),'Cloud drawing is nondeterministic');
  cloudDrawCases.push({width,moisture,convection,dark,commands:one.commands,clips:one.clips});
}
const before=diagram(baseline),after=diagram(candidate);let unchanged=0;
for(const id of ['evaporation','condensation','precipitation','collection','transpiration','infiltration','unknown'])for(const state of [false,true]){if(id==='infiltration'&&state)continue;assert(JSON.stringify(before(id,state))===JSON.stringify(after(id,state)),'Unrelated diagram changed: '+id+'/'+state);unchanged++;}
const soil=after('infiltration',true),all=elements(soil);assert(soil.props.viewBox==='0 0 48 48'&&soil.props['aria-hidden']==='true'&&soil.props.focusable==='false','Soil SVG frame changed');
assert(all.filter(n=>n.props['data-soil-material']==='grain').length===4,'Soil grains not distinct');const water=all.filter(n=>n.props['data-soil-material']==='water');assert(water.length>=2&&water.every(n=>n.props['data-water-symbol']==='liquid'),'Pore water is not explicitly liquid');
for(const cue of ['infiltration-entry','partial-pore-water','water-film'])assert(all.some(n=>n.props['data-diagram-cue']===cue),'Missing soil science cue '+cue);
const bounded=checkSoilBounds(soil);
const oldKernel=kernel(baseline),newKernel=kernel(candidate);let modelCases=0;
for(const config of [undefined,...Object.values(oldKernel.presets),{tempC:0,surfaceTempC:0,moisture:0,wind:0,updraft:0,cloudDepth:1},{tempC:-40,surfaceTempC:45,moisture:100,wind:40,updraft:100,cloudDepth:12}]){const input=config&&freeze(plain(config));assert(JSON.stringify(plain(oldKernel.compute(input)))===JSON.stringify(plain(newKernel.compute(input))),'Precipitation model changed');modelCases++;}
const result={successful:true,baselineSha256:hash(baselineBytes),candidateSha256:hash(candidateBytes),restoredBaselineSha256:hash(Buffer.from(restored)),manifestSha256:hash(fs.readFileSync(manifestPath)),reviewedSliceCount:manifest.changes.length,reviewedRegions:Object.fromEntries(Object.entries(current).map(([name,r])=>[name,{sha256:hash(r.text),bytes:Buffer.byteLength(r.text)}])),purity,glyphs,lightning,preservedLobeArgumentSets:originalLobes.length,anvilArgumentsPreserved:true,baseEnvelopePreserved:true,crownClampPreserved:true,lobeLightConfinedToSharedClip:true,cloudDrawCaseCount:cloudDrawCases.length,cloudDrawCases,unchangedDiagramVariants:unchanged,boundedSoilShapes:bounded,modelCases,completedAt:new Date().toISOString()};
if(outputPath)fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
