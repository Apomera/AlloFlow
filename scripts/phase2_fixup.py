"""Fix remaining: add defaults and tool UIs using line-based insertion"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# STEP 2: Add defaults - find "decomposer: { material: 'Water', decomposed: false }"
target = "decomposer: { material: 'Water', decomposed: false }"
if target in c:
    new_defaults = target + """,
          solarSystem: { selectedPlanet: null },
          waterCycle: { selectedStage: null },
          rockCycle: { selectedRock: null, selectedProcess: null },
          ecosystem: { preyBirth: 0.1, preyDeath: 0.01, predBirth: 0.01, predDeath: 0.1, prey0: 100, pred0: 20, steps: 0, data: [] },
          fractions: { num1: 1, den1: 2, num2: 2, den2: 4, mode: 'bar' },
          unitConvert: { category: 'length', value: 1, fromUnit: 'm', toUnit: 'ft' },
          probability: { mode: 'coin', trials: 0, results: [], running: false }"""
    c = c.replace(target, new_defaults)
    changes += 1
    print('Step 2: Added 7 new tool defaults')
else:
    print('Step 2 SKIPPED')

# STEP 3: Insert after "})()," that closes the decomposer
# The decomposer block ends with })()\r\n at the very end of the tool blocks
# Let's find it by looking for the last })(), before the closing of the module
# Actually, let's find "stemLabTab === 'explore' && stemLabTool === 'decomposer'" and then find its closing })(),

idx = c.find("stemLabTool === 'decomposer'")
if idx < 0:
    print('Step 3 SKIPPED: decomposer tool not found')
else:
    # Find the })(), that closes this tool's IIFE
    # Count from the start of the decomposer block
    brace_depth = 0
    paren_depth = 0
    end_idx = -1
    in_string = False
    i = idx
    # First, enter the IIFE: find the opening (() => {
    while i < len(c) and c[i:i+6] != '(() =>':
        i += 1
    # Now track braces from this point
    while i < len(c):
        ch = c[i]
        if ch == '{' and not in_string:
            brace_depth += 1
        elif ch == '}' and not in_string:
            brace_depth -= 1
            if brace_depth == 0:
                # Found the closing } of the IIFE -- look for )(),
                rest = c[i:i+10]
                if ')()' in rest:
                    comma_idx = c.find(',', i, i + 10)
                    if comma_idx >= 0:
                        end_idx = comma_idx + 1
                    else:
                        end_idx = i + rest.index(')()') + 3
                    break
        i += 1
    
    if end_idx > 0:
        print(f'Found decomposer end at char {end_idx}')
        # Read the new tools from the script we already wrote
        # Instead, just inline INSERT here
        new_tools_file = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\new_tools_code.js"
        with open(new_tools_file, 'r', encoding='utf-8') as nt:
            new_code = nt.read()
        c = c[:end_idx] + '\n' + new_code + c[end_idx:]
        changes += 1
        print('Step 3: Inserted new tool UIs')
    else:
        print('Step 3 SKIPPED: could not find decomposer end')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)
print(f'\nTotal: {changes}')
