'use strict';
const fs=require('fs'),path=require('path'),archive=require('./remediation_epub_archive.cjs');
const cli=process.argv[2],args=process.argv.slice(3),controller=new AbortController();
let cancelling=false,runner=null,expanded=null;
process.on('message',async message=>{if(message?.type!=='cancel'||cancelling)return;cancelling=true;controller.abort();try{await runner?.close();}catch(_){}process.exit(130);});
process.on('exit',()=>{if(expanded){try{fs.rmSync(expanded,{recursive:true,force:true});}catch(_){}}});
(async()=>{
  const input=args[args.length-1];
  if(!cli||!input||input.startsWith('-'))throw Error('Ace worker requires an EPUB archive.');
  // Ace accepts expanded EPUB directories. Our bounded extractor creates only regular
  // files, so neither third-party ZIP extraction fallback receives the archive.
  expanded=await archive.extract(input,path.dirname(path.resolve(input)),{signal:controller.signal});
  args[args.length-1]=expanded;
  const runnerPath=require.resolve('@daisy/ace-axe-runner-puppeteer',{paths:[path.dirname(cli)]});
  const puppeteerPath=require.resolve('puppeteer',{paths:[path.dirname(runnerPath)]});
  let trustedScriptRoot=path.dirname(runnerPath);
  while(path.basename(trustedScriptRoot)!=='node_modules'&&path.dirname(trustedScriptRoot)!==trustedScriptRoot)trustedScriptRoot=path.dirname(trustedScriptRoot);
  if(path.basename(trustedScriptRoot)!=='node_modules')throw Error('Ace bundled script root is unavailable.');
  const puppeteer={...require(puppeteerPath)};
  require('./remediation_ace_browser.cjs').install(puppeteer,{
    epubRoot:expanded,trustedScriptRoot
  });
  // Puppeteer 25 exposes an immutable ESM namespace to require(). Ace imports
  // through CommonJS, so replace only this resolved module's worker-local cache
  // export with the hardened mutable facade before the runner is loaded.
  if(!require.cache[puppeteerPath])throw Error('Ace browser module cache is unavailable.');
  require.cache[puppeteerPath].exports=puppeteer;
  runner=require(runnerPath);
  runner.concurrency=1;
  process.argv=[process.execPath,cli,...args];
  require(cli);
})().catch(error=>{process.stderr.write(String(error.message||error).slice(0,1000)+'\n');process.exitCode=1;});
