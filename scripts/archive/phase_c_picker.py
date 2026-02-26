"""
Phase C Enhancement: Resource Type Picker for Batch Generation
===============================================================
1. Replace handleBatchGenerateForRoster to accept types array
2. Add batch config dialog UI in RosterKeyPanel  
3. Replace single-click button with dialog opener
4. Add localization keys
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================================================================
# CHANGE 1: Replace handleBatchGenerateForRoster to iterate types × groups
# ============================================================================
# Find the handler start and end
handler_start = None
handler_end = None
for i, l in enumerate(lines):
    if 'handleBatchGenerateForRoster' in l and 'const' in l and 'async' in l:
        handler_start = i
        break

if handler_start is not None:
    # Find the matching closing };
    depth = 0
    for i in range(handler_start, len(lines)):
        depth += lines[i].count('{') - lines[i].count('}')
        if depth <= 0 and '};' in lines[i]:
            handler_end = i
            break

if handler_start is not None and handler_end is not None:
    NEW_HANDLER = '''  // ---- CLASS DIFFERENTIATION: Batch generate for all roster key groups ----
  const handleBatchGenerateForRoster = async (resourceTypes = ['simplified']) => {
      if (!rosterKey?.groups || Object.keys(rosterKey.groups).length === 0) {
          addToast(t('roster.no_groups_to_generate') || 'Add groups to your roster key first', 'warning');
          return;
      }
      const textToProcess = (() => {
          const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
          if (latestAnalysis?.data?.originalText) {
              const raw = latestAnalysis.data.originalText;
              const sep = "### Accuracy Check References";
              return raw.includes(sep) ? raw.split(sep)[0].trim() : raw;
          }
          return inputText;
      })();
      if (!textToProcess || !textToProcess.trim()) {
          addToast(t('process.enter_text') || 'Please enter or paste text first', 'warning');
          return;
      }
      const groupEntries = Object.entries(rosterKey.groups);
      const totalSteps = groupEntries.length * resourceTypes.length;
      setIsProcessing(true);
      let successCount = 0;
      let currentStep = 0;
      try {
          for (let i = 0; i < groupEntries.length; i++) {
              const [groupId, group] = groupEntries[i];
              const profile = group.profile || {};
              // Save current settings
              const saved = {
                  grade: gradeLevel, lang: leveledTextLanguage,
                  interests: studentInterests, dok: dokLevel,
                  custom: leveledTextCustomInstructions
              };
              // Temporarily apply group profile
              if (profile.gradeLevel) setGradeLevel(profile.gradeLevel);
              if (profile.leveledTextLanguage) setLeveledTextLanguage(profile.leveledTextLanguage);
              if (profile.studentInterests) {
                  const interests = Array.isArray(profile.studentInterests) ? profile.studentInterests : profile.studentInterests.split(',').map(s => s.trim()).filter(Boolean);
                  setStudentInterests(interests);
              }
              if (profile.dokLevel) setDokLevel(profile.dokLevel);
              if (profile.leveledTextCustomInstructions) setLeveledTextCustomInstructions(profile.leveledTextCustomInstructions);
              await new Promise(r => setTimeout(r, 100));
              // Generate each resource type for this group
              for (let j = 0; j < resourceTypes.length; j++) {
                  const type = resourceTypes[j];
                  currentStep++;
                  const isLast = currentStep === totalSteps;
                  const typeLabel = type === 'simplified' ? 'Adapted Text' : type === 'glossary' ? 'Glossary' : type === 'quiz' ? 'Quiz' : type === 'sentence-frames' ? 'Sentence Frames' : type;
                  setGenerationStep(`${typeLabel} for "${group.name}" (${currentStep}/${totalSteps})`);
                  await handleGenerate(type, profile.leveledTextLanguage || null, !isLast, textToProcess, {
                      grade: profile.gradeLevel || gradeLevel,
                      rosterGroupId: groupId,
                      rosterGroupName: group.name,
                      rosterGroupColor: group.color || '#4F46E5'
                  }, false);
                  successCount++;
                  if (!isLast) await new Promise(r => setTimeout(r, 1000));
              }
              // Restore settings
              setGradeLevel(saved.grade);
              setLeveledTextLanguage(saved.lang);
              setStudentInterests(saved.interests);
              setDokLevel(saved.dok);
              setLeveledTextCustomInstructions(saved.custom);
          }
          addToast(`Generated ${successCount} resources for ${groupEntries.length} groups!`, 'success');
      } catch (e) {
          warnLog("Roster batch generation error:", e);
          addToast(t('roster.batch_failed') || 'Batch generation failed', 'error');
      } finally {
          setIsProcessing(false);
          setGenerationStep('');
      }
  };
'''
    # Replace handler lines
    lines[handler_start:handler_end + 1] = [NEW_HANDLER]
    changes += 1
    print(f"[OK] L{handler_start+1}-{handler_end+1}: Replaced handleBatchGenerateForRoster with multi-type version")

# ============================================================================
# CHANGE 2: Add batch config dialog state + UI inside RosterKeyPanel
# We need to:
# a) Add state: showBatchConfig, batchTypes
# b) Replace the batch button with dialog opener  
# c) Add the batch config dialog JSX
# ============================================================================

# Re-read lines since we modified them
lines = ''.join(lines).split('\n')
lines = [l + '\n' for l in lines]

# a) Add state variables after the existing useState calls in RosterKeyPanel
for i, l in enumerate(lines):
    if 'editingField, setEditingField' in l and 'useState' in l:
        batch_state = "  const [showBatchConfig, setShowBatchConfig] = useState(false);\n"
        batch_state += "  const [batchTypes, setBatchTypes] = useState({ simplified: true, glossary: false, quiz: false, 'sentence-frames': false });\n"
        lines.insert(i + 1, batch_state)
        changes += 1
        print(f"[OK] L{i+2}: Added showBatchConfig and batchTypes state")
        break

# Re-join and re-split since we inserted lines
lines = ''.join(lines).split('\n')
lines = [l + '\n' for l in lines]

# b) Find the existing batch button (Layers icon) and replace it with dialog opener
for i, l in enumerate(lines):
    if 'onBatchGenerate' in l and 'simplified' in l and 'Layers' in l and i < 26000:
        # Find the full button (may span 2-3 lines)
        # Locate the opening <button and closing </button>
        btn_start = i
        btn_end = i
        for j in range(i, min(i + 5, len(lines))):
            if '</button>' in lines[j]:
                btn_end = j
                break
        
        NEW_BUTTON = '''          <button onClick={() => setShowBatchConfig(true)} disabled={!rosterKey || Object.keys(rosterKey?.groups || {}).length === 0} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5 disabled:opacity-40 border border-amber-200">
            <Layers size={14} /> {t('roster.batch_generate') || 'Differentiate by Group'}
          </button>
'''
        lines[btn_start:btn_end + 1] = [NEW_BUTTON]
        changes += 1
        print(f"[OK] L{btn_start+1}-{btn_end+1}: Replaced batch button with dialog opener")
        break

# Re-join and re-split
lines = ''.join(lines).split('\n')
lines = [l + '\n' for l in lines]

# c) Add the batch config dialog JSX
# Insert right before the closing </div></div> of the RosterKeyPanel
# Find the closing of the RosterKeyPanel component
# Strategy: find the last occurrence of "if (!isOpen) return null;" and then the end of the return
# Better: find the closing </div> of the panel by looking for the pattern near the end of the component

# Find the RosterKeyPanel closing: look for "}); // RosterKeyPanel" or the memo closing
# Actually, let's insert the dialog right before the last closing div of the modal
# Let's find the sync button as an anchor point and insert the dialog after the main content area

BATCH_DIALOG = '''          {/* ── Batch Config Dialog ── */}
          {showBatchConfig && (
            <div className="fixed inset-0 z-[270] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-amber-200 animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Layers size={18} className="text-amber-500" /> {t('roster.batch_config_title') || 'Differentiate by Group'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{t('roster.batch_config_subtitle') || 'Choose which resources to generate for each group'}</p>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('roster.resource_types') || 'Resource Types'}</p>
                  {[
                    { key: 'simplified', label: t('roster.type_adapted_text') || 'Adapted Text', desc: t('roster.type_adapted_desc') || 'Leveled reading at each group\\'s grade & language', icon: '📝' },
                    { key: 'glossary', label: t('roster.type_glossary') || 'Glossary', desc: t('roster.type_glossary_desc') || 'Key terms with definitions', icon: '📖' },
                    { key: 'quiz', label: t('roster.type_quiz') || 'Quiz', desc: t('roster.type_quiz_desc') || 'Comprehension check questions', icon: '✏️' },
                    { key: 'sentence-frames', label: t('roster.type_frames') || 'Sentence Frames', desc: t('roster.type_frames_desc') || 'Writing scaffolds for discussion', icon: '🔲' }
                  ].map(rt => (
                    <label key={rt.key} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${batchTypes[rt.key] ? 'border-amber-300 bg-amber-50' : 'border-slate-100 hover:border-slate-200'}`}>
                      <input type="checkbox" checked={!!batchTypes[rt.key]} onChange={e => setBatchTypes(prev => ({ ...prev, [rt.key]: e.target.checked }))} className="mt-0.5 rounded accent-amber-500" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-slate-700">{rt.icon} {rt.label}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{rt.desc}</p>
                      </div>
                    </label>
                  ))}
                  <button onClick={() => {
                    const allSelected = Object.values(batchTypes).every(v => v);
                    setBatchTypes({ simplified: !allSelected, glossary: !allSelected, quiz: !allSelected, 'sentence-frames': !allSelected });
                  }} className="w-full text-center text-xs font-bold text-amber-600 hover:text-amber-700 py-1.5 hover:bg-amber-50 rounded-lg transition-colors">
                    {Object.values(batchTypes).every(v => v) ? (t('roster.deselect_all') || '↩ Deselect All') : (t('roster.full_pack') || '📦 Full Resource Pack — Select All')}
                  </button>
                  <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2">
                    <span className="font-bold">{t('roster.estimate') || 'Estimate'}:</span>
                    {Object.values(batchTypes).filter(v => v).length * Object.keys(rosterKey?.groups || {}).length} {t('roster.api_calls') || 'API calls'} ·
                    ~{Object.values(batchTypes).filter(v => v).length * Object.keys(rosterKey?.groups || {}).length * 2}s
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100">
                  <button onClick={() => setShowBatchConfig(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                    {t('common.cancel') || 'Cancel'}
                  </button>
                  <button onClick={() => {
                    const selectedTypes = Object.entries(batchTypes).filter(([_, v]) => v).map(([k]) => k);
                    if (selectedTypes.length === 0) return;
                    setShowBatchConfig(false);
                    onClose();
                    onBatchGenerate?.(selectedTypes);
                  }} disabled={!Object.values(batchTypes).some(v => v)} className="px-4 py-2 bg-amber-500 text-white text-sm font-black rounded-xl hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-40 flex items-center gap-2">
                    <Sparkles size={14} /> {t('roster.start_batch') || 'Generate'} ({Object.values(batchTypes).filter(v => v).length * Object.keys(rosterKey?.groups || {}).length})
                  </button>
                </div>
              </div>
            </div>
          )}
'''

# Insert the batch dialog right before the closing of the main panel overlay div
# Find the div closing pattern near the RosterKeyPanel end
# Look for the sync button and insert after its section
for i, l in enumerate(lines):
    if 'onSyncToSession' in l and 'RefreshCw' in l and i > 25500 and i < 26200:
        # Find the </button> that closes the sync button
        for j in range(i, min(i + 5, len(lines))):
            if '</button>' in lines[j]:
                # Insert after this section, before the panel closing divs
                # Actually find the main content closing - look for </div> pattern
                for k in range(j + 1, min(j + 20, len(lines))):
                    if lines[k].strip() == '</div>' or lines[k].strip() == '</div>\n':
                        # Check if next line is also </div> (panel closing)
                        if k + 1 < len(lines) and '</div>' in lines[k+1]:
                            lines.insert(k, BATCH_DIALOG)
                            changes += 1
                            print(f"[OK] L{k+1}: Inserted batch config dialog in RosterKeyPanel")
                            break
                break
        break

# Re-join and re-split
lines = ''.join(lines).split('\n')
lines = [l + '\n' for l in lines]

# ============================================================================
# CHANGE 3: Update the render prop to pass types array
# The prop call: onBatchGenerate={handleBatchGenerateForRoster}
# This already works since the handler signature now takes (types = ['simplified'])
# No change needed — it's already forwarded
# ============================================================================

# ============================================================================
# CHANGE 4: Add localization keys for batch config
# ============================================================================
for i, l in enumerate(lines):
    if "batch_failed:" in l and "'Batch generation failed'" in l:
        NEW_KEYS = """      batch_config_title: 'Differentiate by Group',
      batch_config_subtitle: 'Choose which resources to generate for each group',
      resource_types: 'Resource Types',
      type_adapted_text: 'Adapted Text',
      type_adapted_desc: "Leveled reading at each group's grade & language",
      type_glossary: 'Glossary',
      type_glossary_desc: 'Key terms with definitions',
      type_quiz: 'Quiz',
      type_quiz_desc: 'Comprehension check questions',
      type_frames: 'Sentence Frames',
      type_frames_desc: 'Writing scaffolds for discussion',
      full_pack: '📦 Full Resource Pack — Select All',
      deselect_all: '↩ Deselect All',
      estimate: 'Estimate',
      api_calls: 'API calls',
      start_batch: 'Generate',
"""
        lines.insert(i + 1, NEW_KEYS)
        changes += 1
        print(f"[OK] L{i+2}: Added batch config localization keys")
        break

open(filepath, 'w', encoding='utf-8').write(''.join(lines))
print(f"\n✅ Total {changes} changes applied.")
