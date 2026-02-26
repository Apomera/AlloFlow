"""
PHASE C: Class Differentiation Engine
======================================
1. Add handleBatchGenerateForRoster handler 
2. Add "Generate for All Groups" button in RosterKeyPanel
3. Add localization keys
4. Tag generated content with rosterGroupId
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================================================================
# INSERTION 1: handleBatchGenerateForRoster handler
# Insert right after handleApplyRosterGroup handler
# ============================================================================
BATCH_HANDLER = r'''  // ---- CLASS DIFFERENTIATION: Batch generate for all roster key groups ----
  const handleBatchGenerateForRoster = async (type = 'simplified') => {
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
      setIsProcessing(true);
      let successCount = 0;
      try {
          for (let i = 0; i < groupEntries.length; i++) {
              const [groupId, group] = groupEntries[i];
              const profile = group.profile || {};
              const isLast = i === groupEntries.length - 1;
              setGenerationStep(t('roster.generating_for_group', { name: group.name }) || `Generating ${type} for "${group.name}"...`);
              // Apply this group's profile settings temporarily
              const savedGrade = gradeLevel;
              const savedLang = leveledTextLanguage;
              const savedInterests = studentInterests;
              const savedDok = dokLevel;
              const savedCustom = leveledTextCustomInstructions;
              // Temporarily set group profile for this generation
              if (profile.gradeLevel) setGradeLevel(profile.gradeLevel);
              if (profile.leveledTextLanguage) setLeveledTextLanguage(profile.leveledTextLanguage);
              if (profile.studentInterests) {
                  const interests = Array.isArray(profile.studentInterests) ? profile.studentInterests : profile.studentInterests.split(',').map(s => s.trim()).filter(Boolean);
                  setStudentInterests(interests);
              }
              if (profile.dokLevel) setDokLevel(profile.dokLevel);
              if (profile.leveledTextCustomInstructions) setLeveledTextCustomInstructions(profile.leveledTextCustomInstructions);
              // Small delay to let state settle before generation
              await new Promise(r => setTimeout(r, 100));
              // Generate with group-tagged config override
              await handleGenerate(type, profile.leveledTextLanguage || null, !isLast, textToProcess, {
                  grade: profile.gradeLevel || gradeLevel,
                  rosterGroupId: groupId,
                  rosterGroupName: group.name,
                  rosterGroupColor: group.color || '#4F46E5'
              }, false);
              successCount++;
              // Restore settings after generation
              setGradeLevel(savedGrade);
              setLeveledTextLanguage(savedLang);
              setStudentInterests(savedInterests);
              setDokLevel(savedDok);
              setLeveledTextCustomInstructions(savedCustom);
              // Delay between groups to avoid rate limiting
              if (!isLast) await new Promise(r => setTimeout(r, 1000));
          }
          addToast(t('roster.batch_complete', { count: successCount }) || `Generated ${successCount} differentiated versions for all groups!`, 'success');
      } catch (e) {
          warnLog("Roster batch generation error:", e);
          addToast(t('roster.batch_failed') || 'Batch generation failed', 'error');
      } finally {
          setIsProcessing(false);
          setGenerationStep('');
      }
  };
'''

# Find handleApplyRosterGroup and insert after its closing };
found_apply = False
brace_depth = 0
for i, l in enumerate(lines):
    if 'handleApplyRosterGroup' in l and 'const' in l:
        found_apply = True
        brace_depth = 0
    if found_apply:
        brace_depth += l.count('{') - l.count('}')
        if brace_depth <= 0 and '};' in l and i > 0:
            # Insert after this line
            lines.insert(i + 1, BATCH_HANDLER)
            changes += 1
            print(f"[OK] L{i+2}: Inserted handleBatchGenerateForRoster handler")
            break

# ============================================================================
# INSERTION 2: "Generate for All Groups" button in RosterKeyPanel
# Find the export button and add a batch generate button after it
# ============================================================================

BATCH_BUTTON = r'''          <button onClick={() => { onClose(); onBatchGenerate?.('simplified'); }} disabled={!rosterKey || Object.keys(rosterKey?.groups || {}).length === 0} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5 disabled:opacity-40">
            <Layers size={14} /> {t('roster.batch_generate') || 'Generate for All Groups'}
          </button>
'''

# Find the Export button in RosterKeyPanel and insert after it
for i, l in enumerate(lines):
    if "roster.export" in l and "Download" in l and i > 25400:
        # Find the closing </button> of the export button
        for j in range(i, min(i + 5, len(lines))):
            if '</button>' in lines[j]:
                lines.insert(j + 1, BATCH_BUTTON)
                changes += 1
                print(f"[OK] L{j+2}: Inserted batch generate button in RosterKeyPanel toolbar")
                break
        break

# ============================================================================
# INSERTION 3: Add onBatchGenerate prop to RosterKeyPanel component signature
# ============================================================================
for i, l in enumerate(lines):
    if 'RosterKeyPanel = React.memo' in l:
        # Add onBatchGenerate to the destructured props
        lines[i] = l.replace(
            'onApplyGroup, onSyncToSession, activeSessionCode, t',
            'onApplyGroup, onSyncToSession, onBatchGenerate, activeSessionCode, t'
        )
        changes += 1
        print(f"[OK] L{i+1}: Added onBatchGenerate prop to RosterKeyPanel")
        break

# ============================================================================
# INSERTION 4: Pass onBatchGenerate prop in the render
# ============================================================================
for i, l in enumerate(lines):
    if '<RosterKeyPanel' in l and i > 60000:
        # Find onApplyGroup line and add onBatchGenerate after it
        for j in range(i, min(i + 15, len(lines))):
            if 'onApplyGroup={handleApplyRosterGroup}' in lines[j]:
                indent = '        '
                new_line = indent + 'onBatchGenerate={handleBatchGenerateForRoster}\r\n'
                lines.insert(j + 1, new_line)
                changes += 1
                print(f"[OK] L{j+2}: Passed onBatchGenerate prop to RosterKeyPanel render")
                break
        break

# ============================================================================
# INSERTION 5: Localization keys for roster batch
# ============================================================================
for i, l in enumerate(lines):
    if "roster:" in l and "{" in l and "Class Roster" in lines[i+1] if i+1 < len(lines) else False:
        # Find the closing }, of roster namespace
        for j in range(i, min(i + 50, len(lines))):
            if lines[j].strip() == '},':
                # Insert before the closing
                new_keys = """      batch_generate: 'Generate for All Groups',
      generating_for_group: 'Generating for group...',
      batch_complete: 'Generated differentiated versions for all groups!',
      batch_failed: 'Batch generation failed',
      no_groups_to_generate: 'Add groups to your roster key first',
