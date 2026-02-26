"""
Phase 2 React.memo fixes — VennGame titles extraction and
assessment of remaining single-inline-prop components.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0
lines = content.split('\n')

# ===================================================================
# Fix: VennGame inline titles object
# Extract to a useMemo before the return
# ===================================================================
# The inline object is:
#   titles={{ 
#     setA: { text: setA.title, trans: setA.title_en }, 
#     setB: { text: setB.title, trans: setB.title_en } 
#   }}
# Replace with titles={vennTitles} and add useMemo before usage

old_titles = """titles={{ 
                                setA: { text: setA.title, trans: setA.title_en }, 
                                setB: { text: setB.title, trans: setB.title_en } 
                            }}"""

if old_titles in content:
    content = content.replace(old_titles, 'titles={vennTitles}')
    changes += 1
    print("  Replaced VennGame inline titles with vennTitles ref")
    
    # Insert useMemo before the return that contains VennGame
    # Find VennGame usage
    venn_idx = content.index('<VennGame')
    line_num = content[:venn_idx].count('\n')
    
    # Find the nearest return ( before this
    for i in range(line_num, max(0, line_num - 30), -1):
        if lines[i].strip().startswith('return ('):
            # Insert useMemo before this return
            indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
            memo_line = f'{indent}const vennTitles = useMemo(() => ({{ setA: {{ text: setA.title, trans: setA.title_en }}, setB: {{ text: setB.title, trans: setB.title_en }} }}), [setA, setB]);'
            
            # Need to re-split since we already modified content
            lines2 = content.split('\n')
            lines2.insert(i, memo_line)
            content = '\n'.join(lines2)
            changes += 1
            print(f"  Inserted vennTitles useMemo before return at L{i+1}")
            break
else:
    # Try a more flexible match
    print("  VennGame titles pattern not found — checking alternatives")
    if 'titles={{' in content:
        # Find the VennGame usage area  
        lines_fresh = content.split('\n')
        for i, l in enumerate(lines_fresh):
            if '<VennGame' in l:
                for j in range(i, min(i+15, len(lines_fresh))):
                    if 'titles={{' in lines_fresh[j]:
                        print(f"  Found at L{j+1}: {lines_fresh[j].strip()[:100]}")
                        # Show +/- context
                        for k in range(j, min(j+4, len(lines_fresh))):
                            print(f"  L{k+1}: {lines_fresh[k].strip()[:120]}")
                        break
                break

# ===================================================================
# Assessment of remaining components
# ===================================================================
memo_components_to_check = [
    'LargeFileTranscriptionModal', 'WordSoundsGenerator', 'LetterTraceView',
    'SpeechBubble', 'MissionReportCard', 'DraftFeedbackInterface',
    'ClozeInput', 'RoleSelectionModal', 'StudentWelcomeModal',
    'QuickStartWizard', 'ImmersiveToolbar', 'ImmersiveWord',
    'InteractiveBlueprintCard', 'SimpleBarChart'
]

print("\n=== REMAINING COMPONENTS WITH INLINE PROPS ===")
for comp_name in memo_components_to_check:
    # Count usages
    pattern = f'<{comp_name}'
    usage_count = content.count(pattern)
    
    # Find inline props at usage sites
    inline_count = 0
    usage_lines = []
    for i, l in enumerate(content.split('\n')):
        if pattern in l:
            # Check this and next few lines for inline props
            for j in range(i, min(i+10, len(content.split('\n')))):
                check_line = content.split('\n')[j]
                if '={() =>' in check_line or '={(' in check_line:
                    inline_count += 1
    
    if usage_count > 0:
        print(f"  {comp_name}: {usage_count} usage(s), ~{inline_count} inline props")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
print("DONE")
