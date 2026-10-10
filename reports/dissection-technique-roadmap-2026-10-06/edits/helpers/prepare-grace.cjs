const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib'),vm=require('vm');const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-technique-roadmap-2026-10-06');
const source=fs.readFileSync(path.join(repo,'node_modules/vitest/dist/chunks/cli-api.Cjt90eJu.js')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const token of ['const START_TIMEOUT = 6e4;','const WORKER_START_TIMEOUT = 9e4;'])if(source.toString().split(token).length!==2)throw Error('Startup declaration missing');
let runner=fs.readFileSync(path.join(__dirname,'run-isolated.cjs'),'utf8');
runner=runner.replace("const args=unit?['node_modules/vitest/vitest.mjs'","const args=unit?['--require',path.join(__dirname,'worker-startup-grace.cjs'),'node_modules/vitest/vitest.mjs'");
runner=runner.replace("const env={...process.env,","const env={...process.env,DISSECTION_POOL_GRACE_LOG:path.join(out,'startup-grace.jsonl'),");
new vm.Script(runner);fs.writeFileSync(path.join(__dirname,'run-grace.cjs'),runner);
fs.writeFileSync(path.join(report,'edits/vitest-startup-source.js.gz'),zlib.gzipSync(source));fs.writeFileSync(path.join(report,'edits/vitest-startup-grace.json'),JSON.stringify({installedPath:'node_modules/vitest/dist/chunks/cli-api.Cjt90eJu.js',installedSha256:hash(source),startupHandshakeMs:[60000,180000],poolStartupMs:[90000,210000],inMemoryOnly:true,perTestDeadlinesUnchanged:true},null,2));console.log('Prepared startup-only in-memory grace; installed dependency unchanged');
