const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const workspace=fs.realpathSync('C:/Users/cabba/Documents/Codex');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const target=path.resolve(workspace,'.diss-replay-review-20261009');
if(path.dirname(target)!==workspace||path.basename(target)!=='.diss-replay-review-20261009')throw Error('Unsafe temporary target');
const processCheck=cp.spawnSync('powershell.exe',['-NoProfile','-Command',"@(Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*\\.diss-replay-review-20261009\\*' } | Select-Object -ExpandProperty ProcessId) | ConvertTo-Json -Compress"],{encoding:'utf8',windowsHide:true});
if(processCheck.status!==0)throw Error('Cannot inspect temporary process ownership');
if(processCheck.stdout.trim())throw Error('An active process still uses the scoped temporary directory: '+processCheck.stdout.trim());
for(const label of ['unit-1','unit-2','unit-3','unit-4','unit-5','browser-2','browser-3','browser-4','browser-5','browser-6','browser-7']){
  const receipt=path.join(repo,'reports/dissection-replay-review-2026-10-09',label,'run.json');
  if(!fs.existsSync(receipt))continue;const run=JSON.parse(fs.readFileSync(receipt,'utf8'));
  let alive=false;try{process.kill(run.pid,0);alive=true;}catch(error){if(error.code!=='ESRCH')throw error;}
  if(alive){
    const command="Get-CimInstance Win32_Process -Filter 'ProcessId = "+run.pid+"' | ForEach-Object { [pscustomobject]@{ name = $_.Name; created = $_.CreationDate.ToUniversalTime().ToString('o') } } | ConvertTo-Json -Compress";
    const check=cp.spawnSync('powershell.exe',['-NoProfile','-Command',command],{encoding:'utf8',windowsHide:true});
    if(check.status!==0)throw Error('Cannot verify reused PID');
    const current=check.stdout.trim()?JSON.parse(check.stdout):null;
    const ended=run.end||JSON.parse(fs.readFileSync(path.join(path.dirname(receipt),'interruption.json'),'utf8')).at;
    if(current&&new Date(current.created).getTime()<=new Date(ended).getTime())throw Error('Original pinned process may still be alive: '+run.pid);
  }
}
let removedBytes=0,files=0;
function measure(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('Unexpected temporary symlink');if(entry.isDirectory())measure(file);else{removedBytes+=fs.statSync(file).size;files++;}}}
if(fs.existsSync(target)){if(fs.realpathSync(target)!==target)throw Error('Temporary path redirects');measure(target);fs.rmSync(target,{recursive:true,force:false});}
const hashes={};
for(const file of ['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js'])hashes[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,file))).digest('hex');
const disk=fs.statfsSync(repo),result={at:new Date().toISOString(),target,removedFiles:files,removedMiB:removedBytes/1048576,freeMiB:disk.bavail*disk.bsize/1048576,sourceHashes:hashes,scope:'Inactive test temporary directory created by this chat. Repository reports and shared files retained.'};
fs.writeFileSync(path.join(repo,'reports/dissection-replay-contact-2026-10-10/temp-cleanup.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
