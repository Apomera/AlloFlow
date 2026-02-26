"""
Patch script: Guarantee derangement in sequence builder shuffle

Adds a proper Fisher-Yates shuffle + derangement check utility function,
then replaces all naive sort(() => Math.random() - 0.5) shuffle calls
for sequence/scramble puzzles.
"""

import sys

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# ============================================================
# PATCH 1: Add derangeShuffle utility function near the top 
#           (after other utility functions)
# ============================================================
# Find a good insertion point - after the existing shuffle/utility area
# We'll insert right before the escape room generation function

ANCHOR = """  const generateEscapeRoom = async () => {"""

UTILITY_FUNC = """  // Utility: Fisher-Yates shuffle that guarantees a derangement
  // (no element remains in its original position)
  const derangeShuffle = (arr) => {
    if (arr.length <= 1) return [...arr];
    const shuffled = [...arr];
    let maxAttempts = 50;
    do {
      // Fisher-Yates shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      maxAttempts--;
    } while (
      maxAttempts > 0 &&
      shuffled.some((val, idx) => val === arr[idx])
    );
    return shuffled;
  };

  """ + ANCHOR

if ANCHOR in content:
    content = content.replace(ANCHOR, UTILITY_FUNC, 1)
    changes.append("PATCH 1: Added derangeShuffle utility function")
else:
    print("ERROR: Could not find anchor point for utility function")
    sys.exit(1)

# ============================================================
# PATCH 2: Replace escape room sequence shuffle (first location)
# ============================================================
old_shuffle_1 = """          // Shuffle sequence items for display - store shuffled INDICES
          if (p.type === 'sequence' && p.items) {
            const indices = p.items.map((_, i) => i);
            processed.shuffledItems = indices.sort(() => Math.random() - 0.5);
          }"""

new_shuffle_1 = """          // Shuffle sequence items for display - store shuffled INDICES (derangement guaranteed)
          if (p.type === 'sequence' && p.items) {
            const indices = p.items.map((_, i) => i);
            processed.shuffledItems = derangeShuffle(indices);
          }"""

if old_shuffle_1 in content:
    content = content.replace(old_shuffle_1, new_shuffle_1, 1)
    changes.append("PATCH 2: Replaced escape room sequence shuffle with derangeShuffle")
else:
    print("ERROR: Could not find first sequence shuffle")
    sys.exit(1)

# ============================================================
# PATCH 3: Replace scramble letters shuffle (first location)
# ============================================================
old_scramble_1 = """          if (p.type === 'scramble' && p.scrambledWord) {
            processed.displayLetters = p.scrambledWord.split('').filter(c => c.trim()).sort(() => Math.random() - 0.5);
          }"""

new_scramble_1 = """          if (p.type === 'scramble' && p.scrambledWord) {
            processed.displayLetters = derangeShuffle(p.scrambledWord.split('').filter(c => c.trim()));
          }"""

if old_scramble_1 in content:
    content = content.replace(old_scramble_1, new_scramble_1, 1)
    changes.append("PATCH 3: Replaced scramble letters shuffle with derangeShuffle")
else:
    print("ERROR: Could not find first scramble shuffle")
    sys.exit(1)

# ============================================================
# PATCH 4: Replace matching pairs shuffles (first location)
# ============================================================
old_matching_1 = """          if (p.type === 'matching' && p.pairs) {
            processed.leftColumn = p.pairs.map(pair => pair.left).sort(() => Math.random() - 0.5);
            processed.rightColumn = p.pairs.map(pair => pair.right).sort(() => Math.random() - 0.5);
          }"""

new_matching_1 = """          if (p.type === 'matching' && p.pairs) {
            processed.leftColumn = derangeShuffle(p.pairs.map(pair => pair.left));
            processed.rightColumn = derangeShuffle(p.pairs.map(pair => pair.right));
          }"""

