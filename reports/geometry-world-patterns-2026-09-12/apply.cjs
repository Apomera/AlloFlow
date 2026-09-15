const fs=require('fs'),vm=require('vm');
function edit(file,fn){const raw=fs.readFileSync(file,'utf8');let source=raw.replace(/\r\n/g,'\n');const replace=(from,to)=>{if(source.split(from).length!==2)throw Error('Expected exactly one match: '+from.slice(0,160));source=source.replace(from,to);};source=fn(source,replace)||source;new vm.Script(source,{filename:file});const data=Buffer.from(raw.includes('\r\n')?source.replace(/\n/g,'\r\n'):source);const fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}console.log('Updated '+file);}
edit('stem_lab/stem_tool_geometryworld_builder.js',(source,replace)=>{
 const start=source.indexOf('    var minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;',source.indexOf('  function transformCreationBlocks'));
 const end=source.indexOf('    var additions=blocks.map(function(source){',start);
 replace(source.slice(start,end),`    var min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
    blocks.forEach(function(b){['x','y','z'].forEach(function(a){min[a]=Math.min(min[a],b[a]);max[a]=Math.max(max[a],b[a]);});});
    var minX=min.x,maxX=max.x,minZ=min.z,maxZ=max.z,offset={x:0,y:0,z:0};
    if(operation==='repeat'){
      if(['x','y','z'].indexOf(values.axis)===-1 || (values.direction!==1 && values.direction!==-1))return {ok:false,reason:'Choose a pattern axis and direction.'};
      if(!Number.isInteger(values.total) || values.total<2 || values.total>12)return {ok:false,reason:'Choose 2 to 12 instances, including the original.'};
      if(!Number.isInteger(values.gap) || values.gap<0 || values.gap>8)return {ok:false,reason:'Choose a whole-number gap from 0 to 8 blocks.'};
      if(blocks.length*values.total>MAX_BLOCKS)return {ok:false,reason:'This pattern exceeds the '+MAX_BLOCKS+'-block limit. Use fewer instances or a smaller selection.'};
      var step=(max[values.axis]-min[values.axis]+1+values.gap)*values.direction,copies=[];
      for(var instance=1;instance<values.total;instance++)blocks.forEach(function(source){var b=Object.assign({},source);b[values.axis]+=step*instance;copies.push(b);});
      return {ok:true,additions:copies,removals:[],selection:blocks.concat(copies).map(function(b){return {x:b.x,y:b.y,z:b.z};}),label:'Repeat creation · '+values.total+' total'};
    }
    if(operation==='align'){
      if(['x','y','z'].indexOf(values.axis)===-1 || ['start','end'].indexOf(values.edge)===-1)return {ok:false,reason:'Choose an axis and an edge to align.'};
      if(!Number.isInteger(values.coordinate) || Math.abs(values.coordinate)>128)return {ok:false,reason:'Choose a whole-number grid line from -128 to 128.'};
      offset[values.axis]=values.coordinate-(values.edge==='start'?min[values.axis]:max[values.axis]+1);
      if(!offset[values.axis])return {ok:false,reason:'This grid edge is already aligned with that line.'};
    }else if(operation==='move' || operation==='duplicate'){
      for(var axis of ['x','y','z']){
        var value=values[axis];
        if(typeof value!=='number' || !isFinite(value) || Math.floor(value)!==value || Math.abs(value)>128)return {ok:false,reason:'Use whole-number offsets from -128 to 128.'};
        offset[axis]=value;
      }
      if(!offset.x && !offset.y && !offset.z)return {ok:false,reason:'Choose an offset of at least one block.'};
    }else if(operation==='recolor'){
      if(!BLOCK_TYPES.some(function(t){return t.id===values.type && t.id!=='grass';}))return {ok:false,reason:'Choose a building material.'};
    }else if(['rotate','mirrorX','mirrorZ'].indexOf(operation)===-1)return {ok:false,reason:'Choose an editing action.'};
`);
 replace("if(operation==='move' || operation==='duplicate'){b.x+=offset.x;b.y+=offset.y;b.z+=offset.z;}","if(operation==='move' || operation==='duplicate' || operation==='align'){b.x+=offset.x;b.y+=offset.y;b.z+=offset.z;}");
 replace("label:{move:'Move creation',duplicate:'Duplicate creation'","label:{align:'Align creation',move:'Move creation',duplicate:'Duplicate creation'");
 replace("blocks:plan.additions.map(function(b){return {x:b.x,y:b.y,z:b.z};})},engine._builderSelection.exact?{exact:true}:{}","blocks:plan.selection || plan.additions.map(function(b){return {x:b.x,y:b.y,z:b.z};})},plan.selection || engine._builderSelection.exact?{exact:true}:{}");
 replace("      var _selectionEditMaterial=React.useState('stone')",`      var _patternOptions=React.useState({axis:'x',direction:'1',total:'4',gap:'1'}),patternOptions=_patternOptions[0],setPatternOptions=_patternOptions[1];
      var _alignOptions=React.useState({axis:'x',edge:'start',coordinate:'0'}),alignOptions=_alignOptions[0],setAlignOptions=_alignOptions[1];
      var _selectionEditMaterial=React.useState('stone')`);
 replace("        var result=previewSelectionEdit(window[ENGINE_KEY],selectionEditMode,offset);",`        var values=offset;
        if(selectionEditMode==='repeat')values={axis:patternOptions.axis,direction:Number(patternOptions.direction),total:patternOptions.total.trim()===''?NaN:Number(patternOptions.total),gap:patternOptions.gap.trim()===''?NaN:Number(patternOptions.gap)};
        if(selectionEditMode==='align')values={axis:alignOptions.axis,edge:alignOptions.edge,coordinate:alignOptions.coordinate.trim()===''?NaN:Number(alignOptions.coordinate)};
        var result=previewSelectionEdit(window[ENGINE_KEY],selectionEditMode,values);`);
 replace("[['move','Move'],['duplicate','Duplicate'],['rotate','Rotate 90°']","[['move','Move'],['duplicate','Duplicate'],['repeat','Repeat a pattern'],['align','Align to grid'],['rotate','Rotate 90°']");
 replace("            selectionEditMode==='rotate' && h('p'",`            selectionEditMode==='repeat' && h('div',{className:'gwe-pattern-options'},
              h('p',{className:'gwe-builder-note'},'Repeat the selected blocks at equal intervals. Total includes the original. Zero gap makes copies meet at their grid edges; one gap leaves an empty cell.'),
              renderPrecisionSelect('gwe-pattern-axis','Pattern axis',patternOptions,setPatternOptions,'axis',[['x','X · across'],['z','Z · in depth'],['y','Y · stack']]),
              renderPrecisionSelect('gwe-pattern-direction','Direction',patternOptions,setPatternOptions,'direction',[['1','Positive direction (+)'],['-1','Negative direction (−)']]),
              h('div',{className:'gwe-precision-numbers'},renderPrecisionNumber('gwe-pattern-total','Total instances',patternOptions,setPatternOptions,'total',2,12),renderPrecisionNumber('gwe-pattern-gap','Gap in blocks',patternOptions,setPatternOptions,'gap',0,8)),
              h('p',{className:'gwe-builder-note'},'Apply selects the entire pattern. One Undo removes all new copies.')),
            selectionEditMode==='align' && h('div',{className:'gwe-alignment-options'},
              h('p',{className:'gwe-builder-note'},'Place one edge of the selected grid footprint on an exact grid line. Every block keeps its shape and spacing.'),
              renderPrecisionSelect('gwe-align-axis','Alignment axis',alignOptions,setAlignOptions,'axis',[['x','X · across'],['z','Z · in depth'],['y','Y · height']]),
              renderPrecisionSelect('gwe-align-edge','Grid edge',alignOptions,setAlignOptions,'edge',[['start','Start · lower coordinate'],['end','End · higher coordinate']]),
              renderPrecisionNumber('gwe-align-coordinate','Target grid line',alignOptions,setAlignOptions,'coordinate',-128,128),
              h('p',{className:'gwe-builder-note'},'For example, a cube in X = 3 starts at line 3 and ends at line 4. Aligning Y start to line 1 rests the lowest grid layer on the ground.'),
              h('button',{type:'button',onClick:function(){setAlignOptions({axis:'y',edge:'start',coordinate:'1'});cancelSelectionPreview();}},'Use ground level')),
            selectionEditMode==='rotate' && h('p'`);
 replace('      function renderCreationEditing(){',`      function renderPrecisionSelect(id,label,values,setValues,key,options){
        return h('label',{className:'gwe-edit-label',htmlFor:id},label,h('select',{id:id,value:values[key],onChange:function(event){var next=Object.assign({},values);next[key]=event.target.value;setValues(next);cancelSelectionPreview();}},options.map(function(option){return h('option',{key:option[0],value:option[0]},option[1]);})));
      }
      function renderPrecisionNumber(id,label,values,setValues,key,min,max){
        return h('label',{className:'gwe-edit-label',htmlFor:id},label,h('input',{id:id,type:'number',inputMode:'numeric',min:min,max:max,step:1,value:values[key],onChange:function(event){var next=Object.assign({},values);next[key]=event.target.value;setValues(next);cancelSelectionPreview();}}));
      }
      function renderCreationEditing(){`);
 replace('.gwe-creation-editor select,.gwe-stamp-library select,.gwe-stamp-library input,.gwe-edit-coordinates input{','.gwe-creation-editor select,.gwe-creation-editor input,.gwe-stamp-library select,.gwe-stamp-library input,.gwe-edit-coordinates input{');
 replace('.gwe-creation-editor,.gwe-stamp-library{display:block}', '.gwe-creation-editor,.gwe-stamp-library{display:block}.gwe-precision-numbers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.gwe-precision-numbers label{min-width:0}.gwe-pattern-options select,.gwe-alignment-options select,.gwe-pattern-options input,.gwe-alignment-options input{display:block;margin-top:5px}');
 const toolLine=source.split('\n').find(l=>l.includes("id:'transform'"));
 replace(toolLine,toolLine.replace("keywords:'","keywords:'repeat pattern array align alignment grid spacing ").replace("description:'","description:'Repeat patterns, align grid edges, "));
 replace("      },[selectionEditPreview]);",`      },[selectionEditPreview]);
      React.useEffect(function(){
        var live=selectionEditPreview && selectionEditPreview.engine,owner=selectionPreviewOwner.current;
        if(!live || !live.setBuildPreviewSurface)return;
        live.setBuildPreviewSurface(!!previewReview,owner);
        return function(){live.setBuildPreviewSurface(false,owner);};
      },[previewReview,selectionEditPreview]);`);
});
edit('stem_lab/stem_tool_geometryworld.js',(source,replace)=>{
 replace("engine.scene.remove(state.group);state.group.traverse(function(part){if(part.geometry)part.geometry.dispose();});state.material.dispose();engine._buildBatchPreview=null;", "engine.scene.remove(state.group);state.group.traverse(function(part){if(part.geometry)part.geometry.dispose();if(part.material)part.material.dispose();});engine._buildBatchPreview=null;");
 replace("[b.x,b.y,b.z,b.shape,b.rotation].join(',')","[b.x,b.y,b.z,b.type,b.shape,b.rotation].join(',')");
 replace("engine._buildBatchPreview={owner:owner,signature:signature,group:group,material:material};", "engine._buildBatchPreview={owner:owner,signature:signature,group:group,material:material,ready:!!plan.ok,blocks:list.map(function(b){return Object.assign({},b);})};");
 replace("          engine.isDrawingAllowed=function() {",`          // Material surfaces are allocated only for an explicit Review in world.
          // Ordinary drawing remains one line draw call. Preview meshes never enter
          // engine.blocks, collision checks, measurements, saves, or print exports.
          engine.setBuildPreviewSurface=function(visible,owner) {
            var state=engine._buildBatchPreview;
            if(!state || (owner && owner!==state.owner))return false;
            if(!visible || !state.ready){if(state.surfaces)state.surfaces.visible=false;state.material.opacity=.82;return false;}
            if(!state.surfaces){
              var surfaces=new THREE.Group(),buckets=Object.create(null),cache=Object.create(null);
              surfaces.name='gw-preview-materials';surfaces.userData.gwDecorative=true;
              state.blocks.forEach(function(b){
                var shape=BLOCK_SHAPES.some(function(s){return s.id===b.shape;})?b.shape:'cube';
                if(!cache[shape]){var base=createShapeGeometry(shape),geo=base.index?base.toNonIndexed():base;cache[shape]={position:Array.from(geo.attributes.position.array),normal:Array.from(geo.attributes.normal.array),uv:Array.from(geo.attributes.uv.array)};if(geo!==base)geo.dispose();base.dispose();}
                var type=BLOCK_TYPES.some(function(t){return t.id===b.type;})?b.type:'stone',bucket=buckets[type] || (buckets[type]={position:[],normal:[],uv:[]}),data=cache[shape],angle=shape==='cube'?0:(b.rotation || 0)*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle),oy=shape==='halfB'?.25:shape==='halfA'||shape==='quarter'?0:.5;
                for(var i=0;i<data.position.length;i+=3){var p=data.position,n=data.normal;bucket.position.push(p[i]*c+p[i+2]*s+b.x+.5,p[i+1]+b.y+oy,-p[i]*s+p[i+2]*c+b.z+.5);bucket.normal.push(n[i]*c+n[i+2]*s,n[i+1],-n[i]*s+n[i+2]*c);}
                for(var j=0;j<data.uv.length;j++)bucket.uv.push(data.uv[j]);
              });
              Object.keys(buckets).forEach(function(type){
                var data=buckets[type],geo=new THREE.BufferGeometry();['position','normal','uv'].forEach(function(name){geo.setAttribute(name,new THREE.Float32BufferAttribute(data[name],name==='uv'?2:3));});
                var mat=getBlockMaterial(type);mat.transparent=true;mat.opacity=Math.min(mat.opacity,.86);mat.depthWrite=false;mat.polygonOffset=true;mat.polygonOffsetFactor=-1;mat.polygonOffsetUnits=-1;
                var mesh=new THREE.Mesh(geo,mat);mesh.name='gw-preview-'+type;mesh.userData.gwDecorative=true;mesh.raycast=function(){};mesh.renderOrder=998;mesh.receiveShadow=true;surfaces.add(mesh);
              });
              state.surfaces=surfaces;state.group.add(surfaces);
            }
            state.surfaces.visible=true;state.material.opacity=.36;return true;
          };
          engine.isDrawingAllowed=function() {`);
 replace("          if (engine.composer && container.clientWidth && container.clientHeight) {",`          if (previousTier !== profile.tier && engine._buildBatchPreview && engine._buildBatchPreview.surfaces) engine._buildBatchPreview.surfaces.traverse(function(part){if(part.material)updateSurfaceDetail(part.material);});
          if (engine.composer && container.clientWidth && container.clientHeight) {`);
 // Keep new data in the original literal so all consumers see the same lesson.
 const start=source.indexOf('  SAMPLE_LESSONS.geometryHarbor = '),end=source.indexOf('  // The authored lessons',start),old=source.slice(start,end);
 const lesson=new Function('const SAMPLE_LESSONS={};'+old+'return SAMPLE_LESSONS.geometryHarbor;')();
 lesson.description='Help a waterfront community design gardens, reservoirs, a learning room, and an eastern arcade. A level promenade connects four districts, eight guided activities, and spacious design courts. Plan about 60 minutes, or pause after any district. Explore, predict, build, measure, explain, and revise. Activity checklists support self-review; NPC questions check mathematical reasoning.';
 lesson.estimatedMinutes=60;lesson.ground.xMax=44;lesson.ground.zMin=-27;lesson.ground.zMax=25;
 lesson.npcs[0].dialogue=lesson.npcs[0].dialogue.replace('The six activity cards','Continue east along the two stone links to the brick arcade and community studio. The eight activity cards');
 function fill(id,x1,y1,z1,x2,y2,z2,block,ground){const s={id,type:'fill',x1,y1,z1,x2,y2,z2,block};if(ground)s.measurementLayer='ground';lesson.structures.push(s);}
 fill('arcade-link-north',20,0,-12,40,0,-11,'stone',true);
 fill('arcade-link-south',20,0,11,40,0,12,'stone',true);
 fill('arcade-promenade-east',41,0,-20,42,0,12,'stone',true);
 fill('arcade-north-approach',28,0,-15,40,0,-14,'stone',true);
 fill('arcade-court-link',26,0,-20,27,0,12,'stone',true);
 fill('arcade-pattern-pad',28,0,-8,40,0,-2,'sand',true);
 fill('arcade-studio-pad',28,0,3,40,0,9,'sand',true);
 fill('arcade-court-crossing',28,0,0,40,0,1,'wood',true);
 fill('arcade-quay',28,0,-21,40,0,-20,'stone',true);
 fill('arcade-canal',28,0,-25,40,0,-23,'water',true);
 // Three separate nine-cube arch modules: 2 x 3 pillars + a 3-cube lintel.
 for(let bay=0;bay<3;bay++){
   const x=29+bay*4;
   fill('arcade-module-'+bay+'-left',x,1,-17,x,3,-17,'brick');
   fill('arcade-module-'+bay+'-right',x+2,1,-17,x+2,3,-17,'brick');
   fill('arcade-module-'+bay+'-lintel',x,4,-17,x+2,4,-17,'brick');
 }
 // A taller lantern pergola behind the reference modules makes the district
 // visible from the original promenade without joining the measured samples.
 for(const x of [29,34,39]){
   fill('arcade-pergola-post-'+x,x,1,-21,x,5,-21,'wood');
   fill('arcade-pergola-cap-'+x,x,6,-21,x,6,-21,'stone');
 }
 fill('arcade-pergola-beam',29,6,-20,39,6,-20,'wood');
 for(const x of [30,33,36,39])fill('arcade-pergola-rafter-'+x,x,7,-22,x,7,-19,'wood');
 fill('arcade-lantern-glass',34,7,-20,34,8,-20,'glass');
 fill('arcade-lantern-light',34,9,-20,34,9,-20,'torch');
 for(const x of [29,35,41]){
   fill('studio-planter-'+x,x,1,18,x+1,1,19,'brick');
   fill('studio-planter-leaves-'+x,x,2,18,x+1,2,19,'grass');
 }
 fill('studio-bench',33,1,16,37,1,16,'wood');
 lesson.npcs.push({name:'7. Tess - Arcade Patterns',position:[28,1,-14],color:0xc97552,dialogue:'Welcome to the eastern arcade. Follow either stone link from the old harbor: the paths form a level loop. Look at the three separate brick arches by the lantern pergola. Each module has two pillars of three cubes and a lintel of three more, so it contains nine cubes. On the large sand court south of this path, build three matching modules with one empty cell between them. Predict the total first, then measure each module separately. Count the empty gaps when planning your footprint, but never count them as volume. You can explore repeat tools later in Free Build.',question:{text:'Three separate nine-cube arch modules use how many cubes?',choices:['27 cubes','30 cubes including the gaps','36 cubes'],correct:0,followUp:[{text:'Each arch occupies three columns. Three arches with two one-cell gaps span how many columns?',choices:['11 columns','9 columns','12 columns'],correct:0}]}});
 lesson.npcs.push({name:'8. Eli - Community Studio',position:[41,1,2],color:0x377b82,dialogue:'Our community needs a small stepped seating model. Start with a complete six-by-four layer of 24 unit cubes. Put a six-by-two layer of 12 cubes on one end. That makes 36 cubes with a step. Measure and record the model before revising it into a six-by-three-by-two prism. Both versions use 36 cubes, yet their exposed surfaces differ. Include the underside in your comparison. The southern sand court has space to keep both models side by side if you prefer. Measure each separately and explain which design better serves the community.',question:{text:'A 24-cube lower layer plus a 12-cube upper layer has what occupied volume?',choices:['36 cubic units','48 cubic units, the bounding box','12 cubic units'],correct:0,followUp:[{text:'A 6 by 3 by 2 solid prism has six-face surface area 2 × (18 + 12 + 6). What is it?',choices:['72 square units','36 square units','84 square units'],correct:0},{text:'The stepped model has 84 exposed square faces; the prism has 72. Which uses less covering for equal occupied volume?',choices:['The prism, by 12 square units','The stepped model, by 12 square units','They use equal covering'],correct:0}]}});
 lesson.activities.push({id:'arcade-patterns',title:'Eastern arcade: build a repeating module',npcName:'7. Tess - Arcade Patterns',position:[28.5,2.6,-13.5],challenge:'Study the three brick arch modules near the lantern pergola. On the sand court at x = 28 to 40, z = -8 to -2, build three matching nine-cube arches with one-cell gaps. Predict the cube total and the full row width first.',hint:'One arch uses two 3-high pillars plus a 3-cube lintel: 9 cubes. Use X starts 29, 33, and 37, all at Z = -5. Three modules use 27 cubes and span 11 columns including gaps. Measure each disconnected arch separately; a single measurement should show 9, not 27.',successCriteria:['I predicted 27 occupied cubes and an 11-column row.','Each separate arch measures 9 cubic units.','I kept matching shapes and one-cell gaps.','I explained why gaps affect the footprint but not occupied volume.'],reflection:'How would a fourth module change the cube total and the row width? Predict before building: 36 cubes and 15 columns, so this court would need a new arrangement.'});
 lesson.activities.push({id:'community-studio',title:'Community studio: revise a stepped design',npcName:'8. Eli - Community Studio',position:[41.5,2.6,1.5],buildGoal:{metric:'occupiedVolume',comparator:'eq',target:36,unitCubesOnly:true},challenge:'On the southern sand court at x = 28 to 40, z = 3 to 9, build a 6 by 4 lower layer and a 6 by 2 upper layer at one end. Record the 36-cube stepped model, then redesign it as a 6 by 3 by 2 prism. Compare all six sides, including the underside.',hint:'For the stepped model, use X = 28 to 33, Z = 3 to 6 at Y = 1; the upper layer uses Z = 3 to 4 at Y = 2. Its occupied volume is 36, bounding box volume 48, and exposed surface area 84. The revised prism has occupied volume 36 and surface area 72. An optional second model fits at X = 35 to 40; measure each model separately.',successCriteria:['My stepped model contains 36 unit cubes and leaves a usable step.','I distinguished its 36 occupied cubic units from its 48-unit bounding box.','I recorded both versions and compared surface areas 84 and 72.','I justified a design using its purpose, dimensions, volume, and covering.'],reflection:'Would the community benefit more from the step or from saving 12 square units of covering? Explain the tradeoff. The numeric check confirms occupied volume; use this checklist to review shape and purpose.'});
 lesson.objectives.push(lesson.activities[6].title,lesson.activities[7].title);
 replace(old,'  SAMPLE_LESSONS.geometryHarbor = '+JSON.stringify(lesson,null,2).split('\n').map((l,i)=>i?'  '+l:l).join('\n')+';\n\n');
});
