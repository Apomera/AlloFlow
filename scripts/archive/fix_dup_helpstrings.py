"""
Remove 5 duplicate HELP_STRINGS entries that were introduced by fix_help_gaps.py.
The originals already exist under the same key names without quotes.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

# These are the exact duplicate lines to remove (they were added as aliases but the keys already existed)
duplicates_to_remove = [
    "    'xp_modal_trigger': \"Open your XP and Level dashboard",
    "    'header_settings_anim': \"Control UI animations throughout",
    "    'header_settings_theme': \"Toggle application color scheme",
    "    'header_settings_overlay': \"Apply colored screen overlay",
    "    'header_cloud_sync': \"When enabled, work saves automatically",
]

lines = content.split('\n')
removed = 0
new_lines = []

for line in lines:
    skip = False
    for dup in duplicates_to_remove:
        if line.strip().startswith(dup.strip()):
            print(f"Removing duplicate: {line.strip()[:70]}...")
            skip = True
            removed += 1
            break
    if not skip:
        new_lines.append(line)

content = '\n'.join(new_lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nRemoved {removed} duplicate entries")
print("DONE")
