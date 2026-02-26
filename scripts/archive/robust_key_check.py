"""
Robust key extractor that properly handles nested sections in UI_STRINGS.
Uses proper brace counting instead of regex-based key stack.
Then checks all 55 reported orphans to see if they actually exist.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

# Find UI_STRINGS block
ui_start = ui_end = None
bd = 0
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line and '{' in line:
        ui_start = i
        bd = line.count('{') - line.count('}')
        continue
    if ui_start is not None and ui_end is None:
        bd += line.count('{') - line.count('}')
        if bd <= 0:
            ui_end = i
            break

print(f"UI_STRINGS: L{ui_start+1} to L{ui_end+1}")

# === Robust extraction using state machine ===
keys = set()
path_stack = []
in_comment = False

for i in range(ui_start, ui_end + 1):
    line = lines[i]
    stripped = line.strip()
    
    # Skip multi-line comments
    if '/*' in stripped:
        in_comment = True
    if '*/' in stripped:
        in_comment = False
        continue
    if in_comment:
        continue
    
    # Skip single-line comments
    if stripped.startswith('//'):
        continue
    
    # Check for key: { (section open)
    m = re.match(r'^[\s]*"?(\w+)"?\s*:\s*\{', stripped)
    if m:
        key_name = m.group(1)
        path_stack.append(key_name)
        # Check if closes on same line
        opens = stripped.count('{')
        closes = stripped.count('}')
        if closes >= opens:
            path_stack.pop()
        continue
    
    # Check for key: 'value' or key: "value" or key: `value`
    m = re.match(r'^[\s]*"?(\w+)"?\s*:\s*[\'"`]', stripped)
    if m:
        key_name = m.group(1)
        full_key = '.'.join(path_stack + [key_name])
        keys.add(full_key)
        continue
    
    # Check for closing braces
    close_count = stripped.count('}')
    open_count = stripped.count('{')
    net_close = close_count - open_count
    for _ in range(net_close):
        if path_stack:
            path_stack.pop()

print(f"Extracted {len(keys)} defined keys")
print(f"Stack at end: {path_stack}")

# === Check the specific orphan keys ===
orphan_keys = [
    # Adventure keys
    'adventure.back_to_resume', 'adventure.climax_archetypes.default.label',
    'adventure.climax_archetypes.default.left', 'adventure.climax_archetypes.default.right',
    'adventure.fallback_opening', 'adventure.generating_options_audio',
    'adventure.interrupted_desc', 'adventure.interrupted_title',
    'adventure.paused_desc', 'adventure.paused_title',
    'adventure.results.header', 'adventure.results.perf_score', 
    'adventure.results.roll_calc',
    'adventure.retry_action', 'adventure.save_reminder',
    'adventure.setup_subtitle', 'adventure.start_overwrite',
    'adventure.system_simulation', 'adventure.system_state',
    # Chat guide keys
    'chat_guide.blueprint.analyzing', 'chat_guide.blueprint.auto_fill_stop',
    'chat_guide.blueprint.change_fail', 'chat_guide.blueprint.complete',
    'chat_guide.blueprint.error', 'chat_guide.blueprint.presented',
    'chat_guide.blueprint.reset', 'chat_guide.blueprint.updated',
    'chat_guide.flow.adapting_text', 'chat_guide.flow.added_lang',
    'chat_guide.flow.creating_worksheet', 'chat_guide.flow.generating_glossary',
    'chat_guide.flow.generating_text', 'chat_guide.flow.generating_visual',
    'chat_guide.flow.initial_prompt_context', 'chat_guide.flow.integrating_interest',
    'chat_guide.flow.interest_check', 'chat_guide.flow.keyword_pack',
    'chat_guide.flow.keyword_step', 'chat_guide.flow.no_langs_warning',
    'chat_guide.flow.offer_analysis', 'chat_guide.flow.offer_glossary',
    'chat_guide.flow.offer_text', 'chat_guide.flow.offer_visual',
    'chat_guide.flow.option_pack', 'chat_guide.flow.option_step',
    'chat_guide.flow.running_analysis', 'chat_guide.flow.skipping_analysis',
    'chat_guide.flow.skipping_text', 'chat_guide.flow.skipping_visual',
    'chat_guide.flow.source_prompt', 'chat_guide.flow.start_scratch',
    'chat_guide.pack.comprehensive', 'chat_guide.pack.count_selection',
    'chat_guide.pack.designing', 'chat_guide.pack.error',
]

print(f"\n=== Checking {len(orphan_keys)} reported orphan keys ===")
really_missing = []
found_by_robust = []

for key in orphan_keys:
    if key in keys:
        found_by_robust.append(key)
    else:
        really_missing.append(key)

print(f"Found by robust parser: {len(found_by_robust)}")
print(f"Really missing: {len(really_missing)}")

if found_by_robust:
    print("\n--- Parser FALSE POSITIVES (exist, just missed by old parser) ---")
    for k in found_by_robust:
        print(f"  OK: {k}")

if really_missing:
    print("\n--- TRULY MISSING (need to add) ---")
    for k in really_missing:
        print(f"  MISSING: {k}")
