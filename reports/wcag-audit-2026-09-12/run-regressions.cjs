const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const files = fs.readdirSync(path.join(root, 'tests')).filter(n => /(wcag|a11y|accessibility).*\.test\.js$/i.test(n)).sort().map(n => 'tests/' + n);
const manifest = { startedAt: new Date().toISOString(), head: cp.execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root,encoding:'utf8'}).trim(), node:process.version, platform:process.platform, release:JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8')), selection:'Top-level tests whose filename contains wcag, a11y, or accessibility', files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})) };
fs.writeFileSync(path.join(__dirname,'regression-manifest.json'),JSON.stringify(manifest,null,2));
const log = fs.openSync(path.join(__dirname,'regressions.log'),'w');
const args = ['node_modules/vitest/vitest.mjs','run','--config=reports/wcag-audit-2026-09-12/vitest.config.mjs','--maxWorkers=2','--testTimeout=30000','--reporter=default','--reporter=json','--outputFile='+path.join(__dirname,'regressions.json')];
console.log('Running '+files.length+' accessibility test files; output in '+__dirname);
const child = cp.spawn(process.execPath,args,{cwd:root,stdio:['ignore',log,log]});
child.on('exit',code=>{fs.closeSync(log); manifest.finishedAt=new Date().toISOString();manifest.exitCode=code;fs.writeFileSync(path.join(__dirname,'regression-manifest.json'),JSON.stringify(manifest,null,2));console.log('Completed with exit code '+code);process.exitCode=code;});

