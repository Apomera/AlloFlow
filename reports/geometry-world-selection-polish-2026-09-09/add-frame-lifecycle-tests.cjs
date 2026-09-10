const fs=require('node:fs');const file='tests/geometry_world_selection_frame.test.js';let source=fs.readFileSync(file,'utf8');
source=source.replace('delete window.__geoWorldEngine;delete window.THREE;vi.clearAllTimers();vi.useRealTimers();','delete window.__geoWorldEngine;delete window.THREE;vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();');
const anchor="  it('disposes the owned frame on unmount without disposing construction geometry',()=>{";
if(!source.includes(anchor))throw new Error('Frame lifecycle test insertion anchor missing');
const tests=`  it.each(['meadow','studio'])('hides and restores the current frame synchronously for Showcase %s',look=>{
    vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>({beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},fillRect(){},drawImage(){},createRadialGradient(){return{addColorStop(){}};}}));
    const f=fixture(),getFrame=mount(f),old=getFrame();
    expect(f.engine._builderSelectionFrame).toBe(old);
    const button=[...mounted.host.querySelectorAll('button')].find(b=>b.textContent==='Showcase creation');expect(button).toBeTruthy();
    act(()=>button.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
    // No timer advance: the first Showcase render must already omit the frame.
    expect(f.engine._showcase).toBeTruthy();expect(old.visible).toBe(false);
    if(look==='studio')act(()=>f.engine.setShowcaseLook('studio'));
    expect((f.engine._showcase.hidden||[]).some(row=>row[0]===old)).toBe(false);
    if(look==='studio')expect(f.engine._showcase.studio.hidden.some(row=>row[0]===old)).toBe(false);
    // Rebuilding this owned decoration during the session must not place it in
    // an old restoration list or make it appear in the next render.
    f.mesh.userData.blockType='wood';act(()=>vi.advanceTimersByTime(250));
    const current=getFrame();expect(current).not.toBe(old);expect(old.parent).toBeNull();expect(current.visible).toBe(false);
    expect(f.engine._builderSelectionFrame).toBe(current);
    act(()=>f.engine.endShowcase());
    // Again, no timer advance after exit: restore the current frame immediately.
    expect(current.visible).toBe(true);expect(old.visible).toBe(false);expect(old.parent).toBeNull();
  });

  it('never restores a frame removed during Showcase',()=>{
    const f=fixture(),getFrame=mount(f),old=getFrame(),disposed=vi.fn();old.geometry.addEventListener('dispose',disposed);
    const button=[...mounted.host.querySelectorAll('button')].find(b=>b.textContent==='Showcase creation');
    act(()=>button.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
    // Exercise cleanup defensively even if a legacy restoration list contained it.
    f.engine._showcase.hidden.push([old,true]);
    f.engine._builderSelection=null;act(()=>vi.advanceTimersByTime(250));
    expect(f.engine._builderSelectionFrame).toBeUndefined();expect(getFrame()).toBeUndefined();expect(disposed).toHaveBeenCalledOnce();
    expect(f.engine._showcase.hidden.some(row=>row[0]===old)).toBe(false);
    act(()=>f.engine.endShowcase());expect(old.visible).toBe(false);expect(old.parent).toBeNull();
  });

  it('unregisters the previous engine frame when the live engine changes',()=>{
    const first=fixture(),old=mount(first)(),second=fixture(),disposed=vi.fn();old.geometry.addEventListener('dispose',disposed);
    window.__geoWorldEngine=second.engine;act(()=>vi.advanceTimersByTime(250));
    expect(first.engine._builderSelectionFrame).toBeUndefined();expect(old.parent).toBeNull();expect(disposed).toHaveBeenCalledOnce();
    expect(second.engine._builderSelectionFrame).toBe(second.engine.scene.getObjectByName('gwe-selection-frame'));
  });

`;
source=source.replace(anchor,tests+anchor);
source=source.replace("expect(object.parent).toBeNull();expect(frameDisposed).toHaveBeenCalledOnce();expect(meshDisposed).not.toHaveBeenCalled();", "expect(object.parent).toBeNull();expect(f.engine._builderSelectionFrame).toBeUndefined();expect(frameDisposed).toHaveBeenCalledOnce();expect(meshDisposed).not.toHaveBeenCalled();");
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}
console.log('Added actual Showcase synchronous hide/restore, replacement, removal and engine ownership regressions');
