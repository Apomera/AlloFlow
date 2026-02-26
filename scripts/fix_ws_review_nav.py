"""
Fix Word Sounds Review Panel Navigation - line-number based approach
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = []

# FIX 1: L47029 - setGeneratedContent strips lessonPlanConfig
# Find the exact line
for i, l in enumerate(lines):
    if 'setGeneratedContent({ type: item.type, data: item.data, id: item.id })' in l and 'handleRestoreView' not in l:
        old = l
        new = l.replace(
            'setGeneratedContent({ type: item.type, data: item.data, id: item.id })',
            'setGeneratedContent({ type: item.type, data: item.data, id: item.id, lessonPlanConfig: item.lessonPlanConfig || null, lessonPlanSequence: item.lessonPlanSequence || [] })'
        )
        lines[i] = new
        changes.append("FIX 1 (L%d): setGeneratedContent now preserves lessonPlanConfig and lessonPlanSequence" % (i+1))
        break

# FIX 2: setActiveView(item.type) -> set 'output' for word-sounds
# Find the line right after FIX 1 that sets activeView
for i, l in enumerate(lines):
    if 'setActiveView(item.type)' in l:
        # Check context - should be in handleRestoreView (near setIsMapLocked)
        context = ''.join(lines[max(0,i-3):i+3])
        if 'setIsMapLocked' in context or 'handleRestoreView' in context:
            old = l
            # Replace the content
            new = l.replace(
                'setActiveView(item.type)',
                "setActiveView(item.type === 'word-sounds' ? 'output' : item.type)"
            )
            lines[i] = new
            changes.append("FIX 2 (L%d): activeView now set to 'output' for word-sounds type" % (i+1))
            break

# FIX 3: Auto-start races with review panel
# Find the line with !showReviewPanel) { in the auto-start effect
for i, l in enumerate(lines):
    if '!showReviewPanel)' in l and 'Lesson Plan' in ''.join(lines[max(0,i-5):i+5]):
        old = l
        # Add !initialShowReviewPanel check
        new = l.replace(
            '!showReviewPanel)',
            '!showReviewPanel &&\r\n            !initialShowReviewPanel)'
        )
        lines[i] = new
        changes.append("FIX 3a (L%d): Auto-start now checks initialShowReviewPanel to prevent race" % (i+1))
        # Also update dep array (should be nearby)
        for j in range(i, min(len(lines), i+15)):
            if 'showReviewPanel]' in lines[j] and 'startActivity' in lines[j]:
                lines[j] = lines[j].replace(
                    'showReviewPanel]',
                    'showReviewPanel, initialShowReviewPanel]'
                )
                changes.append("FIX 3b (L%d): Added initialShowReviewPanel to dep array" % (j+1))
                break
        break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("\n" + "="*60)
print("Applied %d changes:" % len(changes))
for c in changes:
    print("  + %s" % c)
print("="*60)

# Verify
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
print("\nVerification:")
print("  lessonPlanConfig preserved:", "lessonPlanConfig: item.lessonPlanConfig" in content)
print("  activeView word-sounds fix:", "item.type === 'word-sounds' ? 'output'" in content)
print("  initialShowReviewPanel guard:", "!initialShowReviewPanel)" in content)
