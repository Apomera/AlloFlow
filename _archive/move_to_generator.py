#!/usr/bin/env python3
"""
Move Image Mode dropdown from Pre-Activity Review to WordSoundsGenerator initial setup.
"""

from pathlib import Path

def move_to_generator(file_path: Path):
    content = file_path.read_text(encoding='utf-8')
    changes = 0
    
    # 1. Remove from Pre-Activity Review panel (the settings bar we added)
    old_settings_bar = """                {/* Settings Bar */}
                <div className="px-6 py-3 border-b bg-slate-50 flex flex-wrap gap-4 items-center">
                    {/* Image Visibility Mode */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-600">Image Mode:</label>
                        <select
                            value={imageVisibilityMode}
                            onChange={(e) => setImageVisibilityMode(e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-white text-sm text-slate-700 border border-slate-200 hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            title="Control when word images appear during activities"
                        >
                            <option value="alwaysOn">🖼️ Always On</option>
                            <option value="progressive">📈 Progressive (after 1st response)</option>
                            <option value="afterCompletion">✅ After Completion (correct/2nd attempt)</option>
                        </select>
                    </div>
                </div>
                
                {/* Scrollable Word List */}"""
    
    new_settings_bar = """                {/* Scrollable Word List */}"""
    
    if old_settings_bar in content:
        content = content.replace(old_settings_bar, new_settings_bar)
        changes += 1
        print("✓ Removed settings bar from Pre-Activity Review panel")
    else:
        print("ℹ Settings bar not found in Pre-Activity Review")
    
    # 2. Add Image Mode dropdown to WordSoundsGenerator after Image Style section
    old_after_theme = """<p className="text-xs text-slate-500 mt-2">{t('word_sounds.theme_hint', 'Optional: Style for new word images (not glossary)')}</p>
                                </div>
                                
                                {/* Max Syllables */}"""
    
    new_after_theme = """<p className="text-xs text-slate-500 mt-2">{t('word_sounds.theme_hint', 'Optional: Style for new word images (not glossary)')}</p>
                                </div>
                                
                                {/* Image Visibility Mode */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">Image Display Mode</span>
                                        <ImageIcon size={18} className="text-violet-500" />
                                    </div>
                                    <select
                                        value={imageVisibilityMode}
                                        onChange={(e) => setImageVisibilityMode(e.target.value)}
                                        className="w-full p-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                                        title="Control when word images appear during activities"
                                    >
                                        <option value="alwaysOn">🖼️ Always On - Image visible immediately</option>
                                        <option value="progressive">📈 Progressive - After 1st response</option>
                                        <option value="afterCompletion">✅ After Completion - After correct or 2nd attempt</option>
                                    </select>
                                    <p className="text-xs text-slate-500 mt-2">When should word images be revealed during activities</p>
                                </div>
                                
                                {/* Max Syllables */}"""
    
    if old_after_theme in content:
        content = content.replace(old_after_theme, new_after_theme)
        changes += 1
        print("✓ Added Image Mode dropdown to WordSoundsGenerator")
    else:
        print("✗ Could not find Image Style section")
    
    # 3. Add props to WordSoundsGenerator component definition
    old_props = """const WordSoundsGenerator = ({ glossaryTerms, onStartGame, onClose, callGemini, callImagen, callTTS, gradeLevel, t: tProp, preloadedWords = [], onShowReview }) => {"""
    
    new_props = """const WordSoundsGenerator = ({ glossaryTerms, onStartGame, onClose, callGemini, callImagen, callTTS, gradeLevel, t: tProp, preloadedWords = [], onShowReview, imageVisibilityMode, setImageVisibilityMode }) => {"""
    
    if old_props in content:
        content = content.replace(old_props, new_props)
        changes += 1
        print("✓ Added props to WordSoundsGenerator")
    else:
        print("✗ Could not find WordSoundsGenerator props")
    
    # 4. Pass props where WordSoundsGenerator is used (L71132)
    old_usage = """<WordSoundsGenerator 
              glossaryTerms={generatedContent?.data || []}
              t={t}
              gradeLevel={gradeLevel || 'K-2'}"""
    
    new_usage = """<WordSoundsGenerator 
              glossaryTerms={generatedContent?.data || []}
              t={t}
              gradeLevel={gradeLevel || 'K-2'}
              imageVisibilityMode={wsImageVisibilityMode}
              setImageVisibilityMode={setWsImageVisibilityMode}"""
    
    if old_usage in content:
        content = content.replace(old_usage, new_usage)
        changes += 1
        print("✓ Passed props to WordSoundsGenerator usage")
    else:
        print("✗ Could not find WordSoundsGenerator usage")
    
    # Write back
    if changes > 0:
        file_path.write_text(content, encoding='utf-8')
        print(f"\n✓ Applied {changes} changes")
    
    return changes > 0

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    move_to_generator(file_path)
