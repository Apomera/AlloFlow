"""
Remove 15 confirmed dead code items from AlloFlowANTI.txt.

All items have 0 references outside their definition line.
We remove them by line ranges, processing from bottom to top
to avoid line number shifts.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

original_count = len(lines)

# Dead code ranges (1-indexed, inclusive) — from measurement script
# MUST be processed bottom-to-top to avoid index shifts
dead_ranges = [
    # Sorted by line number descending
    {'name': 'generateInterviewSummary', 'start': 48481, 'end': 48525},
    {'name': 'handlePersonaWordClick', 'start': 48036, 'end': 48065},
    {'name': 'generatePersonaSuggestions', 'start': 47692, 'end': 47712},
    {'name': 'trackResourceTime', 'start': 30988, 'end': 31006},
    {'name': 'recordFlashcardInteraction', 'start': 30972, 'end': 30986},
    {'name': 'recordFluencyAssessment', 'start': 30964, 'end': 30970},
    {'name': 'recordEscapeRoomCompletion', 'start': 30956, 'end': 30962},
    {'name': 'MAX_CHUNK_SIZE', 'start': 19481, 'end': 19481},
    {'name': 'PREFETCH_BUFFER_SIZE', 'start': 5333, 'end': 5333},
    {'name': 'AUDIO_BANK_PHONEMES', 'start': 4619, 'end': 4630},
    {'name': 'IPA_GRAPHEME_OPTIONS', 'start': 2405, 'end': 2435},
    {'name': 'SAFETY_BLACKLIST', 'start': 1430, 'end': 1439},
    {'name': 'ORTHOGRAPHIC_ACTIVITIES', 'start': 1006, 'end': 1006},
    {'name': 'PHONOLOGICAL_ACTIVITIES', 'start': 1005, 'end': 1005},
    {'name': 'PHONEME_PRONUNCIATIONS', 'start': 932, 'end': 959},
]

# Verify each range before deleting
for dr in dead_ranges:
    start_idx = dr['start'] - 1
    # Verify the start line contains the name
    if dr['name'] not in lines[start_idx]:
        print(f"  WARNING: {dr['name']} not found at L{dr['start']}: {lines[start_idx].strip()[:60]}")
        # Try to find it nearby (±10 lines)
        found = False
        for offset in range(-10, 11):
            check_idx = start_idx + offset
            if 0 <= check_idx < len(lines) and dr['name'] in lines[check_idx]:
                print(f"    Found at L{check_idx + 1} (offset {offset})")
                dr['start'] = check_idx + 1
                # Recalculate end
                dr['end'] = dr['end'] + offset
                found = True
                break
        if not found:
            print(f"    SKIPPING - not found nearby")
            dr['skip'] = True
    else:
        print(f"  OK: {dr['name']} at L{dr['start']}")

# Process removals from bottom to top
total_removed = 0
for dr in dead_ranges:
    if dr.get('skip'):
        continue
    
    start_idx = dr['start'] - 1  # 0-indexed
    end_idx = dr['end']  # exclusive (0-indexed end + 1)
    
    # Remove the lines
    count = end_idx - start_idx
    del lines[start_idx:end_idx]
    total_removed += count
    print(f"  REMOVED {dr['name']}: {count} lines (L{dr['start']}-L{dr['end']})")

# Also remove any blank lines that are now doubled
# (common after removing a block)
cleaned_lines = []
prev_blank = False
extra_removed = 0
for line in lines:
    is_blank = line.strip() == ''
    if is_blank and prev_blank:
        extra_removed += 1
        continue
    cleaned_lines.append(line)
    prev_blank = is_blank

lines = cleaned_lines

# Write
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

final_count = len(lines)
print(f"\nOriginal: {original_count} lines")
print(f"Removed: {total_removed} lines (+ {extra_removed} doubled blanks)")
print(f"Final: {final_count} lines")
print(f"Saved: {original_count - final_count} lines ({(original_count - final_count) / original_count * 100:.2f}%)")
print("DONE")
