import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { patchDesktopHtml }=require('../desktop/scripts/build-desktop-web.cjs');
const source=fs.readFileSync('AlloFlowANTI.txt','utf8');
const handler=source.slice(source.indexOf('  const handleFileUpload = async (e) => {'),source.indexOf('  const handleSourceFileUpload'));
const loader=source.slice(source.indexOf('    const loadModule = (name, url) => {'),source.indexOf('    window.__alloRetryModule ='));
const lazy=source.match(/window\.__alloLazyFileIntake = \(\) => \{[^\n]+/)[0];
function harness(load) {
  vi.useFakeTimers(); let epoch=0; const window={AlloModules:{}};
  const calls={};for(const name of ['setIsExtracting','setPdfAuditLoading','setGenerationStep','setError','addToast','warnLog'])calls[name]=vi.fn();
  window.__alloLazyFileIntake=vi.fn(()=>load?.(window));
  const upload=vm.runInNewContext(handler+';handleFileUpload',{window,...calls,startNewPdfAudit:()=>++epoch,isPdfDocumentIntakeCurrent:e=>e===epoch,_alloMiscHandlersDeps:e=>({epoch:e}),t:()=>'',setTimeout});
  return {window,upload,calls};
}
const input=(name='rainfall.pdf')=>({currentTarget:{files:[{name}],value:name}});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();});
describe('first-use file intake readiness',()=>{
  it('promotes intake out of the startup queue without waiting for background work',()=>{
    const queued={name:'MiscHandlersModule',url:'queued'};const names={MiscHandlersModule:queued};const loadNow=vi.fn();const window={AlloModules:{}};
    const context={window,__alloBootstrappingModules:false,__alloDeferredModuleNames:names,__alloLoadModuleNow:loadNow};
    vm.runInNewContext(loader+lazy+';window.__alloLazyFileIntake();',context);
    expect(names.MiscHandlersModule).toBeUndefined();expect(loadNow).toHaveBeenCalledWith('MiscHandlersModule',expect.stringContaining('misc_handlers_module.js'));
  });
  it('loads on selection, retains the File after clearing the input, and dispatches when ready',async()=>{
    const dispatch=vi.fn();const h=harness(w=>setTimeout(()=>{w.AlloModules.MiscHandlers={handleFileUpload:dispatch};},250));const e=input();const file=e.currentTarget.files[0];const run=h.upload(e);
    expect(h.window.__alloLazyFileIntake).toHaveBeenCalledOnce();expect(e.currentTarget.value).toBe('');expect(dispatch).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(300);await run;
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({target:expect.objectContaining({files:[file]})}),{epoch:1});expect(h.calls.setError).not.toHaveBeenCalled();
  });
  it('uses an already registered handler without starting another load',async()=>{
    const h=harness();const dispatch=vi.fn();h.window.AlloModules.MiscHandlers={handleFileUpload:dispatch};await h.upload(input());expect(dispatch).toHaveBeenCalledOnce();expect(h.window.__alloLazyFileIntake).not.toHaveBeenCalled();
  });
  it('shows retry guidance after a timeout and accepts the same file on retry',async()=>{
    const h=harness();const e=input();const first=h.upload(e);await vi.advanceTimersByTimeAsync(30100);await first;expect(h.calls.setPdfAuditLoading).toHaveBeenLastCalledWith(false);expect(h.calls.setIsExtracting).toHaveBeenLastCalledWith(false);expect(h.calls.setError).toHaveBeenCalledWith(expect.stringContaining('choose the file again to retry'));
    const dispatch=vi.fn();h.window.__alloLazyFileIntake.mockImplementation(()=>{h.window.AlloModules.MiscHandlers={handleFileUpload:dispatch};});const retry=h.upload(e);await vi.advanceTimersByTimeAsync(100);await retry;expect(dispatch).toHaveBeenCalledOnce();expect(h.window.__alloLazyFileIntake).toHaveBeenCalledTimes(2);
  });
  it('never dispatches a stale file when another upload replaces it during loading',async()=>{
    const h=harness();const first=h.upload(input('first.pdf'));const second=h.upload(input('second.pdf'));const dispatch=vi.fn();h.window.AlloModules.MiscHandlers={handleFileUpload:dispatch};await vi.advanceTimersByTimeAsync(100);await Promise.all([first,second]);expect(dispatch).toHaveBeenCalledTimes(1);expect(dispatch.mock.calls[0][0].target.files[0].name).toBe('second.pdf');expect(h.calls.setError).not.toHaveBeenCalled();
  });
});
describe('desktop startup assets',()=>{
  it('repairs legacy AI script paths even with id/defer attributes during desktop staging',()=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alloflow-startup-test-'));
    try {
      for(const tag of ['<script id="alloflow-ai-backend-script" src="/ai_backend_module.js" defer="defer"></script>', '<script src="/ai_backend_module.js"></script>']) {
        const file=path.join(dir,'index.html');fs.writeFileSync(file,tag);patchDesktopHtml(dir);const result=fs.readFileSync(file,'utf8');expect(result).toBe(tag.replace('/ai_backend_module.js','./ai_backend_module.js'));patchDesktopHtml(dir);expect(fs.readFileSync(file,'utf8')).toBe(result);
      }
    } finally {fs.unlinkSync(path.join(dir,'index.html'));fs.rmdirSync(dir);}
  });
  it('resolves the AI script within the app under both root and nested hosting',()=>{
    const html=fs.readFileSync('desktop/web-app/public/index.html','utf8');const src=html.match(/id="alloflow-ai-backend-script" src="([^"]+)"/)[1];
    for(const base of ['http://localhost/','http://localhost/app/'])expect(new URL(src,base).href).toBe(base+'ai_backend_module.js');
  });
  it('includes the quest contract in the asset-copy manifest and local public assets',()=>{
    const build=fs.readFileSync('build.js','utf8');expect(build).toMatch(/name: 'AlloQuestContract',\s+filename: 'allo_quest_contract_module.js'/);expect(fs.readFileSync('desktop/web-app/public/allo_quest_contract_module.js','utf8')).toBe(fs.readFileSync('allo_quest_contract_module.js','utf8'));
  });
});

describe('tool catalog host paths',()=>{
  it.each([['http://localhost/app/','http://localhost/app/tool_index.json'],['http://127.0.0.1/','http://127.0.0.1/tool_index.json'],['https://alloflow.org/app/','https://alloflow.org/tool_index.json'],['https://gemini.google.com/app/123','https://alloflow-cdn.pages.dev/tool_index.json']])('loads the catalog from the correct host for %s',(href,expected)=>{
    const start=source.lastIndexOf('(function () {',source.indexOf('var _tiUrl'));const end=source.indexOf('})();',start)+5;const fetch=vi.fn(()=>Promise.resolve({ok:false}));
    vm.runInNewContext(source.slice(start,end),{window:{location:new URL(href)},fetch,URL});expect(fetch).toHaveBeenCalledWith(expected,{cache:'no-cache'});
  });
});
