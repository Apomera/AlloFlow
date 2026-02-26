"""
COMPREHENSIVE FIX: Find ALL injected single-quoted keys and fix them.
Issues:
1. Single quotes should be double quotes to match existing style
2. Indentation may be wrong (6 spaces instead of 4/6 depending on section)
3. Previous line may be missing trailing comma
"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# JS reserved words that need quoting as keys
RESERVED = {'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete', 
            'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
            'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
            'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
            'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
            'protected', 'public', 'static', 'yield'}

# Find the injected keys - they match pattern: 6 spaces + key: 'value',
# The keys I added all use single quotes for values
# Pattern: "      key: 'value',"
injected_pattern = re.compile(r"^      (\w+): '([^']*)',\s*$")

fixes = 0
comma_fixes = 0

for i in range(len(lines)):
    match = injected_pattern.match(lines[i].rstrip('\r\n'))
    if match:
        key = match.group(1)
        val = match.group(2)
        
        # Determine correct indentation by looking at nearby defined keys
        indent = '    '  # Default 4 spaces  
        for j in range(max(0, i-20), i):
            s = lines[j].lstrip()
            if s and s[0] != '/' and ':' in s and ('"' in s or "'" in s):
                leading = len(lines[j]) - len(lines[j].lstrip())
                if leading > 0:
                    indent = ' ' * leading
                    break
        
        # Handle reserved words
        if key in RESERVED:
            new_line = indent + '"' + key + '": "' + val + '",' + le
        else:
            new_line = indent + key + ': "' + val + '",' + le
        
        if new_line != lines[i]:
            lines[i] = new_line
            fixes += 1
        
        # Check if previous non-blank line is missing comma
        for j in range(i-1, max(0, i-3), -1):
            if lines[j].strip():
                # Check if it ends with a value but no comma
                stripped = lines[j].rstrip('\r\n').rstrip()
                if stripped.endswith('"') and not stripped.endswith('",') and not stripped.endswith('{'):
                    lines[j] = stripped + ',' + le
                    comma_fixes += 1
                    print("Added comma at L" + str(j+1))
                break

print("Fixed " + str(fixes) + " injected key lines")
print("Fixed " + str(comma_fixes) + " missing commas")

f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Lines: " + str(len(lines)))
