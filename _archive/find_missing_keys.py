"""
Find all t() calls and check which keys are missing from UI_STRINGS.
Also find the quiz.hide_answer usage specifically.
"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
f.close()

lines = content.split('\n')

# 1. Find quiz.hide_answer usage
print("=== quiz.hide_answer USAGE ===")
for i, line in enumerate(lines):
    if 'quiz.hide_answer' in line:
        print("L" + str(i+1) + ": " + line.strip()[:200])

# 2. Find ALL t('key') calls and extract the keys
all_keys = set()
pattern = r"t\('([^']+)'\)"
for match in re.finditer(pattern, content):
    all_keys.add(match.group(1))

# Also check t("key") with double quotes
pattern2 = r't\("([^"]+)"\)'
for match in re.finditer(pattern2, content):
    all_keys.add(match.group(1))

print("\nTotal unique t() keys: " + str(len(all_keys)))

# 3. Find the UI_STRINGS object and extract defined keys  
# UI_STRINGS is a nested object, so we need to find all leaf keys
# Format: quiz: { hide_answer: "..." }
# The t() function likely traverses with dot notation

# Find all string values defined in UI_STRINGS (look for pattern key: "value" or key: 'value')
ui_strings_start = None
ui_strings_end = None
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line or 'UI_STRINGS = {' in line:
        ui_strings_start = i
    if ui_strings_start and i > ui_strings_start:
        # Count braces to find end
        pass

# Instead, let's just check which keys from t() calls exist as substrings in UI_STRINGS section
# Find the UI_STRINGS section
print("\n=== UI_STRINGS LOCATION ===")
for i, line in enumerate(lines):
    if 'UI_STRINGS' in line and ('const ' in line or 'let ' in line):
        print("L" + str(i+1) + ": " + line.strip()[:200])

# 4. Check specifically for quiz section keys
print("\n=== quiz.* keys used in t() ===")
quiz_keys = sorted([k for k in all_keys if k.startswith('quiz.')])
for k in quiz_keys:
    print("  " + k)

# 5. Check if quiz section exists in UI_STRINGS
print("\n=== quiz section in UI_STRINGS ===")
for i, line in enumerate(lines):
    if "'quiz'" in line or '"quiz"' in line or 'quiz:' in line:
        if i > 0 and ('UI_STRINGS' in lines[max(0,i-50):i+1].__repr__() or 'hide_answer' in line or 'show_answer' in line):
            print("L" + str(i+1) + ": " + line.strip()[:200])

# 6. Find escape_room.* keys
print("\n=== escape_room.* keys used ===")
escape_keys = sorted([k for k in all_keys if k.startswith('escape_room.')])
for k in escape_keys:
    print("  " + k)

# Write all keys to file for review
out = open('_all_t_keys.txt', 'w', encoding='utf-8')
for k in sorted(all_keys):
    out.write(k + "\n")
out.close()
print("\nAll " + str(len(all_keys)) + " keys written to _all_t_keys.txt")
