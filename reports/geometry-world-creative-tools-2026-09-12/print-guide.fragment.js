  // The print guide reads the same selected mesh and printer profile as export.
  // It adds disposable lines only; source geometry and physical scale stay intact.
  function geometryPrintGuideData(engine, positions, profile, unitMm, check) {
    var THREE=window.THREE;if(!THREE || !engine || !Array.isArray(positions) || !positions.length)return null;
    var bounds=creationGeometryBounds(engine,positions);if(!bounds || bounds.isEmpty())return null;
    var bed=builderBedLimits(profile),unit=printUnit(unitMm),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
    var frame={min:{x:center.x-bed.width/unit/2,y:bounds.min.y,z:center.z-bed.depth/unit/2},max:{x:center.x+bed.width/unit/2,y:bounds.min.y+bed.height/unit,z:center.z+bed.depth/unit/2}};
    var dimensions={width:size.x*unit,depth:size.z*unit,height:size.y*unit},over=[];
    ['width','depth','height'].forEach(function(axis){if(dimensions[axis]>bed[axis]+1e-6)over.push(axis);});
    var validKeys={},outside=[];
    positions.forEach(function(p){var mesh=engine.blocks[keyFor(p)];if(!mesh || !isStudentBlock(mesh.userData))return;validKeys[keyFor(p)]=true;var box=creationGeometryBounds(engine,[p]);if(!box || box.isEmpty())return;
      if(box.min.x<frame.min.x-1e-6 || box.max.x>frame.max.x+1e-6 || box.min.z<frame.min.z-1e-6 || box.max.z>frame.max.z+1e-6 || box.max.y>frame.max.y+1e-6)outside.push({x:p.x,y:p.y,z:p.z});
    });
    var parts=[];
    if(check && Array.isArray(check.contactGroups))check.contactGroups.forEach(function(cells,index){
      if(!Array.isArray(cells) || !cells.length || cells.some(function(p){return !validKeys[keyFor(p)];}))return;
      var box=creationGeometryBounds(engine,cells);if(!box || box.isEmpty())return;
      parts.push({index:index+1,blocks:cells.length,cells:cells.map(function(p){return {x:p.x,y:p.y,z:p.z};}),raised:box.min.y>bounds.min.y+1e-5,
        min:{x:box.min.x,y:box.min.y,z:box.min.z},max:{x:box.max.x,y:box.max.y,z:box.max.z}});
    });
    return {unitMm:unit,bed:bed,frame:frame,dimensions:dimensions,over:over,fits:!over.length,outside:outside,parts:parts,
      raisedParts:parts.filter(function(part){return part.raised;}).length,topologyChecked:!!check,
      openEdges:check && check.openEdges || 0,nonManifoldEdges:check && check.nonManifoldEdges || 0};
  }
  function createGeometryPrintGuide(engine,data) {
    var THREE=window.THREE;if(!THREE || !data)return null;
    var group=new THREE.Group();group.name='gwe-print-guide';group.userData.gwDecorative=true;group.userData.gwPrintGuide=true;
    var positions=[],colors=[],palette=[0x86d5c2,0xe4bc7e,0xb1b4e6,0xd9a9bb,0x94c7dd,0xc4d28e];
    function boxLines(box,hex,floorOnly){var a=box.min,b=box.max,corners=[[a.x,a.y,a.z],[b.x,a.y,a.z],[b.x,a.y,b.z],[a.x,a.y,b.z],[a.x,b.y,a.z],[b.x,b.y,a.z],[b.x,b.y,b.z],[a.x,b.y,b.z]],tint=new THREE.Color(hex).convertSRGBToLinear();
      var edges=floorOnly?[[0,1],[1,2],[2,3],[3,0]]:[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      edges.forEach(function(edge){edge.forEach(function(i){positions.push.apply(positions,corners[i]);colors.push(tint.r,tint.g,tint.b);});});
    }
    // Full bed cage gives both the footprint and permitted model height.
    boxLines(data.frame,data.fits?0x86d5c2:0xf1ad81,false);
    data.parts.forEach(function(part,index){if(data.parts.length>1)boxLines(part,part.raised?0xe4bc7e:palette[index%palette.length],false);});
    data.outside.forEach(function(p){var box=creationGeometryBounds(engine,[p]);if(box && !box.isEmpty())boxLines(box,0xf48675,false);});
    var geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    var material=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.76,depthTest:false,depthWrite:false,toneMapped:false});
    var lines=new THREE.LineSegments(geometry,material);lines.raycast=function(){};lines.renderOrder=996;lines.userData.gwDecorative=true;group.add(lines);group.raycast=function(){};return group;
  }
  function disposeGeometryPrintGuide(engine) {
    if(!engine)return;var group=engine._builderPrintGuide;if(!group)return;
    var show=engine._showcase;
    if(show){show.hidden=(show.hidden || []).filter(function(entry){return entry[0]!==group;});if(show.studio)show.studio.hidden=(show.studio.hidden || []).filter(function(entry){return entry[0]!==group;});}
    if(group.parent)group.parent.remove(group);
    group.traverse(function(part){if(part.geometry)part.geometry.dispose();if(part.material)part.material.dispose();});
    engine._builderPrintGuide=null;engine._builderPrintGuideKey='';
  }
  function syncGeometryPrintGuide(engine,ctx) {
    var data=ctx && ctx.toolData && ctx.toolData.geometryWorld || {};
    var selected=engine && engine._builderSelection,positions=selected && selected.blocks;
    if(!engine || engine._destroyed || !data.builderPrintGuide || !data.worldActive || !positions || !positions.length){disposeGeometryPrintGuide(engine);return;}
    if(engine._builderPrintGuide)engine._builderPrintGuide.visible=!engine._showcase && !data.showGeometryHome;
    if(engine._showcase || data.showGeometryHome)return;
    var profile=storedPrinterProfile(ctx),unit=printUnit(printContext(ctx).unitMm),signature=blockMeasurementSignature(engine,positions.map(keyFor));
    var check=data.builderPrintCheck && data.builderPrintCheck.selectionSignature===signature?data.builderPrintCheck:null;
    var next=signature+'|'+unit+'|'+JSON.stringify(builderBedLimits(profile))+'|'+(check?'checked':'pending');
    if(engine._builderPrintGuide && engine._builderPrintGuideKey===next)return;
    disposeGeometryPrintGuide(engine);var guide=geometryPrintGuideData(engine,positions,profile,unit,check);if(!guide)return;
    var group=createGeometryPrintGuide(engine,guide);if(!group)return;
    engine._builderPrintGuide=group;engine._builderPrintGuideKey=next;engine.scene.add(group);
    patchGeometryState(ctx,{builderPrintGuideSummary:{fits:guide.fits,dimensions:guide.dimensions,over:guide.over,outside:guide.outside.length,parts:guide.parts.map(function(p){return {index:p.index,blocks:p.blocks,raised:p.raised};}),raisedParts:guide.raisedParts,openEdges:guide.openEdges,nonManifoldEdges:guide.nonManifoldEdges,topologyChecked:guide.topologyChecked}});
  }
  function frameGeometryPrintGuide(ctx) {
    var engine=window[ENGINE_KEY],selected=engine && engine._builderSelection;
    if(!engine || !selected || !engine.setViewPreset)return false;
    var guide=geometryPrintGuideData(engine,selected.blocks,storedPrinterProfile(ctx),printContext(ctx).unitMm,null);if(!guide)return false;
    var a=guide.frame.min,b=guide.frame.max;
    engine.setViewPreset('top',{x:(a.x+b.x)/2,y:a.y,z:(a.z+b.z)/2,radius:Math.max(b.x-a.x,b.z-a.z)*.65});
    patchGeometryState(ctx,{sandboxDockCollapsed:true,hudPanel:''});focusWorldSurface(40);return true;
  }
