"""
Add 12 missing HELP_STRINGS definitions for data-help-keys used in JSX
but missing from the HELP_STRINGS object.
"""
import re

FILE = 'AlloFlowANTI.txt'

# The 12 missing definitions, written to be factually accurate
# based on examining the actual JSX context for each key.
MISSING_DEFS = {
    'dashboard_live_sync': "Connect to a live classroom session to monitor student progress in real time. Click to enter a session code — students in that session will appear in your dashboard with live-updating data (📡 badge). You can see their activity completion, quiz scores, XP, fluency history, game performance, and safety flag summaries as they work. Click again while connected to disconnect. Live sync uses Firestore and requires internet connectivity. Session codes are generated when students join a session. Data flows one-way from student to teacher for privacy compliance. Only available in district-hosted deployments (not Canvas).",

    'dashboard_safety_toggle': "Toggle the visibility of safety flag data in the teacher dashboard. When ON (default): the Safety Flags column appears in the student table showing flag counts and critical alerts (🚨). When OFF: the column is hidden for a cleaner view. Important: this toggle only controls display — safety flags are ALWAYS collected silently in the background regardless of this setting. AI-powered safety checks run on every student message in Socratic Chat, Persona Interviews, and Adventure Mode. Toggle state is saved to localStorage and persists across sessions. Use this to reduce visual clutter when safety monitoring is not your current focus.",

    'dashboard_rti_summary': "Class-level RTI (Response to Intervention) overview showing the distribution of students across intervention tiers. Displays: Tier 1 (green, on track), Tier 2 (yellow, needs monitoring), and Tier 3 (red, intensive support needed) counts with visual badges. Each tier shows student count and percentage. The summary also includes a donut-style visualization of the tier distribution. Use this to quickly identify how many students need additional support and to track class-wide trends over time. Tier assignments are calculated automatically from quiz scores, game performance, activity completion, and fluency data.",

    'dashboard_rti_monitor': "Individual student RTI progress monitoring panel showing detailed intervention data. Displays: current tier assignment with color-coded badge (Tier 1/2/3), classification reasoning, specific performance metrics (quiz scores, fluency, activity completion), sparkline trend charts for fluency and game scores over time, and actionable recommendations. Teachers can use the Configure button to adjust tier thresholds. This data supports IEP documentation and data-driven instructional decisions. Metrics update when new student data is imported or synced live.",

    'dashboard_detail_word_sounds': "Word Sounds performance data for the selected student. Shows metrics from the Word Sounds Studio phonics activities including: accuracy percentage, session scores, words practiced, and activity completion details. Data comes from Break It Down (phoneme segmentation), Rhyme Time (rhyming identification), and Letter Tracing activities. Use this to track phonemic awareness development and identify specific phonics skills that need additional practice. Visible only when the student has completed Word Sounds activities.",

    'dashboard_detail_games': "Comprehensive game performance summary for the selected student. Displays results across all vocabulary and content games including: Memory Match, Term-Definition Matching, Syntax Scramble, Crossword, Timeline, Concept Sort, Venn Diagram, Bingo, and Word Scramble. For each game played, shows: number of plays, accuracy/score, and performance trends. Use this data to identify which game-based learning activities are most effective for each student and where additional practice may be needed.",

    'dashboard_detail_label_challenge': "Label Challenge results for the selected student showing their performance in the visual labeling activity. Displays: average score across all attempts, best score achieved, number of attempts, and individual attempt results with timestamps. The Label Challenge tests students' ability to correctly label parts of AI-generated diagrams using glossary vocabulary. Use this to assess vocabulary knowledge in a visual/spatial context and track improvement over time.",

    'dashboard_detail_socratic': "Scrollable transcript of the selected student's Socratic Chatbot conversation history. Shows: total message count, the complete back-and-forth dialogue between student and AI tutor, and message timestamps. Student messages appear on the right (teal), AI responses on the left. The Socratic Chatbot guides students through content comprehension using questioning techniques rather than direct answers. Review these transcripts to: assess student thinking processes, identify misconceptions, evaluate depth of engagement, and inform differentiated instruction.",

    'bridge_mode_button': "Open Bridge Mode to share content across student devices during a live session. Bridge Mode enables: sending glossary terms, simplified text, quizzes, and other generated resources directly to connected student devices. Students receive the content instantly without needing to navigate or configure anything. Use this for synchronized whole-class activities, distributing differentiated materials, and ensuring all students have access to the same resources.",

    'roster_manage_button': "Open the student roster management panel. The Roster panel lets teachers: view all students in the current session, manage student nicknames and settings, assign differentiated resources to specific students or groups, configure group-specific settings (reading level, visual density, TTS speed, language), and create student groups for targeted instruction. The roster is populated from session joins and can be manually edited.",

    'roster_panel_header': "Student Roster panel header showing the class roster management interface. From here you can: see all connected students and their online status, create and manage student groups, assign differentiated settings per group (reading level, visual density, karaoke mode, TTS speed, language), and configure session-level controls. Groups enable differentiated instruction — each group can have its own resource library and display preferences.",

    'visuals_layout_mode': "Choose how AI-generated images are arranged on the page. Layout modes include: AI Art Director (auto) — AI analyzes the content and automatically selects the most appropriate layout; Single Image — one focused illustration; Before & After — two images showing change or contrast; Comparison — side-by-side images for comparing concepts; Sequence/Steps — numbered images showing a process or timeline; Labeled Diagram — an annotated image with text labels pointing to key parts. The AI Art Director mode uses your content context to intelligently select the best layout without manual configuration.",
}

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the end of HELP_STRINGS block — we insert just before the closing };
# Find the last entry in HELP_STRINGS and insert after it
lines = content.split('\n')
hs_start = None
hs_end = None
brace_depth = 0
for i, line in enumerate(lines):
    if 'const HELP_STRINGS = {' in line:
        hs_start = i
        brace_depth = 1
        continue
    if hs_start is not None and hs_end is None:
        brace_depth += line.count('{') - line.count('}')
        if brace_depth <= 0:
            hs_end = i
            break

if hs_end is None:
    print("❌ Could not find end of HELP_STRINGS block")
    exit(1)

# Build the new entries
new_entries = []
new_entries.append("    // Dashboard & Toolbar (added by audit)")
for key, value in sorted(MISSING_DEFS.items()):
    escaped_value = value.replace('"', '\\"')
    new_entries.append(f'    \'{key}\': "{escaped_value}",')

insert_text = '\n'.join(new_entries)

# Insert before the closing line of HELP_STRINGS
# The closing line should be something like "  };"
closing_line = lines[hs_end]
lines[hs_end] = insert_text + '\n' + closing_line

content = '\n'.join(lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ Added {len(MISSING_DEFS)} missing HELP_STRINGS definitions")
for key in sorted(MISSING_DEFS.keys()):
    print(f"  + {key}")
