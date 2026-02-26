const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');
const lines = content.split('\n');

// Find the Insights tab rendering
const insightsIdx = content.indexOf("activeTab === 'insights'");
if (insightsIdx > -1) {
    const l = content.substring(0, insightsIdx).split('\n').length;
    console.log('Insights tab render starts at L' + l);
    // Show 150 lines of the insights tab
    for (let i = l - 1; i < Math.min(l + 150, lines.length); i++) {
        console.log('L' + (i + 1) + ': ' + lines[i].substring(0, 110));
    }
} else {
    console.log('activeTab === insights NOT FOUND');
}
