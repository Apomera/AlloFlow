const fs=require('fs');const fixture=fs.readFileSync('tests/geometry_world_selected_inspector.test.js','utf8').split("describe('selected creation takes priority")[0];
fs.writeFileSync('tests/geometry_world_reopened_print_check.test.js',fixture+String.raw`
describe('reopened project print diagnostics',()=>{
  it('rebuilds a cleared check for identical restored blocks and then stops rechecking idle geometry',()=>{
    const app=mount();const initial=app.state().builderPrintCheck;expect(initial.selectionSignature).toBeTruthy();app.patch({builderPrintCheck:null});
    React.act(()=>vi.advanceTimersByTime(250));expect(app.state().builderPrintCheck).toEqual(initial);const restored=app.state().builderPrintCheck;
    React.act(()=>vi.advanceTimersByTime(2000));expect(app.state().builderPrintCheck).toBe(restored);
  });
  it('refreshes contact groups after an identical project opens with a new selection object',()=>{
    const app=mount();app.patch({builderPrintCheck:null,builderPrintGuide:true});app.engine._currentLesson={...app.engine._currentLesson};app.engine._builderSelection={blocks:app.groups.a.map(p=>({...p})),exact:true};
    React.act(()=>vi.advanceTimersByTime(250));expect(app.state().builderPrintCheck.contactGroups.length).toBeGreaterThan(0);
    React.act(()=>vi.advanceTimersByTime(250));expect(app.state().builderPrintGuideSummary.parts.length).toBeGreaterThan(0);expect(app.state().builderPrintGuideSummary.selectionSignature).toBe(app.state().builderPrintCheck.selectionSignature);
  });
  it('does not repeatedly retry a failed mesh export for unchanged geometry',()=>{
    const app=mount();const mesh=app.engine.blocks['0,1,0'];mesh.geometry.dispose();mesh.geometry=null;app.patch({builderPrintCheck:null});
    React.act(()=>vi.advanceTimersByTime(250));const check=app.state().builderPrintCheck;expect(check.selectionSignature).toBeTruthy();
    React.act(()=>vi.advanceTimersByTime(1500));expect(app.state().builderPrintCheck).toBe(check);
  });
});
`);console.log('Added restored-project print-check regression tests.');
