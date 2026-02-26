"""Phase 3 combined: 
1. Make wizard preferences conditional on active session
2. Add getGroupDifferentiationContext helper
3. Wire differentiation context into handleGenerate
4. Add TTS speed group override
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
changes = 0

# --- CHANGE 1: Make wizard preferences conditional on active session ---
# The StudentEntryModal needs activeSessionCode to know if the student is in a live session
old_entry_sig = "const StudentEntryModal = React.memo(({ isOpen, onClose, onConfirm }) => {"
new_entry_sig = "const StudentEntryModal = React.memo(({ isOpen, onClose, onConfirm, isLiveSession = false }) => {"

count = content.count(old_entry_sig)
if count != 1:
    print(f"ERROR: Entry sig match count: {count}")
    sys.exit(1)
content = content.replace(old_entry_sig, new_entry_sig)
changes += 1
print(f"[OK] Added isLiveSession prop to StudentEntryModal")

# Make the Next button go directly to confirm when NOT in live session
old_next = """            <button 
                onClick={() => setWizardStep(1)}
                disabled={!selectedAdj || !selectedAnimal}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                data-help-key="entry_next_step"
            >
                {t('wizard.next') || 'Next'} →
            </button>"""

new_next = """            {isLiveSession ? (
            <button 
                onClick={() => setWizardStep(1)}
                disabled={!selectedAdj || !selectedAnimal}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                data-help-key="entry_next_step"
            >
                {t('wizard.next') || 'Next'} →
            </button>
            ) : (<div className="flex flex-col gap-3">
            <button 
                aria-label="Generate"
                onClick={() => handleConfirm('new')}
                disabled={!selectedAdj || !selectedAnimal}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                data-help-key="entry_start_new"
            >
                <Sparkles size={18} className="text-yellow-400 fill-current" /> {t('entry.start')}
            </button>
            <button 
                aria-label="Upload"
                onClick={() => handleConfirm('load')}
                disabled={!selectedAdj || !selectedAnimal}
                className="w-full bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                data-help-key="entry_load_exist"
            >
                <Upload size={18} /> {t('entry.load')}
            </button>
            </div>)}"""

count = content.count(old_next)
if count != 1:
    print(f"ERROR: Next button match count: {count}")
    sys.exit(1)
content = content.replace(old_next, new_next)
changes += 1
print(f"[OK] Made preferences step conditional on isLiveSession")

# Wire isLiveSession prop at instantiation
old_inst = """      <StudentEntryModal
        isOpen={showStudentEntry && hasSelectedRole && !isTeacherMode}"""
new_inst = """      <StudentEntryModal
        isOpen={showStudentEntry && hasSelectedRole && !isTeacherMode}
        isLiveSession={!!activeSessionCode}"""

count = content.count(old_inst)
if count != 1:
    print(f"ERROR: Instantiation match count: {count}")
    sys.exit(1)
content = content.replace(old_inst, new_inst)
changes += 1
print(f"[OK] Wired isLiveSession prop at instantiation")

# --- CHANGE 2: Add getGroupDifferentiationContext helper ---
# Place it right after handleSetGroupProfile
old_after_handler = """  const handleSetGroupProfile = async (groupId, field, value) => {
      const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
      try {
        await updateDoc(sessionRef, {
            [`groups.${groupId}.${field}`]: value
        });
      } catch (error) {
          warnLog(`Error setting group ${field}:`, error);
      }
  };"""

new_after_handler = """  const handleSetGroupProfile = async (groupId, field, value) => {
      const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
      try {
        await updateDoc(sessionRef, {
            [`groups.${groupId}.${field}`]: value
        });
      } catch (error) {
          warnLog(`Error setting group ${field}:`, error);
      }
  };
  // --- GROUP DIFFERENTIATION CONTEXT ---
  // Returns a prompt context string based on the student's group learning profile.
  // Only active for students in a live session with group assignments.
  // All parameters are teacher-controlled via the group management system.
  const getGroupDifferentiationContext = () => {
      if (!activeSessionCode || isTeacherMode) return '';
      const myGroupId = sessionData?.roster?.[user?.uid]?.groupId;
      if (!myGroupId) return '';
      const group = sessionData?.groups?.[myGroupId];
      if (!group) return '';
      let ctx = '';
      if (group.readingLevel) ctx += `\\nTarget Reading Level: ${group.readingLevel}. Adjust vocabulary complexity and sentence length accordingly.`;
      if (group.simplifyLevel) ctx += `\\nSimplify content to ${group.simplifyLevel} level.`;
      if (group.dokLevel) ctx += `\\nTarget Depth of Knowledge: Level ${group.dokLevel}.`;
      if (group.complexityLevel) ctx += `\\nContent complexity: ${group.complexityLevel}.`;
      if (group.visualDensity === 'high') ctx += `\\nInclude extra visual descriptions, analogies, and examples to support comprehension.`;
      if (group.visualDensity === 'minimal') ctx += `\\nKeep content concise with minimal elaboration.`;
      return ctx ? '\\n--- STUDENT DIFFERENTIATION PARAMETERS (set by teacher) ---' + ctx + '\\n--- END DIFFERENTIATION ---\\n' : '';
  };
  // Returns the effective TTS speed for the current student's group (or global default)
  const getGroupTtsSpeed = () => {
      if (!activeSessionCode || isTeacherMode) return null;
      const myGroupId = sessionData?.roster?.[user?.uid]?.groupId;
      if (!myGroupId) return null;
      const group = sessionData?.groups?.[myGroupId];
      return group?.ttsSpeed ?? null;
  };
  // Returns whether karaoke mode should be on for the current student's group
  const getGroupKaraokeMode = () => {
      if (!activeSessionCode || isTeacherMode) return null;
      const myGroupId = sessionData?.roster?.[user?.uid]?.groupId;
      if (!myGroupId) return null;
      const group = sessionData?.groups?.[myGroupId];
      return group?.karaokeMode ?? null;
  };"""

count = content.count(old_after_handler)
if count != 1:
    print(f"ERROR: handleSetGroupProfile match count: {count}")
    sys.exit(1)
content = content.replace(old_after_handler, new_after_handler)
changes += 1
print(f"[OK] Added getGroupDifferentiationContext + getGroupTtsSpeed + getGroupKaraokeMode helpers")

# --- CHANGE 3: Wire differentiation context into handleGenerate ---
# Add it right after the effectiveLanguage line
old_effect_lang = "    const effectiveLanguage = langOverride || leveledTextLanguage;"
new_effect_lang = """    const effectiveLanguage = langOverride || leveledTextLanguage;
    const differentiationContext = getGroupDifferentiationContext();"""

count = content.count(old_effect_lang)
if count != 1:
    print(f"ERROR: effectiveLanguage match count: {count}")
    sys.exit(1)
content = content.replace(old_effect_lang, new_effect_lang)
changes += 1
print(f"[OK] Added differentiationContext to handleGenerate")

# --- CHANGE 4: Inject differentiationContext into glossary prompt ---
old_gloss = """              Return ONLY a JSON array: [{ "term": "Name", "def": "English Definition", "tier": "Academic" | "Domain-Specific", "translations": { "Lang": "TranslatedTerm: TranslatedDefinition" } }]
              Text: "${textToProcess}"
            `;"""
new_gloss = """              Return ONLY a JSON array: [{ "term": "Name", "def": "English Definition", "tier": "Academic" | "Domain-Specific", "translations": { "Lang": "TranslatedTerm: TranslatedDefinition" } }]
              ${differentiationContext}
              Text: "${textToProcess}"
            `;"""

count = content.count(old_gloss)
if count != 1:
    print(f"ERROR: Glossary prompt match count: {count}")
    sys.exit(1)
content = content.replace(old_gloss, new_gloss)
changes += 1
print(f"[OK] Injected differentiationContext into glossary prompt")

# Also inject into the English-only glossary prompt
old_gloss2 = """              Return ONLY a JSON array: [{ "term": "Name", "def": "English Definition", "tier": "Academic" | "Domain-Specific" }]
              Text: "${textToProcess}"
            `;"""
new_gloss2 = """              Return ONLY a JSON array: [{ "term": "Name", "def": "English Definition", "tier": "Academic" | "Domain-Specific" }]
              ${differentiationContext}
              Text: "${textToProcess}"
            `;"""

count = content.count(old_gloss2)
if count != 1:
    print(f"ERROR: Glossary EN prompt match count: {count}")
    sys.exit(1)
content = content.replace(old_gloss2, new_gloss2)
changes += 1
print(f"[OK] Injected differentiationContext into English-only glossary prompt")

# --- CHANGE 5: Inject into TTS playback rate ---
# The main reading TTS uses playbackRateRef.current. Override with group speed.
old_playback = "      playbackRateRef.current = playbackRate;"
new_playback = """      const groupTtsOverride = getGroupTtsSpeed();
      playbackRateRef.current = groupTtsOverride ?? playbackRate;"""

count = content.count(old_playback)
if count != 1:
    print(f"ERROR: playbackRate ref match count: {count}")
    sys.exit(1)
content = content.replace(old_playback, new_playback)
changes += 1
print(f"[OK] Added group TTS speed override to playbackRateRef")

# Write
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nAll {changes} Phase 3 changes applied successfully.")
