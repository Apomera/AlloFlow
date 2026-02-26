"""Phase 1a: Wire handleSetGroupProfile prop + add UI controls + add localization strings"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
changes = 0

# --- CHANGE 1: Add onSetGroupProfile to TeacherLiveQuizControls component signature ---
old_sig = "const TeacherLiveQuizControls = React.memo(({ sessionData, generatedContent, activeSessionCode, appId, onGenerateImage, onRefineImage, onCreateGroup, onAssignStudent, onSetGroupResource, onSetGroupLanguage, onDeleteGroup }) => {"
new_sig = "const TeacherLiveQuizControls = React.memo(({ sessionData, generatedContent, activeSessionCode, appId, onGenerateImage, onRefineImage, onCreateGroup, onAssignStudent, onSetGroupResource, onSetGroupLanguage, onSetGroupProfile, onDeleteGroup }) => {"

count = content.count(old_sig)
if count != 1:
    print(f"ERROR: Component signature match count: {count}")
    sys.exit(1)
content = content.replace(old_sig, new_sig)
changes += 1
print(f"[OK] Added onSetGroupProfile to component signature")

# --- CHANGE 2: Add handleSetGroupProfile alias inside component ---
old_alias = "    const handleSetGroupLanguage = onSetGroupLanguage;"
new_alias = """    const handleSetGroupLanguage = onSetGroupLanguage;
    const handleSetGroupProfile = onSetGroupProfile;"""

count = content.count(old_alias)
if count != 1:
    print(f"ERROR: Alias match count: {count}")
    sys.exit(1)
content = content.replace(old_alias, new_alias)
changes += 1
print(f"[OK] Added handleSetGroupProfile alias")

# --- CHANGE 3: Add onSetGroupProfile prop to component instantiation ---
old_inst = """                                onSetGroupLanguage={handleSetGroupLanguage}
                                onDeleteGroup={handleDeleteGroup}"""
new_inst = """                                onSetGroupLanguage={handleSetGroupLanguage}
                                onSetGroupProfile={handleSetGroupProfile}
                                onDeleteGroup={handleDeleteGroup}"""

count = content.count(old_inst)
if count != 1:
    print(f"ERROR: Instantiation match count: {count}")
    sys.exit(1)
content = content.replace(old_inst, new_inst)
changes += 1
print(f"[OK] Added onSetGroupProfile prop to instantiation")

# --- CHANGE 4: Add learning profile UI controls after language dropdown in group card ---
old_ui_end = """                                        </select>
                                    </div>
                                </div>
                            ))}
                            {activeGroups.length === 0 && (
                                <div className="text-xs text-slate-500 italic text-center py-2">{t('groups.no_groups')}</div>"""

new_ui_end = """                                        </select>
                                    </div>
                                    {/* Learning Profile Controls */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold text-slate-500">{t('groups.reading_level_label') || 'Reading Level'}</span>
                                        <select aria-label="Reading Level"
                                            value={group.readingLevel || ""}
                                            onChange={(e) => handleSetGroupProfile(gid, 'readingLevel', e.target.value || null)}
                                            className="text-xs p-1 rounded border border-slate-200 w-full truncate bg-slate-50"
                                            title={t('groups.reading_level_tooltip') || 'Set reading level for content simplification'}
                                        >
                                            <option value="">{t('groups.class_default') || 'Class Default'}</option>
                                            <option value="K">K</option>
                                            <option value="1st">1st Grade</option>
                                            <option value="2nd">2nd Grade</option>
                                            <option value="3rd">3rd Grade</option>
                                            <option value="4th">4th Grade</option>
                                            <option value="5th">5th Grade</option>
                                            <option value="6th">6th Grade</option>
                                            <option value="7th">7th Grade</option>
                                            <option value="8th">8th Grade</option>
                                            <option value="9th-12th">9th-12th</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold text-slate-500">{t('groups.visual_density_label') || 'Visuals'}</span>
                                        <select aria-label="Visual Density"
                                            value={group.visualDensity || "normal"}
                                            onChange={(e) => handleSetGroupProfile(gid, 'visualDensity', e.target.value)}
                                            className="text-xs p-1 rounded border border-slate-200 w-full truncate bg-slate-50"
                                            title={t('groups.visual_density_tooltip') || 'How much visual support this group receives'}
                                        >
                                            <option value="minimal">{t('groups.visuals_minimal') || 'Minimal'}</option>
                                            <option value="normal">{t('groups.visuals_normal') || 'Normal'}</option>
                                            <option value="high">{t('groups.visuals_high') || 'High (More images)'}</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold text-slate-500">{t('groups.tts_speed_label') || 'TTS Speed'}</span>
                                        <select aria-label="TTS Speed"
                                            value={group.ttsSpeed ?? 1.0}
                                            onChange={(e) => handleSetGroupProfile(gid, 'ttsSpeed', parseFloat(e.target.value))}
                                            className="text-xs p-1 rounded border border-slate-200 w-full truncate bg-slate-50"
                                            title={t('groups.tts_speed_tooltip') || 'Text-to-speech playback speed for this group'}
                                        >
                                            <option value="0.6">0.6x (Very Slow)</option>
                                            <option value="0.8">0.8x (Slow)</option>
                                            <option value="1.0">1.0x (Normal)</option>
                                            <option value="1.2">1.2x (Fast)</option>
                                            <option value="1.5">1.5x (Very Fast)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 cursor-pointer" title={t('groups.karaoke_tooltip') || 'Auto-enable word highlighting for this group'}>
                                            <input type="checkbox" checked={group.karaokeMode || false} onChange={(e) => handleSetGroupProfile(gid, 'karaokeMode', e.target.checked)} className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-400" />
                                            {t('groups.karaoke_label') || 'Karaoke Mode'}
                                        </label>
                                    </div>
                                </div>
                            ))}
                            {activeGroups.length === 0 && (
                                <div className="text-xs text-slate-500 italic text-center py-2">{t('groups.no_groups')}</div>"""

count = content.count(old_ui_end)
if count != 1:
    print(f"ERROR: UI end match count: {count}")
    # Try to find where the issue is
    if count == 0:
        # Let's try a smaller fragment
        test = """                                    </div>
                                </div>
                            ))}"""
        print(f"  Smaller fragment count: {content.count(test)}")
    sys.exit(1)
content = content.replace(old_ui_end, new_ui_end)
changes += 1
print(f"[OK] Added learning profile UI controls to group card")

# --- CHANGE 5: Add localization strings ---
old_loc = """      language_tooltip: "Students see quizzes in this language","""
new_loc = """      language_tooltip: "Students see quizzes in this language",
      reading_level_label: "Reading Level",
      reading_level_tooltip: "Set target reading level for content simplification in this group",
      visual_density_label: "Visuals",
      visual_density_tooltip: "How much visual support students in this group receive",
      visuals_minimal: "Minimal",
      visuals_normal: "Normal",
      visuals_high: "High (More images)",
      tts_speed_label: "TTS Speed",
      tts_speed_tooltip: "Text-to-speech playback speed for students in this group",
      karaoke_label: "Karaoke Mode",
      karaoke_tooltip: "Auto-enable word highlighting during read-aloud for this group",
      class_default: "Class Default",
      communication_mode_label: "Communication",
      communication_mode_tooltip: "Communication modality for students in this group",
      comm_verbal: "Verbal",
      comm_limited: "Limited Verbal",
      comm_aac: "AAC/Visual","""

count = content.count(old_loc)
if count != 1:
    print(f"ERROR: Localization match count: {count}")
    sys.exit(1)
content = content.replace(old_loc, new_loc)
changes += 1
print(f"[OK] Added localization strings")

# Write
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nAll {changes} Phase 1a UI changes applied successfully.")
