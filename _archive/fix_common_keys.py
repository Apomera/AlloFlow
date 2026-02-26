"""Fix the common section: 
1. Add comma after save_reminder_tts
2. Fix indentation and quote style of injected keys
3. Quote 'continue' since it's a reserved word
"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# Find the broken area around L11662
fixed = 0
for i in range(11655, 11675):
    if i >= len(lines):
        break
    
    # Fix 1: Add comma to save_reminder_tts line
    if 'save_reminder_tts' in lines[i] and lines[i].strip().endswith('"'):
        lines[i] = lines[i].rstrip()
        if lines[i].endswith('\r'):
            lines[i] = lines[i][:-1]
        lines[i] = lines[i] + ',' + le
        fixed += 1
        print("Fixed L" + str(i+1) + ": added trailing comma to save_reminder_tts")
    
    # Fix 2: Fix indentation and quote style of injected keys  
    # Change: "      adjusting: 'Adjusting...'," to "    adjusting: \"Adjusting...\","
    injected_keys = ['adjusting', 'character', 'clear', 'coming_soon', 'confirm', 'continue', 'maximize', 'this_topic', 'you']
    for key in injected_keys:
        stripped = lines[i].strip()
        if stripped.startswith(key + ":") or stripped.startswith("'" + key + "':"):
            # Extract value
            val_start = stripped.index("'", stripped.index(':'))
            val = stripped[val_start+1:stripped.rindex("'")]
            
            # Use quotes for 'continue' since it's a reserved word
            if key == 'continue':
                new_line = '    "continue": "' + val + '",' + le
            else:
                new_line = '    ' + key + ': "' + val + '",' + le
            
            lines[i] = new_line
            fixed += 1
            print("Fixed L" + str(i+1) + ": " + key)

# Remove blank line between save_reminder_tts and the new keys if there is one
for i in range(11658, 11670):
    if i >= len(lines):
        break
    if 'save_reminder_tts' in lines[i]:
        # Check if next line is blank
        if i + 1 < len(lines) and lines[i+1].strip() == '':
            # Remove blank line
            del lines[i+1]
            print("Removed blank line at L" + str(i+2))
            break

print("\nTotal fixes: " + str(fixed))
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Lines: " + str(len(lines)))
