filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The broken lines (1-indexed: 66288-66293):
# 66288:                                     )}
# 66289:                                 </div>
# 66290:                             )}
# 66291:                                 )}
# 66292: 
# 66293:                             {adventureState.history) : null}

# Line 66291 is a stray extra `)}` and line 66293 has broken syntax.
# We need to remove line 66291 (the extra `)}`) and fix line 66293.

# Let's print the actual content around there first for verification
print("=== Lines 66286-66296 (1-indexed) ===")
for i in range(66285, 66296):
    print(f"  {i+1}: {lines[i].rstrip()}")

# Fix: Remove the stray `)}` on line 66291 and fix line 66293
# Line 66291 (0-indexed: 66290) is the extra `)}` 
# Line 66293 (0-indexed: 66292) has `{adventureState.history) : null}`

stray_line = lines[66290].strip()
broken_line = lines[66292].strip()

print(f"\nStray line 66291: '{stray_line}'")
print(f"Broken line 66293: '{broken_line}'")

if stray_line == ')}':
    # Remove the stray line
    lines[66290] = ''
    print("✅ Removed stray ')}' on line 66291")
else:
    print(f"⚠️ Line 66291 is not ')}}', it is: '{stray_line}'")

if 'adventureState.history) : null}' in broken_line:
    # This should be: {adventureState.history.length > 0 && (
    # But actually looking at the context, this line is the start of the adventure history rendering.  
    # The original pattern was likely: `{adventureState.history && adventureState.history.length > 0 && (`  
    # or just the history.map directly. Let's just remove this broken line since history.map is on the next line.
    lines[66292] = ''
    print("✅ Removed broken '{adventureState.history) : null}' on line 66293")
else:
    print(f"⚠️ Line 66293 doesn't match expected pattern: '{broken_line}'")

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("\n✅ Patch applied. Re-check compilation.")
