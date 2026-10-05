
const fs=require('fs'),cp=require('child_process'),path=require('path');
process.env.STEM_GL_SUBSTITUTE='stem_lab/stem_tool_scaleexplorer.js='+path.resolve('reports/scale-explorer-orion-front/candidate-source.js').replace(/\\/g,'/');
const output=fs.openSync('reports/scale-explorer-orion-front/browser-final-targeted.json','w');
const result=cp.spawnSync(process.execPath,[path.resolve('node_modules/@playwright/test/cli.js'),'test','tests/e2e/scale-explorer-nebula-bearing.spec.ts','tests/e2e/scale-explorer-nebula-passage.spec.ts','tests/e2e/scale-explorer-nebula.spec.ts','--grep','optional star locator|320px WebGL 1 offers immediate facing|a passage moves continuously|the cloud and its stars render with a WebGL 1 context','--workers=1','--reporter=json'],{cwd:process.cwd(),env:process.env,stdio:['ignore',output,'inherit']});
fs.closeSync(output);if(result.error)throw result.error;process.exit(result.status===null?1:result.status);
