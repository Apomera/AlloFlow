const fs=require('fs'),path=require('path'),crypto=require('crypto'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const file=path.join(__dirname,'dissection-scenario-clarity.spec.ts'),before=fs.readFileSync(file,'utf8');
if(sha(before)!=='4e499f53af25c029d8447fed342edacfb1593cd22e22dec24b1a66bae56ff487')throw Error('Browser fixture input guard');
const edits=[{
  name:'Run the full restart-review axe audit with its deferred timers resumed, then pause for deterministic confirmation',
  old:"await audit(page, 'restart-review'); const restartedAt = await page.evaluate(() => Date.now()); await page.keyboard.press('Space');",
  new:"await page.clock.resume(); await audit(page, 'restart-review'); await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 1000)); await expect(confirm(page)).toBeFocused(); const restartedAt = await page.evaluate(() => Date.now()); await page.keyboard.press('Space');"
}];
let after=before;for(const e of edits){if(after.split(e.old).length!==2)throw Error('Unique anchor');after=after.replace(e.old,e.new);}
require('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/esbuild').transformSync(after,{loader:'ts',format:'esm'});
let inverse=after;for(const e of edits.slice().reverse()){if(inverse.split(e.new).length!==2)throw Error('Inverse anchor');inverse=inverse.replace(e.new,e.old);}if(inverse!==before)throw Error('Exact reversal');
fs.writeFileSync(file,after);fs.writeFileSync(path.join(__dirname,'browser-axe-clock-fixture-edits.json'),JSON.stringify({scope:'Permit the full axe audit to execute deferred browser work, while retaining deterministic native restart confirmation and focus assertions',beforeSha256:sha(before),afterSha256:sha(after),syntax:'passed',exactReversal:true,repositoryWrites:false,suitesRun:false,edits},null,2));
console.log(JSON.stringify({file,beforeSha256:sha(before),afterSha256:sha(after),edits:edits.length,syntax:'passed',exactReversal:true,repositoryWrites:false,suitesRun:false}));
