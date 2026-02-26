
file_path = "AlloFlowANTI.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip_next = False

# Track duplicates to avoid sequential repeats of specific lines
for i in range(len(lines)):
    if skip_next:
        skip_next = False
        continue
        
    line = lines[i]
    stripped = line.strip()
    
    # 1. Dedupe highlightedIndex prop
    # If this line is highlightedIndex prop AND the previous line was also highlightedIndex prop
    if "highlightedIndex={highlightedRhymeIndex}" in line:
        if len(new_lines) > 0 and "highlightedIndex={highlightedRhymeIndex}" in new_lines[-1]:
            continue # Skip duplicate
            
    # 2. Dedupe Rhyme Fix Block
    # The block is:
    # // FIX: Play target word before options
    # await new Promise(r => setTimeout(r, 400));
    # await handleAudio(currentWordSoundsWord);
    
    # If we see the comment, check if the previous 3 lines matches this block?
    # Or cleaner: if we see the comment, check if the *next* block is identical?
    
    if "// FIX: Play target word before options" in line:
        # Check if the generated block repeats starting at i
        # We need to see if we just added this block?
        # Actually, simpler: check if new_lines[-3:] matches the block we are about to add?
        # The block is usually 3 lines.
        
        # Let's verify duplication pattern:
        # It appeared as:
        # FIX...
        # await...
        # await...
        # FIX...
        # await...
        # await...
        
        is_dup = False
        if len(new_lines) >= 3:
            prev_1 = new_lines[-1].strip()
            prev_2 = new_lines[-2].strip()
            prev_3 = new_lines[-3].strip()
            
            if "await handleAudio(currentWordSoundsWord);" in prev_1 and \
               "await new Promise(r => setTimeout(r, 400));" in prev_2 and \
               "// FIX: Play target word before options" in prev_3:
                is_dup = True
        
        if is_dup:
            # We are currently at the start of the 2nd block.
            # Skip this line AND the next 2 lines.
            # But wait, I'm inside a loop. I can skip current line, but need to skip next 2.
            # I'll modify the loop to support skip count? 
            # Actually easier: just don't add this line, and mark to skip next 2.
            # We need to verify next lines are indeed the dupes before skipping?
            # Yes.
            if i+2 < len(lines):
                next_1 = lines[i+1].strip()
                next_2 = lines[i+2].strip()
                if "await new Promise" in next_1 and "await handleAudio" in next_2:
                    # Proceed to skip this line and next 2.
                    # Setting a counter would be best.
                    # Since I am in a for loop using range, I can't easily jump ahead unless I use while.
                    # But I'm iterating `lines`.
                    # I'll rely on a skip_count variable.
                    pass 
    
    # Reformulate loop to while
    pass

# Better logic with while loop
i = 0
final_lines = []
while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    
    # 1. Dedupe highlightedIndex
    if "highlightedIndex={highlightedRhymeIndex}" in line:
        # Check if we just added it
        if len(final_lines) > 0 and "highlightedIndex={highlightedRhymeIndex}" in final_lines[-1]:
            i += 1
            print("Deduped highlightedIndex")
            continue

    # 2. Dedupe Rhyme Fix Block
    if "// FIX: Play target word before options" in stripped:
        # Check if we recently added this block
        if len(final_lines) >= 3:
            if "// FIX: Play target" in final_lines[-3] and \
               "setTimeout(r, 400)" in final_lines[-2] and \
               "handleAudio(currentWordSoundsWord)" in final_lines[-1]:
               
                # Verify current block is complete dup
                if i+2 < len(lines) and \
                   "setTimeout(r, 400)" in lines[i+1] and \
                   "handleAudio(currentWordSoundsWord)" in lines[i+2]:
                    
                    print("Deduped Rhyme Fix Block")
                    i += 3 # Skip this line and next 2
                    continue

    final_lines.append(line)
    i += 1

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print("Cleanup complete.")
