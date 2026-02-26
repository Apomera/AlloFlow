#!/usr/bin/env python3
"""
Add settings section with Image Visibility dropdown above the word list in WordSoundsReviewPanel.
This adds a new settings bar between the header and the word list.
Also removes the dropdown from the footer since we're moving it up.
"""

from pathlib import Path

def add_settings_section(file_path: Path):
    content = file_path.read_text(encoding='utf-8')
    changes = 0
    
    # 1. Add settings section between header and word list
    old_section = """</div>
                
                {/* Scrollable Word List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">"""
    
    new_section = """</div>
                
                {/* Settings Bar */}
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
                
                {/* Scrollable Word List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">"""
    
    if old_section in content:
        content = content.replace(old_section, new_section)
        changes += 1
        print("✓ Added settings bar with Image Mode dropdown")
    else:
        print("✗ Could not find word list section")
    
    # 2. Remove dropdown from footer (already there from previous changes)
    old_footer = """{/* Regenerate Button */}
                        
                        {/* Image Visibility Mode */}
                        <select
                            value={imageVisibilityMode}
                            onChange={(e) => setImageVisibilityMode(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-slate-100 text-sm text-slate-700 border border-slate-200 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            title="Control when word images appear"
                        >
                            <option value="alwaysOn">🖼️ Always On</option>
                            <option value="progressive">📈 Progressive (after 1st response)</option>
                            <option value="afterCompletion">✅ After Completion (after correct/2nd attempt)</option>
                        </select>

                        <button 
                            onClick={onStartActivity}"""
    
    new_footer = """{/* Regenerate Button */}

                        <button 
                            onClick={onStartActivity}"""
    
    if old_footer in content:
        content = content.replace(old_footer, new_footer)
        changes += 1
        print("✓ Removed duplicate dropdown from footer")
    else:
        print("ℹ Footer dropdown not found (may already be removed)")
    
    # Write back
    if changes > 0:
        file_path.write_text(content, encoding='utf-8')
        print(f"\n✓ Applied {changes} changes")
    
    return changes > 0

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    add_settings_section(file_path)
