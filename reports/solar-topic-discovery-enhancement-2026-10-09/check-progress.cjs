const fs=require('node:fs'),path=require('node:path');
const mode=process.argv[2];if(!['unit-topics','unit-navigation','unit-shortcuts','unit-discovery','visual'].includes(mode))throw Error('Unknown check');
const read=suffix=>{const file=path.join(__dirname,mode+'-'+suffix);return fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;};
console.log(JSON.stringify({mode,exit:read('exit.json')&&JSON.parse(read('exit.json')),runner:read('runner.json')&&JSON.parse(read('runner.json')),tail:read('log.txt')?.split(/\r?\n/).filter(Boolean).slice(-8)},null,2));
