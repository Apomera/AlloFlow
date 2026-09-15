const fs=require('fs'),vm=require('vm');
const file='stem_lab/stem_tool_geometryworld_builder.js',original=fs.readFileSync(file,'utf8');let source=original.replace(/\r\n/g,'\n');
function replace(before,after){if(source.split(before).length!==2)throw Error('Expected one match: '+before.slice(0,100));source=source.replace(before,after);}
replace('  function removeWorldProject(id,storage) {',`  function newWorldVariation(shelf,world,garden,storage) {
    if(shelf.projects.length>=8)return {ok:false,reason:'My Worlds holds 8 projects. Download and remove a saved project to make room. Your current build is unchanged.'};
    var checked=normalizeEditableWorld(world);if(!checked.ok)return {ok:false,reason:checked.error};
    var names=shelf.projects.map(function(p){return p.world.title.toLowerCase();}),title=checked.value.title,base=title.replace(/ · variation \\d+$/i,''),number=2;
    while(names.indexOf(title.toLowerCase())!==-1){var suffix=' · variation '+number++;title=base.slice(0,80-suffix.length)+suffix;}
    checked.value.title=title;
    var now=Date.now(),seed='world_'+now.toString(36)+'_'+Math.random().toString(36).slice(2,9),id=seed,index=2;
    while(shelf.projects.some(function(p){return p.id===id;}))id=seed+'_'+index++;
    var project={id:id,version:now.toString(36)+'_'+Math.random().toString(36).slice(2,10),savedAt:now,world:checked.value,garden:garden!==false};
    var result=writeWorldShelf(shelf.projects.concat([project]),storage);if(result.ok)result.project=project;return result;
  }
  function saveWorldCopy(engine,title,storage) {
    if(!engine || engine._destroyed || !engine._currentLesson || !engine._currentLesson.sandbox)return {ok:false,reason:'Open Free Build to save a variation.'};
    var shelf=readWorldShelf(storage);if(!shelf.ok)return shelf;
    var world=editableWorld(engine),previous=shelf.projects.find(function(p){return p.id===engine._workshopProjectId;});
    if(!world.blocks.length)return {ok:false,reason:'Place a block before saving a new variation.'};
    world.title=editableTitle(title || (previous && previous.world.title) || 'Untitled build');
    // Fork the current geometry without writing over the earlier saved draft.
    // A new identity is also a safe recovery path for a stale tab's unsaved work.
    var result=newWorldVariation(shelf,world,engine._currentLesson.builderGarden,storage);
    if(result.ok){engine._workshopProjectId=result.project.id;engine._workshopProjectVersion=result.project.version;engine._workshopSavedSignature=JSON.stringify([result.project.world,result.project.garden]);}
    return result;
  }
  function duplicateWorldProject(id,storage) {
    var shelf=readWorldShelf(storage);if(!shelf.ok)return shelf;
    var project=shelf.projects.find(function(p){return p.id===id;});
    if(!project)return {ok:false,reason:'This project is no longer saved. Refresh My Worlds to see your current projects.'};
    return newWorldVariation(shelf,project.world,project.garden,storage);
  }
  function removeWorldProject(id,storage) {`);
replace('function previewPrintPreparation(engine,kind) {','function previewPrintPreparation(engine,kind,options) {');
replace(`    var width=max.x-min.x+3,depth=max.z-min.z+3;
    if(width*depth+snapshot.blocks.length>MAX_BLOCKS)return {ok:false,reason:'The padded base would exceed the build limit. Select a smaller creation.'};
    // Lift the complete selection one grid layer and fill a solid plate below it.`, `    options=options || {};
    var padding=options.padding==null?1:Number(options.padding),thickness=options.thickness==null?1:Number(options.thickness),material=options.material==null?'stone':options.material;
    if(options.padding==='' || !Number.isInteger(padding) || padding<0 || padding>4)return {ok:false,reason:'Enter a whole-number base margin from 0 to 4 blocks.'};
    if(options.thickness==='' || !Number.isInteger(thickness) || thickness<1 || thickness>4)return {ok:false,reason:'Enter a whole-number base thickness from 1 to 4 blocks.'};
    if(['stone','wood','brick'].indexOf(material)===-1)return {ok:false,reason:'Choose stone, wood, or brick for the base appearance.'};
    var width=max.x-min.x+1+padding*2,depth=max.z-min.z+1+padding*2;
    if(width*depth*thickness+snapshot.blocks.length>MAX_BLOCKS)return {ok:false,reason:'The padded base would exceed the build limit. Reduce its margin or thickness, or select a smaller creation.'};
    // Lift the complete selection above the requested solid plate.`);
