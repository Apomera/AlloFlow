"""
Wrap memo-defeating inline arrows in useCallback.

Strategy:
1. Add useCallback-wrapped handlers for common patterns near existing useCallback declarations
2. Replace inline arrows at component usage sites

Categories:
A. onScoreUpdate: (points, activity) => handleScoreUpdate(points, activity, generatedContent.id)
   - 7 game components use this identical pattern
   - Depends on: generatedContent.id, handleScoreUpdate
   
B. onGameComplete: (gameType, data) => recordGameCompletion(generatedContent.id, gameType, data)
   - 6 game components use this identical pattern
   - Depends on: generatedContent.id, recordGameCompletion

C. Simple onClose setters (stable - setters never change identity):
   - () => setShowClassAnalytics(false)
   - () => setShowSubmitModal(false)
   - () => setIsGateOpen(false)
   - () => setActiveView('input')
   - () => setIsSpeedReaderActive(false)
   - () => setIsImmersiveReaderActive(false)
   - () => setShowStudentWelcome(false)
   - () => setShowStudentEntry(false); setHasSelectedRole(false)
   - () => setShowLargeFileModal(false); setPendingLargeFile(null); LargeFileHandler.cancel();
   - () => setShowStorybookExportModal(true) (MissionReportCard onExport)
   - () => setIsWordScrambleGame(false)

D. Complex - skip for safety (require deep understanding of state flow):
   - WordSoundsGenerator onStartGame (very complex)
   - RhymeView/OrthographyView/SoundMappingView onCheckAnswer (complex state)
   - LetterTraceView onComplete (complex branching)
   - ClozeInput onCorrect (complex Set updating)
   - ImmersiveWord onClick (complex playback)
   - InteractiveBlueprintCard onCancel (multi-state)
   - DraftFeedbackInterface setDraftText (state nesting)
   - RoleSelectionModal onGateRequired (multi-state)
   - MissionReportCard onClose (state nesting)
   - ToggleButton onClick (inside ImmersiveToolbar, already memo'd)
"""

import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# Step 1: Find insertion point for new useCallback declarations
# We'll insert after the existing useCallback declarations.
# Look for a good anchor point near game-related callbacks.
# ============================================================

# Find closeMemory, closeMatching etc. which are near the game section
ANCHOR = "const closeMemory = useCallback(() => {"
if ANCHOR not in content:
    # Try finding any close* useCallback
    print("Looking for alternate anchor...")
    for term in ['closeMemory', 'closeMatching', 'closeTimeline']:
        idx = content.find(term)
        if idx > 0:
            print(f"  Found {term} at char {idx}")
            # Get surrounding context
            start = max(0, idx - 100)
            print(f"  Context: {content[start:idx+100]}")
            break

# Step 1A: Add game score/completion handlers
GAME_HANDLERS = """
  // Memoized game event handlers (avoid inline arrows defeating React.memo)
  const handleGameScoreUpdate = useCallback((points, activity) => {
    handleScoreUpdate(points, activity, generatedContent?.id);
  }, [generatedContent?.id, handleScoreUpdate]);

  const handleGameCompletion = useCallback((gameType, data) => {
    recordGameCompletion(generatedContent?.id, gameType, data);
  }, [generatedContent?.id, recordGameCompletion]);
"""

# Step 1B: Add simple close handlers
CLOSE_HANDLERS = """
  // Memoized close handlers (avoid inline arrows defeating React.memo)
  const handleCloseClassAnalytics = useCallback(() => setShowClassAnalytics(false), []);
  const handleCloseSubmitModal = useCallback(() => setShowSubmitModal(false), []);
  const handleCloseGate = useCallback(() => setIsGateOpen(false), []);
  const handleCloseDashboard = useCallback(() => setActiveView('input'), []);
  const handleCloseSpeedReader = useCallback(() => setIsSpeedReaderActive(false), []);
  const handleCloseImmersiveReader = useCallback(() => setIsImmersiveReaderActive(false), []);
  const handleCloseStudentWelcome = useCallback(() => setShowStudentWelcome(false), []);
  const handleCloseStudentEntry = useCallback(() => { setShowStudentEntry(false); setHasSelectedRole(false); }, []);
  const handleCloseWordScramble = useCallback(() => setIsWordScrambleGame(false), []);
  const handleOpenStorybookExport = useCallback(() => setShowStorybookExportModal(true), []);
"""

# Find a good insertion point - after closeTimeline or similar
# Look for the pattern of close* useCallback declarations
close_pattern = 'const closeTimeline = useCallback('
insert_idx = content.find(close_pattern)
if insert_idx < 0:
    close_pattern = 'const closeMemory = useCallback('
    insert_idx = content.find(close_pattern)

if insert_idx > 0:
    # Find end of this useCallback block - look for the next "const " or similar
    # Simpler: insert BEFORE the pattern
    content = content[:insert_idx] + GAME_HANDLERS + "\n" + CLOSE_HANDLERS + "\n  " + content[insert_idx:]
    print("✅ Inserted game handler and close handler useCallbacks")
else:
    print("❌ Could not find insertion point for useCallbacks!")
    exit(1)

# ============================================================
# Step 2: Replace inline arrows at component usage sites
# ============================================================

replacements = 0

# 2A: onScoreUpdate replacements
old_score = 'onScoreUpdate={(points, activity) => handleScoreUpdate(points, activity, generatedContent.id)}'
new_score = 'onScoreUpdate={handleGameScoreUpdate}'
n = content.count(old_score)
content = content.replace(old_score, new_score)
replacements += n
print(f"  onScoreUpdate: {n} replacements")

# 2B: onGameComplete replacements
old_complete = 'onGameComplete={(gameType, data) => recordGameCompletion(generatedContent.id, gameType, data)}'
new_complete = 'onGameComplete={handleGameCompletion}'
n = content.count(old_complete)
content = content.replace(old_complete, new_complete)
replacements += n
print(f"  onGameComplete: {n} replacements")

# 2C: Simple close handlers
close_replacements = [
    ('onClose={() => setShowClassAnalytics(false)}', 'onClose={handleCloseClassAnalytics}'),
    ('onClose={() => setShowSubmitModal(false)}', 'onClose={handleCloseSubmitModal}'),
    ('onClose={() => setIsGateOpen(false)}', 'onClose={handleCloseGate}'),
    ('onClose={() => setActiveView(\'input\')}', 'onClose={handleCloseDashboard}'),
    ('onClose={() => setIsSpeedReaderActive(false)}', 'onClose={handleCloseSpeedReader}'),
    ('onClose={() => setIsImmersiveReaderActive(false)}', 'onClose={handleCloseImmersiveReader}'),
    ('onClose={() => setShowStudentWelcome(false)}', 'onClose={handleCloseStudentWelcome}'),
    ('onClose={() => { setShowStudentEntry(false); setHasSelectedRole(false); }}', 'onClose={handleCloseStudentEntry}'),
    ('onClose={() => setIsWordScrambleGame(false)}', 'onClose={handleCloseWordScramble}'),
    ('onExport={() => setShowStorybookExportModal(true)}', 'onExport={handleOpenStorybookExport}'),
]

for old, new in close_replacements:
    n = content.count(old)
    if n > 0:
        content = content.replace(old, new)
        replacements += n
        print(f"  {old[:40]}...: {n} replacements")
    else:
        print(f"  SKIP: {old[:50]}...")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Total inline arrow replacements: {replacements}")
print(f"Remaining useCallback count: {content.count('useCallback(')}")
