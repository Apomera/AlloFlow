"""Restore 64 unique HELP_STRINGS entries removed with the duplicate block."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'

# These entries only existed in the removed quoted block.
# Descriptions are based on what was visible in the removed block and standard functionality.
RESTORE_ENTRIES = {
    'dashboard_detail_running_record': "View the running record for this student's reading session. Shows accuracy, self-corrections, error patterns, and fluency metrics.",
    'glossary_health_check': "Run a health check on your glossary. Identifies missing definitions, incomplete entries, and suggests terms that should be added based on lesson content.",
    'history_cancel_unit_btn': "Cancel the current unit creation or editing operation and discard changes.",
    'history_create_unit_btn': "Create a new unit folder to organize your lesson history into logical groups.",
    'history_delete_unit_btn': "Delete this unit folder and its organization. Individual lessons are preserved but become unorganized.",
    'history_filter_unit_select': "Filter lesson history to show only lessons in the selected unit.",
    'history_item_drag': "Drag this lesson to reorder it within the current unit or move it to a different unit.",
    'history_move_down_btn': "Move this lesson down in the display order within the current unit.",
    'history_move_to_unit_btn': "Move this lesson to a different unit folder for better organization.",
    'history_move_up_btn': "Move this lesson up in the display order within the current unit.",
    'history_rename_btn': "Rename this unit folder to better describe its contents.",
    'history_save_unit_btn': "Save changes to the current unit name and organization.",
    'history_unit_name_input': "Enter a name for this unit folder to organize related lessons together.",
    'persona_close': "Close the persona configuration panel and return to the main interface.",
    'socratic_auto_read': "Toggle automatic text-to-speech reading of Socratic discussion prompts and responses.",
    'socratic_auto_send': "Enable automatic sending of Socratic prompts at timed intervals for guided discussion.",
    'socratic_close': "Close the Socratic discussion panel and return to the main lesson view.",
    'socratic_expand': "Expand the Socratic discussion panel to full view for deeper engagement.",
    'wizard_back_results_btn': "Go back to modify search criteria for standards lookup.",
    'wizard_close_btn': "Close the setup wizard. Your progress is saved and you can resume later.",
    'wizard_complete_btn': "Complete the wizard and generate your lesson with all configured settings applied.",
    'wizard_content_next_btn': "Proceed to the next wizard step after entering your source content.",
    'wizard_dok_select': "Select the Depth of Knowledge (DOK) level for generated content. Higher levels require more complex thinking.",
    'wizard_find_standard_btn': "Search for academic standards matching your topic and grade level using AI.",
    'wizard_format_select': "Choose the output format for generated content (lesson plan, worksheet, presentation, etc.).",
    'wizard_grade_option': "Select this grade level for your lesson. Determines vocabulary and concept complexity.",
    'wizard_growth_goal_input': "Enter a specific learning or growth goal for the lesson. This guides AI content generation.",
    'wizard_instructions_input': "Add custom instructions for the AI to follow when generating lesson content.",
    'wizard_interest_add_btn': "Add the entered interest to the student interest list for personalized content.",
    'wizard_interest_input': "Enter a student interest to personalize generated content (e.g., dinosaurs, space, sports).",
    'wizard_interest_remove_btn': "Remove this interest from the personalization list.",
    'wizard_lang_add_btn': "Add the selected language for multilingual content generation.",
    'wizard_lang_common_select': "Choose from commonly used languages for quick selection.",
    'wizard_lang_input': "Type a language name to add for multilingual content generation.",
    'wizard_lang_remove_btn': "Remove this language from the multilingual content list.",
    'wizard_length_select': "Set the desired length of generated content (brief, standard, detailed, comprehensive).",
    'wizard_level_select': "Select the reading or complexity level for generated content.",
    'wizard_next_grade_btn': "Proceed to the next step after selecting your grade level.",
    'wizard_prev_btn': "Go back to the previous wizard step to modify your selections.",
    'wizard_region_input': "Enter your state or region for location-specific academic standards.",
    'wizard_search_btn': "Search for standards matching your query and grade level.",
    'wizard_search_input': "Type a topic or skill description to search for matching academic standards.",
    'wizard_search_result_link': "Click to view the full standard description and details.",
    'wizard_search_result_select': "Select this standard to add it to your lesson alignment.",
    'wizard_skip_btn': "Skip the setup wizard and go directly to the main interface with default settings.",
    'wizard_standard_select': "Choose a standards framework (Common Core, NGSS, state-specific) for alignment.",
    'wizard_std_manual_add_btn': "Add the manually entered standard code to the lesson alignment.",
    'wizard_std_manual_input': "Type a standard code to add manually (e.g., CCSS.ELA-LITERACY.RL.3.2).",
    'wizard_std_mode_ai': "Use AI-assisted standard search. Describe your topic and the AI will suggest matching standards.",
    'wizard_std_mode_manual': "Switch to manual standard entry. Type standard codes directly if you already know them.",
    'wizard_std_remove_btn': "Remove this standard from the lesson alignment.",
    'wizard_tone_select': "Select the writing tone for generated content (academic, conversational, encouraging, etc.).",
    'wizard_topic_input': "Enter the lesson topic or subject matter. This is the primary input for content generation.",
    'wizard_url_fetch_btn': "Fetch content from the entered URL. Extracts text from web pages for use as source material.",
    'wizard_url_input': "Enter a URL to import content from a web page for lesson generation.",
    'wizard_verify_checkbox': "Enable content verification. The AI will fact-check generated content and flag potential inaccuracies.",
    'wizard_vocab_input': "Enter vocabulary terms to include in the generated content. These will be integrated and added to the glossary.",
}

# Note: tour-* keys use hyphens which are not valid as bareword JS keys
# They need to be quoted in the HELP_STRINGS object
TOUR_ENTRIES = {
    'tour-analysis-settings': "Tour step: Analysis settings panel. Learn how to configure AI text analysis options.",
    'tour-faq-settings': "Tour step: FAQ generation settings. Learn how to generate comprehension questions.",
    'tour-glossary-settings': "Tour step: Glossary settings panel. Learn how to manage vocabulary terms.",
    'tour-scaffolds-settings': "Tour step: Scaffolds settings panel. Learn about differentiated support tools.",
    'tour-simplified-settings': "Tour step: Simplified text settings. Learn how to generate leveled reading materials.",
    'tour-visual-settings': "Tour step: Visual support settings. Learn how to generate AI images for lessons.",
    'tour-wordsounds-panel': "Tour step: Word Sounds panel. Learn how to use the phonics practice activities.",
}

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

n = len(lines)

# Find insertion point: right before the closing }; of HELP_STRINGS
insert_idx = None
for i in range(32415, min(32425, len(lines))):
    if lines[i].strip() == '};':
        insert_idx = i
        break

if insert_idx is None:
    print("ERROR: Could not find HELP_STRINGS closing brace")
    sys.exit(1)

print(f"Inserting before L{insert_idx+1}: {lines[insert_idx].strip()}")

# Build new lines
new_lines = []
new_lines.append("    // Restored unique entries (wizard, history, socratic, persona)\n")
for key, value in sorted(RESTORE_ENTRIES.items()):
    new_lines.append(f'    {key}: "{value}",\n')

new_lines.append("    // Tour step entries (hyphenated keys)\n")
for key, value in sorted(TOUR_ENTRIES.items()):
    new_lines.append(f"    '{key}': \"{value}\",\n")

for j, line in enumerate(new_lines):
    lines.insert(insert_idx + j, line)

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

total_restored = len(RESTORE_ENTRIES) + len(TOUR_ENTRIES)
print(f"Restored {total_restored} entries ({len(RESTORE_ENTRIES)} bareword + {len(TOUR_ENTRIES)} quoted)")
print(f"File: {n} -> {len(lines)} lines")
