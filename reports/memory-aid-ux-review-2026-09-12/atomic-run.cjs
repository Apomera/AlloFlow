// Avoid OneDrive's intermittent exclusive-open failures when replacing a build.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');
const write=fs.writeFileSync.bind(fs);
fs.writeFileSync=(file,data,options)=>{
  if(typeof file!=='string')return write(file,data,options);
  const resolved=path.resolve(file),relative=path.relative(root,resolved);
  if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Write outside project refused');
  const temp=resolved+'.memory-build-'+process.pid+'.tmp';
  try{write(temp,data,options);fs.renameSync(temp,resolved);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
};
for(const file of process.argv.slice(2))require(path.resolve(root,file));
