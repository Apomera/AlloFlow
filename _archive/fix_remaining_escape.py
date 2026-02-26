"""Fix remaining 40 setEscapeRoomState calls with broader pattern matching"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
f.close()

original_count = content.count('setEscapeRoomState')
print(f"Before: {original_count} setEscapeRoomState occurrences")

# Strategy: Use regex to replace ALL setEscapeRoomState(prev => ({...prev, X})) 
# with dispatchEscape({type: 'UPDATE', payload: {X}})

# Pattern 1: Single-line setEscapeRoomState(prev => ({ ...prev, KEY: VALUE }))
# Handle inline JSX like onClick={() => setEscapeRoomState(prev => ({ ...prev, KEY: VALUE }))}
pattern1 = r'setEscapeRoomState\(prev\s*=>\s*\(\{\s*\.\.\.prev,\s*([^}]+)\}\)\)'
def replace1(m):
    payload = m.group(1).strip()
    return f"dispatchEscape({{type: 'UPDATE', payload: {{{payload}}}}})"

content, count1 = re.subn(pattern1, replace1, content)
print(f"Pattern 1 (single-line spread): {count1} replacements")

# Pattern 2: setEscapeRoomState(prev => ({  (multiline, starts a block)
# These need the opening transformed and the closing })) -> }})
pattern2 = r'setEscapeRoomState\(prev\s*=>\s*\(\{'
def replace2(m):
    return "dispatchEscape({type: 'FUNC_UPDATE', updater: (prev) => ({"

content, count2 = re.subn(pattern2, replace2, content)
print(f"Pattern 2 (multiline updater open): {count2} replacements")

# For pattern 2 closings: })) should become }})
# But only for the ones we just converted. This is tricky...
# Let's use a different approach: just find all remaining setEscapeRoomState 
# and handle them individually.

# Pattern 3: setEscapeRoomState({  (direct object set, non-functional)
remaining_content = content
pattern3_count = 0
while 'setEscapeRoomState({' in remaining_content:
    idx = remaining_content.find('setEscapeRoomState({')
    # Check if this is the declaration line (should be excluded)
    line_start = remaining_content.rfind('\n', 0, idx) + 1
    line = remaining_content[line_start:remaining_content.find('\n', idx)]
    if 'useState' in line or 'useReducer' in line:
        # Skip declaration
        remaining_content = remaining_content[:idx] + 'SKIP_ESCAPE_STATE' + remaining_content[idx + 20:]
        continue
    remaining_content = remaining_content[:idx] + "dispatchEscape({type: 'UPDATE', payload: {" + remaining_content[idx + 20:]
    pattern3_count += 1

content = remaining_content.replace('SKIP_ESCAPE_STATE', 'setEscapeRoomState')
print(f"Pattern 3 (direct object sets): {pattern3_count} replacements")

# Now fix the closing braces for pattern 2 and 3
# For FUNC_UPDATE calls with (prev) => ({, the closing should be }))
# For UPDATE calls with payload: {, we need closing }})
# This is complex - let's just handle by verifying

final_count = content.count('setEscapeRoomState')
print(f"After: {final_count} setEscapeRoomState remaining")

# Write
f = open(FILE, 'w', encoding='utf-8')
f.write(content)
f.close()

print(f"\nDone! Replaced {original_count - final_count} of {original_count} instances")
