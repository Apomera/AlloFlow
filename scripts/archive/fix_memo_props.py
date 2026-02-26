"""
Fix wasteful React.memo props for the top offenders.

Strategy:
1. ToggleButton (7 inline fns → 1 useCallback + settingKey prop)
   - All 7 follow: onClick={() => setSettings(prev => ({...prev, key: !prev.key}))}
   - Create: const toggleSetting = useCallback((key) => setSettings(prev => ({...prev, [key]: !prev[key]})), [setSettings]);
   - Change ToggleButton to accept settingKey and call toggleSetting(settingKey) internally
   
2. VennGame (1 inline object → extract to useMemo)
3. SimpleBarChart (1 inline array → extract to useMemo)
4. Other single-inline-fn components (wrap in useCallback)
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# ===================================================================
# Fix 1: ToggleButton — add toggleSetting callback + settingKey prop
# ===================================================================

# Step 1a: Modify ToggleButton component to support settingKey
old_toggle = """  const ToggleButton = React.memo(({ active, onClick, title, children, activeColor = "bg-indigo-600 text-white", ...props }) => (
    <button
      onClick={onClick}"""

new_toggle = """  const toggleSetting = useCallback((key) => setSettings(prev => ({...prev, [key]: !prev[key]})), [setSettings]);
  const ToggleButton = React.memo(({ active, onClick, settingKey, title, children, activeColor = "bg-indigo-600 text-white", ...props }) => (
    <button
      onClick={settingKey ? () => toggleSetting(settingKey) : onClick}"""

if old_toggle in content:
    content = content.replace(old_toggle, new_toggle)
    changes += 1
    print("  FIX 1a: Added toggleSetting callback and settingKey prop to ToggleButton")
else:
    print("  FIX 1a: ToggleButton pattern not found")

# Step 1b: Replace inline onClick handlers with settingKey props
toggle_replacements = [
    # (old onClick pattern, new settingKey prop)
    ('onClick={() => setSettings(prev => ({...prev, wideText: !prev.wideText}))}', 'settingKey="wideText"'),
    ('onClick={() => setSettings(prev => ({...prev, showSyllables: !prev.showSyllables}))}', 'settingKey="showSyllables"'),
    ('onClick={() => setSettings(prev => ({...prev, lineFocus: !prev.lineFocus}))}', 'settingKey="lineFocus"'),
    ('onClick={() => setSettings(prev => ({...prev, showNouns: !prev.showNouns}))}', 'settingKey="showNouns"'),
    ('onClick={() => setSettings(prev => ({...prev, showVerbs: !prev.showVerbs}))}', 'settingKey="showVerbs"'),
    ('onClick={() => setSettings(prev => ({...prev, showAdjectives: !prev.showAdjectives}))}', 'settingKey="showAdjectives"'),
    ('onClick={() => setSettings(prev => ({...prev, showAdverbs: !prev.showAdverbs}))}', 'settingKey="showAdverbs"'),
]

for old_click, new_key in toggle_replacements:
    if old_click in content:
        content = content.replace(old_click, new_key)
        changes += 1
        print(f"  FIX 1b: Replaced inline onClick → {new_key}")
    else:
        print(f"  FIX 1b: Pattern not found for {new_key}")

# ===================================================================
# Fix 2: VennGame inline object — check what it is
# ===================================================================
lines = content.split('\n')
for i, l in enumerate(lines):
    if '<VennGame' in l:
        # Show the full props
        for j in range(i, min(i+15, len(lines))):
            if '={{' in lines[j]:
                print(f"  VennGame inline object at L{j+1}: {lines[j].strip()[:100]}")
            if '/>' in lines[j] or ('>' in lines[j] and '<' not in lines[j]):
                break

# ===================================================================
# Fix 3: SimpleBarChart inline array
# ===================================================================
for i, l in enumerate(lines):
    if '<SimpleBarChart' in l:
        for j in range(i, min(i+10, len(lines))):
            if '={[' in lines[j]:
                print(f"  SimpleBarChart inline array at L{j+1}: {lines[j].strip()[:100]}")
            if '/>' in lines[j]:
                break

# ===================================================================
# Write output
# ===================================================================
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
print("DONE")
