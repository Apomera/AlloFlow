"""
Phase 4 Tier 1: Word Sounds useReducer Migration (FIXED)
Safety: Destructured reads + thin setter wrappers = zero call-site changes needed
"""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()
lines = text.split('\n')

# =========================================================================
# HOOKS TO MIGRATE (17 simple-init Word Sounds hooks)
# =========================================================================
WS_HOOKS = [
    {'var': 'wsPreloadedWords', 'setter': 'setWsPreloadedWords', 'init': '[]'},
    {'var': 'wsActivitySequence', 'setter': 'setWsActivitySequence', 'init': '[]'},
    {'var': 'wordSoundsDifficulty', 'setter': 'setWordSoundsDifficulty', 'init': "'auto'"},
    {'var': 'wordSoundsAccuracyHistory', 'setter': 'setWordSoundsAccuracyHistory', 'init': '[]'},
    {'var': 'wordSoundsStreak', 'setter': 'setWordSoundsStreak', 'init': '0'},
    {'var': 'wordSoundsSessionGoal', 'setter': 'setWordSoundsSessionGoal', 'init': '30'},
    {'var': 'wordSoundsSessionProgress', 'setter': 'setWordSoundsSessionProgress', 'init': '0'},
    {'var': 'wordSoundsTtsSpeed', 'setter': 'setWordSoundsTtsSpeed', 'init': '1.0'},
    {'var': 'wordSoundsFamilies', 'setter': 'setWordSoundsFamilies', 'init': '{}'},
    {'var': 'wordSoundsAudioLibrary', 'setter': 'setWordSoundsAudioLibrary', 'init': '{}'},
    {'var': 'isWordSoundsMode', 'setter': 'setIsWordSoundsMode', 'init': 'false'},
    {'var': 'wordSoundsActivity', 'setter': 'setWordSoundsActivity', 'init': "'counting'"},
    {'var': 'wordSoundsScore', 'setter': 'setWordSoundsScore', 'init': '{ correct: 0, total: 0, streak: 0 }'},
    {'var': 'currentWordSoundsWord', 'setter': 'setCurrentWordSoundsWord', 'init': 'null'},
    {'var': 'wordSoundsPhonemes', 'setter': 'setWordSoundsPhonemes', 'init': 'null'},
    {'var': 'wordSoundsLanguage', 'setter': 'setWordSoundsLanguage', 'init': "'en'"},
    {'var': 'wordSoundsFeedback', 'setter': 'setWordSoundsFeedback', 'init': 'null'},
]
print(f"Migrating {len(WS_HOOKS)} Word Sounds useState hooks")

# =========================================================================
# STEP 1: Build reducer definition
# =========================================================================
init_lines = '\n'.join(f"  {h['var']}: {h['init']}," for h in WS_HOOKS)
reducer_block = f"""// === PHASE 4: Word Sounds useReducer ===
const WS_INITIAL_STATE = {{
{init_lines}
}};
function wsReducer(state, action) {{
  if (action.type === 'WS_SET') {{
    const val = typeof action.value === 'function' ? action.value(state[action.field]) : action.value;
    return {{ ...state, [action.field]: val }};
  }}
  if (action.type === 'WS_RESET') return {{ ...WS_INITIAL_STATE }};
  return state;
}}
// === END PHASE 4 ===
"""

# =========================================================================
# STEP 2: Insert reducer BEFORE the component (L31394)
# =========================================================================
comp_line_idx = None
for i, l in enumerate(lines):
    if 'const AlloFlowContent' in l:
        comp_line_idx = i
        break

if comp_line_idx is None:
    print("ERROR: Could not find AlloFlowContent")
    sys.exit(1)

print(f"AlloFlowContent at L{comp_line_idx+1}")
# Insert before the component
lines.insert(comp_line_idx, reducer_block)
print(f"INSERTED reducer definition before component")

# =========================================================================
# STEP 3: Replace useState declarations
# =========================================================================
# Build the replacement block for the FIRST hook
destructure_vars = ', '.join(h['var'] for h in WS_HOOKS)
setter_lines = '\n'.join(
    f"  const {h['setter']} = (v) => wsDispatch({{ type: 'WS_SET', field: '{h['var']}', value: v }});"
    for h in WS_HOOKS
)

replacement_block = (
    "  // === PHASE 4: Word Sounds state consolidated into useReducer ===\n"
    f"  const [wsState, wsDispatch] = useReducer(wsReducer, WS_INITIAL_STATE);\n"
    f"  const {{ {destructure_vars} }} = wsState;\n"
    f"{setter_lines}"
)

# Find and replace each useState hook
replaced_count = 0
first_replaced = False
for h in WS_HOOKS:
    target = f"const [{h['var']}, {h['setter']}] = useState("
    for i in range(len(lines)):
        if target in lines[i]:
            if not first_replaced:
                # Replace first hook with the full block
                lines[i] = replacement_block
                first_replaced = True
            else:
                # Comment out this hook (preserve for reference)
                original = lines[i].strip()
                lines[i] = f"  // [PHASE 4 MIGRATED] {original}"
            replaced_count += 1
            break

print(f"Replaced/commented {replaced_count} of {len(WS_HOOKS)} hooks")

# =========================================================================
# STEP 4: Verify & save
# =========================================================================
text = '\n'.join(lines)

# Brace balance check
open_b = text.count('{')
close_b = text.count('}')
print(f"Brace balance: {open_b} open, {close_b} close, delta = {open_b - close_b}")

# Verify no dangling useState references for migrated vars
for h in WS_HOOKS:
    remaining = text.count(f"const [{h['var']}, {h['setter']}] = useState(")
    if remaining > 0:
        print(f"WARNING: {h['var']} still has {remaining} useState declarations!")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print("FILE SAVED")
