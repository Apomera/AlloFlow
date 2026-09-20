const fs=require('fs');
let s=fs.readFileSync('behavior_lens_module.js','utf8').replace(/\r\n/g,'\n');
function replace(a,b){if(!s.includes(a))throw new Error('Missing anchor: '+a.slice(0,140));s=s.replace(a,b);}
replace('    const OverviewPanel = (',fs.readFileSync(__dirname+'/preview-components.tmp','utf8')+'    const OverviewPanel = (');
replace("        const [reviewFilters, setReviewFilters] = useDurableToolState('observationReviewFilters', { dateRange: 14, targetId: '' });", "        const [presentation, setPresentation] = useDurableToolState('reviewPresentation', { mode: 'dashboard', measurement: 'notes', monochrome: false });\n        const [reviewFilters, setReviewFilters] = useDurableToolState('observationReviewFilters', { dateRange: 14, targetId: '' });");
replace("onClick: onReport, className: actionClass }, 'Prepare report from this view'", "onClick: () => setPresentation(previous => ({ ...previous, mode: 'document' })), className: actionClass }, 'Prepare report from this view'");
replace("            // Stat cards row\n", "            h(SharedBehaviorReview, { entries: stats.filtered, sessions: stats.filteredSessions, targets: reviewTargets, targetId, studentName, dateRange, presentation, setPresentation, onAdvanced: onReport }),\n            presentation.mode !== 'document' && h(React.Fragment, null,\n            // Stat cards row\n");
replace("            )\n        );\n    };\n\n    // ─── FrequencyCounter", "            ))\n        );\n    };\n\n    // ─── FrequencyCounter");
replace("                    selectedStudent && h('section', { className: cardClass, 'aria-labelledby': 'bl-today-record' },", `                    selectedStudent && !isParentMode && !isPracticeMode && h(BehaviorGettingStarted, {
                        key: activeStudentId || selectedStudent, hasRecords: abcEntries.length + observationSessions.length > 0,
                        onRecord: () => { setToolState(previous => ({ ...previous, reviewPresentation: { ...previous.reviewPresentation, mode: 'dashboard', measurement: 'notes' }, observationReviewFilters: { dateRange: 14, targetId: '' } })); startAbcObservation('', 'overview'); },
                        onImport: () => launchHubTool('batchimport'),
                        onReview: () => launchHubTool('overview'),
                        onExample: () => {
                            const exampleEntries = [0, 1, 2, 3, 4, 5].map((index) => { const date = new Date(); date.setDate(date.getDate() - (5 - index)); date.setHours(9, 0, 0, 0); return { id: 'example-note-' + index, timestamp: date.toISOString(), behavior: 'Requests help', antecedent: 'Independent work begins', consequence: 'Teacher offers help', observer: 'Example observer', notes: 'Simulated example for learning the review workflow.' }; });
                            handleLoadScenario({ name: 'First observation and review', entries: exampleEntries, observations: exampleEntries.map((entry, index) => ({ id: 'example-session-' + index, timestamp: entry.timestamp, method: 'frequency', behavior: 'Requests help', duration: 600, phase: index < 3 ? 'Baseline' : 'Visual prompt', observer: 'Example observer', data: { count: [1, 2, 1, 3, 4, 3][index] } })) });
                        }
                    }),
                    selectedStudent && h('section', { className: cardClass, 'aria-labelledby': 'bl-today-record' },`);
replace("onClick: () => launchHubTool('progressreport'), className: actionClass }, 'Prepare a progress review'", "onClick: () => { setToolState(previous => ({ ...previous, reviewPresentation: { ...previous.reviewPresentation, mode: 'document' } })); launchHubTool('overview'); }, className: actionClass }, 'Prepare a progress review'");
replace('Stacked panels with staggered intervention — JABA-compliant format','Stacked panels with staggered intervention and phase change lines');
for(const file of ['behavior_lens_module.js','desktop/web-app/public/behavior_lens_module.js'])for(let i=0;;i++){try{fs.writeFileSync(file,s);break;}catch(e){if(i===9)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1000);}}
const file='tests/behavior_lens_connected_workflows.test.js';let test=fs.readFileSync(file,'utf8');test=test.replace("await click('Prepare report from this view'); };", "await click('Prepare report from this view'); await click('Advanced report options'); };");fs.writeFileSync(file,test);
