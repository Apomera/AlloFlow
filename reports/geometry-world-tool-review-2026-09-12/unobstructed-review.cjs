const fs=require('fs'),vm=require('vm');const file='stem_lab/stem_tool_geometryworld_builder.js',raw=fs.readFileSync(file,'utf8');let s=raw.replace(/\r\n/g,'\n');function replace(a,b){if(s.split(a).length!==2)throw Error(a.slice(0,100));s=s.replace(a,b);}
replace('  function frameBuildPreview(ctx,plan,owner) {',`  function suspendPreviewScenery(engine) {
    var scenery=engine && engine._landscape;if(!scenery)return function(){};
    var visible=scenery.visible;scenery.visible=false;
    return function(){
      scenery.visible=visible;
      var current=engine._landscape;if(current){
        var studio=engine._showcase && engine._showcase.studio;
        if(studio){(studio.hidden || []).forEach(function(entry){if(entry[0]===current)entry[1]=visible;});current.visible=false;}
        else current.visible=visible;
      }
    };
  }
  function frameBuildPreview(ctx,plan,owner) {`);
replace('findWorkshopTools:findWorkshopTools,previewChangeFacts:previewChangeFacts,', 'suspendPreviewScenery:suspendPreviewScenery,findWorkshopTools:findWorkshopTools,previewChangeFacts:previewChangeFacts,');
replace('      var _previewReview=React.useState(false),previewReview=_previewReview[0],setPreviewReview=_previewReview[1];', `      var _previewReview=React.useState(false),previewReview=_previewReview[0],setPreviewReview=_previewReview[1];
      var _previewSurroundings=React.useState(false),previewSurroundings=_previewSurroundings[0],setPreviewSurroundings=_previewSurroundings[1];
      React.useEffect(function(){if(previewReview && !previewSurroundings)return suspendPreviewScenery(engine);},[previewReview,previewSurroundings,engine]);`);
replace("renderPreviewButtons(true),h('small',{className:'gwe-preview-escape'},'Esc cancels this preview.')", "renderPreviewButtons(true),h('label',{className:'gwe-preview-surroundings'},h('input',{type:'checkbox',checked:previewSurroundings,onChange:function(event){setPreviewSurroundings(event.target.checked);}}),'Show surroundings'),h('small',{className:'gwe-preview-escape'},'Esc cancels this preview.')");
replace("        'data-showcase-look': data.showcaseLook || 'meadow',", "        'data-showcase-look': data.showcaseLook || 'meadow',\n        'data-preview-review':previewReview?'true':'false',");
replace('.gwe-preview-escape{display:block;', '.gwe-enhanced[data-preview-review=true] .gw-placement-hint{display:none}.gwe-preview-surroundings{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;font-size:11px;margin-top:4px;cursor:pointer}.gwe-preview-surroundings input{width:17px;height:17px;accent-color:#8dbb92}.gwe-preview-escape{display:block;');
new vm.Script(s);if(raw.includes('\r\n'))s=s.replace(/\n/g,'\r\n');const fd=fs.openSync(file,'r+');fs.writeSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);
const test='tests/geometry_world_tool_review.test.js';let t=fs.readFileSync(test,'utf8');t+=String.raw`
describe('unobstructed preview presentation',()=>{
  it('hides only scenery while reviewing and restores it when the user returns to tools',()=>{
    const app=fixture.mount(),e=previewBridge(app);e._landscape=new THREE.Group();e.setViewPreset=vi.fn();const blocks=Object.values(e.blocks);app.click(app.button('Preview change'));app.click(app.button('Review in world'));expect(e._landscape.visible).toBe(false);expect(Object.values(e.blocks)).toEqual(blocks);expect(blocks.every(b=>b.visible)).toBe(true);app.click(app.button('Back to tools'));expect(e._landscape.visible).toBe(true);
  });
  it('restores the original visibility after render-quality replacement without revealing scenery during studio presentation',()=>{
    const e={_landscape:new THREE.Group()},old=e._landscape,restore=api.suspendPreviewScenery(e);e._landscape=new THREE.Group();e._landscape.visible=false;restore();expect(old.visible).toBe(true);expect(e._landscape.visible).toBe(true);
    const finish=api.suspendPreviewScenery(e);e._showcase={studio:{hidden:[[e._landscape,false]]}};finish();expect(e._landscape.visible).toBe(false);expect(e._showcase.studio.hidden[0][1]).toBe(true);
  });
  it('preserves already hidden scenery when review ends',()=>{const e={_landscape:new THREE.Group()};e._landscape.visible=false;const restore=api.suspendPreviewScenery(e);restore();expect(e._landscape.visible).toBe(false);});
});
`;const tf=fs.openSync(test,'r+');fs.writeSync(tf,t);fs.ftruncateSync(tf,Buffer.byteLength(t));fs.closeSync(tf);console.log('Added reversible scenery isolation for preview review, with an explicit surroundings toggle.');
