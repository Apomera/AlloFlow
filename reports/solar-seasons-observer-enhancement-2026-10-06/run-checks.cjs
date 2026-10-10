const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const mode=process.argv[2],root=path.resolve(__dirname,'../..');
let args;
if(mode==='unit')args=['node_modules/vitest/vitest.mjs','run','--config=reports/solar-seasons-observer-enhancement-2026-10-06/deferred-jsdom-regression.vitest.config.mjs'];
else if(mode==='focused')args=['node_modules/vitest/vitest.mjs','run','--config=reports/solar-seasons-observer-enhancement-2026-10-06/deferred-jsdom.vitest.config.mjs'];
else if(mode==='commit-regression')args=['node_modules/vitest/vitest.mjs','run','--config=reports/solar-seasons-observer-enhancement-2026-10-06/deferred-jsdom-commit.vitest.config.mjs'];
else if(mode==='unit-final')args=['node_modules/vitest/vitest.mjs','run','--config=reports/solar-seasons-observer-enhancement-2026-10-06/deferred-jsdom-final-regression.vitest.config.mjs'];
else if(mode==='unit-retry')args=['node_modules/vitest/vitest.mjs','run','--config=reports/solar-seasons-observer-enhancement-2026-10-06/deferred-jsdom-retry.vitest.config.mjs'];
else if(mode==='unit-retry')args=['node_modules/vitest/vitest.mjs','run','--config=reports/solar-seasons-observer-enhancement-2026-10-06/deferred-jsdom-retry.vitest.config.mjs'];
else if(mode==='browser')args=['node_modules/@playwright/test/cli.js','test','--config=reports/solar-seasons-observer-enhancement-2026-10-06/playwright.config.ts','tests/e2e/114-solar-system-seasons-observer.spec.ts','tests/e2e/47-solar-system-seasons-lab.spec.ts','tests/e2e/56-solar-system-latitude-explorer.spec.ts','tests/e2e/57-solar-system-guided-seasons.spec.ts','--project=chromium','--workers=1','--output=reports/solar-seasons-observer-enhancement-2026-10-06/browser-artifacts'];
else if(mode==='visual'||mode==='before')args=[path.join(__dirname,'visual-qa.cjs'),...(mode==='before'?['--before']:[])];
else if(mode==='mirror'){fs.copyFileSync(path.join(root,'stem_lab/stem_tool_solarsystem.js'),path.join(root,'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'));console.log('Canonical and desktop mirror synchronized.');process.exit(0);}
else throw Error('Unknown check mode');
const log=path.join(__dirname,mode+'-log.txt'),fd=fs.openSync(log,'w');
const childEnv={...process.env,NODE_OPTIONS:[process.env.NODE_OPTIONS||'','--max-semi-space-size=1','--max-old-space-size=256'].filter(Boolean).join(' ')};
const result=spawnSync(process.execPath,args,{cwd:root,env:childEnv,encoding:'utf8',windowsHide:true,stdio:['ignore',fd,fd]});fs.closeSync(fd);
console.log(fs.readFileSync(log,'utf8').slice(-20000));if(result.error)console.error(result.error);
process.exitCode=result.status??1;
