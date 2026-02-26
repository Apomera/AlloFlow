#!/usr/bin/env python3
"""
Fix unexpected export keywords in the monolith
"""

from pathlib import Path

def fix_exports(file_path: Path) -> int:
    """Remove export keywords that shouldn't be there."""
    
    content = file_path.read_text(encoding='utf-8')
    fixes = 0
    
    # Remove export from LanguageContext
    if "export const LanguageContext = React.createContext();" in content:
        content = content.replace(
            "export const LanguageContext = React.createContext();",
            "const LanguageContext = React.createContext();"
        )
        fixes += 1
        print("✓ Fixed LanguageContext export")
    
    # Remove export from LanguageProvider
    if "export const LanguageProvider = ({ children }) => {" in content:
        content = content.replace(
            "export const LanguageProvider = ({ children }) => {",
            "const LanguageProvider = ({ children }) => {"
        )
        fixes += 1
        print("✓ Fixed LanguageProvider export")
    
    if fixes > 0:
        file_path.write_text(content, encoding='utf-8')
        print(f"Applied {fixes} fixes")
    else:
        print("No export issues found")
    
    return fixes

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    fix_exports(file_path)
