import re

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

toggle_ui = """
                                                        <div className={`bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-4 ${(!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings) ? 'opacity-50 pointer-events-none' : ''}`}>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <label htmlFor="setupConsistentChars" className="text-xs font-bold text-slate-700 cursor-pointer select-none flex items-center gap-2">
                                                                    <input aria-label={t('common.toggle_consistent_characters')}
                                                                        id="setupConsistentChars"
                                                                        type="checkbox"
                                                                        checked={adventureConsistentCharacters}
                                                                        onChange={(e) => setAdventureConsistentCharacters(e.target.checked)}
                                                                        disabled={!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings}
                                                                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                                    />
                                                                    Enable Consistent Characters (Nano Banana)
                                                                </label>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 leading-tight">Generate a visual Cast of Characters lobby and maintain appearance across the adventure.</p>
                                                        </div>
"""

pattern = r"(<h4 className=\"text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-2\">\{t\('adventure\.settings\.customization'\)\}</h4>)"
replacement = r"\1" + "\n" + toggle_ui

content, count = re.subn(pattern, replacement, content)

if count > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Setup UI Patched successfully ({count} replacements).")
else:
    print("❌ Failed to patch Setup UI.")
