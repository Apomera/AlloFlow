"""
Find header toolbar buttons that match orphan HELP_STRINGS keys.
For each orphan key, search for the element it likely refers to.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Orphan header keys we want to wire up
targets = {
    'header_settings': ['Settings', 'settings', 'Sliders'],       # Main settings panel
    'header_tools': ['Tools', 'tools_panel', 'tool-panel'],        # Tools section
    'header_help_toggle': ['CircleHelp', 'help_mode', 'Help Mode'],# Help toggle in header
    'header_hints_recall': ['hints_recall', 'Lightbulb', 'hint_history'], # Hints recall button
    'header_overlay_toggle': ['overlay', 'Glasses', 'color overlay'], # Color overlay
    'header_theme_toggle': ['theme', 'Moon', 'Sun', 'dark mode'],  # Theme toggle
    'header_sync_toggle': ['cloud', 'Cloud', 'sync'],              # Cloud sync button
    'header_animation_toggle': ['animation', 'Sparkles', 'anim'],  # Animation toggle
    'header_view_toggle': ['Teacher', 'Student', 'view_toggle', 'GraduationCap'], # View mode toggle
    'header_view_teacher': ['Teacher', 'teacher_view'],            # Teacher mode button
    'header_view_student': ['Student', 'student_view'],            # Student mode button
    'header_xp_modal': ['XP', 'xp_modal', 'Trophy', 'level'],     # XP panel trigger
    'header_actions': ['actions', 'toolbar'],                       # Actions area
    'header_utils': ['utils', 'utilities'],                         # Utils area
    'header_settings_type': ['font', 'OpenDyslexic', 'settings_type'], # Font settings
    'header_settings_voice_pitch': ['pitch', 'voice_pitch'],       # Voice pitch setting
}

out = open('header_button_locations.txt', 'w', encoding='utf-8')

for key, search_terms in targets.items():
    out.write(f"\n{'='*60}\n")
    out.write(f"KEY: {key}\n")
    out.write(f"{'='*60}\n")
    
    # Check if already has data-help-key
    found_existing = False
    for i, line in enumerate(lines):
        if f'data-help-key="{key}"' in line:
            out.write(f"  ALREADY EXISTS at L{i+1}\n")
            found_existing = True
    
    if not found_existing:
        # Search for likely matching elements
        for term in search_terms:
            for i, line in enumerate(lines):
                if term in line and ('onClick' in line or 'button' in line.lower() or 'aria-label' in line or 'title=' in line):
                    # Only show lines in the header toolbar area (roughly L54800-55200 based on typical position)
                    if 54000 < i < 56000:
                        out.write(f"  CANDIDATE L{i+1}: {line.strip()[:120]}\n")

out.close()
print("Wrote header_button_locations.txt")
print("DONE")
