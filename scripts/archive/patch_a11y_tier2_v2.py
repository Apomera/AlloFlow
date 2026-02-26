"""
Context-aware aria-label replacement.

Strategy for each input with aria-label="Text input":
1. If it has data-help-key → use that as basis for the label
2. If it has type="range" → "Adjust [nearby text]"
3. If it has type="checkbox" → "Toggle [nearby text]"  
4. If it has type="file" → "Upload file"
5. If it has placeholder → use placeholder text
6. If has value={varName} → derive from variable name
7. Fallback → use type + nearby comment/heading
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

count = 0

# data-help-key to contextual label mapping
HELP_KEY_MAP = {
    'ws_gen_count_slider': 'Word count slider',
    'ws_gen_session_slider': 'Session goal slider', 
    'ws_gen_theme_input': 'Image theme input',
    'ws_gen_quick_add_input': 'Quick add word',
    'quiz_new_group_input': 'New group name',
}

text_input_lines = []
for i, line in enumerate(lines):
    if 'aria-label="Text input"' in line:
        text_input_lines.append(i)

for idx in text_input_lines:
    line = lines[idx]
    block = '\n'.join(lines[max(0, idx-3):min(len(lines), idx+5)])
    new_label = None
    
    # Strategy 1: data-help-key
    hk_match = re.search(r'data-help-key="([^"]+)"', block)
    if hk_match and hk_match.group(1) in HELP_KEY_MAP:
        new_label = HELP_KEY_MAP[hk_match.group(1)]
    
    # Strategy 2: type="range"
    if not new_label and 'type="range"' in block:
        # Look for nearby text or state variable
        val_match = re.search(r'value=\{(\w+)', block)
        if val_match:
            var = val_match.group(1)
            # CamelCase to readable
            readable = re.sub(r'([A-Z])', r' \1', var).strip().lower()
            new_label = f"Adjust {readable}"
        else:
            new_label = "Range slider"
    
    # Strategy 3: type="checkbox"
    if not new_label and 'type="checkbox"' in block:
        # Look for label or checked variable
        checked_match = re.search(r'checked=\{([^}]+)\}', block)
        if checked_match:
            var = checked_match.group(1).split('.')[-1].split('?')[0].strip()
            readable = re.sub(r'([A-Z])', r' \1', var).strip().lower()
            new_label = f"Toggle {readable}"
        else:
            new_label = "Checkbox toggle"
    
    # Strategy 4: type="file"
    if not new_label and 'type="file"' in block:
        accept = re.search(r'accept="([^"]+)"', block)
        if accept:
            new_label = f"Upload {accept.group(1)} file"
        else:
            new_label = "Upload file"
    
    # Strategy 5: placeholder
    if not new_label:
        ph_match = re.search(r'placeholder="([^"]+)"', block)
        if ph_match:
            new_label = ph_match.group(1)[:60]
        else:
            ph_match = re.search(r"placeholder=\{[^}]*'([^']+)'", block)
            if ph_match:
                new_label = ph_match.group(1)[:60]
    
    # Strategy 6: value={varName} + input type
    if not new_label:
        val_match = re.search(r'value=\{(\w+)', block)
        if val_match:
            var = val_match.group(1)
            readable = re.sub(r'([A-Z])', r' \1', var).strip()
            # Capitalize first letter
            readable = readable[0].upper() + readable[1:] if readable else readable
            new_label = f"Enter {readable}"
    
    # Strategy 7: nearby comment
    if not new_label:
        for j in range(max(0, idx-3), idx):
            comment = re.search(r'/\*\s*(.+?)\s*\*/', lines[j])
            if comment:
                new_label = comment.group(1)[:50]
                break
            comment2 = re.search(r'{/\*\s*(.+?)\s*\*/}', lines[j])
            if comment2:
                new_label = comment2.group(1)[:50]
                break
    
    # Strategy 8: className contains clue
    if not new_label and 'opacity-0 absolute h-0 w-0' in block:
        new_label = "Hidden input"
    
    if not new_label:
        new_label = "Text field"
    
    lines[idx] = lines[idx].replace('aria-label="Text input"', f'aria-label="{new_label}"', 1)
    count += 1

content = '\n'.join(lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ Fixed {count} generic 'Text input' aria-labels with contextual labels")

# Quick verification
remaining = content.count('aria-label="Text input"')
print(f"Remaining 'Text input' labels: {remaining}")
