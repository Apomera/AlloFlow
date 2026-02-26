"""Final feature sweep - cross-reference boolean states against inventory."""
from pathlib import Path
import re

c = Path(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt').read_text(encoding='utf-8')

new_features = {
    'Zen Mode': 'isZenMode',
    'Compare Mode': 'isCompareMode', 
    'Conversation Mode': 'isConversationMode',
    'Dictation Mode': 'isDictationMode',
    'Math Graph': 'isMathGraphEnabled',
    'Probe Mode': 'isProbeMode',
    'Sticker Mode': 'isStickerMode',
    'Study Timer': 'isStudyTimerRunning',
    'Spotlight Mode': 'isSpotlightMode',
    'Diagnostics Panel': 'showDiagnostics',
    'Local Stats': 'showLocalStats',
    'Batch Config': 'showBatchConfig',
    'Class Analytics': 'showClassAnalytics',
    'UDL Guide': 'showUDLGuide',
    'Auto Fill Mode': 'isAutoFillMode',
    'Socratic Dictation': 'isSocraticDictating',
    'Side-by-Side View': 'isSideBySide',
    'Fullscreen Mode': 'isFullscreen',
    'FAB (Floating Action)': 'isFabExpanded',
    'Custom Revise': 'isCustomReviseOpen',
    'URL Search Mode': 'isUrlSearchMode',
    'Student Link Mode': 'isStudentLinkMode',
    'Help Mode': 'isHelpMode',
}

print('=== Features from boolean states ===')
for label, pat in sorted(new_features.items()):
    count = c.count(pat)
    if count > 0:
        idx = c.find(pat)
        ln = c[:idx].count('\n') + 1
        print(f'  {label} ({pat}): {count} refs, L{ln}')

# Check view names
print()
views = re.findall(r"activeView\s*===?\s*'(\w+)'", c)
unique_views = sorted(set(views))
print(f'Active views ({len(unique_views)}):')
for v in unique_views:
    print(f'  {v}')

# Check number of unique feature flags/toggles  
print()
print('=== Feature flag count ===')
all_booleans = re.findall(r'(is\w+),\s*set\w+\]\s*=\s*useState', c)
# Filter out partial word matches
real = [b for b in all_booleans if b[0:2] == 'is' and b[2].isupper()]
print(f'Real boolean feature toggles: {len(set(real))}')
