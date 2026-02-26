from pathlib import Path

def fix_file(file_path_str):
    target = Path(file_path_str)
    if not target.exists():
        print(f"❌ File not found: {file_path_str}")
        return
        
    content = target.read_text(encoding='utf-8')
    original_len = len(content)

    duplicate_block = """                                    <button onClick={handleToggleMathSelfGrade}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${mathSelfGradeMode ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'}`}>
                                        ✏️ {mathSelfGradeMode ? t('math.exit_self_grade') : t('math.self_grade')}
                                    </button>
                                    {mathSelfGradeMode && (
                                        <button onClick={submitMathSelfGrade}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md hover:from-emerald-600 hover:to-teal-600 transition-all">
                                            📊 Submit Assessment
                                        </button>
                                    )}"""

    double_target_1 = duplicate_block + '\n' + duplicate_block
    double_target_2 = duplicate_block + '\r\n' + duplicate_block
    
    # Also handle the slightly modified version with one extra line or space
    
    if double_target_1 in content:
        content = content.replace(double_target_1, duplicate_block, 1)
        target.write_text(content, encoding='utf-8')
        print(f'✅ Successfully removed duplicate from {target.name} (\\n)')
    elif double_target_2 in content:
        content = content.replace(double_target_2, duplicate_block, 1)
        target.write_text(content, encoding='utf-8')
        print(f'✅ Successfully removed duplicate from {target.name} (\\r\\n)')
    else:
        # A more robust regex or direct search
        print(f"❌ Could not find exact adjacent duplicates in {target.name}.")
        # Let's count occurrences
        count = content.count(duplicate_block)
        print(f"Found {count} occurrences of the block.")

fix_file(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt')
fix_file(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\src\App.jsx')
