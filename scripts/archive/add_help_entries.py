"""
Generate and inject 131 missing HELP_STRINGS entries.
Each entry is a descriptive help tooltip based on the key name and context.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'

# The 131 missing keys grouped by category with generated descriptions
MISSING_ENTRIES = {
    # Adventure setup/UI
    'adventure_choice_btn': "Select this option to proceed with your chosen action in the adventure. Each choice affects the story's direction and your character's fate.",
    'adventure_choice_toggle': "Toggle between multiple-choice options and free-response input for adventure actions. Multiple choice provides guided options while free response allows creative storytelling.",
    'adventure_edit_options': "Edit the AI-generated adventure options before presenting them. Useful for teachers who want to guide the narrative or adjust difficulty.",
    'adventure_immersive_autoread': "Toggle automatic text-to-speech narration in immersive mode. When enabled, story text is read aloud automatically as it appears.",
    'adventure_immersive_exit': "Exit immersive reading mode and return to the standard adventure interface with all controls visible.",
    'adventure_immersive_inventory': "View your adventure inventory in immersive mode. Shows collected items, stats, and special abilities earned during the journey.",
    'adventure_immersive_toggle_ui': "Show or hide the adventure controls while in immersive mode. Minimizes distractions for a more focused reading experience.",
    'adventure_input_field': "Type your custom action or response here. Describe what your character does in the adventure. Be creative and detailed for better story outcomes.",
    'adventure_input_send': "Submit your typed response to continue the adventure. The AI will narrate the consequences of your action.",
    'adventure_resume_btn': "Resume a previously saved adventure from where you left off. Your progress, inventory, and story state are preserved.",
    'adventure_setup_chk_chance': "Enable dice-based chance mechanics. Actions succeed or fail based on dice rolls combined with strategy scores, adding unpredictability to the adventure.",
    'adventure_setup_chk_freeresponse': "Allow students to type custom responses instead of choosing from pre-generated options. Encourages creative writing and deeper engagement.",
    'adventure_setup_chk_lowqual': "Enable low-quality mode for faster generation on slower connections. Reduces AI response detail but improves speed significantly.",
    'adventure_setup_chk_story': "Enable social story mode. Adventures focus on social-emotional learning scenarios like navigating friendships, handling conflicts, or practicing empathy.",
    'adventure_setup_difficulty': "Set the adventure difficulty level. Higher difficulty means tougher challenges, more complex vocabulary, and harder dice checks.",
    'adventure_setup_input_mode': "Choose how students interact: multiple choice (structured options) or free response (open-ended typing). Can be changed mid-adventure.",
    'adventure_setup_language': "Select the language for adventure narration. The AI will generate story content in the chosen language for language learning integration.",
    'adventure_start_btn': "Begin a new adventure with your configured settings. This will generate the opening scene and first set of choices.",

    # Bot controls
    'bot_avatar': "AlloBot's avatar. Click to interact with AlloBot or access quick settings. AlloBot assists with lesson creation, provides tips, and offers pedagogical guidance.",
    'bot_mic_btn': "Activate voice input for AlloBot. Speak your request and AlloBot will process it. Requires microphone permission.",
    'bot_mute_btn': "Mute AlloBot's voice responses. When muted, AlloBot still displays text responses but won't use text-to-speech. Sound effects are also silenced.",
    'bot_settings_btn': "Open AlloBot settings. Configure personality, voice, response style, and behavior preferences for the AI assistant.",
    'bot_sleep_btn': "Put AlloBot to sleep. The assistant will stop providing proactive tips and suggestions until woken up. Useful for focused work sessions.",

    # Crossword
    'crossword_close_btn': "Close the crossword puzzle and return to the glossary view. Your progress is not saved.",

    # Dashboard
    'dashboard_detail_running_record': "View the running record for this student's reading session. Shows accuracy, self-corrections, error patterns, and fluency metrics.",

    # Democracy
    'democracy_toggle': "Toggle democratic decision-making mode. When enabled, students can vote on activity choices and content selection.",

    # Glossary
    'glossary_health_check': "Run a health check on your glossary. Identifies potential issues like missing definitions, low-quality images, terms without translations, and suggested additional vocabulary.",

    # Header controls
    'header_about': "View information about AlloFlow, including version, credits, and links to support resources.",
    'header_bot_toggle': "Show or hide AlloBot, the AI teaching assistant. AlloBot provides tips, answers questions, and helps navigate features.",
    'header_cloud_sync': "Sync your work to the cloud. Saves lesson content, student data, and settings for access from any device.",
    'header_dashboard': "Open the Student Analytics Dashboard. View student performance data, activity logs, safety flags, and assessment results.",
    'header_jump_lesson': "Jump to a specific lesson in your lesson history. Quickly navigate between saved lessons and units.",
    'header_settings_anim': "Toggle UI animations on or off. Disabling animations can improve performance on slower devices and reduce visual distractions for students who need it.",
    'header_settings_overlay': "Close this settings overlay and return to the main interface.",
    'header_settings_text': "Text accessibility settings. Adjust font size, spacing, line height, and reading aids to accommodate different visual needs.",
    'header_settings_text_bionic': "Toggle Bionic Reading mode. Bolds the first few letters of each word to create artificial fixation points, which can improve reading speed and focus for some readers.",
    'header_settings_text_font': "Choose a font family for content display. Options include OpenDyslexic (designed for readers with dyslexia), system fonts, and other accessible typefaces.",
    'header_settings_text_line_height': "Adjust the spacing between lines of text. Increased line height can improve readability for students with visual processing difficulties.",
    'header_settings_text_reset': "Reset all text settings to their default values. This affects font size, spacing, line height, and font family.",
    'header_settings_text_size': "Adjust the base font size for all content. Larger text benefits students with visual impairments or those who prefer bigger text.",
    'header_settings_text_spacing': "Adjust letter and word spacing. Increased spacing can improve readability for students with dyslexia or visual processing challenges.",
    'header_settings_theme': "Switch between light, dark, and high-contrast color themes. Dark mode reduces eye strain; high-contrast mode maximizes readability for visually impaired users.",
    'header_settings_voice': "Text-to-speech voice settings. Configure the voice used for reading content aloud, including speed, volume, and voice selection.",
    'header_settings_voice_select': "Choose which text-to-speech voice to use. Available voices depend on your browser and operating system. Some voices support multiple languages.",
    'header_settings_voice_speed': "Adjust text-to-speech reading speed. Slower speeds help with comprehension; faster speeds are good for review.",
    'header_settings_voice_volume': "Adjust the volume of text-to-speech audio output.",
    'header_support': "Support AlloFlow development. Links to donation options and ways to contribute to the project.",
    'header_tour_start': "Start the interactive guided tour. Walk through AlloFlow's main features with step-by-step explanations and highlights.",

    # Hints
    'hints_recall': "Recall previously generated hints. Shows the last set of scaffolding hints that were generated for the current content.",

    # History/Unit management
    'history_cancel_unit_btn': "Cancel creating a new unit and return to the regular lesson history view.",
    'history_create_unit_btn': "Create a new unit to organize your lessons. Units group related lessons together for curriculum planning.",
    'history_delete_unit_btn': "Delete this unit. Lessons inside the unit will be moved back to the unorganized list, not deleted.",
    'history_filter_unit_select': "Filter lesson history by unit. Shows only lessons belonging to the selected unit.",
    'history_item_drag': "Drag this lesson to reorder it within the history or move it into a different unit.",
    'history_move_down_btn': "Move this lesson down in the list order.",
    'history_move_to_unit_btn': "Move this lesson into a specific unit for better organization.",
    'history_move_up_btn': "Move this lesson up in the list order.",
    'history_rename_btn': "Rename this lesson or unit. Double-click the title to edit inline.",
    'history_save_unit_btn': "Save changes to this unit's name and settings.",
    'history_unit_name_input': "Enter a name for this unit (e.g., 'Civil War Unit', 'Fractions Chapter 4').",

    # Inventory
    'inventory_item': "An item in your adventure inventory. Items can provide special abilities, stat bonuses, or story-specific uses.",

    # Persona
    'persona_close': "Close the persona interview panel and return to the main content view.",

    # Socratic dialog
    'socratic_auto_read': "Automatically read Socratic dialog responses aloud using text-to-speech.",
    'socratic_auto_send': "Automatically send student responses after a pause, without requiring them to click Send.",
    'socratic_close': "Close the Socratic dialog panel.",
    'socratic_expand': "Expand the Socratic dialog to full-screen for a more focused conversation experience.",

    # Syntax game
    'syntax_check': "Check if your sentence construction is correct. Compares your arrangement against the target sentence.",
    'syntax_close': "Close the syntax building game and return to the content view.",
    'syntax_dropped_word': "A word that has been placed into the sentence construction area. Drag to reposition or double-click to remove.",
    'syntax_finish': "Submit your completed sentence for grading. Shows accuracy score and highlights any errors.",
    'syntax_next': "Move to the next sentence in the syntax practice sequence.",
    'syntax_pool_word': "A word in the available word pool. Drag or click to add it to your sentence construction.",

    # Venn diagram
    'venn_back_btn': "Go back to the Venn diagram category selection or previous view.",
    'venn_bank_item': "An unsorted item in the word bank. Drag it to Circle A, Circle B, or the shared overlap section.",
    'venn_move_a': "Move this item to Circle A (the left category).",
    'venn_move_b': "Move this item to Circle B (the right category).",
    'venn_move_bank': "Return this item to the unsorted word bank.",
    'venn_move_cancel': "Cancel moving this item and keep it in its current position.",
    'venn_move_shared': "Move this item to the shared/overlap section (belongs to both categories).",
    'venn_sorted_item': "An item that has been sorted into a Venn diagram section. Click to move it to a different section or back to the bank.",

    # Wizard
    'wizard_back_results_btn': "Go back to the search results to select a different standard.",
    'wizard_close_btn': "Close the setup wizard. Your current settings will be preserved.",
    'wizard_complete_btn': "Complete the wizard and apply all configured settings to begin generating content.",
    'wizard_content_next_btn': "Proceed to the next step in the content setup wizard.",
    'wizard_dok_select': "Select the Depth of Knowledge level for generated content. DOK 1 (Recall), DOK 2 (Skills/Concepts), DOK 3 (Strategic Thinking), DOK 4 (Extended Thinking).",
    'wizard_find_standard_btn': "Search for academic standards to align your content. Supports Common Core, NGSS, state-specific, and international standards.",
    'wizard_format_select': "Choose the output format for generated content (paragraph, bullets, outline, etc.).",
    'wizard_grade_option': "Select a grade level for the content. This affects vocabulary complexity, sentence structure, and concept depth.",
    'wizard_growth_goal_input': "Enter a student growth goal to personalize content generation. The AI will align activities and assessments to support this goal.",
    'wizard_instructions_input': "Add custom instructions for the AI content generator. Specify preferences, constraints, or focus areas for the generated lesson.",
    'wizard_interest_add_btn': "Add a student interest to personalize content. The AI will incorporate these interests into examples and scenarios.",
    'wizard_interest_input': "Type a student interest (e.g., 'soccer', 'dinosaurs', 'space'). Used to personalize content and increase engagement.",
    'wizard_interest_remove_btn': "Remove this interest from the personalization list.",
    'wizard_lang_add_btn': "Add a language for multilingual content generation.",
    'wizard_lang_common_select': "Select from commonly used languages for quick language addition.",
    'wizard_lang_input': "Type a language name to add for translation and multilingual support.",
    'wizard_lang_remove_btn': "Remove this language from the multilingual content list.",
    'wizard_length_select': "Choose the desired content length: brief (quick review), standard (full lesson), or extended (deep dive).",
    'wizard_level_select': "Select the reading or complexity level for the generated content.",
    'wizard_next_grade_btn': "Skip to the next grade level option.",
    'wizard_prev_btn': "Go back to the previous wizard step to modify your selections.",
    'wizard_region_input': "Enter your state or region for location-specific academic standards (e.g., 'Maine', 'California', 'UK').",
    'wizard_search_btn': "Search for academic standards matching your criteria.",
    'wizard_search_input': "Type keywords to search for academic standards (e.g., 'fractions', 'photosynthesis', 'narrative writing').",
    'wizard_search_result_link': "Click to view the full text of this academic standard on the standards website.",
    'wizard_search_result_select': "Select this standard to align your lesson content with it.",
    'wizard_skip_btn': "Skip this optional wizard step and continue with default settings.",
    'wizard_standard_select': "Choose an academic standard framework (Common Core, NGSS, state standards, etc.).",
    'wizard_std_manual_add_btn': "Manually add a standard code that you already know (e.g., 'CCSS.ELA-LITERACY.RL.5.1').",
    'wizard_std_manual_input': "Type a standard code to add manually.",
    'wizard_std_mode_ai': "Use AI-assisted standard search. Describe your topic and the AI will suggest matching standards.",
    'wizard_std_mode_manual': "Switch to manual standard entry. Type standard codes directly if you already know them.",
    'wizard_std_remove_btn': "Remove this standard from the lesson alignment.",
    'wizard_tone_select': "Select the writing tone for generated content (academic, conversational, encouraging, etc.).",
    'wizard_topic_input': "Enter the lesson topic or subject matter. This is the primary input for content generation.",
    'wizard_url_fetch_btn': "Fetch content from the entered URL. Extracts text from web pages for use as source material.",
    'wizard_url_input': "Enter a URL to import content from a web page. The text will be extracted and used as source material for lesson generation.",
    'wizard_verify_checkbox': "Enable content verification. The AI will fact-check generated content and flag potential inaccuracies.",
    'wizard_vocab_input': "Enter vocabulary terms to include in the generated content. These will be integrated into the lesson and added to the glossary.",

    # Word Sounds generator
    'ws_gen_count_slider': "Set the number of words to generate for the Word Sounds activity. More words create longer practice sessions.",
    'ws_gen_family_select': "Select a word family pattern (e.g., -at, -ig, -op) to generate words that share the same ending sounds.",
    'ws_gen_quick_add_btn': "Quickly add a custom word to the Word Sounds activity list.",
    'ws_gen_quick_add_input': "Type a word to add directly to the activity word list.",
    'ws_gen_session_slider': "Set the number of items per practice session. The session completes after this many words are practiced.",
    'ws_gen_src_custom': "Use custom-entered words as the word source. Type your own words for targeted phonics practice.",
    'ws_gen_src_family': "Generate words from word family patterns. Words will share common endings for pattern recognition practice.",
    'ws_gen_src_glossary': "Pull words from the lesson glossary as the word source. Reinforces vocabulary from the current lesson.",
    'ws_gen_syllable_max': "Set the maximum number of syllables for generated words. Limits word complexity for younger learners.",
    'ws_gen_syllable_min': "Set the minimum number of syllables for generated words.",
    'ws_gen_theme_input': "Enter an optional image theme for word illustrations (e.g., 'cartoon', 'pixel art', 'realistic'). Affects the style of generated images.",

    # XP system
    'xp_modal_trigger': "Open the XP (experience points) summary. View earned points, current level, streak bonuses, and achievement progress.",
}

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

original_count = len(lines)

# Find HELP_STRINGS closing brace
hs_start = None
hs_end = None
for i, l in enumerate(lines):
    if 'const HELP_STRINGS' in l:
        hs_start = i
        break

depth = 0
for i in range(hs_start, len(lines)):
    in_str = None
    escape = False
    for ch in lines[i]:
        if escape: escape = False; continue
        if ch == '\\':
            if in_str: escape = True
            continue
        if ch in ('"', "'", '`'):
            if in_str is None: in_str = ch
            elif in_str == ch: in_str = None
            continue
        if in_str: continue
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                hs_end = i
                break
    if hs_end: break

print(f"HELP_STRINGS: L{hs_start+1}-L{hs_end+1}")

# Check for duplicates before injecting
existing_keys = set()
for i in range(hs_start, hs_end + 1):
    m = re.match(r"\s+'(\w[\w_-]+)'\s*:", lines[i])
    if m:
        existing_keys.add(m.group(1))

to_add = {}
for key, desc in MISSING_ENTRIES.items():
    if key in existing_keys:
        pass  # Already exists
    else:
        to_add[key] = desc

print(f"Existing HELP_STRINGS keys: {len(existing_keys)}")
print(f"New keys to add: {len(to_add)}")
print(f"Skipped (already exist): {len(MISSING_ENTRIES) - len(to_add)}")

# Generate new lines
new_lines = []
for key in sorted(to_add.keys()):
    desc = to_add[key]
    # Escape double quotes in the description
    escaped = desc.replace('"', '\\"')
    new_lines.append(f'    \'{key}\': "{escaped}",\n')

# Insert before the closing };
for j, nl in enumerate(new_lines):
    lines.insert(hs_end + j, nl)

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

final_count = len(lines)
print(f"\nAdded {len(new_lines)} entries")
print(f"File: {original_count} -> {final_count} lines (+{final_count - original_count})")

# Measure new HELP_STRINGS size
hs_new_end = hs_end + len(new_lines)
new_size = sum(len(lines[i].encode('utf-8')) for i in range(hs_start, hs_new_end + 1))
print(f"New HELP_STRINGS size: {new_size} bytes ({new_size/1024:.1f} KB, {new_size/1024/1024:.3f} MB)")
