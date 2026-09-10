// Focused final check of the periodic retained-selection update.
const fs=require('node:fs');
const entry=fs.readFileSync('reports/geometry-world-graphics-2026-09-08/verify-workspace-feedback.cjs','utf8');
eval(entry.slice(0,entry.indexOf("if(process.argv.includes('--syntax-only'))"))+'global.__preparedFeedbackSource=source;');
let s=global.__preparedFeedbackSource;delete global.__preparedFeedbackSource;
const first=s.indexOf('  for(const size of '),last=s.indexOf('  results.final=await signature();modelEqual(initial,results.final,');
if(first<0||last<0)throw Error('Expected verifier boundaries missing');
const focused=async function(){
  await pose([-0.5,3,6],[-0.5,1.3,2.6]);await page.keyboard.press('KeyM');await page.getByRole('region',{name:'Measurement inspector',exact:true}).waitFor();await closeInspector();await collapse(false);
  const selectedCount=()=>page.locator('.gwe-measure-summary .gwe-metric strong').nth(1).innerText();
  check(await selectedCount()==='48','Closing the inspector retains the selected count');
  await page.evaluate(()=>__geoWorldEngine.placeBlock(2,2,1,'stone','cube',0));
  await page.waitForFunction(()=>document.querySelectorAll('.gwe-measure-summary .gwe-metric strong')[1]?.textContent==='49');
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,400)));
  results.connectedEdit={selected:await selectedCount(),model:await signature(),inspectorClosed:await page.evaluate(()=>__ctx.toolData.geometryWorld.measureResult===null),inspectorVisible:await page.getByRole('region',{name:'Measurement inspector',exact:true}).isVisible().catch(()=>false)};
  check(results.connectedEdit.selected==='49'&&results.connectedEdit.model.studentBlocks===51,'Periodic refresh updates the dock after a connected edit');
  check(results.connectedEdit.inspectorClosed&&!results.connectedEdit.inspectorVisible,'The measurement inspector remains closed after the connected edit and polling');
  await pose([10,8,13],[0,2.5,0.5]);await shot('closed-inspector-connected-edit');
  await page.locator('.gw-action-bar').getByRole('button',{name:'Undo last action',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.gwe-measure-summary .gwe-metric strong')[1]?.textContent==='48');
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,400)));
  results.afterEditUndo=await signature();check(results.afterEditUndo.world===initial.world&&results.afterEditUndo.hash===initial.hash,'Undo restores the exact original world and selected STL');
  check(await page.evaluate(()=>__ctx.toolData.geometryWorld.measureResult===null),'Undo and the next poll keep the inspector closed');
};
s=s.slice(0,first)+'  await ('+focused.toString()+')();\n'+s.slice(last);
s=s.replace("modelEqual(initial,results.final,'Final fixture restores original selection, STL, blocks and action history');","check(initial.world===results.final.world&&initial.hash===results.final.hash,'Final fixture restores original blocks and selected STL after intentional edit/undo');");
s=s.replace("path.join(out,'workspace-feedback-results.json')","path.join(out,'workspace-feedback-closed-inspector-edit-results.json')");
eval(s);