"""
                lines.insert(j, new_keys)
                changes += 1
                print(f"[OK] L{j+1}: Added batch generation localization keys")
                break
        break

# ============================================================================
# INSERTION 6: Tag history items with rosterGroupId from configOverride
# Find where history items are created with config: {} and add rosterGroupId
# ============================================================================
# Look for where config is built in handleGenerate
for i, l in enumerate(lines):
    if 'config:' in l and 'gradeLevel' in l and 'leveledTextLanguage' in l and i > 50300:
        # This is the config object in the history item creation
        # Add rosterGroupId if present in configOverride
        if 'rosterGroupId' not in l:
            lines[i] = l.rstrip() + '\r\n'  # Keep as-is for now, we'll handle tagging differently
        break

# Actually, let's add the rosterGroupId directly to the history push
# Find: setHistory(prev => [newEntry, ...prev])
# The newEntry already has config with gradeLevel etc.
# We need to find where configOverride.grade is consumed
for i, l in enumerate(lines):
    if 'configOverride.grade' in l and 'effectiveGrade' in l:
        print(f"[INFO] configOverride.grade consumed at L{i+1}: {l.rstrip()[:100]}")
        break

# Find where the history entry config is built to add rosterGroupId
for i, l in enumerate(lines):
    if 'effectiveGrade' in l and 'gradeLevel' in l and 'config' not in l and i > 50380:
        print(f"[INFO] effectiveGrade at L{i+1}: {l.rstrip()[:100]}")
        break

open(filepath, 'w', encoding='utf-8').write(''.join(lines))
print(f"\nTotal {changes} changes applied.")
