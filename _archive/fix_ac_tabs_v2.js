const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');

// STRATEGY: Remove the broken conditional wrapper and research tab content.
// Instead, add display:none style to the content div when on research tab,
// and put research content after the content div.

// Step 1: Remove the broken wrapper elements
// Find and remove: {(isIndependentMode || assessmentCenterTab === 'assessments') && (
//                   <div>
let wrapperRemoved = false;
for (let i = 12955; i < 12975; i++) {
    if (lines[i] && lines[i].includes('assessmentCenterTab') && lines[i].includes('assessments') && lines[i].includes('&&')) {
        console.log('Found wrapper at L' + (i + 1) + ': ' + lines[i].trim().substring(0, 80));
        // Check if next line is <div>
        if (lines[i + 1] && lines[i + 1].trim() === '<div>') {
            lines.splice(i, 2);
            console.log('Removed wrapper open (2 lines)');
            wrapperRemoved = true;
        } else {
            // The wrapper might be on one line with the <div>
            lines.splice(i, 1);
            console.log('Removed wrapper open (1 line)');
            wrapperRemoved = true;
        }
        break;
    }
}

// Step 2: Find and remove the matching </div>)} close + research tab content
// The research tab content starts with </div> )} and then has the research conditional
// Find: </div>\n)}\n{!isIndependentMode && assessmentCenterTab === 'research'...
let researchStart = -1;
let researchEnd = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('assessmentCenterTab') && lines[i].includes('research') && lines[i].includes('&&')) {
        // This is the research tab conditional
        // Check what's just before it
        const prevLine = lines[i - 1]?.trim();
        const prev2Line = lines[i - 2]?.trim();
        console.log('Research conditional at L' + (i + 1));
        console.log('  prev: ' + prev2Line + ' | ' + prevLine);

        // The wrapper close should be </div>\n)} just before
        if (prevLine === ')}' && prev2Line === '</div>') {
            researchStart = i - 2; // the </div> that closes the wrapper
        } else if (prevLine === ')}') {
            researchStart = i - 1;
        } else {
            researchStart = i;
        }

        // Find the end of the research tab content
        // It ends with </div>\n)}
        let depth = 0;
        for (let j = i; j < Math.min(i + 200, lines.length); j++) {
            if (lines[j]?.trim() === ')}' && depth <= 0) {
                researchEnd = j;
                break;
            }
            // Track JSX depth roughly
            const openCount = (lines[j]?.match(/<div/g) || []).length;
            const closeCount = (lines[j]?.match(/<\/div>/g) || []).length;
            depth += openCount - closeCount;
        }
        break;
    }
}

if (researchStart > -1 && researchEnd > -1) {
    console.log('Removing research wrapper/content from L' + (researchStart + 1) + ' to L' + (researchEnd + 1));
    lines.splice(researchStart, researchEnd - researchStart + 1);
    console.log('Removed ' + (researchEnd - researchStart + 1) + ' lines');
}

// Step 3: Now add the research tab properly
// Modify the content div to include display style
const contentDiv = '<div className="flex-1 overflow-y-auto p-4">';
let contentLine = -1;
for (let i = 12940; i < 12970; i++) {
    if (lines[i] && lines[i].includes(contentDiv)) {
        contentLine = i;
        break;
    }
}

if (contentLine > -1) {
    // Replace the content div with one that hides when on research tab
    lines[contentLine] = lines[contentLine].replace(
        contentDiv,
        '<div className="flex-1 overflow-y-auto p-4" style={{ display: (!isIndependentMode && assessmentCenterTab === \'research\') ? \'none\' : undefined }}>'
    );
    console.log('Step 3: Added display style to content div at L' + (contentLine + 1));
}

// Step 4: Find where to insert the research tab content
// It should go after the content div's closing but before the modal wrapper's closing
// The structure is: <div modal wrapper> <div header> <div tabs if teacher> <div content>...</div> </div>
// We want to add after the content div closes
// Find the portal close: , document.body)
let portalLine = -1;
for (let i = contentLine + 100; i < lines.length; i++) {
    if (lines[i] && lines[i].includes(', document.body)')) {
        portalLine = i;
        break;
    }
}

