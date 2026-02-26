"""
Broader analysis: Find ALL expensive operations in JSX render paths.
Look for any .filter( .sort( .reduce( Object.keys( inside JSX return blocks.

The key insight: these are inside JSX curly braces {expr} and they re-run
on every render. The safest optimization is to hoist the computation to  
a useMemo const BEFORE the return statement.

Step 1: Find all return ( statements and their scope
Step 2: Within each return scope, find expensive operations
Step 3: Determine which can be safely extracted
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Find all return ( blocks and the expensive ops within them
return_blocks = []
i = 0
while i < len(lines):
    stripped = lines[i].strip()
    if stripped.startswith('return (') or stripped.startswith('return(') or stripped == 'return (':
        return_line = i
        # Find the matching closing paren/semicolon
        paren_depth = 0
        end_line = i
        for j in range(i, min(i + 2000, len(lines))):
            for ch in lines[j]:
                if ch == '(':
                    paren_depth += 1
                elif ch == ')':
                    paren_depth -= 1
                    if paren_depth == 0:
                        end_line = j
                        break
            if paren_depth == 0:
                break
        
        # Now find expensive ops within this return block
        ops_in_block = []
        for j in range(return_line, end_line + 1):
            s = lines[j].strip()
            if s.startswith('//'):
                continue
            for op in ['.filter(', '.sort(', '.reduce(', 'Object.keys(', 'Object.entries(', 'Object.values(', '.flatMap(']:
                if op in s:
                    # Check if this is inside a JSX expression (inside { })
                    # by checking if there's an opening { before it on the same or preceding line
                    ops_in_block.append({
                        'inner_line': j + 1,
                        'op': op,
                        'text': s[:120]
                    })
        
        if ops_in_block:
            return_blocks.append({
                'return_line': return_line + 1,
                'end_line': end_line + 1,
                'ops': ops_in_block,
                'block_size': end_line - return_line
            })
        
        i = end_line + 1
    else:
        i += 1

# Print results
total_ops = sum(len(b['ops']) for b in return_blocks)
print(f"Found {total_ops} expensive operations across {len(return_blocks)} return blocks")
print()

# Sort by number of operations (most operations = most value to optimize)
return_blocks.sort(key=lambda b: -len(b['ops']))

for b in return_blocks[:15]:
    print(f"=== Return block at L{b['return_line']} ({b['block_size']} lines, {len(b['ops'])} ops) ===")
    for op in b['ops'][:5]:
        print(f"  L{op['inner_line']}: {op['text'][:100]}")
    if len(b['ops']) > 5:
        print(f"  ... and {len(b['ops']) - 5} more")
    print()

# Find the specific pattern: {array.filter(...).map(  inside return
# These are the ones we can extract to useMemo
extractable = []
for b in return_blocks:
    for op in b['ops']:
        idx = op['inner_line'] - 1
        line_text = lines[idx]
        
        # Pattern: {something.filter(callback).map( — on one line
        m = re.search(r'\{([\w.]+(?:\?\.[\w]+)*)\.(filter)\((.+?)\)\.(map)\(', line_text)
        if m:
            extractable.append({
                'line': op['inner_line'],
                'source': m.group(1),
                'filter_cb': m.group(3),
                'return_line': b['return_line'],
                'text': line_text.strip()[:120]
            })
            continue
        
        # Pattern: something.filter(...) on one line, .map( on next
        if '.filter(' in line_text and '.map(' not in line_text:
            for j in range(idx+1, min(idx+3, len(lines))):
                if '.map(' in lines[j]:
                    m2 = re.search(r'([\w.]+(?:\?\.[\w]+)*)\.(filter)\((.+?)\)', line_text)
                    if m2:
                        extractable.append({
                            'line': op['inner_line'],
                            'source': m2.group(1),
                            'filter_cb': m2.group(3),
                            'return_line': b['return_line'],
                            'text': line_text.strip()[:120],
                            'multiline': True
                        })
                    break
        
        # Pattern: Object.keys(something).map(
        m3 = re.search(r'Object\.(keys|entries|values)\(([\w.]+)\)\.(map|filter)\(', line_text)
        if m3:
            extractable.append({
                'line': op['inner_line'],
                'source': f"Object.{m3.group(1)}({m3.group(2)})",
                'filter_cb': m3.group(1),
                'return_line': b['return_line'],
                'text': line_text.strip()[:120],
                'type': 'object_op'
            })

print(f"\nExtractable filter/map chains: {len(extractable)}")
for e in extractable:
    ml = ' (ML)' if e.get('multiline') else ''
    tp = f" [{e.get('type', 'filter')}]" if e.get('type') else ''
    print(f"  L{e['line']}{ml}{tp}: {e['source']}.filter({e.get('filter_cb', '...')[:40]}) in return@L{e['return_line']}")
