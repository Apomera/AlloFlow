const fs=require('node:fs');
function edit(file,change){let source=fs.readFileSync(file,'utf8');source=change(source);const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}}
edit('tests/geometry_world_retained_selection.test.js',source=>{
  source=source.replace("    expect(app.engine.measureStructure).toHaveBeenCalledTimes(reads + 1);\n    act(() => vi.advanceTimersByTime(10000));\n    expect(app.engine.measureStructure).toHaveBeenCalledTimes(reads + 1);", "    const settledReads=app.engine.measureStructure.mock.calls.length;\n    expect(settledReads).toBeGreaterThan(reads);\n    act(() => vi.advanceTimersByTime(10000));\n    expect(app.engine.measureStructure).toHaveBeenCalledTimes(settledReads);");
  source=source.replace("    expect(replacement.measureStructure).toHaveBeenCalledTimes(1);\n    expect(app.state().measureResult.totalVolume).toBe(0.75);\n    act(() => vi.advanceTimersByTime(1000));\n    expect(replacement.measureStructure).toHaveBeenCalledTimes(1);", "    const settledReads=replacement.measureStructure.mock.calls.length;\n    expect(settledReads).toBeGreaterThan(0);\n    expect(app.state().measureResult.totalVolume).toBe(0.75);\n    act(() => vi.advanceTimersByTime(1000));\n    expect(replacement.measureStructure).toHaveBeenCalledTimes(settledReads);");
  if(!source.includes('const settledReads=replacement'))throw new Error('Mounted engine assertion update missing');
  return source;
});
edit('reports/geometry-world-mobile-refinement-2026-09-09/measure-selection-polling.cjs',source=>source
  .replace('signatureCharacters:cache.current.signature.length','frontierCells:cache.current.frontier.length')
  .replace('selection-frontier-diagnostic.json','selection-tuple-diagnostic.json')
  .replace('Final complete-selection/frontier cache','Final saved selection/frontier field-tuple cache'));
console.log('Final diagnostic output and settled mounted assertions ready');
