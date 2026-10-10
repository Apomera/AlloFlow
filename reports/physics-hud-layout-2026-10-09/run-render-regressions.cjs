const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),sourcePin='862666ca23a82fa5d15b73917b011fa9eb157554ac3d76302a4cb4d4a051abe0';
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const [name,spec] of [['callout','physics-canvas-callouts.spec.ts'],['point','physics-velocity-clarity.spec.ts']]) {
  for(const file of ['stem_lab/stem_tool_physics.js','desktop/web-app/public/stem_lab/stem_tool_physics.js'])assert.equal(sha(path.join(root,file)),sourcePin);
  const result=path.join(__dirname,name+'-results.json'),visual=path.join(__dirname,name==='callout'?'callouts':'points');
  assert(!fs.existsSync(result)&&!fs.existsSync(visual),'Preserve existing results before another invocation');
  const run=cp.spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test','tests/e2e/'+spec,'--config=reports/physics-hud-layout-2026-10-09/playwright.config.ts','--workers=1','--retries=0','--max-failures=1','--reporter=list,json','--output=reports/physics-hud-layout-2026-10-09/'+name+'-artifacts'],{cwd:root,windowsHide:true,stdio:'inherit',env:{...process.env,PHYSICS_VISUAL_REPORT_DIR:visual,PLAYWRIGHT_JSON_OUTPUT_FILE:result,NODE_OPTIONS:'--max-semi-space-size=4 --max-old-space-size=384'}});
  assert.equal(run.status,0,name+' regression failed');
  for(const file of ['stem_lab/stem_tool_physics.js','desktop/web-app/public/stem_lab/stem_tool_physics.js'])assert.equal(sha(path.join(root,file)),sourcePin);
}
