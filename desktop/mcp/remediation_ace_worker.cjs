'use strict';
const path=require('path');
const cli=process.argv[2];
const runnerPath=require.resolve('@daisy/ace-axe-runner-puppeteer',{paths:[path.dirname(cli)]});
const runner=require(runnerPath);
let cancelling=false;
process.on('message',async message=>{if(message?.type!=='cancel'||cancelling)return;cancelling=true;try{await runner.close();}catch(_){}process.exit(130);});
process.argv=[process.execPath,cli,...process.argv.slice(3)];
require(cli);
