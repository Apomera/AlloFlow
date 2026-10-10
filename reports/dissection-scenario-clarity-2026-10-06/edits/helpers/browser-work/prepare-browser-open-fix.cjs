const fs=require('fs'),path=require('path'),crypto=require('crypto'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const file=path.join(__dirname,'dissection-scenario-clarity.spec.ts'),before=fs.readFileSync(file,'utf8');
if(sha(before)!=='4df2924590a118f81de03b90fbd665f5d1e1083c2a507f198a0e92723ee7f51e')throw Error('Browser fixture baseline guard');
const edits=[
  {
    name:'Open the native technique details in the initial fixture state',
    old:"  revealedLayers: {}, procedureByLayer: { skin: partial, muscle: complete }, workspaceMode: 'advanced', toolbarViewOpen: false, toolbarStudyOpen: false, toolbarToolsOpen: false,",
    new:"  revealedLayers: {}, procedureByLayer: { skin: partial, muscle: complete }, workspaceMode: 'advanced', techniquePanelOpen: true, toolbarViewOpen: false, toolbarStudyOpen: false, toolbarToolsOpen: false,"
  },
  {
    name:'Explicitly reopen native technique details after timed identification if closed',
    old:"  expect(await proof(page)).toEqual({ ...before, selected: null, scores: [0, 0], comparingAttempts: false }); await study.getByRole('button', { name: 'End timed practical', exact: true }).click(); expect((await state(page)).scenarioStartedAt).toBe(challenge.scenarioStartedAt); await expect(consolePanel(page)).toBeVisible();",
    new:"  expect(await proof(page)).toEqual({ ...before, selected: null, scores: [0, 0], comparingAttempts: false }); await study.getByRole('button', { name: 'End timed practical', exact: true }).click(); expect((await state(page)).scenarioStartedAt).toBe(challenge.scenarioStartedAt);\n  const technique = page.locator('#diss-procedure-panel'); if (!(await technique.evaluate(node => (node as HTMLDetailsElement).open))) await technique.locator(':scope > summary').click();\n  await expect(consolePanel(page)).toBeVisible();"
  }
];
let after=before;for(const e of edits){if(after.split(e.old).length!==2)throw Error('Unique anchor: '+e.name);after=after.replace(e.old,e.new);}
require('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/esbuild').transformSync(after,{loader:'ts',format:'esm'});
let inverse=after;for(const e of edits.slice().reverse()){if(inverse.split(e.new).length!==2)throw Error('Inverse anchor: '+e.name);inverse=inverse.replace(e.new,e.old);}if(inverse!==before)throw Error('Exact reversal');
fs.writeFileSync(file,after);fs.writeFileSync(path.join(__dirname,'browser-open-fixture-edits.json'),JSON.stringify({scope:'Honor the existing native technique details disclosure',beforeSha256:sha(before),afterSha256:sha(after),syntax:'passed',exactReversal:true,repositoryWrites:false,suitesRun:false,edits},null,2));
console.log(JSON.stringify({file,beforeSha256:sha(before),afterSha256:sha(after),edits:edits.length,syntax:'passed',exactReversal:true,repositoryWrites:false,suitesRun:false}));
