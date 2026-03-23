import subprocess

def find_iife_bounds(lines, search_str):
    start = -1
    for i, line in enumerate(lines):
        if search_str in line and 'stemLabTab' in line:
            # Go back one line if it's the `(function () {` pattern
            if i > 0 and ('(function' in lines[i-1] or 'const _' in lines[i-1]):
                start = i - 1
            else:
                start = i
            break
            
    if start == -1: return None, None
            
    brace_depth = 0
    paren_depth = 0
    started = False
    
    for i in range(start, len(lines)):
        line = lines[i]
        
        # Super simple tokenization to ignore strings/regex
        in_str = False
        str_char = ''
        escape = False
        
        for ch in line:
            if escape:
                escape = False
                continue
            if ch == '\\':
                escape = True
                continue
                
            if in_str:
                if ch == str_char:
                    in_str = False
            elif ch in ("'", '"', '`'):
                in_str = True
                str_char = ch
            else:
                if ch == '{':
                    brace_depth += 1
                    started = True
                elif ch == '}':
                    brace_depth -= 1
                elif ch == '(':
                    paren_depth += 1
                elif ch == ')':
                    paren_depth -= 1
        
        if started and brace_depth == 0:
            # Wait for parens to close the IIFE
            if paren_depth <= 0:
                # Let's peek ahead to see if there's an immediate trailing `, ` or `)`
                return start, i

    return start, None

result = subprocess.run(['git', 'show', '46ecdf2:stem_lab_module.js'], capture_output=True, text=True, encoding='utf-8')
old_lines = result.stdout.split('\n')

with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    cur_lines = f.readlines()

tools = [
    ('titrationLab', "stemLabTool === 'titrationLab'"),
    ('artStudio', "stemLabTool === 'artStudio'")
]

for name, search in tools:
    old_s, old_e = find_iife_bounds(old_lines, search)
    cur_s, cur_e = find_iife_bounds(cur_lines, search)
    print(f"{name}:")
    print(f"  Old: {old_s} to {old_e} ({old_e - old_s + 1 if old_s and old_e else 'FAIL'})")
    if old_s and old_e:
        print(f"    Ends with: {old_lines[old_e].strip()[:50]}")
    print(f"  Cur: {cur_s} to {cur_e} ({cur_e - cur_s + 1 if cur_s and cur_e else 'FAIL'})")
    if cur_s and cur_e:
        print(f"    Ends with: {cur_lines[cur_e].strip()[:50]}")
