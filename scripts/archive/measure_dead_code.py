"""
Measure the size of dead code items and build removal plan.
For each dead item, find its full extent (from definition to closing brace).
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Dead code items with their line numbers
dead_items = [
    # Callbacks
    {'name': 'recordEscapeRoomCompletion', 'line': 30956, 'type': 'callback'},
    {'name': 'recordFluencyAssessment', 'line': 30964, 'type': 'callback'},
    {'name': 'recordFlashcardInteraction', 'line': 30972, 'type': 'callback'},
    {'name': 'trackResourceTime', 'line': 30988, 'type': 'callback'},
    # Arrow functions  
    {'name': 'generatePersonaSuggestions', 'line': 47692, 'type': 'arrow_fn'},
    {'name': 'handlePersonaWordClick', 'line': 48036, 'type': 'arrow_fn'},
    {'name': 'generateInterviewSummary', 'line': 48481, 'type': 'arrow_fn'},
    # Constants
    {'name': 'PHONEME_PRONUNCIATIONS', 'line': 932, 'type': 'constant'},
    {'name': 'PHONOLOGICAL_ACTIVITIES', 'line': 1005, 'type': 'constant'},
    {'name': 'ORTHOGRAPHIC_ACTIVITIES', 'line': 1006, 'type': 'constant'},
    {'name': 'SAFETY_BLACKLIST', 'line': 1430, 'type': 'constant'},
    {'name': 'IPA_GRAPHEME_OPTIONS', 'line': 2405, 'type': 'constant'},
    {'name': 'AUDIO_BANK_PHONEMES', 'line': 4619, 'type': 'constant'},
    {'name': 'PREFETCH_BUFFER_SIZE', 'line': 5333, 'type': 'constant'},
    {'name': 'MAX_CHUNK_SIZE', 'line': 19481, 'type': 'constant'},
]

total_lines = 0

for item in dead_items:
    start = item['line'] - 1  # 0-indexed
    
    # Find the end of this definition
    # Track brace/bracket/paren depth
    depth = 0
    end = start
    started = False
    
    for j in range(start, min(start + 500, len(lines))):
        line = lines[j]
        for ch in line:
            if ch in '{([':
                depth += 1
                started = True
            elif ch in '})]':
                depth -= 1
        
        # For single-line items (like PREFETCH_BUFFER_SIZE = 10;)
        if not started and ';' in line:
            end = j
            break
        
        if started and depth <= 0:
            end = j
            break
    
    # For useCallback items, the closing might be }, [deps]);
    # Check if the line after end has the deps array
    if item['type'] == 'callback' and end + 1 < len(lines):
        next_line = lines[end + 1].strip() if end + 1 < len(lines) else ''
        if next_line.startswith('}') or next_line.startswith(']'):
            # Check for the closing of useCallback
            for j in range(end + 1, min(end + 4, len(lines))):
                if ');' in lines[j]:
                    end = j
                    break
    
    size = end - start + 1
    total_lines += size
    item['end'] = end + 1  # 1-indexed
    item['size'] = size
    
    # Show first and last line for verification
    first_line = lines[start].strip()[:80]
    last_line = lines[end].strip()[:80]
    print(f"  {item['name']}: L{item['line']}-L{item['end']} ({size} lines)")
    print(f"    START: {first_line}")
    print(f"    END:   {last_line}")
    print()

print(f"\nTotal dead code: {total_lines} lines")
print(f"  That's {total_lines/len(lines)*100:.2f}% of the file")

# Estimate KB saved
avg_line_bytes = sum(len(l) for l in lines) / len(lines)
print(f"  Estimated size: {total_lines * avg_line_bytes / 1024:.1f} KB")
