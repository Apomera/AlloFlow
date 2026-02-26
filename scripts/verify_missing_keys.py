"""
Verify missing keys: For each key flagged as 'missing' by the audit,
do a direct text search in ui_strings.js to confirm it's truly absent.
Also extract the fallback text from the code to use as the English value.
"""
import re

UI_FILE = 'ui_strings.js'
SRC_FILE = 'AlloFlowANTI.txt'

# The 60 keys flagged as missing by the audit
MISSING_KEYS = [
    # _root (false positive suspects — no namespace dot)
    'adventure_title', 'cancel', 'move_down', 'move_up',
    # about
    'about.features_list',
    # adventure
    'adventure.tooltips.stability',
    # bingo
    'bingo.close_generator', 'bingo.exit_caller_aria', 'bingo.launch_caller_aria', 'bingo.pause_duration',
    # codenames
    'codenames.adjectives', 'codenames.animals',
    # common
    'common.confirm_action', 'common.continued', 'common.family_guide',
    'common.family_learning_guide', 'common.gemini_bridge', 'common.ready',
    'common.standard_audit', 'common.study_guide', 'common.tool_simplified',
    'common.udl_aligned', 'common.udl_lesson_plan',
    # errors
    'errors.load_failed', 'errors.storage_full',
    # escape_room
    'escape_room.all_solved_bonus', 'escape_room.config_saved', 'escape_room.invalid_save',
    'escape_room.load_saved', 'escape_room.loaded_saved', 'escape_room.no_saved',
    'escape_room.preview_confirmed', 'escape_room.xp_earned_streak',
    # export
    'export.answer_key_title',
    # fluency
    'fluency.custom_norms', 'fluency.custom_wcpm', 'fluency.prosody_expression',
    'fluency.prosody_pacing', 'fluency.prosody_phrasing',
    # fullpack
    'fullpack.group_all', 'fullpack.group_current', 'fullpack.group_tooltip',
    # language_selector
    'language_selector.status_checking', 'language_selector.status_generating',
    'language_selector.status_retrying_chunk', 'language_selector.status_translating_part',
    # meta
    'meta.multi_part', 'meta.processing_sections',
    # persona
    'persona.topic_spark_tooltip',
    # process
    'process.enter_text',
    # quick_start
    'quick_start.found_resources',
    # roster
    'roster.bridge_mode_btn',
    # toasts
    'toasts.applied_standard',
    # tour
    'tour.spotlight_message',
    # visual_director
    'visual_director.panel_refined',
    # visuals
    'visuals.replace_image', 'visuals.restore_ai_image', 'visuals.restore_original', 'visuals.upload_image',
    # wizard
    'wizard.step_codename',
]

with open(UI_FILE, 'r', encoding='utf-8') as f:
    ui_content = f.read()

with open(SRC_FILE, 'r', encoding='utf-8') as f:
    src_content = f.read()
    src_lines = src_content.split('\n')

print(f"Verifying {len(MISSING_KEYS)} keys...\n")

confirmed_missing = []
false_positives = []

for key in MISSING_KEYS:
    # Split key into parts: e.g. 'common.ready' -> namespace='common', leaf='ready'
    parts = key.split('.')
    
    # For root keys (no dot), the key itself is the leaf
    if len(parts) == 1:
        leaf = parts[0]
        # For root keys, check if they appear as top-level keys in ui_strings
        # or as leaf keys inside any namespace
        # These are likely false positives from the regex (matched part of a larger key)
        patterns = [
            rf"['\"]?{re.escape(leaf)}['\"]?\s*:",  # key: value
            rf"t\(['\"].*?\.{re.escape(leaf)}['\"]",  # t('ns.leaf')
        ]
    else:
        leaf = parts[-1]
        namespace = parts[0]
        # Check if this specific leaf exists under the right namespace
        # Build a more targeted search
        patterns = [
            rf"['\"]?{re.escape(leaf)}['\"]?\s*:",  # leaf key in js file
        ]
    
    # Check in ui_strings.js
    found_in_ui = False
    for pat in patterns:
        if re.search(pat, ui_content):
            # Found SOMETHING, but need to verify it's in the right namespace
            # For multi-part keys, check context
            if len(parts) > 1:
                # Look for the leaf within the namespace block
                # Simple approach: search for the leaf key name
                if re.search(rf"['\"]?{re.escape(leaf)}['\"]?\s*:", ui_content):
                    # It exists as a key somewhere. But is it in the right namespace?
                    # Let's do a more targeted check
                    # Find lines with this key
                    for i, line in enumerate(ui_content.split('\n')):
                        if re.search(rf"['\"]?{re.escape(leaf)}['\"]?\s*:", line.strip()):
                            # Check what namespace we're in by looking at preceding lines
                            # This is approximate but usually good enough
                            context_start = max(0, i - 30)
                            context = '\n'.join(ui_content.split('\n')[context_start:i])
                            # Check if the namespace appears in the context
                            if re.search(rf"['\"]?{re.escape(namespace)}['\"]?\s*:", context):
                                found_in_ui = True
                                break
            else:
                found_in_ui = True
    
    # Also check the EXACT full key string in ui_strings.js
    # For keys like 'common.ready', search for 'ready:' within the 'common:' block
    # Simpler: just search for the full dotted key as a t() pattern in the code
    # and verify the leaf doesn't exist in the right namespace
    
    if found_in_ui:
        false_positives.append(key)
    else:
        # Extract fallback text from code
        fallback = ''
        # Look for patterns like: t('key') || 'fallback text'
        # or: t('key', { defaultValue: '' })
        # or: {t('key') || 'Fallback Text'}
        for i, line in enumerate(src_lines):
            if f"t('{key}')" in line or f't("{key}")' in line:
                # Try to extract || fallback
                fb_match = re.search(rf"t\(['\"]" + re.escape(key) + rf"['\"](?:,\s*\{{[^}}]*\}})?\)\s*\|\|\s*['\"]([^'\"]+)['\"]", line)
                if fb_match:
                    fallback = fb_match.group(1)
                    break
                # Try to extract {t('key') || 'text'}
                fb_match2 = re.search(rf"\{{t\(['\"]" + re.escape(key) + rf"['\"](?:,\s*\{{[^}}]*\}})?\)\s*\|\|\s*['\"]([^'\"]+)['\"]", line)
                if fb_match2:
                    fallback = fb_match2.group(1)
                    break
        
        confirmed_missing.append((key, fallback, ))

print(f"=== RESULTS ===")
print(f"Confirmed MISSING: {len(confirmed_missing)}")
print(f"False positives:   {len(false_positives)}")

print(f"\n--- False Positives (key exists in ui_strings.js) ---")
for k in false_positives:
    print(f"  ✓ {k}")

print(f"\n--- Confirmed Missing (need to add) ---")
for key, fallback in confirmed_missing:
    if fallback:
        print(f"  ✗ {key} → \"{fallback}\"")
    else:
        print(f"  ✗ {key} → (no fallback found in code)")

# Write machine-readable output
with open('verified_missing_keys.txt', 'w', encoding='utf-8') as f:
    for key, fallback in confirmed_missing:
        f.write(f"{key}|{fallback}\n")

print(f"\nWrote verified_missing_keys.txt")
