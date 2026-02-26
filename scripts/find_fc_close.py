"""
Find where the flashcard conditional block (L65287) closes.
Track brace depth from L65287 onwards.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Start at L65287: {isInteractiveFlashcards && generatedContent?.data && (
# Count { and } to find the matching closing
depth = 0
in_string = False
start = 65286  # 0-indexed

for i in range(start, min(len(lines), start + 600)):
    line = lines[i]
    for ch in line:
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                print("Flashcard block CLOSES at L%d" % (i+1))
                print("  Line: %s" % line.strip()[:150])
                # Check if WS modal is before or after
                if i+1 < 65777:
                    print("  -> WS modal at L65777 is AFTER this block (NOT inside) ✅")
                else:
                    print("  -> WS modal at L65777 is INSIDE this block! ⚠️ THIS IS THE BUG!")
                
                # Show what's around the close
                for j in range(max(0, i-3), min(len(lines), i+5)):
                    marker = ">>>" if j == i else "   "
                    print("%s L%d: %s" % (marker, j+1, lines[j].rstrip()[:150]))
                
                # Now check: where is L65777 relative to L65707 (end of flashcards in backup)?
                print("\n=== Is L65707 (old flashcards end) before L65777? ===")
                print("Flashcard block ends: L%d" % (i+1))
                print("WS modal IIFE: L65777")
                exit()
    if depth == 0 and i > start:
        break
        
print("WARNING: Did not find closing brace for flashcard block")
