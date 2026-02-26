"""
add_analytics_buttons.py — Insert Student Analytics access buttons
1. Header toolbar button (after export menu block)
2. Localization key additions to ui_strings.js
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
SRC = ROOT / "AlloFlowANTI.txt"
UI_FILE = ROOT / "ui_strings.js"

def main():
    content = SRC.read_text(encoding='utf-8')
    lines = content.split('\n')
    
    # ===== 1. Insert header toolbar button =====
    # Strategy: find the handleSetShowExportMenuToFalse line and insert AFTER
    # the closing </div> and )} of the export block
    
    # Find L55101 equivalent: the export menu overlay line
    target_line = None
    for i, line in enumerate(lines):
        if 'handleSetShowExportMenuToFalse' in line and 'showExportMenu' in line:
            target_line = i
            break
    
    if target_line is None:
        print("ERROR: Could not find export menu overlay line")
        return
    
    print(f"Found export menu overlay at line {target_line + 1}")
    
    # The pattern is:
    # L_target:   {showExportMenu && <div ... onClick={handleSetShowExportMenuToFalse}>...
    # L_target+1: </div>
    # L_target+2: )}
    # We insert our button AFTER L_target+2
    
    insert_at = target_line + 3  # After the )}, insert before whatever is next
    
    button_jsx = '''                            <button
                                onClick={() => setShowClassAnalytics(true)}
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border border-white/10 hover:border-white/30 ring-1 ring-amber-400/40"
                                title={t('common.student_analytics')}
                                data-help-key="header_analytics"
                            >
                                <BarChart2 size={14} /> <span className="hidden lg:inline">{t('common.student_analytics')}</span>
                            </button>'''
    
    lines.insert(insert_at, button_jsx)
    print(f"Inserted Student Analytics button at line {insert_at + 1}")
    
    # ===== 2. Write back =====
    content = '\n'.join(lines)
    SRC.write_text(content, encoding='utf-8')
    print(f"Saved {SRC.name}")
    
    # ===== 3. Add localization key =====
    ui_content = UI_FILE.read_text(encoding='utf-8')
    if 'student_analytics' not in ui_content:
        # Add to common section
        match = re.search(r'(common\s*:\s*\{)', ui_content)
        if match:
            insert_pos = match.end()
            new_key = "\n    student_analytics: 'Student Analytics',\n"
            ui_content = ui_content[:insert_pos] + new_key + ui_content[insert_pos:]
            UI_FILE.write_text(ui_content, encoding='utf-8')
            print("Added student_analytics key to ui_strings.js")
    else:
        print("student_analytics key already exists")
    
    print("\nDone!")

if __name__ == "__main__":
    main()
