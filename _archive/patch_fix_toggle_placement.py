"""
Fix: Move Consistent Characters checkbox into its own standalone container,
separate from the Story Mode and other checkboxes.
Applies to both setup panels (compact setup ~L59390 and full setup modal ~L66450).
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
outpath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\diag_output.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0
lines = []

# ============================================================
# FIX 1: Compact setup panel (~L59390-59406)
# Problem: The Consistent Characters label is wedged between the Story Mode
# <input> and the Story Mode <label>, inside the Story Mode's outer <div>.
# Solution: Remove it from inside the Story Mode div and place it as its own
# standalone div container AFTER the Story Mode div (after </div> at L59406).
# ============================================================

# The misplaced block is this exact string (between Story Mode input and Story Mode label):
old_compact = '''                                                                <label className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${adventureConsistentCharacters ? 'bg-violet-50 border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${(!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings) ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <input type="checkbox" className="accent-violet-500 w-4 h-4" data-help-key="adventure_setup_chk_consistent_characters" checked={adventureConsistentCharacters} onChange={(e) => setAdventureConsistentCharacters(e.target.checked)} disabled={!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings}/>
                                    <div><span className="font-bold text-sm">🎭 Consistent Characters</span><p className="text-xs text-slate-500 mt-0.5">Generate visual cast with persistent descriptions across scenes</p></div>
                                </label>
<label htmlFor="storyMode"'''

# Replace with just the Story Mode label (remove the character checkbox from here)
new_compact = '''<label htmlFor="storyMode"'''

if old_compact in content:
    content = content.replace(old_compact, new_compact, 1)
    fixes += 1
    lines.append("1. Removed misplaced Consistent Characters from compact Story Mode container")
else:
    lines.append("1. SKIP - compact misplaced block not found")
    # Debug: show what's around the Story Mode area
    idx = content.find('adventure_setup_chk_consistent_characters')
    if idx > 0:
        lines.append(f"   Found consistent_characters at pos {idx}")
        lines.append(f"   Context: {repr(content[idx-200:idx+200])[:200]}")

# Now insert it as a standalone div AFTER the Story Mode div closes
# The Story Mode div ends with </div> after the story_mode_desc span
old_story_mode_close = '''                                    <span className="text-[9px] font-normal opacity-70 hidden sm:inline">{t('adventure.story_mode_desc')}</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-2 bg-purple-100/50 p-2 rounded border border-purple-200" data-help-key="adventure_low_quality">'''

new_story_mode_close = '''                                    <span className="text-[9px] font-normal opacity-70 hidden sm:inline">{t('adventure.story_mode_desc')}</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-2 bg-violet-100/50 p-2 rounded border border-violet-200" data-help-key="adventure_consistent_characters">
                                <input aria-label={t('common.toggle_consistent_characters') || 'Toggle consistent characters'}
                                    id="advConsistentChars"
                                    type="checkbox"
                                    data-help-key="adventure_setup_chk_consistent_characters" checked={adventureConsistentCharacters}
                                    onChange={(e) => setAdventureConsistentCharacters(e.target.checked)}
                                    disabled={!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings}
                                    className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500 cursor-pointer"
                                />
                                <label htmlFor="advConsistentChars" className="text-xs font-bold text-violet-800 cursor-pointer select-none flex items-center gap-2">
                                    🎭 {t('adventure.consistent_characters_label') || 'Consistent Characters'}
                                    <span className="text-[9px] font-normal opacity-70 hidden sm:inline">{t('adventure.consistent_characters_desc') || 'Persistent visual cast across scenes'}</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-2 bg-purple-100/50 p-2 rounded border border-purple-200" data-help-key="adventure_low_quality">'''

if old_story_mode_close in content:
    content = content.replace(old_story_mode_close, new_story_mode_close, 1)
    fixes += 1
    lines.append("2. Added standalone Consistent Characters div in compact setup panel")
else:
    lines.append("2. SKIP - Story Mode close pattern not found for compact panel")

# ============================================================
# FIX 2: Full setup modal (~L66463-66466)
# Problem: Same issue - jammed between Story Mode and Low Quality labels
# Solution: Give it proper structure matching the sibling labels
# ============================================================

old_full_modal = '''                                                            </label>
                                                                                                                        <label className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${adventureConsistentCharacters ? 'bg-violet-50 border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${(!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings) ? 'opacity-50 pointer-events-none' : ''}`}>
                                                                <input type="checkbox" className="accent-violet-500 w-4 h-4" data-help-key="adventure_setup_chk_consistent_characters" checked={adventureConsistentCharacters} onChange={(e) => setAdventureConsistentCharacters(e.target.checked)} disabled={!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings}/>
                                                                <div><span className="font-bold text-sm">🎭 Consistent Characters</span><p className="text-xs text-slate-500 mt-0.5">Generate visual cast with persistent descriptions</p></div>
                                                            </label>
<label className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${useLowQualityVisuals'''

new_full_modal = '''                                                            </label>
                                                            <label className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${adventureConsistentCharacters ? 'bg-violet-50 border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${(!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings) ? 'opacity-50 pointer-events-none' : ''}`}>
                                                                <input aria-label={t('common.toggle_consistent_characters') || 'Toggle consistent characters'}
                                                                    type="checkbox"
                                                                    data-help-key="adventure_setup_chk_consistent_characters" checked={adventureConsistentCharacters}
                                                                    onChange={(e) => setAdventureConsistentCharacters(e.target.checked)}
                                                                    disabled={!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings}
                                                                    className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 cursor-pointer disabled:cursor-not-allowed"
                                                                />
                                                                <div>
                                                                    <span className="block text-xs font-bold text-slate-700">🎭 {t('adventure.consistent_characters_label') || 'Consistent Characters'}</span>
                                                                    <span className="block text-[10px] text-slate-500 opacity-80">{t('adventure.consistent_characters_desc') || 'Persistent visual cast across scenes'}</span>
                                                                </div>
                                                            </label>
                                                            <label className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${useLowQualityVisuals'''

if old_full_modal in content:
    content = content.replace(old_full_modal, new_full_modal, 1)
    fixes += 1
    lines.append("3. Fixed Consistent Characters in full setup modal (proper indentation + structure)")
else:
    lines.append("3. SKIP - full modal pattern not found")
    # Debug
    idx = content.find('adventure_setup_chk_consistent_characters')
    if idx > 0:
        second = content.find('adventure_setup_chk_consistent_characters', idx + 50)
        lines.append(f"   First occurrence at {idx}, second at {second}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

with open(outpath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"Applied {fixes} fixes. See diag_output.txt")
