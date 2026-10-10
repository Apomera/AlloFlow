const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-adaptive-coaching-2026-10-09');
const unit=fs.readFileSync(path.join(repo,'tests/dissection_lab_improvements.test.js'));
console.log('Unit hash '+crypto.createHash('sha256').update(unit).digest('hex'));
console.log('Edit files '+fs.readdirSync(path.join(report,'edits')).join(', '));
console.log(unit.toString().split('\n').slice(-95).join('\n'));
