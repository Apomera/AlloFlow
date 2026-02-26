"""Fix duplicate rosterGroupId block in history config."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()

# Remove the first duplicate block (lines 52276-52280 with \r\r\n issue)
# We want to keep only ONE instance of the rosterGroupId spread
found_first = False
remove_start = None
remove_end = None

for i, l in enumerate(lines):
    if 'configOverride.rosterGroupId' in l and i > 52270 and i < 52290:
        if not found_first:
            found_first = True
            remove_start = i
            # Find the end of this block (the }: {}) line)
            for j in range(i, min(i + 6, len(lines))):
                if '} : {})' in lines[j]:
                    remove_end = j
                    break
            print(f"First rosterGroupId block: L{remove_start+1} to L{remove_end+1}")
        else:
            print(f"Second rosterGroupId block starts at L{i+1}")
            break

if remove_start is not None and remove_end is not None:
    # Remove the first duplicate block  
    del lines[remove_start:remove_end + 1]
    print(f"Removed duplicate block (lines {remove_start+1}-{remove_end+1})")
    
    # Also fix any \r\r\n on the remaining block
    content = ''.join(lines)
    content = content.replace('\r\r\n', '\r\n')
    open(filepath, 'w', encoding='utf-8').write(content)
    print("Fixed line endings and saved.")
else:
    print("[WARN] Could not find duplicate block to remove")
