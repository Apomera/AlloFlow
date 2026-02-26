const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// Find the research tab's closing )}
// Search for the last renderResearchDashboard reference, then find the )} after it
const lastDashboard = content.lastIndexOf('renderResearchDashboard');
if (lastDashboard === -1) {
    console.log('ERROR: cannot find renderResearchDashboard');
    process.exit(1);
}

// After renderResearchDashboard, there's a closing )}, then </div>, then </div>, then )}
// We need to insert modals before the very last )} that closes the research tab
let pos = lastDashboard;
let closingCount = 0;
// Find the next 3 )} occurrences
for (let i = pos; i < pos + 1000 && i < content.length; i++) {
    if (content[i] === ')' && content[i + 1] === '}') {
        closingCount++;
        if (closingCount === 3) {
            // This should be the research tab's closing )}
            const modals = '\n                {showCBMImport && typeof renderCBMImportModal === \'function\' && renderCBMImportModal()}\n                {showSurveyModal && typeof renderSurveyModal === \'function\' && renderSurveyModal()}\n                {showResearchSetup && typeof renderResearchSetupModal === \'function\' && renderResearchSetupModal()}\n';
            content = content.substring(0, i) + modals + content.substring(i);
            console.log('Inserted modal renders at position ' + i);
            break;
        }
    }
}

fs.writeFileSync(f, content, 'utf8');
console.log('Saved! (' + content.length + ' bytes)');
