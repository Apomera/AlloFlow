const fs = require('fs');
let content = fs.readFileSync('stem_lab_module.js', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
const lines = content.split(/\r?\n/);

function findLine(str, from) {
  from = from || 0;
  for (let i = from; i < lines.length; i++) {
    if (lines[i].includes(str)) return i;
  }
  return -1;
}

const results = [];

// Find nervous system / brain atlas in anatomy
var nervousL = findLine('nervous', 28139);
results.push('nervous: ' + (nervousL+1));

var brainAtlas = findLine('Brain Atlas', 28139);
results.push('Brain Atlas: ' + (brainAtlas+1));

// Find where the anatomy tool ENDS
var anatEnd = findLine("stemLabTool === '", 28139 + 100);
results.push('next tool after anatomy starts at: ' + (anatEnd+1));
results.push('  ' + lines[anatEnd].trim().substring(0, 80));

// Find the nervous system section more broadly
var nervousSys = findLine("'nervous'", 28139);
results.push('nervous system key: ' + (nervousSys+1));
if (nervousSys >= 0) results.push('  ' + lines[nervousSys].trim().substring(0, 120));

// Find where structures end and the rendering begins
var renderStart = findLine('// ── Render', 28139);
results.push('render start: ' + (renderStart+1));

// Find the brain in nervous system
var brainEntry = findLine("id: 'brain'", 28139);
results.push('brain entry: ' + (brainEntry+1));
if (brainEntry >= 0) results.push('  ' + lines[brainEntry].trim().substring(0, 100));

// Find where the detail panel renders (where selected structure shows)
var detailPanel = findLine('// Detail panel', 28139);
results.push('detail panel: ' + (detailPanel+1));

// Find the geology timeline rendering
var geoTimeline = findLine("simTab === 'timeline'");
results.push('geology timeline: ' + (geoTimeline+1));
if (geoTimeline >= 0) {
  for (let i = geoTimeline; i < geoTimeline + 30; i++) {
    results.push('L' + (i+1) + ': ' + lines[i].trim().substring(0, 100));
  }
}

fs.writeFileSync('investigation5.txt', results.join('\n'), 'utf8');
console.log('Done');
