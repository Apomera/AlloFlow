import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

let THREE;
beforeAll(()=>{const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;});
afterEach(()=>{delete window.__geoWorldEngine;delete window.__alloPrintLabPendingHandoff;delete window.__alloGeometryWorldReturnProject;});

describe('dock summary and actual exported selection agree',()=>{
  it.each(['ground','independent student'])('keeps selected A visible while the inspector shows %s', kind=>{
    window.THREE=THREE;
    if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
    window.StemLab={_registry:{geometryWorld:{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'});}}}};
    new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
    const api=window.StemLab.geometryWorldBuilderPure,a=[{x:0,y:1,z:0},{x:1,y:1,z:0}],b={x:8,y:kind==='ground'?0:1,z:0};
    const engine=window.__geoWorldEngine={blocks:{},_builderSelection:{blocks:a},_currentLesson:api.FREE_BUILD_LESSON,_undoStack:[],_redoStack:[],measureStructure(_x,_y,_z,retained){
      const blocks=retained.filter(p=>this.blocks[[p.x,p.y,p.z].join(',')]);
      if(!blocks.length)return null;
      return {blocks,count:blocks.length,isComplete:true,L:Math.max(...blocks.map(p=>p.x))-Math.min(...blocks.map(p=>p.x))+1,W:1,H:1,totalVolume:blocks.length,shapeCounts:{cube:blocks.length}};
    }};
    [...a,b].forEach(p=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());mesh.position.set(p.x+.5,p.y+.5,p.z+.5);mesh.updateMatrixWorld(true);mesh.userData={gridPos:p,shape:'cube',rotation:0,blockType:p===b?(kind==='ground'?'grass':'wood'):'stone',_measurementLayer:p===b&&kind==='ground'?'lesson':'student'};engine.blocks[[p.x,p.y,p.z].join(',')]=mesh;});
    const unrelated={blocks:[b],count:1,isComplete:true,L:1,W:1,H:1,totalVolume:1};
    const ctx={React,toolData:{geometryWorld:{worldActive:true,activeLesson:'builderSandbox',builderPanel:'measure',measureResult:unrelated}},setStemLabTool:vi.fn(),addToast(){}};
    function dock(){const host=document.createElement('div');host.innerHTML=ReactDOMServer.renderToStaticMarkup(React.createElement(function Host(){return window.StemLab._registry.geometryWorld.render(ctx);}));return host;}
    let ui=dock();
    expect(Array.from(ui.querySelectorAll('[aria-label="Selected build summary"] .gwe-metric')).map(metric=>metric.textContent)).toEqual(['2Blocks selected','2×1×1Block bounds']);
    expect(ui.querySelector('.gwe-creation-summary').dataset.selected).toBe('true');
    expect(ui.querySelector('.gwe-selection-scope').textContent).toBe('Showcase and Print Lab use these blocks.');
    expect(ui.querySelector('[aria-label="Print Lab block envelope"]').textContent).toContain('10 × 5 × 5 mm');
    expect(ctx.toolData.geometryWorld.measureResult).toBe(unrelated);
    api.openSelectedBuildInPrintLab(ctx);
    expect(window.__alloPrintLabPendingHandoff.sourceModel.blocks).toHaveLength(2);
    expect(window.__alloPrintLabPendingHandoff.sourceModel.blocks.every(p=>p.type==='stone')).toBe(true);
    expect(ctx.setStemLabTool).toHaveBeenCalledWith('printLab');
    if(kind==='independent student'){
      // Core's ordinary M-key measurement of another student build explicitly
      // changes retention. The dock and actual handoff must then follow B.
      engine._builderSelection={blocks:[b]};ctx.toolData.geometryWorld.measureResult={blocks:a,count:2,isComplete:true,L:2,W:1,H:1};
      ui=dock();expect(Array.from(ui.querySelectorAll('[aria-label="Selected build summary"] .gwe-metric')).map(metric=>metric.textContent)).toEqual(['1Blocks selected','1×1×1Block bounds']);
      expect(ui.querySelector('.gwe-creation-summary').dataset.selected).toBe('true');
      expect(ui.querySelector('[aria-label="Print Lab block envelope"]').textContent).toContain('5 × 5 × 5 mm');
      api.openSelectedBuildInPrintLab(ctx);
      expect(window.__alloPrintLabPendingHandoff.sourceModel.blocks).toHaveLength(1);
      expect(window.__alloPrintLabPendingHandoff.sourceModel.blocks[0].type).toBe('wood');
    }else{
      // With no retained creation, the existing ground-measurement summary and
      // explanation remain available, without quoting it as a printable build.
      engine._builderSelection=null;ui=dock();
      expect(ui.querySelector('[aria-label="Selected build summary"]')).toBeNull();
      expect(ui.querySelector('.gwe-creation-summary').dataset.selected).toBe('false');
      expect(ui.querySelector('.gwe-selection-scope')).toBeNull();
      expect(ui.querySelector('[aria-label="Build summary"]').textContent).toContain('1Selected');
      expect(ui.querySelector('[aria-label="Print Lab block envelope"]')).toBeNull();
      expect(ui.textContent).toContain('That measurement was the ground or a lesson structure.');
    }
  });
});
