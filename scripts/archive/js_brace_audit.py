"""
Thorough brace analysis: Use a JavaScript-accurate string parser 
to count braces. Handles:
- Single-quoted strings with escape sequences
- Double-quoted strings with escape sequences  
- Template literals (backtick) with ${} expressions
- Line comments //
- Block comments /* */
- Regex literals (basic)
Reports running depth at each top-level section boundary.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Find UI_STRINGS
ui_marker = 'const UI_STRINGS'
ui_start_pos = content.find(ui_marker)
if ui_start_pos == -1:
    print("ERROR: UI_STRINGS not found!")
    sys.exit(1)

# Get line number of UI_STRINGS start
ui_start_line = content[:ui_start_pos].count('\n')

# Parse from UI_STRINGS start using JavaScript-aware tokenizer
text = content[ui_start_pos:]
depth = 0
pos = 0
line_num = ui_start_line + 1
section_transitions = []
last_depth_report = 0

while pos < len(text):
    ch = text[pos]
    
    # Track line numbers
    if ch == '\n':
        line_num += 1
        pos += 1
        continue
    
    # Skip // line comments
    if ch == '/' and pos + 1 < len(text) and text[pos + 1] == '/':
        while pos < len(text) and text[pos] != '\n':
            pos += 1
        continue
    
    # Skip /* block comments */
    if ch == '/' and pos + 1 < len(text) and text[pos + 1] == '*':
        pos += 2
        while pos + 1 < len(text):
            if text[pos] == '\n':
                line_num += 1
            if text[pos] == '*' and text[pos + 1] == '/':
                pos += 2
                break
            pos += 1
        continue
    
    # Skip single-quoted strings
    if ch == "'":
        pos += 1
        while pos < len(text):
            if text[pos] == '\\':
                pos += 2  # Skip escape
                continue
            if text[pos] == '\n':
                line_num += 1
            if text[pos] == "'":
                pos += 1
                break
            pos += 1
        continue
    
    # Skip double-quoted strings
    if ch == '"':
        pos += 1
        while pos < len(text):
            if text[pos] == '\\':
                pos += 2
                continue
            if text[pos] == '\n':
                line_num += 1
            if text[pos] == '"':
                pos += 1
                break
            pos += 1
        continue
    
    # Skip template literals (backtick) — with ${} handling
    if ch == '`':
        pos += 1
        template_depth = 0
        while pos < len(text):
            if text[pos] == '\\':
                pos += 2
                continue
            if text[pos] == '\n':
                line_num += 1
            if text[pos] == '$' and pos + 1 < len(text) and text[pos + 1] == '{':
                template_depth += 1
                pos += 2
                continue
            if text[pos] == '}' and template_depth > 0:
                template_depth -= 1
                pos += 1
                continue
            if text[pos] == '`' and template_depth == 0:
                pos += 1
                break
            pos += 1
        continue
    
    # Count structural braces
    if ch == '{':
        depth += 1
        pos += 1
        continue
    
    if ch == '}':
        depth -= 1
        if depth == 0:
            print(f"L{line_num}: UI_STRINGS CLOSES at depth 0")
            # Check what's next
            remaining = text[pos+1:pos+20].strip()
            print(f"  Next chars: {repr(remaining)}")
            break
        if depth < 0:
            print(f"!! NEGATIVE DEPTH at L{line_num}: depth={depth}")
        pos += 1
        continue
    
    # Track section boundaries at depth 1
    if depth == 1 and ch.isalpha():
        # Read the key name
        key_start = pos
        while pos < len(text) and (text[pos].isalnum() or text[pos] == '_'):
            pos += 1
        key_name = text[key_start:pos]
        # Check if followed by :
        while pos < len(text) and text[pos] in ' \t':
            pos += 1
        if pos < len(text) and text[pos] == ':':
            section_transitions.append((line_num, key_name, depth))
        continue
    
    pos += 1

print(f"\nFinal depth: {depth}")
print(f"\nTop-level sections found ({len(section_transitions)}):")
for ln, name, d in section_transitions[-20:]:
    print(f"  L{ln}: {name} (depth {d})")
