"""Phase 3 continuation: apply remaining changes (3-8) that failed"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
changes = 0

# --- CHANGE 3: Wire isLiveSession prop at instantiation ---
old_inst = """      <StudentEntryModal \r\n        isOpen={showStudentEntry && hasSelectedRole && !isTeacherMode}"""
new_inst = """      <StudentEntryModal \r\n        isOpen={showStudentEntry && hasSelectedRole && !isTeacherMode}\r\n        isLiveSession={!!activeSessionCode}"""

count = content.count(old_inst)
if count != 1:
    # Try without \r\n explicitly
    old_inst2 = "<StudentEntryModal \n        isOpen={showStudentEntry && hasSelectedRole && !isTeacherMode}"
    count2 = content.count(old_inst2)
    print(f"  Try2 count: {count2}")
    # Try line-by-line
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if '<StudentEntryModal' in l and i+1 < len(lines) and 'isOpen' in lines[i+1]:
            print(f"  Found at L{i+1}: {repr(l.rstrip())}")
            print(f"  Next:   L{i+2}: {repr(lines[i+1].rstrip())}")
            # Insert isLiveSession line after isOpen line
            lines.insert(i+2, "        isLiveSession={!!activeSessionCode}")
            content = '\n'.join(lines)
            changes += 1
            print(f"[OK] Wired isLiveSession prop via line insertion")
            break
    else:
        print("ERROR: Could not find StudentEntryModal instantiation")
        sys.exit(1)
else:
    content = content.replace(old_inst, new_inst)
    changes += 1
    print(f"[OK] Wired isLiveSession prop at instantiation")

# --- CHANGE 4: Add getGroupDifferentiationContext helper ---
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
  // Returns the effective TTS speed for the current student's group (or null for global default)
  const getGroupTtsSpeed = () => {
      if (!activeSessionCode || isTeacherMode) return null;
      const myGroupId = sessionData?.roster?.[user?.uid]?.groupId;
      if (!myGroupId) return null;
      return sessionData?.groups?.[myGroupId]?.ttsSpeed ?? null;
  };
  // Returns whether karaoke mode should be on for the current student's group
  const getGroupKaraokeMode = () => {
      if (!activeSessionCode || isTeacherMode) return null;
      const myGroupId = sessionData?.roster?.[user?.uid]?.groupId;
      if (!myGroupId) return null;
      return sessionData?.groups?.[myGroupId]?.karaokeMode ?? null;
  };"""

count = content.count(old_after_handler)
if count != 1:
    print(f"ERROR: handleSetGroupProfile match count: {count}")
    sys.exit(1)
content = content.replace(old_after_handler, new_after_handler)
changes += 1
print(f"[OK] Added differentiation helper functions")

# --- CHANGE 5: Wire differentiation context into handleGenerate ---
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

# --- CHANGE 6: Inject differentiationContext into glossary prompt (with translations) ---
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

# --- CHANGE 7: Inject into English-only glossary prompt ---
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

# --- CHANGE 8: Add TTS speed group override ---
old_playback = "      playbackRateRef.current = playbackRate;"
new_playback = """      const groupTtsOverride = getGroupTtsSpeed();
      playbackRateRef.current = groupTtsOverride ?? playbackRate;"""

count = content.count(old_playback)
if count != 1:
    print(f"ERROR: playbackRate ref match count: {count}")
    sys.exit(1)
content = content.replace(old_playback, new_playback)
changes += 1
print(f"[OK] Added group TTS speed override")

# Write
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nAll {changes} remaining Phase 3 changes applied successfully.")
