'use strict';
const fs=require('fs'),path=require('path'),archive=require('./remediation_epub_archive.cjs');
const cli=process.argv[2],args=process.argv.slice(3),controller=new AbortController();
let cancelling=false,runner=null,expanded=null;
const cleanupExpanded=()=>{if(expanded){const dir=expanded;expanded=null;try{fs.rmSync(dir,{recursive:true,force:true});}catch(_){}}};
const shutdown=async(code)=>{
  if(cancelling)return;
  cancelling=true;
  controller.abort();
  try{
    if(runner&&typeof runner.close==='function'){
      let timer;
      await Promise.race([
        Promise.resolve().then(()=>runner.close()).finally(()=>{if(timer)clearTimeout(timer);}),
        new Promise(resolve=>{timer=setTimeout(resolve,5000);if(typeof timer.unref==='function')timer.unref();}),
      ]);
    }
  }catch(_){}
  cleanupExpanded();
  process.exit(code);
};
process.on('message',message=>{if(message?.type==='cancel')shutdown(130);});
process.on('SIGTERM',()=>shutdown(143));
process.on('SIGINT',()=>shutdown(130));
process.on('exit',cleanupExpanded);
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
  const aceBrowser=require('./remediation_ace_browser.cjs');
  const trustedCli=aceBrowser.containedFile(trustedScriptRoot,cli)||aceBrowser.containedFile(path.dirname(trustedScriptRoot),cli);
  if(!trustedCli)throw Error('Ace CLI entry escaped its bundled runtime.');
  aceBrowser.install(puppeteer,{
    epubRoot:expanded,trustedScriptRoot
  });
  // Puppeteer 25 exposes an immutable ESM namespace to require(). Ace imports
  // through CommonJS, so replace only this resolved module's worker-local cache
  // export with the hardened mutable facade before the runner is loaded.
  if(!require.cache[puppeteerPath])throw Error('Ace browser module cache is unavailable.');
  require.cache[puppeteerPath].exports=puppeteer;
  runner=require(runnerPath);
  runner.concurrency=1;
  process.argv=[process.execPath,trustedCli,...args];
  require(trustedCli);
})().catch(error=>{process.stderr.write(String(error.message||error).slice(0,1000)+'\n');shutdown(1);});
