const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><head><style id="allo-geometryworld-builder-css"></style></head><body></body></html>',{url:'http://localhost'});
global.window=dom.window;global.document=dom.window.document;global.navigator=dom.window.navigator;global.HTMLElement=dom.window.HTMLElement;global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require(path.resolve('desktop/web-app/node_modules/react'));
const ReactDOM=require(path.resolve('desktop/web-app/node_modules/react-dom/client'));
const {act}=require(path.resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const exports3={};new Function('exports','module',fs.readFileSync('vendor/three-r128/three.min.js','utf8'))(exports3,{exports:exports3});const THREE=window.THREE=exports3;
window.StemLab={_registry:{geometryWorld:{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}}}};
new Function(fs.readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();const api=window.StemLab.geometryWorldBuilderPure;
const p={x:0,y:1,z:0},mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());mesh.position.set(.5,1.5,.5);mesh.updateMatrixWorld(true);mesh.userData={gridPos:p,blockType:'stone',shape:'cube',rotation:0,volume:1,_measurementLayer:'student'};
const engine=window.__geoWorldEngine={blocks:{'0,1,0':mesh},_builderSelection:{blocks:[p]},_currentLesson:{sandbox:true},_undoStack:[],_redoStack:[],loadLesson(){},measureStructure(_x,_y,_z,retained){const blocks=retained.filter(p=>this.blocks[[p.x,p.y,p.z].join(',')]);return blocks.length?{blocks,count:blocks.length,isComplete:true,L:1,W:1,H:1,totalVolume:1,shapeCounts:{cube:1}}:null;}};
const results={scope:'Read-only production-builder flow reproductions in local DOM; no browser or production edits'};
let blob;const nativeURL=global.URL;global.URL={createObjectURL(value){blob=value;return 'blob:audit';},revokeObjectURL(){}};dom.window.HTMLAnchorElement.prototype.click=function(){};
function extents(buffer){const view=new DataView(buffer),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<view.getUint32(80,true);i++)for(let v=0;v<3;v++)for(let axis=0;axis<3;axis++){const n=view.getFloat32(84+i*50+12+v*12+axis*4,true);min[axis]=Math.min(min[axis],n);max[axis]=Math.max(max[axis],n);}return min.map((n,i)=>max[i]-n);}
(async()=>{
 try{
  const toasts=[];api.openSelectedBuildInPrintLab({toolData:{geometryWorld:{builderPrintContext:{unitMm:5}}},addToast(message,kind){toasts.push({message,kind});}});
  results.noNavigationExport={requestedMmPerBlock:5,advertisedEnvelope:api.defaultPrintEnvelope(engine.measureStructure(0,1,0,[p]),null,5).label,downloadedStlCoordinateExtents:extents(await blob.arrayBuffer()),toast:toasts.at(-1)};
  delete window.__alloPrintLabPendingHandoff;delete window.__alloGeometryWorldReturnProject;
  let state,refresh;const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOM.createRoot(host);
  function Host(){const[data,setData]=React.useState({geometryWorld:{worldActive:true,activeLesson:'builderSandbox',builderPanel:'build',measureResult:engine.measureStructure(0,1,0,[p])}});state=data.geometryWorld;refresh=()=>setData(old=>({...old,geometryWorld:{...old.geometryWorld}}));return window.StemLab._registry.geometryWorld.render({React,toolData:data,updateMulti(key,patch){setData(old=>({...old,[key]:{...old[key],...patch}}));}});}
  await act(async()=>{root.render(React.createElement(Host));});
  delete engine.blocks['0,1,0'];await act(async()=>{await new Promise(r=>setTimeout(r,320));refresh();});
  results.deletedOpenSelection={engineSelection:engine._builderSelection,displayedMeasurementCount:state.measureResult?.count,summary:host.querySelector('[aria-label="Build summary"]')?.textContent,showcaseStillPresent:host.textContent.includes('Showcase creation'),exploreStillPresent:host.textContent.includes('Explore measurements'),incorrectGroundMessage:host.textContent.includes('That measurement was the ground or a lesson structure.')};
  await act(async()=>root.unmount());host.remove();
  fs.writeFileSync(path.join(__dirname,'flow-gap-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
 }finally{global.URL=nativeURL;dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
