const fs=require('node:fs');
const file='tests/geometry_world_retained_selection.test.js';
let source=fs.readFileSync(file,'utf8');
const pattern=/      \/\/ The existing poll still measures once to discover connected additions;\r?\n      \/\/ rendering its unchanged selection must not measure a second time\.\r?\n      expect\(app\.engine\.measureStructure\)\.toHaveBeenCalledTimes\(reads \+ i\);/;
if(!pattern.test(source))throw new Error('Idle polling test anchor missing');
source=source.replace(pattern,'      // Stable semantic occupancy skips the connected-component walk entirely.\n      expect(app.engine.measureStructure).toHaveBeenCalledTimes(reads);');
const anchor="  it('clears a vanished selection and its open inspector after the last block is removed', () => {";
if(!source.includes(anchor))throw new Error('Mounted regression insertion anchor missing');
const tests=`  it('publishes a volume-only edit into the already-open selected inspector', () => {
    const app = mountSelectedBuild();
    app.click('Explore measurements');
    const reads = app.engine.measureStructure.mock.calls.length;
    app.engine.blocks['1,1,0'].userData.volume = 0.125;
    act(() => vi.advanceTimersByTime(250));
    expect(app.state().measureResult.totalVolume).toBe(0.625);
    expect(app.state().builderPanel).toBe('measure');
    expect(app.engine.measureStructure).toHaveBeenCalledTimes(reads + 1);
    act(() => vi.advanceTimersByTime(10000));
    expect(app.engine.measureStructure).toHaveBeenCalledTimes(reads + 1);
  });

  it('refreshes an identical selected-cell list after the live engine is replaced', () => {
    const app = mountSelectedBuild();
    app.click('Explore measurements');
    const oldEngine=app.engine;
    const replacement={...oldEngine,blocks:{...oldEngine.blocks},measureStructure:vi.fn((...args)=>({...oldEngine.measureStructure(...args),totalVolume:0.75}))};
    window.__geoWorldEngine=replacement;
    act(() => vi.advanceTimersByTime(250));
    expect(replacement.measureStructure).toHaveBeenCalledTimes(1);
    expect(app.state().measureResult.totalVolume).toBe(0.75);
    act(() => vi.advanceTimersByTime(1000));
    expect(replacement.measureStructure).toHaveBeenCalledTimes(1);
  });

`;
source=source.replace(anchor,tests+anchor);
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}
console.log('Updated retained-selection polling and mounted inspector regressions');