replace('var additions=snapshot.blocks.map(function(b){return Object.assign({},b,{y:b.y+2-min.y});}),columns=Object.create(null);','var additions=snapshot.blocks.map(function(b){return Object.assign({},b,{y:b.y+thickness+1-min.y});}),columns=Object.create(null);');
replace('for(var x=min.x-1;x<=max.x+1;x++)for(var z=min.z-1;z<=max.z+1;z++){\n      var top=columns[x+\',\'+z]||2;',"for(var x=min.x-padding;x<=max.x+padding;x++)for(var z=min.z-padding;z<=max.z+padding;z++){\n      var top=columns[x+','+z]||thickness+1;");
replace("additions.push({x:x,y:y,z:z,type:'stone',shape:'cube',rotation:0});","additions.push({x:x,y:y,z:z,type:material,shape:'cube',rotation:0});");
replace('  function createGeometryPrintGuide(engine,data) {',`  function printIssueTarget(guide,kind,index) {
    if(!guide)return null;
    if(kind==='overflow')return guide.outside.length?{cells:guide.outside,label:'Oversized region'}:null;
    if(kind!=='part')return null;
    var part=guide.parts.find(function(p){return p.index===index;});
    return part?{cells:part.cells,label:'Piece '+part.index,raised:part.raised}:null;
  }
  function focusGeometryPrintIssue(ctx,kind,index) {
    var engine=window[ENGINE_KEY],data=ctx && ctx.toolData && ctx.toolData.geometryWorld || {},positions=engine && engine._builderSelection && engine._builderSelection.blocks;
    if(!engine || engine._destroyed || engine._showcase || !engine._currentLesson || !engine._currentLesson.sandbox || !positions || !positions.length || !engine.camera || !engine.setViewPreset)return {ok:false,reason:'Select a creation in Free Build first.'};
    var signature=blockMeasurementSignature(engine,positions.map(keyFor)),check=data.builderPrintCheck && data.builderPrintCheck.selectionSignature===signature?data.builderPrintCheck:null;
    if(kind==='part' && !check)return {ok:false,reason:'The selection changed. Wait for the current piece check, then inspect again.'};
    var guide=geometryPrintGuideData(engine,positions,storedPrinterProfile(ctx),printContext(ctx).unitMm,check),target=printIssueTarget(guide,kind,index);
    if(!target)return {ok:false,reason:kind==='overflow'?'The current selection fits at this print scale.':'This piece is no longer in the current selection.'};
    var THREE=window.THREE,box=creationGeometryBounds(engine,target.cells),center=box.getCenter(new THREE.Vector3()),sphere=Math.max(.8,box.getSize(new THREE.Vector3()).length()/2),camera=engine.camera;
    var vertical=(camera.fov || 60)*Math.PI/360,horizontal=Math.atan(Math.tan(vertical)*Math.max(.1,camera.aspect || 1));
    var radius=sphere/Math.sin(Math.min(vertical,horizontal))*.78;
    engine.setViewPreset('front',{x:center.x,y:center.y,z:center.z,radius:radius});
    engine._builderPrintFocusLesson=engine._currentLesson;
    patchGeometryState(ctx,{builderPrintGuide:true,builderPrintFocus:{kind:kind,index:index,selectionSignature:signature,label:target.label,blocks:target.cells.length},sandboxDockCollapsed:true,hudPanel:''});
    focusPrintCameraControl(engine,'.gwe-print-focus-return');
    announce(ctx,target.label+' highlighted. All '+positions.length+' selected blocks are still included in exports.');
    return {ok:true,label:target.label,blocks:target.cells.length};
  }
  function createGeometryPrintGuide(engine,data) {`);
replace("group.add(lines);group.raycast=function(){};return group;",`group.add(lines);
    if(data.focus){var box=creationGeometryBounds(engine,data.focus.cells),focus=createSelectionFrame(box,{components:2});if(focus){focus.name='gwe-print-issue-focus';focus.material.opacity=1;focus.renderOrder=999;group.add(focus);}}
    group.raycast=function(){};return group;`);
