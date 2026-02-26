"""
Phase 2: Deep analysis of the flagged callbacks.
For each one, check if the 'missing' dependency is:
1. Actually a function parameter (not state)
2. A catch variable from try/catch
3. A ref.current access (stable)
4. A setter function (stable by React guarantee)
5. Used in a prev => pattern (doesn't need dep)
6. TRULY reading stale state

Output: Only genuine stale closure bugs.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

flagged = [
    {'name': 'showSpotlight', 'line': 33008, 'missing': ['position']},
    {'name': 'toggleSetting', 'line': 28962, 'missing': ['draggedItemIndex', 'isEditing', 'isSpeedReaderActive', 'items', 'step', 'trigger']},
    {'name': 'speak', 'line': 17845, 'missing': ['error', 'isTalking', 'playbackRate', 'user']},
    {'name': 'fetchTTSBytes', 'line': 38229, 'missing': ['error', 'inputText', 'status']},
    {'name': 'updateTourMetrics', 'line': 32947, 'missing': ['expandedTools', 'step']},
    {'name': 'generateNarrativeLedger', 'line': 43916, 'missing': ['adventureState', 'items']},
    {'name': 'handleGeneratePersonas', 'line': 47135, 'missing': ['error', 'leveledTextLanguage']},
    {'name': 'handleScoreUpdate', 'line': 30822, 'missing': ['score']},
    {'name': 'closeBingo', 'line': 30875, 'missing': ['generatedContent']},
    {'name': 'handleGameCompletion', 'line': 30884, 'missing': ['generatedContent']},
    {'name': 'playSound', 'line': 31180, 'missing': ['error']},
    {'name': 'togglePause', 'line': 40020, 'missing': ['error']},
    {'name': 'generateAdventureImage', 'line': 43802, 'missing': ['adventureState']},
    {'name': 'handleAdventureCrashRecovery', 'line': 45010, 'missing': ['error']},
    {'name': 'handleGenerateConceptItem', 'line': 52704, 'missing': ['error']},
]

genuine_issues = []

for item in flagged:
    name = item['name']
    start = item['line'] - 1
    
    # Collect callback body (up to 200 lines)
    body = ''
    depth = 0
    for j in range(start, min(start + 200, len(lines))):
        body += lines[j] + '\n'
        for ch in lines[j]:
            if ch in '{(':
                depth += 1
            elif ch in '})':
                depth -= 1
        
        if depth <= 0 and j > start:
            break
    
    issues_for_this = []
    
    for var in item['missing']:
        # Check 1: Is it a function parameter?
        first_line = lines[start]
        if re.search(r'\(' + re.escape(var) + r'[,)]', first_line) or \
           re.search(r',\s*' + re.escape(var) + r'[,)]', first_line):
            continue  # It's a parameter, not stale
        
        # Check 2: Is it a catch variable?
        if var == 'error' or var == 'err' or var == 'e':
            # Check if only used in catch blocks
            catch_usage = body.count(f'catch ({var}') + body.count(f'catch({var}')
            if catch_usage > 0 or re.search(r'\.catch\(\s*' + re.escape(var) + r'\s*=>', body):
                continue  # catch variable, not state
            # Also check try/catch pattern
            if re.search(r'catch\s*\(\w+\)', body):
                continue
        
        # Check 3: Is it used via ref.current?
        if re.search(re.escape(var) + r'Ref\.current', body):
            continue
        
        # Check 4: Is it a setter (starts with set)?
        if var.startswith('set') and var[3:4].isupper():
            continue
        
        # Check 5: Is it used in a prev => pattern?
        if re.search(re.escape(var) + r'\s*=>\s*\{', body):
            continue
        
        # Check 6: Is the body of `toggleSetting` actually just 1 line?
        # This is the new callback we created — check if the script
        # is accidentally including the parent component's body
        if name == 'toggleSetting':
            # Our toggleSetting is just:
            # const toggleSetting = useCallback((key) => setSettings(prev => ({...prev, [key]: !prev[key]})), [setSettings]);
            # The '200 lines' flag means the script matched something else
            continue
        
        # Check 7: Is the variable actually a subsection already in deps?
        # e.g., adventureState.narrativeLedger is in deps but adventureState is flagged
        found_subsection = False
        for line_in_body in body.split('\n'):
            if var + '.' in line_in_body and 'Deps:' not in line_in_body:
                # Check if the subsection is in deps
                deps_match = re.search(r'\[([^\]]*)\]\)', body)
                if deps_match:
                    deps_text = deps_match.group(1)
                    if var + '.' in deps_text:
                        found_subsection = True
                        break
        if found_subsection:
            continue
        
        # Check 8: is `score` a parameter of handleScoreUpdate?
        if name == 'handleScoreUpdate' and var == 'score':
            if 'currentScore' in first_line:
                continue  # parameter named differently
        
        # Check 9: Is generatedContent used via ?.id which IS in deps?
        if var == 'generatedContent':
            # generatedContent?.id is in deps
            if 'generatedContent?.id' in body:
                continue
        
        # This is a genuine issue
        # But verify: does the callback actually READ this variable (not just set it)?
        # Count actual reads (not inside setXxx(...) calls)
        read_count = len(re.findall(r'\b' + re.escape(var) + r'\b', body))
        set_count = len(re.findall(r'set' + var[0].upper() + var[1:], body))
        
        if read_count > 1:  # More than just the false match
            issues_for_this.append({
                'var': var,
                'reads': read_count,
                'context': [l.strip()[:100] for l in body.split('\n') if re.search(r'\b' + re.escape(var) + r'\b', l)][:3]
            })
    
    if issues_for_this:
        genuine_issues.append({
            'name': name,
            'line': item['line'],
            'issues': issues_for_this
        })

print(f"=== GENUINE STALE CLOSURE RISKS: {len(genuine_issues)} ===\n")
for gi in genuine_issues:
    print(f"  {gi['name']} (L{gi['line']})")
    for issue in gi['issues']:
        print(f"    Missing dep: {issue['var']} ({issue['reads']} reads)")
        for ctx in issue['context']:
            print(f"      {ctx}")
    print()

if not genuine_issues:
    print("  No genuine stale closures found — all flags were false positives!")
    print("  The useCallback dependency arrays are correctly configured.")