if (portalLine > -1) {
    console.log('Portal close at L' + (portalLine + 1));

    // Go back to find the closing </div> stack before it
    // Insert research tab content before the last 3 </div> closings
    // Count backwards: </div> (modal wrapper), ), document.body);
    let insertLine = portalLine;
    let dCount = 0;
    for (let i = portalLine - 1; i > contentLine; i--) {
        if (lines[i]?.trim() === '</div>') {
            dCount++;
            if (dCount === 2) {
                insertLine = i;
                break;
            }
        }
    }

    console.log('Insert research tab at L' + (insertLine + 1));

    const researchContent = [
        '                {!isIndependentMode && assessmentCenterTab === \'research\' && (',
        '                <div className="flex-1 overflow-y-auto p-4 animate-in fade-in duration-200">',
        '                    <div className="space-y-6">',
        '                        <div className="flex items-center justify-between">',
        '                            <div>',
        '                                <h3 className="text-lg font-bold text-slate-800">\\u{1F4CA} Research & Insights</h3>',
        '                                <p className="text-xs text-slate-400">Longitudinal analytics, growth tracking, and practice-to-outcome correlations</p>',
        '                            </div>',
        '                            {importedStudents.length > 0 && (',
        '                                <select value={researchStudent || \'\'} onChange={(e) => setResearchStudent(e.target.value || null)}',
        '                                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg" aria-label="Select student">',
        '                                    <option value="">All students (class view)</option>',
        '                                    {importedStudents.map(s => (',
        '                                        <option key={s.name || s} value={s.name || s}>{s.name || s}</option>',
        '                                    ))}',
        '                                </select>',
        '                            )}',
        '                        </div>',
        '                        {importedStudents.length === 0 ? (',
        '                            <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">',
        '                                <div className="text-4xl mb-3">\\u{1F4CA}</div>',
        '                                <h4 className="text-lg font-bold text-slate-700 mb-2">No Student Data Yet</h4>',
        '                                <p className="text-sm text-slate-500 mb-4">Import student assessment data to unlock research insights and growth tracking.</p>',
        '                                <button onClick={() => setAssessmentCenterTab(\'assessments\')}',
        '                                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700">',
        '                                    Go to Assessments \\u2192',
        '                                </button>',
        '                            </div>',
        '                        ) : (',
        '                            <div className="space-y-4">',
        '                                {researchStudent ? (',
        '                                    <div>',
        '                                        <div className="flex items-center gap-2 mb-4">',
        '                                            <button onClick={() => setResearchStudent(null)} className="text-sm text-indigo-600 hover:text-indigo-800 font-bold">\\u2190 Back to class</button>',
        '                                            <span className="text-sm text-slate-400">|</span>',
        '                                            <span className="text-sm font-bold text-slate-700">{researchStudent}</span>',
        '                                        </div>',
        '                                        {renderInsightsPanel(researchStudent)}',
        '                                    </div>',
        '                                ) : (',
        '                                    <div>',
        '                                        {typeof renderClassInsights === \'function\' && renderClassInsights()}',
        '                                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">',
        '                                            {importedStudents.map(s => {',
        '                                                const name = s.name || s;',
        '                                                return (',
        '                                                    <button key={name} onClick={() => setResearchStudent(name)}',
        '                                                        className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left group">',
        '                                                        <div className="font-bold text-sm text-slate-700 group-hover:text-indigo-700">{name}</div>',
        '                                                        <div className="text-xs text-slate-400 mt-1">View insights \\u2192</div>',
        '                                                    </button>',
        '                                                );',
        '                                            })}',
        '                                        </div>',
        '                                    </div>',
        '                                )}',
        '                                {typeof renderResearchDashboard === \'function\' && (',
        '                                    <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200">',
        '                                        <h4 className="text-sm font-bold text-slate-600 mb-3">\\u{1F4C8} Research Dashboard</h4>',
        '                                        {renderResearchDashboard()}',
        '                                    </div>',
        '                                )}',
        '                            </div>',
        '                        )}',
        '                    </div>',
        '                </div>',
        '                )}',
    ];

    lines.splice(insertLine, 0, ...researchContent);
    console.log('Step 4: Inserted research tab content (' + researchContent.length + ' lines)');
}

content = lines.join('\n');
fs.writeFileSync(f, content, 'utf8');
console.log('\nDone! Saved (' + content.length + ' bytes)');