replace("if(!engine || engine._destroyed || !data.builderPrintGuide || !data.worldActive || !positions || !positions.length){disposeGeometryPrintGuide(engine);return;}","if(!engine || engine._destroyed || !data.builderPrintGuide || !data.worldActive || !positions || !positions.length){disposeGeometryPrintGuide(engine);if(data.builderPrintFocus || data.builderPrintGuideSummary)patchGeometryState(ctx,{builderPrintFocus:null,builderPrintGuideSummary:null});return;}");
replace("    var next=signature+'|'+unit+'|'+JSON.stringify(builderBedLimits(profile))+'|'+(check?'checked':'pending');",`    var requested=data.builderPrintFocus,focus=requested && requested.selectionSignature===signature && engine._builderPrintFocusLesson===engine._currentLesson?requested:null;
    if(requested && !focus)patchGeometryState(ctx,{builderPrintFocus:null});
    var next=signature+'|'+unit+'|'+JSON.stringify(builderBedLimits(profile))+'|'+(check?'checked':'pending')+'|'+(focus?focus.kind+':'+focus.index:'');`);
replace('    var group=createGeometryPrintGuide(engine,guide);if(!group)return;',`    if(focus){guide.focus=printIssueTarget(guide,focus.kind,focus.index);if(!guide.focus)patchGeometryState(ctx,{builderPrintFocus:null});}
    var group=createGeometryPrintGuide(engine,guide);if(!group)return;`);
replace('builderPrintGuideSummary:{fits:guide.fits,','builderPrintGuideSummary:{selectionSignature:signature,fits:guide.fits,');
replace('geometryPrintGuideData:geometryPrintGuideData,','printIssueTarget:printIssueTarget,focusGeometryPrintIssue:focusGeometryPrintIssue,geometryPrintGuideData:geometryPrintGuideData,');
replace('readWorldShelf:readWorldShelf,saveWorldDraft:saveWorldDraft,','readWorldShelf:readWorldShelf,saveWorldDraft:saveWorldDraft,saveWorldCopy:saveWorldCopy,duplicateWorldProject:duplicateWorldProject,');
replace("      var _removeProject=React.useState(''),removeProject=_removeProject[0],setRemoveProject=_removeProject[1];",`      var _removeProject=React.useState(''),removeProject=_removeProject[0],setRemoveProject=_removeProject[1];
      var _baseOptions=React.useState({padding:1,thickness:1,material:'stone'}),baseOptions=_baseOptions[0],setBaseOptions=_baseOptions[1];
      var _printPartPage=React.useState(0),printPartPage=_printPartPage[0],setPrintPartPage=_printPartPage[1];
      React.useEffect(function(){setPrintPartPage(0);},[data.builderPrintGuideSummary && data.builderPrintGuideSummary.selectionSignature]);
      function updateBaseOption(key,value){setBaseOptions(function(previous){var next=Object.assign({},previous);next[key]=value;return next;});cancelSelectionPreview();}
      function inspectPrintIssue(kind,index){changePointerMode('build');var result=focusGeometryPrintIssue(ctx,kind,index);if(!result.ok)announce(ctx,result.reason,'error');}
      function saveVariation(){var result=saveWorldCopy(window[ENGINE_KEY],projectName);savedDraft(result);if(result.ok){setProjectName(result.project.world.title);announce(ctx,'Now editing '+result.project.world.title+'. Your earlier saved project is kept in My Worlds.');}}
      function duplicateShelfProject(project){var result=duplicateWorldProject(project.id);if(!result.ok){publishProjectNotice(result.reason);return;}setWorldShelf(result);setProjectChoice(result.project.id);setRemoveProject('');publishProjectNotice('Created '+result.project.world.title+' from the saved project. Open it to begin editing.');}
      function renderPrintPieces(){
        var summary=data.builderPrintGuideSummary;if(!data.builderPrintGuide || !summary)return null;
        var parts=summary.parts || [],page=Math.min(printPartPage,Math.max(0,Math.ceil(parts.length/8)-1));
        return h('section',{className:'gwe-print-pieces','aria-label':'Inspect print regions'},
          summary.outside>0 && h('button',{type:'button',className:'gwe-overflow-inspect',onClick:function(){inspectPrintIssue('overflow');}},'Inspect oversized blocks'),
          parts.length>1 && h('p',null,'Inspect a piece without changing which blocks will be exported.'),
          parts.length>1 && h('div',{className:'gwe-print-piece-grid'},parts.slice(page*8,page*8+8).map(function(part){return h('button',{key:part.index,type:'button','aria-label':'Inspect piece '+part.index,'aria-pressed':!!(data.builderPrintFocus && data.builderPrintFocus.kind==='part' && data.builderPrintFocus.index===part.index),onClick:function(){inspectPrintIssue('part',part.index);}},h('span',{className:'gwe-piece-index','aria-hidden':'true'},String(part.index).padStart(2,'0')),h('span',null,h('strong',null,'Piece '+part.index),h('small',null,part.blocks+' block'+(part.blocks===1?'':'s')+' · '+(part.raised?'Raised':'At base'))));})),
          parts.length>8 && h('div',{className:'gwe-piece-pages'},h('button',{type:'button',disabled:page===0,onClick:function(){setPrintPartPage(page-1);}},'Previous pieces'),h('span',{role:'status'},(page*8+1)+'–'+Math.min(parts.length,page*8+8)+' of '+parts.length),h('button',{type:'button',disabled:(page+1)*8>=parts.length,onClick:function(){setPrintPartPage(page+1);}},'More pieces')));
      }`);
