#!/usr/bin/env python3
"""
Check exact definition order of LanguageContext vs ErrorBoundary
"""

from pathlib import Path

def check_order(file_path):
    content = file_path.read_text(encoding='utf-8')
    
    # Find exact positions
    lang_ctx_def = content.find("const LanguageContext = React.createContext")
    error_boundary_def = content.find("class ErrorBoundary extends React.Component")
    
    if lang_ctx_def == -1:
        print("LanguageContext definition NOT FOUND!")
        return
    
    if error_boundary_def == -1:
        print("ErrorBoundary definition NOT FOUND!")
        return
    
    lang_ctx_line = content[:lang_ctx_def].count('\n') + 1
    error_boundary_line = content[:error_boundary_def].count('\n') + 1
    
    print(f"LanguageContext defined at: L{lang_ctx_line}")
    print(f"ErrorBoundary defined at: L{error_boundary_line}")
    print()
    
    if lang_ctx_line < error_boundary_line:
        print("✓ CORRECT ORDER: LanguageContext comes BEFORE ErrorBoundary")
        print("  But static contextType might still be undefined at class parse time...")
        print()
        
        # Check what's between them
        between = error_boundary_def - lang_ctx_def
        print(f"  Distance: {between} characters ({error_boundary_line - lang_ctx_line} lines)")
    else:
        print("✗ PROBLEM: ErrorBoundary comes BEFORE LanguageContext!")
        print("  This would cause static contextType to be undefined!")

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    check_order(file_path)
