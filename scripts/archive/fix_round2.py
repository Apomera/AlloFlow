"""
Line-based fix for 4 issues (handles mixed line endings).
Reads file as lines, modifies by line number, writes back.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'rb') as f:
    raw = f.read()

# Normalize ALL line endings to \r\n first
raw = raw.replace(b'\r\r\n', b'\r\n')  # Fix double CR from previous insert
raw = raw.replace(b'\r\n', b'\n').replace(b'\r', b'\n').replace(b'\n', b'\r\n')

lines = raw.decode('utf-8-sig').split('\r\n')
print(f"Total lines: {len(lines)}")
changes = 0

# =============================================
# FIX 1: Remove dedup guard (L6803-6809) and unused ref (L3309)
# =============================================
# Find and remove lastInstructionPlayRef declaration
for i in range(len(lines)):
    if "lastInstructionPlayRef = React.useRef" in lines[i]:
        print(f"[FIX1a] Removing ref at L{i+1}: {lines[i].strip()[:80]}")
        lines[i] = None  # Mark for deletion
        changes += 1
        break

# Find and remove dedup guard block (FIX: Dedup guard ... lastInstructionPlayRef = instructionKey)
dedup_start = None
dedup_end = None
for i in range(len(lines)):
    if lines[i] and "FIX: Dedup guard" in lines[i]:
        dedup_start = i
    if lines[i] and dedup_start and "lastInstructionPlayRef.current = instructionKey" in lines[i]:
        dedup_end = i
        break

if dedup_start is not None and dedup_end is not None:
    print(f"[FIX1b] Removing dedup guard L{dedup_start+1}-L{dedup_end+1}")
    for i in range(dedup_start, dedup_end + 1):
        lines[i] = None  # Mark for deletion
    changes += 1
else:
    print(f"[WARN] FIX1b: dedup_start={dedup_start}, dedup_end={dedup_end}")

# =============================================
# FIX 2: Hide instruction bar for counting
# Find the line with <div className="flex items-center justify-center gap-2 mt-2">
# that's AFTER the "Tap to hear" button, wrap with counting guard
# =============================================
for i in range(8300, min(len(lines), 8400)):
    if lines[i] and 'flex items-center justify-center gap-2 mt-2' in lines[i]:
        old = lines[i]
        lines[i] = old.replace(
            '<div className="flex items-center justify-center gap-2 mt-2">',
            "{wordSoundsActivity !== 'counting' && <div className=\"flex items-center justify-center gap-2 mt-2\">"
        )
        if lines[i] != old:
            print(f"[FIX2a] Added counting guard at L{i+1}")
            changes += 1
        break

# Find the closing </div> for the instruction bar — it's the one right before </div> that closes the main area
# Pattern: </button>\n             </div>\n        </div>
for i in range(8370, min(len(lines), 8400)):
    if lines[i] and lines[i].strip() == '</button>' and i+1 < len(lines):
        next_line = lines[i+1] if lines[i+1] else ''
        if next_line.strip() == '</div>':
            lines[i+1] = next_line.replace('</div>', '</div>}')
            print(f"[FIX2b] Closed counting conditional at L{i+2}: {lines[i+1].strip()}")
            changes += 1
            break

# =============================================
# FIX 3: Fix the instruction repeat button for isolation
# Replace the onClick handler content
# =============================================
for i in range(8360, min(len(lines), 8400)):
    if lines[i] and "Check for pre-recorded instruction audio first" in lines[i]:
        # Found the comment — replace the next few lines
        # Find the block: from INSTRUCTION_AUDIO check to the closing }
        j = i + 1
        block_end = None
        brace_count = 0
        while j < len(lines) and lines[j]:
            if 'INSTRUCTION_AUDIO' in lines[j] and brace_count == 0:
                brace_count = 1
            if lines[j].strip() == '}':
                block_end = j
                break
            j += 1
        
        if block_end:
            # Replace lines i through block_end with new logic
            new_handler = [
                '                         // FIX: Use correct audio source per activity (with ISOLATION_AUDIO for Find Sounds)',
                '                         const instKeyMap = { orthography: "inst_orthography", spelling_bee: "inst_spelling_bee", word_scramble: "inst_word_scramble", missing_letter: "inst_missing_letter", counting: "inst_counting", blending: "inst_blending", segmentation: "inst_segmentation", rhyming: "inst_rhyming", letter_tracing: "inst_letter_tracing", sound_sort: "inst_word_families", word_families: "inst_word_families", mapping: "mapping" };',
                '                         const rptKey = instKeyMap[wordSoundsActivity] || wordSoundsActivity;',
                "                         if (wordSoundsActivity === 'isolation' && typeof ISOLATION_AUDIO !== 'undefined') {",
                "                             const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];",
                '                             const posKey = ordinals[isolationState?.currentPosition || 0] || "fallback";',
                '                             if (ISOLATION_AUDIO[posKey]) { handleAudio(ISOLATION_AUDIO[posKey]); }',
                "                             else { handleAudio(ts('word_sounds.isolation_prompt')); }",
                '                         } else if (typeof INSTRUCTION_AUDIO !== "undefined" && (INSTRUCTION_AUDIO[rptKey] || INSTRUCTION_AUDIO[wordSoundsActivity])) {',
                '                             handleAudio(INSTRUCTION_AUDIO[rptKey] || INSTRUCTION_AUDIO[wordSoundsActivity]);',
                '                         } else {',
                "                             handleAudio(ts(`word_sounds.${wordSoundsActivity}_prompt`));",
                '                         }',
            ]
            lines[i:block_end+1] = new_handler
            print(f"[FIX3] Replaced repeat button handler at L{i+1}-L{block_end+1} with ISOLATION_AUDIO support")
            changes += 1
        break

# =============================================
# FIX 4: Increment currentWordIndex after correct answer
# Find the line: const wordIdx = currentWordIndex % preloadedWords.length;
# and add increment + use next index
# =============================================
for i in range(7400, min(len(lines), 7550)):
    if lines[i] and 'currentWordIndex % preloadedWords.length' in lines[i]:
        # Replace "Use current word from buffer" with increment logic
        old_comment_idx = i - 1
        if lines[old_comment_idx] and 'Use current word from buffer' in lines[old_comment_idx]:
            lines[old_comment_idx] = '                // FIX: Advance index FIRST to prevent repeat of same word'
        # Replace the wordIdx line with increment + next index
        lines[i] = '                const wordIdx = (currentWordIndex + 1) % preloadedWords.length; setCurrentWordIndex(prev => prev + 1);'
        print(f"[FIX4] Added currentWordIndex increment at L{i+1}")
        changes += 1
        break

# Remove None-marked lines
lines = [l for l in lines if l is not None]

if changes > 0:
    output = '\r\n'.join(lines)
    with open(FILE, 'wb') as f:
        f.write(output.encode('utf-8'))
    print(f"\n{changes} fix(es) applied. Final lines: {len(lines)}")
else:
    print("\nNo changes made")
