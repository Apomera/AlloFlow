const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');

// FIX 1: Remove the duplicate state declarations inside the render functions
// Keep the ones at L11010-11 (our injection), remove the ones at L11817 and L12032
let removed = 0;
for (let i = 11700; i < 12100; i++) {
    if (lines[i] &&
        (lines[i].includes('const [showSurveyModal, setShowSurveyModal]') ||
            lines[i].includes('const [showResearchSetup, setShowResearchSetup]'))) {
        console.log('Removing duplicate at L' + (i + 1) + ': ' + lines[i].trim().substring(0, 60));
        lines.splice(i, 1);
        removed++;
        i--; // Re-check this index
    }
}
console.log('Removed ' + removed + ' duplicate declarations');

// FIX 2: Find and remove the modal renders that are in the wrong place
// They were inserted at position ~14595, inside a closing stack
// Find them by looking for the 3 showCBMImport/showSurveyModal/showResearchSetup conditional renders
let modalStart = -1;
let modalEnd = -1;
for (let i = 14500; i < 14700; i++) {
    if (lines[i] && lines[i].includes('showCBMImport') && lines[i].includes('renderCBMImportModal')) {
        modalStart = i;
    }
    if (lines[i] && lines[i].includes('showResearchSetup') && lines[i].includes('renderResearchSetupModal')) {
        modalEnd = i;
    }
}

if (modalStart > -1 && modalEnd > -1) {
    console.log('Removing misplaced modals at L' + (modalStart + 1) + '-L' + (modalEnd + 1));
    lines.splice(modalStart, modalEnd - modalStart + 1);
    console.log('Removed ' + (modalEnd - modalStart + 1) + ' lines');
}

// FIX 3: Re-insert modal renders in the correct place
// They need to go INSIDE the research tab's content div, before its closing </div>
// Find the research tab content - look for the renderResearchDashboard
let dashboardLine = -1;
for (let i = lines.length - 1; i > 0; i--) {
    if (lines[i] && lines[i].includes('renderResearchDashboard()')) {
        dashboardLine = i;
        break;
    }
}

if (dashboardLine > -1) {
    // After renderResearchDashboard, there should be: </div> )} </div> )} </div> </div> )}
    // The modals should go after the dashboard's closing )} 
    // Find the next )} after the dashboard
    let insertLine = -1;
    for (let i = dashboardLine; i < dashboardLine + 15; i++) {
        if (lines[i] && lines[i].trim() === ')}') {
            insertLine = i + 1;
            break;
        }
    }

    if (insertLine > -1) {
        const modals = [
            '                            {showCBMImport && typeof renderCBMImportModal === \'function\' && renderCBMImportModal()}',
            '                            {showSurveyModal && typeof renderSurveyModal === \'function\' && renderSurveyModal()}',
            '                            {showResearchSetup && typeof renderResearchSetupModal === \'function\' && renderResearchSetupModal()}'
        ];
        lines.splice(insertLine, 0, ...modals);
        console.log('Inserted modals at L' + (insertLine + 1));
    } else {
        console.log('Could not find insert point after dashboard');
    }
} else {
    console.log('Could not find renderResearchDashboard');
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('\nSaved! (' + lines.join('\n').length + ' bytes)');
