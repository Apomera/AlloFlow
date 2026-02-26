// One more paren fix: add another ) to line 2979, remove one from end
var fs = require('fs');
var lines = fs.readFileSync('stem_lab_module.js', 'utf8').split('\n');

for (var i = 2975; i < 2985; i++) {
    if (lines[i] && lines[i].indexOf('next_challenge') !== -1 && lines[i].indexOf(')))),') !== -1) {
        lines[i] = lines[i].replace(')))),', '))))),');
        console.log('L' + (i + 1) + ': Added 1 more ) ())))  -> )))))');
        break;
    }
}

for (var i = lines.length - 1; i > 3480; i--) {
    var trimmed = lines[i].replace(/\r/g, '').trim();
    if (trimmed.indexOf('))))') === 0 && trimmed.indexOf(')))))') === -1) {
        lines[i] = lines[i].replace('))))', ')))');
        console.log('L' + (i + 1) + ': Removed 1 ) from end');
        break;
    }
}

var content = lines.join('\n');
fs.writeFileSync('stem_lab_module.js', content);

var ps = 0;
for (var j = 0; j < content.length; j++) {
    if (content[j] === '(') ps++;
    if (content[j] === ')') ps--;
}
console.log('Paren balance:', ps);
try { new Function(content); console.log('SYNTAX OK'); }
catch (e) { console.log('SYNTAX ERROR:', e.message); }

var vd = 0;
var vLines = content.split('\n');
for (var k = 0; k < vLines.length; k++) {
    var line = vLines[k].replace(/\r/g, '');
    for (var c = 0; c < line.length; c++) {
        if (line[c] === '(') vd++;
        if (line[c] === ')') vd--;
    }
    if (line.indexOf('stemLabTool') !== -1 && line.indexOf('explore') !== -1 && line.indexOf('&&') !== -1 && line.trim().indexOf('//') !== 0) {
        var m = line.match(/stemLabTool\s*===\s*'(\w+)'/);
        if (m) console.log(m[1] + ': depth=' + vd);
    }
}
console.log('Final depth:', vd);
