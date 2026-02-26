"""
Phase 4 Tier 2: Adventure useReducer Migration
Same safe pattern as Tier 1: destructured reads + thin setter wrappers
"""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()
lines = text.split('\n')

# =========================================================================
# HOOKS TO MIGRATE (22 Adventure hooks - all simple init)
# =========================================================================
ADV_HOOKS = [
    {'var': 'isAdventureCloudEnabled', 'setter': 'setIsAdventureCloudEnabled', 'init': 'false'},
    {'var': 'isSocialStoryMode', 'setter': 'setIsSocialStoryMode', 'init': 'false'},
    {'var': 'socialStoryFocus', 'setter': 'setSocialStoryFocus', 'init': "''"},
    {'var': 'pendingAdventureUpdate', 'setter': 'setPendingAdventureUpdate', 'init': 'null'},
    {'var': 'dynamicReflectionQuestion', 'setter': 'setDynamicReflectionQuestion', 'init': "''"},
    {'var': 'pointHistory', 'setter': 'setPointHistory', 'init': '[]'},
    {'var': 'adventureDifficulty', 'setter': 'setAdventureDifficulty', 'init': "'Normal'"},
    {'var': 'isResumingAdventure', 'setter': 'setIsResumingAdventure', 'init': 'false'},
    {'var': 'adventureEffects', 'setter': 'setAdventureEffects', 'init': '{ xp: null, energy: null, levelUp: null }'},
    {'var': 'showStorybookExportModal', 'setter': 'setShowStorybookExportModal', 'init': 'false'},
    {'var': 'adventureInputMode', 'setter': 'setAdventureInputMode', 'init': "'choice'"},
    {'var': 'adventureLanguageMode', 'setter': 'setAdventureLanguageMode', 'init': "'English'"},
    {'var': 'adventureTextInput', 'setter': 'setAdventureTextInput', 'init': "''"},
    {'var': 'failedAdventureAction', 'setter': 'setFailedAdventureAction', 'init': 'null'},
    {'var': 'isAdventureStoryMode', 'setter': 'setIsAdventureStoryMode', 'init': 'false'},
    {'var': 'adventureFreeResponseEnabled', 'setter': 'setAdventureFreeResponseEnabled', 'init': 'false'},
    {'var': 'adventureAutoRead', 'setter': 'setAdventureAutoRead', 'init': 'false'},
    {'var': 'adventureChanceMode', 'setter': 'setAdventureChanceMode', 'init': 'false'},
    {'var': 'adventureImageSize', 'setter': 'setAdventureImageSize', 'init': '450'},
    {'var': 'hasSavedAdventure', 'setter': 'setHasSavedAdventure', 'init': 'false'},
    {'var': 'showAdventureConfirmation', 'setter': 'setShowAdventureConfirmation', 'init': 'false'},
    {'var': 'hintHistory', 'setter': 'setHintHistory', 'init': '[]'},
]
print(f"Migrating {len(ADV_HOOKS)} Adventure useState hooks")

# =========================================================================
# STEP 1: Build reducer definition
# =========================================================================
init_lines = '\n'.join(f"  {h['var']}: {h['init']}," for h in ADV_HOOKS)
reducer_block = f"""// === PHASE 4: Adventure useReducer ===
const ADV_INITIAL_STATE = {{
{init_lines}
}};
function advReducer(state, action) {{
  if (action.type === 'ADV_SET') {{
    const val = typeof action.value === 'function' ? action.value(state[action.field]) : action.value;
    return {{ ...state, [action.field]: val }};
  }}
  if (action.type === 'ADV_RESET') return {{ ...ADV_INITIAL_STATE }};
  return state;
}}
// === END PHASE 4 Adventure ===
"""

# =========================================================================
# STEP 2: Insert reducer before the WS reducer (or before component)
# =========================================================================
# Insert right before the existing WS reducer
ws_reducer_line = None
for i, l in enumerate(lines):
    if '// === PHASE 4: Word Sounds useReducer ===' in l:
        ws_reducer_line = i
        break

if ws_reducer_line is None:
    print("ERROR: Could not find WS reducer insertion point")
    sys.exit(1)

lines.insert(ws_reducer_line, reducer_block)
print(f"INSERTED Adventure reducer before L{ws_reducer_line+1}")

# =========================================================================
# STEP 3: Find the first Adventure hook and replace
# =========================================================================
destructure_vars = ', '.join(h['var'] for h in ADV_HOOKS)
setter_lines = '\n'.join(
    f"  const {h['setter']} = (v) => advDispatch({{ type: 'ADV_SET', field: '{h['var']}', value: v }});"
    for h in ADV_HOOKS
)

replacement_block = (
    "  // === PHASE 4: Adventure state consolidated into useReducer ===\n"
    f"  const [advState, advDispatch] = useReducer(advReducer, ADV_INITIAL_STATE);\n"
    f"  const {{ {destructure_vars} }} = advState;\n"
    f"{setter_lines}"
)

# Replace each Adventure useState hook
replaced_count = 0
first_replaced = False
for h in ADV_HOOKS:
    target = f"const [{h['var']}, {h['setter']}] = useState("
    for i in range(len(lines)):
        if target in lines[i] and '// [PHASE 4 MIGRATED]' not in lines[i]:
            if not first_replaced:
                lines[i] = replacement_block
                first_replaced = True
            else:
                original = lines[i].strip()
                lines[i] = f"  // [PHASE 4 MIGRATED] {original}"
            replaced_count += 1
            break

print(f"Replaced/commented {replaced_count} of {len(ADV_HOOKS)} hooks")

# =========================================================================
# STEP 4: Save
# =========================================================================
text = '\n'.join(lines)
open_b = text.count('{')
close_b = text.count('}')
print(f"Brace balance: {open_b} open, {close_b} close, delta = {open_b - close_b}")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print("FILE SAVED")
