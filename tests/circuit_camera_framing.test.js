import {beforeEach,describe,expect,it} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let camera,pan;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');camera=window.StemLab.circuitCameraState;pan=window.StemLab.circuitCameraPan;});
describe('scene framing',()=>{
  it('defaults safely and bounds corrupt saved framing',()=>{
    expect(camera({})).toEqual({zoom:1,x:0,y:0});
    expect(camera({cameraZoom:99,cameraPanX:-999,cameraPanY:999})).toEqual({zoom:1.8,x:-220,y:150});
    expect(camera({cameraZoom:'bad',cameraPanX:Infinity,cameraPanY:NaN})).toEqual({zoom:1,x:0,y:0});
  });
  it('moves the scene by the same screen distance at different viewport widths',()=>{
    expect(pan({x:0,y:0},32,20,640,false)).toEqual({cameraPanX:32,cameraPanY:20});
    expect(pan({x:0,y:0},16,10,320,false)).toEqual({cameraPanX:32,cameraPanY:20});
  });
  it('keeps vertical touch scrolling independent of the camera',()=>{
    expect(pan({x:10,y:40},20,90,640,true)).toEqual({cameraPanX:30,cameraPanY:40});
  });
  it('bounds accumulated movement without changing the gesture origin',()=>{
    const start={x:200,y:-130};
    expect(pan(start,100,-100,640,false)).toEqual({cameraPanX:220,cameraPanY:-150});
    expect(start).toEqual({x:200,y:-130});
  });
});
