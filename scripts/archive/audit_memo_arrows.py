"""
Find inline arrow functions that are PASSED AS PROPS TO React.memo COMPONENTS.
These are the ones that defeat memoization.

Strategy: Find JSX usage of each React.memo component and check if any props
are inline arrows.
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

# Known React.memo components
MEMO_COMPONENTS = [
    'GlobalMuteButton', 'LargeFileTranscriptionModal', 'WordSoundsGenerator',
    'RhymeView', 'OrthographyView', 'SoundMappingView', 'LetterTraceView',
    'StudentAnalyticsPanel', 'StudentSubmitModal', 'SpeechBubble', 'AlloBot',
    'MissionReportCard', 'StudentQuizOverlay', 'DraftFeedbackInterface',
    'TeacherGate', 'ClimaxProgressBar', 'AdventureAmbience', 'InfoTooltip',
    'ConfettiExplosion', 'ComplexityGauge', 'ClozeInput', 'MemoryGame',
    'MatchingGame', 'TimelineGame', 'ConceptSortGame', 'VennGame',
    'CrosswordGame', 'SyntaxScramble', 'BingoGame', 'StudentBingoGame',
    'WordScrambleGame', 'InventoryGrid', 'DiceOverlay', 'AdventureShop',
    'RoleSelectionModal', 'StudentEntryModal', 'StudentWelcomeModal',
    'SimpleBarChart', 'StudentEscapeRoomOverlay', 'EscapeRoomTeacherControls',
    'TeacherLiveQuizControls', 'LongitudinalProgressChart', 'TeacherDashboard',
    'QuickStartWizard', 'SpeedReaderOverlay', 'ImmersiveToolbar',
    'ToggleButton', 'ImmersiveWord', 'InteractiveBlueprintCard',
    'CharacterColumn', 'BilingualFieldRenderer', 'BranchItem'
]

out = []

for comp in MEMO_COMPONENTS:
    # Find JSX usage: <ComponentName ... />  or <ComponentName ...>
    # Look for lines with <ComponentName and inline arrows
    usages = []
    for i, line in enumerate(lines):
        if f'<{comp}' in line or f'<{comp} ' in line:
            # Check this line and next 10 lines for inline arrows until we find /> or >
            block = []
            for j in range(i, min(i+15, len(lines))):
                block.append(lines[j])
                if '/>' in lines[j] or (j > i and '>' in lines[j] and '<' not in lines[j]):
                    break
            
            block_text = '\n'.join(block)
            # Find inline arrows in props
            arrow_props = re.findall(r'(\w+)=\{(?:\([^)]*\))?\s*=>', block_text)
            if arrow_props:
                usages.append({
                    'line': i + 1,
                    'props': arrow_props,
                    'snippet': block[0].strip()[:100]
                })
    
    if usages:
        out.append(f"\n{'='*60}")
        out.append(f"<{comp}> ({len(usages)} usage(s) with inline arrows)")
        out.append(f"{'='*60}")
        for u in usages:
            out.append(f"  L{u['line']}: {u['snippet']}")
            out.append(f"    Inline arrow props: {', '.join(u['props'])}")

with open('_memo_defeating_arrows.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

# Count total
total_usages = sum(1 for line in out if line.strip().startswith('L'))
components_affected = sum(1 for line in out if line.strip().startswith('<'))
print(f"Components with memo-defeating inline arrows: {components_affected}")
print(f"Total usages with inline arrows: {total_usages}")
print("Written to _memo_defeating_arrows.txt")
