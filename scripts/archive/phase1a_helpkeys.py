"""Phase 1a: Add help keys for new group profile controls"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
changes = 0

# --- CHANGE 1: Add contextual help definitions at L16758 area ---
old_help1 = """        quiz_group_resource_select: "Select which quiz or resource version to assign to this group.","""
new_help1 = """        quiz_group_resource_select: "Select which quiz or resource version to assign to this group.",
        group_reading_level_select: "Set the target reading level for content generated for this group. Affects vocabulary complexity and sentence length.",
        group_visual_density_select: "Control how much visual support (images, diagrams) students in this group receive.",
        group_tts_speed_select: "Adjust text-to-speech playback speed for students in this group. Slower speeds help struggling readers.",
        group_karaoke_toggle: "When enabled, words highlight in sync with TTS playback to support reading fluency.","""

count = content.count(old_help1)
if count != 1:
    print(f"ERROR: Help def 1 match count: {count}")
    sys.exit(1)
content = content.replace(old_help1, new_help1)
changes += 1
print(f"[OK] Added contextual help definitions (block 1)")

# --- CHANGE 2: Add help definitions at L32164 area ---
old_help2 = """    'quiz_group_language_select': "Set the translation language for students in this group.","""
new_help2 = """    'quiz_group_language_select': "Set the translation language for students in this group.",
    'group_reading_level_select': "Set the target reading level for this group. Content will be simplified or enriched to match.",
    'group_visual_density_select': "Control how much visual support students in this group receive. 'High' adds more images and diagrams.",
    'group_tts_speed_select': "Adjust text-to-speech playback speed. Slower speeds help struggling readers follow along.",
    'group_karaoke_toggle': "Enable word-by-word highlighting during TTS playback to support reading fluency.","""

count = content.count(old_help2)
if count != 1:
    print(f"ERROR: Help def 2 match count: {count}")
    sys.exit(1)
content = content.replace(old_help2, new_help2)
changes += 1
print(f"[OK] Added contextual help definitions (block 2)")

# --- CHANGE 3: Add data-help-key to reading level select ---
old_rl = """                                        <select aria-label="Reading Level"
                                            value={group.readingLevel || ""}
                                            onChange={(e) => handleSetGroupProfile(gid, 'readingLevel', e.target.value || null)}
                                            className="text-xs p-1 rounded border border-slate-200 w-full truncate bg-slate-50"
                                            title={t('groups.reading_level_tooltip') || 'Set reading level for content simplification'}"""
new_rl = """                                        <select aria-label="Reading Level"
                                            value={group.readingLevel || ""} data-help-key="group_reading_level_select"
                                            onChange={(e) => handleSetGroupProfile(gid, 'readingLevel', e.target.value || null)}
                                            className="text-xs p-1 rounded border border-slate-200 w-full truncate bg-slate-50"
                                            title={t('groups.reading_level_tooltip') || 'Set reading level for content simplification'}"""

count = content.count(old_rl)
if count != 1:
    print(f"ERROR: Reading level data-help-key match count: {count}")
    sys.exit(1)
content = content.replace(old_rl, new_rl)
changes += 1
print(f"[OK] Added data-help-key to reading level select")

# --- CHANGE 4: Add data-help-key to visual density select ---
old_vd = """                                        <select aria-label="Visual Density"
                                            value={group.visualDensity || "normal"}
                                            onChange={(e) => handleSetGroupProfile(gid, 'visualDensity', e.target.value)}
                                            className="text-xs p-1 rounded border border-slate-200 w-full truncate bg-slate-50"
                                            title={t('groups.visual_density_tooltip') || 'How much visual support this group receives'}"""
new_vd = """                                        <select aria-label="Visual Density"
                                            value={group.visualDensity || "normal"} data-help-key="group_visual_density_select"
                                            onChange={(e) => handleSetGroupProfile(gid, 'visualDensity', e.target.value)}
                                            className="text-xs p-1 rounded border border-slate-200 w-full truncate bg-slate-50"
                                            title={t('groups.visual_density_tooltip') || 'How much visual support this group receives'}"""

count = content.count(old_vd)
if count != 1:
    print(f"ERROR: Visual density data-help-key match count: {count}")
    sys.exit(1)
content = content.replace(old_vd, new_vd)
changes += 1
print(f"[OK] Added data-help-key to visual density select")

# --- CHANGE 5: Add data-help-key to TTS speed select ---
old_tts = """                                        <select aria-label="TTS Speed"
                                            value={group.ttsSpeed ?? 1.0}
                                            onChange={(e) => handleSetGroupProfile(gid, 'ttsSpeed', parseFloat(e.target.value))}
                                            className="text-xs p-1 rounded border border-slate-200 w-full truncate bg-slate-50"
                                            title={t('groups.tts_speed_tooltip') || 'Text-to-speech playback speed for this group'}"""
new_tts = """                                        <select aria-label="TTS Speed"
                                            value={group.ttsSpeed ?? 1.0} data-help-key="group_tts_speed_select"
                                            onChange={(e) => handleSetGroupProfile(gid, 'ttsSpeed', parseFloat(e.target.value))}
                                            className="text-xs p-1 rounded border border-slate-200 w-full truncate bg-slate-50"
                                            title={t('groups.tts_speed_tooltip') || 'Text-to-speech playback speed for this group'}"""

count = content.count(old_tts)
if count != 1:
    print(f"ERROR: TTS speed data-help-key match count: {count}")
    sys.exit(1)
content = content.replace(old_tts, new_tts)
changes += 1
print(f"[OK] Added data-help-key to TTS speed select")

# Write
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nAll {changes} help text changes applied successfully.")
