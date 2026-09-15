const fs=require('node:fs');const read=fs.readFileSync.bind(fs);
fs.readFileSync=(...args)=>{const value=read(...args);return typeof value==='string'?value.replace(/\r\n/g,'\n'):value;};
require('./resume-edit.cjs');
