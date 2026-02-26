"""
Phase C+ — Line-Level Implementation
Handles CRLF line endings properly by working line-by-line.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================
# 1. Expand handleApplyRosterGroup
# ============================
for i, l in enumerate(lines):
    if 'adventureCustomInstructions' in l and 'setAdventureCustomInstructions' in l and 'p.' in l:
        # This is the line: if (p.adventureCustomInstructions) setAdventureCustomInstructions(p.adventureCustomInstructions);
        # Check if next lines already have selectedLanguages
        next_lines = ''.join(lines[i+1:i+4])
        if 'p.selectedLanguages' not in next_lines:
            indent = '      '
            new_lines = [
                f"{indent}if (p.selectedLanguages && Array.isArray(p.selectedLanguages)) setSelectedLanguages(p.selectedLanguages);\r\n",
                f"{indent}if (p.targetStandards && Array.isArray(p.targetStandards)) {{ setTargetStandards(p.targetStandards); setStandardInputValue(''); }}\r\n",
                f"{indent}if (p.useEmojis !== undefined) setUseEmojis(p.useEmojis);\r\n",
                f"{indent}if (p.textFormat) setTextFormat(p.textFormat);\r\n",
            ]
            lines = lines[:i+1] + new_lines + lines[i+1:]
            changes += 1
            print(f"[OK] 1. Expanded handleApplyRosterGroup after L{i+1}")
        else:
            print("[OK] 1. handleApplyRosterGroup already expanded")
        break

# ============================
# 2a. Expand batch save
# ============================
for i, l in enumerate(lines):
    if 'custom: leveledTextCustomInstructions' in l and 'saved' in lines[max(0,i-3):i+1].__repr__():
        # Check if already expanded
        next_lines = ''.join(lines[i+1:i+5])
        if 'selectedLangs' not in next_lines and 'selectedLangs' not in l:
            indent = '                  '
            new_lines = [
                f"{indent}selectedLangs: selectedLanguages,\r\n",
                f"{indent}standards: targetStandards,\r\n",
                f"{indent}emojis: useEmojis,\r\n",
                f"{indent}fmt: textFormat\r\n",
            ]
            # Replace the closing brace line
            # Current line ends with just the property
            lines = lines[:i+1] + new_lines + lines[i+1:]
            changes += 1
            print(f"[OK] 2a. Expanded batch save after L{i+1}")
        else:
            print("[OK] 2a. Batch save already expanded")
        break

# ============================
# 2b. Expand batch apply (in handleBatchGenerateForRoster)
# ============================
for i, l in enumerate(lines):
    if 'profile.leveledTextCustomInstructions' in l and 'setLeveledTextCustomInstructions' in l and i > 36700:
        # This is in the batch handler, not the apply handler
        next_lines = ''.join(lines[i+1:i+6])
        if 'profile.selectedLanguages' not in next_lines:
            indent = '              '
            new_lines = [
                f"{indent}if (profile.selectedLanguages && Array.isArray(profile.selectedLanguages)) setSelectedLanguages(profile.selectedLanguages);\r\n",
                f"{indent}if (profile.targetStandards && Array.isArray(profile.targetStandards)) {{ setTargetStandards(profile.targetStandards); setStandardInputValue(''); }}\r\n",
                f"{indent}if (profile.useEmojis !== undefined) setUseEmojis(profile.useEmojis);\r\n",
                f"{indent}if (profile.textFormat) setTextFormat(profile.textFormat);\r\n",
            ]
            lines = lines[:i+1] + new_lines + lines[i+1:]
            changes += 1
            print(f"[OK] 2b. Expanded batch apply after L{i+1}")
        else:
            print("[OK] 2b. Batch apply already expanded")
        break

# ============================
# 2c. Expand batch restore
# ============================
for i, l in enumerate(lines):
    if 'saved.custom' in l and 'setLeveledTextCustomInstructions' in l:
        next_lines = ''.join(lines[i+1:i+5])
        if 'saved.selectedLangs' not in next_lines:
            indent = '              '
            new_lines = [
                f"{indent}setSelectedLanguages(saved.selectedLangs);\r\n",
                f"{indent}setTargetStandards(saved.standards);\r\n",
                f"{indent}setUseEmojis(saved.emojis);\r\n",
                f"{indent}setTextFormat(saved.fmt);\r\n",
            ]
            lines = lines[:i+1] + new_lines + lines[i+1:]
            changes += 1
            print(f"[OK] 2c. Expanded batch restore after L{i+1}")
        else:
            print("[OK] 2c. Batch restore already expanded")
        break

# ============================
# 3. Remove toolbar button
# ============================
for i, l in enumerate(lines):
    if 'setIsRosterKeyOpen(true)' in l and 'bg-purple' in l:
        # Find the end of this button block (</button>)
        end = i
        for j in range(i, min(i+10, len(lines))):
            if '</button>' in lines[j]:
                end = j
                break
        if 'Class Roster moved' not in lines[max(0,i-1)]:
            for k in range(i, end+1):
                lines[k] = ''
            lines[i] = '                    {/* Class Roster moved to sidebar strip */}\r\n'
            changes += 1
            print(f"[OK] 3. Removed toolbar button (L{i+1}-L{end+1})")
        else:
            print("[OK] 3. Toolbar button already removed")
        break

# ============================
# 4. Replace student profiles UI with compact strip
# ============================
profiles_start = None
profiles_end = None
for i, l in enumerate(lines):
    if 'ui-student-profiles' in l:
        profiles_start = i - 1  # the condition line above
        break

if profiles_start is not None:
    # Find the end: look for the next {(!isTeacherMode
    for j in range(profiles_start + 1, min(profiles_start + 100, len(lines))):
        if '{(!isTeacherMode' in lines[j] or "(!isTeacherMode" in lines[j]:
            profiles_end = j - 1  # the )} line just before
            break
    
    if profiles_end:
        compact_strip = '''            {isTeacherMode && activeSidebarTab === 'history' && !isIndependentMode && (
            <div id="ui-roster-strip" className="bg-white rounded-3xl shadow-indigo-500/10 border border-slate-200 overflow-hidden shrink-0">
                <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                    <div className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                        <ClipboardList size={16} /> {t('roster.strip_title') || 'Class Groups'}
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsRosterKeyOpen(true)} className="p-1.5 rounded-md hover:bg-indigo-100 text-indigo-600" title={t('roster.title') || 'Manage Roster'} aria-label={t('roster.title')} data-help-key="roster_manage_button">
                            <Settings size={14} />
                        </button>
                    </div>
                </div>
                <div className="p-3">
                    {rosterKey && Object.keys(rosterKey.groups || {}).length > 0 ? (
                        <>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {Object.entries(rosterKey.groups).map(([gid, g]) => (
                                    <button key={gid} onClick={() => handleApplyRosterGroup(gid)}
                                        className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all hover:scale-105 border cursor-pointer"
                                        style={{ backgroundColor: (g.color || '#6366f1') + '20', borderColor: (g.color || '#6366f1') + '60', color: (g.color === '#f5f5f5' || !g.color) ? '#334155' : g.color }}
                                        title={`${g.name} \\u00B7 ${g.profile?.gradeLevel || 'No grade'} \\u00B7 ${g.profile?.leveledTextLanguage || 'English'}`}
                                    >
                                        <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: g.color || '#6366f1' }} />
                                        {g.name}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => { setIsRosterKeyOpen(true); setTimeout(() => setShowBatchConfig(true), 300); }}
                                disabled={!sourceText}
                                className="w-full px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 border border-amber-200"
                            >
                                <Layers size={14} /> {t('roster.batch_generate') || 'Differentiate by Group'}
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-2">
                            <p className="text-xs text-slate-400 mb-1">{t('roster.strip_empty') || 'No class roster yet'}</p>
                            <button onClick={() => setIsRosterKeyOpen(true)} className="text-xs text-indigo-600 font-bold hover:underline">
                                {t('roster.strip_create') || 'Create one'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            )}
'''
        strip_lines = [l + '\r\n' if not l.endswith('\r\n') else l for l in compact_strip.split('\n')]
        lines[profiles_start:profiles_end+1] = strip_lines
        changes += 1
        print(f"[OK] 4. Replaced student profiles UI (L{profiles_start+1}-L{profiles_end+1}) with compact strip")
    else:
        print("[WARN] 4. Could not find profiles block end")
else:
    if any('ui-roster-strip' in l for l in lines):
        print("[OK] 4. Compact strip already present")
    else:
        print("[WARN] 4. Student profiles block not found")

# ============================
# 5. Add localization keys
# ============================
has_strip_title = any('strip_title' in l for l in lines)
if not has_strip_title:
    for i, l in enumerate(lines):
        if 'batch_full_pack' in l and 'Full Resource Pack' in l:
            indent = '      '
            new_keys = [
                f'{indent}strip_title: "Class Groups",\r\n',
                f'{indent}strip_empty: "No class roster yet",\r\n',
                f'{indent}strip_create: "Create one",\r\n',
                f'{indent}emojis_label: "Use Emojis",\r\n',
                f'{indent}format_standard: "Standard Text",\r\n',
                f'{indent}format_bullets: "Bullet Points",\r\n',
                f'{indent}format_outline: "Outline",\r\n',
            ]
            lines = lines[:i+1] + new_keys + lines[i+1:]
            changes += 1
            print(f"[OK] 5. Added 7 localization keys after L{i+1}")
            break
else:
    print("[OK] 5. Localization keys already present")

# ============================
# 6. Add emoji/textFormat controls to RosterKeyPanel group profile UI
# ============================
# Find the adventure custom instructions control in the panel
has_emoji_control = any('roster.emojis_label' in l for l in lines)
if not has_emoji_control:
    for i, l in enumerate(lines):
        if 'adventureCustomInstructions' in l and 'handleSetGroupProfile' in l:
            # Find the next closing div/section
            for j in range(i+1, min(i+15, len(lines))):
                if '</div>' in lines[j]:
                    indent = '                                '
                    new_controls = [
                        f'{indent}{{/* Emoji & Format Preferences */}}\r\n',
                        f'{indent}<div className="flex gap-3 mt-2">\r\n',
                        f'{indent}    <label className="flex items-center gap-1.5 text-xs cursor-pointer">\r\n',
                        f'''{indent}        <input type="checkbox" checked={{g.profile?.useEmojis || false}} onChange={{e => handleSetGroupProfile(gid, 'useEmojis', e.target.checked)}} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />\r\n''',
                        f'''{indent}        <span className="text-slate-600 font-medium">😀 {{t('roster.emojis_label') || 'Use Emojis'}}</span>\r\n''',
                        f'{indent}    </label>\r\n',
                        f'''{indent}    <select aria-label="Text Format" value={{g.profile?.textFormat || 'Standard Text'}} onChange={{e => handleSetGroupProfile(gid, 'textFormat', e.target.value)}} className="text-xs border border-slate-200 rounded-md px-2 py-1">\r\n''',
                        f'''{indent}        <option value="Standard Text">{{t('roster.format_standard') || 'Standard Text'}}</option>\r\n''',
                        f'''{indent}        <option value="Bullet Points">{{t('roster.format_bullets') || 'Bullet Points'}}</option>\r\n''',
                        f'''{indent}        <option value="Outline">{{t('roster.format_outline') || 'Outline'}}</option>\r\n''',
                        f'{indent}    </select>\r\n',
                        f'{indent}</div>\r\n',
                    ]
                    lines = lines[:j] + new_controls + lines[j:]
                    changes += 1
                    print(f"[OK] 6. Added emoji & format controls before L{j+1}")
                    break
            break
else:
    print("[OK] 6. Emoji controls already present")

# ============================
# SAVE
# ============================
open(filepath, 'w', encoding='utf-8').writelines(lines)
print(f"\n✅ Total {changes} changes applied.")
