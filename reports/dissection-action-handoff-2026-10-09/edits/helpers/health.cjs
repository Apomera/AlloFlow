const fs=require('fs'),os=require('os'),path=require('path');
const disk=fs.statfsSync('C:/',{bigint:true});
console.log(JSON.stringify({freeDiskMiB:Number(disk.bavail*disk.bsize)/1048576,freeMemoryMiB:os.freemem()/1048576}));
const base='C:/Users/cabba/Documents/Codex/.diss-action-handoff-20261009';
function size(dir){return fs.readdirSync(dir,{withFileTypes:true}).reduce((n,d)=>n+(d.isSymbolicLink()?0:d.isDirectory()?size(path.join(dir,d.name)):fs.statSync(path.join(dir,d.name)).size),0);}
for(const name of fs.readdirSync(base))console.log(name,(size(path.join(base,name))/1048576).toFixed(2)+' MiB');
