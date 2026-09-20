            const hubNavigation = h('nav', { 'aria-label': 'Behavior Lens workspace', className: 'flex flex-wrap gap-2 mb-5' },
                [['today', 'Today'], ['tools', 'All tools']].map(([id, label]) => h('button', {
                    key: id, type: 'button', 'aria-current': hubView === id ? 'page' : undefined,
                    onClick: () => setHubView(id), className: 'min-h-11 rounded-lg px-4 py-2 text-sm font-bold ' + (hubView === id ? 'bg-indigo-100 text-indigo-900' : 'bg-white border border-slate-300 text-slate-700')
                }, label)));
            if (hubView === 'today') {
                const definitionDraft = toolState.operationalDefinitionDraft;
                const hasDefinitionDraft = !!(definitionDraft && (definitionDraft.label || definitionDraft.definition || definitionDraft.rawDesc));
                const recent = abcEntries.slice().sort((a, b) => String(b.occurredAt || b.timestamp || '').localeCompare(String(a.occurredAt || a.timestamp || ''))).slice(0, 3);
                const currentNames = Array.from(new Set([selectedStudent, ...studentOptions, ...studentRoster.map(item => item.name)].filter(Boolean)));
                const actionClass = 'min-h-11 rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50';
                const cardClass = 'rounded-xl border border-slate-300 bg-white p-4 sm:p-5';
                return h('div', { className: 'max-w-4xl mx-auto space-y-5', 'data-bl-today': true },
                    hubNavigation,
                    selectedStudent ? h('header', { className: 'flex flex-wrap items-end justify-between gap-3' },
                        h('div', null, h('p', { className: 'text-sm text-slate-600' }, isParentMode ? 'Family workspace' : 'Student workspace'), h('h2', { className: 'text-2xl font-bold text-slate-900' }, selectedStudent)),
                        h('div', { className: 'flex flex-wrap gap-2 items-end' },
                            currentNames.length > 1 && h('div', null,
                                h('label', { htmlFor: 'bl-today-student', className: 'block text-sm text-slate-700 mb-1' }, 'Switch student'),
                                h('select', { id: 'bl-today-student', 'aria-label': 'Choose a student', value: selectedStudent, onChange: event => switchToStudent(event.target.value), className: 'min-h-11 max-w-full rounded-lg border border-slate-400 bg-white px-3 text-sm' }, currentNames.map(name => h('option', { key: name, value: name }, name)))),
                            h('button', { type: 'button', 'aria-expanded': showStudentSetup, 'aria-controls': 'bl-today-setup', onClick: () => setShowStudentSetup(value => !value), className: actionClass }, 'Student and role settings'))
                    ) : h('h2', { className: 'text-xl font-bold text-slate-900' }, 'Choose a student to start'),
                    (!selectedStudent || showStudentSetup) && h('div', { id: 'bl-today-setup' }, studentSetup),
                    isPracticeMode && h('div', { className: 'rounded-lg border border-amber-400 bg-amber-50 p-3 flex flex-wrap items-center justify-between gap-2' },
                        h('p', { className: 'text-sm text-amber-900' }, 'Practice workspace: ' + practiceScenarioName + '. All observations are simulated.'),
                        h('button', { type: 'button', onClick: handleClearPractice, className: actionClass }, 'Leave practice')),
                    selectedStudent && h('section', { className: cardClass, 'aria-labelledby': 'bl-today-record' },
                        h('h3', { id: 'bl-today-record', className: 'text-lg font-bold text-slate-900' }, isParentMode ? 'Share what happened today' : 'Record what happened today'),
                        h('p', { className: 'mt-2 text-sm text-slate-600' }, 'Capture what you saw and heard. You can review patterns and possible explanations later.'),
                        h('div', { className: 'mt-4 flex flex-wrap gap-2' },
                            h('button', { type: 'button', onClick: () => launchHubTool(isParentMode ? 'homelog' : 'abc'), className: 'min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-800' }, isParentMode ? 'Add home observation' : 'Add observation'),
                            h('button', { type: 'button', onClick: () => launchHubTool(isParentMode ? 'choice' : 'observation'), className: actionClass }, isParentMode ? 'Offer a coping choice' : 'Start or resume timed observation')),
                        !isParentMode && h('p', { className: 'mt-3 text-sm text-slate-600' }, 'Timed recording also lets you resume a saved recording draft.')
                    ),
                    selectedStudent && !isParentMode && h('section', { className: cardClass, 'aria-labelledby': 'bl-today-targets' },
                        h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
                            h('div', { className: 'min-w-0 flex-1' }, h('h3', { id: 'bl-today-targets', className: 'text-base font-bold text-slate-900' }, hasDefinitionDraft ? 'Continue your target definition' : 'What are you observing?'),
                                h('p', { className: 'mt-1 text-sm text-slate-600 break-words' }, hasDefinitionDraft ? (definitionDraft.label || 'Your unfinished definition is ready to continue.') : targetBehaviors.length ? targetBehaviors.filter(item => item.active !== false).slice(0, 3).map(item => item.label).join(' · ') || 'No active targets. Choose a target when you are ready.' : 'Define a target once, then use it in observations and review.')),
                            h('button', { type: 'button', onClick: () => launchHubTool('opdef'), className: actionClass }, hasDefinitionDraft ? 'Continue definition' : 'Define a target'))
                    ),
                    selectedStudent && h('section', { className: cardClass, 'aria-labelledby': 'bl-today-review' },
                        h('div', { className: 'flex flex-wrap items-center justify-between gap-3' },
                            h('h3', { id: 'bl-today-review', className: 'text-base font-bold text-slate-900' }, 'Review and follow through'),
                            h('button', { type: 'button', onClick: () => launchHubTool('overview'), className: actionClass }, 'Review observations')),
                        h('p', { className: 'mt-2 text-sm text-slate-600' }, isParentMode ? 'Bring your observations and preferences to the next team conversation.' : abcEntries.length || observationSessions.length ? abcEntries.length + ' context observations · ' + observationSessions.length + ' observation sessions. Review their settings and measurement details before drawing conclusions.' : 'Your observations will appear here. A context note is a useful place to start.'),
                        !isParentMode && recent.map(entry => h('div', { key: entry.id, className: 'mt-3 border-t border-slate-200 pt-3' },
                            h('p', { className: 'text-sm font-bold text-slate-800 break-words' }, entry.behavior || 'Observation'),
                            h('p', { className: 'text-sm text-slate-600' }, fmtDate(entry.occurredAt || entry.timestamp)))),
                        h('div', { className: 'mt-4 flex flex-wrap gap-2' },
                            h('button', { type: 'button', onClick: () => launchHubTool(isParentMode ? 'familyvoice' : 'intervention'), className: actionClass }, isParentMode ? 'Share family perspectives' : 'Work on a support plan'),
                            !isParentMode && h('button', { type: 'button', onClick: () => launchHubTool('progressreport'), className: actionClass }, 'Prepare a progress review'))
                    ),
                    h('details', { className: 'rounded-xl border border-slate-300 bg-white p-4' },
                        h('summary', { className: 'min-h-11 py-2 text-sm font-bold text-slate-800' }, 'Workspace files and settings'),
                        h('p', { role: 'status', className: 'text-sm text-slate-600 my-2' }, localPersistenceError ? 'Browser save needs attention. Download a backup to keep a file copy.' : 'Changes save automatically in this browser. Download a backup to keep a file copy.'),
                        h('div', { className: 'flex flex-wrap gap-2' },
                            h('button', { type: 'button', onClick: handleSaveWorkspace, className: actionClass }, 'Download backup'),
                            h('button', { type: 'button', onClick: () => fileInputRef.current?.click(), className: actionClass }, 'Load workspace from file')),
                        h('input', { ref: fileInputRef, type: 'file', accept: '.json', onChange: handleLoadWorkspace, 'aria-label': 'Load BehaviorLens workspace JSON file', className: 'hidden' })),
                    h('p', { className: 'text-sm text-slate-600' }, 'Find specialist tools, learning resources, and practice scenarios in All tools.')
                );
            }
