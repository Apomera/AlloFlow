// Background vendor hashing must never weaken integrity: a warm prehash speeds verification up,
// a tampered binary still fails, and a stale prehash (file changed after hashing) is ignored.
import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,writeFileSync,copyFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const MCP=resolve('desktop/mcp');
const sha=b=>createHash('sha256').update(b).digest('hex');
// manifestBytes: what the manifest promises; fileBytes: what is actually on disk.
function fixture(manifestBytes,fileBytes=manifestBytes){
 const dir=mkdtempSync(join(tmpdir(),'alloflow-prehash-'));
 for(const n of readdirSync(MCP).filter(n=>n.endsWith('.cjs')))copyFileSync(join(MCP,n),join(dir,n));
 const vendor=join(dir,'vendor');mkdirSync(join(vendor,'epubcheck'),{recursive:true});
 const axe=Buffer.from('window.axe={};');writeFileSync(join(vendor,'axe.min.js'),axe);writeFileSync(join(vendor,'epubcheck','epubcheck.jar'),fileBytes);
 writeFileSync(join(vendor,'manifest.json'),JSON.stringify({schema:1,files:[{path:'axe.min.js',bytes:axe.length,sha256:sha(axe)},{path:'epubcheck/epubcheck.jar',bytes:manifestBytes.length,sha256:sha(manifestBytes)}]}));
 return {dir,vendor,driver:require(join(dir,'remediation_headless_driver.cjs'))};
}
const JAR=Buffer.alloc(3*1024*1024,7);
it('reuses the worker digests for binary entries and still verifies browser assets inline',async()=>{
 const f=fixture(JAR);const pre=await f.driver.prehashVendorBundle();
 expect(pre.get('epubcheck/epubcheck.jar')).toMatchObject({bytes:JAR.length,sha256:sha(JAR)});expect(pre.get('epubcheck/epubcheck.jar').mtimeMs).toBeGreaterThan(0);
 const v=f.driver.verifyVendorBundle();expect(v).toMatchObject({present:true,hashVerified:true,files:2});
 rmSync(f.dir,{recursive:true,force:true});
});
it('rejects a binary whose bytes differ from the manifest even after the worker hashed it',async()=>{
 const f=fixture(JAR,Buffer.concat([JAR,Buffer.from('x')]));await f.driver.prehashVendorBundle();
 const v=f.driver.verifyVendorBundle();expect(v.hashVerified).toBe(false);expect(v.error).toMatch(/failed hash verification: epubcheck\/epubcheck\.jar/);
 rmSync(f.dir,{recursive:true,force:true});
});
it('ignores a stale prehash when the file changed after hashing and re-verifies inline',async()=>{
 const f=fixture(JAR);await f.driver.prehashVendorBundle();
 await new Promise(r=>setTimeout(r,20));
 writeFileSync(join(f.vendor,'epubcheck','epubcheck.jar'),Buffer.alloc(JAR.length,9)); // same size, different bytes, after the worker ran
 const v=f.driver.verifyVendorBundle();
 // The worker digest matches the manifest, so a naive loader would trust it. It must not: the
 // file's timestamps no longer match the hashing moment, and inline verification is the authority.
 expect(v.hashVerified).toBe(false);expect(v.error).toMatch(/failed hash verification/);
 rmSync(f.dir,{recursive:true,force:true});
});
