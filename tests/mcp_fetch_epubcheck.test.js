// fetch_epubcheck.cjs: every source (present, local install, pinned download) must end in a
// manifest-verified tree; a tampered archive or file must never be accepted.
import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const F=require('../desktop/mcp/fetch_epubcheck.cjs');const Zip=require('../desktop/mcp/zip_writer.cjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const JAR=Buffer.from('fake jar bytes for the test');const LIB=Buffer.from('fake lib');
function vendor(){
 const dir=mkdtempSync(join(tmpdir(),'alloflow-fetch-'));
 writeFileSync(join(dir,'manifest.json'),JSON.stringify({schema:1,files:[
  {path:'axe.min.js',bytes:1,sha256:sha(Buffer.from('x'))},
  {path:'epubcheck/epubcheck.jar',bytes:JAR.length,sha256:sha(JAR)},
  {path:'epubcheck/lib/a.jar',bytes:LIB.length,sha256:sha(LIB)}]}));
 return dir;
}
function localInstall(jar=JAR){const root=mkdtempSync(join(tmpdir(),'alloflow-epubcheck-local-'));writeFileSync(join(root,'epubcheck.jar'),jar);mkdirSync(join(root,'lib'));writeFileSync(join(root,'lib','a.jar'),LIB);return root;}
it('reports a missing tree in --check mode without touching the network',async()=>{
 const dir=vendor();const r=await F.ensureEpubcheck({vendorDir:dir,checkOnly:true,homeDir:dir});
 expect(r.source).toBe('missing');expect(r.missing).toEqual(['epubcheck/epubcheck.jar','epubcheck/lib/a.jar']);
});
it('copies only manifest-declared files from a local install and verifies them',async()=>{
 const dir=vendor();const root=localInstall();writeFileSync(join(root,'README.txt'),'not declared');
 const r=await F.ensureEpubcheck({vendorDir:dir,localRoots:[root],homeDir:dir,offline:true});
 expect(r.source).toBe(root);expect(readFileSync(join(dir,'epubcheck','epubcheck.jar'))).toEqual(JAR);expect(existsSync(join(dir,'epubcheck','README.txt'))).toBe(false);
 expect((await F.ensureEpubcheck({vendorDir:dir,checkOnly:true,homeDir:dir})).source).toBe('present');
});
it('rejects a local install whose bytes do not match the manifest and refuses to download offline',async()=>{
 const dir=vendor();const root=localInstall(Buffer.from('tampered'));
 await expect(F.ensureEpubcheck({vendorDir:dir,localRoots:[root],homeDir:dir,offline:true})).rejects.toThrow(/downloads are disabled/);
 expect(readFileSync(join(dir,'epubcheck','lib','a.jar'))).toEqual(LIB); // the good file was copied, the bad one stays flagged
});
it('accepts the pinned release archive only when its SHA-256 matches',async()=>{
 const dir=vendor();
 const archive=Zip.zipFileMap({['epubcheck-'+F.VERSION+'/epubcheck.jar']:JAR,['epubcheck-'+F.VERSION+'/lib/a.jar']:LIB});
 const download=async(url,dest)=>{expect(url).toBe(F.RELEASE_URL);writeFileSync(dest,archive);};
 await expect(F.ensureEpubcheck({vendorDir:dir,homeDir:dir,download})).rejects.toThrow(/does not match the pinned/);
 expect(existsSync(join(dir,'epubcheck','epubcheck.jar'))).toBe(false);
 rmSync(dir,{recursive:true,force:true});
},20000);
