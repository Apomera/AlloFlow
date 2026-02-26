"""
Phase D2 — Full Pack Per-Group Generation
4 changes:
1. Add fullPackTargetGroup state near resourceCount state
2. Add group dropdown UI next to resource count selector
3. Modify handleGenerateFullPack to support per-group iteration
4. Add localization keys to roster: block
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================
# CHANGE 1: Add fullPackTargetGroup state after resourceCount state
# ============================
for i, l in enumerate(lines):
    if 'resourceCount' in l and 'useState' in l and i > 30000:
        # Check if already exists
        nearby = ''.join(lines[i:i+5])
        if 'fullPackTargetGroup' in nearby:
            print("[OK] CHANGE 1: State already exists")
            break
        # Insert after this line
        new_state = "  const [fullPackTargetGroup, setFullPackTargetGroup] = useState('none');\r\n"
        lines.insert(i+1, new_state)
        changes += 1
        print("[OK] CHANGE 1: Added fullPackTargetGroup state at L%d" % (i+2))
        break

# ============================
# CHANGE 2: Add group dropdown UI after resource count </select>
# ============================
# Find the </select> that closes the resource count dropdown (near L60342)
for i, l in enumerate(lines):
    if 'fullpack.option_all' in l and i > 59000:
        # Next line should be </select> then )}, then closing div
        for j in range(i+1, min(i+5, len(lines))):
            if '</select>' in lines[j]:
                # Check if already added
                nearby = ''.join(lines[j:j+10])
                if 'fullPackTargetGroup' in nearby:
                    print("[OK] CHANGE 2: Dropdown UI already present")
                    break
                # Insert group dropdown after the closing )}, line
                # Find the )}, line
                for k in range(j+1, min(j+4, len(lines))):
                    if ')}' in lines[k]:
                        indent = '                    '
                        dropdown_jsx = [
                            indent + "{isTeacherMode && rosterKey?.groups && Object.keys(rosterKey.groups).length > 0 && (\r\n",
                            indent + "    <select\r\n",
                            indent + '        value={fullPackTargetGroup}\r\n',
                            indent + '        onChange={(e) => setFullPackTargetGroup(e.target.value)}\r\n',
                            indent + '        className="text-[9px] font-bold text-purple-800 bg-white/90 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-purple-300 border-transparent cursor-pointer shadow-sm ml-1"\r\n',
                            indent + "        title={t('fullpack.group_tooltip') || 'Generate for a specific group or all groups'}\r\n",
                            indent + "    >\r\n",
                            indent + "        <option value=\"none\">{t('fullpack.group_current') || 'Current Settings'}</option>\r\n",
                            indent + "        <option value=\"all\">{t('fullpack.group_all') || " + "'\\u{1F3AF} All Groups'}</option>\r\n",
                            indent + "        {Object.entries(rosterKey.groups).map(([gid, g]) => (\r\n",
                            indent + "            <option key={gid} value={gid}>" + "{g.name}</option>\r\n",
                            indent + "        ))}\r\n",
                            indent + "    </select>\r\n",
                            indent + ")}\r\n",
                        ]
                        lines = lines[:k+1] + dropdown_jsx + lines[k+1:]
                        changes += 1
                        print("[OK] CHANGE 2: Added group dropdown UI at L%d" % (k+2))
                        break
                break
        break

# ============================
# CHANGE 3: Modify handleGenerateFullPack to support per-group iteration
# ============================
# Find: const handleGenerateFullPack = async (chatContextOverride = null) => {
# Insert group iteration logic right after the opening
for i, l in enumerate(lines):
    if 'const handleGenerateFullPack' in l and i > 52000:
        # Check if already modified
        nearby = ''.join(lines[i:i+20])
        if 'fullPackTargetGroup' in nearby or 'targetGroup' in nearby:
            print("[OK] CHANGE 3: Group iteration already present")
            break
        # Find 'if (isProcessing) return;' which is the next line
        for j in range(i+1, min(i+5, len(lines))):
            if 'if (isProcessing) return;' in lines[j]:
                # Insert group iteration logic after this guard
                indent = '    '
                group_logic = [
                    indent + "// Phase D2: Per-group full pack generation\r\n",
                    indent + "const targetGroup = fullPackTargetGroup;\r\n",
                    indent + "if (targetGroup === 'all' && rosterKey?.groups && Object.keys(rosterKey.groups).length > 0) {\r\n",
                    indent + "    const groupEntries = Object.entries(rosterKey.groups);\r\n",
                    indent + "    const savedSettings = {\r\n",
                    indent + "        grade: gradeLevel, lang: leveledTextLanguage, interests: studentInterests,\r\n",
                    indent + "        dok: dokLevel, custom: leveledTextCustomInstructions,\r\n",
                    indent + "        selectedLangs: selectedLanguages, standards: targetStandards,\r\n",
                    indent + "        emojis: useEmojis, fmt: textFormat\r\n",
                    indent + "    };\r\n",
                    indent + "    setIsProcessing(true);\r\n",
                    indent + "    try {\r\n",
                    indent + "        for (let gi = 0; gi < groupEntries.length; gi++) {\r\n",
                    indent + "            const [gid, group] = groupEntries[gi];\r\n",
                    indent + "            setGenerationStep(`Generating full pack for ${group.name} (${gi+1}/${groupEntries.length})...`);\r\n",
                    indent + "            handleApplyRosterGroup(gid);\r\n",
                    indent + "            await new Promise(r => setTimeout(r, 150));\r\n",
                    indent + "            await handleGenerateFullPack(chatContextOverride);\r\n",
                    indent + "        }\r\n",
                    indent + "        addToast(`Generated full packs for ${groupEntries.length} groups!`, 'success');\r\n",
                    indent + "    } finally {\r\n",
                    indent + "        // Restore original settings\r\n",
                    indent + "        setGradeLevel(savedSettings.grade);\r\n",
                    indent + "        setLeveledTextLanguage(savedSettings.lang);\r\n",
                    indent + "        setStudentInterests(savedSettings.interests);\r\n",
                    indent + "        setDokLevel(savedSettings.dok);\r\n",
                    indent + "        setLeveledTextCustomInstructions(savedSettings.custom);\r\n",
                    indent + "        setSelectedLanguages(savedSettings.selectedLangs);\r\n",
                    indent + "        setTargetStandards(savedSettings.standards);\r\n",
                    indent + "        setUseEmojis(savedSettings.emojis);\r\n",
                    indent + "        setTextFormat(savedSettings.fmt);\r\n",
                    indent + "        setIsProcessing(false);\r\n",
                    indent + "        setGenerationStep('');\r\n",
                    indent + "        setFullPackTargetGroup('none');\r\n",
                    indent + "    }\r\n",
                    indent + "    return;\r\n",
                    indent + "}\r\n",
                    indent + "// Single group targeting: apply profile then proceed with normal pack\r\n",
                    indent + "if (targetGroup !== 'none' && rosterKey?.groups?.[targetGroup]) {\r\n",
                    indent + "    handleApplyRosterGroup(targetGroup);\r\n",
                    indent + "    await new Promise(r => setTimeout(r, 100));\r\n",
                    indent + "}\r\n",
                ]
                lines = lines[:j+1] + group_logic + lines[j+1:]
                changes += 1
                print("[OK] CHANGE 3: Added group iteration logic at L%d" % (j+2))
                break
        break

# ============================
# CHANGE 4: Add localization keys to roster: block
# ============================
for i, l in enumerate(lines):
    if 'no_groups_to_generate' in l and i > 14000 and i < 16000:
        # Check if fullpack group keys already exist
        nearby = ''.join(lines[i:i+10])
        if 'fullpack_group' in nearby or 'group_current' in nearby:
            print("[OK] CHANGE 4: Localization keys already present")
            break
        new_keys = [
            "      fullpack_group_target: 'Target Group',\r\n",
            "      fullpack_group_current: 'Current Settings',\r\n",
            "      fullpack_group_all: '🎯 All Groups',\r\n",
            "      fullpack_group_tooltip: 'Generate for a specific group or all groups',\r\n",
        ]
        lines = lines[:i+1] + new_keys + lines[i+1:]
        changes += 1
        print("[OK] CHANGE 4: Added 4 localization keys at L%d" % (i+2))
        break

# ============================
# SAVE
# ============================
with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Clean double CRs
content = open(filepath, 'r', encoding='utf-8').read()
content = content.replace('\r\r\n', '\r\n')
open(filepath, 'w', encoding='utf-8').write(content)

print("\n=== Total %d changes applied ===" % changes)
