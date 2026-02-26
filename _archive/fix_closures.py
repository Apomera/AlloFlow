"""
Fix problematic useCallback hooks that capture loop/render-scope variables.
These must be reverted to inline arrows because the variables (idx, opt, word,
chip.phoneme, data.word, gid, joinCodeInput) are only available in the
render scope (inside .map() callbacks), not at the component level.
"""
import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Problematic callbacks and their original inline forms
PROBLEMATIC = {
    'handleOnPlayAudio': ('() => onPlayAudio(data.word)', 'data.word'),
    'handleHandleAudio': ('() => handleAudio(currentWordSoundsWord)', 'currentWordSoundsWord'),
    'handleHandleRemoveStandard': ('() => handleRemoveStandard(idx)', 'idx'),
    'handleOnCheckAnswer': ('() => onCheckAnswer(opt)', 'opt'),
    'handleOnPlayAudioCb': ('() => onPlayAudio(word)', 'word'),
    'handleHandleAudioCb': ('() => handleAudio(chip.phoneme)', 'chip.phoneme'),
    'handleHandleDeleteGroup': ('() => handleDeleteGroup(gid)', 'gid'),
    'handleJoinClassSession': ('() => joinClassSession(joinCodeInput)', 'joinCodeInput'),
}

changes = 0

# 1. Remove the problematic declarations from the Tier 2 block
for name, (inline_body, var) in PROBLEMATIC.items():
    # Remove the const declaration line
    decl_pattern = rf'  const {name} = React\.useCallback\([^;]+;\n'
    match = re.search(decl_pattern, content)
    if match:
        content = content[:match.start()] + content[match.end():]
        changes += 1
        print(f"  Removed declaration: {name}")
    else:
        print(f"  Declaration not found: {name}")
    
    # Revert onClick={handleXxx} back to onClick={() => ...}
    ref_pattern = rf'onClick=\{{{name}\}}'
    ref_count = len(re.findall(ref_pattern, content))
    if ref_count > 0:
        content = re.sub(ref_pattern, f'onClick={{{inline_body}}}', content)
        changes += ref_count
        print(f"  Reverted {ref_count} onClick refs for {name}")
    else:
        print(f"  No onClick refs found for {name}")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")

# Quick re-verify
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

uc_count = len(re.findall(r'React\.useCallback', content))
onclick_refs = len(re.findall(r'onClick=\{handle\w+\}', content))
open_b = content.count('{')
close_b = content.count('}')
print(f"\nAfter fix:")
print(f"  useCallback count: {uc_count}")
print(f"  onClick handler refs: {onclick_refs}")
print(f"  Braces: {open_b} open, {close_b} close, diff={open_b - close_b}")
print(f"  Lines: {content.count(chr(10))}")
