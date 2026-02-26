"""
Phase C+ Fix Script v3 — avoids f-string issues with JSX curly braces
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================
# FIX 1: Replace student profiles UI (L>50000 only)
# ============================
start = None
end = None
for i, l in enumerate(lines):
    if 'ui-student-profiles' in l and i > 50000:
        if i > 0 and 'isTeacherMode' in lines[i-1]:
            start = i - 1
        else:
            start = i
        print(f"  Found profiles UI at L{i+1}")
        break

if start is not None:
    for j in range(start + 2, min(start + 120, len(lines))):
        if lines[j].strip().startswith(')}') and j+1 < len(lines):
            nxt = lines[j+1].strip()
            if '(!isTeacherMode' in nxt or 'tour-history-panel' in nxt:
                end = j
                break
    
    if end is not None:
        # Build compact strip as plain strings (no f-strings to avoid brace issues)
        compact = []
        compact.append("            {isTeacherMode && activeSidebarTab === 'history' && !isIndependentMode && (\r\n")
        compact.append('            <div id="ui-roster-strip" className="bg-white rounded-3xl shadow-indigo-500/10 border border-slate-200 overflow-hidden shrink-0">\r\n')
        compact.append('                <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">\r\n')
        compact.append('                    <div className="text-sm font-bold text-indigo-800 flex items-center gap-2">\r\n')
        compact.append("                        <ClipboardList size={16} /> {t('roster.strip_title') || 'Class Groups'}\r\n")
        compact.append('                    </div>\r\n')
        compact.append('                    <div className="flex items-center gap-1">\r\n')
        compact.append("                        <button onClick={() => setIsRosterKeyOpen(true)} className=\"p-1.5 rounded-md hover:bg-indigo-100 text-indigo-600\" title={t('roster.title') || 'Manage Roster'} aria-label={t('roster.title')} data-help-key=\"roster_manage_button\">\r\n")
        compact.append('                            <Settings size={14} />\r\n')
        compact.append('                        </button>\r\n')
        compact.append('                    </div>\r\n')
        compact.append('                </div>\r\n')
        compact.append('                <div className="p-3">\r\n')
        compact.append('                    {rosterKey && Object.keys(rosterKey.groups || {}).length > 0 ? (\r\n')
        compact.append('                        <>\r\n')
        compact.append('                            <div className="flex flex-wrap gap-1.5 mb-2">\r\n')
        compact.append('                                {Object.entries(rosterKey.groups).map(([gid, g]) => (\r\n')
        compact.append('                                    <button key={gid} onClick={() => handleApplyRosterGroup(gid)}\r\n')
        compact.append('                                        className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all hover:scale-105 border cursor-pointer"\r\n')
        compact.append("                                        style={{ backgroundColor: (g.color || '#6366f1') + '20', borderColor: (g.color || '#6366f1') + '60', color: (g.color === '#f5f5f5' || !g.color) ? '#334155' : g.color }}\r\n")
        compact.append("                                        title={`${g.name} \\u00B7 ${g.profile?.gradeLevel || 'No grade'} \\u00B7 ${g.profile?.leveledTextLanguage || 'English'}`}\r\n")
        compact.append('                                    >\r\n')
        compact.append("                                        <span className=\"inline-block w-2 h-2 rounded-full mr-1 align-middle\" style={{ backgroundColor: g.color || '#6366f1' }} />\r\n")
        compact.append('                                        {g.name}\r\n')
        compact.append('                                    </button>\r\n')
        compact.append('                                ))}\r\n')
        compact.append('                            </div>\r\n')
        compact.append('                            <button onClick={() => { setIsRosterKeyOpen(true); setTimeout(() => setShowBatchConfig(true), 300); }}\r\n')
        compact.append('                                disabled={!sourceText}\r\n')
        compact.append('                                className="w-full px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 border border-amber-200"\r\n')
        compact.append('                            >\r\n')
        compact.append("                                <Layers size={14} /> {t('roster.batch_generate') || 'Differentiate by Group'}\r\n")
        compact.append('                            </button>\r\n')
        compact.append('                        </>\r\n')
        compact.append('                    ) : (\r\n')
        compact.append('                        <div className="text-center py-2">\r\n')
        compact.append("                            <p className=\"text-xs text-slate-400 mb-1\">{t('roster.strip_empty') || 'No class roster yet'}</p>\r\n")
        compact.append("                            <button onClick={() => setIsRosterKeyOpen(true)} className=\"text-xs text-indigo-600 font-bold hover:underline\">\r\n")
        compact.append("                                {t('roster.strip_create') || 'Create one'}\r\n")
        compact.append('                            </button>\r\n')
        compact.append('                        </div>\r\n')
        compact.append('                    )}\r\n')
        compact.append('                </div>\r\n')
        compact.append('            </div>\r\n')
        compact.append('            )}\r\n')
        
        old_count = end - start + 1
        lines[start:end+1] = compact
        changes += 1
        print("[OK] FIX 1: Replaced profiles UI (%d old -> %d new lines)" % (old_count, len(compact)))
    else:
        print("[WARN] FIX 1: Found start at L%d but couldn't find end" % (start+1))
else:
    if any('ui-roster-strip' in l for l in lines):
        print("[OK] FIX 1: Compact strip already present")
    else:
        print("[FAIL] FIX 1: No ui-student-profiles found after L50000")

# ============================
# FIX 2: Add emoji/textFormat after karaoke checkbox in RosterKeyPanel  
# ============================
has_emoji = any('roster.emojis_label' in l for l in lines)
if not has_emoji:
    for i, l in enumerate(lines):
        if 'karaokeMode' in l and 'handleSetGroupProfile' in l:
            # Find the closing </div> of the karaoke flex-items wrapper (2 </div>s after)
            close_count = 0
            for j in range(i+1, min(i+8, len(lines))):
                if '</div>' in lines[j]:
                    close_count += 1
                    if close_count == 1:
                        # This is the karaoke </div> wrapper
                        # Insert emoji controls here
                        ind = '                                    '
                        new_ctrls = [
                            ind + '{/* Emoji & Format Preferences */}\r\n',
                            ind + '<div className="flex items-center gap-3 mt-1">\r\n',
                            ind + '    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 cursor-pointer" title="Toggle emoji usage for this group">\r\n',
                            ind + "        <input type=\"checkbox\" checked={g.profile?.useEmojis || false} onChange={(e) => handleSetGroupProfile(gid, 'useEmojis', e.target.checked)} className=\"rounded border-slate-300 text-indigo-500 focus:ring-indigo-400\" />\r\n",
                            ind + "        {t('roster.emojis_label') || 'Use Emojis'}\r\n",
                            ind + '    </label>\r\n',
                            ind + "    <select aria-label=\"Text Format\" value={g.profile?.textFormat || 'Standard Text'} onChange={(e) => handleSetGroupProfile(gid, 'textFormat', e.target.value)} className=\"text-[10px] p-1 rounded border border-slate-200 bg-slate-50\">\r\n",
                            ind + "        <option value=\"Standard Text\">{t('roster.format_standard') || 'Standard'}</option>\r\n",
                            ind + "        <option value=\"Bullet Points\">{t('roster.format_bullets') || 'Bullets'}</option>\r\n",
                            ind + "        <option value=\"Outline\">{t('roster.format_outline') || 'Outline'}</option>\r\n",
                            ind + '    </select>\r\n',
                            ind + '</div>\r\n',
                        ]
                        lines = lines[:j] + new_ctrls + lines[j:]
                        changes += 1
                        print("[OK] FIX 2: Added emoji & format controls after L%d" % (j+1))
                        break
            break
    else:
        print("[WARN] FIX 2: karaokeMode + handleSetGroupProfile not found")
else:
    print("[OK] FIX 2: Emoji controls already present")

# ============================
# SAVE
# ============================
with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("\n=== Total %d changes applied ===" % changes)
