import {beforeEach,describe,expect,it} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const R=(id=1)=>({type:'resistor',value:100,id});
function scene(state){const root=document.createElement('div');root.innerHTML=renderTool('circuit',{_circuit:{benchView:'3d',sceneCurrent:true,pauseMotion:true,...state}});return root.querySelector('.circuit-3d');}
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');});
describe('3D current direction',()=>{
  it('traces the complete series wiring without implying charge speed',()=>{
    const el=scene({components:[R(),R(2),R(3)]});
    expect(el.querySelectorAll('[data-current-route]')).toHaveLength(4);
    expect(el.querySelectorAll('.circuit-flow-arrow').length).toBeGreaterThan(0);
    expect(el.textContent).toContain('Arrows show direction, not speed or electron motion');
    expect(el.querySelector('svg').getAttribute('aria-describedby')).toBe('circuit-flow-note');
  });
  it('does not trace an open path, a reversed LED, or an unpowered source',()=>{
    for(const state of [
      {components:[R(),{type:'switch',closed:false,id:2}]},
      {components:[R(),{type:'led',reversed:true,id:2}]},
      {components:[R(),{type:'capacitor',id:2}]},
      {components:[R()],voltage:0}
    ]){
      const el=scene(state);expect(el.querySelectorAll('.circuit-flow-arrow')).toHaveLength(0);
      expect(el.textContent).toContain('No current in this path');
    }
  });
  it('traces only the selected parallel branch and reports source total separately',()=>{
    const el=scene({mode:'parallel',voltage:9,selectedPart:1,components:[R(),R(2)]});
    expect(el.querySelectorAll('[data-current-route]')).toHaveLength(2);
    expect(el.textContent).toContain('Tracing branch 2');
    expect(el.textContent).toContain('Selected branch: 90.00 mA · Source total: 180.00 mA');
    expect(el.textContent).toContain('Shared rails carry combined branch currents');
  });
  it('keeps a blocked branch untraced even when the source supplies another branch',()=>{
    const el=scene({mode:'parallel',selectedPart:1,components:[R(),{type:'switch',closed:false,id:2}]});
    expect(el.querySelectorAll('.circuit-flow-arrow')).toHaveLength(0);
    expect(el.textContent).toContain('Other branches still carry current');
  });
  it('handles hidden overlays, empty benches, and clipped close-up views',()=>{
    const hidden=scene({sceneCurrent:false,components:[R()]});
    expect(hidden.querySelector('#circuit-flow-note')).toBeNull();
    expect(hidden.querySelectorAll('[data-current-route]')).toHaveLength(0);
    expect(scene({components:[]}).textContent).toContain('Add a part to trace current');
    expect(scene({components:[R()],sceneCloseup:true}).textContent).toContain('Close-up shows part of the path');
  });
  it('preserves finite arrow geometry at camera limits and the second series row',()=>{
    for(const mode of ['series','parallel'])for(const cameraYaw of [-80,80])for(const cameraTilt of [20,85]){
      const el=scene({mode,cameraYaw,cameraTilt,selectedPart:7,components:Array.from({length:8},(_,i)=>R(i+1))});
      expect(el.querySelectorAll('.circuit-flow-arrow').length).toBeGreaterThan(0);
      expect(el.innerHTML).not.toMatch(/NaN|Infinity/);
      expect(el.querySelectorAll('[data-current-route]')).toHaveLength(mode==='series'?9:2);
    }
  });
});
