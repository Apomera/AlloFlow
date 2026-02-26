const fs = require('fs');
const f = 'AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// The problem: {dashboardData.length > 0 && ( <button CSV/> <button Research/> )} 
// JSX && can only return ONE element. Need to wrap in a fragment <> ... </>
// Fix: Add <> after the ( and </> before the )}

const oldOpen = `{dashboardData.length > 0 && (
                    <button
                        onClick={handleExportCSV} data-help-key="dashboard_export_csv_btn"`;

const newOpen = `{dashboardData.length > 0 && (<>
                    <button
                        onClick={handleExportCSV} data-help-key="dashboard_export_csv_btn"`;

const oldClose = `<FileDown size={14} /> 📊 Research PDF
                    </button>
                )}`;

const newClose = `<FileDown size={14} /> 📊 Research PDF
                    </button>
                </>)}`;

if (content.includes(oldOpen) && content.includes(oldClose)) {
    content = content.replace(oldOpen, newOpen);
    content = content.replace(oldClose, newClose);
    fs.writeFileSync(f, content, 'utf8');
    console.log('✅ Wrapped CSV + Research PDF buttons in React fragment <>...</>');
} else {
    if (!content.includes(oldOpen)) console.log('❌ Open anchor not found');
    if (!content.includes(oldClose)) console.log('❌ Close anchor not found');
}
