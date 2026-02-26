"""
Analyze and collect all inline arrow patterns passed to React.memo components.
Output the exact code for each to plan replacements.
"""

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines to inspect (from the audit)
TARGETS = [
    74814,  # LargeFileTranscriptionModal onClose
    73495,  # WordSoundsGenerator onStartGame
    9953,   # RhymeView onCheckAnswer
    9485,   # OrthographyView onCheckAnswer
    9506,   # SoundMappingView onCheckAnswer
    10123,  # LetterTraceView onComplete
    75217,  # StudentAnalyticsPanel onClose
    74683,  # StudentSubmitModal onClose
    60982,  # MissionReportCard onExport
    70624,  # DraftFeedbackInterface setDraftText
    74662,  # TeacherGate onClose
    40030,  # ClozeInput onCorrect
    66802,  # MemoryGame onScoreUpdate
    66823,  # MatchingGame onScoreUpdate
    72616,  # TimelineGame onScoreUpdate
    72688,  # ConceptSortGame onScoreUpdate
    56955,  # VennGame onScoreUpdate
    66812,  # CrosswordGame onScoreUpdate
    73942,  # SyntaxScramble onScoreUpdate
    66850,  # StudentBingoGame onGameComplete
    66860,  # WordScrambleGame onClose
    74670,  # RoleSelectionModal onGateRequired
    74678,  # StudentEntryModal onClose
    74878,  # StudentWelcomeModal onClose
    74650,  # TeacherDashboard onClose
    67483,  # SpeedReaderOverlay onClose
    67469,  # ImmersiveToolbar onClose
    31766,  # ToggleButton onClick (7 usages, start line)
    67566,  # ImmersiveWord onClick
    62078,  # InteractiveBlueprintCard onCancel
]

out = []
for target in TARGETS:
    idx = target - 1
    # Show 5 lines around the target
    start = max(0, idx - 1)
    end = min(len(lines), idx + 8)
    out.append(f"=== LINE {target} ===")
    for j in range(start, end):
        marker = ">>>" if j == idx else "   "
        out.append(f"  {marker} L{j+1}: {lines[j].rstrip()[:130]}")
    out.append("")

with open('_memo_arrow_details.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print(f"Written {len(TARGETS)} entries to _memo_arrow_details.txt")
