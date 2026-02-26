"""
Fix ALL orphaned key issues in ui_strings_check.js iteratively.

The pattern is: keys were added at wrong indentation level, right before a closing brace },
causing them to be outside their intended parent object.

Strategy:
- Find every case where a key: value line appears right before a },
  and the indentation of the key is LESS than what the parent expects.
- These are orphaned keys that break the parser.
- Fix: either remove them (if duplicate) or re-indent them correctly.
"""
import subprocess
import re

def check_syntax(filepath):
    """Returns error identifier or None if valid"""
    result = subprocess.run(
        ['node', '-e', 
         f"""const fs=require('fs');const text=fs.readFileSync('{filepath}','utf8');
try{{new Function('return '+text)();console.log('OK:'+Object.keys(new Function('return '+text)()).length+' keys')}}
catch(e){{console.log('ERR:'+e.message)}}"""],
        capture_output=True, text=True, cwd='.'
    )
    out = result.stdout.strip()
    if out.startswith('OK:'):
        return None
    return out.replace('ERR:', '').strip()

filepath = 'ui_strings_check.js'

# First, let's find ALL instances of the pattern:
# A key at wrong indentation level before a closing brace
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Pattern: find blocks like:
#     proper_key: "value",    <-- normal indent (e.g. 6 spaces)
#   
#   orphan_key: 'value',      <-- reduced indent (e.g. 4 spaces) -- ORPHAN!
# },                          <-- closing brace
# We fix by looking for key lines followed by }, where the key indent is less than expected

fixes_applied = 0
max_iterations = 20

for iteration in range(max_iterations):
    err = check_syntax(filepath)
    if err is None:
        print(f"✅ File parses successfully after {fixes_applied} fixes!")
        break
    
    print(f"Iteration {iteration + 1}: {err}")
    
    # Extract the identifier from error
    match = re.search(r"Unexpected identifier '(\w+)'", err)
    if not match:
        match = re.search(r"Unexpected token '([^']+)'", err)
    if not match:
        print(f"  ❌ Could not extract identifier from error: {err}")
        break
    
    problem_key = match.group(1)
    print(f"  Looking for orphaned key: '{problem_key}'")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    fixed = False
    for i in range(len(lines)):
        stripped = lines[i].strip()
        # Check if this line contains the problem key as a property
        if stripped.startswith(problem_key + ':') or stripped.startswith(problem_key + ' :'):
            curr_indent = len(lines[i]) - len(lines[i].lstrip())
            
            # Look at the context: what's just before this line?
            prev_nonblank_idx = i - 1
            while prev_nonblank_idx >= 0 and not lines[prev_nonblank_idx].strip():
                prev_nonblank_idx -= 1
            
            prev_line = lines[prev_nonblank_idx].strip() if prev_nonblank_idx >= 0 else ''
            prev_indent = len(lines[prev_nonblank_idx]) - len(lines[prev_nonblank_idx].lstrip()) if prev_nonblank_idx >= 0 else 0
            
            # Look at what's after this line
            next_nonblank_idx = i + 1
            while next_nonblank_idx < len(lines) and not lines[next_nonblank_idx].strip():
                next_nonblank_idx += 1
            next_line = lines[next_nonblank_idx].strip() if next_nonblank_idx < len(lines) else ''
            
            print(f"  Found at L{i+1} (indent={curr_indent})")
            print(f"    Prev L{prev_nonblank_idx+1} (indent={prev_indent}): {prev_line[:60]}")
            print(f"    Next L{next_nonblank_idx+1}: {next_line[:60]}")
            
            # Check if this is an orphaned key (indent mismatch)
            # The key is orphaned if:
            # 1. prev line ends with }, or } (closing a sub-object)
            # 2. next line is }, or starts a new section
            
            is_orphaned = False
            
            # Case 1: After a closing brace - key is outside its parent
            if prev_line.endswith('}') or prev_line.endswith('},'):
                is_orphaned = True
            
            # Case 2: The indentation is inconsistent with surrounding keys
            if curr_indent < prev_indent - 2:
                is_orphaned = True
            
            if is_orphaned:
                # Check if this key already exists elsewhere in its proper section
                key_pattern = problem_key + ':'
                occurrences = [j for j in range(len(lines)) if key_pattern in lines[j].strip()]
                
                if len(occurrences) > 1:
                    # Duplicate - remove this orphaned line
                    print(f"    Action: REMOVING orphaned duplicate (exists at {[o+1 for o in occurrences]})")
                    # Remove this line and any blank lines before it
                    start_remove = prev_nonblank_idx + 1 if prev_nonblank_idx < i else i
                    lines_to_remove = list(range(start_remove, i + 1))
                    for j in sorted(lines_to_remove, reverse=True):
                        lines.pop(j)
                    fixed = True
                    fixes_applied += 1
                else:
                    # Only occurrence - need to re-indent properly
                    # Find the correct indent by looking at siblings
                    # The correct indent should match prev_line's siblings
                    
                    # If prev line ends with },  then this key should be at same indent as the key before that brace
                    # Find the opening brace's indent
                    correct_indent = prev_indent  # Default to prev indent
                    
                    # If the next line is }, then this key belongs before it
                    if next_line == '},' or next_line == '}':
                        next_indent = len(lines[next_nonblank_idx]) - len(lines[next_nonblank_idx].lstrip())
                        correct_indent = next_indent + 2  # Key should be indented more than closing brace
                    
                    print(f"    Action: RE-INDENTING from {curr_indent} to {correct_indent}")
                    lines[i] = ' ' * correct_indent + stripped + '\n'
                    
                    # Also need to add comma to prev line if it was a closing brace without comma
                    if prev_line == '}':
                        lines[prev_nonblank_idx] = lines[prev_nonblank_idx].rstrip('\n').rstrip('\r').rstrip()
                        if not lines[prev_nonblank_idx].rstrip().endswith(','):
                            lines[prev_nonblank_idx] = lines[prev_nonblank_idx].rstrip() + ',\n'
                        else:
                            lines[prev_nonblank_idx] += '\n'
                    
                    fixed = True
                    fixes_applied += 1
                
                break
    
    if not fixed:
        print(f"  ❌ Could not find fixable instance of '{problem_key}'")
        break
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)

# Final check
err = check_syntax(filepath)
if err:
    print(f"\n❌ Still has error: {err}")
else:
    print(f"\n✅ All {fixes_applied} errors fixed! File is valid JavaScript.")
    
    # Count top-level keys
    result = subprocess.run(
        ['node', '-e', 
         f"const fs=require('fs');const r=new Function('return '+fs.readFileSync('{filepath}','utf8'))();console.log(Object.keys(r).length+' top-level keys: '+Object.keys(r).join(', '))"],
        capture_output=True, text=True
    )
    print(result.stdout.strip())
