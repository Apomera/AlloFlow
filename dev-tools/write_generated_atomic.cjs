const fs = require('fs');
// Replace a generated file without exposing a truncated intermediate file to readers.
module.exports = function writeGeneratedAtomic(file, content) {
 const temporary=file+'.next-build-'+process.pid, previous=file+'.previous-build-'+process.pid;
 try { fs.writeFileSync(temporary,content,'utf8'); } catch(error) { if(fs.existsSync(temporary)) fs.unlinkSync(temporary); throw error; }
 let moved=false;
 try { if(fs.existsSync(file)){fs.renameSync(file,previous);moved=true;} fs.renameSync(temporary,file); if(moved)fs.unlinkSync(previous); }
 catch(error){if(!fs.existsSync(file)&&moved)fs.renameSync(previous,file);if(fs.existsSync(temporary))fs.unlinkSync(temporary);throw error;}
};
