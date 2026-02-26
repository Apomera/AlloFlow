"""
Critical fix: Remove misplaced keys from cleanJson() function body.
Also add paused_desc and paused_title to the adventure section.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# === Remove the 13 adventure keys injected into cleanJson() ===
# These are flat key: 'value' lines between JS code lines
new_lines = []
removed = 0
in_js_zone = False

for i, line in enumerate(lines):
    s = line.strip()
    
    # Detect if we're in the cleanJson function area (after UI_STRINGS)
    if i > 17400 and i < 17600:  # Well past UI_STRINGS end
        # Check if this looks like a misplaced UI_STRINGS key
        if re.match(r"^\s+(back_to_resume|fallback_opening|generating_options_audio|"
                   r"interrupted_desc|interrupted_title|paused_desc|paused_title|"
                   r"retry_action|save_reminder|setup_subtitle|start_overwrite|"
                   r"system_simulation|system_state):\s*'", s):
            removed += 1
            continue  # Skip this misplaced line
    
    new_lines.append(line)

print(f"Removed {removed} misplaced key lines from JS code")

# === Now add paused_desc and paused_title to adventure section ===
# Find the position right after system_state inside the adventure section (within UI_STRINGS)
lines = new_lines
new_lines = []
added_paused = False

for i, line in enumerate(lines):
    new_lines.append(line)
    s = line.strip()
    
    # Find system_state inside adventure section (before L17000)
    if (not added_paused and 
        s.startswith('system_state:') and 
        'System State' in line and 
        i > 16000 and i < 16700):
        # Add paused_desc and paused_title after system_state
        indent = '    '  # Same level as other adventure flat keys
        new_lines.append(f'{indent}paused_title: "Adventure Paused",\n')
        new_lines.append(f'{indent}paused_desc: "A previous journey is waiting for you.",\n')
        added_paused = True
        print(f"Added paused_title/paused_desc after L{i+1}")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Final line count: {len(new_lines)}")
