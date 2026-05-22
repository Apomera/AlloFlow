var s = require('fs').readFileSync('local-app/src/LocalApp.jsx', 'utf8');
var gens = [...s.matchAll(/handleGenerate\s*\(\s*"([^"]+)"/g)];
var uniq = [...new Set(gens.map(function(m) { return m[1]; }))];
console.log('GEN_TYPES:');
uniq.forEach(function(g) { console.log(' ', g); });

var helps = [...s.matchAll(/data-help-key="([^"]+)"/g)];
var hkeys = [...new Set(helps.map(function(m) { return m[1]; }))];
console.log('\nHELP_KEYS:');
hkeys.forEach(function(k) { console.log(' ', k); });

var roleMatches = [...s.matchAll(/handleRoleClick\s*\(\s*'([^']+)'/g)];
var roles = [...new Set(roleMatches.map(function(m) { return m[1]; }))];
console.log('\nROLES:');
roles.forEach(function(r) { console.log(' ', r); });

var tabMatches = [...s.matchAll(/setActiveTab\s*\(\s*'([^']+)'/g)];
var tabs = [...new Set(tabMatches.map(function(m) { return m[1]; }))];
console.log('\nTABS:');
tabs.forEach(function(t) { console.log(' ', t); });

var modalMatches = [...s.matchAll(/setShow(\w+)\s*\(\s*true/g)];
var modals = [...new Set(modalMatches.map(function(m) { return m[1]; }))];
console.log('\nMODALS (setShowX(true)):');
modals.forEach(function(m) { console.log(' ', m); });

var btnTexts = [...s.matchAll(/>([A-Z][a-zA-Z ]{3,35})</g)];
var btns = [...new Set(btnTexts.map(function(m) { return m[1].trim(); }).filter(function(b) { return b.length > 3 && b.length < 36; }))];
console.log('\nBUTTON TEXT CANDIDATES (sample):');
btns.slice(0, 60).forEach(function(b) { console.log(' ', b); });
