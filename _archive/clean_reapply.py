"""
CLEAN APPROACH: Revert to backup, then apply only verified-safe useCallback handlers.

Safe handlers must:
1. Have a unique name (no existing function with the same name)
2. Only reference React state setters (not scope variables)  
3. Have empty dependency arrays []
"""
import re

# Start from backup
print("Reading backup...")
with open('AlloFlowANTI.txt.bak', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
print(f"Backup: {len(content):,} bytes, {len(lines):,} lines")

# First, collect ALL existing handler names in the file
existing_names = set()
for line in lines:
    m = re.match(r'\s*(?:const|let|var|function)\s+(handle\w+)', line)
    if m:
        existing_names.add(m.group(1))

print(f"Existing handler names: {len(existing_names)}")

# Define the safe handlers we want to add
# These ONLY call state setters with constants or functional updaters
# and have names that DON'T conflict with existing handlers
SAFE_HANDLERS = [
    ("handleToggleIsEditing", "() => setIsEditing(prev => !prev)", "[]"),
    ("handleToggleIsFullscreen", "() => setIsFullscreen(prev => !prev)", "[]"),
    ("handleToggleIsMapLocked", "() => setIsMapLocked(prev => !prev)", "[]"),
    ("handleToggleFocusMode", "() => setFocusMode(prev => !prev)", "[]"),
    ("handleTogglePersonaAutoSend", "() => setPersonaAutoSend(prev => !prev)", "[]"),
    ("handleToggleShowPersonaHints", "() => setShowPersonaHints(prev => !prev)", "[]"),
    ("handleToggleShowFlashcardImages", "() => setShowFlashcardImages(prev => !prev)", "[]"),
    ("handleSetIsMinimizedToFalse", "() => setIsMinimized(false)", "[]"),
    ("handleSetIsMinimizedToTrue", "() => setIsMinimized(true)", "[]"),
    ("handleSetStepTo4", "() => setStep(4)", "[]"),
    ("handleSetStandardModeToAi", "() => setStandardMode('ai')", "[]"),
    ("handleSetStandardModeToManual", "() => setStandardMode('manual')", "[]"),
    ("handleSetShowSessionModalToFalse", "() => setShowSessionModal(false)", "[]"),
    ("handleSetShowGroupModalToFalse", "() => setShowGroupModal(false)", "[]"),
    ("handleSetShowLedgerToFalse", "() => setShowLedger(false)", "[]"),
    ("handleSetShowSaveModalToFalse", "() => setShowSaveModal(false)", "[]"),
    ("handleSetIsProjectSettingsOpenToFalse", "() => setIsProjectSettingsOpen(false)", "[]"),
    ("handleSetKeyboardSelectedItemIdToNull", "() => setKeyboardSelectedItemId(null)", "[]"),
    ("handleSetShowClearConfirmToFalse", "() => setShowClearConfirm(false)", "[]"),
    ("handleSetShowSubmitModalToTrue", "() => setShowSubmitModal(true)", "[]"),
    ("handleSetShowInfoModalToFalse", "() => setShowInfoModal(false)", "[]"),
    ("handleSetShowHintsModalToFalse", "() => setShowHintsModal(false)", "[]"),
    ("handleSetShowXPModalToFalse", "() => setShowXPModal(false)", "[]"),
    ("handleSetShowStorybookExportModalToFalse", "() => setShowStorybookExportModal(false)", "[]"),
    ("handleSetIsPersonaReflectionOpenToFalse", "() => setIsPersonaReflectionOpen(false)", "[]"),
    ("handleSetIsSyntaxGameToTrue", "() => setIsSyntaxGame(true)", "[]"),
    ("handleSetSelectedInventoryItemToNull", "() => setSelectedInventoryItem(null)", "[]"),
    ("handleSetIsTimelineGameToTrue", "() => setIsTimelineGame(true)", "[]"),
    ("handleSetIsConceptSortGameToTrue", "() => setIsConceptSortGame(true)", "[]"),
    ("handleSetShowGlobalLevelUpToFalse", "() => setShowGlobalLevelUp(false)", "[]"),
    ("handleSetIsTranslateModalOpenToFalse", "() => setIsTranslateModalOpen(false)", "[]"),
    ("handleSetShowCloudWarningToFalse", "() => setShowCloudWarning(false)", "[]"),
    ("handleSetShowStudyTimerModalToFalse", "() => setShowStudyTimerModal(false)", "[]"),
    ("handleSetShowAdventureConfirmationToFalse", "() => setShowAdventureConfirmation(false)", "[]"),
]

# Filter out any that conflict with existing names
safe_to_add = []
skipped = []
for name, body, deps in SAFE_HANDLERS:
    if name in existing_names:
        skipped.append(name)
    else:
        safe_to_add.append((name, body, deps))

print(f"\nSafe handlers to add: {len(safe_to_add)}")
print(f"Skipped (name conflict): {len(skipped)}")
for s in skipped:
    print(f"  SKIP: {s}")

# Build the useCallback block
cb_lines = ["  // === PHASE 1 TIER 2: Extracted useCallback Handlers ==="]
for name, body, deps in safe_to_add:
    cb_lines.append(f"  const {name} = React.useCallback({body}, {deps});")

cb_block = '\n'.join(cb_lines) + '\n'

# Find insertion point: inside AlloFlowContent, before the first useEffect
# Look for the "Persist wsPreloadedWords" comment as a stable anchor
anchor = "// Persist wsPreloadedWords to currently active glossary/word-sounds history item"
anchor_idx = content.find(anchor)
if anchor_idx < 0:
    print("ERROR: Can't find insertion anchor!")
    exit(1)

# Insert before the anchor line
insert_pos = content.rfind('\n', 0, anchor_idx) + 1
content = content[:insert_pos] + cb_block + content[insert_pos:]
print(f"\nInserted {len(cb_lines)} useCallback declarations")

# Now replace inline onClick patterns with the callbacks
# For each handler, find the original onClick inline pattern and replace it
changes = 0
for name, body, deps in safe_to_add:
    # Build the original onClick pattern
    # e.g. onClick={() => setIsEditing(prev => !prev)}
    original_onclick = f'onClick={{{body}}}'
    replacement = f'onClick={{{name}}}'
    
    count = content.count(original_onclick)
    if count > 0:
        content = content.replace(original_onclick, replacement)
        changes += count
        # print(f"  {name}: replaced {count} onClick refs")

print(f"Replaced {changes} inline onClick calls with handler refs")

# Write result
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

# Final verification
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    final = f.read()

# Check for duplicate declarations
final_lines = final.split('\n')
handler_counts = {}
for line in final_lines:
    m = re.match(r'\s*const\s+(handle\w+)\s*=', line)
    if m:
        name = m.group(1)
        handler_counts[name] = handler_counts.get(name, 0) + 1

dups = {k: v for k, v in handler_counts.items() if v > 1}
if dups:
    print(f"\nWARNING: Remaining duplicates:")
    for name, count in sorted(dups.items()):
        print(f"  {name}: {count}x")
        # Show line numbers
        for i, line in enumerate(final_lines):
            if re.match(rf'\s*const\s+{name}\s*=', line):
                print(f"    L{i+1}: {line.strip()[:100]}")
else:
    print("\nNo duplicate declarations - OK!")

uc_count = len(re.findall(r'React\.useCallback', final))
print(f"\nFinal stats:")
print(f"  useCallback count: {uc_count}")
print(f"  Lines: {len(final_lines)}")
print(f"  Bytes: {len(final):,}")
print("DONE")
