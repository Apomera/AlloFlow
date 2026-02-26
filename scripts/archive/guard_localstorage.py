"""
Wrap all 19 unguarded localStorage.setItem calls in try/catch.

The pattern is:
  localStorage.setItem('key', value);
→ try { localStorage.setItem('key', value); } catch(e) { warnLog('localStorage quota exceeded', e); }

We need to be careful not to double-wrap ones already in try blocks.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

# Unguarded lines from the audit
unguarded_lines = [156, 17710, 27761, 29991, 30340, 30602, 30782, 30786, 
                   30790, 30794, 30798, 30802, 30807, 30811, 30815, 30819,
                   34837, 34844, 58727]

changes = 0

for ln in sorted(unguarded_lines, reverse=True):  # Reverse to preserve line numbers
    idx = ln - 1
    if idx >= len(lines):
        print(f"  SKIP L{ln}: out of range")
        continue
    
    line = lines[idx]
    
    # Verify it contains setItem
    if 'localStorage.setItem' not in line:
        print(f"  SKIP L{ln}: no setItem found — {line.strip()[:80]}")
        continue
    
    # Check if already in try block (look back 5 lines)
    already_guarded = False
    for j in range(max(0, idx - 5), idx):
        if 'try' in lines[j] and '{' in lines[j]:
            already_guarded = True
            break
    
    if already_guarded:
        print(f"  SKIP L{ln}: already guarded")
        continue
    
    # Get the indentation
    indent = line[:len(line) - len(line.lstrip())]
    
    # Check if the setItem is a standalone statement (ends with ;)
    stripped = line.strip()
    
    # Handle multi-line setItem (e.g., the line might not end with ;)
    if stripped.endswith(';') or stripped.endswith(';\r'):
        # Single line — wrap inline
        # Before: [indent]localStorage.setItem('key', value);
        # After:  [indent]try { localStorage.setItem('key', value); } catch(e) { warnLog('localStorage write failed', e); }
        clean_stripped = stripped.rstrip('\r')
        new_line = f"{indent}try {{ {clean_stripped} }} catch(e) {{ warnLog('localStorage write failed', e); }}\r"
        lines[idx] = new_line
        changes += 1
        print(f"  FIXED L{ln}: {clean_stripped[:60]}...")
    else:
        # Multi-line — wrap the block
        # Find the end (semicolon)
        end_idx = idx
        for j in range(idx, min(idx + 5, len(lines))):
            if lines[j].strip().endswith(';') or lines[j].strip().endswith(';\r'):
                end_idx = j
                break
        
        # Wrap the block
        block = '\n'.join(lines[idx:end_idx + 1])
        block_clean = block.rstrip('\r')
        new_block = f"{indent}try {{ {block_clean.strip()} }} catch(e) {{ warnLog('localStorage write failed', e); }}\r"
        lines[idx:end_idx + 1] = [new_block]
        changes += 1
        print(f"  FIXED L{ln}: multi-line block ({end_idx - idx + 1} lines)")

content = '\n'.join(lines)
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
print("DONE")
