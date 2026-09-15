from pathlib import Path
p=Path('behavior_lens_module.js');s=p.read_text(encoding='utf-8-sig')
def rep(a,b,count=1):
 global s
 assert s.count(a)>=count,a[:100]
 s=s.replace(a,b,count)
rep('    const BehaviorLensApp =', '''    const behaviorLensToolPrerequisite = (toolId, selectedStudent, entryCount) => {
        const independentTools = ['wizard', 'record', 'export', 'abaguide', 'glossary', 'fbaworkflow', 'sandbox', 'pdpath', 'abaquiz', 'functionquiz', 'casestudy', 'skilltracker', 'practicum', 'mipractice', 'deescalate', 'abagraph', 'scdmanager', 'effectsize'];
        if (!selectedStudent && !independentTools.includes(toolId)) return 'Choose a student before opening this tool.';
        if (toolId === 'analysis' && entryCount < 3) return 'Add at least 3 ABC observations before running AI analysis.';
        return '';
    };
    const BehaviorLensApp =''')
rep("        const openPanel = (panelId) => {\n            recordWorkflowDiagnostic", """        const openPanel = (panelId) => {
            const prerequisite = behaviorLensToolPrerequisite(panelId, selectedStudent, abcEntries.length);
            if (prerequisite) {
                setActivePanel('hub');
                if (addToast) addToast(prerequisite, 'info');
                requestAnimationFrame(() => behaviorLensDialogRef.current?.querySelector('[aria-label="Choose a student"], [aria-label="Pick codename adjective"]')?.focus());
                return;
            }
            recordWorkflowDiagnostic""")
rep("                    const handleToolOpen = (toolId) => {\n", """                    const handleToolOpen = (toolId) => {
                        const prerequisite = behaviorLensToolPrerequisite(toolId, selectedStudent, abcEntries.length);
                        if (prerequisite) {
                            if (addToast) addToast(prerequisite, 'info');
                            behaviorLensDialogRef.current?.querySelector('[aria-label="Choose a student"], [aria-label="Pick codename adjective"]')?.focus();
                            return;
                        }
""")
rep("                        const canOpenWithoutStudent = ['analysis', 'export', 'record', 'abaguide', 'glossary', 'fbaworkflow', 'sandbox'].includes(tool.id);\n                        const isDisabled = Boolean(tool.disabled || (!selectedStudent && !canOpenWithoutStudent));", "                        const prerequisite = behaviorLensToolPrerequisite(tool.id, selectedStudent, abcEntries.length);\n                        const isDisabled = Boolean(tool.disabled || prerequisite);")
rep("}, isDisabled ? 'Unavailable until required data is selected' : `Open ${tool.title}`)", "}, isDisabled ? (prerequisite || 'Add observations to use this tool') : `Open ${tool.title}`)")
rep("                    return h('div', { className: 'space-y-4' },\n                        // ── First-Visit Welcome Banner", """                    return h('div', { className: 'space-y-4' },
                        h('nav', { 'aria-label': 'BehaviorLens getting started', className: 'rounded-xl border border-indigo-200 bg-white p-4' },
                            h('h3', { className: 'text-sm font-black text-indigo-900 mb-2' }, isParentMode ? 'Support your child, one step at a time' : 'Start with one observation'),
                            h('p', { className: 'text-xs text-slate-600 mb-3' }, selectedStudent ? 'Working with ' + selectedStudent + '. Choose the next step below.' : 'Choose a student above, then capture and review an observation.'),
                            h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2' },
                                [
                                    { id: isParentMode ? 'homelog' : 'abc', label: isParentMode ? '1. Add a home observation' : '1. Capture an ABC observation' },
                                    { id: isParentMode ? 'choice' : 'opdef', label: isParentMode ? '2. Offer a coping choice' : '2. Define the behavior clearly' },
                                    { id: 'overview', label: '3. Review the observations' }
                                ].map(step => h('button', { key: step.id, type: 'button', onClick: () => handleToolOpen(step.id), className: 'min-h-11 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-start text-xs font-bold text-indigo-900' }, step.label))
                            )
                        ),
                        // ── First-Visit Welcome Banner""")
rep("onClick: () => { dismissWelcome(); handleToolOpen('homelog'); },", "onClick: () => { setIsParentMode(true); dismissWelcome(); handleToolOpen('homelog'); },")
rep("                        // ── Quick Launch Bar (BCBA-priority tools) ──\n                        h('div',", "                        // ── Quick Launch Bar (BCBA-priority tools) ──\n                        !isParentMode && h('div',")
rep("selectedStudent && h(NextStepRecommender,", "selectedStudent && !isParentMode && h(NextStepRecommender,")
rep("recs.length > 0 && h('div',", "!isParentMode && recs.length > 0 && h('div',")
rep("const parentTools = ['overview', 'token', 'traffic', 'choice', 'homelog', 'abaguide', 'homenote', 'pocket', 'snapshot', 'selfcheck'];", "const parentTools = ['overview', 'token', 'traffic', 'choice', 'homelog', 'abaguide', 'homenote', 'pocket', 'snapshot', 'selfcheck', 'familyvoice', 'commlog', 'selfregulation'];")
rep("tt('behavior_lens.hub.save_workspace', 'Save Workspace')", "tt('behavior_lens.hub.download_backup', 'Download backup')",2)
rep("`Last saved: ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`", "`Last backup: ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`",2)
rep("                        // ── Favorites Bar ──", """                        h('p', { role: 'status', className: 'text-xs text-slate-600' }, localPersistenceError
                            ? 'Browser save needs attention. Download a backup to keep a file copy.'
                            : 'Changes save automatically in this browser. Download a backup to keep a file copy.'),
                        // ── Favorites Bar ──""")
# Name existing progress indicators without changing their calculations.
for name,end,label in [('NextStepRecommender','BehaviorHeatmap','Observation workflow progress'),('SkillTracker','GuidedWorkflowHub','Progress to next skill level'),('CulturalContextReflection','StrengthReframe','Cultural reflection questions completed'),('ReinforcementInventory','AntecedentModPlanner','Reinforcer items rated')]:
 a=s.index('    const '+name+' =');b=s.index('    const '+end+' =',a)
 chunk=s[a:b].replace("role: 'progressbar',", "role: 'progressbar', 'aria-label': '"+label+"',")
 s=s[:a]+chunk+s[b:]
p.write_text(s,encoding='utf-8',newline='\n')
print('Applied consistent hub prerequisites, task entry, Family Mode, and backup status copy.')
