const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const files=fs.readdirSync('tests').filter(f=>/^geometry_world.*\.test\.js$/.test(f)).map(f=>'tests/'+f);
fs.writeFileSync(path.join(__dirname,'regression-files.json'),JSON.stringify(files,null,2));
console.log('Running '+files.length+' Geometry World test files');
const child=spawn(process.execPath,['node_modules/vitest/vitest.mjs','run',...files,'--maxWorkers=1','--hookTimeout=60000','--reporter=json','--outputFile='+path.join(__dirname,'regressions.json')],{stdio:'inherit',windowsHide:true});child.on('exit',code=>{process.exitCode=code??1;});
