import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# FIX 1 re-check: Verify ]; between SOUND_MATCH_POOL and RIME_FAMILIES
pool_idx = content.find('SOUND_MATCH_POOL')
rime_idx = content.find('RIME_FAMILIES', pool_idx)
between = content[pool_idx:rime_idx]
if '];' not in between:
    # Find the last word in the pool (trot) and add ];
    old_trot = "'spin', 'spot', 'step', 'stop', 'stub', 'stun', 'swim', 'trap', 'trim', 'trip', 'trot'"
    if old_trot in content:
        idx = content.find(old_trot)
        end_idx = idx + len(old_trot)
        # Check what follows
        after = content[end_idx:end_idx+5]
        print(f"After trot: {repr(after)}")
        if '];' not in after:
            content = content[:end_idx] + '\n];\n' + content[end_idx:]
            changes += 1
            print("FIX 1: Added missing ];")
    else:
        print("FIX 1: Could not find trot line")
else:
    print("FIX 1: Already has ];")

# FIX 5: Image overlay - replace speaker Listen with ear
# The pattern is: >🔊 Listen</div>
speaker_listen = '\U0001f50a Listen</div>'
ear_only = '\U0001f442</div>'
if speaker_listen in content:
    content = content.replace(speaker_listen, ear_only, 1)
    changes += 1
    print("FIX 5: Replaced image overlay emoji")
else:
    # Try alternate patterns
    for i, line in enumerate(content.split('\n'), 1):
        if 'Listen</div>' in line and i < 4000:
            print(f"FIX 5: Found at L{i}: {line.strip()[:100]}")

# Save
content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"\nApplied {changes} additional fixes. Saved.")