replace("h('strong',null,p.world.title),h('span',null,p.world.blocks.length+' blocks · '+new Date(p.savedAt).toLocaleDateString())", "h('strong',null,p.world.title),h('span',null,p.world.blocks.length+' blocks · '+new Date(p.savedAt).toLocaleDateString()),window[ENGINE_KEY] && window[ENGINE_KEY]._workshopProjectId===p.id && h('span',{className:'gwe-project-current'},'Current project')");
replace("              h('button',{type:'button',disabled:!p.world.blocks.length,onClick:function(){downloadBlob", "              h('button',{type:'button',disabled:!p.world.blocks.length,onClick:function(){duplicateShelfProject(p);}},'Duplicate project'),\n              h('button',{type:'button',disabled:!p.world.blocks.length,onClick:function(){downloadBlob");
replace("A connecting base adds a padded stone plate and solid columns under raised parts; internal gaps still need review in Print Lab.","A connecting base adds a solid plate and columns under raised parts. Internal gaps still need review in Print Lab.");
replace("              h('div',{className:'gwe-builder-actions'},[['base','Preview connecting base']",`              h('fieldset',{className:'gwe-base-settings'},h('legend',null,'Connecting base'),
                h('div',{className:'gwe-base-dimensions'},[['padding','Base margin',0,4],['thickness','Base thickness',1,4]].map(function(field){return h('label',{key:field[0]},field[1],h('input',{type:'number',inputMode:'numeric',min:field[2],max:field[3],step:1,value:baseOptions[field[0]],'aria-label':field[1]+' in blocks',onChange:function(event){updateBaseOption(field[0],event.target.value);}}),h('small',null,'blocks'));})),
                h('label',null,'Base appearance',h('select',{value:baseOptions.material,onChange:function(event){updateBaseOption('material',event.target.value);}},['stone','wood','brick'].map(function(material){return h('option',{key:material,value:material},material.charAt(0).toUpperCase()+material.slice(1));}))),
                h('p',{className:'gwe-builder-note'},'Margin extends on every side. Appearance stays editable; choose physical filament in Print Lab.')),
              h('div',{className:'gwe-builder-actions'},[['base','Preview connecting base']`);
