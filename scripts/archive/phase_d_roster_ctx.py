"""
Phase D — Roster Context Integration
3 changes:
1. Add teacher-mode branch to getGroupDifferentiationContext() 
2. Pass roster context into autoConfigureSettings for full pack
3. Append roster context to Allobot system prompt
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================
# CHANGE 1: Add teacher-mode branch to getGroupDifferentiationContext
# ============================
for i, l in enumerate(lines):
    if 'const getGroupDifferentiationContext' in l:
        # Next line should be: if (!activeSessionCode || isTeacherMode) return '';
        # We insert BEFORE that guard, adding a teacher-mode branch
        # Find the opening brace
        for j in range(i, min(i+3, len(lines))):
            if 'if (!activeSessionCode || isTeacherMode)' in lines[j]:
                # Check if our code is already there
                nearby = ''.join(lines[i:j])
                if 'CLASS ROSTER GROUPS' in nearby:
                    print("[OK] CHANGE 1: Teacher-mode branch already present")
                    break
                # Insert teacher-mode branch before this guard
                indent = '      '
                teacher_branch = [
                    indent + "// Teacher mode: summarize local roster groups for prompt context\r\n",
                    indent + "if (isTeacherMode && rosterKey?.groups && Object.keys(rosterKey.groups).length > 0) {\r\n",
                    indent + "    let ctx = '\\n--- CLASS ROSTER GROUPS (teacher reference) ---';\r\n",
                    indent + "    Object.entries(rosterKey.groups).forEach(([gid, g]) => {\r\n",
                    indent + "        const p = g.profile || {};\r\n",
                    indent + "        ctx += `\\nGroup \"${g.name}\": Grade ${p.gradeLevel || 'N/A'}, Lang: ${p.leveledTextLanguage || 'English'}`;\r\n",
                    indent + "        if (p.readingLevel) ctx += `, Reading: ${p.readingLevel}`;\r\n",
                    indent + "        if (p.studentInterests?.length) ctx += `, Interests: ${p.studentInterests.join(', ')}`;\r\n",
                    indent + "        if (p.dokLevel) ctx += `, DOK: ${p.dokLevel}`;\r\n",
                    indent + "        if (p.useEmojis) ctx += `, Emojis: Yes`;\r\n",
                    indent + "        if (p.textFormat && p.textFormat !== 'Standard Text') ctx += `, Format: ${p.textFormat}`;\r\n",
                    indent + "    });\r\n",
                    indent + "    ctx += '\\n--- END ROSTER ---\\n';\r\n",
                    indent + "    return ctx;\r\n",
                    indent + "}\r\n",
                ]
                lines = lines[:j] + teacher_branch + lines[j:]
                changes += 1
                print("[OK] CHANGE 1: Added teacher-mode branch at L%d" % (j+1))
                break
        break

# ============================
# CHANGE 2: Pass roster context into autoConfigureSettings for full pack
# ============================
# Find: const customInputToUse = ... in handleGenerateFullPack
# Then: batchConfig = await autoConfigureSettings(... customInputToUse ...
for i, l in enumerate(lines):
    if 'const customInputToUse' in l and 'chatContextOverride' in l and i > 52000:
        # Check if already enriched
        nearby = ''.join(lines[i:i+8])
        if 'enrichedCustomInput' in nearby or 'rosterCtx' in nearby:
            print("[OK] CHANGE 2: Roster enrichment already present")
            break
        # Find the line with autoConfigureSettings call
        for j in range(i+1, min(i+12, len(lines))):
            if 'autoConfigureSettings(' in lines[j]:
                # Find the line with customInputToUse in the args
                for k in range(j, min(j+8, len(lines))):
                    if 'customInputToUse' in lines[k] and 'autoConfigureSettings' not in lines[k]:
                        # Insert enrichment code before autoConfigureSettings call
                        indent = '            '
                        enrich = [
                            indent + "const rosterCtx = getGroupDifferentiationContext();\r\n",
                            indent + "const enrichedCustomInput = rosterCtx ? `${customInputToUse}\\n${rosterCtx}` : customInputToUse;\r\n",
                        ]
                        lines = lines[:j] + enrich + lines[j:]
                        # Now fix the reference: customInputToUse -> enrichedCustomInput in the call
                        # The call spans multiple lines, find customInputToUse in the args
                        for m in range(j+2, min(j+12, len(lines))):
                            if 'customInputToUse,' in lines[m]:
                                lines[m] = lines[m].replace('customInputToUse,', 'enrichedCustomInput,')
                                break
                            elif 'customInputToUse' in lines[m] and '=' not in lines[m]:
                                lines[m] = lines[m].replace('customInputToUse', 'enrichedCustomInput')
                                break
                        changes += 1
                        print("[OK] CHANGE 2: Added roster enrichment before autoConfigureSettings at L%d" % (j+1))
                        break
                break
        break

# ============================
# CHANGE 3: Append roster context to Allobot system prompt
# ============================
for i, l in enumerate(lines):
    if 'Grade Level: ${gradeLevel}' in l and 'fullPrompt' in ''.join(lines[max(0,i-5):i]):
        # Check if already has roster context
        next_few = ''.join(lines[i:i+3])
        if 'getGroupDifferentiationContext' in next_few or 'ROSTER' in next_few:
            print("[OK] CHANGE 3: Roster context already in Allobot prompt")
            break
        # Insert after this line
        indent = '           '
        roster_line = indent + "${getGroupDifferentiationContext()}\r\n"
        lines.insert(i+1, roster_line)
        changes += 1
        print("[OK] CHANGE 3: Added roster context to Allobot prompt after L%d" % (i+1))
        break

# ============================
# SAVE
# ============================
with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("\n=== Total %d changes applied ===" % changes)
