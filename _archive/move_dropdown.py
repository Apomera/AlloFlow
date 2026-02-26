#!/usr/bin/env python3
"""
Move Image Visibility dropdown from runtime toolbar to pre-activity settings panel.

Changes:
1. Add props to WordSoundsReviewPanel component signature
2. Add dropdown UI in panel footer (near Start button)
3. Remove dropdown from runtime toolbar (L9936-9946)
"""

from pathlib import Path

def move_dropdown(file_path: Path):
    content = file_path.read_text(encoding='utf-8')
    changes = 0
    
    # 1. Add props to WordSoundsReviewPanel
    old_props = """isStudentLocked,
    setIsStudentLocked
}) => {"""
    
    new_props = """isStudentLocked,
    setIsStudentLocked,
    imageVisibilityMode,
    setImageVisibilityMode
}) => {"""
    
    if old_props in content:
        content = content.replace(old_props, new_props)
        changes += 1
        print("✓ Added props to WordSoundsReviewPanel")
    elif "imageVisibilityMode," in content[:5000]:
        print("ℹ Props already added to WordSoundsReviewPanel")
    else:
        print("✗ Could not find WordSoundsReviewPanel props")
    
    # 2. Add dropdown in panel footer (before Start button)
    old_footer = """{/* Regenerate Button */}

                        <button 
                            onClick={onStartActivity}"""
    
    new_footer = """{/* Regenerate Button */}
                        
                        {/* Image Visibility Mode */}
                        <select
                            value={imageVisibilityMode}
                            onChange={(e) => setImageVisibilityMode(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-slate-100 text-sm text-slate-700 border border-slate-200 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            title="Control when word images appear"
                        >
                            <option value="alwaysOn">🖼️ Always Show Image</option>
                            <option value="progressive">📈 Progressive (appears after response)</option>
                            <option value="alwaysOff">🔒 Image Hidden</option>
                        </select>

                        <button 
                            onClick={onStartActivity}"""
    
    if old_footer in content:
        content = content.replace(old_footer, new_footer)
        changes += 1
        print("✓ Added dropdown to panel footer")
    elif "Control when word images appear" in content:
        print("ℹ Dropdown already in panel footer")
    else:
        print("✗ Could not find panel footer")
    
    # 3. Remove dropdown from runtime toolbar
    old_toolbar = """                            {/* Image Visibility Mode */}
                            <select
                                value={imageVisibilityMode}
                                onChange={(e) => setImageVisibilityMode(e.target.value)}
                                className="bg-violet-800 border border-violet-600 rounded-full px-3 py-1 text-white text-xs cursor-pointer hover:bg-violet-700 transition-colors outline-none"
                                title="Image visibility mode"
                            >
                                <option value="alwaysOn">🖼️ Always Show</option>
                                <option value="progressive">📈 Progressive</option>
                                <option value="alwaysOff">🔒 Hidden</option>
                            </select>

                            <DifficultyIndicator />"""
    
    new_toolbar = """                            <DifficultyIndicator />"""
    
    if old_toolbar in content:
        content = content.replace(old_toolbar, new_toolbar)
        changes += 1
        print("✓ Removed dropdown from runtime toolbar")
    elif "{/* Image Visibility Mode */}" not in content[280000:]:  # Check if already removed from toolbar area
        print("ℹ Dropdown already removed from toolbar")
    else:
        print("✗ Could not find runtime toolbar dropdown")
    
    # Write back
    if changes > 0:
        file_path.write_text(content, encoding='utf-8')
        print(f"\n✓ Applied {changes} changes")
    
    return changes > 0

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    move_dropdown(file_path)