replace('previewPrintPreparation(window[ENGINE_KEY],a[0])','previewPrintPreparation(window[ENGINE_KEY],a[0],baseOptions)');
replace("patchGeometryState(ctx,{builderPrintGuide:!data.builderPrintGuide});","patchGeometryState(ctx,{builderPrintGuide:!data.builderPrintGuide,builderPrintFocus:null});");
replace("                data.builderPrintGuide && h('button',{type:'button',onClick:function(){frameGeometryPrintGuide(ctx);}},'View printer bed'),","                data.builderPrintGuide && h('button',{type:'button',onClick:function(){changePointerMode('build');patchGeometryState(ctx,{builderPrintFocus:null});frameGeometryPrintGuide(ctx);}},'View printer bed'),");
replace("              data.builderPrintGuide && data.builderPrintGuideSummary && h('div'", "              renderPrintPieces(),\n              data.builderPrintGuide && data.builderPrintGuideSummary && h('div'");
replace("            h('button',{type:'button',onClick:function(){var live=window[ENGINE_KEY];if(live && live.openGeometryHome)","            h('button',{type:'button',className:'gwe-save-variation',onClick:saveVariation},'Save as new variation'),\n            h('p',{className:'gwe-builder-note'},'Keep the earlier saved project and continue editing a new copy.'),\n            h('button',{type:'button',onClick:function(){var live=window[ENGINE_KEY];if(live && live.openGeometryHome)");
const css='.gwe-base-settings{min-width:0;margin:12px 0;padding:12px;border:1px solid #769482;border-radius:12px;background:#ffffff08}.gwe-base-settings legend{padding:0 6px;font-size:13px;font-weight:700}.gwe-base-dimensions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.gwe-base-settings label{display:flex;flex-direction:column;gap:5px;font-size:12px;margin-bottom:9px}.gwe-base-settings input,.gwe-base-settings select{min-width:0;width:100%;box-sizing:border-box;min-height:44px;border:1px solid #8fa799;border-radius:8px;background:#fffdf5;color:#29473a;padding:8px;font:inherit}.gwe-base-settings small{font-size:11px}.gwe-base-settings p{margin-bottom:0}.gwe-print-piece-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.gwe-print-piece-grid button{display:flex;align-items:center;gap:8px;min-height:64px;text-align:left;padding:9px!important;min-width:0}.gwe-print-piece-grid strong,.gwe-print-piece-grid small{display:block;overflow-wrap:anywhere}.gwe-print-piece-grid small{font-size:11px;font-weight:400;margin-top:4px}.gwe-piece-index{font-size:20px;opacity:.65;font-variant-numeric:tabular-nums}.gwe-print-piece-grid button[aria-pressed=true]{box-shadow:inset 0 0 0 2px #cbae70}.gwe-piece-pages{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin:10px 0}.gwe-piece-pages span{font-size:12px}.gwe-overflow-inspect{width:100%;min-height:44px;border-color:#c88469!important}.gwe-print-focus-hud{position:absolute;z-index:40;top:128px;left:16px;width:280px;max-width:calc(100% - 32px);box-sizing:border-box;padding:12px 14px;border:1px solid #d9bd80;border-radius:14px;background:#183d32f5;color:#fff5d6;box-shadow:0 7px 22px #09271d33}.gwe-print-focus-hud strong{font-size:14px}.gwe-print-focus-hud p{font-size:12px;line-height:1.5;margin:5px 0 9px}.gwe-print-focus-hud>div{display:flex;flex-wrap:wrap;gap:8px}.gwe-print-focus-hud button{font:600 12px system-ui;min-height:44px;padding:8px 10px;border:1px solid #d5c79d;border-radius:9px;background:#f9f5e6;color:#264a39;cursor:pointer}.gwe-print-focus-hud button:focus-visible,.gwe-base-settings :focus-visible,.gwe-print-pieces button:focus-visible,.gwe-save-variation:focus-visible{outline:3px solid #d6a33b;outline-offset:3px}.gwe-project-pick>.gwe-project-current{align-self:flex-start;margin:7px 12px 0;padding:3px 8px;border:1px solid #b8c9a7;border-radius:20px;background:#e8efdc;color:#355a3f;font-size:11px}.gwe-save-variation{width:100%;min-height:44px}.theme-contrast .gwe-print-focus-hud,[data-stem-theme=contrast] .gwe-print-focus-hud{background:#000;color:#fff;border-color:#fff}@media(max-width:380px){.gwe-print-piece-grid{grid-template-columns:1fr}.gwe-print-focus-hud{top:118px;left:12px;max-width:calc(100% - 24px)}}';
replace('      var additions = [h(\'style\',{key:\'gwe-design-css\'},',"      var additions = [h('style',{key:'gwe-variations-css'},"+JSON.stringify(css)+"),h('style',{key:'gwe-design-css'},");
replace("      if(isSandbox && data.worldActive && pointerMode!=='build'",`      if(isSandbox && data.worldActive && data.builderPrintGuide && data.builderPrintFocus && !homeOpen && !data.showcaseActive)additions.push(h('section',{key:'gwe-print-focus',className:'gwe-print-focus-hud','aria-label':'Highlighted print region'},h('strong',null,data.builderPrintFocus.label+' · '+data.builderPrintFocus.blocks+' blocks'),h('p',null,'Gold corners mark this region. Your full selection is still included in exports.'),h('div',null,h('button',{type:'button',className:'gwe-print-focus-return',onClick:function(){if(engine && engine.setViewPreset)engine.setViewPreset('free');patchGeometryState(ctx,{builderPrintFocus:null,sandboxDockCollapsed:false});focusPrintCameraControl(engine,'.gwe-print-guide-options > summary');}},'Return camera'),h('button',{type:'button',onClick:function(){patchGeometryState(ctx,{builderPrintFocus:null,sandboxDockCollapsed:false});focusPrintCameraControl(engine,'.gwe-print-guide-options > summary');}},'Clear highlight'))));
      if(isSandbox && data.worldActive && pointerMode!=='build'`);
new vm.Script(source,{filename:file});if(original.includes('\r\n'))source=source.replace(/\n/g,'\r\n');
const fd=fs.openSync(file,'r+');fs.writeSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);
console.log('Applied project variations, adjustable print bases, and focused print inspection.');