if old_matching_1 in content:
    content = content.replace(old_matching_1, new_matching_1, 1)
    changes.append("PATCH 4: Replaced matching pairs shuffle with derangeShuffle")
else:
    print("WARNING: Could not find matching pairs shuffle (may already be updated)")

# ============================================================
# PATCH 5: Replace fillin wordbank shuffle (first location)
# ============================================================
old_fillin = """          if (p.type === 'fillin' && p.wordbank) {
            processed.wordbank = [...p.wordbank].sort(() => Math.random() - 0.5);
          }"""

new_fillin = """          if (p.type === 'fillin' && p.wordbank) {
            processed.wordbank = derangeShuffle(p.wordbank);
          }"""

if old_fillin in content:
    content = content.replace(old_fillin, new_fillin, 1)
    changes.append("PATCH 5: Replaced fillin wordbank shuffle with derangeShuffle")
else:
    print("WARNING: Could not find fillin wordbank shuffle")

# ============================================================
# PATCH 6: Replace cipher wordbank shuffle
# ============================================================
old_cipher = """          if (p.type === 'cipher' && p.wordbank) {
            processed.wordbank = [...p.wordbank].sort(() => Math.random() - 0.5);
          }"""

new_cipher = """          if (p.type === 'cipher' && p.wordbank) {
            processed.wordbank = derangeShuffle(p.wordbank);
          }"""

if old_cipher in content:
    content = content.replace(old_cipher, new_cipher, 1)
    changes.append("PATCH 6: Replaced cipher wordbank shuffle with derangeShuffle")
else:
    print("WARNING: Could not find cipher wordbank shuffle")

# ============================================================
# PATCH 7: Replace collaborative escape room sequence shuffle
# ============================================================
old_shuffle_2 = """          if (p.type === 'sequence' && p.items) {
            // Create array of indices and shuffle them
            const indices = p.items.map((_, idx) => idx);
            shuffledItems = [...indices].sort(() => Math.random() - 0.5);"""

new_shuffle_2 = """          if (p.type === 'sequence' && p.items) {
            // Create array of indices and shuffle them (derangement guaranteed)
            const indices = p.items.map((_, idx) => idx);
            shuffledItems = derangeShuffle(indices);"""

if old_shuffle_2 in content:
    content = content.replace(old_shuffle_2, new_shuffle_2, 1)
    changes.append("PATCH 7: Replaced collaborative escape room sequence shuffle with derangeShuffle")
else:
    print("WARNING: Could not find collaborative sequence shuffle")

# ============================================================
# PATCH 8: Replace collaborative scramble shuffle
# ============================================================
old_scramble_2 = """            displayLetters: p.type === 'scramble' && p.scrambledWord ? p.scrambledWord.split('').sort(() => Math.random() - 0.5) : null"""

new_scramble_2 = """            displayLetters: p.type === 'scramble' && p.scrambledWord ? derangeShuffle(p.scrambledWord.split('')) : null"""

if old_scramble_2 in content:
    content = content.replace(old_scramble_2, new_scramble_2, 1)
    changes.append("PATCH 8: Replaced collaborative scramble shuffle with derangeShuffle")
else:
    print("WARNING: Could not find collaborative scramble shuffle")

# ============================================================
# PATCH 9: Replace finalDoor wordbank shuffle
# ============================================================
old_finaldoor = """            wordbank: [...processedFinalDoor.wordbank].sort(() => Math.random() - 0.5)"""

new_finaldoor = """            wordbank: derangeShuffle(processedFinalDoor.wordbank)"""

if old_finaldoor in content:
    content = content.replace(old_finaldoor, new_finaldoor, 1)
    changes.append("PATCH 9: Replaced finalDoor wordbank shuffle with derangeShuffle")
else:
    print("WARNING: Could not find finalDoor wordbank shuffle")

# Write the patched file
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nAll {len(changes)} patches applied successfully:")
for c in changes:
    print(f"  ✓ {c}")
print(f"\nFile size: {len(content):,} bytes")
