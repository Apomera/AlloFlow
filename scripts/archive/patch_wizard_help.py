"""
Fix wizard help mode overlay visibility.

Root cause: Help mode CSS only whitelists pointer-events for header and AlloBot.
Wizard modal elements with data-help-key are blocked by the overlay.

Fix:
1. Add CSS rule for [role="dialog"] [data-help-key] elements
2. Check for missing help_mode entries for wizard dropdowns
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
changes = 0

# ===================================================================
# 1. Add CSS whitelist for wizard modal [data-help-key] elements
# Insert after the AlloBot help-mode CSS block (after the last pointer-events rule)
# Target: after .help-mode-active [data-help-key="bot_avatar"] button { ... }
# ===================================================================
for i in range(32740, 32760):
    if 'help-mode-active [data-help-key="bot_avatar"] button' in lines[i]:
        # Find the closing brace of this CSS block
        for j in range(i, i + 5):
            if lines[j].strip() == '}':
                # Insert wizard modal CSS rule after this closing brace
                wizard_css = (
                    '        /* FIX: Wizard modal interactivity in Help Mode */\n'
                    '        .help-mode-active [role="dialog"] [data-help-key],\n'
                    '        .help-mode-active [role="dialog"] button,\n'
                    '        .help-mode-active [role="dialog"] select,\n'
                    '        .help-mode-active [role="dialog"] input {\n'
                    '            pointer-events: auto !important;\n'
                    '            cursor: help !important;\n'
                    '            z-index: 201 !important;\n'
                    '        }\n'
                )
                lines.insert(j + 1, wizard_css)
                print(f"[1] Added wizard modal CSS whitelist after L{j+1}")
                changes += 1
                break
        break

# ===================================================================
# 2. Check for missing help_mode entries for wizard dropdown keys
# ===================================================================
wizard_keys = [
    'wizard_tone_select', 'wizard_length_select', 'wizard_level_select',
    'wizard_dok_select', 'wizard_format_select', 'wizard_lang_common_select',
    'wizard_lang_input', 'wizard_interest_input', 'wizard_topic_input',
    'wizard_url_input', 'wizard_search_input',
]

missing_keys = []
for key in wizard_keys:
    found = False
    for i, l in enumerate(lines):
        if f'{key}:' in l and 'help_mode' in l:
            found = True
            break
        # Also check if key is defined anywhere in help_mode section
        if f"'{key}'" in l or f'"{key}"' in l:
            # Check if it's in a help_mode object
            if 'help_mode' in ''.join(lines[max(0,i-20):i+1]):
                found = True
                break
    if not found:
        # Search more broadly
        for i, l in enumerate(lines):
            if key in l and ('_title' in l or 'help_mode' in l):
                found = True
                break
    if not found:
        missing_keys.append(key)

print(f"\nMissing help_mode entries: {missing_keys}")
print(f"Found keys: {[k for k in wizard_keys if k not in missing_keys]}")

# ===================================================================
# 3. Add missing help_mode entries
# Find the help_mode section and add entries
# ===================================================================
if missing_keys:
    # Find the help_mode block
    help_mode_end = None
    for i in range(len(lines)):
        if 'help_mode:' in lines[i] and '{' in lines[i]:
            # This is the start of help_mode, find a good injection point
            # Look for wizard-related entries already in help_mode
            for j in range(i, min(len(lines), i + 2000)):
                if 'wizard_' in lines[j] and '_title' in lines[j]:
                    help_mode_end = j
            if help_mode_end is None:
                # Find the closing of help_mode
                for j in range(i + 1, min(len(lines), i + 3000)):
                    if lines[j].strip().startswith('},') and 'help_mode' not in lines[j]:
                        help_mode_end = j - 1
                        break
            break
    
    if help_mode_end:
        # Define help text for missing keys
        help_texts = {
            'wizard_tone_select': 'Writing Tone',
            'wizard_length_select': 'Content Length',
            'wizard_level_select': 'Reading Level',
            'wizard_dok_select': 'Depth of Knowledge',
            'wizard_format_select': 'Output Format',
            'wizard_lang_common_select': 'Quick Language Add',
            'wizard_lang_input': 'Language Input',
            'wizard_interest_input': 'Student Interests',
            'wizard_topic_input': 'Topic Input',
            'wizard_url_input': 'URL Input',
            'wizard_search_input': 'Search Query',
        }
        
        help_descriptions = {
            'wizard_tone_select': 'Choose how the generated content is written — informative, narrative, persuasive, humorous, or procedural. This adjusts vocabulary, sentence structure, and engagement style to match your instructional goals.',
            'wizard_length_select': 'Set the approximate word count for generated content. Choose from short (200 words) for quick reads to deep (2000 words) for comprehensive coverage. Longer texts allow more examples and detail.',
            'wizard_level_select': 'Override the grade level for this specific generation. Content complexity, vocabulary, and sentence length are automatically calibrated to your selection.',
            'wizard_dok_select': "Set Webb's Depth of Knowledge level. Level 1 (recall) uses simple fact-based content. Level 4 (extended thinking) creates complex texts requiring synthesis and analysis.",
            'wizard_format_select': 'Choose the output format for generated content — standard text, dialogue script, news report, podcast script, social media thread, poetry, or narrative story. Each format has a unique structure.',
            'wizard_lang_common_select': 'Quickly add a common language for multilingual output. Generated content will include translated versions in all selected languages.',
            'wizard_lang_input': 'Type a language name and press Enter or click + to add it for multilingual generation. Up to 4 languages can be added.',
            'wizard_interest_input': 'Add student interests (e.g., soccer, dinosaurs, space) to personalize generated content. The AI weaves these into examples and analogies for higher engagement.',
            'wizard_topic_input': 'Enter the subject or topic for AI-generated source material. Be specific for better results (e.g., \"Photosynthesis in desert plants\" rather than just \"Plants\").',
            'wizard_url_input': 'Paste a URL to import web content as source material. The system fetches, cleans, and extracts the main article text.',
            'wizard_search_input': 'Describe what you need and let the AI find relevant educational resources. Results include titles, descriptions, and direct links.',
        }
        
        new_entries = []
        for key in missing_keys:
            title = help_texts.get(key, key.replace('wizard_', '').replace('_', ' ').title())
            desc = help_descriptions.get(key, f'Configure the {title.lower()} setting for content generation.')
            new_entries.append(f"            {key}: \"{desc}\",\n")
            new_entries.append(f"            {key}_title: \"{title}\",\n")
        
        if new_entries:
            # Insert after the last wizard entry found
            insert_point = help_mode_end + 1
            header = "            // Wizard Step 3 & 4 Dropdowns\n"
            lines.insert(insert_point, header)
            for j, entry in enumerate(new_entries):
                lines.insert(insert_point + 1 + j, entry)
            print(f"[2] Added {len(missing_keys)} help_mode entries after L{insert_point}")
            changes += 1

if changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"\n{changes} total changes applied. New line count: {len(lines)}")
else:
    print("\nNo changes made")
