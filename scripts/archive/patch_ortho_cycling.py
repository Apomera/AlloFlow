# -*- coding: utf-8 -*-
"""Apply orthographic auto-cycling patch - line-based approach."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'rb') as f:
    raw = f.read()

# Preserve BOM
bom = raw[:3]
body = raw[3:]

# Work with the content as text, preserving line endings
text = body.decode('utf-8')

# Find the target using a simpler, unique anchor
target = '// Transition to orthographic activities'
if target not in text:
    print("[ERROR] Can't find target anchor")
    sys.exit(1)

print(f"[OK] Found anchor at position {text.index(target)}")

# Find the block boundaries
# Start: "} else if (includeOrthographic) {"
# End: the "}" closing this else-if block after "setWordSoundsActivity('orthography')"
lines = text.split('\r\n')
target_line = None
for i, line in enumerate(lines):
    if target in line:
        target_line = i
        break

if target_line is None:
    print("[ERROR] Target line not found")
    sys.exit(1)

start_line = target_line - 1  # The "} else if" line
end_line = target_line + 6    # The closing "}" of this block

print(f"Replacing lines {start_line+1} to {end_line+1}:")
for i in range(start_line, end_line + 1):
    print(f"  L{i+1}: {lines[i].rstrip()}")

# Build replacement lines
replacement = [
    '                 } else if (includeOrthographic) {',
    '                      // Orthographic auto-cycling: progress through all spelling activities',
    "                      const ORTHO_ORDER = ['orthography', 'mapping', 'spelling_bee', 'word_scramble', 'missing_letter'];",
    '                      const orthoIdx = ORTHO_ORDER.indexOf(wordSoundsActivity);',
    '                      if (orthoIdx >= 0 && orthoIdx < ORTHO_ORDER.length - 1) {',
    '                          // Cycle to next orthographic activity',
    '                          const nextOrtho = ORTHO_ORDER[orthoIdx + 1];',
    '                          setWordSoundsFeedback({',
    "                              type: 'success',",
    "                              message: ts('word_sounds.fb_spelling_transition') || `Great spelling! Let's try ${nextOrtho.replace(/_/g, ' ')}! \U0001F3C6`,",
    '                          });',
    '                          setWordSoundsScore(prev => ({ ...prev, streak: 0 }));',
    '                          if (setWordSoundsStreak) setWordSoundsStreak(0);',
    '                          autoDirectorCooldown.current = true;',
    '                          setTimeout(() => {',
    '                              if (!isMountedRef.current) return;',
    '                              setWordSoundsActivity(nextOrtho);',
    '                              setTimeout(() => { autoDirectorCooldown.current = false; }, 15000);',
    '                          }, 2000);',
    '                      } else if (orthoIdx === -1) {',
    '                          // First transition from phonological to orthographic',
    '                          setWordSoundsFeedback({',
    "                              type: 'success',",
    "                              message: ts('word_sounds.fb_spelling_transition') || \"You're a pro! Testing your spelling now! \U0001F441\uFE0F\",",
    '                          });',
    '                          autoDirectorCooldown.current = true;',
    '                          setTimeout(() => {',
    '                              if (!isMountedRef.current) return;',
    "                              setWordSoundsActivity('orthography');",
    '                              setTimeout(() => { autoDirectorCooldown.current = false; }, 15000);',
    '                          }, 2000);',
    '                      }',
    '                      // orthoIdx === last item => all orthographic complete, session ends naturally',
    '                  }',
]

# Replace lines
lines[start_line:end_line + 1] = replacement
new_text = '\r\n'.join(lines)
result = bom + new_text.encode('utf-8')

with open(FILE, 'wb') as f:
    f.write(result)

# Count lines
new_lines = result.count(b'\r\n')
print(f"\n[RESULT]")
print(f"  Total lines: {new_lines}")
print(f"  BOM: {result[:3].hex()}")
print(f"  ORTHO_ORDER present: {'ORTHO_ORDER' in new_text}")
print(f"  orthoIdx present: {'orthoIdx' in new_text}")
print("[OK] Orthographic auto-cycling applied!")
