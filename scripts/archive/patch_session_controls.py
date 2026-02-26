"""
Implement dual count-based session controls for Word Sounds.

Changes:
1. Add orthoSessionGoal state (L1474 area)
2. Replace spelling toggle with ortho slider in modal UI (L2074-2097)
3. Rename session slider label (L1850-1862)
4. Derive includeOrthographic from orthoSessionGoal > 0 (L4560-4564)
5. Update adaptive director transition logic (L7308-7366)
6. Update session completion check (L7615)
7. Add orthoSessionGoal to WS_INITIAL_STATE (L29574)
8. Add to reducer destructure and setter (L30563, L30569)
9. Pass new props to WordSoundsModal (L60981)
10. Update WordSoundsModal default props (L3260)
11. Add localization strings
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
changes = 0

# ===================================================================
# 1. Add orthoSessionGoal state declaration (after L1474)
# ===================================================================
for i in range(1470, 1480):
    if 'wordSoundsSessionGoal' in lines[i] and 'useState' in lines[i]:
        # Add orthoSessionGoal state after this line
        new_line = "        const [orthoSessionGoal, setOrthoSessionGoal] = React.useState(0); // Spelling items per session (0 = disabled)\r\n"
        lines.insert(i + 1, new_line)
        print(f"[1] Added orthoSessionGoal state after L{i+1}")
        changes += 1
        break

# ===================================================================
# 2. Derive includeOrthographic from orthoSessionGoal
# Change: const [includeOrthographic, setIncludeOrthographic] = React.useState(false);
# To: a derived constant
# ===================================================================
for i in range(1470, 1480):
    if 'includeOrthographic' in lines[i] and 'useState' in lines[i]:
        lines[i] = "    const includeOrthographic = orthoSessionGoal > 0; // DERIVED from orthoSessionGoal slider\r\n"
        print(f"[2] Derived includeOrthographic at L{i+1}")
        changes += 1
        break

# ===================================================================
# 3. Update session slider label: "Items per Session" -> "Sound Activities per Session"
# ===================================================================
for i in range(1845, 1870):
    if "'word_sounds.activity_length'" in lines[i] and 'Items per Session' in lines[i]:
        lines[i] = lines[i].replace(
            "t('word_sounds.activity_length', '🎯 Items per Session')",
            "t('word_sounds.phono_activity_length', '🎵 Sound Activities per Session')"
        )
        print(f"[3] Updated slider label at L{i+1}")
        changes += 1
        break

# Update the hint text below the slider
for i in range(1855, 1870):
    if "'word_sounds.activity_length_hint'" in lines[i]:
        lines[i] = lines[i].replace(
            "t('word_sounds.activity_length_hint', 'Session completes after this many correct answers')",
            "t('word_sounds.phono_activity_length_hint', 'Phonological activities complete after this many correct answers')"
        )
        print(f"[3b] Updated slider hint at L{i+1}")
        changes += 1
        break

# ===================================================================
# 4. Replace spelling toggle (L2074-2097) with ortho slider
# ===================================================================
# Find the spelling toggle section
toggle_start = None
toggle_end = None
for i in range(2070, 2105):
    if 'Spelling Activities Toggle' in lines[i]:
        toggle_start = i
    if toggle_start and i > toggle_start and lines[i].strip() == '</div>' and '</div>' in lines[i-1].strip():
        # Count the closing divs to find the right one
        pass
    if toggle_start and '</div>' in lines[i] and i > toggle_start + 15:
        # Check if this is the outer div close
        toggle_end = i
        break

# More precise: find from "Spelling Activities Toggle" comment to the closing </div> of the section
for i in range(2070, 2100):
    if 'Spelling Activities Toggle' in lines[i]:
        toggle_start = i
        break

if toggle_start:
    # Count div nesting from toggle_start+1
    depth = 0
    for i in range(toggle_start + 1, toggle_start + 30):
        l = lines[i]
        depth += l.count('<div') - l.count('</div')
        if depth <= 0:
            toggle_end = i
            break

if toggle_start is not None and toggle_end is not None:
    print(f"[4] Replacing spelling toggle L{toggle_start+1}-L{toggle_end+1}")
    ortho_slider = [
        '                                {/* Spelling Activities Count - Slider Control */}\r\n',
        '                                <div className="mt-4 pt-4 border-t border-slate-200">\r\n',
        '                                    <div className={`bg-white p-4 rounded-xl border ${includeLessonPlan ? \'opacity-50 cursor-not-allowed border-slate-200\' : orthoSessionGoal > 0 ? \'border-indigo-300 bg-indigo-50/30\' : \'border-slate-200\'} shadow-sm`}>\r\n',
        '                                        <div className="flex justify-between items-center mb-2">\r\n',
        '                                            <span className="font-bold text-slate-700">{t(\'word_sounds.ortho_activity_length\', \'🔤 Spelling Activities per Session\')}</span>\r\n',
        '                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${orthoSessionGoal > 0 ? \'bg-indigo-100 text-indigo-700\' : \'bg-slate-100 text-slate-500\'}`}>{orthoSessionGoal || \'Off\'}</span>\r\n',
        '                                        </div>\r\n',
        '                                        <input aria-label="Spelling session goal slider" \r\n',
        '                                            type="range" min="0" max="100" step="5" \r\n',
        '                                            data-help-key="ws_gen_ortho_slider" value={orthoSessionGoal || 0} \r\n',
        '                                            onChange={(e) => !includeLessonPlan && setOrthoSessionGoal(parseInt(e.target.value))}\r\n',
        '                                            className={`w-full ${includeLessonPlan ? \'opacity-50\' : \'\'} accent-indigo-500 cursor-pointer`}\r\n',
        '                                            disabled={includeLessonPlan}\r\n',
        '                                        />\r\n',
        '                                        <p className="text-xs text-slate-500 mt-2">\r\n',
        '                                            {includeLessonPlan \r\n',
        '                                                ? \'⚠️ Controlled by Lesson Plan mode\' \r\n',
        '                                                : orthoSessionGoal > 0 \r\n',
        '                                                    ? t(\'word_sounds.ortho_activity_hint_on\', `Spelling activities begin after sound activities complete (${orthoSessionGoal} items)`)\r\n',
        '                                                    : t(\'word_sounds.ortho_activity_hint_off\', \'Slide right to add spelling practice after phonics activities\')\r\n',
        '                                            }\r\n',
        '                                        </p>\r\n',
        '                                    </div>\r\n',
        '                                </div>\r\n',
    ]
    lines[toggle_start:toggle_end + 1] = ortho_slider
    print(f"[4] Replaced toggle with slider ({toggle_end - toggle_start + 1} old lines -> {len(ortho_slider)} new lines)")
    changes += 1
else:
    print(f"[WARN] Could not find toggle section: start={toggle_start}, end={toggle_end}")

# ===================================================================
# 5. Update WS_INITIAL_STATE (add orthoSessionGoal)
# ===================================================================
# Re-read lines since insert may have shifted
for i in range(len(lines)):
    if 'wordSoundsSessionGoal: 30,' in lines[i] and 'INITIAL' not in lines[i]:
        # Find the actual initial state block
        pass
for i in range(29500, min(len(lines), 29600)):
    if 'wordSoundsSessionGoal: 30,' in lines[i]:
        new_line = '  orthoSessionGoal: 0,\r\n'
        lines.insert(i + 1, new_line)
        print(f"[5] Added orthoSessionGoal to WS_INITIAL_STATE after L{i+1}")
        changes += 1
        break

# ===================================================================
# 6. Add to reducer destructure and setter
# ===================================================================
for i in range(len(lines)):
    if 'wordSoundsSessionGoal, wordSoundsSessionProgress' in lines[i]:
        lines[i] = lines[i].replace(
            'wordSoundsSessionGoal, wordSoundsSessionProgress',
            'wordSoundsSessionGoal, orthoSessionGoal, wordSoundsSessionProgress'
        )
        print(f"[6] Added orthoSessionGoal to reducer destructure at L{i+1}")
        changes += 1
        break

# Add setter after setWordSoundsSessionGoal
for i in range(len(lines)):
    if "field: 'wordSoundsSessionGoal'" in lines[i]:
        new_setter = "  const setOrthoSessionGoal = (v) => wsDispatch({ type: 'WS_SET', field: 'orthoSessionGoal', value: v });\r\n"
        lines.insert(i + 1, new_setter)
        print(f"[6b] Added setOrthoSessionGoal setter after L{i+1}")
        changes += 1
        break

# ===================================================================
# 7. Update WordSoundsModal default props (L3260 area)
# ===================================================================
for i in range(3255, 3275):
    if 'includeOrthographic = false,' in lines[i]:
        # Replace with orthoSessionGoal prop
        lines[i] = '    orthoSessionGoal = 0,\r\n'
        print(f"[7] Replaced includeOrthographic prop with orthoSessionGoal at L{i+1}")
        changes += 1
        break

# Also find and remove setIncludeOrthographic prop
for i in range(3255, 3275):
    if 'setIncludeOrthographic,' in lines[i]:
        lines[i] = '    setOrthoSessionGoal,\r\n'
        print(f"[7b] Replaced setIncludeOrthographic with setOrthoSessionGoal at L{i+1}")
        changes += 1
        break

# Add includeOrthographic derivation inside the modal component (after props destructure)
# Find where the component body starts — after the prop defaults
for i in range(3270, 3320):
    l = lines[i].strip()
    if l.startswith('}) ') or (l.startswith('}') and ')' in l and '{' not in l):
        # This is the closing of the destructuring
        # Add derived value after
        new_derivation = '    const includeOrthographic = orthoSessionGoal > 0; // Derived inside modal\r\n'
        lines.insert(i + 1, new_derivation)
        print(f"[7c] Added includeOrthographic derivation inside modal after L{i+1}")
        changes += 1
        break

# ===================================================================
# 8. Update prop passing at call site (L60981 area)
# ===================================================================
# Find and update includeOrthographic prop to orthoSessionGoal
for i in range(60960, min(len(lines), 61010)):
    if 'includeOrthographic={includeOrthographic}' in lines[i]:
        lines[i] = lines[i].replace(
            'includeOrthographic={includeOrthographic}',
            'orthoSessionGoal={orthoSessionGoal}'
        )
        print(f"[8a] Updated prop name at call site L{i+1}")
        changes += 1
        break

for i in range(60960, min(len(lines), 61010)):
    if 'setIncludeOrthographic={setIncludeOrthographic}' in lines[i]:
        lines[i] = lines[i].replace(
            'setIncludeOrthographic={setIncludeOrthographic}',
            'setOrthoSessionGoal={setOrthoSessionGoal}'
        )
        print(f"[8b] Updated setter prop at call site L{i+1}")
        changes += 1
        break

# ===================================================================
# 9. Update session completion check (L7615 area)
# Currently: if (wordSoundsScore.correct >= wordSoundsSessionGoal)
# New: check phono vs ortho separately
# ===================================================================
# Note: line numbers shifted due to inserts. Search by content.
for i in range(7600, min(len(lines), 7660)):
    if 'wordSoundsScore.correct >= wordSoundsSessionGoal' in lines[i]:
        old = lines[i]
        # The total goal is phonoGoal + orthoGoal
        lines[i] = lines[i].replace(
            'wordSoundsScore.correct >= wordSoundsSessionGoal',
            'wordSoundsScore.correct >= (wordSoundsSessionGoal + (orthoSessionGoal || 0))'
        )
        if lines[i] != old:
            print(f"[9] Updated completion check at L{i+1}")
            changes += 1
        break

# ===================================================================
# 10. Update adaptive director: phono->ortho transition trigger
# Currently gated by streak + includeOrthographic (L7333 area)
# Add: also check if phono goal is met for transition
# ===================================================================
# Find the transition from last phono activity to ortho
for i in range(7320, min(len(lines), 7380)):
    l = lines[i].strip()
    if 'else if (includeOrthographic)' in l:
        # Add phono-count gating comment
        lines[i] = lines[i].replace(
            'else if (includeOrthographic)',
            'else if (includeOrthographic && wordSoundsScore.correct >= wordSoundsSessionGoal)'
        )
        print(f"[10] Added phono goal check to ortho transition at L{i+1}")
        changes += 1
        break

if changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"\n{changes} total changes applied. New line count: {len(lines)}")
else:
    print("\nNo changes made")
