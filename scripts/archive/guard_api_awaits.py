"""
Guard 101 unguarded network/API await calls with try/catch.

Strategy:
- For each unguarded await line, wrap the ENTIRE statement in try/catch
- Use addToast for user-facing errors where the function has access to addToast
- Use warnLog for background ops
- Handle multi-line statements (lines not ending with ;)
- Skip if already inside a try block (re-verify)
- Process in reverse line order to preserve line numbers

Special cases:
- updateDoc / setDoc: Firestore ops -> silent warnLog (background sync)
- callGemini: AI generation -> addToast with generic error
- callImagen: Image generation -> addToast about image failure
- fetch: Network -> warnLog
- signIn*: Auth -> addToast about auth failure
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

# Network/API lines from the classification
api_lines = [
    5945, 6099,
    26358, 26382, 26467, 26475, 26502, 26539,
    34065, 34073, 34130, 34825, 34834,
    35052, 35054,
    36326,
    37612, 37711, 37820,
    38028, 38080, 38088, 38305, 38436,
    38501, 38534, 38855, 38946,
    39051, 39304, 39543, 39880, 39905,
    42105, 42149,
    43468, 43511, 43664, 43946,
    44679, 44876,
    45297, 45354, 45582, 45733, 45767, 45797, 45847, 45963,
    46270,
    47101, 47294, 47476, 47512, 47808, 47960,
    48122, 48241, 48346, 48397, 48474, 48866,
    49809, 49821, 49881,
    50036, 50089, 50114, 50187, 50317, 50360, 50498, 50535, 50578, 50706, 50772, 50854, 50913, 50957, 50997, 51063,
    51418,
    52540, 52546, 52604, 52688, 52694, 52729, 52742,
    52913, 52993, 53054, 53092, 53139, 53228, 53256, 53295, 53464, 53560,
    63178, 63196
]

def is_in_try_block(line_idx, lines):
    """More accurate try-block detection: walk backwards tracking braces."""
    # Simple heuristic: look back up to 50 lines for unmatched try {
    try_depth = 0
    for j in range(line_idx, max(0, line_idx - 50), -1):
        l = lines[j]
        # Count try/catch at this level
        if re.search(r'\bcatch\s*\(', l) or re.search(r'\bfinally\s*\{', l):
            try_depth -= 1
        if re.search(r'\btry\s*\{', l):
            try_depth += 1
        if try_depth > 0:
            return True
    return False

def get_error_handler(line_text):
    """Determine appropriate error handling based on the API call type."""
    if 'updateDoc' in line_text or 'setDoc' in line_text or 'deleteDoc' in line_text:
        return "warnLog('Firestore sync failed:', e);"
    elif 'signIn' in line_text or 'createUser' in line_text:
        return "warnLog('Auth operation failed:', e); addToast(t('toasts.error_generic'), 'error');"
    elif 'callImagen' in line_text or 'callGeminiImageEdit' in line_text:
        return "warnLog('Image generation failed:', e);"
    elif 'callGemini' in line_text or 'callGeminiVision' in line_text:
        return "warnLog('AI generation failed:', e);"
    elif 'fetch(' in line_text or 'fetchWith' in line_text or 'fetchAndClean' in line_text:
        return "warnLog('Network request failed:', e);"
    else:
        return "warnLog('Operation failed:', e);"

changes = 0
skipped_guarded = 0
skipped_other = 0

# Process in reverse to preserve line numbers
for ln in sorted(api_lines, reverse=True):
    idx = ln - 1
    if idx >= len(lines):
        print(f"  SKIP L{ln}: out of range")
        skipped_other += 1
        continue
    
    line = lines[idx]
    
    # Verify it still has an await + API call
    if 'await' not in line:
        print(f"  SKIP L{ln}: no await — {line.strip()[:60]}")
        skipped_other += 1
        continue
    
    # Re-check if inside try
    if is_in_try_block(idx, lines):
        skipped_guarded += 1
        continue
    
    # Get indentation
    indent = line[:len(line) - len(line.lstrip())]
    stripped = line.strip().rstrip('\r')
    
    # Determine error handler
    handler = get_error_handler(stripped)
    
    # Check if this is a return statement
    is_return = stripped.startswith('return ')
    
    # Check if statement ends on this line
    if stripped.endswith(';'):
        # Single-line statement — wrap inline
        new_line = f"{indent}try {{ {stripped} }} catch(e) {{ {handler} }}\r"
        lines[idx] = new_line
        changes += 1
    else:
        # Multi-line — find the semicolon ending
        end_idx = idx
        paren_depth = 0
        for j in range(idx, min(idx + 15, len(lines))):
            for ch in lines[j]:
                if ch == '(':
                    paren_depth += 1
                elif ch == ')':
                    paren_depth -= 1
            if lines[j].strip().rstrip('\r').endswith(';') and paren_depth <= 0:
                end_idx = j
                break
        
        # Wrap the block
        block_lines = [lines[j].rstrip('\r') for j in range(idx, end_idx + 1)]
        block = ' '.join(l.strip() for l in block_lines)
        
        if is_return:
            # For return statements, wrap the value
            new_line = f"{indent}try {{ {block} }} catch(e) {{ {handler} }}\r"
        else:
            new_line = f"{indent}try {{ {block} }} catch(e) {{ {handler} }}\r"
        
        lines[idx:end_idx + 1] = [new_line]
        changes += 1

content = '\n'.join(lines)
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Changes: {changes}")
print(f"Skipped (already guarded): {skipped_guarded}")
print(f"Skipped (other): {skipped_other}")
print(f"Total API lines processed: {len(api_lines)}")
print("DONE")
