"""
Fix 3 issues:
1. Move Consistent Characters checkbox to above Low Quality/Fast Mode
2. Remove the duplicate options reading from auto-read (keep existing highlight-sync system)
3. The existing system properly syncs TTS with option highlighting
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# === Fix 1: Move Consistent Characters checkbox ===
# In the LEFT PANEL setup UI:
# Currently it's after the Chance Mode checkbox at line ~59149.
# It should be moved to right above Low Quality at line ~59327.
# Step 1: Remove from current location (after chance mode)
# The consistent characters label block in left panel
cc_block_left = """
                                    <label className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${adventureConsistentCharacters ? 'bg-violet-50 border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${(!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings) ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <input type="checkbox" className="accent-violet-500 w-4 h-4" data-help-key="adventure_setup_chk_consistent_characters" checked={adventureConsistentCharacters} onChange={(e) => setAdventureConsistentCharacters(e.target.checked)} disabled={!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings}/>
                                        <div><span className="font-bold text-sm">🎭 Consistent Characters</span><p className="text-xs text-slate-500 mt-0.5">Generate visual cast with persistent descriptions across scenes</p></div>
                                    </label>"""

# Find and remove from after chance mode
if cc_block_left in content:
    content = content.replace(cc_block_left, '', 1)
    fixes += 1
    print("1a: Removed CC checkbox from after chance mode (left panel)")
else:
    print("1a: SKIP - left panel CC block not found")

# Step 2: Insert before low quality checkbox in left panel
# Find the low quality label in the left panel (data-help-key="adventure_setup_chk_lowqual")
# The first occurrence at line ~58354 is a different section. The one at ~59327 is the one we want.
# Let me find the correct occurrence - it's the second one that comes after story mode
lowqual_left = 'data-help-key="adventure_setup_chk_story" checked={isAdventureStoryMode}'
idx_story = content.find(lowqual_left)
if idx_story > 0:
    # Find the next lowqual after story mode 
    lowqual_after_story = content.find('data-help-key="adventure_setup_chk_lowqual"', idx_story)
    if lowqual_after_story > 0:
        # Find the start of the label block for lowqual
        # Go back to find the <label that starts this checkbox block
        label_start = content.rfind('<label', idx_story, lowqual_after_story)
        if label_start > 0:
            # Find the indentation
            line_start = content.rfind('\n', 0, label_start) + 1
            indent = content[line_start:label_start]
            # Insert CC checkbox before the lowqual label
            cc_insert = f"""{indent}<label className={{`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${{adventureConsistentCharacters ? 'bg-violet-50 border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'}} ${{(!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings) ? 'opacity-50 pointer-events-none' : ''}}`}}>
{indent}    <input type="checkbox" className="accent-violet-500 w-4 h-4" data-help-key="adventure_setup_chk_consistent_characters" checked={{adventureConsistentCharacters}} onChange={{(e) => setAdventureConsistentCharacters(e.target.checked)}} disabled={{!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings}}/>
{indent}    <div><span className="font-bold text-sm">🎭 Consistent Characters</span><p className="text-xs text-slate-500 mt-0.5">Generate visual cast with persistent descriptions across scenes</p></div>
{indent}</label>
"""
            content = content[:label_start] + cc_insert + content[label_start:]
            fixes += 1
            print("1b: Inserted CC checkbox above lowqual (left panel)")
        else:
            print("1b: SKIP - couldn't find label start")
    else:
        print("1b: SKIP - lowqual not found after story")
else:
    print("1b: SKIP - story checkbox not found")

# Do the same for the FULL SETUP MODAL
cc_block_modal = """
                                                            <label className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${adventureConsistentCharacters ? 'bg-violet-50 border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${(!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings) ? 'opacity-50 pointer-events-none' : ''}`}>
                                                                <input type="checkbox" className="accent-violet-500 w-4 h-4" data-help-key="adventure_setup_chk_consistent_characters" checked={adventureConsistentCharacters} onChange={(e) => setAdventureConsistentCharacters(e.target.checked)} disabled={!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings}/>
                                                                <div><span className="font-bold text-sm">🎭 Consistent Characters</span><p className="text-xs text-slate-500 mt-0.5">Generate visual cast with persistent descriptions</p></div>
                                                            </label>"""

if cc_block_modal in content:
    content = content.replace(cc_block_modal, '', 1)
    fixes += 1
    print("1c: Removed CC checkbox from after chance mode (modal)")
else:
    print("1c: SKIP - modal CC block not found")

# Insert before lowqual in the modal
# Find the story checkbox in the modal (second occurrence)
modal_story = 'data-help-key="adventure_setup_chk_story" checked={isAdventureStoryMode}'
idx_story2 = content.find(modal_story, idx_story + 100 if idx_story > 0 else 0)
if idx_story2 > 0:
    lowqual_modal = content.find('data-help-key="adventure_setup_chk_lowqual"', idx_story2)
    if lowqual_modal > 0:
        label_start2 = content.rfind('<label', idx_story2, lowqual_modal)
        if label_start2 > 0:
            line_start2 = content.rfind('\n', 0, label_start2) + 1
            indent2 = content[line_start2:label_start2]
            cc_insert2 = f"""{indent2}<label className={{`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${{adventureConsistentCharacters ? 'bg-violet-50 border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'}} ${{(!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings) ? 'opacity-50 pointer-events-none' : ''}}`}}>
{indent2}    <input type="checkbox" className="accent-violet-500 w-4 h-4" data-help-key="adventure_setup_chk_consistent_characters" checked={{adventureConsistentCharacters}} onChange={{(e) => setAdventureConsistentCharacters(e.target.checked)}} disabled={{!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings}}/>
{indent2}    <div><span className="font-bold text-sm">🎭 Consistent Characters</span><p className="text-xs text-slate-500 mt-0.5">Generate visual cast with persistent descriptions</p></div>
{indent2}</label>
"""
            content = content[:label_start2] + cc_insert2 + content[label_start2:]
            fixes += 1
            print("1d: Inserted CC checkbox above lowqual (modal)")
        else:
            print("1d: SKIP")
    else:
        print("1d: SKIP - modal lowqual not found")
else:
    print("1d: SKIP - modal story not found")


# === Fix 2: Remove the duplicate options reading from auto-read ===
# This was my recent addition that appended options to textToSpeak as a blob.
# The existing system already reads options individually with proper highlighting.
old_autoread = """      if (adventureState.currentScene) {
          textToSpeak += adventureState.currentScene.text;
          const sceneOpts = adventureState.currentScene.options;
          if (Array.isArray(sceneOpts) && sceneOpts.length > 0) {
              textToSpeak += '. Your choices are: ' + sceneOpts.map((opt, i) => (typeof opt === 'string' ? `${i+1}. ${opt}` : `${i+1}. ${opt.action || opt.text || opt}`)).join('. ') + '.';
          }
      }"""

new_autoread = """      if (adventureState.currentScene) {
          textToSpeak += adventureState.currentScene.text;
      }"""

if old_autoread in content:
    content = content.replace(old_autoread, new_autoread, 1)
    fixes += 1
    print("2: Removed duplicate options from auto-read (existing highlight system handles them)")
else:
    print("2: SKIP")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal fixes: {fixes}")
