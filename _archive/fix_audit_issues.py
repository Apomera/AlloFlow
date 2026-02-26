#!/usr/bin/env python3
"""
Surgery script to fix two issues found during audit:
1. Remove duplicate word_families instruction block injected into handleOptionUpdate (L8108-8145)
2. Expand SOUND_MATCH_POOL with digraph and R-controlled words
"""

import re, sys

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
print(f"[INFO] File loaded: {original_len:,} bytes")

# ============================================================================
# FIX 1: Remove duplicate word_families block from handleOptionUpdate
# The surgery script incorrectly injected the instruction block here.
# We need to restore the original flow:
#   setOrthographyOptions(newOptions);
#   } else if (wordSoundsActivity === 'rhyming') {
# ============================================================================

# The broken pattern starts with the extra closing brace + the injected block
BROKEN_PATTERN = (
    "            setOrthographyOptions(newOptions);\r\n"
    "        }             } else if (wordSoundsActivity === 'word_families') {\r\n"
)

if BROKEN_PATTERN in content:
    print("[FIX 1] Found broken handleOptionUpdate pattern")
    
    # Find the start of the broken section
    broken_start = content.index(BROKEN_PATTERN)
    
    # The injection ends right before "else if (wordSoundsActivity === 'rhyming') {"
    # which appears WITHOUT the "} " prefix (because the duplicate broke the chain)
    RHYMING_MARKER = "\r\nelse if (wordSoundsActivity === 'rhyming') {"
    
    rhyming_pos = content.find(RHYMING_MARKER, broken_start)
    if rhyming_pos < 0:
        print("[ERROR] Could not find rhyming marker after broken section")
        sys.exit(1)
    
    # Build the replacement: restore proper flow
    replacement = (
        "            setOrthographyOptions(newOptions);\r\n"
        "        } else if (wordSoundsActivity === 'rhyming') {"
    )
    
    # Extract the broken region (from broken_start to end of the rhyming marker line)
    broken_end = rhyming_pos + len(RHYMING_MARKER)
    broken_section = content[broken_start:broken_end]
    
    content = content[:broken_start] + replacement + content[broken_end:]
    
    removed_lines = broken_section.count('\n')
    print(f"[FIX 1] Removed {removed_lines} lines of duplicate injection")
    print(f"[FIX 1] Restored proper else-if chain in handleOptionUpdate")
else:
    print("[FIX 1] SKIP: Broken pattern not found (may already be fixed)")

# ============================================================================
# FIX 2: Expand SOUND_MATCH_POOL with digraph and R-controlled words
# ============================================================================

OLD_POOL = "const SOUND_MATCH_POOL = ['bat', 'cat', 'dog', 'fan', 'hat', 'jet', 'kit', 'leg', 'men', 'nut', 'pig', 'run', 'sit', 'top', 'van', 'web', 'box', 'yes', 'zip', 'bed', 'cap', 'den', 'fin', 'gum', 'hen', 'jam', 'lip', 'map', 'net', 'pen', 'rag', 'sun', 'tub', 'vet', 'wig', 'fix', 'mix', 'fox', 'log', 'bug', 'bus', 'cup', 'mud', 'rug', 'hot', 'pot', 'cut', 'hop', 'mop', 'pop'];"

NEW_POOL = """const SOUND_MATCH_POOL = [
    // CVC words
    'bat', 'cat', 'dog', 'fan', 'hat', 'jet', 'kit', 'leg', 'men', 'nut',
    'pig', 'run', 'sit', 'top', 'van', 'web', 'box', 'yes', 'zip', 'bed',
    'cap', 'den', 'fin', 'gum', 'hen', 'jam', 'lip', 'map', 'net', 'pen',
    'rag', 'sun', 'tub', 'vet', 'wig', 'fix', 'mix', 'fox', 'log', 'bug',
    'bus', 'cup', 'mud', 'rug', 'hot', 'pot', 'cut', 'hop', 'mop', 'pop',
    // Digraph words (sh, ch, th, wh, ng, ck)
    'ship', 'shop', 'shed', 'shin', 'shut', 'shot', 'fish', 'dish', 'wish', 'rush', 'bush', 'cash', 'mash', 'gush',
    'chip', 'chin', 'chop', 'chat', 'rich', 'much', 'such', 'each', 'inch',
    'thin', 'that', 'them', 'this', 'then', 'math', 'bath', 'path', 'with',
    'when', 'whip', 'whiz',
    'ring', 'sing', 'king', 'long', 'song', 'hung', 'bang', 'lung',
    'back', 'deck', 'kick', 'lock', 'luck', 'neck', 'pick', 'rock', 'sock', 'duck',
    // R-Controlled words (ar, er, ir, or, ur)
    'car', 'far', 'jar', 'bar', 'star', 'park', 'dark', 'mark',
    'her', 'fern',
    'sir', 'bird', 'girl', 'dirt', 'firm',
    'for', 'corn', 'fork', 'cord', 'torn', 'form',
    'fur', 'burn', 'turn', 'hurt', 'curb', 'surf'
];"""

if OLD_POOL in content:
    content = content.replace(OLD_POOL, NEW_POOL, 1)
    print("[FIX 2] Expanded SOUND_MATCH_POOL with digraph + R-controlled words")
else:
    print("[FIX 2] SKIP: Original pool pattern not found (may already be expanded)")

# ============================================================================
# Write back
# ============================================================================

new_len = len(content)
print(f"\n[RESULT] File size: {original_len:,} -> {new_len:,} bytes (diff: {new_len - original_len:+,})")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("[DONE] Changes written successfully")
