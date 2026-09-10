const fs=require('node:fs'),vm=require('node:vm');
const file='stem_lab/stem_tool_geometryworld_builder.js';
let source=fs.readFileSync(file,'utf8');
const newline=source.includes('\r\n')?'\r\n':'\n';
function replaceOnce(before,after){if(!source.includes(before)||source.indexOf(before)!==source.lastIndexOf(before))throw new Error('Patch anchor missing/ambiguous: '+before.slice(0,90));source=source.replace(before,after);}
const helper=`  function selectionNeedsReview(check) {
    return !check || !!check.error || check.components !== 1 || check.openEdges !== 0 || check.nonManifoldEdges !== 0;
  }
  function createSelectionFrame(box, check) {
    var THREE=window.THREE;
    if(!THREE || !box || box.isEmpty())return null;
    var size=box.getSize(new THREE.Vector3()),extent=Math.max(size.x,size.y,size.z);
    if(!isFinite(extent) || extent<=0)return null;
    var low=[box.min.x,box.min.y,box.min.z],high=[box.max.x,box.max.y,box.max.z];
    if(!low.concat(high).every(function(n){return isFinite(n);}))return null;
    var lengths=[size.x,size.y,size.z].map(function(n){return Math.min(n*0.2,extent*0.06);}),vertices=[];
    for(var corner=0;corner<8;corner++){
      var point=[corner&1?high[0]:low[0],corner&2?high[1]:low[1],corner&4?high[2]:low[2]];
      for(var axis=0;axis<3;axis++){
        var end=point.slice();end[axis]+=(corner&(1<<axis)?-1:1)*lengths[axis];
        vertices.push(point[0],point[1],point[2],end[0],end[1],end[2]);
      }
    }
    var geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    var review=selectionNeedsReview(check),color=new THREE.Color(review?0xf1c67d:0xd4e8ca).convertSRGBToLinear();
    var material=new THREE.LineBasicMaterial({color:color,transparent:true,opacity:0.82,depthTest:false,depthWrite:false,toneMapped:false});
    var frame=new THREE.LineSegments(geometry,material);
    frame.name='gwe-selection-frame';frame.renderOrder=998;
    frame.userData.gwDecorative=true;frame.userData.gwSelectionFrame=true;frame.userData.needsReview=review;
    frame.raycast=function(){};
    return frame;
  }
`;
replaceOnce('  function focusSelectedBuild(ctx) {',helper.replace(/\n/g,newline)+'  function focusSelectedBuild(ctx) {');
replaceOnce('fitCreationCamera:fitCreationCamera, creationFocusRect:creationFocusRect, creationGeometryBounds:creationGeometryBounds, focusSelectedBuild:focusSelectedBuild,','fitCreationCamera:fitCreationCamera, creationFocusRect:creationFocusRect, creationGeometryBounds:creationGeometryBounds, focusSelectedBuild:focusSelectedBuild,\n    createSelectionFrame:createSelectionFrame, selectionNeedsReview:selectionNeedsReview,');
const old=/            clearOutline\(\);var box=new window\.THREE\.Box3\(\);m\.blocks\.forEach\(function\(p\)\{box\.expandByObject\(eng\.blocks\[keyFor\(p\)\]\);\}\);\r?\n            outline=new window\.THREE\.Box3Helper\(box,check && \(check\.components>1 \|\| check\.nonManifoldEdges\) \? 0xfbbf24 : 0x22d3ee\);\r?\n            outline\.material\.depthTest=false;outline\.material\.transparent=true;outline\.material\.opacity=0\.85;outline\.renderOrder=998;outline\.visible=!eng\._showcase;eng\.scene\.add\(outline\);/;
if(!old.test(source))throw new Error('Original builder outline block not found');
source=source.replace(old,['            clearOutline();','            // Ignore temporary placement-pop scale and decorative mesh children.','            outline=createSelectionFrame(creationGeometryBounds(eng,m.blocks),check);','            if(outline){outline.visible=!eng._showcase;eng.scene.add(outline);}'].join(newline));
new vm.Script(source,{filename:file});
for(const target of [file,'desktop/web-app/public/'+file]){const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}}
console.log(JSON.stringify({syntax:'passed',mirror:fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/'+file)),helpers:['createSelectionFrame','selectionNeedsReview'],segments:24}));
